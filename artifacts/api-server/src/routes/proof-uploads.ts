import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth.js";
import { db } from "@workspace/db";
import { proofFilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

const UPLOAD_DIR = path.join(process.cwd(), ".proof-uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "application/pdf",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => cb(null, `${randomUUID()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Allowed types: JPEG, PNG, GIF, WebP, PDF`));
    }
  },
});

router.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided. Send a multipart/form-data request with a 'file' field." });
  }

  const userId = req.user?.id ?? (req as any).userId;
  const fileId = randomUUID();
  const storedName = req.file.filename;

  try {
    await db.insert(proofFilesTable).values({
      id: fileId,
      userId,
      originalName: req.file.originalname,
      storedName,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      proofSubmissionId: null,
    });

    return res.status(201).json({
      fileId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileSizeKb: Math.round(req.file.size / 1024),
    });
  } catch (dbErr: any) {
    fs.unlink(path.join(UPLOAD_DIR, storedName), () => {});
    return res.status(500).json({ error: "Failed to store file metadata." });
  }
});

router.get("/files/:fileId", async (req: any, res) => {
  const userId = req.user?.id ?? (req as any).userId;
  const { fileId } = req.params;

  const [record] = await db
    .select()
    .from(proofFilesTable)
    .where(and(eq(proofFilesTable.id, fileId), eq(proofFilesTable.userId, userId)))
    .limit(1);

  if (!record) {
    return res.status(404).json({ error: "File not found or access denied." });
  }

  const filePath = path.join(UPLOAD_DIR, record.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found on server." });
  }

  res.setHeader("Content-Type", record.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${record.originalName}"`);
  res.sendFile(filePath);
});

router.get("/files", async (req: any, res) => {
  const userId = req.user?.id ?? (req as any).userId;

  const files = await db
    .select({
      id: proofFilesTable.id,
      originalName: proofFilesTable.originalName,
      mimeType: proofFilesTable.mimeType,
      fileSize: proofFilesTable.fileSize,
      proofSubmissionId: proofFilesTable.proofSubmissionId,
      createdAt: proofFilesTable.createdAt,
    })
    .from(proofFilesTable)
    .where(eq(proofFilesTable.userId, userId))
    .limit(50);

  return res.json({ files });
});

export default router;

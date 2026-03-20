import fs from "fs";
import path from "path";
import OpenAI from "openai";

const MAX_EXTRACTED_CHARS = 3000;

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "no-key") return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

export interface ExtractionResult {
  text: string | null;
  status: "extracted" | "skipped" | "failed" | "metadata_only";
  method: string;
}

export async function extractFileContent(
  filePath: string,
  mimeType: string,
  originalName: string,
  missionCategory: string,
): Promise<ExtractionResult> {
  try {
    if (mimeType === "application/pdf") {
      return await extractPdf(filePath, originalName);
    }
    if (mimeType.startsWith("image/")) {
      return await extractImage(filePath, mimeType, originalName, missionCategory);
    }
    return { text: null, status: "skipped", method: "unsupported_type" };
  } catch (err: any) {
    console.error(`Content extraction failed for ${originalName}:`, err.message);
    return { text: null, status: "failed", method: "error" };
  }
}

async function extractPdf(filePath: string, originalName: string): Promise<ExtractionResult> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer, { max: 5 });
    const raw = (data.text ?? "").trim();

    if (!raw || raw.length < 20) {
      return {
        text: `[PDF: ${originalName} — ${data.numpages ?? 0} page(s), no readable text extracted]`,
        status: "metadata_only",
        method: "pdf_parse_empty",
      };
    }

    const cleaned = raw.replace(/\s{3,}/g, "\n").replace(/[^\S\n]{2,}/g, " ").trim();
    const truncated = cleaned.length > MAX_EXTRACTED_CHARS
      ? cleaned.slice(0, MAX_EXTRACTED_CHARS) + "\n...[truncated]"
      : cleaned;

    return {
      text: truncated,
      status: "extracted",
      method: "pdf_parse",
    };
  } catch (err: any) {
    console.error("PDF parse error:", err.message);
    return {
      text: `[PDF: ${originalName} — could not extract text]`,
      status: "failed",
      method: "pdf_parse_error",
    };
  }
}

async function extractImage(
  filePath: string,
  mimeType: string,
  originalName: string,
  missionCategory: string,
): Promise<ExtractionResult> {
  const openai = getOpenAI();
  if (!openai) {
    return {
      text: `[Image: ${originalName}]`,
      status: "metadata_only",
      method: "no_openai_key",
    };
  }

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    if (imageBuffer.length > 5 * 1024 * 1024) {
      return {
        text: `[Image: ${originalName} — too large for analysis (${Math.round(imageBuffer.length / 1024)}KB)]`,
        status: "metadata_only",
        method: "image_too_large",
      };
    }

    const categoryHint = getCategoryHint(missionCategory);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This image was attached as proof for a ${missionCategory} mission (${categoryHint}).

Describe what you see briefly and objectively in 2-4 sentences. Focus on:
- What the image shows (code, charts, notes, workout, screenshots, documents)
- Any visible text, numbers, or data
- How this relates to the mission context

If the image is irrelevant, blurry, or contains no useful information, say so clearly.
Be concise. This will be used by an AI judge to verify proof authenticity.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "low" },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const description = response.choices[0]?.message?.content?.trim() ?? "";
    if (!description) {
      return {
        text: `[Image: ${originalName} — vision analysis returned empty]`,
        status: "failed",
        method: "vision_empty",
      };
    }

    return {
      text: `[Image Analysis: ${originalName}]\n${description}`,
      status: "extracted",
      method: "gpt4o_vision",
    };
  } catch (err: any) {
    console.error("Vision extraction error:", err.message);
    return {
      text: `[Image: ${originalName} — analysis failed]`,
      status: "failed",
      method: "vision_error",
    };
  }
}

function getCategoryHint(category: string): string {
  const hints: Record<string, string> = {
    trading: "expected content: charts, trade logs, P&L, notes",
    learning: "expected content: notes, summaries, study materials, textbook",
    deep_work: "expected content: code, documents, writing, design work",
    fitness: "expected content: workout log, gym, exercise, body",
    sleep: "expected content: sleep tracker, bed, journal, schedule",
    recovery: "expected content: rest activity, wellness content",
    habit: "expected content: checklist, habit tracker, calendar",
    output: "expected content: deliverable, document, artifact",
    review: "expected content: notes, evaluation, feedback",
  };
  return hints[category] ?? "work-related content";
}

export function buildFileContentSummary(
  files: Array<{ originalName: string; mimeType: string; fileSize: number; extractedText?: string | null; extractionStatus?: string | null }>,
): string {
  if (files.length === 0) return "None";

  return files.map((f) => {
    const sizeKb = Math.round(f.fileSize / 1024);
    const typeLabel = f.mimeType.startsWith("image/") ? "Image" : "Document";
    const extracted = f.extractedText?.trim();

    if (extracted && extracted.length > 10) {
      return `${typeLabel}: ${f.originalName} (${sizeKb}KB)\nExtracted content: ${extracted.slice(0, 800)}${extracted.length > 800 ? "..." : ""}`;
    }
    return `${typeLabel}: ${f.originalName} (${sizeKb}KB) [no text extracted]`;
  }).join("\n\n");
}

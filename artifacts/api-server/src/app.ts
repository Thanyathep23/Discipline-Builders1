import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const currentDir = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.resolve(currentDir, "..", "public", "models");

app.use("/api/models", express.static(modelsDir, {
  maxAge: "7d",
  immutable: true,
}));

const publicDir = path.resolve(currentDir, "..", "public");
app.get("/api/character-viewer.html", (_req, res) => {
  res.sendFile(path.join(publicDir, "character-viewer.html"));
});

app.use("/api", router);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({ error: err.message ?? "Internal server error" });
});

export default app;

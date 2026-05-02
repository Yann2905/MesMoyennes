import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { importDocument } from "./services/ocrService.js";
import { toCsv } from "./services/exportService.js";
import { isSupabaseConfigured, uploadFileToStorage } from "./services/supabaseService.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mes-moyens-api",
    storage: isSupabaseConfigured() ? "supabase" : "not-configured"
  });
});

app.post("/api/ocr/import", upload.single("document"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Aucun fichier recu." });
      return;
    }

    const storedFile = await uploadFileToStorage(req.file, "imports");
    const result = await importDocument(req.file);
    res.json({ ...result, storedFile });
  } catch (error) {
    next(error);
  }
});

app.post("/api/storage/upload", upload.single("document"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Aucun fichier recu." });
      return;
    }

    const storedFile = await uploadFileToStorage(req.file, req.body.folder || "documents");

    if (!storedFile) {
      res.status(503).json({ message: "Supabase Storage n'est pas configure." });
      return;
    }

    res.status(201).json({ storedFile });
  } catch (error) {
    next(error);
  }
});

app.post("/api/export/csv", (req, res) => {
  const csv = toCsv(req.body.students || []);
  res.header("Content-Type", "text/csv; charset=utf-8");
  res.attachment("moyennes.csv");
  res.send(csv);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: "Une erreur est survenue pendant le traitement.",
    detail: process.env.NODE_ENV === "production" ? undefined : error.message
  });
});

app.listen(port, () => {
  console.log(`API MesMoyens disponible sur http://localhost:${port}`);
});

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowed = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf", "application/zip", "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, allowed.has(file.mimetype)),
});

router.post("/", requireAuth, upload.array("files", 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: "No files" });
  const files = req.files.map((f) => ({
    filename: f.originalname,
    url: `/uploads/${f.filename}`,
    size: f.size,
    uploadedAt: new Date().toISOString(),
  }));
  res.json({ files });
});

export default router;

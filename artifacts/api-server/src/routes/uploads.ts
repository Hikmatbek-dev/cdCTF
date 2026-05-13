import { Router } from "express";
import multer from "multer";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { MAX_CTF_FILE_SIZE_BYTES, StorageUploadError, uploadBufferToStorage } from "../lib/storage";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CTF_FILE_SIZE_BYTES, files: 1 },
});

router.post("/ctf-file", authenticateToken, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const result = await uploadBufferToStorage({
      folder: "ctf",
      filename: req.file.originalname || "challenge.bin",
      contentType: req.file.mimetype || "application/octet-stream",
      buffer: req.file.buffer,
    });

    res.status(201).json({ fileUrl: result.publicUrl, path: result.path });
  } catch (error) {
    if (error instanceof StorageUploadError) {
      const status = error.status === 413 ? 413 : 502;
      return res.status(status).json({
        error: status === 413 ? "Uploaded file is too large for storage" : "Storage upload failed",
      });
    }
    return res.status(502).json({ error: "Storage upload failed" });
  }
});

export default router;

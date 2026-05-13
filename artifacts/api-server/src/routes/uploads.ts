import { Router } from "express";
import multer from "multer";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { MAX_CTF_FILE_SIZE_BYTES, StorageUploadError, createSignedCtfUpload, uploadBufferToStorage } from "../lib/storage";
import { logger } from "../lib/logger";


const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CTF_FILE_SIZE_BYTES, files: 1 },
});

router.post("/ctf-file/sign", authenticateToken, requireAdmin, async (req, res) => {
  const filename = typeof req.body?.filename === "string" ? req.body.filename : "challenge.bin";
  const size = Number(req.body?.size);

  try {
    const result = await createSignedCtfUpload({ filename, size });
    return res.status(201).json(result);
  } catch (error) {
    logger.error({ err: error }, "Upload sign error detail");
    if (error instanceof StorageUploadError) {
      const status = (error.status >= 400 && error.status < 500) || error.status === 501 ? error.status : 502;
      return res.status(status).json({ error: error.message || "Storage upload failed" });
    }
    return res.status(502).json({ error: error instanceof Error ? error.message : "Storage upload failed" });
  }

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
    logger.error({ err: error }, "Direct upload error detail");
    if (error instanceof StorageUploadError) {
      const status = error.status === 413 ? 413 : 502;
      return res.status(status).json({
        error: status === 413 ? "Uploaded file is too large for storage" : "Storage upload failed",
      });
    }
    return res.status(502).json({ error: error instanceof Error ? error.message : "Storage upload failed" });
  }

});

export default router;

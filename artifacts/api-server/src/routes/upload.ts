import { Router } from "express";
import multer from "multer";
import { uploadImageToSupabase, isSupabaseStorageConfigured, STORAGE_BUCKET_NAME } from "../lib/supabase-storage";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// In-memory storage ONLY - Never write files to the ephemeral local filesystem
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per image
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP, AVIF) are allowed"));
    }
  },
});

// POST /api/upload/single - Upload single image to Supabase Storage
router.post("/single", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Bad Request", message: "No image file provided" });
    }

    if (!isSupabaseStorageConfigured()) {
      return res.status(503).json({
        error: "Storage Service Unavailable",
        message: "Supabase Storage is not configured. Server credentials (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY) are required.",
        bucket: STORAGE_BUCKET_NAME,
      });
    }

    const result = await uploadImageToSupabase({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    return res.status(201).json({
      url: result.url,
      path: result.path,
      filename: result.filename,
      mimetype: result.mimetype,
      size: result.size,
      bucket: STORAGE_BUCKET_NAME,
    });
  } catch (error: any) {
    req.log.error({ error }, "Error uploading image to Supabase Storage");
    return res.status(500).json({
      error: "Upload Failed",
      message: error?.message || "Failed to upload image to Supabase Storage",
    });
  }
});

// POST /api/upload/multiple - Upload multiple images to Supabase Storage
router.post("/multiple", requireAuth, upload.array("images", 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Bad Request", message: "No image files provided" });
    }

    if (!isSupabaseStorageConfigured()) {
      return res.status(503).json({
        error: "Storage Service Unavailable",
        message: "Supabase Storage is not configured. Server credentials (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY) are required.",
        bucket: STORAGE_BUCKET_NAME,
      });
    }

    const uploadPromises = files.map((file) =>
      uploadImageToSupabase({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      })
    );

    const results = await Promise.all(uploadPromises);

    return res.status(201).json({
      urls: results.map((r) => r.url),
      files: results,
      bucket: STORAGE_BUCKET_NAME,
    });
  } catch (error: any) {
    req.log.error({ error }, "Error uploading multiple images to Supabase Storage");
    return res.status(500).json({
      error: "Upload Failed",
      message: error?.message || "Failed to upload images to Supabase Storage",
    });
  }
});

export default router;

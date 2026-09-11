import { createClient, SupabaseClient } from "@supabase/supabase-js";
import path from "node:path";

export const STORAGE_BUCKET_NAME = "mkany-property-images";

let supabaseClient: SupabaseClient | null = null;

/**
 * Derives the Supabase project URL from SUPABASE_URL or DATABASE_URL
 */
export function getSupabaseUrl(): string | null {
  if (process.env.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      if (u.hostname.includes("supabase.co")) {
        const parts = u.hostname.split(".");
        const projectRef = parts[1];
        return `https://${projectRef}.supabase.co`;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Gets the Supabase service role key or API key from environment
 */
export function getSupabaseKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    null
  );
}

/**
 * Checks whether Supabase Storage API is configured
 */
export function isSupabaseStorageConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(url && key);
}

/**
 * Lazily initializes and returns the server-side Supabase client
 */
export function getSupabaseStorageClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();

    if (!url || !key) {
      throw new Error(
        "Supabase Storage credentials are missing (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY). Please configure them in environment settings."
      );
    }

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

let bucketEnsured = false;

/**
 * Ensures the dedicated bucket exists in Supabase Storage (idempotent)
 */
export async function ensureStorageBucket(): Promise<void> {
  if (bucketEnsured) return;

  const client = getSupabaseStorageClient();
  try {
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    if (listError) {
      console.warn("[Supabase Storage] List buckets warning:", listError.message);
    }

    const exists = buckets?.some((b) => b.name === STORAGE_BUCKET_NAME || b.id === STORAGE_BUCKET_NAME);
    if (!exists) {
      const { error: createError } = await client.storage.createBucket(STORAGE_BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/avif"],
      });
      if (createError && !createError.message.includes("already exists")) {
        console.warn("[Supabase Storage] Create bucket error:", createError.message);
      }
    }
    bucketEnsured = true;
  } catch (err) {
    console.warn("[Supabase Storage] Bucket initialization:", err);
  }
}

export interface UploadedImageResult {
  url: string;
  path: string;
  filename: string;
  mimetype: string;
  size: number;
}

/**
 * Uploads a file buffer directly to Supabase Storage and returns its public URL
 */
export async function uploadImageToSupabase(file: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}): Promise<UploadedImageResult> {
  const client = getSupabaseStorageClient();
  await ensureStorageBucket();

  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const storagePath = `properties/${uniqueId}${ext}`;

  const { error: uploadError } = await client.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image to Supabase Storage: ${uploadError.message}`);
  }

  const { data } = client.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(storagePath);

  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL from Supabase Storage");
  }

  return {
    url: data.publicUrl,
    path: storagePath,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  };
}

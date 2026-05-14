import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_CTF_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export class StorageUploadError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "StorageUploadError";
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "cdctf";
  
  if (!url || !key) {
    const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (isVercel) {
      console.error("CRITICAL: Supabase Storage is NOT configured in Vercel environment! Uploads will be temporary and stored in /tmp. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    } else {
      console.warn("Supabase Storage is not configured. Falling back to local filesystem storage.");
    }
    return null;
  }
  return { url: url.replace(/\/+$/, ""), key, bucket };
}


function sanitizePathSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function getLocalUploadsRoot() {
  if (process.env.LOCAL_UPLOAD_DIR) {
    return path.resolve(process.env.LOCAL_UPLOAD_DIR);
  }

  // Vercel execution environment is read-only except for /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.resolve("/tmp", "uploads");
  }

  // Try common locations relative to process.cwd()
  const cwd = process.cwd();
  
  // If we are in artifacts/api-server, go up to find the root uploads
  if (cwd.includes("artifacts/api-server")) {
    return path.resolve(cwd, "..", "..", "uploads");
  }

  // Default fallback: just use 'uploads' in the current directory
  return path.resolve(cwd, "uploads");
}

function getLocalPublicUrl(objectName: string) {
  return `/uploads/${objectName.split("/").map(encodeURIComponent).join("/")}`;
}

export function isStorageConfigured() {
  return Boolean(getSupabaseConfig());
}

let bucketReadyPromise: Promise<void> | null = null;

async function ensureBucket() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase storage is not configured");

  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const response = await fetch(`${config.url}/storage/v1/bucket`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          apikey: config.key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: config.bucket,
          name: config.bucket,
          public: true,
          file_size_limit: MAX_CTF_FILE_SIZE_BYTES,
        }),
      });

      if (response.status === 409) {
        return;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Bucket creation failed: ${response.status} ${text}`.trim());
      }
    })().catch((error) => {
      bucketReadyPromise = null;
      throw error;
    });
  }

  await bucketReadyPromise;
}

export async function uploadBufferToStorage(params: {
  folder: "avatars" | "ctf";
  filename: string;
  contentType: string;
  buffer: Buffer;
}) {
  const config = getSupabaseConfig();
  if (!config) {
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    // In serverless environments like Vercel, local storage is ephemeral and won't work for downloads.
    // We fallback to a Data URL which gets stored in the database. 
    // Note: Vercel has a 4.5MB limit for API responses.
    if (isServerless) {
      const base64 = params.buffer.toString("base64");
      const dataUrl = `data:${params.contentType};base64,${base64}`;
      
      // We still log a warning because this is not ideal for large files
      if (params.buffer.length > 3 * 1024 * 1024) {
        console.warn("Large file detected for Data URL fallback. This may exceed Vercel's 4.5MB limit.");
      }

      return {
        path: "data-url",
        publicUrl: dataUrl,
      };
    }

    const objectName = `${params.folder}/${randomUUID()}-${sanitizePathSegment(params.filename)}`;
    const destination = path.join(getLocalUploadsRoot(), objectName);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, params.buffer);
    return {
      path: objectName,
      publicUrl: getLocalPublicUrl(objectName),
    };
  }
  await ensureBucket();

  const objectName = `${params.folder}/${randomUUID()}-${sanitizePathSegment(params.filename)}`;
  const uploadUrl = `${config.url}/storage/v1/object/${config.bucket}/${objectName}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      apikey: config.key,
      "Content-Type": params.contentType,
      "x-upsert": "true",
    },
    body: params.buffer,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new StorageUploadError(response.status, `Storage upload failed: ${response.status} ${text}`.trim());
  }

  return {
    path: objectName,
    publicUrl: `${config.url}/storage/v1/object/public/${config.bucket}/${objectName}`,
  };
}

export async function createSignedCtfUpload(params: {
  filename: string;
  size: number;
}) {
  if (!Number.isFinite(params.size) || params.size < 1) {
    throw new StorageUploadError(400, "Invalid file size");
  }
  if (params.size > MAX_CTF_FILE_SIZE_BYTES) {
    throw new StorageUploadError(413, "Uploaded file is too large for storage");
  }

  const config = getSupabaseConfig();
  if (!config) {
    throw new StorageUploadError(501, "Supabase storage is not configured");
  }

  await ensureBucket();

  const objectName = `ctf/${randomUUID()}-${sanitizePathSegment(params.filename || "challenge.bin")}`;
  const response = await fetch(`${config.url}/storage/v1/object/upload/sign/${config.bucket}/${objectName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      apikey: config.key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => null) as { url?: unknown } | null;
  if (!response.ok) {
    throw new StorageUploadError(response.status, `Signed upload URL creation failed: ${response.status}`.trim());
  }

  const relativeSignedUrl = typeof data?.url === "string" ? data.url : null;
  if (!relativeSignedUrl) {
    throw new StorageUploadError(502, "Signed upload URL was not returned");
  }

  const signedUrl = relativeSignedUrl.startsWith("http")
    ? relativeSignedUrl
    : `${config.url}/storage/v1${relativeSignedUrl.startsWith("/") ? "" : "/"}${relativeSignedUrl}`;

  return {
    path: objectName,
    signedUrl,
    publicUrl: `${config.url}/storage/v1/object/public/${config.bucket}/${objectName}`,
  };
}

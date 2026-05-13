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
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key, bucket };
}

function sanitizePathSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function getLocalUploadsRoot() {
  return process.env.LOCAL_UPLOAD_DIR
    ? path.resolve(process.env.LOCAL_UPLOAD_DIR)
    : path.resolve(process.cwd(), "..", "..", "uploads");
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
        const updateResponse = await fetch(`${config.url}/storage/v1/bucket/${config.bucket}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${config.key}`,
            apikey: config.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public: true,
            file_size_limit: MAX_CTF_FILE_SIZE_BYTES,
          }),
        });

        if (!updateResponse.ok) {
          const text = await updateResponse.text().catch(() => "");
          throw new Error(`Bucket update failed: ${updateResponse.status} ${text}`.trim());
        }
        return;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Bucket creation failed: ${response.status} ${text}`.trim());
      }
    })();
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

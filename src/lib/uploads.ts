import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ApiError } from "./api";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "challenges");
const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};
const MAX_BYTES = 5 * 1024 * 1024;

/** Validate + persist an uploaded image; returns the public URL path. */
export async function saveUpload(file: File): Promise<string> {
  const ext = ALLOWED[file.type];
  if (!ext) throw new ApiError(400, "Only PNG, JPEG, or WebP images are allowed.", "BAD_FILE_TYPE");
  if (file.size > MAX_BYTES) throw new ApiError(413, "Image must be 5 MB or smaller.", "FILE_TOO_LARGE");

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/challenges/${name}`;
}

/** Best-effort removal of a locally-uploaded image (ignores external URLs). */
export async function removeUpload(url?: string | null): Promise<void> {
  if (!url || !url.startsWith("/uploads/challenges/")) return;
  const name = url.split("/").pop();
  if (!name) return;
  try {
    await unlink(join(UPLOAD_DIR, name));
  } catch {
    /* already gone */
  }
}

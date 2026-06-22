import { writeFile, mkdir, unlink, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ApiError } from "./api";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "challenges");
const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};
const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
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

/** Persist raw image bytes (e.g. from a base64 dataset import); returns the URL. */
export async function saveUploadBuffer(buf: Buffer, mime: string): Promise<string> {
  const ext = ALLOWED[mime];
  if (!ext) throw new ApiError(400, "Only PNG, JPEG, or WebP images are allowed.", "BAD_FILE_TYPE");
  if (buf.length > MAX_BYTES) throw new ApiError(413, "Image must be 5 MB or smaller.", "FILE_TOO_LARGE");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await writeFile(join(UPLOAD_DIR, name), buf);
  return `/uploads/challenges/${name}`;
}

const PUBLIC_DIR = join(process.cwd(), "public");

/** Read any local public image (e.g. /images/... or /uploads/...) as base64 for
 *  a self-contained export. Returns null for external URLs or missing files. */
export async function readLocalImageAsBase64(url?: string | null): Promise<{ mime: string; data: string } | null> {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return null;
  let rel = url;
  try {
    rel = decodeURIComponent(url);
  } catch {
    /* keep raw if it isn't valid percent-encoding */
  }
  if (rel.includes("..")) return null; // path-traversal guard
  const dot = rel.lastIndexOf(".");
  const mime = dot >= 0 ? EXT_TO_MIME[rel.slice(dot).toLowerCase()] : undefined;
  if (!mime) return null;
  try {
    const buf = await readFile(join(PUBLIC_DIR, rel));
    return { mime, data: buf.toString("base64") };
  } catch {
    return null;
  }
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

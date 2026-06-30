import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

// Serve uploaded images from disk at request time. Next.js only serves files
// that existed in `public/` when the server started, so runtime uploads written
// to public/uploads must be streamed through a route handler instead. A rewrite
// (next.config.mjs) maps the stored `/uploads/...` URLs onto this handler.
export const dynamic = "force-dynamic";

const UPLOADS_ROOT = join(process.cwd(), "public", "uploads");
const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const abs = normalize(join(UPLOADS_ROOT, path.join("/")));
  // Path-traversal guard: the resolved path must stay inside the uploads root.
  if (abs !== UPLOADS_ROOT && !abs.startsWith(UPLOADS_ROOT + sep)) return notFound();

  const dot = abs.lastIndexOf(".");
  const mime = dot >= 0 ? MIME[abs.slice(dot).toLowerCase()] : undefined;
  if (!mime) return notFound();

  try {
    const buf = await readFile(abs);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return notFound();
  }
}

import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";

/** Product images uploaded in the admin live in storage/uploads and are served by /uploads/[file]. */
export const UPLOAD_DIR = join(process.cwd(), "storage", "uploads");
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
export const UPLOAD_MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

export async function saveProductImage(file: File): Promise<string> {
  if (!TYPES[file.type]) throw new Error(`${file.name}: only JPG, PNG, WEBP or AVIF images are allowed`);
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: images must be under 5 MB`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${TYPES[file.type]}`;
  await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function deleteUploaded(url: string) {
  if (!url.startsWith("/uploads/")) return;
  await unlink(join(UPLOAD_DIR, basename(url))).catch(() => {});
}

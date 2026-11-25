import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";

/** Product images uploaded in the admin live in storage/uploads and are served by /uploads/[file]. */
export const UPLOAD_DIR = join(process.cwd(), "storage", "uploads");
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
export const UPLOAD_MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

/**
 * What a file really is, from its first bytes (the browser's file.type is just a claim and can be faked).
 * Returns a MIME type, or null when it isn't one of the formats we accept.
 */
export function sniffType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(buf.toString("ascii", 8, 12))) return "image/avif";
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export async function saveProductImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: images must be under 5 MB`);
  const buf = Buffer.from(await file.arrayBuffer());
  const real = sniffType(buf);
  if (!real || !TYPES[real]) throw new Error(`${file.name}: only JPG, PNG, WEBP or AVIF images are allowed`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${TYPES[real]}`;
  await writeFile(join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}

export async function deleteUploaded(url: string) {
  if (!url.startsWith("/uploads/")) return;
  await unlink(join(UPLOAD_DIR, basename(url))).catch(() => {});
}

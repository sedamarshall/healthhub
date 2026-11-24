/**
 * Converts product images in public/img/p to WebP (max 1000px) in public/img/w, points the
 * database at the WebP files, then moves the originals to data/images-original (kept as a backup,
 * no longer served). Safe to re-run.
 *
 *   npx tsx scripts/optimize-images.ts
 */
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SRC = join(__dirname, "../public/img/p");
const OUT = join(__dirname, "../public/img/w");
const BACKUP = join(__dirname, "../data/images-original");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const files = existsSync(SRC) ? readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f)) : [];
  let done = 0, failed = 0, before = 0, after = 0;
  const queue = [...files];
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift()!;
      const out = join(OUT, `${parse(f).name}.webp`);
      try {
        before += statSync(join(SRC, f)).size;
        if (!existsSync(out)) {
          await sharp(join(SRC, f), { failOn: "none" })
            .rotate()
            .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" })
            .webp({ quality: 82 })
            .toFile(out);
        }
        after += statSync(out).size;
        done++;
      } catch (e) {
        failed++;
        console.error(`failed ${f}: ${e instanceof Error ? e.message : e}`);
      }
      if ((done + failed) % 500 === 0) console.log(`${done + failed}/${files.length}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`converted ${done}, failed ${failed}: ${Math.round(before / 1e6)} MB -> ${Math.round(after / 1e6)} MB`);

  // Point the database at the WebP copies
  const imgs = await prisma.productImage.findMany({ where: { url: { startsWith: "/img/p/" } }, select: { id: true, url: true } });
  let updated = 0;
  for (const i of imgs) {
    const webp = `/img/w/${parse(i.url).name}.webp`;
    if (existsSync(join(__dirname, "../public", webp))) {
      await prisma.productImage.update({ where: { id: i.id }, data: { url: webp } });
      updated++;
    }
  }
  console.log(`database image links updated: ${updated}`);

  // Move originals out of public/ only if every DB link now points at a WebP
  const leftover = await prisma.productImage.count({ where: { url: { startsWith: "/img/p/" } } });
  if (leftover === 0 && failed === 0) {
    mkdirSync(BACKUP, { recursive: true });
    for (const f of files) renameSync(join(SRC, f), join(BACKUP, f));
    console.log(`originals moved to data/images-original`);
  } else {
    console.log(`kept originals in public/img/p (${leftover} links still use them, ${failed} failures)`);
  }
  await prisma.$disconnect();
}
main();

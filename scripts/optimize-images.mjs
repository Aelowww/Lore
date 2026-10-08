// Converts the captured Instagram/Facebook photos in raw-images/ into web-sized WebP files.
// Each post has a "LORE Coffee Station" watermark in its top corner, so the top band is
// cropped off. Branding printed on cups or the coffee cart itself is left as-is.
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const src = 'raw-images';
const out = 'public/images';
const TOP_CROP = 0.12; // fraction of height holding the watermark
const BOTTOM_CROP = { interior: 0.08 }; // "OPENING HOURS" caption on the illustration
const KEEP_WHOLE = new Set(['logo', 'location']); // not watermarked: the real logo, and the shop photo from Google Maps
const WIDTH = { location: 2000 }; // full-bleed hero needs more pixels

await mkdir(out, { recursive: true });
for (const file of await readdir(src)) {
  const name = path.parse(file).name;
  const img = sharp(path.join(src, file));
  const { width, height } = await img.metadata();
  let pipeline = img;
  if (!KEEP_WHOLE.has(name)) {
    const top = Math.round(height * TOP_CROP);
    const bottom = Math.round(height * (BOTTOM_CROP[name] ?? 0));
    pipeline = pipeline.extract({ left: 0, top, width, height: height - top - bottom });
  }
  await pipeline.resize({ width: WIDTH[name] ?? 800 }).webp({ quality: 80 }).toFile(path.join(out, `${name}.webp`));
  console.log('✓', name);
}

// Builds two brand assets from Lore's Facebook logo artwork (raw-images/logo.jpg, 720×720):
//  - brand-texture.webp: the chocolate texture below the logo (no lettering), for dark backgrounds
//  - logo-badge.webp: the logo lockup on its own texture, cropped tight
import sharp from 'sharp';

const src = 'raw-images/logo.jpg';
await sharp(src)
  .extract({ left: 0, top: 500, width: 720, height: 220 })
  .resize(1600, 600, { fit: 'cover' })
  .blur(1.5)
  .webp({ quality: 78 })
  .toFile('public/images/brand-texture.webp');

await sharp(src).extract({ left: 140, top: 150, width: 440, height: 380 }).resize(800).webp({ quality: 85 }).toFile('public/images/logo-badge.webp');
console.log('brand assets written');

// Favicons: a square crop of the branch and "LORE" (the full lockup is unreadable at 16–32px).
const square = () => sharp(src).extract({ left: 165, top: 150, width: 390, height: 390 });
for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await square().resize(size, size).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(`public/${file}`);
}
// favicon.ico for browsers that ask for it directly: an ICO file wrapping 16, 32 and 48px PNGs.
const pngs = await Promise.all([16, 32, 48].map((s) => square().resize(s, s).png().toBuffer().then((buf) => ({ s, buf }))));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach(({ s, buf }, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(buf.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += buf.length;
});
const { writeFileSync } = await import('node:fs');
writeFileSync('public/favicon.ico', Buffer.concat([header, ...pngs.map((p) => p.buf)]));
console.log('favicons written');

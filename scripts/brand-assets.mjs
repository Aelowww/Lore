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

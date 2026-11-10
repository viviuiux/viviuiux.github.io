// Makes WebP copies of photos / screens (not the hand-drawn PNGs, which keep their grain). Run: node tools/optimize.mjs
import fs from 'node:fs';
import sharp from 'sharp';
const DIR = new URL('../public/assets/', import.meta.url).pathname;
const KEEP = /^(hand-drawn|underline|metric|process-piece|flower|icon|logo\.|loader-flower|font)/; // logo-alt.jpg is the About portrait, so it does get a WebP
let before = 0, after = 0;
for (const f of fs.readdirSync(DIR)) {
  if (!/\.(png|jpg)$/.test(f) || KEEP.test(f)) continue;
  const src = DIR + f, out = DIR + f.replace(/\.(png|jpg)$/, '.webp');
  let buf = await sharp(src).webp({ quality: 90, effort: 5 }).toBuffer();
  // already well-compressed JPG photos: q85 still looks the same and is clearly smaller
  if (buf.length >= fs.statSync(src).size * 0.9 && /\.jpg$/.test(f)) buf = await sharp(src).webp({ quality: 85, effort: 5 }).toBuffer();
  const s = fs.statSync(src).size;
  if (buf.length < s * 0.9) { fs.writeFileSync(out, buf); before += s; after += buf.length; }
}
console.log(`webp: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);

// hires/: lightbox-only 4× images → assets/<name>@full.webp; Case 4 videos + posters → assets/
const HI = new URL('../hires/', import.meta.url).pathname;
if (fs.existsSync(HI)) {
  for (const f of fs.readdirSync(HI)) {
    if (/@full\.png$/.test(f)) {
      const out = DIR + f.replace(/\.png$/, '.webp');
      if (!fs.existsSync(out)) await sharp(HI + f).webp({ quality: 90, effort: 5, alphaQuality: 100 }).toFile(out);
    } else if (/\.(webm|mp4)$/.test(f)) fs.copyFileSync(HI + f, DIR + f);
    else if (/-poster\.jpg$/.test(f)) await sharp(HI + f).webp({ quality: 85 }).toFile(DIR + f.replace(/\.jpg$/, '.webp'));
  }
  console.log('hires: copied');
}

// Smaller copies for phones (srcset): -640 and -960 versions of large photos / screens
for (const f of fs.readdirSync(DIR)) {
  if (!/\.webp$/.test(f) || /@full|-640\.|-960\.|poster/.test(f)) continue;
  const m = await sharp(DIR + f).metadata();
  if (m.width < 1100) continue;
  for (const w of [640, 960]) {
    const out = DIR + f.replace(/\.webp$/, `-${w}.webp`);
    if (!fs.existsSync(out)) await sharp(DIR + f).resize({ width: w }).webp({ quality: 88, effort: 5, alphaQuality: 100 }).toFile(out);
  }
}
console.log('srcset copies done');

// Small copies of the outline flower: the bottom-bar icon (26 px) and the 404 page (140 px) don't need the 1200 px loader file
const FL = DIR + 'flower-outline.png';
for (const w of [96, 420]) await sharp(FL).resize({ width: w, kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(DIR + `flower-outline-${w}.png`);
console.log('flower copies done');

// Back-to-top arrow in the page colour (#F6F5F1) for the red footer; the drawing (alpha, grain) stays as it is
{
  const src = DIR + 'icon-back-to-top.png';
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) { data[i] = 0xF6; data[i + 1] = 0xF5; data[i + 2] = 0xF1; }
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(DIR + 'icon-back-to-top-page.png');
  console.log('arrow recoloured');
}

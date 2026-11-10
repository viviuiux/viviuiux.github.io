// Makes favicon set C (cream flower on red tile) + manifest + OG image.
// Run: node tools/icons.mjs   (needs Google Chrome installed for the OG screenshot)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const SRC = P('tools/fav-96.png'); // 512×512 master of option C
fs.mkdirSync(P('public/icons'), { recursive: true });

for (const s of [180, 192, 512]) {
  const name = s === 180 ? 'apple-touch-icon.png' : `icon-${s}.png`;
  let img = sharp(SRC).resize(s, s);
  // iOS draws its own rounded corners: flatten onto red so the corners are not transparent
  if (s === 180) img = img.flatten({ background: '#CF453A' });
  await img.png().toFile(P('public/icons', name));
}

// favicon.ico with 16 / 32 / 48 PNG entries
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) =>
  s === 16 ? fs.promises.readFile(P('public/icons/favicon-16.png')) :
  s === 32 ? fs.promises.readFile(P('public/icons/favicon-32.png')) :
  sharp(SRC).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let off = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(off, e + 12);
  off += pngs[i].length;
});
fs.writeFileSync(P('public/favicon.ico'), Buffer.concat([header, ...pngs]));

fs.writeFileSync(P('public/site.webmanifest'), JSON.stringify({
  name: 'Viktoriia Polotniuk — Senior Product Designer',
  short_name: 'Viktoriia P.',
  start_url: '/',
  display: 'browser',
  theme_color: '#CF453A',
  background_color: '#F6F5F1',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}, null, 2) + '\n');

// OG image (option A) — rendered by headless Chrome from tools/og.html
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (fs.existsSync(chrome)) {
  const tmp = P('tools/.og-raw.png');
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', '--window-size=1200,630', '--screenshot=' + tmp, 'file://' + P('tools/og.html')], { stdio: 'ignore' });
  await sharp(tmp).resize(1200, 630).png({ compressionLevel: 9 }).toFile(P('public/og-image.png'));
  fs.unlinkSync(tmp);
}
console.log('icons, manifest, og-image done');

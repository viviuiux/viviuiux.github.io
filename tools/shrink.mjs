// Hand-drawn PNGs are exported at ~6× — far more than any screen needs. This measures the largest size each one is
// shown at (all pages, 375–1920 px wide) and resizes it to 3× that, still PNG (grain and transparency kept).
// Originals are kept in tools/originals/. Run with the server up: node tools/shrink.mjs
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
const B = 'http://localhost:3000';
const DIR = new URL('../public/assets/', import.meta.url).pathname, KEEP = new URL('./originals/', import.meta.url).pathname;
const HAND = /^(hand-drawn|underline|metric|process-piece|flower-hero|icon|logo)/; // loader flowers stay full size (they zoom 34×)
fs.mkdirSync(KEEP, { recursive: true });
const need = {}; // file → required scale factor relative to its natural size
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage();
for (const [w, h] of [[375, 812], [834, 1112], [1280, 800], [1920, 1080]]) for (const u of ['/', '/about/', '/work/app-rebrand-design-system/', '/work/discover-tab/', '/work/smart-interior-search/', '/work/ai-background-removal/', '/404.html']) {
  await p.setViewport({ width: w, height: h });
  await p.goto(B + u + '?glass=off', { waitUntil: 'networkidle0' });
  await p.evaluate(async () => { document.documentElement.style.scrollBehavior = 'auto'; for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 20)); } await new Promise((r) => setTimeout(r, 500)); });
  const list = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('img').forEach((i) => { const r = i.getBoundingClientRect(); if (i.naturalWidth && r.width) out.push([i.src, Math.max(r.width / i.naturalWidth, r.height / i.naturalHeight)]); });
    // masks / backgrounds (bottom-bar icons, mobile menu underlines) — measure their boxes
    document.querySelectorAll('.bnav i').forEach((e) => { const m = getComputedStyle(e).maskImage || getComputedStyle(e).webkitMaskImage; const u = (m.match(/url\("?([^")]+)/) || [])[1]; const r = e.getBoundingClientRect(); if (u) out.push([u, -r.width]); });
    return out;
  });
  for (const [src, k] of list) {
    const f = decodeURIComponent(new URL(src).pathname.split('/').pop());
    if (!HAND.test(f) || !/\.png$/.test(f)) continue;
    let factor = k;
    if (k < 0) { const m = await sharp(DIR + f).metadata(); factor = -k / m.width; }
    need[f] = Math.max(need[f] || 0, factor);
  }
}
await b.close();
let before = 0, after = 0;
for (const [f, k] of Object.entries(need)) {
  const src = fs.existsSync(KEEP + f) ? KEEP + f : DIR + f;
  const m = await sharp(src).metadata();
  const target = Math.ceil(m.width * Math.min(1, k * 3));
  if (target > m.width * 0.85) continue; // already about right
  if (!fs.existsSync(KEEP + f)) fs.copyFileSync(DIR + f, KEEP + f);
  const buf = await sharp(src).resize({ width: target, kernel: 'lanczos3' }).png({ compressionLevel: 9, palette: false }).toBuffer();
  before += fs.statSync(src).size; after += buf.length;
  fs.writeFileSync(DIR + f, buf);
}
console.log(`hand-drawn PNGs: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB (${Object.keys(need).length} checked)`);

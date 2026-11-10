// Screenshots of pages at board widths into tools/.shots (for checking). Run: node tools/shots.mjs
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:3000', OUT = new URL('./.shots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const list = (process.argv[2] || '1280:/,375:/,1280:/about/,375:/about/,834:/work/discover-tab/,375:/work/app-rebrand-design-system/,1280:/404-test').split(',');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem('vp-seen', '1'); } catch (e) {} });
for (const item of list) {
  const [w, p, full] = item.split(':');
  await page.setViewport({ width: +w, height: +w < 768 ? 812 : 800, isMobile: +w < 768, hasTouch: +w < 768, deviceScaleFactor: 1 });
  await page.goto(BASE + p, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 400)); });
  const f = OUT + w + p.replace(/\//g, '_') + '.png';
  await page.screenshot({ path: f, fullPage: full !== 'top' });
  console.log(f);
}
await browser.close();

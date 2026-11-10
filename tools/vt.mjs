// Records page-transition frames (slowed down 10×) into tools/.shots/vt-*.png. Run with the server up: node tools/vt.mjs
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const B = 'http://localhost:3000', OUT = new URL('./.shots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
await p.evaluateOnNewDocument(() => sessionStorage.setItem('vp-seen', '1'));
const cdp = await p.createCDPSession();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function rec(tag, act) {
  await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
  await act();
  for (let i = 0; i < 6; i++) { await wait(i ? 1000 : 150); await p.screenshot({ path: `${OUT}vt-${tag}-${i}.png` }).catch(() => {}); }
  await wait(2500);
}
await p.goto(B + '/about/', { waitUntil: 'networkidle0' });
await p.evaluate(() => document.querySelector('aside a[href="/"]').click()); await p.waitForNavigation({ waitUntil: 'networkidle0' }); await wait(500);
await p.evaluate(() => scrollTo({ top: 700, behavior: 'instant' })); await wait(400);
await rec('work-to-case', () => p.evaluate(() => document.querySelectorAll('a.card-link')[1].click()));
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
await rec('case-back', () => p.evaluate(() => history.back()));
await b.close();
console.log('ok');

// Smoke test of interactions (headless Chrome). Run with the local server up: node tools/check.mjs
import puppeteer from 'puppeteer-core';
const B = process.argv[2] || 'http://localhost:3000';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.evaluateOnNewDocument(() => sessionStorage.setItem('vp-seen', '1'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (name, v) => console.log(v ? '✓' : '✗', name);
const scrollTo = async (y) => { await p.evaluate((y) => scrollTo(0, y), y); await wait(250); };

// desktop case
await p.setViewport({ width: 1280, height: 800 });
await p.goto(B + '/work/discover-tab/', { waitUntil: 'networkidle0' });
ok('case opens at top', await p.evaluate(() => scrollY === 0));
await scrollTo(1); ok('header plate on scroll', await p.evaluate(() => document.getElementById('top').classList.contains('scrolled')));
for (let y = 100; y <= 900; y += 100) await scrollTo(y);
ok('header hides after long scroll down', await p.evaluate(() => document.getElementById('top').classList.contains('hdr-hide')));
await scrollTo(850); ok('header back on scroll up', await p.evaluate(() => !document.getElementById('top').classList.contains('hdr-hide')));
await p.evaluate(() => document.getElementById('decisions').scrollIntoView({behavior:'instant'})); await wait(300);
ok('TOC highlights current section', await p.evaluate(() => document.querySelector('a[data-sec="decisions"]').getAttribute('aria-current') === 'location'));
// lightbox
await scrollTo(0);
const n = await p.evaluate(() => document.querySelectorAll('img[width="600"]').length);
await p.evaluate(() => document.querySelectorAll('img[width="600"]')[1].click()); await wait(500);
ok('lightbox opens, counter ' + await p.evaluate(() => document.querySelector('.lb-cnt').textContent), await p.evaluate(() => document.querySelector('.lb').classList.contains('on') || getComputedStyle(document.querySelector('.lb')).opacity === '1'));
await p.keyboard.press('ArrowRight'); await wait(400);
ok('arrow → next (' + n + ' images)', await p.evaluate(() => document.querySelector('.lb-cnt').textContent.startsWith('3')));
await p.keyboard.press('Escape'); await wait(500);
ok('Esc closes', await p.evaluate(() => getComputedStyle(document.querySelector('.lb')).visibility === 'hidden' || getComputedStyle(document.querySelector('.lb')).opacity === '0'));
// email
await p.evaluate(() => document.querySelector('.em-copy').click()); await wait(100);
ok('email tip: ' + await p.evaluate(() => document.querySelector('.em-copy').dataset.tip), await p.evaluate(() => document.querySelector('.em-copy').classList.contains('copied')));
// mobile
await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
await p.goto(B + '/work/discover-tab/', { waitUntil: 'networkidle0' });
ok('bottom bar visible, Work current', await p.evaluate(() => getComputedStyle(document.querySelector('.bnav')).display === 'flex' && document.querySelector('.bnav a.on span').textContent === 'Work'));
await scrollTo(3000); ok('progress line grows', await p.evaluate(() => /scaleX\(0\.\d/.test(document.querySelector('.rp').style.transform)));
await scrollTo(99999); ok('bottom bar hides near footer', await p.evaluate(() => document.getElementById('top').classList.contains('at-end')));
// 404
const r = await p.goto(B + '/nope', { waitUntil: 'networkidle0' });
ok('404 status ' + r.status(), r.status() === 404);
ok('no JS errors ' + errs.join(' | '), errs.length === 0);
await b.close();

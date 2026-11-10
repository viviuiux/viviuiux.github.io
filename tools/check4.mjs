// Keyboard, touch gestures in the lightbox, back/forward cache, reduced motion. Run with the server up: node tools/check4.mjs
import puppeteer from 'puppeteer-core';
const B = 'http://localhost:3000';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (n, v) => console.log(v ? '✓' : '✗', n);
const errs = [];
const page = async (w, h, mob) => { const p = await b.newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.setViewport({ width: w, height: h, isMobile: mob, hasTouch: mob }); return p; };

// --- keyboard (desktop) ---
{
  const p = await page(1280, 800, false);
  await p.goto(B + '/work/discover-tab/?glass=off', { waitUntil: 'networkidle0' });
  const seq = [];
  for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return [a.tagName, (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 18), cs.outlineStyle !== 'none' || cs.opacity !== '1' || !!a.querySelector('.ul')].join('|'); })); }
  ok('Tab order starts with "Skip to content": ' + seq[0], /Skip/.test(seq[0]));
  console.log('   Tab order:', seq.map((s) => s.split('|')[1] || s.split('|')[0]).join(' → '));
  await p.keyboard.press('Enter'); // whatever is focused
  // skip link works
  await p.goto(B + '/work/discover-tab/?glass=off', { waitUntil: 'networkidle0' });
  await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await wait(400);
  ok('Skip link moves to main content', await p.evaluate(() => location.hash === '#main'));
  // lightbox by keyboard: focus an image, Enter, focus on ✕, Esc returns focus
  await p.evaluate(() => document.querySelector('img[width="600"]').focus()); await p.keyboard.press('Enter'); await wait(400);
  ok('Enter opens lightbox, focus on ✕', await p.evaluate(() => document.activeElement.classList.contains('lb-x')));
  await p.keyboard.press('Escape'); await wait(400);
  ok('Esc closes, focus back on the image', await p.evaluate(() => document.activeElement.matches('img[width="600"]')));
  ok('page scroll unlocked after close', await p.evaluate(() => !document.documentElement.classList.contains('lb-lock')));
  // TOC click scrolls to section
  await p.evaluate(() => document.querySelector('a[data-sec="outcome"]').click()); await wait(1500);
  ok('TOC click scrolls to the section', await p.evaluate(() => Math.abs(document.getElementById('outcome').getBoundingClientRect().top) < 120));
  // back to top
  await p.evaluate(() => document.querySelector('.totop').click()); await wait(2500);
  ok('Back to top scrolls to 0 (' + await p.evaluate(() => scrollY) + ')', await p.evaluate(() => scrollY < 5));
  await p.close();
}

// --- touch: lightbox swipe / swipe-down / tap to close (phone) ---
{
  const p = await page(375, 812, true);
  await p.goto(B + '/work/app-rebrand-design-system/', { waitUntil: 'networkidle0' });
  const cdp = await p.createCDPSession();
  const touch = async (pts) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] }); for (const q of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [q] }); await wait(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(500); };
  const line = (x0, y0, x1, y1) => Array.from({ length: 10 }, (_, i) => ({ x: x0 + (x1 - x0) * i / 9, y: y0 + (y1 - y0) * i / 9 }));
  await p.evaluate(() => document.querySelectorAll('img[width="600"]')[0].scrollIntoView({ block: 'center' })); await wait(300);
  await p.evaluate(() => document.querySelectorAll('img[width="600"]')[0].click()); await wait(500);
  const cnt = () => p.evaluate(() => document.querySelector('.lb-cnt').textContent);
  ok('opened ' + await cnt(), await p.evaluate(() => document.querySelector('.lb').classList.contains('on')));
  await touch(line(300, 400, 80, 410)); ok('swipe ← = next: ' + await cnt(), (await cnt()).startsWith('2'));
  await touch(line(80, 400, 300, 410)); ok('swipe → = previous: ' + await cnt(), (await cnt()).startsWith('1'));
  await touch(line(190, 300, 195, 520)); ok('swipe ↓ closes', await p.evaluate(() => !document.querySelector('.lb').classList.contains('on')));
  ok('page scroll unlocked', await p.evaluate(() => !document.documentElement.classList.contains('lb-lock')));
  await p.close();
}

// --- back / forward cache: case opens at top, Work keeps its place ---
{
  const p = await page(1280, 800, false);
  await p.goto(B + '/?glass=off', { waitUntil: 'networkidle0' }); await wait(3500);
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 900); }); await wait(300);
  await p.evaluate(() => document.querySelectorAll('a.card-link')[2].click()); await p.waitForNavigation(); await wait(800);
  ok('case opens at the top', await p.evaluate(() => scrollY === 0));
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 2000); }); await wait(300);
  await p.goBack(); await wait(1000);
  ok('Back to Work keeps the scroll position (' + await p.evaluate(() => scrollY) + ')', await p.evaluate(() => Math.abs(scrollY - 900) < 60));
  ok('no loader on Back', await p.evaluate(() => !document.documentElement.classList.contains('ld-on')));
  ok('header not stuck hidden after Back', await p.evaluate(() => !document.getElementById('top').classList.contains('hdr-hide') || scrollY > 400));
  await p.goForward(); await wait(1000);
  ok('Forward to the case opens at the top again (' + await p.evaluate(() => scrollY) + ')', await p.evaluate(() => scrollY === 0));
  await p.close();
}

// --- reduced motion: no loader, no glass, no view transition animation, flower visible ---
{
  const p = await page(1280, 800, false);
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(B + '/', { waitUntil: 'networkidle0' }); await wait(200);
  ok('reduced motion: no loader', await p.evaluate(() => !document.documentElement.classList.contains('ld-on')));
  ok('reduced motion: hero flower visible at once', await p.evaluate(() => { const f = document.querySelector('.hero-flower'); return f && getComputedStyle(f).opacity !== '0' && getComputedStyle(document.getElementById('top')).opacity === '1'; }));
  ok('reduced motion: smooth scroll off', await p.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'));
  await p.close();
}
ok('no JS errors ' + errs.join(' | '), !errs.length);
await b.close();

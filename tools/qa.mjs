// QA sweep: every page × width (+ reduced motion). Reports JS errors, failed requests, horizontal overflow,
// accessibility basics, blurry images, external links without rel, duplicate ids. Run with the server up: node tools/qa.mjs
import puppeteer from 'puppeteer-core';
const B = 'http://localhost:3000';
const PAGES = ['/', '/about/', '/work/app-rebrand-design-system/', '/work/discover-tab/', '/work/smart-interior-search/', '/work/ai-background-removal/', '/missing-page'];
const SIZES = [[375, 812, true], [834, 1112, false], [1280, 800, false], [1440, 900, false]];
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const issues = new Map();
const add = (k, where) => { if (!issues.has(k)) issues.set(k, new Set()); issues.get(k).add(where); };
for (const reduce of [false, true]) for (const [w, h, mob] of SIZES) for (const u of PAGES) {
  const where = `${u} @${w}${reduce ? ' (reduced motion)' : ''}`;
  const p = await b.newPage();
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }]);
  await p.setViewport({ width: w, height: h, isMobile: mob, hasTouch: mob });
  p.on('pageerror', (e) => add('JS error: ' + e.message, where));
  p.on('console', (m) => { if (m.type() === 'error' && !/404 \(Not Found\)/.test(m.text()) ) add('console error: ' + m.text(), where); });
  p.on('requestfailed', (r) => /\.(webm|mp4)$/.test(r.url()) || add('request failed: ' + r.url() + ' ' + (r.failure() || {}).errorText, where));
  p.on('response', (r) => { if (r.status() >= 400 && !(u === '/missing-page' && r.url().endsWith(u))) add('HTTP ' + r.status() + ': ' + r.url(), where); });
  await p.goto(B + u, { waitUntil: 'networkidle0' });
  // scroll through so lazy images and scroll logic run
  await p.evaluate(async () => { document.documentElement.style.scrollBehavior = 'auto'; const H = document.documentElement.scrollHeight; for (let y = 0; y <= H; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } await new Promise((r) => setTimeout(r, 800)); });
  const r = await p.evaluate((reduce) => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollWidth > innerWidth + 1) {
      const wide = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.tagName + '.' + e.className);
      out.push('horizontal scroll (' + de.scrollWidth + ' > ' + innerWidth + '): ' + wide.join(', '));
    }
    const h1 = document.querySelectorAll('h1').length; if (h1 !== 1) out.push('h1 count = ' + h1);
    document.querySelectorAll('img:not([alt])').forEach((i) => out.push('img without alt: ' + i.src.split('/').pop()));
    document.querySelectorAll('img:not(.lb-img)').forEach((i) => {
      if (!i.complete || !i.naturalWidth) { if (i.getAttribute('loading') !== 'lazy' || i.getBoundingClientRect().width) out.push('image not loaded: ' + i.src.split('/').pop()); return; }
      if (i.srcset) return; // srcset picks the right file per screen density (checked separately on 2×/3× screens)
      const bw = i.getBoundingClientRect().width; const fit = getComputedStyle(i).objectFit;
      // sharp on 2× screens needs ≥ 2× pixels (cover crops, so compare by the larger ratio)
      const need = fit === 'cover' ? Math.max(bw, i.getBoundingClientRect().height * i.naturalWidth / i.naturalHeight) : bw;
      if (bw > 40 && i.naturalWidth < need * 2 * 0.95) out.push(`image under 2× (${i.naturalWidth}px for ${Math.round(need)}px): ` + i.src.split('/').pop());
    });
    document.querySelectorAll('a[target=_blank]').forEach((a) => { if (!/noopener/.test(a.rel)) out.push('target=_blank without noopener: ' + a.href); });
    const ids = {}; document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; }); Object.entries(ids).forEach(([k, n]) => n > 1 && out.push('duplicate id #' + k));
    document.querySelectorAll('a[href^="#"]').forEach((a) => { const id = a.getAttribute('href').slice(1); if (id && !document.getElementById(id)) out.push('anchor to missing id ' + a.getAttribute('href')); });
    document.querySelectorAll('a, button').forEach((e) => { const n = (e.getAttribute('aria-label') || e.textContent || '').trim() || [...e.querySelectorAll('img[alt]')].map((i) => i.alt).join(''); if (!n) out.push('link/button without a name: ' + e.outerHTML.slice(0, 80)); });
    if (reduce) {
      if (de.classList.contains('ld-on')) out.push('loader on under reduced motion');
      if (/lgF/.test((document.querySelector('.lay') || {}).style?.filter || '')) out.push('glass on under reduced motion');
      if ([...document.querySelectorAll('video[data-lb]')].some((v) => !v.paused)) out.push('video autoplays under reduced motion');
    }
    // overlapping text: the fixed bottom bar must not cover the footer links at the end of the page
    const bn = document.querySelector('.bnav'); if (bn && getComputedStyle(bn).display !== 'none' && getComputedStyle(bn).opacity !== '0') {
      const fl = document.querySelector('.foot-links'); if (fl) { const a = bn.getBoundingClientRect(), c = fl.getBoundingClientRect(); if (a.top < c.bottom && a.bottom > c.top) out.push('bottom bar covers footer links at page end'); }
    }
    return out;
  }, reduce);
  r.forEach((x) => add(x, where));
  await p.close();
}
await b.close();
if (!issues.size) console.log('No issues found.');
for (const [k, v] of issues) console.log('• ' + k + '\n    ' + [...v].slice(0, 6).join(' · ') + (v.size > 6 ? ` · …(+${v.size - 6})` : ''));

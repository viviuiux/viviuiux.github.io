// Loader gating, header plate, glass and 404. Run with the server up: node tools/check2.mjs
import puppeteer from 'puppeteer-core';
const B = 'http://localhost:3000', SH = new URL('./.shots/', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (n, v) => console.log(v ? '✓' : '✗', n);
const ld = () => p.evaluate(() => document.documentElement.classList.contains('ld-on'));
await p.goto(B + '/', { waitUntil: 'load' }); ok('loader on fresh visit', await ld());
await p.screenshot({ path: SH + 'ld-1.png' }); await wait(1600); await p.screenshot({ path: SH + 'ld-2.png' }); await wait(2500);
await p.reload({ waitUntil: 'load' }); ok('loader on reload', await ld()); await wait(3500);
await p.evaluate(() => document.querySelector('a[href="/about/"]').click()); await p.waitForNavigation(); await wait(800);
await p.evaluate(() => document.querySelector('aside a[href="/"]').click()); await p.waitForNavigation(); await wait(300);
ok('no loader when coming from another page of the site', !(await ld()));
await p.goBack(); await p.goBack(); await wait(300); ok('no loader on Back', !(await ld()));
for (const u of ['/', '/about/', '/work/discover-tab/']) {
  await p.goto(B + u + '?x', { waitUntil: 'networkidle0' }); await wait(3200);
  ok('no header plate at the top of ' + u, await p.evaluate(() => !document.getElementById('top').classList.contains('scrolled') && getComputedStyle(document.querySelector('.pg .logo')).backgroundColor === 'rgba(0, 0, 0, 0)'));
}
ok('glass filter on content', await p.evaluate(() => /lgF0/.test(document.querySelector('.lay').style.filter)));
await p.evaluate(() => scrollTo({ top: 1200, behavior: 'instant' })); await wait(600); await p.screenshot({ path: SH + 'glass.png' });
const r = await p.goto(B + '/some/missing/page', { waitUntil: 'networkidle0' });
ok('404 page, status ' + r.status() + ', title "' + await p.title() + '"', r.status() === 404);
await p.evaluate(() => document.querySelector('.nf-a').click()); await p.waitForNavigation();
ok('"Back to Work" goes to ' + new URL(p.url()).pathname, new URL(p.url()).pathname === '/');
ok('no JS errors ' + errs.join(' | '), !errs.length);
await b.close();

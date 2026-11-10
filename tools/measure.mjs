// Measures page heights at the board widths (headless Chrome). Run: node tools/measure.mjs [baseUrl]
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:3000';
const TARGET = {
  1280: { '/': 2385, '/about/': 3191, '/work/app-rebrand-design-system/': 10710, '/work/discover-tab/': 7607, '/work/smart-interior-search/': 6957, '/work/ai-background-removal/': 5817 },
  1440: { '/': 2385, '/about/': 3191, '/work/app-rebrand-design-system/': 10710 },
  834: { '/': 2412, '/about/': 3562, '/work/discover-tab/': 7607, '/work/smart-interior-search/': 6957, '/work/ai-background-removal/': 5817 },
  375: { '/': 2020, '/about/': 4383, '/work/app-rebrand-design-system/': 10723, '/work/discover-tab/': 7821, '/work/smart-interior-search/': 6908, '/work/ai-background-removal/': 6332 },
};
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
for (const [w, pages] of Object.entries(TARGET)) {
  await page.setViewport({ width: +w, height: 800, isMobile: +w < 768, hasTouch: +w < 768 });
  for (const [p, t] of Object.entries(pages)) {
    await page.goto(BASE + p, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 500));
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(String(w).padEnd(5), p.padEnd(36), h, 'board', t, h === t ? '✓' : 'Δ ' + (h - t));
  }
}
await browser.close();

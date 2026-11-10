// Converts the prototype boards (src-proto/*.dc.html) into the static site in public/.
// Run:  node tools/build.mjs
// The prototype files are the design source of truth; this script only
// - renders the two templates (sidebar nav / case TOC),
// - rewrites /_blob/<id> image paths to /assets/<name> and board links to real URLs,
// - drops canvas-only code (burger menu markup, cursor variants, board-size guards),
// - adds what the real site needs (meta, favicons, view transitions, loader gating, lazy images).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src-proto');
const OUT = path.join(ROOT, 'public');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/manifest.json'), 'utf8'));

// Change this once the real domain is known (used for og:image / canonical, which must be absolute).
const SITE_URL = (process.env.SITE_URL || 'https://viviuiux.github.io').replace(/\/$/, '');

const DESC = 'Senior product designer with 5+ years of experience in mobile apps, growth and design systems.';
const RESUME = 'https://drive.google.com/file/d/1aOKujYnb-7EAlLjyKaRxROVOKjDd-9_z/view';

const LINKS = {
  'Main.dc.html': '/',
  'Loader.dc.html': '/',
  'About.dc.html': '/about/',
  'Case.dc.html': '/work/app-rebrand-design-system/',
  'Case2.dc.html': '/work/discover-tab/',
  'Case3.dc.html': '/work/smart-interior-search/',
  'Case4.dc.html': '/work/ai-background-removal/',
};

const PAGES = [
  { src: 'Main.dc.html', out: 'index.html', url: '/', title: 'Viktoriia Polotniuk — Senior Product Designer', work: true },
  { src: 'About.dc.html', out: 'about/index.html', url: '/about/', title: 'About — Viktoriia Polotniuk' },
  { src: 'Case.dc.html', out: 'work/app-rebrand-design-system/index.html', url: '/work/app-rebrand-design-system/', title: 'App rebrand & design system — Viktoriia Polotniuk', kase: true },
  { src: 'Case2.dc.html', out: 'work/discover-tab/index.html', url: '/work/discover-tab/', title: 'Discover tab from scratch — Viktoriia Polotniuk', kase: true },
  { src: 'Case3.dc.html', out: 'work/smart-interior-search/index.html', url: '/work/smart-interior-search/', title: 'Smart interior search — Viktoriia Polotniuk', kase: true },
  { src: 'Case4.dc.html', out: 'work/ai-background-removal/index.html', url: '/work/ai-background-removal/', title: 'AI background removal for artworks — Viktoriia Polotniuk', kase: true },
  { src: '404.dc.html', out: '404.html', url: null, title: 'Page not found — Viktoriia Polotniuk', notFound: true },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const between = (s, a, b, from = 0) => { const i = s.indexOf(a, from); if (i < 0) return null; const j = s.indexOf(b, i + a.length); return j < 0 ? null : s.slice(i + a.length, j); };

function blobs(s) {
  return s.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => {
    if (!MANIFEST[id]) throw new Error('Unknown asset ' + id);
    // use the WebP copy when tools/optimize.mjs made one
    const webp = MANIFEST[id].replace(/\.(png|jpg)$/, '.webp');
    if (webp !== MANIFEST[id] && fs.existsSync(path.join(OUT, 'assets', webp))) return '/assets/' + webp;
    return '/assets/' + MANIFEST[id];
  });
}
function links(s) {
  return s.replace(/href="([A-Za-z0-9-]+\.dc\.html)(#[^"]*)?"/g, (m, f, h) => {
    if (!LINKS[f]) throw new Error('Unknown link ' + f);
    return 'href="' + LINKS[f] + (h || '') + '"';
  });
}

// ---- sidebar / TOC template -------------------------------------------------
function renderNav(src, body, kase) {
  const UL = JSON.parse(between(src, 'const UL = ', ';\n'));
  const items = JSON.parse(between(src, "items() { return JSON.parse('", "')")).filter((it) => !it.id || body.includes('id="' + it.id + '"'));
  const label = between(src, "navLabel: '", "'");
  const html = items.map((it, n) => {
    const on = it.active === undefined ? n === 0 : it.active;
    const u = UL[it.label] || UL['Context'];
    const href = it.href || '#' + it.id;
    const ext = /^https?:/.test(href);
    const lineStyle = 'position: absolute; left: -8px; top: ' + (24 - Math.round(u.h / 2)) + 'px; width: ' + u.w + 'px; height: ' + u.h + 'px; pointer-events: none';
    const attrs = [
      'href="' + esc(href) + '"',
      ext ? 'target="_blank" rel="noopener"' : '',
      it.id ? 'data-sec="' + it.id + '"' : '',
      on && !it.id ? 'aria-current="page"' : '',
      on ? 'style="color: #CF453A"' : '',
    ].filter(Boolean).join(' ');
    return '<a ' + attrs + '>' + esc(it.label) + '<img class="ul" src="' + u.u + '" alt="" width="' + u.w + '" height="' + u.h + '" style="' + lineStyle + '"></a>';
  }).join('\n');
  body = body.replace(/<sc-for list="\{\{nav\}\}"[^>]*>[\s\S]*?<\/sc-for>/, html);
  body = body.replace('{{navLabel}}', label);
  if (body.includes('{{')) throw new Error('Unrendered template left');
  return body;
}

// ---- page JS ------------------------------------------------------------------
const TOC_JS = `// Case TOC: the section you are reading is red (its top is above 200 px).
{
  const links = [...document.querySelectorAll('aside.side .nav a[data-sec]')];
  if (links.length) {
    let cur = null;
    const upd = () => {
      let act = links[0];
      for (const a of links) { const el = document.getElementById(a.dataset.sec); if (el && el.getBoundingClientRect().top < 200) act = a; }
      if (act === cur) return; cur = act;
      links.forEach((a) => { const on = a === act; a.style.color = on ? '#CF453A' : ''; if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  }
}
`;

const VT_JS = `// Page transitions: name only the one cover that links the two pages (Work card ↔ case cover, "Next case" card ↔ case cover),
// and only when it is on screen; otherwise the pages just cross-fade. Elements that are hidden (scrolled-away header, bottom bar)
// do not take part, so nothing flies in from outside the screen.
{
  const norm = (u) => new URL(u, location.href).pathname.replace(/index\\.html$/, '');
  const isCase = (p) => p.startsWith('/work/');
  const site = (p) => p === '/' || isCase(p);
  const coverFor = (p) => {
    if (norm(location.href) === p) return document.querySelector('.case-cover');
    const a = [...document.querySelectorAll('a.card-link')].find((x) => norm(x.href) === p);
    return a && a.querySelector('img');
  };
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
  const named = [];
  const name = (el, n) => { if (el) { el.style.viewTransitionName = n; named.push(el); } };
  const setup = (from, to) => {
    document.documentElement.classList.add('vt-run');
    const key = site(from) && site(to) && (isCase(to) || isCase(from)) ? (isCase(to) ? to : from) : null;
    const cov = key && coverFor(key);
    if (cov && inView(cov)) name(cov, 'vt-cover');
    document.documentElement.classList.toggle('vt-side', isCase(from) === isCase(to));
    const root = document.getElementById('top');
    if (root && root.classList.contains('hdr-hide')) { name(document.querySelector('.pg .logo'), 'none'); name(document.querySelector('.bnav'), 'none'); }
    if (root && root.classList.contains('at-end')) name(document.querySelector('.bnav'), 'none');
  };
  const clear = () => { named.splice(0).forEach((el) => (el.style.viewTransitionName = '')); document.documentElement.classList.remove('vt-side', 'vt-run'); };
  addEventListener('pageswap', (e) => { if (e.viewTransition && e.activation && e.activation.entry) setup(norm(location.href), norm(e.activation.entry.url)); });
  addEventListener('pagereveal', (e) => {
    const from = window.navigation && navigation.activation && navigation.activation.from;
    if (!e.viewTransition || !from) return;
    setup(norm(from.url), norm(location.href));
    e.viewTransition.finished.finally(clear);
  });
  // a page restored by Back/Forward must not replay (or keep) the loader
  addEventListener('pageshow', (e) => { if (e.persisted) { clear(); document.documentElement.classList.remove('ld-on'); } });
}
`;

const LOADED_JS = `// Hero flower: after it has been drawn, keep it drawn. On phones the address bar changes the window height while scrolling,\n// the flower is re-placed on resize, and moving an element restarts its CSS animation (it vanished and drew again).\n{\n  const p = document.querySelector('.hf-draw');\n  if (p) {\n    const done = () => { p.style.animation = 'none'; p.style.strokeDashoffset = '0'; };\n    if (!document.documentElement.classList.contains('ld-on')) done(); else p.addEventListener('animationend', done, { once: true });\n  }\n}\n// Sidebar (site nav / case TOC): sticks in the vertical middle of the screen, never under the header.
{
  const nav = document.querySelector('aside.side > nav');
  if (nav) {
    const centre = () => { if (getComputedStyle(nav.parentElement).display === 'none') return; nav.style.top = Math.max(88, Math.round((innerHeight - nav.offsetHeight) / 2)) + 'px'; };
    centre(); addEventListener('resize', centre); document.fonts && document.fonts.ready.then(centre);
  }
}
// Case videos (were GIFs): play only while on screen; with reduced motion they stay on the poster.
{
  const vids = [...document.querySelectorAll('video[data-lb]')];
  if (vids.length && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause(); }), { rootMargin: '200px' });
    vids.forEach((v) => io.observe(v));
  }
}
// Image loading state: panel colour + soft shimmer until the picture arrives.
document.querySelectorAll('img.is-loading').forEach((im) => {
  const done = () => im.classList.remove('is-loading');
  if (im.complete && im.naturalWidth) done(); else { im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true }); }
});
// Lazy images change the page height after load: let the sidebar stop / hero flower re-measure (they listen to resize).
if ('ResizeObserver' in window) { let h = 0, t = 0; new ResizeObserver(() => { const n = document.documentElement.scrollHeight; if (n === h) return; h = n; clearTimeout(t); t = setTimeout(() => dispatchEvent(new Event('resize')), 100); }).observe(document.body); }
`;

// Lightbox additions: Case 4 videos open in it too (no zoom on video), and images with data-full show the 4× file.
function lightboxPatch(js) {
  const R = [
    [`const imgs = [...document.querySelectorAll('img[width="600"]')];`, `const imgs = [...document.querySelectorAll('img[width="600"], video[data-lb]')];`],
    [`lb.innerHTML = '<div class="lb-stage"><img class="lb-img" alt=""></div>`, `lb.innerHTML = '<div class="lb-stage"><img class="lb-img" alt=""><video class="lb-img lb-vid" muted loop playsinline hidden></video></div>`],
    [`xb = lb.querySelector('.lb-x');`, `xb = lb.querySelector('.lb-x'), vid = lb.querySelector('.lb-vid');`],
    [`big.src = imgs[i].currentSrc || imgs[i].src; big.alt = imgs[i].alt || '';\n      if (big.complete) big.onload();`,
      `const it = imgs[i], isV = it.tagName === 'VIDEO'; big.hidden = isV; vid.hidden = !isV;
      if (isV) { big.onload = null; vid.src = it.currentSrc || it.querySelector('source').src; vid.play().catch(() => {}); }
      else { vid.pause(); vid.removeAttribute('src');
        const low = it.currentSrc || it.src, hi = it.dataset.full || (it.currentSrc && it.currentSrc !== it.src ? it.src : '');
        big.src = low; big.alt = it.alt || '';
        if (hi) { const pre = new Image(); pre.onload = () => { if (imgs[i] === it) { big.onload = null; big.src = hi; } }; pre.src = hi; }
        if (big.complete) big.onload(); }`],
    [`const zoomAt = (k, px, py, anim) => {`, `const zoomAt = (k, px, py, anim) => { if (big.hidden) return;`],
    [`const close = () => { if (!on) return; on = false;`, `const close = () => { if (!on) return; on = false; vid.pause();`],
    [`ct = setTimeout(() => { if (on && s === 1) close(); }, 300)`, `ct = setTimeout(() => { if (on && s === 1) close(); }, 180)`],
    [`(im.alt || 'image')`, `(im.alt || im.dataset.alt || 'image')`],
    [`lb.querySelector('.lb-prev').addEventListener`, `vid.addEventListener('click', (e) => { e.stopPropagation(); close(); });\n    lb.querySelector('.lb-prev').addEventListener`],
  ];
  for (const [a, b] of R) { if (!js.includes(a)) throw new Error('lightbox patch: not found: ' + a.slice(0, 60)); js = js.replace(a, b); }
  return js;
}

// Case pages have no sidebar-stop block in the prototype: same rule there (stop 80 px above the footer).
const SIDE_STOP_JS = `
{
  const nav = document.querySelector('aside.side > nav'), aside = nav && nav.parentElement;
  const foot = document.querySelector('footer.foot'), lay = document.querySelector('.lay');
  const fit = () => {
    if (!nav || !foot || !lay || getComputedStyle(aside).display === 'none') return;
    aside.style.marginBottom = '';
    const gap = foot.getBoundingClientRect().top - lay.getBoundingClientRect().bottom;
    aside.style.marginBottom = -Math.max(0, gap - 80) + 'px';
  };
  fit(); addEventListener('resize', fit); setTimeout(fit, 400); setTimeout(fit, 1500);
}
`;

function pageJS(src, kase) {
  let js = between(src, 'componentDidMount() {\n', '\n}\ncomponentWillUnmount');
  if (js == null) throw new Error('No componentDidMount');
  // canvas TOC hook → our own TOC script (cases) or nothing
  js = js.replace(/this\.onScroll = this\.onScroll\.bind\(this\);\nif \((true|false)\) \{[^\n]*\}\n/, kase ? TOC_JS : '');
  // canvas-only: old burger menu (markup removed)
  js = js.replace(/\/\/ Mobile menu: closes[^\n]*\n\{\n[\s\S]*?\n\}\n\n/, '');
  // only the "drawn" cursor is in scope
  js = js.replace("const mode = () => ((self.props && self.props.cursor) || 'drawn');", "const mode = () => 'drawn';");
  // canvas boards that show a whole page are taller than 1400 px — not a thing on the real site
  js = js.replace(/innerHeight > 1400/g, 'false').replace(/innerHeight < 1400/g, 'true');
  if (kase) js = lightboxPatch(js);
  // sidebar stops 80 px above the footer (was 12 px: with the centred sidebar it looked pressed against the footer)
  if (js.includes("aside.style.marginBottom = -Math.max(0, gap - 12) + 'px';")) js = js.replace("aside.style.marginBottom = -Math.max(0, gap - 12) + 'px';", "aside.style.marginBottom = -Math.max(0, gap - 80) + 'px';");
  else js += SIDE_STOP_JS;
  if (/this\.|self\.props/.test(js.replace(/const self = this,/, ''))) throw new Error('Leftover component reference');
  return '(function () {\n' + js.replace('const self = this, ', 'const ') + '\n' + VT_JS + LOADED_JS + '})();';
}

// ---- head ------------------------------------------------------------------
function head(page, helmet) {
  let css = helmet;
  css = css.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '');
  css = css.replace(/@font-face\{font-family:'DeFonte';src:url\(\/_blob\/07a008ec63b0b372ac9c8c1b8b863883\) format\('truetype'\)/,
    "@font-face{font-family:'DeFonte';src:url(/assets/font-defonte.ttf) format('truetype')");
  css = css.replace('</style>', SITE_CSS + '</style>');
  const abs = page.url ? SITE_URL + page.url : null;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(DESC)}">
${abs ? `<link rel="canonical" href="${abs}">\n` : ''}<meta name="theme-color" content="#F6F5F1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Viktoriia Polotniuk">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(DESC)}">
${abs ? `<meta property="og:url" content="${abs}">\n` : ''}<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(DESC)}">
<meta name="twitter:image" content="${SITE_URL}/og-image.png">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/dm-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/font-defonte.ttf" as="font" type="font/ttf" crossorigin>
${page.work ? LOADER_GATE : ''}
${css.trim()}`;
}

// Loader: plays when you open the site fresh (typed URL, bookmark, link from LinkedIn…) and on reload;
// not when you come to Work from another page of the site or with Back/Forward. Skipped under reduced motion.
const LOADER_GATE = "<script>try{(function(){var n=performance.getEntriesByType('navigation')[0],t=n?n.type:'navigate',r=document.referrer,inside=false;try{inside=!!r&&new URL(r).origin===location.origin}catch(e){}if((t==='reload'||(t==='navigate'&&!inside))&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('ld-on')})()}catch(e){}</script>";

// Additions on top of the prototype CSS (real-site only).
const SITE_CSS = `
/* DM Sans, self-hosted (same files Google Fonts serves; OFL licence) */
@font-face{font-family:'DM Sans';font-style:normal;font-weight:400 500;font-display:swap;src:url(/fonts/dm-sans-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF}\n@font-face{font-family:'DM Sans';font-style:normal;font-weight:400 500;font-display:swap;src:url(/fonts/dm-sans-latin.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
/* ---- real site additions ---- */
@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto}}
/* Page transitions (variant B, made calmer): pages cross-fade with no blank gap; only the cover you clicked
   morphs (its name is set in JS just for that navigation); the logo and the sidebar keep their place. */
.side{view-transition-name:none}
.pg .logo{view-transition-name:none}
.pg .logo img{view-transition-name:site-logo}
::view-transition-old(root){animation:vt-out .24s cubic-bezier(.4,0,1,1) both}
::view-transition-new(root){animation:vt-in .42s cubic-bezier(.2,.7,.2,1) .06s both}
@keyframes vt-in{from{opacity:0;transform:translateY(8px)}}
::view-transition-group(*){animation-duration:.5s;animation-timing-function:cubic-bezier(.4,0,.2,1)}
::view-transition-group(vt-cover){animation-duration:.55s;animation-timing-function:cubic-bezier(.65,0,.25,1)}
::view-transition-old(vt-cover),::view-transition-new(vt-cover){width:100%;height:100%;object-fit:cover;animation-duration:.55s}
::view-transition-old(vt-cover){animation-name:vt-cover-out}
@keyframes vt-cover-out{to{opacity:0}}
::view-transition-new(vt-cover){animation:none}
::view-transition-old(site-logo),::view-transition-new(site-logo){animation:none}
::view-transition-group(site-bnav){animation-duration:.25s}
::view-transition-old(site-bnav),::view-transition-new(site-bnav){animation-duration:.25s}
.nav a[aria-current] .ul{display:none}
.lb [hidden]{display:none!important}
video[data-lb]{background:#ECECEC}
/* the footer sits in a page-coloured box so the glass band also bends the edges of the red block */
.foot-wrap{display:flow-root;background:#F6F5F1}
.lb{transition:opacity .18s ease!important}
/* case card hover: the cover zooms 3.5 % inside its frame (mouse / trackpad only, not with reduced motion) */
.ph-clip{display:block;overflow:hidden}
@media (min-width:768px){.stk-stage{gap:40px}}
/* bottom bar (phones): the frosted glass sits on a layer clipped to the rounded shape, so no square corners show
   while the bar fades or during page transitions; while pages switch the glass is replaced by a solid tint */
@media (max-width:767px){
.bnav{-webkit-backdrop-filter:none;backdrop-filter:none}
.bnav::before{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);clip-path:inset(0 round 22px);pointer-events:none}
html.vt-run .bnav::before{-webkit-backdrop-filter:none;backdrop-filter:none}
html.vt-run .bnav{background:rgba(246,245,241,.96)}
}
.card-link .ph{transition:transform .5s cubic-bezier(.2,.7,.2,1),background-color .3s ease}
@media (hover:hover) and (prefers-reduced-motion:no-preference){.card-link:hover .ph{transform:scale(1.035)}}
/* header plate fades in / out softly instead of switching on at once */
.pg .logo{transition:transform .35s ease,opacity .35s ease,background-color .3s ease}
/* Email: dim only the link text on hover / focus, so the tooltip (part of the link) keeps one colour */
.foot a.em-copy:hover,.foot a.em-copy:focus-visible{opacity:1;color:rgba(248,239,222,.8)}
/* About on phones: the portrait never fills the whole screen, so the name under it peeks out above the bottom bar */
@media (max-width:767px){.ab-portrait{max-height:max(240px,calc(100svh - 300px))}}
img.is-loading{background:#ECECEC linear-gradient(100deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.6) 50%,rgba(255,255,255,0) 70%) 0 0/200% 100% no-repeat;animation:img-sh 1.4s linear infinite}
@keyframes img-sh{from{background-position:150% 0}to{background-position:-50% 0}}
@media (prefers-reduced-motion: reduce){img.is-loading{animation:none}html{scroll-behavior:auto!important}}
.skip{position:absolute;left:12px;top:-60px;z-index:3000;background:#1E1E1E;color:#F6F5F1;font:500 14px/1 'DM Sans',sans-serif;padding:12px 16px;border-radius:8px;text-decoration:none}
.skip:focus{top:12px}
`;

// ---- loader (Work only) -----------------------------------------------------
function loaderParts() {
  const L = read('Loader.dc.html');
  let css = between(L, '/* ===== Loader draft ===== */', '.ld-replay{');
  css = css
    .replace('.ld{position:fixed', '.ld{display:none}\nhtml.ld-on .ld{display:flex;position:fixed')
    .replace(/\n#top\{/, '\nhtml.ld-on #top{')
    .replace(/\n\.hf-draw\{/, '\nhtml.ld-on .hf-draw{')
    // the hero flower starts drawing as the loader lifts (was 3.15 s, a visible pause)
    .replace('ldDraw 1.3s cubic-bezier(.55,.1,.35,1) 3.15s', 'ldDraw 1s cubic-bezier(.55,.1,.35,1) 2.6s');
  css += '@media (prefers-reduced-motion: reduce){.ld{display:none!important}}\n';
  const markup = L.match(/<div class="ld" aria-hidden="true">[\s\S]*?<\/svg><\/div><\/div>/)[0];
  const svg = L.match(/<svg class="hero-flower"[\s\S]*?<\/svg>/)[0].replace('class="hero-flower"', 'class="hero-flower hero-flower-draw"');
  return { css, markup, svg };
}

// ---- assemble ---------------------------------------------------------------
function build(page) {
  const src = read(page.src);
  let helmet = between(src, '<helmet>', '</helmet>');
  let body = between(src, '</helmet>', '</x-dc>');
  let js = page.notFound ? '' : pageJS(src, page.kase);

  if (!page.notFound) body = renderNav(src, body, page.kase);
  // covers get their transition name from JS only for the navigation that needs it
  body = body.replace(/view-transition-name: cv-Case\d?; /g, '');

  // drop the old burger menu (hidden on the site since the bottom bar replaced it)
  body = body.replace(/<input type="checkbox" id="mnav"[\s\S]*?<\/nav><\/div>/, '');

  if (page.work) {
    const L = loaderParts();
    helmet = helmet.replace('</style>', L.css + '</style>');
    body = L.markup + '\n' + body;
    // first visit: the outline flower draws in after the loader; otherwise the normal hero flower
    body = body.replace(/(<img class="hero-flower"[^>]*>)/, (m) => m + L.svg +
      `<script>(function(){var on=document.documentElement.classList.contains('ld-on');var a=document.querySelectorAll('.hero-flower');(on?a[0]:a[1]).remove();})();</script>`);
  }

  // Case 4: animated GIFs → silent looping videos (hires/ → assets/ by tools/optimize.mjs)
  body = body.replace(/<img src="\/_blob\/([0-9a-f]{32})" alt="([^"]*)" width="(\d+)" height="(\d+)" style="([^"]*)">/g, (m, id, alt, w, h, st) => {
    const base = (MANIFEST[id] || '').replace(/\.gif$/, '');
    if (!/\.gif$/.test(MANIFEST[id] || '') || !fs.existsSync(path.join(OUT, 'assets', base + '.webm'))) return m;
    return `<video data-lb data-alt="${alt}" aria-label="${alt}" width="${w}" height="${h}" style="${st}; object-fit: cover" muted loop playsinline preload="metadata" poster="/assets/${base}-poster.webp">`
      + `<source src="/assets/${base}.webm" type="video/webm"><source src="/assets/${base}.mp4" type="video/mp4"></video>`;
  });

  // lazy-load everything that is not on the first screen; shimmer on photos / screens
  let n = 0, firstCard = false;
  body = body.replace(/<img\b([^>]*)>/g, (m, a) => {
    n++;
    const firstScreen = /class="[^"]*(hero-flower|case-cover)|alt="Viktoriia Polotniuk"|class="ul"/.test(a) || (page.work && n <= 4);
    let out = a;
    if (!/\bloading=/.test(out) && !firstScreen) out += ' loading="lazy"';
    if (!/\bdecoding=/.test(out)) out += ' decoding="async"';
    const id = (a.match(/\/_blob\/([0-9a-f]{32})/) || [])[1];
    // phones get a smaller copy (srcset); the case cover / first Work card load first
    const asset = id && MANIFEST[id] && MANIFEST[id].replace(/\.(png|jpg)$/, '.webp');
    const big600 = /width="600"/.test(a), cover = /class="[^"]*\bph\b/.test(a);
    if (asset && (big600 || cover) && fs.existsSync(path.join(OUT, 'assets', asset.replace('.webp', '-640.webp')))) {
      const u = '/assets/' + asset;
      out += ` srcset="${u.replace('.webp', '-640.webp')} 640w, ${u.replace('.webp', '-960.webp')} 960w, ${u} 1200w" sizes="(max-width: 767px) calc(100vw - 40px), ${cover ? 756 : 600}px"`;
    }
    if (/case-cover/.test(a) || /alt="Viktoriia Polotniuk" width="240"/.test(a) || (page.work && cover && !firstCard)) { out += ' fetchpriority="high"'; firstCard = true; }
    // lightbox-only 4× source, loaded when the lightbox opens
    const full = id && MANIFEST[id] && MANIFEST[id].replace(/\.(png|jpg)$/, '@full.webp');
    if (full && /width="600"/.test(a) && fs.existsSync(path.join(OUT, 'assets', full))) out += ` data-full="/assets/${full}"`;
    const photo = /width="600"|class="ph|width="244"|width="240"/.test(a);
    if (photo && !/\.png"/.test(a.match(/src="[^"]*"/)?.[0] || '') || /width="600"/.test(a)) {
      out = /class="/.test(out) ? out.replace(/class="/, 'class="is-loading ') : out + ' class="is-loading"';
    }
    return '<img' + out + '>';
  });

  // case cards: the cover sits in a clipping frame so it can zoom in a little on hover
  body = body.replace(/(<a class="card-link"[^>]*>)(<img [^>]*>)/g, '$1<span class="ph-clip">$2</span>');

  // footer in a page-coloured wrapper (for the glass effect)
  body = body.replace(/<footer class="foot"/, '<div class="foot-wrap"><footer class="foot"').replace('</footer>', '</footer></div>');

  // skip link + landmarks
  if (!page.notFound) body = body.replace(/(<div id="top" class="pg")/, '<a class="skip" href="#main">Skip to content</a>\n$1').replace(/<main style=/, '<main id="main" style=');

  let html = `<!doctype html>
<html lang="en">
<head>
${head(page, helmet)}
</head>
<body>
${body.trim()}
${js ? '<script>\n' + js + '\n</script>' : ''}${page.notFound ? '' : '\n<script src="/js/glass.js" defer></script>'}
</body>
</html>
`;
  html = links(blobs(html));
  // everything on red uses the page colour #F6F5F1 (was a warm cream #F8EFDE)
  html = html.replace(/#F8EFDE/gi, '#F6F5F1').replace(/248, ?239, ?222/g, '246,245,241')
    .replace(/(<a class="totop"[^>]*><img src=")\/assets\/icon-back-to-top\.png/, '$1/assets/icon-back-to-top-page.png');
  // small copies of the outline flower where it is shown small (bottom-bar icon, 404 page)
  html = html.replace('.bnav .bi-w{--m:url(/assets/flower-outline.png)', '.bnav .bi-w{--m:url(/assets/flower-outline-96.png)')
    .replace('<img class="nf-flower" src="/assets/flower-outline.png"', '<img class="nf-flower" src="/assets/flower-outline-420.png"');
  // a page links to itself → keep it as a real link (Back to top is #top)
  if (/_blob|\.dc\.html|\{\{/.test(html)) throw new Error(page.src + ': leftovers');
  const outFile = path.join(OUT, page.out);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  console.log('✓', page.out, (html.length / 1024).toFixed(0) + ' KB');
}

// Liquid glass on scroll (from the G-* drafts): content passing the bottom edge of the screen is refracted.
// Try variants with ?glass=band (default) | pill | off in the address bar.
function buildGlass() {
  const G = fs.readFileSync(path.join(SRC, 'glass/project/G-Main.dc.html'), 'utf8');
  let block = G.match(/\/\/ ===== Liquid glass draft[\s\S]*?\n\}\n/)[0];
  block = block.replace("const self = this;\n", '')
    .replace("const mode = () => ((self.props && self.props.glass) || 'band');",
      "const pick = new URLSearchParams(location.search).get('glass');\n  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;\n  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches; // phones: off (it slowed loading a lot); ?glass=band forces it on\n  const mode = () => ['band', 'pill', 'off'].includes(pick) ? pick : (reduce || !fine ? 'off' : 'band');");
  block = block.replace("document.querySelectorAll('.lay, footer.foot')", "document.querySelectorAll('.lay, .foot-wrap')");
  // stronger colour split: R / G / B are shifted by clearly different amounts (colours only edges, flat fills stay clean)
  const SPLIT = [24, 38, 54];
  for (const [o, n] of [['scale="34"', 'scale="' + SPLIT[0] + '"'], ['scale="37"', 'scale="' + SPLIT[1] + '"'], ['scale="40"', 'scale="' + SPLIT[2] + '"']]) {
    if (!block.includes(o)) throw new Error('glass: not found ' + o); block = block.replace(o, n);
  }
  // no colour line at the bottom edge of a block: refract a copy that has the page colour underneath, with room below the block
  for (const [o, n] of [
    ['<feFlood flood-color="rgb(128,128,128)" result="neutral"/>', '<feFlood flood-color="rgb(128,128,128)" result="neutral"/>\n    <feFlood flood-color="#F6F5F1" result="pagebg"/>\n    <feMerge result="src"><feMergeNode in="pagebg"/><feMergeNode in="SourceGraphic"/></feMerge>'],
    ["F.setAttribute('height', Math.ceil(Math.max(r.height, t.scrollHeight)));", "F.setAttribute('height', Math.ceil(Math.max(r.height, t.scrollHeight)) + 60);"],
  ]) { if (!block.includes(o)) throw new Error('glass: not found ' + o); block = block.replace(o, n); }
  block = block.split('<feDisplacementMap in="SourceGraphic"').join('<feDisplacementMap in="src"');
  // the effect fades out over the last 160 px of the page, so at the very bottom the footer shows its real, straight shape
  const P = "const place = () => {\n    if (mode() === 'off') return;";
  if (!block.includes(P)) throw new Error('glass: place() not found');
  block = block.replace(P, P + "\n    const left = document.documentElement.scrollHeight - innerHeight - scrollY, k = Math.max(0, Math.min(1, left / 160));\n    filters.forEach((F) => F.querySelectorAll('feDisplacementMap').forEach((d, j) => d.setAttribute('scale', ([" + SPLIT + "][j] * k).toFixed(2))));");
  if (/self\.|this\./.test(block)) throw new Error('glass: leftover component reference');
  fs.mkdirSync(path.join(OUT, 'js'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'js/glass.js'), '(function () {\n' + block + '})();\n');
  console.log('✓ js/glass.js');
}
PAGES.forEach(build);
buildGlass();

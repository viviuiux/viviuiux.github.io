(function () {
// ===== Liquid glass draft: content (and the footer) passing the bottom edge of the screen is refracted — pulled wider to both sides — with a slight colour split. Board props → Glass. =====
{
    const pick = new URLSearchParams(location.search).get('glass');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches; // phones: off (it slowed loading a lot); ?glass=band forces it on
  const mode = () => ['band', 'pill', 'off'].includes(pick) ? pick : (reduce || !fine ? 'off' : 'band');
  const NS = 'http://www.w3.org/2000/svg';
  const targets = [...document.querySelectorAll('.lay, .foot-wrap')];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
  svg.innerHTML = targets.map((_, i) => `<filter id="lgF${i}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feFlood flood-color="rgb(128,128,128)" result="neutral"/>
    <feFlood flood-color="#F6F5F1" result="pagebg"/>
    <feMerge result="src"><feMergeNode in="pagebg"/><feMergeNode in="SourceGraphic"/></feMerge>
    <feImage class="lgMap" preserveAspectRatio="none" result="lens"/>
    <feComposite in="lens" in2="neutral" operator="over" result="map"/>
    <feDisplacementMap in="src" in2="map" scale="24" xChannelSelector="R" yChannelSelector="G" result="dR"/>
    <feDisplacementMap in="src" in2="map" scale="38" xChannelSelector="R" yChannelSelector="G" result="dG"/>
    <feDisplacementMap in="src" in2="map" scale="54" xChannelSelector="R" yChannelSelector="G" result="dB"/>
    <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
    <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
    <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
    <feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg"/>
    <feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1" result="glass"/>
    <feComposite in="glass" in2="lens" operator="in" result="glassBand"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="glassBand"/></feMerge>
  </filter>`).join('');
  document.body.append(svg);
  const filters = [...svg.querySelectorAll('filter')];
  const mapFor = (w, h, pill) => {
    const bw = pill ? Math.min(440, w - 32) : w;
    const c = document.createElement('canvas'); c.width = bw; c.height = h;
    const ctx = c.getContext('2d'), img = ctx.createImageData(bw, h), d = img.data;
    const rad = pill ? h / 2 : 0, ez = pill ? rad : h;
    for (let y = 0; y < h; y++) for (let x = 0; x < bw; x++) {
      let dx = 0, dy = 0, a = 255;
      if (!pill) { const t = (y + 1) / h, k = Math.pow(t, 1.8), cxm = bw / 2; dx = -((x - cxm) / cxm) * k; dy = -0.35 * k; }
      else {
        const cx = Math.min(Math.max(x, rad), bw - rad), cy = h / 2, vx = x - cx, vy = y - cy, dist = Math.hypot(vx, vy);
        if (dist > rad) a = 0;
        else { const edge = rad - dist; if (edge < ez && dist > 0) { const k = Math.pow(1 - edge / ez, 2) * 0.35; dx = -vx / dist * k; dy = -vy / dist * k; } }
      }
      const i = (y * bw + x) * 4; d[i] = 128 + dx * 127; d[i + 1] = 128 + dy * 127; d[i + 2] = 128; d[i + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    return { url: c.toDataURL(), bw };
  };
  let built = '', mapH = 0;
  const build = () => {
    const m = mode(); built = m + innerWidth;
    targets.forEach((t, i) => {
      if (m === 'off') { t.style.filter = ''; return; }
      const pill = m === 'pill';
      const h = pill ? (innerWidth < 768 ? 56 : 64) : (innerWidth < 768 ? 22 : 30);
      const w = Math.round(t.getBoundingClientRect().width);
      const { url, bw } = mapFor(w, h, pill);
      const fe = filters[i].querySelector('.lgMap');
      fe.setAttribute('width', bw); fe.setAttribute('height', h); fe.setAttribute('href', url);
      fe.dataset.x = pill ? (w - bw) / 2 : 0; mapH = h;
      if (t.classList.contains('lay')) t.style.background = '#F6F5F1';
      t.style.filter = `url(#lgF${i})`;
    });
    place();
  };
  const place = () => {
    if (mode() === 'off') return;
    const left = document.documentElement.scrollHeight - innerHeight - scrollY, k = Math.max(0, Math.min(1, left / 160));
    filters.forEach((F) => F.querySelectorAll('feDisplacementMap').forEach((d, j) => d.setAttribute('scale', ([24,38,54][j] * k).toFixed(2))));
    const off = mode() === 'pill' ? (innerWidth < 768 ? 16 : 20) : 0;
    targets.forEach((t, i) => {
      const r = t.getBoundingClientRect(), F = filters[i], fe = F.querySelector('.lgMap');
      F.setAttribute('x', 0); F.setAttribute('y', 0); F.setAttribute('width', Math.ceil(r.width)); F.setAttribute('height', Math.ceil(Math.max(r.height, t.scrollHeight)) + 60);
      fe.setAttribute('x', fe.dataset.x || 0);
      fe.setAttribute('y', Math.round(innerHeight - mapH - off - r.top));
    });
  };
  let raf = 0;
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; place(); }); }, { passive: true });
  window.addEventListener('resize', build);
  build();
  setInterval(() => { if (mode() + innerWidth !== built) build(); place(); }, 300);
}
})();

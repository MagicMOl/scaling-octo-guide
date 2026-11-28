/* 通用小工具：撕纸多边形 */
  /* --- 撕纸 --- */
  function rnd(seed) { let s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function tornPolygon(el, seed, amp) {
    const w = el.clientWidth || el.offsetWidth, h = el.clientHeight || el.offsetHeight;
    if (!w || !h) return 'none';
    const r = rnd(seed), j = () => (r() * 2 - 1) * amp, step = 13, pts = [];
    for (let x = 0; x <= w; x += step) pts.push(`${x.toFixed(1)}px ${Math.abs(j()).toFixed(1)}px`);
    for (let y = 0; y <= h; y += step) pts.push(`${(w - Math.abs(j())).toFixed(1)}px ${y.toFixed(1)}px`);
    for (let x = w; x >= 0; x -= step) pts.push(`${x.toFixed(1)}px ${(h - Math.abs(j())).toFixed(1)}px`);
    for (let y = h; y >= 0; y -= step) pts.push(`${Math.abs(j()).toFixed(1)}px ${y.toFixed(1)}px`);
    return 'polygon(' + pts.join(',') + ')';
  }
  function tearAll(root) {
    root.querySelectorAll('.tear[data-seed]').forEach((el) => {
      const poly = tornPolygon(el, Number(el.dataset.seed), 7);
      el.style.setProperty('--tear', poly);
      el.parentElement.style.setProperty('--tear', poly);
    });
  }
  tearAll(document);


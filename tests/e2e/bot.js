// A page-side bot that plays Mint Condition through the real UI, for either player.
//
// It doesn't react to frames (headless WebGL can run at 5–12fps, which would make
// every reading stale). Instead it watches the DOM with MutationObservers, predicts
// *when* each note arrives / the needle crosses centre / the ring closes, and
// schedules a real keydown for that moment plus a human-like timing error:
//   error ~ N(+25ms late bias, σ)
// so its scores reflect σ, not the frame rate. The game judges by event timestamp.
//
// window.__bot = { on, sigma (ms), mashRate (presses/s), skill (legacy 0–1 → σ) }
(() => {
  const bot = { on: false, sigma: null, skill: 0.85, mashRate: null, log: [] };
  window.__bot = bot;
  const sigma = () => bot.sigma ?? 20 + (1 - bot.skill) * 200;
  const rate = () => bot.mashRate ?? (sigma() <= 40 ? 8 : sigma() <= 80 ? 6.5 : 5.5);
  const gauss = () => {
    let u = 0;
    for (let i = 0; i < 6; i++) u += Math.random();
    return (u - 3) * Math.SQRT2;
  };
  const err = () => 25 + gauss() * sigma();
  const KEYS = {
    p1: { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD', act: 'Space' },
    p2: { up: 'ArrowUp', left: 'ArrowLeft', down: 'ArrowDown', right: 'ArrowRight', act: 'Enter' },
  };
  const press = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  const keysFor = (el) => KEYS[(el && el.closest('[data-control]')?.dataset.control) === 'p2' ? 'p2' : 'p1'];
  const at = (when, fn) => setTimeout(fn, Math.max(0, when - performance.now()));
  const LANES = ['left', 'down', 'up', 'right'];

  // Two observations of a linearly moving value → predicted time it reaches `target`.
  const tracks = new WeakMap();
  function predict(el, value, target, onTime) {
    const now = performance.now();
    const prev = tracks.get(el);
    if (!prev) return tracks.set(el, { v: value, t: now, done: false });
    if (prev.done) return;
    const dv = value - prev.v;
    const dt = now - prev.t;
    if (dt < 1) return;
    if (Math.abs(dv) < 1e-6) return tracks.set(el, { v: value, t: now, done: false }); // not moving yet
    const speed = dv / dt;
    const eta = (target - value) / speed;
    if (eta < 0) {
      tracks.set(el, { v: value, t: now, done: false });
      return;
    }
    prev.done = true;
    onTime(now + eta);
  }

  const mo = new MutationObserver((muts) => {
    if (!bot.on) return;
    for (const m of muts) {
      const el = m.target;
      if (!(el instanceof HTMLElement)) continue;
      if (el.classList.contains('rh-note')) {
        const y = parseFloat((/translateY\(([-\d.]+)px\)/.exec(el.style.transform) || [])[1]);
        if (Number.isNaN(y)) continue;
        predict(el, y, 0, (t) => {
          const lane = Math.round(parseFloat(el.style.left) / 25);
          const k = keysFor(el);
          at(t + err(), () => press(k[LANES[lane]]));
        });
      } else if (el.classList.contains('tm-needle')) {
        const x = parseFloat(el.style.left || '0');
        predict(el, x, 50, (t) => {
          const k = keysFor(el);
          at(t + err(), () => press(k.act));
        });
      } else if (el.classList.contains('kc-ring')) {
        const s = parseFloat((/scale\(([\d.]+)\)/.exec(el.style.transform) || [])[1]);
        if (Number.isNaN(s)) continue;
        predict(el, s, 1, (t) => {
          const k = keysFor(el);
          at(t + err(), () => press(k.act));
        });
      }
    }
  });
  const start = () => mo.observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: true });
  if (document.body) start();
  else addEventListener('DOMContentLoaded', start);

  // Menus and mashing are polled; neither is timing-sensitive.
  let menuT = 0;
  let mashT = 0;
  setInterval(() => {
    if (!bot.on) return;
    const now = performance.now();
    const menu = document.querySelector('.menu[data-control]');
    if (menu && now - menuT > 500) {
      menuT = now;
      const k = keysFor(menu);
      const cards = [...menu.querySelectorAll('.mcard')];
      // People mostly attack: 70% pick a SHOW move when one exists.
      const shows = cards.map((c, i) => (/POW/.test(c.textContent) ? i : -1)).filter((i) => i >= 0);
      const pick = shows.length && Math.random() < 0.7 ? shows[Math.floor(Math.random() * shows.length)] : Math.floor(Math.random() * cards.length);
      bot.log.push({ kind: 'menu', pick: cards[pick]?.querySelector('.mname')?.textContent });
      press(k[['up', 'left', 'right', 'down'][pick]]);
      setTimeout(() => press(k.act), 150);
    }
    const meter = document.querySelector('.ms-meter');
    if (meter && now - mashT > 1000 / rate() + gauss() * 15) {
      mashT = now;
      press(keysFor(meter).act);
    }
  }, 16);
})();

// A page-side bot that plays Mint Condition through the real UI, for both players.
// It reads the DOM (notes, needle, ring) and dispatches real keydown events, so
// the game's own timing code is what gets exercised. skill ∈ [0,1].
(() => {
  const bot = { on: false, skill: 0.85, log: [] };
  window.__bot = bot;
  const KEYS = {
    p1: { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD', act: 'Space' },
    p2: { up: 'ArrowUp', left: 'ArrowLeft', down: 'ArrowDown', right: 'ArrowRight', act: 'Enter' },
  };
  const press = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  const keysFor = (el) => KEYS[(el && el.closest('[data-control]')?.dataset.control) === 'p2' ? 'p2' : 'p1'];
  const jitter = () => (1 - bot.skill) * (Math.random() - 0.3) * 260;
  const pressed = new WeakSet();
  let mashT = 0, menuT = 0, timingDone = null, ringDone = null;
  const LANES = ['left', 'down', 'up', 'right'];
  function tick() {
    if (bot.on) {
      const now = performance.now();
      const menu = document.querySelector('.menu[data-control]');
      if (menu && now - menuT > 450) {
        menuT = now;
        const k = keysFor(menu);
        const n = menu.querySelectorAll('.mcard').length;
        const slot = ['up', 'left', 'right', 'down'][Math.floor(Math.random() * n)];
        press(k[slot]);
        setTimeout(() => press(k.act), 120);
      }
      const field = document.querySelector('.rh-field');
      if (field) {
        const k = keysFor(field);
        for (const n of field.querySelectorAll('.rh-note')) {
          if (pressed.has(n) || n.classList.contains('hit') || n.classList.contains('miss')) continue;
          const m = /translateY\(([-\d.]+)px\)/.exec(n.style.transform);
          if (m && parseFloat(m[1]) < 10) {
            pressed.add(n);
            const lane = Math.round(parseFloat(n.style.left) / 25);
            setTimeout(() => press(k[LANES[lane]]), Math.max(0, jitter()));
          }
        }
      }
      const needle = document.querySelector('.tm-needle');
      if (needle && timingDone !== needle) {
        const x = parseFloat(needle.style.left || '0');
        const target = 50 + (1 - bot.skill) * (Math.random() - 0.5) * 40;
        if (Math.abs(x - target) < 2.5) {
          timingDone = needle;
          press(keysFor(needle).act);
        }
      }
      const meter = document.querySelector('.ms-meter');
      if (meter && now - mashT > 60 + (1 - bot.skill) * 120) {
        mashT = now;
        press(keysFor(meter).act);
      }
      const ring = document.querySelector('.kc-ring');
      if (ring && ringDone !== ring && !/perfect|good|none|flinch/.test(ring.className)) {
        const m = /scale\(([\d.]+)\)/.exec(ring.style.transform);
        if (m && parseFloat(m[1]) < 1.08 + jitter() / 2000) {
          ringDone = ring;
          press(keysFor(ring).act);
        }
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

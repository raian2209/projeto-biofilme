// Lógica da missão: cronômetro, progresso real de limpeza, pausa e estados de fim.
// A vitória só acontece quando as 3 regiões atingem o progresso de limpeza dentro do tempo.

import { REGIONS, FEEDBACK, MISSION_TIPS } from './content.js';

const $ = (id) => document.getElementById(id);

const BRUSH_SVG = `
<svg viewBox="0 0 44 150" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bh" x1="0" x2="1"><stop offset="0" stop-color="#3aa6e8"/><stop offset="1" stop-color="#14b8c4"/></linearGradient></defs>
  <rect x="14" y="0" width="16" height="104" rx="8" fill="url(#bh)" stroke="#0b6f86" stroke-width="2"/>
  <rect x="19" y="10" width="4" height="70" rx="2" fill="#fff" opacity=".45"/>
  <g class="brush__head">
    <rect x="9" y="96" width="26" height="22" rx="7" fill="#ffd23f" stroke="#c18a00" stroke-width="2"/>
    <g stroke="#fff" stroke-width="3" stroke-linecap="round">
      <path d="M13 116v28M19 118v30M25 118v30M31 116v28" />
    </g>
    <g stroke="#9bd8f4" stroke-width="1.2"><path d="M16 120v26M22 120v28M28 120v26"/></g>
  </g>
</svg>`;

export function createGame({ mouth, duration = 120, onWin, onLose }) {
  const slot = $('slot-mission');
  const timerEl = $('timer');
  const meterFill = $('meter-fill');
  const meterText = $('meter-text');
  const toast = $('toast');
  const brush = $('brush');
  const fx = $('fx');
  const countdown = $('countdown');
  const pauseOverlay = $('pause-overlay');
  const tipEl = $('mission-tip');
  const doneEl = $('regions-done');
  const tabs = [...document.querySelectorAll('.tab')];
  brush.innerHTML = BRUSH_SVG;

  const g = {
    state: 'idle', // idle | countdown | running | paused | done
    elapsed: 0,
    last: 0,
    done: { front: false, left: false, right: false },
    current: 'front',
    flags: { first: false, half: false, almost: false },
    lastBrush: 0,
    lastTip: 0,
    tipIdx: 0,
    toastT: 0,
    raf: 0,
    winT: 0,
  };

  /* ---------- UI helpers ---------- */
  const fmt = (s) => {
    const t = Math.max(0, Math.ceil(s));
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };

  function say(msg, good = false, ms = 2200) {
    toast.textContent = msg;
    toast.classList.toggle('is-good', good);
    toast.classList.add('is-on');
    clearTimeout(g.toastT);
    g.toastT = setTimeout(() => toast.classList.remove('is-on'), ms);
  }

  function rect() {
    return slot.getBoundingClientRect();
  }

  function burst(x, y, n = 8, stars = false) {
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = stars ? 'star' : 'spark';
      if (stars) el.textContent = '⭐';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      const a = Math.random() * Math.PI * 2;
      const r = (stars ? 50 : 20) + Math.random() * (stars ? 70 : 30);
      el.style.setProperty('--dx', `${Math.cos(a) * r}px`);
      el.style.setProperty('--dy', `${Math.sin(a) * r - (stars ? 20 : 0)}px`);
      fx.append(el);
      setTimeout(() => el.remove(), 1000);
    }
  }

  function renderProgress(p) {
    const shown = { ...p };
    for (const r of Object.keys(g.done)) if (g.done[r]) shown[r] = 1;
    const overall = (shown.front + shown.left + shown.right) / 3;
    meterFill.style.width = `${Math.round(overall * 100)}%`;
    meterText.textContent = `${Math.round(overall * 100)}%`;
    for (const tab of tabs) {
      const r = tab.dataset.region;
      const pct = Math.round(shown[r] * 100);
      tab.querySelector('.tab__ring').style.setProperty('--p', pct);
      tab.querySelector('small').textContent = g.done[r] ? 'Concluída' : `${pct}%`;
      tab.classList.toggle('is-done', g.done[r]);
      tab.classList.toggle('is-current', g.current === r && !g.done[r]);
    }
    const n = Object.values(g.done).filter(Boolean).length;
    doneEl.innerHTML = `Regiões concluídas: <b>${n} de 3</b>`;
    return overall;
  }

  function setTip(i) {
    tipEl.textContent = MISSION_TIPS[i % MISSION_TIPS.length];
  }

  /* ---------- Fluxo ---------- */
  function resetState() {
    g.elapsed = 0;
    g.done = { front: false, left: false, right: false };
    g.flags = { first: false, half: false, almost: false };
    g.lastBrush = performance.now();
    g.lastTip = performance.now();
    g.tipIdx = 0;
    clearTimeout(g.winT);
    mouth.resetPlaque(0);
    timerEl.textContent = fmt(duration);
    timerEl.classList.remove('is-low');
    pauseOverlay.hidden = true;
    toast.classList.remove('is-on');
    renderProgress({ front: 0, left: 0, right: 0 });
    setTip(0);
  }

  function start(focus = 'front') {
    cancelAnimationFrame(g.raf);
    resetState();
    g.current = focus;
    mouth.setMode('mission');
    mouth.setHighlight(null);
    mouth.setRegionView(focus);
    renderProgress({ front: 0, left: 0, right: 0 });
    g.state = 'countdown';
    let n = 3;
    const step = () => {
      if (g.state !== 'countdown') return;
      countdown.classList.remove('is-on');
      void countdown.offsetWidth;
      countdown.textContent = n > 0 ? String(n) : 'Escove!';
      countdown.classList.add('is-on');
      if (n-- > 0) setTimeout(step, 900);
      else
        setTimeout(() => {
          if (g.state !== 'countdown') return;
          countdown.classList.remove('is-on');
          g.state = 'running';
          g.last = performance.now();
          say(FEEDBACK.start, false, 3200);
          loop();
        }, 800);
    };
    step();
  }

  function stop() {
    g.state = 'idle';
    cancelAnimationFrame(g.raf);
    clearTimeout(g.winT);
    countdown.classList.remove('is-on');
    brush.classList.remove('is-on');
  }

  function pause() {
    if (g.state !== 'running') return;
    g.state = 'paused';
    pauseOverlay.hidden = false;
    brush.classList.remove('is-on');
    pointer.down = false;
  }
  function resume() {
    if (g.state !== 'paused') return;
    pauseOverlay.hidden = true;
    g.state = 'running';
    g.last = performance.now();
    loop();
  }

  function loop() {
    cancelAnimationFrame(g.raf);
    const tick = (now) => {
      if (g.state !== 'running') return;
      g.elapsed += (now - g.last) / 1000;
      g.last = now;
      const left = duration - g.elapsed;
      timerEl.textContent = fmt(left);
      timerEl.classList.toggle('is-low', left <= 20);

      const p = mouth.getProgress();
      for (const r of Object.keys(g.done)) {
        if (!g.done[r] && p[r] >= 1) {
          g.done[r] = true;
          mouth.completeRegion(r);
          const box = rect();
          burst(box.width / 2, box.height / 2, 6, true);
          say(FEEDBACK.regionDone(REGIONS[r].label), true, 2600);
          const tab = tabs.find((t) => t.dataset.region === r);
          tab.classList.remove('is-pop');
          void tab.offsetWidth;
          tab.classList.add('is-pop');
          const next = Object.keys(g.done).find((k) => !g.done[k]);
          if (next) {
            g.current = next;
            setTimeout(() => g.state === 'running' && mouth.setRegionView(next), 1100);
          }
        }
      }
      const overall = renderProgress(p);
      if (overall >= 0.8 && !g.flags.almost && !Object.values(g.done).every(Boolean)) {
        g.flags.almost = true;
        say(FEEDBACK.almost, true);
      } else if (overall >= 0.45 && !g.flags.half) {
        g.flags.half = true;
        say(FEEDBACK.nice, true);
      } else if (overall >= 0.04 && !g.flags.first) {
        g.flags.first = true;
        say(FEEDBACK.keepGoing, true);
      }
      if (now - g.lastBrush > 9000 && !toast.classList.contains('is-on')) {
        g.lastBrush = now;
        say(FEEDBACK.idle, false, 2800);
      }
      if (now - g.lastTip > 13000) {
        g.lastTip = now;
        setTip(++g.tipIdx);
      }

      if (Object.values(g.done).every(Boolean)) {
        g.state = 'done';
        brush.classList.remove('is-on');
        const timeLeft = Math.max(0, duration - g.elapsed);
        g.winT = setTimeout(() => onWin({ timeLeft, duration, elapsed: g.elapsed }), 1300);
        return;
      }
      if (left <= 0) {
        g.state = 'done';
        brush.classList.remove('is-on');
        onLose({ progress: p, done: { ...g.done } });
        return;
      }
      g.raf = requestAnimationFrame(tick);
    };
    g.raf = requestAnimationFrame(tick);
  }

  /* ---------- Escova virtual ---------- */
  const pointer = { down: false, x: 0, y: 0, vx: 0, scrubT: 0, sparkT: 0 };

  function place(e) {
    const box = rect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    // pontas das cerdas ficam sob o dedo/cursor; o cabo se inclina conforme o movimento
    brush.style.transform = `translate(${x - 22}px, ${y - 146}px) rotate(${-28 + pointer.vx}deg)`;
    return { x, y };
  }

  const canvas = mouth.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    if (g.state !== 'running') return;
    canvas.setPointerCapture(e.pointerId);
    pointer.down = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    brush.classList.add('is-on');
    place(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (mouth.canvas.parentElement.dataset.mode !== 'mission' || g.state === 'idle') return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    const moved = Math.hypot(dx, dy);
    pointer.vx = Math.max(-18, Math.min(18, dx * 0.6));
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (g.state !== 'running') return;
    const { x, y } = place(e);
    brush.classList.add('is-on');
    if (!pointer.down) return;
    const hit = mouth.brushAt(e.clientX, e.clientY, moved);
    if (hit && moved > 1) {
      g.lastBrush = performance.now();
      brush.classList.add('is-scrubbing');
      clearTimeout(pointer.scrubT);
      pointer.scrubT = setTimeout(() => brush.classList.remove('is-scrubbing'), 120);
      const now = performance.now();
      if (now - pointer.sparkT > 70) {
        pointer.sparkT = now;
        burst(x, y, 2);
      }
    }
  });
  const up = () => {
    pointer.down = false;
    brush.classList.remove('is-scrubbing');
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => {
    if (!pointer.down) brush.classList.remove('is-on');
  });

  // Atalhos da HUD
  $('btn-pause').addEventListener('click', pause);
  $('btn-resume').addEventListener('click', resume);
  document.addEventListener('visibilitychange', () => document.hidden && pause());
  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      g.current = tab.dataset.region;
      mouth.setRegionView(g.current);
      renderProgress(mouth.getProgress());
    })
  );

  return { start, stop, pause, resume, get state() { return g.state; }, duration };
}

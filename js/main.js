// Sorriso Mágico 3D — navegação entre telas e ligação dos módulos.

import { createMouth } from './mouth3d.js';
import { createGame } from './game.js';
import { mascotSVG, medalSVG } from './mascot.js';
import { startConfetti, stopConfetti } from './confetti.js';
import { REGIONS, EXPLORE_TIPS } from './content.js';

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const DURATION = Math.max(5, Number(qs.get('tempo')) || 120);

/* ---------- Mascotes e medalhas ---------- */
$('mascot-welcome').innerHTML = mascotSVG('happy');
$('mascot-explore').innerHTML = mascotSVG('happy', { sparkle: false });
$('mascot-success').innerHTML = mascotSVG('cheer');
$('mascot-retry').innerHTML = mascotSVG('calm', { sparkle: false });
$('medal-small').innerHTML = medalSVG();
$('medal-large').innerHTML = medalSVG();

/* ---------- Armazenamento local (opcional) ---------- */
const store = {
  get: (k, d) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
  },
  set: (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ }
  },
};

/* ---------- Boca 3D ---------- */
let mouth;
try {
  mouth = createMouth();
} catch (err) {
  console.error(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    '<p style="position:fixed;inset:auto 16px 16px;padding:12px;background:#fff;border-radius:12px;font:700 14px sans-serif;z-index:99">Seu navegador não conseguiu iniciar o 3D (WebGL). Tente outro navegador ou ative a aceleração de hardware.</p>'
  );
  throw err;
}
mouth.setLabelTexts({ front: 'Dentes da frente', left: 'Lado esquerdo', right: 'Lado direito' });

const game = createGame({
  mouth,
  duration: DURATION,
  onWin: (r) => win(r),
  onLose: (r) => lose(r),
});

if (qs.has('debug')) window.__smm = { mouth, game, go: (n) => go(n) };

/* ---------- Navegação ---------- */
const screens = Object.fromEntries(
  [...document.querySelectorAll('.screen')].map((s) => [s.id.replace('screen-', ''), s])
);
let current = null;
let currentName = '';
let selectedRegion = 'front';

function attachStage(slotId) {
  const slot = $(slotId);
  slot.insertBefore(mouth.stage, slot.firstChild);
  mouth.start();
}

const enter = {
  welcome() {
    game.stop();
    stopConfetti();
  },
  explore() {
    game.stop();
    attachStage('slot-explore');
    mouth.setMode('explore');
    mouth.resetPlaque(0);
    mouth.setHighlight(null);
    mouth.setView('front');
    setSeg('front');
    showTip(0);
  },
  select() {
    attachStage('slot-select');
    mouth.setMode('select');
    mouth.resetPlaque(0);
    chooseRegion(selectedRegion);
  },
  mission() {
    attachStage('slot-mission');
    game.start(selectedRegion);
  },
  success() {
    startConfetti($('confetti'));
  },
  medal() {},
  retry() {},
};

function go(name) {
  const next = screens[name];
  if (!next || next === current) return;
  if (current) {
    const prev = current;
    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    setTimeout(() => prev.classList.remove('is-leaving'), 500);
  }
  if (name !== 'success') stopConfetti();
  if (currentName === 'mission' && name !== 'mission') game.stop();
  current = next;
  currentName = name;
  next.classList.add('is-active');
  enter[name]?.();
  if (!['explore', 'select', 'mission'].includes(name)) {
    setTimeout(() => !['explore', 'select', 'mission'].includes(currentName) && mouth.stop(), 600);
  }
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go]');
  if (t) go(t.dataset.go);
});

/* ---------- Exploração ---------- */
let tipIdx = 0;
function showTip(i, text) {
  tipIdx = i;
  $('explore-tip').textContent = text || EXPLORE_TIPS[i % EXPLORE_TIPS.length];
}
$('btn-next-tip').addEventListener('click', () => showTip(tipIdx + 1));

function setSeg(view) {
  document.querySelectorAll('.seg__btn').forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
}
document.querySelectorAll('.seg__btn').forEach((b) =>
  b.addEventListener('click', () => {
    mouth.setView(b.dataset.view);
    setSeg(b.dataset.view);
    const viewTips = {
      front: 'De frente dá para ver os dentes da frente. Onde está o biofilme amarelinho?',
      left: 'Vista pelo lado esquerdo! Nos molares, o biofilme gosta de ficar perto da gengiva.',
      right: 'Vista pelo lado direito! Os dentes de trás também precisam de carinho na escovação.',
      top: 'Vista de cima! Aqui aparecem só os dentes de baixo. O biofilme gosta de se esconder nos sulquinhos de mastigar.',
    };
    showTip(tipIdx, viewTips[b.dataset.view]);
  })
);
$('btn-reset-view').addEventListener('click', () => {
  mouth.reset();
  setSeg('front');
});

// Setas de giro (segurar para continuar girando)
document.querySelectorAll('[data-rot]').forEach((btn) => {
  const [x, y] = btn.dataset.rot.split(',').map(Number);
  let timer = 0;
  const step = () => mouth.rotateBy(x * 0.28, y * 0.22);
  const stopRot = () => clearInterval(timer);
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    step();
    stopRot();
    timer = setInterval(step, 110);
  });
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((ev) => btn.addEventListener(ev, stopRot));
  btn.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && step());
});

mouth.onRegionTap = (r) => {
  if (currentName !== 'explore') return;
  mouth.setHighlight(r);
  mouth.setRegionView(r);
  setSeg('');
  showTip(0, REGIONS[r].info);
};
mouth.onToothTap = (tooth, surface) => {
  if (currentName !== 'explore') return;
  const pos = tooth.upper ? 'de cima' : 'de baixo';
  const msg =
    surface === 'outer'
      ? `Este é um ${tooth.spec.name.toLowerCase()} ${pos}. Repare no biofilme amarelinho perto da gengiva!`
      : `Este é um ${tooth.spec.name.toLowerCase()} ${pos}. Os lados e o topo dos dentes também precisam de escova!`;
  showTip(tipIdx, msg);
};

/* ---------- Seleção de região ---------- */
function chooseRegion(r) {
  selectedRegion = r;
  document.querySelectorAll('.region-card').forEach((c) => {
    const on = c.dataset.region === r;
    c.classList.toggle('is-on', on);
    c.setAttribute('aria-checked', String(on));
  });
  $('region-info').innerHTML = `<b>${REGIONS[r].label}:</b> ${REGIONS[r].info}`;
  mouth.setHighlight(r);
  mouth.setRegionView(r);
}
document.querySelectorAll('.region-card').forEach((c) => c.addEventListener('click', () => chooseRegion(c.dataset.region)));
$('btn-begin-mission').addEventListener('click', () => go('mission'));

/* ---------- Fim da missão ---------- */
function fmtTime(s) {
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function win({ timeLeft, elapsed }) {
  const medals = store.get('smm_medals', 0) + 1;
  store.set('smm_medals', medals);
  const n = timeLeft > DURATION * 0.5 ? 3 : timeLeft > DURATION * 0.2 ? 2 : 1;
  $('stars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= n ? '' : 'off'}">⭐</span>`).join('');
  $('success-stats').textContent = `Missão em ${fmtTime(elapsed)} · sobraram ${fmtTime(timeLeft)}`;
  $('medal-count').textContent = String(medals);
  $('medal-time').textContent = fmtTime(elapsed);
  go('success');
}

function lose({ progress, done }) {
  $('retry-progress').innerHTML =
    '<b>Como foi sua escovação:</b>' +
    ['front', 'left', 'right']
      .map((r) => {
        const pct = done[r] ? 100 : Math.round(progress[r] * 100);
        return `<div class="retry-bar"><span>${REGIONS[r].short}</span><div class="meter__bar"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>`;
      })
      .join('');
  go('retry');
}

// Pausa: sair / jogar de novo
$('btn-quit').addEventListener('click', () => go('welcome'));
['btn-again-success', 'btn-again-medal', 'btn-again-retry'].forEach((id) => $(id).addEventListener('click', () => go('mission')));

/* ---------- Início ---------- */
go('welcome');

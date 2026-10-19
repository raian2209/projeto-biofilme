// Confetes e estrelas em canvas 2D (celebração da tela de sucesso).

const COLORS = ['#ffd23f', '#14b8c4', '#3aa6e8', '#5fcfa3', '#ff8fa5', '#ffffff'];
let raf = 0;

export function stopConfetti() {
  cancelAnimationFrame(raf);
}

export function startConfetti(canvas, duration = 6000) {
  stopConfetti();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = (canvas.width = canvas.clientWidth * dpr);
  const h = (canvas.height = canvas.clientHeight * dpr);
  const ctx = canvas.getContext('2d');
  const make = (burst) => ({
    x: burst ? w / 2 : Math.random() * w,
    y: burst ? h * 0.35 : -20 * dpr,
    vx: (burst ? (Math.random() - 0.5) * 16 : (Math.random() - 0.5) * 3) * dpr,
    vy: (burst ? -Math.random() * 14 - 4 : Math.random() * 3 + 2) * dpr,
    size: (Math.random() * 8 + 6) * dpr,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    color: COLORS[(Math.random() * COLORS.length) | 0],
    star: Math.random() < 0.28,
  });
  const parts = Array.from({ length: 90 }, () => make(true));
  const t0 = performance.now();

  const star = (r) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  };

  const tick = (now) => {
    const elapsed = now - t0;
    ctx.clearRect(0, 0, w, h);
    if (elapsed < duration - 1500 && parts.length < 160) parts.push(make(false), make(false));
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 0.22 * dpr;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > h + 30) {
        parts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.star) star(p.size);
      else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (elapsed < duration && parts.length) raf = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, w, h);
  };
  raf = requestAnimationFrame(tick);
}

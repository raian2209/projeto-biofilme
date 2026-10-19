// Mascote "Dentinho": ilustração em SVG com gradientes e brilho (aparência 3D estilizada).
// Importante: é uma ilustração vetorial, não um modelo 3D real.

let uid = 0;

const MOUTHS = {
  happy: '<path d="M80 128 Q100 150 120 128" fill="#c2415c" stroke="#8f2a40" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M90 138 Q100 146 110 138 Q100 142 90 138Z" fill="#ff8aa0"/>',
  cheer: '<path d="M76 124 Q100 168 124 124 Z" fill="#8f2a40" stroke="#8f2a40" stroke-width="3" stroke-linejoin="round"/><path d="M88 144 Q100 134 112 144 Q100 158 88 144Z" fill="#ff7d95"/>',
  calm: '<path d="M84 130 Q100 142 116 130" fill="none" stroke="#8f2a40" stroke-width="4" stroke-linecap="round"/>',
};

export function mascotSVG(mood = 'happy', { sparkle = true } = {}) {
  const id = `m${uid++}`;
  const eyes =
    mood === 'cheer'
      ? `<path d="M64 98 Q74 84 84 98" fill="none" stroke="#1b3a57" stroke-width="5" stroke-linecap="round"/>
         <path d="M116 98 Q126 84 136 98" fill="none" stroke="#1b3a57" stroke-width="5" stroke-linecap="round"/>`
      : `<g class="mascot-eyes">
           <ellipse cx="74" cy="96" rx="9" ry="11" fill="#1b3a57"/><circle cx="71" cy="91" r="3.6" fill="#fff"/><circle cx="77" cy="100" r="1.8" fill="#fff" opacity=".8"/>
           <ellipse cx="126" cy="96" rx="9" ry="11" fill="#1b3a57"/><circle cx="123" cy="91" r="3.6" fill="#fff"/><circle cx="129" cy="100" r="1.8" fill="#fff" opacity=".8"/>
         </g>`;
  const stars = sparkle
    ? `<g class="mascot-sparkles" fill="#ffd23f">
         <path d="M170 38 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/>
         <path d="M28 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" opacity=".85"/>
       </g>`
    : '';
  return `
<svg class="mascot" viewBox="0 0 200 230" role="img" aria-label="Dentinho, o mascote sorridente" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="${id}b" cx="35%" cy="25%" r="85%">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f4fbff"/><stop offset="1" stop-color="#bfe3f7"/>
    </radialGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7cc4ec" stop-opacity="0"/><stop offset="1" stop-color="#7cc4ec" stop-opacity=".45"/>
    </linearGradient>
  </defs>
  <ellipse cx="100" cy="222" rx="52" ry="7" fill="#0f3b57" opacity=".14"/>
  <g class="mascot-body">
    <path d="M100 22 C72 6 30 16 28 62 C26 100 50 118 56 160 C60 196 72 214 84 208 C96 202 92 168 100 168 C108 168 104 202 116 208 C128 214 140 196 144 160 C150 118 174 100 172 62 C170 16 128 6 100 22Z"
          fill="url(#${id}b)" stroke="#8cc9ea" stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 22 C72 6 30 16 28 62 C26 100 50 118 56 160 C60 196 72 214 84 208 C96 202 92 168 100 168 C108 168 104 202 116 208 C128 214 140 196 144 160 C150 118 174 100 172 62 C170 16 128 6 100 22Z"
          fill="url(#${id}s)"/>
    <path d="M46 44 Q52 28 74 24" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/>
    <ellipse cx="52" cy="118" rx="14" ry="9" fill="#ff9db1" opacity=".75"/>
    <ellipse cx="148" cy="118" rx="14" ry="9" fill="#ff9db1" opacity=".75"/>
    ${eyes}
    ${MOUTHS[mood] || MOUTHS.happy}
  </g>
  ${stars}
</svg>`;
}

export function medalSVG() {
  const id = `g${uid++}`;
  return `
<svg class="medal-svg" viewBox="0 0 220 280" role="img" aria-label="Medalha Sorriso de Ouro" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ec4c4"/><stop offset="1" stop-color="#1b86c9"/></linearGradient>
    <radialGradient id="${id}g" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fff3a8"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#d9962b"/></radialGradient>
    <radialGradient id="${id}i" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#ffe98a"/><stop offset="1" stop-color="#f2b134"/></radialGradient>
    <clipPath id="${id}c"><circle cx="110" cy="168" r="84"/></clipPath>
    <radialGradient id="${id}t" cx="35%" cy="25%" r="85%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfe9f7"/></radialGradient>
  </defs>
  <path d="M62 8 H108 L124 110 H78Z" fill="url(#${id}r)"/>
  <path d="M158 8 H112 L96 110 H142Z" fill="#1b86c9"/>
  <circle cx="110" cy="168" r="84" fill="url(#${id}g)" stroke="#c98a1f" stroke-width="4"/>
  <circle cx="110" cy="168" r="68" fill="url(#${id}i)" stroke="#fff3a8" stroke-width="3"/>
  <g fill="#fff8d0" opacity=".9">
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return `<circle cx="${(110 + Math.cos(a) * 76).toFixed(1)}" cy="${(168 + Math.sin(a) * 76).toFixed(1)}" r="2.6"/>`;
    }).join('')}
  </g>
  <path d="M110 128 C98 118 80 122 79 144 C78 160 88 168 90 184 C91 198 96 206 101 203 C106 200 105 188 110 188 C115 188 114 200 119 203 C124 206 129 198 130 184 C132 168 142 160 141 144 C140 122 122 118 110 128Z"
        fill="url(#${id}t)" stroke="#9ccbe4" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse cx="97" cy="152" rx="4.5" ry="5.5" fill="#1b3a57"/><ellipse cx="123" cy="152" rx="4.5" ry="5.5" fill="#1b3a57"/>
  <circle cx="95.5" cy="150" r="1.7" fill="#fff"/><circle cx="121.5" cy="150" r="1.7" fill="#fff"/>
  <path d="M99 166 Q110 177 121 166" fill="none" stroke="#b83a55" stroke-width="3.2" stroke-linecap="round"/>
  <g clip-path="url(#${id}c)"><rect class="medal-shine" x="-40" y="70" width="36" height="200" fill="#fff" opacity=".4"/></g>
</svg>`;
}

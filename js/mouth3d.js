// Boca infantil 3D (geometria procedural com Three.js).
// 20 dentes de leite (10 por arcada), gengiva, língua, palato e lábios.
// Cada dente tem uma camada de biofilme (shader) que some gradualmente ao ser escovada.

import * as THREE from '../vendor/three.module.min.js';

const ARCH = { a: 1.45, b: 1.25, y: 1.05, gum: 0.3 };

// Dentição decídua de cada lado, do centro para o fundo (medidas em unidades da cena).
const SPECS = [
  { key: 'ci', name: 'Incisivo central', w: 0.36, h: 0.64, d: 0.25, s: 0.19, kind: 'incisor' },
  { key: 'li', name: 'Incisivo lateral', w: 0.3, h: 0.58, d: 0.24, s: 0.52, kind: 'incisor' },
  { key: 'c', name: 'Canino', w: 0.32, h: 0.64, d: 0.3, s: 0.83, kind: 'canine' },
  { key: 'm1', name: 'Primeiro molar de leite', w: 0.46, h: 0.46, d: 0.52, s: 1.2, kind: 'molar' },
  { key: 'm2', name: 'Segundo molar de leite', w: 0.54, h: 0.44, d: 0.56, s: 1.7, kind: 'molar' },
];

export const VIEWS = {
  front: { az: 0, pol: 1.5 },
  left: { az: -1.45, pol: 1.5 },
  right: { az: 1.45, pol: 1.5 },
  top: { az: 0, pol: 0.5, zoom: 0.8 },
};

const REGION_VIEWS = {
  front: { az: 0, pol: 1.5, zoom: 0.78 },
  left: { az: -0.95, pol: 1.5, zoom: 0.72 },
  right: { az: 0.95, pol: 1.5, zoom: 0.72 },
};

const LABEL_ANCHORS = {
  front: new THREE.Vector3(0, 1.72, 1.1),
  left: new THREE.Vector3(-1.95, 0.15, 0.1),
  right: new THREE.Vector3(1.95, 0.15, 0.1),
};

const CLEAN_RATE = 0.0042; // fração de limpeza por pixel arrastado
const REGION_DONE_AT = 0.88; // progresso médio para considerar a região limpa

/* ---------- Geometrias ---------- */

function smoothNormals(geo) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const sums = new Map();
  const key = (i) => `${Math.round(pos.getX(i) * 1e4)}|${Math.round(pos.getY(i) * 1e4)}|${Math.round(pos.getZ(i) * 1e4)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    const s = sums.get(k) || new THREE.Vector3();
    s.x += nor.getX(i);
    s.y += nor.getY(i);
    s.z += nor.getZ(i);
    sums.set(k, s);
  }
  for (let i = 0; i < pos.count; i++) {
    const s = sums.get(key(i)).clone().normalize();
    nor.setXYZ(i, s.x, s.y, s.z);
  }
}

// Coroa do dente: +z = face vestibular (para fora), +y = borda incisal/oclusal, -y = raiz.
function buildCrown(spec) {
  const g = new THREE.SphereGeometry(0.5, 44, 32);
  const p = g.attributes.position;
  const e = spec.kind === 'molar' ? 0.56 : 0.66;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let x = Math.sign(v.x) * Math.pow(Math.abs(v.x), e);
    let y = Math.sign(v.y) * Math.pow(Math.abs(v.y), e);
    let z = Math.sign(v.z) * Math.pow(Math.abs(v.z), e);
    const yn = y; // -1 raiz ... +1 borda
    if (spec.kind !== 'molar') {
      x *= 1 - 0.22 * Math.max(0, -yn); // afunila em direção à raiz
      z *= 1 - 0.38 * Math.max(0, yn); // borda incisal mais fina
    } else {
      x *= 1 - 0.08 * Math.max(0, -yn);
    }
    let px = (x * spec.w) / 2;
    let py = (y * spec.h) / 2;
    let pz = (z * spec.d) / 2;
    if (spec.kind === 'canine' && yn > 0) {
      const r = Math.min(1, Math.hypot(x, z));
      py += 0.05 * (1 - r) * yn;
    }
    if (spec.kind === 'molar' && yn > 0.25) {
      py += 0.05 * Math.cos(Math.PI * x) * Math.cos(Math.PI * z) * Math.min(1, (yn - 0.25) * 3);
    }
    p.setXYZ(i, px, py, pz);
  }
  smoothNormals(g);
  return g;
}

/* ---------- Shader do biofilme ---------- */

const PLAQUE_VERT = /* glsl */ `
  varying vec3 vPos; varying vec3 vNormalO; varying vec3 vNormalV;
  void main() {
    vPos = position; vNormalO = normal; vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const PLAQUE_FRAG = /* glsl */ `
  uniform float uSeed; uniform float uH; uniform vec2 uClean; uniform float uTime;
  varying vec3 vPos; varying vec3 vNormalO; varying vec3 vNormalV;
  float hash13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float vnoise(vec3 p){
    vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.1; a *= .5; } return s; }
  void main(){
    vec3 n = normalize(vNormalO);
    float outer = smoothstep(0.22, 0.38, n.z);
    float clean = mix(uClean.y, uClean.x, outer);
    float yn = vPos.y / uH;
    float bias = smoothstep(0.35, -1.0, yn) * 0.26;           // mais biofilme perto da gengiva
    float nz = fbm(vPos * 9.0 + uSeed * 13.0) + bias;
    float thr = mix(0.47, 1.16, clean);
    float cover = smoothstep(thr, thr + 0.07, nz);
    if (cover < 0.02) discard;
    vec3 c1 = vec3(0.93, 0.82, 0.22);
    vec3 c2 = vec3(0.80, 0.62, 0.12);
    vec3 col = mix(c1, c2, smoothstep(0.3, 0.9, nz));
    float ndl = dot(normalize(vNormalV), normalize(vec3(0.35, 0.65, 0.7))) * 0.5 + 0.5;
    col *= 0.62 + 0.55 * ndl;
    gl_FragColor = vec4(col, 0.9 * cover);
  }`;

/* ---------- Cena ---------- */

export function createMouth() {
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'stage__canvas';
  const labelsEl = document.createElement('div');
  labelsEl.className = 'stage__labels';
  stage.append(canvas, labelsEl);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  const root = new THREE.Group();
  scene.add(root);

  // Luzes
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffc2cf, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(3, 5, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ee7ff, 0.9);
  rim.position.set(-5, 2, -4);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffe3ea, 18, 14);
  fill.position.set(0, -1, 4);
  scene.add(fill);

  // Materiais
  const gumMat = new THREE.MeshStandardMaterial({ color: 0xff8fa5, roughness: 0.55, metalness: 0 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff6f8a, roughness: 0.6 });
  const palateMat = new THREE.MeshStandardMaterial({ color: 0xff9bae, roughness: 0.6 });
  const cavityMat = new THREE.MeshStandardMaterial({ color: 0x8d2c48, roughness: 0.9, side: THREE.BackSide });
  const lipMat = new THREE.MeshPhysicalMaterial({ color: 0xff5f7f, roughness: 0.35, clearcoat: 0.6 });

  // Cavidade, língua, palato
  const cavity = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), cavityMat);
  cavity.scale.set(2.25, 1.66, 2.1);
  cavity.position.set(0, 0, -0.35);
  root.add(cavity);

  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), tongueMat);
  tongue.scale.set(0.95, 0.34, 1.0);
  tongue.position.set(0, -0.78, -0.12);
  root.add(tongue);

  const upperGroup = new THREE.Group();
  const lowerGroup = new THREE.Group();
  root.add(upperGroup, lowerGroup);

  const palate = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), palateMat);
  palate.scale.set(1.05, 0.32, 1.05);
  palate.position.set(0, 0.95, -0.12);
  upperGroup.add(palate);

  // Lábios
  const lipCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 40 }, (_, i) => {
      const t = (i / 40) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(t) * 2.15, Math.sin(t) * 1.62, 1.55);
    }),
    true
  );
  const lips = new THREE.Mesh(new THREE.TubeGeometry(lipCurve, 120, 0.2, 20, true), lipMat);
  root.add(lips);

  // Perfil da arcada (elipse) e mapa comprimento-de-arco → ângulo
  const arc = [{ t: 0, s: 0 }];
  for (let t = 0.002, s = 0; t < 1.6; t += 0.002) {
    const dx = ARCH.a * Math.cos(t);
    const dz = -ARCH.b * Math.sin(t);
    s += Math.hypot(dx, dz) * 0.002;
    arc.push({ t, s });
  }
  const tAt = (s) => {
    for (let i = 1; i < arc.length; i++) if (arc[i].s >= s) return arc[i].t;
    return arc[arc.length - 1].t;
  };
  const archPoint = (t, sign) => new THREE.Vector3(sign * ARCH.a * Math.sin(t), 0, ARCH.b * Math.cos(t));

  // Gengiva (tubo ao longo da arcada)
  const gumPts = [];
  for (let t = -1.62; t <= 1.62; t += 0.1) gumPts.push(new THREE.Vector3(ARCH.a * Math.sin(t), 0, ARCH.b * Math.cos(t)));
  const gumCurve = new THREE.CatmullRomCurve3(gumPts);
  const gumGeo = new THREE.TubeGeometry(gumCurve, 120, ARCH.gum, 20, false);
  for (const sign of [1, -1]) {
    const gum = new THREE.Mesh(gumGeo, gumMat);
    gum.scale.y = 0.88;
    gum.position.y = sign * ARCH.y;
    (sign > 0 ? upperGroup : lowerGroup).add(gum);
    for (const end of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(ARCH.gum, 20, 14), gumMat);
      cap.scale.y = 0.88;
      cap.position.set(end * ARCH.a * Math.sin(1.62), sign * ARCH.y, ARCH.b * Math.cos(1.62));
      (sign > 0 ? upperGroup : lowerGroup).add(cap);
    }
  }

  // Dentes
  const crownGeos = new Map(SPECS.map((s) => [s.key, buildCrown(s)]));
  const toothMat = new THREE.MeshPhysicalMaterial({
    color: 0xfffdf5,
    roughness: 0.32,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
  });
  const teeth = [];
  const crowns = [];

  for (const upper of [true, false]) {
    for (const sign of [-1, 1]) {
      for (const spec of SPECS) {
        const t = tAt(spec.s);
        const pos = archPoint(t, sign);
        const nrm = new THREE.Vector3(pos.x / ARCH.a ** 2, 0, pos.z / ARCH.b ** 2).normalize();
        const yBase = (upper ? 1 : -1) * ARCH.y;
        const pivot = new THREE.Group();
        pivot.position.set(pos.x, yBase + (upper ? -1 : 1) * (0.18 + spec.h / 2), pos.z);
        pivot.rotation.y = Math.atan2(nrm.x, nrm.z);

        const crownMat = toothMat.clone();
        const crown = new THREE.Mesh(crownGeos.get(spec.key), crownMat);
        if (upper) crown.rotation.z = Math.PI;

        const plaqueMat = new THREE.ShaderMaterial({
          vertexShader: PLAQUE_VERT,
          fragmentShader: PLAQUE_FRAG,
          transparent: true,
          depthWrite: false,
          uniforms: {
            uSeed: { value: Math.random() * 10 },
            uH: { value: spec.h / 2 },
            uClean: { value: new THREE.Vector2(0, 0) },
            uTime: { value: 0 },
          },
        });
        const plaque = new THREE.Mesh(crownGeos.get(spec.key), plaqueMat);
        plaque.scale.setScalar(1.04);
        crown.add(plaque);
        pivot.add(crown);
        (upper ? upperGroup : lowerGroup).add(pivot);

        const region = spec.kind === 'molar' ? (sign < 0 ? 'left' : 'right') : 'front';
        const tooth = {
          spec,
          upper,
          region,
          crown,
          plaqueMat,
          c: [0, 0], // limpeza: [superfície externa, demais superfícies]
          locked: false,
          snapping: false,
          dirty: true,
          center: new THREE.Vector3(),
        };
        crown.userData.tooth = tooth;
        teeth.push(tooth);
        crowns.push(crown);
      }
    }
  }
  root.updateMatrixWorld(true);
  teeth.forEach((t) => t.crown.getWorldPosition(t.center));

  /* ---------- Rótulos das regiões ---------- */
  const labelNodes = {};
  let onRegionTap = () => {};
  for (const r of Object.keys(LABEL_ANCHORS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'region-pin';
    b.dataset.region = r;
    b.innerHTML = `<span class="region-pin__dot"></span><span class="region-pin__text"></span>`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onRegionTap(r);
    });
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    labelsEl.append(b);
    labelNodes[r] = b;
  }

  /* ---------- Câmera orbital ---------- */
  const cam = { az: 0, pol: 1.5, zoom: 1, tAz: 0, tPol: 1.5, tZoom: 1 };
  const target = new THREE.Vector3(0, 0, 0.1);
  let baseDist = 8.5;
  let mode = 'idle'; // idle | explore | mission
  let running = false;
  let raf = 0;
  let highlight = null;
  let size = { w: 0, h: 0 };

  function setView(name, instant = false) {
    const v = typeof name === 'string' ? VIEWS[name] || REGION_VIEWS[name] : name;
    if (!v) return;
    cam.tAz = v.az + Math.round((cam.tAz - v.az) / (Math.PI * 2)) * Math.PI * 2;
    cam.tPol = v.pol;
    cam.tZoom = v.zoom || 1;
    if (instant) {
      cam.az = cam.tAz;
      cam.pol = cam.tPol;
      cam.zoom = cam.tZoom;
    }
  }
  function rotateBy(dAz, dPol) {
    cam.tAz += dAz;
    cam.tPol = Math.min(2.6, Math.max(0.22, cam.tPol + dPol));
  }

  // Arrastar para girar
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'explore') return;
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    stage.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    rotateBy(-dx * 0.011, -dy * 0.009);
  });
  const endDrag = (e) => {
    if (!drag) return;
    const wasTap = drag.moved < 6;
    drag = null;
    stage.classList.remove('is-dragging');
    if (wasTap && e.type === 'pointerup') {
      const h = pick(e.clientX, e.clientY);
      if (h) api.onToothTap?.(h.object.userData.tooth, h.face.normal.z > 0.3 ? 'outer' : 'other');
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (mode !== 'explore') return;
      e.preventDefault();
      cam.tZoom = Math.min(1.4, Math.max(0.6, cam.tZoom * (e.deltaY > 0 ? 1.08 : 0.92)));
    },
    { passive: false }
  );

  /* ---------- Picking & escovação ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const shown = (c) => c.parent.parent.visible;
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const list = crowns.filter(shown);
    const hits = ray.intersectObjects(list, false);
    return hits[0] || null;
  }

  function addClean(tooth, idx, amt) {
    if (tooth.locked || tooth.snapping) return;
    tooth.c[idx] = Math.min(1, tooth.c[idx] + amt);
    tooth.dirty = true;
  }

  // Retorna a região atingida (ou null). `moved` = pixels arrastados desde o último evento.
  function brushAt(clientX, clientY, moved) {
    const h = pick(clientX, clientY);
    if (!h) return null;
    const hit = h.object.userData.tooth;
    const idx = h.face.normal.z > 0.3 ? 0 : 1;
    const amt = Math.min(moved, 50) * CLEAN_RATE;
    for (const t of teeth) {
      if (t.upper !== hit.upper) continue;
      const d = t.center.distanceTo(h.point);
      if (d > 0.55) continue;
      addClean(t, idx, t === hit ? amt : amt * 0.55 * (1 - d / 0.55));
    }
    return { region: hit.region, tooth: hit, surface: idx, point: h.point };
  }

  /* ---------- Progresso ---------- */
  const toothClean = (t) => (t.c[0] + t.c[1]) / 2;
  function regionProgress(region) {
    const ts = teeth.filter((t) => t.region === region);
    const p = ts.reduce((s, t) => s + toothClean(t), 0) / ts.length;
    return Math.min(1, p / REGION_DONE_AT);
  }
  function getProgress() {
    const front = regionProgress('front');
    const left = regionProgress('left');
    const right = regionProgress('right');
    return { front, left, right, overall: (front + left + right) / 3 };
  }
  function completeRegion(region) {
    teeth.filter((t) => t.region === region).forEach((t) => (t.snapping = true));
  }
  function resetPlaque(level = 0) {
    for (const t of teeth) {
      t.c = [level, level];
      t.locked = false;
      t.snapping = false;
      t.dirty = true;
    }
  }
  function setHighlight(region) {
    highlight = region;
  }

  /* ---------- Tamanho & loop ---------- */
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h || (w === size.w && h === size.h)) return;
    size = { w, h };
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const fovH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    baseDist = Math.max(6.6, 4.7 / fovH);
  }
  new ResizeObserver(resize).observe(stage);

  const clock = new THREE.Clock();
  let time = 0;
  const tmp = new THREE.Vector3();

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    time += dt;
    resize();

    const k = 1 - Math.exp(-dt * 9);
    cam.az += (cam.tAz - cam.az) * k;
    cam.pol += (cam.tPol - cam.pol) * k;
    cam.zoom += (cam.tZoom - cam.zoom) * k;
    const d = baseDist * cam.zoom;
    camera.position.set(
      target.x + d * Math.sin(cam.pol) * Math.sin(cam.az),
      target.y + d * Math.cos(cam.pol),
      target.z + d * Math.sin(cam.pol) * Math.cos(cam.az)
    );
    camera.lookAt(target);

    // Vista de cima/baixo: esconde a arcada que atrapalharia a visão
    const hideUpper = cam.pol < 0.95;
    const hideLower = cam.pol > 2.2;
    upperGroup.visible = !hideUpper;
    lowerGroup.visible = !hideLower;
    const azN = Math.atan2(Math.sin(cam.az), Math.cos(cam.az));
    const frontal = Math.abs(azN) < 1.05 && !hideUpper && !hideLower;
    lips.visible = frontal;
    cavity.visible = frontal;

    // Teeth: animações de limpeza e destaque
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    for (const t of teeth) {
      if (t.snapping) {
        t.c[0] = Math.min(1, t.c[0] + dt * 2.2);
        t.c[1] = Math.min(1, t.c[1] + dt * 2.2);
        t.dirty = true;
        if (t.c[0] >= 1 && t.c[1] >= 1) {
          t.snapping = false;
          t.locked = true;
        }
      }
      if (t.dirty) {
        t.plaqueMat.uniforms.uClean.value.set(t.c[0], t.c[1]);
        t.dirty = false;
      }
      const on = highlight && t.region === highlight;
      t.crown.material.emissive.setRGB(0.1, 0.55, 0.65).multiplyScalar(on ? 0.25 + pulse * 0.35 : 0);
    }

    renderer.render(scene, camera);

    // Rótulos
    const showLabels = mode === 'explore' || api.forceLabels;
    labelsEl.classList.toggle('is-hidden', !showLabels);
    if (showLabels) {
      for (const [r, anchor] of Object.entries(LABEL_ANCHORS)) {
        tmp.copy(anchor).project(camera);
        const node = labelNodes[r];
        const x = (tmp.x * 0.5 + 0.5) * size.w;
        const y = (-tmp.y * 0.5 + 0.5) * size.h;
        const outward = new THREE.Vector3(anchor.x, 0, anchor.z - 0.2).normalize();
        const toCam = camera.position.clone().sub(anchor).normalize();
        const facing = Math.max(0, Math.min(1, outward.dot(toCam) * 2.2 + 0.35));
        node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        node.style.opacity = String(0.6 + 0.4 * facing);
        node.classList.toggle('is-active', highlight === r);
      }
    }
  }

  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    resize();
    frame();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const api = {
    stage,
    canvas,
    labelsEl,
    forceLabels: false,
    onToothTap: null,
    set onRegionTap(fn) {
      onRegionTap = fn;
    },
    setLabelTexts(map) {
      for (const [r, txt] of Object.entries(map)) labelNodes[r].querySelector('.region-pin__text').textContent = txt;
    },
    setMode(m) {
      mode = m;
      stage.dataset.mode = m;
    },
    setView,
    setRegionView: (r) => setView(REGION_VIEWS[r]),
    rotateBy,
    reset: () => {
      setView('front');
    },
    brushAt,
    getProgress,
    completeRegion,
    resetPlaque,
    setHighlight,
    start,
    stop,
    resize: () => {
      size = { w: 0, h: 0 };
      resize();
    },
    teeth,
    REGION_DONE_AT,
  };
  setView('front', true);
  return api;
}

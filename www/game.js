// Katumpi: Takbo sa Tuca — 3D endless runner
import * as THREE from './lib/three.module.min.js';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const LANE_X = [-2.2, 0, 2.2];
const SEG_LEN = 20;
const SEG_COUNT = 14;
const GRAVITY = 34;
const JUMP_V = 11.5;
const STAND_H = 1.75;
const SLIDE_H = 0.8;
const SLIDE_TIME = 0.75;
const BASE_SPEED = 15;
const MAX_SPEED = 42;
const COLORS = {
  red: 0xd62839, yellow: 0xffc300, green: 0x2a9d3f,
  violet: 0x7b2cbf, orange: 0xff7b00, magenta: 0xe63995,
};
const LANGKIT = ['#d62839', '#ffc300', '#2a9d3f', '#7b2cbf', '#ff7b00', '#e63995'];

const QUIPS_RUN = ['Wheee! 😆', 'Hehe! Di mo ako mahuhuli!', 'Kaya ko \'to! 💪', 'Ang saya-saya!', 'Tara, takbo pa!', 'Yehey! 🎉', 'Bilis ko no? 😜'];
const QUIPS_COIN = ['Ang daming barya! 🤑', 'Pang-meryenda ko \'to!', 'Yaman ko na! 😆'];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);

// Safe storage
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

// ------------------------------------------------------------------
// Renderer / scene
// ------------------------------------------------------------------
const canvas = document.getElementById('game');
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const FOG_COLOR = 0xffe4c4;
scene.fog = new THREE.Fog(FOG_COLOR, 70, 200);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);

const hemi = new THREE.HemisphereLight(0xfff2dc, 0x6a8f3a, 1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe8c8, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 16, bottom: -16, near: 1, far: 70 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

// ------------------------------------------------------------------
// Textures (generated on canvas — walang external images)
// ------------------------------------------------------------------
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function noise(g, w, h, n, colors, size = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = pick(colors);
    g.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

// Langkit / okir inspired bands
function drawLangkit(g, w, h, bands = 7) {
  const bh = h / bands;
  for (let i = 0; i < bands; i++) {
    const y = i * bh;
    g.fillStyle = LANGKIT[i % LANGKIT.length];
    g.fillRect(0, y, w, bh);
    const n = 8, tw = w / n;
    g.fillStyle = LANGKIT[(i + 2) % LANGKIT.length];
    for (let k = 0; k < n; k++) {
      g.beginPath();
      g.moveTo(k * tw, y + bh * 0.85);
      g.lineTo(k * tw + tw / 2, y + bh * 0.2);
      g.lineTo(k * tw + tw, y + bh * 0.85);
      g.closePath(); g.fill();
    }
    g.fillStyle = '#fff6d5';
    for (let k = 0; k < n; k++) {
      const cx = k * tw + tw / 2, cy = y + bh * 0.6, r = bh * 0.12;
      g.beginPath();
      g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy);
      g.closePath(); g.fill();
    }
  }
}

const skyTex = canvasTex(4, 512, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#3d8fd6');
  grd.addColorStop(0.45, '#8cc8ee');
  grd.addColorStop(0.68, '#ffe4c4');
  grd.addColorStop(1, '#ffc48a');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}, false);
scene.background = skyTex;

const dirtTex = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#b8814f'; g.fillRect(0, 0, w, h);
  noise(g, w, h, 1600, ['#a06a3c', '#c9965f', '#8f5d33', '#d4a66e'], 3);
  g.fillStyle = 'rgba(120,75,40,.35)';
  [0.17, 0.5, 0.83].forEach((p) => g.fillRect(p * w - 6, 0, 12, h)); // bakas ng gulong
  g.fillStyle = 'rgba(230,190,140,.25)';
  [0.33, 0.67].forEach((p) => g.fillRect(p * w - 2, 0, 4, h));
});
const grassTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#62b043'; g.fillRect(0, 0, w, h);
  noise(g, w, h, 1400, ['#57a03a', '#73c24f', '#4e9434', '#86cf5c'], 3);
});
const langkitTex = canvasTex(256, 256, (g, w, h) => drawLangkit(g, w, h, 6));
const malongTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#7b2cbf'; g.fillRect(0, 0, w, h);
  // dots
  g.fillStyle = '#ffc300';
  for (let y = 70; y < 170; y += 20) for (let x = (y / 20) % 2 ? 0 : 10; x < w; x += 20) {
    g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
  }
  // langkit bands top & bottom
  const band = (y0, hh) => {
    g.save(); g.translate(0, y0);
    g.beginPath(); g.rect(0, 0, w, hh); g.clip();
    drawLangkit(g, w, hh, 3);
    g.restore();
  };
  band(0, 56);
  band(190, 66);
});
malongTex.repeat.set(3, 1);

// ------------------------------------------------------------------
// Geometry merge (para kaunti lang ang draw calls sa mobile)
// ------------------------------------------------------------------
const _matCache = {};
const cm = (c) => _matCache[c] || (_matCache[c] = new THREE.MeshLambertMaterial({ color: c }));
const decoMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });

function part(parent, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, cm(color));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function mergeGroup(group) {
  group.updateMatrixWorld(true);
  const pos = [], nor = [], col = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const c = o.material.color;
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b);
    }
    g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}
const build = (fn) => { const g = new THREE.Group(); fn(g); return mergeGroup(g); };

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CY = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
const SP = (r, ws = 10, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
const CO = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);

// ------------------------------------------------------------------
// Prefabs: niyog, torogan, bahay kubo, masjid, bandila, bangka, jeep...
// ------------------------------------------------------------------
const leafGeo = SP(1, 8, 6); leafGeo.scale(0.08, 1.7, 0.42); leafGeo.translate(0, 1.6, 0);

function palm(g, h, bend) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t1 = i / n, t2 = (i + 1) / n;
    const x1 = bend * t1 * t1 * h * 0.35, x2 = bend * t2 * t2 * h * 0.35;
    const y1 = t1 * h, y2 = t2 * h;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = Math.atan2(x2 - x1, y2 - y1);
    part(g, CY(0.16 - 0.012 * i, 0.19 - 0.012 * i, len + 0.06, 7), i % 2 ? 0x8a6a45 : 0x76583a,
      (x1 + x2) / 2, (y1 + y2) / 2, 0, 0, 0, -ang);
  }
  const tx = bend * h * 0.35;
  for (let k = 0; k < 9; k++) {
    const lg = new THREE.Group();
    lg.position.set(tx, h, 0);
    lg.rotation.y = (k / 9) * Math.PI * 2 + rand(-0.2, 0.2);
    g.add(lg);
    part(lg, leafGeo, k % 2 ? 0x3f9b3a : 0x2c8233, 0, 0, 0, 0, 0, -(Math.PI / 2) - rand(0.15, 0.6));
  }
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1;
    part(g, SP(0.17, 8, 6), 0x5e4120, tx + Math.cos(a) * 0.22, h - 0.25, Math.sin(a) * 0.22);
  }
}

function torogan(g) {
  const roofColor = 0x5a3220, wood = 0x7a4a2a;
  for (const x of [-2, 0, 2]) for (const z of [-2.4, 0, 2.4]) part(g, CY(0.2, 0.22, 1.8, 8), 0x4a2e1c, x, 0.9, z);
  part(g, B(5.2, 0.3, 6.2), 0x6b3f22, 0, 1.9, 0);
  part(g, B(4.5, 1.7, 5.5), wood, 0, 2.9, 0);
  // makukulay na tabla (okir colors)
  [COLORS.red, COLORS.yellow, COLORS.green].forEach((c, i) => part(g, B(4.56, 0.16, 5.56), c, 0, 2.15 + i * 0.18, 0));
  part(g, B(0.9, 1.2, 0.1), 0x3a2010, 0, 2.7, 2.76); // pinto
  // bubong (matarik, Maranao style)
  const s = new THREE.Shape();
  s.moveTo(-3.1, 0);
  s.quadraticCurveTo(-1.1, 0.9, 0, 4.2);
  s.quadraticCurveTo(1.1, 0.9, 3.1, 0);
  s.lineTo(-3.1, 0);
  const roof = new THREE.ExtrudeGeometry(s, { depth: 6.8, bevelEnabled: false, curveSegments: 6 });
  roof.translate(0, 0, -3.4);
  part(g, roof, roofColor, 0, 3.7, 0);
  // panolong (nakaangat na dulo ng beam, may kulay)
  for (const sx of [-1, 1]) {
    const pg = new THREE.Group();
    pg.position.set(sx * 2.45, 1.95, 3.0);
    pg.rotation.x = -0.45;
    g.add(pg);
    [COLORS.yellow, COLORS.red, COLORS.green].forEach((c, i) => part(pg, B(0.18, 0.18, 1.8), c, 0, i * 0.18, 0.8 + i * 0.05));
  }
  // flags on top
  part(g, CY(0.04, 0.04, 1.6, 5), 0xc9a85a, 0, 8.6, 0);
  part(g, B(0.04, 0.5, 0.8), COLORS.yellow, 0, 9.1, 0.42);
}

function kubo(g) {
  for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) part(g, CY(0.12, 0.12, 1.4, 6), 0x8a6a3a, x, 0.7, z);
  part(g, B(3, 0.2, 3), 0x9a7a45, 0, 1.45, 0);
  part(g, B(2.7, 1.5, 2.7), 0xd9b36c, 0, 2.3, 0);
  part(g, B(0.7, 0.6, 0.1), 0x3d2b17, 0.5, 2.4, 1.36);
  const roof = CO(2.7, 2.1, 4); roof.rotateY(Math.PI / 4);
  part(g, roof, 0xa47a3c, 0, 4.1, 0);
}

function masjid(g) {
  part(g, B(6, 3.4, 6), 0xf3efe6, 0, 1.7, 0);
  part(g, B(6.3, 0.3, 6.3), COLORS.green, 0, 3.5, 0);
  const dome = new THREE.SphereGeometry(2.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  part(g, dome, 0x1f8a5b, 0, 3.6, 0);
  part(g, CY(0.06, 0.06, 0.8, 5), 0xd4af37, 0, 6.3, 0);
  part(g, SP(0.18), 0xd4af37, 0, 6.8, 0);
  part(g, CY(0.45, 0.55, 9, 10), 0xf3efe6, 3.6, 4.5, 3.6);
  part(g, CY(0.7, 0.7, 0.3, 10), COLORS.green, 3.6, 7.4, 3.6);
  part(g, CO(0.55, 1.5, 10), 0x1f8a5b, 3.6, 9.75, 3.6);
  for (const x of [-1.8, 0, 1.8]) part(g, B(0.9, 1.6, 0.1), 0x2a6f4f, x, 1.6, 3.02);
}

function flagPole(g, color) {
  part(g, CY(0.06, 0.08, 5.4, 6), 0xc9a85a, 0, 2.7, 0);
  part(g, B(0.04, 2.3, 0.7), color, 0, 4.1, 0.38);
  part(g, B(0.05, 0.25, 0.72), COLORS.yellow, 0, 2.85, 0.38);
}

function bush(g) {
  part(g, SP(0.8), 0x3d8f35, 0, 0.5, 0);
  part(g, SP(0.6), 0x4ea33f, 0.7, 0.4, 0.2);
  part(g, SP(0.55), 0x46993a, -0.6, 0.35, -0.2);
  part(g, SP(0.12, 6, 4), COLORS.magenta, 0.3, 1.1, 0.5);
  part(g, SP(0.12, 6, 4), COLORS.yellow, -0.4, 0.9, 0.5);
}

function banca(g, sail) {
  const hull = SP(1, 12, 8); hull.scale(0.55, 0.35, 2.6);
  part(g, hull, 0xf5f5f0, 0, 0.05, 0);
  part(g, B(1.05, 0.12, 4.2), COLORS.red, 0, 0.25, 0);
  for (const x of [-1.6, 1.6]) part(g, CY(0.07, 0.07, 3.8, 5), 0xd9c9a0, x, 0.15, 0, Math.PI / 2);
  for (const z of [-0.8, 0.8]) part(g, CY(0.05, 0.05, 3.3, 5), 0xd9c9a0, 0, 0.35, z, 0, 0, Math.PI / 2);
  part(g, CY(0.05, 0.05, 3, 5), 0xc9a85a, 0, 1.8, 0);
  const st = new THREE.Shape(); st.moveTo(0, 0); st.lineTo(0, 2.4); st.lineTo(1.6, 0.2); st.lineTo(0, 0);
  const sg = new THREE.ShapeGeometry(st); sg.rotateY(Math.PI / 2);
  part(g, sg, sail, 0.02, 0.6, 0.6);
}

function rock(g) {
  const r = new THREE.DodecahedronGeometry(0.6, 0); r.scale(1, 0.6, 0.9);
  part(g, r, 0x8d8378, 0, 0.25, 0);
  part(g, new THREE.DodecahedronGeometry(0.35, 0), 0x9d9388, 0.6, 0.15, 0.3);
}

// Obstacles
function barrier(g) {
  for (const x of [-0.85, 0.85]) part(g, B(0.16, 1.05, 0.16), 0x6b4423, x, 0.52, 0);
  part(g, B(1.9, 0.26, 0.14), COLORS.red, 0, 0.42, 0.02);
  part(g, B(1.9, 0.26, 0.14), COLORS.yellow, 0, 0.76, 0.02);
  part(g, B(1.95, 0.1, 0.18), COLORS.green, 0, 0.96, 0.02);
  for (const x of [-0.5, 0, 0.5]) part(g, SP(0.07, 6, 4), 0xffffff, x, 0.59, 0.1);
}

function arch(g) {
  for (const x of [-1.08, 1.08]) {
    part(g, CY(0.08, 0.09, 3.4, 6), 0xc9a85a, x, 1.7, 0);
    part(g, SP(0.13, 6, 4), COLORS.yellow, x, 3.45, 0);
  }
  part(g, B(2.3, 0.12, 0.12), 0xb8964a, 0, 3.25, 0);
  // banderitas
  for (let i = 0; i < 7; i++) {
    const t = CO(0.12, 0.28, 3); t.rotateX(Math.PI);
    part(g, t, [COLORS.red, COLORS.yellow, COLORS.green, COLORS.violet][i % 4], -0.9 + i * 0.3, 3.05, 0);
  }
}

function jeep(g, body) {
  // gulong
  for (const x of [-0.95, 0.95]) for (const z of [1.5, -1.6]) {
    part(g, CY(0.45, 0.45, 0.3, 14), 0x1d1d1d, x, 0.45, z, 0, 0, Math.PI / 2);
    part(g, CY(0.2, 0.2, 0.32, 8), 0xcfcfcf, x, 0.45, z, 0, 0, Math.PI / 2);
  }
  part(g, B(1.9, 0.3, 4.6), 0x333333, 0, 0.65, 0);
  part(g, B(2.0, 1.55, 3.2), body, 0, 1.55, -0.7);
  part(g, B(1.85, 0.85, 1.4), body, 0, 1.2, 1.6);
  part(g, B(2.04, 0.5, 2.9), 0x24323f, 0, 1.85, -0.75);
  part(g, B(1.8, 0.62, 0.08), 0x24323f, 0, 1.95, 0.9);
  part(g, B(1.9, 0.12, 0.1), 0xdddddd, 0, 1.6, 0.9);
  part(g, B(2.15, 0.14, 4.1), 0xf2f2f2, 0, 2.38, -0.35);
  part(g, B(2.06, 0.13, 3.25), COLORS.red, 0, 1.22, -0.7);
  part(g, B(2.06, 0.1, 3.25), COLORS.yellow, 0, 1.04, -0.7);
  part(g, B(1.4, 0.5, 0.06), 0xcfcfcf, 0, 1.15, 2.32);
  part(g, B(2.0, 0.18, 0.2), 0xbdbdbd, 0, 0.75, 2.38);
  for (const x of [-0.75, 0.75]) part(g, SP(0.15, 8, 6), 0xfff4b0, x, 1.25, 2.3);
  part(g, B(1.1, 0.3, 0.06), 0xffffff, 0, 2.6, 0.9); // signboard
  part(g, B(0.08, 0.5, 0.3), COLORS.yellow, 0, 1.75, 2.0); // palamuti sa hood
}

const PREFAB = {
  palms: [build((g) => palm(g, 7, 1)), build((g) => palm(g, 8.5, -0.7)), build((g) => palm(g, 6, 0.4))],
  torogan: build(torogan),
  kubo: build(kubo),
  masjid: build(masjid),
  flags: [COLORS.red, COLORS.yellow, COLORS.green, COLORS.violet, COLORS.magenta].map((c) => build((g) => flagPole(g, c))),
  bush: build(bush),
  bancas: [COLORS.yellow, COLORS.magenta, COLORS.green].map((c) => build((g) => banca(g, c))),
  rock: build(rock),
  barrier: build(barrier),
  arch: build(arch),
  jeeps: [0x2e86de, 0xe63946, 0x2a9d3f, 0xff9f1c, 0x7b2cbf].map((c) => build((g) => jeep(g, c))),
};
const bannerGeo = B(2.0, 1.45, 0.06);
const bannerMat = new THREE.MeshLambertMaterial({ map: langkitTex });

// ------------------------------------------------------------------
// Background scenery: Lawa ng Lanao, bundok, araw, ulap
// ------------------------------------------------------------------
const scenery = new THREE.Group();
scene.add(scenery);
const lakeMat = new THREE.MeshPhongMaterial({ color: 0x2f86c4, shininess: 120, specular: 0xbfe3ff });
const lake = new THREE.Mesh(new THREE.PlaneGeometry(500, 800), lakeMat);
lake.rotation.x = -Math.PI / 2;
lake.position.set(-24 - 250, -0.2, -250);
lake.receiveShadow = true;
scenery.add(lake);

{
  const mtnColors = [0x86ad9e, 0x7aa596, 0x93b8a8, 0x9fbfb2];
  const mtn = (x, z, r, h) => {
    const m = new THREE.Mesh(CO(r, h, 9), new THREE.MeshLambertMaterial({ color: pick(mtnColors), fog: false, flatShading: true }));
    m.position.set(x, h / 2 - 2, z);
    scenery.add(m);
  };
  for (let i = 0; i < 9; i++) mtn(-320 + i * 35 + rand(-10, 10), -330 + rand(-30, 20), rand(30, 55), rand(35, 75));
  for (let i = 0; i < 6; i++) mtn(40 + i * 45, -340 + rand(-20, 20), rand(30, 50), rand(25, 50));
  const sunDisk = new THREE.Mesh(SP(14, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }));
  sunDisk.position.set(-110, 70, -420);
  scenery.add(sunDisk);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false, emissive: 0x777777 });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(SP(rand(5, 9), 10, 8), cloudMat);
      p.position.set(k * 7 - 14, rand(-1, 3), rand(-3, 3));
      p.scale.y = 0.6;
      c.add(p);
    }
    c.position.set(rand(-260, 220), rand(70, 110), rand(-380, -300));
    scenery.add(c);
  }
}

// ------------------------------------------------------------------
// Ground segments (paulit-ulit na ginagamit)
// ------------------------------------------------------------------
function plane(w, l, mat, x) {
  const geo = new THREE.PlaneGeometry(w, l);
  geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 8), uv.getY(i) * (l / 8));
  const m = new THREE.Mesh(geo, mat);
  m.position.x = x;
  m.receiveShadow = true;
  return m;
}
const roadMat = new THREE.MeshLambertMaterial({ map: dirtTex });
const grassMat = new THREE.MeshLambertMaterial({ map: grassTex });
const sandMat = new THREE.MeshLambertMaterial({ color: 0xead3a0 });
const curbMat = new THREE.MeshLambertMaterial({ color: 0xa89a86 });
const curbGeo = B(0.35, 0.25, SEG_LEN);

const segments = [];
for (let i = 0; i < SEG_COUNT; i++) {
  const seg = new THREE.Group();
  const road = new THREE.Mesh((() => { const g = new THREE.PlaneGeometry(7.4, SEG_LEN); g.rotateX(-Math.PI / 2); return g; })(), roadMat);
  road.receiveShadow = true;
  dirtTex.repeat.set(1, 2);
  seg.add(road);
  seg.add(plane(14, SEG_LEN, grassMat, -10.7));
  seg.add(plane(6.3, SEG_LEN, sandMat, -20.85));
  seg.add(plane(70, SEG_LEN, grassMat, 38.7));
  for (const x of [-3.85, 3.85]) {
    const c = new THREE.Mesh(curbGeo, curbMat);
    c.position.set(x, 0.12, 0);
    c.receiveShadow = true;
    seg.add(c);
  }
  const deco = new THREE.Group();
  seg.add(deco);
  seg.userData.deco = deco;
  scene.add(seg);
  segments.push(seg);
}

function placeDeco(deco, geo, x, z, ry = 0, s = 1, shadow = true) {
  const m = new THREE.Mesh(geo, decoMat);
  m.position.set(x, 0, z);
  m.rotation.y = ry;
  m.scale.setScalar(s);
  m.castShadow = shadow;
  deco.add(m);
  return m;
}

function decorate(seg) {
  const d = seg.userData.deco;
  d.clear();
  const half = SEG_LEN / 2;
  // kanan (bayan)
  for (let i = 0; i < 2; i++) placeDeco(d, pick(PREFAB.palms), rand(5.5, 10), rand(-half, half), rand(0, 6.28), rand(0.85, 1.15));
  const r = Math.random();
  if (r < 0.28) placeDeco(d, PREFAB.torogan, rand(15, 19), rand(-4, 4), -Math.PI / 2 + rand(-0.15, 0.15));
  else if (r < 0.62) placeDeco(d, PREFAB.kubo, rand(11, 17), rand(-6, 6), -Math.PI / 2 + rand(-0.3, 0.3));
  else if (r < 0.7) placeDeco(d, PREFAB.masjid, rand(26, 32), 0, -Math.PI / 2, 1, false);
  if (Math.random() < 0.35) placeDeco(d, pick(PREFAB.flags), 4.6, rand(-half, half), Math.PI / 2);
  if (Math.random() < 0.7) placeDeco(d, PREFAB.bush, rand(4.8, 7), rand(-half, half), rand(0, 6.28), rand(0.7, 1.2));
  for (let i = 0; i < 2; i++) placeDeco(d, pick(PREFAB.palms), rand(22, 45), rand(-half, half), rand(0, 6.28), rand(0.9, 1.3), false);
  // kaliwa (dalampasigan ng lawa)
  for (let i = 0; i < 2; i++) placeDeco(d, pick(PREFAB.palms), rand(-14, -5.5), rand(-half, half), rand(0, 6.28), rand(0.85, 1.2));
  if (Math.random() < 0.3) placeDeco(d, pick(PREFAB.flags), -4.6, rand(-half, half), -Math.PI / 2);
  if (Math.random() < 0.5) placeDeco(d, PREFAB.rock, rand(-19, -6), rand(-half, half), rand(0, 6.28), rand(0.8, 1.6));
  if (Math.random() < 0.6) placeDeco(d, PREFAB.bush, rand(-12, -5), rand(-half, half), rand(0, 6.28), rand(0.6, 1));
  if (Math.random() < 0.35) placeDeco(d, pick(PREFAB.bancas), rand(-32, -60), rand(-half, half), rand(-0.4, 0.4), 1, false);
}

// Welcome arch: "Maligayang pagdating sa Tuca, Binidayan"
const welcomeTex = canvasTex(1024, 160, (g, w, h) => {
  drawLangkit(g, w, h, 2);
  g.fillStyle = 'rgba(123,44,191,.92)';
  g.fillRect(14, 16, w - 28, h - 32);
  g.font = 'bold 52px "Trebuchet MS", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd23f';
  g.fillText('MALIGAYANG PAGDATING SA', w / 2, h / 2 - 22);
  g.fillStyle = '#ffffff';
  g.fillText('TUCA, BINIDAYAN', w / 2, h / 2 + 30);
}, false);
const welcome = new THREE.Group();
{
  const posts = new THREE.Mesh(build((g) => {
    for (const x of [-4.8, 4.8]) {
      part(g, B(0.6, 6.6, 0.6), 0xf3efe6, x, 3.3, 0);
      part(g, B(0.8, 0.4, 0.8), COLORS.green, x, 6.7, 0);
      part(g, CO(0.5, 1, 4), COLORS.yellow, x, 7.4, 0);
    }
  }), decoMat);
  posts.castShadow = true;
  welcome.add(posts);
  const sign = new THREE.Mesh(B(9.2, 1.45, 0.2), [cm(COLORS.violet), cm(COLORS.violet), cm(COLORS.violet), cm(COLORS.violet),
    new THREE.MeshLambertMaterial({ map: welcomeTex }), new THREE.MeshLambertMaterial({ map: welcomeTex })]);
  sign.position.y = 5.7;
  welcome.add(sign);
}
scene.add(welcome);

// ------------------------------------------------------------------
// Si Katumpi
// ------------------------------------------------------------------
const hijabDressTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3bb6a0'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffd86b';
  for (let y = 20; y < 180; y += 22) for (let x = (y / 22) % 2 ? 0 : 11; x < w; x += 22) {
    g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y); g.lineTo(x, y + 4); g.lineTo(x - 4, y); g.closePath(); g.fill();
  }
  g.save(); g.translate(0, 196); g.beginPath(); g.rect(0, 0, w, 60); g.clip();
  drawLangkit(g, w, 60, 2); g.restore();
});
hijabDressTex.repeat.set(3, 1);

const CHARACTERS = [
  { id: 'classic', name: 'Katumpi • Pigtails' },
  { id: 'hijab', name: 'Katumpi • Hijab' },
];

function makeKatumpi(style = 'classic') {
  const hijab = style === 'hijab';
  const T = (c, extra = {}) => new THREE.MeshToonMaterial({ color: c, ...extra });
  const skin = T(0xc68a5e);
  const hairM = T(0x1b1210);
  const blouse = T(hijab ? 0x3bb6a0 : 0xffc93c);
  const red = T(hijab ? 0xffd86b : COLORS.red);
  const shoe = T(hijab ? 0xffffff : 0xe63995);
  const legM = hijab ? T(0x5b3f8f) : skin;
  const sleeve = hijab ? blouse : skin;
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const black = new THREE.MeshBasicMaterial({ color: 0x1a0f0a });
  const blush = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.75 });
  const skirtM = new THREE.MeshToonMaterial({ map: hijab ? hijabDressTex : malongTex, side: THREE.DoubleSide });
  const hijabM = new THREE.MeshToonMaterial({ color: 0xff8fb8, side: THREE.DoubleSide });
  const trimM = T(0xfff3f8);

  const meshes = [];
  const M = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    meshes.push(m);
    return m;
  };

  const root = new THREE.Group();
  const pose = new THREE.Group(); root.add(pose);
  const model = new THREE.Group(); model.rotation.y = Math.PI; pose.add(model);

  // legs
  const hips = new THREE.Group(); hips.position.y = 0.82; model.add(hips);
  const legs = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.x = s * 0.12; hips.add(g);
    M(CY(0.075, 0.062, 0.74, 8), legM, g, 0, -0.38, 0);
    M(B(0.17, 0.11, 0.28), shoe, g, 0, -0.77, 0.05);
    M(B(0.18, 0.04, 0.29), T(hijab ? 0xff8fb8 : 0xffffff), g, 0, -0.81, 0.05);
    return g;
  });

  // body
  const spine = new THREE.Group(); spine.position.y = 0.82; model.add(spine);
  if (hijab) M(new THREE.CylinderGeometry(0.21, 0.42, 0.82, 20, 1, true), skirtM, spine, 0, -0.14, 0); // mahabang bestida
  else M(new THREE.CylinderGeometry(0.21, 0.4, 0.55, 20, 1, true), skirtM, spine, 0, 0.0, 0); // malong-style na palda
  M(CY(0.22, 0.22, 0.06, 16), red, spine, 0, 0.27, 0); // sinturon
  M(CY(0.17, 0.21, 0.42, 14), blouse, spine, 0, 0.5, 0);
  M(CY(0.175, 0.175, 0.07, 14), red, spine, 0, 0.7, 0);
  M(CY(0.06, 0.07, 0.12, 8), skin, spine, 0, 0.78, 0);

  // arms
  const arms = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.22, 0.66, 0); spine.add(g);
    M(SP(0.085, 10, 8), blouse, g, 0, -0.03, 0);
    M(CY(0.062, 0.055, 0.5, 8), sleeve, g, 0, -0.29, 0);
    M(SP(0.065, 8, 6), skin, g, 0, -0.56, 0);
    M(CY(0.07, 0.07, 0.05, 10), T(hijab ? 0xffd86b : COLORS.green), g, 0, -0.47, 0);
    return g;
  });

  // head
  const head = new THREE.Group(); head.position.y = 0.86; spine.add(head);
  const HY = 0.24;
  M(SP(0.26, 22, 18), skin, head, 0, HY, 0);
  let tails = [];
  if (hijab) {
    // hijab: nakabalot sa ulo at leeg, bukas lang ang mukha
    const open = 0.85;
    M(new THREE.SphereGeometry(0.295, 26, 18, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, Math.PI * 0.86), hijabM, head, 0, HY, 0);
    M(new THREE.SphereGeometry(0.297, 26, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), hijabM, head, 0, HY, 0);
    M(new THREE.CylinderGeometry(0.2, 0.27, 0.26, 18, 1, true), hijabM, head, 0, HY - 0.29, 0); // sa ilalim ng baba
    M(new THREE.CylinderGeometry(0.25, 0.44, 0.34, 22, 1, true), hijabM, head, 0, HY - 0.47, -0.01); // balabal sa balikat
    const trim = M(new THREE.TorusGeometry(0.205, 0.018, 6, 28), trimM, head, 0, HY - 0.02, 0.19);
    trim.scale.set(1, 1.02, 1);
    M(SP(0.03, 8, 6), T(0xffd23f), head, 0.13, HY - 0.25, 0.2); // aspile
    // bulaklak sa gilid ng hijab
    const fl = new THREE.Group(); fl.position.set(0.22, HY + 0.1, 0.16); fl.rotation.y = 0.8; head.add(fl);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      M(SP(0.04, 6, 4), T(0xffffff), fl, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0);
    }
    M(SP(0.03, 6, 4), T(0xffd23f), fl, 0, 0, 0.01);
    // dulo ng hijab sa likod na umuugoy
    const tail = new THREE.Group(); tail.position.set(0, HY - 0.3, -0.18); head.add(tail);
    const tp = M(SP(0.16, 12, 8), hijabM, tail, 0, -0.12, -0.02); tp.scale.set(1.3, 1.1, 0.35);
    tails = [tail];
  } else {
    const hairCap = new THREE.SphereGeometry(0.285, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const cap = M(hairCap, hairM, head, 0, HY, -0.01); cap.rotation.x = -0.5;
    const back = M(SP(0.25, 14, 12), hairM, head, 0, HY - 0.12, -0.1); back.scale.set(1.08, 1.1, 0.9);
    for (let i = -2; i <= 2; i++) {
      const b = M(SP(0.075, 8, 6), hairM, head, i * 0.07, HY + 0.15 - Math.abs(i) * 0.01, 0.2 - Math.abs(i) * 0.02);
      b.scale.set(1, 0.75, 0.6);
    }
    tails = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(s * 0.25, HY + 0.1, -0.05); head.add(g);
      const t = M(SP(0.11, 10, 8), hairM, g, s * 0.1, -0.12, 0); t.scale.set(0.9, 1.9, 0.9);
      M(new THREE.TorusGeometry(0.06, 0.025, 6, 12), red, g, s * 0.03, 0.02, 0).rotation.y = Math.PI / 2;
      const bow1 = M(CO(0.06, 0.13, 4), red, g, s * 0.03, 0.07, 0.07); bow1.rotation.x = -Math.PI / 2;
      const bow2 = M(CO(0.06, 0.13, 4), red, g, s * 0.03, 0.07, -0.07); bow2.rotation.x = Math.PI / 2;
      return g;
    });
    const fl = new THREE.Group(); fl.position.set(0.16, HY + 0.22, 0.12); head.add(fl);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      M(SP(0.04, 6, 4), T(0xffffff), fl, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0);
    }
    M(SP(0.03, 6, 4), T(COLORS.yellow), fl, 0, 0, 0.01);
  }
  // mukha (nakaharap sa +z ng model)
  const eyes = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.09, HY + 0.02, 0.232); head.add(g);
    const e = M(SP(0.042, 10, 8), black, g); e.scale.set(0.9, 1.15, 0.5); e.castShadow = false;
    const h1 = M(SP(0.013, 6, 4), white, g, 0.012, 0.018, 0.02); h1.castShadow = false;
    return g;
  });
  for (const s of [-1, 1]) {
    const c = M(SP(0.04, 8, 6), blush, head, s * 0.155, HY - 0.06, 0.2); c.scale.set(1, 0.6, 0.3); c.castShadow = false;
  }
  const mouth = M(new THREE.TorusGeometry(0.05, 0.013, 6, 14, Math.PI), black, head, 0, HY - 0.09, 0.238);
  mouth.rotation.z = Math.PI; mouth.castShadow = false;
  const nose = M(SP(0.02, 6, 4), skin, head, 0, HY - 0.025, 0.255); nose.castShadow = false;

  const stars = new THREE.Group(); stars.position.y = HY + 0.38; stars.visible = false; head.add(stars);
  for (let i = 0; i < 4; i++) {
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    const a = (i / 4) * Math.PI * 2;
    st.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    stars.add(st);
  }

  // kalasag (shield) na bula sa paligid
  const bubble = new THREE.Mesh(SP(1.05, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.25, depthWrite: false }));
  bubble.position.y = 0.95; bubble.scale.set(0.85, 1.05, 0.85); bubble.visible = false;
  root.add(bubble);

  return { root, pose, model, spine, head, legs, arms, tails, eyes, stars, bubble, meshes, hijab };
}

let charIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === store.get('katumpi_char', 'classic')));
let K = makeKatumpi(CHARACTERS[charIndex].id);
scene.add(K.root);

// ------------------------------------------------------------------
// Audio
// ------------------------------------------------------------------
const music = new Audio('assets/music.mp3');
music.loop = true;
music.preload = 'auto';
const MUSIC_VOL = 0.6;
music.volume = MUSIC_VOL;
let muted = store.get('katumpi_muted', false);
let actx = null;

function ensureAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function playMusic() {
  if (muted) return;
  music.play().catch(() => {});
}
function tone(type, f1, f2, dur, vol, delay = 0) {
  if (muted || !actx) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t);
  o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  coin() { tone('sine', 1046, 1050, 0.08, 0.12); tone('sine', 1568, 1570, 0.14, 0.1, 0.06); },
  jump() { tone('triangle', 320, 760, 0.16, 0.12); },
  slide() { tone('sawtooth', 260, 90, 0.22, 0.05); },
  bump() { tone('square', 180, 70, 0.18, 0.1); },
  crash() { tone('sawtooth', 300, 40, 0.6, 0.16); tone('square', 120, 50, 0.4, 0.1, 0.05); },
  lane() { tone('sine', 520, 640, 0.06, 0.04); },
  honk() { tone('square', 392, 392, 0.18, 0.07); tone('square', 330, 330, 0.25, 0.07, 0.22); },
  cluck() { tone('square', 900, 500, 0.06, 0.05); tone('square', 950, 520, 0.06, 0.05, 0.1); },
  power() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.12, 0.1, i * 0.06)); },
  level() { [392, 523, 659, 784, 1046].forEach((f, i) => tone('sine', f, f * 1.01, 0.16, 0.1, i * 0.08)); },
  shieldBreak() { tone('sawtooth', 1200, 200, 0.35, 0.08); },
};

function setMuted(m) {
  muted = m;
  store.set('katumpi_muted', m);
  for (const b of [ui.muteBtn, ui.muteBtn2]) b.textContent = m ? '🔇 Musika' : '🔊 Musika';
  if (m) music.pause();
  else if (state !== 'menu' || audioStarted) playMusic();
}

// ------------------------------------------------------------------
// UI
// ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'), score: $('score'), dist: $('dist'), coinCount: $('coinCount'),
  menu: $('menu'), pause: $('pause'), over: $('over'), quip: $('quip'),
  bestMenu: $('bestMenu'), finalScore: $('finalScore'), finalCoins: $('finalCoins'),
  finalBest: $('finalBest'), newBest: $('newBest'),
  muteBtn: $('muteBtn'), muteBtn2: $('muteBtn2'),
  level: $('level'), powers: $('powers'), charName: $('charName'), finalLevel: $('finalLevel'),
};
let best = store.get('katumpi_best', 0);
ui.bestMenu.textContent = `🏆 ${best}`;

function showQuip(text) {
  ui.quip.textContent = text;
  ui.quip.classList.remove('show');
  void ui.quip.offsetWidth; // restart animation
  ui.quip.classList.add('show');
}

// ------------------------------------------------------------------
// Game state
// ------------------------------------------------------------------
let state = 'menu'; // menu | playing | paused | dying | over
let audioStarted = false;
const player = {
  lane: 1, prevLane: 1, x: 0, y: 0, z: 0, vy: 0, grounded: true,
  slide: 0, stumble: 0, phase: 0, spin: 0, spinning: false, shield: false, magnet: 0,
};
let speed = BASE_SPEED, elapsed = 0, distance = 0, coins = 0, score = 0, scoreF = 0, level = 1;
let nextRowZ = -45;
let shake = 0, deathT = 0, startBlend = 1, menuT = 0, blinkT = 2, quipT = 6;
const obstacles = [];
const coinList = [];
const powerList = [];
const LEVEL_DIST = 400;
const hintShown = {};
const HINTS = {
  low: 'Swipe pataas ⬆ — Talon!',
  high: 'Swipe pababa ⬇ — Dausdos!',
  block: 'Swipe ⬅ ➡ — Umiwas!',
  manok: 'Manok! 🐔 Talunan o iwasan!',
  oncoming: 'Paparating na jeep! 🚙 Umiwas!',
  combo: 'Trapik! Talon ⬆ tapos dausdos ⬇!',
  zigzag: 'Zigzag! ⬅➡ Bilis ng kamay!',
  magnet: '🧲 Magnet — hihigupin ang barya!',
  shield: '🛡️ Kalasag — ligtas sa isang bangga!',
};

const coinGeo = CY(0.32, 0.32, 0.08, 20); coinGeo.rotateX(Math.PI / 2);
const coinMat = new THREE.MeshPhongMaterial({ color: 0xffc81a, emissive: 0x6b4500, specular: 0xffffff, shininess: 90 });
const coinInnerGeo = CY(0.18, 0.18, 0.1, 5); coinInnerGeo.rotateX(Math.PI / 2);
const coinInnerMat = new THREE.MeshPhongMaterial({ color: 0xffe066, emissive: 0x8a6000 });

function addCoin(x, y, z) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(coinGeo, coinMat));
  g.add(new THREE.Mesh(coinInnerGeo, coinInnerMat));
  g.position.set(x, y, z);
  g.children[0].castShadow = true;
  scene.add(g);
  coinList.push({ mesh: g, x, y, z, taken: false, t: 0 });
}

// Manok na tumatawid (nakaharap sa +x)
const MANOK_GEO = build((g) => {
  const body = part(g, SP(1, 12, 10), 0xfaf6ee, 0, 0.5, 0); body.scale.set(0.34, 0.27, 0.24);
  const tail = part(g, CO(0.16, 0.42, 6), 0x2b5d3a, -0.33, 0.7, 0, 0, 0, 0.9);
  part(g, CO(0.1, 0.32, 6), 0xc0392b, -0.3, 0.74, 0.06, 0, 0, 0.6);
  void tail;
  part(g, SP(0.15, 10, 8), 0xfaf6ee, 0.27, 0.82, 0);
  for (let i = 0; i < 3; i++) part(g, B(0.05, 0.09, 0.04), 0xe02020, 0.22 + i * 0.06, 0.98 - Math.abs(i - 1) * 0.02, 0);
  part(g, CO(0.045, 0.13, 6), 0xffb300, 0.45, 0.8, 0, 0, 0, -Math.PI / 2);
  part(g, SP(0.04, 6, 4), 0xe02020, 0.39, 0.7, 0);
  for (const s of [-1, 1]) {
    part(g, SP(0.025, 6, 4), 0x111111, 0.35, 0.86, s * 0.11);
    part(g, CY(0.025, 0.025, 0.3, 5), 0xffa000, 0, 0.17, s * 0.08);
    const w = part(g, SP(1, 8, 6), 0xece4d4, -0.02, 0.52, s * 0.22); w.scale.set(0.22, 0.14, 0.05);
  }
});

// Power-ups
const magnetGeo = build((g) => {
  part(g, new THREE.TorusGeometry(0.3, 0.1, 8, 18, Math.PI), 0xe53935, 0, 0.05, 0);
  for (const s of [-1, 1]) part(g, B(0.2, 0.2, 0.2), 0xd0d0d0, s * 0.3, -0.07, 0);
});
const shieldGeo = build((g) => {
  part(g, new THREE.OctahedronGeometry(0.22), 0xffd23f, 0, 0, 0);
});
const shieldBubbleMat = new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.35, depthWrite: false });
const powerBubbleGeo = SP(0.42, 14, 10);

function addPower(kind, lane, z) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(kind === 'magnet' ? magnetGeo : shieldGeo, decoMat);
  core.castShadow = true;
  g.add(core);
  g.add(new THREE.Mesh(powerBubbleGeo, shieldBubbleMat));
  const x = LANE_X[lane];
  g.position.set(x, 1.0, z);
  scene.add(g);
  powerList.push({ kind, mesh: g, x, y: 1.0, z, taken: false, t: 0, hinted: false });
}

function addObstacle(type, lane, z, opts = {}) {
  let x = opts.x ?? LANE_X[lane];
  let obj, box;
  if (type === 'low') {
    obj = new THREE.Mesh(PREFAB.barrier, decoMat);
    box = { hw: 0.95, y0: 0, h: 1.0, hd: 0.2 };
  } else if (type === 'high') {
    obj = new THREE.Group();
    const a = new THREE.Mesh(PREFAB.arch, decoMat); a.castShadow = true; obj.add(a);
    const b = new THREE.Mesh(bannerGeo, bannerMat); b.position.y = 1.95; b.castShadow = true; obj.add(b);
    box = { hw: 1.0, y0: 1.22, h: 2.1, hd: 0.15 };
  } else if (type === 'manok') {
    obj = new THREE.Mesh(MANOK_GEO, decoMat);
    obj.rotation.y = (opts.vx || 0) < 0 ? Math.PI : 0;
    box = { hw: 0.35, y0: 0, h: 0.8, hd: 0.35 };
  } else {
    obj = new THREE.Mesh(pick(PREFAB.jeeps), decoMat);
    box = { hw: 1.0, y0: 0, h: 2.5, hd: 2.3 };
  }
  obj.position.set(x, 0, z);
  obj.castShadow = true;
  scene.add(obj);
  const o = {
    type, lane, x, z, obj, bumped: false, hint: opts.hint || type,
    vx: opts.vx || 0, vz: opts.vz || 0, act: opts.act || 0, active: false, ...box,
  };
  obstacles.push(o);
  return o;
}

const nearestLane = (x) => (x < -1.1 ? 0 : x > 1.1 ? 2 : 1);
const otherLanes = (l) => [0, 1, 2].filter((i) => i !== l);
const coinLine = (lane, z, n, y = 0.7, step = 2.1) => { for (let k = 0; k < n; k++) addCoin(LANE_X[lane], y, z - k * step); };
const rowGap = () => Math.max(12 + speed * 0.6, 14 + speed * 0.8 + rand(0, 8) - Math.min(7, (level - 1) * 1.4));

// Karaniwang hanay ng harang
function spawnRow(z, early) {
  const pEmpty = early ? 0.38 : Math.max(0.2, 0.38 - (level - 1) * 0.045);
  const row = [0, 1, 2].map(() => {
    const r = Math.random();
    if (r < pEmpty) return 'empty';
    const q = Math.random();
    if (q < 0.4) return 'low';
    if (q < 0.7) return 'high';
    return 'block';
  });
  if (early) {
    const keep = (Math.random() * 3) | 0;
    for (let i = 0; i < 3; i++) if (i !== keep) row[i] = 'empty';
    if (row[keep] === 'block' && Math.random() < 0.5) row[keep] = 'low';
  }
  if (row.every((t) => t === 'block')) row[(Math.random() * 3) | 0] = 'empty';
  if (!row.includes('empty') && Math.random() < (level > 2 ? 0.35 : 0.6)) row[(Math.random() * 3) | 0] = 'empty';

  row.forEach((t, lane) => { if (t !== 'empty') addObstacle(t, lane, z); });

  const free = [0, 1, 2].filter((l) => row[l] === 'empty');
  if (!early && free.length && !player.shield && player.magnet <= 0 && powerList.length === 0 && Math.random() < 0.08) {
    addPower(Math.random() < 0.5 ? 'magnet' : 'shield', pick(free), z - 6);
    return;
  }
  if (Math.random() < 0.75) {
    const lane = pick([0, 1, 2].filter((l) => row[l] !== 'block'));
    const x = LANE_X[lane];
    if (row[lane] === 'low' && Math.random() < 0.7) {
      for (let k = 0; k < 5; k++) addCoin(x, 0.8 + (2 - Math.abs(k - 2)) * 0.55, z + (k - 2) * 1.7);
    } else if (row[lane] === 'high') {
      for (let k = 0; k < 4; k++) addCoin(x, 0.5, z + (k - 1.5) * 1.6);
    } else {
      coinLine(lane, z - 3, 5 + ((Math.random() * 4) | 0));
    }
  }
}

// Trapik: talon tapos dausdos sa iisang lane, ibang lane puno ng jeep
function spawnCombo(z) {
  const L = (Math.random() * 3) | 0;
  const g = Math.max(12, speed * 0.85 + 2);
  addObstacle('low', L, z, { hint: 'combo' });
  addObstacle('high', L, z - g);
  const n = Math.ceil(g / 4.6) + 1;
  for (const l of otherLanes(L)) for (let k = 0; k < n; k++) addObstacle('block', l, z - k * 4.6);
  for (let k = 0; k < 5; k++) addCoin(LANE_X[L], 0.8 + (2 - Math.abs(k - 2)) * 0.55, z + (k - 2) * 1.7);
  for (let k = 0; k < 3; k++) addCoin(LANE_X[L], 0.5, z - g + (k - 1) * 1.6);
  return z - g - rowGap();
}

// Mga manok na tumatawid
function spawnManok(z) {
  const n = 2 + (level >= 4 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * 4.6;
    addObstacle('manok', nearestLane(x), z - k * 8, {
      x, vx: -side * rand(2.6, 4.2), act: rand(1.0, 1.9),
    });
  }
  coinLine((Math.random() * 3) | 0, z + 2, 8, 0.7, 2.2);
  return z - 8 * (n - 1) - rowGap();
}

// Jeep na paparating (gumagalaw papunta sa iyo)
function spawnOncoming(z) {
  const L = (Math.random() * 3) | 0;
  const vz = 9 + Math.min(10, level * 1.2);
  const travel = 14;
  addObstacle('block', L, z - travel, { vz, hint: 'oncoming', act: travel });
  const others = otherLanes(L);
  if (Math.random() < 0.5) addObstacle(Math.random() < 0.5 ? 'low' : 'high', others[0], z);
  coinLine(others[1], z, 6);
  return z - travel - rowGap();
}

// Zigzag ng mga jeep
function spawnZigzag(z) {
  const sp = Math.max(14, speed * 0.65);
  let free = (Math.random() * 3) | 0;
  const n = 3 + (level >= 5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const rz = z - i * sp;
    for (const l of otherLanes(free)) addObstacle('block', l, rz, { hint: 'zigzag' });
    coinLine(free, rz + 2, 3, 0.7, 2);
    const opts = [free - 1, free + 1].filter((l) => l >= 0 && l <= 2);
    if (Math.random() < 0.8) free = pick(opts);
  }
  return z - (n - 1) * sp - rowGap();
}

function spawnNext() {
  const z = nextRowZ;
  const early = elapsed < 10 && distance < 150;
  const r = Math.random();
  if (!early && level >= 2 && r < 0.11) nextRowZ = spawnCombo(z);
  else if (!early && distance > 250 && r < 0.22) nextRowZ = spawnManok(z);
  else if (!early && level >= 3 && r < 0.33) nextRowZ = spawnOncoming(z);
  else if (!early && level >= 3 && r < 0.42) nextRowZ = spawnZigzag(z);
  else { spawnRow(z, early); nextRowZ = z - rowGap(); }
}

function clearRun() {
  for (const o of obstacles) scene.remove(o.obj);
  for (const c of coinList) scene.remove(c.mesh);
  for (const p of powerList) scene.remove(p.mesh);
  obstacles.length = 0;
  coinList.length = 0;
  powerList.length = 0;
}

function resetWorld() {
  clearRun();
  Object.assign(player, { lane: 1, prevLane: 1, x: 0, y: 0, z: 0, vy: 0, grounded: true, slide: 0, stumble: 0, phase: 0, spin: 0, spinning: false, shield: false, magnet: 0 });
  speed = BASE_SPEED; elapsed = 0; distance = 0; coins = 0; score = 0; scoreF = 0; level = 1; shake = 0;
  nextRowZ = -45;
  segments.forEach((seg, i) => {
    seg.position.z = -(i - 3) * SEG_LEN;
    decorate(seg);
  });
  welcome.position.set(0, 0, -22);
  welcome.visible = true;
  K.pose.rotation.set(0, 0, 0);
  K.pose.position.set(0, 0, 0);
  K.model.rotation.y = Math.PI;
  K.stars.visible = false;
  K.bubble.visible = false;
}

function setCharacter(i) {
  charIndex = (i + CHARACTERS.length) % CHARACTERS.length;
  scene.remove(K.root);
  K = makeKatumpi(CHARACTERS[charIndex].id);
  scene.add(K.root);
  store.set('katumpi_char', CHARACTERS[charIndex].id);
  ui.charName.textContent = CHARACTERS[charIndex].name;
  menuT = 0;
}

function startGame() {
  ensureAudio();
  audioStarted = true;
  resetWorld();
  state = 'playing';
  startBlend = 0;
  music.volume = MUSIC_VOL;
  if (music.paused || music.ended) { music.currentTime = 0; }
  playMusic();
  ui.menu.classList.add('hidden');
  ui.over.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  lastLevel = -1;
  setTimeout(() => showQuip(K.hijab ? 'Bismillah! Takbo na! 😄' : 'Tara, takbo! 😄'), 400);
}

function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused';
  music.pause();
  ui.pause.classList.remove('hidden');
}
function resumeGame() {
  if (state !== 'paused') return;
  state = 'playing';
  ensureAudio();
  playMusic();
  ui.pause.classList.add('hidden');
  clock.getDelta();
}
function goMenu() {
  state = 'menu';
  resetWorld();
  music.volume = MUSIC_VOL;
  ui.pause.classList.add('hidden');
  ui.over.classList.add('hidden');
  ui.hud.classList.add('hidden');
  ui.menu.classList.remove('hidden');
  ui.bestMenu.textContent = `🏆 ${best}`;
}

function crash() {
  if (state !== 'playing') return;
  state = 'dying';
  deathT = 0;
  shake = 0.6;
  sfx.crash();
  if (navigator.vibrate) navigator.vibrate(200);
  showQuip('Aray ko! 😵');
  music.volume = MUSIC_VOL * 0.35;
  K.stars.visible = true;
  K.bubble.visible = false;
  const isBest = score > best;
  if (isBest) { best = score; store.set('katumpi_best', best); }
  setTimeout(() => {
    state = 'over';
    ui.hud.classList.add('hidden');
    ui.finalScore.textContent = score;
    ui.finalCoins.textContent = coins;
    ui.finalBest.textContent = best;
    ui.finalLevel.textContent = `Umabot sa Antas ${level} • ${Math.floor(distance)} m`;
    ui.newBest.classList.toggle('hidden', !isBest);
    ui.over.classList.remove('hidden');
  }, 1400);
}

// Ginagamit ang kalasag; true kung naligtas
function useShield(o) {
  if (!player.shield) return false;
  player.shield = false;
  if (o) o.bumped = true;
  shake = 0.4;
  sfx.shieldBreak();
  if (navigator.vibrate) navigator.vibrate(80);
  showQuip('Salamat, kalasag! 🛡️');
  return true;
}

// ------------------------------------------------------------------
// Controls
// ------------------------------------------------------------------
function act(dir) {
  if (state !== 'playing') return;
  if (dir === 'left' && player.lane > 0) { player.prevLane = player.lane; player.lane--; sfx.lane(); }
  else if (dir === 'right' && player.lane < 2) { player.prevLane = player.lane; player.lane++; sfx.lane(); }
  else if (dir === 'up' && player.grounded) {
    player.vy = JUMP_V; player.grounded = false; player.slide = 0;
    player.spinning = Math.random() < 0.3; // makulit — minsan umiikot habang tumatalon!
    player.spin = 0;
    sfx.jump();
  } else if (dir === 'down') {
    if (!player.grounded) player.vy = Math.min(player.vy, -20);
    if (player.slide <= 0) sfx.slide();
    player.slide = SLIDE_TIME;
  }
}

let touch = null;
window.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touch = { x: t.clientX, y: t.clientY, used: false };
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (!touch || touch.used) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  touch.used = true;
  if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? 'right' : 'left');
  else act(dy > 0 ? 'down' : 'up');
}, { passive: true });
window.addEventListener('touchend', () => { touch = null; }, { passive: true });

// mouse drag (para sa desktop)
let mouse = null;
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') mouse = { x: e.clientX, y: e.clientY, used: false }; });
window.addEventListener('pointermove', (e) => {
  if (!mouse || mouse.used || e.pointerType !== 'mouse') return;
  const dx = e.clientX - mouse.x, dy = e.clientY - mouse.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  mouse.used = true;
  if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? 'right' : 'left');
  else act(dy > 0 ? 'down' : 'up');
});
window.addEventListener('pointerup', () => { mouse = null; });

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (state === 'menu' && (k === 'enter' || k === ' ')) { startGame(); return; }
  if (state === 'menu' && (k === 'arrowleft' || k === 'arrowright')) { setCharacter(charIndex + (k === 'arrowleft' ? -1 : 1)); return; }
  if (state === 'over' && (k === 'enter' || k === ' ')) { startGame(); return; }
  if (k === 'p' || k === 'escape') { if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame(); return; }
  const map = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', ' ': 'up', arrowdown: 'down', s: 'down' };
  if (map[k]) { e.preventDefault(); act(map[k]); }
});

$('playBtn').addEventListener('click', startGame);
$('prevChar').addEventListener('click', () => setCharacter(charIndex - 1));
$('nextChar').addEventListener('click', () => setCharacter(charIndex + 1));
ui.charName.textContent = CHARACTERS[charIndex].name;
$('retryBtn').addEventListener('click', startGame);
$('pauseBtn').addEventListener('click', pauseGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('homeBtn').addEventListener('click', goMenu);
$('homeBtn2').addEventListener('click', goMenu);
ui.muteBtn.addEventListener('click', () => { ensureAudio(); setMuted(!muted); });
ui.muteBtn2.addEventListener('click', () => { ensureAudio(); setMuted(!muted); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state === 'playing') pauseGame();
    music.pause();
  } else if (state !== 'paused' && audioStarted) {
    playMusic();
  }
});

// ------------------------------------------------------------------
// Update
// ------------------------------------------------------------------
function updatePlaying(dt) {
  elapsed += dt;
  const newLevel = 1 + Math.floor(distance / LEVEL_DIST);
  if (newLevel !== level) {
    level = newLevel;
    showQuip(`Antas ${level}! 🔥 Bibilis pa!`);
    sfx.level();
  }
  speed = Math.min(MAX_SPEED, BASE_SPEED + elapsed * 0.2 + (level - 1) * 0.8);
  const dz = speed * dt;
  player.z -= dz;
  distance += dz;
  scoreF += dz * level;

  // galaw pakaliwa/pakanan
  player.x += (LANE_X[player.lane] - player.x) * Math.min(1, dt * 14);

  // talon / bagsak
  if (!player.grounded) {
    player.vy -= GRAVITY * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) { player.y = 0; player.vy = 0; player.grounded = true; player.spinning = false; }
  }
  if (player.slide > 0) player.slide -= dt;
  if (player.stumble > 0) player.stumble -= dt;
  if (player.magnet > 0) player.magnet -= dt;

  // gumagalaw na harang (jeep na paparating, manok na tumatawid)
  for (const o of obstacles) {
    if (o.vz) {
      if (!o.active && player.z - o.z < o.act * (speed + o.vz) / o.vz) { o.active = true; sfx.honk(); }
      if (o.active) { o.z += o.vz * dt; o.obj.position.z = o.z; }
    } else if (o.vx) {
      if (!o.active && player.z - o.z < speed * o.act) { o.active = true; sfx.cluck(); }
      if (o.active) {
        o.x += o.vx * dt;
        o.obj.position.x = o.x;
        o.obj.position.y = Math.abs(Math.sin(elapsed * 14)) * 0.12;
        o.lane = nearestLane(o.x);
        if (Math.abs(o.x) > 7) o.vx = 0;
      }
    }
  }

  const h = player.slide > 0 ? SLIDE_H : STAND_H;

  // banggaan
  for (const o of obstacles) {
    if (o.bumped) continue;
    if (Math.abs(o.z - player.z) > o.hd + 0.35) continue;
    const dx = Math.abs(o.x - player.x);
    if (dx > o.hw + 0.3) continue;
    if (player.y + h <= o.y0 || player.y >= o.y0 + o.h) continue;
    if (o.type === 'manok') {
      o.bumped = true;
      o.vx = (o.x > player.x ? 1 : -1) * 9;
      if (useShield(o)) continue;
      if (player.stumble > 0) { crash(); return; }
      player.stumble = 4;
      shake = 0.3;
      sfx.cluck(); sfx.bump();
      showQuip('Ay, manok! 🐔 Bok bok!');
      continue;
    }
    if (dx > 0.8 && player.prevLane !== o.lane) {
      // tumama sa gilid — tatalbog pabalik
      o.bumped = true;
      if (player.stumble > 0 && !useShield(o)) { crash(); return; }
      player.stumble = 4;
      player.lane = player.prevLane;
      shake = 0.35;
      sfx.bump();
      if (navigator.vibrate) navigator.vibrate(60);
      showQuip('Ay! Muntik na! 😅');
      continue;
    }
    if (useShield(o)) continue;
    crash();
    return;
  }

  // tutorial hints (unang beses makita)
  for (const o of obstacles) {
    const ahead = player.z - o.z;
    if (!hintShown[o.hint] && ahead > 0 && ahead < speed * 1.4) {
      hintShown[o.hint] = true;
      showQuip(HINTS[o.hint]);
      break;
    }
  }

  // barya
  const pcy = player.y + h / 2;
  const mag = player.magnet > 0;
  for (const c of coinList) {
    if (c.taken) continue;
    if (mag && c.z < player.z + 1 && c.z > player.z - 16) {
      const f = Math.min(1, dt * 9);
      c.x += (player.x - c.x) * f;
      c.y += (pcy - c.y) * f;
      c.z += (player.z - c.z) * f;
      c.mesh.position.set(c.x, c.y, c.z);
    }
    if (Math.abs(c.z - player.z) < 0.9 && Math.abs(c.x - player.x) < 0.9 && Math.abs(c.y - pcy) < 1.05) {
      c.taken = true;
      coins++;
      scoreF += 5 * level;
      sfx.coin();
      if (coins % 50 === 0) showQuip(pick(QUIPS_COIN));
    }
  }

  // power-ups
  for (const p of powerList) {
    if (p.taken) continue;
    if (!hintShown[p.kind] && player.z - p.z > 0 && player.z - p.z < speed * 1.4) { hintShown[p.kind] = true; showQuip(HINTS[p.kind]); }
    if (Math.abs(p.z - player.z) < 1 && Math.abs(p.x - player.x) < 1 && Math.abs(p.y - pcy) < 1.2) {
      p.taken = true;
      sfx.power();
      if (p.kind === 'magnet') { player.magnet = 10; showQuip('🧲 Halika, barya! 😆'); }
      else { player.shield = true; showQuip('🛡️ May kalasag na ako!'); }
    }
  }

  // random na kakulitan
  quipT -= dt;
  if (quipT <= 0) { quipT = rand(9, 16); showQuip(pick(QUIPS_RUN)); }

  // spawn
  while (nextRowZ > player.z - 175) spawnNext();
  score = Math.floor(scoreF);
}

function updateWorld(dt) {
  // recycle ground
  for (const seg of segments) {
    if (seg.position.z - SEG_LEN / 2 > player.z + 55) {
      seg.position.z -= SEG_COUNT * SEG_LEN;
      decorate(seg);
    }
  }
  if (welcome.visible && welcome.position.z > player.z + 30) welcome.visible = false;
  scenery.position.z = player.z;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].z > player.z + 14) { scene.remove(obstacles[i].obj); obstacles.splice(i, 1); }
  }
  const rot = performance.now() * 0.004;
  for (let i = coinList.length - 1; i >= 0; i--) {
    const c = coinList[i];
    if (c.taken) {
      c.t += dt;
      c.mesh.position.y += dt * 7;
      c.mesh.scale.setScalar(Math.max(0.01, 1 - c.t * 3.5));
      if (c.t > 0.28) { scene.remove(c.mesh); coinList.splice(i, 1); continue; }
    } else if (c.z > player.z + 10) {
      scene.remove(c.mesh); coinList.splice(i, 1); continue;
    }
    c.mesh.rotation.y = rot + c.z * 0.3;
  }

  for (let i = powerList.length - 1; i >= 0; i--) {
    const p = powerList[i];
    if (p.taken) {
      p.t += dt;
      p.mesh.scale.setScalar(Math.max(0.01, 1 + p.t * 3));
      p.mesh.children[1].material.opacity = 0.35;
      if (p.t > 0.2) { scene.remove(p.mesh); powerList.splice(i, 1); continue; }
    } else if (p.z > player.z + 10) {
      scene.remove(p.mesh); powerList.splice(i, 1); continue;
    }
    p.mesh.children[0].rotation.y = rot * 0.8;
    p.mesh.position.y = p.y + Math.sin(rot * 0.7 + p.z) * 0.12;
  }

  // ilaw at anino sumusunod kay Katumpi
  sun.position.set(player.x - 9, 18, player.z - 10);
  sun.target.position.set(player.x, 0, player.z - 4);
}

const lerp = (a, b, t) => a + (b - a) * t;
function animateKatumpi(dt) {
  K.root.position.set(player.x, player.y, player.z);
  const [legL, legR] = K.legs, [armL, armR] = K.arms;
  const k = Math.min(1, dt * 12);

  // blink
  blinkT -= dt;
  const blink = blinkT < 0.12 ? 0.1 : 1;
  if (blinkT < 0) blinkT = rand(1.8, 4);
  K.eyes.forEach((e) => { e.scale.y = blink; });

  K.stars.rotation.y += dt * 4;
  K.bubble.visible = player.shield && state === 'playing';
  if (K.bubble.visible) K.bubble.material.opacity = 0.2 + Math.sin(performance.now() * 0.008) * 0.08;

  if (state === 'menu') {
    menuT += dt;
    const hop = Math.max(0, Math.sin(menuT * 5)) * 0.12 * (Math.sin(menuT * 0.9) > 0.2 ? 1 : 0);
    K.pose.position.y = hop;
    K.pose.rotation.x = lerp(K.pose.rotation.x, 0, k);
    K.model.rotation.y = Math.PI + Math.sin(menuT * 0.8) * 0.15;
    legL.rotation.x = lerp(legL.rotation.x, hop ? -0.25 : 0, k);
    legR.rotation.x = lerp(legR.rotation.x, hop ? 0.15 : 0, k);
    // kumakaway
    armR.rotation.x = 0;
    armR.rotation.z = 2.6 + Math.sin(menuT * 9) * 0.35;
    armL.rotation.x = Math.sin(menuT * 2) * 0.1;
    armL.rotation.z = -0.15;
    K.spine.rotation.x = 0;
    K.spine.rotation.z = Math.sin(menuT * 2) * 0.05;
    K.head.rotation.z = Math.sin(menuT * 1.7) * 0.18;
    K.head.rotation.x = 0;
    if (K.hijab) K.tails.forEach((t) => { t.rotation.x = -0.1 - Math.sin(menuT * 3) * 0.08; t.rotation.z = 0; });
    else K.tails.forEach((t, i) => { t.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(menuT * 5) * 0.12); });
    return;
  }

  if (state === 'dying' || state === 'over') {
    deathT += dt;
    K.pose.rotation.x = lerp(K.pose.rotation.x, 1.45, Math.min(1, dt * 8));
    K.pose.position.y = lerp(K.pose.position.y, 0.22, Math.min(1, dt * 8));
    armL.rotation.z = lerp(armL.rotation.z, -1.4, k);
    armR.rotation.z = lerp(armR.rotation.z, 1.4, k);
    legL.rotation.x = lerp(legL.rotation.x, -0.5, k);
    legR.rotation.x = lerp(legR.rotation.x, 0.3, k);
    K.head.rotation.z = Math.sin(deathT * 6) * 0.2;
    return;
  }
  if (state === 'paused') return;

  const sliding = player.slide > 0 && player.grounded;
  player.phase += dt * speed * 0.55;
  const s = Math.sin(player.phase);

  K.head.rotation.z = lerp(K.head.rotation.z, 0, k);
  K.spine.rotation.z = 0;
  // ikot habang tumatalon
  if (player.spinning && !player.grounded) {
    player.spin = Math.min(1, player.spin + dt * 1.6);
    K.model.rotation.y = Math.PI + smooth(player.spin) * Math.PI * 2;
  } else {
    K.model.rotation.y = Math.PI;
  }

  if (sliding) {
    K.pose.rotation.x = lerp(K.pose.rotation.x, 1.15, Math.min(1, dt * 18));
    K.pose.position.y = lerp(K.pose.position.y, 0.28, Math.min(1, dt * 18));
    legL.rotation.x = lerp(legL.rotation.x, 0.1, k);
    legR.rotation.x = lerp(legR.rotation.x, -0.1, k);
    armL.rotation.x = lerp(armL.rotation.x, -2.6, k);
    armR.rotation.x = lerp(armR.rotation.x, -2.6, k);
    armL.rotation.z = lerp(armL.rotation.z, -0.3, k);
    armR.rotation.z = lerp(armR.rotation.z, 0.3, k);
    K.spine.rotation.x = lerp(K.spine.rotation.x, -0.2, k);
    K.head.rotation.x = lerp(K.head.rotation.x, 0.5, k);
  } else if (!player.grounded) {
    K.pose.rotation.x = lerp(K.pose.rotation.x, 0, k);
    K.pose.position.y = lerp(K.pose.position.y, 0, k);
    legL.rotation.x = lerp(legL.rotation.x, 0.9, k);
    legR.rotation.x = lerp(legR.rotation.x, -0.3, k);
    armL.rotation.x = lerp(armL.rotation.x, -0.4, k);
    armR.rotation.x = lerp(armR.rotation.x, -0.4, k);
    armL.rotation.z = lerp(armL.rotation.z, -2.4, k);
    armR.rotation.z = lerp(armR.rotation.z, 2.4, k);
    K.spine.rotation.x = lerp(K.spine.rotation.x, 0.05, k);
    K.head.rotation.x = lerp(K.head.rotation.x, -0.15, k);
  } else {
    K.pose.rotation.x = lerp(K.pose.rotation.x, 0, Math.min(1, dt * 18));
    K.pose.position.y = Math.abs(s) * 0.09;
    legL.rotation.x = s * 0.95;
    legR.rotation.x = -s * 0.95;
    armL.rotation.x = -s * 0.9;
    armR.rotation.x = s * 0.9;
    armL.rotation.z = lerp(armL.rotation.z, -0.18, k);
    armR.rotation.z = lerp(armR.rotation.z, 0.18, k);
    K.spine.rotation.x = lerp(K.spine.rotation.x, 0.16, k);
    K.head.rotation.x = lerp(K.head.rotation.x, -0.08, k);
    // tumatagilid kapag lumilipat ng lane
    K.spine.rotation.z = (LANE_X[player.lane] - player.x) * -0.08;
  }
  if (K.hijab) {
    K.tails.forEach((t) => { t.rotation.x = -0.35 - Math.abs(Math.sin(player.phase)) * 0.25 - (player.grounded ? 0 : 0.3); });
  } else K.tails.forEach((t, i) => {
    const side = i ? 1 : -1;
    t.rotation.z = side * (0.35 + Math.sin(player.phase * 2 + i) * 0.25 + (player.grounded ? 0 : 0.4));
    t.rotation.x = Math.cos(player.phase) * 0.2;
  });
}

// Camera
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpD = new THREE.Vector3();
function updateCamera(dt) {
  const t = performance.now() * 0.001;
  // menu pose: nakaharap kay Katumpi
  const ang = Math.sin(t * 0.25) * 0.22 - 0.12;
  tmpA.set(player.x + Math.sin(ang) * 4.6, 1.6, player.z - Math.cos(ang) * 4.6);
  tmpB.set(player.x, 1.15, player.z);
  // game pose: nasa likod
  tmpC.set(player.x * 0.55, 3.4 + player.y * 0.35, player.z + 6.8);
  tmpD.set(player.x * 0.35, 1.2 + player.y * 0.25, player.z - 8);

  if (state === 'menu') {
    camPos.copy(tmpA); camLook.copy(tmpB);
  } else {
    if (startBlend < 1) startBlend = Math.min(1, startBlend + dt * 1.2);
    const b = smooth(startBlend);
    camPos.lerpVectors(tmpA, tmpC, b);
    camLook.lerpVectors(tmpB, tmpD, b);
  }
  camera.position.copy(camPos);
  if (shake > 0) {
    shake = Math.max(0, shake - dt);
    camera.position.x += (Math.random() - 0.5) * shake * 0.6;
    camera.position.y += (Math.random() - 0.5) * shake * 0.6;
  }
  camera.lookAt(camLook);
}

// HUD
let lastScore = -1, lastCoins = -1, lastLevel = -1, lastPw = '';
function updateHud() {
  if (score !== lastScore) {
    ui.score.textContent = score;
    ui.dist.textContent = `${Math.floor(distance)} m`;
    lastScore = score;
  }
  if (coins !== lastCoins) { ui.coinCount.textContent = coins; lastCoins = coins; }
  if (level !== lastLevel) { ui.level.textContent = `Antas ${level} • x${level}`; lastLevel = level; }
  const pw = `${player.magnet > 0 ? `<span>🧲 ${Math.ceil(player.magnet)}</span>` : ''}${player.shield ? '<span>🛡️</span>' : ''}`;
  if (pw !== lastPw) { ui.powers.innerHTML = pw; lastPw = pw; }
}

// ------------------------------------------------------------------
// Loop
// ------------------------------------------------------------------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 0.8 ? 72 : 60;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let firstFrame = true;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (state === 'playing') { updatePlaying(dt); updateHud(); }
  if (state !== 'paused') updateWorld(dt);
  animateKatumpi(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    $('loading').classList.add('hidden');
  }
}

resetWorld();
setMuted(muted);
loop();

// Offline / install support (PWA)
const inAndroidApp = location.hostname === 'appassets.androidplatform.net';
if (!inAndroidApp && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Tinatawag ng Android app kapag lumabas/bumalik sa app
window.__katumpiAppPause = () => { if (state === 'playing') pauseGame(); music.pause(); };
window.__katumpiAppResume = () => { if (state !== 'paused' && audioStarted) playMusic(); };

// para sa testing
window.__katumpi = { get state() { return state; }, get level() { return level; }, player, act, startGame, setCharacter, obstacles, powerList, get speed() { return speed; }, get score() { return score; }, warp(d) { distance = d; elapsed = d / 25; } };

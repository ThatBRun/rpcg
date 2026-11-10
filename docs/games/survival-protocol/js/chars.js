/* Survival Protocol 1.3 — OPERATORS: stylised, unique hero characters (Fortnite / COD style) for Battle Royale,
   the Locker and your first-person arms. Every character is built from parts (hair, hats, masks, outfits, armour,
   back bling, glowing trims) and then MERGED into one mesh per body part per material, with the merged geometry
   cached per operator. 30 bots wearing the same operator share the same GPU buffers, and each character costs
   about a dozen draw calls instead of fifty. The rig is identical to the old soldier, so all animation still works. */
'use strict';
(function () {
const T = THREE, { V3, clamp } = SP; const Mods = SP.Models;

/* ---------------- shared materials (one per surface type, shared by every character) ---------------- */
function patTex(kind) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); let s = 7 + kind.length * 13; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const g = v => { const k = Math.round(v * 255); return `rgb(${k},${k},${k})`; };
  x.fillStyle = g(1); x.fillRect(0, 0, S, S);
  if (kind === 'camo') for (let i = 0; i < 70; i++) { x.fillStyle = g([0.55, 0.72, 0.85][i % 3]); x.beginPath(); const cx = R() * S, cy = R() * S; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, r = 10 + R() * 22; x.lineTo(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r); } x.fill(); }
  if (kind === 'digital') for (let i = 0; i < 900; i++) { x.fillStyle = g([0.62, 0.78, 0.9][i % 3]); const q = 8; x.fillRect(Math.floor(R() * S / q) * q, Math.floor(R() * S / q) * q, q * (1 + (R() * 2 | 0)), q); }
  if (kind === 'tiger') for (let i = 0; i < 28; i++) { x.strokeStyle = g(0.5); x.lineWidth = 4 + R() * 7; x.beginPath(); const y = R() * S; x.moveTo(0, y); for (let px = 0; px <= S; px += 32) x.lineTo(px, y + Math.sin(px * 0.05 + i) * 14 + (R() - 0.5) * 10); x.stroke(); }
  if (kind === 'carbon') for (let yy = 0; yy < S; yy += 8) for (let xx = 0; xx < S; xx += 8) { x.fillStyle = g(((xx + yy) / 8) % 2 ? 0.7 : 0.95); x.fillRect(xx, yy, 8, 8); }
  if (kind === 'quilt') { x.strokeStyle = g(0.72); x.lineWidth = 3; for (let k = 0; k < S; k += 32) { x.beginPath(); x.moveTo(0, k); x.lineTo(S, k); x.stroke(); } }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
}
const MATS = {};
function matFor(k) {
  if (MATS[k]) return MATS[k];
  if (k === 'c') return MATS[k] = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.04 });
  if (k === 'm') return MATS[k] = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.42 });
  if (k === 's') return MATS[k] = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.0 }); // skin
  if (k === 'g') return MATS[k] = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const tex = patTex(k.slice(2)); return MATS[k] = new T.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: 0.85, metalness: 0.02 });
}
SP.charMat = matFor;

/* ---------------- geometry primitives (cached) ---------------- */
const GQ = {};
const G = {
  box: (w, h, d) => GQ['b' + w + ',' + h + ',' + d] || (GQ['b' + w + ',' + h + ',' + d] = new T.BoxGeometry(w, h, d)),
  cyl: (a, b, h, s = 12) => GQ['c' + [a, b, h, s]] || (GQ['c' + [a, b, h, s]] = new T.CylinderGeometry(a, b, h, s)),
  sph: (r, w = 14, h = 10) => GQ['s' + [r, w, h]] || (GQ['s' + [r, w, h]] = new T.SphereGeometry(r, w, h)),
  cap: (r, w = 14, h = 7, f = 0.55) => GQ['h' + [r, w, h, f]] || (GQ['h' + [r, w, h, f]] = new T.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI * f)),
  cone: (r, h, s = 10) => GQ['k' + [r, h, s]] || (GQ['k' + [r, h, s]] = new T.ConeGeometry(r, h, s)),
  tor: (r, t, a = Math.PI * 2, s = 18) => GQ['t' + [r, t, a, s]] || (GQ['t' + [r, t, a, s]] = new T.TorusGeometry(r, t, 6, s, a)),
  torso: (top, waist, h) => { const k = 'L' + [top, waist, h]; if (GQ[k]) return GQ[k]; const pts = [[0.001, -h / 2], [waist * 0.92, -h / 2], [waist, -h * 0.3], [waist * 1.02, 0], [top * 0.98, h * 0.3], [top, h * 0.42], [top * 0.8, h / 2], [0.001, h / 2]].map(([x, y]) => new T.Vector2(x, y)); return GQ[k] = new T.LatheGeometry(pts, 18); },
};

/* ---------------- merge parts per bone + material ---------------- */
const tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpE = new T.Euler(), tmpP = new T.Vector3(), tmpS = new T.Vector3(), nM = new T.Matrix3();
function mergeParts(parts) {
  const byMat = {};
  for (const p of parts) (byMat[p.m] || (byMat[p.m] = [])).push(p);
  const out = {};
  for (const mk in byMat) {
    const list = byMat[mk]; let n = 0; const gs = list.map(p => { const g = p.g.index ? p.g.toNonIndexed() : p.g; n += g.attributes.position.count; return g; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
    list.forEach((p, i) => {
      const g = gs[i]; tmpE.set(p.rx || 0, p.ry || 0, p.rz || 0); tmpQ.setFromEuler(tmpE); tmpP.set(p.x || 0, p.y || 0, p.z || 0); tmpS.set(p.sx == null ? 1 : p.sx, p.sy == null ? 1 : p.sy, p.sz == null ? 1 : p.sz);
      tmpM.compose(tmpP, tmpQ, tmpS); nM.getNormalMatrix(tmpM);
      const pa = g.attributes.position, na = g.attributes.normal; const col = p.c; const gl = mk === 'g' ? 2.6 : 1;
      const v = new T.Vector3(), nn = new T.Vector3();
      for (let k = 0; k < pa.count; k++) {
        v.fromBufferAttribute(pa, k).applyMatrix4(tmpM); nn.fromBufferAttribute(na, k).applyMatrix3(nM).normalize();
        const j = o + k; P[j * 3] = v.x; P[j * 3 + 1] = v.y; P[j * 3 + 2] = v.z; N[j * 3] = nn.x; N[j * 3 + 1] = nn.y; N[j * 3 + 2] = nn.z;
        C[j * 3] = col.r * gl; C[j * 3 + 1] = col.g * gl; C[j * 3 + 2] = col.b * gl;
        const ax = Math.abs(nn.x), ay = Math.abs(nn.y); const sc = 5; // box-projected UVs for patterns
        if (ax > ay && ax > Math.abs(nn.z)) { U[j * 2] = v.z * sc; U[j * 2 + 1] = v.y * sc; } else if (ay > Math.abs(nn.z)) { U[j * 2] = v.x * sc; U[j * 2 + 1] = v.z * sc; } else { U[j * 2] = v.x * sc; U[j * 2 + 1] = v.y * sc; }
      }
      o += pa.count; if (g !== p.g) g.dispose();
    });
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(P, 3)); bg.setAttribute('normal', new T.BufferAttribute(N, 3)); bg.setAttribute('color', new T.BufferAttribute(C, 3)); bg.setAttribute('uv', new T.BufferAttribute(U, 2)); bg.computeBoundingSphere();
    out[mk] = bg;
  }
  return out;
}

/* ---------------- the roster ---------------- */
// t: torso style · h: hair · hat · mask · back · sh: shoulders · legs · pat: pattern on clothes · glow: trim colour
const O = {
  default: { name: 'Jake Sarton', skin: 0xc79a7a, h: 'short', hc: 0x3a2618, hat: 'helmet', hatC: 0x56583e, mask: 'goggles', t: 'tactical', top: 0x5e6046, top2: 0x4a4c36, pants: 0x5e6046, pat: 'camo', legs: 'cargo', boots: 0x3a3226, glove: 0x2e2a26, back: 'pack', sh: 'pads' },
  recruit: { name: 'Desert Recruit', skin: 0xa8775a, h: 'buzz', hc: 0x1a120c, hat: 'cap', hatC: 0xb49a6c, mask: 'shades', t: 'tactical', top: 0xc8ad7c, top2: 0x9a8058, pants: 0xc0a474, pat: 'digital', legs: 'cargo', boots: 0x7a5a3a, glove: 0x6a5232, back: 'pack' },
  urban: { name: 'Urban Ops', skin: 0xd8ad8e, h: 'short', hc: 0x101010, hat: 'beanie', hatC: 0x1c1c1e, mask: 'balaclava', maskC: 0x1c1c1e, t: 'jacket', top: 0x4a4e56, top2: 0x22252a, pants: 0x2a2c30, legs: 'cargo', boots: 0x141416, glove: 0x1a1a1c, back: 'radio', sh: 'pads' },
  arctic: { name: 'Arctic Shadow', skin: 0xe0b8a0, h: 'short', hc: 0xe8e8e8, hat: 'hood', hatC: 0xf2f6f8, mask: 'goggles', t: 'puffer', top: 0xeef3f6, top2: 0xb8c6d0, pants: 0xdfe8ee, pat: 'digital', legs: 'cargo', boots: 0x8a9aa6, glove: 0xb8c4cc, back: 'pack' },
  viper: { name: 'Jungle Viper', skin: 0x8a5f42, h: 'mohawk', hc: 0x3aff6a, t: 'ninja', top: 0x3a6a2a, top2: 0x1e3018, pants: 0x30502a, pat: 'tiger', legs: 'slim', boots: 0x14200e, glove: 0x14200e, mask: 'bandanaFace', maskC: 0x2a4a22, back: 'katana', glow: 0x3aff6a },
  raven: { name: 'Night Raven', skin: 0xb88c69, h: 'none', hat: 'helmetVisor', hatC: 0x16161c, t: 'armor', top: 0x1a1a22, top2: 0x2a2a36, pants: 0x18181e, legs: 'armor', boots: 0x0a0a0c, glove: 0x0a0a0c, back: 'cape', capeC: 0x101016, sh: 'armor', glow: 0xa05aff },
  crimson: { name: 'Crimson Guard', skin: 0xc79a7a, h: 'none', hat: 'helmetVisor', hatC: 0x7a1a1a, t: 'armor', top: 0x7a1a1a, top2: 0xb08a30, pants: 0x3a0e0e, legs: 'armor', boots: 0x2a0a0a, glove: 0x2a0a0a, back: 'shield', sh: 'armor', glow: 0xff3a2a },
  ghost: { name: 'Ghost', skin: 0xc79a7a, h: 'none', hat: 'hood', hatC: 0x2e3236, mask: 'skull', t: 'tactical', top: 0x3a3e42, top2: 0x1e2022, pants: 0x2e3236, pat: 'carbon', legs: 'cargo', boots: 0x101012, glove: 0x101012, back: 'radio', sh: 'pads' },
  neon: { name: 'Neon Runner', skin: 0xd8ad8e, h: 'spiky', hc: 0xff2ad4, mask: 'visor', maskC: 0x00e5ff, t: 'hoodie', top: 0x1a1a2a, top2: 0x2a1a3a, pants: 0x12121c, legs: 'slim', boots: 0xff2ad4, glove: 0xff2ad4, back: 'wings', glow: 0xff2ad4 },
  royal: { name: 'Royal Guard', skin: 0xd8ad8e, h: 'short', hc: 0xc8a050, hat: 'crown', hatC: 0xd4af37, t: 'suit', top: 0xe8d8b8, top2: 0x8a1a1a, pants: 0xe0d0b0, legs: 'slim', boots: 0x3a2a1a, glove: 0xb08a30, back: 'cape', capeC: 0x8a1a1a, sh: 'armor', glow: 0xffd040 },
  frost: { name: 'Frostbite', skin: 0xb8d8f0, h: 'spiky', hc: 0xe8f8ff, mask: 'visor', maskC: 0x7ae0ff, t: 'armor', top: 0x9ad8ff, top2: 0xe8f8ff, pants: 0x6aa8d8, legs: 'armor', boots: 0xe8f8ff, glove: 0xe8f8ff, back: 'wings', sh: 'armor', glow: 0x7ae0ff },
  inferno: { name: 'Inferno', skin: 0x6e4a33, h: 'spiky', hc: 0xff6a1a, hat: 'horns', hatC: 0x1a0a04, mask: 'skull', maskC: 0x2a1a14, t: 'armor', top: 0x2a0a04, top2: 0x4a1a0a, pants: 0x1a0804, legs: 'armor', boots: 0x1a0804, glove: 0xff6a1a, back: 'cape', capeC: 0x3a0a04, sh: 'armor', glow: 0xff6a1a },
  sandstorm: { name: 'Sandstorm Commando', skin: 0xa8775a, h: 'none', hat: 'bandana', hatC: 0xc8a060, mask: 'bandanaFace', maskC: 0xc8a060, t: 'ninja', top: 0xc8a060, top2: 0x8a6a3a, pants: 0xb89050, pat: 'digital', legs: 'cargo', boots: 0x5a4020, glove: 0x5a4020, back: 'katana', sh: 'pads', goggles: true },
  jackal: { name: 'The Jackal', skin: 0x8a5f42, h: 'buzz', hc: 0x0a0a0a, hat: 'capBack', hatC: 0x141008, mask: 'gas', maskC: 0x141008, t: 'suit', top: 0x141008, top2: 0xd4af37, pants: 0x141008, legs: 'slim', boots: 0x0a0a0a, glove: 0xd4af37, back: 'cape', capeC: 0x0a0806, sh: 'armor', glow: 0xd4af37 },
  // store operators (coins)
  blaze: { name: 'Blaze', skin: 0xa8775a, h: 'short', hc: 0x1a120c, hat: 'capBack', hatC: 0xff7a1a, mask: 'none', headphones: true, t: 'hoodie', top: 0xff7a1a, top2: 0x2a2a2a, pants: 0x2a2a30, legs: 'slim', boots: 0xf2f2f2, glove: 0x2a2a2a, back: 'pack', price: 1200 },
  nova: { name: 'Nova', skin: 0xe0b8a0, h: 'ponytail', hc: 0x5a2a1a, mask: 'shades', t: 'jacket', top: 0x1a8a8a, top2: 0xf2f2f2, pants: 0x1a2a3a, legs: 'slim', boots: 0x1a1a1a, glove: 0x1a1a1a, back: 'none', price: 1200, slim: true },
  bulwark: { name: 'Bulwark', skin: 0x7a5038, h: 'none', beard: 0x1a120c, t: 'tank', top: 0x3a4a2a, top2: 0x2a2a2a, pants: 0x3a3a30, pat: 'camo', legs: 'cargo', boots: 0x2a2620, glove: 0x2a2620, back: 'tank', sh: 'armor', bulk: 1.14, price: 1600 },
  shinobi: { name: 'Shinobi', skin: 0xd8ad8e, h: 'none', mask: 'balaclava', maskC: 0x0e0e10, eyes: 0xff2a2a, t: 'ninja', top: 0x141416, top2: 0x8a1a1a, pants: 0x141416, legs: 'slim', boots: 0x0e0e10, glove: 0x0e0e10, back: 'katana', glow: 0xff2a2a, price: 1800 },
  outlaw: { name: 'Outlaw', skin: 0xc79a7a, h: 'long', hc: 0x3a2618, hat: 'cowboy', hatC: 0x5a3a20, mask: 'bandanaFace', maskC: 0x9a1a1a, t: 'jacket', top: 0x6a4a2a, top2: 0xd8c8a8, pants: 0x2a3a5a, legs: 'slim', boots: 0x4a2a1a, glove: 0x6a4a2a, back: 'none', beard: 0x3a2618, price: 1400 },
  medic: { name: 'Field Medic', skin: 0xb88c69, h: 'bun', hc: 0x2a1a10, hat: 'cap', hatC: 0xf2f2f2, mask: 'none', t: 'tactical', top: 0xe8e8e8, top2: 0xc82a2a, pants: 0x4a4e56, legs: 'cargo', boots: 0x1a1a1a, glove: 0xe8e8e8, back: 'medpack', price: 1200 },
  cosmo: { name: 'Cosmo', skin: 0xd8ad8e, h: 'none', hat: 'helmetVisor', hatC: 0xf2f2f2, visorC: 0xffc040, t: 'armor', top: 0xf2f2f2, top2: 0xd8d8d8, pants: 0xe8e8e8, legs: 'armor', boots: 0xd8d8d8, glove: 0xd8d8d8, back: 'tank', sh: 'armor', glow: 0x40c8ff, bulk: 1.06, price: 2000 },
  riot: { name: 'Riot', skin: 0xe0b8a0, h: 'mohawk', hc: 0x3aff3a, mask: 'shades', t: 'jacket', top: 0x141414, top2: 0x8a1a1a, pants: 0x1a1a1a, legs: 'slim', boots: 0x1a1a1a, glove: 0x141414, back: 'none', sh: 'pads', price: 1400 },
  scout: { name: 'Scout', skin: 0xa8775a, h: 'bun', hc: 0x1a120c, hat: 'none', mask: 'goggles', t: 'puffer', top: 0x5a6a3a, top2: 0x3a4a2a, pants: 0x4a4a3a, pat: 'quilt', legs: 'cargo', boots: 0x3a3226, glove: 0x3a3226, back: 'pack', price: 1200 },
  agent: { name: 'Agent Zero', skin: 0xc79a7a, h: 'buzz', hc: 0x0a0a0a, mask: 'shades', t: 'suit', top: 0x141416, top2: 0xb81a1a, pants: 0x141416, legs: 'slim', boots: 0x0a0a0a, glove: 0x0a0a0a, back: 'none', price: 1600 },
  commando: { name: 'Commando', skin: 0x8a5f42, h: 'short', hc: 0x1a120c, hat: 'bandana', hatC: 0xb81a1a, beard: 0x1a120c, t: 'tank', top: 0x4a5a2a, top2: 0x2a2a2a, pants: 0x4a5a2a, pat: 'camo', legs: 'cargo', boots: 0x2a2620, glove: 0x2a2620, back: 'none', bulk: 1.08, price: 1400 },
  ace: { name: 'Ace Pilot', skin: 0xd8ad8e, h: 'short', hc: 0x7a5a2a, hat: 'aviator', hatC: 0x5a3a20, mask: 'goggles', t: 'puffer', top: 0x6a4224, top2: 0xd8c8a8, pants: 0x4a4a3a, legs: 'cargo', boots: 0x2a1a10, glove: 0x4a2a14, back: 'pack', price: 1400 },
};
Object.keys(O).forEach(k => O[k].id = k);
SP.OPERATORS = O;
SP.STORE_OPS = Object.keys(O).filter(k => O[k].price);

/* ---------------- character builder ---------------- */
const col = h => SP.lin(h);
function build(o) {
  const P = {}; const B = n => P[n] || (P[n] = []);
  const add = (bone, g, m, c, x, y, z, rx, ry, rz, sx, sy, sz) => B(bone).push({ g, m, c: col(c), x, y, z, rx, ry, rz, sx, sy, sz });
  const cloth = o.pat ? 'p:' + o.pat : 'c'; const skin = o.skin, top = o.top, top2 = o.top2 || o.top, glow = o.glow;
  const bulk = o.bulk || 1, slim = o.slim ? 0.92 : 1; const tank = o.t === 'tank';
  /* hips */
  add('hips', G.box(0.34 * bulk * slim, 0.2, 0.22), cloth, o.pants, 0, 0, 0);
  add('hips', G.box(0.36 * bulk * slim, 0.055, 0.24), 'c', 0x1a1a1a, 0, 0.09, 0);
  add('hips', G.box(0.06, 0.05, 0.02), 'm', glow || 0x8a8a8a, 0, 0.09, -0.125);
  if (o.t === 'ninja') add('hips', G.box(0.38 * bulk, 0.08, 0.26), 'c', top2, 0, 0.06, 0, 0, 0, 0.15);
  /* torso */
  const tw = 0.205 * bulk * slim, ww = 0.165 * bulk * slim;
  add('chest', G.torso(tw, ww, 0.5), tank ? 'c' : cloth, top, 0, 0.15, 0, 0, 0, 0, 1, 1, 0.64);
  add('chest', G.cyl(0.058, 0.064, 0.12, 10), 's', skin, 0, 0.44, 0);
  if (o.t === 'tactical') {
    add('chest', G.box(0.4 * bulk, 0.32, 0.27), 'c', top2, 0, 0.16, 0);
    for (let i = -1; i <= 1; i++) add('chest', G.box(0.085, 0.12, 0.05), 'c', top2, i * 0.1, 0.06, -0.155);
    add('chest', G.box(0.12, 0.07, 0.04), 'c', top2, -0.1, 0.25, -0.15); add('chest', G.box(0.4 * bulk, 0.04, 0.28), 'c', 0x1a1a1a, 0, 0.3, 0);
    add('chest', G.box(0.07, 0.05, 0.02), 'c', 0x2a2a2a, 0.12, 0.25, -0.15);
    if (o.id === 'medic') { add('chest', G.box(0.1, 0.03, 0.01), 'c', 0xc82a2a, 0.1, 0.27, -0.16); add('chest', G.box(0.03, 0.1, 0.01), 'c', 0xc82a2a, 0.1, 0.27, -0.16); }
  } else if (o.t === 'hoodie') {
    add('chest', G.box(0.22, 0.1, 0.03), 'c', top2, 0, 0.0, -0.13);
    add('chest', G.tor(0.12, 0.045, Math.PI * 1.3, 14), 'c', top, 0, 0.42, 0.04, -1.2, 0, 0);
    add('chest', G.cyl(0.006, 0.006, 0.14, 4), 'c', 0xf2f2f2, -0.04, 0.3, -0.135); add('chest', G.cyl(0.006, 0.006, 0.14, 4), 'c', 0xf2f2f2, 0.04, 0.3, -0.135);
    if (glow) { add('chest', G.box(0.42 * bulk, 0.015, 0.27), 'g', glow, 0, 0.05, 0); add('chest', G.box(0.012, 0.3, 0.012), 'g', glow, 0, 0.18, -0.135); }
  } else if (o.t === 'jacket') {
    add('chest', G.box(0.1, 0.42, 0.02), 'c', top2, 0, 0.17, -0.128);
    for (const s of [-1, 1]) { add('chest', G.box(0.06, 0.2, 0.02), 'c', top, s * 0.07, 0.29, -0.13, 0, 0, s * 0.35); add('chest', G.box(0.045, 0.06, 0.02), 'c', 0x2a2a2a, s * 0.12, 0.05, -0.13); }
    add('chest', G.tor(0.09, 0.03, Math.PI, 12), 'c', top, 0, 0.42, 0.0, -1.4, 0, 0);
    add('chest', G.box(0.008, 0.36, 0.01), 'm', 0xb8b8b8, 0.05, 0.16, -0.135);
  } else if (o.t === 'armor') {
    add('chest', G.box(0.42 * bulk, 0.34, 0.29), 'm', top2, 0, 0.18, 0); add('chest', G.box(0.3 * bulk, 0.14, 0.27), 'm', top, 0, 0.0, 0);
    add('chest', G.box(0.34 * bulk, 0.035, 0.3), 'm', top, 0, 0.36, 0); add('chest', G.box(0.2, 0.012, 0.02), 'g', glow || 0x40c8ff, 0, 0.24, -0.15); add('chest', G.box(0.012, 0.16, 0.02), 'g', glow || 0x40c8ff, 0, 0.12, -0.15);
    add('chest', G.box(0.08, 0.08, 0.03), 'g', glow || 0x40c8ff, 0, 0.3, -0.148, 0, 0, Math.PI / 4, 0.7, 0.7, 1);
  } else if (o.t === 'suit') {
    add('chest', G.box(0.09, 0.4, 0.02), 'c', 0xf2f2f2, 0, 0.19, -0.126); add('chest', G.box(0.035, 0.28, 0.02), 'c', top2, 0, 0.2, -0.132); add('chest', G.box(0.05, 0.035, 0.02), 'c', top2, 0, 0.37, -0.132);
    for (const s of [-1, 1]) add('chest', G.box(0.055, 0.24, 0.02), 'c', top, s * 0.065, 0.26, -0.134, 0, 0, s * 0.3);
    if (glow) add('chest', G.box(0.42 * bulk, 0.012, 0.27), 'g', glow, 0, -0.04, 0);
  } else if (o.t === 'ninja') {
    add('chest', G.box(0.06, 0.55, 0.28), 'c', top2, 0, 0.15, 0, 0, 0, 0.55);
    add('chest', G.tor(0.085, 0.04, Math.PI * 2, 14), 'c', top2, 0, 0.42, 0, Math.PI / 2, 0, 0); add('chest', G.box(0.07, 0.22, 0.02), 'c', top2, 0.06, 0.32, 0.1, 0.3, 0, 0.2);
    if (glow) add('chest', G.box(0.01, 0.4, 0.01), 'g', glow, 0.0, 0.15, -0.135, 0, 0, 0.55);
  } else if (o.t === 'puffer') {
    for (let i = 0; i < 4; i++) add('chest', G.tor(tw * (0.98 - Math.abs(i - 1.8) * 0.06), 0.035, Math.PI * 2, 18), cloth, i % 2 ? top : top2 === top ? top : top, 0, 0.02 + i * 0.11, 0, Math.PI / 2, 0, 0, 1, 0.64, 1);
    add('chest', G.tor(0.1, 0.05, Math.PI * 2, 14), cloth, top2, 0, 0.42, 0, Math.PI / 2, 0, 0); add('chest', G.box(0.008, 0.38, 0.01), 'm', 0xb8b8b8, 0, 0.16, -0.14);
  } else if (tank) {
    add('chest', G.torso(tw * 1.01, ww * 1.01, 0.32), 'c', top, 0, 0.05, 0, 0, 0, 0, 1, 1, 0.66); add('chest', G.tor(0.08, 0.004, Math.PI * 1.2, 10), 'm', 0xb8b8b8, 0, 0.38, -0.02, -1.0, 0, Math.PI * 1.1); add('chest', G.box(0.03, 0.045, 0.006), 'm', 0xb8b8b8, 0, 0.27, -0.12);
  }
  // back bling
  const bk = o.back;
  if (bk === 'pack' || bk === 'medpack') { add('chest', G.box(0.3, 0.36, 0.15), 'c', bk === 'medpack' ? 0xe8e8e8 : top2, 0, 0.17, 0.2); add('chest', G.cyl(0.06, 0.06, 0.32, 10), 'c', 0x4a4030, 0, 0.38, 0.2, 0, 0, Math.PI / 2); add('chest', G.box(0.14, 0.12, 0.04), 'c', bk === 'medpack' ? 0xc82a2a : top, 0, 0.12, 0.29); if (bk === 'medpack') { add('chest', G.box(0.1, 0.03, 0.01), 'c', 0xffffff, 0, 0.12, 0.312); add('chest', G.box(0.03, 0.1, 0.01), 'c', 0xffffff, 0, 0.12, 0.312); } }
  if (bk === 'radio') { add('chest', G.box(0.26, 0.32, 0.14), 'c', 0x3c3f31, 0, 0.18, 0.2); add('chest', G.cyl(0.004, 0.004, 0.8, 4), 'c', 0x1a1a1a, 0.1, 0.7, 0.24, 0, 0, -0.1); }
  if (bk === 'katana') { add('chest', G.box(0.03, 0.9, 0.02), 'c', 0x1a1a1a, 0, 0.2, 0.17, 0, 0, 0.7); add('chest', G.box(0.1, 0.02, 0.06), 'm', 0xd4af37, -0.18, 0.43, 0.17, 0, 0, 0.7); add('chest', G.box(0.026, 0.22, 0.026), 'c', top2, -0.27, 0.53, 0.17, 0, 0, 0.7); if (glow) add('chest', G.box(0.008, 0.6, 0.025), 'g', glow, 0.08, 0.09, 0.172, 0, 0, 0.7); }
  if (bk === 'tank') { for (const s of [-1, 1]) { add('chest', G.cyl(0.065, 0.065, 0.42, 12), 'm', 0xc8c8c8, s * 0.075, 0.15, 0.2); add('chest', G.sph(0.065, 12, 6), 'm', 0xc8c8c8, s * 0.075, 0.36, 0.2); } if (glow) add('chest', G.box(0.2, 0.02, 0.02), 'g', glow, 0, 0.12, 0.27); }
  if (bk === 'wings') { for (const s of [-1, 1]) { add('chest', G.box(0.42, 0.04, 0.02), 'c', top2, s * 0.24, 0.32, 0.2, 0, s * -0.3, s * 0.5); add('chest', G.box(0.36, 0.03, 0.02), 'c', top2, s * 0.22, 0.2, 0.2, 0, s * -0.3, s * 0.25); add('chest', G.box(0.42, 0.01, 0.025), 'g', glow || 0x40c8ff, s * 0.24, 0.345, 0.2, 0, s * -0.3, s * 0.5); } add('chest', G.box(0.1, 0.16, 0.06), 'm', 0x2a2a2a, 0, 0.25, 0.17); }
  if (bk === 'cape') { add('chest', G.box(0.44 * bulk, 0.95, 0.025), 'c', o.capeC || top2, 0, -0.06, 0.17, 0.12, 0, 0); add('chest', G.box(0.46 * bulk, 0.04, 0.05), 'm', glow || 0xd4af37, 0, 0.4, 0.14); }
  if (bk === 'shield') { add('chest', G.cyl(0.24, 0.24, 0.04, 20), 'm', top2, 0, 0.17, 0.2, Math.PI / 2, 0, 0); add('chest', G.cyl(0.08, 0.08, 0.05, 16), 'g', glow || 0xffd040, 0, 0.17, 0.225, Math.PI / 2, 0, 0); }
  /* head */
  const hs = 1.08; // stylised: slightly bigger heads
  add('head', G.sph(0.118 * hs, 18, 14), 's', skin, 0, 0, 0, 0, 0, 0, 0.9, 1.06, 1);
  add('head', G.box(0.13 * hs, 0.06, 0.1), 's', skin, 0, -0.07, -0.025); // jaw
  add('head', G.box(0.026, 0.045, 0.035), 's', skin, 0, -0.012, -0.118); // nose
  for (const s of [-1, 1]) add('head', G.box(0.02, 0.045, 0.03), 's', skin, s * 0.108, 0, 0.005);
  const eyeC = o.eyes; const eyesVis = !(o.mask === 'skull' || o.mask === 'gas' || o.mask === 'visor' || o.hat === 'helmetVisor');
  if (eyesVis) for (const s of [-1, 1]) { if (eyeC) add('head', G.box(0.032, 0.012, 0.01), 'g', eyeC, s * 0.04, 0.022, -0.113); else { add('head', G.box(0.03, 0.02, 0.01), 'c', 0xf2f2ee, s * 0.04, 0.02, -0.11); add('head', G.box(0.014, 0.016, 0.01), 'c', 0x2a1a10, s * 0.04, 0.02, -0.115); } add('head', G.box(0.036, 0.008, 0.012), 'c', o.hc || 0x2a1a10, s * 0.04, 0.045, -0.112, 0, 0, s * -0.12); }
  if (!o.mask || o.mask === 'none' || o.mask === 'shades' || o.mask === 'goggles' || o.mask === 'visor') add('head', G.box(0.04, 0.006, 0.01), 'c', 0x6a3a30, 0, -0.06, -0.113);
  if (o.beard) { add('head', G.box(0.14, 0.07, 0.11), 'c', o.beard, 0, -0.085, -0.03); add('head', G.box(0.05, 0.012, 0.01), 'c', o.beard, 0, -0.045, -0.117); }
  // hair
  const hc = o.hc || 0x2a1a10, hairOn = o.h && o.h !== 'none' && o.hat !== 'helmet' && o.hat !== 'helmetVisor' && o.hat !== 'hood';
  if (hairOn) {
    const cap = () => add('head', G.cap(0.132, 16, 8, 0.52), 'c', hc, 0, 0.012, 0.008, -0.15, 0, 0, 0.93, 0.95, 1.02);
    if (o.h === 'short' || o.h === 'buzz') { cap(); if (o.h === 'short') add('head', G.box(0.18, 0.04, 0.06), 'c', hc, 0, 0.09, -0.07, -0.4); }
    if (o.h === 'mohawk') { add('head', G.cap(0.13, 16, 8, 0.5), 'c', 0x2a1a10, 0, 0.012, 0.008, -0.15, 0, 0, 0.92, 0.9, 1.01); for (let i = 0; i < 6; i++) add('head', G.box(0.03, 0.09, 0.05), glow ? 'g' : 'c', hc, 0, 0.13 - Math.abs(i - 2.5) * 0.008, -0.08 + i * 0.035, -0.3 + i * 0.12); }
    if (o.h === 'spiky') { cap(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; add('head', G.cone(0.035, 0.11, 6), glow ? 'g' : 'c', hc, Math.cos(a) * 0.06, 0.12, Math.sin(a) * 0.06 + 0.01, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); } add('head', G.cone(0.04, 0.13, 6), glow ? 'g' : 'c', hc, 0, 0.16, 0); }
    if (o.h === 'long') { cap(); add('head', G.box(0.22, 0.24, 0.07), 'c', hc, 0, -0.06, 0.08); for (const s of [-1, 1]) add('head', G.box(0.04, 0.2, 0.1), 'c', hc, s * 0.11, -0.04, 0.0); }
    if (o.h === 'ponytail') { cap(); add('head', G.sph(0.05, 10, 8), 'c', hc, 0, 0.06, 0.12); add('head', G.cyl(0.035, 0.015, 0.24, 8), 'c', hc, 0, -0.06, 0.17, 0.3, 0, 0); }
    if (o.h === 'bun') { cap(); add('head', G.sph(0.055, 12, 8), 'c', hc, 0, 0.12, 0.08); }
  }
  // hats
  const hatC = o.hatC || 0x2a2a2a;
  if (o.hat === 'helmet') { add('head', G.cap(0.16, 18, 9, 0.55), 'c', hatC, 0, 0.025, 0.005, 0, 0, 0, 0.98, 0.95, 1.06); add('head', G.box(0.06, 0.05, 0.03), 'c', 0x1a1a1a, 0, 0.09, -0.15); for (const s of [-1, 1]) add('head', G.box(0.02, 0.05, 0.11), 'c', 0x1a1a1a, s * 0.148, 0.03, 0); }
  if (o.hat === 'helmetVisor') { add('head', G.sph(0.165, 18, 14), 'm', hatC, 0, 0.01, 0.005, 0, 0, 0, 0.98, 1.0, 1.04); add('head', G.box(0.24, 0.07, 0.06), 'g', o.visorC || glow || 0x40c8ff, 0, 0.02, -0.145, 0, 0, 0, 1, 1, 1); add('head', G.box(0.26, 0.02, 0.05), 'm', 0x1a1a1a, 0, 0.065, -0.14); add('head', G.box(0.03, 0.08, 0.16), 'm', hatC, 0, 0.17, 0.0); }
  if (o.hat === 'cap' || o.hat === 'capBack') { add('head', G.cap(0.128, 16, 8, 0.5), 'c', hatC, 0, 0.03, 0, 0, 0, 0, 0.98, 0.85, 1.02); add('head', G.box(0.2, 0.012, 0.1), 'c', hatC, 0, 0.04, o.hat === 'cap' ? -0.14 : 0.14); add('head', G.sph(0.012, 6, 4), 'c', hatC, 0, 0.14, 0); }
  if (o.hat === 'aviator') { add('head', G.cap(0.135, 16, 8, 0.6), 'c', hatC, 0, 0.02, 0.005, 0, 0, 0, 0.98, 0.95, 1.04); for (const s of [-1, 1]) add('head', G.box(0.03, 0.12, 0.08), 'c', hatC, s * 0.12, -0.04, 0.01); add('head', G.box(0.22, 0.045, 0.05), 'm', 0x3a3a3a, 0, 0.1, -0.1, -0.5); }
  if (o.hat === 'beanie') { add('head', G.cap(0.135, 16, 8, 0.55), 'c', hatC, 0, 0.03, 0.005, 0, 0, 0, 0.96, 1.0, 1.02); add('head', G.cyl(0.135, 0.135, 0.04, 16), 'c', hatC, 0, 0.05, 0.005, 0, 0, 0, 0.96, 1, 1.02); }
  if (o.hat === 'cowboy') { add('head', G.cyl(0.27, 0.27, 0.012, 22), 'c', hatC, 0, 0.07, 0); add('head', G.cyl(0.1, 0.12, 0.13, 14), 'c', hatC, 0, 0.13, 0); add('head', G.cyl(0.122, 0.122, 0.025, 14), 'c', 0x1a1a1a, 0, 0.09, 0); }
  if (o.hat === 'hood') { add('head', G.sph(0.17, 16, 12), cloth, hatC, 0, 0.02, 0.03, 0, 0, 0, 0.98, 1.05, 1.06); add('head', G.box(0.2, 0.28, 0.02), 'c', 0x0e0e0e, 0, -0.01, -0.13); }
  if (o.hat === 'crown') { add('head', G.cyl(0.115, 0.11, 0.06, 16), 'm', hatC, 0, 0.13, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; add('head', G.cone(0.025, 0.07, 4), 'm', hatC, Math.cos(a) * 0.105, 0.19, Math.sin(a) * 0.105); add('head', G.sph(0.012, 6, 4), 'g', glow || 0xff2a2a, Math.cos(a) * 0.112, 0.135, Math.sin(a) * 0.112); } }
  if (o.hat === 'bandana') { add('head', G.cap(0.128, 16, 8, 0.48), 'c', hatC, 0, 0.03, 0, 0, 0, 0, 0.98, 0.9, 1.02); add('head', G.box(0.05, 0.1, 0.02), 'c', hatC, 0.03, -0.0, 0.13, 0.3, 0, 0.3); }
  if (o.hat === 'horns') for (const s of [-1, 1]) { add('head', G.cone(0.03, 0.16, 8), 'c', hatC, s * 0.1, 0.13, -0.02, 0, 0, s * -0.6); if (glow) add('head', G.cone(0.012, 0.05, 6), 'g', glow, s * 0.165, 0.2, -0.02, 0, 0, s * -0.6); }
  if (o.headphones) { add('head', G.tor(0.13, 0.012, Math.PI, 14), 'c', 0x1a1a1a, 0, 0.0, 0, 0, Math.PI / 2, 0); for (const s of [-1, 1]) add('head', G.cyl(0.045, 0.045, 0.04, 14), 'c', glow || 0x2a2a2a, s * 0.125, -0.01, 0, 0, 0, Math.PI / 2); }
  // masks
  const mc = o.maskC || 0x1a1a1a;
  if (o.mask === 'skull') { add('head', G.box(0.17, 0.2, 0.04), 'c', o.maskC || 0xe8e4dc, 0, -0.01, -0.11); for (const s of [-1, 1]) add('head', G.box(0.045, 0.035, 0.012), glow ? 'g' : 'c', glow || 0x0a0a0a, s * 0.04, 0.02, -0.132); add('head', G.box(0.09, 0.012, 0.012), 'c', 0x0a0a0a, 0, -0.07, -0.132); for (let i = -2; i <= 2; i++) add('head', G.box(0.006, 0.03, 0.013), 'c', 0x0a0a0a, i * 0.018, -0.07, -0.133); }
  if (o.mask === 'gas') { add('head', G.box(0.17, 0.14, 0.06), 'c', mc, 0, -0.03, -0.1); for (const s of [-1, 1]) { add('head', G.cyl(0.032, 0.032, 0.02, 14), 'g', glow || 0x9ad8ff, s * 0.045, 0.02, -0.132, Math.PI / 2, 0, 0); add('head', G.cyl(0.035, 0.04, 0.07, 12), 'c', 0x2a2a2a, s * 0.065, -0.08, -0.12, 1.2, 0, s * 0.6); } }
  if (o.mask === 'balaclava') { add('head', G.sph(0.124 * hs, 16, 12), 'c', mc, 0, 0, 0.002, 0, 0, 0, 0.92, 1.08, 1.02); add('head', G.box(0.13, 0.04, 0.02), 's', skin, 0, 0.02, -0.11); for (const s of [-1, 1]) { if (eyeC) add('head', G.box(0.032, 0.014, 0.01), 'g', eyeC, s * 0.04, 0.022, -0.122); else add('head', G.box(0.016, 0.016, 0.01), 'c', 0x1a120c, s * 0.04, 0.02, -0.122); } }
  if (o.mask === 'bandanaFace') { add('head', G.box(0.2, 0.1, 0.13), 'c', mc, 0, -0.06, -0.06); add('head', G.cone(0.06, 0.08, 4), 'c', mc, 0, -0.12, -0.11, Math.PI, 0, 0); }
  if (o.mask === 'visor') add('head', G.box(0.2, 0.045, 0.04), 'g', mc, 0, 0.022, -0.115, 0, 0, 0, 1, 1, 1);
  if (o.mask === 'shades') { for (const s of [-1, 1]) add('head', G.box(0.05, 0.03, 0.012), 'm', 0x0a0a0a, s * 0.042, 0.022, -0.12); add('head', G.box(0.2, 0.01, 0.01), 'm', 0x0a0a0a, 0, 0.032, -0.118); }
  if (o.mask === 'goggles' || o.goggles) { const on = o.hat === 'helmet' || o.hat === 'aviator' || o.hat === 'bandana' ? 0.11 : 0.022; for (const s of [-1, 1]) add('head', G.cyl(0.03, 0.03, 0.03, 12), 'm', 0x2a3a3a, s * 0.045, on, -0.115, Math.PI / 2 - (on > 0.05 ? 0.4 : 0), 0, 0); add('head', G.box(0.24, 0.018, 0.12), 'c', 0x1a1a1a, 0, on, -0.04); }
  /* arms */
  const sleeveSkin = tank; const armC = sleeveSkin ? skin : top; const armM = sleeveSkin ? 's' : cloth;
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? -1 : 1, sh = side + 'sh', el = side + 'el';
    add(sh, G.sph(0.072 * bulk, 12, 8), sleeveSkin ? 's' : cloth, sleeveSkin ? skin : top, 0, 0, 0);
    add(sh, G.cyl(0.064 * bulk, 0.056 * bulk, 0.3, 12), armM, armC, 0, -0.15, 0);
    if (o.sh === 'pads') add(sh, G.box(0.1, 0.09, 0.12), 'c', top2, s * 0.03, 0.01, 0, 0, 0, s * -0.3);
    if (o.sh === 'armor') { add(sh, G.cap(0.105 * bulk, 14, 6, 0.5), 'm', top, s * 0.03, 0.02, 0, 0, 0, s * -0.45, 1.25, 0.6, 1.15); add(sh, G.cap(0.085 * bulk, 14, 6, 0.5), 'm', top2, s * 0.045, -0.035, 0, 0, 0, s * -0.6, 1.2, 0.5, 1.1); if (glow) add(sh, G.tor(0.09 * bulk, 0.006, Math.PI * 2, 16), 'g', glow, s * 0.03, -0.04, 0, Math.PI / 2, s * 0.4, 0); }
    if (o.t === 'tactical' || o.t === 'jacket' || o.t === 'puffer') add(sh, G.box(0.06, 0.06, 0.012), 'c', top2, s * 0.06, -0.08, 0, 0, s * Math.PI / 2, 0);
    add(el, G.cyl(0.056 * bulk, 0.046 * bulk, 0.27, 12), armM, armC, 0, -0.13, 0);
    if (!sleeveSkin && o.t !== 'armor') add(el, G.cyl(0.05 * bulk, 0.05 * bulk, 0.04, 12), 'c', top2, 0, -0.24, 0);
    if (o.t === 'armor') add(el, G.cyl(0.058 * bulk, 0.05 * bulk, 0.16, 12), 'm', top2, 0, -0.17, 0);
    if (glow && (o.t === 'armor' || o.t === 'hoodie' || o.t === 'ninja')) add(el, G.tor(0.05 * bulk, 0.005, Math.PI * 2, 14), 'g', glow, 0, -0.22, 0, Math.PI / 2, 0, 0);
    add(el, G.box(0.078, 0.1, 0.05), 'c', o.glove, 0, -0.31, 0);
    add(el, G.box(0.072, 0.045, 0.045), 'c', o.glove, 0, -0.375, -0.01, 0.4, 0, 0);
    add(el, G.box(0.02, 0.05, 0.03), 'c', o.glove, s * -0.04, -0.3, -0.025, 0, 0, s * 0.4);
  }
  /* legs */
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? -1 : 1, th = side + 'th', kn = side + 'kn'; const lw = (o.legs === 'slim' ? 0.082 : 0.092) * bulk;
    add(th, G.cyl(lw, lw * 0.8, 0.46, 12), cloth, o.pants, 0, -0.23, 0);
    if (o.legs === 'cargo') { add(th, G.box(0.05, 0.1, 0.12), cloth, o.pants, s * 0.085, -0.25, 0); add(th, G.box(0.12, 0.1, 0.06), 'c', 0x1a1a1a, 0, -0.46, -0.07); }
    if (o.legs === 'armor') { add(th, G.box(0.14, 0.2, 0.06), 'm', o.top2 || o.top, 0, -0.2, -0.07); add(th, G.sph(0.06, 10, 6), 'm', o.top2 || o.top, 0, -0.46, -0.06); if (glow) add(th, G.box(0.1, 0.01, 0.01), 'g', glow, 0, -0.12, -0.1); }
    if (side === 'R' && (o.t === 'tactical' || o.id === 'outlaw')) { add(th, G.box(0.05, 0.16, 0.08), 'c', 0x1a1a1a, s * 0.1, -0.16, 0); add(th, G.box(0.03, 0.08, 0.05), 'c', 0x2a2a2a, s * 0.1, -0.05, 0); }
    add(kn, G.cyl(lw * 0.78, lw * 0.6, 0.44, 12), cloth, o.pants, 0, -0.22, 0);
    if (o.legs === 'armor') add(kn, G.box(0.11, 0.22, 0.05), 'm', o.top2 || o.top, 0, -0.2, -0.055);
    const bootH = o.legs === 'slim' ? 0.1 : 0.16;
    add(kn, G.cyl(lw * 0.68, lw * 0.7, bootH, 12), 'c', o.boots, 0, -0.44 + bootH / 2, 0);
    add(kn, G.box(0.11, 0.1, 0.27), 'c', o.boots, 0, -0.46, -0.05); add(kn, G.box(0.115, 0.03, 0.28), 'c', o.id === 'blaze' || o.id === 'neon' ? 0xf2f2f2 : 0x141414, 0, -0.505, -0.05);
    if (glow && (o.legs === 'armor' || o.t === 'hoodie')) add(kn, G.box(0.116, 0.01, 0.285), 'g', glow, 0, -0.485, -0.05);
  }
  const out = {}; for (const k in P) out[k] = mergeParts(P[k]); return out;
}
const CACHE = {};
function operatorGeo(id) { return CACHE[id] || (CACHE[id] = build(O[id] || O.default)); }

/* ---------------- rig (same bones as Mods.soldier, so animSoldier and all unit code just work) ---------------- */
Mods.operator = function (id, opt = {}) {
  const o = O[id] || O.default; const GEO = operatorGeo(o.id);
  const root = new T.Group(); root.rotation.order = 'YXZ'; const body = new T.Group(); root.add(body);
  if (SP.blobMat) { const blob = new T.Mesh(SP.GC.blobPlane || (SP.GC.blobPlane = new T.PlaneGeometry(1.1, 1.1)), SP.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = 1; root.add(blob); }
  const att = (bone, key) => { const m = GEO[key]; if (!m) return; for (const mk in m) { const mesh = new T.Mesh(m[mk], matFor(mk)); mesh.castShadow = mk !== 'g'; mesh.receiveShadow = mk !== 'g'; bone.add(mesh); } };
  const h = o.height || 1; body.scale.setScalar(h);
  const hips = new T.Group(); hips.position.y = 0.98; body.add(hips); att(hips, 'hips');
  const spine = new T.Group(); spine.position.y = 0.08; hips.add(spine);
  const chest = new T.Group(); chest.position.y = 0.2; spine.add(chest); att(chest, 'chest');
  const head = new T.Group(); head.position.y = 0.55; chest.add(head); att(head, 'head');
  const bulk = o.bulk || 1;
  const mkArm = s => { const sh = new T.Group(); sh.position.set(s * 0.235 * bulk, 0.34, 0); chest.add(sh); const side = s < 0 ? 'L' : 'R'; att(sh, side + 'sh'); const el = new T.Group(); el.position.y = -0.3; sh.add(el); att(el, side + 'el'); return { sh, el, hand: el }; };
  const mkLeg = s => { const th = new T.Group(); th.position.set(s * 0.1 * bulk, -0.06, 0); hips.add(th); const side = s < 0 ? 'L' : 'R'; att(th, side + 'th'); const kn = new T.Group(); kn.position.y = -0.46; th.add(kn); att(kn, side + 'kn'); return { th, kn, ft: kn }; };
  const L = mkArm(-1), R = mkArm(1), LL = mkLeg(-1), RL = mkLeg(1);
  let gun = null; if (opt.weapon !== 'none') { gun = SP.tpGun ? SP.tpGun(opt.gid || opt.weapon) : Mods.m4(true); chest.add(gun); }
  const rnd = SP.rng(opt.seed || 1);
  const S = { root, body, hips, spine, chest, head, L, R, LL, RL, gun, ph: rnd() * 6, breathe: rnd() * 6, dead: 0, deadDir: 1, flinch: 0, aimBlend: 0, crouchBlend: 0, lean: 0, operator: o.id };
  root.userData.rig = S; root.traverse(m => { if (m.isMesh) m.userData.rig = S; });
  return S;
};
// soldier() keeps working for story units; BR / locker pass `operator` to get a hero character
const soldier0 = Mods.soldier;
Mods.soldier = function (o = {}) { if (o.operator) return Mods.operator(o.operator, { weapon: o.weapon, gid: o.gid, seed: o.seed }); return soldier0(o); };

/* ---------------- first-person arms use the equipped operator ---------------- */
SP.myOperator = () => { const PS = SP.Pass && SP.Pass.PS; const k = PS && PS.skin; return O[k] ? k : 'default'; };
const vmMats = {};
SP.vmSleeveMat = () => {
  const o = O[SP.myOperator()]; const k = 'sl' + o.id; if (vmMats[k]) return vmMats[k];
  const tank = o.t === 'tank'; const m = new T.MeshStandardMaterial({ color: col(tank ? o.skin : (o.t === 'armor' ? o.top2 : o.top)), roughness: o.t === 'armor' ? 0.35 : 0.85, metalness: o.t === 'armor' ? 0.65 : 0 });
  if (o.pat && !tank) { m.map = matFor('p:' + o.pat).map; }
  const SK = SP.Pass && SP.Pass.SKINS && SP.Pass.SKINS[o.id]; if (SK && SK.wrap && SP.wrapMat) { const w = SP.wrapMat({ key: SK.wrap }); m.map = w.map; m.color.set(0xffffff); if (w.emissiveMap) { m.emissive = new T.Color(1, 1, 1); m.emissiveMap = w.map; m.emissiveIntensity = 0.35; } }
  return vmMats[k] = m;
};
SP.vmGloveMat = () => { const o = O[SP.myOperator()]; const k = 'gl' + o.id; return vmMats[k] || (vmMats[k] = new T.MeshStandardMaterial({ color: col(o.glove), roughness: 0.7, metalness: 0.05 })); };
SP.vmGlowMat = () => { const o = O[SP.myOperator()]; return o.glow ? (vmMats['gw' + o.id] || (vmMats['gw' + o.id] = new T.MeshBasicMaterial({ color: col(o.glow).multiplyScalar(2.6), toneMapped: false }))) : null; };
SP.applySkin = function (m, part) { const src = part === 'glove' ? SP.vmGloveMat() : SP.vmSleeveMat(); m.color.copy(src.color); m.map = src.map || null; m.roughness = src.roughness; m.metalness = src.metalness; if (src.emissiveMap) { m.emissive = src.emissive.clone(); m.emissiveMap = src.emissiveMap; m.emissiveIntensity = src.emissiveIntensity; } m.needsUpdate = true; };

/* ---------------- pre-build every operator in idle time so the first time one appears never hitches ---------------- */
SP.warmOperators = function () { const ids = Object.keys(O); let i = 0; const step = () => { if (i >= ids.length) return; operatorGeo(ids[i++]); (window.requestIdleCallback || (f => setTimeout(f, 16)))(step); }; step(); };
setTimeout(() => SP.warmOperators(), 3000);
})();

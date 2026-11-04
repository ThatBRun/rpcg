/* Survival Protocol — core: math, noise, textures, materials, renderer + post, sky, audio, input */
'use strict';
const SP = window.SP = {};
const T = THREE;
SP.V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
SP.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
SP.lerp = (a, b, t) => a + (b - a) * t;
SP.rand = (a, b) => a + Math.random() * (b - a);
SP.randi = (a, b) => Math.floor(SP.rand(a, b + 1));
SP.pick = arr => arr[Math.floor(Math.random() * arr.length)];
SP.damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
SP.smooth = (e0, e1, x) => { const t = SP.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
SP.angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const { clamp, lerp, rand } = SP;

/* ---------------- seeded random + noise ---------------- */
SP.rng = function (seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; };
const PERM = new Uint8Array(512); (function () { const r = SP.rng(1337); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
function hash2(i, j) { return PERM[(PERM[i & 255] + j) & 511] / 255; }
SP.hash2 = hash2;
// periodic value noise (period p cells) so textures tile
function vnoiseP(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
  const a = hash2(x0, y0), b = hash2(x1, y0), c = hash2(x0, y1), d = hash2(x1, y1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}
function fbmP(x, y, p, oct = 5, gain = 0.5) { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * vnoiseP(x * f, y * f, p * f); n += a; a *= gain; f *= 2; } return s / n; }
SP.vnoise = (x, y) => vnoiseP(x, y, 256);
SP.fbm = (x, y, oct = 4) => fbmP(x, y, 256, oct);
function ridged(x, y, p, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * (1 - Math.abs(vnoiseP(x * f, y * f, p * f) * 2 - 1)); n += a; a *= 0.5; f *= 2; } return s / n; }
// cellular-ish (for bricks / pebbles)
function worley(x, y, p) { const xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const cx = xi + i, cy = yi + j; const wx = ((cx % p) + p) % p, wy = ((cy % p) + p) % p; const px = cx + hash2(wx, wy), py = cy + hash2(wy + 17, wx + 31); const d = Math.hypot(px - x, py - y); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return [d1, d2]; }

/* ---------------- procedural PBR textures ---------------- */
SP.texCache = {};
SP.maxAniso = 4;
function canvasTex(c, srgb) { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = SP.maxAniso; if (srgb) t.encoding = T.sRGBEncoding; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; return t; }
// fn(u,v) -> [r,g,b (0-255), height 0-1, rough 0-1]
SP.makeTex = function (name, size, fn, normalStrength = 2) {
  if (SP.texCache[name]) return SP.texCache[name];
  const cA = document.createElement('canvas'), cN = document.createElement('canvas'), cR = document.createElement('canvas');
  cA.width = cA.height = cN.width = cN.height = cR.width = cR.height = size;
  const xA = cA.getContext('2d'), xN = cN.getContext('2d'), xR = cR.getContext('2d');
  const iA = xA.createImageData(size, size), iN = xN.createImageData(size, size), iR = xR.createImageData(size, size);
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = fn(x / size, y / size, x, y); const k = (y * size + x) * 4;
    iA.data[k] = clamp(r[0], 0, 255); iA.data[k + 1] = clamp(r[1], 0, 255); iA.data[k + 2] = clamp(r[2], 0, 255); iA.data[k + 3] = 255;
    H[y * size + x] = r[3]; const ro = clamp(r[4] * 255, 0, 255);
    iR.data[k] = ro; iR.data[k + 1] = ro; iR.data[k + 2] = ro; iR.data[k + 3] = 255;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xl = (x - 1 + size) % size, xr = (x + 1) % size, yu = (y - 1 + size) % size, yd = (y + 1) % size;
    const dx = (H[y * size + xr] - H[y * size + xl]) * normalStrength * size / 256;
    const dy = (H[yd * size + x] - H[yu * size + x]) * normalStrength * size / 256;
    const l = Math.hypot(dx, dy, 1); const k = (y * size + x) * 4;
    iN.data[k] = (-dx / l * 0.5 + 0.5) * 255; iN.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; iN.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; iN.data[k + 3] = 255;
  }
  xA.putImageData(iA, 0, 0); xN.putImageData(iN, 0, 0); xR.putImageData(iR, 0, 0);
  const out = { map: canvasTex(cA, true), normalMap: canvasTex(cN, false), roughnessMap: canvasTex(cR, false) };
  SP.texCache[name] = out; return out;
};
const C = (h) => { const c = new T.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

SP.TEX = {
  sand: () => SP.makeTex('sand', 512, (u, v) => {
    const warp = fbmP(u * 4, v * 4, 4, 3) * 2.2;
    const rip = Math.sin((u * 7 + v * 3 + warp) * Math.PI * 2 * 4) * 0.5 + 0.5;
    const grain = vnoiseP(u * 256, v * 256, 256);
    const big = fbmP(u * 3, v * 3, 3, 4);
    const pebble = worley(u * 40, v * 40, 40)[0];
    let c = mix3(C('#c8955c'), C('#e2b57e'), big * 0.9 + rip * 0.05);
    c = mul3(c, 0.88 + grain * 0.2);
    let h = rip * 0.22 + grain * 0.3 + big * 0.3;
    if (pebble < 0.12 && big < 0.45) { c = mix3(c, C('#7b5a3e'), 0.6); h += 0.3; }
    return [...c, h, 0.86 + grain * 0.1];
  }, 3),
  plaster: () => SP.makeTex('plaster', 512, (u, v, x, y) => {
    const n = fbmP(u * 6, v * 6, 6, 5); const fine = vnoiseP(u * 128, v * 128, 128);
    const crack = ridged(u * 5, v * 5, 5, 4);
    const fall = fbmP(u * 3 + 9, v * 3 + 2, 3, 4);
    let c = mix3(C('#c49a6c'), C('#d9b88e'), n); c = mul3(c, 0.9 + fine * 0.15);
    let h = n * 0.4 + fine * 0.25;
    if (crack > 0.93) { c = mul3(c, 0.55); h -= 0.35; }
    if (fall > 0.76) { // exposed mud bricks
      const bw = 1 / 8, bh = 1 / 16; const row = Math.floor(v / bh); const ox = (row % 2) * bw * 0.5;
      const bx = ((u + ox) % bw) / bw, by = (v % bh) / bh; const mortar = bx < 0.06 || by < 0.1;
      c = mortar ? C('#a07c5a') : mix3(C('#ad8058'), C('#bf9468'), hash2(Math.floor((u + ox) / bw), row));
      c = mul3(c, 0.85 + fine * 0.2); h = mortar ? 0.1 : 0.6 + fine * 0.2;
    }
    const stain = SP.smooth(0.7, 1, 1 - v) * fbmP(u * 10, v * 2, 10, 3); c = mul3(c, 1 - stain * 0.25);
    return [...c, h, 0.92];
  }, 3),
  concrete: () => SP.makeTex('concrete', 512, (u, v) => {
    const n = fbmP(u * 5, v * 5, 5, 5), f = vnoiseP(u * 200, v * 200, 200), pit = vnoiseP(u * 90, v * 90, 90);
    let c = mix3(C('#8f8c86'), C('#b3afa6'), n); c = mul3(c, 0.9 + f * 0.15);
    let h = n * 0.3 + f * 0.2; if (pit > 0.86) { c = mul3(c, 0.7); h -= 0.4; }
    const streak = fbmP(u * 30, v * 1.5, 30, 3); c = mul3(c, 1 - SP.smooth(0.55, 0.9, streak) * 0.25);
    return [...c, h, 0.85];
  }, 2),
  metal: () => SP.makeTex('metal', 512, (u, v) => {
    const n = fbmP(u * 6, v * 6, 6, 5), f = vnoiseP(u * 220, v * 220, 220);
    const scratch = vnoiseP(u * 256, v * 6, 256) > 0.9 && vnoiseP(u * 12, v * 12, 12) > 0.55 ? 1 : 0;
    const rust = SP.smooth(0.62, 0.78, fbmP(u * 4 + 3, v * 4 + 7, 4, 5));
    let c = [200, 200, 200]; c = mul3(c, 0.85 + n * 0.2 + f * 0.05);
    c = mix3(c, [120, 70, 40], rust); if (scratch) c = mul3(c, 1.12);
    return [...c, n * 0.08 + rust * 0.15, 0.45 + rust * 0.45 + n * 0.1];
  }, 1.5),
  corrugated: () => SP.makeTex('corr2', 256, (u, v) => {
    const s = Math.sin(u * Math.PI * 2 * 12) * 0.5 + 0.5; const rust = SP.smooth(0.55, 0.85, fbmP(u * 4, v * 4, 4, 5));
    const n = vnoiseP(u * 100, v * 100, 100); let c = mix3([170, 172, 168], [130, 74, 42], rust); c = mul3(c, 0.8 + s * 0.25 + n * 0.1);
    return [...c, s, 0.5 + rust * 0.4];
  }, 1.5),
  wood: () => SP.makeTex('wood', 512, (u, v) => {
    const plank = Math.floor(v * 6); const pv = (v * 6) % 1; const seam = pv < 0.04 || pv > 0.96;
    const g = Math.sin((u * 40 + fbmP(u * 2, v * 6 + plank * 3, 2, 3) * 8 + plank * 7) * 1.0) * 0.5 + 0.5;
    const f = vnoiseP(u * 300, v * 60, 300); const tone = hash2(plank, 7);
    let c = mix3(C('#8a6a43'), C('#b08a5a'), g * 0.6 + tone * 0.4); c = mul3(c, 0.85 + f * 0.2);
    if (seam) c = mul3(c, 0.4);
    return [...c, seam ? 0 : 0.5 + g * 0.2 + f * 0.1, 0.8];
  }, 2.5),
  camo: () => SP.makeTex('camo', 256, (u, v) => { // multicam-like
    const a = fbmP(u * 6, v * 6, 6, 4), b = fbmP(u * 9 + 5, v * 9 + 3, 9, 4), c2 = fbmP(u * 14 + 9, v * 14, 14, 3);
    let c = C('#a28f6d');
    if (a > 0.58) c = C('#6f6447'); if (b > 0.62) c = C('#556042'); if (c2 > 0.66) c = C('#d2c39f'); if (a < 0.32) c = C('#7d6a4c');
    const weave = (Math.sin(u * 900) * Math.sin(v * 900)) * 0.5 + 0.5; c = mul3(c, 0.9 + weave * 0.12);
    return [...c, weave * 0.3, 0.9];
  }, 1.5),
  fabric: () => SP.makeTex('fabric', 256, (u, v) => { // greyscale weave; colored by material.color
    const weave = (Math.sin(u * 700) * Math.sin(v * 700)) * 0.5 + 0.5; const n = fbmP(u * 8, v * 8, 8, 4); const w = vnoiseP(u * 64, v * 4, 64);
    const k = 200 * (0.82 + n * 0.25 + weave * 0.08 - SP.smooth(0.6, 0.9, w) * 0.1); return [k, k, k, weave * 0.4 + n * 0.3, 0.95];
  }, 1.5),
  molle: () => SP.makeTex('molle', 256, (u, v) => {
    const row = (v * 10) % 1; const strap = row > 0.15 && row < 0.55; const sew = strap && ((u * 16) % 1) < 0.06;
    const weave = (Math.sin(u * 800) * Math.sin(v * 800)) * 0.5 + 0.5; const n = fbmP(u * 6, v * 6, 6, 3);
    let k = 190 * (0.85 + n * 0.2 + weave * 0.06); if (sew) k *= 0.7;
    return [k, k, k, (strap ? 0.6 : 0.2) + weave * 0.1 - (sew ? 0.3 : 0), 0.95];
  }, 3),
  shemagh: () => SP.makeTex('shemagh', 256, (u, v) => {
    const gx = Math.floor(u * 24), gy = Math.floor(v * 24); const check = (gx + gy) % 2 === 0; const line = ((u * 24) % 1 < 0.2) || ((v * 24) % 1 < 0.2);
    let c = line ? C('#a0262a') : (check ? C('#e8e2d6') : C('#c9b8a6')); const weave = (Math.sin(u * 900) * Math.sin(v * 900)) * 0.5 + 0.5;
    c = mul3(c, 0.85 + weave * 0.12 + fbmP(u * 6, v * 6, 6, 3) * 0.1); return [...c, weave * 0.3, 0.95];
  }, 1.5),
  skin: () => SP.makeTex('skin', 128, (u, v) => { const n = fbmP(u * 8, v * 8, 8, 4), f = vnoiseP(u * 64, v * 64, 64); const k = 0.9 + n * 0.12 + f * 0.05; return [255 * k, 255 * k, 255 * k, n * 0.2 + f * 0.1, 0.6]; }, 1),
  dirt: () => SP.makeTex('dirt', 512, (u, v) => {
    const n = fbmP(u * 5, v * 5, 5, 5), f = vnoiseP(u * 160, v * 160, 160); const [d1] = worley(u * 30, v * 30, 30);
    let c = mix3(C('#7e6248'), C('#a4825c'), n); c = mul3(c, 0.85 + f * 0.2); let h = n * 0.3 + f * 0.25;
    if (d1 < 0.18) { c = mix3(c, C('#8d8478'), 0.5); h += 0.35 * (1 - d1 / 0.18); }
    const tread = Math.abs(((u * 3 + fbmP(u, v * 2, 1, 2) * 0.2) % 1) - 0.5) < 0.04; if (tread) { c = mul3(c, 0.85); h -= 0.2; }
    return [...c, h, 0.92];
  }, 2.5),
  floor: () => SP.makeTex('floor', 512, (u, v) => {
    const n = fbmP(u * 4, v * 4, 4, 5), f = vnoiseP(u * 200, v * 200, 200); const seam = ((u * 4) % 1) < 0.006 || ((v * 4) % 1) < 0.006;
    const oil = SP.smooth(0.6, 0.85, fbmP(u * 3 + 4, v * 3 + 1, 3, 5));
    let c = mix3(C('#77736b'), C('#97928a'), n); c = mul3(c, 0.88 + f * 0.12); c = mix3(c, C('#3b3630'), oil * 0.7); if (seam) c = mul3(c, 0.6);
    return [...c, n * 0.2 + f * 0.15 - (seam ? 0.3 : 0), 0.7 - oil * 0.35];
  }, 2),
  tile: () => SP.makeTex('tile', 256, (u, v) => {
    const s = 6; const tu = (u * s) % 1, tv = (v * s) % 1; const g = tu < 0.04 || tv < 0.04; const tone = hash2(Math.floor(u * s), Math.floor(v * s) + 9);
    const n = fbmP(u * 6, v * 6, 6, 4); let c = g ? C('#5e574d') : mix3(C('#b9b2a2'), C('#d2c9b6'), tone * 0.6 + n * 0.4); c = mul3(c, 1 - SP.smooth(0.6, 0.9, n) * 0.3);
    return [...c, g ? 0 : 0.6, g ? 0.9 : 0.45];
  }, 2),
  rubber: () => SP.makeTex('rubber', 128, (u, v) => { const tread = Math.sin(u * Math.PI * 2 * 16) > 0.2 ? 1 : 0; const n = vnoiseP(u * 64, v * 64, 64); const k = 40 + n * 15; return [k, k, k, tread * 0.8, 0.85]; }, 4),
  hesco: () => SP.makeTex('hesco', 256, (u, v) => {
    const gx = (u * 8) % 1, gy = (v * 8) % 1; const wire = gx < 0.05 || gy < 0.05; const n = fbmP(u * 6, v * 6, 6, 4);
    let c = mix3(C('#a68d6a'), C('#c2aa83'), n); const bulge = Math.sin(gx * Math.PI) * Math.sin(gy * Math.PI);
    if (wire) c = [110, 110, 105]; return [...c, wire ? 0.9 : bulge * 0.6, wire ? 0.4 : 0.95];
  }, 3),
  canvas: () => SP.makeTex('canvas', 256, (u, v) => { const n = fbmP(u * 5, v * 5, 5, 5); const weave = (Math.sin(u * 600) * Math.sin(v * 600)) * 0.5 + 0.5; let c = mix3(C('#5f5d45'), C('#77745a'), n); c = mul3(c, 0.88 + weave * 0.1); return [...c, n * 0.4 + weave * 0.2, 0.95]; }, 2),
  rock: () => SP.makeTex('rock', 256, (u, v) => { const n = fbmP(u * 4, v * 4, 4, 6), r2 = ridged(u * 3, v * 3, 3, 5); let c = mix3(C('#6d5440'), C('#a07c5c'), n); c = mul3(c, 0.75 + r2 * 0.35); return [...c, n * 0.5 + r2 * 0.5, 0.9]; }, 3),
  water: () => SP.makeTex('water', 256, (u, v) => { const n = fbmP(u * 8, v * 8, 8, 4); return [40, 45, 35, n, 0.05]; }, 1.5),
  palm: () => SP.makeTex('palm', 128, (u, v) => { const ring = Math.sin(v * Math.PI * 2 * 24) * 0.5 + 0.5; const n = fbmP(u * 4, v * 8, 4, 3); let c = mix3(C('#5a4632'), C('#8a6d4e'), n); c = mul3(c, 0.8 + ring * 0.3); return [...c, ring, 0.95]; }, 4),
};

/* world-space UVs (planar per dominant normal axis) so textures keep real scale */
SP.worldUV = function (geo, scale = 1) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let a, b;
    if (ay >= ax && ay >= az) { a = p.getX(i); b = p.getZ(i); } else if (ax >= az) { a = p.getZ(i); b = p.getY(i); } else { a = p.getX(i); b = p.getY(i); }
    uv[i * 2] = a / scale; uv[i * 2 + 1] = b / scale;
  }
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); return geo;
};

/* materials */
SP.matCache = {};
SP.lin = hex => new T.Color(hex).convertSRGBToLinear();
SP.mat = function (key, opt = {}) {
  const ck = key + JSON.stringify(opt); if (SP.matCache[ck]) return SP.matCache[ck];
  const p = { color: SP.lin(opt.color != null ? opt.color : 0xffffff), roughness: opt.roughness != null ? opt.roughness : 1, metalness: opt.metalness || 0, envMapIntensity: opt.env != null ? opt.env : 1 };
  if (key && SP.TEX[key]) { const t = SP.TEX[key](); p.map = t.map; p.normalMap = t.normalMap; p.roughnessMap = t.roughnessMap; p.normalScale = new T.Vector2(opt.ns || 1, opt.ns || 1); }
  if (opt.emissive) { p.emissive = SP.lin(opt.emissive); p.emissiveIntensity = opt.ei || 1; }
  if (opt.transparent) { p.transparent = true; p.opacity = opt.opacity != null ? opt.opacity : 1; p.depthWrite = opt.depthWrite != null ? opt.depthWrite : false; }
  if (opt.side) p.side = opt.side;
  const m = new T.MeshStandardMaterial(p); SP.matCache[ck] = m; return m;
};
SP.flat = (color, rough = 0.8, metal = 0, extra = {}) => SP.mat(null, Object.assign({ color, roughness: rough, metalness: metal }, extra));

/* ---------------- renderer + post-processing ---------------- */
const FSQ_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
SP.Post = class {
  constructor(renderer) {
    this.r = renderer; this.scene = new T.Scene(); this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new T.Mesh(new T.PlaneGeometry(2, 2)); this.quad.frustumCulled = false; this.scene.add(this.quad);
    const gl2 = renderer.capabilities.isWebGL2;
    const opts = { type: T.HalfFloatType, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter };
    this.rtScene = gl2 && T.WebGLMultisampleRenderTarget ? new T.WebGLMultisampleRenderTarget(4, 4, opts) : new T.WebGLRenderTarget(4, 4, opts);
    if (this.rtScene.samples !== undefined) this.rtScene.samples = 4;
    this.rtA = new T.WebGLRenderTarget(4, 4, opts); this.rtB = new T.WebGLRenderTarget(4, 4, opts); this.rtC = new T.WebGLRenderTarget(4, 4, opts);
    this.bright = new T.ShaderMaterial({ uniforms: { t: { value: null }, th: { value: 1.0 } }, vertexShader: FSQ_VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D t; uniform float th; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb; float l=dot(c,vec3(.2126,.7152,.0722)); float k=max(l-th,0.)/max(l,1e-4); gl_FragColor=vec4(min(c*k,vec3(40.)),1.); }` });
    this.blur = new T.ShaderMaterial({ uniforms: { t: { value: null }, dir: { value: new T.Vector2() } }, vertexShader: FSQ_VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D t; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 s=texture2D(t,vUv).rgb*.227027;
        s+=texture2D(t,vUv+dir*1.3846).rgb*.316216; s+=texture2D(t,vUv-dir*1.3846).rgb*.316216; s+=texture2D(t,vUv+dir*3.2308).rgb*.070270; s+=texture2D(t,vUv-dir*3.2308).rgb*.070270; gl_FragColor=vec4(s,1.); }` });
    this.U = { tScene: { value: null }, tBloom: { value: null }, res: { value: new T.Vector2(1, 1) }, time: { value: 0 }, exposure: { value: 1 }, bloom: { value: 0.55 },
      grain: { value: 0.06 }, vignette: { value: 0.45 }, ca: { value: 0.0018 }, damage: { value: 0 }, blur: { value: 0 }, sat: { value: 1.05 }, contrast: { value: 1.08 },
      warm: { value: 1 }, letterbox: { value: 0 }, flash: { value: 0 }, night: { value: 0 }, fade: { value: 0 } };
    this.final = new T.ShaderMaterial({ uniforms: this.U, vertexShader: FSQ_VS, depthTest: false, depthWrite: false, fragmentShader: `
      uniform sampler2D tScene,tBloom; uniform vec2 res; uniform float time,exposure,bloom,grain,vignette,ca,damage,blur,sat,contrast,warm,letterbox,flash,night,fade; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
      vec3 samp(vec2 uv){ vec2 d=uv-.5; float r=dot(d,d); vec2 o=d*ca*(1.+r*4.);
        return vec3(texture2D(tScene,uv+o).r, texture2D(tScene,uv).g, texture2D(tScene,uv-o).b); }
      void main(){
        vec2 uv=vUv; vec3 c=samp(uv);
        if(blur>0.001){ vec3 acc=c; float n=1.; for(int i=0;i<12;i++){ float a=float(i)*2.39996; float rr=sqrt(float(i)+.5)/3.6; vec2 o=vec2(cos(a),sin(a))*rr*blur*14./res; acc+=samp(uv+o); n+=1.; } c=acc/n; }
        c+=texture2D(tBloom,uv).rgb*bloom;
        c*=exposure;
        c=aces(c);
        c=pow(c,vec3(1./2.2));
        float l=dot(c,vec3(.299,.587,.114));
        vec3 sh=vec3(.93,1.,1.06), hi=vec3(1.07,1.0,.9); c*=mix(vec3(1.),mix(sh,hi,smoothstep(.15,.8,l)),warm);
        c=mix(vec3(l),c,sat); c=(c-.5)*contrast+.5;
        if(night>0.){ c=mix(c, vec3(l)*vec3(.75,.88,1.15), night*.35); }
        vec2 d=uv-.5; float v=smoothstep(.85,.2,length(d*vec2(1.,.8))); c*=mix(1.,v,vignette);
        float dm=smoothstep(.25,.75,length(d))*damage; c=mix(c, vec3(l*.4+.35,.0,.0)+c*.3, dm*.85); c=mix(c,vec3(l),damage*.35);
        c+= (h(uv*res+fract(time*13.1)*91.)-.5)*grain*(1.15-l*.6);
        c+=flash;
        if(letterbox>0. && (uv.y<letterbox*.12 || uv.y>1.-letterbox*.12)) c=vec3(0.);
        c*=1.-fade;
        gl_FragColor=vec4(clamp(c,0.,1.),1.);
      }` });
    this.scale = 1;
  }
  setSize(w, h) {
    const s = this.scale; const W = Math.max(4, Math.floor(w * s)), H = Math.max(4, Math.floor(h * s));
    this.rtScene.setSize(W, H); this.rtA.setSize(W >> 1, H >> 1); this.rtB.setSize(W >> 2, H >> 2); this.rtC.setSize(W >> 2, H >> 2); this.U.res.value.set(W, H);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }
  render(scene, camera, dt, ovS, ovC) {
    const r = this.r; r.setRenderTarget(this.rtScene); r.render(scene, camera);
    if (ovS) { r.autoClear = false; r.clearDepth(); r.render(ovS, ovC); r.autoClear = true; }
    this.bright.uniforms.t.value = this.rtScene.texture; this.pass(this.bright, this.rtA);
    this.blur.uniforms.t.value = this.rtA.texture; this.blur.uniforms.dir.value.set(1 / this.rtB.width, 0); this.pass(this.blur, this.rtB);
    this.blur.uniforms.t.value = this.rtB.texture; this.blur.uniforms.dir.value.set(0, 1 / this.rtB.height); this.pass(this.blur, this.rtC);
    this.blur.uniforms.t.value = this.rtC.texture; this.blur.uniforms.dir.value.set(2 / this.rtB.width, 0); this.pass(this.blur, this.rtB);
    this.blur.uniforms.t.value = this.rtB.texture; this.blur.uniforms.dir.value.set(0, 2 / this.rtB.height); this.pass(this.blur, this.rtC);
    this.U.tScene.value = this.rtScene.texture; this.U.tBloom.value = this.rtC.texture; this.U.time.value += dt;
    this.pass(this.final, null);
  }
};

/* ---------------- sky ---------------- */
SP.SkyMat = function () {
  return new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: SP.V3(0, 1, 0) }, zenith: { value: new T.Color() }, horizon: { value: new T.Color() }, ground: { value: new T.Color() }, sunCol: { value: new T.Color() },
      sunSize: { value: 0.0006 }, envMode: { value: 0 }, cloud: { value: 0.45 }, cloudCol: { value: new T.Color() }, time: { value: 0 }, night: { value: 0 }, moonDir: { value: SP.V3(0, 1, 0) }, haze: { value: 1 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=vec4(p.xy,p.w*.99999,p.w); }`,
    fragmentShader: `
      uniform vec3 sunDir,zenith,horizon,ground,sunCol,cloudCol,moonDir; uniform float sunSize,cloud,time,night,haze,envMode; varying vec3 vDir;
      float hs(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec3 d=normalize(vDir); float y=d.y;
        vec3 col=mix(horizon,zenith,pow(clamp(y,0.,1.),.45));
        float sd=max(dot(d,sunDir),0.);
        col+=sunCol*(pow(sd,6.)*.35+pow(sd,48.)*.9)*haze;
        col+=sunCol*pow(sd,2.)*pow(1.-abs(y),6.)*.6*haze;
        if(y>0.){
          vec2 p=d.xz/(y+.12)*1.6+vec2(time*.004,time*.0015);
          float n=fbm(p*1.3); float n2=fbm(p*3.1+7.);
          float cov=smoothstep(1.-cloud,1.-cloud+.3,n*.8+n2*.3);
          vec3 cc=cloudCol*(.55+.9*pow(sd,3.))+sunCol*pow(sd,12.)*.8;
          cc*=mix(.65,1.1,smoothstep(.3,.8,n2));
          col=mix(col,cc,cov*smoothstep(0.,.18,y)*.92);
        }
        float disc=smoothstep(1.-sunSize,1.-sunSize*.5,dot(d,sunDir));
        col+=sunCol*disc*40.*(1.-night)*(1.-envMode);
        if(night>0.){
          vec3 sp=floor(d*420.); float st=hs(sp.xy+sp.z*17.); col+=vec3(.8,.85,1.)*step(.9975,st)*smoothstep(0.,.3,y)*night*(.5+.5*hs(sp.zy));
          float md=dot(d,moonDir); col+=vec3(.9,.92,1.)*smoothstep(.99955,.9997,md)*6.*night + vec3(.25,.3,.45)*pow(max(md,0.),60.)*.6*night;
        }
        col=mix(col,ground,smoothstep(0.,-.25,y));
        if(envMode>.5) col=min(col*.6,vec3(1.2));
        gl_FragColor=linearToOutputTexel(vec4(col,1.));
      }`
  });
};

/* ---------------- audio (all synthesized) ---------------- */
SP.Audio = {
  ac: null, master: null, sfx: null, rev: null, nbuf: null, loops: {},
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const ac = this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
      this.master = ac.createGain(); this.master.gain.value = 0.8; this.master.connect(comp);
      this.sfx = ac.createGain(); this.sfx.connect(this.master);
      const len = ac.sampleRate * 2; this.nbuf = ac.createBuffer(1, len, ac.sampleRate); const d = this.nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // reverb impulse
      const il = ac.sampleRate * 1.6, ir = ac.createBuffer(2, il, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const b = ir.getChannelData(ch); for (let i = 0; i < il; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / il, 3.2); }
      this.rev = ac.createConvolver(); this.rev.buffer = ir; this.revGain = ac.createGain(); this.revGain.gain.value = 0.32; this.rev.connect(this.revGain); this.revGain.connect(this.master);
    } catch (e) { this.ac = null; }
  },
  setReverb(v) { if (this.revGain) this.revGain.gain.value = v; },
  out(pan, vol, wet = 0.4) { // returns input node with panning + reverb send
    const ac = this.ac; const g = ac.createGain(); g.gain.value = vol; let node = g;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(this.sfx); if (wet > 0) { const s = ac.createGain(); s.gain.value = wet; p.connect(s); s.connect(this.rev); } }
    else { g.connect(this.sfx); }
    return node;
  },
  noise(dest, t, dur, f0, f1, vol, type = 'lowpass', q = 0.7) {
    const ac = this.ac; const s = ac.createBufferSource(); s.buffer = this.nbuf; const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  },
  osc(dest, t, dur, f0, f1, vol, type = 'sine') {
    const ac = this.ac; const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  },
  // spatial helpers: pos -> pan/volume relative to listener
  spatial(pos) {
    const L = SP.listener; if (!pos || !L) return { pan: 0, att: 1, dist: 0 };
    const dx = pos.x - L.pos.x, dz = pos.z - L.pos.z, dist = Math.hypot(dx, dz, pos.y - L.pos.y);
    const ang = Math.atan2(dx, -dz) + L.yaw; return { pan: Math.sin(ang) * 0.85, att: 1 / (1 + dist * 0.045), dist };
  },
  gun(kind, pos, vol = 1) {
    if (!this.ac) return; const t = this.ac.currentTime; const sp = this.spatial(pos); const v = vol * (pos ? sp.att : 1);
    if (v < 0.01) return; const far = pos ? clamp(sp.dist / 120, 0, 1) : 0; const d = this.out(sp.pan, 1, 0.25 + far * 0.6);
    const P = { m4: [2800, 1, 0.22, 150], ak: [2000, 1.1, 0.28, 120], pistol: [3200, 0.7, 0.18, 190], mg: [1700, 1.4, 0.3, 90], fifty: [1200, 1.8, 0.45, 60], sup: [1500, 0.35, 0.12, 220], shotgun: [1600, 1.6, 0.4, 80], dshk: [1100, 1.6, 0.42, 70] }[kind] || [2400, 1, 0.25, 140];
    const lp = lerp(P[0], 500, far);
    this.noise(d, t, P[2] * (1 + far), lp, 140, v * P[1] * 0.9);
    this.osc(d, t, 0.14, P[3], 35, v * P[1] * (1 - far * 0.7));
    if (kind !== 'sup') this.noise(d, t + 0.012, 0.05, 6000, 2500, v * 0.35 * (1 - far), 'highpass');
  },
  explosion(pos, vol = 1) { if (!this.ac) return; const t = this.ac.currentTime; const sp = this.spatial(pos); const d = this.out(sp.pan, 1, 0.7); const v = vol * clamp(sp.att * 2.2, 0.15, 1.4);
    this.noise(d, t, 1.8, 900, 40, v * 1.4); this.osc(d, t, 0.9, 70, 22, v * 1.2); this.noise(d, t + 0.05, 2.5, 300, 60, v * 0.6); },
  impact(pos, kind = 'dirt') { if (!this.ac) return; const t = this.ac.currentTime; const sp = this.spatial(pos); if (sp.att < 0.05) return; const d = this.out(sp.pan, 1, 0.1);
    if (kind === 'metal') this.osc(d, t, 0.18, rand(1800, 2600), 900, sp.att * 0.25, 'triangle'); this.noise(d, t, 0.08, kind === 'flesh' ? 600 : 2500, 300, sp.att * 0.4); },
  whiz() { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(rand(-0.8, 0.8), 1, 0.05); this.noise(d, t, 0.16, 5000, 1500, 0.22, 'bandpass', 4); },
  click(f = 900, v = 0.12) { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(0, 1, 0); this.osc(d, t, 0.04, f, null, v, 'square'); },
  mech(v = 0.25) { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(0.2, 1, 0.05); this.noise(d, t, 0.06, 3500, 1200, v, 'bandpass', 2); this.osc(d, t + 0.02, 0.05, 420, 200, v * 0.5, 'square'); },
  step(surface = 'sand', v = 0.18) { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(rand(-0.15, 0.15), 1, 0.05);
    const f = { sand: [900, 300], hard: [2200, 600], metal: [1600, 500], water: [1400, 400] }[surface] || [900, 300]; this.noise(d, t, surface === 'water' ? 0.18 : 0.09, f[0], f[1], v); if (surface === 'water') this.noise(d, t + 0.05, 0.2, 2500, 800, v * 0.6, 'bandpass', 3); },
  hit() { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(0, 1, 0); this.osc(d, t, 0.05, 1400, 900, 0.16, 'triangle'); this.noise(d, t, 0.03, 4000, 3000, 0.08, 'highpass'); },
  kill() { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(0, 1, 0); this.osc(d, t, 0.08, 700, 500, 0.18, 'triangle'); this.osc(d, t + 0.05, 0.1, 1050, 800, 0.14, 'triangle'); },
  hurt() { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(0, 1, 0.1); this.noise(d, t, 0.25, 500, 80, 0.5); this.osc(d, t, 0.2, 140, 60, 0.3, 'sawtooth'); },
  heartbeat(v = 0.5) { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(0, 1, 0); this.osc(d, t, 0.18, 62, 40, v); this.osc(d, t + 0.23, 0.16, 58, 38, v * 0.75); },
  radio() { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(0, 1, 0); this.noise(d, t, 0.12, 3000, 1500, 0.08, 'bandpass', 3); this.osc(d, t, 0.05, 1900, null, 0.05, 'square'); },
  whistle(v = 0.3) { if (!this.ac) return; const t = this.ac.currentTime; const d = this.out(rand(-0.5, 0.5), 1, 0.3); this.osc(d, t, 1.4, 1800, 500, v, 'sine'); },
  alarm(on) { if (!this.ac) return; if (on && !this.loops.alarm) { const ac = this.ac; const o = ac.createOscillator(); o.type = 'square'; const l = ac.createOscillator(); l.frequency.value = 1.2; const lg = ac.createGain(); lg.gain.value = 220; l.connect(lg); lg.connect(o.frequency); o.frequency.value = 620; const g = ac.createGain(); g.gain.value = 0.035; const f = ac.createBiquadFilter(); f.frequency.value = 1500; o.connect(f); f.connect(g); g.connect(this.master); g.connect(this.rev); o.start(); l.start(); this.loops.alarm = [o, l]; } if (!on && this.loops.alarm) { this.loops.alarm.forEach(n => n.stop()); delete this.loops.alarm; } },
  loop(name, kind, vol) {
    if (!this.ac || this.loops[name]) return; const ac = this.ac, t = ac.currentTime; const s = ac.createBufferSource(); s.buffer = this.nbuf; s.loop = true;
    const f = ac.createBiquadFilter(), g = ac.createGain(); const nodes = [s];
    if (kind === 'rotor') { f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = vol * 0.4; const l = ac.createOscillator(); l.frequency.value = 10.5; const lg = ac.createGain(); lg.gain.value = vol * 0.6; l.connect(lg); lg.connect(g.gain); l.start(t); nodes.push(l);
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 42; const og = ac.createGain(); og.gain.value = vol * 0.12; const of = ac.createBiquadFilter(); of.frequency.value = 160; o.connect(of); of.connect(og); og.connect(this.master); o.start(t); nodes.push(o); }
    else if (kind === 'wind') { f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 0.5; g.gain.value = vol; const l = ac.createOscillator(); l.frequency.value = 0.07; const lg = ac.createGain(); lg.gain.value = 200; l.connect(lg); lg.connect(f.frequency); l.start(t); nodes.push(l); }
    else if (kind === 'engine') { f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = vol; const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55; const og = ac.createGain(); og.gain.value = vol * 0.4; o.connect(og); og.connect(f); o.start(t); nodes.push(o); this.engineOsc = o; }
    else if (kind === 'drone') { f.type = 'lowpass'; f.frequency.value = 120; g.gain.value = vol * 0.4; [55, 82.4, 110.3].forEach(fr => { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = fr; const og = ac.createGain(); og.gain.value = vol * 0.18; o.connect(og); og.connect(this.master); og.connect(this.rev); o.start(t); nodes.push(o); }); }
    else if (kind === 'hum') { f.type = 'bandpass'; f.frequency.value = 120; f.Q.value = 6; g.gain.value = vol; }
    else if (kind === 'drip') { f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1; g.gain.value = vol; }
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); this.loops[name] = nodes; nodes.gain = g;
  },
  stopLoop(name) { const n = this.loops[name]; if (!n) return; n.forEach(x => { try { x.stop(); } catch (e) { } }); delete this.loops[name]; },
  stopAll() { Object.keys(this.loops).forEach(k => this.stopLoop(k)); this.alarm(false); },
};

/* ---------------- input ---------------- */
SP.Input = {
  keys: {}, pressed: {}, mouse: { l: false, r: false, dx: 0, dy: 0, lp: false }, locked: false, fallback: false,
  init(canvas) {
    this.canvas = canvas;
    addEventListener('keydown', e => { if (!this.keys[e.code]) this.pressed[e.code] = true; this.keys[e.code] = true; if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); if (SP.onKey) SP.onKey(e.code); });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.mouse.l = this.mouse.r = false; });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) { this.mouse.l = true; this.mouse.lp = true; } if (e.button === 2) this.mouse.r = true; });
    addEventListener('mouseup', e => { if (e.button === 0) this.mouse.l = false; if (e.button === 2) this.mouse.r = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => { if (this.locked || this.fallback) { this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0; } });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; if (SP.onLockChange) SP.onLockChange(this.locked); });
    document.addEventListener('pointerlockerror', () => { if (SP.onLockFail) SP.onLockFail(); });
    canvas.addEventListener('click', () => { if (SP.state === 'play' && !this.locked && !this.fallback) this.lock(); });
  },
  lock() { if (!this.canvas.requestPointerLock) { this.fallback = true; SP.onLockChange && SP.onLockChange(true); return; } try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { SP.onLockFail && SP.onLockFail(); }); } catch (e) { SP.onLockFail && SP.onLockFail(); } },
  unlock() { if (document.exitPointerLock && this.locked) document.exitPointerLock(); },
  consume() { const d = [this.mouse.dx, this.mouse.dy]; this.mouse.dx = this.mouse.dy = 0; return d; },
  endFrame() { this.pressed = {}; this.mouse.lp = false; },
  down(c) { return !!this.keys[c]; }, hit(c) { return !!this.pressed[c]; },
};

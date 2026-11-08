/* Survival Protocol 1.0 — Battle Royale island "Isla Corona": 2.4 km island, 16 named places,
   seeded so every player in an online match builds the identical map. Also: collision grid and static mesh merging. */
'use strict';
(function () {
const T = THREE, { V3, lerp, clamp } = SP;
const geo = SP.geo, M = SP.M, Mods = SP.Models, B = SP.build, Maps = SP.Maps;
const ISLAND = 1000, BOUNDS = 1180;

SP.BRPOI = [
  { name: 'Crown City', x: 0, z: 0, kind: 'city', r: 150 },
  { name: 'Oasis Springs', x: 520, z: 540, kind: 'oasis', r: 90 },
  { name: 'Dune Town', x: 780, z: 160, kind: 'town', r: 90 },
  { name: 'Rust Refinery', x: 360, z: 720, kind: 'refinery', r: 90 },
  { name: 'Skyline Airbase', x: -640, z: -120, kind: 'airbase', r: 150 },
  { name: "Pharaoh's Ruins", x: 200, z: 400, kind: 'ruins', r: 80 },
  { name: 'Frostpeak Lodge', x: -140, z: -700, kind: 'lodge', r: 85 },
  { name: 'Harbor Point', x: -720, z: 470, kind: 'harbor', r: 100 },
  { name: 'Viper Canyon', x: 600, z: -380, kind: 'canyon', r: 90 },
  { name: 'Greenfield Farms', x: -360, z: 560, kind: 'farm', r: 100 },
  { name: 'Ironworks', x: 300, z: -640, kind: 'factory', r: 100 },
  { name: 'Radio Ridge', x: -440, z: -470, kind: 'radio', r: 60 },
  { name: 'Crown Palace', x: 120, z: -300, kind: 'palace', r: 85 },
  { name: 'Lakeside Villas', x: -300, z: 120, kind: 'villas', r: 70 },
  { name: 'Military Depot', x: 820, z: -120, kind: 'depot', r: 90 },
  { name: 'Sunset Motel', x: -560, z: -760, kind: 'motel', r: 60 },
];
const LAKE = { x: -330, z: -10, r: 105 };

/* ---------- seeded random (all players build the same map) ---------- */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
SP.seeded = function (seed, fn) { const r0 = Math.random; Math.random = mulberry(seed >>> 0); try { return fn(); } finally { Math.random = r0; } };

/* ---------- terrain ---------- */
function edgeR(x, z) { const a = Math.atan2(z, x); return ISLAND + Math.sin(a * 3 + 1) * 60 + Math.sin(a * 7 + 2) * 35 + SP.fbm(Math.cos(a) * 3 + 10, Math.sin(a) * 3 + 10, 3) * 120; }
const ROADS = [];
SP.BRPOI.forEach((p, i) => { if (i) ROADS.push([0, 0, p.x, p.z]); });
ROADS.push([520, 540, 360, 720], [780, 160, 820, -120], [600, -380, 300, -640], [-640, -120, -440, -470], [-720, 470, -360, 560], [-140, -700, -560, -760], [200, 400, 520, 540]);
function roadDist(x, z) { let best = 1e9; for (const [ax, az, bx, bz] of ROADS) { const dx = bx - ax, dz = bz - az; const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); const d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < best) best = d; } return best; }
function biome(x, z) { // 0 grass, 1 desert, 2 snow-mountain, 3 forest
  if (z < -430) return 2; if (x > 280 && z > -150) return 1; if (x < -150 && z > -350 && z < 380) return 3; return 0;
}
function rawH(x, z) {
  const r = Math.hypot(x, z), er = edgeR(x, z);
  let h = 8 + SP.fbm(x * 0.0022, z * 0.0022, 4) * 40 + SP.fbm(x * 0.012, z * 0.012, 2) * 4;
  if (z < -380) { const k = SP.smooth(-380, -620, z); h += k * (60 + SP.fbm(x * 0.006 + 3, z * 0.006, 4) * 110); }
  if (x > 280 && z > -150) h = lerp(h, 10 + Math.sin(x * 0.03 + z * 0.012) * 3 + SP.fbm(x * 0.008, z * 0.008, 2) * 10, SP.smooth(280, 380, x) * SP.smooth(-150, -50, z));
  const coast = er - r; if (coast < 160) h = lerp(-14, h, SP.smooth(-20, 160, coast));
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z); if (ld < LAKE.r + 80) h = lerp(-6, h, SP.smooth(LAKE.r - 30, LAKE.r + 80, ld));
  return h;
}
function terrainH(x, z) {
  let h = rawH(x, z);
  for (const p of SP.BRPOI) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r + 70) { const flat = p.kind === 'canyon' ? rawH(p.x, p.z) - 14 : p.kind === 'harbor' ? 3.2 : Math.max(3, rawH(p.x, p.z)); h = lerp(flat, h, SP.smooth(p.r, p.r + 70, d)); } }
  const rd = roadDist(x, z); if (rd < 14) h = lerp(Math.max(h * 0.96, 1.6), h, SP.smooth(5, 14, rd));
  return h;
}
SP.brTerrainH = terrainH;
function terrainColor(x, y, z, ny) {
  const b = biome(x, z); const v = 0.88 + SP.fbm(x * 0.03, z * 0.03, 2) * 0.22;
  let c = b === 1 ? [0.78, 0.62, 0.42] : b === 2 ? [0.42, 0.5, 0.3] : b === 3 ? [0.22, 0.38, 0.16] : [0.36, 0.52, 0.22];
  if (b === 2 && y > 70) c = [0.94, 0.95, 0.98]; else if (b === 2 && y > 45) c = lerpC([0.5, 0.48, 0.45], [0.94, 0.95, 0.98], (y - 45) / 25);
  const rk = clamp((0.86 - ny) * 4, 0, 1); c = lerpC(c, y > 70 ? [0.7, 0.72, 0.76] : [0.5, 0.46, 0.42], rk);
  if (y < 3.5) c = lerpC([0.9, 0.82, 0.62], c, clamp((y - 1) / 2.5, 0, 1));
  if (y < 0.5) c = [0.62, 0.56, 0.42];
  const rd = roadDist(x, z); if (rd < 6 && y > 1) c = lerpC([0.3, 0.29, 0.27], c, clamp((rd - 4) / 2, 0, 1));
  for (const p of SP.BRPOI) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r * 0.85 && (p.kind === 'city' || p.kind === 'airbase' || p.kind === 'depot' || p.kind === 'factory' || p.kind === 'harbor')) { c = lerpC([0.42, 0.41, 0.39], c, clamp((d - p.r * 0.7) / (p.r * 0.15), 0, 1)); } }
  return c.map(k => k * v);
}
function lerpC(a, b, t) { t = clamp(t, 0, 1); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
SP.brMapColor = (x, z) => { const y = terrainH(x, z); if (y < 0) return y < -4 ? [0.12, 0.32, 0.5] : [0.2, 0.46, 0.6]; return terrainColor(x, y, z, 0.95); };

/* ---------- collision grid (thousands of colliders on this map) ---------- */
function gridify(W, cell = 24) {
  const cells = new Map(); const K = (i, j) => (i + 2000) * 4001 + (j + 2000);
  const ins = c => { const b = c.box; c._k = []; for (let i = Math.floor(b.min.x / cell); i <= Math.floor(b.max.x / cell); i++) for (let j = Math.floor(b.min.z / cell); j <= Math.floor(b.max.z / cell); j++) { const k = K(i, j); let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(c); c._k.push(k); } };
  W.colliders.forEach(ins);
  const ac = W.addCollider.bind(W), cf = W.colliderFrom.bind(W);
  W.addCollider = (...a) => { const c = ac(...a); ins(c); return c; };
  W.colliderFrom = (...a) => { const c = cf(...a); ins(c); return c; };
  W.removeCollider = c => { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); (c._k || []).forEach(k => { const a = cells.get(k); if (a) { const j = a.indexOf(c); if (j >= 0) a.splice(j, 1); } }); };
  let stamp = 1;
  const near = (x0, x1, z0, z1, fn) => { stamp++; for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) { const a = cells.get(K(i, j)); if (a) for (const c of a) { if (c._s === stamp) continue; c._s = stamp; fn(c); } } };
  W.groundAt = function (x, z, y = 1e4, r = 0.25) { let h = this.heightAt(x, z); near(x - r, x + r, z - r, z + r, c => { const b = c.box; if (c.noStand) return; if (x > b.min.x - r && x < b.max.x + r && z > b.min.z - r && z < b.max.z + r && b.max.y <= y + 0.55 && b.max.y > h) h = b.max.y; }); return h; };
  W.push = function (pos, r, feet, height) {
    near(pos.x - r, pos.x + r, pos.z - r, pos.z + r, c => {
      const b = c.box; if (feet >= b.max.y - 0.5 || feet + height <= b.min.y) return;
      const cx = clamp(pos.x, b.min.x, b.max.x), cz = clamp(pos.z, b.min.z, b.max.z); const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) { if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + dx / d * r; pos.z = cz + dz / d * r; } else { const o = [[b.min.x - r - pos.x, 0], [b.max.x + r - pos.x, 0], [0, b.min.z - r - pos.z], [0, b.max.z + r - pos.z]].sort((a, c2) => Math.abs(a[0] + a[1]) - Math.abs(c2[0] + c2[1]))[0]; pos.x += o[0]; pos.z += o[1]; } }
    });
    const Bd = this.bounds; pos.x = clamp(pos.x, -Bd, Bd); pos.z = clamp(pos.z, -Bd, Bd);
  };
  const ray = new T.Ray(), tv = new T.Vector3();
  W.ray = function (origin, dir, maxT = 600, ignore) {
    ray.origin.copy(origin); ray.direction.copy(dir); let best = maxT, hit = null;
    // walk the grid cells along the ray (2D DDA)
    let ix = Math.floor(origin.x / cell), iz = Math.floor(origin.z / cell); const sx = dir.x > 0 ? 1 : -1, sz = dir.z > 0 ? 1 : -1;
    const tdx = Math.abs(dir.x) > 1e-9 ? cell / Math.abs(dir.x) : 1e9, tdz = Math.abs(dir.z) > 1e-9 ? cell / Math.abs(dir.z) : 1e9;
    let tmx = Math.abs(dir.x) > 1e-9 ? ((sx > 0 ? (ix + 1) * cell - origin.x : origin.x - ix * cell) / Math.abs(dir.x)) : 1e9, tmz = Math.abs(dir.z) > 1e-9 ? ((sz > 0 ? (iz + 1) * cell - origin.z : origin.z - iz * cell) / Math.abs(dir.z)) : 1e9;
    stamp++; let tEnter = 0;
    for (let n = 0; n < 400 && tEnter <= best; n++) {
      const a = cells.get(K(ix, iz)); if (a) for (const c of a) { if (c._s === stamp || c === ignore || c.noRay) continue; c._s = stamp; const p = ray.intersectBox(c.box, tv); if (p) { const t = p.distanceTo(origin); if (t < best) { best = t; hit = c; } } }
      if (tmx < tmz) { tEnter = tmx; tmx += tdx; ix += sx; } else { tEnter = tmz; tmz += tdz; iz += sz; }
    }
    let tt = null; const th = this.terrainH;
    let prev = 0, step = 0.6; for (let t = 0.3; t < best; t += step) { const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t; if (y < th(x, z)) { let lo = prev, hi = t; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (origin.y + dir.y * m < th(origin.x + dir.x * m, origin.z + dir.z * m)) hi = m; else lo = m; } tt = hi; break; } prev = t; step = Math.min(6, 0.6 + t * 0.04); }
    if (tt != null && tt < best) return { t: tt, point: origin.clone().addScaledVector(dir, tt), surf: this.surface, collider: null };
    if (hit) return { t: best, point: origin.clone().addScaledVector(dir, best), surf: hit.surf, collider: hit };
    return null;
  };
}

/* ---------- merge static meshes into a few big ones per area (draw calls) ---------- */
function mergeStatic(W, tile = 260) {
  const groups = new Map(); const kill = [];
  W.scene.updateMatrixWorld(true);
  W.scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isPoints || o === W.terrainMesh) return;
    let p = o; while (p) { if (p.userData && p.userData.noMerge) return; p = p.parent; }
    const m = o.material; if (!m || Array.isArray(m) || m.transparent || m.vertexColors || m.isShaderMaterial || !o.geometry || !o.geometry.attributes.position || o.geometry.morphAttributes.position) return;
    const pos = new T.Vector3(); o.getWorldPosition(pos); const key = [m.map ? m.map.uuid : '-', m.color ? m.color.getHexString() : '', (m.roughness || 0).toFixed(2), (m.metalness || 0).toFixed(2), m.emissive ? m.emissive.getHexString() : '', m.side, Math.floor(pos.x / tile), Math.floor(pos.z / tile), o.castShadow ? 1 : 0].join('|');
    let g = groups.get(key); if (!g) groups.set(key, g = { mat: m, list: [], cast: o.castShadow });
    g.list.push(o); kill.push(o);
  });
  let made = 0;
  for (const g of groups.values()) {
    if (g.list.length < 2) { const i = kill.indexOf(g.list[0]); if (i >= 0) kill.splice(i, 1); continue; }
    let n = 0; const parts = g.list.map(o => { let gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); gg.applyMatrix4(o.matrixWorld); n += gg.attributes.position.count; return gg; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let off = 0;
    for (const gg of parts) { const c = gg.attributes.position.count; P.set(gg.attributes.position.array, off * 3); if (gg.attributes.normal) N.set(gg.attributes.normal.array, off * 3); if (gg.attributes.uv) U.set(gg.attributes.uv.array, off * 2); off += c; gg.dispose(); }
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(P, 3)); bg.setAttribute('normal', new T.BufferAttribute(N, 3)); bg.setAttribute('uv', new T.BufferAttribute(U, 2)); bg.computeBoundingSphere(); bg.computeBoundingBox();
    const mesh = new T.Mesh(bg, g.mat); mesh.castShadow = g.cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; W.scene.add(mesh); made++;
  }
  for (const o of kill) { o.visible = false; if (o.parent) o.parent.remove(o); }
  return { merged: kill.length, made };
}

/* ---------- instanced vegetation + props ---------- */
function Inst(W) {
  const lists = {}; const I = {
    add(key, geom, mat, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, cast = true) { const L = lists[key] || (lists[key] = { geom, mat, m: [], cast }); const o = new T.Object3D(); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.y = ry; o.updateMatrix(); L.m.push(o.matrix.clone()); },
    build() { for (const k in lists) { const L = lists[k]; if (!L.m.length) continue; const im = new T.InstancedMesh(L.geom, L.mat, L.m.length); L.m.forEach((mm, i) => im.setMatrixAt(i, mm)); im.castShadow = L.cast; im.receiveShadow = true; im.userData.noMerge = true; W.scene.add(im); } },
  }; return I;
}
const uBox = new T.BoxGeometry(1, 1, 1); uBox.translate(0, 0.5, 0);
const uCyl = new T.CylinderGeometry(0.5, 0.5, 1, 8); uCyl.translate(0, 0.5, 0);
const uCone = new T.ConeGeometry(0.5, 1, 9); uCone.translate(0, 0.5, 0);
const uSph = new T.IcosahedronGeometry(0.5, 1); uSph.translate(0, 0.5, 0);
const uRock = new T.DodecahedronGeometry(0.5, 0); uRock.translate(0, 0.3, 0);

/* ---------- the island ---------- */
Maps.br2 = function (W, part) {
  const seed = (part && part.seed) || 1337;
  return SP.seeded(seed, () => buildIsland(W));
};
function buildIsland(W) {
  W.terrainH = terrainH; W.surface = 'sand'; W.bounds = BOUNDS;
  W.surfaceFn = (x, z) => { const b = biome(x, z); return b === 1 ? 'sand' : b === 2 && terrainH(x, z) > 60 ? 'snow' : 'dirt'; };
  // terrain mesh
  const size = 2500, segs = 300; const g = new T.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, terrainH(x, z)); uv.setXY(i, x / 4, z / 4); }
  g.computeVertexNormals(); const nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const c = terrainColor(p.getX(i), p.getY(i), p.getZ(i), nrm.getY(i)); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  const tm = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const terr = new T.Mesh(g, tm); terr.receiveShadow = true; W.scene.add(terr); W.terrainMesh = terr;
  // sea + lake water
  const water = new T.Mesh(new T.PlaneGeometry(9000, 9000), new T.MeshStandardMaterial({ color: SP.lin(0x1f6a8a), roughness: 0.06, metalness: 0.25, envMapIntensity: 1.6 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.2; water.userData.noMerge = true; W.scene.add(water); W.water = water;
  const I = Inst(W); I.mats = { glass: new T.MeshStandardMaterial({ color: SP.lin(0x1c2228), roughness: 0.12, metalness: 0.6, envMapIntensity: 1.4 }), lit: new T.MeshStandardMaterial({ color: 0x302010, emissive: SP.lin(0xffc078), emissiveIntensity: 0.2, roughness: 0.4 }), bal: SP.mat('metal', { color: 0x2c2c2a, roughness: 0.5, metalness: 0.6 }), shut: SP.flat(0x2f5a6a, 0.8), tank: SP.flat(0xd8d2c6, 0.6, 0.2), ac: SP.flat(0x9a9a96, 0.5, 0.3), awn: [SP.flat(0x8a2a22, 0.9), SP.flat(0x2a5a7a, 0.9), SP.flat(0xc8a040, 0.9), SP.flat(0x3a6a3a, 0.9)] };
  W.loot = []; W.vendors = []; const loot = (x, z, y) => W.loot.push(V3(x, y != null ? y : W.heightAt(x, z), z));
  const tints = [0xe8dcc8, 0xd8c8a8, 0xcab89a, 0xf0e4cc, 0xc8d4dc, 0xe0c8b8, 0xd0d8c0];
  const house = (x, z, w, d, h, o = {}) => { const r = B.house(W, x, z, w, d, h, Object.assign({ door: SP.pick(['s', 'n', 'e', 'w']), tint: SP.pick(tints) }, o)); loot(x + SP.rand(-w / 4, w / 4), z + SP.rand(-d / 4, d / 4), r.base + 0.2); return r; };
  const mat = { metal: SP.mat('corrugated', { color: 0x8a8e88, roughness: 0.6, metalness: 0.4 }), conc: SP.mat('concrete', { color: 0xb8b2a6 }), dark: SP.flat(0x2a2a2a, 0.6, 0.4), red: SP.flat(0x9a2a22, 0.7), white: SP.mat('concrete', { color: 0xe8e4dc }) };
  const shed = (x, z, w, d, h, m = mat.metal) => { const y = W.heightAt(x, z) - 0.2; W.box(w, 0.3, d, x, y + h, z, m, { uv: 3 }); W.box(0.4, h, d, x - w / 2, y, z, m, { uv: 3 }); W.box(0.4, h, d, x + w / 2, y, z, m, { uv: 3 }); W.box(w, h, 0.4, x, y, z - d / 2, m, { uv: 3 }); W.box(w * 0.3, h, 0.4, x - w * 0.35, y, z + d / 2, m, { uv: 3 }); W.box(w * 0.3, h, 0.4, x + w * 0.35, y, z + d / 2, m, { uv: 3 }); loot(x, z, y + 0.3); loot(x + w / 4, z - d / 4, y + 0.3); };
  const vendor = (x, z, kind) => W.vendors.push({ pos: V3(x, W.heightAt(x, z), z), kind });

  for (const P of SP.BRPOI) {
    const { x: px, z: pz } = P; const y0 = W.heightAt(px, pz);
    if (P.kind === 'city') {
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        if (i === 0 && j === 0) continue; const bx = px + i * 40, bz = pz + j * 40; if (Math.hypot(i, j) > 3.6) continue;
        const fl = Math.max(2, Math.round(9 - Math.hypot(i, j) * 2 + SP.rand(-1, 2))); const w = SP.rand(20, 28), d = SP.rand(20, 28);
        const r = building(W, I, bx, bz, w, d, fl, SP.pick(tints));
        loot(bx + w / 2 + 3, bz + SP.rand(-8, 8)); if (Math.random() < 0.5) loot(bx - w / 2 - 3, bz + SP.rand(-8, 8));
        if (Math.random() < 0.35) parked(W, bx + w / 2 + 6, bz + SP.rand(-10, 10), Math.PI / 2);
      }
      // central plaza with fountain + statue
      M(geo.cyl(9, 9.5, 0.8, 32), mat.white, px, y0 + 0.4, pz, W.scene); M(new T.CylinderGeometry(8, 8, 0.1, 32), new T.MeshStandardMaterial({ color: SP.lin(0x2a6a8a), roughness: 0.05, metalness: 0.2 }), px, y0 + 0.82, pz, W.scene);
      W.addCollider(V3(px - 9, y0, pz - 9), V3(px + 9, y0 + 0.8, pz + 9), 'hard'); W.box(1.6, 6, 1.6, px, y0 + 0.8, pz, SP.mat('metal', { color: 0x8a7a40, metalness: 0.8, roughness: 0.3 }), { uv: 1 });
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; loot(px + Math.cos(a) * 14, pz + Math.sin(a) * 14); }
      vendor(px + 12, pz + 12, 'arms'); vendor(px - 12, pz - 12, 'merc');
    }
    if (P.kind === 'oasis') {
      const lake = new T.Mesh(new T.CircleGeometry(28, 40), new T.MeshStandardMaterial({ color: SP.lin(0x1e6a7a), roughness: 0.05, metalness: 0.2, envMapIntensity: 1.5 })); lake.rotation.x = -Math.PI / 2; lake.position.set(px, y0 + 0.15, pz); lake.userData.noMerge = true; W.scene.add(lake);
      for (let k = 0; k < 30; k++) { const a = k / 30 * 6.28, r = SP.rand(32, 50); palm(I, W, px + Math.cos(a) * r, pz + Math.sin(a) * r); }
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + 0.3; house(px + Math.cos(a) * 62, pz + Math.sin(a) * 62, SP.rand(8, 11), SP.rand(7, 9), 3.4); }
      vendor(px + 36, pz, 'arms');
    }
    if (P.kind === 'town') {
      for (let k = 0; k < 16; k++) { const hx = px + (k % 4 - 1.5) * 18 + SP.rand(-2, 2), hz = pz + (Math.floor(k / 4) - 1.5) * 19 + SP.rand(-2, 2); house(hx, hz, SP.rand(8, 11), SP.rand(7, 9), Math.random() < 0.3 ? 6.4 : 3.4); }
      B.tower(W, px + 44, pz, 9); loot(px + 44, pz + 3); vendor(px, pz + 40, 'merc');
    }
    if (P.kind === 'refinery') {
      for (let k = 0; k < 6; k++) { const x = px - 40 + k * 16, z = pz - 20; const y = W.heightAt(x, z); M(geo.cyl(6, 6, 12, 22), SP.mat('metal', { color: 0xd8d4c8, metalness: 0.4 }), x, y + 6, z, W.scene); W.addCollider(V3(x - 5.4, y, z - 5.4), V3(x + 5.4, y + 12, z + 5.4), 'metal'); loot(x, z + 9); }
      for (let k = 0; k < 3; k++) { const x = px - 30 + k * 30, z = pz + 30; W.box(1.6, 26, 1.6, x, W.heightAt(x, z), z, mat.red, { uv: 2 }); }
      shed(px + 50, pz + 20, 22, 14, 7); shed(px - 55, pz + 25, 18, 12, 6); vendor(px, pz + 50, 'arms');
      for (let k = 0; k < 6; k++) B.container(W, px - 50 + k * 8, pz + 55, 0, SP.pick([0x34505e, 0x7a4232, 0x5c6a3e]));
    }
    if (P.kind === 'airbase') {
      W.box(26, 0.12, 240, px + 60, y0 - 0.05, pz, SP.mat('concrete', { color: 0x5a5a58 }), { uv: 8, collide: false });
      for (let k = 0; k < 12; k++) W.box(1, 0.13, 8, px + 60, y0 - 0.04, pz - 110 + k * 20, mat.white, { collide: false });
      for (let k = 0; k < 3; k++) { const hz = pz - 70 + k * 60; hangar(W, px - 20, hz, mat); loot(px - 20, hz); loot(px - 26, hz + 8); }
      B.tower(W, px + 20, pz + 100, 12); loot(px + 20, pz + 103);
      const h = Mods.heli(); h.position.set(px + 30, y0, pz - 30); h.userData.noMerge = true; W.scene.add(h); W.colliderFrom(h, 'metal', 0.4);
      for (let k = 0; k < 20; k++) B.hesco(W, px - 60 + k * 6.5, pz - 140, 4);
      vendor(px - 40, pz + 100, 'arms'); vendor(px - 40, pz - 100, 'merc');
    }
    if (P.kind === 'ruins') {
      for (let k = 0; k < 40; k++) { const x = px + SP.rand(-55, 55), z = pz + SP.rand(-55, 55); const h = SP.rand(1, 8); M(geo.cyl(0.55, 0.6, h, 12), SP.mat('concrete', { color: 0xd8c8a8 }), x, W.heightAt(x, z) + h / 2, z, W.scene); W.addCollider(V3(x - 0.55, W.heightAt(x, z), z - 0.55), V3(x + 0.55, W.heightAt(x, z) + h, z + 0.55), 'hard'); }
      W.box(14, 10, 4, px, y0 - 0.2, pz - 40, SP.mat('concrete', { color: 0xd0bc98 }), { uv: 3 });
      // pyramid
      for (let k = 0; k < 6; k++) { const s = 34 - k * 6; W.box(s, 3, s, px + 30, y0 - 0.5 + k * 3, pz + 30, SP.mat('concrete', { color: 0xd8bc8a }), { uv: 4 }); } loot(px + 30, pz + 30, y0 + 17.5);
      for (let k = 0; k < 10; k++) loot(px + SP.rand(-45, 45), pz + SP.rand(-45, 45)); vendor(px - 30, pz + 20, 'merc');
    }
    if (P.kind === 'lodge') {
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; house(px + Math.cos(a) * 40, pz + Math.sin(a) * 40, 10, 9, 6.4, { tint: SP.pick([0x6a4a32, 0x7a5a3a, 0x5a3a28]) }); }
      W.box(24, 9, 16, px, y0 - 0.2, pz, SP.mat('wood', { color: 0x6a4a30 }), { uv: 3 }); loot(px + 14, pz); loot(px - 14, pz);
      for (let k = 0; k < 60; k++) { const a = SP.rand(0, 6.28), r = SP.rand(60, 120); pine(I, W, px + Math.cos(a) * r, pz + Math.sin(a) * r, true); }
      vendor(px, pz + 20, 'arms');
    }
    if (P.kind === 'harbor') {
      for (let k = 0; k < 24; k++) { const cx = px - 30 + (k % 6) * 9, cz = pz - 20 + Math.floor(k / 6) * 12; B.container(W, cx, cz, Math.PI / 2, SP.pick([0x34505e, 0x7a4232, 0x5c6a3e, 0x8a6a2a, 0x2a4a7a])); if (k % 3 === 0) loot(cx + 4, cz); }
      for (let k = 0; k < 3; k++) { const x = px - 60 - k * 22; W.box(10, 0.6, 50, x, 2.5, pz + 40 + k * 10, SP.mat('wood', { color: 0x6a5238 }), { uv: 3 }); loot(x, pz + 55 + k * 10, 3.1); }
      shed(px + 40, pz - 30, 28, 18, 9); W.box(3, 30, 3, px + 20, y0, pz + 30, mat.red, { uv: 2 }); W.box(26, 2, 2, px + 30, y0 + 30, pz + 30, mat.red, { uv: 2 });
      vendor(px + 30, pz + 10, 'merc');
    }
    if (P.kind === 'canyon') {
      for (let k = 0; k < 36; k++) B.rock(W, px + SP.rand(-70, 70), pz + SP.rand(-70, 70), SP.rand(2, 7));
      for (let k = 0; k < 4; k++) { shed(px - 30 + k * 20, pz + 25, 12, 10, 5, SP.mat('corrugated', { color: 0x9a7a4a })); }
      const t = Mods.truck('cargo', 0xb89a3a); t.position.set(px, W.heightAt(px, pz), pz - 10); W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); loot(px + 4, pz - 10);
      vendor(px - 20, pz - 30, 'arms');
    }
    if (P.kind === 'farm') {
      for (let k = 0; k < 6; k++) house(px - 50 + k * 20, pz - 20, 9, 8, 3.4);
      barn(W, px + 20, pz + 30); loot(px + 20, pz + 30); loot(px + 14, pz + 34);
      for (let k = 0; k < 14; k++) { const fx = px + SP.rand(-90, 90), fz = pz + SP.rand(40, 90); I.add('crop', uBox, SP.flat(SP.pick([0x6a7a3a, 0x8a8a3a, 0x5a7a2a]), 1), fx, W.heightAt(fx, fz), fz, 16, 0.6, 10, SP.rand(0, 3), false); }
      vendor(px - 30, pz + 20, 'merc');
    }
    if (P.kind === 'factory') {
      shed(px, pz, 50, 30, 12); shed(px + 50, pz - 30, 30, 22, 9); shed(px - 45, pz + 30, 26, 18, 8);
      for (let k = 0; k < 3; k++) { const x = px - 30 + k * 12, z = pz - 40; W.box(3, 32, 3, x, W.heightAt(x, z), z, SP.mat('concrete', { color: 0x8a5a4a }), { uv: 2 }); }
      for (let k = 0; k < 8; k++) B.container(W, px + 40 + (k % 4) * 8, pz + 30 + Math.floor(k / 4) * 12, 0, SP.pick([0x34505e, 0x7a4232]));
      vendor(px - 20, pz + 25, 'arms');
    }
    if (P.kind === 'radio') {
      W.box(1, 50, 1, px, y0, pz, SP.mat('metal', { color: 0xc04030 }), { uv: 1 }); for (let k = 0; k < 3; k++) W.box(0.2, 0.2, 30, px, y0 + 15 + k * 12, pz, mat.dark, { collide: false });
      house(px + 14, pz + 10, 12, 9, 3.6, { tint: 0xa0a4a8 }); house(px - 14, pz - 8, 9, 8, 3.4); B.sandbags(W, px - 6, pz + 14, 6, 3); loot(px + 4, pz + 4);
    }
    if (P.kind === 'palace') {
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const wx = px + Math.cos(a) * 55, wz = pz + Math.sin(a) * 55; W.box(k % 2 ? 110 : 3, 7, k % 2 ? 3 : 110, wx, W.heightAt(wx, wz) - 0.3, wz, SP.mat('plaster', { color: 0xe8d8b8 }), { uv: 4 }); }
      W.box(14, 7, 3.2, px, y0 - 0.3, pz + 55, SP.mat('plaster', { color: 0xe8d8b8 }), { uv: 3, collide: false }); // gate (walk through)
      W.box(40, 14, 28, px, y0 - 0.2, pz - 10, SP.mat('plaster', { color: 0xf0e4cc }), { uv: 4 }); W.box(12, 10, 12, px, y0 + 13.8, pz - 10, SP.mat('metal', { color: 0xc8a040, metalness: 0.9, roughness: 0.25 }), { uv: 1 });
      for (let k = 0; k < 4; k++) { const x = px + (k % 2 ? 46 : -46), z = pz + (k < 2 ? 46 : -46); B.tower(W, x, z, 10); loot(x, z + 3); }
      for (let k = 0; k < 8; k++) loot(px + SP.rand(-40, 40), pz + SP.rand(10, 45)); for (let k = 0; k < 12; k++) palm(I, W, px + SP.rand(-45, 45), pz + SP.rand(20, 48));
      vendor(px + 20, pz + 30, 'arms'); vendor(px - 20, pz + 30, 'merc');
    }
    if (P.kind === 'villas') {
      for (let k = 0; k < 9; k++) { const a = k / 9 * 5.2 + 2.2; const hx = LAKE.x + Math.cos(a) * (LAKE.r + 40), hz = LAKE.z + Math.sin(a) * (LAKE.r + 40); house(hx, hz, 12, 10, 6.4, { tint: SP.pick([0xf4f0e8, 0xe8f0f4, 0xf0e0d0]) }); }
      vendor(px, pz + 30, 'arms');
    }
    if (P.kind === 'depot') {
      for (let k = 0; k < 22; k++) B.hesco(W, px - 70 + k * 6.5, pz - 70, 4); for (let k = 0; k < 22; k++) B.hesco(W, px - 70, pz - 70 + k * 6.5, 4, Math.PI / 2);
      shed(px, pz - 20, 34, 20, 9, SP.mat('corrugated', { color: 0x6a7060 })); shed(px + 35, pz + 25, 22, 14, 7, SP.mat('corrugated', { color: 0x6a7060 }));
      for (let k = 0; k < 6; k++) { B.container(W, px - 40 + k * 8, pz + 40, 0, 0x5c6a3e); loot(px - 40 + k * 8, pz + 34); }
      B.tower(W, px + 60, pz + 60, 10); B.tower(W, px - 60, pz + 60, 10); vendor(px, pz + 10, 'merc');
    }
    if (P.kind === 'motel') {
      W.box(56, 4, 10, px, y0 - 0.2, pz - 10, SP.mat('plaster', { color: 0xe8b890 }), { uv: 4 }); for (let k = 0; k < 8; k++) loot(px - 24 + k * 7, pz - 3);
      W.box(1, 9, 1, px + 30, y0, pz + 10, mat.dark, { uv: 1 }); W.box(8, 3, 0.4, px + 30, y0 + 9, pz + 10, SP.flat(0xe05040, 0.5, 0, { emissive: SP.lin(0xff6040), emissiveIntensity: 0.8 }), { collide: false });
      house(px - 30, pz + 20, 10, 8, 3.4); for (let k = 0; k < 4; k++) parked(W, px - 18 + k * 10, pz + 8, 0);
    }
  }
  // roads: lamps and wrecks along them
  for (const [ax, az, bx, bz] of ROADS) { const L = Math.hypot(bx - ax, bz - az); for (let t = 60; t < L - 60; t += 140) { const x = ax + (bx - ax) * t / L, z = az + (bz - az) * t / L; if (SP.BRPOI.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 20)) continue; if (Math.random() < 0.35) { B.wreckCar(W, x + SP.rand(-4, 4), z + SP.rand(-4, 4), SP.rand(0, 3)); loot(x + 5, z + 4); } } }
  // vegetation by biome (instanced)
  for (let k = 0; k < 2600; k++) {
    const x = SP.rand(-1000, 1000), z = SP.rand(-1000, 1000); const y = terrainH(x, z); if (y < 2 || roadDist(x, z) < 9) continue;
    if (SP.BRPOI.some(p => Math.hypot(x - p.x, z - p.z) < p.r * 0.8)) continue; if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 8) continue;
    const b = biome(x, z);
    if (b === 3) { if (Math.random() < 0.85) pine(I, W, x, z, false); else roundTree(I, W, x, z); }
    else if (b === 2) { if (y < 80 && Math.random() < 0.6) pine(I, W, x, z, y > 55); }
    else if (b === 1) { if (Math.random() < 0.12) palm(I, W, x, z); else if (Math.random() < 0.3) I.add('rk', uRock, SP.mat('rock', { color: 0xb8946a }), x, y, z, SP.rand(1.5, 4), SP.rand(1, 3), SP.rand(1.5, 4), SP.rand(0, 6)); }
    else { if (Math.random() < 0.3) roundTree(I, W, x, z); else if (Math.random() < 0.25) pine(I, W, x, z, false); else if (Math.random() < 0.3) I.add('bush', uSph, SP.flat(0x4a6a2a, 1), x, y - 0.3, z, SP.rand(1.5, 3), SP.rand(1, 1.8), SP.rand(1.5, 3), 0, false); }
  }
  // scattered rocks for cover + chests in the wild
  for (let k = 0; k < 340; k++) { const x = SP.rand(-950, 950), z = SP.rand(-950, 950); const y = terrainH(x, z); if (y < 2) continue; const s = SP.rand(1.2, 4); I.add('rk2', uRock, SP.mat('rock', { color: biome(x, z) === 1 ? 0xb8946a : 0x8a847a }), x, y - 0.3, z, s * 1.4, s, s * 1.2, SP.rand(0, 6)); W.addCollider(V3(x - s * 0.5, y - 0.3, z - s * 0.45), V3(x + s * 0.5, y + s * 0.45, z + s * 0.45), 'rock'); if (Math.random() < 0.12) loot(x + s, z); }
  for (let k = 0; k < 60; k++) { const x = SP.rand(-900, 900), z = SP.rand(-900, 900); if (terrainH(x, z) > 2 && Math.hypot(x, z) < 900) loot(x, z); }
  I.build();
  gridify(W);
  W.merged = mergeStatic(W);
  W.isBR = true;
  return { start: V3(0, terrainH(0, 30), 30) };
}
function building(W, I, x, z, w, d, floors, tint) {
  const base = W.heightAt(x, z) - 0.1, h = floors * 3.2 + 0.6;
  W.box(w, h, d, x, base, z, SP.mat('plaster', { color: tint, roughness: 0.95, ns: 1.1 }), { uv: 3 });
  W.box(w + 0.3, 0.5, d + 0.3, x, base + h, z, SP.mat('concrete', { color: 0xc8c0b0 }), { uv: 2, collide: false });
  const faces = [[0, d / 2 + 0.02, w, 0], [0, -d / 2 - 0.02, w, Math.PI], [w / 2 + 0.02, 0, d, Math.PI / 2], [-w / 2 - 0.02, 0, d, -Math.PI / 2]];
  for (const [fx, fz, L, ry] of faces) { const nW = Math.max(1, Math.floor(L / 3.4)); for (let f = 1; f < floors; f++) for (let k = 0; k < nW; k++) { const off = -L / 2 + (k + 0.5) * L / nW; const px = x + fx + Math.cos(ry) * off, pz = z + fz - Math.sin(ry) * off; I.add('glass', uBox, I.mats.glass, px, base + f * 3.2 + 0.4, pz, 1.2, 1.6, 0.08, ry, false); } }
  for (let i = 0; i < 3; i++) { const rx = x + SP.rand(-w / 2 + 1, w / 2 - 1), rz = z + SP.rand(-d / 2 + 1, d / 2 - 1); I.add('ac', uBox, I.mats.ac, rx, base + h + 0.5, rz, 1.2, 0.8, 0.9, SP.rand(0, 3)); }
  W.loot.push(V3(x, base + h + 0.75, z)); // rooftop chest
  return { base, h };
}
function hangar(W, x, z, mat) { const y = W.heightAt(x, z) - 0.2; const m = SP.mat('corrugated', { color: 0x7a8070 }); W.box(36, 0.4, 30, x, y + 11, z, m, { uv: 4 }); W.box(0.6, 11, 30, x - 18, y, z, m, { uv: 4 }); W.box(36, 11, 0.6, x, y, z - 15, m, { uv: 4 }); W.box(0.6, 11, 12, x + 18, y, z - 9, m, { uv: 4 }); }
function barn(W, x, z) { const y = W.heightAt(x, z) - 0.2; const m = SP.mat('wood', { color: 0x8a2a20 }); W.box(20, 0.3, 14, x, y + 8, z, SP.flat(0x3a3a38, 0.8), { uv: 3 }); W.box(0.4, 8, 14, x - 10, y, z, m, { uv: 3 }); W.box(0.4, 8, 14, x + 10, y, z, m, { uv: 3 }); W.box(20, 8, 0.4, x, y, z - 7, m, { uv: 3 }); W.box(6, 8, 0.4, x - 7, y, z + 7, m, { uv: 3 }); W.box(6, 8, 0.4, x + 7, y, z + 7, m, { uv: 3 }); W.box(14, 0.3, 6, x, y + 4, z - 3.8, SP.mat('wood', { color: 0x9a7a4a }), { uv: 2 }); }
function parked(W, x, z, ry) { const t = Mods.technical(SP.pick([0xe6e2da, 0x1a1a1c, 0x7a1e18, 0x3a5a7a, 0xa8a49a])); if (t.userData.gun) t.remove(t.userData.gun); t.position.set(x, W.heightAt(x, z), z); t.rotation.y = ry; W.scene.add(t); W.colliderFrom(t, 'metal', 0.25); }
const leafG = SP.flat(0x2e5a24, 1), leafS = SP.flat(0x4a6a4a, 1), bark = SP.flat(0x4a3424, 1), leafR = SP.flat(0x3c6a28, 1), palmL = SP.flat(0x4a7a2a, 1), palmT = SP.flat(0x8a7050, 1), snowCap = SP.flat(0xf0f4f8, 0.9);
function pine(I, W, x, z, snowy) { const y = W.heightAt(x, z), h = SP.rand(9, 16); I.add('trunk', uCyl, bark, x, y - 0.2, z, 0.5, h * 0.4, 0.5); I.add(snowy ? 'pineS' : 'pine', uCone, snowy ? leafS : leafG, x, y + h * 0.22, z, h * 0.42, h * 0.82, h * 0.42, SP.rand(0, 6)); if (snowy) I.add('cap', uCone, snowCap, x, y + h * 0.62, z, h * 0.22, h * 0.42, h * 0.22); W.addCollider(V3(x - 0.35, y, z - 0.35), V3(x + 0.35, y + h * 0.5, z + 0.35), 'wood'); }
function roundTree(I, W, x, z) { const y = W.heightAt(x, z), h = SP.rand(6, 10); I.add('trunk', uCyl, bark, x, y - 0.2, z, 0.6, h * 0.55, 0.6); I.add('crown', uSph, leafR, x, y + h * 0.4, z, h * 0.75, h * 0.7, h * 0.75, SP.rand(0, 6)); W.addCollider(V3(x - 0.4, y, z - 0.4), V3(x + 0.4, y + h * 0.5, z + 0.4), 'wood'); }
function palm(I, W, x, z) { const y = W.heightAt(x, z), h = SP.rand(7, 12); I.add('ptrunk', uCyl, palmT, x, y - 0.2, z, 0.45, h, 0.45); for (let k = 0; k < 6; k++) I.add('pleaf', uBox, palmL, x, y + h - 0.2, z, 0.9, 0.12, 5.5, k * 1.05); W.addCollider(V3(x - 0.3, y, z - 0.3), V3(x + 0.3, y + h, z + 0.3), 'wood'); }
SP.brBiome = biome;
})();

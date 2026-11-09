/* Survival Protocol 1.2 — Battle Royale island "Isla Corona": 6 km island, 36 named landmarks,
   floor-loot spawn points, launch pads, reboot vans and campfires. Seeded so every player in an online match
   builds the identical map. Also: collision grid, chunked terrain, static mesh merging and distance culling. */
'use strict';
(function () {
const T = THREE, { V3, lerp, clamp } = SP;
const geo = SP.geo, M = SP.M, Mods = SP.Models, B = SP.build, Maps = SP.Maps;
const S = 2.5, ISLAND = 2500, BOUNDS = 2900, SPAN = 6000;
SP.BR_SPAN = SPAN; SP.BR_ISLAND = ISLAND; SP.BR_ZR = 2150;

/* ---------- island outline (independent of landmarks, so coastal spots can be found first) ---------- */
function edgeR(x, z) { const a = Math.atan2(z, x); return ISLAND + Math.sin(a * 3 + 1) * 150 + Math.sin(a * 7 + 2) * 85 + SP.fbm(Math.cos(a) * 3 + 10, Math.sin(a) * 3 + 10, 3) * 260; }
const coastAt = (ang, inset) => { const r = edgeR(Math.cos(ang) * 100, Math.sin(ang) * 100) - inset; return { x: Math.round(Math.cos(ang) * r), z: Math.round(Math.sin(ang) * r) }; };

/* ---------- 36 named places ---------- */
const P0 = [
  ['Crown City', 0, 0, 'city', 150], ['Oasis Springs', 1300, 1350, 'oasis', 90], ['Dune Town', 1950, 400, 'town', 90], ['Rust Refinery', 900, 1800, 'refinery', 95],
  ['Skyline Airbase', -1600, -300, 'airbase', 150], ["Pharaoh's Ruins", 500, 1000, 'ruins', 80], ['Frostpeak Lodge', -350, -1750, 'lodge', 85], ['Viper Canyon', 1500, -950, 'canyon', 90],
  ['Greenfield Farms', -900, 1400, 'farm', 100], ['Ironworks', 750, -1600, 'factory', 100], ['Radio Ridge', -1100, -1175, 'radio', 60], ['Crown Palace', 300, -750, 'palace', 85],
  ['Lakeside Villas', -760, 330, 'villas', 70], ['Military Depot', 2050, -300, 'depot', 90], ['Sunset Motel', -1400, -1900, 'motel', 60],
  // new in 1.2
  ['Corona Stadium', -520, 760, 'stadium', 95], ['Funland Park', 620, 360, 'park', 95], ['Goldcrest Mansion', -150, -1020, 'mansion', 80], ['Royal Links Golf', -200, 1350, 'golf', 110],
  ['Titan Dam', -1350, 760, 'dam', 100], ['Junction Yard', 1400, -100, 'trainyard', 110], ['Blackstone Prison', -700, -700, 'prison', 90], ['Gale Ridge Wind Farm', 1700, -1700, 'wind', 120],
  ['Glacier Peak Resort', 420, -2000, 'ski', 100], ['Starfall Observatory', -1880, -1000, 'observatory', 70], ['Copperhead Mine', -2000, 300, 'mine', 85], ['Vault 9 Bunker', -430, -330, 'bunker', 60],
  ['Wreck of Flight 77', 1650, 760, 'crash', 90], ['Spice Bazaar', 1000, 780, 'bazaar', 80], ['Sunfield Solar', 1000, -640, 'solar', 100], ['Launchpad Omega', 0, 1850, 'space', 100],
];
SP.BRPOI = P0.map(([name, x, z, kind, r]) => ({ name, x, z, kind, r }));
// coastal landmarks sit just inside the shoreline
[['Beacon Point', 1.62, 'lighthouse', 70], ['Rusty Leviathan', 0.42, 'shipwreck', 80], ['Coral Cove', -2.45, 'cove', 85], ['Harbor Point', 2.56, 'harbor', 100], ['Smugglers Reef', -0.75, 'cove', 70]].forEach(([name, a, kind, r]) => { const c = coastAt(a, kind === 'harbor' ? 260 : 240); SP.BRPOI.push({ name, x: c.x, z: c.z, kind, r, coast: true }); });
const LAKE = { x: -825, z: -25, r: 200 };
const RESV = { x: -1350, z: 630, r: 115 }; // reservoir carved behind the dam (fills with sea-level water)

/* ---------- seeded random (all players build the same map) ---------- */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
SP.seeded = function (seed, fn) { const r0 = Math.random; Math.random = mulberry(seed >>> 0); try { return fn(); } finally { Math.random = r0; } };

/* ---------- road network: spokes from the city + each place to its two nearest neighbours ---------- */
const ROADS = []; const rk = new Set();
const addRoad = (a, b) => { const k = Math.min(a, b) + '-' + Math.max(a, b); if (a === b || rk.has(k)) return; rk.add(k); const A = SP.BRPOI[a], Bp = SP.BRPOI[b]; ROADS.push([A.x, A.z, Bp.x, Bp.z]); };
SP.BRPOI.forEach((p, i) => { const near = SP.BRPOI.map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.z - q.z) })).filter(o => o.j !== i).sort((a, b) => a.d - b.d); addRoad(i, near[0].j); if (near[1].d < 1100) addRoad(i, near[1].j); if (Math.hypot(p.x, p.z) < 1250 && i) addRoad(0, i); });
SP.BRROADS = ROADS;

/* ---------- spatial lookup so terrain queries only test nearby roads / places ---------- */
const QC = 150, qcache = new Map();
function segD(x, z, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - ax - dx * t, z - az - dz * t); }
function near(x, z) {
  const i = Math.floor(x / QC), j = Math.floor(z / QC), k = (i + 100) * 1000 + j + 100; let c = qcache.get(k); if (c) return c;
  const cx = (i + 0.5) * QC, cz = (j + 0.5) * QC, hd = QC * 0.75;
  c = { pois: SP.BRPOI.filter(p => Math.hypot(cx - p.x, cz - p.z) < p.r + 90 + hd), roads: ROADS.filter(r => segD(cx, cz, ...r) < 16 + hd) };
  qcache.set(k, c); return c;
}
function roadDist(x, z) { let best = 1e9; for (const r of near(x, z).roads) { const d = segD(x, z, r[0], r[1], r[2], r[3]); if (d < best) best = d; } return best; }
function biome(x, z) { // 0 grass, 1 desert, 2 snow-mountain, 3 forest
  if (z < -1075) return 2; if (x > 700 && z > -375) return 1; if (x < -375 && z > -875 && z < 950) return 3; return 0;
}
function rawH(x, z) {
  const r = Math.hypot(x, z), er = edgeR(x, z);
  let h = 8 + SP.fbm(x * 0.0009, z * 0.0009, 4) * 52 + SP.fbm(x * 0.004, z * 0.004, 3) * 9 + SP.fbm(x * 0.012, z * 0.012, 2) * 3.5;
  if (z < -950) { const k = SP.smooth(-950, -1600, z); h += k * (70 + SP.fbm(x * 0.0024 + 3, z * 0.0024, 4) * 150); }
  if (x > 700 && z > -375) h = lerp(h, 10 + Math.sin(x * 0.012 + z * 0.005) * 4 + SP.fbm(x * 0.0032, z * 0.0032, 3) * 16, SP.smooth(700, 950, x) * SP.smooth(-375, -125, z));
  const coast = er - r; if (coast < 400) h = lerp(-14, h, SP.smooth(-50, 400, coast));
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z); if (ld < LAKE.r + 150) h = lerp(-6, h, SP.smooth(LAKE.r - 40, LAKE.r + 150, ld));
  return h;
}
const flatOf = new Map();
function flatH(p) { if (flatOf.has(p)) return flatOf.get(p); const f = p.kind === 'canyon' ? rawH(p.x, p.z) - 14 : p.coast ? 3.2 : p.kind === 'observatory' || p.kind === 'radio' ? Math.max(6, rawH(p.x, p.z) + 6) : Math.max(3, rawH(p.x, p.z)); flatOf.set(p, f); return f; }
function terrainH(x, z) {
  let h = rawH(x, z); const N = near(x, z);
  for (const p of N.pois) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r + 90) h = lerp(flatH(p), h, SP.smooth(p.r, p.r + 90, d)); }
  if (N.roads.length) { const rd = roadDist(x, z); if (rd < 16) h = lerp(Math.max(h * 0.97, 1.6), h, SP.smooth(5, 16, rd)); }
  const rv = Math.hypot(x - RESV.x, z - RESV.z); if (rv < RESV.r + 60) h = lerp(-7, h, SP.smooth(RESV.r - 40, RESV.r + 60, rv));
  return h;
}
SP.brTerrainH = terrainH;
const PAVED = { city: 1, airbase: 1, depot: 1, factory: 1, harbor: 1, trainyard: 1, prison: 1, space: 1, stadium: 1, solar: 0, bunker: 1 };
function terrainColor(x, y, z, ny) {
  const b = biome(x, z); const v = 0.88 + SP.fbm(x * 0.03, z * 0.03, 2) * 0.22;
  let c = b === 1 ? [0.78, 0.62, 0.42] : b === 2 ? [0.42, 0.5, 0.3] : b === 3 ? [0.22, 0.38, 0.16] : [0.36, 0.52, 0.22];
  if (b === 2 && y > 85) c = [0.94, 0.95, 0.98]; else if (b === 2 && y > 55) c = lerpC([0.5, 0.48, 0.45], [0.94, 0.95, 0.98], (y - 55) / 30);
  const rk2 = clamp((0.86 - ny) * 4, 0, 1); c = lerpC(c, y > 85 ? [0.7, 0.72, 0.76] : [0.5, 0.46, 0.42], rk2);
  if (y < 3.5) c = lerpC([0.9, 0.82, 0.62], c, clamp((y - 1) / 2.5, 0, 1));
  if (y < 0.5) c = [0.62, 0.56, 0.42];
  const N = near(x, z);
  if (N.roads.length) { const rd = roadDist(x, z); if (rd < 6 && y > 1) c = lerpC([0.3, 0.29, 0.27], c, clamp((rd - 4) / 2, 0, 1)); }
  for (const p of N.pois) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r * 0.85 && PAVED[p.kind]) c = lerpC([0.42, 0.41, 0.39], c, clamp((d - p.r * 0.7) / (p.r * 0.15), 0, 1)); if (p.kind === 'golf' && d < p.r) c = lerpC([0.3, 0.62, 0.22], c, clamp((d - p.r * 0.85) / (p.r * 0.15), 0, 1)); }
  return c.map(k => k * v);
}
function lerpC(a, b, t) { t = clamp(t, 0, 1); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
SP.brMapColor = (x, z) => { const y = terrainH(x, z); if (y < 0) return y < -4 ? [0.12, 0.32, 0.5] : [0.2, 0.46, 0.6]; return terrainColor(x, y, z, 0.95); };

/* ---------- collision grid (tens of thousands of colliders on this map) ---------- */
function gridify(W, cell = 24) {
  const cells = new Map(); const K = (i, j) => (i + 2000) * 4001 + (j + 2000);
  const ins = c => { const b = c.box; c._k = []; for (let i = Math.floor(b.min.x / cell); i <= Math.floor(b.max.x / cell); i++) for (let j = Math.floor(b.min.z / cell); j <= Math.floor(b.max.z / cell); j++) { const k = K(i, j); let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(c); c._k.push(k); } };
  W.colliders.forEach(ins);
  const ac = W.addCollider.bind(W), cf = W.colliderFrom.bind(W);
  W.addCollider = (...a) => { const c = ac(...a); ins(c); return c; };
  W.colliderFrom = (...a) => { const c = cf(...a); ins(c); return c; };
  W.removeCollider = c => { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); (c._k || []).forEach(k => { const a = cells.get(k); if (a) { const j = a.indexOf(c); if (j >= 0) a.splice(j, 1); } }); };
  let stamp = 1;
  const nearC = (x0, x1, z0, z1, fn) => { stamp++; for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) { const a = cells.get(K(i, j)); if (a) for (const c of a) { if (c._s === stamp) continue; c._s = stamp; fn(c); } } };
  W.groundAt = function (x, z, y = 1e4, r = 0.25) { let h = this.heightAt(x, z); nearC(x - r, x + r, z - r, z + r, c => { const b = c.box; if (c.noStand) return; if (x > b.min.x - r && x < b.max.x + r && z > b.min.z - r && z < b.max.z + r && b.max.y <= y + 0.55 && b.max.y > h) h = b.max.y; }); return h; };
  W.push = function (pos, r, feet, height) {
    nearC(pos.x - r, pos.x + r, pos.z - r, pos.z + r, c => {
      const b = c.box; if (feet >= b.max.y - 0.5 || feet + height <= b.min.y) return;
      const cx = clamp(pos.x, b.min.x, b.max.x), cz = clamp(pos.z, b.min.z, b.max.z); const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) { if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + dx / d * r; pos.z = cz + dz / d * r; } else { const o = [[b.min.x - r - pos.x, 0], [b.max.x + r - pos.x, 0], [0, b.min.z - r - pos.z], [0, b.max.z + r - pos.z]].sort((a, c2) => Math.abs(a[0] + a[1]) - Math.abs(c2[0] + c2[1]))[0]; pos.x += o[0]; pos.z += o[1]; } }
    });
    const Bd = this.bounds; pos.x = clamp(pos.x, -Bd, Bd); pos.z = clamp(pos.z, -Bd, Bd);
  };
  const ray = new T.Ray(), tv = new T.Vector3();
  W.ray = function (origin, dir, maxT = 600, ignore) {
    ray.origin.copy(origin); ray.direction.copy(dir); let best = maxT, hit = null;
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

/* ---------- merge static meshes into a few big ones per area (draw calls), distance-culled ---------- */
function mergeStatic(W, tile = 260) {
  const groups = new Map(); const kill = [];
  W.scene.updateMatrixWorld(true);
  W.scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isPoints || o.userData.terrain) return;
    let p = o; while (p) { if (p.userData && p.userData.noMerge) return; p = p.parent; }
    const m = o.material; if (!m || Array.isArray(m) || m.transparent || m.vertexColors || m.isShaderMaterial || !o.geometry || !o.geometry.attributes.position || o.geometry.morphAttributes.position) return;
    const pos = new T.Vector3(); o.getWorldPosition(pos); const key = [m.map ? m.map.uuid : '-', m.color ? m.color.getHexString() : '', (m.roughness || 0).toFixed(2), (m.metalness || 0).toFixed(2), m.emissive ? m.emissive.getHexString() : '', m.side, Math.floor(pos.x / tile), Math.floor(pos.z / tile), o.castShadow ? 1 : 0].join('|');
    let g = groups.get(key); if (!g) groups.set(key, g = { mat: m, list: [], cast: o.castShadow });
    g.list.push(o); kill.push(o);
  });
  let made = 0;
  for (const g of groups.values()) {
    if (g.list.length < 2) { const i = kill.indexOf(g.list[0]); if (i >= 0) kill.splice(i, 1); else continue; W.cull.push({ o: g.list[0], r: 40 }); continue; }
    let n = 0; const parts = g.list.map(o => { let gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); gg.applyMatrix4(o.matrixWorld); n += gg.attributes.position.count; return gg; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let off = 0;
    for (const gg of parts) { const c = gg.attributes.position.count; P.set(gg.attributes.position.array, off * 3); if (gg.attributes.normal) N.set(gg.attributes.normal.array, off * 3); if (gg.attributes.uv) U.set(gg.attributes.uv.array, off * 2); off += c; gg.dispose(); }
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(P, 3)); bg.setAttribute('normal', new T.BufferAttribute(N, 3)); bg.setAttribute('uv', new T.BufferAttribute(U, 2)); bg.computeBoundingSphere(); bg.computeBoundingBox();
    const mesh = new T.Mesh(bg, g.mat); mesh.castShadow = g.cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; W.scene.add(mesh); made++;
    W.cull.push({ o: mesh, c: bg.boundingSphere.center.clone(), r: bg.boundingSphere.radius });
  }
  for (const o of kill) { o.visible = false; if (o.parent) o.parent.remove(o); }
  return { merged: kill.length, made };
}
// hide things far from the camera (run a few times a second by the mode)
SP.brCull = function (W, cam, far = 1750) {
  if (!W || !W.cull) return; const p = cam.position;
  for (const it of W.cull) { const c = it.c || it.o.position; const d = Math.hypot(c.x - p.x, c.z - p.z) - (it.r || 0); it.o.visible = d < (it.far || far); }
};

/* ---------- instanced vegetation + props, one InstancedMesh per 1 km tile so culling works ---------- */
function Inst(W) {
  const lists = {}; const TILE = 1000; const I = {
    add(key, geom, mat, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, cast = true) { const tk = key + '@' + Math.floor(x / TILE) + ',' + Math.floor(z / TILE); const L = lists[tk] || (lists[tk] = { geom, mat, m: [], cast, tx: Math.floor(x / TILE), tz: Math.floor(z / TILE), far: key === 'crop' || key === 'bush' || key === 'flower' ? 900 : 1600 }); const o = new T.Object3D(); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.y = ry; o.updateMatrix(); L.m.push(o.matrix.clone()); },
    build() { for (const k in lists) { const L = lists[k]; if (!L.m.length) continue; const g = L.geom.clone(); const cx = (L.tx + 0.5) * TILE, cz = (L.tz + 0.5) * TILE; g.boundingSphere = new T.Sphere(V3(cx, 40, cz), TILE * 0.75 + 60); const im = new T.InstancedMesh(g, L.mat, L.m.length); L.m.forEach((mm, i) => im.setMatrixAt(i, mm)); im.castShadow = L.cast; im.receiveShadow = true; im.userData.noMerge = true; W.scene.add(im); W.cull.push({ o: im, c: V3(cx, 0, cz), r: TILE * 0.7, far: L.far }); } },
  }; return I;
}
const uBox = new T.BoxGeometry(1, 1, 1); uBox.translate(0, 0.5, 0);
const uCyl = new T.CylinderGeometry(0.5, 0.5, 1, 8); uCyl.translate(0, 0.5, 0);
const uCone = new T.ConeGeometry(0.5, 1, 9); uCone.translate(0, 0.5, 0);
const uSph = new T.IcosahedronGeometry(0.5, 1); uSph.translate(0, 0.5, 0);
const uRock = new T.DodecahedronGeometry(0.5, 0); uRock.translate(0, 0.3, 0);

/* ---------- chunked terrain: one height grid, 6x6 meshes with matching normals ---------- */
function buildTerrain(W) {
  const N = 504, size = SPAN, step = size / N, half = size / 2; const H = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H[j * (N + 1) + i] = terrainH(-half + i * step, -half + j * step);
  const h = (i, j) => H[clamp(j, 0, N) * (N + 1) + clamp(i, 0, N)];
  const tm = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const CH = 6, cs = N / CH; let made = 0;
  for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
    let maxH = -99; for (let j = cj * cs; j <= (cj + 1) * cs; j += 4) for (let i = ci * cs; i <= (ci + 1) * cs; i += 4) maxH = Math.max(maxH, h(i, j)); if (maxH < -2) continue;
    const vn = (cs + 1) * (cs + 1), P = new Float32Array(vn * 3), Nn = new Float32Array(vn * 3), C = new Float32Array(vn * 3), U = new Float32Array(vn * 2); let v = 0;
    for (let j = 0; j <= cs; j++) for (let i = 0; i <= cs; i++) { const gi = ci * cs + i, gj = cj * cs + j; const x = -half + gi * step, z = -half + gj * step, y = h(gi, gj);
      const nx = h(gi - 1, gj) - h(gi + 1, gj), nz = h(gi, gj - 1) - h(gi, gj + 1), ny = 2 * step, L = Math.hypot(nx, ny, nz);
      P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z; Nn[v * 3] = nx / L; Nn[v * 3 + 1] = ny / L; Nn[v * 3 + 2] = nz / L; U[v * 2] = x / 4; U[v * 2 + 1] = z / 4;
      const c = terrainColor(x, y, z, ny / L); C[v * 3] = c[0]; C[v * 3 + 1] = c[1]; C[v * 3 + 2] = c[2]; v++; }
    const idx = []; for (let j = 0; j < cs; j++) for (let i = 0; i < cs; i++) { const a = j * (cs + 1) + i, b = a + 1, c = a + cs + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(Nn, 3)); g.setAttribute('color', new T.BufferAttribute(C, 3)); g.setAttribute('uv', new T.BufferAttribute(U, 2)); g.setIndex(idx); g.computeBoundingSphere();
    const m = new T.Mesh(g, tm); m.receiveShadow = true; m.userData.terrain = true; m.userData.noMerge = true; W.scene.add(m); made++; if (!W.terrainMesh) W.terrainMesh = m;
  }
  return made;
}

/* ---------- the island ---------- */
Maps.br2 = function (W, part) {
  const seed = (part && part.seed) || 1337;
  return SP.seeded(seed, () => buildIsland(W));
};
function buildIsland(W) {
  W.terrainH = terrainH; W.surface = 'sand'; W.bounds = BOUNDS; W.cull = []; W.anims = []; W.pads = []; W.vans = []; W.fires = []; W.floor = [];
  W.surfaceFn = (x, z) => { const b = biome(x, z); return b === 1 ? 'sand' : b === 2 && terrainH(x, z) > 70 ? 'snow' : 'dirt'; };
  buildTerrain(W);
  const water = new T.Mesh(new T.PlaneGeometry(16000, 16000), new T.MeshStandardMaterial({ color: SP.lin(0x1f6a8a), roughness: 0.06, metalness: 0.25, envMapIntensity: 1.6 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.2; water.userData.noMerge = true; W.scene.add(water); W.water = water;
  const I = Inst(W); I.mats = { glass: new T.MeshStandardMaterial({ color: SP.lin(0x1c2228), roughness: 0.12, metalness: 0.6, envMapIntensity: 1.4 }), lit: new T.MeshStandardMaterial({ color: 0x302010, emissive: SP.lin(0xffc078), emissiveIntensity: 0.2, roughness: 0.4 }), bal: SP.mat('metal', { color: 0x2c2c2a, roughness: 0.5, metalness: 0.6 }), shut: SP.flat(0x2f5a6a, 0.8), tank: SP.flat(0xd8d2c6, 0.6, 0.2), ac: SP.flat(0x9a9a96, 0.5, 0.3) };
  const loot = (x, z, y) => W.loot.push(V3(x, y != null ? y : W.heightAt(x, z), z));
  const floor = (x, z, y, tier) => W.floor.push({ p: V3(x, y != null ? y : W.groundAt(x, z, 1e4), z), tier: tier || 0 });
  const flr = (x, z, n, r, tier) => { for (let k = 0; k < n; k++) floor(x + SP.rand(-r, r), z + SP.rand(-r, r), null, tier); };
  W.loot = []; W.vendors = [];
  const tints = [0xe8dcc8, 0xd8c8a8, 0xcab89a, 0xf0e4cc, 0xc8d4dc, 0xe0c8b8, 0xd0d8c0];
  const house = (x, z, w, d, h, o = {}) => { const r = B.house(W, x, z, w, d, h, Object.assign({ door: SP.pick(['s', 'n', 'e', 'w']), tint: SP.pick(tints) }, o)); loot(x + SP.rand(-w / 4, w / 4), z + SP.rand(-d / 4, d / 4), r.base + 0.2); floor(x + SP.rand(-w / 3, w / 3), z + SP.rand(-d / 3, d / 3), r.base + 0.05); if (Math.random() < 0.6) floor(x + SP.rand(-w / 3, w / 3), z + SP.rand(-d / 3, d / 3), r.base + 0.05); return r; };
  const mat = { metal: SP.mat('corrugated', { color: 0x8a8e88, roughness: 0.6, metalness: 0.4 }), conc: SP.mat('concrete', { color: 0xb8b2a6 }), dark: SP.flat(0x2a2a2a, 0.6, 0.4), red: SP.flat(0x9a2a22, 0.7), white: SP.mat('concrete', { color: 0xe8e4dc }), steel: SP.mat('metal', { color: 0x9aa0a4, roughness: 0.4, metalness: 0.7 }), wood: SP.mat('wood', { color: 0x7a5a3a }), glow: SP.flat(0xffffff, 0.4, 0, { emissive: SP.lin(0xffe6a0), emissiveIntensity: 2.2 }) };
  const shed = (x, z, w, d, h, m = mat.metal) => { const y = W.heightAt(x, z) - 0.2; W.box(w, 0.3, d, x, y + h, z, m, { uv: 3 }); W.box(0.4, h, d, x - w / 2, y, z, m, { uv: 3 }); W.box(0.4, h, d, x + w / 2, y, z, m, { uv: 3 }); W.box(w, h, 0.4, x, y, z - d / 2, m, { uv: 3 }); W.box(w * 0.3, h, 0.4, x - w * 0.35, y, z + d / 2, m, { uv: 3 }); W.box(w * 0.3, h, 0.4, x + w * 0.35, y, z + d / 2, m, { uv: 3 }); loot(x, z, y + 0.3); loot(x + w / 4, z - d / 4, y + 0.3); for (let k = 0; k < 3; k++) floor(x + SP.rand(-w / 2 + 1.5, w / 2 - 1.5), z + SP.rand(-d / 2 + 1.5, d / 2 - 1.5), y + 0.25); };
  const vendor = (x, z, kind) => W.vendors.push({ pos: V3(x, W.heightAt(x, z), z), kind });
  const pad = (x, z) => W.pads.push(V3(x, W.groundAt(x, z), z));
  const van = (x, z, ry = 0) => W.vans.push({ pos: V3(x, W.heightAt(x, z), z), ry });
  const fire = (x, z) => W.fires.push(V3(x, W.heightAt(x, z), z));
  const cyl = (rt, rb, h, x, y, z, m, seg = 20, col = true) => { const o = M(geo.cyl(rt, rb, h, seg), m, x, y + h / 2, z, W.scene); if (col) { const r = Math.max(rt, rb) * 0.9; W.addCollider(V3(x - r, y, z - r), V3(x + r, y + h, z + r), 'metal'); } return o; };

  for (const P of SP.BRPOI) {
    const { x: px, z: pz } = P; const y0 = W.heightAt(px, pz);
    const K = P.kind;
    if (K === 'city') {
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        if (i === 0 && j === 0) continue; const bx = px + i * 40, bz = pz + j * 40; if (Math.hypot(i, j) > 3.6) continue;
        const fl = Math.max(2, Math.round(10 - Math.hypot(i, j) * 2 + SP.rand(-1, 2))); const w = SP.rand(20, 28), d = SP.rand(20, 28);
        building(W, I, bx, bz, w, d, fl, SP.pick(tints));
        loot(bx + w / 2 + 3, bz + SP.rand(-8, 8)); if (Math.random() < 0.5) loot(bx - w / 2 - 3, bz + SP.rand(-8, 8));
        floor(bx + w / 2 + 2.5, bz + SP.rand(-9, 9)); floor(bx - w / 2 - 2.5, bz + SP.rand(-9, 9)); floor(bx + SP.rand(-9, 9), bz + d / 2 + 2.5);
        if (Math.random() < 0.35) parked(W, bx + w / 2 + 6, bz + SP.rand(-10, 10), Math.PI / 2);
      }
      M(geo.cyl(9, 9.5, 0.8, 32), mat.white, px, y0 + 0.4, pz, W.scene); const fw = M(new T.CylinderGeometry(8, 8, 0.1, 32), new T.MeshStandardMaterial({ color: SP.lin(0x2a6a8a), roughness: 0.05, metalness: 0.2 }), px, y0 + 0.82, pz, W.scene); fw.userData.noMerge = true;
      W.addCollider(V3(px - 9, y0, pz - 9), V3(px + 9, y0 + 0.8, pz + 9), 'hard'); W.box(1.6, 6, 1.6, px, y0 + 0.8, pz, SP.mat('metal', { color: 0x8a7a40, metalness: 0.8, roughness: 0.3 }), { uv: 1 });
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; loot(px + Math.cos(a) * 14, pz + Math.sin(a) * 14); floor(px + Math.cos(a + 0.4) * 16, pz + Math.sin(a + 0.4) * 16); }
      vendor(px + 12, pz + 12, 'arms'); vendor(px - 12, pz - 12, 'merc'); pad(px + 20, pz - 2); van(px - 20, pz + 6, 0.4);
    }
    if (K === 'oasis') {
      const lake = new T.Mesh(new T.CircleGeometry(28, 40), new T.MeshStandardMaterial({ color: SP.lin(0x1e6a7a), roughness: 0.05, metalness: 0.2, envMapIntensity: 1.5 })); lake.rotation.x = -Math.PI / 2; lake.position.set(px, y0 + 0.15, pz); lake.userData.noMerge = true; W.scene.add(lake);
      for (let k = 0; k < 30; k++) { const a = k / 30 * 6.28, r = SP.rand(32, 50); palm(I, W, px + Math.cos(a) * r, pz + Math.sin(a) * r); }
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28 + 0.3; house(px + Math.cos(a) * 62, pz + Math.sin(a) * 62, SP.rand(8, 11), SP.rand(7, 9), 3.4); }
      vendor(px + 36, pz, 'arms'); fire(px - 34, pz + 4); pad(px, pz + 40);
    }
    if (K === 'town') {
      for (let k = 0; k < 20; k++) { const hx = px + (k % 5 - 2) * 18 + SP.rand(-2, 2), hz = pz + (Math.floor(k / 5) - 1.5) * 19 + SP.rand(-2, 2); house(hx, hz, SP.rand(8, 11), SP.rand(7, 9), Math.random() < 0.3 ? 6.4 : 3.4); }
      B.tower(W, px + 54, pz, 9); loot(px + 54, pz + 3); vendor(px, pz + 44, 'merc'); van(px - 52, pz + 10, 1.2);
    }
    if (K === 'refinery') {
      for (let k = 0; k < 6; k++) { const x = px - 40 + k * 16, z = pz - 20; const y = W.heightAt(x, z); cyl(6, 6, 12, x, y, z, SP.mat('metal', { color: 0xd8d4c8, metalness: 0.4 }), 22); loot(x, z + 9); floor(x + 7, z + 7); }
      for (let k = 0; k < 3; k++) { const x = px - 30 + k * 30, z = pz + 30; W.box(1.6, 26, 1.6, x, W.heightAt(x, z), z, mat.red, { uv: 2 }); }
      shed(px + 50, pz + 20, 22, 14, 7); shed(px - 55, pz + 25, 18, 12, 6); vendor(px, pz + 50, 'arms'); pad(px - 20, pz + 45);
      for (let k = 0; k < 6; k++) B.container(W, px - 50 + k * 8, pz + 55, 0, SP.pick([0x34505e, 0x7a4232, 0x5c6a3e]));
    }
    if (K === 'airbase') {
      W.box(26, 0.12, 240, px + 60, y0 - 0.05, pz, SP.mat('concrete', { color: 0x5a5a58 }), { uv: 8, collide: false });
      for (let k = 0; k < 12; k++) W.box(1, 0.13, 8, px + 60, y0 - 0.04, pz - 110 + k * 20, mat.white, { collide: false });
      for (let k = 0; k < 3; k++) { const hz = pz - 70 + k * 60; hangar(W, px - 20, hz); loot(px - 20, hz); loot(px - 26, hz + 8); flr(px - 20, hz, 4, 12, 1); }
      B.tower(W, px + 20, pz + 100, 12); loot(px + 20, pz + 103);
      const h = Mods.heli(); h.position.set(px + 30, y0, pz - 30); h.userData.noMerge = true; W.scene.add(h); W.colliderFrom(h, 'metal', 0.4); W.cull.push({ o: h, r: 10 });
      for (let k = 0; k < 20; k++) B.hesco(W, px - 60 + k * 6.5, pz - 140, 4);
      vendor(px - 40, pz + 100, 'arms'); vendor(px - 40, pz - 100, 'merc'); pad(px + 60, pz + 130); van(px - 50, pz + 40, 0);
    }
    if (K === 'ruins') {
      for (let k = 0; k < 40; k++) { const x = px + SP.rand(-55, 55), z = pz + SP.rand(-55, 55); const h = SP.rand(1, 8); M(geo.cyl(0.55, 0.6, h, 12), SP.mat('concrete', { color: 0xd8c8a8 }), x, W.heightAt(x, z) + h / 2, z, W.scene); W.addCollider(V3(x - 0.55, W.heightAt(x, z), z - 0.55), V3(x + 0.55, W.heightAt(x, z) + h, z + 0.55), 'hard'); }
      W.box(14, 10, 4, px, y0 - 0.2, pz - 40, SP.mat('concrete', { color: 0xd0bc98 }), { uv: 3 });
      for (let k = 0; k < 6; k++) { const s = 34 - k * 6; W.box(s, 3, s, px + 30, y0 - 0.5 + k * 3, pz + 30, SP.mat('concrete', { color: 0xd8bc8a }), { uv: 4 }); } loot(px + 30, pz + 30, y0 + 17.5); floor(px + 30, pz + 30, y0 + 17.55, 2);
      for (let k = 0; k < 10; k++) loot(px + SP.rand(-45, 45), pz + SP.rand(-45, 45)); flr(px, pz, 12, 50); vendor(px - 30, pz + 20, 'merc');
    }
    if (K === 'lodge') {
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; house(px + Math.cos(a) * 40, pz + Math.sin(a) * 40, 10, 9, 6.4, { tint: SP.pick([0x6a4a32, 0x7a5a3a, 0x5a3a28]) }); }
      W.box(24, 9, 16, px, y0 - 0.2, pz, SP.mat('wood', { color: 0x6a4a30 }), { uv: 3 }); loot(px + 14, pz); loot(px - 14, pz);
      for (let k = 0; k < 60; k++) { const a = SP.rand(0, 6.28), r = SP.rand(60, 120); pine(I, W, px + Math.cos(a) * r, pz + Math.sin(a) * r, true); }
      vendor(px, pz + 20, 'arms'); fire(px + 6, pz + 22); van(px - 22, pz + 18, 0.2);
    }
    if (K === 'harbor') {
      for (let k = 0; k < 24; k++) { const cx = px - 30 + (k % 6) * 9, cz = pz - 20 + Math.floor(k / 6) * 12; B.container(W, cx, cz, Math.PI / 2, SP.pick([0x34505e, 0x7a4232, 0x5c6a3e, 0x8a6a2a, 0x2a4a7a])); if (k % 3 === 0) loot(cx + 4, cz); floor(cx + 4.4, cz + 5); }
      const out = V3(px, 0, pz).normalize(); for (let k = 0; k < 3; k++) { const x = px + out.x * (128 + k * 6) + out.z * (k - 1) * 22, z = pz + out.z * (128 + k * 6) - out.x * (k - 1) * 22; W.box(10, 0.6, 10, x, 2.5, z, SP.mat('wood', { color: 0x6a5238 }), { uv: 3 }); loot(x, z, 3.1); }
      shed(px + 40, pz - 30, 28, 18, 9); W.box(3, 30, 3, px + 20, y0, pz + 30, mat.red, { uv: 2 }); W.box(26, 2, 2, px + 30, y0 + 30, pz + 30, mat.red, { uv: 2 });
      vendor(px + 30, pz + 10, 'merc'); van(px - 40, pz - 30, 1.5); pad(px + 10, pz - 40);
    }
    if (K === 'canyon') {
      for (let k = 0; k < 36; k++) B.rock(W, px + SP.rand(-70, 70), pz + SP.rand(-70, 70), SP.rand(2, 7));
      for (let k = 0; k < 4; k++) { shed(px - 30 + k * 20, pz + 25, 12, 10, 5, SP.mat('corrugated', { color: 0x9a7a4a })); }
      const t = Mods.truck('cargo', 0xb89a3a); t.position.set(px, W.heightAt(px, pz), pz - 10); W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); loot(px + 4, pz - 10);
      vendor(px - 20, pz - 30, 'arms'); pad(px + 30, pz - 30); fire(px - 4, pz + 4);
    }
    if (K === 'farm') {
      for (let k = 0; k < 6; k++) house(px - 50 + k * 20, pz - 20, 9, 8, 3.4);
      barn(W, px + 20, pz + 30); loot(px + 20, pz + 30); loot(px + 14, pz + 34); flr(px + 20, pz + 30, 4, 7);
      for (let k = 0; k < 14; k++) { const fx = px + SP.rand(-90, 90), fz = pz + SP.rand(40, 90); I.add('crop', uBox, SP.flat(SP.pick([0x6a7a3a, 0x8a8a3a, 0x5a7a2a]), 1), fx, W.heightAt(fx, fz), fz, 16, 0.6, 10, SP.rand(0, 3), false); }
      vendor(px - 30, pz + 20, 'merc'); fire(px - 10, pz + 12); van(px + 50, pz - 5, 0);
    }
    if (K === 'factory') {
      shed(px, pz, 50, 30, 12); shed(px + 50, pz - 30, 30, 22, 9); shed(px - 45, pz + 30, 26, 18, 8);
      for (let k = 0; k < 3; k++) { const x = px - 30 + k * 12, z = pz - 40; W.box(3, 32, 3, x, W.heightAt(x, z), z, SP.mat('concrete', { color: 0x8a5a4a }), { uv: 2 }); }
      for (let k = 0; k < 8; k++) B.container(W, px + 40 + (k % 4) * 8, pz + 30 + Math.floor(k / 4) * 12, 0, SP.pick([0x34505e, 0x7a4232]));
      vendor(px - 20, pz + 25, 'arms'); van(px + 10, pz + 40, 0); pad(px - 60, pz - 20);
    }
    if (K === 'radio') {
      W.box(1, 50, 1, px, y0, pz, SP.mat('metal', { color: 0xc04030 }), { uv: 1 }); for (let k = 0; k < 3; k++) W.box(0.2, 0.2, 30, px, y0 + 15 + k * 12, pz, mat.dark, { collide: false });
      house(px + 14, pz + 10, 12, 9, 3.6, { tint: 0xa0a4a8 }); house(px - 14, pz - 8, 9, 8, 3.4); B.sandbags(W, px - 6, pz + 14, 6, 3); loot(px + 4, pz + 4); pad(px + 4, pz - 20);
    }
    if (K === 'palace') {
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const wx = px + Math.cos(a) * 55, wz = pz + Math.sin(a) * 55; W.box(k % 2 ? 110 : 3, 7, k % 2 ? 3 : 110, wx, W.heightAt(wx, wz) - 0.3, wz, SP.mat('plaster', { color: 0xe8d8b8 }), { uv: 4 }); }
      W.box(14, 7, 3.2, px, y0 - 0.3, pz + 55, SP.mat('plaster', { color: 0xe8d8b8 }), { uv: 3, collide: false });
      W.box(40, 14, 28, px, y0 - 0.2, pz - 10, SP.mat('plaster', { color: 0xf0e4cc }), { uv: 4 }); W.box(12, 10, 12, px, y0 + 13.8, pz - 10, SP.mat('metal', { color: 0xc8a040, metalness: 0.9, roughness: 0.25 }), { uv: 1 });
      for (let k = 0; k < 4; k++) { const x = px + (k % 2 ? 46 : -46), z = pz + (k < 2 ? 46 : -46); B.tower(W, x, z, 10); loot(x, z + 3); }
      for (let k = 0; k < 8; k++) loot(px + SP.rand(-40, 40), pz + SP.rand(10, 45)); flr(px, pz + 28, 10, 40, 1); for (let k = 0; k < 12; k++) palm(I, W, px + SP.rand(-45, 45), pz + SP.rand(20, 48));
      vendor(px + 20, pz + 30, 'arms'); vendor(px - 20, pz + 30, 'merc');
    }
    if (K === 'villas') {
      for (let k = 0; k < 10; k++) { const a = k / 10 * 4.4 + 0.9; const hx = LAKE.x + Math.cos(a) * (LAKE.r + 45), hz = LAKE.z + Math.sin(a) * (LAKE.r + 45); house(hx, hz, 12, 10, 6.4, { tint: SP.pick([0xf4f0e8, 0xe8f0f4, 0xf0e0d0]) }); }
      vendor(px, pz + 30, 'arms'); pad(px + 30, pz);
    }
    if (K === 'depot') {
      for (let k = 0; k < 22; k++) B.hesco(W, px - 70 + k * 6.5, pz - 70, 4); for (let k = 0; k < 22; k++) B.hesco(W, px - 70, pz - 70 + k * 6.5, 4, Math.PI / 2);
      shed(px, pz - 20, 34, 20, 9, SP.mat('corrugated', { color: 0x6a7060 })); shed(px + 35, pz + 25, 22, 14, 7, SP.mat('corrugated', { color: 0x6a7060 }));
      for (let k = 0; k < 6; k++) { B.container(W, px - 40 + k * 8, pz + 40, 0, 0x5c6a3e); loot(px - 40 + k * 8, pz + 34); floor(px - 37 + k * 8, pz + 33, null, 1); }
      B.tower(W, px + 60, pz + 60, 10); B.tower(W, px - 60, pz + 60, 10); vendor(px, pz + 10, 'merc'); van(px + 50, pz - 40, 0);
    }
    if (K === 'motel') {
      W.box(56, 4, 10, px, y0 - 0.2, pz - 10, SP.mat('plaster', { color: 0xe8b890 }), { uv: 4 }); for (let k = 0; k < 8; k++) { loot(px - 24 + k * 7, pz - 3); floor(px - 21 + k * 7, pz - 2.5); }
      W.box(1, 9, 1, px + 30, y0, pz + 10, mat.dark, { uv: 1 }); W.box(8, 3, 0.4, px + 30, y0 + 9, pz + 10, SP.flat(0xe05040, 0.5, 0, { emissive: SP.lin(0xff6040), emissiveIntensity: 0.8 }), { collide: false });
      house(px - 30, pz + 20, 10, 8, 3.4); for (let k = 0; k < 4; k++) parked(W, px - 18 + k * 10, pz + 8, 0); fire(px + 10, pz + 24);
    }
    /* ---- new landmarks (1.2) ---- */
    if (K === 'stadium') { // oval bowl of stands around a pitch
      const pitch = SP.flat(0x3e8a34, 1); W.box(68, 0.08, 44, px, y0 - 0.02, pz, pitch, { collide: false }); W.box(0.4, 0.09, 44, px, y0 - 0.01, pz, mat.white, { collide: false });
      for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283; const rx = Math.cos(a) * 52, rz = Math.sin(a) * 36; for (let s = 0; s < 4; s++) W.box(10, 1.4, 3, px + rx * (1 + s * 0.07), y0 - 0.2 + s * 1.4, pz + rz * (1 + s * 0.1), SP.flat(s % 2 ? 0xc8c4bc : 0xd84a3a, 0.8), { ry: -a + Math.PI / 2 }); if (k % 7 === 0) { cyl(0.5, 0.5, 28, px + rx * 1.42, y0, pz + rz * 1.48, mat.steel, 8); W.box(5, 2, 0.6, px + rx * 1.42, y0 + 28, pz + rz * 1.48, mat.glow, { collide: false, ry: -a + Math.PI / 2 }); } }
      for (let k = 0; k < 6; k++) loot(px + SP.rand(-28, 28), pz + SP.rand(-16, 16)); flr(px, pz, 14, 30); for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; floor(px + Math.cos(a) * 60, pz + Math.sin(a) * 44, null, 1); }
      W.box(4, 2.6, 2, px - 34, y0, pz, mat.white); W.box(4, 2.6, 2, px + 34, y0, pz, mat.white); vendor(px, pz + 26, 'arms'); pad(px + 70, pz); van(px - 70, pz + 10, 1.5);
    }
    if (K === 'park') { // theme park: ferris wheel (turns), coaster, stalls
      const wheel = new T.Group(); wheel.position.set(px - 30, y0 + 24, pz); wheel.userData.noMerge = true; W.scene.add(wheel);
      const rim = new T.Mesh(new T.TorusGeometry(20, 0.5, 6, 48), SP.flat(0xe84a8a, 0.5, 0.3)); rim.rotation.y = Math.PI / 2; wheel.add(rim);
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; const sp = new T.Mesh(SP.geo.box(0.3, 40, 0.3), SP.flat(0xf0f0f0, 0.5, 0.4)); sp.rotation.x = a; wheel.add(sp); const cab = new T.Mesh(SP.geo.box(2.4, 2.2, 2.4), SP.flat([0xf2c14a, 0x4ab0f2, 0x6ad46a, 0xf26a4a][k % 4], 0.6)); cab.position.set(0, Math.cos(a) * 20, Math.sin(a) * 20); wheel.add(cab); }
      W.anims.push(dt => { wheel.rotation.x += dt * 0.12; wheel.children.forEach(c => { if (c.geometry && c.geometry.parameters && c.geometry.parameters.width === 2.4) c.rotation.x = -wheel.rotation.x; }); });
      W.box(2, 24, 2, px - 30, y0, pz - 6, mat.steel); W.box(2, 24, 2, px - 30, y0, pz + 6, mat.steel); W.cull.push({ o: wheel, r: 30 });
      for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283; const x = px + 30 + Math.cos(a) * 26, z = pz + Math.sin(a * 2) * 14; const h = 6 + Math.sin(a * 3) * 5 + 5; W.box(0.6, h, 0.6, x, W.heightAt(x, z), z, SP.flat(0x3a6ad8, 0.5, 0.5)); W.box(3, 0.4, 3, x, W.heightAt(x, z) + h, z, SP.flat(0xd8d8d8, 0.5, 0.5), { collide: false }); }
      for (let k = 0; k < 8; k++) { const x = px - 40 + k * 11, z = pz + 40; W.box(6, 3, 4, x, W.heightAt(x, z), z, SP.flat([0xf2c14a, 0xe84a8a, 0x4ab0f2, 0x6ad46a][k % 4], 0.8)); W.box(7, 0.3, 5, x, W.heightAt(x, z) + 3, z, SP.flat(0xffffff, 0.8), { collide: false }); loot(x, z - 3.5); floor(x + 1.5, z - 3.4); }
      flr(px, pz, 10, 45); vendor(px + 10, pz - 20, 'merc'); pad(px, pz - 46);
    }
    if (K === 'mansion') {
      W.box(46, 8, 24, px, y0 - 0.2, pz, SP.mat('plaster', { color: 0xf2ece0 }), { uv: 4 }); W.box(48, 0.6, 26, px, y0 + 7.8, pz, SP.flat(0x3a3a44, 0.7), { collide: false });
      for (let k = 0; k < 6; k++) cyl(0.7, 0.8, 7.8, px - 15 + k * 6, y0, pz + 14, mat.white, 12);
      W.box(20, 0.6, 6, px, y0 + 7.8, pz + 15, mat.white, { collide: false }); house(px - 36, pz + 10, 12, 10, 3.6, { tint: 0xf2ece0 }); house(px + 36, pz + 10, 12, 10, 3.6, { tint: 0xf2ece0 });
      const pool = M(geo.box(16, 0.1, 8), new T.MeshStandardMaterial({ color: SP.lin(0x3ab0d8), roughness: 0.05 }), px, y0 + 0.06, pz + 30, W.scene); pool.userData.noMerge = true; W.box(18, 0.2, 10, px, y0 - 0.15, pz + 30, mat.white, { collide: false });
      loot(px, pz + 18); loot(px - 20, pz + 18); loot(px + 20, pz + 18); loot(px, pz, y0 + 8.4); flr(px, pz + 24, 8, 22, 1); for (let k = 0; k < 16; k++) roundTree(I, W, px + SP.rand(-60, 60), pz - SP.rand(22, 60));
      vendor(px + 26, pz + 32, 'arms'); van(px - 30, pz + 40, 0);
    }
    if (K === 'golf') {
      house(px, pz - 70, 18, 12, 3.6, { tint: 0xe8e0cc }); loot(px, pz - 70); flr(px, pz - 70, 3, 5);
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; const x = px + Math.cos(a) * 70, z = pz + Math.sin(a) * 60; W.box(0.08, 3, 0.08, x, W.heightAt(x, z), z, mat.white, { collide: false }); W.box(0.8, 0.5, 0.04, x + 0.4, W.heightAt(x, z) + 2.5, z, SP.flat(0xe82a2a, 0.8), { collide: false }); floor(x + 3, z + 3); if (k % 3 === 0) loot(x - 3, z - 3); }
      for (let k = 0; k < 4; k++) { const x = px + SP.rand(-50, 50), z = pz + SP.rand(-40, 40); I.add('bunker', uSph, SP.flat(0xe8dcb0, 1), x, W.heightAt(x, z) - 0.45, z, 12, 0.6, 7, SP.rand(0, 3), false); }
      for (let k = 0; k < 4; k++) { const cx = px - 40 + k * 26, cz = pz - 50; const c = Mods.buggy(0xf2f2ee); c.position.set(cx, W.heightAt(cx, cz), cz); c.scale.setScalar(0.7); W.scene.add(c); W.colliderFrom(c, 'metal', 0.2); }
      for (let k = 0; k < 24; k++) { const a = SP.rand(0, 6.28), r = SP.rand(90, 115); roundTree(I, W, px + Math.cos(a) * r, pz + Math.sin(a) * r); }
      pad(px + 20, pz - 60); fire(px - 18, pz - 62);
    }
    if (K === 'dam') { // a huge concrete dam holding back a reservoir
      const out = V3(px - RESV.x, 0, pz - RESV.z).normalize(); const ry = Math.atan2(out.x, out.z);
      const dcx = px - out.x * 30, dcz = pz - out.z * 30, dy = W.heightAt(dcx, dcz); W.box(200, 40, 10, dcx, dy - 12, dcz, SP.mat('concrete', { color: 0xa8a49a }), { uv: 6, ry }); W.box(200, 1, 12, dcx, dy + 28, dcz, SP.mat('concrete', { color: 0x8a867e }), { collide: false, ry });
      for (let k = 0; k < 3; k++) W.box(8, 30, 2, dcx + Math.cos(ry) * (k - 1) * 20, dy - 2, dcz - Math.sin(ry) * (k - 1) * 20 + 0, SP.flat(0x6a8a9a, 0.2, 0.4), { collide: false, ry });
      for (let k = -2; k <= 2; k++) { const x = dcx + Math.cos(ry) * k * 38, z = dcz - Math.sin(ry) * k * 38; W.box(6, 4, 6, x, dy + 28, z, SP.mat('concrete', { color: 0xc0bcb2 })); loot(x, z, dy + 32.1); floor(x + 3.6 * Math.sin(ry), z + 3.6 * Math.cos(ry), dy + 28.55, 1); }
      shed(px + out.x * 40, pz + out.z * 40, 22, 14, 7); house(px + out.x * 40 + 30, pz + out.z * 40, 10, 9, 3.4); vendor(px + out.x * 30, pz + out.z * 30 + 14, 'merc'); pad(px + out.x * 50 - 20, pz + out.z * 50);
    }
    if (K === 'trainyard') {
      for (let r = 0; r < 5; r++) { const z = pz - 40 + r * 18; W.box(220, 0.2, 3, px, y0 - 0.1, z, SP.flat(0x4a4038, 0.9), { collide: false }); for (let k = 0; k < 4; k++) { if (Math.random() < 0.3) continue; const x = px - 80 + k * 42 + SP.rand(-4, 4); const col = SP.pick([0x8a3a2a, 0x2a4a6a, 0x5a5a3a, 0x7a6a4a]); W.box(16, 3.8, 3.2, x, y0 + 0.5, z, SP.mat('corrugated', { color: col, roughness: 0.7, metalness: 0.4 }), { uv: 3 }); W.box(16.4, 0.5, 3.4, x, y0, z, mat.dark, { collide: false }); if (Math.random() < 0.6) loot(x + 9, z + 2.2); floor(x - 9.5, z + 2); } }
      const loco = W.box(14, 5, 3.4, px + 96, y0 + 0.5, pz - 4, SP.flat(0xd8a020, 0.6, 0.3)); W.box(5, 2.5, 3.4, px + 100, y0 + 5.5, pz - 4, SP.flat(0x2a2a2a, 0.6, 0.3));
      shed(px - 20, pz + 60, 40, 18, 10); B.tower(W, px + 60, pz + 58, 8); vendor(px + 40, pz + 64, 'arms'); van(px - 70, pz + 60, 0); pad(px + 110, pz + 40);
    }
    if (K === 'prison') {
      const wm = SP.mat('concrete', { color: 0x8a8a86 }); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const wx = px + Math.cos(a) * 60, wz = pz + Math.sin(a) * 60; W.box(k % 2 ? 120 : 2, 9, k % 2 ? 2 : 120, wx, W.heightAt(wx, wz) - 0.3, wz, wm, { uv: 4 }); }
      W.box(10, 9, 2.4, px, y0 - 0.3, pz + 60, SP.flat(0x5a5a5a, 0.6, 0.6), { uv: 2, collide: false });
      for (let k = 0; k < 4; k++) { const x = px + (k % 2 ? 58 : -58), z = pz + (k < 2 ? 58 : -58); B.tower(W, x, z, 13); loot(x, z + 3); }
      for (let b = 0; b < 2; b++) { const bx = px - 22 + b * 44; W.box(30, 10, 18, bx, y0 - 0.2, pz - 20, wm, { uv: 4 }); for (let k = 0; k < 5; k++) { loot(bx - 12 + k * 6, pz - 9.5); floor(bx - 12 + k * 6 + 2, pz - 9.4); } }
      W.box(24, 0.2, 24, px, y0 - 0.1, pz + 26, SP.flat(0x6a6a66, 0.9), { collide: false }); flr(px, pz + 26, 6, 10, 1); vendor(px - 30, pz + 30, 'merc'); van(px + 30, pz + 36, 0);
    }
    if (K === 'wind') { // turbines on a snowy ridge, blades turning
      for (let k = 0; k < 7; k++) { const x = px - 100 + k * 34, z = pz + Math.sin(k) * 40; const y = W.heightAt(x, z); cyl(1.1, 1.8, 46, x, y, z, mat.white, 14);
        const hub = new T.Group(); hub.position.set(x, y + 46, z + 2); hub.userData.noMerge = true; W.scene.add(hub); for (let b = 0; b < 3; b++) { const bl = new T.Mesh(SP.geo.box(1.2, 22, 0.3), SP.flat(0xf4f4f4, 0.4)); bl.position.y = 11; const pv = new T.Group(); pv.rotation.z = b * 2.094; pv.add(bl); hub.add(pv); } hub.add(new T.Mesh(SP.geo.box(2.4, 2.4, 5), SP.flat(0xe8e8e8, 0.4)));
        const sp = 0.6 + (k % 3) * 0.15; W.anims.push(dt => { hub.rotation.z += dt * sp; }); W.cull.push({ o: hub, r: 25 }); floor(x + 3, z + 3); if (k % 2 === 0) loot(x - 3, z - 3); }
      shed(px, pz + 50, 24, 14, 7); house(px + 30, pz + 50, 9, 8, 3.4, { tint: 0xa0a4a8 }); pad(px - 30, pz + 50); fire(px - 10, pz + 70);
    }
    if (K === 'ski') {
      W.box(30, 10, 18, px, y0 - 0.2, pz, SP.mat('wood', { color: 0x6a4a30 }), { uv: 3 }); W.box(32, 0.8, 20, px, y0 + 9.8, pz, SP.flat(0xf0f4f8, 0.9), { collide: false }); loot(px + 17, pz); loot(px - 17, pz); flr(px, pz + 14, 5, 12);
      for (let k = 0; k < 6; k++) { const a = k / 6 * 3.1 + 3.4; house(px + Math.cos(a) * 45, pz + Math.sin(a) * 45, 9, 8, 6.4, { tint: SP.pick([0x6a4a32, 0x7a5a3a, 0x8a3a2a]) }); }
      for (let k = 0; k < 8; k++) { const x = px + 30 + k * 22, z = pz - 30 - k * 26; const y = W.heightAt(x, z); W.box(1, 14, 1, x, y, z, mat.steel); W.box(6, 0.4, 0.4, x, y + 14, z, mat.steel, { collide: false }); if (k % 2) W.box(1.6, 1.4, 1.2, x + 2, y + 11.6, z, SP.flat(0xd83a2a, 0.6), { collide: false }); if (k % 3 === 0) floor(x + 2, z + 2); }
      for (let k = 0; k < 40; k++) { const a = SP.rand(0, 6.28), r = SP.rand(60, 110); pine(I, W, px + Math.cos(a) * r, pz + Math.sin(a) * r, true); } vendor(px, pz + 22, 'arms'); fire(px - 10, pz + 24); van(px + 24, pz + 24, 1);
    }
    if (K === 'observatory') {
      cyl(10, 10, 9, px, y0 - 0.2, pz, mat.white, 28); const dome = M(new T.SphereGeometry(10.4, 28, 14, 0, 6.283, 0, Math.PI / 2), SP.mat('metal', { color: 0xc8ccd0, metalness: 0.8, roughness: 0.3 }), px, y0 + 8.8, pz, W.scene); W.addCollider(V3(px - 7, y0 + 8.8, pz - 7), V3(px + 7, y0 + 18, pz + 7), 'metal');
      W.box(2.2, 10, 1.2, px, y0 + 10, pz + 4, SP.flat(0x2a2a2a, 0.6, 0.4), { collide: false, ry: 0.3 }); loot(px, pz + 12); loot(px, pz, y0 + 19.3); floor(px + 3, pz + 3, y0 + 19.3, 2);
      house(px + 26, pz, 12, 9, 3.6, { tint: 0xc8d4dc }); house(px - 26, pz + 8, 10, 8, 3.4); for (let k = 0; k < 3; k++) { const x = px - 20 + k * 20, z = pz - 24; W.box(4, 0.3, 4, x, W.heightAt(x, z) + 2.4, z, SP.flat(0xe8e8e8, 0.3, 0.6), { ry: 0.6 }); W.box(0.4, 2.4, 0.4, x, W.heightAt(x, z), z, mat.steel); floor(x + 2.6, z); }
      pad(px + 10, pz + 30);
    }
    if (K === 'mine') {
      for (let k = 0; k < 18; k++) B.rock(W, px + SP.rand(-60, 60), pz - SP.rand(20, 70), SP.rand(3, 9));
      W.box(14, 9, 2, px, y0 - 0.2, pz - 16, SP.mat('wood', { color: 0x4a3424 }), { uv: 2, collide: false }); W.box(10, 8, 22, px, y0 - 0.2, pz - 28, SP.flat(0x1a1612, 1)); // tunnel mouth (dark)
      for (let k = 0; k < 3; k++) { const x = px - 30 + k * 30, z = pz + 20; W.box(1.2, 18, 1.2, x - 3, W.heightAt(x, z), z, mat.wood); W.box(1.2, 18, 1.2, x + 3, W.heightAt(x, z), z, mat.wood); W.box(8, 4, 6, x, W.heightAt(x, z) + 18, z, SP.mat('corrugated', { color: 0x8a5a3a })); }
      for (let k = 0; k < 6; k++) { const x = px - 25 + k * 10, z = pz; W.box(3, 1.4, 1.8, x, y0, z, SP.flat(0x5a4a3a, 0.8, 0.5)); floor(x, z + 2, null, k % 2); } loot(px - 6, pz - 14); loot(px + 6, pz - 14); shed(px + 40, pz + 40, 18, 12, 6);
      vendor(px - 40, pz + 30, 'arms'); fire(px, pz + 34); van(px + 10, pz + 50, 0);
    }
    if (K === 'bunker') { // grassy mound over a concrete vault with a big blast door
      I.add('mound', uSph, SP.flat(0x4a6a2a, 1), px, y0 - 6, pz, 54, 16, 40, 0, false); W.addCollider(V3(px - 20, y0, pz - 14), V3(px + 20, y0 + 6.5, pz + 14), 'dirt');
      W.box(14, 7, 3, px, y0 - 0.2, pz + 16, SP.mat('concrete', { color: 0x9a968c }), { uv: 3 }); const door = M(geo.cyl(2.8, 2.8, 0.6, 24), SP.mat('metal', { color: 0x6a6e70, metalness: 0.8, roughness: 0.4 }), px, y0 + 3, pz + 17.6, W.scene); door.rotation.x = Math.PI / 2;
      for (let k = 0; k < 4; k++) loot(px - 9 + k * 6, pz + 21); flr(px, pz + 24, 6, 8, 2); W.box(1.2, 4, 1.2, px + 9, y0, pz + 22, mat.dark); W.box(1.4, 0.8, 0.4, px + 9, y0 + 3, pz + 22.7, SP.flat(0xff3020, 0.5, 0, { emissive: SP.lin(0xff2010), emissiveIntensity: 2 }), { collide: false });
      for (let k = 0; k < 10; k++) B.hesco(W, px - 30 + k * 6.5, pz + 40, 3); van(px - 24, pz + 30, 0);
    }
    if (K === 'crash') { // airliner broken in three pieces, scattered debris
      const fus = SP.mat('metal', { color: 0xe8e8ec, metalness: 0.5, roughness: 0.45 }), stripe = SP.flat(0x2a5aa8, 0.5, 0.3);
      const segs = [[-34, 0, 26, 0.12, 0.1], [-6, 6, 22, -0.18, -0.05], [22, 16, 18, 0.5, 0.2]];
      for (const [dx, dz, L, ry, roll] of segs) { const o = M(geo.cyl(3.4, 3.4, L, 18), fus, px + dx, y0 + 3, pz + dz, W.scene); o.rotation.set(Math.PI / 2 + roll * 0.2, 0, ry + Math.PI / 2); W.addCollider(V3(px + dx - L / 2, y0, pz + dz - 3.4), V3(px + dx + L / 2, y0 + 6.4, pz + dz + 3.4), 'metal'); W.box(L * 0.9, 0.6, 0.2, px + dx, y0 + 3.6, pz + dz + 3.35, stripe, { collide: false, ry }); loot(px + dx, pz + dz + 6); floor(px + dx + 3, pz + dz - 5, null, 1); }
      W.box(34, 0.7, 7, px - 6, y0 + 0.2, pz - 20, fus, { ry: 0.4 }); W.box(8, 9, 0.7, px + 34, y0, pz + 24, fus, { ry: 0.5 });
      for (let k = 0; k < 14; k++) { const x = px + SP.rand(-60, 60), z = pz + SP.rand(-40, 40); W.box(SP.rand(1, 3), SP.rand(0.3, 1.2), SP.rand(1, 3), x, W.heightAt(x, z), z, k % 2 ? fus : mat.dark, { ry: SP.rand(0, 3) }); } flr(px, pz, 8, 50, 1);
      fire(px + 10, pz - 12); pad(px - 50, pz + 20);
    }
    if (K === 'bazaar') {
      const cloth = [0x8a2a22, 0x2a5a7a, 0xc8a040, 0x3a6a3a, 0x7a3a7a];
      for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) { const x = px - 36 + k * 12, z = pz - 24 + r * 16; const y = W.heightAt(x, z); W.box(0.3, 3, 0.3, x - 3.5, y, z - 2.5, mat.wood, { collide: false }); W.box(0.3, 3, 0.3, x + 3.5, y, z - 2.5, mat.wood, { collide: false }); W.box(8, 0.12, 6, x, y + 3, z, SP.flat(cloth[(r + k) % 5], 0.9), { collide: false }); W.box(6, 1, 1.6, x, y, z - 1.6, mat.wood); if ((r + k) % 3 === 0) loot(x, z + 1); floor(x + 1, z + 1.4); }
      for (let k = 0; k < 4; k++) house(px + (k % 2 ? 50 : -50), pz + (k < 2 ? 30 : -30), 10, 9, 6.4, { tint: 0xd8c8a8 }); W.box(5, 22, 5, px + 56, y0, pz, SP.mat('plaster', { color: 0xe8d8b8 }), { uv: 2 }); W.box(6, 3, 6, px + 56, y0 + 22, pz, SP.mat('metal', { color: 0xc8a040, metalness: 0.9, roughness: 0.25 }));
      vendor(px, pz + 40, 'arms'); vendor(px - 10, pz + 40, 'merc'); van(px - 50, pz, 1.5);
    }
    if (K === 'solar') {
      const panel = SP.mat('metal', { color: 0x1a2a4a, roughness: 0.15, metalness: 0.7 });
      for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { const x = px - 70 + k * 20, z = pz - 70 + r * 20; const y = W.heightAt(x, z); W.box(12, 0.25, 5, x, y + 1.6, z, panel, { collide: false }); W.box(0.4, 1.6, 0.4, x, y, z, mat.steel, { collide: false }); }
      W.addCollider(V3(px - 78, y0 + 1.4, pz - 74), V3(px + 78, y0 + 1.9, pz + 74), 'metal').noRay = true;
      shed(px, pz + 90, 26, 14, 7); W.box(8, 6, 8, px + 30, y0, pz + 90, mat.conc); flr(px, pz, 12, 70); vendor(px - 30, pz + 90, 'arms'); pad(px + 80, pz + 80);
    }
    if (K === 'space') { // launch pad with a rocket, gantry tower and mission control
      W.box(60, 2, 60, px, y0 - 1.6, pz, SP.mat('concrete', { color: 0x8a8a86 }), { uv: 6 }); const yb = y0 + 0.4;
      cyl(3.4, 3.4, 54, px, yb, pz, mat.white, 22); const nose = M(new T.ConeGeometry(3.4, 10, 22), mat.white, px, yb + 59, pz, W.scene);
      for (let k = 0; k < 4; k++) { const a = k * 1.571; cyl(1.6, 1.8, 26, px + Math.cos(a) * 5, yb, pz + Math.sin(a) * 5, SP.flat(0xe8e8e8, 0.5), 14); }
      W.box(1.2, 54, 0.6, px, yb + 4, pz + 3.45, SP.flat(0x1a1a1a, 0.6), { collide: false }); W.box(0.6, 54, 1.2, px + 3.45, yb + 4, pz, SP.flat(0x2a4aa8, 0.6), { collide: false });
      for (let k = 0; k < 4; k++) W.box(1, 66, 1, px + 12 + (k % 2) * 6, yb, pz - 3 + Math.floor(k / 2) * 6, SP.flat(0xc83a2a, 0.6, 0.5)); for (let k = 0; k < 7; k++) { W.box(7, 0.5, 7, px + 15, yb + 8 + k * 8, pz, SP.flat(0x8a8a8a, 0.6, 0.5)); floor(px + 15, pz + 1, yb + 8.55 + k * 8, k > 4 ? 2 : 1); } W.box(9, 0.4, 1.2, px + 8, yb + 48, pz, SP.flat(0x8a8a8a, 0.6, 0.5)); loot(px + 15, pz, yb + 64.55);
      W.box(36, 8, 16, px, y0 - 0.2, pz + 70, SP.mat('plaster', { color: 0xe0e4e8 }), { uv: 4 }); for (let k = 0; k < 5; k++) loot(px - 14 + k * 7, pz + 80); for (let k = 0; k < 6; k++) floor(px - 15 + k * 6, pz + 80.5);
      vendor(px + 30, pz + 70, 'arms'); vendor(px - 30, pz + 70, 'merc'); van(px + 40, pz + 40, 0.6); pad(px - 40, pz - 20);
    }
    if (K === 'lighthouse') {
      for (let k = 0; k < 8; k++) cyl(3.6 - k * 0.22, 3.8 - k * 0.22, 4, px, y0 - 0.2 + k * 4, pz, SP.flat(k % 2 ? 0xc8302a : 0xf2f2ee, 0.7), 20, k === 0);
      W.addCollider(V3(px - 3.2, y0, pz - 3.2), V3(px + 3.2, y0 + 32, pz + 3.2), 'hard'); W.box(7, 0.5, 7, px, y0 + 31.8, pz, mat.dark); const lamp = M(geo.cyl(1.6, 1.6, 3, 16), mat.glow, px, y0 + 33.8, pz, W.scene); lamp.userData.noMerge = true; M(new T.ConeGeometry(2.2, 2, 16), SP.flat(0x2a2a2a, 0.5, 0.5), px, y0 + 36.3, pz, W.scene);
      const beam = new T.Mesh(new T.ConeGeometry(4, 60, 16, 1, true), new T.MeshBasicMaterial({ color: new T.Color(3, 2.6, 1.6), transparent: true, opacity: 0.12, depthWrite: false, side: T.DoubleSide })); beam.rotation.z = Math.PI / 2; beam.position.x = 30; const bg = new T.Group(); bg.add(beam); bg.position.set(px, y0 + 33.8, pz); bg.userData.noMerge = true; W.scene.add(bg); W.anims.push(dt => { bg.rotation.y += dt * 0.6; }); W.cull.push({ o: bg, r: 60, far: 2600 });
      loot(px, pz, y0 + 32.35); floor(px + 2, pz + 2, y0 + 32.35, 2); house(px + 16, pz + 6, 10, 8, 3.4, { tint: 0xf2f2ee }); house(px - 14, pz + 12, 8, 7, 3.4); for (let k = 0; k < 10; k++) B.rock(W, px + SP.rand(-30, 30), pz + SP.rand(-30, 30), SP.rand(2, 5)); fire(px + 4, pz + 16); pad(px - 20, pz - 14);
    }
    if (K === 'shipwreck') { // a rusted freighter run aground
      const rust = SP.mat('metal', { color: 0x7a4a2a, roughness: 0.85, metalness: 0.5 }); const out = V3(px, 0, pz).normalize(); const ry = Math.atan2(out.x, out.z) + 0.5; const cx = px + out.x * 24, cz = pz + out.z * 24;
      W.box(80, 12, 16, cx, -2, cz, rust, { uv: 6, ry }); W.box(80, 0.6, 16, cx, 10, cz, SP.flat(0x5a3a22, 0.9), { collide: false, ry }); W.box(14, 12, 12, cx - Math.sin(ry + Math.PI / 2) * 28, 10, cz - Math.cos(ry + Math.PI / 2) * 28, SP.flat(0xe8e0d0, 0.8), { ry });
      for (let k = 0; k < 4; k++) { const t = -24 + k * 14; const x = cx + Math.sin(ry + Math.PI / 2) * t, z = cz + Math.cos(ry + Math.PI / 2) * t; B.container(W, x, z, ry, SP.pick([0x34505e, 0x7a4232, 0x5c6a3e]), 10.3); loot(x + 2, z + 2, 10.35); floor(x - 2, z - 3, 10.35, 1); }
      for (let k = 0; k < 6; k++) { const x = px + SP.rand(-30, 30), z = pz + SP.rand(-30, 30); B.container(W, x, z, SP.rand(0, 3), SP.pick([0x34505e, 0x7a4232, 0x8a6a2a])); floor(x + 3, z + 3); } vendor(px - out.x * 20, pz - out.z * 20, 'merc'); van(px - out.x * 30 + 10, pz - out.z * 30, 0);
    }
    if (K === 'cove') { // fishing village on stilts
      const out = V3(px, 0, pz).normalize();
      for (let k = 0; k < 8; k++) { const t = (k - 3.5) * 16; const x = px + out.z * t + out.x * (k % 2 ? 6 : -4), z = pz - out.x * t + out.z * (k % 2 ? 6 : -4); house(x, z, 8, 7, 3.4, { tint: SP.pick([0x4a8ab0, 0xe8d8b8, 0xb04a4a, 0xf0e4cc, 0x6ab08a]) }); }
      for (let k = 0; k < 2; k++) { const x = px + out.x * (112 + k * 10) + out.z * (k ? 20 : -20), z = pz + out.z * (112 + k * 10) - out.x * (k ? 20 : -20); W.box(6, 0.5, 30, x, 2.4, z, SP.mat('wood', { color: 0x6a5238 }), { uv: 3, ry: Math.atan2(out.x, out.z) }); loot(x, z, 2.95); floor(x, z, 2.95); }
      for (let k = 0; k < 4; k++) { const x = px + out.x * 30 + SP.rand(-20, 20), z = pz + out.z * 30 + SP.rand(-20, 20); W.box(2.4, 1.2, 6, x, W.heightAt(x, z), z, SP.flat(SP.pick([0xe8e8e8, 0x3a6ab0, 0xb03a3a]), 0.7), { ry: SP.rand(0, 3) }); } for (let k = 0; k < 10; k++) palm(I, W, px + SP.rand(-50, 50), pz + SP.rand(-50, 50));
      vendor(px - out.x * 20, pz - out.z * 20, 'arms'); fire(px - out.x * 10, pz - out.z * 10); pad(px - out.x * 40, pz - out.z * 40);
    }
  }
  // roads: wrecks + roadside loot
  for (const [ax, az, bx, bz] of ROADS) { const L = Math.hypot(bx - ax, bz - az); for (let t = 60; t < L - 60; t += 130) { const x = ax + (bx - ax) * t / L, z = az + (bz - az) * t / L; if (SP.BRPOI.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 20)) continue; if (Math.random() < 0.35) { B.wreckCar(W, x + SP.rand(-4, 4), z + SP.rand(-4, 4), SP.rand(0, 3)); loot(x + 5, z + 4); floor(x - 5, z - 3); } else if (Math.random() < 0.25) floor(x + SP.rand(-8, 8), z + SP.rand(-8, 8)); } }
  // scattered cabins and shacks across the wilds (more places to loot between landmarks)
  for (let k = 0; k < 90; k++) { const x = SP.rand(-2200, 2200), z = SP.rand(-2200, 2200); const y = terrainH(x, z); if (y < 3 || Math.hypot(x, z) > edgeR(x, z) - 350 || SP.BRPOI.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 120) || roadDist(x, z) < 14) continue; if (biome(x, z) === 2 && y > 90) continue; house(x, z, SP.rand(7, 10), SP.rand(6, 8), Math.random() < 0.25 ? 6.4 : 3.4, biome(x, z) === 2 || biome(x, z) === 3 ? { tint: SP.pick([0x6a4a32, 0x7a5a3a, 0x5a3a28]) } : {}); if (Math.random() < 0.3) fire(x + 6, z + 6); }
  // vegetation by biome (instanced, tiled)
  for (let k = 0; k < 15000; k++) {
    const x = SP.rand(-2700, 2700), z = SP.rand(-2700, 2700); const y = terrainH(x, z); if (y < 2 || roadDist(x, z) < 9) continue;
    if (near(x, z).pois.some(p => Math.hypot(x - p.x, z - p.z) < p.r * 0.85)) continue; if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 8) continue;
    const b = biome(x, z);
    if (b === 3) { if (Math.random() < 0.85) pine(I, W, x, z, false); else roundTree(I, W, x, z); }
    else if (b === 2) { if (y < 95 && Math.random() < 0.6) pine(I, W, x, z, y > 60); }
    else if (b === 1) { if (Math.random() < 0.1) palm(I, W, x, z); else if (Math.random() < 0.3) I.add('rk', uRock, SP.mat('rock', { color: 0xb8946a }), x, y, z, SP.rand(1.5, 4), SP.rand(1, 3), SP.rand(1.5, 4), SP.rand(0, 6)); else if (Math.random() < 0.2) I.add('cactus', uCyl, SP.flat(0x4a7a3a, 0.9), x, y - 0.2, z, 0.7, SP.rand(2.5, 4.5), 0.7, 0, true); }
    else { if (Math.random() < 0.3) roundTree(I, W, x, z); else if (Math.random() < 0.25) pine(I, W, x, z, false); else if (Math.random() < 0.3) I.add('bush', uSph, SP.flat(0x4a6a2a, 1), x, y - 0.3, z, SP.rand(1.5, 3), SP.rand(1, 1.8), SP.rand(1.5, 3), 0, false); else if (Math.random() < 0.3) I.add('flower', uSph, SP.flat(SP.pick([0xd8c040, 0xd85a8a, 0xf0f0f0]), 1), x, y - 0.1, z, 0.9, 0.5, 0.9, 0, false); }
  }
  // scattered rocks for cover + chests and floor loot in the wild
  for (let k = 0; k < 1500; k++) { const x = SP.rand(-2500, 2500), z = SP.rand(-2500, 2500); const y = terrainH(x, z); if (y < 2) continue; const s = SP.rand(1.2, 4); I.add('rk2', uRock, SP.mat('rock', { color: biome(x, z) === 1 ? 0xb8946a : 0x8a847a }), x, y - 0.3, z, s * 1.4, s, s * 1.2, SP.rand(0, 6)); W.addCollider(V3(x - s * 0.5, y - 0.3, z - s * 0.45), V3(x + s * 0.5, y + s * 0.45, z + s * 0.45), 'rock'); if (Math.random() < 0.1) loot(x + s, z); else if (Math.random() < 0.12) floor(x - s - 0.6, z); }
  for (let k = 0; k < 260; k++) { const x = SP.rand(-2300, 2300), z = SP.rand(-2300, 2300); if (terrainH(x, z) > 2 && Math.hypot(x, z) < edgeR(x, z) - 300) loot(x, z); }
  // campfire meshes
  for (const f of W.fires) { for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; M(geo.box(0.25, 0.25, 0.25), SP.flat(0x5a5a58, 1), f.x + Math.cos(a) * 0.7, f.y + 0.1, f.z + Math.sin(a) * 0.7, W.scene); } for (let k = 0; k < 3; k++) { const lg = M(geo.cyl(0.1, 0.1, 1.2, 6), SP.flat(0x4a3424, 1), f.x, f.y + 0.15, f.z, W.scene); lg.rotation.set(Math.PI / 2, k * 1.05, 0); } const fl = M(new T.ConeGeometry(0.35, 0.9, 8), new T.MeshBasicMaterial({ color: new T.Color(5, 2.2, 0.5) }), f.x, f.y + 0.5, f.z, W.scene); fl.userData.noMerge = true; W.cull.push({ o: fl, r: 1, far: 400 }); W.anims.push(() => { fl.scale.y = 0.8 + Math.random() * 0.5; }); }
  // launch pads and reboot vans
  for (const p of W.pads) { const g = new T.Group(); g.position.copy(p); g.userData.noMerge = true; g.add(M(geo.cyl(2.2, 2.4, 0.35, 24), SP.flat(0x2a2a30, 0.6, 0.5), 0, 0.17, 0)); const top = M(geo.cyl(1.8, 1.8, 0.06, 24), SP.flat(0x40c8ff, 0.3, 0, { emissive: SP.lin(0x30b0ff), emissiveIntensity: 1.6 }), 0, 0.37, 0); g.add(top); for (let k = 0; k < 3; k++) { const ch = M(new T.ConeGeometry(0.5, 0.6, 3), SP.flat(0xffffff, 0.3, 0, { emissive: SP.lin(0xffffff), emissiveIntensity: 1 }), 0, 0.5 + k * 0.5, 0); ch.scale.y = 0.4; g.add(ch); } W.scene.add(g); W.cull.push({ o: g, r: 3, far: 700 }); }
  for (const v of W.vans) { const t = Mods.truck('cargo', 0x2a6ab0); t.position.copy(v.pos); t.rotation.y = v.ry; t.userData.noMerge = true; W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); W.cull.push({ o: t, r: 8 }); const s = M(geo.box(1.4, 0.8, 0.1), SP.flat(0xffffff, 0.4, 0, { emissive: SP.lin(0x40ff80), emissiveIntensity: 1.5 }), 0, 3.2, 0, t); s.userData.noMerge = true; v.screen = s; }
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
  W.loot.push(V3(x, base + h + 0.75, z)); W.floor.push({ p: V3(x + w / 4, base + h + 0.55, z - d / 4), tier: 1 });
  return { base, h };
}
function hangar(W, x, z) { const y = W.heightAt(x, z) - 0.2; const m = SP.mat('corrugated', { color: 0x7a8070 }); W.box(36, 0.4, 30, x, y + 11, z, m, { uv: 4 }); W.box(0.6, 11, 30, x - 18, y, z, m, { uv: 4 }); W.box(36, 11, 0.6, x, y, z - 15, m, { uv: 4 }); W.box(0.6, 11, 12, x + 18, y, z - 9, m, { uv: 4 }); }
function barn(W, x, z) { const y = W.heightAt(x, z) - 0.2; const m = SP.mat('wood', { color: 0x8a2a20 }); W.box(20, 0.3, 14, x, y + 8, z, SP.flat(0x3a3a38, 0.8), { uv: 3 }); W.box(0.4, 8, 14, x - 10, y, z, m, { uv: 3 }); W.box(0.4, 8, 14, x + 10, y, z, m, { uv: 3 }); W.box(20, 8, 0.4, x, y, z - 7, m, { uv: 3 }); W.box(6, 8, 0.4, x - 7, y, z + 7, m, { uv: 3 }); W.box(6, 8, 0.4, x + 7, y, z + 7, m, { uv: 3 }); W.box(14, 0.3, 6, x, y + 4, z - 3.8, SP.mat('wood', { color: 0x9a7a4a }), { uv: 2 }); }
function parked(W, x, z, ry) { const t = Mods.technical(SP.pick([0xe6e2da, 0x1a1a1c, 0x7a1e18, 0x3a5a7a, 0xa8a49a])); if (t.userData.gun) t.remove(t.userData.gun); t.position.set(x, W.heightAt(x, z), z); t.rotation.y = ry; W.scene.add(t); W.colliderFrom(t, 'metal', 0.25); }
const leafG = SP.flat(0x2e5a24, 1), leafS = SP.flat(0x4a6a4a, 1), bark = SP.flat(0x4a3424, 1), leafR = SP.flat(0x3c6a28, 1), palmL = SP.flat(0x4a7a2a, 1), palmT = SP.flat(0x8a7050, 1), snowCap = SP.flat(0xf0f4f8, 0.9);
function pine(I, W, x, z, snowy) { const y = W.heightAt(x, z), h = SP.rand(9, 16); I.add('trunk', uCyl, bark, x, y - 0.2, z, 0.5, h * 0.4, 0.5); I.add(snowy ? 'pineS' : 'pine', uCone, snowy ? leafS : leafG, x, y + h * 0.22, z, h * 0.42, h * 0.82, h * 0.42, SP.rand(0, 6)); if (snowy) I.add('cap', uCone, snowCap, x, y + h * 0.62, z, h * 0.22, h * 0.42, h * 0.22); W.addCollider(V3(x - 0.35, y, z - 0.35), V3(x + 0.35, y + h * 0.5, z + 0.35), 'wood'); }
function roundTree(I, W, x, z) { const y = W.heightAt(x, z), h = SP.rand(6, 10); I.add('trunk', uCyl, bark, x, y - 0.2, z, 0.6, h * 0.55, 0.6); I.add('crown', uSph, leafR, x, y + h * 0.4, z, h * 0.75, h * 0.7, h * 0.75, SP.rand(0, 6)); W.addCollider(V3(x - 0.4, y, z - 0.4), V3(x + 0.4, y + h * 0.5, z + 0.4), 'wood'); }
function palm(I, W, x, z) { const y = W.heightAt(x, z), h = SP.rand(7, 12); I.add('ptrunk', uCyl, palmT, x, y - 0.2, z, 0.45, h, 0.45); for (let k = 0; k < 6; k++) I.add('pleaf', uBox, palmL, x, y + h - 0.2, z, 0.9, 0.12, 5.5, k * 1.05); W.addCollider(V3(x - 0.3, y, z - 0.3), V3(x + 0.3, y + h, z + 0.3), 'wood'); }
SP.brBiome = biome;
})();

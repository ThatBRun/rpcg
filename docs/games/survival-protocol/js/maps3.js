/* Survival Protocol — chapter 3–5 maps: prison, harbor, villa; sandstorm + night variants */
'use strict';
(function () {
const T = THREE, { V3, rand, lerp, clamp } = SP;
const geo = SP.geo, M = SP.M, Mods = SP.Models, B = SP.build, Maps = SP.Maps, G = SP.G;

Object.assign(SP.ENV, {
  storm: { sunEl: 35, sunAz: 200, sunCol: 0xffc890, sunI: 0.7, zenith: 0x6a4a30, horizon: 0x8a6440, ground: 0x5a4430, cloud: 0.9, cloudCol: 0x8a6a48, hemiS: 0xb08860, hemiG: 0x5a4030, hemiI: 0.6, fog: 0x7e5e3e, fogD: 0.03, exp: 0.75, night: 0, env: 0.7, haze: 0.5, storm: true },
  nightcity: { sunEl: 40, sunAz: 300, sunCol: 0x9ab0e0, sunI: 0.5, zenith: 0x070b18, horizon: 0x1e2638, ground: 0x0b0c10, cloud: 0.2, cloudCol: 0x2a3348, hemiS: 0x50608a, hemiG: 0x1a1612, hemiI: 0.28, fog: 0x161d2c, fogD: 0.0035, exp: 1.5, night: 1, env: 0.55, moon: true },
  sunset: { sunEl: 4, sunAz: 280, sunCol: 0xff8a50, sunI: 2.8, zenith: 0x2e4a78, horizon: 0xf28a58, ground: 0x4e3a2c, cloud: 0.55, cloudCol: 0xf0a078, hemiS: 0xffb890, hemiG: 0x4a3226, hemiI: 0.35, fog: 0xc87a58, fogD: 0.0028, exp: 1.15, night: 0, env: 0.8 },
});
// sandstorm streaks: speed up the dust motes
const _um = SP.updateMotes;
SP.updateMotes = function (dt) {
  if (SP.envCfg && SP.envCfg.storm && SP.motes) { const m = SP.motes; m.material.size = 0.12; m.material.opacity = 0.9; m.material.color.setRGB(1.6, 1.2, 0.8); const c = SP.camera.position, p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i) + dt * 14, y = p.getY(i) + Math.sin(i + G.time) * dt * 0.5, z = p.getZ(i) + dt * 4; if (x - c.x > 12) x -= 24; if (z - c.z > 12) z -= 24; if (z - c.z < -12) z += 24; if (y - c.y > 4) y -= 7; if (y - c.y < -3) y += 7; p.setXYZ(i, x, y, z); } p.needsUpdate = true; if (Math.random() < dt * 6) G.particle({ pos: c.clone().add(V3(rand(-20, -8), rand(-1, 3), rand(-12, 12))), vel: V3(rand(9, 14), rand(-0.3, 0.3), rand(2, 5)), life: 2.5, size: rand(5, 9), grow: 1, color: new T.Color(0.75, 0.58, 0.4), opacity: 0.22 }); return; }
  _um(dt);
};

function flatTerrain(W, size, segs, hfn) { const g = new T.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hfn(x, z)); uv.setXY(i, x / 3.5, z / 3.5); const v = 0.86 + SP.fbm(x * 0.01 + 3, z * 0.01, 3) * 0.28; col[i * 3] = v; col[i * 3 + 1] = v * 0.98; col[i * 3 + 2] = v * 0.95; } g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals(); const m = SP.mat('sand', { roughness: 1, ns: 0.8 }).clone(); m.vertexColors = true; const mesh = new T.Mesh(g, m); mesh.receiveShadow = true; W.scene.add(mesh); W.terrainMesh = mesh; return mesh; }
function yardPlane(W, w, d, x = 0, z = 0, key = 'dirt') { const y = new T.Mesh(new T.PlaneGeometry(w, d), SP.mat(key, { roughness: 1 })); y.rotation.x = -Math.PI / 2; y.position.set(x, 0.04, z); y.receiveShadow = true; W.scene.add(y); return y; }
function wallRect(W, x0, z0, x1, z1, h, mat, gaps = {}) { const t = 0.8; const mk = (ax, x, z, len, gap) => B.wallWithOpenings(W, ax, x, z, len, h, t, 0, mat, gap != null ? [{ at: gap, w: 8, y0: 0, y1: h }] : []); mk('x', x0, z0, x1 - x0, gaps.n); mk('x', x0, z1, x1 - x0, gaps.s); mk('z', x0, z0, z1 - z0, gaps.w); mk('z', x1, z0, z1 - z0, gaps.e); }

/* ======================= PRISON (chapter 4) ======================= */
SP.PRISON = { gate: V3(0, 0, 62), houserCell: V3(0, 0, 0), blocks: [], motor: V3(46, 0, 36), ridge: V3(0, 0, 200) };
function cellBlock(W, cx, cz) { // 28 x 12, corridor along x, 6 cells each side, doors at both ends
  const cm = SP.mat('concrete', { color: 0xa49c8e, roughness: 0.95 }), bar = SP.mat('metal', { color: 0x3e3e3a, metalness: 0.7, roughness: 0.5 });
  const x0 = cx - 14, z0 = cz - 6;
  B.wallWithOpenings(W, 'x', x0, z0, 28, 3.4, 0.4, 0, cm); B.wallWithOpenings(W, 'x', x0, z0 + 12, 28, 3.4, 0.4, 0, cm);
  B.wallWithOpenings(W, 'z', x0, z0, 12, 3.4, 0.4, 0, cm, [{ at: 6, w: 1.6, y0: 0, y1: 2.4 }]); B.wallWithOpenings(W, 'z', x0 + 28, z0, 12, 3.4, 0.4, 0, cm, [{ at: 6, w: 1.6, y0: 0, y1: 2.4 }]);
  M(geo.box(28.6, 0.3, 12.6), SP.mat('concrete', { color: 0x7a746a }), cx, 3.55, cz, W.scene);
  const cells = [];
  for (let i = 0; i < 6; i++) { const x = x0 + 2 + i * 4.3 + 2; for (const side of [-1, 1]) { const zw = cz + side * 1.4; W.box(0.25, 3.4, 4.4, x - 2.15, 0, cz + side * 3.7, cm, { uv: 2 }); for (let b = 0; b < 8; b++) M(geo.cyl(0.02, 0.02, 2.6, 6), bar, x - 1.7 + b * 0.5, 1.3, zw, W.scene, false); W.addCollider(V3(x - 2, 0, zw - 0.06), V3(x + 2, 2.6, zw + 0.06), 'metal'); M(geo.box(1.8, 0.35, 0.8), SP.mat('fabric', { color: 0x5a5040 }), x, 0.2, cz + side * 5, W.scene); cells.push({ x, z: cz + side * 4, bars: V3(x, 0, zw - side * 0.7) }); } }
  SP.build.pointLamp(W, cx - 7, 3.1, cz, 0xffe0a8, 1.8, 10); SP.build.pointLamp(W, cx + 7, 3.1, cz, 0xffe0a8, 1.8, 10);
  return { cx, cz, cells, doorW: V3(x0 - 0.6, 0, cz), doorE: V3(x0 + 28.6, 0, cz) };
}
Maps.prison = function (W) {
  W.terrainH = (x, z) => { const d = Math.max(Math.hypot(x, z) - 110, 0); let h = SP.smooth(0, 80, d) * (SP.fbm(x * 0.006, z * 0.006, 3) * 26 + 3); if (z > 40 && z < 260) h *= SP.smooth(30, 80, Math.abs(x)) * 0.85 + 0.15 * SP.smooth(220, 260, z); const rd = Math.hypot(x - 0, z - 200); if (rd < 30) h = Math.max(h, 9 * SP.smooth(30, 12, rd)); return h + SP.fbm(x * 0.04, z * 0.04, 2) * 0.3; };
  W.surface = 'sand'; W.bounds = 600; flatTerrain(W, 1300, 240, W.terrainH); yardPlane(W, 150, 128);
  const wm = SP.mat('concrete', { color: 0xb8ae9c, roughness: 0.95 });
  wallRect(W, -74, -62, 74, 62, 5, wm, { s: 74 });
  SP.PRISON.gatePanels = [W.box(4, 4.6, 0.3, -2, 0, 62, SP.mat('metal', { color: 0x5a5c50, metalness: 0.6 }), { uv: 2, surf: 'metal' }), W.box(4, 4.6, 0.3, 2, 0, 62, SP.mat('metal', { color: 0x5a5c50, metalness: 0.6 }), { uv: 2, surf: 'metal' })];
  SP.PRISON.gateCols = W.colliders.slice(-2);
  SP.PRISON.towers = [B.tower(W, -70, -58, 7), B.tower(W, 70, -58, 7), B.tower(W, -70, 58, 7), B.tower(W, 70, 58, 7)];
  SP.PRISON.blocks = [cellBlock(W, -36, -32), cellBlock(W, 0, -36), cellBlock(W, 36, -32)];
  const bB = SP.PRISON.blocks[1]; SP.PRISON.houserCell = bB.cells[7]; // north side, 4th cell
  B.house(W, 0, 40, 18, 10, 6.4, { door: 'n', tint: 0xcabaa0 }); B.house(W, -46, 34, 14, 10, 3.6, { door: 'e', tint: 0xd0c0a6 });
  // motor pool
  for (let i = 0; i < 3; i++) { const t = Mods.technical(0xb8b0a0); t.position.set(40 + i * 7, 0, 30); t.rotation.y = Math.PI; W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); }
  const tr = Mods.truck('cargo', 0x5a5e44); tr.position.set(58, 0, 44); tr.rotation.y = Math.PI / 2; W.scene.add(tr); W.colliderFrom(tr, 'metal', 0.3);
  // yard: benches, hoop, fences, sandbags
  for (let i = 0; i < 6; i++) W.box(3, 0.45, 0.5, -20 + i * 8, 0, 6, SP.mat('wood', { color: 0x6a5038 }), { uv: 1 });
  W.box(0.15, 3.4, 0.15, 22, 0, 14, SP.mat('metal', { color: 0x777, metalness: 0.6 }), { collide: true }); M(geo.box(1.2, 0.9, 0.06), SP.flat(0xe0e0d8, 0.6), 22, 3.4, 13.6, W.scene);
  B.sandbags(W, -10, 20, 6, 3); B.sandbags(W, 12, 22, 6, 3); B.sandbags(W, 0, -14, 7, 3); B.hesco(W, -30, 14, 4); B.hesco(W, 26, 0, 3, Math.PI / 2);
  B.container(W, -60, 0, 0, 0x34505e); B.container(W, 62, -10, 0, 0x7a4232); B.crate(W, -24, 22, 1.2, 2); B.crate(W, 30, 18, 1.2, 1);
  B.floodlight(W, -40, 0, -36, -20, true); B.floodlight(W, 40, 0, 36, -20, true); B.floodlight(W, 0, 24, 0, 0, true); B.floodlight(W, -60, 50, -50, 40, false);
  [[-8, 26], [24, 30]].forEach(([x, z]) => { B.barrel(W, x, z, 0x3a2a20); G.fires.push({ pos: V3(x, 0.9, z), t: 1e9, safe: true }); const l = new T.PointLight(SP.lin(0xff7a30), 4, 12, 2); l.position.set(x, 1.6, z); W.scene.add(l); });
  for (let i = 0; i < 30; i++) { const a = rand(0, 6.28), r = rand(120, 300); B.rock(W, Math.cos(a) * r, Math.sin(a) * r, rand(1, 3.5)); }
  for (let i = 0; i < 10; i++) B.rock(W, rand(-25, 25), rand(185, 215), rand(0.8, 2));
  B.bushes(W, 120, [-400, 400, -400, 400], (x, z) => Math.hypot(x, z) < 110);
  return { start: V3(0, 0, 190) };
};

/* ======================= HARBOR (chapter 5) ======================= */
SP.PORT = { ship: V3(58, 5, -85), warehouse: V3(60, 0, 30), yard: V3(-70, 0, 5), quay: -40, gangway: V3(49, 0, -44), office: V3(-10, 0, 50) };
Maps.port = function (W) {
  W.terrainH = (x, z) => z < -40 ? -6 : 0; W.surface = 'hard'; W.bounds = 500;
  const ground = new T.Mesh(SP.worldUV(new T.BoxGeometry(400, 1, 300), 6), SP.mat('floor', { color: 0x8a867c, roughness: 0.9 })); ground.position.set(0, -0.5, 110); ground.receiveShadow = true; W.scene.add(ground);
  // water
  const wm = new T.MeshStandardMaterial({ color: SP.lin(0x0e1a22), roughness: 0.08, metalness: 0.3, envMapIntensity: 1.6 }); const wt = SP.TEX.water(); wm.normalMap = wt.normalMap; wm.normalScale = new T.Vector2(0.5, 0.5); wt.normalMap.repeat && wt.normalMap.repeat.set(40, 40);
  const water = new T.Mesh(new T.PlaneGeometry(1600, 1200), wm); water.rotation.x = -Math.PI / 2; water.position.set(0, -1.4, -640); W.scene.add(water); SP.waterMesh = water;
  const qm = SP.mat('concrete', { color: 0x8c877c, roughness: 0.9 });
  W.box(400, 6, 2, 0, -6, -41, qm, { uv: 3 }); // quay wall
  W.box(14, 6, 80, -60, -6, -81, qm, { uv: 3 }); W.box(14, 6, 80, 40, -6, -81, qm, { uv: 3 }); // piers
  W.terrainH = (x, z) => { if (z >= -40) return 0; if (Math.abs(x + 60) <= 7 && z > -121) return 0; if (Math.abs(x - 40) <= 7 && z > -121) return 0; if (Math.abs(x - 58) <= 8 && z < -40 && z > -130) return 5; return -6; };
  for (let x = -150; x <= 150; x += 6) { M(geo.cyl(0.25, 0.3, 0.6, 8), SP.flat(0x2a2a28, 0.6, 0.4), x, 0.3, -40.4, W.scene); }
  // ship
  const hull = SP.mat('metal', { color: 0x3a4652, roughness: 0.6, metalness: 0.4 }), deck = SP.mat('metal', { color: 0x6a3a2a, roughness: 0.8, metalness: 0.3 });
  W.box(16, 9, 90, 58, -4, -85, hull, { uv: 4, surf: 'metal' }); W.box(15.6, 0.2, 89.6, 58, 4.95, -85, deck, { uv: 3, collide: false });
  M(geo.box(16.1, 1, 90.1), SP.flat(0x7a2a20, 0.6, 0.3), 58, -1.6, -85, W.scene);
  W.box(14, 9, 14, 58, 5, -115, SP.mat('metal', { color: 0xd8d4c8, roughness: 0.6, metalness: 0.3 }), { uv: 3, surf: 'metal' }); W.box(10, 3, 10, 58, 14, -117, SP.mat('metal', { color: 0xd8d4c8, roughness: 0.6 }), { uv: 3 });
  for (let i = 0; i < 5; i++) M(geo.box(13, 0.1, 0.8), SP.flat(0x111a22, 0.2, 0.3, { emissive: 0x405a70, ei: 0.3 }), 58, 10 + (i % 2) * 2, -108 - i * 0.01, W.scene, false);
  const cols = [0x7a4232, 0x34505e, 0x5c6a3e, 0x8a7a3a, 0x6a3a5a, 0x2a4a7a];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) B.container(W, 53.4 + j * 7.5, -100 + i * 6.6, Math.PI / 2, cols[(i + j) % 6], 5 + (i % 3 === 0 ? 2.6 : 0) * 0);
  SP.build.stairs3 = function (x, z0, z1, y0, y1) { const n = Math.ceil((y1 - y0) / 0.33); for (let i = 0; i < n; i++) W.box(2, y0 + (i + 1) * 0.33 - y0, 0.55, x, y0, z0 + (z1 - z0) * i / n, SP.mat('metal', { color: 0x6a6a62, metalness: 0.5 }), { uv: 1, surf: 'metal' }); };
  for (let i = 0; i < 16; i++) W.box(1.6, (i + 1) * 0.33, 0.55, 49, 0, -41.6 - i * 0.55, SP.mat('metal', { color: 0x6a6a62, metalness: 0.5 }), { uv: 1, surf: 'metal' });
  W.box(4, 0.2, 2.2, 49.8, 5.1, -51.5, SP.mat('metal', { color: 0x6a6a62 }), { uv: 1 });
  // container yard (west)
  for (let gx = 0; gx < 6; gx++) for (let gz = 0; gz < 5; gz++) { const x = -120 + gx * 16, z = -28 + gz * 14; if (gx === 3 && gz === 2) continue; const h = 1 + Math.floor(SP.hash2(gx, gz) * 3); for (let k = 0; k < h; k++) B.container(W, x, z, 0, cols[(gx + gz + k) % 6], k * 2.6); B.container(W, x + 3, z, 0, cols[(gx * 2 + gz) % 6], 0); }
  // gantry cranes
  const cm = SP.mat('metal', { color: 0xc8a030, metalness: 0.5, roughness: 0.6 });
  [-30, 15].forEach(x => { [[-4, -36], [4, -36], [-4, -46], [4, -46]].forEach(([dx, dz]) => W.box(0.8, 24, 0.8, x + dx, 0, dz, cm, { uv: 2, collide: dz > -40 })); M(geo.box(10, 1.6, 40), cm, x, 24, -50, W.scene); M(geo.box(3, 3, 4), cm, x, 22, -58, W.scene); });
  // warehouse (east), interior with crates
  const wh = SP.mat('corrugated', { color: 0x8a8478, roughness: 0.6, metalness: 0.4 }); const P = SP.PORT.warehouse;
  B.wallWithOpenings(W, 'x', P.x - 20, P.z - 12, 40, 9, 0.4, 0, wh, [{ at: 20, w: 8, y0: 0, y1: 6 }]); B.wallWithOpenings(W, 'x', P.x - 20, P.z + 12, 40, 9, 0.4, 0, wh, [{ at: 12, w: 2, y0: 0, y1: 2.4 }]);
  B.wallWithOpenings(W, 'z', P.x - 20, P.z - 12, 24, 9, 0.4, 0, wh); B.wallWithOpenings(W, 'z', P.x + 20, P.z - 12, 24, 9, 0.4, 0, wh);
  M(geo.box(40.6, 0.3, 24.6), SP.mat('corrugated', { color: 0x5a564e }), P.x, 9.1, P.z, W.scene);
  for (let i = 0; i < 14; i++) B.crate(W, P.x + rand(-17, 17), P.z + rand(-9, 9), 1.2, SP.randi(1, 2), rand(0, 1.5));
  SP.build.pointLamp(W, P.x - 8, 8, P.z, 0xfff0d0, 5, 20, false); SP.build.pointLamp(W, P.x + 10, 8, P.z, 0xfff0d0, 4, 18, false);
  SP.PORT.drugCrates = []; for (let i = 0; i < 4; i++) { const x = P.x + 12 + (i % 2) * 1.4, z = P.z + 6 + Math.floor(i / 2) * 1.4; for (let k = 0; k < 6; k++) { const d = Mods.drugPack(); d.position.set(x + rand(-0.4, 0.4), 1.25, z + rand(-0.4, 0.4)); W.scene.add(d); } }
  // harbor office + street buildings (south)
  B.house(W, -10, 50, 16, 10, 6.4, { door: 'n', tint: 0xd8ccb8 });
  for (let i = 0; i < 12; i++) { const x = -120 + i * 22, z = 92; W.box(16, rand(6, 14), 12, x, 0, z, SP.mat('plaster', { color: SP.pick([0xd8ccb8, 0xe8dcc8, 0xc8b8a0]) }), { uv: 3 }); }
  // lights
  [[-80, -20], [-40, 20], [10, -20], [40, 0], [70, -30], [-10, 30]].forEach(([x, z], i) => B.floodlight(W, x, z, x + 4, z - 10, i % 2 === 0));
  for (let i = 0; i < 8; i++) M(geo.sph(0.4, 8, 6), SP.flat(0xffffff, 1, 0, { emissive: SP.pick([0xffd090, 0x90c0ff, 0xff9070]), ei: 25 }), rand(-400, 400), rand(1, 8), -400 - rand(0, 300), W.scene, false);
  return { start: V3(-10, 0, 80) };
};

/* ======================= VILLA (chapter 5 finale) ======================= */
SP.VILLA = { gate: V3(0, 0, 42), house: V3(0, 0, -12), pool: V3(0, 0, 14), pad: V3(34, 0, -26), garage: V3(-34, 0, -20), road: V3(0, 0, 140) };
function villaH(x, z) { let h = 0; if (z < -60) h = -SP.smooth(-60, -95, z) * 45 + SP.fbm(x * 0.03, z * 0.03, 3) * 6 * SP.smooth(-60, -80, z); const d = Math.abs(x) - 70; if (d > 0 && z > -60) h += SP.smooth(0, 120, d) * 14 + SP.fbm(x * 0.02, z * 0.02, 3) * 10 * SP.smooth(0, 40, d); if (Math.abs(x) < 6 && z > 40) h = Math.min(h, 0); return h; }
Maps.villa = function (W) {
  W.terrainH = villaH; W.surface = 'sand'; W.bounds = 500; flatTerrain(W, 1000, 220, villaH);
  const wm = new T.MeshStandardMaterial({ color: SP.lin(0x0c1822), roughness: 0.06, metalness: 0.3, envMapIntensity: 1.6 }); wm.normalMap = SP.TEX.water().normalMap; wm.normalScale = new T.Vector2(0.4, 0.4); const sea = new T.Mesh(new T.PlaneGeometry(2000, 1200), wm); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -38, -700); W.scene.add(sea);
  yardPlane(W, 100, 84, 0, 0, 'tile');
  const vm = SP.mat('plaster', { color: 0xf2e8d8, roughness: 0.95 }); wallRect(W, -50, -42, 50, 42, 3.4, vm, { s: 50 });
  SP.build.house(W, 0, -12, 26, 16, 7.4, { door: 's', tint: 0xfaf2e4 }); W.box(26.5, 0.4, 3, 0, 3.6, -2.5, vm, { uv: 2, collide: false }); // balcony
  for (let i = 0; i < 6; i++) W.box(0.4, 3.6, 0.4, -12 + i * 4.8, 0, -2.6, vm, { uv: 1 }); // colonnade
  SP.build.house(W, -34, -20, 12, 10, 3.6, { door: 's', tint: 0xeee4d4 }); SP.build.house(W, 30, 20, 10, 8, 3.6, { door: 'w', tint: 0xeee4d4 });
  // pool
  const pool = new T.Mesh(new T.PlaneGeometry(14, 7), new T.MeshStandardMaterial({ color: SP.lin(0x2aa0c8), roughness: 0.05, metalness: 0.1, emissive: SP.lin(0x0a4a6a), emissiveIntensity: 0.6, envMapIntensity: 1.5 })); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.06, 14); W.scene.add(pool);
  W.box(15, 0.3, 0.4, 0, 0, 10.4, SP.mat('tile', {}), { uv: 1 }); W.box(15, 0.3, 0.4, 0, 0, 17.6, SP.mat('tile', {}), { uv: 1 });
  const pl = new T.PointLight(SP.lin(0x40c0ff), 3, 14, 2); pl.position.set(0, 0.6, 14); W.scene.add(pl);
  [[-20, 30], [20, 34], [-40, 10], [40, 0], [-12, 26], [14, 28], [-44, 34], [44, 36]].forEach(([x, z]) => { const p = Mods.palm(rand(7, 10)); p.position.set(x, 0, z); W.scene.add(p); W.addCollider(V3(x - 0.3, 0, z - 0.3), V3(x + 0.3, 12, z + 0.3), 'wood'); });
  const hedge = SP.mat('fabric', { color: 0x3a5a2a, roughness: 1 }); [[-24, 4, 10, 1.2], [24, 4, 10, 1.2], [-24, -36, 18, 1.2], [20, -36, 18, 1.2]].forEach(([x, z, w, d]) => W.box(w, 1.3, d, x, 0, z, hedge, { uv: 1 }));
  // garage cars + helipad + helicopter
  for (let i = 0; i < 2; i++) { const t = Mods.technical(SP.pick([0x1a1a1a, 0xe0e0e0])); t.remove(t.userData.gun); t.position.set(-36 + i * 5, 0, -8); t.rotation.y = Math.PI; W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); }
  const pad = new T.Mesh(new T.CircleGeometry(8, 28), SP.mat('concrete', { color: 0x8a867c })); pad.rotation.x = -Math.PI / 2; pad.position.set(34, 0.07, -26); W.scene.add(pad);
  const heli = Mods.heli(); heli.position.set(34, 0, -26); heli.rotation.y = Math.PI / 2; heli.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.setHex(0x1a1a1c); } }); W.scene.add(heli); SP.VILLA.heli = heli;
  [[-40, 40], [40, 40], [-40, -38], [40, -38], [0, 20], [-20, -2], [20, -2]].forEach(([x, z]) => { W.box(0.15, 3, 0.15, x, 0, z, SP.mat('metal', { color: 0x2a2a28 }), { collide: false }); SP.build.pointLamp(W, x, 3.1, z, 0xffd8a0, 2.2, 12); });
  for (let i = 0; i < 40; i++) { const a = rand(0, 6.28), r = rand(80, 260); SP.build.rock(W, Math.cos(a) * r, Math.sin(a) * r + 40, rand(1, 4)); }
  SP.build.bushes(W, 90, [-300, 300, -60, 300], (x, z) => Math.abs(x) < 55 && Math.abs(z) < 46);
  return { start: V3(0, 0, 130) };
};
})();

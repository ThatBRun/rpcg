/* Survival Protocol 1.0 — new maps (Algiers, Timgad ruins, Atlas mountains, the Jackal's fortress, battle royale),
   weather (rain, snow, lightning) and map kits used by the chapter generator */
'use strict';
(function () {
const T = THREE, { V3, rand, lerp, clamp } = SP;
const geo = SP.geo, M = SP.M, Mods = SP.Models, B = SP.build, Maps = SP.Maps, G = SP.G;
SP.MAPKIT = SP.MAPKIT || {};
['asphalt', 'marble', 'snowtex', 'cobble'].forEach((k, i) => { if (!SP.TEX[k]) SP.TEX[k] = SP.TEX[['concrete', 'concrete', 'concrete', 'tile'][i]]; });

Object.assign(SP.ENV, {
  snow: { sunEl: 22, sunAz: 150, sunCol: 0xe8eeff, sunI: 1.1, zenith: 0x7a8ca8, horizon: 0xc8d2e0, ground: 0xdfe4ea, cloud: 0.85, cloudCol: 0xd8dee8, hemiS: 0xd0dcf0, hemiG: 0x9aa4b0, hemiI: 0.85, fog: 0xc0cad8, fogD: 0.012, exp: 1.0, night: 0, env: 0.9, weather: 'snow', atmDen: 0.004 },
  snownight: { sunEl: 35, sunAz: 300, sunCol: 0x9ab4e8, sunI: 0.45, zenith: 0x0a1020, horizon: 0x2a3448, ground: 0x6a7280, cloud: 0.5, cloudCol: 0x3a4458, hemiS: 0x6070a0, hemiG: 0x404858, hemiI: 0.35, fog: 0x2a3446, fogD: 0.008, exp: 1.45, night: 1, env: 0.6, weather: 'snow', moon: true },
  rain: { sunEl: 25, sunAz: 220, sunCol: 0xa8b4c4, sunI: 0.55, zenith: 0x3a4250, horizon: 0x6a7280, ground: 0x4a4640, cloud: 1, cloudCol: 0x4a525e, hemiS: 0x8090a4, hemiG: 0x3a3630, hemiI: 0.6, fog: 0x5a626e, fogD: 0.007, exp: 1.25, night: 0, env: 0.6, weather: 'rain', atmDen: 0.003 },
  storm: SP.ENV.storm,
  thunder: { sunEl: 30, sunAz: 300, sunCol: 0x8a9ac0, sunI: 0.35, zenith: 0x0c1018, horizon: 0x262c38, ground: 0x24221e, cloud: 1, cloudCol: 0x2a3040, hemiS: 0x50607a, hemiG: 0x1a1814, hemiI: 0.32, fog: 0x1e242e, fogD: 0.006, exp: 1.5, night: 1, env: 0.5, weather: 'rain', lightning: true },
  golden: { sunEl: 9, sunAz: 255, sunCol: 0xffb070, sunI: 3.0, zenith: 0x3a5a8c, horizon: 0xf6b07a, ground: 0x6a5038, cloud: 0.45, cloudCol: 0xffc8a0, hemiS: 0xffd0a8, hemiG: 0x5a4030, hemiI: 0.42, fog: 0xe0a07a, fogD: 0.0022, exp: 1.1, night: 0, env: 0.85 },
});

/* ---------------- shared helpers ---------------- */
function terrain(W, size, segs, hfn, colorFn, key = 'sand') {
  const g = new T.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hfn(x, z)); uv.setXY(i, x / 3.5, z / 3.5); }
  g.computeVertexNormals(); const n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const c = colorFn(p.getX(i), p.getY(i), p.getZ(i), n.getY(i)); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  const m = SP.mat(key, { roughness: 1, ns: 0.9 }).clone(); m.vertexColors = true; const mesh = new T.Mesh(g, m); mesh.receiveShadow = true; W.scene.add(mesh); W.terrainMesh = mesh; return mesh;
}
// instancing so dense detail stays cheap
function Inst(W) {
  const lists = {}; const I = {
    add(key, geom, mat, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, cast = true) { const L = lists[key] || (lists[key] = { geom, mat, m: [], cast }); const o = new T.Object3D(); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.y = ry; o.updateMatrix(); L.m.push(o.matrix.clone()); },
    build() { for (const k in lists) { const L = lists[k]; if (!L.m.length) continue; const im = new T.InstancedMesh(L.geom, L.mat, L.m.length); L.m.forEach((mm, i) => im.setMatrixAt(i, mm)); im.castShadow = L.cast; im.receiveShadow = true; W.scene.add(im); } },
  }; return I;
}
const unitBox = new T.BoxGeometry(1, 1, 1), unitCyl = new T.CylinderGeometry(0.5, 0.5, 1, 10), unitCone = new T.ConeGeometry(0.5, 1, 8);
unitBox.translate(0, 0.5, 0); unitCyl.translate(0, 0.5, 0); unitCone.translate(0, 0.5, 0);

/* city block building: solid, with windows, balconies, shops, rooftop clutter */
function building(W, I, x, z, w, d, floors, tint, night, o = {}) {
  const base = W.heightAt(x, z) - 0.1, h = floors * 3.2 + 0.6;
  const mat = SP.mat('plaster', { color: tint, roughness: 0.95, ns: 1.1 });
  W.box(w, h, d, x, base, z, mat, { uv: 3 });
  W.box(w + 0.3, 0.5, d + 0.3, x, base + h, z, SP.mat('concrete', { color: 0xc8c0b0 }), { uv: 2, collide: false });
  W.box(w + 0.2, 0.35, d + 0.2, x, base + 3.4, z, SP.mat('concrete', { color: 0xd8d0c0 }), { uv: 2, collide: false }); // ground floor cornice
  const glass = I.mats.glass, lit = I.mats.lit, bal = I.mats.bal, shut = I.mats.shut;
  const faces = [[0, d / 2 + 0.02, w, 0], [0, -d / 2 - 0.02, w, Math.PI], [w / 2 + 0.02, 0, d, Math.PI / 2], [-w / 2 - 0.02, 0, d, -Math.PI / 2]];
  for (const [fx, fz, L, ry] of faces) {
    const nW = Math.max(1, Math.floor(L / 3.1)); const nx = Math.sin(ry), nz = Math.cos(ry);
    for (let f = 1; f < floors; f++) for (let k = 0; k < nW; k++) {
      const off = -L / 2 + (k + 0.5) * L / nW; const px = x + fx + Math.cos(ry) * off, pz = z + fz - Math.sin(ry) * off, py = base + f * 3.2 + 1.0;
      const on = night && SP.hash2(px * 1.3, pz * 0.7 + f) > 0.62;
      I.add(on ? 'lit' : 'glass', unitBox, on ? lit : glass, px, py, pz, 1.1, 1.5, 0.08, ry, false);
      if (SP.hash2(px, pz + f * 3) > 0.7) { I.add('bal', unitBox, bal, px + nx * 0.45, py - 0.25, pz + nz * 0.45, 1.6, 0.12, 0.9, ry); I.add('bal', unitBox, bal, px + nx * 0.85, py - 0.13, pz + nz * 0.85, 1.6, 0.9, 0.05, ry); }
      else if (SP.hash2(px + 7, pz) > 0.65) I.add('shut', unitBox, shut, px + nx * 0.06, py, pz + nz * 0.06, 0.5, 1.5, 0.05, ry, false);
    }
    // shopfront + awning at street level
    if (o.shops !== false && SP.hash2(x + fx, z + fz) > 0.35) { const awn = I.mats.awn[Math.floor(SP.hash2(x, z + ry) * I.mats.awn.length)]; const cx = x + fx + nx * 1.0, cz = z + fz + nz * 1.0; const m = M(geo.box(Math.min(L * 0.7, 9), 0.08, 2), awn, cx, base + 3.0, cz, W.scene); m.rotation.y = ry; m.rotation.x = 0; I.add(night ? 'lit' : 'glass', unitBox, night ? lit : glass, x + fx + nx * 0.04, base + 0.3, z + fz + nz * 0.04, Math.min(L * 0.6, 7), 2.3, 0.06, ry, false); }
  }
  // rooftop: water tanks, AC units, antennas
  for (let i = 0; i < 2 + Math.floor(SP.hash2(x, z) * 3); i++) { const rx = x + rand(-w / 2 + 1, w / 2 - 1), rz = z + rand(-d / 2 + 1, d / 2 - 1); if (Math.random() < 0.5) I.add('tank', unitCyl, I.mats.tank, rx, base + h + 0.5, rz, 1.1, 1.3, 1.1); else I.add('ac', unitBox, I.mats.ac, rx, base + h + 0.5, rz, 0.9, 0.6, 0.6, rand(0, 3)); }
  if (SP.hash2(x * 2, z) > 0.7) I.add('ant', unitCyl, I.mats.ac, x, base + h + 0.5, z, 0.05, 4, 0.05);
  return { base, h };
}
function cityMats(night) {
  return {
    glass: new T.MeshStandardMaterial({ color: SP.lin(0x1c2228), roughness: 0.12, metalness: 0.6, envMapIntensity: 1.4 }),
    lit: new T.MeshStandardMaterial({ color: 0x302010, emissive: SP.lin(0xffc078), emissiveIntensity: night ? 2.6 : 0.2, roughness: 0.4 }),
    bal: SP.mat('metal', { color: 0x2c2c2a, roughness: 0.5, metalness: 0.6 }), shut: SP.flat(0x2f5a6a, 0.8), tank: SP.flat(0xd8d2c6, 0.6, 0.2), ac: SP.flat(0x9a9a96, 0.5, 0.3),
    awn: [SP.flat(0x8a2a22, 0.9), SP.flat(0x2a5a7a, 0.9), SP.flat(0xc8a040, 0.9), SP.flat(0x3a6a3a, 0.9)],
  };
}
function streetLamp(W, I, x, z, night) { const b = W.heightAt(x, z); I.add('pole', unitCyl, I.mats.bal, x, b, z, 0.14, 6, 0.14); I.add('lamp', unitBox, I.mats.lamp, x, b + 6, z, 0.5, 0.25, 0.5, 0, false); if (night && SP.hash2(x, z) > 0.45) { const l = new T.PointLight(SP.lin(0xffb870), 6, 18, 2); l.position.set(x, b + 5.6, z); W.scene.add(l); } }
function parkedCar(W, x, z, ry) { const t = Mods.technical(SP.pick([0xe6e2da, 0x1a1a1c, 0x7a1e18, 0x3a5a7a, 0xa8a49a])); if (t.userData.gun) t.remove(t.userData.gun); t.position.set(x, W.heightAt(x, z), z); t.rotation.y = ry; W.scene.add(t); W.colliderFrom(t, 'metal', 0.25); }

/* ============================ ALGIERS ============================ */
Maps.city = function (W) {
  const night = !!(SP.envCfg && SP.envCfg.night);
  W.terrainH = (x, z) => { const d = Math.max(Math.max(Math.abs(x), Math.abs(z)) - 150, 0); return SP.smooth(0, 90, d) * (12 + SP.fbm(x * 0.01, z * 0.01, 3) * 30); };
  W.surface = 'hard'; W.bounds = 400;
  terrain(W, 900, 160, W.terrainH, (x, y, z, ny) => { const v = 0.82 + SP.fbm(x * 0.02, z * 0.02, 2) * 0.2; return [v, v * 0.97, v * 0.93]; });
  const road = new T.Mesh(new T.PlaneGeometry(320, 320), SP.mat('asphalt', { color: 0x3a3a3c, roughness: 0.85 })); road.rotation.x = -Math.PI / 2; road.position.y = 0.03; road.receiveShadow = true; W.scene.add(road);
  const I = Inst(W); I.mats = cityMats(night); I.mats.lamp = SP.flat(0xfff0d0, 0.3, 0, { emissive: 0xffd8a0, ei: night ? 18 : 1 });
  const side = SP.mat('concrete', { color: 0xb0aaa0, roughness: 0.95 });
  const tints = [0xf2ead8, 0xe8dcc2, 0xd8c8a8, 0xf0e4cc, 0xe2d6c6, 0xcab89a, 0xf4efe4];
  // grid: blocks between streets at x,z = ±(10..) ; boulevard along x=0 is 24 wide, cross streets 14 wide
  const xs = [-140, -100, -60, -20, 20, 60, 100, 140], zs = [-140, -100, -60, -20, 20, 60, 100, 140];
  SP.CITY = { blocks: [], plaza: V3(0, 0, 0) };
  for (let ix = 0; ix < xs.length - 1; ix++) for (let iz = 0; iz < zs.length - 1; iz++) {
    let x0 = xs[ix] + 7, x1 = xs[ix + 1] - 7, z0 = zs[iz] + 7, z1 = zs[iz + 1] - 7;
    if (x0 < 12 && x1 > -12) { if (x1 > 0) x0 = 12; else x1 = -12; }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (Math.abs(cx) < 30 && Math.abs(cz) < 30) continue; // central plaza
    W.box(x1 - x0 + 2, 0.18, z1 - z0 + 2, cx, 0, cz, side, { uv: 2, collide: false }); // sidewalk
    const n = Math.abs(cx) > 110 || Math.abs(cz) > 110 ? 1 : 2; const bw = (x1 - x0) / n;
    for (let k = 0; k < n; k++) { const bx = x0 + bw * (k + 0.5); const floors = Math.abs(cx) > 110 || Math.abs(cz) > 110 ? 3 + Math.floor(SP.hash2(bx, cz) * 3) : 4 + Math.floor(SP.hash2(bx, cz) * 4); building(W, I, bx, cz, bw - 1.5, z1 - z0 - 1, floors, tints[(ix * 3 + iz + k) % tints.length], night); }
    SP.CITY.blocks.push([cx, cz]);
  }
  // plaza: fountain, palms, benches, statue
  const pz = SP.mat('tile', { color: 0xd8ccb0 }); const plaza = new T.Mesh(new T.CircleGeometry(26, 40), pz); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.06; plaza.receiveShadow = true; W.scene.add(plaza);
  W.box(7, 0.8, 7, 0, 0, 0, SP.mat('marble', { color: 0xe8e2d6 }), { uv: 1 }); M(geo.cyl(0.6, 0.8, 5, 12), SP.mat('marble', { color: 0xe8e2d6 }), 0, 3.2, 0, W.scene);
  const wtr = new T.Mesh(new T.PlaneGeometry(6.2, 6.2), new T.MeshStandardMaterial({ color: SP.lin(0x2a6a80), roughness: 0.05, metalness: 0.2, envMapIntensity: 1.5 })); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.82; W.scene.add(wtr);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const p = Mods.palm(rand(8, 11)); p.position.set(Math.cos(a) * 18, 0, Math.sin(a) * 18); W.scene.add(p); W.addCollider(V3(Math.cos(a) * 18 - 0.3, 0, Math.sin(a) * 18 - 0.3), V3(Math.cos(a) * 18 + 0.3, 10, Math.sin(a) * 18 + 0.3), 'wood'); }
  // boulevard palms, lamps, parked cars
  for (let z = -130; z <= 130; z += 16) { if (Math.abs(z) < 30) continue; const p = Mods.palm(rand(8, 10)); p.position.set(0, 0, z); W.scene.add(p); W.box(2.4, 0.25, 2.4, 0, 0, z, side, { uv: 1 }); streetLamp(W, I, -10.5, z + 8, night); streetLamp(W, I, 10.5, z, night); if (SP.hash2(z, 3) > 0.4) parkedCar(W, -9, z + 4, Math.PI / 2 * (SP.hash2(z, 1) > 0.5 ? 1 : -1) * 0 + Math.PI); if (SP.hash2(z, 9) > 0.5) parkedCar(W, 9, z - 3, 0); }
  for (const x of [-100, -60, -20, 20, 60, 100]) for (const z of [-120, -80, -40, 40, 80, 120]) if (SP.hash2(x, z) > 0.55) streetLamp(W, I, x + 5.5, z - 13, night);
  // barricades, burnt car, sandbags for fights
  B.wreckCar(W, 4, 52, 0.6); B.wreckCar(W, -6, -64, 2.2); B.sandbags(W, -6, 36, 5, 3); B.sandbags(W, 6, -36, 5, 3); B.sandbags(W, 30, 2, 5, 3, Math.PI / 2); B.sandbags(W, -30, -2, 5, 3, Math.PI / 2);
  for (let i = 0; i < 14; i++) B.crate(W, rand(-28, 28), rand(-28, 28) * (Math.random() < 0.5 ? 1 : -1), 1.0, 1, rand(0, 3));
  I.build(); W.road = (x, z) => Math.abs(x) < 150 && Math.abs(z) < 150;
  return { start: V3(0, 0, 130) };
};
SP.MAPKIT.city = {
  start: [0, 132, 0],
  stops: [{ at: [0, 96], area: [-10, 10, 50, 70], cover: [[-6, 66], [6, 70], [0, 58]] }, { at: [0, 44], area: [-26, 26, 0, 22], cover: [[-6, 36], [6, 36], [-14, 18], [14, 20]] }, { at: [-4, 10], area: [-12, 12, -50, -34], cover: [[6, -36], [-6, -40]] }, { at: [0, -52], area: [-10, 10, -110, -88], cover: [[-6, -64], [4, -96]] }, { at: [0, -100], area: [-10, 10, -140, -124], cover: [] }],
  side: [{ at: [-40, 40], area: [-58, -44, 20, 60] }, { at: [40, -40], area: [44, 58, -60, -20] }],
  defend: { at: [0, 8], spawns: [[-10, 10, 60, 80], [-10, 10, -80, -60], [40, 60, -10, 10], [-60, -40, -10, 10]] },
  stealth: { guards: [[0, 80, [[0, 80], [0, 60]]], [-8, 40, [[-8, 40], [8, 40]]], [8, 20], [-20, 0, [[-20, 0], [-20, -16]]], [20, -10], [0, -30, [[0, -30], [0, -50]]]], go: [0, -70] },
  lz: [0, -116], use: [[2, -2, 'Search the fountain drop'], [-8, 96, 'Check the wrecked car'], [8, -100, 'Plant the tracker']],
  chase: [[0, 130], [0, 60], [0, 0], [0, -60], [0, -130]],
};

/* ============================ TIMGAD RUINS ============================ */
Maps.ruins = function (W) {
  W.terrainH = (x, z) => { const r = Math.hypot(x, z); let h = SP.fbm(x * 0.008, z * 0.008, 4) * 6 * SP.smooth(60, 160, r) + SP.smooth(110, 300, r) * (18 + SP.fbm(x * 0.004, z * 0.004, 3) * 40); return h; };
  W.surface = 'dirt'; W.bounds = 420;
  terrain(W, 1100, 200, W.terrainH, (x, y, z, ny) => { const g = SP.fbm(x * 0.03 + 9, z * 0.03, 3); const grass = clamp(g * 1.6 - 0.2, 0, 1) * (ny > 0.9 ? 1 : 0.3); const base = [0.86, 0.74, 0.58]; const gr = [0.55, 0.58, 0.36]; const rock = [0.62, 0.58, 0.52]; const st = clamp((0.94 - ny) * 6, 0, 1); return base.map((b, i) => lerp(lerp(b, gr[i], grass), rock[i], st) * (0.9 + SP.vnoise(x * 0.2, z * 0.2) * 0.15)); }, 'dirt');
  const stone = SP.mat('marble', { color: 0xd8c8a8, roughness: 0.9, ns: 1.4 }), stone2 = SP.mat('concrete', { color: 0xc4b294, roughness: 1 });
  const I = Inst(W);
  // decumanus (main colonnaded street) along z, cardo along x
  const pave = new T.Mesh(new T.PlaneGeometry(14, 260), SP.mat('cobble', { color: 0xb8a888 })); pave.rotation.x = -Math.PI / 2; pave.position.y = 0.05; pave.receiveShadow = true; W.scene.add(pave);
  const pave2 = new T.Mesh(new T.PlaneGeometry(220, 12), SP.mat('cobble', { color: 0xb8a888 })); pave2.rotation.x = -Math.PI / 2; pave2.position.y = 0.055; pave2.receiveShadow = true; W.scene.add(pave2);
  const colG = new T.CylinderGeometry(0.45, 0.5, 1, 14); colG.translate(0, 0.5, 0);
  for (let z = -120; z <= 120; z += 6) for (const x of [-8, 8]) { if (Math.abs(z) < 10) continue; const broken = SP.hash2(x, z) < 0.35; const h = broken ? rand(1, 4.5) : 6.5; I.add('col', colG, stone, x, 0, z, 1, h, 1); W.addCollider(V3(x - 0.5, 0, z - 0.5), V3(x + 0.5, h, z + 0.5), 'hard'); if (!broken) I.add('cap', unitBox, stone, x, h, z, 1.3, 0.4, 1.3); }
  for (let x = -100; x <= 100; x += 7) for (const z of [-7, 7]) { if (Math.abs(x) < 12 || SP.hash2(x, z) < 0.4) continue; const h = rand(1.5, 6); I.add('col', colG, stone, x, 0, z, 1, h, 1); W.addCollider(V3(x - 0.5, 0, z - 0.5), V3(x + 0.5, h, z + 0.5), 'hard'); }
  // Trajan's arch at the west end of the cardo
  const ax = -60; W.box(3, 12, 6, ax, 0, -6, stone, { uv: 2 }); W.box(3, 12, 6, ax, 0, 6, stone, { uv: 2 }); W.box(3, 4, 18, ax, 12, 0, stone, { uv: 2 }); W.box(3.4, 0.6, 18.4, ax, 15.5, 0, stone2, { uv: 2, collide: false });
  for (const zz of [-9, 9]) W.box(2.6, 9, 2.6, ax, 0, zz, stone, { uv: 1 });
  // amphitheatre (semicircle of steps) north
  for (let r = 0; r < 9; r++) { const rad = 18 + r * 2.2, hgt = 0.6 + r * 0.7; for (let a = 0; a < 26; a++) { const ang = Math.PI * (0.05 + a / 26 * 0.9); const x = Math.cos(ang) * rad, z = -150 - Math.sin(ang) * rad; I.add('step', unitBox, stone2, x, 0, z, 4.6, hgt, 2.3, -ang + Math.PI / 2); } }
  for (let a = 0; a < 26; a++) { const ang = Math.PI * (0.05 + a / 26 * 0.9); for (let r = 0; r < 9; r += 3) { const rad = 18 + r * 2.2; W.addCollider(V3(Math.cos(ang) * rad - 1.5, 0, -150 - Math.sin(ang) * rad - 1.5), V3(Math.cos(ang) * rad + 1.5, 0.6 + (r + 2) * 0.7, -150 - Math.sin(ang) * rad + 1.5), 'hard'); } }
  W.box(30, 7, 3, 0, 0, -134, stone, { uv: 2 }); // stage wall
  // temple (capitol) east: podium + columns
  W.box(22, 2.2, 30, 70, 0, 50, stone2, { uv: 3 }); for (let i = 0; i < 6; i++) { const x = 61 + i * 3.6; I.add('col', colG, stone, x, 2.2, 36, 1.2, 10, 1.2); W.addCollider(V3(x - 0.6, 2.2, 35.4), V3(x + 0.6, 12, 36.6), 'hard'); }
  for (let i = 0; i < 6; i++) W.box(3, 0.4, 5, 70, i * 0.4, 31 - i * 0.8, stone2, { uv: 1 });
  // broken house walls (insulae) — cover for fights
  for (let i = 0; i < 46; i++) { let x = rand(-110, 110), z = rand(-120, 120); if (Math.abs(x) < 13 || Math.abs(z) < 12) continue; if (Math.hypot(x - 70, z - 50) < 22 || Math.hypot(x, z + 150) < 40) continue; const L = rand(4, 10), h = rand(0.8, 3.2); W.box(L, h, 0.8, x, W.heightAt(x, z) - 0.2, z, stone2, { uv: 1, ry: SP.hash2(x, z) > 0.5 ? Math.PI / 2 : 0 }); }
  // olive and cypress trees
  const leaf = SP.flat(0x5a6a3a, 0.9), dleaf = SP.flat(0x2e3e24, 0.9), bark = SP.flat(0x5a4a3a, 0.9);
  const sph = new T.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 160; i++) { const x = rand(-260, 260), z = rand(-260, 260); if (Math.abs(x) < 14 || Math.abs(z) < 14 || Math.hypot(x, z) < 30) continue; const y = W.heightAt(x, z); if (SP.hash2(x, z) > 0.5) { I.add('trunk', unitCyl, bark, x, y, z, 0.35, 2.2, 0.35); I.add('olive', sph, leaf, x, y + 3, z, rand(1.8, 2.8), rand(1.4, 2), rand(1.8, 2.8)); } else { I.add('trunk', unitCyl, bark, x, y, z, 0.25, 1, 0.25); I.add('cyp', unitCone, dleaf, x, y + 0.8, z, 1.4, rand(7, 10), 1.4); } W.addCollider(V3(x - 0.4, y, z - 0.4), V3(x + 0.4, y + 4, z + 0.4), 'wood'); }
  for (let i = 0; i < 50; i++) { const a = rand(0, 6.28), r = rand(140, 320); B.rock(W, Math.cos(a) * r, Math.sin(a) * r, rand(1, 4)); }
  B.bushes(W, 140, [-300, 300, -300, 300], (x, z) => Math.abs(x) < 12 || Math.abs(z) < 12);
  I.build();
  return { start: V3(0, 0, 118) };
};
SP.MAPKIT.ruins = {
  start: [0, 118, 0],
  stops: [{ at: [0, 80], area: [-30, 30, 30, 50], cover: [[-8, 44], [8, 40]] }, { at: [0, 20], area: [-40, 40, -20, -8], cover: [[-8, -14], [8, -18]] }, { at: [-40, 0], area: [-90, -70, -14, 14], cover: [[-58, -9], [-58, 9]] }, { at: [-20, -60], area: [-30, 30, -120, -100], cover: [[-8, -100], [8, -110]] }, { at: [0, -110], area: [-40, 40, -175, -160], cover: [[0, -136], [-10, -134]] }],
  side: [{ at: [55, 30], area: [60, 80, 40, 60], cover: [[64, 36], [76, 36]] }],
  defend: { at: [-60, 0], spawns: [[-100, -80, -30, 30], [-40, -20, 30, 50], [-40, -20, -50, -30], [-120, -100, -10, 10]] },
  stealth: { guards: [[0, 70, [[-10, 70], [10, 70]]], [-8, 40], [8, 10, [[8, 10], [8, -20]]], [-30, 0, [[-30, 0], [-50, 0]]], [0, -40], [10, -70, [[10, -70], [-10, -70]]]], go: [0, -100] },
  lz: [30, 90], use: [[-60, 0, 'Search under the arch'], [70, 32, 'Check the temple steps'], [0, -133, 'Recover the case on the stage']],
  snipe: { from: [70, 34, -Math.PI * 0.75, 2.4], targets: [[20, -10], [10, -30], [-10, -20], [30, 10], [0, -50]] },
};

/* ============================ ATLAS MOUNTAINS (snow) ============================ */
Maps.mountain = function (W) {
  const road = z => Math.sin(z / 70) * 18;
  W.terrainH = (x, z) => { const rx = x - road(z); const valley = SP.smooth(26, 150, Math.abs(rx)); let h = valley * (16 + SP.fbm(x * 0.006, z * 0.006, 4) * 48) + SP.smooth(10, 40, Math.abs(rx)) * SP.fbm(x * 0.02, z * 0.02, 3) * 3 + SP.fbm(x * 0.03, z * 0.03, 2) * 1.2; if (Math.hypot(x - 10, z + 160) < 70) h = Math.min(h, 2 + SP.fbm(x * 0.02, z * 0.02, 2) * 1.5); return h; };
  W.surface = 'snow'; W.bounds = 480;
  terrain(W, 1200, 220, W.terrainH, (x, y, z, ny) => { const rock = clamp((0.86 - ny) * 5, 0, 1); const sn = [0.95, 0.97, 1.0], rk = [0.36, 0.35, 0.36]; const v = 0.92 + SP.vnoise(x * 0.3, z * 0.3) * 0.08; return sn.map((s, i) => lerp(s, rk[i], rock) * v); }, 'snowtex');
  const I = Inst(W); const pine = SP.flat(0x1e3226, 0.95), pineS = SP.flat(0xdfe8ec, 0.9), bark = SP.flat(0x3a2e24, 0.9);
  for (let i = 0; i < 700; i++) { const z = rand(-420, 420), x = i < 380 ? road(z) + (Math.random() < 0.5 ? -1 : 1) * rand(10, 90) : rand(-420, 420); if (Math.abs(x - road(z)) < 9) continue; if (Math.hypot(x - 10, z + 160) < 55) continue; const y = W.heightAt(x, z); if (y > 60) continue; const s = rand(0.8, 1.5); I.add('trunk', unitCyl, bark, x, y, z, 0.3 * s, 2 * s, 0.3 * s); for (let k = 0; k < 3; k++) { I.add('pine', unitCone, pine, x, y + (1.2 + k * 1.7) * s, z, (3.6 - k * 0.9) * s, 3 * s, (3.6 - k * 0.9) * s); I.add('snowcap', unitCone, pineS, x, y + (2.4 + k * 1.7) * s, z, (2.2 - k * 0.6) * s, 1.2 * s, (2.2 - k * 0.6) * s); } if (Math.hypot(x, z) < 250) W.addCollider(V3(x - 0.5, y, z - 0.5), V3(x + 0.5, y + 6, z + 0.5), 'wood'); }
  for (let i = 0; i < 70; i++) { const x = rand(-300, 300), z = rand(-300, 300); if (Math.abs(x - road(z)) < 10) continue; B.rock(W, x, z, rand(1, 4)); }
  // road (packed snow), guard posts, the lab compound at (10,-160)
  const rm = SP.flat(0x9aa0a8, 0.9); for (let z = 240; z > -230; z -= 6) { const m = M(geo.box(9, 0.06, 6.2), rm, road(z), W.heightAt(road(z), z) + 0.04, z, W.scene, false); m.rotation.y = -Math.atan2(road(z + 3) - road(z - 3), 6); m.receiveShadow = true; }
  const cx = 10, cz = -160; const cm = SP.mat('concrete', { color: 0x8a8e92 });
  [[cx - 40, cz - 40, cx + 40, cz - 40], [cx - 40, cz + 40, cx - 6, cz + 40], [cx + 6, cz + 40, cx + 40, cz + 40], [cx - 40, cz - 40, cx - 40, cz + 40], [cx + 40, cz - 40, cx + 40, cz + 40]].forEach(([a, b, c, d]) => { const len = Math.hypot(c - a, d - b); const n = Math.floor(len / 1.1); for (let i = 0; i < n; i++) { const t = i / n; W.box(1.05, 1.6, 1.05, a + (c - a) * t, W.heightAt(a + (c - a) * t, b + (d - b) * t), b + (d - b) * t, SP.mat('hesco', { roughness: 1 }), { uv: 1 }); } });
  B.tower(W, cx - 37, cz + 37, 7); B.tower(W, cx + 37, cz + 37, 7); B.tower(W, cx - 37, cz - 37, 7); B.tower(W, cx + 37, cz - 37, 7);
  W.box(26, 6, 14, cx, W.heightAt(cx, cz - 15), cz - 15, cm, { uv: 3 }); W.box(26.6, 0.4, 14.6, cx, W.heightAt(cx, cz - 15) + 6, cz - 15, SP.flat(0xe8ecf0, 0.9), { uv: 2, collide: false });
  for (let i = 0; i < 6; i++) M(geo.box(2, 1.2, 0.1), new T.MeshStandardMaterial({ color: 0x182028, emissive: SP.lin(0x8ac8ff), emissiveIntensity: 1.2 }), cx - 10 + i * 4, W.heightAt(cx, cz) + 3.4, cz - 7.9, W.scene, false);
  SP.MOUNTAIN = { lab: V3(cx, 0, cz - 7), road };
  B.house(W, cx + 22, cz + 12, 10, 8, 3.4, { door: 'w', tint: 0xa0a4a8 }); B.house(W, cx - 22, cz + 12, 10, 8, 3.4, { door: 'e', tint: 0xa0a4a8 });
  B.container(W, cx + 20, cz - 28, 0, 0x34505e); B.container(W, cx - 24, cz - 28, 0, 0x5c6a3e); B.sandbags(W, cx - 4, cz + 30, 6, 3); B.sandbags(W, cx + 8, cz + 30, 6, 3);
  const mast = W.box(0.4, 22, 0.4, cx + 30, W.heightAt(cx + 30, cz), cz, SP.mat('metal', { color: 0xc04030, metalness: 0.5 }), { uv: 1 });
  B.floodlight(W, cx - 30, cz + 30, cx, cz, true); B.floodlight(W, cx + 30, cz - 30, cx, cz, false);
  [[road(120), 120], [road(20), 20], [road(-80), -80]].forEach(([x, z]) => { B.sandbags(W, x + 7, z, 4, 3, Math.PI / 2); B.crate(W, x - 7, z + 3, 1.2, 2); B.barrel(W, x - 6, z - 3, 0x3a3a34); });
  I.build();
  return { start: V3(road(220), 0, 220) };
};
const MR = z => Math.sin(z / 70) * 18;
SP.MAPKIT.mountain = {
  start: [MR(220), 220, 0],
  stops: [{ at: [MR(150), 150], area: [MR(110) - 18, MR(110) + 18, 100, 120], cover: [[MR(120) + 7, 120], [MR(122) - 7, 123]] }, { at: [MR(60), 60], area: [MR(20) - 18, MR(20) + 18, 10, 30], cover: [[MR(20) + 7, 20], [MR(23) - 7, 23]] }, { at: [MR(-40), -40], area: [MR(-80) - 18, MR(-80) + 18, -95, -70], cover: [[MR(-80) + 7, -80], [MR(-77) - 7, -77]] }, { at: [10, -112], area: [-20, 40, -150, -135], cover: [[6, -130], [18, -130], [-12, -148], [32, -148]] }, { at: [10, -150], area: [-25, 45, -195, -185], cover: [[30, -188], [-14, -188]] }],
  defend: { at: [10, -150], spawns: [[-10, 30, -110, -95], [-60, -45, -180, -140], [55, 70, -180, -140], [-10, 30, -215, -205]] },
  stealth: { guards: [[MR(160), 160, [[MR(160) - 6, 160], [MR(160) + 6, 160]]], [MR(100) + 10, 100], [MR(40), 40, [[MR(40), 40], [MR(10), 10]]], [MR(-30) - 10, -30], [10, -110, [[0, -110], [20, -110]]], [-20, -140]], go: [10, -130] },
  lz: [10, -172], use: [[10, -166, 'Download the lab server'], [32, -148, 'Plant charges on the generator'], [MR(20), 24, 'Search the guard post']],
  chase: (() => { const o = []; for (let z = 230; z >= -200; z -= 20) o.push([MR(z), z]); return o; })(),
};

/* ============================ THE JACKAL'S FORTRESS ============================ */
Maps.fortress = function (W) {
  W.terrainH = (x, z) => { const r = Math.max(Math.abs(x) - 90, Math.abs(z) - 90, 0); let h = 0; if (r > 0) h = -SP.smooth(0, 40, r) * 26 + SP.fbm(x * 0.01, z * 0.01, 3) * 10 * SP.smooth(10, 60, r); const rd = Math.abs(x) < 7 && z > 80 ? 1 : 0; if (rd) h = Math.max(h, -26 * SP.smooth(90, 250, z)); return h + (r === 0 ? SP.fbm(x * 0.04, z * 0.04, 2) * 0.25 : 0); };
  W.surface = 'sand'; W.bounds = 420;
  terrain(W, 1100, 220, W.terrainH, (x, y, z, ny) => { const rk = clamp((0.88 - ny) * 4, 0, 1); const s = [0.82, 0.62, 0.42], r = [0.48, 0.36, 0.26]; const v = 0.9 + SP.vnoise(x * 0.15, z * 0.15) * 0.15; return s.map((a, i) => lerp(a, r[i], rk) * v); });
  const mud = SP.mat('plaster', { color: 0xb07a50, roughness: 1, ns: 1.8 }), mud2 = SP.mat('plaster', { color: 0x9a6a44, roughness: 1, ns: 1.8 });
  const I = Inst(W);
  // outer wall with towers and crenellations, gate south (z=60)
  const wall = (x0, z0, x1, z1, gap) => { const len = Math.hypot(x1 - x0, z1 - z0), ax = Math.abs(x1 - x0) > 0.1 ? 'x' : 'z'; B.wallWithOpenings(W, ax, Math.min(x0, x1), Math.min(z0, z1), len, 9, 1.4, 0, mud, gap ? [{ at: len / 2, w: 7, y0: 0, y1: 6 }] : []); for (let i = 0; i < len; i += 2.2) { const x = ax === 'x' ? Math.min(x0, x1) + i : x0, z = ax === 'z' ? Math.min(z0, z1) + i : z0; I.add('cren', unitBox, mud, x, 9, z, 1.2, 1.1, 1.6); } };
  wall(-60, -60, 60, -60); wall(-60, 60, 60, 60, true); wall(-60, -60, -60, 60); wall(60, -60, 60, 60);
  [[-60, -60], [60, -60], [-60, 60], [60, 60], [-60, 0], [60, 0], [-12, 60], [12, 60]].forEach(([x, z]) => { W.box(8, 16, 8, x, 0, z, mud2, { uv: 3 }); for (let i = 0; i < 4; i++) I.add('cren', unitBox, mud2, x - 3 + i * 2, 16, z + 3.6, 1.2, 1.2, 0.8); for (let i = 0; i < 4; i++) I.add('cren', unitBox, mud2, x - 3 + i * 2, 16, z - 3.6, 1.2, 1.2, 0.8); });
  SP.FORT = { gateCols: [], gatePanels: [] };
  const gm = SP.mat('wood', { color: 0x4a3018 }); SP.FORT.gatePanels = [W.box(3.5, 6, 0.4, -1.75, 0, 60, gm, { uv: 1, surf: 'wood' }), W.box(3.5, 6, 0.4, 1.75, 0, 60, gm, { uv: 1, surf: 'wood' })]; SP.FORT.gateCols = W.colliders.slice(-2);
  // the keep (tall central kasbah) with stair ramp to the roof
  W.box(34, 14, 26, 0, 0, -20, mud, { uv: 3 }); W.box(14, 8, 14, 0, 14, -26, mud2, { uv: 3 }); for (let i = 0; i < 15; i++) I.add('cren', unitBox, mud, -16 + i * 2.3, 14, -7.4, 1.2, 1.2, 0.8);
  for (let i = 0; i < 20; i++) W.box(4, (i + 1) * 0.7, 1.2, 19.5, 0, 6 - i * 1.2, mud2, { uv: 1 });
  W.box(4, 0.4, 6, 19.5, 13.6, -21, mud2, { uv: 1 });
  for (let f = 0; f < 3; f++) for (let k = 0; k < 7; k++) M(geo.box(1.4, 2, 0.1), SP.flat(0x120c08, 0.9), -12 + k * 4, 2.5 + f * 4, -6.9, W.scene, false);
  SP.FORT.keepRoof = V3(0, 14.1, -18); SP.FORT.gate = V3(0, 0, 60);
  // courtyard: palms, well, market stalls, vehicles, helipad on the east
  for (const [x, z] of [[-30, 30], [30, 30], [-40, 10], [40, 12], [-20, 44], [22, 44]]) { const p = Mods.palm(rand(8, 11)); p.position.set(x, 0, z); W.scene.add(p); W.addCollider(V3(x - 0.3, 0, z - 0.3), V3(x + 0.3, 10, z + 0.3), 'wood'); }
  M(geo.cyl(2, 2, 1, 16), mud2, 0, 0.5, 26, W.scene); W.addCollider(V3(-2, 0, 24), V3(2, 1, 28), 'hard');
  B.tarp(W, -36, 40, 6, 4, 2.6, 0x8a3a2a); B.tarp(W, -26, 48, 6, 4, 2.6, 0x3a5a7a); B.tarp(W, 34, 46, 6, 4, 2.6, 0xa08040);
  for (let i = 0; i < 3; i++) { const t = Mods.technical(0xb8b0a0); t.position.set(-44 + i * 7, 0, -38); W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); }
  const pad = new T.Mesh(new T.CircleGeometry(9, 28), SP.mat('concrete', { color: 0x8a867c })); pad.rotation.x = -Math.PI / 2; pad.position.set(40, 0.07, -36); W.scene.add(pad);
  const heli = Mods.heli(); heli.position.set(40, 0, -36); heli.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.setHex(0x1a1a1c); } }); W.scene.add(heli); SP.FORT.heli = heli;
  B.sandbags(W, -14, 30, 6, 3); B.sandbags(W, 14, 30, 6, 3); B.sandbags(W, -24, 8, 6, 3, Math.PI / 2); B.sandbags(W, 24, 8, 6, 3, Math.PI / 2); B.hesco(W, -8, 14, 4); B.hesco(W, 4, 14, 4);
  for (let i = 0; i < 18; i++) B.crate(W, rand(-50, 50), rand(-50, 50), 1.2, 1 + Math.floor(Math.random() * 2), rand(0, 3));
  [[-50, 50], [50, 50], [-50, -50], [50, -50], [0, 40], [0, 0]].forEach(([x, z], i) => { const l = new T.PointLight(SP.lin(0xff9a50), 4, 20, 2); l.position.set(x, 3, z); W.scene.add(l); B.barrel(W, x + 1, z, 0x2a2018); G.fires.push({ pos: V3(x + 1, 1, z), t: 1e9, safe: true }); });
  // approach road with burnt vehicles, outer checkpoints
  for (let z = 70; z < 260; z += 30) { B.wreckCar(W, (z % 60 ? 5 : -5), z, rand(0, 3)); B.sandbags(W, -8, z + 10, 4, 3); }
  for (let i = 0; i < 40; i++) { const a = rand(0, 6.28), r = rand(130, 300); B.rock(W, Math.cos(a) * r, Math.sin(a) * r, rand(1.5, 5)); }
  I.build();
  return { start: V3(0, 0, 240) };
};
SP.fortOpenGate = function (W) { const F = SP.FORT; if (!F || F.open) return; F.open = true; F.gateCols.forEach(c => { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); }); F.gatePanels[0].rotation.y = 1.4; F.gatePanels[0].position.x -= 1.6; F.gatePanels[1].rotation.y = -1.4; F.gatePanels[1].position.x += 1.6; };
SP.MAPKIT.fortress = {
  start: [0, 240, 0], onLoad: () => { },
  stops: [{ at: [0, 200], area: [-14, 14, 150, 170], cover: [[-5, 160], [5, 170]] }, { at: [0, 130], area: [-14, 14, 80, 100], cover: [[-8, 90], [8, 100], [0, 72]] }, { at: [0, 66], area: [-30, 30, 30, 48], cover: [[-14, 30], [14, 30], [-24, 8], [24, 8]] }, { at: [0, 34], area: [-40, 40, -2, 14], cover: [[-8, 14], [4, 14], [-30, 30]] }, { at: [19, 4], area: [-16, 16, 1, 6], cover: [[-20, -2], [20, -2]] }],
  side: [{ at: [-40, 30], area: [-55, -30, -45, -30], cover: [[-44, -38], [-37, -38]] }, { at: [40, -20], area: [30, 55, -50, -30], cover: [[40, -30]] }],
  defend: { at: [0, 20], spawns: [[-10, 10, 64, 90], [-55, -40, 20, 50], [40, 55, 20, 50], [-30, 30, -52, -45]] },
  stealth: { guards: [[-6, 200, [[-6, 200], [6, 200]]], [8, 160], [0, 120, [[-8, 120], [8, 120]]], [-10, 90], [10, 80, [[10, 80], [-10, 80]]]], go: [-6, 66] },
  lz: [0, 220], use: [[0, 62, 'Plant the breaching charge'], [0, 26, 'Poison-check the well'], [40, -30, 'Sabotage the helicopter']],
  openGate: true,
  snipe: { from: [-8, 160, 0, 0], targets: [[-60, 62, 16.5], [60, 62, 16.5], [-12, 62, 16.5], [12, 62, 16.5], [0, 66]] },
};

/* ============================ BATTLE ROYALE: "Sahara Strike" ============================ */
SP.BR_POI = [
  { name: 'Oasis', x: 0, z: 0, kind: 'oasis' }, { name: 'Old Town', x: -230, z: -160, kind: 'town' }, { name: 'Airbase', x: 240, z: -200, kind: 'base' },
  { name: 'Oil Field', x: 220, z: 200, kind: 'oil' }, { name: 'Ruins', x: -220, z: 210, kind: 'ruins' }, { name: 'Farms', x: -40, z: 260, kind: 'farm' }, { name: 'Quarry', x: 40, z: -280, kind: 'quarry' }, { name: 'Radio Hill', x: 290, z: 30, kind: 'radio' },
];
Maps.br = function (W) {
  W.terrainH = (x, z) => { let h = SP.fbm(x * 0.004, z * 0.004, 4) * 26 + SP.fbm(x * 0.02, z * 0.02, 2) * 2; for (const p of SP.BR_POI) { const d = Math.hypot(x - p.x, z - p.z); h = lerp(h, p.kind === 'quarry' ? -6 : 1, SP.smooth(70, 35, d)); } const edge = Math.max(Math.abs(x), Math.abs(z)) - 380; if (edge > 0) h += edge * 0.6; return h; };
  W.surface = 'sand'; W.bounds = 420;
  terrain(W, 1000, 220, W.terrainH, (x, y, z, ny) => { const g = Math.hypot(x, z) < 60 ? clamp(1 - Math.hypot(x, z) / 60, 0, 1) : 0; const s = [0.9, 0.76, 0.56], gr = [0.5, 0.56, 0.32], r = [0.6, 0.5, 0.4]; const rk = clamp((0.9 - ny) * 4, 0, 1); const v = 0.9 + SP.fbm(x * 0.02, z * 0.02, 2) * 0.18; return s.map((a, i) => lerp(lerp(a, gr[i], g), r[i], rk) * v); });
  const I = Inst(W); W.loot = [];
  const tint = () => SP.pick([0xe8dcc8, 0xd8c8a8, 0xcab89a, 0xf0e4cc]);
  for (const p of SP.BR_POI) {
    const y0 = W.heightAt(p.x, p.z);
    if (p.kind === 'oasis') { const lake = new T.Mesh(new T.CircleGeometry(26, 36), new T.MeshStandardMaterial({ color: SP.lin(0x1e5a6a), roughness: 0.05, metalness: 0.2, envMapIntensity: 1.5 })); lake.rotation.x = -Math.PI / 2; lake.position.set(p.x, y0 + 0.15, p.z); W.scene.add(lake); for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28, r = rand(30, 46); const pm = Mods.palm(rand(7, 11)); pm.position.set(p.x + Math.cos(a) * r, W.heightAt(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r), p.z + Math.sin(a) * r); W.scene.add(pm); } for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.4; const hx = p.x + Math.cos(a) * 52, hz = p.z + Math.sin(a) * 52; B.house(W, hx, hz, 8, 7, 3.4, { door: 's', tint: tint() }); W.loot.push(V3(hx, 0, hz)); } }
    if (p.kind === 'town') { for (let i = 0; i < 12; i++) { const hx = p.x + (i % 4 - 1.5) * 16 + rand(-2, 2), hz = p.z + (Math.floor(i / 4) - 1) * 18 + rand(-2, 2); B.house(W, hx, hz, rand(8, 11), rand(7, 9), SP.hash2(hx, hz) > 0.7 ? 6.4 : 3.4, { door: SP.pick(['s', 'n', 'e', 'w']), tint: tint() }); W.loot.push(V3(hx, 0, hz)); } B.tower(W, p.x + 34, p.z, 8); }
    if (p.kind === 'base') { for (let i = 0; i < 26; i++) B.hesco(W, p.x - 45 + i * 3.4, p.z - 45, 3); for (let i = 0; i < 26; i++) B.hesco(W, p.x - 45, p.z - 45 + i * 3.4, 3, Math.PI / 2); W.box(30, 9, 20, p.x + 10, y0, p.z - 15, SP.mat('corrugated', { color: 0x7a8070 }), { uv: 3 }); for (let i = 0; i < 6; i++) { B.container(W, p.x - 25 + i * 7, p.z + 20, 0, SP.pick([0x34505e, 0x7a4232, 0x5c6a3e])); W.loot.push(V3(p.x - 25 + i * 7, 0, p.z + 15)); } B.tower(W, p.x + 40, p.z + 40, 9); B.tower(W, p.x - 40, p.z + 40, 9); W.loot.push(V3(p.x + 10, 0, p.z + 2), V3(p.x - 20, 0, p.z - 20)); const h = Mods.heli(); h.position.set(p.x + 30, y0, p.z + 10); W.scene.add(h); }
    if (p.kind === 'oil') { for (let i = 0; i < 6; i++) { const x = p.x + rand(-40, 40), z = p.z + rand(-40, 40); const yb = W.heightAt(x, z); W.box(1.2, 4, 6, x, yb, z, SP.mat('metal', { color: 0x2a2a2a, metalness: 0.6 }), { uv: 1 }); M(geo.box(0.5, 0.5, 7), SP.flat(0x2a2a2a, 0.5, 0.5), x, yb + 5, z, W.scene).rotation.x = 0.2; } for (let i = 0; i < 4; i++) { const x = p.x - 30 + i * 18, z = p.z + 30; M(geo.cyl(5, 5, 8, 20), SP.mat('metal', { color: 0xd8d4c8, metalness: 0.4 }), x, W.heightAt(x, z) + 4, z, W.scene); W.addCollider(V3(x - 4.5, 0, z - 4.5), V3(x + 4.5, 8, z + 4.5), 'metal'); W.loot.push(V3(x, 0, z - 8)); } B.house(W, p.x + 30, p.z - 30, 12, 8, 3.6, { door: 'w', tint: 0xb0b4b8 }); W.loot.push(V3(p.x + 30, 0, p.z - 30)); }
    if (p.kind === 'ruins') { for (let i = 0; i < 30; i++) { const x = p.x + rand(-40, 40), z = p.z + rand(-40, 40); const h = rand(1, 6); M(geo.cyl(0.5, 0.55, h, 12), SP.mat('marble', { color: 0xd8c8a8 }), x, W.heightAt(x, z) + h / 2, z, W.scene); W.addCollider(V3(x - 0.5, 0, z - 0.5), V3(x + 0.5, h, z + 0.5), 'hard'); } for (let i = 0; i < 8; i++) { const x = p.x + rand(-35, 35), z = p.z + rand(-35, 35); W.box(rand(4, 9), rand(1, 3), 0.8, x, W.heightAt(x, z) - 0.2, z, SP.mat('concrete', { color: 0xc4b294 }), { uv: 1, ry: rand(0, 3) }); W.loot.push(V3(x + 1.5, 0, z + 1.5)); } }
    if (p.kind === 'farm') { for (let i = 0; i < 5; i++) { const x = p.x - 40 + i * 20, z = p.z; B.house(W, x, z, 9, 7, 3.4, { door: 's', tint: tint() }); W.loot.push(V3(x, 0, z)); } for (let i = 0; i < 10; i++) { const fx = p.x + rand(-60, 60), fz = p.z + rand(20, 60); I.add('crop', unitBox, SP.flat(0x6a7a3a, 1), fx, W.heightAt(fx, fz), fz, 12, 0.5, 8, 0, false); } }
    if (p.kind === 'quarry') { for (let i = 0; i < 18; i++) B.rock(W, p.x + rand(-45, 45), p.z + rand(-45, 45), rand(2, 6)); for (let i = 0; i < 4; i++) { B.container(W, p.x - 20 + i * 12, p.z + 30, 0.3, 0x8a7a3a); W.loot.push(V3(p.x - 20 + i * 12, 0, p.z + 25)); } const t = Mods.truck('cargo', 0xb89a3a); t.position.set(p.x, W.heightAt(p.x, p.z), p.z); W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); }
    if (p.kind === 'radio') { W.box(0.6, 34, 0.6, p.x, y0, p.z, SP.mat('metal', { color: 0xc04030 }), { uv: 1 }); B.house(W, p.x + 10, p.z + 8, 10, 8, 3.4, { door: 'w', tint: 0xa0a4a8 }); W.loot.push(V3(p.x + 10, 0, p.z + 8), V3(p.x - 8, 0, p.z - 6)); B.sandbags(W, p.x - 8, p.z, 6, 3); }
  }
  // scattered cover between POIs
  for (let i = 0; i < 90; i++) { const x = rand(-370, 370), z = rand(-370, 370); B.rock(W, x, z, rand(1, 4)); }
  for (let i = 0; i < 30; i++) { const x = rand(-350, 350), z = rand(-350, 350); if (SP.BR_POI.some(p => Math.hypot(x - p.x, z - p.z) < 70)) continue; B.wreckCar(W, x, z, rand(0, 3)); W.loot.push(V3(x + 3, 0, z)); }
  B.bushes(W, 200, [-380, 380, -380, 380], () => false);
  I.build();
  return { start: V3(0, 0, 0) };
};

/* ============================ WEATHER ============================ */
const WX = SP.Weather = { kind: null, obj: null, flashT: 0, nextBolt: 8 };
WX.setup = function () {
  if (WX.obj && WX.obj.parent) WX.obj.parent.remove(WX.obj); WX.obj = null; WX.kind = SP.forceWeather || (SP.envCfg && SP.envCfg.weather) || null; if (WX.kind === 'thunder') WX.kind = 'rain';
  if (!WX.kind || !SP.scene) return; const q = SP.settings.quality; const n = q === 'low' ? 900 : q === 'medium' ? 1800 : 3200;
  if (WX.kind === 'rain') { const pos = new Float32Array(n * 6); for (let i = 0; i < n; i++) { const x = rand(-25, 25), y = rand(-2, 18), z = rand(-25, 25); pos.set([x, y, z, x + 0.05, y - 0.7, z + 0.02], i * 6); } const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); WX.obj = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0xaab4c4, transparent: true, opacity: 0.35, depthWrite: false })); }
  else if (WX.kind === 'snow') { const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([rand(-25, 25), rand(-2, 16), rand(-25, 25)], i * 3); const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); WX.obj = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false })); }
  if (WX.obj) { WX.obj.frustumCulled = false; SP.scene.add(WX.obj); }
};
WX.update = function (dt) {
  if (SP.scene && WX.obj && WX.obj.parent !== SP.scene) WX.setup(); if (WX.lastEnv !== SP.envCfg || WX.lastForce !== SP.forceWeather) { WX.lastEnv = SP.envCfg; WX.lastForce = SP.forceWeather; WX.setup(); }
  if (!WX.obj) return; const c = SP.camera.position; const p = WX.obj.geometry.attributes.position; const arr = p.array;
  if (WX.kind === 'rain') { for (let i = 0; i < arr.length; i += 6) { arr[i + 1] -= 26 * dt; arr[i + 4] -= 26 * dt; if (arr[i + 1] < c.y - 4) { const x = c.x + rand(-25, 25), z = c.z + rand(-25, 25), y = c.y + rand(10, 18); arr[i] = x; arr[i + 1] = y; arr[i + 2] = z; arr[i + 3] = x + 0.05; arr[i + 4] = y - 0.7; arr[i + 5] = z + 0.02; } } }
  else { for (let i = 0; i < arr.length; i += 3) { arr[i] += Math.sin(G.time * 0.7 + i) * dt * 0.6; arr[i + 1] -= 1.4 * dt; arr[i + 2] += dt * 0.4; if (arr[i + 1] < c.y - 4 || Math.abs(arr[i] - c.x) > 26 || Math.abs(arr[i + 2] - c.z) > 26) { arr[i] = c.x + rand(-25, 25); arr[i + 1] = c.y + rand(6, 16); arr[i + 2] = c.z + rand(-25, 25); } } }
  p.needsUpdate = true;
  if ((SP.envCfg && SP.envCfg.lightning) || SP.forceWeather === 'thunder') { WX.nextBolt -= dt; if (WX.nextBolt <= 0) { WX.nextBolt = rand(7, 18); WX.flashT = 0.35; setTimeout(() => SP.Audio.boom && SP.Audio.boom(null, 0.6), rand(600, 2200)); } if (WX.flashT > 0) { WX.flashT -= dt; SP.post.U.flash.value = Math.max(SP.post.U.flash.value, WX.flashT > 0.25 || (WX.flashT > 0.1 && WX.flashT < 0.16) ? 0.45 : 0); } }
};
})();

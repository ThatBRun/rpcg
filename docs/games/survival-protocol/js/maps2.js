/* Survival Protocol — Chapter 2 maps, environments, marksman rifle, civilians */
'use strict';
(function () {
const T = THREE, { V3, rand, lerp, clamp } = SP;
const geo = SP.geo, M = SP.M, Mods = SP.Models, B = SP.build, Maps = SP.Maps, G = SP.G;

/* ---------- environments ---------- */
Object.assign(SP.ENV, {
  day: { sunEl: 52, sunAz: 160, sunCol: 0xfff0da, sunI: 3.4, zenith: 0x3f6fb2, horizon: 0xc4d4e2, ground: 0x8a6a4a, cloud: 0.3, cloudCol: 0xffffff, hemiS: 0xcfe0ff, hemiG: 0x8a6a4a, hemiI: 0.45, fog: 0xc9d2d8, fogD: 0.0017, exp: 0.88, night: 0, env: 1, haze: 1.4 },
  dawn: { sunEl: 7, sunAz: 95, sunCol: 0xffb68a, sunI: 3.0, zenith: 0x5b7aa8, horizon: 0xf4c09a, ground: 0x6e5040, cloud: 0.38, cloudCol: 0xf6d0b8, hemiS: 0xd8c8c0, hemiG: 0x6a4e3a, hemiI: 0.55, fog: 0xd9b9a0, fogD: 0.0026, exp: 1.4, night: 0, env: 0.9, haze: 0.6 },
  afternoon: { sunEl: 26, sunAz: 250, sunCol: 0xffd6a8, sunI: 3.3, zenith: 0x4a74a8, horizon: 0xe2cbab, ground: 0x7a5a40, cloud: 0.4, cloudCol: 0xfff0e0, hemiS: 0xe0d8c8, hemiG: 0x7a5a40, hemiI: 0.42, fog: 0xd8c2a4, fogD: 0.0021, exp: 0.95, night: 0, env: 0.95, haze: 1.1 },
  cave: { sunEl: 60, sunAz: 100, sunCol: 0x000000, sunI: 0, zenith: 0, horizon: 0, ground: 0, cloud: 0, cloudCol: 0, hemiS: 0x3a3430, hemiG: 0x100c0a, hemiI: 0.1, fog: 0x070605, fogD: 0.035, exp: 1.5, night: 0.4, env: 0.15, indoor: true },
});

/* ---------- marksman rifle ---------- */
Mods.dmr = function () {
  const g = new T.Group(), met = SP.MAT.gunMetal(), pol = SP.MAT.fde(), blk = SP.MAT.polymer();
  M(geo.box(0.06, 0.08, 0.34), met, 0, 0.035, -0.08, g); M(geo.box(0.07, 0.07, 0.36), pol, 0, 0.035, -0.42, g);
  M(geo.cyl(0.012, 0.014, 0.42, 8), met, 0, 0.035, -0.8, g).rotation.x = Math.PI / 2; M(geo.cyl(0.018, 0.018, 0.08, 8), blk, 0, 0.035, -1.03, g).rotation.x = Math.PI / 2;
  M(geo.box(0.05, 0.13, 0.065), blk, 0, -0.1, 0.05, g).rotation.x = 0.35; const mag = M(geo.box(0.045, 0.13, 0.08), blk, 0, -0.07, -0.12, g); g.userData.mag = mag;
  M(geo.box(0.06, 0.12, 0.26), pol, 0, 0.0, 0.26, g); M(geo.box(0.06, 0.13, 0.03), blk, 0, -0.01, 0.39, g);
  const sc = M(geo.cyl(0.026, 0.026, 0.3, 14), blk, 0, 0.12, -0.08, g); sc.rotation.x = Math.PI / 2; M(geo.cyl(0.034, 0.03, 0.07, 14), blk, 0, 0.12, -0.26, g).rotation.x = Math.PI / 2; M(geo.cyl(0.03, 0.026, 0.05, 14), blk, 0, 0.12, 0.09, g).rotation.x = Math.PI / 2;
  M(geo.box(0.03, 0.04, 0.03), blk, 0, 0.085, -0.15, g); M(geo.box(0.03, 0.04, 0.03), blk, 0, 0.085, 0.0, g);
  M(geo.box(0.02, 0.15, 0.02), blk, -0.04, -0.06, -0.55, g).rotation.z = 0.3; M(geo.box(0.02, 0.15, 0.02), blk, 0.04, -0.06, -0.55, g).rotation.z = -0.3;
  g.userData.muzzle = V3(0, 0.035, -1.08); g.userData.sight = V3(0, 0.12, -0.08); return g;
};
SP.WEAP.dmr = { name: 'MK 20 MARKSMAN', auto: false, rpm: 220, dmg: 95, head: 3, mag: 10, reload: 2.7, spreadH: 0.03, spreadA: 0.0004, kick: 0.035, sound: 'fifty', model: () => Mods.dmr(), zoom: 14 };

/* ---------- civilians: wander, flee from gunfire ---------- */
const CIV_TOPS = [0xe6e0d2, 0x2f4f7a, 0x8a3a2a, 0x5a6a3a, 0xc9b68a, 0x6a5a7a, 0x3a3a3a, 0xa86a2a];
SP.civilian = function (pos, home, r = 18) {
  const u = new SP.Unit({ team: 'civ', pos, weapon: 'none', look: { weapon: 'none', faction: 'civ', top: SP.pick(CIV_TOPS), pants: SP.pick([0x3a3a3a, 0x5a4a3a, 0xd8d0c0, 0x2a3a4a]), head: SP.pick(['hair', 'shemagh', 'bare', 'wrap', 'beanie']), hairColor: 0x1a120c } });
  u.behavior = 'wander'; u.home = (home || pos).clone(); u.wr = r; u.walkSpeed = rand(0.9, 1.4); u.invuln = false; u.hp = 30; return u;
};

/* ---------- shared helpers ---------- */
function slopeTint(mesh) { // darken/grey steep slopes so cliffs read as rock
  const g = mesh.geometry, n = g.attributes.normal, c = g.attributes.color;
  for (let i = 0; i < n.count; i++) { const st = 1 - SP.smooth(0.55, 0.85, n.getY(i)); const v = c.getX(i); c.setXYZ(i, lerp(v, v * 0.62, st), lerp(v * 0.98, v * 0.55, st), lerp(v * 0.95, v * 0.5, st)); }
  c.needsUpdate = true;
}
function terrain(W, size, segs, hfn, uv = 3.5, slope = false) {
  const g = new T.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2); const p = g.attributes.position, uvA = g.attributes.uv; const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hfn(x, z)); uvA.setXY(i, x / uv, z / uv); const v = 0.86 + SP.fbm(x * 0.01 + 3, z * 0.01, 3) * 0.28; col[i * 3] = v; col[i * 3 + 1] = v * 0.98; col[i * 3 + 2] = v * 0.95; }
  g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
  const mat = SP.mat('sand', { roughness: 1, ns: 0.8 }).clone(); mat.vertexColors = true; const m = new T.Mesh(g, mat); m.receiveShadow = true; W.scene.add(m); W.terrainMesh = m; if (slope) slopeTint(m); return m;
}
function hescoLine(W, x0, z0, x1, z1, gap) { const n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / 1.1); const ry = Math.atan2(-(z1 - z0), x1 - x0); for (let i = 0; i < n; i++) { const t = i / n; const x = lerp(x0, x1, t), z = lerp(z0, z1, t); if (gap && Math.hypot(x - gap[0], z - gap[1]) < gap[2]) continue; W.box(1.05, 1.5, 1.05, x, W.heightAt(x, z), z, SP.mat('hesco', { roughness: 1 }), { uv: 1, ry, surf: 'sand' }); } }
function tent(W, x, z, w = 6, d = 9, color = 0x8a8460) { const t = new T.Mesh(new T.CylinderGeometry(w / 2, w / 2, d, 3, 1, false), SP.mat('canvas', { color })); t.rotation.set(Math.PI / 2, 0, 0); t.rotation.order = 'XYZ'; t.geometry.rotateY(Math.PI); t.position.set(x, W.heightAt(x, z) + w * 0.25, z); t.scale.set(1, 1, 0.8); t.castShadow = t.receiveShadow = true; W.scene.add(t); W.colliderFrom(t, 'hard', 0.5); return t; }
function stall(W, x, z, ry, color) {
  const g = new T.Group(); g.position.set(x, W.heightAt(x, z), z); g.rotation.y = ry; W.scene.add(g); const wd = SP.mat('wood', { color: 0x7a5a3a });
  [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]].forEach(([a, b]) => M(geo.box(0.08, 2.4, 0.08), wd, a, 1.2, b, g));
  const roof = M(geo.box(3.2, 0.04, 2.6), SP.mat('canvas', { color, roughness: 1 }), 0, 2.45, 0, g); roof.rotation.x = 0.12;
  M(geo.box(2.8, 0.08, 1.2), wd, 0, 0.85, -0.5, g); M(geo.box(2.8, 0.85, 0.06), wd, 0, 0.42, -1.08, g);
  const goods = [0xc8432a, 0xe8b23a, 0x6a9a3a, 0xd87a2a, 0xf0e0b0, 0x8a3a6a];
  for (let i = 0; i < 9; i++) { const s = rand(0.12, 0.25); const m = M(i % 3 ? geo.sph(s * 0.6, 8, 6) : geo.box(s, s, s), SP.flat(SP.pick(goods), 0.6), rand(-1.2, 1.2), 0.95 + s * 0.4, rand(-0.9, -0.2), g); }
  const rug = new T.Mesh(new T.PlaneGeometry(1.4, 2.0), SP.mat('shemagh', { color: SP.pick([0xffffff, 0xff9a7a, 0x9ab0ff]) })); rug.position.set(1.45, 1.3, 0); rug.rotation.y = Math.PI / 2; g.add(rug);
  g.updateMatrixWorld(true); const b = new T.Box3().setFromObject(g); W.addCollider(V3(b.min.x + 0.3, 0, b.min.z + 0.3), V3(b.max.x - 0.3, 0.95, b.max.z - 0.3), 'wood');
}
function stairs(W, x, z, dir, h, mat) { // dir: unit vector of travel (x or z), steps rise 0.33
  const n = Math.ceil(h / 0.33); for (let i = 0; i < n; i++) { const y = (i + 1) * 0.33; W.box(dir[0] ? 0.55 : 1.4, y, dir[0] ? 1.4 : 0.55, x + dir[0] * i * 0.55, W.heightAt(x, z) - 0.05, z + dir[1] * i * 0.55, mat, { uv: 1.5 }); }
}
function minaret(W, x, z) {
  const m = SP.mat('plaster', { color: 0xf6ead6 }); const b = W.heightAt(x, z);
  W.box(12, 7, 12, x, b, z, m, { uv: 3 }); const dome = M(new T.SphereGeometry(5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), SP.mat('plaster', { color: 0xdcc8a8 }), x, b + 7, z, W.scene); dome.castShadow = true;
  const tw = M(geo.cyl(1.3, 1.5, 22, 12), m, x + 8, b + 11, z + 4, W.scene); W.addCollider(V3(x + 6.6, b, z + 2.6), V3(x + 9.4, b + 22, z + 5.4), 'hard');
  M(geo.cyl(1.8, 1.8, 0.6, 12), m, x + 8, b + 18, z + 4, W.scene); M(new T.ConeGeometry(1.2, 3, 12), SP.mat('plaster', { color: 0xc8a878 }), x + 8, b + 23.5, z + 4, W.scene);
}

/* ======================= FOB (ch2 part 1) ======================= */
Maps.fob = function (W) {
  W.terrainH = (x, z) => { const d = Math.max(Math.abs(x) - 70, Math.abs(z) - 55, 0); return SP.smooth(0, 60, d) * (SP.fbm(x * 0.005, z * 0.005, 3) * 18 + 2) + SP.fbm(x * 0.03, z * 0.03, 2) * 0.4; };
  W.surface = 'sand'; W.bounds = 600; terrain(W, 1400, 220, W.terrainH, 3.5);
  hescoLine(W, -64, -48, 64, -48); hescoLine(W, -64, 48, 64, 48, [0, 48, 5]); hescoLine(W, -64, -48, -64, 48); hescoLine(W, 64, -48, 64, 48);
  const yard = new T.Mesh(new T.PlaneGeometry(126, 94), SP.mat('dirt', { roughness: 1 })); yard.rotation.x = -Math.PI / 2; yard.position.y = 0.04; yard.receiveShadow = true; W.scene.add(yard);
  // command tent (walk-in front), other tents
  SP.cmdTent = tent(W, 0, -28, 8, 12, 0x75704f); tent(W, -20, -30, 6, 9); tent(W, -32, -30, 6, 9); tent(W, 20, -32, 6, 9, 0x6e6a4c);
  // map table in front of the command tent
  W.box(2.4, 0.9, 1.4, 0, 0, -20.5, SP.mat('wood', { color: 0x6a4a30 }), { uv: 1 }); const mp = new T.Mesh(new T.PlaneGeometry(2.2, 1.2), SP.flat(0xcdbf98, 0.9)); mp.rotation.x = -Math.PI / 2; mp.position.set(0, 0.92, -20.5); W.scene.add(mp); SP.fobMap = mp;
  B.tarp(W, 0, -20, 7, 5, 2.8, 0x6e6a4c);
  // helicopters + trucks
  [[-40, -10], [-40, 18]].forEach(([x, z]) => { const h = Mods.heli(); h.position.set(x, 0, z); h.rotation.y = Math.PI / 2; W.scene.add(h); h.traverse(m => { if (m.isMesh) { m.castShadow = true; } }); W.addCollider(V3(x - 2.5, 0, z - 1.3), V3(x + 2.5, 3, z + 1.3), 'metal'); });
  SP.fobHeli = W.scene.children[W.scene.children.length - 1];
  for (let i = 0; i < 3; i++) { const t = Mods.truck('cargo', 0x6a6a4a); t.position.set(-10 + i * 6, 0, 30); W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); }
  B.container(W, 40, -38, 0, 0x5c6a3e); B.container(W, 46, -38, 0, 0x6a5a3a);
  // firing range (east): firing line at x=20
  B.sandbags(W, 20, -8, 6, 2, Math.PI / 2); B.sandbags(W, 20, 8, 6, 2, Math.PI / 2);
  for (let z = -16; z <= 16; z += 8) M(geo.box(0.1, 1.2, 0.1), SP.mat('wood', {}), 21, 0.6, z, W.scene);
  B.hesco(W, 62, -20, 0); hescoLine(W, 62, -24, 62, 24);
  SP.rangeSpots = []; for (let i = 0; i < 12; i++) SP.rangeSpots.push(V3(30 + (i % 4) * 8, 0, -18 + Math.floor(i / 4) * 14 + rand(-3, 3)));
  SP.longSpots = [[150, -30], [170, 20], [200, -60], [230, 40], [260, -10], [300, 70]].map(([x, z]) => V3(x, W.heightAt(x, z), z));
  // flag + generators + lights + bushes
  W.box(0.12, 9, 0.12, -8, 0, 4, SP.mat('metal', { color: 0x9a9a92, metalness: 0.6 }), { collide: false });
  const flag = new T.Mesh(new T.PlaneGeometry(2.2, 1.3, 10, 4), SP.flat(0x2d3b63, 0.8, 0, { side: T.DoubleSide })); flag.position.set(-6.85, 8.3, 4); W.scene.add(flag); SP.flag = flag;
  W.box(2.4, 1.6, 1.4, 30, 0, -40, SP.mat('metal', { color: 0x5b6243, roughness: 0.7, metalness: 0.4 }), { uv: 1.5, surf: 'metal' });
  for (let i = 0; i < 6; i++) B.ammoCrate(W, 22 + i * 0.6, 14 + (i % 2) * 0.5);
  B.bushes(W, 160, [-500, 500, -500, 500], (x, z) => Math.abs(x) < 80 && Math.abs(z) < 60);
  for (let i = 0; i < 30; i++) { const x = rand(-400, 400), z = rand(-400, 400); if (Math.abs(x) < 90 && Math.abs(z) < 70) continue; B.rock(W, x, z, rand(0.8, 3)); }
  return { start: V3(-20, 0, -22) };
};

/* ======================= TOWN (ch2 parts 2–5) ======================= */
const shellMats = {};
function shell(W, x, z, w, d, h, tint) { // cheap closed house for the outer town: one box + roof lip + dark door/window decals
  const m = shellMats[tint] || (shellMats[tint] = SP.mat('plaster', { color: tint, roughness: 1, ns: 1.4 })); const b = W.heightAt(x, z) - 0.1;
  W.box(w, h, d, x, b, z, m, { uv: 2.5 }); M(geo.box(w + 0.25, 0.45, d + 0.25), m, x, b + h + 0.2, z, W.scene);
  const dk = SP.flat(0x1a120c, 1); M(geo.box(1.1, 2.1, 0.04), dk, x + w * 0.2, b + 1.05, z + d / 2 + 0.02, W.scene, false); M(geo.box(0.9, 0.8, 0.04), dk, x - w * 0.25, b + 1.6, z + d / 2 + 0.02, W.scene, false);
}
SP.TOWN = { row: [], market: V3(0, 0, 0) };
Maps.town = function (W) {
  W.terrainH = (x, z) => { const d = Math.max(Math.hypot(x, z) - 150, 0); return SP.smooth(0, 120, d) * duneish(x, z); };
  function duneish(x, z) { return SP.fbm(x * 0.006, z * 0.006, 3) * 22; }
  W.surface = 'sand'; W.bounds = 500; terrain(W, 1200, 200, W.terrainH, 3.5);
  const street = new T.Mesh(new T.PlaneGeometry(300, 300), SP.mat('dirt', { roughness: 1 })); street.rotation.x = -Math.PI / 2; street.position.y = 0.03; street.receiveShadow = true; W.scene.add(street);
  const r = SP.rng(7); const tints = [0xf0dcc0, 0xe8d2b4, 0xf4e0c6, 0xe6caa6, 0xdcc2a0, 0xf6e8d0, 0xe0c6a8];
  const taken = (x, z) => Math.hypot(x, z) < 26 || (Math.abs(z + 30) < 8 && x > -70 && x < 70) || Math.hypot(x - 40, z + 70) < 16;
  // blocks of houses along a street grid
  for (let bx = -110; bx <= 110; bx += 24) for (let bz = -110; bz <= 110; bz += 24) { if (Math.max(Math.abs(bx), Math.abs(bz)) > 100 && r() < 0.5) continue;
    for (const [ox, oz] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) {
      const x = bx + ox + (r() - 0.5) * 1.5, z = bz + oz + (r() - 0.5) * 1.5; if (taken(x, z) || r() < 0.18) continue;
      const tall = r() < 0.35, w = 8 + r() * 2, d = 7 + r() * 2, hh = tall ? 6.4 : 3.6, tint = tints[Math.floor(r() * tints.length)], door = ['s', 'n', 'e', 'w'][Math.floor(r() * 4)];
      if (Math.hypot(x, z) < 58) B.house(W, x, z, w, d, hh, { door, tint }); else shell(W, x, z, w, d, hh, tint);
    }
  }
  // rooftop row along z=-30 (chase route), planks across the gaps, stairs at the west end
  const pm = SP.mat('wood', { color: 0x7a5a3a }); SP.TOWN.row = [];
  for (let i = 0; i < 11; i++) { const x = -60 + i * 12; const h = B.house(W, x, -30, 10, 9, 6.2, { door: i % 2 ? 'n' : 's', tint: tints[i % tints.length] }); SP.TOWN.row.push(h); if (i < 10) W.box(2.2, 0.12, 1.4, x + 6, h.base + 6.2 + 0.28, -30 + (i % 3 - 1) * 2.5, pm, { uv: 1 }); }
  SP.TOWN.roofY = SP.TOWN.row[0].base + 6.2 + 0.28 + 0.01;
  stairs(W, -66, -38, [0, 1], SP.TOWN.roofY, SP.mat('concrete', { color: 0xd8c4a4 }));
  // market square
  const stallCols = [0xb8432a, 0x2a5a8a, 0xd8a83a, 0x5a7a3a, 0x8a3a6a, 0xe8e0d0, 0xc8682a];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.2; const rr = 15 + (i % 2) * 4; stall(W, Math.cos(a) * rr, Math.sin(a) * rr, -a + Math.PI / 2, stallCols[i % stallCols.length]); }
  const fountain = W.box(4, 0.8, 4, 0, 0, 0, SP.mat('concrete', { color: 0xd8ccb8 }), { uv: 1.5 }); M(geo.cyl(0.3, 0.4, 2, 10), SP.mat('concrete', { color: 0xd8ccb8 }), 0, 1.8, 0, W.scene);
  for (let i = 0; i < 10; i++) { const a = rand(0, 6.28), rr = rand(5, 12); B.crate(W, Math.cos(a) * rr, Math.sin(a) * rr, 0.8, 1, rand(0, 3)); }
  minaret(W, 40, -70);
  [[-30, 30], [32, 22], [-24, -12], [60, 40], [-70, 10], [12, 58]].forEach(([x, z]) => { const p = Mods.palm(rand(7, 10)); p.position.set(x, 0, z); W.scene.add(p); W.addCollider(V3(x - 0.3, 0, z - 0.3), V3(x + 0.3, 12, z + 0.3), 'wood'); });
  [[-40, 12, 0.2], [28, -12, 1.4], [70, 3, 1.6], [-12, 40, 3.1], [86, -40, 0.4]].forEach(([x, z, ry]) => B.wreckCar(W, x, z, ry));
  for (let i = 0; i < 12; i++) { const x = rand(-100, 100), z = rand(-100, 100); if (Math.hypot(x, z) < 26) continue; B.barrel(W, x, z, SP.pick([0x2d4c74, 0x7a3a28, 0x3a5a3a])); }
  // laundry lines and awnings for detail
  const lm = new T.LineBasicMaterial({ color: 0x222222 }); for (let i = 0; i < 16; i++) { const x = rand(-100, 100), z = rand(-100, 100); if (Math.hypot(x, z) < 26) continue; const y = rand(3.2, 5); W.scene.add(new T.Line(new T.BufferGeometry().setFromPoints([V3(x, y, z), V3(x + 4, y - 0.3, z + rand(-1, 1))]), lm)); for (let k = 0; k < 3; k++) { const cl = new T.Mesh(new T.PlaneGeometry(0.6, 0.8), SP.flat(SP.pick(CIV_TOPS), 0.9, 0, { side: T.DoubleSide })); cl.position.set(x + 0.8 + k * 1.1, y - 0.5, z); W.scene.add(cl); } }
  B.bushes(W, 120, [-400, 400, -400, 400], (x, z) => Math.hypot(x, z) < 160);
  return { start: V3(-100, 0, 100) };
};

/* ======================= MOUNTAIN PASS (ch2 parts 6–7) ======================= */
SP.PASS = { cx: z => Math.sin(z / 110) * 28, ledge: V3(0, 0, 0) };
function passH(x, z) {
  const cx = SP.PASS.cx(z); const dx = Math.abs(x - cx); const wall = Math.max(0, dx - 14);
  let h = Math.pow(wall, 1.3) * 0.55 + SP.fbm(x * 0.02, z * 0.02, 4) * 6 * SP.smooth(10, 40, dx);
  h = Math.min(h, 70 + SP.fbm(x * 0.01 + 4, z * 0.01, 3) * 25);
  h += SP.fbm(x * 0.05, z * 0.05, 2) * 0.6;
  // ambush ledge (east side, above the road)
  const L = V3(SP.PASS.cx(-120) + 25, 0, -120); const dl = Math.hypot(x - L.x, z - L.z); if (dl < 15) h = lerp(h, 11, SP.smooth(15, 7, dl));
  return h;
}
Maps.pass = function (W) {
  W.terrainH = passH; W.surface = 'sand'; W.bounds = 700;
  const m = terrain(W, 1400, 300, passH, 3.2, true);
  SP.PASS.ledge = V3(SP.PASS.cx(-120) + 25, passH(SP.PASS.cx(-120) + 25, -120), -120);
  // dirt road down the valley
  const pts = []; for (let z = 500; z >= -600; z -= 10) pts.push(V3(SP.PASS.cx(z), 0, z)); SP.PASS.road = new T.CatmullRomCurve3(pts);
  const rg = new T.PlaneGeometry(7, 1100, 1, 220); const rp = rg.attributes.position; for (let i = 0; i < rp.count; i++) { const lx = rp.getX(i), lz = -rp.getY(i) - 50; const cx = SP.PASS.cx(lz); rp.setXYZ(i, cx + lx, passH(cx + lx, lz) + 0.06, lz); }
  rg.computeVertexNormals(); const road = new T.Mesh(SP.worldUV(rg, 3), SP.mat('dirt', { color: 0xc8b090, roughness: 1 })); road.receiveShadow = true; W.scene.add(road);
  for (let i = 0; i < 160; i++) { const z = rand(-560, 480), side = Math.random() < 0.5 ? -1 : 1; const x = SP.PASS.cx(z) + side * rand(15, 60); B.rock(W, x, z, rand(1, 4.5)); }
  for (let i = 0; i < 40; i++) { const z = rand(-560, 480), side = Math.random() < 0.5 ? -1 : 1; B.rock(W, SP.PASS.cx(z) + side * rand(7, 13), z, rand(0.5, 1.4)); }
  B.bushes(W, 200, [-300, 300, -600, 500], (x, z) => Math.abs(x - SP.PASS.cx(z)) < 5);
  // ledge cover
  const L = SP.PASS.ledge; B.sandbags(W, L.x - 7, L.z, 6, 3, Math.PI / 2); B.rock(W, L.x - 6, L.z + 6, 1.6); B.rock(W, L.x - 6, L.z - 7, 1.8);
  // cave mouth at the north end
  const cz = -540, cxx = SP.PASS.cx(cz) + 18; SP.PASS.cave = V3(cxx, passH(cxx, cz), cz);
  M(geo.sph(4, 16, 10), SP.flat(0x050403, 1), cxx + 2, SP.PASS.cave.y + 1.5, cz, W.scene, false).scale.set(0.5, 0.9, 1);
  return { start: V3(L.x, L.y, L.z) };
};

/* ======================= CAVES (ch2 part 8) ======================= */
Maps.caves = function (W) {
  W.floorY = 0; W.ceil = 3.8; W.surface = 'hard'; W.bounds = 400;
  // open areas (axis-aligned rects x0,z0,x1,z1)
  const open = [[-3, -45, 3, 2], [-13, -70, 13, -45], [3, -62, 50, -56], [50, -66, 53, -40], [44, -40, 64, -22], [54, -22, 58, 20], [48, 20, 68, 34]];
  SP.CAVE = { camp: V3(0, 0, -58), cache: V3(54, 0, -31), exit: V3(58, 0, 33), start: V3(0, 0, 0) };
  const inside = (x, z) => open.some(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d);
  const xs = -20, xe = 75, zs = -80, ze = 42; const solid = []; const rm = SP.mat('rock', { color: 0x9a8a78, roughness: 1, ns: 2 });
  const g = new T.BoxGeometry(1, 4.2, 1); const im = new T.InstancedMesh(SP.worldUV(g, 2), rm, 6000); let k = 0; const mm = new T.Matrix4(), q = new T.Quaternion();
  for (let x = xs; x <= xe; x++) for (let z = zs; z <= ze; z++) {
    if (inside(x + 0.5, z + 0.5)) continue; const nb = inside(x + 1.5, z + 0.5) || inside(x - 0.5, z + 0.5) || inside(x + 0.5, z + 1.5) || inside(x + 0.5, z - 0.5); if (!nb) continue;
    const j = SP.hash2(x + 50, z + 90); q.setFromEuler(new T.Euler(0, j * 3, 0)); mm.compose(V3(x + 0.5 + (j - 0.5) * 0.4, 1.9, z + 0.5 + (SP.hash2(z + 3, x) - 0.5) * 0.4), q, V3(1.2 + j * 0.6, 1, 1.2 + j * 0.5)); im.setMatrixAt(k++, mm);
    W.addCollider(V3(x, 0, z), V3(x + 1, 4, z + 1), 'hard');
  }
  im.count = k; im.castShadow = true; im.receiveShadow = true; W.scene.add(im);
  const fl = new T.Mesh(SP.worldUV(new T.BoxGeometry(xe - xs, 0.2, ze - zs), 3), SP.mat('dirt', { color: 0x9a8a78, roughness: 1 })); fl.position.set((xs + xe) / 2, -0.1, (zs + ze) / 2); fl.receiveShadow = true; W.scene.add(fl);
  const cl = new T.Mesh(SP.worldUV(new T.BoxGeometry(xe - xs, 0.4, ze - zs), 3), rm); cl.position.set((xs + xe) / 2, 4.0, (zs + ze) / 2); W.scene.add(cl);
  for (let i = 0; i < 60; i++) { const x = rand(xs, xe), z = rand(zs, ze); if (!inside(x, z)) continue; const s = rand(0.3, 0.9); const st = new T.Mesh(new T.ConeGeometry(s * 0.4, s * 2.5, 6), rm); st.position.set(x, 3.8 - s * 1.2, z); st.rotation.x = Math.PI; W.scene.add(st); }
  // camp + cache props + lanterns
  const lantern = (x, z, i = 2.4) => SP.build.pointLamp(W, x, 1.4, z, 0xffa860, i, 12);
  SP.caveLights = [lantern(-6, -58), lantern(8, -64), lantern(54, -30, 2), lantern(60, 26, 1.2)];
  B.crate(W, -9, -66, 1.0, 2, 0, 0); B.crate(W, 9, -50, 1.0, 1, 0.4, 0); B.ammoCrate(W, 4, -66, 0, 0); B.ammoCrate(W, -4, -50, 0.3, 0); B.tarp(W, 0, -58, 5, 4, 2.2, 0x5a4a38);
  for (let i = 0; i < 4; i++) { const b = Mods.barrel(0x4a5a3a); b.position.set(-11 + i * 0.7, 0, -48); W.scene.add(b); }
  for (let i = 0; i < 6; i++) B.ammoCrate(W, 50 + (i % 3) * 1.1, -36 + Math.floor(i / 3) * 0.6, 0, 0);
  SP.cacheBox = W.box(2.2, 1.0, 1.2, 58, 0, -30, SP.mat('metal', { color: 0x4d5236, metalness: 0.4 }), { uv: 1, surf: 'metal' });
  G.fires.push({ pos: V3(0, 0.1, -58), t: 1e9, safe: true });
  // daylight at the exit
  const ex = new T.PointLight(SP.lin(0xbfd8ff), 6, 20, 2); ex.position.set(58, 3, 36); W.scene.add(ex);
  M(geo.box(20, 4, 0.5), SP.flat(0xffffff, 1, 0, { emissive: 0xcfe2ff, ei: 4 }), 58, 2, 34.4, W.scene, false);
  return { start: V3(0, 0, 0) };
};

/* ======================= STRONGHOLD (ch2 parts 9–10) ======================= */
SP.HOLD = { gate: V3(0, 0, 40), cells: V3(28, 0, -12), main: V3(0, 0, -26), lz: V3(70, 0, 95), start: V3(-6, 0, 86) };
function holdH(x, z) { const d = Math.hypot(x * 0.9, z) - 90; let h = d > 0 ? Math.pow(d, 1.15) * 0.5 + SP.fbm(x * 0.02, z * 0.02, 4) * 10 * SP.smooth(0, 30, d) : SP.fbm(x * 0.04, z * 0.04, 2) * 0.5; const path = Math.abs(x + 6 - Math.sin(z / 30) * 4) < 6 && z > 30; if (path) h = Math.min(h, Math.max(0, (z - 90) * 0.35)); const lz = Math.hypot(x - 70, z - 95) < 14; if (lz) h = Math.min(h, 4); return h; }
Maps.stronghold = function (W) {
  W.terrainH = holdH; W.surface = 'sand'; W.bounds = 600; terrain(W, 1200, 260, holdH, 3.2, true);
  const yard = new T.Mesh(new T.PlaneGeometry(96, 86), SP.mat('dirt', { roughness: 1 })); yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.04, 0); yard.receiveShadow = true; W.scene.add(yard);
  const sm = SP.mat('plaster', { color: 0xb8a890, roughness: 1 });
  const wall = (x0, z0, x1, z1, gap) => { const len = Math.hypot(x1 - x0, z1 - z0), ax = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 'x' : 'z'; SP.build.wallWithOpenings(W, ax, Math.min(x0, x1), Math.min(z0, z1), len, 3.6, 0.8, 0, sm, gap ? [{ at: gap, w: 7, y0: 0, y1: 3.6 }] : []); };
  wall(-45, -40, 45, -40); wall(-45, 40, 45, 40, 45); wall(-45, -40, -45, 40); wall(45, -40, 45, 40, 30);
  SP.HOLD.towers = [SP.build.tower(W, -42, 37, 5), SP.build.tower(W, 42, 37, 5), SP.build.tower(W, -42, -37, 5)];
  SP.build.house(W, 0, -26, 18, 12, 6.6, { door: 's', tint: 0xcabaa0 });
  SP.build.house(W, -28, -10, 10, 14, 3.6, { door: 'e', tint: 0xd0c0a6 }); SP.build.house(W, -28, 14, 10, 12, 3.6, { door: 'e', tint: 0xcabaa0 });
  // cell block: concrete, 3 cells with bars along the west side
  const cm = SP.mat('concrete', { color: 0x9a948a }); const cx = 28, cz = -12;
  SP.build.wallWithOpenings(W, 'z', cx - 6, cz - 8, 16, 3.2, 0.3, 0, cm, [{ at: 8, w: 1.2, y0: 0, y1: 2.2 }]); W.box(0.3, 3.2, 16, cx + 6, 0, cz, cm, { uv: 2 }); W.box(12, 3.2, 0.3, cx, 0, cz - 8, cm, { uv: 2 }); W.box(12, 3.2, 0.3, cx, 0, cz + 8, cm, { uv: 2 }); M(geo.box(12.4, 0.3, 16.4), cm, cx, 3.35, cz, W.scene);
  const bar = SP.mat('metal', { color: 0x4a4a46, metalness: 0.7, roughness: 0.5 });
  for (let i = 0; i < 4; i++) W.box(4, 3.2, 0.2, cx + 4, 0, cz - 7 + i * 5, cm, { uv: 2 });
  for (let i = 0; i < 3; i++) { const z0 = cz - 7 + i * 5; for (let b = 0; b < 9; b++) M(geo.cyl(0.02, 0.02, 2.4, 6), bar, cx + 2.1, 1.2, z0 + 0.4 + b * 0.5, W.scene, false); W.addCollider(V3(cx + 2.0, 0, z0), V3(cx + 2.2, 2.4, z0 + 5), 'metal'); M(geo.box(1.8, 0.4, 0.8), SP.mat('fabric', { color: 0x5a5040 }), cx + 4.5, 0.2, z0 + 2.5, W.scene); }
  SP.HOLD.cellPos = V3(cx + 4.4, 0, cz - 2 + 2.5 - 5 + 5); SP.build.pointLamp(W, cx, 3.0, cz, 0xffc070, 2.4, 12);
  // yard props
  SP.build.sandbags(W, -8, 30, 6, 3); SP.build.sandbags(W, 10, 26, 5, 3, 0.4); SP.build.sandbags(W, -18, 0, 5, 3, Math.PI / 2); SP.build.sandbags(W, 14, -4, 5, 3, Math.PI / 2);
  for (let i = 0; i < 2; i++) { const t = Mods.technical(0xb8b0a0); t.position.set(-20 + i * 9, 0, 22); t.rotation.y = 0.3; W.scene.add(t); W.colliderFrom(t, 'metal', 0.3); }
  const tr = Mods.truck('cargo', 0x5a5e44); tr.position.set(20, 0, 22); tr.rotation.y = -0.5; W.scene.add(tr); W.colliderFrom(tr, 'metal', 0.3);
  SP.build.container(W, -36, -28, 0.1, 0x5a3a2a); SP.build.crate(W, 20, -30, 1.2, 2); SP.build.crate(W, -12, 10, 1.2, 1);
  const mast = SP.mat('metal', { color: 0x8a2a20, metalness: 0.6 }); M(geo.box(0.3, 22, 0.3), mast, 30, 11, 30, W.scene); M(geo.sph(0.25, 8, 6), SP.flat(0xff0000, 1, 0, { emissive: 0xff1010, ei: 40 }), 30, 22.3, 30, W.scene, false);
  SP.build.floodlight(W, -30, 30, -10, 10, true); SP.build.floodlight(W, 34, -30, 20, -10, true); SP.build.floodlight(W, 34, 34, 10, 20, false);
  [[-6, 6], [16, 12], [-30, -28]].forEach(([x, z]) => { SP.build.barrel(W, x, z, 0x3a2a20); G.fires.push({ pos: V3(x, 0.9, z), t: 1e9, safe: true }); const l = new T.PointLight(SP.lin(0xff7a30), 4, 12, 2); l.position.set(x, 1.6, z); W.scene.add(l); });
  // LZ outside
  const pad = new T.Mesh(new T.CircleGeometry(8, 28), SP.mat('concrete', { color: 0x8a867c })); pad.rotation.x = -Math.PI / 2; pad.position.set(70, holdH(70, 95) + 0.05, 95); W.scene.add(pad);
  for (let i = 0; i < 50; i++) { const a = rand(0, 6.28), r = rand(95, 200); B.rock(W, Math.cos(a) * r, Math.sin(a) * r, rand(1, 4)); }
  return { start: SP.HOLD.start.clone() };
};
})();

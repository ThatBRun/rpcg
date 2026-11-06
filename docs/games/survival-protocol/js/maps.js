/* Survival Protocol — environments + maps */
'use strict';
(function () {
const T = THREE, { V3, rand, lerp, clamp } = SP;
const geo = SP.geo, M = SP.M, Mods = SP.Models;
const Maps = SP.Maps = {};

/* ===================== environments ===================== */
const ENV = {
  dusk: { sunEl: 9, sunAz: 235, sunCol: 0xffb47a, sunI: 3.4, zenith: 0x4a6a95, horizon: 0xf0b07c, ground: 0x6e4c34, cloud: 0.42, cloudCol: 0xf2c6a0, hemiS: 0xffd2a8, hemiG: 0x6a4630, hemiI: 0.35, fog: 0xd8a47a, fogD: 0.0026, exp: 1.0, night: 0, env: 0.9, haze: 1 },
  dusk2: { sunEl: 5, sunAz: 245, sunCol: 0xff9a5a, sunI: 2.8, zenith: 0x3b557e, horizon: 0xe99a68, ground: 0x5e3f2c, cloud: 0.5, cloudCol: 0xe8a880, hemiS: 0xffc298, hemiG: 0x5a3a28, hemiI: 0.32, fog: 0xc98a62, fogD: 0.003, exp: 1.08, night: 0, env: 0.85 },
  night: { sunEl: 38, sunAz: 140, sunCol: 0x8fa8d8, sunI: 0.42, zenith: 0x060a16, horizon: 0x1a2235, ground: 0x0b0c10, cloud: 0.25, cloudCol: 0x2a3348, hemiS: 0x40507a, hemiG: 0x1a1612, hemiI: 0.22, fog: 0x141b29, fogD: 0.0026, exp: 1.4, night: 1, env: 0.55, moon: true },
  interior: { sunEl: 60, sunAz: 100, sunCol: 0x000000, sunI: 0.0, zenith: 0x0, horizon: 0x0, ground: 0x0, cloud: 0, cloudCol: 0, hemiS: 0x8a8378, hemiG: 0x2a2620, hemiI: 0.2, fog: 0x0e0d0c, fogD: 0.012, exp: 1.25, night: 0, env: 0.35, indoor: true },
  tunnel: { sunEl: 60, sunAz: 100, sunCol: 0x000000, sunI: 0.0, zenith: 0x0, horizon: 0x0, ground: 0x0, cloud: 0, cloudCol: 0, hemiS: 0x2a3036, hemiG: 0x0a0a0a, hemiI: 0.08, fog: 0x050607, fogD: 0.05, exp: 1.6, night: 0.5, env: 0.15, indoor: true },
};
SP.ENV = ENV;
SP.setEnv = function (scene, key, over = {}) {
  const e = Object.assign({}, ENV[key], over); SP.envCfg = e; SP.night = !!e.moon || key === 'tunnel' || key === 'cave';
  const az = e.sunAz * Math.PI / 180, el = e.sunEl * Math.PI / 180; const dir = V3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize(); SP.sunDir = dir;
  // sky
  const sm = SP.SkyMat(); const U = sm.uniforms; U.sunDir.value.copy(dir); U.zenith.value = SP.lin(e.zenith); U.horizon.value = SP.lin(e.horizon); U.ground.value = SP.lin(e.ground); U.sunCol.value = SP.lin(e.sunCol).multiplyScalar(e.moon ? 0.4 : 1.6); U.cloud.value = e.cloud; U.cloudCol.value = SP.lin(e.cloudCol); U.night.value = e.night; U.moonDir.value.copy(dir); U.haze.value = e.moon ? 0.3 : 1;
  if (e.moon) U.sunSize.value = 0.0;
  if (!e.indoor) { const sky = new T.Mesh(new T.SphereGeometry(3000, 32, 16), sm); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky); SP.sky = sky; } else SP.sky = null;
  // env map
  const pm = new T.PMREMGenerator(SP.renderer); const es = new T.Scene();
  if (!e.indoor) { const em = sm.clone(); em.uniforms.envMode.value = 1; es.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), em)); }
  else { const room = new T.Mesh(new T.BoxGeometry(30, 10, 30), new T.MeshBasicMaterial({ color: SP.lin(e.hemiS).multiplyScalar(0.25), side: T.BackSide })); es.add(room); for (let i = 0; i < 4; i++) { const p = new T.Mesh(new T.PlaneGeometry(6, 1), new T.MeshBasicMaterial({ color: new T.Color(3, 2.8, 2.5), side: T.DoubleSide })); p.position.set(-9 + i * 6, 4.9, 0); p.rotation.x = Math.PI / 2; es.add(p); } }
  const rt = pm.fromScene(es, 0, 0.1, 200); scene.environment = rt.texture; pm.dispose(); SP.envRT = rt;
  SP.vmScene.environment = rt.texture;
  scene.traverse(o => { if (o.isMesh && o.material && o.material.envMapIntensity != null) o.material.envMapIntensity = e.env; });
  Object.values(SP.matCache).forEach(m => { m.envMapIntensity = e.env; });
  // sun
  const sun = new T.DirectionalLight(SP.lin(e.sunCol), e.sunI); sun.castShadow = e.sunI > 0.05; const sc = sun.shadow.camera; const R = 55; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = 400;
  sun.shadow.mapSize.set(SP.shadowRes || 2048, SP.shadowRes || 2048); sun.shadow.bias = -0.0003; sun.shadow.radius = 2; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target); SP.sun = sun;
  const hemi = new T.HemisphereLight(SP.lin(e.hemiS), SP.lin(e.hemiG), e.hemiI); scene.add(hemi); SP.hemi = hemi;
  SP.vmHemi.color.copy(hemi.color); SP.vmHemi.groundColor.copy(hemi.groundColor); SP.vmHemi.intensity = e.hemiI + (e.indoor ? 0.3 : 0.15);
  scene.fog = new T.FogExp2(SP.lin(e.fog), e.fogD); scene.background = SP.lin(e.fog);
  SP.post.U.exposure.value = e.exp; SP.post.U.night.value = e.night; SP.baseExposure = e.exp; SP.post.U.haze.value = e.haze || 0; SP.post.U.sunCol.value = SP.lin(e.sunCol); { const PU = SP.post.U; PU.atmCol.value = SP.lin(e.fog).multiplyScalar(e.night ? 0.8 : 1.15); PU.sunDirW.value.copy(dir).normalize(); PU.atmDen.value = e.atmDen != null ? e.atmDen : (e.night ? 0.0014 : key === 'interior' || key === 'tunnel' || key === 'cave' ? 0.0 : 0.0019); PU.atmos.value = (key === 'interior' || key === 'tunnel' || key === 'cave') ? 0 : 1; SP.post.cutFrame = true; }
  if (!e.indoor) SP.addMotes(scene, e.moon ? 0x8fa0c0 : 0xffd9a8, e.moon ? 0.25 : 0.6);
  A.setReverb(e.indoor ? 0.6 : 0.25);
};
const A = SP.Audio;
SP.updateSun = function () { // keep shadow frustum on the player
  if (!SP.sun || !SP.P) return; const p = SP.P.pos; const d = SP.sunDir; const s = SP.sun; const snap = 1; const cx = Math.round(p.x / snap) * snap, cz = Math.round(p.z / snap) * snap;
  s.target.position.set(cx, p.y, cz); s.position.set(cx + d.x * 150, p.y + d.y * 150, cz + d.z * 150); if (SP.sky) SP.sky.position.copy(SP.camera.position);
};

/* ===================== terrain ===================== */
function terrainMesh(W, size, segs, hfn, mat, uvScale = 6) {
  const g = new T.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2); const p = g.attributes.position; const col = new Float32Array(p.count * 3); const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const h = hfn(x, z); p.setY(i, h); uv.setXY(i, x / uvScale, z / uvScale); const v = 0.86 + SP.fbm(x * 0.01 + 3, z * 0.01, 3) * 0.28; col[i * 3] = v; col[i * 3 + 1] = v * 0.98; col[i * 3 + 2] = v * 0.95; }
  g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false; W.scene.add(m); W.terrainMesh = m; return m;
}
function sandMat() { const m = SP.mat('sand', { color: 0xffffff, roughness: 1, ns: 0.8 }).clone(); m.vertexColors = true; return m; }

/* dune height field shared by desert maps */
function duneH(x, z, flat) {
  const warp = SP.fbm(x * 0.004 + 10, z * 0.004, 3) * 9; const ph = x / 46 + z / 150 + warp; const r = 0.5 + 0.5 * Math.sin(ph);
  const crest = Math.cos(ph) > 0 ? Math.pow(r, 2.2) : Math.pow(r, 1.2); const big = SP.fbm(x * 0.0035 + 7, z * 0.0035 + 3, 3);
  const small = Math.pow(0.5 + 0.5 * Math.sin(x / 17 - z / 60 + warp * 0.6), 2);
  let h = crest * (6 + 16 * big) + small * 1.2 + SP.fbm(x * 0.03, z * 0.03, 3) * 1.2;
  if (flat) { const k = flat(x, z); h = h * (0.05 + 0.95 * k) + (1 - k) * 0.3; }
  return h;
}

/* ===================== builders ===================== */
function wallWithOpenings(W, ax, x0, z0, len, h, th, base, mat, openings) { // ax: 'x' wall runs along x; openings [{at, w, y0, y1}]
  const spans = []; let cur = 0; openings = (openings || []).slice().sort((a, b) => a.at - b.at);
  for (const o of openings) { const a = o.at - o.w / 2, b = o.at + o.w / 2; if (a > cur) spans.push([cur, a, 0, h]); if (o.y0 > 0) spans.push([a, b, 0, o.y0]); if (o.y1 < h) spans.push([a, b, o.y1, h]); cur = b; }
  if (cur < len) spans.push([cur, len, 0, h]);
  for (const [a, b, y0, y1] of spans) { const L = b - a, H = y1 - y0; if (L < 0.01 || H < 0.01) continue; const c = a + L / 2; if (ax === 'x') W.box(L, H, th, x0 + c, base + y0, z0, mat, { uv: 2.5 }); else W.box(th, H, L, x0, base + y0, z0 + c, mat, { uv: 2.5 }); }
}
// mud-brick house with door/windows, flat roof + parapet. door: 's','n','e','w'
function house(W, x, z, w, d, h, o = {}) {
  const base = W.heightAt(x, z) - 0.15; const mat = SP.mat('plaster', { color: o.tint || 0xffffff, roughness: 1, ns: 1.4 }); const th = 0.3;
  const door = { at: (o.doorAt != null ? o.doorAt : 0.5), w: 1.15, y0: 0, y1: 2.15 }, win = (at) => ({ at, w: 0.9, y0: 1.2, y1: 2.0 });
  const sides = { s: [], n: [], e: [], w: [] }; const ds = o.door || 's';
  sides[ds].push(Object.assign({}, door, { at: door.at * (ds === 's' || ds === 'n' ? w : d) }));
  (o.windows || ['s', 'n', 'e', 'w']).forEach(sd => { const L = (sd === 's' || sd === 'n') ? w : d; const pos = sd === ds ? (door.at > 0.5 ? L * 0.22 : L * 0.78) : L * 0.5; sides[sd].push(win(pos)); });
  wallWithOpenings(W, 'x', x - w / 2, z + d / 2 - th / 2, w, h, th, base, mat, sides.s);
  wallWithOpenings(W, 'x', x - w / 2, z - d / 2 + th / 2, w, h, th, base, mat, sides.n);
  wallWithOpenings(W, 'z', x + w / 2 - th / 2, z - d / 2, d, h, th, base, mat, sides.e);
  wallWithOpenings(W, 'z', x - w / 2 + th / 2, z - d / 2, d, h, th, base, mat, sides.w);
  W.box(w - 0.1, 0.18, d - 0.1, x, base, z, SP.mat('dirt', { roughness: 1 }), { uv: 3 }); // floor
  const roof = W.box(w + 0.25, 0.28, d + 0.25, x, base + h, z, mat, { uv: 3 });
  W.box(w + 0.25, 0.45, 0.2, x, base + h + 0.28, z + d / 2, mat, { collide: false }); W.box(w + 0.25, 0.45, 0.2, x, base + h + 0.28, z - d / 2, mat, { collide: false });
  // wooden beams poking out + lintels
  for (let i = 0; i < Math.floor(w / 1.4); i++) W.box(0.12, 0.12, 0.5, x - w / 2 + 0.7 + i * 1.4, base + h - 0.15, z + d / 2 + 0.2, SP.mat('wood', { color: 0x7a5a3a }), { collide: false });
  // door darkness + frame
  return { base, x, z, w, d, h, inside: V3(x, base + 0.18, z) };
}
function crate(W, x, z, s = 1.2, stack = 1, ry = 0, y0) { const m = SP.mat('wood', { roughness: 0.85 }); const base = y0 != null ? y0 : W.heightAt(x, z); for (let i = 0; i < stack; i++) { const c = W.box(s, s, s, x + rand(-0.06, 0.06), base + i * s, z + rand(-0.06, 0.06), m, { uv: s, ry: ry + rand(-0.05, 0.05), surf: 'wood' }); M(geo.box(s * 1.01, 0.08, s * 1.01), SP.flat(0x4f3c26, 0.9), 0, -s / 2 + 0.1, 0, c, false); M(geo.box(s * 1.01, 0.08, s * 1.01), SP.flat(0x4f3c26, 0.9), 0, s / 2 - 0.1, 0, c, false); } }
function ammoCrate(W, x, z, ry = 0, y0) { const base = y0 != null ? y0 : W.heightAt(x, z); const m = SP.mat('metal', { color: 0x4d5236, roughness: 0.7, metalness: 0.4 }); const c = W.box(1.0, 0.45, 0.45, x, base, z, m, { ry, uv: 1, surf: 'metal' }); return c; }
function barrel(W, x, z, color, explosive, y0) { const b = Mods.barrel(color); const base = y0 != null ? y0 : W.heightAt(x, z); b.position.set(x, base, z); b.rotation.y = rand(0, 6); W.scene.add(b); b.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); const c = W.addCollider(V3(x - 0.3, base, z - 0.3), V3(x + 0.3, base + 0.9, z + 0.3), 'metal'); if (explosive) { const d = G.destructible(b, { hp: 30, radius: 6, dmg: 220, fire: 12 }); d.collider = c; } return b; }
const G = SP.G;
function sandbags(W, x, z, len, rows = 3, ry = 0) {
  const m = SP.mat('fabric', { color: 0xa8916c, roughness: 1 }); const g = new T.Group(); g.position.set(x, W.heightAt(x, z), z); g.rotation.y = ry; W.scene.add(g);
  const n = Math.floor(len / 0.62); for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) { const b = M(geo.sph(0.36, 10, 6), m, -len / 2 + 0.31 + i * 0.62 + (r % 2) * 0.3, 0.12 + r * 0.22, 0, g); b.scale.set(0.88, 0.36, 0.55); b.rotation.y = rand(-0.1, 0.1); }
  const c = new T.Mesh(new T.BoxGeometry(len, 0.12 + rows * 0.22, 0.6)); c.position.set(0, (0.12 + rows * 0.22) / 2, 0); g.add(c); c.visible = false; W.colliderFrom(c, 'sand'); return g;
}
function twall(W, x, z, ry = 0, h = 3.6) { const m = SP.mat('concrete', { roughness: 0.95 }); const base = W.heightAt(x, z); const g = new T.Group(); g.position.set(x, base, z); g.rotation.y = ry; W.scene.add(g); M(geo.box(1.5, 0.5, 1.4), m, 0, 0.25, 0, g); M(geo.box(1.5, h - 0.5, 0.35), m, 0, 0.5 + (h - 0.5) / 2, 0, g); g.updateMatrixWorld(true); const b = new T.Box3().setFromObject(g); W.addCollider(b.min, b.max, 'hard'); return g; }
function twallLine(W, ax, fixed, from, to, ry, gap) {
  const m = SP.mat('concrete', { roughness: 0.95 }); const pos = []; for (let v = from; v <= to; v += 1.55) { if (gap && v > gap[0] && v < gap[1]) continue; pos.push(v); }
  const gb = SP.worldUV(new T.BoxGeometry(1.5, 0.5, 1.4), 1.5); gb.translate(0, 0.25, 0); const gp = SP.worldUV(new T.BoxGeometry(1.5, 3.1, 0.35), 1.5); gp.translate(0, 2.05, 0);
  const ib = new T.InstancedMesh(gb, m, pos.length), ip = new T.InstancedMesh(gp, m, pos.length); const mm = new T.Matrix4(), q = new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry), sc = V3(1, 1, 1);
  pos.forEach((v, i) => { const x = ax === 'x' ? v : fixed, z = ax === 'x' ? fixed : v; mm.compose(V3(x, W.heightAt(x, z), z), q, sc); ib.setMatrixAt(i, mm); ip.setMatrixAt(i, mm); });
  [ib, ip].forEach(o => { o.castShadow = true; o.receiveShadow = true; W.scene.add(o); });
  const runs = []; let a = null, prev = null; pos.forEach(v => { if (a == null) a = v; else if (v - prev > 2) { runs.push([a, prev]); a = v; } prev = v; }); if (a != null) runs.push([a, prev]);
  runs.forEach(([a1, b1]) => { if (ax === 'x') W.addCollider(V3(a1 - 0.75, 0, fixed - 0.5), V3(b1 + 0.75, 3.6, fixed + 0.5), 'hard'); else W.addCollider(V3(fixed - 0.5, 0, a1 - 0.75), V3(fixed + 0.5, 3.6, b1 + 0.75), 'hard'); });
}
function hesco(W, x, z, n, ry = 0) { const m = SP.mat('hesco', { roughness: 1 }); for (let i = 0; i < n; i++) { const off = V3(i * 1.1, 0, 0).applyAxisAngle(V3(0, 1, 0), ry); W.box(1.05, 1.4, 1.05, x + off.x, W.heightAt(x + off.x, z + off.z), z + off.z, m, { uv: 1, ry, surf: 'sand' }); } }
function container(W, x, z, ry = 0, color = 0x7a4232, y0) { const base = y0 != null ? y0 : W.heightAt(x, z); const m = SP.mat('corrugated', { color, roughness: 0.6, metalness: 0.4 }); const c = W.box(2.44, 2.6, 6.06, x, base, z, m, { ry, uv: 2.6, surf: 'metal' }); return c; }
function tower(W, x, z, h = 6, ry = 0) {
  const leg = SP.mat('metal', { color: 0x5a5a52, roughness: 0.7, metalness: 0.5 }), wood = SP.mat('wood', {}); const base = W.heightAt(x, z);
  for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) W.box(0.2, h, 0.2, x + dx, base, z + dz, leg, { collide: false });
  const fl = W.box(3.2, 0.2, 3.2, x, base + h, z, wood, { uv: 2 }); W.box(3.2, 1.1, 0.12, x, base + h + 0.2, z - 1.55, wood, { uv: 1.5 }); W.box(3.2, 1.1, 0.12, x, base + h + 0.2, z + 1.55, wood, { uv: 1.5 }); W.box(0.12, 1.1, 3.2, x - 1.55, base + h + 0.2, z, wood, { uv: 1.5 }); W.box(0.12, 1.1, 3.2, x + 1.55, base + h + 0.2, z, wood, { uv: 1.5 });
  W.box(3.6, 0.15, 3.6, x, base + h + 2.6, z, SP.mat('corrugated', { color: 0x9a9a92 }), { collide: false });
  for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) W.box(0.1, 2.4, 0.1, x + dx, base + h + 0.2, z + dz, leg, { collide: false });
  return { top: V3(x, base + h + 0.2, z) };
}
function floodlight(W, x, z, aimX, aimZ, real, color = 0xffc98a) {
  const base = W.heightAt(x, z); const pole = SP.mat('metal', { color: 0x4a4a46, roughness: 0.6, metalness: 0.6 }); W.box(0.18, 7, 0.18, x, base, z, pole, { collide: true });
  const head = M(geo.box(0.7, 0.4, 0.25), SP.flat(0xfff0d0, 0.3, 0, { emissive: color, ei: 14 }), x, base + 7.1, z, W.scene, false); head.lookAt(aimX, base, aimZ);
  if (real) { const s = new T.SpotLight(SP.lin(color), 22, 55, 0.75, 0.6, 2); s.position.set(x, base + 7, z); s.target.position.set(aimX, base, aimZ); W.scene.add(s, s.target); s.castShadow = false; }
}
function pointLamp(W, x, y, z, color = 0xffc88a, i = 3, dist = 12, shadow = false) { const l = new T.PointLight(SP.lin(color), i, dist, 2); l.position.set(x, y, z); l.castShadow = shadow; if (shadow) { l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.002; } W.scene.add(l); M(geo.sph(0.08, 8, 6), SP.flat(0xffffff, 0.3, 0, { emissive: color, ei: 20 }), x, y, z, W.scene, false); return l; }
function rock(W, x, z, s) { const g = new T.DodecahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + SP.vnoise(p.getX(i) * 2 + x, p.getZ(i) * 2 + z) * 0.4; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); const m = new T.Mesh(SP.worldUV(g, 2), SP.mat('rock', { roughness: 0.95 })); m.scale.set(s, s * rand(0.5, 0.8), s * rand(0.8, 1.2)); m.position.set(x, Math.min(W.heightAt(x, z), W.heightAt(x + s * 0.8, z), W.heightAt(x - s * 0.8, z), W.heightAt(x, z + s * 0.8), W.heightAt(x, z - s * 0.8)) + s * 0.05, z); m.rotation.y = rand(0, 6); m.castShadow = m.receiveShadow = true; W.scene.add(m); if (s > 0.8) W.colliderFrom(m, 'hard', s * 0.2); return m; }
function bushes(W, n, area, avoid) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const k = c.getContext('2d'); k.strokeStyle = '#6b5a3c'; for (let i = 0; i < 70; i++) { k.lineWidth = rand(1, 2.5); k.strokeStyle = SP.pick(['#6b5a3c', '#7f6d47', '#5a4a30', '#8a7a52']); k.beginPath(); k.moveTo(64, 128); const a = rand(-1.3, 1.3); const l = rand(30, 110); k.quadraticCurveTo(64 + Math.sin(a) * l * 0.5, 128 - l * 0.6, 64 + Math.sin(a) * l, 128 - Math.cos(a) * l); k.stroke(); }
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; const mat = new T.MeshStandardMaterial({ map: t, alphaTest: 0.35, side: T.DoubleSide, roughness: 1 });
  const g = new T.PlaneGeometry(1.4, 1.1); g.translate(0, 0.55, 0); const im = new T.InstancedMesh(g, mat, n * 2); const m4 = new T.Matrix4(), q = new T.Quaternion(), s = V3(); let k2 = 0;
  for (let i = 0; i < n; i++) { const x = rand(area[0], area[1]), z = rand(area[2], area[3]); if (avoid && avoid(x, z)) continue; const sc = rand(0.6, 1.4); for (let j = 0; j < 2; j++) { q.setFromAxisAngle(V3(0, 1, 0), j * Math.PI / 2 + i); s.set(sc, sc, sc); m4.compose(V3(x, W.heightAt(x, z) - 0.05, z), q, s); im.setMatrixAt(k2++, m4); } }
  im.count = k2; im.castShadow = true; W.scene.add(im);
}
function powerline(W, pts) { const pm = SP.mat('wood', { color: 0x6a5038 }); pts.forEach(([x, z]) => { const b = W.heightAt(x, z); W.box(0.22, 8, 0.22, x, b, z, pm, { collide: false }); W.box(2.2, 0.15, 0.15, x, b + 7.3, z, pm, { collide: false }); }); const lm = new T.LineBasicMaterial({ color: 0x1a1a1a }); for (let i = 0; i < pts.length - 1; i++) for (const off of [-0.9, 0, 0.9]) { const a = pts[i], b = pts[i + 1]; const ha = W.heightAt(a[0], a[1]) + 7.4, hb = W.heightAt(b[0], b[1]) + 7.4; const curve = []; for (let k = 0; k <= 12; k++) { const t2 = k / 12; curve.push(V3(lerp(a[0], b[0], t2) + off, lerp(ha, hb, t2) - Math.sin(t2 * Math.PI) * 1.2, lerp(a[1], b[1], t2))); } W.scene.add(new T.Line(new T.BufferGeometry().setFromPoints(curve), lm)); } }
function tarp(W, x, z, w, d, h, color = 0x6d5f45) { const b = W.heightAt(x, z); const pm = SP.mat('wood', {}); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => W.box(0.1, h, 0.1, x + sx * w / 2, b, z + sz * d / 2, pm, { collide: false })); const g = new T.PlaneGeometry(w, d, 8, 8); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, -Math.sin((p.getX(i) / w + 0.5) * Math.PI) * 0 - (1 - Math.abs(p.getX(i) / w * 2)) * (1 - Math.abs(p.getZ(i) / d * 2)) * 0.3); g.computeVertexNormals(); const m = new T.Mesh(g, SP.mat('canvas', { color, side: T.DoubleSide, roughness: 1 })); m.position.set(x, b + h, z); m.castShadow = true; m.receiveShadow = true; W.scene.add(m); }
function wreckCar(W, x, z, ry) { const t = Mods.technical(SP.pick([0x8a8478, 0x5e6a72, 0x9a6a4a])); t.remove(t.userData.gun); t.position.set(x, W.heightAt(x, z) - 0.25, z); t.rotation.set(rand(-0.05, 0.05), ry, rand(-0.08, 0.08)); t.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiplyScalar(0.55); m.material.roughness = 0.95; m.castShadow = true; } }); W.scene.add(t); W.colliderFrom(t, 'metal', 0.25); return t; }
SP.build = { house, crate, ammoCrate, barrel, sandbags, twall, hesco, container, tower, floodlight, pointLamp, rock, bushes, tarp, wreckCar, wallWithOpenings };

/* ===================== DESERT (parts 2–5) ===================== */
SP.VILLAGE = V3(0, 0, -190);
const ROUTE = [[0, 30], [-2, -40], [3, -100], [0, -150]];
function desertFlat(x, z) {
  let d = 1e9; for (let i = 0; i < ROUTE.length - 1; i++) { const [ax, az] = ROUTE[i], [bx, bz] = ROUTE[i + 1]; const vx = bx - ax, vz = bz - az; const t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1); d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t)); }
  const dv = Math.hypot(x - SP.VILLAGE.x, (z - SP.VILLAGE.z) * 0.8) - 55; d = Math.min(d, dv);
  return SP.smooth(14, 70, d);
}
Maps.desert = function (W, o = {}) {
  W.terrainH = (x, z) => duneH(x, z, desertFlat); W.surface = 'sand'; W.bounds = 900;
  terrainMesh(W, 1900, 340, W.terrainH, sandMat(), 3.5);
  const v = SP.VILLAGE; const H = [];
  H.push(house(W, -22, -150, 10, 8, 3.6, { door: 's', tint: 0xf0dcc0 }));
  H.push(house(W, 18, -158, 9, 8, 3.4, { door: 's', tint: 0xe8d2b4, doorAt: 0.3 }));
  H.push(house(W, -6, -182, 11, 8, 4.0, { door: 's', tint: 0xf4e0c6 }));
  H.push(house(W, 25, -192, 9, 7, 3.4, { door: 'w', tint: 0xe6caa6 }));
  H.push(house(W, -38, -200, 12, 8, 3.4, { door: 'e', tint: 0xeed8bc }));
  H.push(house(W, 6, -220, 14, 9, 4.2, { door: 's', tint: 0xdcc2a0 })); // stash house
  H.push(house(W, -24, -232, 9, 8, 3.4, { door: 'n', tint: 0xf0dcc0 }));
  SP.houses = H;
  // compound walls (mud)
  const mud = SP.mat('plaster', { color: 0xe8cfae, roughness: 1 });
  W.box(14, 1.9, 0.4, -24, W.heightAt(-24, -142.5) - 0.2, -142.6, mud, { uv: 2.5 }); W.box(0.4, 1.9, 6, 34, W.heightAt(34, -170) - 0.2, -170, mud);
  W.box(8, 1.7, 0.45, 36, W.heightAt(36, -131) - 0.2, -131, mud); W.box(10, 1.6, 0.45, -10, W.heightAt(-10, -205) - 0.2, -205, mud);
  // player-side cover line along the village edge
  [[-26, -118, 1], [-17, -121, 2], [-9, -116, 1], [-1, -119, 2], [7, -115, 1], [15, -120, 2], [23, -117, 1], [31, -119, 1]].forEach(([x, z, s]) => crate(W, x, z, 1.25, s));
  SP.coverSpots = [[-26, -118], [-17, -121], [-9, -116], [-1, -119], [7, -115], [15, -120], [23, -117], [31, -119]].map(([x, z]) => V3(x, 0, z + 1.6));
  rock(W, -34, -113, 2.2); rock(W, 38, -110, 1.9); rock(W, -40, -128, 2.0); rock(W, -28, -127, 1.6);
  crate(W, -8, -137, 1.2); crate(W, -6.6, -137.3, 1.2); crate(W, 30, -139, 1.2, 2);
  // vehicles parked
  const b1 = Mods.buggy(0x6b5a3e); b1.position.set(6, W.heightAt(6, -134), -134); b1.rotation.y = 0.5; W.scene.add(b1); W.colliderFrom(b1, 'metal', 0.2); SP.buggyA = b1;
  const b2 = Mods.buggy(0x5c4a35); b2.position.set(-30, W.heightAt(-30, -168), -168); b2.rotation.y = -1.1; W.scene.add(b2); W.colliderFrom(b2, 'metal', 0.2); SP.buggyB = b2;
  wreckCar(W, 40, -205, 2.1); wreckCar(W, -48, -170, 0.4);
  // oasis palms + well
  [[-50, -215], [-55, -222], [-46, -226], [40, -232], [46, -226], [-60, -185], [52, -160]].forEach(([x, z]) => { const p = Mods.palm(rand(7, 10)); p.position.set(x, W.heightAt(x, z), z); W.scene.add(p); W.addCollider(V3(x - 0.3, 0, z - 0.3), V3(x + 0.3, 12, z + 0.3), 'wood'); });
  const wb = W.heightAt(12, -200); W.box(2.2, 0.9, 2.2, 12, wb, -200, SP.mat('concrete', { color: 0xcbb69a }), { uv: 1.5 });
  barrel(W, 22, -163, 0x2d4c74); barrel(W, 22.7, -163.6, 0x7a3a28); barrel(W, -16, -176, 0x3a5a3a); barrel(W, 2, -206, 0x2d4c74);
  tarp(W, 10, -168, 5, 4, 2.4); tarp(W, -14, -210, 4, 4, 2.3, 0x7d4a3a);
  powerline(W, [[60, -60], [55, -110], [48, -160], [44, -210], [40, -260]]);
  bushes(W, 220, [-300, 300, -500, 120], (x, z) => Math.abs(x) < 60 && z > -260 && z < 40);
  for (let i = 0; i < 40; i++) { const x = rand(-400, 400), z = rand(-600, 150); if (Math.abs(x) < 70 && z > -260) continue; rock(W, x, z, rand(0.6, 2.8)); }
  // the forgotten base on the horizon (visual only)
  const bm = SP.mat('concrete', { color: 0xb09a80 }); const bz = -900;
  for (let x = -160; x <= 160; x += 1.6) M(geo.box(1.5, 3.4, 0.35), bm, x, W.heightAt(x, bz) + 1.7, bz, W.scene, false);
  [[-70, bz - 20], [60, bz - 15]].forEach(([x, z]) => { tower(W, x, z, 8); });
  M(geo.box(40, 12, 30), bm, 0, W.heightAt(0, bz - 40) + 6, bz - 40, W.scene, false);
  return { start: V3(1.5, W.heightAt(1.5, 30), 30), houses: H };
};

/* ===================== HELICOPTER (part 1) ===================== */
Maps.heli = function (W) {
  W.terrainH = (x, z) => duneH(x, z, null) * 1.4; W.surface = 'hard';
  terrainMesh(W, 2600, 220, W.terrainH, sandMat(), 9);
  bushes(W, 200, [-900, 900, -1200, 400]);
  const cab = new T.Group(); cab.position.set(0, 140, 0); W.scene.add(cab); SP.cabin = cab;
  const wall = SP.mat('metal', { color: 0x4a4d40, roughness: 0.75, metalness: 0.3 }), floor = SP.mat('floor', { color: 0x6a6a62, roughness: 0.9 }), seat = SP.mat('canvas', { color: 0x8a7a55 });
  const add = (w, h, d, x, y, z, m) => M(geo.box(w, h, d), m, x, y, z, cab, false);
  add(2.8, 0.1, 5.2, 0, -0.05, 0, floor); add(2.8, 0.1, 5.2, 0, 2.05, 0, wall); add(0.1, 2.1, 5.2, -1.4, 1.0, 0, wall);
  add(0.1, 2.1, 1.4, 1.4, 1.0, -1.9, wall); add(0.1, 2.1, 1.2, 1.4, 1.0, 2.0, wall); add(0.1, 0.35, 2.6, 1.4, 1.9, 0.05, wall);
  add(2.8, 2.1, 0.1, 0, 1.0, -2.6, wall); add(2.8, 2.1, 0.1, 0, 1.0, 2.6, wall);
  add(2.6, 0.45, 0.5, 0, 0.22, -2.25, seat); add(2.6, 0.45, 0.5, 0, 0.22, 2.25, seat); add(0.5, 0.45, 3.2, -1.1, 0.22, 0, seat);
  for (let i = -2; i <= 2; i++) { add(0.04, 0.06, 0.04, 0, 2.0, i, SP.flat(0x111111, 0.5)); add(2.6, 0.02, 0.02, 0, 1.95, i, SP.flat(0x2a2a2a, 0.6, 0.5)); }
  for (let i = 0; i < 8; i++) add(0.02, 0.6, 0.02, -1.0 + i * 0.28, 1.65, -2.4, SP.flat(0x3a3a2a, 0.9)); // straps
  const red = new T.PointLight(SP.lin(0xff4a2a), 3.0, 7, 2); red.position.set(0, 1.9, 0.2); cab.add(red); const fill = new T.PointLight(SP.lin(0xffc48a), 2.2, 6, 2); fill.position.set(1.2, 1.5, -0.3); cab.add(fill); add(0.3, 0.06, 0.12, 0, 1.98, 0.2, SP.flat(0x000000, 1, 0, { emissive: 0xff4a2a, ei: 8 }));
  // base far away, seen out the door
  const bm = SP.mat('concrete', { color: 0xb09a80 }); const base = new T.Group(); base.position.set(560, 0, -420); W.scene.add(base);
  for (let i = 0; i < 6; i++) M(geo.box(rand(20, 50), rand(8, 16), rand(20, 40)), bm, rand(-80, 80), 5, rand(-60, 60), base, false);
  for (let i = 0; i < 6; i++) M(geo.sph(1.4, 8, 6), SP.flat(0xffffff, 1, 0, { emissive: 0xffd9a0, ei: 30 }), rand(-90, 90), 16, rand(-70, 70), base, false);
  return { start: V3(0, 140, 0) };
};

/* ===================== BASE AT NIGHT (parts 6,7,9,10,16–20) ===================== */
SP.BASE = { gate: V3(0, 0, -80), hangarDoor: V3(0, 0, -6), tower: V3(26, 0, -52), manhole: V3(-38, 0, 62), helipad: V3(-150, 0, -40), ridge: V3(14, 0, 245), outlet: V3(12, 0, 82) };
function baseH(x, z) {
  let h = SP.fbm(x * 0.01 + 5, z * 0.01, 3) * 2.2 - 1.1 + duneH(x * 0.7, z * 0.7, null) * 0.25;
  const inside = Math.max(Math.abs(x), Math.abs(z)); const k = SP.smooth(85, 120, inside); h *= k; // flat inside
  const ridge = SP.smooth(180, 245, z) * (1 - SP.smooth(270, 330, z)) * 13; // ridge to the south
  const ditch = -SP.smooth(10, 0, Math.abs(z - 92)) * 1.2 * (1 - SP.smooth(30, 60, Math.abs(x - 12)));
  return h + ridge + ditch + (inside < 82 ? 0 : 0);
}
Maps.base = function (W, o = {}) {
  W.terrainH = baseH; W.surface = 'sand'; W.bounds = 700;
  terrainMesh(W, 1400, 260, baseH, sandMat(), 7);
  // packed dirt yard inside the walls
  const yard = new T.Mesh(new T.PlaneGeometry(164, 164), SP.mat('dirt', { roughness: 1, ns: 1 }).clone()); yard.material.map = yard.material.map.clone(); yard.material.map.repeat.set(30, 30); yard.material.map.needsUpdate = true; yard.material.normalMap = yard.material.normalMap.clone(); yard.material.normalMap.repeat.set(30, 30); yard.material.normalMap.needsUpdate = true;
  yard.rotation.x = -Math.PI / 2; yard.position.y = 0.03; yard.receiveShadow = true; W.scene.add(yard);
  W.surface = 'sand';
  // perimeter T-walls (gate gap north, drainage outlet south)
  twallLine(W, 'x', -81, -81, 81, 0, [-6.2, 6.2]); twallLine(W, 'x', 81, -81, 81, Math.PI); twallLine(W, 'z', -81, -80, 80, Math.PI / 2); twallLine(W, 'z', 81, -80, 80, -Math.PI / 2);
  // gate (two steel panels) — SP.gateParts destroyable
  const gm = SP.mat('metal', { color: 0x5a5c50, roughness: 0.6, metalness: 0.6 }); SP.gateParts = [W.box(5.8, 3.4, 0.25, -3, 0, -81, gm, { uv: 2, surf: 'metal' }), W.box(5.8, 3.4, 0.25, 3, 0, -81, gm, { uv: 2, surf: 'metal' })];
  SP.gateColliders = W.colliders.slice(-2);
  // towers
  SP.towers = [tower(W, -72, 72, 6), tower(W, 72, 72, 6), tower(W, -72, -72, 6), tower(W, 72, -72, 6), tower(W, 14, 74, 6)];
  // hangar exterior
  const hm = SP.mat('corrugated', { color: 0xa09a8a, roughness: 0.6, metalness: 0.5 });
  W.box(40, 11, 0.4, 0, 0, -36, hm, { uv: 3, surf: 'metal' }); W.box(0.4, 11, 30, -20, 0, -21, hm, { uv: 3, surf: 'metal' }); W.box(0.4, 11, 30, 20, 0, -21, hm, { uv: 3, surf: 'metal' });
  W.box(14, 11, 0.4, -13, 0, -6, hm, { uv: 3, surf: 'metal' }); W.box(14, 11, 0.4, 13, 0, -6, hm, { uv: 3, surf: 'metal' }); W.box(12, 4.5, 0.4, 0, 6.5, -6, hm, { uv: 3, surf: 'metal' });
  SP.hangarDoor = W.box(12, 6.5, 0.3, 0, 0, -5.6, SP.mat('corrugated', { color: 0x6e6a5e }), { uv: 3, surf: 'metal' });
  const rg = new T.CylinderGeometry(20, 20, 30.4, 24, 1, true, -Math.PI / 2, Math.PI); rg.rotateX(-Math.PI / 2); const roof = new T.Mesh(rg, hm); roof.position.set(0, 11, -21); roof.scale.set(1, 0.3, 1); roof.castShadow = true; roof.receiveShadow = true; W.scene.add(roof);
  pointLamp(W, 0, 7.2, -5.2, 0xffc070, 6, 16);
  // barracks blocks (west)
  const cm = SP.mat('concrete', { color: 0xc9bfae, roughness: 0.95 });
  for (let i = 0; i < 3; i++) { const z = -40 + i * 30; W.box(12, 3.6, 22, -52, 0, z, cm, { uv: 3 }); W.box(12.6, 0.3, 22.6, -52, 3.6, z, SP.mat('concrete', { color: 0x8a8378 }), { uv: 3 }); for (let k = 0; k < 4; k++) M(geo.box(0.05, 0.9, 1.1), SP.flat(0x1a1d22, 0.2, 0.3, { emissive: k === 1 && i === 1 ? 0xffb060 : 0x000000, ei: 1.2 }), -45.97, 1.9, z - 8 + k * 5, W.scene, false); }
  // motor pool (south-east)
  const tr = (k, x, z, ry, c) => { const t = Mods.truck(k, c); t.position.set(x, 0, z); t.rotation.y = ry; W.scene.add(t); t.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); const col = W.colliderFrom(t, 'metal', 0.3); return { t, col }; };
  tr('cargo', 30, 25, 0.05, 0x5a5e44); tr('cargo', 38, 25, -0.03, 0x655f48); tr('cargo', 30, 45, 0.1, 0x4f543e); SP.fuelTruck = tr('fuel', 46, 42, -0.1, 0x6a6a5a); tr('cargo', 58, 30, 1.57, 0x5a5e44);
  container(W, 62, 50, 0, 0x7a4232); container(W, 66, 50, 0, 0x34505e); container(W, 62, 50, 0, 0x7a4232, 2.6); container(W, 56, 12, 1.57, 0x5c6a3e);
  for (let i = 0; i < 6; i++) barrel(W, 50 + (i % 3) * 0.7, 18 + Math.floor(i / 3) * 0.7, SP.pick([0x2d4c74, 0x7a3a28, 0x3a5a3a]), i === 2);
  // generators + fuel tank
  W.box(2.4, 1.6, 1.4, 22, 0, -2, SP.mat('metal', { color: 0x5b6243, roughness: 0.7, metalness: 0.4 }), { uv: 1.5, surf: 'metal' }); W.box(2.4, 1.6, 1.4, -24, 0, -2, SP.mat('metal', { color: 0x5b6243, roughness: 0.7, metalness: 0.4 }), { uv: 1.5, surf: 'metal' });
  // courtyard defenses + radio tower
  sandbags(W, -8, -58, 6, 4); sandbags(W, 8, -58, 6, 4); sandbags(W, -20, -66, 5, 4, 0.3); sandbags(W, 20, -66, 5, 4, -0.3); sandbags(W, 0, -48, 5, 3);
  hesco(W, -32, -60, 5); hesco(W, 28, -40, 4, Math.PI / 2); hesco(W, -12, -30, 4);
  const rt = SP.BASE.tower; const lm = SP.mat('metal', { color: 0x8a2a20, roughness: 0.6, metalness: 0.6 });
  for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) { const l = M(geo.box(0.15, 26, 0.15), lm, rt.x + dx * 0.6, 13, rt.z + dz * 0.6, W.scene); l.rotation.z = -dx * 0.022; l.rotation.x = dz * 0.022; }
  for (let y = 2; y < 25; y += 2.2) { M(geo.box(2.6 - y * 0.035, 0.06, 0.06), lm, rt.x, y, rt.z - 1.3 + y * 0.018, W.scene, false); M(geo.box(2.6 - y * 0.035, 0.06, 0.06), lm, rt.x, y, rt.z + 1.3 - y * 0.018, W.scene, false); }
  W.box(3.4, 0.2, 3.4, rt.x, 8, rt.z, SP.mat('metal', { color: 0x4a4a46, metalness: 0.5 }), { uv: 2, surf: 'metal' }); W.addCollider(V3(rt.x - 1.3, 0, rt.z - 1.3), V3(rt.x + 1.3, 8, rt.z + 1.3), 'metal');
  M(geo.sph(0.25, 8, 6), SP.flat(0xff0000, 1, 0, { emissive: 0xff1010, ei: 40 }), rt.x, 26.3, rt.z, W.scene, false);
  container(W, -40, -55, 0.2, 0x34505e); container(W, 40, -70, 1.4, 0x7a4232); crate(W, -14, -40, 1.2, 2); crate(W, 14, -38, 1.2, 1); ammoCrate(W, 6, -52); ammoCrate(W, -6, -52, 0.3);
  // tents
  for (let i = 0; i < 3; i++) { const x = 40 + i * 9, z = -20; const t = new T.Mesh(new T.CylinderGeometry(3, 3, 7, 3, 1, false), SP.mat('canvas', { color: 0x6d6a50 })); t.rotation.set(0, 0, Math.PI / 2); t.position.set(x, 1.5, z); t.scale.set(0.8, 1, 1); t.castShadow = t.receiveShadow = true; W.scene.add(t); W.colliderFrom(t, 'hard', 0.6); }
  // floodlights (sodium) — a few real lights, the rest emissive
  floodlight(W, -30, -70, 0, -60, true); floodlight(W, 30, -30, 10, -10, true); floodlight(W, 30, 60, 40, 35, true); floodlight(W, -60, 0, -40, 10, false); floodlight(W, -30, 60, -38, 60, true); floodlight(W, 70, -10, 50, -10, false);
  pointLamp(W, -46, 3.2, -10, 0xffb070, 3, 10); pointLamp(W, 21, 2.6, -2, 0xffd0a0, 2, 8);
  // fires in barrels
  [[-10, -72], [18, 12], [-40, 30]].forEach(([x, z]) => { barrel(W, x, z, 0x3a2a20); G.fires.push({ pos: V3(x, 0.9, z), t: 1e9, safe: true }); const l = new T.PointLight(SP.lin(0xff7a30), 4, 12, 2); l.position.set(x, 1.6, z); W.scene.add(l); SP.fireLights = (SP.fireLights || []).concat(l); });
  // outside: helipad, ridge rocks, outlet
  const hp = SP.BASE.helipad; const pad = new T.Mesh(new T.CircleGeometry(9, 32), SP.mat('concrete', { color: 0x8a867c })); pad.rotation.x = -Math.PI / 2; pad.position.set(hp.x, baseH(hp.x, hp.z) + 0.05, hp.z); pad.receiveShadow = true; W.scene.add(pad);
  const hm2 = new T.MeshBasicMaterial({ color: 0xd8d2c0 }); [[-2, 0, 0.5, 5], [2, 0, 0.5, 5], [0, 0, 3.5, 0.5]].forEach(([x, z, w, d]) => { const p = new T.Mesh(new T.PlaneGeometry(w, d), hm2); p.rotation.x = -Math.PI / 2; p.position.set(hp.x + x, pad.position.y + 0.02, hp.z + z); W.scene.add(p); });
  for (let i = 0; i < 25; i++) { const x = rand(-80, 120), z = rand(200, 290); if (Math.abs(x - 14) < 30 && z < 252) continue; rock(W, x, z, rand(0.8, 3)); }
  const ol = SP.BASE.outlet; W.box(3, 2.2, 0.4, ol.x, baseH(ol.x, ol.z) - 0.6, ol.z + 2, SP.mat('concrete', { color: 0x777169 }), { uv: 1.5 }); M(geo.cyl(0.8, 0.8, 1.5, 16), SP.flat(0x070707, 1), ol.x, baseH(ol.x, ol.z) + 0.25, ol.z + 2.1, W.scene, false).rotation.x = Math.PI / 2;
  // manhole (tunnel exit) inside
  const mh = SP.BASE.manhole; M(geo.cyl(0.6, 0.6, 0.06, 16), SP.flat(0x2a2a28, 0.5, 0.6), mh.x + 1, 0.06, mh.z, W.scene); M(geo.cyl(0.55, 0.55, 0.02, 16), SP.flat(0x020202, 1), mh.x, 0.04, mh.z, W.scene, false);
  bushes(W, 120, [-400, 400, -400, 400], (x, z) => Math.max(Math.abs(x), Math.abs(z)) < 90);
  return { start: V3(0, 0, 0) };
};

/* ===================== TUNNEL (part 8) ===================== */
Maps.tunnel = function (W) {
  W.floorY = 0; W.ceil = 2.5; W.surface = 'hard'; W.bounds = 400;
  const cm = SP.mat('concrete', { color: 0x8a857a, roughness: 0.9, ns: 1.6 }), dark = SP.mat('concrete', { color: 0x4d4a44, roughness: 0.9 });
  // path: start (0,0,0) north 50m, east 24m, north 40m (flooded), west 12m to ladder
  const segs = [[0, 0, 0, -50], [0, -50, 24, -50], [24, -50, 24, -92], [24, -92, 12, -92]];
  const Wd = 2.6, H = 2.5;
  const segWalls = ([x1, z1, x2, z2]) => {
    const minx = Math.min(x1, x2) - Wd / 2, maxx = Math.max(x1, x2) + Wd / 2, minz = Math.min(z1, z2) - Wd / 2, maxz = Math.max(z1, z2) + Wd / 2;
    const floor = new T.Mesh(SP.worldUV(new T.BoxGeometry(maxx - minx, 0.2, maxz - minz), 2), dark); floor.position.set((minx + maxx) / 2, -0.1, (minz + maxz) / 2); floor.receiveShadow = true; W.scene.add(floor);
    const ceil = new T.Mesh(SP.worldUV(new T.BoxGeometry(maxx - minx, 0.3, maxz - minz), 2), cm); ceil.position.set((minx + maxx) / 2, H + 0.15, (minz + maxz) / 2); W.scene.add(ceil);
  };
  segs.forEach(segWalls);
  const wallBox = (x, z, w, d) => W.box(w, H, d, x, 0, z, cm, { uv: 2 });
  // walls hand-placed around the path
  wallBox(-1.45, -25.75, 0.3, 54.1); wallBox(1.45, -23.65, 0.3, 50.0); wallBox(13.35, -48.55, 23.8, 0.3); wallBox(10.55, -51.45, 24.3, 0.3);
  wallBox(25.45, -70.95, 0.3, 45.4); wallBox(22.55, -71.0, 0.3, 39.6); wallBox(18.1, -93.45, 15.1, 0.3); wallBox(16.6, -90.55, 12.2, 0.3); wallBox(10.55, -92, 0.3, 3.2);
  wallBox(0, 1.45, 3.2, 0.3); // behind start
  // flooded section water
  const wm = new T.MeshStandardMaterial({ color: SP.lin(0x1c1f17), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85, envMapIntensity: 1.5 }); const wt = SP.TEX.water(); wm.normalMap = wt.normalMap; wm.normalScale = new T.Vector2(0.3, 0.3);
  const water = new T.Mesh(new T.PlaneGeometry(2.6, 40), wm); water.rotation.x = -Math.PI / 2; water.position.set(24, 0.22, -72); W.scene.add(water); SP.water = water;
  W.surfaceFn = (x, z) => (Math.abs(x - 24) < 1.4 && z < -52 && z > -92) ? 'water' : 'hard';
  // pipes along the walls
  const pm = SP.mat('metal', { color: 0x6a5e48, roughness: 0.6, metalness: 0.6 });
  [[-1.15, -25, 0, 50], [23.0, -72, 0, 40]].forEach(([x, z, , L]) => { const p = M(geo.cyl(0.12, 0.12, L, 10), pm, x, 2.1, z, W.scene); p.rotation.x = Math.PI / 2; const p2 = M(geo.cyl(0.07, 0.07, L, 8), pm, x + 0.05, 1.8, z, W.scene); p2.rotation.x = Math.PI / 2; });
  // debris
  for (let i = 0; i < 18; i++) { const s = rand(0.15, 0.5); const z = rand(-48, -2); M(geo.box(s, s * 0.6, s), dark, rand(-1, 1), s * 0.3, z, W.scene).rotation.y = rand(0, 3); }
  // caged bulbs
  SP.tunnelLights = [pointLamp(W, 0, 2.3, -12, 0xffd8a0, 1.6, 9), pointLamp(W, 0, 2.3, -38, 0xffd8a0, 1.2, 9), pointLamp(W, 12, 2.3, -50, 0xffd8a0, 1.4, 9), pointLamp(W, 24, 2.3, -82, 0xbfd8ff, 0.8, 9)];
  // ladder at the end
  const lad = SP.mat('metal', { color: 0x7a6a50, metalness: 0.6, roughness: 0.6 }); for (let y = 0.3; y < 2.5; y += 0.32) M(geo.box(0.5, 0.04, 0.04), lad, 11.2, y, -92, W.scene); M(geo.box(0.04, 2.5, 0.04), lad, 11.2, 1.25, -91.75, W.scene); M(geo.box(0.04, 2.5, 0.04), lad, 11.2, 1.25, -92.25, W.scene);
  M(geo.cyl(0.6, 0.6, 0.05, 16), SP.flat(0x111111, 1, 0, { emissive: 0x334466, ei: 0.4 }), 11.5, 2.48, -92, W.scene, false);
  return { start: V3(0, 0, -1) };
};

/* ===================== INTERIOR: hangar lab, office, barracks (parts 11–15) ===================== */
Maps.interior = function (W) {
  W.floorY = 0; W.ceil = null; W.surface = 'hard'; W.bounds = 300;
  const floor = new T.Mesh(SP.worldUV(new T.BoxGeometry(120, 0.2, 60), 4), SP.mat('floor', { roughness: 0.75 })); floor.position.set(-30, -0.1, -20); floor.receiveShadow = true; W.scene.add(floor);
  const hm = SP.mat('corrugated', { color: 0x8c877a, roughness: 0.6, metalness: 0.4 }), cm = SP.mat('concrete', { color: 0xbab2a2, roughness: 0.95 }), tile = SP.mat('tile', {});
  // hangar shell (x -20..20, z -36..-6)
  W.box(40, 10, 0.4, 0, 0, -36, hm, { uv: 3, surf: 'metal' }); W.box(0.4, 10, 30, 20, 0, -21, hm, { uv: 3, surf: 'metal' });
  W.box(0.4, 10, 12, -20, 0, -30, hm, { uv: 3, surf: 'metal' }); W.box(0.4, 10, 15, -20, 0, -13.5, hm, { uv: 3, surf: 'metal' }); W.box(0.4, 7.6, 3, -20, 2.4, -22.5, hm, { uv: 3 }); // west door gap at z -22.5
  W.box(40, 10, 0.4, 0, 0, -6, hm, { uv: 3, surf: 'metal' }); // closed main door (south)
  M(geo.box(40.4, 0.3, 30.4), SP.mat('corrugated', { color: 0x5a564e }), 0, 10.1, -21, W.scene);
  for (let x = -16; x <= 16; x += 8) M(geo.box(0.3, 0.5, 30), SP.flat(0x3a3a36, 0.6, 0.6), x, 9.6, -21, W.scene, false);
  // light strips + a few real lights
  for (let x = -12; x <= 12; x += 12) for (let z = -30; z <= -12; z += 9) { M(geo.box(0.25, 0.06, 2.2), SP.flat(0xffffff, 0.3, 0, { emissive: 0xfff2d8, ei: 9 }), x, 8.2, z, W.scene, false); }
  SP.labLights = [pointLamp(W, -10, 7.5, -15, 0xfff0d0, 8, 22, true), pointLamp(W, 10, 7.5, -27, 0xfff0d0, 8, 22, false), pointLamp(W, 8, 7.5, -12, 0xffe8c8, 5, 18, false)];
  // lab contents
  const tbl = SP.mat('metal', { color: 0x9a9a92, roughness: 0.5, metalness: 0.6 });
  const table = (x, z, ry = 0) => { W.box(2.4, 0.06, 1.0, x, 0.9, z, tbl, { uv: 1, ry, surf: 'metal' }); [[-1.1, -0.42], [1.1, -0.42], [-1.1, 0.42], [1.1, 0.42]].forEach(([dx, dz]) => M(geo.box(0.05, 0.9, 0.05), tbl, x + (ry ? dz : dx), 0.45, z + (ry ? dx : dz), W.scene, false)); W.addCollider(V3(x - (ry ? 0.5 : 1.2), 0, z - (ry ? 1.2 : 0.5)), V3(x + (ry ? 0.5 : 1.2), 0.96, z + (ry ? 1.2 : 0.5)), 'metal'); for (let i = 0; i < 6; i++) { const p = Mods.drugPack(); p.position.set(x + rand(-1, 1) * (ry ? 0.3 : 1), 0.97, z + rand(-1, 1) * (ry ? 1 : 0.3)); p.rotation.y = rand(0, 3); W.scene.add(p); } };
  [[-12, -14], [-12, -19], [-4, -14], [-4, -19], [6, -16], [6, -21], [13, -28, 1]].forEach(a => table(...a));
  for (let i = 0; i < 10; i++) barrel(W, rand(-17, 17), SP.pick([-33, -32.2, -9, -8.4]), SP.pick([0x2a58a8, 0x2a58a8, 0x2d4c74, 0x7a3a28]), i % 3 === 0, 0);
  crate(W, 15, -10, 1.2, 2, 0, 0); crate(W, 16.3, -10.2, 1.2, 1, 0, 0); crate(W, -16, -26, 1.2, 2, 0, 0); ammoCrate(W, -15, -9, 0, 0);
  W.box(2.4, 1.6, 1.4, 14, 0, -34.5, SP.mat('metal', { color: 0x5b6243, roughness: 0.7, metalness: 0.4 }), { uv: 1.5, surf: 'metal' });
  // hanging plastic curtains
  const curt = new T.MeshStandardMaterial({ color: 0xdfe7e4, transparent: true, opacity: 0.35, roughness: 0.2, side: T.DoubleSide, depthWrite: false });
  for (let i = 0; i < 4; i++) { const c = new T.Mesh(new T.PlaneGeometry(3, 4.5, 6, 6), curt); const p = c.geometry.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getX(k) * 2.4) * 0.12); c.geometry.computeVertexNormals(); c.position.set(-1 + i * 3, 2.25, -24); W.scene.add(c); }
  // office (x -19.6..-12, z -35.6..-28) door on east wall
  const ow = SP.mat('concrete', { color: 0xd8d0c0 });
  wallWithOpenings(W, 'z', -12, -35.6, 7.6, 3, 0.2, 0, ow, [{ at: 4.2, w: 1.1, y0: 0, y1: 2.2 }]); W.box(7.6, 0.2, 0.2, -15.8, 0, -28, ow, { collide: false });
  wallWithOpenings(W, 'x', -19.6, -28, 7.6, 3, 0.2, 0, ow, [{ at: 3.8, w: 1.6, y0: 1.1, y1: 2.2 }]);
  M(geo.box(7.8, 0.2, 7.8), ow, -15.8, 3.1, -31.8, W.scene);
  SP.officeDoor = W.box(1.05, 2.2, 0.08, -12, 0, -31.4, SP.mat('wood', { color: 0x8a6a4a }), { uv: 1, ry: Math.PI / 2 });
  const desk = W.box(2.0, 0.78, 0.9, -16.5, 0, -33.8, SP.mat('wood', { color: 0x6a4a30 }), { uv: 1 }); const lt = Mods.laptop(); lt.position.set(-16.8, 0.78, -33.8); W.scene.add(lt); SP.laptop = lt;
  W.box(0.5, 1.4, 0.6, -19.1, 0, -30, SP.mat('metal', { color: 0x6a6e6a, metalness: 0.5 }), { uv: 1, surf: 'metal' }); W.box(0.5, 1.4, 0.6, -19.1, 0, -30.7, SP.mat('metal', { color: 0x6a6e6a, metalness: 0.5 }), { uv: 1, surf: 'metal' });
  const papers = new T.Mesh(new T.BoxGeometry(0.4, 0.02, 0.3), SP.flat(0xe9e4d6, 0.9)); papers.position.set(-15.7, 0.8, -33.6); papers.rotation.y = 0.3; W.scene.add(papers); SP.papers = papers;
  const map = new T.Mesh(new T.PlaneGeometry(1.4, 1), SP.flat(0xcdbf98, 0.9)); map.position.set(-15.8, 1.7, -35.45); W.scene.add(map); SP.wallMap = map;
  pointLamp(W, -15.8, 2.8, -31.8, 0xffe0b0, 2.5, 8, false);
  // barracks corridor west of hangar: x -20 .. -60, z -24.5 .. -20.5 ; rooms north & south; mess hall at x -60..-74
  const cw = (x, z, w, d, h = 3) => W.box(w, h, d, x, 0, z, cm, { uv: 2.5 });
  const corrN = -24.4, corrS = -20.6;
  for (let x = -20; x > -60; x -= 8) { // rooms: doors into corridor
    wallWithOpenings(W, 'x', x - 8, corrN - 0.1, 8, 3, 0.2, 0, cm, [{ at: 4, w: 1.1, y0: 0, y1: 2.2 }]);
    wallWithOpenings(W, 'x', x - 8, corrS + 0.1, 8, 3, 0.2, 0, cm, [{ at: 4, w: 1.1, y0: 0, y1: 2.2 }]);
    cw(x - 8, corrN - 3.5, 0.2, 7); cw(x - 8, corrS + 3.5, 0.2, 7);
    // bunks
    for (const zz of [corrN - 5.5, corrS + 5.5]) { const bk = SP.mat('metal', { color: 0x4a5a4a, metalness: 0.5 }); W.box(0.9, 1.6, 2.0, x - 2, 0, zz, bk, { uv: 1, surf: 'metal' }); W.box(0.9, 1.6, 2.0, x - 6, 0, zz, bk, { uv: 1, surf: 'metal' }); M(geo.box(0.85, 0.15, 1.9), SP.mat('fabric', { color: 0x5a6a4a }), x - 2, 0.9, zz, W.scene); }
    M(geo.box(8, 0.2, 7.2), cm, x - 4, 3.1, corrN - 3.6, W.scene); M(geo.box(8, 0.2, 7.2), cm, x - 4, 3.1, corrS + 3.6, W.scene);
    M(geo.box(8, 0.2, 3.8), cm, x - 4, 3.1, -22.5, W.scene);
    pointLamp(W, x - 4, 2.8, -22.5, 0xffe2b0, 1.6, 7);
  }
  cw(-40, corrN - 7.1, 40, 0.2); cw(-40, corrS + 7.1, 40, 0.2);
  // mess hall x -60..-76, z -32..-12, exit door west at z -22
  wallWithOpenings(W, 'z', -60, -32, 20, 3.2, 0.3, 0, cm, [{ at: 10, w: 3.8, y0: 0, y1: 2.6 }]);
  cw(-68, -32, 16, 0.3, 3.2); cw(-68, -12, 16, 0.3, 3.2);
  wallWithOpenings(W, 'z', -76, -32, 20, 3.2, 0.3, 0, cm, [{ at: 10, w: 1.4, y0: 0, y1: 2.3 }]);
  M(geo.box(16, 0.2, 20), cm, -68, 3.3, -22, W.scene);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { W.box(4, 0.75, 1.0, -64 - j * 7, 0, -28 + i * 6, SP.mat('wood', { color: 0x7a5a3a }), { uv: 1 }); }
  pointLamp(W, -64, 3.0, -18, 0xfff0d0, 3, 14, false); pointLamp(W, -71, 3.0, -27, 0xfff0d0, 3, 14, false);
  SP.exitDoor = V3(-76.5, 0, -22);
  // alarm lights (red, start off)
  SP.alarmLights = [V3(-2, 8.5, -21), V3(-40, 2.8, -22.5), V3(-68, 3.0, -22)].map(p => { const l = new T.PointLight(SP.lin(0xff1a10), 0, 18, 2); l.position.copy(p); W.scene.add(l); return l; });
  return { start: V3(0, 0, -8.5) };
};
})();
/* floating dust motes around the camera (catch the light) */
(function () {
  const T = THREE;
  SP.addMotes = function (scene, color, op) {
    const n = 420, g = new T.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 24; p[i * 3 + 1] = Math.random() * 6; p[i * 3 + 2] = (Math.random() - 0.5) * 24; }
    g.setAttribute('position', new T.BufferAttribute(p, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const m = new T.PointsMaterial({ size: 0.05, map: new T.CanvasTexture(c), transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending, color: SP.lin(color).multiplyScalar(2.5) });
    const pts = new T.Points(g, m); pts.frustumCulled = false; scene.add(pts); SP.motes = pts;
  };
  SP.updateMotes = function (dt) {
    const m = SP.motes; if (!m || !SP.camera) return; const c = SP.camera.position; const p = m.geometry.attributes.position; const t = performance.now() / 1000;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); x += Math.sin(t * 0.3 + i) * dt * 0.15 + dt * 0.2; y += Math.cos(t * 0.4 + i * 1.7) * dt * 0.08; z += Math.sin(t * 0.25 + i * 0.7) * dt * 0.12;
      if (x - c.x > 12) x -= 24; if (x - c.x < -12) x += 24; if (z - c.z > 12) z -= 24; if (z - c.z < -12) z += 24; if (y - c.y > 4) y -= 7; if (y - c.y < -3) y += 7; p.setXYZ(i, x, y, z); }
    p.needsUpdate = true;
  };
})();

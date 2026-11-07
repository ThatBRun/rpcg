/* Survival Protocol — gameplay: world, player, weapons, AI, effects, interaction, HUD hooks */
'use strict';
(function () {
const T = THREE, { V3, rand, lerp, clamp, damp, angDiff } = SP;
const A = SP.Audio, I = SP.Input;
const G = SP.G = { time: 0, units: [], vehicles: [], fx: [], interact: [], destructibles: [], projectiles: [], trauma: 0 };
const tmpV = V3(), tmpV2 = V3(), tmpRay = new T.Ray();

/* ===================== world ===================== */
class World {
  constructor(scene, o = {}) { this.scene = scene; this.colliders = []; this.terrainH = o.terrain || null; this.terrainMesh = null; this.surface = o.surface || 'sand'; this.floorY = o.floorY || 0; this.bounds = o.bounds || 2000; this.ceil = o.ceil || null; }
  heightAt(x, z) { return this.terrainH ? this.terrainH(x, z) : this.floorY; }
  addCollider(min, max, surf = 'hard', obj) { const c = { box: new T.Box3(min.clone(), max.clone()), surf, obj }; this.colliders.push(c); return c; }
  colliderFrom(obj, surf = 'hard', shrink = 0) { obj.updateMatrixWorld(true); const b = new T.Box3().setFromObject(obj); if (shrink) b.expandByScalar(-shrink); const c = { box: b, surf, obj }; this.colliders.push(c); return c; }
  // box with bottom at y0
  box(w, h, d, x, y0, z, mat, o = {}) {
    let g = new T.BoxGeometry(w, h, d); g = SP.worldUV(g, o.uv || 2);
    const m = new T.Mesh(g, mat); m.position.set(x, y0 + h / 2, z); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.cast !== false; m.receiveShadow = true;
    (o.parent || this.scene).add(m); if (o.collide !== false) this.colliderFrom(m, o.surf || 'hard'); return m;
  }
  removeCollider(c) { const i = this.colliders.indexOf(c); if (i >= 0) this.colliders.splice(i, 1); }
  groundAt(x, z, y = 1e4, r = 0.25) {
    let h = this.heightAt(x, z);
    for (const c of this.colliders) { const b = c.box; if (c.noStand) continue; if (x > b.min.x - r && x < b.max.x + r && z > b.min.z - r && z < b.max.z + r && b.max.y <= y + 0.55 && b.max.y > h) h = b.max.y; }
    return h;
  }
  push(pos, r, feet, height) {
    for (const c of this.colliders) {
      const b = c.box; if (feet >= b.max.y - 0.5 || feet + height <= b.min.y) continue;
      const cx = clamp(pos.x, b.min.x, b.max.x), cz = clamp(pos.z, b.min.z, b.max.z); const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + dx / d * r; pos.z = cz + dz / d * r; }
        else { const o = [[b.min.x - r - pos.x, 0], [b.max.x + r - pos.x, 0], [0, b.min.z - r - pos.z], [0, b.max.z + r - pos.z]].sort((a, c2) => Math.abs(a[0] + a[1]) - Math.abs(c2[0] + c2[1]))[0]; pos.x += o[0]; pos.z += o[1]; }
      }
    }
    const B = this.bounds; pos.x = clamp(pos.x, -B, B); pos.z = clamp(pos.z, -B, B);
  }
  ray(origin, dir, maxT = 600, ignore) {
    tmpRay.origin.copy(origin); tmpRay.direction.copy(dir); let best = maxT, hit = null;
    for (const c of this.colliders) { if (c === ignore || c.noRay) continue; const p = tmpRay.intersectBox(c.box, tmpV); if (p) { const t = p.distanceTo(origin); if (t < best) { best = t; hit = c; } } }
    // terrain / floor
    let tt = null;
    if (this.terrainH) { let prev = 0, step = 0.6; for (let t = 0.3; t < best; t += step) { const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t; if (y < this.terrainH(x, z)) { let a = prev, b2 = t; for (let k = 0; k < 6; k++) { const m = (a + b2) / 2; const yy = origin.y + dir.y * m; if (yy < this.terrainH(origin.x + dir.x * m, origin.z + dir.z * m)) b2 = m; else a = m; } tt = b2; break; } prev = t; step = Math.min(4, 0.6 + t * 0.03); } }
    else if (dir.y < -1e-4) { const t = (this.floorY - origin.y) / dir.y; if (t > 0 && t < best) tt = t; }
    if (this.ceil != null && dir.y > 1e-4) { const t = (this.ceil - origin.y) / dir.y; if (t > 0 && t < best && (tt == null || t < tt)) { tt = t; } }
    if (tt != null && tt < best) return { t: tt, point: origin.clone().addScaledVector(dir, tt), surf: this.surface, collider: null };
    if (hit) return { t: best, point: origin.clone().addScaledVector(dir, best), surf: hit.surf, collider: hit };
    return null;
  }
  los(a, b) { tmpV2.subVectors(b, a); const len = tmpV2.length(); if (len < 0.01) return true; tmpV2.divideScalar(len); return !this.ray(a, tmpV2.clone(), len - 0.35); }
}
SP.World = World;

/* ===================== particles / effects ===================== */
function spriteTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (kind === 'smoke') { g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; x.beginPath(); x.arc(32 + rand(-18, 18), 32 + rand(-18, 18), rand(3, 10), 0, 7); x.fill(); } }
  else if (kind === 'flash') { x.translate(32, 32); for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3 + rand(-0.2, 0.2)); const l = rand(18, 31); const gg = x.createLinearGradient(0, 0, l, 0); gg.addColorStop(0, 'rgba(255,240,200,1)'); gg.addColorStop(1, 'rgba(255,140,40,0)'); x.fillStyle = gg; x.beginPath(); x.moveTo(0, -3); x.lineTo(l, 0); x.lineTo(0, 3); x.fill(); } x.setTransform(1, 0, 0, 1, 0, 0); const r2 = x.createRadialGradient(32, 32, 0, 32, 32, 14); r2.addColorStop(0, 'rgba(255,250,230,1)'); r2.addColorStop(1, 'rgba(255,160,50,0)'); x.fillStyle = r2; x.fillRect(0, 0, 64, 64); }
  else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const t = new T.CanvasTexture(c); return t;
}
const STEX = {}; const stex = k => STEX[k] || (STEX[k] = spriteTex(k));
const POOL = [];
G.particle = function (o) { // {pos, vel, life, size, grow, color, opacity, kind, additive, drag, gravity}
  if (G.fx.length > 420) return;
  let s = POOL.pop(); const kind = o.kind || 'smoke';
  if (!s) { s = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false })); }
  s.material.map = stex(kind); s.material.blending = o.additive ? T.AdditiveBlending : T.NormalBlending; s.material.color.copy(o.color || new T.Color(1, 1, 1)); s.material.opacity = o.opacity != null ? o.opacity : 1; s.material.rotation = rand(0, 6.28); s.material.fog = !o.additive; s.material.needsUpdate = true;
  s.position.copy(o.pos); s.scale.setScalar(o.size || 1); s.renderOrder = o.additive ? 5 : 4; G.scene.add(s);
  const p = { s, vel: o.vel ? o.vel.clone() : V3(), life: o.life || 1, t: 0, size: o.size || 1, grow: o.grow || 0, op: s.material.opacity, drag: o.drag || 0, grav: o.gravity || 0, spin: rand(-1, 1) * (o.spin || 0) };
  G.fx.push(p); return p;
};
G.updateFx = function (dt) {
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const p = G.fx[i]; p.t += dt; const k = p.t / p.life;
    if (k >= 1) { G.scene.remove(p.s); POOL.push(p.s); G.fx.splice(i, 1); continue; }
    p.vel.y -= p.grav * dt; p.vel.multiplyScalar(1 - p.drag * dt); p.s.position.addScaledVector(p.vel, dt);
    p.s.scale.setScalar(p.size * (1 + p.grow * k)); p.s.material.opacity = p.op * (1 - k) * (k < 0.08 ? k / 0.08 : 1); p.s.material.rotation += p.spin * dt;
  }
  for (let i = G.tracers.length - 1; i >= 0; i--) { const tr = G.tracers[i]; tr.t -= dt; tr.m.material.opacity = Math.max(0, tr.t / tr.life); if (tr.t <= 0) { G.scene.remove(tr.m); tr.m.geometry.dispose(); tr.m.material.dispose(); G.tracers.splice(i, 1); } }
  for (let i = G.lights.length - 1; i >= 0; i--) { const L = G.lights[i]; L.t -= dt; L.l.intensity = Math.max(0, L.t / L.life) * L.i0; if (L.t <= 0) { L.l.intensity = 0; L.busy = false; G.lights.splice(i, 1); } }
};
G.tracers = []; G.lights = []; G.lightPool = [];
G.initLights = function (scene) { G.lightPool = []; for (let i = 0; i < 4; i++) { const l = new T.PointLight(0xffffff, 0, 14, 2); l.position.set(0, -500, 0); scene.add(l); G.lightPool.push({ l }); } };
G.tracer = function (a, b, color = [9, 6, 2.5], life = 0.06) {
  const geo = new T.BufferGeometry().setFromPoints([a, b]); const m = new T.Line(geo, new T.LineBasicMaterial({ color: new T.Color(...color), transparent: true, opacity: 1, fog: false, toneMapped: false }));
  G.scene.add(m); G.tracers.push({ m, t: life, life });
};
G.flashLight = function (pos, color = 0xffa040, i0 = 6, life = 0.06, dist = 14) {
  let L = G.lightPool.find(x => !x.busy); if (!L) return;
  L.busy = true; L.l.color.set(color); L.l.distance = dist; L.l.position.copy(pos); L.i0 = i0; L.l.intensity = i0; L.t = life; L.life = life; G.lights.push(L);
};
G.impact = function (p, surf) {
  const col = surf === 'flesh' ? new T.Color(0.35, 0.03, 0.02) : surf === 'metal' ? new T.Color(1, 0.9, 0.7) : surf === 'sand' ? new T.Color(0.85, 0.65, 0.42) : surf === 'water' ? new T.Color(0.7, 0.75, 0.75) : new T.Color(0.6, 0.57, 0.52);
  const n = surf === 'flesh' ? 4 : 5;
  for (let i = 0; i < n; i++) G.particle({ pos: p, vel: V3(rand(-1, 1), rand(0.5, 2.5), rand(-1, 1)), life: rand(0.35, 0.8), size: rand(0.15, 0.35), grow: 2.5, color: col, opacity: 0.8, drag: 2, gravity: 2 });
  if (surf === 'metal' || surf === 'hard') for (let i = 0; i < 3; i++) G.particle({ pos: p, vel: V3(rand(-4, 4), rand(1, 5), rand(-4, 4)), life: 0.2, size: 0.05, color: new T.Color(6, 4, 1.5), additive: true, kind: 'spark', gravity: 9 });
  A.impact(p, surf === 'flesh' ? 'flesh' : surf === 'metal' ? 'metal' : 'dirt');
};
G.muzzle = function (pos, dir, big = 1, light = true) {
  G.particle({ pos: pos.clone().addScaledVector(dir, 0.08), life: 0.05, size: 0.45 * big, color: new T.Color(8, 5, 2.4), additive: true, kind: 'flash' });
  G.particle({ pos, vel: dir.clone().multiplyScalar(1.5).add(V3(0, 0.4, 0)), life: 0.9, size: 0.25 * big, grow: 4, color: new T.Color(0.75, 0.72, 0.68), opacity: 0.18, drag: 1.5 });
  if (light) G.flashLight(pos, 0xffb060, 5 * big, 0.05, 10);
};
G.explosion = function (pos, radius = 7, dmg = 220, source) {
  A.explosion(pos, 1.2); G.flashLight(pos.clone().add(V3(0, 1, 0)), 0xff8a30, 60, 0.35, 40);
  for (let i = 0; i < 16; i++) G.particle({ pos: pos.clone().add(V3(rand(-1, 1), rand(0, 1.5), rand(-1, 1))), vel: V3(rand(-4, 4), rand(2, 7), rand(-4, 4)), life: rand(0.4, 0.9), size: rand(1.5, 3), grow: 1.5, color: new T.Color(9, 4, 1.2), additive: true, kind: 'glow', drag: 3 });
  for (let i = 0; i < 18; i++) G.particle({ pos: pos.clone().add(V3(rand(-1.5, 1.5), rand(0, 2), rand(-1.5, 1.5))), vel: V3(rand(-3, 3), rand(2, 6), rand(-3, 3)), life: rand(2.5, 5), size: rand(2, 3.5), grow: 2.5, color: new T.Color(0.18, 0.16, 0.14), opacity: 0.75, drag: 1 });
  for (let i = 0; i < 12; i++) G.particle({ pos: pos.clone().add(V3(0, 0.5, 0)), vel: V3(rand(-12, 12), rand(5, 14), rand(-12, 12)), life: rand(0.6, 1.4), size: 0.08, color: new T.Color(6, 3, 1), additive: true, kind: 'spark', gravity: 15 });
  const d = SP.P ? SP.P.pos.distanceTo(pos) : 99; G.addTrauma(clamp(1.2 - d / 40, 0, 1));
  G._dmgKind = 'explosion'; if (SP.P && SP.P.alive && d < radius * 1.2) SP.P.hurt(dmg * clamp(1 - d / (radius * 1.2), 0, 1) * (SP.P.mode === 'turret' ? 0.35 : 1), pos);
  G._dmgKind = null;
  for (const u of G.units) if (!u.dead) { const du = u.pos.distanceTo(pos); if (du < radius) u.damage(dmg * (1 - du / radius), pos, false, source); }
  for (const v of G.vehicles) if (!v.dead && v.mesh.position.distanceTo(pos) < radius + 2) v.damage(dmg * 0.8);
  for (const x of G.destructibles.slice()) if (!x.dead && x.pos.distanceTo(pos) < radius * 0.8) x.damage(999);
};
G.addTrauma = a => { G.trauma = Math.min(1, G.trauma + a); };

/* ===================== ray vs units ===================== */
function raySeg(o, d, a, b) { // distance from ray to segment, returns [dist, t]
  const u = d, v = tmpV2.subVectors(b, a), w = tmpV.subVectors(o, a);
  const aa = 1, bb = u.dot(v), cc = v.dot(v), dd = u.dot(w), ee = v.dot(w); const D = aa * cc - bb * bb;
  let sc, tc; if (D < 1e-6) { sc = 0; tc = ee / cc; } else { sc = (bb * ee - cc * dd) / D; tc = (aa * ee - bb * dd) / D; }
  tc = clamp(tc, 0, 1); sc = Math.max(0, (bb * tc - dd)); // re-project
  const p1 = o.clone().addScaledVector(u, sc), p2 = a.clone().addScaledVector(v, tc); return [p1.distanceTo(p2), sc];
}
const hpW = V3(), headW = V3(), feetW = V3();
G.rayUnits = function (o, d, maxT, exclude, team) {
  let best = null;
  for (const u of G.units) {
    if (u.dead || u === exclude || (team && u.team === team) || !u.rig) continue;
    if (u.pos.distanceToSquared(o) > maxT * maxT + 9) continue;
    const S = u.rig; S.root.updateMatrixWorld(true); S.head.getWorldPosition(headW); S.hips.getWorldPosition(hpW); feetW.copy(u.pos).y += 0.12;
    const [dh, th] = (() => { tmpV.subVectors(headW, o); const t = tmpV.dot(d); if (t < 0) return [99, 0]; return [tmpV.addScaledVector(d, -t).length(), t]; })();
    if (dh < 0.15 && th < maxT && (!best || th < best.t)) { best = { u, t: th, part: 'head' }; continue; }
    const top = headW.clone().lerp(hpW, 0.25); const [db, tb] = raySeg(o, d, hpW, top); if (db < 0.26 && tb < maxT && (!best || tb < best.t)) { best = { u, t: tb, part: 'body' }; continue; }
    const [dl, tl] = raySeg(o, d, feetW, hpW); if (dl < 0.18 && tl < maxT && (!best || tl < best.t)) best = { u, t: tl, part: 'leg' };
  }
  return best;
};

/* ===================== HUD helpers (DOM) ===================== */
const $ = s => document.querySelector(s);
G.hud = {
  sub(name, text, radio) { const el = $('#sub'); el.className = radio ? 'radio' : ''; el.innerHTML = ''; if (name) { const b = document.createElement('b'); b.textContent = name; el.append(b); } el.append(document.createTextNode(text)); el.hidden = false; if (radio) A.radio(); },
  hideSub() { $('#sub').hidden = true; },
  objective(text) { const o = $('#obj'); if (!text) { o.hidden = true; return; } $('#objtext').textContent = text; o.hidden = false; o.classList.remove('new'); void o.offsetWidth; o.classList.add('new'); A.click(1300, 0.06); },
  feed(text, kind) { const d = document.createElement('div'); d.textContent = text; if (kind) d.className = kind; $('#feed').prepend(d); setTimeout(() => d.remove(), 2600); while ($('#feed').children.length > 5) $('#feed').lastChild.remove(); },
  hit(kill, head) { const h = $('#hitm'); h.className = kill ? 'kill' : ''; h.style.transition = 'none'; h.style.opacity = 1; h.style.transform = 'translate(-50%,-50%) rotate(45deg) scale(' + (kill ? 1.25 : 1) + ')'; requestAnimationFrame(() => { h.style.transition = 'opacity .3s, transform .3s'; h.style.opacity = 0; h.style.transform = 'translate(-50%,-50%) rotate(45deg) scale(1)'; }); kill ? A.kill() : A.hit(); if (kill) G.hud.feed(head ? 'HEADSHOT' : 'ENEMY KILLED', head ? 'gold' : ''); },
  dmgDir(fromPos) { if (!fromPos || !SP.P) return; const P = SP.P; const ang = Math.atan2(fromPos.x - P.pos.x, -(fromPos.z - P.pos.z)) + P.yaw; const el = document.createElement('div'); el.className = 'dmgdir'; el.style.transform = `translate(-50%,-50%) rotate(${ang}rad)`; $('#dmgdirs').append(el); setTimeout(() => el.remove(), 900); },
  prompt(text, prog) { const p = $('#prompt'); if (!text) { p.hidden = true; return; } p.hidden = false; $('#prompttext').textContent = text; $('#promptbar').style.width = ((prog || 0) * 100) + '%'; },
  ammo(name, mag, res, extra) { $('#wname').textContent = name; $('#amag').textContent = mag; $('#ares').textContent = res; $('#ammo').classList.toggle('low', typeof mag === 'number' && mag <= 5); },
  timer(text) { const t = $('#timer'); if (text == null) { t.hidden = true; return; } t.hidden = false; t.textContent = text; },
};

/* ===================== player ===================== */
const WEAP = {
  m4: { name: 'M4A1', auto: true, rpm: 780, dmg: 32, head: 3.2, mag: 30, reload: 2.2, spreadH: 0.022, spreadA: 0.0015, kick: 0.011, sound: 'm4', model: () => SP.Models.m4(true) },
  sup: { name: 'M4A1 SUPPRESSED', auto: true, rpm: 750, dmg: 30, head: 3.5, mag: 30, reload: 2.2, spreadH: 0.02, spreadA: 0.0015, kick: 0.009, sound: 'sup', model: () => { const g = SP.Models.m4(false); SP.M(new T.CylinderGeometry(0.02, 0.02, 0.18, 10), SP.MAT.polymer(), 0, 0.03, -0.8, g).rotation.x = Math.PI / 2; g.userData.muzzle.z = -0.9; return g; }, silent: true },
  pistol: { name: 'M17', auto: false, rpm: 450, dmg: 38, head: 3, mag: 17, reload: 1.6, spreadH: 0.02, spreadA: 0.004, kick: 0.02, sound: 'pistol', model: () => SP.Models.pistol() },
  at4: { name: 'AT4', auto: false, rpm: 30, rocket: true, mag: 1, reload: 3.2, spreadH: 0.01, spreadA: 0.002, kick: 0.05, sound: 'fifty', model: () => SP.Models.at4() },
};
WEAP.ak = { name: 'AK-47', auto: true, rpm: 600, dmg: 40, head: 3, mag: 30, reload: 2.5, spreadH: 0.026, spreadA: 0.0022, kick: 0.016, sound: 'ak', model: () => SP.Models.ak() };
WEAP.shotgun = { name: 'M1014', auto: false, rpm: 220, dmg: 22, pellets: 9, pelletSpread: 0.045, head: 1.6, mag: 7, reload: 2.9, spreadH: 0.01, spreadA: 0.008, kick: 0.04, sound: 'shotgun', model: () => SP.Models.shotgun() };
SP.WEAP = WEAP; SP.WEAP_BASE = {}; // base stats are captured by progress.js before upgrades
class Player {
  constructor() {
    this.pos = V3(); this.vel = V3(); this.yaw = 0; this.pitch = 0; this.eye = 1.62; this.onGround = true; this.hp = 100; this.lastHit = -10; this.alive = true; this.god = false;
    this.mode = 'walk'; this.crouch = false; this.adsT = 0; this.sprintT = 0; this.recoil = 0; this.recoilYaw = 0; this.bob = 0; this.kick = 0; this.stepD = 0; this.land = 0;
    this.maxHp = 100; this.inv = {}; this.cur = null; this.reloadT = 0; this.fireCd = 0; this.swapT = 0; this.noise = 0; this.flash = false; this.heat = 0; this.overheat = false;
    this.lookLimit = null; this.speedMul = 1; this.canSprint = true; this.binoc = false; this.binocT = 0; this.downed = false;
  }
  give(w, mag, res) { this.inv[w] = { mag: mag != null ? mag : WEAP[w].mag, res: res != null ? res : WEAP[w].mag * 4 }; if (!this.cur) this.equip(w); }
  equip(w) {
    if (!this.inv[w]) return; this.cur = w; this.reloadT = 0; this.swapT = 0.45; SP.buildViewModel(w); A.mech(0.2); this.updAmmo();
  }
  updAmmo() { if (this.mode === 'turret') { G.hud.ammo(this.turretName || 'M2 .50 CAL', this.overheat ? 'HOT' : Math.round(this.heat * 100) + '%', '∞'); return; } if (!this.cur) { G.hud.ammo('', '', ''); return; } const s = this.inv[this.cur]; if (WEAP[this.cur].melee) { G.hud.ammo(WEAP[this.cur].name, '', ''); return; } G.hud.ammo(WEAP[this.cur].name + (this.reloadT > 0 ? ' · RELOADING' : ''), s.mag, s.res); }
  hurt(dmg, from) {
    if (!this.alive || this.god) return; if (this.mode === 'turret') dmg *= 0.6; if (this.mode === 'downed') dmg *= 0.35;
    this.hp -= dmg * (SP.difficulty || 1); this.lastHit = G.time; this.lastFrom = from ? from.clone() : null; this.lastKind = G._dmgKind || 'gunfire'; SP.onPlayerHurt && SP.onPlayerHurt(dmg, from); G.addTrauma(0.18); A.hurt(); G.hud.dmgDir(from);
    if (this.hp <= 0 && SP.skill && SP.skill('second') && !this.secondWind) { this.secondWind = true; this.hp = this.maxHp * 0.5; this.lastHit = G.time + 2; G.hud.feed('SECOND WIND', 'gold'); G.addTrauma(0.5); SP.post.U.flash.value = 0.6; return; }
    if (this.hp <= 0) { this.hp = 0; this.alive = false; SP.onPlayerDeath && SP.onPlayerDeath(); }
  }
  forward() { return V3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)); }
  eyePos() { return V3(this.pos.x, this.pos.y + this.eye, this.pos.z); }
  update(dt) {
    const W = SP.W; let [mx, my] = I.consume(); if (SP.Wheel && SP.Wheel.open) { SP.Wheel.aim(mx, my); mx = my = 0; }
    const zw = this.cur && WEAP[this.cur] && WEAP[this.cur].zoom; const sens = (SP.sens || 1) * 0.0022 * (this.adsT > 0.5 ? (zw ? 0.22 : 0.6) * (SP.adsSens || 1) : 1) * (this.binoc ? 0.25 : 1);
    if (this.mode !== 'locked') { this.yaw -= mx * sens; this.pitch -= my * sens * (SP.invertY ? -1 : 1); } if (this.camAnim) { this.yaw = SP.damp(this.yaw, this.camAnim.yaw, this.camAnim.k || 2, dt); this.pitch = SP.damp(this.pitch, this.camAnim.pitch, this.camAnim.k || 2, dt); }
    this.pitch = clamp(this.pitch, -1.48, 1.48);
    if (this.lookLimit) { const L = this.lookLimit; let d = angDiff(L.yaw, this.yaw); d = clamp(d, -L.yawR, L.yawR); this.yaw = L.yaw + d; this.pitch = clamp(this.pitch, L.pMin, L.pMax); }
    if (this.mode === 'walk') this.walk(dt, W);
    if (this.mode === 'turret' && this.turret) { const t = this.turret; t.anchor.getWorldPosition(this.pos); this.pos.y -= this.eye; }
    if (this.mode === 'downed') { /* fixed position */ }
    // regen
    const rg = SP.skill && SP.skill('regen'); if (this.alive && G.time - this.lastHit > (rg ? 2.2 : 3.5)) this.hp = Math.min(this.maxHp, this.hp + (rg ? 46 : 28) * dt);
    this.weapon(dt);
    this.camera(dt);
    this.noise = Math.max(0, this.noise - dt * 2);
  }
  walk(dt, W) {
    const K = I.keys;
    const S = SP.skill || (() => 0);
    const crouchKey = !!(K.KeyC || K.ControlLeft || K.ControlRight); const crouchEdge = crouchKey && !this._cPrev; this._cPrev = crouchKey;
    const fwd = K.KeyW || K.ArrowUp, back = K.KeyS || K.ArrowDown, left = K.KeyA, right = K.KeyD;
    // slide: crouch while sprinting
    if (S('slide') && crouchEdge && this.onGround && this.sprinting && !(this.slideT > 0)) { const hv = Math.hypot(this.vel.x, this.vel.z) || 1; this.slideDir = V3(this.vel.x / hv, 0, this.vel.z / hv); this.slideV = 11.5 * (S('marathon') ? 1.08 : 1); this.slideT = 0.95; A.step(this.surfaceUnder || W.surface, 0.35); this.noise = Math.max(this.noise, 0.8); }
    if (this.slideT > 0) { this.slideT -= dt; this.slideV = Math.max(2.5, this.slideV - 10 * dt); if (!this.onGround && this.slideT > 0.2) this.slideT = 0.2; if (this.slideT <= 0 || this.slideV <= 3) this.slideT = 0; }
    const sliding = this.slideT > 0;
    this.crouch = crouchKey || !!this.forceCrouch || sliding;
    const ads = (SP.toggleAds ? !!SP.adsLatched : I.mouse.r) && !this.binocMode && this.cur && this.reloadT <= 0;
    const sprint = this.canSprint && (K.ShiftLeft || K.ShiftRight) && fwd && !this.crouch && !ads && this.reloadT <= 0;
    let speed = this.crouch ? 2.2 : sprint ? 7.0 * (S('marathon') ? 1.12 : 1) : 4.4; if (ads) speed *= 0.55; speed *= this.speedMul;
    const ix = (right ? 1 : 0) - (left ? 1 : 0), iz = (fwd ? 1 : 0) - (back ? 1 : 0);
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let mx = fx * iz + rx * ix, mz = fz * iz + rz * ix; const ml = Math.hypot(mx, mz); if (ml > 0) { mx = mx / ml * speed; mz = mz / ml * speed; }
    const acc = this.onGround ? 1 - Math.exp(-12 * dt) : 1 - Math.exp(-1.5 * dt);
    this.vel.x = lerp(this.vel.x, mx, acc); this.vel.z = lerp(this.vel.z, mz, acc);
    if (sliding) { this.vel.x = this.slideDir.x * this.slideV + rx * ix * 1.2; this.vel.z = this.slideDir.z * this.slideV + rz * ix * 1.2; }
    // dash (Q)
    this.dashCd = Math.max(0, (this.dashCd || 0) - dt);
    if (S('dash') && I.hit('KeyQ') && this.dashCd <= 0 && this.mode === 'walk') { let dx = ml > 0 ? mx / speed : fx, dz = ml > 0 ? mz / speed : fz; const dl = Math.hypot(dx, dz) || 1; this.dashDir = V3(dx / dl, 0, dz / dl); this.dashT = 0.17; this.dashCd = 2.2; A.click(300, 0.12); G.addTrauma(0.08); if (SP.Progress) SP.Progress.cooldown('dash', 2.2); }
    if (this.dashT > 0) { this.dashT -= dt; this.vel.x = this.dashDir.x * 24; this.vel.z = this.dashDir.z * 24; if (!this.onGround) this.vel.y = Math.max(this.vel.y, 0); }
    // wall run: sprint-jump along a wall
    this.wallCd = Math.max(0, (this.wallCd || 0) - dt);
    let wallSide = 0;
    if (S('wallrun') && !this.onGround && fwd && this.wallCd <= 0 && Math.hypot(this.vel.x, this.vel.z) > 4.2) {
      const gy = W.groundAt(this.pos.x, this.pos.z, this.pos.y, 0.2);
      if (this.pos.y - gy > 0.5) { const py = this.pos.y + 1.0; for (const sd of [1, -1]) { const tx = this.pos.x + rx * sd * 0.62, tz = this.pos.z + rz * sd * 0.62; for (const c of W.colliders) { const b = c.box; if (tx > b.min.x && tx < b.max.x && tz > b.min.z && tz < b.max.z && py > b.min.y && py < b.max.y && b.max.y - b.min.y > 1.6) { wallSide = sd; break; } } if (wallSide) break; } }
    }
    if (wallSide && (this.wallT || 0) < 1.7) {
      if (!this.wallRun) { this.wallRun = true; this.wallT = 0; this.vel.y = Math.max(this.vel.y, 1.2); A.step('hard', 0.25); }
      this.wallT += dt; this.wallSide = wallSide; const sp = Math.max(7.2, Math.hypot(this.vel.x, this.vel.z)); this.vel.x = fx * sp; this.vel.z = fz * sp; this.djUsed = false;
    } else if (this.wallRun) { this.wallRun = false; this.wallCd = 0.25; }
    this.tilt = damp(this.tilt || 0, this.wallRun ? -this.wallSide * 0.14 : sliding ? 0.05 : 0, 8, dt);
    // jumping: normal, slide-jump, wall-jump, double jump
    if (I.hit('Space')) {
      if (this.wallRun) { this.vel.y = 6.2; this.vel.x += -rx * this.wallSide * 5.5; this.vel.z += -rz * this.wallSide * 5.5; this.wallRun = false; this.wallCd = 0.35; this.wallT = 0; A.step('hard', 0.3); }
      else if (this.onGround && (!this.crouch || sliding)) { this.vel.y = 5.6; this.onGround = false; if (sliding) { this.slideT = 0; } }
      else if (!this.onGround && S('djump') && !this.djUsed) { this.djUsed = true; this.vel.y = 5.4; G.particle && G.particle({ pos: this.pos.clone(), vel: V3(0, -1, 0), life: 0.5, size: 0.8, grow: 2, color: new T.Color(0.7, 0.65, 0.55), opacity: 0.25 }); A.click(500, 0.08); }
    }
    this.vel.y -= (this.wallRun ? 4.5 : 17) * dt; if (this.wallRun) this.vel.y = Math.max(this.vel.y, -1.5);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; this.pos.y += this.vel.y * dt;
    const h = this.crouch ? 1.15 : 1.8; W.push(this.pos, 0.36, this.pos.y, h);
    const g = W.groundAt(this.pos.x, this.pos.z, this.pos.y, 0.2);
    if (this.pos.y <= g) { if (!this.onGround && this.vel.y < -4) { this.land = Math.min(0.12, -this.vel.y * 0.012); A.step(W.surface, 0.3); } this.pos.y = g; this.vel.y = 0; this.onGround = true; this.djUsed = false; this.wallT = 0; this.wallRun = false; }
    else if (this.pos.y > g + 0.06) { if (this.onGround && this.pos.y - g < 0.45 && this.vel.y <= 0) this.pos.y = g; else this.onGround = false; }
    this.eye = damp(this.eye, sliding ? 0.85 : this.crouch ? 1.0 : 1.62, 12, dt);
    const hs = Math.hypot(this.vel.x, this.vel.z); this.speed = hs; this.sprinting = sprint && hs > 4;
    this.sprintT = damp(this.sprintT, this.sprinting ? 1 : 0, 9, dt);
    if (this.onGround) { this.bob += hs * dt * 1.15; this.stepD += hs * dt; const stride = sprint ? 2.0 : 1.55; if (this.stepD > stride) { this.stepD = 0; A.step(this.surfaceUnder || W.surface, this.crouch ? 0.06 : sprint ? 0.24 : 0.15); this.noise = Math.max(this.noise, (this.crouch ? 0.2 : sprint ? 1 : 0.55) * (S('ghost') ? 0.55 : 1)); } }
    this.adsTarget = ads ? 1 : 0;
  }
  weapon(dt) {
    this.adsT = damp(this.adsT, this.adsTarget || 0, 14, dt); this.fireCd -= dt; this.swapT = Math.max(0, this.swapT - dt);
    this.recoil = damp(this.recoil, 0, 9, dt); this.recoilYaw = damp(this.recoilYaw, 0, 9, dt); this.kick = damp(this.kick, 0, 11, dt);
    if (this.mode === 'turret') return this.turretFire(dt);
    if (!this.cur || this.mode === 'locked' || this.binocMode || (SP.Wheel && SP.Wheel.open)) return;
    const w = WEAP[this.cur], s = this.inv[this.cur];
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) { const need = w.mag - s.mag, take = Math.min(need, s.res); s.mag += take; s.res -= take; A.mech(0.3); this.updAmmo(); } }
    if (I.hit('KeyR') && this.reloadT <= 0 && s.mag < w.mag && s.res > 0) { this.reloadT = w.reload; A.mech(0.25); setTimeout(() => A.mech(0.2), 700); this.updAmmo(); }
    for (let k = 0; k < 8; k++) if (I.hit('Digit' + (k + 1))) this.cycle(k);
    const fm = w.auto ? ((SP.fireModes && SP.fireModes[this.cur]) || w.defaultMode || 'auto') : 'semi'; if (fm === 'burst' && I.mouse.lp && !(this.burstLeft > 0)) this.burstLeft = 3; if (!I.mouse.l && fm !== 'burst') this.burstLeft = 0;
    const trig = fm === 'auto' ? I.mouse.l : fm === 'burst' ? this.burstLeft > 0 : I.mouse.lp;
    if (trig && this.reloadT <= 0 && this.fireCd <= 0 && this.swapT <= 0 && this.sprintT < 0.3) {
      if (s.mag > 0) { this.fire(w, s); if (fm === 'burst') { this.burstLeft--; if (this.burstLeft <= 0) this.fireCd = Math.max(this.fireCd, 0.28); } }
      else { A.click(); this.fireCd = 0.25; if (s.res > 0) { this.reloadT = w.reload; this.updAmmo(); } }
    }
  }
  cycle(i) { const list = SP.Wheel && SP.Wheel.order ? SP.Wheel.order() : Object.keys(this.inv); if (list[i] && list[i] !== this.cur) this.equip(list[i]); }
  fire(w, s) {
    if (w.melee) { this.fireCd = w.swing || 0.6; SP.Features && SP.Features.knifeSwing && SP.Features.knifeSwing(w); return; }
    this.fireCd = 60 / w.rpm; s.mag--; this.updAmmo(); SP.onShot && SP.onShot(w, this.cur); this.noise = w.silent ? 0.5 : 1.6; G.lastShot = G.time;
    A.gun(w.sound, null, 0.85);
    const vm = SP.VM; const mz = vm && vm.muzzleWorld ? vm.muzzleWorld() : this.eyePos();
    const dir = this.forward(); const spread = lerp(w.spreadH, w.spreadA, this.adsT) + Math.min(0.03, this.speed * 0.003) + (this.onGround ? 0 : 0.04) - (this.crouch ? 0.003 : 0);
    if (!w.rocket) { dir.x += rand(-spread, spread); dir.y += rand(-spread, spread); dir.z += rand(-spread, spread); dir.normalize(); }
    if (vm) vm.onFire();
    this.recoil += w.kick * (this.adsT > 0.5 ? 0.6 : 1); this.pitch += w.kick * 0.5 * (this.adsT > 0.5 ? 0.55 : 1); this.recoilYaw += rand(-1, 1) * w.kick * 0.4; this.yaw += rand(-0.4, 0.6) * w.kick * 0.25;
    G.muzzle(mz, this.forward(), w.rocket ? 2 : 1, !w.silent);
    if (w.rocket) { G.rocket(this.eyePos().addScaledVector(this.forward(), 0.8), this.forward(), 'player'); if (s.mag <= 0 && s.res > 0) { this.reloadT = w.reload; } return; }
    if (w.pellets) { for (let k = 0; k < w.pellets; k++) { const d2 = this.forward(); const ps = w.pelletSpread * (this.adsT > 0.5 ? 0.75 : 1); d2.x += rand(-ps, ps); d2.y += rand(-ps, ps); d2.z += rand(-ps, ps); d2.normalize(); G.shoot(this.eyePos(), d2, w.dmg, w.head, 'player', mz, k < 3); } return; }
    G.shoot(this.eyePos(), dir, w.dmg, w.head, 'player', mz, true);
  }
  turretFire(dt) {
    const t = this.turret; this.heat = Math.max(0, this.heat - dt * (this.overheat ? 0.35 : 0.22)); if (this.overheat && this.heat < 0.35) this.overheat = false;
    if (I.mouse.l && !this.overheat && this.fireCd <= 0) {
      this.fireCd = 60 / (t.rpm || 520); this.heat += 0.022; if (this.heat >= 1) { this.overheat = true; A.mech(0.4); }
      A.gun(t.sound || 'fifty', null, 0.9); const dir = this.forward(); const sp = 0.009; dir.x += rand(-sp, sp); dir.y += rand(-sp, sp); dir.z += rand(-sp, sp); dir.normalize();
      const mz = t.muzzleWorld(); G.muzzle(mz, dir, 1.6, true); this.recoil += 0.004; G.addTrauma(0.04); if (t.onFire) t.onFire();
      G.shoot(this.eyePos(), dir, t.dmg || 70, 2, 'player', mz, true, t.vehDmg || 40);
    }
    this.updAmmoT = (this.updAmmoT || 0) - dt; if (this.updAmmoT <= 0) { this.updAmmo(); this.updAmmoT = 0.1; }
  }
  camera(dt) {
    const cam = SP.camera; const sh = G.trauma * G.trauma; G.trauma = Math.max(0, G.trauma - dt * 1.3);
    const t = G.time; const bobAmt = this.mode === 'walk' ? Math.min(1, (this.speed || 0) / 4.5) * (1 - this.adsT * 0.8) : 0;
    const bobY = Math.sin(this.bob * 2 * Math.PI / 1.55 * 0.5 * 2) * 0.03 * bobAmt, bobX = Math.cos(this.bob * Math.PI / 1.55) * 0.02 * bobAmt;
    this.land = damp(this.land, 0, 8, dt);
    cam.position.set(this.pos.x, this.pos.y + this.eye + bobY - this.land - this.kick, this.pos.z);
    const nx = (SP.vnoise(t * 22, 1.3) - 0.5) * sh * 0.09, ny = (SP.vnoise(t * 22, 7.1) - 0.5) * sh * 0.09, nz = (SP.vnoise(t * 22, 3.7) - 0.5) * sh * 0.05;
    cam.rotation.set(this.pitch + this.recoil + ny, this.yaw + this.recoilYaw + nx, bobX * 0.4 + nz + (this.tilt || 0));
    const bf = SP.fov || 74; const az = (this.cur && WEAP[this.cur] && WEAP[this.cur].adsZoom) || 0; let fov = lerp(bf, (bf - 18) / (1 + az), this.adsT) + this.sprintT * 6; const zw = this.cur && WEAP[this.cur] && WEAP[this.cur].zoom; if (zw && this.mode !== 'turret') fov = lerp(fov, zw, clamp((this.adsT - 0.55) * 2.5, 0, 1)); if (this.binoc) fov = 9; if (this.mode === 'turret') fov = lerp(fov, 62, 0.5); if (this.fovOverride) fov = this.fovOverride;
    this.fovS = damp(this.fovS || fov, fov, 12, dt); cam.fov = this.fovS; cam.updateProjectionMatrix();
    SP.listener = { pos: cam.position, yaw: this.yaw };
    // vignette damage
    SP.post.U.damage.value = damp(SP.post.U.damage.value, clamp((this.maxHp - this.hp) / (this.maxHp * 0.75), 0, 1) * (this.alive ? 1 : 1), 6, dt);
    if (this.hp < this.maxHp * 0.35 && this.alive) { this.hb = (this.hb || 0) - dt; if (this.hb <= 0) { this.hb = 0.85; A.heartbeat(0.45); } }
  }
}
SP.Player = Player;

/* bullets */
G.shoot = function (origin, dir, dmg, headMul, team, muzzlePos, tracer, vehDmg) {
  const W = SP.W; const wh = W.ray(origin, dir, 700); let maxT = wh ? wh.t : 700;
  const uh = G.rayUnits(origin, dir, maxT, null, team === 'player' ? 'ally' : team);
  let end;
  // vehicles + destructibles (sphere/box test)
  let vh = null; for (const v of G.vehicles) { if (v.dead || v.team === (team === 'player' ? 'ally' : team)) continue; const b = v.box(); tmpRay.origin.copy(origin); tmpRay.direction.copy(dir); const p = tmpRay.intersectBox(b, tmpV); if (p) { const t = p.distanceTo(origin); if (t < maxT && (!uh || t < uh.t)) { vh = { v, t, p: p.clone() }; maxT = t; } } }
  let dh = null; for (const x of G.destructibles) { if (x.dead) continue; tmpRay.origin.copy(origin); tmpRay.direction.copy(dir); const p = tmpRay.intersectBox(x.box, tmpV); if (p) { const t = p.distanceTo(origin); if (t < maxT && (!uh || t < uh.t)) { dh = { x, t, p: p.clone() }; maxT = t; } } }
  if (uh && uh.t < maxT) {
    end = origin.clone().addScaledVector(dir, uh.t); const mul = uh.part === 'head' ? headMul : uh.part === 'leg' ? 0.75 : 1;
    const killed = uh.u.damage(dmg * mul, origin, uh.part === 'head', team);
    G.impact(end, 'flesh'); if (team === 'player') { G.hud.hit(killed, uh.part === 'head' && killed); SP.onHit && SP.onHit(uh.u, uh.part, killed); }
  } else if (vh) { end = vh.p; G.impact(end, 'metal'); vh.v.damage(vehDmg || dmg * 0.12); if (team === 'player') G.hud.hit(false); }
  else if (dh) { end = dh.p; G.impact(end, dh.x.surf || 'metal'); dh.x.damage(dmg); }
  else if (wh) { end = wh.point; G.impact(end, wh.surf); SP.onWallHit && SP.onWallHit(wh, dir, team); }
  else end = origin.clone().addScaledVector(dir, 300);
  if (tracer && Math.random() < (team === 'player' ? 0.5 : 0.85)) G.tracer(muzzlePos || origin, end, team === 'player' ? [8, 5.5, 2.2] : [9, 3.2, 1.2]);
  return end;
};
G.rocket = function (pos, dir, team) {
  const m = new T.Mesh(SP.geo.cyl(0.04, 0.04, 0.5, 8), SP.flat(0x3d4030, 0.6)); m.position.copy(pos); m.lookAt(pos.clone().add(dir)); m.rotateX(Math.PI / 2); G.scene.add(m);
  G.projectiles.push({ m, pos: pos.clone(), vel: dir.clone().multiplyScalar(65), team, life: 6, kind: 'rocket' }); A.explosion(pos, 0.35);
};
G.mortar = function (target, delay = 1.6) { A.whistle(0.25); G.projectiles.push({ kind: 'mortar', target: target.clone(), t: delay }); };
G.updateProjectiles = function (dt) {
  const W = SP.W;
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    if (p.kind === 'mortar') { p.t -= dt; if (p.t <= 0) { const y = W.groundAt(p.target.x, p.target.z); G.explosion(V3(p.target.x, y, p.target.z), 7, 160, 'foe'); G.projectiles.splice(i, 1); } continue; }
    const step = p.vel.clone().multiplyScalar(dt); const len = step.length(); const dir = step.clone().divideScalar(len);
    const wh = W.ray(p.pos, dir, len); const uh = G.rayUnits(p.pos, dir, len, null, p.team === 'player' ? 'ally' : p.team);
    let vh = null; for (const v of G.vehicles) { if (v.dead) continue; tmpRay.origin.copy(p.pos); tmpRay.direction.copy(dir); const q = tmpRay.intersectBox(v.box(), tmpV); if (q && q.distanceTo(p.pos) < len) vh = q.clone(); }
    p.life -= dt;
    if (wh || uh || vh || p.life <= 0) { const at = vh || (uh ? p.pos.clone().addScaledVector(dir, uh.t) : wh ? wh.point : p.pos); G.explosion(at, p.r || 8, p.dmg || 400, p.team); G.scene.remove(p.m); G.projectiles.splice(i, 1); continue; }
    p.pos.add(step); p.m.position.copy(p.pos);
    G.particle({ pos: p.pos.clone(), vel: V3(rand(-0.3, 0.3), rand(0.2, 0.6), rand(-0.3, 0.3)), life: 1.6, size: 0.5, grow: 3, color: new T.Color(0.7, 0.68, 0.64), opacity: 0.35 });
    G.particle({ pos: p.pos.clone(), life: 0.05, size: 0.5, color: new T.Color(9, 5, 1.5), additive: true, kind: 'glow' });
  }
};

/* ===================== AI units ===================== */
let UID = 0;
class Unit {
  constructor(o) {
    this.id = ++UID; this.team = o.team || 'foe'; this.name = o.name || ''; this.hp = o.hp || (this.team === 'foe' ? 100 : 160); this.maxHp = this.hp;
    this.rig = SP.Models.soldier(Object.assign({ faction: this.team === 'ally' ? 'us' : this.team === 'civ' ? 'civ' : 'foe', weapon: this.team === 'foe' ? (o.weapon || 'ak') : (o.weapon || 'm4') }, o.look || {}));
    this.pos = (o.pos || V3()).clone(); this.yaw = o.yaw || 0; this.rig.root.position.copy(this.pos); G.scene.add(this.rig.root);
    this.weapon = o.weapon || (this.team === 'foe' ? 'ak' : 'm4'); this.acc = o.acc != null ? o.acc : (this.team === 'foe' ? 1 : 0.55); this.invuln = !!o.invuln;
    this.behavior = o.behavior || 'idle'; this.speed = 0; this.crouch = false; this.aim = null; this.t = rand(0.5, 2); this.shots = 0; this.phase = 'hide'; this.exposure = 0;
    this.cover = o.cover ? o.cover.clone() : null; this.peek = o.peek ? o.peek.clone() : null; this.crouchCover = !!o.crouchCover;
    this.follow = o.follow || null; this.offset = o.offset || V3(); this.goal = o.goal ? o.goal.clone() : null; this.path = o.path || null; this.pi = 0;
    this.alert = o.alert != null ? o.alert : 1; this.aware = this.alert >= 1; this.sight = o.sight || (SP.night ? 45 : 75); this.cone = o.cone || 1.1; this.suspicion = 0;
    this.state = {}; this.target = null; this.retarget = 0; this.dead = false; this.onDeath = o.onDeath; this.holdFire = !!o.holdFire; this.runSpeed = o.runSpeed || 4.2; this.walkSpeed = o.walkSpeed || 1.6;
    this.rig.deadDir = Math.random() < 0.5 ? 1 : -1; this.rig.deadTwist = rand(-0.4, 0.4); this.stance = o.stance || null; this.hands = o.hands || null; this.markEl = null; this.tagged = false;
    this.pose = o.pose || null; this.lookAt = null;
    G.units.push(this);
  }
  get eye() { return V3(this.pos.x, this.pos.y + (this.crouch || this.exposure < 0.5 && this.crouchCover ? 1.1 : 1.55), this.pos.z); }
  damage(d, from, head, source) {
    if (this.dead) return false; if (this.invuln) { this.rig.flinch = 1; return false; }
    if (source === 'player' && SP.playerDmgMul) d *= SP.playerDmgMul;
    this.hp -= d; this.rig.flinch = 1; this.lastHurt = G.time;
    if (!this.aware && this.team === 'foe') { this.aware = true; this.alert = 1; SP.onAlert && SP.onAlert(this); }
    if (this.hp <= 0) { this.die(head); SP.onKilled && SP.onKilled(this, source, head, from); return true; }
    if (this.phase === 'out') this.t = Math.min(this.t, 0.3); return false;
  }
  die(head) {
    this.dead = true; this.hp = 0; if (this.markEl) { this.markEl.remove(); this.markEl = null; }
    if (this.team === 'ally') G.hud.feed(this.name + ' IS DOWN', 'red');
    if (this.onDeath) this.onDeath(this); if (SP.onUnitDeath) SP.onUnitDeath(this);
  }
  moveTo(p, run = true) { this.goal = p.clone(); this.goalRun = run; return new Promise(res => { this.goalRes = res; }); }
  remove() { G.scene.remove(this.rig.root); const i = G.units.indexOf(this); if (i >= 0) G.units.splice(i, 1); if (this.markEl) this.markEl.remove(); }
  facePoint(x, z, rate, dt) { const tgt = Math.atan2(-(x - this.pos.x), -(z - this.pos.z)); this.yaw += angDiff(this.yaw, tgt) * Math.min(1, rate * dt); }
  pickTarget() {
    const P = SP.P; let best = null, bd = 1e9; const eye = this.eye;
    const consider = (pos, obj, isPlayer) => { const d = pos.distanceTo(this.pos); if (d > this.sight * (this.aware ? 1.6 : 1) || d >= bd) return; const tp = isPlayer ? P.eyePos() : V3(pos.x, pos.y + 1.3, pos.z); if (!SP.W.los(eye, tp)) return; best = obj; bd = d; };
    if (this.br) { if (P && P.alive && P.mode !== 'locked') consider(P.pos, 'player', true); for (const u of G.units) if (u !== this && !u.dead && u.br) consider(u.pos, u); return best; }
    if (this.team === 'foe') { if (P && P.alive && P.mode !== 'locked' && !P.hidden) consider(P.pos, 'player', true); for (const u of G.units) if (!u.dead && u.team === 'ally' && !u.ignored) consider(u.pos, u); }
    else if (this.team === 'ally') { for (const u of G.units) if (!u.dead && u.team === 'foe' && u.aware && !u.ignored) consider(u.pos, u); }
    return best;
  }
  targetPos(tg) { if (tg === 'player') { const P = SP.P; return V3(P.pos.x, P.pos.y + P.eye - 0.2, P.pos.z); } return V3(tg.pos.x, tg.pos.y + (tg.crouch || (tg.crouchCover && tg.exposure < 0.5) ? 0.9 : 1.3), tg.pos.z); }
  shootAt(tg) {
    this.lastShotT = G.time; const P = SP.P; const from = this.muzzle(); const tp = this.targetPos(tg); const dist = from.distanceTo(tp);
    const isP = tg === 'player'; let chance;
    if (this.team === 'foe') { chance = clamp(0.55 - dist / 90, 0.06, 0.45) * this.acc * (SP.difficulty || 1); if (isP) { if (P.crouch) chance *= 0.75; if (P.speed > 4.5) chance *= 0.6; if (P.mode === 'turret') chance *= 0.7; } }
    else chance = clamp(0.32 - dist / 160, 0.06, 0.25) * this.acc;
    const clear = SP.W.los(from, tp); const hit = clear && Math.random() < chance;
    const end = tp.clone(); if (!hit) end.add(V3(rand(-1.2, 1.2), rand(-0.5, 1.1), rand(-1.2, 1.2)));
    const dir = end.clone().sub(from).normalize();
    A.gun(this.weapon === 'm4' ? (this.silent ? 'sup' : 'm4') : this.weapon === 'shotgun' ? 'shotgun' : 'ak', from, 0.8); G.muzzle(from, dir, 0.8, Math.random() < 0.3);
    if (!clear) { const wh = SP.W.ray(from, dir, dist); if (wh) { G.impact(wh.point, wh.surf); G.tracer(from, wh.point, [9, 3.2, 1.2]); } return; }
    G.tracer(from, end, this.team === 'foe' ? [9, 3.2, 1.2] : [8, 5.5, 2.2]);
    if (hit) { if (isP) P.hurt((this.weapon === 'shotgun' ? rand(30, 45) : rand(9, 14)), from); else tg.damage(this.team === 'ally' ? 45 : 25, from, false, this.team); }
    else { if (isP && dist < 70 && Math.random() < 0.45) A.whiz(); const wh = SP.W.ray(from, dir, 200); if (wh && Math.random() < 0.5) G.impact(wh.point, wh.surf); }
    this.firedAt = G.time; if (this.team === 'foe') G.lastEnemyShot = G.time;
  }
  muzzle() { const g = this.rig.gun; if (!g) return this.eye; this.rig.root.updateMatrixWorld(true); return g.localToWorld(g.userData.muzzle.clone()); }
  steer(target, spd, dt) {
    const d = tmpV.subVectors(target, this.pos); d.y = 0; const len = d.length(); if (len < 0.25) { this.speed = damp(this.speed, 0, 10, dt); return true; }
    d.divideScalar(len); const s = Math.min(spd, len * 3); this.pos.x += d.x * s * dt; this.pos.z += d.z * s * dt; this.speed = damp(this.speed, s, 8, dt);
    // separation from other units
    for (const u of G.units) if (u !== this && !u.dead) { const dx = this.pos.x - u.pos.x, dz = this.pos.z - u.pos.z, dd = dx * dx + dz * dz; if (dd < 0.5 && dd > 1e-6) { const k = (0.71 - Math.sqrt(dd)) * 0.5; this.pos.x += dx / Math.sqrt(dd) * k; this.pos.z += dz / Math.sqrt(dd) * k; } }
    SP.W.push(this.pos, 0.34, this.pos.y, 1.7); this.facePoint(target.x, target.z, 7, dt); return false;
  }
  update(dt) {
    const S = this.rig;
    if (this.dead) { SP.animSoldier(S, dt, { dead: true }); S.root.position.copy(this.pos); S.root.rotation.y = this.yaw; return; }
    const W = SP.W; if (!this.fixedY) this.pos.y = damp(this.pos.y, W.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 0.15), 14, dt);
    this.retarget -= dt; if (this.retarget <= 0) { this.retarget = rand(0.35, 0.7); this.target = (this.aware || this.team === 'ally') ? this.pickTarget() : null; }
    const tg = this.target && (this.target === 'player' ? (SP.P.alive ? 'player' : null) : (this.target.dead ? null : this.target));
    let moving = false;
    // scripted goal overrides everything
    if (this.goal && this.hold) { this.speed = damp(this.speed, 0, 8, dt); const P = SP.P; this.facePoint(P.pos.x, P.pos.z, 3, dt); }
    else if (this.goal) {
      const done = this.steer(this.goal, this.goalRun ? this.runSpeed : this.walkSpeed, dt); moving = !done;
      if (done) { this.goal = null; const r = this.goalRes; this.goalRes = null; r && r(); }
      if (tg && !this.holdFire && this.team !== 'civ') this.fireLogic(dt, tg, true);
    } else if (this.behavior === 'follow' && this.follow) {
      const L = this.follow === 'player' ? SP.P.pos : this.follow.pos; const yaw = this.follow === 'player' ? SP.P.yaw : this.follow.yaw;
      const off = this.offset.clone().applyAxisAngle(V3(0, 1, 0), yaw); const tgtp = L.clone().add(off); const far = tgtp.distanceTo(this.pos) > 1.2;
      if (far) { const run = tgtp.distanceTo(this.pos) > 6; this.steer(tgtp, run ? this.runSpeed : Math.max(this.walkSpeed, (this.follow === 'player' ? SP.P.speed : this.follow.speed) * 1.05), dt); moving = true; } else this.speed = damp(this.speed, 0, 8, dt);
      if (!moving && !tg) this.facePoint(L.x + Math.sin(-yaw) * -20, L.z - Math.cos(yaw) * 20, 2, dt);
      if (tg && !this.holdFire) this.fireLogic(dt, tg, moving);
    } else if (this.behavior === 'cover' && this.cover) {
      const atCover = this.pos.distanceTo(this.exposure > 0.05 ? this.peek || this.cover : this.cover) < 0.6 || this.inCover;
      if (!this.inCover) { if (this.steer(this.cover, this.runSpeed, dt)) this.inCover = true; moving = true; }
      else {
        this.speed = damp(this.speed, 0, 10, dt);
        if (tg) { const tp = this.targetPos(tg); this.facePoint(tp.x, tp.z, 8, dt); } else if (this.lookAt) this.facePoint(this.lookAt.x, this.lookAt.z, 3, dt);
        this.exposure = damp(this.exposure, this.phase === 'out' ? 1 : 0, 7, dt);
        if (this.peek) { this.pos.x = lerp(this.cover.x, this.peek.x, this.exposure); this.pos.z = lerp(this.cover.z, this.peek.z, this.exposure); }
        this.crouch = this.crouchCover && this.exposure < 0.6;
        this.t -= dt;
        if (this.phase === 'hide' && this.t <= 0 && tg && !this.holdFire) { this.phase = 'out'; this.t = 0.45; this.shots = 2 + Math.floor(Math.random() * 4); }
        else if (this.phase === 'out' && this.t <= 0) { if (this.shots > 0 && tg && this.exposure > 0.8) { this.shootAt(tg); this.shots--; this.t = rand(0.14, 0.3); } else if (this.shots <= 0 || !tg) { this.phase = 'hide'; this.t = rand(1.0, 2.6) / (this.team === 'foe' ? (SP.aggro || 1) : 1); } else this.t = 0.1; }
      }
    } else if (this.behavior === 'assault') {
      const goal = this.goal2 || (tg ? (tg === 'player' ? SP.P.pos : tg.pos) : null);
      const d = goal ? goal.distanceTo(this.pos) : 0;
      if (goal && d > (this.stopDist || 14)) { this.pauseT = (this.pauseT || 0) - dt; if (this.pauseT > 0 && tg) { this.speed = damp(this.speed, 0, 8, dt); this.crouch = true; this.fireLogic(dt, tg, false); } else { this.crouch = false; this.steer(goal, this.runSpeed * 0.85, dt); moving = true; if (this.pauseT < -rand(2, 4)) this.pauseT = rand(1.2, 2.4); } }
      else { this.speed = damp(this.speed, 0, 8, dt); this.crouch = !!this.crouchHold; }
      if (tg) this.fireLogic(dt, tg, moving);
    } else if (this.behavior === 'patrol' && this.path) {
      if (this.aware) { this.behavior = this.onAlertBehavior || 'assault'; }
      else { const wp = this.path[this.pi]; if (this.waitT > 0) { this.waitT -= dt; this.speed = damp(this.speed, 0, 8, dt); } else if (this.steer(wp, this.walkSpeed, dt)) { this.pi = (this.pi + 1) % this.path.length; this.waitT = rand(1.5, 3.5); } else moving = true; }
    } else if (this.behavior === 'wander') {
      const panic = (G.lastEnemyShot && G.time - G.lastEnemyShot < 8) || (G.lastShot && G.time - G.lastShot < 8 && SP.P && SP.P.pos.distanceTo(this.pos) < 60);
      if (panic) { if (!this.fleeTo) { const P = SP.P; const away = this.pos.clone().sub(P ? P.pos : V3()).setY(0); if (away.lengthSq() < 0.01) away.set(1, 0, 0); away.normalize().multiplyScalar(45); this.fleeTo = this.pos.clone().add(away); this.hands = Math.random() < 0.4 ? 'up' : null; } if (this.steer(this.fleeTo, 5.2, dt)) this.fleeTo = this.pos.clone().add(V3(rand(-30, 30), 0, rand(-30, 30))); moving = true; }
      else { this.hands = null; if (!this.wgoal) this.wgoal = this.home.clone().add(V3(rand(-this.wr, this.wr), 0, rand(-this.wr, this.wr))); if (this.steer(this.wgoal, this.walkSpeed, dt)) { this.wpause = (this.wpause || rand(1, 5)) - dt; if (this.wpause <= 0) { this.wgoal = null; this.wpause = 0; } } else moving = true; }
    } else if (this.behavior === 'hold') {
      this.speed = damp(this.speed, 0, 8, dt); if (tg) { const tp = this.targetPos(tg); this.facePoint(tp.x, tp.z, 6, dt); if (!this.holdFire) this.fireLogic(dt, tg, false); } else if (this.lookAt) this.facePoint(this.lookAt.x, this.lookAt.z, 2, dt);
    } else { this.speed = damp(this.speed, 0, 8, dt); if (this.lookAt) this.facePoint(this.lookAt.x, this.lookAt.z, 2, dt); else if (tg && this.team !== 'civ') { const tp = this.targetPos(tg); this.facePoint(tp.x, tp.z, 6, dt); if (!this.holdFire) this.fireLogic(dt, tg, false); } }
    if (this.team === 'foe' && !this.aware) this.perceive(dt);
    const aim = this.pose === 'relaxed' ? 0.1 : (tg || this.aware) && this.team !== 'civ' ? 1 : (moving ? 0.25 : 0.5);
    SP.animSoldier(S, dt, { speed: this.speed, crouch: this.crouch || this.stance === 'crouch', aim, sit: this.stance === 'sit', kneel: this.stance === 'kneel', hands: this.hands });
    S.root.position.copy(this.pos); S.root.rotation.y = this.yaw;
  }
  fireLogic(dt, tg, moving) {
    const tp = this.targetPos(tg); if (!moving) this.facePoint(tp.x, tp.z, 8, dt);
    this.burstT = (this.burstT || 0) - dt;
    if (this.burstT <= 0) { if ((this.burstLeft || 0) > 0) { this.shootAt(tg); this.burstLeft--; this.burstT = this.weapon === 'shotgun' ? 0.9 : rand(0.1, 0.18); } else { this.burstLeft = this.weapon === 'shotgun' ? 1 : SP.randi(2, 5); this.burstT = rand(0.9, 2.2) * (moving ? 1.5 : 1) / (this.team === 'foe' ? (SP.aggro || 1) : 1); } }
  }
  perceive(dt) { // stealth detection for unaware foes
    const P = SP.P; if (!P || !P.alive || P.mode === 'locked') return; const d = P.pos.distanceTo(this.pos);
    let gain = 0;
    const toP = Math.atan2(-(P.pos.x - this.pos.x), -(P.pos.z - this.pos.z)); const off = Math.abs(angDiff(this.yaw, toP));
    const lightK = SP.night ? (P.flash ? 1.6 : (P.crouch ? 0.45 : 0.75)) : 1;
    if (d < this.sight * lightK && off < this.cone && SP.W.los(this.eye, P.eyePos())) gain = (1 - d / (this.sight * lightK)) * (P.crouch ? 0.9 : 1.6) * (P.speed > 4 ? 1.6 : 1) * 1.4 + 0.15;
    if (P.noise > 0 && d < 9 * P.noise) gain = Math.max(gain, 0.9);
    if (G.lastShot && G.time - G.lastShot < 0.1 && d < (WEAP[P.cur] && WEAP[P.cur].silent ? 9 : 120)) gain = 5;
    this.suspicion = clamp(this.suspicion + (gain > 0 ? gain * dt : -dt * 0.25), 0, 1);
    if (gain > 0 && this.suspicion > 0.3) this.facePoint(P.pos.x, P.pos.z, 2, dt);
    if (this.suspicion >= 1) { this.aware = true; this.alert = 1; SP.onAlert && SP.onAlert(this); }
  }
}
SP.Unit = Unit;

/* ===================== vehicles ===================== */
class Vehicle {
  constructor(mesh, o = {}) { this.mesh = mesh; this.team = o.team || 'foe'; this.hp = o.hp || 400; this.dead = false; this.size = mesh.userData.size || [2, 2, 4]; this.curve = o.curve || null; this.u = o.u || 0; this.spd = o.speed || 0; this.onDestroyed = o.onDestroyed; this.static = !!o.static; G.scene.add(mesh); G.vehicles.push(this); this.wheels = mesh.userData.wheels || []; this.burn = 0; this.collider = null; this.flip = 0; }
  box() { const s = this.size; const p = this.mesh.position; const r = Math.max(s[0], s[2]) / 2; return new T.Box3(V3(p.x - r * 0.8, p.y, p.z - r * 0.8), V3(p.x + r * 0.8, p.y + s[1], p.z + r * 0.8)); }
  damage(d) { if (this.dead) return; this.hp -= d; if (this.hp <= 0) this.destroy(); }
  destroy() {
    this.dead = true; const p = this.mesh.position.clone().add(V3(0, 1, 0)); G.explosion(p, 9, 300, 'world'); this.burn = 25;
    this.mesh.traverse(m => { if (m.isMesh && m.material && !m.material.__burnt) { const mm = m.material.clone(); mm.color.multiplyScalar(0.18); mm.__burnt = true; m.material = mm; } });
    if (this.gunner && !this.gunner.dead) this.gunner.die(false);
    if (this.onDestroyed) this.onDestroyed(this); this.mesh.position.y += 0.3; this.mesh.rotation.z += rand(-0.25, 0.25);
  }
  update(dt) {
    const W = SP.W;
    if (this.burn > 0) { this.burn -= dt; if (Math.random() < 0.5) G.particle({ pos: this.mesh.position.clone().add(V3(rand(-0.8, 0.8), 1.4, rand(-1, 1))), vel: V3(rand(-0.3, 0.3), rand(2, 3.5), rand(-0.3, 0.3)), life: 3, size: 1.4, grow: 3, color: new T.Color(0.12, 0.11, 0.1), opacity: 0.6 }); if (Math.random() < 0.6) G.particle({ pos: this.mesh.position.clone().add(V3(rand(-0.6, 0.6), 1.0, rand(-0.8, 0.8))), vel: V3(0, rand(1.5, 3), 0), life: 0.5, size: rand(0.6, 1.1), color: new T.Color(7, 3, 0.8), additive: true, kind: 'glow' }); }
    if (this.dead || this.static) return;
    if (this.curve) {
      const len = this.curveLen || (this.curveLen = this.curve.getLength()); this.u = Math.min(1, this.u + this.spd * dt / len);
      const p = this.curve.getPointAt(this.u), q = this.curve.getPointAt(Math.min(1, this.u + 0.004));
      p.y = W.heightAt(p.x, p.z); q.y = W.heightAt(q.x, q.z); this.mesh.position.copy(p);
      const yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z)); this.mesh.rotation.order = 'YXZ'; this.mesh.rotation.y = yaw;
      const ahead = W.heightAt(p.x - Math.sin(yaw) * 1.5, p.z - Math.cos(yaw) * 1.5), behind = W.heightAt(p.x + Math.sin(yaw) * 1.5, p.z + Math.cos(yaw) * 1.5); this.mesh.rotation.x = Math.atan2(ahead - behind, 3);
      if (this.u >= 1 && this.onArrive) { const f = this.onArrive; this.onArrive = null; f(this); }
      this.wheels.forEach(w => w.children.forEach(c => c.rotation.x += this.spd * dt / 0.45));
      if (Math.random() < 0.6 && this.spd > 2) G.particle({ pos: this.mesh.position.clone().add(V3(rand(-1, 1), 0.3, 0).applyAxisAngle(V3(0, 1, 0), yaw)), vel: V3(rand(-1, 1), rand(0.5, 1.5), rand(-1, 1)), life: 2.2, size: 1.2, grow: 2.5, color: new T.Color(0.75, 0.58, 0.4), opacity: 0.35, drag: 0.5 });
    }
  }
}
SP.Vehicle = Vehicle;

/* destructible (barrels, fuel tanks) */
G.destructible = function (obj, o = {}) { obj.updateMatrixWorld(true); const x = { obj, box: new T.Box3().setFromObject(obj), pos: obj.getWorldPosition(V3()), hp: o.hp || 60, surf: o.surf || 'metal', dead: false, damage(d) { if (this.dead) return; this.hp -= d; if (this.hp <= 0) { this.dead = true; if (o.explode !== false) G.explosion(this.pos.clone().add(V3(0, 0.6, 0)), o.radius || 6, o.dmg || 200, 'world'); if (o.fire) { G.fires.push({ pos: this.pos.clone(), t: o.fire }); } obj.visible = !o.hide; obj.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiplyScalar(0.2); } }); if (this.collider) SP.W.removeCollider(this.collider); o.onDestroy && o.onDestroy(); } } }; G.destructibles.push(x); return x; };
G.fires = [];
G.updateFires = function (dt) { for (let i = G.fires.length - 1; i >= 0; i--) { const f = G.fires[i]; f.t -= dt; if (f.t <= 0) { G.fires.splice(i, 1); continue; } if (Math.random() < 0.7) G.particle({ pos: f.pos.clone().add(V3(rand(-0.6, 0.6), 0.3, rand(-0.6, 0.6))), vel: V3(rand(-0.2, 0.2), rand(1.5, 2.8), rand(-0.2, 0.2)), life: 0.6, size: rand(0.5, 1.0), color: new T.Color(8, 3.2, 0.8), additive: true, kind: 'glow' }); if (Math.random() < 0.3) G.particle({ pos: f.pos.clone().add(V3(0, 1.5, 0)), vel: V3(rand(-0.3, 0.3), 2, rand(-0.3, 0.3)), life: 3, size: 1, grow: 3, color: new T.Color(0.1, 0.1, 0.1), opacity: 0.5 }); if (f.safe) continue; const P = SP.P; if (P && P.alive && P.pos.distanceTo(f.pos) < 1.3) P.hurt(40 * dt, f.pos); for (const u of G.units) if (!u.dead && u.pos.distanceTo(f.pos) < 1.2) u.damage(60 * dt, f.pos); } };

/* ===================== interaction ===================== */
G.addInteract = function (o) { const it = Object.assign({ radius: 2.2, hold: 0, enabled: true, prog: 0 }, o); G.interact.push(it); return it; };
G.updateInteract = function (dt) {
  const P = SP.P; if (!P || !P.alive || P.mode === 'locked' || P.mode === 'turret' && !P.turret.exitable) { G.hud.prompt(null); return; }
  let best = null, bd = 1e9; const f = P.forward(); f.y = 0; f.normalize();
  for (const it of G.interact) { if (!it.enabled) continue; const p = typeof it.pos === 'function' ? it.pos() : it.pos; const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); if (d > it.radius) continue; const to = V3(p.x - P.pos.x, 0, p.z - P.pos.z).normalize(); if (d > 0.9 && f.dot(to) < 0.55) continue; if (d < bd) { bd = d; best = it; } }
  // stealth takedown
  let td = null; G.tdAvail = false; if (P.mode === 'walk') for (const u of G.units) { if (u.dead || u.team !== 'foe' || u.aware || u.invuln) continue; const d = u.pos.distanceTo(P.pos); if (d > 1.9) continue; const toP = Math.atan2(-(P.pos.x - u.pos.x), -(P.pos.z - u.pos.z)); if (Math.abs(angDiff(u.yaw, toP)) < 1.9 && d > 1.0) continue; td = u; break; }
  if (td) { G.tdAvail = true; G.hud.prompt('[F]  Takedown'); if (I.hit('KeyF')) { A.impact(td.pos, 'flesh'); A.mech(0.3); td.die(false); SP.onKilled && SP.onKilled(td, 'player', false, null, 'takedown'); G.hud.feed('SILENT TAKEDOWN', 'gold'); G.addTrauma(0.15); } return; }
  if (!best) { G.hud.prompt(null); for (const it of G.interact) it.prog = 0; return; }
  const key = I.down('KeyE');
  if (best.hold > 0) { if (key) { best.prog += dt / best.hold; if (best.prog >= 1) { best.prog = 0; best.enabled = false; best.onUse && best.onUse(); } } else best.prog = Math.max(0, best.prog - dt * 2); G.hud.prompt('Hold [E]  ' + best.text, best.prog); }
  else { G.hud.prompt('[E]  ' + best.text); if (I.hit('KeyE')) { if (best.once !== false) best.enabled = false; best.onUse && best.onUse(); } }
};

/* ===================== markers (objective + tags) ===================== */
G.markers = [];
G.marker = function (posFn, label, kind = 'obj') { const el = document.createElement('div'); el.className = 'mk ' + kind; el.innerHTML = '<span class="l"></span><span class="d"></span><span class="m"></span>'; el.querySelector('.l').textContent = label || ''; document.getElementById('markers').append(el); const m = { posFn, el, kind }; G.markers.push(m); return m; };
G.removeMarker = function (m) { if (!m) return; m.el.remove(); const i = G.markers.indexOf(m); if (i >= 0) G.markers.splice(i, 1); };
G.clearMarkers = function () { G.markers.forEach(m => m.el.remove()); G.markers = []; };
G.updateMarkers = function () {
  const cam = SP.camera, w = innerWidth, h = innerHeight; const P = SP.P;
  for (const m of G.markers) {
    const p = m.posFn(); if (!p) { m.el.hidden = true; continue; } const v = p.clone(); v.y += m.kind === 'obj' ? 0.6 : 2.2; v.project(cam);
    let x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h; const behind = v.z > 1;
    if (m.kind === 'tag' && behind) { m.el.hidden = true; continue; }
    if (behind) { x = w - x; y = h - 80; }
    if (m.kind === 'obj') { x = clamp(x, 40, w - 40); y = clamp(y, 80, h - 110); }
    m.el.hidden = false; m.el.style.transform = `translate(${x}px,${y}px)`;
    if (m.kind === 'obj' && P) m.el.querySelector('.m').textContent = Math.round(Math.hypot(p.x - P.pos.x, p.z - P.pos.z)) + ' m';
  }
};

/* ===================== compass ===================== */
G.updateCompass = function () {
  const P = SP.P; if (!P) return; const el = document.getElementById('compass-strip'); if (!el) return;
  const deg = ((-P.yaw * 180 / Math.PI) % 360 + 360) % 360; // heading: 0 = north (-Z)
  el.style.transform = `translateX(${-deg * 4}px)`;
  const om = document.getElementById('compass-obj'); const m = G.markers.find(x => x.kind === 'obj');
  if (m && m.posFn()) { const p = m.posFn(); const b = Math.atan2(p.x - P.pos.x, -(p.z - P.pos.z)) * 180 / Math.PI; let d = ((b - deg + 540) % 360) - 180; om.hidden = Math.abs(d) > 90; om.style.transform = `translateX(${d * 4}px)`; } else om.hidden = true;
};
})();

/* Survival Protocol 1.0 — features pack 2 (50 features)
   Equipment: 1 flashbang · 2 smoke · 3 molotov · 4 remote C4 · 5 claymore · 6 throwing knife · 7 equipment selector (J / EQUIP)
   Combat: 8 armour plates + bar · 9 UAV streak · 10 mortar streak · 11 airstrike streak · 12 enemy weapon pickups · 13 damage numbers
           14 headshot ding · 15 enemy types (juggernaut / rusher / sniper) · 16 smoke blinds enemy aim · 17 flash-stun AI · 18 burning AI
   Weapons: 19 attachments · 20 kill camos · 21 weapon levels + level-up coins · 22 firing range · 23 BR loot rarity
   Progress: 24 player rank 1–100 · 25 part grades S–D · 26 speedrun timer + best times · 27 twenty new achievements · 28 local leaderboards
             29 Horde mode · 30 Freeplay mutators · 31 Battle Royale · 32 BR supply drops · 33 BR elimination recap · 34 daily login bonus
   World: 35 rain · 36 snow · 37 lightning · 38 rain on the lens · 39 Ultra quality · 40 auto-detect quality · 41 dynamic resolution
          42 sprint dust · 43 barrel smoke after long bursts · 44 cinematic part-complete card
   Options: 45 colour-blind filters · 46 invert Y · 47 ADS sensitivity · 48 toggle ADS · 49 mobile button size · 50 FPS counter
            51 subtitle size · 52 gyro aim (mobile) · 53 What's New + Credits screens */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp } = SP; const G = SP.G, A = SP.Audio, I = SP.Input;
const $ = s => document.querySelector(s); const F = SP.Features || {}; const F2 = SP.Features2 = {};
const safe = fn => { try { fn(); } catch (e) { if (!F2._err) { F2._err = 1; console.warn('features2', e); } } };
const PR = () => SP.Progress;

/* ---------------- settings (shared with main settings) ---------------- */
const SK = 'survival_protocol_ch1_set';
const S2 = { cb: 'off', invY: false, adsSens: 1, toggleAds: false, btn: 1, fps: false, sub: 1, gyro: false, speedrun: false, dynres: true, lens: true, autoQ: false };
try { Object.assign(S2, (JSON.parse(localStorage.getItem(SK) || '{}').s2) || {}); } catch (e) { }
const saveS2 = () => { try { const o = JSON.parse(localStorage.getItem(SK) || '{}'); o.s2 = S2; o.quality = SP.settings.quality; localStorage.setItem(SK, JSON.stringify(o)); } catch (e) { } };
function applyS2() {
  SP.invertY = S2.invY; SP.adsSens = +S2.adsSens || 1; SP.toggleAds = S2.toggleAds; if (!S2.toggleAds) SP.adsLatched = false;
  document.documentElement.style.setProperty('--btnscale', S2.btn); document.documentElement.style.setProperty('--subscale', S2.sub);
  const c = $('#game'); if (c) c.style.filter = S2.cb === 'off' ? '' : 'url(#cb-' + S2.cb + ')';
  $('#fpsc').hidden = !S2.fps; $('#srun').hidden = !S2.speedrun;
}
F2.S2 = S2;

/* ---------------- 40 auto-detect quality on first launch ---------------- */
(function autoQuality() {
  if (S2.autoQ) return; S2.autoQ = true; let q = 'high';
  const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent); const cores = navigator.hardwareConcurrency || 4; const mem = navigator.deviceMemory || 4;
  if (mob || cores <= 2 || mem <= 2) q = 'low'; else if (cores <= 4 || mem <= 4 || /CrOS/.test(navigator.userAgent)) q = 'medium'; else if (cores >= 8 && mem >= 8) q = 'ultra';
  SP.settings.quality = q; saveS2();
})();

/* ---------------- 39 Ultra preset ---------------- */
const baseApply = F.applySettings;
F.applySettings = function () {
  baseApply && baseApply.apply(this, arguments);
  if (SP.settings.quality === 'ultra') { SP.post.scale = 1; SP.shadowRes = 4096; SP.post.depthOn = !window.__noDepth; SP.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); const w = innerWidth, h = innerHeight; const pr = SP.renderer.getPixelRatio(); SP.renderer.setSize(w, h, false); SP.post.setSize(w * pr, h * pr); SP.post.U.ao.value = 0.9; }
  applyS2();
};

/* ---------------- 41 dynamic resolution ---------------- */
let drT = 0, drScale = 1;
function dynRes(rdt) {
  if (!S2.dynres || !SP.post || SP.state !== 'play') return; drT += rdt; if (drT < 1.5) return; drT = 0;
  const base = { ultra: 1, high: 1, medium: 0.8, low: 0.62 }[SP.settings.quality] || 1; const fps = SP.fps || 60;
  if (fps < 40) drScale = Math.max(0.55, drScale - 0.08); else if (fps > 56) drScale = Math.min(1, drScale + 0.04);
  const want = +(base * drScale).toFixed(2); if (Math.abs(want - SP.post.scale) > 0.01) { SP.post.scale = want; const pr = SP.renderer.getPixelRatio(); SP.post.setSize(innerWidth * pr, innerHeight * pr); }
}

/* ======================= EQUIPMENT (1–7) ======================= */
const EQ = [
  { id: 'flash', name: 'FLASHBANG', n: 2 }, { id: 'smoke', name: 'SMOKE', n: 2 }, { id: 'molotov', name: 'MOLOTOV', n: 1 },
  { id: 'c4', name: 'C4', n: 1 }, { id: 'claymore', name: 'CLAYMORE', n: 1 }, { id: 'tknife', name: 'THROWING KNIFE', n: 3 },
];
F2.eq = 0; F2.eqCount = {}; const thrown = []; const smokes = []; const fires = []; const placed = [];
function eqHud() { const e = EQ[F2.eq]; const el = $('#equip'); if (!el) return; el.querySelector('span').textContent = e.name; el.querySelector('b').textContent = F2.eqCount[e.id] || 0; el.classList.toggle('empty', !(F2.eqCount[e.id] > 0)); el.querySelector('kbd').textContent = e.id === 'c4' && placed.some(p => p.kind === 'c4') ? 'K BOOM' : 'K'; }
function cycleEq() { F2.eq = (F2.eq + 1) % EQ.length; eqHud(); A.click(1400, 0.05); }
function useEq() {
  const P = SP.P; if (!P || !P.alive || P.mode !== 'walk' || (SP.Wheel && SP.Wheel.open)) return;
  const e = EQ[F2.eq];
  if (e.id === 'c4' && placed.some(p => p.kind === 'c4')) { placed.filter(p => p.kind === 'c4').forEach(p => detonate(p)); eqHud(); return; }
  if (!(F2.eqCount[e.id] > 0)) { G.hud.feed('NO ' + e.name + ' LEFT', ''); return; }
  F2.eqCount[e.id]--; eqHud(); if (F.stat) F.stat('equip');
  const f = P.forward(); const p0 = P.eyePos().addScaledVector(f, 0.5).add(V3(0, -0.15, 0));
  if (e.id === 'c4' || e.id === 'claymore') {
    const at = P.pos.clone().addScaledVector(V3(f.x, 0, f.z).normalize(), 1.2); at.y = SP.W.groundAt(at.x, at.z, P.pos.y + 0.5, 0.3);
    const m = new T.Mesh(SP.geo.box(e.id === 'c4' ? 0.25 : 0.22, e.id === 'c4' ? 0.08 : 0.14, e.id === 'c4' ? 0.16 : 0.06), SP.flat(e.id === 'c4' ? 0xbca880 : 0x4a5a34, 0.7)); m.position.copy(at).add(V3(0, 0.06, 0)); m.rotation.y = P.yaw; SP.scene.add(m);
    const led = new T.Mesh(SP.geo.box(0.02, 0.02, 0.02), new T.MeshBasicMaterial({ color: new T.Color(4, 0.2, 0.1) })); led.position.set(0, 0.06, 0); m.add(led);
    placed.push({ kind: e.id, m, pos: at.clone(), dir: V3(f.x, 0, f.z).normalize(), armT: 1.2 }); G.hud.feed(e.id === 'c4' ? 'C4 PLANTED · PRESS K TO DETONATE' : 'CLAYMORE PLANTED', 'gold'); A.click(900, 0.08); eqHud(); return;
  }
  const col = { flash: 0x2a2a2a, smoke: 0x5a6a5a, molotov: 0x6a4a1a, tknife: 0x9a9a9a }[e.id];
  const m = e.id === 'tknife' ? new T.Mesh(SP.geo.box(0.02, 0.01, 0.22), SP.mat('metal', { color: 0xa0a4a8, metalness: 0.9, roughness: 0.3 })) : new T.Mesh(SP.geo.cyl(0.035, 0.035, 0.13, 8), SP.flat(col, 0.6));
  m.position.copy(p0); SP.scene.add(m);
  const v = e.id === 'tknife' ? f.clone().multiplyScalar(38) : f.clone().multiplyScalar(16).add(V3(0, 3.4, 0));
  thrown.push({ kind: e.id, m, v, t: e.id === 'flash' ? 1.6 : e.id === 'smoke' ? 1.4 : 4 });
  A.click(2200, 0.05); if (SP.VM) SP.VM.kick = (SP.VM.kick || 0) + 0.4;
}
function detonate(p) { const i = placed.indexOf(p); if (i < 0) return; placed.splice(i, 1); SP.scene.remove(p.m); F.nadeNow = true; try { G.explosion(p.pos.clone().add(V3(0, 0.3, 0)), p.kind === 'c4' ? 9 : 6, p.kind === 'c4' ? 600 : 400, 'player'); } finally { F.nadeNow = false; } F.rumble && F.rumble(1, 300); }
function burst(kind, pos) {
  if (kind === 'flash') {
    for (const u of G.units) if (u.team === 'foe' && !u.dead && u.pos.distanceTo(pos) < 14 && SP.W.los(u.eye, pos.clone().add(V3(0, 0.3, 0)))) { u.stunT = 4.5; u.aware = true; }
    const P = SP.P; const d = P.pos.distanceTo(pos); const to = pos.clone().sub(P.eyePos()).normalize(); const look = to.dot(P.forward());
    if (d < 18 && SP.W.los(P.eyePos(), pos.clone().add(V3(0, 0.3, 0)))) { const k = clamp((1 - d / 18) * (look > 0.3 ? 1 : 0.35), 0, 1); F2.flashT = 3 * k; }
    G.particle({ pos: pos.clone(), life: 0.12, size: 6, color: new T.Color(30, 30, 30), additive: true, kind: 'glow' }); A.explosion && A.explosion(pos, 0.5); if (F.stat) F.stat('flashes');
  } else if (kind === 'smoke') { smokes.push({ pos: pos.clone(), t: 18, r: 6.5, puffT: 0 }); A.click(300, 0.1); }
  else if (kind === 'molotov') { fires.push({ pos: pos.clone(), t: 8, r: 4.2, fxT: 0 }); A.explosion && A.explosion(pos, 0.25); }
}
function updEquip(dt) {
  const W = SP.W;
  for (let i = thrown.length - 1; i >= 0; i--) {
    const n = thrown[i]; n.t -= dt; if (n.kind !== 'tknife') n.v.y -= 15 * dt; else n.v.y -= 3 * dt;
    const step = n.v.clone().multiplyScalar(dt); const len = step.length(); const dir = step.clone().normalize();
    if (n.kind === 'tknife') { const uh = G.rayUnits(n.m.position, dir, len, null, 'ally'); if (uh && uh.u && uh.u.team === 'foe') { F.meleeNow = true; try { uh.u.damage(9999, n.m.position.clone(), uh.part === 'head', 'player'); } finally { F.meleeNow = false; } G.hud.hit(true, uh.part === 'head'); SP.scene.remove(n.m); thrown.splice(i, 1); if (F.stat) F.stat('tknifeKills'); continue; } }
    const hit = W.ray(n.m.position, dir, len + 0.05);
    if (hit) { if (n.kind === 'tknife' || n.kind === 'molotov') { if (n.kind === 'molotov') burst('molotov', hit.point.clone()); SP.scene.remove(n.m); thrown.splice(i, 1); continue; } n.v.multiplyScalar(-0.3); }
    else n.m.position.add(step);
    n.m.rotation.x += dt * (n.kind === 'tknife' ? 0 : 8); if (n.kind === 'tknife') n.m.lookAt(n.m.position.clone().add(n.v));
    const gy = W.groundAt(n.m.position.x, n.m.position.z, n.m.position.y + 0.3, 0.3) + 0.04;
    if (n.m.position.y < gy) { n.m.position.y = gy; if (n.kind === 'molotov') { burst('molotov', n.m.position.clone()); SP.scene.remove(n.m); thrown.splice(i, 1); continue; } if (n.kind === 'tknife') { SP.scene.remove(n.m); thrown.splice(i, 1); continue; } n.v.set(n.v.x * 0.5, Math.max(0, -n.v.y * 0.25), n.v.z * 0.5); }
    if (n.t <= 0) { burst(n.kind, n.m.position.clone()); SP.scene.remove(n.m); thrown.splice(i, 1); }
  }
  for (let i = smokes.length - 1; i >= 0; i--) { const s = smokes[i]; s.t -= dt; s.puffT -= dt; if (s.puffT <= 0 && s.t > 2) { s.puffT = 0.12; G.particle({ pos: s.pos.clone().add(V3(rand(-2, 2), rand(0, 1), rand(-2, 2))), vel: V3(rand(-0.6, 0.6), rand(0.3, 0.9), rand(-0.6, 0.6)), life: 6, size: 3, grow: 4, color: new T.Color(0.75, 0.76, 0.74), opacity: 0.55 }); } if (s.t <= 0) smokes.splice(i, 1); }
  for (let i = fires.length - 1; i >= 0; i--) {
    const f = fires[i]; f.t -= dt; f.fxT -= dt;
    if (f.fxT <= 0) { f.fxT = 0.05; const a = rand(0, 6.28), r = rand(0, f.r); G.particle({ pos: f.pos.clone().add(V3(Math.cos(a) * r, 0.2, Math.sin(a) * r)), vel: V3(0, rand(1.5, 3), 0), life: 0.6, size: 0.8, grow: 1.2, color: new T.Color(6, 2.2, 0.4), additive: true, kind: 'glow' }); }
    for (const u of G.units) if (!u.dead && u.team === 'foe' && u.pos.distanceTo(f.pos) < f.r) { u.burnT = 2; F.nadeNow = true; try { u.damage(45 * dt, f.pos, false, 'player'); } finally { F.nadeNow = false; } }
    const P = SP.P; if (P.alive && P.pos.distanceTo(f.pos) < f.r * 0.8) { G._dmgKind = 'fire'; P.hurt(18 * dt / (SP.difficulty || 1), f.pos); G._dmgKind = null; }
    if (f.t <= 0) fires.splice(i, 1);
  }
  for (let i = placed.length - 1; i >= 0; i--) { const p = placed[i]; if (p.kind !== 'claymore') continue; p.armT -= dt; if (p.armT > 0) continue; for (const u of G.units) { if (u.dead || u.team !== 'foe') continue; const to = u.pos.clone().sub(p.pos); to.y = 0; const d = to.length(); if (d < 3.5 && to.normalize().dot(p.dir) > 0.2) { detonate(p); break; } } }
  if (F2.flashT > 0) { F2.flashT -= dt; SP.post.U.flash.value = Math.max(SP.post.U.flash.value, clamp(F2.flashT / 1.5, 0, 1.2)); }
}
// 16 smoke blinds enemy aim, 17 flash-stun, 18 burning AI — patch Unit
const shoot0 = SP.Unit.prototype.shootAt;
SP.Unit.prototype.shootAt = function (tg) {
  if (this.stunT > 0) return; const tp = this.targetPos(tg); const from = this.eye;
  for (const s of smokes) { if (s.t < 1.5) continue; const ab = tp.clone().sub(from); const t = clamp(s.pos.clone().sub(from).dot(ab) / ab.lengthSq(), 0, 1); if (from.clone().addScaledVector(ab, t).distanceTo(s.pos) < s.r) { const a0 = this.acc; this.acc *= 0.08; try { shoot0.call(this, tg); } finally { this.acc = a0; } return; } }
  return shoot0.call(this, tg);
};
const upd0 = SP.Unit.prototype.update;
SP.Unit.prototype.update = function (dt) {
  if (this.stunT > 0) { this.stunT -= dt; this.hands = this.stunT > 0 ? 'up' : null; }
  if (this.burnT > 0) { this.burnT -= dt; if (Math.random() < dt * 20) G.particle({ pos: this.pos.clone().add(V3(rand(-0.3, 0.3), rand(0.3, 1.6), rand(-0.3, 0.3))), vel: V3(0, 2, 0), life: 0.4, size: 0.4, color: new T.Color(6, 2, 0.4), additive: true, kind: 'glow' }); }
  return upd0.call(this, dt);
};

/* ======================= 8 ARMOUR ======================= */
const hurt0 = SP.Player.prototype.hurt;
SP.Player.prototype.hurt = function (dmg, from) {
  if (this.armor > 0 && this.alive && !this.god && G._dmgKind !== 'zone' && G._dmgKind !== 'fall') { const soak = Math.min(this.armor, dmg * 0.7); this.armor -= soak; dmg -= soak; if (this.armor <= 0) { G.hud.feed('ARMOUR BROKEN', 'red'); A.click(220, 0.15); } }
  return hurt0.call(this, dmg, from);
};
function armHud() { const P = SP.P; const el = $('#armbar'); if (!el || !P) return; const a = P.armor || 0; el.hidden = a <= 0 && !F2.armShown; el.querySelector('.fill').style.width = clamp(a / 150 * 100, 0, 100) + '%'; el.querySelector('.v').textContent = Math.round(a); }

/* ======================= KILLSTREAKS (9–11) ======================= */
const STREAKS = [{ id: 'uav', name: 'UAV', kills: 3, key: 'Digit9' }, { id: 'mortar', name: 'MORTAR BARRAGE', kills: 5, key: 'Digit0' }, { id: 'air', name: 'AIRSTRIKE', kills: 7, key: 'Minus' }];
F2.lifeKills = 0; F2.ready = {};
function streakHud() { const el = $('#streaks'); if (!el) return; el.innerHTML = STREAKS.map(s => `<div class="${F2.ready[s.id] ? 'rdy' : F2.lifeKills >= s.kills ? '' : 'off'}"><kbd>${s.key.replace('Digit', '').replace('Minus', '-')}</kbd><span>${s.name}</span><b>${F2.ready[s.id] ? 'READY' : Math.min(F2.lifeKills, s.kills) + '/' + s.kills}</b></div>`).join(''); $('#t-streak').hidden = !(SP.Touch && SP.Touch.on && Object.values(F2.ready).some(Boolean)); }
function useStreak(id) {
  if (!F2.ready[id]) return; F2.ready[id] = false; const P = SP.P; if (F.stat) F.stat('streaksUsed');
  if (id === 'uav') { G.hud.feed('UAV ONLINE', 'gold'); A.click(1800, 0.1); F2.uavT = 30; }
  if (id === 'mortar' || id === 'air') {
    let target = null, bd = 1e9; const f = P.forward();
    for (const u of G.units) { if (u.dead || u.team !== 'foe') continue; const d = u.pos.distanceTo(P.pos); if (d < 12 || d > 160) continue; const s = d - u.pos.clone().sub(P.pos).normalize().dot(f) * 40; if (s < bd) { bd = s; target = u.pos.clone(); } }
    if (!target) target = P.pos.clone().addScaledVector(V3(f.x, 0, f.z).normalize(), 50);
    G.hud.feed(id === 'mortar' ? 'MORTARS INBOUND' : 'AIRSTRIKE INBOUND', 'gold');
    const n = id === 'mortar' ? 8 : 10; const dir = V3(f.x, 0, f.z).normalize();
    for (let i = 0; i < n; i++) setTimeout(() => { if (SP.state !== 'play') return; const p = id === 'mortar' ? target.clone().add(V3(rand(-9, 9), 0, rand(-9, 9))) : target.clone().addScaledVector(dir, (i - n / 2) * 5).add(V3(rand(-2, 2), 0, rand(-2, 2))); p.y = SP.W.heightAt(p.x, p.z); if (p.distanceTo(SP.P.pos) < 8) return; F.nadeNow = true; try { G.explosion(p, 7, 300, 'player'); } finally { F.nadeNow = false; } }, (id === 'mortar' ? 1800 : 1200) + i * (id === 'mortar' ? 420 : 140));
    if (id === 'air') A.whistle && A.whistle(0.3);
  }
  streakHud();
}
function updUav(dt) { if (!(F2.uavT > 0)) return; F2.uavT -= dt; for (const u of G.units) if (u.team === 'foe' && !u.dead && !u.tagged && u.pos.distanceTo(SP.P.pos) < 150) { u.tagged = true; u.uavTag = true; } if (F2.uavT <= 0) for (const u of G.units) if (u.uavTag) { u.tagged = false; u.uavTag = false; } }

/* ======================= 12 weapon pickups · 13 damage numbers · 14 ding ======================= */
const ENEMY_GUN = { ak: 'ak74', shotgun: 'r870', pistol: 'm9' };
function dropWeapon(u) {
  const id = ENEMY_GUN[u.weapon] || null; if (!id || !SP.WEAP[id] || Math.random() > 0.3 || SP.curCh === 0 && SP.modePart && SP.modePart.modeTitle === 'FIRING RANGE') return;
  const pos = u.pos.clone().add(V3(rand(-0.4, 0.4), 0.15, rand(-0.4, 0.4))); const m = SP.WEAP[id].model ? SP.WEAP[id].model() : null; if (!m) return;
  m.position.copy(pos); m.rotation.set(0, rand(0, 6.28), Math.PI / 2); m.scale.setScalar(1); SP.scene.add(m);
  const it = G.addInteract({ pos: pos.clone().add(V3(0, 0.4, 0)), text: 'Swap for ' + SP.WEAP[id].name, radius: 2, onUse: () => { const P = SP.P; const ids = Object.keys(P.inv).filter(k => k !== 'knife'); if (P.inv[id]) P.inv[id].res += SP.WEAP[id].mag * 2; else { if (ids.length >= Math.max(3, PR().slots || 4) && P.cur && P.cur !== 'knife') delete P.inv[P.cur]; P.cur = null; P.give(id, SP.WEAP[id].mag, SP.WEAP[id].mag * 2); P.equip(id); } P.updAmmo(); SP.scene.remove(m); G.hud.feed('PICKED UP ' + SP.WEAP[id].name, 'gold'); if (F.stat) F.stat('gunPickups'); } });
  setTimeout(() => { it.enabled = false; SP.scene.remove(m); }, 45000);
}
function dmgNumber(u, d, head) {
  if (!SP.camera || !u) return; const p = u.pos.clone().add(V3(rand(-0.3, 0.3), 1.9, rand(-0.3, 0.3))).project(SP.camera); if (p.z > 1) return;
  const el = document.createElement('div'); el.className = 'dnum' + (head ? ' hd' : ''); el.textContent = Math.round(Math.min(d, 999)); el.style.left = (p.x * 0.5 + 0.5) * 100 + '%'; el.style.top = (-p.y * 0.5 + 0.5) * 100 + '%'; $('#dnums').append(el); setTimeout(() => el.remove(), 800);
}
const hit0 = SP.onHit; SP.onHit = function (u, part, killed) { hit0 && hit0.apply(this, arguments); if (part === 'head' && A.click) A.click(3200, 0.07); };
const dmg0 = SP.Unit.prototype.damage;
SP.Unit.prototype.damage = function (d, from, head, source) { const hp = this.hp; const r = dmg0.call(this, d, from, head, source); if (source === 'player' && this.team === 'foe' && S2.dnum !== false) safe(() => dmgNumber(this, Math.min(d, hp > 0 ? Math.max(1, hp) : d), head)); return r; };

/* ======================= 21 weapon levels · 24 rank ======================= */
const lvlOf = xp => Math.floor(Math.sqrt((xp || 0) / 250)) + 1;
const RANKS = ['Recruit', 'Private', 'Private First Class', 'Specialist', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Sergeant First Class', 'Master Sergeant', 'First Sergeant', 'Sergeant Major', 'Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'];
const rankLvl = sc => Math.min(100, Math.floor(Math.pow((sc || 0) / 400, 0.62)) + 1);
const rankName = l => RANKS[Math.min(RANKS.length - 1, Math.floor((l - 1) / 5))] + ' ' + (((l - 1) % 5) + 1);
F2.rank = () => rankLvl(F.ST && F.ST.score);
F2.rankName = () => rankName(F2.rank());
let lastRank = 0;
SP.onKillExtra = function (u, head, dist, isMelee, isNade, how) {
  safe(() => {
    F2.lifeKills++; F2.partKills = (F2.partKills || 0) + 1; if (!SP.noStreaks) for (const s of STREAKS) if (F2.lifeKills === s.kills) { F2.ready[s.id] = true; G.hud.feed(s.name + ' READY · PRESS ' + s.key.replace('Digit', '').replace('Minus', '-'), 'gold'); A.click(1600, 0.12); } streakHud();
    dropWeapon(u);
    const P = SP.P; const wid = isMelee ? 'knife' : P && P.cur; const pr = PR(); if (wid && pr.wxp) { const xp = pr.wxp[wid] || 0; const before = lvlOf(xp - (head ? 150 : 100)), after = lvlOf(xp); if (after > before) { pr.coins += 50 * after; pr.save(); G.hud.feed(SP.WEAP[wid].name + ' LEVEL ' + after + ' · +' + 50 * after + ' COINS', 'gold'); } }
    if (u.isJugg && F.stat) F.stat('juggs');
    const r = F2.rank(); if (lastRank && r > lastRank) { F.toast && F.toast('RANK UP', 'Rank ' + r + ' · ' + rankName(r)); PR().coins += 100; PR().save(); A.click(1000, 0.2); } lastRank = r;
  });
};

/* ======================= 25 grades · 26 speedrun · 44 complete card ======================= */
const BKEY = 'survival_protocol_best';
let BEST = {}; try { BEST = JSON.parse(localStorage.getItem(BKEY) || '{}'); } catch (e) { }
let partT = 0, partDeaths = 0, partShots0 = 0, partHits0 = 0, lastKey = '';
function grade() {
  const ST = F.ST || {}; const shots = (ST.shots || 0) - partShots0, hits = (ST.hits || 0) - partHits0; const acc = shots > 4 ? hits / shots : 0.5;
  let s = 60 + acc * 40 - partDeaths * 18 + Math.min(20, (F2.partKills || 0) * 1.5) - Math.max(0, partT / 60 - 8) * 2;
  return s >= 95 ? 'S' : s >= 80 ? 'A' : s >= 65 ? 'B' : s >= 50 ? 'C' : 'D';
}
const fmtT = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '.' + String(Math.floor((t % 1) * 10));
const opc = F.onPartComplete;
F.onPartComplete = function () {
  opc && opc.apply(this, arguments);
  safe(() => {
    if (!SP.curCh) return; const key = SP.curCh + '-' + (SP.save.last || 1); const g = grade(); const b = BEST[key] || {};
    const newBest = !b.t || partT < b.t; const gOrder = 'DCBAS'; if (!b.g || gOrder.indexOf(g) > gOrder.indexOf(b.g)) b.g = g; if (newBest) b.t = partT; BEST[key] = b; try { localStorage.setItem(BKEY, JSON.stringify(BEST)); } catch (e) { }
    if (g === 'S' && F.stat) F.stat('sGrades');
    const card = $('#gradecard'); card.innerHTML = `<b>${g}</b><span>PART COMPLETE</span><i>${fmtT(partT)}${newBest ? ' · NEW BEST' : ' · best ' + fmtT(b.t)}</i><i>${F2.partKills || 0} kills · ${partDeaths} deaths</i>`; card.className = 'g' + g; card.hidden = false; setTimeout(() => { card.hidden = true; }, 3200);
    const bonus = { S: 120, A: 80, B: 40, C: 20, D: 0 }[g]; if (bonus) { PR().coins += bonus; PR().save(); }
  });
};
F2.best = BEST; F2.grade = grade;

/* ======================= 27 twenty new achievements ======================= */
const ST = () => F.ST || {};
const chapDone = n => SP.chapterDone && SP.chapterDone(n);
[
  ['ch6', 'Ghost of Algiers', 'Finish Chapter 6.', () => chapDone(6), 400], ['ch7', 'Black Snow', 'Finish Chapter 7.', () => chapDone(7), 400],
  ['ch8', 'Broken Arrow', 'Finish Chapter 8.', () => chapDone(8), 500], ['ch9', 'The Long Night', 'Finish Chapter 9.', () => chapDone(9), 500],
  ['chx', 'The Jackal', 'Finish Chapter X and Mission 1.', () => chapDone(10), 2000], ['brwin', 'Last One Standing', 'Win a Battle Royale.', () => (ST().brWins || 0) >= 1, 750],
  ['brwin5', 'Apex', 'Win 5 Battle Royales.', () => (ST().brWins || 0) >= 5, 1500], ['brplay', 'Drop In', 'Play a Battle Royale.', () => (ST().brGames || 0) >= 1, 100],
  ['horde10', 'Hold the Line', 'Reach wave 10 in Horde.', () => ((SP.ModesLB || {}).horde || {}).best >= 10, 600], ['horde20', 'Unbreakable', 'Reach wave 20 in Horde.', () => ((SP.ModesLB || {}).horde || {}).best >= 20, 1200],
  ['equip25', 'Gadgeteer', 'Use 25 pieces of equipment.', () => (ST().equip || 0) >= 25, 300], ['tk10', 'Knife Thrower', 'Get 10 throwing knife kills.', () => (ST().tknifeKills || 0) >= 10, 400],
  ['streak3', 'Called In', 'Use 10 killstreaks.', () => (ST().streaksUsed || 0) >= 10, 400], ['jugg', 'Giant Killer', 'Kill 5 juggernauts.', () => (ST().juggs || 0) >= 5, 500],
  ['sgrade', 'S-Rank', 'Earn an S grade on a part.', () => (ST().sGrades || 0) >= 1, 300], ['sgrade20', 'Perfectionist', 'Earn 20 S grades.', () => (ST().sGrades || 0) >= 20, 1000],
  ['gold', 'Gilded', 'Unlock Gold camo on any gun.', () => Object.values(PR().wkills || {}).some(k => k >= 300), 800], ['collector', 'Collector', 'Own 25 guns.', () => Object.keys(PR().owned || {}).filter(k => PR().owned[k]).length >= 25, 800],
  ['rank50', 'Officer Material', 'Reach rank 50.', () => F2.rank() >= 50, 1000], ['pickup', 'Battlefield Pickup', 'Swap to 10 enemy weapons.', () => (ST().gunPickups || 0) >= 10, 300],
].forEach(a => F.ACH && F.ACH.push(a));

/* ======================= 34 daily login bonus ======================= */
function dailyLogin() {
  const k = 'survival_protocol_login'; let L = { day: '', streak: 0 }; try { L = JSON.parse(localStorage.getItem(k) || 'null') || L; } catch (e) { }
  const d = new Date(); const today = d.toDateString(); if (L.day === today) return; const y = new Date(d - 864e5).toDateString();
  L.streak = L.day === y ? Math.min(7, L.streak + 1) : 1; L.day = today; const coins = 50 * L.streak; PR().coins += coins; PR().save(); try { localStorage.setItem(k, JSON.stringify(L)); } catch (e) { }
  setTimeout(() => F.toast && F.toast('DAILY LOGIN · DAY ' + L.streak, '+' + coins + ' coins'), 1500);
}

/* ======================= 38 lens rain · 42 sprint dust · 43 barrel smoke ======================= */
let dustT = 0, heat = 0;
function updWorldFx(dt) {
  const P = SP.P; if (!P) return; const wx = SP.Weather && SP.Weather.kind;
  const lens = $('#lens'); const wet = S2.lens && wx === 'rain' && !(SP.envCfg && SP.envCfg.indoor); if (lens.hidden === wet) lens.hidden = !wet;
  if (P.onGround && P.speed > 6 && SP.W && /sand|dirt|gravel/.test(SP.W.surfaceFn ? (SP.W.surfaceFn(P.pos.x, P.pos.z) || SP.W.surface || '') : SP.W.surface || '')) { dustT -= dt; if (dustT <= 0) { dustT = 0.18; G.particle({ pos: P.pos.clone().add(V3(rand(-0.3, 0.3), 0.1, rand(-0.3, 0.3))), vel: V3(rand(-0.3, 0.3), rand(0.2, 0.5), rand(-0.3, 0.3)), life: 1.2, size: 0.4, grow: 1.4, color: new T.Color(0.8, 0.7, 0.55), opacity: 0.3 }); } }
  const firing = F.lastShotT && G.time - F.lastShotT < 0.15; heat = clamp(heat + (firing ? dt * 0.6 : -dt * 0.25), 0, 1);
  if (heat > 0.5 && !firing && SP.VM && SP.VM.gun && Math.random() < dt * 14) { const m = SP.VM.gun.userData.muzzle; if (m) { const wp = SP.camera.localToWorld(V3(0.12, -0.08, -0.6)); G.particle({ pos: wp, vel: V3(rand(-0.05, 0.05), rand(0.3, 0.6), rand(-0.05, 0.05)), life: 1.4, size: 0.05, grow: 0.5, color: new T.Color(0.8, 0.8, 0.8), opacity: 0.18 * heat }); } }
}

/* ======================= 50 FPS · 26 speedrun timer ======================= */
let fpsAcc = 0, fpsN = 0, fpsT = 0;
function updCounters(rdt) {
  if (S2.fps) { fpsAcc += SP.fps || 0; fpsN++; fpsT += rdt; if (fpsT > 0.5) { $('#fpsc').textContent = Math.round(fpsAcc / fpsN) + ' FPS · ' + Math.round(SP.post.scale * 100) + '%'; fpsAcc = fpsN = fpsT = 0; } }
  if (S2.speedrun) { const key = (SP.curCh || 0) + '-' + (SP.save.last || 1); const b = BEST[key]; $('#srun').textContent = fmtT(partT) + (b && b.t ? '  ·  PB ' + fmtT(b.t) : ''); }
}

/* ======================= 52 gyro aim ======================= */
let gyroPrev = null;
addEventListener('deviceorientation', e => { if (!S2.gyro || !SP.Touch || !SP.Touch.on || SP.state !== 'play') { gyroPrev = null; return; } const a = e.alpha, b = e.beta; if (a == null) return; if (gyroPrev) { let da = a - gyroPrev[0]; if (da > 180) da -= 360; if (da < -180) da += 360; I.mouse.dx -= da * 6; I.mouse.dy -= (b - gyroPrev[1]) * 6; } gyroPrev = [a, b]; });

/* ======================= hooks ======================= */
const opl = F.onPartLoad;
F.onPartLoad = function (part, n, ch) {
  opl && opl.apply(this, arguments);
  safe(() => {
    if (ch) { SP.forceWeather = null; SP.Modes && SP.Modes.applyMutators(false); SP.timeScale = 1; const hb = $('#brhud'); if (hb) hb.remove(); SP.rangeStats = null; SP.modeHurt = null; }
    const key = ch + '-' + n; if (key !== lastKey) { partDeaths = 0; lastKey = key; } partT = 0; F2.partKills = 0; partShots0 = (F.ST || {}).shots || 0; partHits0 = (F.ST || {}).hits || 0;
    thrown.length = 0; smokes.length = 0; fires.length = 0; placed.length = 0; F2.flashT = 0; F2.uavT = 0;
    const armed = part.loadout && part.loadout.length && !(part.loadout.length === 1 && part.loadout[0] === 'pistol');
    EQ.forEach(e => F2.eqCount[e.id] = armed ? e.n : 0); if (!armed && part.loadout && part.loadout.length) F2.eqCount.tknife = 2;
    const P = SP.P; if (P) P.armor = armed ? (PR().skills && PR().skills.armor ? 100 : 50) : 0; F2.armShown = !!(P && P.armor);
    F2.lifeKills = 0; F2.ready = {}; streakHud(); eqHud(); lastRank = F2.rank();
    $('#equip').hidden = !armed; $('#streaks').hidden = !armed; $('#t-equip').hidden = !(SP.Touch && SP.Touch.on && armed);
  });
};
const od = SP.onPlayerDeath; SP.onPlayerDeath = function () { partDeaths++; F2.lifeKills = 0; F2.ready = {}; return od && od.apply(this, arguments); };
const opost = F.post;
F.post = function (dt, rdt) {
  opost && opost.apply(this, arguments);
  const P = SP.P; if (!P) return; partT += rdt;
  if (P.alive && P.mode === 'walk') { if (I.hit('KeyJ')) cycleEq(); if (I.hit('KeyK')) useEq(); STREAKS.forEach(s => { if (I.hit(s.key)) useStreak(s.id); }); }
  safe(() => SP.Weather && SP.Weather.update(dt)); safe(() => updEquip(dt)); safe(armHud); safe(() => updUav(dt)); safe(() => updWorldFx(dt)); safe(() => updCounters(rdt)); safe(() => dynRes(rdt));
};

/* ======================= menus: settings, What's New, credits ======================= */
const NEW = ['Mission select with Mission 1, "The Jackal"', 'Five new chapters: 6, 7, 8, 9 and Chapter X (94 new parts)', 'An 8-phase final boss and a 6-phase Chapter 5 boss', '50 new guns in 8 classes, attachments and 8 kill camos', '5 knives, including the karambit and tomahawk', 'Battle Royale Squads: 50 country teams of 4 on Isla Corona, a 2.4 km island with 16 named places', 'Online squads: real players join your team, bots fill the rest', 'Helicopter drops, the blue zone, chests, arms dealers, mercenaries for hire', 'Knock and revive, building with wood, stone and metal, loot your kills', 'Live team leaderboard, full colour map with pings, spectate your squad', 'Freeplay with 12 maps, 13 times of day, weather and 10 mutators', 'Horde mode and a firing range with every gun', 'Five new maps: Algiers, Timgad, the Atlas, Qasr Ibn Awa and the Sahara basin', 'Rain, snow and lightning', 'Flashbangs, smoke, molotovs, C4, claymores, throwing knives', 'Armour, three killstreaks, damage numbers and enemy weapon pickups', 'Player rank to 100, part grades, speedrun timer, 20 new achievements', 'Ultra graphics, auto quality, dynamic resolution', 'Colour-blind filters, invert Y, ADS sensitivity, toggle aim, gyro aim, button and subtitle size', 'Menus now scroll on phones'];
function buildWhatsNew() { $('#wn-list').innerHTML = NEW.map(t => `<li>${t.replace(/</g, '&lt;')}</li>`).join(''); }
function addSettings() {
  const set = $('#settings .set'); if (!set || $('#s2-cb')) return;
  const q = $('#s-q'); if (q && !q.querySelector('[value=ultra]')) { const o = document.createElement('option'); o.value = 'ultra'; o.textContent = 'Ultra (full resolution, sharpest shadows)'; q.prepend(o); }
  set.insertAdjacentHTML('beforeend', `
    <label for="s2-cb">Colour-blind filter<select id="s2-cb"><option value="off">Off</option><option value="prot">Protanopia</option><option value="deut">Deuteranopia</option><option value="trit">Tritanopia</option><option value="mono">High contrast mono</option></select></label>
    <label for="s2-ads">Aim sensitivity <span id="s2-adsv"></span><input id="s2-ads" type="range" min="0.4" max="2" step="0.05"></label>
    <label for="s2-btn">Touch button size <span id="s2-btnv"></span><input id="s2-btn" type="range" min="0.8" max="1.5" step="0.05"></label>
    <label for="s2-sub">Subtitle size <span id="s2-subv"></span><input id="s2-sub" type="range" min="0.8" max="1.6" step="0.05"></label>
    <label class="chk" for="s2-inv"><input id="s2-inv" type="checkbox"> Invert look up and down</label>
    <label class="chk" for="s2-tads"><input id="s2-tads" type="checkbox"> Toggle aim (click once to aim)</label>
    <label class="chk" for="s2-gyro"><input id="s2-gyro" type="checkbox"> Gyro aim on phones</label>
    <label class="chk" for="s2-fps"><input id="s2-fps" type="checkbox"> Show FPS counter</label>
    <label class="chk" for="s2-run"><input id="s2-run" type="checkbox"> Speedrun timer</label>
    <label class="chk" for="s2-dr"><input id="s2-dr" type="checkbox"> Dynamic resolution (holds frame rate)</label>
    <label class="chk" for="s2-lens"><input id="s2-lens" type="checkbox"> Rain on the lens</label>
    <label class="chk" for="s2-dn"><input id="s2-dn" type="checkbox"> Damage numbers</label>`);
  const sync = () => { $('#s2-cb').value = S2.cb; $('#s2-ads').value = S2.adsSens; $('#s2-btn').value = S2.btn; $('#s2-sub').value = S2.sub; $('#s2-inv').checked = S2.invY; $('#s2-tads').checked = S2.toggleAds; $('#s2-gyro').checked = S2.gyro; $('#s2-fps').checked = S2.fps; $('#s2-run').checked = S2.speedrun; $('#s2-dr').checked = S2.dynres; $('#s2-lens').checked = S2.lens; $('#s2-dn').checked = S2.dnum !== false; lbl(); };
  const lbl = () => { $('#s2-adsv').textContent = (+$('#s2-ads').value).toFixed(2) + '×'; $('#s2-btnv').textContent = Math.round($('#s2-btn').value * 100) + '%'; $('#s2-subv').textContent = Math.round($('#s2-sub').value * 100) + '%'; };
  ['#s2-ads', '#s2-btn', '#s2-sub'].forEach(s => $(s).addEventListener('input', lbl));
  new MutationObserver(() => { if (!$('#settings').hidden) sync(); }).observe($('#settings'), { attributes: true, attributeFilter: ['hidden'] });
  $('#s-done').addEventListener('click', () => {
    Object.assign(S2, { cb: $('#s2-cb').value, adsSens: +$('#s2-ads').value, btn: +$('#s2-btn').value, sub: +$('#s2-sub').value, invY: $('#s2-inv').checked, toggleAds: $('#s2-tads').checked, gyro: $('#s2-gyro').checked, fps: $('#s2-fps').checked, speedrun: $('#s2-run').checked, dynres: $('#s2-dr').checked, lens: $('#s2-lens').checked, dnum: $('#s2-dn').checked });
    if (S2.gyro && typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => { });
    drScale = 1; saveS2(); applyS2();
  }, true);
  sync();
}

/* ======================= fullscreen (works in the Google Sites embed too) ======================= */
function openTab() {
  const gz = window.__SP_SRC_GZ;
  const go = html => { const w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(html); w.document.close(); return true; } try { const u = URL.createObjectURL(new Blob([html], { type: 'text/html' })); if (window.open(u, '_blank')) return true; } catch (e) { } F.toast && F.toast('POP-UPS BLOCKED', 'Allow pop-ups for this page, then press Fullscreen again'); return false; };
  if (gz && typeof DecompressionStream !== 'undefined') {
    const bin = Uint8Array.from(atob(gz), c => c.charCodeAt(0));
    const w = window.open('', '_blank'); if (w) w.document.write('<body style="background:#0b0b0a;color:#ece6da;font:16px sans-serif;display:grid;place-items:center;height:100vh;margin:0">Loading Survival Protocol…</body>');
    new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).blob().then(bl => { const u = URL.createObjectURL(new Blob([bl], { type: 'text/html' })); if (w) { try { w.location.href = u; } catch (e) { bl.text().then(go); } } else if (!window.open(u, '_blank')) bl.text().then(go); }).catch(() => F.toast && F.toast('FULLSCREEN', 'This browser cannot open the full window version'));
    return;
  }
  if (/^https?:/.test(location.href) && !gz) { window.open(location.href, '_blank'); return; }
  F.toast && F.toast('FULLSCREEN', 'Fullscreen is not available in this browser');
}
F2.fullscreen = function () {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  const enabled = d.fullscreenEnabled || d.webkitFullscreenEnabled;
  if (req && enabled) { try { const p = req.call(el, { navigationUI: 'hide' }); if (p && p.then) p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(openTab); return; } catch (e) { } }
  openTab();
};
function fsLabel() { const on = !!(document.fullscreenElement || document.webkitFullscreenElement); document.body.classList.toggle('isfs', on); document.querySelectorAll('.fsbtn').forEach(b => b.textContent = on ? 'Exit fullscreen' : (SP.framed && !(document.fullscreenEnabled || document.webkitFullscreenEnabled) ? 'Fullscreen (opens a full window)' : 'Fullscreen')); }
document.addEventListener('fullscreenchange', fsLabel); document.addEventListener('webkitfullscreenchange', fsLabel);
function wire() {
  addSettings(); applyS2(); eqHud(); streakHud(); buildWhatsNew(); dailyLogin();
  $('#btn-new2') && $('#btn-new2').addEventListener('click', () => SP.openMissions && SP.openMissions());
  ['#btn-fs', '#p-fs'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', e => { e.preventDefault(); F2.fullscreen(); }); });
  const hf = $('#hudfs'); if (hf) { hf.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); F2.fullscreen(); }); hf.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); F2.fullscreen(); }, { passive: false }); }
  if (SP.framed) document.body.classList.add('framed'); fsLabel();
  $('#btn-wn').addEventListener('click', () => SP.showScreen('whatsnew')); $('#wn-back').addEventListener('click', () => SP.showScreen('title'));
  $('#btn-cred').addEventListener('click', () => SP.showScreen('credits')); $('#cr-back').addEventListener('click', () => SP.showScreen('title'));
  // toggle-aim latch on right mouse
  addEventListener('mousedown', e => { if (e.button === 2 && SP.toggleAds && SP.state === 'play') SP.adsLatched = !SP.adsLatched; });
  const tb = (sel, fn) => { const el = $(sel); if (!el) return; el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); el.addEventListener('click', e => { e.preventDefault(); fn(); }); };
  tb('#t-equip', useEq); tb('#t-eqcycle', cycleEq); tb('#t-streak', () => { const s = STREAKS.slice().reverse().find(s => F2.ready[s.id]); if (s) useStreak(s.id); });
  const rn = $('#rankline'); if (rn) { const upd = () => { rn.textContent = 'RANK ' + F2.rank() + ' · ' + F2.rankName().toUpperCase() + ' · ' + (PR().coins || 0).toLocaleString() + ' COINS'; }; upd(); new MutationObserver(() => { if (!$('#title').hidden) upd(); }).observe($('#title'), { attributes: true, attributeFilter: ['hidden'] }); }
  // first launch of 1.0: show What's New once
  try { if (localStorage.getItem('survival_protocol_seen10') !== '1') { localStorage.setItem('survival_protocol_seen10', '1'); F2.showWN = true; } } catch (e) { }
}
F2.useEq = useEq; F2.cycleEq = cycleEq; F2.useStreak = useStreak; F2.EQ = EQ;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

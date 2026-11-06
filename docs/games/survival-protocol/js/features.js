/* Survival Protocol — features pack: health bar, grenades, knife, fire modes, decals, pickups, kill feed, streaks, score,
   alert icons, minimap, tagging, night vision, inspect, ammo warnings, last-kill slow motion, death recap, combat music,
   controller support, rumble, FOV, crosshair, HUD scale, realism mode, photo mode, career stats, achievements,
   daily challenges, intel collectibles, loading tips, mission log, scope breathing */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp, lerp, damp } = SP; const G = SP.G, A = SP.Audio, I = SP.Input;
const $ = s => document.querySelector(s);
const F = SP.Features = {};
const safe = (fn) => { try { fn(); } catch (e) { if (!F._errLogged) { F._errLogged = true; console.warn('feature error', e); } } };

/* ====================== career profile (stats, achievements, daily, intel) ====================== */
const CKEY = 'survival_protocol_career';
const C = F.career = { stats: {}, ach: {}, intel: {}, daily: { day: '', base: {}, done: {} }, best: {} };
try { const s = JSON.parse(localStorage.getItem(CKEY) || 'null'); if (s) Object.assign(C, s); } catch (e) { }
const saveCareer = () => { try { localStorage.setItem(CKEY, JSON.stringify(C)); } catch (e) { } };
const ST = C.stats; ['kills', 'headshots', 'deaths', 'shots', 'hits', 'melee', 'nadeKills', 'takedowns', 'parts', 'chapters', 'time', 'intel', 'tags', 'pickups', 'score', 'dist', 'longshots', 'nades', 'streaks', 'photos', 'bossKills'].forEach(k => { if (ST[k] == null) ST[k] = 0; });
['longest', 'bestStreak', 'bestPartKills'].forEach(k => { if (C.best[k] == null) C.best[k] = 0; });
const add = (k, n = 1) => { ST[k] = (ST[k] || 0) + n; F.dirty = true; };
setInterval(() => { if (F.dirty) { F.dirty = false; saveCareer(); checkAch(); checkDaily(); } }, 2000);

/* ====================== settings additions ====================== */
const S = SP.settings;
const DEF = { fov: 74, xhair: 'default', xcol: '#ece6da', hud: 1, mblur: true, music: true, rumble: true };
for (const k in DEF) if (S[k] == null) S[k] = DEF[k];
F.applySettings = function () {
  SP.fov = +S.fov || 74;
  document.documentElement.style.setProperty('--hudscale', S.hud || 1);
  const cr = $('#cross'); cr.dataset.style = S.xhair; cr.style.setProperty('--xc', S.xcol);
  document.body.classList.toggle('realism', S.difficulty === 'realism');
  SP.post.U.mblur.value = S.mblur && SP.post.depthOn ? 0.6 : 0;
  SP.playerDmgMul = S.difficulty === 'realism' ? 1.35 : 1;
  if (S.difficulty === 'realism') SP.difficulty = 1.9;
};

/* ====================== health bar ====================== */
let hpGhost = 1, hpShown = -1;
function updHealth(dt) {
  const P = SP.P; const el = $('#hpbar'); if (!P) return;
  const show = P.mode !== 'locked' || P.alive; el.hidden = !show; if (!show) return;
  const f = clamp(P.hp / P.maxHp, 0, 1); hpGhost = f > hpGhost ? f : damp(hpGhost, f, 2.2, dt);
  el.querySelector('.fill').style.width = (f * 100).toFixed(1) + '%'; el.querySelector('.ghost').style.width = (hpGhost * 100).toFixed(1) + '%';
  const v = Math.ceil(P.hp); if (v !== hpShown) { hpShown = v; el.querySelector('.v').textContent = Math.max(0, v); el.querySelector('.mx').textContent = '/ ' + P.maxHp; }
  el.classList.toggle('low', f < 0.35); el.classList.toggle('mid', f >= 0.35 && f < 0.65); el.classList.toggle('regen', G.time - P.lastHit > 3 && f < 1);
}

/* ====================== pickups (ammo + medkits) ====================== */
const pickups = [];
function dropPickup(pos, kind) {
  const g = new T.Group();
  if (kind === 'ammo') { const b = new T.Mesh(new T.BoxGeometry(0.34, 0.18, 0.2), SP.mat('metal', { color: 0x4a5236, roughness: 0.6, metalness: 0.4 })); b.position.y = 0.09; g.add(b); const l = new T.Mesh(new T.BoxGeometry(0.06, 0.03, 0.21), SP.flat(0xc8b070, 0.4, 0.6)); l.position.set(0.1, 0.19, 0); g.add(l); }
  else { const b = new T.Mesh(new T.BoxGeometry(0.3, 0.12, 0.22), SP.flat(0xe8e2d6, 0.5)); b.position.y = 0.06; g.add(b); const c1 = new T.Mesh(new T.BoxGeometry(0.16, 0.13, 0.05), SP.flat(0xb02020, 0.5)); c1.position.y = 0.06; g.add(c1); const c2 = c1.clone(); c2.scale.set(0.3, 1, 3.2); g.add(c2); }
  const glow = new T.Mesh(new T.RingGeometry(0.3, 0.38, 24), new T.MeshBasicMaterial({ color: kind === 'ammo' ? 0xf2b33d : 0x8fd18a, transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; g.add(glow);
  g.position.copy(pos); g.position.y = SP.W.groundAt(pos.x, pos.z, pos.y + 1, 0.3); g.rotation.y = rand(0, 6.28); SP.scene.add(g);
  pickups.push({ g, kind, t: 60, glow });
}
function updPickups(dt) {
  const P = SP.P; if (!P) return;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.t -= dt; p.glow.material.opacity = 0.35 + Math.sin(G.time * 4 + i) * 0.2;
    const d = Math.hypot(p.g.position.x - P.pos.x, p.g.position.z - P.pos.z);
    let take = false;
    if (d < 1.7 && P.alive) {
      if (p.kind === 'ammo') { let gave = false; for (const k in P.inv) { const w = SP.WEAP[k]; if (!w || w.rocket) continue; const s = P.inv[k]; const cap = w.mag * 6; if (s.res < cap) { s.res = Math.min(cap, s.res + Math.ceil(w.mag * (k === P.cur ? 1 : 0.5))); gave = true; } } if (gave) { take = true; G.hud.feed('+ AMMO', 'gold'); A.mech(0.25); P.updAmmo(); } }
      else if (P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + 45); take = true; G.hud.feed('+45 HEALTH', 'green'); A.click(900, 0.1); }
    }
    if (take) add('pickups');
    if (take || p.t <= 0) { SP.scene.remove(p.g); pickups.splice(i, 1); }
  }
}

/* ====================== grenades ====================== */
const nades = []; F.nadeCount = 2;
function throwNade() {
  const P = SP.P; if (!P || !P.alive || P.mode !== 'walk' || F.nadeCount <= 0 || (SP.Wheel && SP.Wheel.open)) return;
  F.nadeCount--; updNadeHud(); add('nades');
  const f = P.forward(); const m = new T.Mesh(new T.SphereGeometry(0.055, 10, 8), SP.mat('metal', { color: 0x3c4430, roughness: 0.5, metalness: 0.5 })); m.castShadow = true;
  const p = P.eyePos().addScaledVector(f, 0.5).add(V3(0, -0.15, 0)); m.position.copy(p); SP.scene.add(m);
  const v = f.clone().multiplyScalar(17).add(V3(0, 3.6, 0)).add(V3(P.vel.x, 0, P.vel.z).multiplyScalar(0.6));
  nades.push({ m, v, t: 2.4, bounces: 0 }); A.click(2400, 0.06); setTimeout(() => A.click(700, 0.08), 120); G.hud.feed('FRAG OUT', '');
  if (SP.VM) SP.VM.kick = (SP.VM.kick || 0) + 0.6;
}
function updNades(dt) {
  const W = SP.W;
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i]; n.t -= dt; n.v.y -= 15 * dt;
    const step = n.v.clone().multiplyScalar(dt); const len = step.length();
    if (len > 0) { const hit = W.ray(n.m.position, step.clone().normalize(), len + 0.06); if (hit && hit.collider) { const b = hit.collider.box, q = hit.point; const dx = Math.min(Math.abs(q.x - b.min.x), Math.abs(q.x - b.max.x)), dz = Math.min(Math.abs(q.z - b.min.z), Math.abs(q.z - b.max.z)), dy = Math.min(Math.abs(q.y - b.min.y), Math.abs(q.y - b.max.y)); if (dy <= dx && dy <= dz) n.v.y *= -0.35; else if (dx < dz) n.v.x *= -0.4; else n.v.z *= -0.4; n.v.multiplyScalar(0.7); if (n.bounces++ < 4) A.click(1800, 0.04); step.set(0, 0, 0); } }
    n.m.position.add(step); n.m.rotation.x += dt * 9;
    const gy = W.groundAt(n.m.position.x, n.m.position.z, n.m.position.y + 0.3, 0.3) + 0.055;
    if (n.m.position.y < gy) { n.m.position.y = gy; if (n.v.y < -1) { n.v.y *= -0.3; A.click(1500, 0.03); } else n.v.y = 0; n.v.x *= 0.6; n.v.z *= 0.6; }
    if (n.t <= 0) { const pos = n.m.position.clone(); SP.scene.remove(n.m); nades.splice(i, 1); F.nadeNow = true; try { G.explosion(pos, 7.5, 260, 'player'); } finally { F.nadeNow = false; } rumble(0.9, 300); }
  }
}
function updNadeHud() { const el = $('#nades'); el.querySelector('b').textContent = F.nadeCount; el.classList.toggle('empty', F.nadeCount <= 0); }

/* ====================== knife ====================== */
F.knifeCd = 0;
function melee(fromWheel) {
  const P = SP.P; if (!P || !P.alive || P.mode !== 'walk' || (!fromWheel && F.knifeCd > 0) || (SP.Wheel && SP.Wheel.open)) return;
  const K = (SP.KNIVES && SP.KNIVES[SP.knifeKind ? SP.knifeKind() : 'combat']) || { range: 2.6, swing: 0.6 };
  F.knifeCd = K.swing + 0.15; const f = P.forward(); let best = null, bd = K.range * (SP.Progress && SP.Progress.skills && SP.Progress.skills.lunge ? 1.3 : 1);
  for (const u of G.units) { if (u.dead || u.team !== 'foe' || u.invuln) continue; const to = V3(u.pos.x - P.pos.x, 0, u.pos.z - P.pos.z); const d = to.length(); if (d > bd) continue; to.normalize(); if (to.dot(V3(f.x, 0, f.z).normalize()) < 0.55) continue; if (Math.abs(u.pos.y - P.pos.y) > 1.6) continue; best = u; bd = d; }
  if (SP.VM && SP.VM.group) { F.knifeAnim = 0.35; }
  A.click(260, 0.12); G.addTrauma(0.08); rumble(0.4, 80);
  if (best) { F.meleeNow = true; best.damage(9999, P.eyePos(), false, 'player'); F.meleeNow = false; A.impact(best.pos, 'flesh'); G.hud.hit(true, false); }
}

F.knifeSwing = function (w) { melee(true); };

/* ====================== fire modes ====================== */
SP.fireModes = SP.fireModes || {};
function cycleFireMode() {
  const P = SP.P; if (!P || !P.cur) return; const w = SP.WEAP[P.cur]; if (!w.auto) { G.hud.feed('SEMI-AUTO ONLY', ''); return; }
  const order = ['auto', 'burst', 'semi']; const cur = SP.fireModes[P.cur] || 'auto'; const nx = order[(order.indexOf(cur) + 1) % 3]; SP.fireModes[P.cur] = nx; A.click(2000, 0.05); updFireHud(true);
}
function updFireHud(flash) { const P = SP.P; const el = $('#firemode'); if (!P || !P.cur || P.mode === 'turret') { el.textContent = ''; return; } const w = SP.WEAP[P.cur]; const m = w.auto ? (SP.fireModes[P.cur] || 'auto') : w.pellets ? 'pump' : w.rocket ? 'single' : 'semi'; const t = m.toUpperCase(); if (el.textContent !== t) el.textContent = t; if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } }

/* ====================== bullet holes ====================== */
const decals = []; let decalGeo = null, decalMat = {};
SP.onWallHit = function (wh, dir, team) {
  if (team !== 'player' || !wh.collider) return; if (SP.settings.quality === 'low') return;
  const b = wh.collider.box, q = wh.point; const cand = [[Math.abs(q.x - b.min.x), V3(-1, 0, 0)], [Math.abs(q.x - b.max.x), V3(1, 0, 0)], [Math.abs(q.y - b.max.y), V3(0, 1, 0)], [Math.abs(q.y - b.min.y), V3(0, -1, 0)], [Math.abs(q.z - b.min.z), V3(0, 0, -1)], [Math.abs(q.z - b.max.z), V3(0, 0, 1)]].sort((a, c) => a[0] - c[0]);
  const n = cand[0][1]; if (n.dot(dir) > 0) return;
  decalGeo = decalGeo || new T.CircleGeometry(1, 10);
  const surf = wh.surf || 'hard'; const key = surf === 'metal' ? 'metal' : surf === 'wood' ? 'wood' : 'hard';
  const mat = decalMat[key] || (decalMat[key] = new T.MeshStandardMaterial({ color: key === 'metal' ? 0x9a9890 : key === 'wood' ? 0x2a1a10 : 0x1a1714, roughness: key === 'metal' ? 0.3 : 1, metalness: key === 'metal' ? 0.7 : 0, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  const m = new T.Mesh(decalGeo, mat); const s = rand(0.025, 0.04); m.scale.set(s, s, s); m.position.copy(q).addScaledVector(n, 0.012); m.lookAt(q.clone().add(n)); m.rotation.z = rand(0, 6.28); SP.scene.add(m);
  decals.push(m); if (decals.length > 140) { const o = decals.shift(); if (o.parent) o.parent.remove(o); }
};

/* ====================== kills: feed, streaks, score, slow-mo ====================== */
let streak = [], partKills = 0, aliveStreak = 0;
function killFeed(txt, head, wpn) {
  const el = document.createElement('div'); el.className = 'kf'; el.innerHTML = '<b>SARTON</b><span class="w"></span>' + (head ? '<i class="hs">◎</i>' : '') + '<span class="t"></span>';
  el.querySelector('.w').textContent = '[' + wpn + ']'; el.querySelector('.t').textContent = txt; const box = $('#killfeed'); box.prepend(el); while (box.children.length > 5) box.lastChild.remove();
  setTimeout(() => el.classList.add('out'), 4500); setTimeout(() => el.remove(), 5200);
}
function scorePop(n, label) { const el = document.createElement('div'); el.className = 'sp'; el.innerHTML = `<b>+${n}</b><span></span>`; el.querySelector('span').textContent = label || ''; $('#scorepop').append(el); setTimeout(() => el.remove(), 1400); add('score', n); F.partScore += n; }
function announce(txt, sub) { const el = $('#streak'); el.querySelector('b').textContent = txt; el.querySelector('span').textContent = sub || ''; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
F.partScore = 0;
SP.onKilled = function (u, source, head, from, how) {
  safe(() => {
    if (u.team !== 'foe') return;
    // drops
    if (!u.noDrop) { const r = Math.random(); if (r < 0.55) dropPickup(u.pos.clone(), 'ammo'); else if (r < 0.7) dropPickup(u.pos.clone(), 'med'); }
    if (source !== 'player') return;
    const P = SP.P; const dist = P ? P.pos.distanceTo(u.pos) : 0;
    add('kills'); partKills++; aliveStreak++;
    const isMelee = how !== 'takedown' && !!F.meleeNow; const isNade = !!F.nadeNow;
    let label = 'KILL', pts = 100;
    if (how === 'takedown') { add('takedowns'); label = 'TAKEDOWN'; pts = 150; }
    else if (isMelee) { add('melee'); label = 'KNIFE'; pts = 150; }
    else if (isNade) { add('nadeKills'); label = 'GRENADE'; pts = 125; }
    else if (head) { add('headshots'); label = 'HEADSHOT'; pts = 150; }
    if (dist > 60 && !isNade && how !== 'takedown') { add('longshots'); label += ' · LONGSHOT ' + Math.round(dist) + 'M'; pts += 50; }
    if (dist > C.best.longest && !isNade) C.best.longest = Math.round(dist);
    if (u.isBoss || u.name === 'THE JACKAL') add('bossKills');
    { const PRx = SP.Progress; const wid = isMelee ? 'knife' : isNade || how === 'takedown' ? null : P && P.cur; if (PRx && wid) { PRx.wkills = PRx.wkills || {}; PRx.wxp = PRx.wxp || {}; PRx.wkills[wid] = (PRx.wkills[wid] || 0) + 1; PRx.wxp[wid] = (PRx.wxp[wid] || 0) + (head ? 150 : 100); const cm = Object.values(SP.CAMOS || {}).find(c => c && c.kills === PRx.wkills[wid]); if (cm) G.hud.feed(SP.WEAP[wid].name + ' · ' + cm.name.toUpperCase() + ' CAMO UNLOCKED', 'gold'); if (PRx.wkills[wid] % 10 === 0) PRx.save(); } }
    SP.onKillExtra && SP.onKillExtra(u, head, dist, isMelee, isNade, how);
    const wpn = how === 'takedown' ? 'TAKEDOWN' : isMelee ? 'KNIFE' : isNade ? 'FRAG' : (P && P.cur ? SP.WEAP[P.cur].name : 'RIFLE');
    killFeed(u.name && u.name !== 'Unit' ? u.name : 'HOSTILE', head && !isMelee && !isNade, wpn); scorePop(pts, label);
    // multi-kill streaks
    streak = streak.filter(t => G.time - t < 4.5); streak.push(G.time); const n = streak.length;
    const names = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE' }; const nm = n >= 5 ? 'RAMPAGE' : names[n];
    if (n > (C.best.lastMulti || 0)) C.best.lastMulti = n;
    if (nm) { const bonus = 25 * n; announce(nm, '+' + bonus + ' COINS'); SP.Progress.coins += bonus; SP.Progress.save(); add('streaks'); A.click(1200 + n * 200, 0.12); F.daily('streak' + Math.min(n, 3)); }
    if (aliveStreak === 10) announce('UNSTOPPABLE', '10 kills without dying');
    if (aliveStreak === 20) announce('ONE-MAN ARMY', '20 kills without dying');
    if (aliveStreak > C.best.bestStreak) C.best.bestStreak = aliveStreak; if (partKills > C.best.bestPartKills) C.best.bestPartKills = partKills;
    // last enemy standing: slow motion
    const left = G.units.filter(x => !x.dead && x.team === 'foe' && !x.ignored && x.pos.distanceTo(P.pos) < 160).length;
    if (left === 0 && partKills > 1) { F.slowT = 1.3; SP.post.U.flash.value = 0.12; }
    rumble(head ? 0.5 : 0.3, 90);
  });
};
SP.onShot = function (w, key) { add('shots', w.pellets ? 0 : 1); F.lastShotT = G.time; if (w.pellets) add('shots'); rumble(w.rocket ? 0.8 : 0.18, w.rocket ? 200 : 45); };
SP.onHit = function (u, part, killed) { if (u.team === 'foe') add('hits'); };
SP.onPlayerHurt = function (dmg, from) { rumble(clamp(dmg / 40, 0.3, 1), 160); if (navigator.vibrate && SP.Touch.on && S.rumble) try { navigator.vibrate(60); } catch (e) { } };

/* ====================== enemy alert icons ====================== */
const alertEls = new Map();
function updAlerts() {
  const cam = SP.camera, w = innerWidth, h = innerHeight; const box = $('#alerts'); const seen = new Set();
  if (!document.body.classList.contains('realism')) for (const u of G.units) {
    if (u.dead || u.team !== 'foe' || u.ignored) continue; const P = SP.P; const d = u.pos.distanceTo(P.pos); if (d > 70) continue;
    let sym = null; if (!u.aware && u.suspicion > 0.15) sym = '?'; else if (u.aware && G.time - (u.awareAt || (u.awareAt = G.time)) < 4) sym = '!';
    if (!u.aware) u.awareAt = null;
    if (!sym) continue; const v = V3(u.pos.x, u.pos.y + 2.3, u.pos.z).project(cam); if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
    let el = alertEls.get(u); if (!el) { el = document.createElement('div'); el.className = 'al'; box.append(el); alertEls.set(u, el); }
    el.textContent = sym; el.className = 'al ' + (sym === '!' ? 'hot' : 'sus'); el.style.setProperty('--fill', sym === '?' ? clamp(u.suspicion, 0, 1) : 1);
    el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-100%) scale(${clamp(18 / d, 0.6, 1.3)})`; seen.add(u);
  }
  for (const [u, el] of alertEls) if (!seen.has(u)) { el.remove(); alertEls.delete(u); }
}

/* ====================== minimap ====================== */
let mmCols = [];
function mmSetup() { mmCols = SP.W ? SP.W.colliders.filter(c => { const b = c.box; return b.max.y - b.min.y > 1.4 && (b.max.x - b.min.x) < 60 && (b.max.z - b.min.z) < 60; }) : []; }
function updMinimap() {
  const cv = $('#minimap'); if (cv.hidden) return; const ctx = cv.getContext('2d'); const P = SP.P; if (!P) return;
  const R = cv.width / 2, sc = R / 55; ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.save(); ctx.beginPath(); ctx.arc(R, R, R - 1, 0, 6.283); ctx.clip(); ctx.fillStyle = 'rgba(8,9,8,.62)'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.translate(R, R); ctx.rotate(P.yaw);
  ctx.fillStyle = 'rgba(236,230,218,.13)';
  for (const c of mmCols) { const b = c.box; const x0 = (b.min.x - P.pos.x) * sc, z0 = (b.min.z - P.pos.z) * sc, x1 = (b.max.x - P.pos.x) * sc, z1 = (b.max.z - P.pos.z) * sc; if (x1 < -R * 1.5 || x0 > R * 1.5 || z1 < -R * 1.5 || z0 > R * 1.5) continue; ctx.fillRect(x0, z0, x1 - x0, z1 - z0); }
  ctx.strokeStyle = 'rgba(236,230,218,.08)'; ctx.lineWidth = 1; for (let r = 1; r <= 2; r++) { ctx.beginPath(); ctx.arc(0, 0, r * 25 * sc, 0, 6.283); ctx.stroke(); }
  for (const m of G.markers) { const p = m.posFn && m.posFn(); if (!p || m.kind === 'enemy') continue; let x = (p.x - P.pos.x) * sc, z = (p.z - P.pos.z) * sc; const L = Math.hypot(x, z); if (L > R - 8) { x *= (R - 8) / L; z *= (R - 8) / L; } ctx.save(); ctx.translate(x, z); ctx.rotate(-P.yaw + Math.PI / 4); ctx.fillStyle = '#f2b33d'; ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
  for (const u of G.units) {
    if (u.dead || u.ignored) continue; const x = (u.pos.x - P.pos.x) * sc, z = (u.pos.z - P.pos.z) * sc; if (x * x + z * z > R * R) continue;
    if (u.team === 'ally') { ctx.fillStyle = '#8fd18a'; ctx.beginPath(); ctx.arc(x, z, 3, 0, 6.283); ctx.fill(); }
    else if (u.team === 'foe') { const loud = u.tagged || (u.lastShotT && G.time - u.lastShotT < 2.5) || (u.aware && G.time - (F.lastShotT || -99) < 2); if (!loud) continue; ctx.fillStyle = u.tagged ? '#ff6a5a' : 'rgba(255,90,70,.85)'; ctx.beginPath(); ctx.arc(x, z, u.tagged ? 4 : 3, 0, 6.283); ctx.fill(); }
  }
  for (const v of G.vehicles) { if (v.dead || !v.mesh) continue; const x = (v.mesh.position.x - P.pos.x) * sc, z = (v.mesh.position.z - P.pos.z) * sc; if (x * x + z * z > R * R) continue; ctx.fillStyle = v.team === 'foe' ? 'rgba(255,90,70,.9)' : 'rgba(236,230,218,.6)'; ctx.fillRect(x - 4, z - 4, 8, 8); }
  ctx.restore();
  ctx.fillStyle = '#ece6da'; ctx.beginPath(); ctx.moveTo(R, R - 7); ctx.lineTo(R + 5, R + 5); ctx.lineTo(R, R + 2); ctx.lineTo(R - 5, R + 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(236,230,218,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(R, R, R - 1, 0, 6.283); ctx.stroke();
  // north tick
  const na = -P.yaw - Math.PI / 2; ctx.fillStyle = '#f2b33d'; ctx.font = '600 11px Barlow Condensed, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', R + Math.cos(na) * (R - 9), R + Math.sin(na) * (R - 9));
}

/* ====================== tagging (ping) ====================== */
function ping() {
  const P = SP.P; if (!P || !P.alive) return; const o = P.eyePos(), f = P.forward(); let best = null, bd = 0.035;
  for (const u of G.units) { if (u.dead || u.team !== 'foe' || u.ignored) continue; const tp = V3(u.pos.x, u.pos.y + 1.3, u.pos.z); const to = tp.clone().sub(o); const dist = to.length(); if (dist > 200) continue; to.normalize(); const ang = 1 - to.dot(f); if (ang < bd && SP.W.los(o, tp)) { bd = ang; best = u; } }
  if (!best) { A.click(500, 0.04); return; }
  if (best.tagged) return; best.tagged = true; add('tags'); A.click(1700, 0.08); G.hud.feed('ENEMY TAGGED', 'gold');
  const u = best; const mk = G.marker(() => u.dead || !u.tagged ? null : u.pos, '', 'enemy'); setTimeout(() => { u.tagged = false; G.removeMarker(mk); }, 15000);
}

/* ====================== night vision ====================== */
F.nvg = false;
function toggleNvg() { F.nvg = !F.nvg; A.click(F.nvg ? 3000 : 1200, 0.07); G.hud.feed(F.nvg ? 'NIGHT VISION ON' : 'NIGHT VISION OFF', ''); }
function updNvg(dt) { const U = SP.post.U; U.nvg.value = damp(U.nvg.value, F.nvg ? 1 : 0, 9, dt); if (SP.baseExposure != null && !F.photo) U.exposure.value = SP.baseExposure * (1 + U.nvg.value * (SP.night ? 5 : 1.2)); }

/* ====================== weapon inspect + knife anim ====================== */
function updVmAnims(dt) {
  const VM = SP.VM; if (!VM || !VM.group) return;
  if (F.inspectT > 0) { F.inspectT -= dt; const k = 1 - F.inspectT / 2.6; const e = Math.sin(Math.min(1, k) * Math.PI); VM.group.rotation.z = e * 0.9; VM.group.rotation.y = e * -0.7; VM.group.rotation.x = Math.sin(k * Math.PI * 2) * 0.15; if (F.inspectT <= 0) VM.group.rotation.set(0, 0, 0); }
  if (F.knifeAnim > 0) { F.knifeAnim -= dt; const k = 1 - F.knifeAnim / 0.35; VM.group.position.x += Math.sin(k * Math.PI) * -0.12; VM.group.rotation.z = Math.sin(k * Math.PI) * 0.6; if (F.knifeAnim <= 0) VM.group.rotation.z = 0; }
}
function inspect() { const P = SP.P; if (!P || !P.cur || P.reloadT > 0 || P.mode !== 'walk') return; F.inspectT = 2.6; A.mech(0.15); setTimeout(() => A.mech(0.12), 900); }

/* ====================== ammo warnings ====================== */
function updAmmoWarn() {
  const P = SP.P; const el = $('#lowammo'); if (!P || !P.cur || P.mode !== 'walk' || !P.inv[P.cur]) { el.textContent = ''; return; }
  const w = SP.WEAP[P.cur], s = P.inv[P.cur]; let t = '';
  if (P.reloadT > 0) t = ''; else if (s.mag === 0 && s.res === 0) t = 'NO AMMO'; else if (s.mag === 0) t = 'RELOAD'; else if (s.mag <= Math.max(1, Math.floor(w.mag * 0.25)) && !w.rocket) t = 'LOW AMMO';
  if (el.textContent !== t) { el.textContent = t; el.className = t === 'LOW AMMO' ? 'warn' : t ? 'crit' : ''; }
}

/* ====================== scope breathing (marksman rifle) ====================== */
F.breath = 4;
function updScope(dt) {
  const P = SP.P; if (!P || P.mode !== 'walk' || !P.cur) return; const w = SP.WEAP[P.cur]; const scoped = w.zoom && P.adsT > 0.8;
  const holding = scoped && (I.down('ShiftLeft') || I.down('ShiftRight')) && F.breath > 0;
  F.breath = holding ? F.breath - dt : Math.min(4, F.breath + dt * (scoped ? 0.8 : 2));
  const el = $('#breath'); el.hidden = !scoped; if (scoped) { el.querySelector('i').style.width = (F.breath / 4 * 100) + '%'; el.classList.toggle('hold', holding); }
  if (!scoped) return; const amp = holding ? 0.00004 : (F.breath <= 0 ? 0.0011 : 0.00045) * (P.crouch ? 0.55 : 1);
  const t = G.time; P.yaw += Math.cos(t * 0.9) * amp * 1.4; P.pitch += Math.sin(t * 1.7) * amp;
}

/* ====================== death recap ====================== */
const _death = SP.onPlayerDeath;
SP.onPlayerDeath = function () {
  _death && _death(); safe(() => { add('deaths'); aliveStreak = 0; const P = SP.P; let t = 'Killed by enemy fire.'; if (P.lastKind === 'explosion') t = 'Killed by an explosion.'; else if (P.lastFrom) t = 'Killed by enemy gunfire from ' + Math.round(P.lastFrom.distanceTo(P.pos)) + ' m away.'; setTimeout(() => { $('#deathrecap').textContent = t + ' This part: ' + partKills + ' kill' + (partKills === 1 ? '' : 's') + '.'; }, 1650); });
};

/* ====================== combat music ====================== */
const MU = { on: false, g: null, t: 0, beat: 0, intensity: 0 };
function musicNodes() {
  const ac = A.ac; if (!ac || MU.g) return; MU.g = ac.createGain(); MU.g.gain.value = 0; MU.g.connect(A.master);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.connect(MU.g);
  [55, 55.4, 82.4].forEach((f, i) => { const o = ac.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = i === 2 ? 0.05 : 0.07; o.connect(g); g.connect(lp); o.start(); });
  MU.lp = lp;
}
function drum(kind, vol) {
  const ac = A.ac; if (!ac || !MU.g) return; const t = ac.currentTime;
  if (kind === 'kick') { const o = ac.createOscillator(); const g = ac.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(MU.g); o.start(t); o.stop(t + 0.32); }
  else { const s = ac.createBufferSource(); s.buffer = A.nbuf; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = kind === 'snare' ? 1800 : 7000; const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'snare' ? 0.16 : 0.05)); s.connect(f); f.connect(g); g.connect(MU.g); s.start(t, rand(0, 1)); s.stop(t + 0.2); }
}
function updMusic(dt) {
  if (!S.music || !A.ac) { if (MU.g) MU.g.gain.value = 0; return; } musicNodes(); if (!MU.g) return;
  const P = SP.P; const combat = G.units.some(u => !u.dead && u.team === 'foe' && u.aware && P && u.pos.distanceTo(P.pos) < 90) && (G.time - (F.lastShotT || -99) < 8 || G.time - (P.lastHit || -99) < 8);
  MU.intensity = damp(MU.intensity, combat ? 1 : 0, combat ? 1.5 : 0.35, dt); MU.g.gain.value = MU.intensity * 0.22; MU.lp.frequency.value = 300 + MU.intensity * 700;
  if (MU.intensity < 0.05) return; MU.t += dt; const bt = 60 / 132 / 2;
  while (MU.t > bt) { MU.t -= bt; const b = MU.beat++ % 16; if (b % 4 === 0 || b === 10) drum('kick', 0.5 * MU.intensity); if (b % 8 === 4) drum('snare', 0.25 * MU.intensity); if (b % 2 === 1) drum('hat', 0.07 * MU.intensity); }
}

/* ====================== rumble ====================== */
function rumble(str, ms) {
  if (!S.rumble) return; const gp = F.gp && navigator.getGamepads ? navigator.getGamepads()[F.gp.index] : null;
  if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) try { gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(str, 0, 1), weakMagnitude: clamp(str * 0.7, 0, 1) }); } catch (e) { }
}

/* ====================== controller ====================== */
F.gp = null; const gprev = {};
addEventListener('gamepadconnected', e => { F.gp = e.gamepad; G.hud && G.hud.feed && SP.state === 'play' && G.hud.feed('CONTROLLER CONNECTED', 'gold'); document.body.classList.add('pad'); });
addEventListener('gamepaddisconnected', () => { F.gp = null; document.body.classList.remove('pad'); });
const BTN = { 0: 'Space', 1: 'KeyC', 2: 'KeyR', 3: '_swap', 4: 'KeyQ', 5: 'KeyG', 8: 'KeyF', 9: '_start', 10: 'ShiftLeft', 11: 'KeyV', 12: 'KeyN', 13: 'KeyT', 14: 'KeyB', 15: 'KeyZ' };
function pollPad(dt) {
  if (!F.gp || !navigator.getGamepads) return; const gp = navigator.getGamepads()[F.gp.index]; if (!gp) return;
  const dz = v => Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84;
  const lx = dz(gp.axes[0] || 0), ly = dz(gp.axes[1] || 0), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
  const pressed = i => gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4);
  if (SP.state !== 'play' || !document.getElementById('lockoverlay').hidden || F.menuActive()) { menuNav(gp, pressed); return; }
  const K = I.keys; const act = Math.abs(lx) + Math.abs(ly) + Math.abs(rx) + Math.abs(ry) > 0 || gp.buttons.some(b => b.pressed);
  if (act && !I.locked) I.fallback = true;
  const setK = (c, on) => { if (on && !K[c]) I.pressed[c] = true; K[c] = on; };
  setK('KeyW', ly < -0.3); setK('KeyS', ly > 0.3); setK('KeyA', lx < -0.3); setK('KeyD', lx > 0.3);
  const sens = (SP.sens || 1) * 1100 * dt; const cx = Math.sign(rx) * Math.pow(Math.abs(rx), 1.7), cy = Math.sign(ry) * Math.pow(Math.abs(ry), 1.7);
  const ads = pressed(6); I.mouse.dx += cx * sens * (ads ? 0.5 : 1); I.mouse.dy += cy * sens * 0.75 * (ads ? 0.5 : 1);
  const rt = pressed(7); if (rt && !I.mouse.l) I.mouse.lp = true; I.mouse.l = rt; I.mouse.r = ads;
  for (const i in BTN) { const on = pressed(+i); const was = !!gprev[i]; gprev[i] = on; const c = BTN[i];
    if (c === '_swap') { if (on && !was && SP.P) { const list = Object.keys(SP.P.inv); const k = list.indexOf(SP.P.cur); if (list.length > 1) SP.P.equip(list[(k + 1) % list.length]); } continue; }
    if (c === '_start') { if (on && !was) SP.pauseGame(); continue; }
    if (c === 'ShiftLeft') { if (on && !was) F.padSprint = !F.padSprint; continue; }
    setK(c, on); }
  if (ly > -0.3) F.padSprint = false; setK('ShiftLeft', !!F.padSprint);
}
F.menuActive = () => !!document.querySelector('.ov.screen:not([hidden])');
let navCd = 0;
function menuNav(gp, pressed) {
  const scr = document.querySelector('.ov.screen:not([hidden]), #lockoverlay:not([hidden])'); if (!scr) return; navCd -= 1 / 60;
  const items = [...scr.querySelectorAll('button:not([hidden]), select, input')].filter(b => b.offsetParent !== null); if (!items.length) return;
  const up = pressed(12) || (gp.axes[1] || 0) < -0.5, dn = pressed(13) || (gp.axes[1] || 0) > 0.5; let idx = items.indexOf(document.activeElement);
  if ((up || dn) && navCd <= 0) { navCd = 0.18; idx = idx < 0 ? 0 : (idx + (dn ? 1 : -1) + items.length) % items.length; items[idx].focus(); }
  const a = pressed(0), b = pressed(1); if (a && !gprev.ma && document.activeElement && items.includes(document.activeElement)) document.activeElement.click(); gprev.ma = a;
  if (b && !gprev.mb) { const back = scr.querySelector('#a-back, #s-done, #c-back, #p-resume'); if (back) back.click(); } gprev.mb = b;
}

/* ====================== photo mode ====================== */
F.photo = false; const PH = { filter: 0, fov: 60, vx: 0, vz: 0 };
F.openPhoto = function () {
  if (SP.state !== 'play') return; F.photo = true; PH.pos = SP.camera.position.clone(); PH.yaw = SP.P.yaw; PH.pitch = SP.P.pitch; PH.fov = SP.camera.fov;
  PH.fb = I.fallback; SP.showScreen(null); document.body.classList.add('photo'); $('#photo').hidden = false; if (SP.VM.group) SP.VM.group.visible = false; I.fallback = true; add('photos');
};
F.closePhoto = function () { F.photo = false; I.fallback = !!PH.fb; document.body.classList.remove('photo'); $('#photo').hidden = true; SP.post.U.photo.value = 0; if (SP.VM.group) SP.VM.group.visible = true; SP.showScreen('pause'); };
F.pausedTick = function (dt) {
  if (!F.photo) return; const cam = SP.camera; const [mx, my] = I.consume(); const sens = 0.0022 * (SP.sens || 1);
  if (I.mouse.l || I.locked) { PH.yaw -= mx * sens; PH.pitch = clamp(PH.pitch - my * sens, -1.5, 1.5); }
  const K = I.keys; const sp = (K.ShiftLeft ? 9 : 3) * dt; const fx = -Math.sin(PH.yaw), fz = -Math.cos(PH.yaw), rx = Math.cos(PH.yaw), rz = -Math.sin(PH.yaw);
  if (K.KeyW) PH.pos.add(V3(fx * Math.cos(PH.pitch), Math.sin(PH.pitch), fz * Math.cos(PH.pitch)).multiplyScalar(sp)); if (K.KeyS) PH.pos.add(V3(fx * Math.cos(PH.pitch), Math.sin(PH.pitch), fz * Math.cos(PH.pitch)).multiplyScalar(-sp));
  if (K.KeyA) PH.pos.add(V3(-rx * sp, 0, -rz * sp)); if (K.KeyD) PH.pos.add(V3(rx * sp, 0, rz * sp)); if (K.KeyE || K.Space) PH.pos.y += sp; if (K.KeyQ || K.KeyC) PH.pos.y -= sp;
  if (SP.P && PH.pos.distanceTo(SP.P.pos) > 40) PH.pos.sub(SP.P.pos).setLength(40).add(SP.P.pos);
  const gy = SP.W.groundAt(PH.pos.x, PH.pos.z, PH.pos.y + 0.5, 0.3) + 0.3; if (PH.pos.y < gy) PH.pos.y = gy;
  if (I.hit('BracketLeft')) PH.fov = clamp(PH.fov - 5, 20, 100); if (I.hit('BracketRight')) PH.fov = clamp(PH.fov + 5, 20, 100);
  if (I.hit('KeyF')) { PH.filter = (PH.filter + 1) % 4; SP.post.U.photo.value = PH.filter; $('#ph-filter').textContent = ['NONE', 'BLACK & WHITE', 'VINTAGE', 'COLD'][PH.filter]; }
  if (I.hit('Escape') || I.hit('KeyP')) { I.endFrame(); F.closePhoto(); return; }
  if (I.hit('Enter') || I.hit('KeyX')) F.snap = true;
  cam.position.copy(PH.pos); cam.rotation.set(PH.pitch, PH.yaw, 0, 'YXZ'); cam.fov = PH.fov; cam.updateProjectionMatrix(); $('#ph-fov').textContent = Math.round(PH.fov) + '°';
  I.endFrame();
};
F.afterRender = function () {
  if (!F.snap) return; F.snap = false;
  try { SP.renderer.domElement.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'survival-protocol-' + Date.now() + '.png'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }); $('#ph-msg').textContent = 'Saved to your downloads'; setTimeout(() => $('#ph-msg').textContent = '', 2000); } catch (e) { $('#ph-msg').textContent = 'Could not save the picture in this browser'; }
};

/* ====================== achievements ====================== */
const ACH = [
  ['first', 'First Blood', 'Get your first kill.', () => ST.kills >= 1, 100],
  ['k50', 'Seasoned', 'Get 50 kills.', () => ST.kills >= 50, 200],
  ['k250', 'Veteran', 'Get 250 kills.', () => ST.kills >= 250, 500],
  ['k1000', 'Legend of the Sahara', 'Get 1,000 kills.', () => ST.kills >= 1000, 1500],
  ['hs25', 'Sharpshooter', 'Get 25 headshots.', () => ST.headshots >= 25, 250],
  ['hs150', 'Deadeye', 'Get 150 headshots.', () => ST.headshots >= 150, 750],
  ['long', 'Long Way Down', 'Kill an enemy from more than 120 m.', () => C.best.longest >= 120, 400],
  ['knife10', 'Cold Steel', 'Get 10 knife kills.', () => ST.melee >= 10, 300],
  ['td10', 'Ghost Protocol', 'Get 10 silent takedowns.', () => ST.takedowns >= 10, 300],
  ['nade10', 'Fire in the Hole', 'Get 10 grenade kills.', () => ST.nadeKills >= 10, 300],
  ['streak5', 'Rampage', 'Kill 5 enemies within a few seconds of each other.', () => ST.streaks >= 1 && C.best.lastMulti >= 5, 400],
  ['alive20', 'One-Man Army', 'Get 20 kills without dying.', () => C.best.bestStreak >= 20, 400],
  ['tags25', 'Spotter', 'Tag 25 enemies.', () => ST.tags >= 25, 200],
  ['acc', 'Marksman', 'Keep 40% accuracy over 500 shots.', () => ST.shots >= 500 && ST.hits / ST.shots >= 0.4, 500],
  ['ch1', 'The Forgotten Base', 'Finish Chapter 1.', () => !!SP.Progress.chapterPaid[1], 300],
  ['ch2', "The Jackal's Road", 'Finish Chapter 2.', () => !!SP.Progress.chapterPaid[2], 300],
  ['ch3', 'The Leak', 'Finish Chapter 3.', () => !!SP.Progress.chapterPaid[3], 300],
  ['ch4', 'Iron Desert', 'Finish Chapter 4.', () => !!SP.Progress.chapterPaid[4], 300],
  ['ch5', 'Survival Protocol', 'Finish the story.', () => !!SP.Progress.chapterPaid[5], 1000],
  ['boss', 'The Jackal Falls', 'Defeat the Jackal.', () => SP.save && (SP.save.dk || []).includes('5-15'), 500],
  ['intel10', 'Analyst', 'Find 10 pieces of intel.', () => Object.keys(C.intel).length >= 10, 300],
  ['intelall', 'Spymaster', 'Find every piece of intel.', () => Object.keys(C.intel).length >= totalParts(), 2000],
  ['skills', 'Specialist', 'Unlock 7 skills.', () => Object.keys(SP.Progress.skills).length >= 7, 300],
  ['arsenal', 'Arsenal', 'Own every weapon.', () => ['sup', 'ak', 'shotgun', 'dmr', 'at4'].every(w => SP.Progress.owned[w]), 600],
  ['photo', 'Field Photographer', 'Use photo mode.', () => ST.photos >= 1, 100],
  ['daily', 'Every Day', 'Finish 10 daily challenges.', () => (C.dailyDone || 0) >= 10, 500],
];
const totalParts = () => (SP.CHAPTERS || []).reduce((n, c) => n + ((c.parts || []).length), 0) || 58;
function toast(title, sub) { const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = '<span class="e"></span><b></b><i></i>'; el.querySelector('.e').textContent = title; el.querySelector('b').textContent = sub; $('#toasts').append(el); setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 5000); A.click && A.click(1500, 0.1); }
function checkAch() {
  for (const [id, name, , test, coins] of ACH) { if (C.ach[id]) continue; let ok = false; try { ok = test(); } catch (e) { } if (ok) { C.ach[id] = Date.now(); SP.Progress.coins += coins; SP.Progress.save(); saveCareer(); toast('ACHIEVEMENT · +' + coins + ' COINS', name); } }
}

/* ====================== daily challenges ====================== */
const DAILY_POOL = [
  ['kills', 40, 'Get 40 kills'], ['headshots', 15, 'Get 15 headshots'], ['nadeKills', 4, 'Get 4 grenade kills'], ['melee', 3, 'Get 3 knife kills'],
  ['takedowns', 3, 'Get 3 silent takedowns'], ['parts', 3, 'Finish 3 parts'], ['tags', 10, 'Tag 10 enemies'], ['pickups', 12, 'Grab 12 pickups'],
  ['longshots', 3, 'Get 3 kills from over 60 m'], ['streaks', 2, 'Get 2 multi-kills'], ['intel', 1, 'Find a piece of intel'],
];
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function dailyList() { const day = today(); let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const pick = []; const pool = DAILY_POOL.slice(); for (let i = 0; i < 3; i++) { h = (h * 1103515245 + 12345) >>> 0; pick.push(pool.splice(h % pool.length, 1)[0]); } return pick; }
function dailyRoll() { const day = today(); if (C.daily.day !== day) { C.daily = { day, base: Object.assign({}, ST), done: {} }; saveCareer(); } }
F.daily = () => { };
function checkDaily() {
  dailyRoll(); for (const [k, n, label] of dailyList()) { if (C.daily.done[k]) continue; const prog = (ST[k] || 0) - (C.daily.base[k] || 0); if (prog >= n) { C.daily.done[k] = true; C.dailyDone = (C.dailyDone || 0) + 1; SP.Progress.coins += 300; SP.Progress.save(); saveCareer(); toast('DAILY CHALLENGE · +300 COINS', label); } }
  renderDailyPanel();
}
function renderDailyPanel() {
  const el = $('#daily'); if (!el) return; dailyRoll(); el.innerHTML = '<span class="eyebrow">TODAY\'S CHALLENGES · 300 COINS EACH</span>';
  for (const [k, n, label] of dailyList()) { const prog = Math.min(n, (ST[k] || 0) - (C.daily.base[k] || 0)); const done = C.daily.done[k]; const r = document.createElement('div'); r.className = 'dc' + (done ? ' done' : ''); r.innerHTML = '<span></span><b></b><i><u></u></i>'; r.querySelector('span').textContent = label; r.querySelector('b').textContent = done ? 'DONE' : prog + ' / ' + n; r.querySelector('u').style.width = (prog / n * 100) + '%'; el.append(r); }
}

/* ====================== intel collectibles ====================== */
let intelObj = null;
function placeIntel(key) {
  if (intelObj) { SP.scene && SP.scene.remove(intelObj.g); intelObj = null; }
  if (!key || C.intel[key] || !SP.P || !SP.W) return;
  const P = SP.P, W = SP.W; let h = 0; for (const ch of key) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  for (let tries = 0; tries < 60; tries++) {
    h = (h * 1103515245 + 12345) >>> 0; const a = (h % 6283) / 1000; h = (h * 1103515245 + 12345) >>> 0; const r = 14 + (h % 3000) / 100;
    const x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r; const y = W.groundAt(x, z, P.pos.y + 2, 0.3); if (Math.abs(y - P.pos.y) > 2.5) continue;
    let blocked = false; for (const c of W.colliders) { const b = c.box; if (x > b.min.x - 0.4 && x < b.max.x + 0.4 && z > b.min.z - 0.4 && z < b.max.z + 0.4 && b.max.y > y + 0.2 && b.min.y < y + 1.8) { blocked = true; break; } } if (blocked) continue;
    if (W.bounds && Math.hypot(x, z) > W.bounds - 5) continue;
    const g = new T.Group(); const fold = new T.Mesh(new T.BoxGeometry(0.32, 0.03, 0.24), SP.flat(0xb89a5a, 0.8)); fold.position.y = 0.05; g.add(fold);
    const stamp = new T.Mesh(new T.BoxGeometry(0.12, 0.031, 0.04), SP.flat(0x9a2020, 0.6)); stamp.position.set(0.05, 0.051, -0.05); g.add(stamp);
    const glint = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8, depthWrite: false })); glint.position.y = 0.25; g.add(glint);
    g.position.set(x, y, z); g.rotation.y = a; SP.scene.add(g); intelObj = { g, key, glint }; return;
  }
}
function updIntel() {
  if (!intelObj || !SP.P) return; const P = SP.P; intelObj.glint.material.opacity = 0.4 + Math.sin(G.time * 5) * 0.35; intelObj.glint.position.y = 0.25 + Math.sin(G.time * 2) * 0.04;
  if (Math.hypot(intelObj.g.position.x - P.pos.x, intelObj.g.position.z - P.pos.z) < 1.6 && Math.abs(intelObj.g.position.y - P.pos.y) < 2) {
    C.intel[intelObj.key] = Date.now(); add('intel'); saveCareer(); SP.scene.remove(intelObj.g); intelObj = null; A.click(1100, 0.12); toast('INTEL FOUND', Object.keys(C.intel).length + ' of ' + totalParts() + ' collected'); SP.Progress.coins += 100; SP.Progress.save();
  }
}

/* ====================== loading tips ====================== */
const TIPS = ['Hold F to open the weapon wheel. Time slows while it is open.', 'Press G to throw a frag grenade. You get two per part.', 'Press V to knife an enemy right in front of you.', 'Press Z to tag the enemy under your crosshair. Tagged enemies show on the minimap.', 'Press N for night vision. It is bright in daylight.', 'Press B to switch your rifle between auto, burst and semi.', 'Hold Shift while scoped to hold your breath and steady the marksman rifle.', 'Fallen enemies drop ammo and sometimes medkits.', 'Every part hides one piece of intel nearby.', 'Earn coins from chapters, multi-kills, achievements and daily challenges.', 'Unlock Slide in the Armory, then crouch while sprinting.', 'Press I to inspect your weapon.', 'Press H to hide the HUD.', 'Photo mode is in the pause menu.', 'A controller works too. Plug one in and press any button.'];
F.tip = () => TIPS[Math.floor(Math.random() * TIPS.length)];

/* ====================== per-part setup ====================== */
F.onPartLoad = function (part, n, ch) {
  safe(() => {
    F.nadeCount = (part.loadout && part.loadout.length) ? 2 : 0; updNadeHud(); partKills = 0; F.partScore = 0; F.nvg = false; SP.post.U.nvg.value = 0; F.inspectT = 0; F.slowT = 0; F.breath = 4;
    nades.length = 0; pickups.length = 0; decals.length = 0; streak = [];
    for (const [, el] of alertEls) el.remove(); alertEls.clear(); $('#killfeed').innerHTML = '';
    F.partKey = ch + '-' + n; F.placeIntelPending = ch ? 1.5 : 0; mmSetup(); updFireHud();
    $('#plog-name').textContent = 'Chapter ' + ch + ' · Part ' + n + ' — ' + (part.name || ''); $('#plog-place').textContent = [part.place, part.time].filter(Boolean).join(' · ');
    $('#t-nvg').hidden = !(SP.Touch.on && SP.night); $('#t-nade').hidden = !(SP.Touch.on && F.nadeCount > 0); $('#t-knife').hidden = !SP.Touch.on;
  });
};
F.onPartComplete = function () { add('parts'); saveCareer(); };
F.onChapterComplete = function () { add('chapters'); saveCareer(); };

/* ====================== frame hooks ====================== */
const _ws = SP.Progress.worldScale;
SP.Progress.worldScale = () => Math.min(_ws(), F.slowT > 0 ? 0.25 : 1);
F.pre = function (rdt) { safe(() => pollPad(rdt)); };
F.post = function (dt, rdt) {
  const P = SP.P; if (!P) return;
  ST.time += rdt; if (P.speed) ST.dist += P.speed * rdt;
  if (F.slowT > 0) F.slowT -= rdt;
  F.knifeCd = Math.max(0, F.knifeCd - rdt);
  if (F.placeIntelPending > 0) { F.placeIntelPending -= rdt; if (F.placeIntelPending <= 0) safe(() => placeIntel(F.partKey)); }
  if (P.alive && P.mode === 'walk') {
    if (I.hit('KeyG')) throwNade(); if (I.hit('KeyV')) melee(); if (I.hit('KeyB')) cycleFireMode(); if (I.hit('KeyZ')) ping(); if (I.hit('KeyI')) inspect();
  }
  if (I.hit('KeyN')) toggleNvg(); if (I.hit('KeyH')) document.body.classList.toggle('hudoff');
  { const ot = $('#objtext'); const t = ot ? ot.textContent : ''; if (F._ot !== t) { F._ot = t; $('#plog-obj').textContent = t ? 'Objective: ' + t : ''; } }
  safe(() => updHealth(rdt)); safe(() => updPickups(dt)); safe(() => updNades(dt)); safe(updAlerts); safe(updMinimap); safe(() => updNvg(rdt)); safe(() => updVmAnims(rdt));
  safe(updAmmoWarn); safe(() => updScope(rdt)); safe(() => updMusic(rdt)); safe(updIntel); safe(() => updFireHud(false)); safe(() => SP.Detail && SP.Detail.update());
};

/* ====================== screens: career, settings, pause log ====================== */
F.openCareer = function (from) {
  F.careerFrom = from; checkAch(); const s = ST, b = C.best; const acc = s.shots ? Math.round(s.hits / s.shots * 100) + '%' : '—';
  const hrs = Math.floor(s.time / 3600), mins = Math.floor(s.time / 60) % 60;
  const rows = [['Kills', s.kills], ['Headshots', s.headshots], ['Accuracy', acc], ['Deaths', s.deaths], ['K/D', s.deaths ? (s.kills / s.deaths).toFixed(2) : s.kills], ['Knife kills', s.melee], ['Takedowns', s.takedowns], ['Grenade kills', s.nadeKills], ['Longest kill', b.longest + ' m'], ['Best kill streak', b.bestStreak], ['Multi-kills', s.streaks], ['Enemies tagged', s.tags], ['Parts finished', s.parts], ['Intel found', Object.keys(C.intel).length + ' / ' + totalParts()], ['Distance on foot', (s.dist / 1000).toFixed(1) + ' km'], ['Time played', hrs + 'h ' + mins + 'm'], ['Score', s.score.toLocaleString()]];
  const g = $('#c-stats'); g.innerHTML = ''; rows.forEach(([k, v]) => { const d = document.createElement('div'); d.innerHTML = '<span></span><b></b>'; d.querySelector('span').textContent = k; d.querySelector('b').textContent = v; g.append(d); });
  const a = $('#c-ach'); a.innerHTML = ''; const got = ACH.filter(x => C.ach[x[0]]).length; $('#c-achn').textContent = got + ' / ' + ACH.length;
  ACH.forEach(([id, name, desc, , coins]) => { const d = document.createElement('div'); d.className = 'ach' + (C.ach[id] ? ' got' : ''); d.innerHTML = '<b></b><span></span><i></i>'; d.querySelector('b').textContent = name; d.querySelector('span').textContent = desc; d.querySelector('i').textContent = C.ach[id] ? 'UNLOCKED' : coins + ' COINS'; a.append(d); });
  renderDailyPanel(); $('#c-daily').innerHTML = $('#daily').innerHTML; SP.showScreen('career');
};
function wire() {
  $('#btn-career').addEventListener('click', () => F.openCareer('title'));
  $('#p-career').addEventListener('click', () => F.openCareer('pause'));
  $('#c-back').addEventListener('click', () => SP.showScreen(F.careerFrom || 'title'));
  $('#p-photo').addEventListener('click', () => F.openPhoto());
  $('#ph-exit').addEventListener('click', () => F.closePhoto());
  $('#ph-snap').addEventListener('click', () => { F.snap = true; });
  // settings additions
  const sync = () => { $('#s-fov').value = S.fov; $('#s-fovv').textContent = S.fov + '°'; $('#s-x').value = S.xhair; $('#s-xc').value = S.xcol; $('#s-hud').value = S.hud; $('#s-mb').checked = !!S.mblur; $('#s-mu').checked = !!S.music; $('#s-ru').checked = !!S.rumble; };
  $('#s-fov').addEventListener('input', () => { $('#s-fovv').textContent = $('#s-fov').value + '°'; });
  document.querySelectorAll('#btn-set, #p-set').forEach(b => b.addEventListener('click', sync));
  $('#s-done').addEventListener('click', () => { S.fov = +$('#s-fov').value; S.xhair = $('#s-x').value; S.xcol = $('#s-xc').value; S.hud = +$('#s-hud').value; S.mblur = $('#s-mb').checked; S.music = $('#s-mu').checked; S.rumble = $('#s-ru').checked; try { const k = 'survival_protocol_ch1_set'; const o = JSON.parse(localStorage.getItem(k) || '{}'); Object.assign(o, { fov: S.fov, xhair: S.xhair, xcol: S.xcol, hud: S.hud, mblur: S.mblur, music: S.music, rumble: S.rumble, difficulty: S.difficulty }); localStorage.setItem(k, JSON.stringify(o)); } catch (e) { } F.applySettings(); }, true);
  // touch buttons
  const tb = (id, fn) => { const b = $(id); if (!b) return; b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); fn(); }, { passive: false }); const u = e => { e.preventDefault(); b.classList.remove('on'); }; b.addEventListener('touchend', u, { passive: false }); b.addEventListener('touchcancel', u, { passive: false }); };
  tb('#t-nade', throwNade); tb('#t-knife', melee); tb('#t-nvg', toggleNvg);
  // loading tips
  const lt = $('#loadtip'); if (lt) { new MutationObserver(() => { if (!$('#loading').hidden) lt.textContent = F.tip(); }).observe($('#loading'), { attributes: true, attributeFilter: ['hidden'] }); }
  F.applySettings(); renderDailyPanel(); checkAch();
}
F.stat = add; F.addNade = n => { F.nadeCount += n; updNadeHud(); }; F.ACH = ACH; F.ST = ST; F.checkAch = checkAch; F.scorePop = scorePop; F.toast = toast; F.saveCareer = () => saveCareer(); F.rumble = rumble;
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', wire); else wire();
})();

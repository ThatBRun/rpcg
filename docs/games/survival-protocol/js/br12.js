/* Survival Protocol 1.2 — Battle Royale additions:
   floor loot (guns, ammo, meds, mats lying on the ground with rarity glow, swap when full), launch pads,
   reboot vans + reboot cards, supply drops, campfires, quick heal, teammate nameplates, landmark banners,
   compass, hot-drop counts on the map, distance culling and animated landmarks. */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp } = SP; const G = SP.G, A = SP.Audio, I = SP.Input; const BR = SP.BR;
const $ = s => document.querySelector(s);
const ITEMS = BR.ITEMS;
const isClient = () => BR.net && BR.net.role === 'client';
const netOn = () => BR.net && BR.net.role !== 'off';
const auth = () => !BR.net || BR.net.role === 'host';
function rmInteract(it) { if (!it) return; it.enabled = false; const i = G.interact.indexOf(it); if (i >= 0) G.interact.splice(i, 1); }
const MATC = { wood: 0xa8743a, stone: 0x9a9690, metal: 0x7a8288 };
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t; })();
const glowMats = {}; function glowMat(col) { if (glowMats[col]) return glowMats[col]; return glowMats[col] = new T.MeshBasicMaterial({ map: glowTex, color: new T.Color(col).multiplyScalar(1.6), transparent: true, depthWrite: false, blending: T.AdditiveBlending }); }
const glowGeo = new T.PlaneGeometry(1.6, 1.6); glowGeo.rotateX(-Math.PI / 2);

/* =============================== FLOOR LOOT =============================== */
const FL = { list: [], t: 0 };
function itemName(it) { if (it.k === 'gun') return SP.WEAP[it.id].name; if (it.k === 'item') return ITEMS[it.id].name + (it.n > 1 ? ' ×' + it.n : ''); if (it.k === 'ammo') return 'AMMO BOX'; if (it.k === 'mat') return it.n + ' ' + it.id.toUpperCase(); if (it.k === 'nade') return 'FRAG GRENADE'; return 'LOOT'; }
function itemColor(it) { return it.k === 'gun' ? BR.RAR[BR.gunRar(it.id)].c : it.k === 'item' ? '#7ab8ff' : it.k === 'ammo' ? '#d8c870' : '#d8d0c0'; }
function rollFloor(f) {
  const r = Math.random(), tier = f.tier || 0;
  if (r < 0.5) { const rar = BR.rollRarity(Math.min(0.55, tier * 0.18)); const id = BR.rollGun(rar); const W = SP.WEAP[id]; return { k: 'gun', id, mag: W.mag, res: Math.round(W.mag * 1.5) }; }
  if (r < 0.7) return { k: 'ammo', n: 1 };
  if (r < 0.9) return { k: 'item', id: SP.pick(['bandage', 'bandage', 'minishield', 'minishield', 'medkit', 'shieldpot']), n: SP.randi(1, 3) };
  if (r < 0.95) return { k: 'nade', n: 1 };
  return { k: 'mat', id: SP.pick(['wood', 'wood', 'stone', 'metal']), n: 30 };
}
function floorSetup(W) {
  FL.list = [];
  SP.seeded((BR.seed || 1) + 99, () => { (W.floor || []).forEach((f, i) => { if (Math.random() > 0.78) return; FL.list.push({ i: FL.list.length, pos: f.p.clone(), item: rollFloor(f), taken: false, m: null, it: null, ph: Math.random() * 6 }); }); });
}
function floorMesh(f) {
  const it = f.item; const g = new T.Group(); g.position.copy(f.pos); g.userData.noMerge = true;
  const glow = new T.Mesh(glowGeo, glowMat(itemColor(it))); glow.position.y = 0.04; g.add(glow);
  const spin = new T.Group(); spin.position.y = 0.45; g.add(spin); g.userData.spin = spin;
  if (it.k === 'gun') { const W = SP.WEAP[it.id]; const m = SP.tpGun ? SP.tpGun(it.id) : W.model ? W.model() : new T.Mesh(SP.geo.box(0.7, 0.15, 0.08), SP.flat(0x2a2a2a, 0.5, 0.5)); m.rotation.set(0, Math.PI / 2, 0); m.scale.setScalar(1.5); spin.add(m); const rar = BR.gunRar(it.id); if (rar === 'epic' || rar === 'legendary') { const beam = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 4, 6, 1, true), new T.MeshBasicMaterial({ color: new T.Color(itemColor(it)).multiplyScalar(2.2), transparent: true, opacity: 0.35, depthWrite: false })); beam.position.y = 2; g.add(beam); } }
  else if (it.k === 'ammo') { const b = new T.Mesh(SP.geo.box(0.42, 0.24, 0.26), SP.flat(0x4a5a32, 0.7, 0.2)); spin.add(b); const s = new T.Mesh(SP.geo.box(0.43, 0.06, 0.27), SP.flat(0xd8b830, 0.5)); spin.add(s); }
  else if (it.k === 'item') { const c = ITEMS[it.id].col; const b = new T.Mesh(SP.geo.box(0.26, 0.18, 0.2), SP.flat(c, 0.5)); spin.add(b); const cr = new T.Mesh(SP.geo.box(0.1, 0.19, 0.03), SP.flat(0xffffff, 0.4)); cr.position.z = 0.11; spin.add(cr); }
  else if (it.k === 'nade') { const b = new T.Mesh(SP.geo.sph ? SP.geo.sph(0.09, 10, 8) : new T.SphereGeometry(0.09, 10, 8), SP.flat(0x3a4a2a, 0.6, 0.3)); spin.add(b); }
  else { for (let k = 0; k < 3; k++) { const b = new T.Mesh(SP.geo.box(0.6, 0.08, 0.16), SP.flat(MATC[it.id] || 0xa8743a, 0.8)); b.position.set(0, k * 0.09 - 0.1, (k - 1) * 0.18); spin.add(b); } }
  SP.scene.add(g); return g;
}
function floorSpawn(f) {
  f.m = floorMesh(f); const auto = f.item.k === 'ammo' || f.item.k === 'mat';
  if (!auto) f.it = G.addInteract({ pos: f.pos.clone().add(V3(0, 0.45, 0)), text: 'Pick up ' + itemName(f.item) + (f.item.k === 'gun' ? ' · ' + BR.gunRar(f.item.id).toUpperCase() : ''), radius: 1.9, hold: 0, onUse: () => floorTake(f) });
}
function floorDespawn(f) { if (f.m) { SP.scene.remove(f.m); f.m = null; } if (f.it) { rmInteract(f.it); f.it = null; } }
function floorTake(f) {
  if (f.taken) return; const it = f.item; const P = SP.P;
  if (it.k === 'gun' && !BR.invAdd(it.id, { mag: it.mag, res: it.res })) {
    const cur = P.cur; if (!cur || cur === 'knife' || SP.WEAP[cur].item) { G.hud.feed('INVENTORY FULL · HOLD A GUN TO SWAP IT', 'red'); if (f.it) f.it.enabled = true; return; }
    BR.dropCurrent(); if (!BR.invAdd(it.id, { mag: it.mag, res: it.res })) { if (f.it) f.it.enabled = true; return; }
    G.hud.feed('SWAPPED FOR ' + SP.WEAP[it.id].name, 'gold');
  } else if (it.k === 'gun') { const r = BR.gunRar(it.id); G.hud.feed(SP.WEAP[it.id].name + ' · ' + r.toUpperCase(), r === 'legendary' || r === 'epic' ? 'gold' : ''); }
  else { const left = BR.takeItems([it]); if (left.length) { G.hud.feed('NO ROOM FOR ' + itemName(it), 'red'); if (f.it) f.it.enabled = true; return; } }
  f.taken = true; floorDespawn(f); A.click(1250, 0.07); BR.track('floorLoot'); BR.hudTick(true);
  if (netOn()) BR.net.event({ t: 'floor', i: f.i });
}
BR.netX.floor = m => { const f = FL.list[m.i]; if (f && !f.taken) { f.taken = true; floorDespawn(f); } };
function floorTick(dt, P) {
  FL.t -= dt; const alive = BR.me.st === 'alive' && !P.brKnocked;
  if (FL.t <= 0) { FL.t = 0.3; for (const f of FL.list) { if (f.taken) continue; const dx = f.pos.x - P.pos.x, dz = f.pos.z - P.pos.z, d2 = dx * dx + dz * dz; if (d2 < 75 * 75) { if (!f.m) floorSpawn(f); } else if (f.m && d2 > 95 * 95) floorDespawn(f); } }
  const tm = G.time || BR.t;
  for (const f of FL.list) { if (!f.m) continue; const sp = f.m.userData.spin; sp.rotation.y = tm * 1.2 + f.ph; sp.position.y = 0.45 + Math.sin(tm * 2 + f.ph) * 0.06;
    if (alive && (f.item.k === 'ammo' || f.item.k === 'mat') && Math.abs(f.pos.x - P.pos.x) < 1.4 && Math.abs(f.pos.z - P.pos.z) < 1.4 && Math.abs(f.pos.y - P.pos.y) < 1.6) floorTake(f); }
}

/* =============================== LAUNCH PADS =============================== */
const PAD = { cd: 0 };
function padTick(dt, P) {
  PAD.cd -= dt; if (PAD.cd > 0 || BR.me.st !== 'alive' || P.brKnocked || BR.swim) return;
  for (const p of BR.W.pads || []) { if (Math.abs(p.x - P.pos.x) < 2 && Math.abs(p.z - P.pos.z) < 2 && Math.abs(p.y - P.pos.y) < 1.4) { launch(P); return; } }
}
function launch(P) {
  PAD.cd = 3; BR.me.st = 'air'; BR.glide = false; BR.boostT = 2.6; P.onGround = false; P.pos.y += 1.2; P.vel.y = 55;
  A.click(220, 0.25); setTimeout(() => A.click(440, 0.2), 120); G.hud.feed('LAUNCHED · GLIDER DEPLOYS ON THE WAY DOWN', 'gold'); BR.track('launches');
  for (let k = 0; k < 16; k++) G.particle({ pos: P.pos.clone(), vel: V3(rand(-3, 3), rand(2, 8), rand(-3, 3)), life: 0.9, size: 0.18, color: new T.Color(1, 3, 6), additive: true, kind: 'spark', gravity: 4 });
  // bot squadmates hitch a ride and land near where I land
  for (const e of BR.ents) if (e.team === BR.myTeam && !e.me && !e.human && e.st === 'alive' && e.u && e.u.pos.distanceTo(P.pos) < 30) { e.st = 'air'; e.followMe = true; e.dropT = 30; e.dropAt = { x: e.u.pos.x + rand(-20, 20), z: e.u.pos.z + rand(-20, 20) }; if (e.u) { if (e.u.markEl) e.u.markEl.remove(); e.u.remove(); e.u = null; } }
}

/* =============================== REBOOT VANS & CARDS =============================== */
const RB = { cards: [], vans: [], carry: [], myT: 0 };
function rebootSetup(W) {
  RB.cards = []; RB.carry = []; RB.myT = 0; RB.vans = (W.vans || []).map(v => { const V = { pos: v.pos, screen: v.screen, used: 0 }; V.it = G.addInteract({ pos: v.pos.clone().add(V3(0, 1.2, 0)), text: 'Reboot your squad', hold: 6, radius: 4.5, onUse: () => rebootAt(V) }); V.it.enabled = false; return V; });
}
function rebootAt(V) {
  const Z = BR.zone; if (Z.ph >= 5) { G.hud.feed('REBOOT VANS ARE OFFLINE IN THE LATE GAME', 'red'); return; }
  const list = RB.carry.splice(0); if (!list.length) return;
  for (const e of list) { if (e.st !== 'dead') continue; e.st = 'alive'; e.hp = 100; e.sh = 0; e.knock = 0; e.guns = []; e.cur = 0; e.mats = { wood: 30, stone: 0, metal: 0 }; e.meds = { bandage: 0, medkit: 0, minishield: 0, shieldpot: 0 }; e.x = V.pos.x + rand(-4, 4); e.z = V.pos.z + rand(-4, 4); e.y = SP.W.groundAt(e.x, e.z); e.lootT = 4; e.rebooted = true; e.cardT = null; if (!e.u && auth()) BR.spawnUnit(e); BR.feed('YOU rebooted ' + e.name, 'gold'); BR.track('reboots'); }
  A.click(660, 0.2); setTimeout(() => A.click(990, 0.2), 140); V.used++; BR.hudTick(true);
}
function rebootTick(dt, P, Z) {
  // cards appear where bot squadmates fall
  for (const e of BR.ents) {
    if (e.team !== BR.myTeam || e.me || e.merc || e.human || e.st !== 'dead' || e.cardT != null) continue;
    e.cardT = BR.t; if (Z.ph >= 5 || !auth()) continue;
    const pos = e.u ? e.u.pos.clone() : V3(e.x, SP.W.groundAt(e.x, e.z, e.y + 1), e.z);
    const card = { e, pos, t: 90, m: new T.Mesh(SP.geo.box(0.32, 0.46, 0.04), SP.flat(0x3a8aff, 0.3, 0, { emissive: SP.lin(0x2a6aff), emissiveIntensity: 1.6 })) };
    card.m.position.copy(pos).add(V3(0, 0.9, 0)); card.m.userData.noMerge = true; SP.scene.add(card.m);
    card.mk = G.marker(() => card.pos.clone().add(V3(0, 1.6, 0)), 'CARD · ' + e.name, 'tag');
    card.it = G.addInteract({ pos: pos.clone().add(V3(0, 0.6, 0)), text: 'Grab ' + e.name + "'s reboot card", hold: 0.5, radius: 2.4, onUse: () => { if (!RB.cards.includes(card)) return; RB.carry.push(e); dropCard(card); G.hud.feed('REBOOT CARD · TAKE IT TO A BLUE REBOOT VAN (MAP)', 'gold'); A.click(1500, 0.1); } });
    RB.cards.push(card); G.hud.feed(e.name + ' IS DOWN FOR GOOD · GRAB THEIR REBOOT CARD', 'red');
  }
  for (const c of RB.cards.slice()) { c.t -= dt; c.m.rotation.y += dt * 2; if (c.t <= 0) dropCard(c); }
  for (const V of RB.vans) { V.it.enabled = RB.carry.length > 0 && Z.ph < 5; if (V.screen) V.screen.material.emissive && V.screen.material.emissive.setHex(Z.ph >= 5 ? 0x400000 : RB.carry.length ? 0x40ff80 : 0x205030); }
  // a bot squadmate can bring ME back (offline / host only)
  if (BR.me.st === 'dead' && auth() && !BR.over && Z.ph < 5 && SP.P && !SP.P.alive) {
    const mate = BR.ents.find(e => e.team === BR.myTeam && !e.me && !e.human && e.st === 'alive');
    if (mate) { RB.myT += dt; const left = Math.max(0, 40 - RB.myT); const el = $('#brspec b'); if (el) el.textContent = (RB.myT < 12 ? 'SPECTATING ' + mate.name : mate.name + ' HAS YOUR REBOOT CARD · BACK IN ' + Math.ceil(left) + 'S'); if (RB.myT >= 40) rebootMe(mate); }
  }
}
function dropCard(c) { const i = RB.cards.indexOf(c); if (i >= 0) RB.cards.splice(i, 1); SP.scene.remove(c.m); rmInteract(c.it); G.removeMarker(c.mk); }
function rebootMe(mate) {
  RB.myT = 0; const P = SP.P; const near = RB.vans.slice().sort((a, b) => a.pos.distanceTo(V3(mate.x, mate.y, mate.z)) - b.pos.distanceTo(V3(mate.x, mate.y, mate.z)))[0];
  const at = near ? near.pos : V3(mate.x, mate.y, mate.z);
  BR.spectating = false; $('#brspec').hidden = true; P.alive = true; P.hp = 100; P.armor = 0; P.brKnocked = false; P.speedMul = 1; P.canSprint = true; P.forceCrouch = false; P.mode = 'walk'; SP.blurTarget = 0; SP.post.U.damage.value = 0;
  P.pos.set(at.x + rand(-5, 5), at.y + 160, at.z + rand(-5, 5)); P.vel.set(0, 0, 0); P.onGround = false; BR.me.st = 'air'; BR.glide = false; BR.me.hp = 100;
  BR.resetInv && BR.resetInv(); BR.me.mats = { wood: 30, stone: 0, metal: 0 }; SP.setRunning && SP.setRunning(true); SP.state = 'play';
  G.hud.feed(mate.name + ' REBOOTED YOU · GLIDE IN AND GEAR UP', 'gold'); A.click(990, 0.2);
  try { if (!(SP.Touch && SP.Touch.on)) I.lock && I.lock(); } catch (e) { }
  BR.c && BR.c.obj('Land, find a gun and regroup with your squad', null); BR.hudTick(true);
}

/* =============================== SUPPLY DROPS =============================== */
const SD = { list: [], lastPh: -2, nextT: 75, id: 1 };
function sdSpawn(x, z, id) {
  const g = new T.Group(); g.userData.noMerge = true;
  const crate = new T.Mesh(SP.geo.box(1.2, 1, 1.2), SP.flat(0x2a5aa8, 0.5, 0.3)); crate.position.y = 0.5; g.add(crate);
  const band = new T.Mesh(SP.geo.box(1.24, 0.16, 1.24), SP.flat(0xffd040, 0.4, 0.4, { emissive: SP.lin(0xffb020), emissiveIntensity: 1 })); band.position.y = 0.5; g.add(band);
  const chute = new T.Mesh(new T.SphereGeometry(3.2, 16, 8, 0, 6.283, 0, Math.PI / 2.2), SP.flat(0xe84a3a, 0.8, 0, { side: T.DoubleSide })); chute.position.y = 6.5; g.add(chute);
  for (let k = 0; k < 4; k++) { const ln = new T.Mesh(SP.geo.box(0.03, 5.6, 0.03), SP.flat(0xffffff, 0.5)); const a = k * 1.571 + 0.785; ln.position.set(Math.cos(a) * 1.4, 3.8, Math.sin(a) * 1.4); ln.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(ln); }
  const beam = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 260, 8, 1, true), new T.MeshBasicMaterial({ color: new T.Color(0.6, 1.4, 4), transparent: true, opacity: 0.28, depthWrite: false })); beam.position.y = 130; g.add(beam);
  const ground = SP.W.groundAt(x, z); g.position.set(x, ground + 240, z); SP.scene.add(g);
  const D = { id, x, z, ground, g, chute, landed: false, open: false };
  D.mk = G.marker(() => g.position.clone().add(V3(0, 2, 0)), 'SUPPLY DROP', 'obj');
  D.it = G.addInteract({ pos: () => g.position.clone().add(V3(0, 0.8, 0)), text: 'Open supply drop', hold: 1.2, radius: 2.6, onUse: () => sdOpen(D, true) }); D.it.enabled = false;
  SD.list.push(D); G.hud.feed('SUPPLY DROP INBOUND · CHECK YOUR MAP', 'gold'); A.click(520, 0.18);
  return D;
}
function sdOpen(D, mine) {
  if (D.open) return; D.open = true; rmInteract(D.it); G.removeMarker(D.mk); SP.scene.remove(D.g); const i = SD.list.indexOf(D); if (i >= 0) SD.list.splice(i, 1);
  if (!mine) return; BR.track('drops');
  const items = [{ k: 'gun', id: BR.rollGun('legendary') }, { k: 'gun', id: BR.rollGun('epic') }, { k: 'item', id: 'shieldpot', n: 2 }, { k: 'item', id: 'medkit', n: 1 }, { k: 'ammo', n: 3 }, { k: 'mat', id: 'metal', n: 100 }, { k: 'gold', n: 150 }];
  const left = BR.takeItems(items); if (left.length) BR.makePile(V3(D.x + 1.5, D.ground, D.z + 1), left, 'supply drop', null);
  G.hud.feed('SUPPLY DROP OPENED', 'gold'); A.click(1600, 0.14);
  if (netOn()) BR.net.event({ t: 'sdopen', id: D.id });
}
BR.netX.sdrop = m => { if (!SD.list.some(d => d.id === m.id)) sdSpawn(m.x, m.z, m.id); };
BR.netX.sdopen = m => { const D = SD.list.find(d => d.id === m.id); if (D) sdOpen(D, false); };
function sdTick(dt, P, Z) {
  if (auth()) { SD.nextT -= dt; if (SD.nextT <= 0 || (Z.ph !== SD.lastPh && Z.ph >= 1 && Z.shrink)) { SD.nextT = 1e9; SD.lastPh = Z.ph; if (Z.ph < 7) { const a = rand(0, 6.28), r = rand(0, Z.tr * 0.7); const x = Z.tx + Math.cos(a) * r, z = Z.tz + Math.sin(a) * r; if (SP.W.heightAt(x, z) > 1) { const D = sdSpawn(x, z, SD.id++); if (BR.net && BR.net.role === 'host') BR.net.event({ t: 'sdrop', id: D.id, x, z }); } } } }
  for (const D of SD.list) { if (D.landed) continue; D.g.position.y -= dt * 11; D.g.rotation.y += dt * 0.4; if (D.g.position.y <= D.ground) { D.g.position.y = D.ground; D.landed = true; D.it.enabled = true; D.chute.visible = false; A.impact && A.impact(D.g.position, 'metal'); } }
}

/* =============================== CAMPFIRES, QUICK HEAL =============================== */
const CF = { t: 0, msg: 0 };
function fireTick(dt, P) {
  CF.t -= dt; if (CF.t > 0) return; CF.t = 0.5;
  for (const f of BR.W.fires || []) {
    if (Math.abs(f.x - P.pos.x) < 4 && Math.abs(f.z - P.pos.z) < 4 && BR.me.st === 'alive' && !P.brKnocked && P.alive) { if (P.hp < 100) { P.hp = Math.min(100, P.hp + 1.5); if (BR.t - CF.msg > 20) { CF.msg = BR.t; G.hud.feed('CAMPFIRE · HEALING', 'gold'); } } }
    for (const e of BR.ents) if (e.team === BR.myTeam && e.u && !e.me && e.st === 'alive' && e.u.pos.distanceTo(f) < 5) e.hp = Math.min(100, e.hp + 1.5);
  }
}
function quickHeal() {
  if (!BR.on || BR.me.st !== 'alive' || BR.using) return; const P = SP.P; const has = id => P.inv[id] && P.inv[id].mag > 0; const sh = P.armor || 0;
  const pick = P.hp < 75 && has('bandage') && !has('medkit') ? 'bandage' : P.hp < 100 && has('medkit') && P.hp < 60 ? 'medkit' : sh < 50 && has('minishield') ? 'minishield' : sh < 100 && has('shieldpot') ? 'shieldpot' : P.hp < 75 && has('bandage') ? 'bandage' : P.hp < 100 && has('medkit') ? 'medkit' : null;
  if (!pick) { G.hud.feed(P.hp >= 100 && sh >= 100 ? 'HEALTH AND SHIELD ARE FULL' : 'NO HEALING ITEMS', ''); return; }
  SP.brUseItem(pick);
}
BR.quickHeal = quickHeal;

/* =============================== HUD: banner, compass, nameplates =============================== */
const HUD = { poi: null, poiT: 0, compT: 0, tagT: 0 };
function hudSetup() {
  const x = $('#brx'); if (!x) return;
  if (!$('#brpoi')) { const b = document.createElement('div'); b.id = 'brpoi'; x.append(b); }
  if (!$('#brcomp')) { const c = document.createElement('canvas'); c.id = 'brcomp'; c.width = 520; c.height = 34; x.append(c); }
  if (!$('#brcards')) { const c = document.createElement('div'); c.id = 'brcards'; x.append(c); }
  if (!$('#t-heal')) { const t = document.createElement('div'); t.className = 'tb br'; t.id = 't-heal'; t.textContent = 'HEAL'; const tc = $('#touch'); if (tc) { tc.append(t); const go = e => { e.preventDefault(); e.stopPropagation(); quickHeal(); }; t.addEventListener('touchstart', go, { passive: false }); t.addEventListener('click', go); } }
  $('#brpoi').className = ''; HUD.poi = null;
}
function poiAt(x, z) { let best = null; for (const p of SP.BRPOI) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r + 20 && (!best || d < best.d)) best = { p, d }; } return best && best.p; }
function hudTick2(dt, P) {
  HUD.poiT -= dt; if (HUD.poiT <= 0) { HUD.poiT = 0.5; const p = poiAt(P.pos.x, P.pos.z); if (p && p !== HUD.poi && BR.me.st !== 'heli') { const el = $('#brpoi'); el.innerHTML = '<span>ENTERING</span><b></b>'; el.querySelector('b').textContent = p.name.toUpperCase(); el.className = 'on'; clearTimeout(HUD.poiTO); HUD.poiTO = setTimeout(() => { el.className = ''; }, 2800); BR.track('landmarks:' + p.name); } HUD.poi = p; }
  HUD.compT -= dt; if (HUD.compT <= 0) { HUD.compT = 0.07; drawCompass(P); }
  HUD.tagT -= dt; if (HUD.tagT <= 0) { HUD.tagT = 0.4; for (const e of BR.ents) { if (e.team !== BR.myTeam || e.me) continue; const show = e.u && (e.st === 'alive' || e.st === 'knocked'); if (show && !e.tagMk) { const u = e.u; e.tagMk = G.marker(() => (e.u || u).pos.clone().add(V3(0, 2.2, 0)), e.name, 'tag'); e.tagU = u; } else if (e.tagMk && (!show || e.tagU !== e.u)) { G.removeMarker(e.tagMk); e.tagMk = null; } } }
  const cc = $('#brcards'); if (cc) { const txt = RB.carry.length ? '🂠 ' + RB.carry.length + ' REBOOT CARD' + (RB.carry.length > 1 ? 'S' : '') + ' · FIND A BLUE VAN' : ''; if (cc.textContent !== txt) cc.textContent = txt; cc.hidden = !txt; }
}
function drawCompass(P) {
  const cv = $('#brcomp'); if (!cv) return; const x = cv.getContext('2d'), W = cv.width, H = cv.height; x.clearRect(0, 0, W, H);
  const head = ((-P.yaw * 180 / Math.PI) % 360 + 360) % 360; const pxDeg = W / 120;
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 6, W, H - 6); x.textAlign = 'center'; x.font = '600 13px "Barlow Condensed",sans-serif';
  const lab = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let d = Math.floor((head - 60) / 15) * 15; d <= head + 60; d += 15) { const dd = ((d % 360) + 360) % 360; const sx = W / 2 + (d - head) * pxDeg; const L = lab[dd]; x.fillStyle = L ? (dd === 0 ? '#ffcf4a' : '#fff') : 'rgba(255,255,255,0.55)'; if (L) x.fillText(L, sx, 25); else { x.fillRect(sx - 0.5, 14, 1, 7); } }
  const mark = (wx, wz, col, txt) => { const ang = Math.atan2(wx - P.pos.x, -(wz - P.pos.z)) * 180 / Math.PI; let df = ((ang - head + 540) % 360) - 180; df = clamp(df, -60, 60); const sx = W / 2 + df * pxDeg; x.fillStyle = col; x.beginPath(); x.moveTo(sx, 8); x.lineTo(sx - 5, 1); x.lineTo(sx + 5, 1); x.closePath(); x.fill(); if (txt) { x.font = '600 10px "Barlow Condensed",sans-serif'; x.fillText(txt, sx, H - 1); x.font = '600 13px "Barlow Condensed",sans-serif'; } };
  const Z = BR.zone; if (Z && Math.hypot(P.pos.x - Z.tx, P.pos.z - Z.tz) > Z.tr * 0.8) mark(Z.tx, Z.tz, '#5a96ff', 'SAFE ZONE');
  if (BR.ping) mark(BR.ping.x, BR.ping.z, '#ffcf4a', Math.round(Math.hypot(BR.ping.x - P.pos.x, BR.ping.z - P.pos.z)) + 'M');
  for (const D of SD.list) mark(D.x, D.z, '#7ad4ff', 'DROP');
  x.fillStyle = '#fff'; x.fillRect(W / 2 - 1, 6, 2, 10); x.font = '700 11px "Barlow Condensed",sans-serif'; x.fillText(Math.round(head) + '°', W / 2 + 22, 16);
}
// map overlays: pads, vans, drops, cards, hot drops
function drawMapX(x, S, w2m, full) {
  const W = BR.W; if (!W) return;
  if (full) {
    x.fillStyle = '#40c8ff'; for (const p of W.pads || []) { x.beginPath(); x.arc(w2m(p.x, S), w2m(p.z, S), S / 260, 0, 6.29); x.fill(); }
    x.fillStyle = '#3a8aff'; x.strokeStyle = '#fff'; x.lineWidth = 1; for (const v of RB.vans) { const mx = w2m(v.pos.x, S), mz = w2m(v.pos.z, S), r = S / 150; x.fillRect(mx - r, mz - r * 0.6, r * 2, r * 1.2); x.strokeRect(mx - r, mz - r * 0.6, r * 2, r * 1.2); }
    if (BR.me.st === 'heli') { x.font = '700 ' + Math.round(S / 55) + 'px "Barlow Condensed",sans-serif'; x.textAlign = 'center'; for (const p of SP.BRPOI) { const n = BR.ents.filter(e => (e.st === 'heli' || e.st === 'air') && e.dropAt && Math.hypot(e.dropAt.x - p.x, e.dropAt.z - p.z) < p.r + 40).length; if (n < 3) continue; const mx = w2m(p.x, S), mz = w2m(p.z, S) + S / 40; x.fillStyle = n >= 10 ? 'rgba(230,40,30,0.9)' : n >= 6 ? 'rgba(240,140,30,0.9)' : 'rgba(240,200,60,0.85)'; x.beginPath(); x.arc(mx, mz, S / 70, 0, 6.29); x.fill(); x.fillStyle = '#000'; x.fillText(n, mx, mz + S / 170); } }
  }
  for (const D of SD.list) { x.fillStyle = '#7ad4ff'; x.strokeStyle = '#000'; const mx = w2m(D.x, S), mz = w2m(D.z, S), r = S / 95; x.beginPath(); x.moveTo(mx, mz - r); x.lineTo(mx + r, mz); x.lineTo(mx, mz + r); x.lineTo(mx - r, mz); x.closePath(); x.fill(); x.stroke(); }
  for (const c of RB.cards) { x.fillStyle = '#3a8aff'; x.fillRect(w2m(c.pos.x, S) - 3, w2m(c.pos.z, S) - 4, 6, 8); }
}

/* =============================== REGISTER =============================== */
const CULL = { t: 0 };
BR.hooks.push({
  setup(W, P) { SD.list = []; SD.lastPh = -2; SD.nextT = 80; SD.id = 1; PAD.cd = 0; BR.boostT = 0; floorSetup(W); rebootSetup(W); hudSetup(); CULL.t = 0; },
  tick(dt, P, Z) {
    if (BR.W && BR.W.anims) for (const f of BR.W.anims) f(dt);
    CULL.t -= dt; if (CULL.t <= 0) { CULL.t = 0.3; SP.brCull(BR.W, SP.camera, 1750); }
    floorTick(dt, P); padTick(dt, P); rebootTick(dt, P, Z); sdTick(dt, P, Z); fireTick(dt, P); hudTick2(dt, P);
    if (I.hit('KeyL')) quickHeal();
  },
  drawMap: drawMapX,
  cleanup() {
    for (const f of FL.list) floorDespawn(f); FL.list = [];
    for (const c of RB.cards.slice()) dropCard(c); RB.vans.forEach(v => rmInteract(v.it)); RB.vans = []; RB.carry = [];
    for (const D of SD.list.slice()) { rmInteract(D.it); G.removeMarker(D.mk); SP.scene.remove(D.g); } SD.list = [];
    for (const e of BR.ents || []) if (e.tagMk) { G.removeMarker(e.tagMk); e.tagMk = null; }
    BR.boostT = 0; const b = $('#brpoi'); if (b) b.className = '';
  },
});
BR.FL = FL; BR.SD = SD; BR.RB = RB; BR.launch = launch; BR.sdSpawn = sdSpawn; BR.rebootMe = rebootMe;
})();
(function () {
  const $ = s => document.querySelector(s); const BR = SP.BR;
  function lobbyStats() { const el = $('#bl-stats'); if (!el) return; const L = BR.LB || {}; el.innerHTML = [['Matches', L.games || 0], ['Wins', L.wins || 0], ['Top 10s', L.top10 || 0], ['Kills', L.kills || 0], ['K/D', ((L.kills || 0) / Math.max(1, L.deaths || 0)).toFixed(2)], ['Best', L.games ? '#' + L.best : '–'], ['Most kills', L.mostKills || 0]].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join(''); }
  function wire() { const lb = $('#brlobby'); if (lb) new MutationObserver(() => { if (!lb.hidden) lobbyStats(); }).observe(lb, { attributes: true, attributeFilter: ['hidden'] }); lobbyStats(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

/* =============================== BOT BUILDING (1.2) ===============================
   Live bots now build in fights: ramp rushes toward their target (and walk up them), cover walls,
   and full box-ups when they're hurt. Host / offline only; pieces are sent to everyone like player builds. */
(function () {
  const BR = SP.BR, { V3, rand } = SP; const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const auth = () => !BR.net || BR.net.role === 'host';
  const matOf = e => BR.MATS.find(m => e.mats[m] >= 10);
  function place(e, s) { const mat = matOf(e); if (!mat || BR.pieces.has(s.key)) return false; const p = BR.placePiece(s, mat, true); if (!p) return false; e.mats[mat] -= 10; if (BR.net && BR.net.role === 'host') BR.net.event({ t: 'build', s, mat }); return true; }
  const qToward = (u, tp) => { const dx = tp.x - u.pos.x, dz = tp.z - u.pos.z; return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0); };
  const C = () => BR.CELL;
  function wallSlot(u, q, y) { const [dx, dz] = DIRS[q]; const ci = Math.floor(u.pos.x / C()), ck = Math.floor(u.pos.z / C()); const cx = (ci + 0.5) * C() + dx * C() / 2, cz = (ck + 0.5) * C() + dz * C() / 2; y = y != null ? y : Math.round(u.pos.y * 2) / 2; return { kind: 'wall', cx, cz, y, dir: q & 1, key: BR.pieceKey('wall', Math.round(cx * 2), Math.round(cz * 2), y, q & 1) }; }
  function rampSlot(ci, ck, y, q) { return { kind: 'ramp', cx: (ci + 0.5) * C(), cz: (ck + 0.5) * C(), y, dir: q, key: BR.pieceKey('ramp', ci, ck, y, q) }; }
  function floorSlot(ci, ck, y) { return { kind: 'floor', cx: (ci + 0.5) * C(), cz: (ck + 0.5) * C(), y, key: BR.pieceKey('floor', ci, ck, y) }; }
  function tpos(u) { const t = u.target; if (!t) return null; if (t === 'player') return SP.P.pos; return t.pos || null; }
  // ramp rush: a run of ramps toward the target, climbing as it goes
  function rampRush(e, tp) {
    const u = e.u; const q = qToward(u, tp); const [dx, dz] = DIRS[q]; let ci = Math.floor(u.pos.x / C()) + dx, ck = Math.floor(u.pos.z / C()) + dz; let y = Math.round(u.pos.y * 2) / 2;
    const ws = wallSlot(u, q); const own = BR.pieces.get(ws.key); if (own) BR.damagePiece(own, 1e6); // open their own wall like an edit
    const n = 1 + Math.floor(Math.random() * 3); let made = 0;
    for (let k = 0; k < n; k++) { if (!place(e, rampSlot(ci, ck, y, q))) break; made++; ci += dx; ck += dz; y += C(); }
    if (made) { u.rampRush = { x: (ci - dx + 0.5) * C() + dx * 1.6, z: (ck - dz + 0.5) * C() + dz * 1.6, t: 1.6 + made * 1.4 }; }
    return made > 0;
  }
  function boxUp(e) { const u = e.u; const y = Math.round(u.pos.y * 2) / 2; let n = 0; for (let q = 0; q < 4; q++) if (place(e, wallSlot(u, q, y))) n++; if (Math.random() < 0.6) place(e, floorSlot(Math.floor(u.pos.x / C()), Math.floor(u.pos.z / C()), y + C())); u.crouch = true; return n > 0; }
  BR.botRampRush = rampRush;
  BR.botReact = function (e, from) { if (!e.u || !auth() || !matOf(e)) return; e.buildT = BR.t; if (e.hp < 55 && Math.random() < 0.6) boxUp(e); else if (Math.random() < 0.35 && from) rampRush(e, from); else BR.botWall(e, from); };
  let thinkT = 0;
  BR.hooks.push({
    setup() { thinkT = 0; },
    tick(dt) {
      if (!auth()) return;
      // bots following a ramp rush walk up their ramps
      for (const e of BR.ents) { const u = e.u; if (!u || !u.rampRush || u.dead) continue; const r = u.rampRush; r.t -= dt; if (r.t <= 0 || u.knocked) { u.rampRush = null; continue; } u.steer(V3(r.x, u.pos.y, r.z), u.runSpeed || 5.2, dt); }
      thinkT -= dt; if (thinkT > 0) return; thinkT = 0.5;
      const late = BR.zone && BR.zone.ph >= 4;
      for (const e of BR.ents) {
        const u = e.u; if (!u || u.dead || u.puppet || e.human || e.merc || e.st !== 'alive' || u.knocked || !matOf(e)) continue;
        if (e.nextBuild == null) e.nextBuild = BR.t + rand(2, 8); if (BR.t < e.nextBuild) continue;
        const tp = tpos(u); const d = tp ? Math.hypot(tp.x - u.pos.x, tp.z - u.pos.z) : 1e9;
        let did = false;
        if (tp && d > 6 && d < 70) { const r = Math.random(); did = r < 0.45 ? rampRush(e, tp) : r < 0.7 ? boxUp(e) : place(e, wallSlot(u, qToward(u, tp))); }
        else if (late && Math.random() < 0.25) did = boxUp(e);
        e.nextBuild = BR.t + (did ? rand(4, 9) : rand(1.5, 4)); if (did) e.buildT = BR.t;
      }
    },
  });
})();

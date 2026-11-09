/* Survival Protocol 1.0 — game modes: Freeplay, Horde, Battle Royale, Firing Range */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp } = SP; const G = SP.G, A = SP.Audio;
const $ = s => document.querySelector(s);
const LB_KEY = 'survival_protocol_modes';
const LB = { br: { games: 0, wins: 0, kills: 0, best: 99, history: [] }, horde: { best: 0, bestMap: '' }, range: { best: 0 } };
try { const s = JSON.parse(localStorage.getItem(LB_KEY) || 'null'); if (s) for (const k in s) Object.assign(LB[k] = LB[k] || {}, s[k]); } catch (e) { }
const saveLB = () => { try { localStorage.setItem(LB_KEY, JSON.stringify(LB)); } catch (e) { } };
SP.ModesLB = LB;

const MAP_NAMES = { desert: 'Desert Outpost', base: 'Forgotten Base', fob: 'FOB Tessalit', town: 'Tamanrasset', pass: 'Hoggar Pass', prison: 'Kufra Prison', port: 'Port of Oran', villa: 'Cap Falcon Villa', city: 'Algiers', ruins: 'Timgad Ruins', mountain: 'Atlas Mountains', fortress: 'Qasr Ibn Awa' };
const ENV_NAMES = { dawn: 'Dawn', day: 'Midday', afternoon: 'Afternoon', golden: 'Golden hour', sunset: 'Sunset', dusk: 'Dusk', night: 'Night', nightcity: 'City night', storm: 'Sandstorm', rain: 'Rain', thunder: 'Thunderstorm', snow: 'Snow', snownight: 'Snowy night' };
const kitOf = m => SP.MAPKIT && SP.MAPKIT[m];
const ground = (x, z) => V3(x, SP.W.heightAt(x, z), z);
function areas(map) { const k = kitOf(map); const out = []; if (!k) return out; (k.stops || []).forEach(s => s.area && out.push(s.area)); if (k.defend && k.defend.spawns) k.defend.spawns.forEach(a => out.push(a)); return out; }
function startOf(map) { const k = kitOf(map); const s = k && k.start; return s ? V3(s[0], 0, s[1]) : V3(); }
function spawnFoe(c, area, o = {}) {
  const P = SP.P; let x, z;
  for (let t = 0; t < 8; t++) { x = rand(area[0], area[1]); z = rand(area[2], area[3]); if (Math.hypot(x - P.pos.x, z - P.pos.z) > 22) break; }
  const kind = o.kind || 'rifle';
  const look = kind === 'jugg' ? { helmet: true, top: 0x2a2a2a, pants: 0x222222 } : kind === 'sniper' ? { top: 0x8a7a5a } : {};
  const u = c.foe({ pos: ground(x, z), alert: 1, behavior: 'assault', acc: kind === 'sniper' ? 1.5 : 0.85, weapon: kind === 'rush' ? 'shotgun' : 'ak', hp: kind === 'jugg' ? 650 : 100, look });
  u.stopDist = kind === 'rush' ? 3 : kind === 'sniper' ? 60 : rand(10, 22); if (kind === 'rush') u.runSpeed = 5.6; if (kind === 'jugg') { u.runSpeed = 2.6; u.isJugg = true; u.rig.root.scale.setScalar(1.12); u.name = 'JUGGERNAUT'; }
  if (kind === 'sniper') { u.sight = 140; u.name = 'SNIPER'; }
  if (o.hpMul) { u.hp *= o.hpMul; u.maxHp = u.hp; }
  return u;
}

/* =============================== FREEPLAY / HORDE =============================== */
const FP = { map: 'city', env: 'golden', weather: 'auto', enemies: 'medium', waves: false, mut: {} };
const MUTATORS = [['oneshot', 'One-shot kills'], ['god', 'God mode'], ['ammo', 'Infinite ammo'], ['slowmo', 'Slow motion'], ['allguns', 'Every gun unlocked'], ['armored', 'Armoured enemies (3× health)'], ['heads', 'Headshots only'], ['lowgrav', 'Moon jump'], ['explosive', 'Explosive rounds'], ['vampire', 'Kills heal you']];
function freeplayPart(horde) {
  const map = FP.map, env = FP.env;
  return {
    name: horde ? 'Horde · ' + MAP_NAMES[map] : MAP_NAMES[map], modeTitle: horde ? 'HORDE' : 'FREEPLAY', map, env, place: MAP_NAMES[map], time: ENV_NAMES[env] + (FP.weather !== 'auto' && FP.weather !== 'none' ? ' · ' + FP.weather : ''),
    loadout: ['m4', 'at4', 'pistol'], noIntel: true,
    setup(c, W, P) {
      SP.modeHurt = null; SP.forceWeather = FP.weather === 'auto' || FP.weather === 'none' ? null : FP.weather;
      const st = startOf(map); P.pos.set(st.x, W.heightAt(st.x, st.z) + 0.1, st.z); const k = kitOf(map); if (k && k.start && k.start[2] != null) P.yaw = k.start[2];
      if (k && k.onLoad) try { k.onLoad(W); } catch (e) { }
      if (k && k.openGate) try { k.openGate(W); } catch (e) { } if (map === 'fortress' && SP.fortOpenGate) SP.fortOpenGate(W); if (map === 'prison' && SP.prisonOpenGate) SP.prisonOpenGate(W);
      if (FP.mut.allguns || horde) { (SP.GUNS || []).filter(g => SP.Progress.owned[g.id] || FP.mut.allguns).slice(0, FP.mut.allguns ? 99 : 6).forEach(g => P.inv[g.id] || P.give(g.id)); }
      applyMutators(true);
    },
    async run(c, W, P) {
      const ar = areas(map); if (!ar.length) ar.push([P.pos.x - 60, P.pos.x + 60, P.pos.z - 90, P.pos.z - 40]);
      const dens = { none: 0, light: 4, medium: 7, heavy: 12, insane: 20 }[FP.enemies] || 0;
      c.base = () => { }; let killsAt = 0;
      SP.onTick = dt => { modeTick(dt); };
      if (!horde && !FP.waves) {
        c.obj(dens ? 'Freeplay · enemies respawn' : 'Freeplay · explore', null);
        if (!dens) return; const live = [];
        for (;;) { await c.wait(1.5); for (let i = live.length - 1; i >= 0; i--) if (live[i].dead) { const u = live.splice(i, 1)[0]; setTimeout(() => u.remove && !c.dead && u.remove(), 15000); } while (live.length < dens) live.push(spawnFoe(c, SP.pick(ar), { hpMul: FP.mut.armored ? 3 : 1, kind: Math.random() < 0.08 ? 'rush' : 'rifle' })); }
      }
      // waves (Horde)
      let wave = 0; SP.hordeWave = 0;
      for (;;) {
        wave++; SP.hordeWave = wave; await c.say('SGT. HOUSER', wave === 1 ? 'Here they come. Hold this ground as long as you can.' : 'Wave ' + wave + '. Reload.', 2);
        G.hud.feed('WAVE ' + wave, 'gold'); A.click(600, 0.2);
        const n = Math.round(4 + wave * 2.2 * Math.max(0.5, dens / 7)); const list = [];
        for (let i = 0; i < n; i++) { let kind = 'rifle'; const r = Math.random(); if (wave >= 3 && r < 0.12) kind = 'rush'; else if (wave >= 4 && r < 0.2) kind = 'sniper'; list.push(spawnFoe(c, SP.pick(ar), { kind, hpMul: (FP.mut.armored ? 3 : 1) * (1 + wave * 0.04) })); }
        if (wave % 5 === 0) { list.push(spawnFoe(c, SP.pick(ar), { kind: 'jugg' })); G.hud.feed('JUGGERNAUT INBOUND', 'red'); }
        const label = () => { const left = list.filter(u => !u.dead).length; G.hud.objective('Wave ' + wave + ' · ' + left + ' enemies left'); return left === 0; };
        await c.until(label);
        SP.addXP && SP.addXP(150 + wave * 10, 'WAVE ' + wave); SP.Pass && SP.Pass.track && SP.Pass.track('hordeWaves');
        if (horde) { if (wave > (LB.horde.best || 0)) { LB.horde.best = wave; LB.horde.bestMap = MAP_NAMES[map]; saveLB(); G.hud.feed('NEW BEST WAVE · ' + wave, 'gold'); } SP.Progress.coins += 40 + wave * 10; SP.Progress.save(); }
        list.forEach(u => setTimeout(() => !c.dead && u.remove(), 6000));
        P.hp = P.maxHp; Object.values(P.inv).forEach(s => { s.res = Math.max(s.res, (s.mag || 1) * 3); }); P.updAmmo();
        if (SP.Features && SP.Features.addNade) SP.Features.addNade(1);
        G.hud.objective('Wave ' + wave + ' cleared · next wave in 10s'); G.hud.timer('NEXT WAVE'); await c.wait(10); G.hud.timer(null);
        killsAt++;
      }
    },
    onDeath() { applyMutators(false); if (horde) { $('#deadtitle').textContent = 'Overrun on wave ' + (SP.hordeWave || 1); $('#deadmsg').textContent = 'Best wave: ' + (LB.horde.best || 0) + (LB.horde.bestMap ? ' on ' + LB.horde.bestMap : '') + '. You earn coins for every wave you clear.'; } else { $('#deadtitle').textContent = 'You were killed'; $('#deadmsg').textContent = 'Freeplay. Press Retry to drop back in.'; } SP.showScreen('dead'); },
  };
}
let mutOn = false;
function applyMutators(on) {
  mutOn = on; const m = on ? FP.mut : {};
  SP.mutOneShot = !!m.oneshot; SP.mutHeads = !!m.heads; SP.mutExplosive = !!m.explosive; SP.mutVampire = !!m.vampire; SP.mutLowGrav = !!m.lowgrav;
  SP.timeScale = m.slowmo ? 0.6 : 1; if (SP.P) SP.P.god = !!m.god;
}
function modeTick(dt) {
  const P = SP.P; if (!P) return;
  if (mutOn && FP.mut.ammo && P.cur && P.inv[P.cur]) { const s = P.inv[P.cur]; const w = SP.WEAP[P.cur]; if (!w.melee) { s.res = Math.max(s.res, w.mag * 3); if (s.mag < w.mag && P.reloadT <= 0) s.mag = w.mag; } }
  if (mutOn && FP.mut.lowgrav && !P.onGround && P.vel.y < 0) P.vel.y += 14 * dt;
}
// global damage hooks for mutators (wrap Unit.damage once)
const ud = SP.Unit.prototype.damage;
SP.Unit.prototype.damage = function (d, from, head, source) {
  if (source === 'player' && !this.invuln) { if (SP.mutHeads && !head && !SP.Features?.meleeNow && !SP.Features?.nadeNow) d = 0; else if (SP.mutOneShot) d = Math.max(d, 99999); }
  const r = ud.call(this, d, from, head, source);
  if (r && source === 'player' && SP.mutVampire && SP.P) SP.P.hp = Math.min(SP.P.maxHp, SP.P.hp + 25);
  return r;
};
const owh = SP.onWallHit; SP.onWallHit = function (wh, dir, team) { owh && owh.apply(this, arguments); if (SP.mutExplosive && team === 'player' && wh && wh.point && G.time - (G._mutBoom || 0) > 0.12) { G._mutBoom = G.time; G.explosion(wh.point.clone(), 3, 70, 'player'); } };
const ohit = SP.onHit; SP.onHit = function (u, part, killed) { ohit && ohit.apply(this, arguments); const S = SP.rangeStats; if (S && SP.curCh === 0 && SP.modePart && SP.modePart.modeTitle === 'FIRING RANGE') { S.hits++; if (part === 'head') S.heads++; S.far = Math.max(S.far, Math.round(u.pos.distanceTo(SP.P.pos))); } if (SP.mutExplosive && u && !u.dead && G.time - (G._mutBoom || 0) > 0.12) { G._mutBoom = G.time; G.explosion(u.pos.clone().setY(u.pos.y + 1), 3, 70, 'player'); } };
const ohurt = SP.onPlayerHurt; SP.onPlayerHurt = function (d, f) { ohurt && ohurt.apply(this, arguments); SP.modeHurt && SP.modeHurt(d, f); };

/* =============================== FIRING RANGE =============================== */
function rangePart() {
  let gi = 0; const list = () => ['m4', 'ak', 'pistol', 'at4', 'dmr', 'shotgun', 'sup'].filter(k => SP.WEAP[k]).concat((SP.GUNS || []).map(g => g.id)).filter((k, i, a) => SP.WEAP[k] && a.indexOf(k) === i);
  return {
    name: 'FOB Tessalit', modeTitle: 'FIRING RANGE', map: 'fob', env: 'day', place: 'FOB Tessalit range', time: 'Try any gun before you buy it', loadout: ['m4'], noExtras: true, noIntel: true,
    setup(c, W, P) { SP.modeHurt = null; SP.forceWeather = null; applyMutators(false); P.pos.set(0, W.heightAt(0, 30), 30); P.yaw = 0; },
    async run(c, W, P) {
      const S = { shots: 0, hits: 0, heads: 0, far: 0 }; SP.rangeStats = S;
      const lanes = [10, 25, 50, 100, 150, 220]; const dummies = [];
      const mk = (i) => { const d = lanes[i]; const x = (i - 2.5) * 4, z = 30 - d; const u = c.foe({ pos: ground(x, z), alert: 0, behavior: 'idle', holdFire: true, hp: 100 }); u.aware = false; u.sight = 0; u.noDrop = true; u.lookAt = V3(x, 0, 40); u.lane = i; u.onDeath = () => { setTimeout(() => { if (c.dead) return; u.remove(); dummies[i] = mk(i); }, 1600); }; return u; };
      lanes.forEach((d, i) => { dummies[i] = mk(i); const x = (i - 2.5) * 4, z = 30 - d; G.marker(() => V3(x, W.heightAt(x, z) + 2.4, z), d + ' m', 'tag'); });
      const swap = (k) => { P.inv = {}; P.cur = null; P.give(k); P.equip ? P.equip(k) : 0; P.updAmmo(); G.hud.feed(SP.WEAP[k].name, 'gold'); };
      const rack = (dx, step, text) => G.addInteract({ pos: V3(dx, W.heightAt(dx, 31) + 1, 31.5), text, once: false, radius: 2.6, onUse: () => { const L = list(); gi = (gi + step + L.length) % L.length; swap(L[gi]); } });
      rack(2.2, 1, 'Next gun'); rack(-2.2, -1, 'Previous gun');
      const crate = W.box ? W.box(5.5, 1, 1, 0, W.heightAt(0, 31.5), 31.5, SP.flat(0x4a4234, 0.8), { uv: 1 }) : null;
      SP.onTick = dt => { const L = list(); G.hud.objective('Firing range · ' + (P.cur ? SP.WEAP[P.cur].name : '') + ' · ' + (gi + 1) + '/' + L.length + ' · hits ' + S.hits + ' · headshots ' + S.heads + ' · longest ' + S.far + ' m'); const s = P.cur && P.inv[P.cur]; if (s && !SP.WEAP[P.cur].melee) s.res = Math.max(s.res, SP.WEAP[P.cur].mag * 3); };
      await c.say('RANGE MASTER', 'Hot range. Targets at 10 to 220 metres. Press E at the rack to swap guns, every gun in the game is on it.', 4);
      await new Promise(() => { });
    },
    onDeath() { SP.showScreen('dead'); },
  };
}
SP.onKillExtraRange = null;

/* =============================== BATTLE ROYALE =============================== */
const BOT_NAMES = ['VIPER', 'GHOST', 'NOMAD', 'RAZOR', 'SABLE', 'TALON', 'ONYX', 'HAVOC', 'RECON', 'MAVERICK', 'JINX', 'BISHOP', 'ROOK', 'COBRA', 'DRIFTER', 'WRAITH', 'BANSHEE', 'SPECTRE', 'ATLAS', 'KESTREL', 'BLITZ', 'TUNDRA', 'FALCON', 'MIRAGE', 'ZEPHYR', 'HUSK', 'OUTLAW', 'PHANTOM'];
const BR = { drop: 'random', bots: 23 };
const RARITY = [['common', 0x9a9a9a, 0.46], ['uncommon', 0x4caf50, 0.28], ['rare', 0x2f80ed, 0.16], ['epic', 0x9b51e0, 0.08], ['legendary', 0xf2994a, 0.02]];
function lootGun(rar) {
  const G2 = SP.GUNS || []; const byCls = { common: ['pistol', 'smg', 'shotgun'], uncommon: ['smg', 'ar', 'shotgun'], rare: ['ar', 'dmr', 'lmg'], epic: ['sniper', 'lmg', 'ar'], legendary: ['launcher', 'sniper'] }[rar];
  const pool = G2.filter(g => byCls.includes(g.cls)); return (SP.pick(pool.length ? pool : G2) || {}).id || 'm4';
}
function brPart() {
  return {
    name: 'Battle Royale', modeTitle: 'BATTLE ROYALE', map: 'br', env: SP.pick(['day', 'afternoon', 'golden', 'dawn']), place: 'The Sahara Basin · 24 players', time: 'Last one standing wins', loadout: ['pistol'], noExtras: true, noIntel: true,
    setup(c, W, P) {
      SP.forceWeather = null; applyMutators(false); const pois = SP.BR_POI; const p = BR.drop === 'random' ? SP.pick(pois) : pois.find(q => q.name === BR.drop) || pois[0];
      const x = p.x + rand(-20, 20), z = p.z + rand(-20, 20); P.pos.set(x, W.heightAt(x, z) + 0.1, z); P.yaw = rand(0, 6.28);
      P.inv.pistol && (P.inv.pistol.res = 36);
    },
    async run(c, W, P) {
      const st = { kills: 0, start: G.time, placed: 0, killer: null };
      SP.brState = st; const bots = [];
      // zone
      const pois = SP.BR_POI.slice(); const fin = SP.pick(pois);
      const Z = { cx: 0, cz: 0, r: 520, tx: fin.x * 0.35, tz: fin.z * 0.35, tr: 520, stage: 0, t: 70, shrinking: false, dps: 2 };
      const STAGES = [[340, 60, 35, 2], [220, 55, 30, 4], [140, 45, 25, 6], [80, 40, 22, 9], [40, 35, 20, 13], [15, 30, 18, 18], [0, 30, 25, 25]];
      const wallMat = new T.MeshBasicMaterial({ color: 0x5aa0ff, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false });
      const wall = new T.Mesh(new T.CylinderGeometry(1, 1, 220, 96, 1, true), wallMat); wall.position.y = 40; W.scene.add(wall); wall.frustumCulled = false;
      const ring = new T.Mesh(new T.RingGeometry(0.985, 1, 96), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; W.scene.add(ring);
      const oldh = document.getElementById('brhud'); if (oldh) oldh.remove(); const hud = document.createElement('div'); hud.id = 'brhud'; document.getElementById('hud').append(hud);
      c.onEnd = () => hud.remove();
      // loot crates
      const crates = [];
      const crate = (pos, rarity, drop) => {
        const R = RARITY.find(r => r[0] === rarity) || RARITY[0]; const y = W.heightAt(pos.x, pos.z);
        const m = new T.Mesh(SP.geo.box(0.9, 0.55, 0.6), SP.flat(drop ? 0x2a4a7a : 0x4a4436, 0.7)); m.position.set(pos.x, y + 0.28, pos.z); W.scene.add(m);
        const glow = new T.Mesh(SP.geo.box(0.92, 0.06, 0.62), new T.MeshBasicMaterial({ color: new T.Color(R[1]).multiplyScalar(2.5) })); glow.position.set(pos.x, y + 0.58, pos.z); W.scene.add(glow);
        const it = G.addInteract({ pos: V3(pos.x, y + 0.5, pos.z), text: 'Open ' + rarity + ' crate', radius: 2.4, onUse: () => { W.scene.remove(m); W.scene.remove(glow); openCrate(rarity, drop); } }); crates.push(it); return it;
      };
      const openCrate = (rarity, drop) => {
        const gun = lootGun(rarity); grant(gun);
        if (Math.random() < 0.5 || drop) { P.armor = Math.min(150, (P.armor || 0) + (drop ? 100 : 50)); G.hud.feed('ARMOUR +' + (drop ? 100 : 50), 'gold'); }
        if (Math.random() < 0.45) { P.hp = Math.min(P.maxHp, P.hp + 40); G.hud.feed('MEDKIT', 'gold'); }
        if (SP.Features && SP.Features.addNade && Math.random() < 0.4) SP.Features.addNade(1);
        A.click(900, 0.15);
      };
      const grant = id => {
        const ids = Object.keys(P.inv).filter(k => k !== 'knife');
        if (P.inv[id]) { P.inv[id].res += SP.WEAP[id].mag * 2; G.hud.feed(SP.WEAP[id].name + ' AMMO', 'gold'); P.updAmmo(); return; }
        if (ids.length >= 3) { const drop = P.cur && P.cur !== 'knife' ? P.cur : ids[0]; delete P.inv[drop]; P.cur = null; }
        P.give(id, SP.WEAP[id].mag, SP.WEAP[id].mag * 3); P.equip(id); P.updAmmo();
        const rar = RARITY.find(r => r[0] === ({ pistol: 'common', smg: 'common', shotgun: 'uncommon', ar: 'uncommon', dmr: 'rare', lmg: 'rare', sniper: 'epic', launcher: 'legendary' }[SP.WEAP[id].cls] || 'common'));
        G.hud.feed(SP.WEAP[id].name + ' · ' + rar[0].toUpperCase(), 'gold');
      };
      const roll = () => { let r = Math.random(); for (const R of RARITY) { if (r < R[2]) return R[0]; r -= R[2]; } return 'common'; };
      (W.loot || []).forEach(p => crate(V3(p.x + rand(-2, 2), 0, p.z + rand(-2, 2)), roll()));
      if (P.inv.knife == null && SP.WEAP.knife) P.give('knife');
      // bots
      const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
      for (let i = 0; i < BR.bots; i++) {
        const p = SP.pick(SP.BR_POI); let x = p.x + rand(-55, 55), z = p.z + rand(-55, 55); if (Math.hypot(x - P.pos.x, z - P.pos.z) < 40) { x += 60; }
        const w = SP.pick(['ak', 'ak', 'm4', 'shotgun']); const u = c.foe({ pos: ground(x, z), alert: 1, behavior: 'assault', acc: rand(0.55, 1.0), weapon: w, hp: 100, name: names[i % names.length], look: { seed: 300 + i, top: SP.pick([0x5a5a4a, 0x3a4a3a, 0x6a5a4a, 0x2a2a3a, 0x7a6a50]), helmet: Math.random() < 0.5 } });
        u.br = true; u.aware = true; u.sight = 55; u.stopDist = 2.5; u.goal2 = ground(x + rand(-30, 30), z + rand(-30, 30)); u.noDrop = false; u.brKills = 0; bots.push(u);
      }
      SP.onUnitDeath = u => {
        if (!u.br) return; const alive = bots.filter(b => !b.dead).length + (P.alive ? 1 : 0);
        const killer = u.lastBy; G.hud.feed((killer ? killer + ' eliminated ' : '') + u.name + ' · ' + alive + ' left', killer === 'YOU' ? 'gold' : '');
        setTimeout(() => !c.dead && u.remove(), 25000);
      };
      const oDmg = SP.Unit.prototype.damage; // tag who killed whom for the feed
      const tagHit = (u, src, from) => { if (src === 'player') u.lastBy = 'YOU'; else if (from) { let best = null, bd = 4; for (const b of bots) { if (b === u || b.dead) continue; const d = b.muzzle().distanceTo(from); if (d < bd) { bd = d; best = b; } } u.lastBy = best ? best.name : (src === 'zone' ? 'THE ZONE' : null); if (best && u.hp <= 0) best.brKills++; } };
      bots.forEach(b => { const d0 = b.damage.bind(b); b.damage = (d, from, head, src) => { tagHit(b, src, from); if (src === 'player' && d > 0) { const r = d0(d, from, head, src); if (r) st.kills++; return r; } return d0(d, from, head, src); }; });
      // who shot the player (for the killcam line)
      SP.modeHurt = (dmg, from) => { if (from) { let best = null, bd = 5; for (const b of bots) { if (b.dead) continue; const d = b.muzzle().distanceTo(from); if (d < bd) { bd = d; best = b; } } if (best) { st.killer = best; } } };
      // supply drops
      let dropT = 55; const drops = [];
      const supply = () => { const a = rand(0, 6.28), r = rand(0, Z.r * 0.6); const x = Z.cx + Math.cos(a) * r, z = Z.cz + Math.sin(a) * r; const y0 = W.heightAt(x, z); const m = new T.Mesh(SP.geo.box(1.4, 1, 1.4), SP.flat(0x2a4a7a, 0.6)); m.position.set(x, y0 + 80, z); W.scene.add(m); const chute = new T.Mesh(new T.SphereGeometry(3, 12, 6, 0, 6.28, 0, 1.4), SP.flat(0xd8d2c4, 0.9)); m.add(chute); chute.position.y = 5; const mk = G.marker(() => m.position, 'SUPPLY DROP', 'obj'); drops.push({ m, mk, x, z, y0, landed: false }); G.hud.feed('SUPPLY DROP INCOMING', 'gold'); A.click(500, 0.2); };
      let botT = 0; const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
      SP.onTick = dt => {
        // zone timeline
        Z.t -= dt;
        if (Z.t <= 0) { const S = STAGES[Math.min(Z.stage, STAGES.length - 1)]; if (!Z.shrinking) { Z.shrinking = true; Z.from = { cx: Z.cx, cz: Z.cz, r: Z.r }; const a = rand(0, 6.28), off = Math.max(0, Z.r - S[0]) * rand(0.1, 0.5); Z.to = { cx: Z.cx + Math.cos(a) * off * 0.6 + (Z.tx - Z.cx) * 0.3, cz: Z.cz + Math.sin(a) * off * 0.6 + (Z.tz - Z.cz) * 0.3, r: S[0] }; Z.dur = S[2]; Z.t = S[2]; Z.dps = S[3]; G.hud.feed('THE ZONE IS CLOSING', 'red'); A.alarm && A.alarm(false); } else { Z.shrinking = false; Z.stage++; Z.t = (STAGES[Math.min(Z.stage, STAGES.length - 1)] || [0, 30])[1]; } }
        if (Z.shrinking) { const k = 1 - Math.max(0, Z.t) / Z.dur; Z.cx = Z.from.cx + (Z.to.cx - Z.from.cx) * k; Z.cz = Z.from.cz + (Z.to.cz - Z.from.cz) * k; Z.r = Math.max(0.5, Z.from.r + (Z.to.r - Z.from.r) * k); }
        wall.position.set(Z.cx, 40, Z.cz); wall.scale.set(Z.r, 1, Z.r); ring.position.set(Z.cx, SP.camera.position.y - 1.4, Z.cz); ring.scale.set(Z.r, Z.r, 1);
        const outD = Math.hypot(P.pos.x - Z.cx, P.pos.z - Z.cz) - Z.r;
        if (outD > 0 && P.alive) { G._dmgKind = 'zone'; P.hurt(Z.dps * dt / (SP.difficulty || 1), null); G._dmgKind = null; SP.post.U.damage.value = Math.max(SP.post.U.damage.value, 0.35); }
        // bots: roam into zone, take zone damage
        botT -= dt; if (botT <= 0) { botT = 1; for (const b of bots) { if (b.dead) continue; const bd = Math.hypot(b.pos.x - Z.cx, b.pos.z - Z.cz); if (bd > Z.r * 0.85 || !b.goal2 || b.goal2.distanceTo(b.pos) < 4 || Math.random() < 0.04) { const a = rand(0, 6.28), r = rand(0, Z.r * 0.7); b.goal2 = ground(Z.cx + Math.cos(a) * r, Z.cz + Math.sin(a) * r); } if (bd > Z.r) b.damage(Z.dps, null, false, 'zone'); } }
        // drops
        dropT -= dt; if (dropT <= 0 && Z.stage < 6) { dropT = rand(60, 85); supply(); }
        for (const d of drops) { if (d.landed) continue; d.m.position.y = Math.max(d.y0 + 0.5, d.m.position.y - 9 * dt); if (d.m.position.y <= d.y0 + 0.5) { d.landed = true; d.m.children[0].visible = false; G.removeMarker(d.mk); G.particle && G.particle({ pos: d.m.position.clone(), vel: V3(0, 2, 0), life: 8, size: 2, grow: 6, color: new T.Color(1.2, 0.3, 0.3), opacity: 0.5 }); crate(V3(d.x, 0, d.z), 'legendary', true); W.scene.remove(d.m); } }
        const alive = bots.filter(b => !b.dead).length;
        hud.innerHTML = `<b>${alive + (P.alive ? 1 : 0)}</b><span>ALIVE</span><b>${st.kills}</b><span>KILLS</span><b>${Math.round(P.armor || 0)}</b><span>ARMOUR</span><i>${Z.shrinking ? 'ZONE CLOSING ' : 'ZONE ' + (Z.stage + 1) + ' · CLOSES IN '}${fmt(Math.max(0, Z.t))}</i>` + (outD > 0 ? '<em>OUTSIDE THE ZONE · GET IN</em>' : '');
        if (alive === 0 && P.alive && !st.won) { st.won = true; st.placed = 1; c.complete(); }
      };
      c.obj('Survive. Be the last one standing.', null);
      await c.say('PILOT', 'Green light. Twenty-four of you on the ground. One comes home.', 3);
      await new Promise(() => { });
    },
    onDeath() { endBR(false); },
    onComplete() { endBR(true); },
  };
}
function endBR(won) {
  const st = SP.brState || { kills: 0 }; const bots = (SP.G.units || []).filter(u => u.br && !u.dead).length; const place = won ? 1 : bots + 1;
  const t = (G.time - (st.start || 0)); const coins = st.kills * 30 + Math.max(0, 25 - place) * 12 + (won ? 500 : 0);
  SP.Progress.coins += coins; SP.Progress.save();
  LB.br.games++; LB.br.kills += st.kills; if (won) LB.br.wins++; LB.br.best = Math.min(LB.br.best || 99, place); LB.br.history.unshift({ place, kills: st.kills, t: Math.round(t), d: Date.now() }); LB.br.history = LB.br.history.slice(0, 10); saveLB();
  if (SP.Features && SP.Features.stat) SP.Features.stat('brGames'); if (won && SP.Features && SP.Features.stat) SP.Features.stat('brWins');
  const killer = !won && st.killer ? st.killer : null;
  $('#br-title').textContent = won ? 'Victory · last one standing' : '#' + place + ' of 24';
  $('#br-sub').textContent = won ? 'Nobody else is left in the basin.' : killer ? 'Eliminated by ' + killer.name + ' (' + Math.round(killer.pos.distanceTo(SP.P.pos)) + ' m away, ' + (killer.brKills || 0) + ' kills)' : 'You did not make it out of the zone.';
  $('#br-stats').innerHTML = [['Placement', '#' + place], ['Kills', st.kills], ['Survived', Math.floor(t / 60) + 'm ' + Math.floor(t % 60) + 's'], ['Coins', '+' + coins], ['Wins', LB.br.wins + ' / ' + LB.br.games], ['Best', '#' + LB.br.best]].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  $('#br-hist').innerHTML = '<div class="h4">Recent matches</div>' + LB.br.history.map(h => `<div class="brh"><b>#${h.place}</b><span>${h.kills} kills</span><span>${Math.floor(h.t / 60)}m ${h.t % 60}s</span></div>`).join('');
  const hb = document.getElementById('brhud'); if (hb) hb.remove();
  SP.showScreen('brend');
}

/* =============================== MENU UI =============================== */
function opt(sel, obj, cur) { const el = $(sel); el.innerHTML = ''; Object.entries(obj).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v; if (k === cur) o.selected = true; el.append(o); }); }
function buildModes() {
  const maps = {}; Object.keys(MAP_NAMES).forEach(k => { if (SP.Maps[k] && kitOf(k)) maps[k] = MAP_NAMES[k]; });
  opt('#fp-map', maps, FP.map); opt('#fp-env', ENV_NAMES, FP.env);
  opt('#fp-wx', { auto: 'Match the time of day', none: 'Clear', rain: 'Rain', snow: 'Snow', thunder: 'Thunder and rain' }, FP.weather);
  opt('#fp-en', { none: 'None (explore)', light: 'Light', medium: 'Medium', heavy: 'Heavy', insane: 'Insane' }, FP.enemies);
  const mu = $('#fp-mut'); mu.innerHTML = ''; MUTATORS.forEach(([k, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'achip sm' + (FP.mut[k] ? ' on' : ''); b.textContent = l; b.addEventListener('click', () => { FP.mut[k] = !FP.mut[k]; b.classList.toggle('on', !!FP.mut[k]); }); mu.append(b); });
  const L2 = (SP.BR && SP.BR.LB) || { wins: 0, games: 0, best: 99, kills: 0 }; $('#mode-lb').innerHTML = `<span>BR wins <b>${L2.wins}</b></span><span>BR best <b>${L2.games ? '#' + L2.best : '—'}</b></span><span>BR kills <b>${L2.kills}</b></span><span>Horde best <b>${LB.horde.best ? 'Wave ' + LB.horde.best : '—'}</b></span>`;
}
function readFP() { FP.map = $('#fp-map').value; FP.env = $('#fp-env').value; FP.weather = $('#fp-wx').value; FP.enemies = $('#fp-en').value; }
function wire() {
  $('#btn-modes').addEventListener('click', () => { buildModes(); SP.showScreen('modes'); });
  $('#mode-back').addEventListener('click', () => SP.showScreen('title'));
  $('#m-free').addEventListener('click', () => { readFP(); SP.Audio.init(); SP.loadMode(freeplayPart(false)); });
  $('#m-horde').addEventListener('click', () => { readFP(); if (FP.enemies === 'none') FP.enemies = 'medium'; SP.Audio.init(); SP.loadMode(freeplayPart(true)); });
  $('#m-br').addEventListener('click', () => { SP.Audio.init(); SP.openBRLobby(); });
  $('#m-range').addEventListener('click', () => { SP.Audio.init(); SP.loadMode(rangePart()); });
  $('#br-again').addEventListener('click', () => SP.loadMode(brPart()));
  $('#br-menu').addEventListener('click', () => { SP.teardownPart(); buildModes(); SP.showScreen('modes'); });
  $('#p-quit').addEventListener('click', () => { applyMutators(false); SP.forceWeather = null; SP.timeScale = 1; }, true);
}
SP.Modes = { freeplayPart, brPart, rangePart, FP, BR, LB, applyMutators };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

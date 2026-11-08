/* Survival Protocol 1.0 — BATTLE ROYALE: SQUADS
   50 teams of 4 (one country each), helicopter drop, blue zone, chests, arms dealers and mercenaries,
   knock + revive, building with wood/stone/metal, 8-slot inventory, live leaderboard, full colour map,
   online squads (see brnet.js). Everything far from players is simulated cheaply; near players it is real AI. */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp, lerp } = SP; const G = SP.G, A = SP.Audio, I = SP.Input;
const $ = s => document.querySelector(s);
const F = () => SP.Features || {};

/* =============================== DATA =============================== */
const COUNTRIES = [['USA', '🇺🇸'], ['Canada', '🇨🇦'], ['Mexico', '🇲🇽'], ['Brazil', '🇧🇷'], ['Argentina', '🇦🇷'], ['Colombia', '🇨🇴'], ['Chile', '🇨🇱'], ['Peru', '🇵🇪'], ['United Kingdom', '🇬🇧'], ['France', '🇫🇷'], ['Germany', '🇩🇪'], ['Italy', '🇮🇹'], ['Spain', '🇪🇸'], ['Portugal', '🇵🇹'], ['Netherlands', '🇳🇱'], ['Belgium', '🇧🇪'], ['Switzerland', '🇨🇭'], ['Sweden', '🇸🇪'], ['Norway', '🇳🇴'], ['Denmark', '🇩🇰'], ['Finland', '🇫🇮'], ['Poland', '🇵🇱'], ['Ukraine', '🇺🇦'], ['Greece', '🇬🇷'], ['Turkey', '🇹🇷'], ['Ireland', '🇮🇪'], ['Austria', '🇦🇹'], ['Egypt', '🇪🇬'], ['Nigeria', '🇳🇬'], ['South Africa', '🇿🇦'], ['Kenya', '🇰🇪'], ['Morocco', '🇲🇦'], ['Algeria', '🇩🇿'], ['Saudi Arabia', '🇸🇦'], ['UAE', '🇦🇪'], ['Israel', '🇮🇱'], ['India', '🇮🇳'], ['Pakistan', '🇵🇰'], ['China', '🇨🇳'], ['Japan', '🇯🇵'], ['South Korea', '🇰🇷'], ['Indonesia', '🇮🇩'], ['Philippines', '🇵🇭'], ['Vietnam', '🇻🇳'], ['Thailand', '🇹🇭'], ['Australia', '🇦🇺'], ['New Zealand', '🇳🇿'], ['Jamaica', '🇯🇲'], ['Russia', '🇷🇺'], ['Iceland', '🇮🇸']];
const CALLS = ['Viper', 'Ghost', 'Nomad', 'Razor', 'Sable', 'Talon', 'Onyx', 'Havoc', 'Recon', 'Maverick', 'Jinx', 'Bishop', 'Rook', 'Cobra', 'Drifter', 'Wraith', 'Banshee', 'Spectre', 'Atlas', 'Kestrel', 'Blitz', 'Tundra', 'Falcon', 'Mirage', 'Zephyr', 'Husk', 'Outlaw', 'Phantom', 'Saber', 'Ember', 'Frost', 'Hawk', 'Jackal', 'Lynx', 'Mamba', 'Nova', 'Orca', 'Pike', 'Quill', 'Rex', 'Shade', 'Torch', 'Volt', 'Wolf', 'Yeti', 'Zulu', 'Ace', 'Bolt', 'Crow', 'Dune'];
const TEAMS = 50, PER = 4, SLOTS = 8;
const RAR = { common: { c: '#b8b8b8', w: 0.42 }, uncommon: { c: '#5cc461', w: 0.3 }, rare: { c: '#3d8ef0', w: 0.17 }, epic: { c: '#a65ef0', w: 0.08 }, legendary: { c: '#f2a03a', w: 0.03 } };
const CLASS_RAR = { pistol: 'common', smg: 'uncommon', shotgun: 'uncommon', ar: 'rare', dmr: 'rare', lmg: 'epic', sniper: 'epic', launcher: 'legendary' };
const POOL = { common: ['pistol', 'smg'], uncommon: ['smg', 'shotgun', 'ar'], rare: ['ar', 'dmr', 'shotgun'], epic: ['sniper', 'lmg', 'ar'], legendary: ['launcher', 'sniper'] };
const RANGE = { pistol: 70, smg: 90, shotgun: 28, ar: 150, lmg: 150, dmr: 260, sniper: 420, launcher: 120, melee: 2.4 };
const MAT_HP = { wood: 150, stone: 300, metal: 500 }, MATS = ['wood', 'stone', 'metal'];

/* consumables live in the 8-slot inventory like guns */
const ITEMS = {
  bandage: { name: 'BANDAGES', use: 2.2, heal: 15, cap: 75, max: 15, col: 0xe8e0d0 },
  medkit: { name: 'MEDKIT', use: 6, heal: 100, cap: 100, max: 3, col: 0xd83a2a },
  minishield: { name: 'MINI SHIELD', use: 1.5, shield: 25, cap: 50, max: 6, col: 0x4a9aff },
  shieldpot: { name: 'SHIELD POTION', use: 4, shield: 50, cap: 100, max: 3, col: 0x2a6aff },
};
Object.entries(ITEMS).forEach(([id, it]) => { SP.WEAP[id] = { name: it.name, cls: 'item', item: true, mag: 99, reload: 1, rpm: 60, dmg: 0, spreadH: 0, spreadA: 0, kick: 0, vmAs: 'knife', model: () => itemModel(it.col) }; SP.WEAP_BASE && (SP.WEAP_BASE[id] = SP.WEAP[id]); });
function itemModel(col) { const g = new T.Group(); const m = new T.Mesh(SP.geo.box(0.11, 0.07, 0.08), SP.flat(col, 0.6)); g.add(m); const c = new T.Mesh(SP.geo.box(0.04, 0.072, 0.012), SP.flat(0xffffff, 0.5)); c.position.z = 0.041; g.add(c); g.userData.muzzle = V3(0, 0, -0.1); return g; }

/* =============================== STATE =============================== */
const BR = SP.BR = { on: false, ents: [], teams: [], me: null, myTeam: 0, net: null, t: 0 };
const LB_KEY = 'survival_protocol_br2';
let LB = { games: 0, wins: 0, kills: 0, best: 99, hist: [] };
try { Object.assign(LB, JSON.parse(localStorage.getItem(LB_KEY) || '{}')); } catch (e) { }
const saveLB = () => { try { localStorage.setItem(LB_KEY, JSON.stringify(LB)); } catch (e) { } };
BR.LB = LB;

function gunsByClass(cls) { return (SP.GUNS || []).filter(g => g.cls === cls).map(g => g.id).concat(cls === 'ar' ? ['m4', 'ak'] : cls === 'pistol' ? ['pistol'] : cls === 'shotgun' ? ['shotgun'] : cls === 'dmr' ? ['dmr'] : cls === 'launcher' ? ['at4'] : []).filter(id => SP.WEAP[id]); }
function rollRarity(bonus = 0) { let r = Math.random() * (1 - bonus) + bonus; let acc = 0; for (const k of ['legendary', 'epic', 'rare', 'uncommon', 'common']) { acc += RAR[k].w; if (1 - r < acc) return k; } return 'common'; }
function rollGun(rar) { const cls = SP.pick(POOL[rar]); const l = gunsByClass(cls); return SP.pick(l.length ? l : ['m4']); }
const gunRar = id => CLASS_RAR[(SP.WEAP[id] || {}).cls] || 'common';
const clsOf = id => id ? (SP.WEAP[id] || {}).cls || 'ar' : 'melee';
const rigWeapon = id => { const c = clsOf(id); return c === 'shotgun' ? 'shotgun' : c === 'pistol' ? 'pistol' : c === 'melee' ? 'none' : c === 'smg' || c === 'ar' && Math.random() < 0.5 ? 'm4' : 'ak'; };

/* =============================== MATCH SETUP =============================== */
function newMatch(opt) {
  const seed = opt.seed || (Math.random() * 1e9 | 0);
  const myCountry = opt.country != null ? opt.country : (Math.random() * COUNTRIES.length | 0);
  const order = SP.seeded(seed + 7, () => COUNTRIES.map((c, i) => i).filter(i => i !== myCountry).sort(() => Math.random() - 0.5)); order.unshift(myCountry);
  BR.teams = order.slice(0, TEAMS).map((ci, ti) => ({ id: ti, country: COUNTRIES[ci][0], flag: COUNTRIES[ci][1], hue: (ti * 47) % 360, kills: 0, place: 0, out: false }));
  BR.ents = []; let id = 0; const calls = SP.seeded(seed + 11, () => CALLS.slice().sort(() => Math.random() - 0.5));
  for (const tm of BR.teams) for (let k = 0; k < PER; k++) {
    const human = tm.id === 0 && opt.humans && opt.humans[k];
    BR.ents.push({ id: id++, team: tm.id, name: human ? human.name : (tm.country.slice(0, 3).toUpperCase() + '·' + calls[(tm.id * 4 + k) % calls.length]), human: !!human, me: human ? !!human.me : false, peer: human ? human.peer : null,
      st: 'heli', x: 0, y: 300, z: 0, yaw: 0, hp: 100, sh: 0, knock: 0, guns: [], mats: { wood: 100, stone: 100, metal: 100 }, meds: { bandage: 0, medkit: 0, minishield: 0, shieldpot: 0 }, gold: 0, kills: 0, u: null, acc: rand(0.55, 1.05), skill: rand(0.6, 1.25), lootT: rand(8, 20) });
  }
  if (!opt.humans) BR.ents[0].me = true, BR.ents[0].human = true, BR.ents[0].name = 'YOU';
  BR.me = BR.ents.find(e => e.me); BR.myTeam = 0; BR.seed = seed; BR.t = 0; BR.over = false; BR.place = 0; BR.myKills = 0; BR.piles = []; BR.pieces = new Map(); BR.chests = [];
  return seed;
}
BR.COUNTRIES = COUNTRIES;

/* helicopters: 10 flight lines across the island, 5 teams in each */
function makeHelis(seedRand) {
  const H = []; for (let i = 0; i < 10; i++) {
    const a = seedRand() * Math.PI * 2, off = (seedRand() - 0.5) * 700; const dx = Math.cos(a), dz = Math.sin(a); const nx = -dz, nz = dx;
    const ax = nx * off - dx * 1350, az = nz * off - dz * 1350, bx = nx * off + dx * 1350, bz = nz * off + dz * 1350;
    H.push({ i, ax, az, bx, bz, alt: 230 + seedRand() * 40, speed: 70, t0: 4 + i * 1.5, mesh: null });
  }
  return H;
}
function heliPos(h, t) { const L = Math.hypot(h.bx - h.ax, h.bz - h.az); const k = clamp((t - h.t0) * h.speed / L, 0, 1); return { x: lerp(h.ax, h.bx, k), z: lerp(h.az, h.bz, k), y: h.alt, k, yaw: Math.atan2(-(h.bx - h.ax), -(h.bz - h.az)) }; }

/* =============================== ZONE =============================== */
const ZPH = [[820, 70, 55, 1], [520, 70, 45, 2], [320, 60, 40, 3], [180, 50, 35, 5], [95, 45, 30, 7], [45, 35, 25, 9], [15, 30, 22, 12], [0, 20, 30, 15]];
function zoneInit() { const Z = { cx: rand(-60, 60), cz: rand(-60, 60), r: 1450, ph: -1, t: 75, shrink: false, dps: 0.5 }; zoneNext(Z); return Z; }
function zoneNext(Z) { const p = ZPH[Math.min(Z.ph + 1, ZPH.length - 1)]; const room = Math.max(0, Z.r - p[0]); const a = rand(0, 6.28), d = rand(0, room * 0.75); let tx = Z.cx + Math.cos(a) * d, tz = Z.cz + Math.sin(a) * d; const rr = Math.hypot(tx, tz); if (rr > 850) { tx *= 850 / rr; tz *= 850 / rr; } Z.tx = tx; Z.tz = tz; Z.tr = p[0]; }
function zoneTick(Z, dt) {
  Z.t -= dt;
  if (Z.t <= 0) {
    if (!Z.shrink) { const p = ZPH[Math.min(Z.ph + 1, ZPH.length - 1)]; Z.shrink = true; Z.from = { cx: Z.cx, cz: Z.cz, r: Z.r }; Z.dur = p[2]; Z.t = p[2]; Z.ph++; Z.dps = p[3]; if (BR.on) { G.hud.feed('THE BLUE ZONE IS CLOSING IN', 'red'); A.click(260, 0.25); } }
    else { Z.shrink = false; Z.cx = Z.tx; Z.cz = Z.tz; Z.r = Z.tr; if (Z.ph >= ZPH.length - 1) { Z.t = 1e9; } else { zoneNext(Z); Z.t = ZPH[Math.min(Z.ph + 1, ZPH.length - 1)][1]; } }
  }
  if (Z.shrink) { const k = 1 - Math.max(0, Z.t) / Z.dur; Z.cx = lerp(Z.from.cx, Z.tx, k); Z.cz = lerp(Z.from.cz, Z.tz, k); Z.r = Math.max(0.1, lerp(Z.from.r, Z.tr, k)); }
}
const outside = (Z, x, z) => Math.hypot(x - Z.cx, z - Z.cz) > Z.r;

/* =============================== UNITS (live AI near players) =============================== */
const LIVE_R = 240, DROP_R = 320;
function spawnUnit(e) {
  const P = SP.P; const ally = e.team === BR.myTeam;
  const gid = e.guns[e.cur || 0] && e.guns[e.cur || 0].id;
  const u = new SP.Unit({ team: ally ? 'ally' : 'foe', name: e.name, pos: V3(e.x, SP.W.groundAt(e.x, e.z, e.y + 1), e.z), weapon: rigWeapon(gid), behavior: 'assault', alert: 1, acc: e.acc, hp: 100, sight: 85,
    look: { seed: 400 + e.id, top: new T.Color().setHSL(BR.teams[e.team].hue / 360, 0.35, 0.32).getHex(), pants: 0x2a2a28, helmet: e.id % 3 === 0, head: e.id % 3 === 1 ? 'cap' : undefined } });
  u.br = true; u.brTeam = e.team; u.brEnt = e; u.aware = true; u.stopDist = clsOf(gid) === 'melee' ? 1.4 : clsOf(gid) === 'shotgun' ? 6 : rand(10, 24); u.runSpeed = 5.2; u.gid = gid; u.invuln = false;
  if (e.puppet) { u.puppet = true; u.netPos = V3(e.x, e.y, e.z); }
  if (ally && !e.puppet && !e.human) { u.behavior = 'follow'; u.follow = 'player'; u.offset = V3([-2.5, 2.5, 0][e.id % 3], 0, 3 + (e.id % 3)); }
  e.u = u; return u;
}
function despawnUnit(e) { if (!e.u) return; e.x = e.u.pos.x; e.y = e.u.pos.y; e.z = e.u.pos.z; e.yaw = e.u.yaw; if (e.u.markEl) e.u.markEl.remove(); e.u.remove(); e.u = null; }
function setRigGun(u, gid) {
  const S = u.rig; const kind = rigWeapon(gid); if (u.gid === gid) return; u.gid = gid; u.weapon = kind === 'none' ? 'm4' : kind;
  if (S.gun) { S.gun.parent && S.gun.parent.remove(S.gun); S.gun = null; }
  if (kind !== 'none') { const Mo = SP.Models; S.gun = kind === 'ak' ? Mo.ak() : kind === 'shotgun' ? Mo.shotgun() : kind === 'pistol' ? Mo.pistol() : Mo.m4(true); S.chest.add(S.gun); }
  u.stopDist = clsOf(gid) === 'melee' ? 1.4 : clsOf(gid) === 'shotgun' ? 6 : rand(10, 24);
}
// targets: other teams only (no friendly fire), the player, never vendors
const pick0 = SP.Unit.prototype.pickTarget;
SP.Unit.prototype.pickTarget = function () {
  if (!this.br || !BR.on) return pick0.call(this);
  const P = SP.P; let best = null, bd = 1e9; const eye = this.eye;
  const consider = (pos, obj, isP, knocked) => { let d = pos.distanceTo(this.pos); if (d > this.sight) return; if (knocked) { if (d > 30) return; d += 25; } if (d >= bd) return; const tp = isP ? P.eyePos() : V3(pos.x, pos.y + (knocked ? 0.5 : 1.3), pos.z); if (!SP.W.los(eye, tp)) return; best = obj; bd = d; };
  if (P && P.alive && BR.me && BR.me.st === 'alive' && this.brTeam !== BR.me.team && !BR.spectating) consider(P.pos, 'player', true, P.brKnocked);
  for (const u of G.units) if (u !== this && !u.dead && u.br && u.brTeam !== this.brTeam) consider(u.pos, u, false, u.knocked);
  return best;
};
// shooting with the bot's real gun (damage, range, fire rate), and blocked shots chew through builds
const shootBase = SP.Unit.prototype.shootAt;
SP.Unit.prototype.shootAt = function (tg) {
  if (!this.br || !BR.on) return shootBase.call(this, tg);
  if (this.knocked || this.puppet) return;
  const P = SP.P; const isP = tg === 'player'; const from = this.muzzle(); const tp = this.targetPos(tg); const dist = from.distanceTo(tp);
  const gid = this.gid, cls = clsOf(gid), Wp = gid ? SP.WEAP[gid] : null; this.lastShotT = G.time;
  if (cls === 'melee') { if (dist < 2.6) { A.impact && A.impact(tp, 'flesh'); hitTarget(this, tg, 32, false, from); } return; }
  const rng = RANGE[cls] || 120; let chance = clamp(0.62 - dist / rng * 0.5, 0.04, 0.6) * this.acc * (SP.brAcc || 1);
  if (isP) { if (P.crouch) chance *= 0.8; if (P.speed > 5) chance *= 0.65; if (P.brKnocked) chance *= 1.3; }
  const wh = SP.W.ray(from, tp.clone().sub(from).normalize(), dist);
  const end = tp.clone(); const hit = !wh && Math.random() < chance; if (!hit) end.add(V3(rand(-1.4, 1.4), rand(-0.6, 1.2), rand(-1.4, 1.4)));
  const dir = end.clone().sub(from).normalize();
  const near = SP.P.pos.distanceTo(from) < 260; if (near) { A.gun(cls === 'shotgun' ? 'shotgun' : cls === 'sniper' ? 'm4' : this.weapon === 'm4' ? 'm4' : 'ak', from, 0.8); G.muzzle(from, dir, 0.8, Math.random() < 0.3); }
  BR.net && BR.net.fx && BR.net.fx(from, wh ? wh.point : end, cls);
  if (wh) { if (near) { G.impact(wh.point, wh.surf); G.tracer(from, wh.point, [9, 3.2, 1.2]); } if (wh.collider && wh.collider.piece) damagePiece(wh.collider.piece, (Wp ? Wp.dmg : 25) * (Wp && Wp.pellets ? 3 : 1)); this.firedAt = G.time; return; }
  if (near) G.tracer(from, end, this.team === 'foe' ? [9, 3.2, 1.2] : [8, 5.5, 2.2]);
  if (hit) { let dmg = Wp ? Wp.dmg * (Wp.pellets ? Math.min(Wp.pellets, 4 + Math.round(6 - dist / 5)) * 0.8 : 1) : 25; if (cls === 'sniper') dmg = Math.max(dmg, 75); dmg = clamp(dmg * 0.62, 6, 95); if (Wp && Wp.rocket) { G.explosion(tp.clone(), 5, 140, 'bot'); return; } hitTarget(this, tg, dmg, Math.random() < 0.12, from); }
  else if (isP && dist < 70 && Math.random() < 0.45) A.whiz();
  this.firedAt = G.time;
};
function hitTarget(shooter, tg, dmg, head, from) {
  if (tg === 'player') { SP.brShooter = shooter; try { SP.P.hurt(dmg * (head ? 1.5 : 1), from); } finally { SP.brShooter = null; } return; }
  if (tg.puppet && tg.brEnt && tg.brEnt.human && !tg.brEnt.me) { BR.net && BR.net.hurtPeer && BR.net.hurtPeer(tg.brEnt, dmg * (head ? 1.5 : 1), from, shooter.brEnt); return; }
  if (tg.brEnt) entDamage(tg.brEnt, dmg * (head ? 1.5 : 1), shooter.brEnt, head);
}
// damage to bots goes through the entity (shield, knock, death, loot, kill credit)
const dmg0 = SP.Unit.prototype.damage;
SP.Unit.prototype.damage = function (d, from, head, source) {
  if (!this.br || !BR.on) return dmg0.call(this, d, from, head, source);
  if (this.dead) return false; const e = this.brEnt; if (!e) return false;
  if (source === 'player' || source === 'bot') { if (source === 'player' && this.brTeam === BR.myTeam) return false; }
  if (this.puppet && e.human && !e.me && BR.net && BR.net.role === 'host') { if (source !== 'player') BR.net.hurtPeer(e, d, from, null); return false; }
  if (this.puppet && BR.net && BR.net.role === 'client') { if (source === 'player') { BR.net.send({ t: 'hit', id: e.id, d, head: !!head }); this.rig.flinch = 1; return e.st === 'alive' && e.hp + e.sh - d <= 0; } return false; }
  this.rig.flinch = 1; this.lastHurt = G.time;
  return entDamage(e, d, source === 'player' ? BR.me : null, head, from);
};
function entDamage(e, d, by, head, from) {
  if (e.st === 'dead' || e.st === 'heli' || e.st === 'air') return false;
  if (by && by.team === e.team) return false; // no friendly fire
  if (e.st === 'knocked') { e.knock -= d; if (e.knock <= 0) { killEnt(e, by, head); return true; } return false; }
  const s = Math.min(e.sh, d); e.sh -= s; d -= s; e.hp -= d; e.hurtT = BR.t;
  if (e.u && by && by.u !== undefined) e.u.aware = true;
  if (e.u && !e.puppet && Math.random() < 0.3 && BR.t - (e.buildT || -99) > 7 && from) botWall(e, from);
  if (e.hp <= 0) { e.hp = 0; if (teamStanding(e.team, e) > 0) { knockEnt(e, by); return true; } killEnt(e, by, head); return true; }
  return false;
}
function teamStanding(team, except) { let n = 0; for (const x of BR.ents) if (x.team === team && x !== except && x.st === 'alive') n++; return n; }
function knockEnt(e, by) {
  e.st = 'knocked'; e.knock = 100; e.knockBy = by; if (e.u) { e.u.knocked = true; e.u.hp = 999; e.u.holdFire = true; }
  feed(nameOf(by) + ' knocked ' + e.name, by && by.team === BR.myTeam ? 'gold' : e.team === BR.myTeam ? 'red' : '');
  if (by && by.me) { G.hud.feed('KNOCKED ' + e.name, 'gold'); }
  BR.net && BR.net.event && BR.net.event({ t: 'knock', id: e.id });
}
function killEnt(e, by, head) {
  if (e.st === 'dead') return; const wasKnock = e.st === 'knocked'; e.st = 'dead'; e.hp = 0; e.knock = 0; e.deadT = BR.t;
  const killer = by || e.knockBy; if (killer && killer.team !== e.team) { killer.kills++; BR.teams[killer.team].kills++; }
  if (killer && killer.me) BR.myKills++;
  feed((killer ? nameOf(killer) + (head ? ' ⌖ ' : ' ✕ ') : '') + e.name + (wasKnock ? ' (finished)' : ''), killer && killer.team === BR.myTeam ? 'gold' : e.team === BR.myTeam ? 'red' : '');
  // drop a loot pile (guns, mats, essentials)
  const items = []; e.guns.forEach(g => items.push({ k: 'gun', id: g.id, mag: g.mag, res: g.res })); MATS.forEach(m => { if (e.mats[m] > 0) items.push({ k: 'mat', id: m, n: e.mats[m] }); }); Object.keys(e.meds).forEach(m => { if (e.meds[m] > 0) items.push({ k: 'item', id: m, n: e.meds[m] }); }); if (e.gold > 0) items.push({ k: 'gold', n: e.gold }); items.push({ k: 'ammo', n: 1 });
  const pos = e.u ? e.u.pos.clone() : V3(e.x, SP.W.groundAt(e.x, e.z, e.y + 1), e.z);
  if (!e.me) makePile(pos, items, e.name, e.id);
  e.guns = []; e.mats = { wood: 0, stone: 0, metal: 0 }; e.meds = { bandage: 0, medkit: 0, minishield: 0, shieldpot: 0 }; e.gold = 0;
  if (e.u && !e.me) { const u = e.u; u.knocked = false; dmg0.call(u, 1e6, null, !!head, killer && killer.me ? 'player' : 'bot'); setTimeout(() => { if (e.u === u) { u.remove(); e.u = null; } }, 30000); }
  BR.net && BR.net.event && BR.net.event({ t: 'dead', id: e.id, by: killer ? killer.id : -1, head: !!head });
  checkTeam(e.team);
}
function checkTeam(team) {
  const tm = BR.teams[team]; if (tm.out) return;
  if (BR.ents.some(x => x.team === team && x.st === 'alive' || x.team === team && (x.st === 'heli' || x.st === 'air'))) return;
  // nobody standing: everyone knocked bleeds out now
  BR.ents.forEach(x => { if (x.team === team && x.st === 'knocked') { x.st = 'alive'; killEnt(x, x.knockBy, false); } });
  tm.out = true; const left = BR.teams.filter(t => !t.out).length; tm.place = left + 1;
  feed('TEAM ' + tm.country.toUpperCase() + ' ' + tm.flag + ' ELIMINATED · ' + left + ' TEAMS LEFT', team === BR.myTeam ? 'red' : '');
  BR.net && BR.net.event && BR.net.event({ t: 'teamout', team, place: tm.place });
  if (team === BR.myTeam) endMatch(false);
  else if (left === 1 && !BR.teams[BR.myTeam].out) { BR.teams[BR.myTeam].place = 1; endMatch(true); }
}
const nameOf = e => e ? (e.me ? 'YOU' : e.name) : 'THE ZONE';
function feed(text, col) { if (!BR.on) return; G.hud.feed(text, col); BR.net && BR.net.event && BR.net.role === 'host' && BR.net.event({ t: 'feed', text, col }); }

// knocked / puppet bots: crawl, bleed, get revived
const upd0 = SP.Unit.prototype.update;
SP.Unit.prototype.update = function (dt) {
  if (!this.br || !BR.on) return upd0.call(this, dt);
  const e = this.brEnt;
  if (this.puppet && !this.dead) { // network-driven
    const np = this.netPos; if (np) { const d = np.distanceTo(this.pos); if (d > 25) this.pos.copy(np); else this.pos.lerp(np, Math.min(1, dt * 10)); this.speed = lerp(this.speed, Math.min(7, d * 8), 0.2); }
    this.yaw += SP.angDiff ? SP.angDiff(this.yaw, this.netYaw || this.yaw) * Math.min(1, dt * 10) : 0;
    SP.animSoldier(this.rig, dt, { speed: this.knocked ? 0 : this.speed, crouch: this.crouch || this.knocked, aim: 0.8 }); this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw; this.rig.root.rotation.x = this.knocked ? -1.2 : 0; if (this.knocked) this.rig.root.position.y += 0.35; return;
  }
  if (e && e.st === 'knocked' && !this.dead) {
    this.knocked = true; const W = SP.W; this.pos.y = lerp(this.pos.y, W.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 0.15), 0.3);
    // crawl toward the closest teammate
    let mate = null, md = 1e9; for (const x of BR.ents) if (x.team === e.team && x.st === 'alive' && x !== e) { const px = x.me ? SP.P.pos : x.u ? x.u.pos : V3(x.x, x.y, x.z); const d = px.distanceTo(this.pos); if (d < md) { md = d; mate = px; } }
    if (mate && md > 2.5) { this.steer(mate, 1.1, dt); }
    SP.animSoldier(this.rig, dt, { speed: this.speed * 0.5, crouch: true, aim: 0 }); this.rig.root.position.copy(this.pos); this.rig.root.position.y += 0.35; this.rig.root.rotation.y = this.yaw; this.rig.root.rotation.x = -1.25; return;
  }
  if (this.knocked && e && e.st === 'alive') { this.knocked = false; this.holdFire = false; this.rig.root.rotation.x = 0; }
  // zone urgency: head inside the circle
  const Z = BR.zone; if (Z && e && !this.follow) { const d = Math.hypot(this.pos.x - Z.tx, this.pos.z - Z.tz); if ((d > Z.tr * 0.9 && (Z.shrink || Z.t < 40)) || outside(Z, this.pos.x, this.pos.z)) { if (!this.goal2 || Math.hypot(this.goal2.x - Z.tx, this.goal2.z - Z.tz) > Z.tr) { const a = rand(0, 6.28), r = rand(0, Z.tr * 0.7); this.goal2 = V3(Z.tx + Math.cos(a) * r, 0, Z.tz + Math.sin(a) * r); this.stopDist = 4; } } }
  if (this.follow === 'player' && (!SP.P.alive || BR.me.st !== 'alive' && BR.me.st !== 'knocked')) { this.follow = null; this.behavior = 'assault'; }
  return upd0.call(this, dt);
};

/* =============================== ABSTRACT SIM (bots far from players) =============================== */
function landAt(e, x, z) { e.st = 'alive'; e.x = x; e.z = z; e.y = SP.W.groundAt(x, z); e.guns = []; e.lootT = rand(3, 10); e.goal = { x: x + rand(-50, 50), z: z + rand(-50, 50) }; }
function simTick(dt) {
  const Z = BR.zone; const humans = BR.ents.filter(e => e.human && (e.st === 'alive' || e.st === 'knocked'));
  const hpos = humans.map(h => h.me ? SP.P.pos : V3(h.x, h.y, h.z));
  // bucket for fights
  const grid = new Map(); const key = (x, z) => (Math.floor(x / 90) + 50) * 1000 + Math.floor(z / 90) + 50;
  for (const e of BR.ents) {
    if (e.human || e.puppet) continue;
    if (e.st === 'air') { e.dropT -= dt; if (e.dropT <= 0) landAt(e, e.dropAt.x, e.dropAt.z); continue; }
    if (e.st !== 'alive' && e.st !== 'knocked') continue;
    const near = hpos.some(p => Math.hypot(p.x - (e.u ? e.u.pos.x : e.x), p.z - (e.u ? e.u.pos.z : e.z)) < (e.u ? DROP_R : LIVE_R));
    const spectate = BR.spectating && BR.specEnt === e;
    if ((near || spectate || (e.team === BR.myTeam && BR.me.st !== 'dead')) && !e.u && (BR.net ? BR.net.role !== 'client' : true)) spawnUnit(e);
    if (!near && !spectate && e.u && e.team !== BR.myTeam) despawnUnit(e);
    if (e.u) { e.x = e.u.pos.x; e.y = e.u.pos.y; e.z = e.u.pos.z; e.yaw = e.u.yaw; }
    // looting over time (bots find better gear)
    e.lootT -= dt; if (e.lootT <= 0 && e.st === 'alive') { e.lootT = rand(14, 34) / e.skill; const g = rollGun(rollRarity(Math.min(0.5, BR.t / 1200))); if (e.guns.length < 2) e.guns.push({ id: g, mag: 30, res: 90 }); else if (Math.random() < 0.6) e.guns[Math.random() < 0.5 ? 0 : 1] = { id: g, mag: 30, res: 90 }; if (Math.random() < 0.6) e.sh = Math.min(100, e.sh + 50); if (Math.random() < 0.4) e.meds.medkit++; e.gold += SP.randi(10, 60); e.cur = bestGun(e); if (e.u) setRigGun(e.u, e.guns[e.cur] && e.guns[e.cur].id); }
    if (e.st === 'knocked') { e.knock -= dt * 3.5; if (e.knock <= 0) { killEnt(e, e.knockBy, false); continue; } }
    if (!e.u && e.st === 'alive') {
      // move: wander loot area, then toward the zone
      const dz = Math.hypot(e.x - Z.tx, e.z - Z.tz);
      if (!e.goal || Math.hypot(e.goal.x - e.x, e.goal.z - e.z) < 6 || (dz > Z.tr * 0.85 && (Z.shrink || Z.t < 45) && Math.hypot(e.goal.x - Z.tx, e.goal.z - Z.tz) > Z.tr * 0.8)) { const inZ = dz < Z.tr * 0.8; const a = rand(0, 6.28), r = rand(0, Z.tr * 0.6); e.goal = inZ && Math.random() < 0.6 ? { x: e.x + rand(-80, 80), z: e.z + rand(-80, 80) } : { x: Z.tx + Math.cos(a) * r, z: Z.tz + Math.sin(a) * r }; }
      const gx = e.goal.x - e.x, gz = e.goal.z - e.z, gl = Math.hypot(gx, gz) || 1; const sp = 4.6 * dt; e.x += gx / gl * Math.min(sp, gl); e.z += gz / gl * Math.min(sp, gl); e.y = SP.W.heightAt(e.x, e.z);
      // heal between fights
      if (BR.t - (e.hurtT || -99) > 12) { if (e.hp < 100 && e.meds.medkit > 0) { e.meds.medkit--; e.hp = 100; } else e.hp = Math.min(100, e.hp + dt * 2); }
    }
    // revive a knocked teammate nearby
    if (e.st === 'alive') { const k = BR.ents.find(x => x.team === e.team && x.st === 'knocked' && !x.human && Math.hypot((x.u ? x.u.pos.x : x.x) - e.x, (x.u ? x.u.pos.z : x.z) - e.z) < 40); if (k) { if (e.u) { e.u.goal2 = k.u ? k.u.pos.clone() : V3(k.x, k.y, k.z); e.u.stopDist = 1.2; } else { e.x = lerp(e.x, k.x, 0.5); e.z = lerp(e.z, k.z, 0.5); } const kp = k.u ? k.u.pos : V3(k.x, k.y, k.z); if (Math.hypot(kp.x - e.x, kp.z - e.z) < 2.6 && BR.t - (e.hurtT || -99) > 4) { k.revT = (k.revT || 0) + dt; if (k.revT > 6) revive(k, e); } } }
    // zone damage
    if (outside(Z, e.x, e.z)) { e.hurtT = BR.t; if (e.st === 'alive') { e.hp -= Z.dps * dt; if (e.hp <= 0) { e.hp = 0; if (teamStanding(e.team, e) > 0) knockEnt(e, null); else killEnt(e, null, false); } } else { e.knock -= Z.dps * dt * 2; if (e.knock <= 0) killEnt(e, null, false); } }
    if (e.st === 'alive' && !e.u) { const k = key(e.x, e.z); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); }
  }
  // abstract fights between teams in the same area (only far from players)
  for (const a of grid.values()) {
    if (a.length < 2) continue; for (const e of a) {
      if (e.st !== 'alive') continue; const foes = a.filter(x => x.team !== e.team && x.st === 'alive' && Math.hypot(x.x - e.x, x.z - e.z) < 75); if (!foes.length) continue;
      const tg = SP.pick(foes); const g = e.guns[e.cur || 0]; const cls = clsOf(g && g.id); const W = g ? SP.WEAP[g.id] : null; const dist = Math.hypot(tg.x - e.x, tg.z - e.z);
      const dps = cls === 'melee' ? (dist < 3 ? 25 : 0) : (W ? W.dmg * Math.min(10, (W.rpm || 400) / 60) * 0.35 : 14) * clamp(1.2 - dist / (RANGE[cls] || 120), 0.15, 1) * e.skill;
      entDamage(tg, dps * dt * rand(0.3, 1.1), e, Math.random() < 0.1);
      if (cls === 'melee' && dist > 3) { e.x = lerp(e.x, tg.x, 0.2); e.z = lerp(e.z, tg.z, 0.2); }
    }
  }
}
function bestGun(e) { let bi = 0, bs = -1; e.guns.forEach((g, i) => { const s = ({ common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 })[gunRar(g.id)] + (clsOf(g.id) === 'launcher' ? -1 : 0); if (s > bs) { bs = s; bi = i; } }); return bi; }
function revive(k, by) { k.st = 'alive'; k.hp = 30; k.knock = 0; k.revT = 0; if (k.u) { k.u.knocked = false; k.u.holdFire = false; k.u.rig.root.rotation.x = 0; } feed((by ? nameOf(by) : 'A teammate') + ' revived ' + (k.me ? 'YOU' : k.name), k.team === BR.myTeam ? 'gold' : ''); if (k.me) playerRevived(); if (k.human && !k.me && BR.net) BR.net.revivedPeer && BR.net.revivedPeer(k); BR.net && BR.net.event && BR.net.event({ t: 'revive', id: k.id }); }
BR.revive = revive; BR.entDamage = entDamage; BR.killEnt = killEnt; BR.knockEnt = knockEnt; BR.checkTeam = checkTeam;

/* =============================== PLAYER: knock, revive, heal, inventory =============================== */
SP.brKnock = function (P) {
  if (!BR.on || !BR.me) return false;
  if (P.brKnocked) return false;
  if (teamStanding(BR.myTeam, BR.me) === 0) return false;
  P.brKnocked = true; P.hp = 100; P.speedMul = 0.3; P.canSprint = false; P.forceCrouch = true; BR.me.st = 'knocked'; BR.me.knock = 100;
  G.hud.feed('YOU ARE KNOCKED · CRAWL TO COVER · A TEAMMATE CAN REVIVE YOU', 'red'); $('#brknock').hidden = false; A.hurt();
  feed('YOU were knocked', 'red'); BR.net && BR.net.event && BR.net.event({ t: 'knock', id: BR.me.id });
  return true;
};
function playerRevived() { const P = SP.P; P.brKnocked = false; P.hp = 30; P.speedMul = 1; P.canSprint = true; P.forceCrouch = false; BR.me.st = 'alive'; $('#brknock').hidden = true; G.hud.feed('REVIVED · GET BACK IN THE FIGHT', 'gold'); }
BR.playerRevived = playerRevived;
SP.brBlockFire = () => BR.on && (SP.P.brKnocked || BR.swim || BR.build.on || BR.me.st === 'heli' || BR.me.st === 'air' || BR.using);
// no friendly fire on the player either
const hurtOuter = SP.Player.prototype.hurt;
SP.Player.prototype.hurt = function (dmg, from) {
  if (BR.on && SP.brShooter && SP.brShooter.brTeam === BR.myTeam) return;
  if (BR.on && (BR.me.st === 'heli' || BR.me.st === 'air')) return;
  if (BR.on) BR.me.hurtT = BR.t; if (BR.on && BR.using) cancelUse();
  return hurtOuter.call(this, dmg, from);
};

const INV = BR.inv = { slots: Array(SLOTS).fill(null) };
SP.brOrder = null;
function invReset() { INV.slots = Array(SLOTS).fill(null); INV.slots[0] = 'knife'; const P = SP.P; P.inv = {}; P.cur = null; P.give('knife'); P.equip('knife'); P.updAmmo(); }
function invAdd(id, a = {}) {
  const P = SP.P; const W = SP.WEAP[id]; if (!W) return false;
  if (W.item) { if (P.inv[id]) { P.inv[id].mag = Math.min(ITEMS[id].max, P.inv[id].mag + (a.n || 1)); P.updAmmo(); return true; } const i = INV.slots.indexOf(null); if (i < 0) return false; INV.slots[i] = id; P.give(id); P.inv[id].mag = Math.min(ITEMS[id].max, a.n || 1); P.inv[id].res = 0; P.updAmmo(); return true; }
  if (P.inv[id]) { P.inv[id].res += a.res != null ? a.res + (a.mag || 0) : W.mag * 2; P.updAmmo(); return true; }
  const i = INV.slots.indexOf(null); if (i < 0) return false; INV.slots[i] = id; P.give(id); P.inv[id].mag = a.mag != null ? Math.min(a.mag, W.mag) : W.mag; P.inv[id].res = a.res != null ? a.res : W.mag * 3;
  if (!P.cur || P.cur === 'knife' || SP.WEAP[P.cur].item) P.equip(id); P.updAmmo(); return true;
}
function invRemove(id) { const P = SP.P; const i = INV.slots.indexOf(id); if (i > 0) INV.slots[i] = null; delete P.inv[id]; if (P.cur === id) { P.cur = null; P.equip('knife'); } P.updAmmo(); }
function addAmmo(mult = 2) { const P = SP.P; for (const id in P.inv) { const W = SP.WEAP[id]; if (W.melee || W.item) continue; P.inv[id].res += Math.round(W.mag * mult); } P.updAmmo(); }
BR.invAdd = invAdd;
// using medkits and shields (hold still; taking damage cancels)
SP.brUseItem = function (id, w, s) {
  const P = SP.P; const it = ITEMS[id]; if (!it || BR.using) return;
  if (it.heal && P.hp >= it.cap) { G.hud.feed(it.cap < 100 ? 'BANDAGES ONLY HEAL TO 75' : 'HEALTH IS FULL', ''); return; }
  if (it.shield && (P.armor || 0) >= it.cap) { G.hud.feed('SHIELD IS FULL', ''); return; }
  BR.using = { id, t: it.use, total: it.use }; P.updAmmo(); A.click(700, 0.06);
};
function cancelUse() { BR.using = null; $('#bruse').hidden = true; SP.P && SP.P.updAmmo(); }
function useTick(dt) {
  const u = BR.using; if (!u) return; const P = SP.P; if (P.speed > 4.6) { cancelUse(); return; }
  u.t -= dt; $('#bruse').hidden = false; $('#bruse').querySelector('i').style.width = (1 - u.t / u.total) * 100 + '%'; $('#bruse').querySelector('span').textContent = 'USING ' + ITEMS[u.id].name;
  if (u.t <= 0) { const it = ITEMS[u.id]; if (it.heal) P.hp = Math.min(it.cap, P.hp + it.heal); if (it.shield) P.armor = Math.min(it.cap, Math.max(P.armor || 0, 0) + it.shield); const s = P.inv[u.id]; if (s) { s.mag--; if (s.mag <= 0) invRemove(u.id); } A.click(1200, 0.08); cancelUse(); }
}

/* =============================== CHESTS, LOOT PILES =============================== */
let chestMesh = null, lidMesh = null;
function buildChests(W) {
  const pts = W.loot; const n = pts.length; BR.chests = [];
  const body = new T.InstancedMesh(new T.BoxGeometry(0.9, 0.5, 0.6), new T.MeshStandardMaterial({ color: SP.lin(0x7a4a22), roughness: 0.6 }), n);
  const lid = new T.InstancedMesh(new T.BoxGeometry(0.94, 0.14, 0.64), new T.MeshStandardMaterial({ color: SP.lin(0xd8a83a), roughness: 0.3, metalness: 0.8, emissive: SP.lin(0x6a4a10), emissiveIntensity: 0.6 }), n);
  const o = new T.Object3D();
  pts.forEach((p, i) => { o.position.set(p.x, p.y + 0.25, p.z); o.rotation.set(0, (i * 1.7) % 6.28, 0); o.scale.set(1, 1, 1); o.updateMatrix(); body.setMatrixAt(i, o.matrix); o.position.y += 0.31; o.updateMatrix(); lid.setMatrixAt(i, o.matrix);
    const c = { i, pos: V3(p.x, p.y, p.z), open: false }; c.it = G.addInteract({ pos: V3(p.x, p.y + 0.5, p.z), text: 'Open chest', hold: 0.45, radius: 2.2, onUse: () => openChest(c, true) }); BR.chests.push(c); });
  body.userData.noMerge = lid.userData.noMerge = true; body.castShadow = true; SP.scene.add(body); SP.scene.add(lid); chestMesh = body; lidMesh = lid;
}
function hideChest(c) { c.open = true; if (c.it) c.it.enabled = false; const o = new T.Object3D(); o.scale.set(0, 0, 0); o.updateMatrix(); chestMesh.setMatrixAt(c.i, o.matrix); lidMesh.setMatrixAt(c.i, o.matrix); chestMesh.instanceMatrix.needsUpdate = lidMesh.instanceMatrix.needsUpdate = true; }
function openChest(c, mine) {
  if (c.open) return; hideChest(c);
  if (mine) { BR.net && BR.net.send && BR.net.role !== 'off' && BR.net.event({ t: 'chest', i: c.i }); A.click(1500, 0.12); setTimeout(() => A.click(1900, 0.1), 90);
    for (let k = 0; k < 10; k++) G.particle({ pos: c.pos.clone().add(V3(0, 0.8, 0)), vel: V3(rand(-2, 2), rand(2, 5), rand(-2, 2)), life: 0.8, size: 0.12, color: new T.Color(6, 4.5, 1.2), additive: true, kind: 'spark', gravity: 6 });
    const items = [{ k: 'gun', id: rollGun(rollRarity(Math.min(0.35, BR.t / 1500))) }, { k: 'ammo', n: 1 }]; if (Math.random() < 0.55) items.push({ k: 'item', id: SP.pick(['bandage', 'bandage', 'medkit', 'minishield', 'minishield', 'shieldpot']), n: SP.randi(1, 3) }); if (Math.random() < 0.18) items.push({ k: 'gun', id: rollGun(rollRarity()) }); items.push({ k: 'gold', n: SP.randi(20, 60) }); if (Math.random() < 0.2) items.push({ k: 'nade', n: 1 });
    const left = takeItems(items); if (left.length) makePile(c.pos.clone().add(V3(0.8, 0, 0.6)), left, 'chest', null);
  }
}
function takeItems(items) {
  const left = [];
  for (const it of items) {
    if (it.k === 'gun') { if (invAdd(it.id, { mag: it.mag, res: it.res })) { const r = gunRar(it.id); G.hud.feed(SP.WEAP[it.id].name + ' · ' + r.toUpperCase(), r === 'legendary' || r === 'epic' ? 'gold' : ''); } else left.push(it); }
    else if (it.k === 'item') { if (invAdd(it.id, { n: it.n })) G.hud.feed(ITEMS[it.id].name + ' ×' + it.n, ''); else left.push(it); }
    else if (it.k === 'mat') { BR.me.mats[it.id] += it.n; G.hud.feed('+' + it.n + ' ' + it.id.toUpperCase(), 'gold'); }
    else if (it.k === 'gold') { BR.me.gold += it.n; G.hud.feed('+' + it.n + ' GOLD', 'gold'); }
    else if (it.k === 'ammo') { addAmmo(it.n * 2); }
    else if (it.k === 'nade') { SP.Features && SP.Features.addNade && SP.Features.addNade(it.n); G.hud.feed('+' + it.n + ' FRAG GRENADE', ''); }
  }
  hudTick(true); return left;
}
let pileId = 1;
function makePile(pos, items, from, entId, id) {
  if (!items.length) return null; const p = { id: id || (BR.net && BR.net.role === 'client' ? 'c' : '') + (pileId++) + '_' + (Math.random() * 1e4 | 0), pos: pos.clone(), items, from };
  const m = new T.Group(); const bag = new T.Mesh(SP.geo.box(0.7, 0.35, 0.5), SP.flat(0x3a4a2a, 0.9)); bag.position.y = 0.18; m.add(bag);
  const best = items.find(i => i.k === 'gun'); const col = best ? RAR[gunRar(best.id)].c : '#d8d0c0';
  const beam = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 6, 6, 1, true), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(2.5), transparent: true, opacity: 0.45, depthWrite: false })); beam.position.y = 3; m.add(beam);
  m.position.copy(pos); SP.scene.add(m); p.mesh = m;
  p.it = G.addInteract({ pos: pos.clone().add(V3(0, 0.4, 0)), text: from === 'chest' ? 'Pick up loot' : 'Loot ' + from, hold: 0.35, radius: 2.4, onUse: () => takePile(p, true) });
  BR.piles.push(p); if (BR.net && BR.net.role === 'host' && !id) BR.net.event({ t: 'pile', id: p.id, x: pos.x, y: pos.y, z: pos.z, items, from });
  return p;
}
function takePile(p, mine) {
  if (!mine) { removePile(p); return; }
  const left = takeItems(p.items); A.click(1300, 0.08);
  if (left.length) { p.items = left; p.it.enabled = true; G.hud.feed('INVENTORY FULL · DROP OR SWAP A WEAPON (BACKSPACE DROPS)', ''); return; }
  removePile(p); BR.net && BR.net.role !== 'off' && BR.net.event({ t: 'unpile', id: p.id });
}
function removePile(p) { p.it.enabled = false; SP.scene.remove(p.mesh); const i = BR.piles.indexOf(p); if (i >= 0) BR.piles.splice(i, 1); }
BR.makePile = makePile; BR.removePile = removePile; BR.hideChest = hideChest;
function dropCurrent() { const P = SP.P; const id = P.cur; if (!id || id === 'knife') return; const s = P.inv[id]; const W = SP.WEAP[id]; const it = W.item ? { k: 'item', id, n: s.mag } : { k: 'gun', id, mag: s.mag, res: s.res }; invRemove(id); const pos = P.pos.clone().addScaledVector(V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), 1.4); pos.y = SP.W.groundAt(pos.x, pos.z, P.pos.y + 1); const p = makePile(pos, [it], 'dropped', null); if (BR.net && BR.net.role === 'client') BR.net.event({ t: 'pile', id: p.id, x: pos.x, y: pos.y, z: pos.z, items: [it], from: 'dropped' }); }

/* =============================== BUILDING =============================== */
const BUILD = BR.build = { on: false, piece: 'wall', mat: 'wood', ghost: null, slot: null };
const PIECES = ['wall', 'floor', 'ramp'], CELL = 4;
const matCol = { wood: 0xa8743a, stone: 0x9a9690, metal: 0x7a8288 };
function pieceKey(kind, i, k, y, dir) { return kind + ':' + i + ':' + k + ':' + Math.round(y * 2) + ':' + (dir || 0); }
function buildSlot() {
  const P = SP.P; const f = P.forward(); const yawQ = Math.round(-P.yaw / (Math.PI / 2)) & 3; // 0 N(-z),1 E(+x),2 S,3 W
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const [dx, dz] = dirs[yawQ];
  const ci = Math.floor(P.pos.x / CELL), ck = Math.floor(P.pos.z / CELL);
  let y = Math.round((P.pos.y - 0.05) * 2) / 2; if (P.pitch > 0.45) y += 4; if (P.pitch < -0.75) y -= 0.0;
  const kind = BUILD.piece;
  if (kind === 'wall') { // edge of the player's cell facing the look direction
    const cx = (ci + 0.5) * CELL + dx * CELL / 2, cz = (ck + 0.5) * CELL + dz * CELL / 2; return { kind, cx, cz, y, dir: yawQ & 1, key: pieceKey(kind, Math.round(cx * 2), Math.round(cz * 2), y, yawQ & 1) };
  }
  const ti = ci + (P.pitch < -0.75 ? 0 : dx), tk = ck + (P.pitch < -0.75 ? 0 : dz); const cx = (ti + 0.5) * CELL, cz = (tk + 0.5) * CELL;
  if (kind === 'floor') { const fy = P.pitch < -0.75 ? y - 0.15 : y; return { kind, cx, cz, y: fy, key: pieceKey(kind, ti, tk, fy) }; }
  return { kind, cx, cz, y, dir: yawQ, key: pieceKey(kind, ti, tk, y, yawQ) };
}
function pieceMesh(s, mat, ghost) {
  const g = new T.Group(); const m = ghost ? new T.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.32, depthWrite: false }) : pieceMat(mat);
  if (s.kind === 'wall') { const b = new T.Mesh(SP.geo.box(s.dir ? 0.25 : CELL, CELL, s.dir ? CELL : 0.25), m); b.position.y = CELL / 2; g.add(b); if (!ghost) { const fr = new T.Mesh(SP.geo.box(s.dir ? 0.3 : CELL, 0.22, s.dir ? CELL : 0.3), pieceMat(mat, true)); fr.position.y = CELL - 0.11; g.add(fr); const fr2 = fr.clone(); fr2.position.y = 0.11; g.add(fr2); } }
  else if (s.kind === 'floor') { const b = new T.Mesh(SP.geo.box(CELL, 0.22, CELL), m); b.position.y = -0.11; g.add(b); }
  else { const L = CELL * Math.SQRT2; const b = new T.Mesh(SP.geo.box(CELL, 0.22, L), m); b.rotation.x = Math.PI / 4; b.position.y = CELL / 2; const piv = new T.Group(); piv.rotation.y = -s.dir * Math.PI / 2; piv.add(b); g.add(piv); }
  g.position.set(s.cx, s.y, s.cz); return g;
}
const pmats = {}; function pieceMat(mat, trim) { const k = mat + (trim ? 't' : ''); if (pmats[k]) return pmats[k]; const tex = mat === 'wood' ? 'wood' : mat === 'stone' ? 'concrete' : 'metal'; return pmats[k] = SP.mat(tex, { color: trim ? new T.Color(matCol[mat]).multiplyScalar(0.7).getHex() : matCol[mat], roughness: mat === 'metal' ? 0.45 : 0.85, metalness: mat === 'metal' ? 0.6 : 0 }); }
function placePiece(s, mat, remote) {
  if (BR.pieces.has(s.key)) return null; const W = SP.W; const hp = MAT_HP[mat];
  const p = { key: s.key, s, mat, hp: hp * 0.25, maxHp: hp, grow: 0, mesh: pieceMesh(s, mat, false), cols: [] };
  p.mesh.scale.setScalar(0.05); p.mesh.userData.noMerge = true; SP.scene.add(p.mesh);
  const add = (x0, y0, z0, x1, y1, z1) => { const c = W.addCollider(V3(x0, y0, z0), V3(x1, y1, z1), mat === 'wood' ? 'wood' : mat === 'stone' ? 'hard' : 'metal'); c.piece = p; p.cols.push(c); };
  const { cx, cz, y } = s;
  if (s.kind === 'wall') { if (s.dir) add(cx - 0.15, y, cz - 2, cx + 0.15, y + 4, cz + 2); else add(cx - 2, y, cz - 0.15, cx + 2, y + 4, cz + 0.15); }
  else if (s.kind === 'floor') add(cx - 2, y - 0.22, cz - 2, cx + 2, y, cz + 2);
  else { const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const [dx, dz] = dirs[s.dir]; for (let k = 0; k < 8; k++) { const t0 = -2 + k * 0.5, t1 = t0 + 0.5, h = y + (k + 1) * 0.5; const ax = dx !== 0, a0 = ax ? cx + dx * t0 : cx - 2, a1 = ax ? cx + dx * t1 : cx + 2, b0 = ax ? cz - 2 : cz + dz * t0, b1 = ax ? cz + 2 : cz + dz * t1; add(Math.min(a0, a1), h - 0.5, Math.min(b0, b1), Math.max(a0, a1), h, Math.max(b0, b1)); } }
  BR.pieces.set(s.key, p); if (!remote) { A.click(500, 0.1); setTimeout(() => A.click(650, 0.08), 80); }
  return p;
}
function damagePiece(p, d, remote) {
  if (!p || !BR.pieces.has(p.key)) return; p.hp -= d; if (BR.net && !remote && BR.net.role !== 'off') BR.net.event({ t: 'pdmg', key: p.key, d });
  if (p.hp <= 0) breakPiece(p);
}
function breakPiece(p) { BR.pieces.delete(p.key); SP.scene.remove(p.mesh); p.cols.forEach(c => SP.W.removeCollider(c)); const c = V3(p.s.cx, p.s.y + 2, p.s.cz); for (let k = 0; k < 14; k++) G.particle({ pos: c.clone().add(V3(rand(-1.5, 1.5), rand(-1.5, 1.5), rand(-1.5, 1.5))), vel: V3(rand(-3, 3), rand(1, 5), rand(-3, 3)), life: 1.2, size: 0.25, color: new T.Color(matCol[p.mat]).multiplyScalar(0.8), gravity: 12 }); A.impact && A.impact(c, p.mat === 'metal' ? 'metal' : 'wood'); }
BR.placePiece = placePiece; BR.damagePiece = damagePiece;
function buildTick(dt) {
  const P = SP.P;
  if (I.hit('KeyY') || I.hit('KeyQ') && BUILD.on) toggleBuild(!BUILD.on);
  for (const p of BR.pieces.values()) if (p.grow < 1) { p.grow = Math.min(1, p.grow + dt * 3.5); p.hp = Math.min(p.maxHp, p.hp + p.maxHp * dt * 0.75 * 3.5 / 2.6); p.mesh.scale.setScalar(0.05 + p.grow * 0.95); }
  if (!BUILD.on) { if (BUILD.ghost) { SP.scene.remove(BUILD.ghost); BUILD.ghost = null; } return; }
  if (I.hit('Digit1') || I.hit('KeyZ')) BUILD.piece = 'wall'; if (I.hit('Digit2') || I.hit('KeyX')) BUILD.piece = 'floor'; if (I.hit('Digit3') || I.hit('KeyC') && false) BUILD.piece = 'ramp'; if (I.hit('KeyR')) BUILD.mat = MATS[(MATS.indexOf(BUILD.mat) + 1) % 3];
  const s = buildSlot(); const can = BR.me.mats[BUILD.mat] >= 10 && !BR.pieces.has(s.key);
  if (!BUILD.ghost || BUILD.ghost.userData.k !== s.kind + s.dir) { if (BUILD.ghost) SP.scene.remove(BUILD.ghost); BUILD.ghost = pieceMesh(s, BUILD.mat, true); BUILD.ghost.userData.k = s.kind + s.dir; SP.scene.add(BUILD.ghost); }
  BUILD.ghost.position.set(s.cx, s.y, s.cz); BUILD.ghost.traverse(o => { if (o.material) o.material.color.setHex(can ? 0x4aa8ff : 0xff4a3a); });
  if ((I.mouse.lp || BUILD.tap) && can && P.brKnocked !== true) { BUILD.tap = false; BR.me.mats[BUILD.mat] -= 10; placePiece(s, BUILD.mat); BR.net && BR.net.role !== 'off' && BR.net.event({ t: 'build', s, mat: BUILD.mat }); hudTick(true); }
  else if (I.mouse.lp && !can && BR.me.mats[BUILD.mat] < 10) G.hud.feed('OUT OF ' + BUILD.mat.toUpperCase() + ' · PRESS R TO SWITCH MATERIAL', '');
  BUILD.tap = false;
}
function toggleBuild(on) { BUILD.on = on; $('#brbuild').classList.toggle('on', on); A.click(on ? 900 : 600, 0.06); if (!on && BUILD.ghost) { SP.scene.remove(BUILD.ghost); BUILD.ghost = null; } hudTick(true); }
BR.toggleBuild = toggleBuild;
function botWall(e, from) {
  if (!e.u || e.mats.wood + e.mats.stone + e.mats.metal < 10) return; e.buildT = BR.t; const u = e.u; const dx = from.x - u.pos.x, dz = from.z - u.pos.z; const q = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0);
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const [ddx, ddz] = dirs[q]; const ci = Math.floor(u.pos.x / CELL), ck = Math.floor(u.pos.z / CELL); const cx = (ci + 0.5) * CELL + ddx * CELL / 2, cz = (ck + 0.5) * CELL + ddz * CELL / 2; const y = Math.round(u.pos.y * 2) / 2;
  const mat = MATS.find(m => e.mats[m] >= 10); e.mats[mat] -= 10; const s = { kind: 'wall', cx, cz, y, dir: q & 1, key: pieceKey('wall', Math.round(cx * 2), Math.round(cz * 2), y, q & 1) }; if (placePiece(s, mat, true)) { BR.net && BR.net.role === 'host' && BR.net.event({ t: 'build', s, mat }); u.crouch = true; }
}

const owh = SP.onWallHit; SP.onWallHit = function (wh, dir, team) { owh && owh.apply(this, arguments); if (BR.on && wh && wh.collider && wh.collider.piece && team === 'player') { const w = SP.WEAP[SP.P.cur] || {}; damagePiece(wh.collider.piece, (w.dmg || 20) * (w.pellets ? 2 : 1)); } };
const expl0 = G.explosion; G.explosion = function (pos, radius = 7, dmg = 220, source) { const r = expl0.apply(this, arguments); if (BR.on) for (const p of Array.from(BR.pieces.values())) { const c = V3(p.s.cx, p.s.y + 1.5, p.s.cz); const d = c.distanceTo(pos); if (d < radius + 2) damagePiece(p, dmg * 1.5 * (1 - d / (radius + 2)) + 40); } return r; };

/* =============================== VENDORS =============================== */
function spawnVendors(W) {
  BR.vendors = [];
  for (const v of W.vendors) {
    const arms = v.kind === 'arms'; const u = new SP.Unit({ team: 'civ', name: arms ? 'ARMS DEALER' : 'MERCENARY', pos: v.pos.clone(), weapon: arms ? 'none' : 'ak', behavior: 'idle', invuln: true, look: arms ? { top: 0x2a2a2e, pants: 0x1a1a1c, head: 'cap', seed: 900 + BR.vendors.length } : { top: 0x4a5a3a, helmet: true, seed: 950 + BR.vendors.length } });
    u.invuln = true; u.lookAt = V3(v.pos.x, 0, v.pos.z + 10); u.vendor = true;
    const stock = []; for (let k = 0; k < 5; k++) { const r = ['uncommon', 'rare', 'rare', 'epic', 'legendary'][k]; const id = rollGun(r); if (!stock.some(s => s.id === id)) stock.push({ id, price: { uncommon: 120, rare: 220, epic: 380, legendary: 600 }[r], rar: r }); }
    stock.push({ id: 'medkit', price: 90, item: true }, { id: 'shieldpot', price: 110, item: true }, { id: 'ammo', price: 40 });
    const V = { u, arms, stock, hired: false, pos: v.pos };
    V.it = G.addInteract({ pos: v.pos.clone().add(V3(0, 1, 0)), text: arms ? 'Buy weapons (arms dealer)' : 'Hire a mercenary · 300 gold', radius: 2.8, onUse: () => arms ? openShop(V) : hire(V) });
    BR.vendors.push(V);
  }
}
function openShop(V) {
  const el = $('#brshop'); el.hidden = false; SP.Input.unlock && SP.Input.unlock(); BR.shopOpen = V;
  const draw = () => { el.querySelector('.gold').textContent = BR.me.gold + ' GOLD'; const L = el.querySelector('.list'); L.innerHTML = '';
    V.stock.forEach(s => { const b = document.createElement('button'); b.type = 'button'; b.className = 'shoprow'; const nm = s.id === 'ammo' ? 'AMMO CRATE' : SP.WEAP[s.id].name; b.innerHTML = `<b></b><span></span><em>${s.price} GOLD</em>`; b.querySelector('b').textContent = nm; b.querySelector('span').textContent = s.rar ? s.rar.toUpperCase() + ' · ' + (SP.CLASS_NAMES && SP.CLASS_NAMES[SP.WEAP[s.id].cls] || SP.WEAP[s.id].cls) : s.item ? 'ESSENTIAL' : 'REFILLS EVERY GUN'; if (s.rar) b.style.borderLeft = '4px solid ' + RAR[s.rar].c; b.disabled = BR.me.gold < s.price;
      b.addEventListener('click', () => { if (BR.me.gold < s.price) return; if (s.id === 'ammo') { addAmmo(4); } else if (!invAdd(s.id, s.item ? { n: 1 } : {})) { G.hud.feed('INVENTORY FULL', 'red'); return; } BR.me.gold -= s.price; A.click(1400, 0.12); G.hud.feed('BOUGHT ' + nm, 'gold'); draw(); hudTick(true); }); L.append(b); }); };
  draw();
}
function closeShop() { $('#brshop').hidden = true; BR.shopOpen = null; SP.Input.lock && !SP.Touch?.on && SP.Input.lock(); }
function hire(V) {
  if (V.hired) return; if (BR.net && BR.net.role === 'client') { G.hud.feed('ONLY THE SQUAD HOST CAN HIRE MERCENARIES', ''); return; } if (BR.me.gold < 300) { G.hud.feed('MERCENARIES COST 300 GOLD · OPEN CHESTS AND TAKE IT FROM KILLS', 'red'); return; }
  BR.me.gold -= 300; V.hired = true; V.it.enabled = false; const u = V.u; u.team = 'ally'; u.invuln = false; u.vendor = false; u.br = true; u.brTeam = BR.myTeam; u.behavior = 'follow'; u.follow = 'player'; u.offset = V3(rand(-3, 3), 0, 4); u.acc = 1.1; u.runSpeed = 5.4;
  const e = { id: BR.ents.length, team: BR.myTeam, name: 'MERC·' + SP.pick(CALLS).toUpperCase(), merc: true, st: 'alive', x: u.pos.x, y: u.pos.y, z: u.pos.z, yaw: 0, hp: 100, sh: 50, knock: 0, guns: [{ id: rollGun('rare'), mag: 30, res: 120 }], cur: 0, mats: { wood: 50, stone: 50, metal: 0 }, meds: { bandage: 0, medkit: 1, minishield: 0, shieldpot: 0 }, gold: 0, kills: 0, u, acc: 1.1, skill: 1.2, lootT: 30 };
  u.brEnt = e; u.name = e.name; setRigGun(u, e.guns[0].id); BR.ents.push(e); A.click(1100, 0.15); G.hud.feed(e.name + ' JOINED YOUR SQUAD', 'gold'); hudTick(true);
}

/* =============================== HUD, MAP, LEADERBOARD =============================== */
let mapImg = null;
function mapImage() {
  if (mapImg) return mapImg; const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const img = x.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const wx = (i / N - 0.5) * 2400, wz = (j / N - 0.5) * 2400; const col = SP.brMapColor(wx, wz); const shade = (() => { const h0 = SP.brTerrainH(wx, wz), h1 = SP.brTerrainH(wx + 6, wz + 6); return clamp(1 + (h0 - h1) * 0.05, 0.75, 1.2); })(); const o = (j * N + i) * 4; img.data[o] = clamp(col[0] * shade * 255, 0, 255); img.data[o + 1] = clamp(col[1] * shade * 255, 0, 255); img.data[o + 2] = clamp(col[2] * shade * 255, 0, 255); img.data[o + 3] = 255; }
  x.putImageData(img, 0, 0); mapImg = c; return c;
}
const w2m = (v, S) => (v / 2400 + 0.5) * S;
function drawMap(cv, full) {
  const S = cv.width; const x = cv.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(mapImage(), 0, 0, S, S);
  const Z = BR.zone; const P = SP.P;
  // blue zone: everything outside the white circle tinted blue
  if (Z) { x.save(); x.fillStyle = 'rgba(40,90,255,0.33)'; x.beginPath(); x.rect(0, 0, S, S); x.arc(w2m(Z.cx, S), w2m(Z.cz, S), Z.r / 2400 * S, 0, 6.29, true); x.fill('evenodd'); x.restore();
    x.strokeStyle = 'rgba(90,150,255,0.95)'; x.lineWidth = 2; x.beginPath(); x.arc(w2m(Z.cx, S), w2m(Z.cz, S), Z.r / 2400 * S, 0, 6.29); x.stroke();
    x.strokeStyle = '#fff'; x.setLineDash([5, 4]); x.beginPath(); x.arc(w2m(Z.tx, S), w2m(Z.tz, S), Z.tr / 2400 * S, 0, 6.29); x.stroke(); x.setLineDash([]); }
  if (full) { x.font = '600 ' + Math.round(S / 46) + 'px "Barlow Condensed",sans-serif'; x.textAlign = 'center'; for (const p of SP.BRPOI) { x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillText(p.name.toUpperCase(), w2m(p.x, S) + 1, w2m(p.z, S) + 1); x.fillStyle = '#fff'; x.fillText(p.name.toUpperCase(), w2m(p.x, S), w2m(p.z, S)); }
    (BR.vendors || []).forEach(v => { x.fillStyle = v.arms ? '#f2c14a' : '#7ad4ff'; x.beginPath(); x.arc(w2m(v.pos.x, S), w2m(v.pos.z, S), S / 160, 0, 6.29); x.fill(); }); }
  if (BR.helis && (BR.me.st === 'heli')) { const h = BR.helis[BR.myHeli]; x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 2; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(w2m(h.ax, S), w2m(h.az, S)); x.lineTo(w2m(h.bx, S), w2m(h.bz, S)); x.stroke(); x.setLineDash([]); }
  if (BR.ping) { x.fillStyle = '#ffcf4a'; x.beginPath(); x.arc(w2m(BR.ping.x, S), w2m(BR.ping.z, S), S / 110, 0, 6.29); x.fill(); }
  // teammates + me
  for (const e of BR.ents) if (e.team === BR.myTeam && !e.me && e.st !== 'dead') { const px = e.u ? e.u.pos : V3(e.x, 0, e.z); x.fillStyle = e.st === 'knocked' ? '#ff9a3a' : '#5ad46a'; x.beginPath(); x.arc(w2m(px.x, S), w2m(px.z, S), S / 120, 0, 6.29); x.fill(); }
  if (P) { const mx = w2m(P.pos.x, S), mz = w2m(P.pos.z, S); x.save(); x.translate(mx, mz); x.rotate(-P.yaw); x.fillStyle = '#ffd24a'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -S / 70); x.lineTo(S / 110, S / 110); x.lineTo(-S / 110, S / 110); x.closePath(); x.fill(); x.stroke(); x.restore(); }
}
function lbHTML() {
  const rows = BR.teams.map(t => { const m = BR.ents.filter(e => e.team === t.id && !e.merc); const alive = m.filter(e => e.st === 'alive' || e.st === 'heli' || e.st === 'air').length; const kn = m.filter(e => e.st === 'knocked').length; return { t, m, alive, kn, score: t.out ? -100 + (50 - t.place) : 100 + alive * 10 + kn * 4 + t.kills }; }).sort((a, b) => b.score - a.score);
  const left = BR.teams.filter(t => !t.out).length;
  return `<div class="lbh"><b>${left} TEAMS LEFT</b><span>${BR.ents.filter(e => e.st === 'alive' || e.st === 'knocked' || e.st === 'heli' || e.st === 'air').length} PLAYERS ALIVE</span></div>` + rows.map((r, i) => `<div class="lbr${r.t.id === BR.myTeam ? ' me' : ''}${r.t.out ? ' out' : ''}"><i>${r.t.out ? '#' + r.t.place : i + 1}</i><em>${r.t.flag}</em><b>${r.t.country}</b><span class="pips">${r.m.map(e => `<u class="${e.st === 'dead' ? 'd' : e.st === 'knocked' ? 'k' : 'a'}" title="${e.name}"></u>`).join('')}</span><s>${r.t.kills}</s><small>${r.t.out ? 'FINISHED' : r.alive ? 'IN PLAY' : 'KNOCKED'}</small></div>`).join('');
}
function squadHTML() {
  return BR.ents.filter(e => e.team === BR.myTeam).map(e => { const hp = e.me ? (BR.me.st === 'knocked' ? 0 : SP.P.hp) : e.hp; const sh = e.me ? (SP.P.armor || 0) : e.sh; const st = e.st;
    return `<div class="sq ${st}"><b>${e.me ? 'YOU' : e.name}${e.human && !e.me ? ' ●' : ''}</b><span class="bars"><i style="width:${clamp(hp, 0, 100)}%"></i><u style="width:${clamp(sh, 0, 100)}%"></u></span><em>${st === 'dead' ? 'OUT' : st === 'knocked' ? 'KNOCKED' : st === 'heli' ? 'IN HELI' : st === 'air' ? 'DROPPING' : ''}</em></div>`; }).join('');
}
let hudT = 0;
function hudTick(force, dt = 0) {
  hudT -= dt; if (!force && hudT > 0) return; hudT = 0.2;
  const Z = BR.zone; const alive = BR.ents.filter(e => e.st !== 'dead').length; const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const zt = !Z ? '' : Z.t > 1e8 ? 'FINAL CIRCLE' : (Z.shrink ? 'ZONE CLOSING · ' : 'ZONE ' + (Z.ph + 2) + ' IN ') + fmt(Math.max(0, Z.t));
  const out = Z && SP.P && outside(Z, SP.P.pos.x, SP.P.pos.z) && BR.me.st !== 'heli' && BR.me.st !== 'air';
  $('#brtop').innerHTML = `<div><b>${alive}</b><span>ALIVE</span></div><div><b>${BR.teams.filter(t => !t.out).length}</b><span>TEAMS</span></div><div><b>${BR.myKills}</b><span>KILLS</span></div><div class="z${out ? ' out' : ''}">${out ? 'YOU ARE IN THE BLUE ZONE · MOVE' : zt}</div>`;
  $('#brsquad').innerHTML = `<div class="tn">${BR.teams[BR.myTeam].flag} TEAM ${BR.teams[BR.myTeam].country.toUpperCase()}</div>` + squadHTML();
  const m = BR.me.mats; $('#brmats').innerHTML = MATS.map(k => `<span class="${BUILD.on && BUILD.mat === k ? 'sel' : ''}"><i class="${k}"></i>${m[k]}</span>`).join('') + `<span class="gold">◆ ${BR.me.gold}</span>`;
  $('#brbuild').innerHTML = BUILD.on ? `<b>BUILD · ${BUILD.mat.toUpperCase()}</b><span class="${BUILD.piece === 'wall' ? 'sel' : ''}">1 WALL</span><span class="${BUILD.piece === 'floor' ? 'sel' : ''}">2 FLOOR</span><span class="${BUILD.piece === 'ramp' ? 'sel' : ''}">3 RAMP</span><span>R MATERIAL · Y EXIT</span>` : '<span>Y BUILD · M MAP · TAB TEAMS · BACKSPACE DROP</span>';
  if (!$('#brlb').hidden) $('#brlb .in').innerHTML = lbHTML();
  if (!$('#brmapov').hidden) drawMap($('#brmapcv'), true);
  const mm = $('#brmini'); if (mm && !mm.hidden) drawMini(mm);
}
function drawMini(cv) { // 300 m radar of the colour map around the player
  const S = cv.width, x = cv.getContext('2d'), P = SP.P; const span = 600; const img = mapImage(); const sx = (P.pos.x - span / 2) / 2400 * 256 + 128, sz = (P.pos.z - span / 2) / 2400 * 256 + 128, sw = span / 2400 * 256;
  x.save(); x.clearRect(0, 0, S, S); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 6.29); x.clip(); x.drawImage(img, sx, sz, sw, sw, 0, 0, S, S);
  const Z = BR.zone; const k = S / span; if (Z) { x.strokeStyle = '#5a96ff'; x.lineWidth = 2; x.beginPath(); x.arc((Z.cx - P.pos.x) * k + S / 2, (Z.cz - P.pos.z) * k + S / 2, Z.r * k, 0, 6.29); x.stroke(); x.strokeStyle = '#fff'; x.setLineDash([4, 3]); x.beginPath(); x.arc((Z.tx - P.pos.x) * k + S / 2, (Z.tz - P.pos.z) * k + S / 2, Z.tr * k, 0, 6.29); x.stroke(); x.setLineDash([]); }
  for (const e of BR.ents) if (e.team === BR.myTeam && !e.me && e.st !== 'dead') { const p = e.u ? e.u.pos : V3(e.x, 0, e.z); x.fillStyle = e.st === 'knocked' ? '#ff9a3a' : '#5ad46a'; x.beginPath(); x.arc((p.x - P.pos.x) * k + S / 2, (p.z - P.pos.z) * k + S / 2, 4, 0, 6.29); x.fill(); }
  for (const u of G.units) if (u.br && !u.dead && u.brTeam !== BR.myTeam && u.lastShotT && G.time - u.lastShotT < 2.5) { x.fillStyle = '#ff4a3a'; x.beginPath(); x.arc((u.pos.x - P.pos.x) * k + S / 2, (u.pos.z - P.pos.z) * k + S / 2, 3, 0, 6.29); x.fill(); }
  x.translate(S / 2, S / 2); x.rotate(-P.yaw); x.fillStyle = '#ffd24a'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(-5, 5); x.closePath(); x.fill(); x.restore();
}

/* =============================== THE MODE =============================== */
function brPart(opt = {}) {
  return {
    name: 'Isla Corona', modeTitle: 'BATTLE ROYALE · SQUADS', map: 'br2', env: opt.env || 'afternoon', envOver: { fogD: 0.00085, atmDen: 0.0012 }, place: '50 teams · 200 players', time: 'Drop in. Last squad standing.', loadout: ['knife'], noExtras: true, noIntel: true, seed: opt.seed,
    setup(c, W, P) {
      SP.forceWeather = null; SP.Modes && SP.Modes.applyMutators(false); SP.noRegen = true; SP.brAcc = 1; SP.noPauseSim = true; document.body.classList.add('brmode');
      BR.on = true; BR.c = c; BR.W = W; BR.zone = zoneInit(); const sr = SP.seeded ? (() => { let s = (BR.seed || 1) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })() : Math.random; BR.helis = makeHelis(sr);
      SP.brOrder = () => INV.slots.map(id => id && P.inv[id] ? id : null);
      P.brTeam = BR.myTeam; P.armor = 0; P.hp = 100; P.brKnocked = false; invReset();
      // teams into helis: 5 per heli, mine in heli 0 (clients get theirs from the host)
      BR.myHeli = 0; BR.teams.forEach(t => { t.heli = t.id % 10; }); BR.myHeli = BR.teams[BR.myTeam].heli;
      for (const e of BR.ents) { e.st = 'heli'; e.heli = BR.teams[e.team].heli; if (!e.human) { const h = BR.helis[e.heli]; const cands = SP.BRPOI.map(p => ({ p, d: segDist(p.x, p.z, h) })).sort((a, b) => a.d - b.d).slice(0, 6); const pick = Math.random() < 0.85 ? SP.pick(cands).p : null; const L = Math.hypot(h.bx - h.ax, h.bz - h.az); const tx = pick ? pick.x + rand(-pick.r, pick.r) * 0.7 : lerp(h.ax, h.bx, rand(0.25, 0.75)) + rand(-200, 200), tz = pick ? pick.z + rand(-pick.r, pick.r) * 0.7 : lerp(h.az, h.bz, rand(0.25, 0.75)) + rand(-200, 200); const k = clamp(((tx - h.ax) * (h.bx - h.ax) + (tz - h.az) * (h.bz - h.az)) / (L * L), 0.08, 0.92); e.jumpT = h.t0 + k * L / h.speed + rand(-1, 2); e.dropAt = { x: tx, z: tz }; e.dropT = 20 + Math.hypot(tx - lerp(h.ax, h.bx, k), tz - lerp(h.az, h.bz, k)) / 18; }
        // squadmates (bots) follow my jump
        if (e.team === BR.myTeam && !e.human) e.followJump = true; }
      // heli meshes
      BR.helis.forEach(h => { const m = SP.Models.heli(); m.scale.setScalar(1.6); m.userData.noMerge = true; SP.scene.add(m); h.mesh = m; });
      buildChests(W); spawnVendors(W);
      // blue zone wall
      const wall = new T.Mesh(new T.CylinderGeometry(1, 1, 600, 128, 1, true), new T.MeshBasicMaterial({ color: new T.Color(0.25, 0.5, 2.4), transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false })); wall.position.y = 150; wall.frustumCulled = false; wall.userData.noMerge = true; SP.scene.add(wall); BR.wall = wall;
      P.mode = 'walk'; BR.me.st = 'heli'; placeInHeli(P, 0);
      // everyone starts equal: knife only, no story-mode gadgets, streaks or grenades
      SP.noStreaks = true; const F2 = SP.Features2; if (F2 && F2.eqCount) Object.keys(F2.eqCount).forEach(k => F2.eqCount[k] = 0); if (SP.Features) SP.Features.nadeCount = 0; SP.Features && SP.Features.addNade && SP.Features.addNade(0);
      ['#equip', '#streaks', '#t-equip', '#t-eqcycle', '#t-streak'].forEach(s => { const el = $(s); if (el) el.hidden = true; }); const lb = $('#armbar .lb'); if (lb) lb.textContent = 'SHIELD';
      $('#brx').hidden = false; ['#minimap'].forEach(s => { const el = $(s); if (el) el.style.visibility = 'hidden'; });
      BR.net && BR.net.onSetup && BR.net.onSetup();
      hudTick(true);
    },
    async run(c, W, P) {
      c.obj('Jump from the helicopter (Space) · steer with WASD', null);
      G.hud.feed('TEAM ' + BR.teams[BR.myTeam].country.toUpperCase() + ' ' + BR.teams[BR.myTeam].flag + ' · ' + BR.teams.length + ' TEAMS ON THE ISLAND', 'gold');
      let simAcc = 0;
      SP.onTick = dt => { if (!BR.on) return; BR.t += dt; tick(dt); simAcc += dt; if (simAcc > 0.25) { if (!BR.net || BR.net.role !== 'client') simTick(simAcc); simAcc = 0; } };
      await new Promise(() => { });
    },
    onDeath() { onMyDeath(); },
    onComplete() { },
  };
}
function segDist(x, z, h) { const dx = h.bx - h.ax, dz = h.bz - h.az; const t = clamp(((x - h.ax) * dx + (z - h.az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - h.ax - dx * t, z - h.az - dz * t); }
function placeInHeli(P, t) { const h = BR.helis[BR.myHeli]; const hp = heliPos(h, t); const side = V3(Math.cos(hp.yaw), 0, -Math.sin(hp.yaw)); P.pos.set(hp.x + side.x * 2.6, hp.y + 0.6, hp.z + side.z * 2.6); P.vel.set(0, 0, 0); P.onGround = false; }
function jump(P, auto) {
  if (BR.me.st !== 'heli') return; BR.me.st = 'air'; BR.glide = false; P.vel.set(-Math.sin(P.yaw) * 10, -4, -Math.cos(P.yaw) * 10); A.click(400, 0.2); G.hud.feed(auto ? 'END OF THE LINE · YOU WERE PUSHED OUT' : 'JUMPED', 'gold');
  for (const e of BR.ents) if (e.followJump && e.st === 'heli') { e.st = 'air'; e.followMe = true; }
  BR.c.obj('Land, open chests and find a gun', null);
  BR.net && BR.net.event && BR.net.event({ t: 'jump', id: BR.me.id });
}
function tick(dt) {
  const P = SP.P; const Z = BR.zone;
  if (!BR.net || BR.net.role !== 'client') zoneTick(Z, dt);
  BR.wall.position.x = Z.cx; BR.wall.position.z = Z.cz; BR.wall.scale.set(Math.max(1, Z.r), 1, Math.max(1, Z.r));
  // helicopters
  for (const h of BR.helis) { const hp = heliPos(h, BR.t); h.mesh.visible = hp.k > 0 && hp.k < 1; h.mesh.position.set(hp.x, hp.y, hp.z); h.mesh.rotation.y = hp.yaw; if (h.mesh.userData.rotor) h.mesh.userData.rotor.rotation.y += dt * 30; if (h.mesh.userData.tail) h.mesh.userData.tail.rotation.x += dt * 40; }
  // bots leave their helis
  for (const e of BR.ents) if (e.st === 'heli' && !e.human && !e.followJump && BR.t > e.jumpT) { e.st = 'air'; }
  // my phase
  if (BR.me.st === 'heli') {
    placeInHeli(P, BR.t); const hp = heliPos(BR.helis[BR.myHeli], BR.t); $('#brjump').hidden = false; $('#brjump').textContent = hp.k <= 0 ? 'HELICOPTERS INBOUND · ' + Math.ceil(BR.helis[BR.myHeli].t0 - BR.t) : 'PRESS SPACE TO JUMP' + (SP.Touch && SP.Touch.on ? ' (TAP JUMP)' : '');
    if (hp.k > 0.04 && (I.hit('Space') || BR.tapJump)) jump(P, false); if (hp.k > 0.96) jump(P, true); BR.tapJump = false;
  } else $('#brjump').hidden = true;
  document.body.classList.toggle('inheli', BR.me.st === 'heli'); document.body.classList.toggle('building', !!BUILD.on);
  if (BR.me.st === 'air') {
    const g = SP.W.groundAt(P.pos.x, P.pos.z, P.pos.y); const alt = P.pos.y - g; const K = I.keys; const fwd = K.KeyW || K.ArrowUp ? 1 : 0, back = K.KeyS || K.ArrowDown ? 1 : 0, lf = K.KeyA ? 1 : 0, rt = K.KeyD ? 1 : 0;
    if (!BR.glide && alt < 110) { BR.glide = true; A.click(300, 0.15); G.hud.feed('GLIDER DEPLOYED', ''); }
    const sp = BR.glide ? 17 : 32; const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw); const ix = rt - lf, iz = fwd - back; let mx = fx * iz + rx * ix, mz = fz * iz + rz * ix; const ml = Math.hypot(mx, mz) || 1;
    const dive = !BR.glide && fwd && P.pitch < -0.6;
    P.vel.x = lerp(P.vel.x, mx / ml * sp * (iz || ix ? 1 : 0.2), dt * 2); P.vel.z = lerp(P.vel.z, mz / ml * sp * (iz || ix ? 1 : 0.2), dt * 2); P.vel.y = BR.glide ? -8.5 : (dive ? -62 : -42);
    $('#bralt').hidden = false; $('#bralt').textContent = Math.round(alt) + ' M' + (BR.glide ? ' · GLIDING' : dive ? ' · DIVING' : ' · FREEFALL');
    if (P.onGround || alt < 0.6) { BR.me.st = 'alive'; $('#bralt').hidden = true; A.step('sand', 0.5); G.hud.feed('LANDED · OPEN CHESTS FOR WEAPONS', 'gold'); BR.c.obj('Survive · stay inside the circle', null);
      // squadmates that followed land around me
      if (!BR.net || BR.net.role !== 'client') for (const e of BR.ents) if (e.followMe && e.st === 'air') { e.followMe = false; landAt(e, P.pos.x + rand(-8, 8), P.pos.z + rand(-8, 8)); spawnUnit(e); } }
  } else $('#bralt').hidden = true;
  // water: swim at the surface (sea and the lake)
  if (BR.me.st !== 'heli') { const th = SP.W.heightAt(P.pos.x, P.pos.z); const sw = th < -0.6 && P.pos.y < -0.85; if (sw) { P.pos.y = -0.9; P.vel.y = Math.max(0, P.vel.y); P.onGround = true; if (BR.me.st === 'air') { BR.me.st = 'alive'; $('#bralt').hidden = true; G.hud.feed('SPLASHDOWN · SWIM TO SHORE', ''); BR.c.obj('Survive · stay inside the circle', null); } } if (sw !== !!BR.swim) { BR.swim = sw; P.speedMul = sw ? 0.55 : (P.brKnocked ? 0.3 : 1); P.canSprint = !sw && !P.brKnocked; } }
  // zone damage to me
  if ((BR.me.st === 'alive' || BR.me.st === 'knocked') && outside(Z, P.pos.x, P.pos.z) && P.alive) { BR.zoneHurtT = (BR.zoneHurtT || 0) - dt; if (BR.zoneHurtT <= 0) { BR.zoneHurtT = 1; G._dmgKind = 'zone'; const a0 = P.armor; P.armor = 0; SP.P.hurt(Z.dps / (SP.difficulty || 1), null); P.armor = a0; G._dmgKind = null; SP.post.U.damage.value = Math.max(SP.post.U.damage.value, 0.45); } SP.post.U.flash && (BR.blueT = 1); }
  // knocked bleed + bot teammates reviving me
  if (P.brKnocked && P.alive) { P.hp -= dt * 3.2; if (P.hp <= 0) { P.brKnocked = false; P.hp = 0; P.alive = false; SP.onPlayerDeath && SP.onPlayerDeath(); }
    const mate = BR.ents.find(e => e.team === BR.myTeam && e.u && !e.me && e.st === 'alive' && !e.human); if (mate) { mate.u.follow = null; mate.u.behavior = 'assault'; mate.u.goal2 = P.pos.clone(); mate.u.stopDist = 1.2; if (mate.u.pos.distanceTo(P.pos) < 2.4) { BR.revT = (BR.revT || 0) + dt; $('#brknock').querySelector('span').textContent = mate.name + ' IS REVIVING YOU · ' + Math.max(0, 6 - BR.revT).toFixed(1) + 'S'; if (BR.revT > 6) { BR.revT = 0; revive(BR.me, mate); mate.u.behavior = 'follow'; mate.u.follow = 'player'; mate.u.goal2 = null; } } else { BR.revT = 0; $('#brknock').querySelector('span').textContent = 'BLEEDING OUT · ' + Math.ceil(P.hp / 3.2) + 'S · ' + mate.name + ' IS COMING'; } }
    else $('#brknock').querySelector('span').textContent = 'BLEEDING OUT · ' + Math.ceil(P.hp / 3.2) + 'S'; }
  // revive prompts for knocked teammates near me
  for (const e of BR.ents) { if (e.team !== BR.myTeam || e.me) continue; if (e.st === 'knocked' && e.u && !e.revIt) e.revIt = G.addInteract({ pos: () => e.u ? e.u.pos.clone().add(V3(0, 0.5, 0)) : V3(e.x, e.y, e.z), text: 'Revive ' + e.name, hold: 5, radius: 2.6, onUse: () => { if (e.st !== 'knocked') return; if (e.human && BR.net) BR.net.reviveReq(e); else revive(e, BR.me); } }); if (e.revIt && e.st !== 'knocked') { e.revIt.enabled = false; e.revIt = null; } }
  // keys
  if (I.hit('KeyM')) toggleMap(); if (I.hit('Tab')) toggleLB(); if (I.hit('Backspace')) dropCurrent(); if (I.hit('Escape') && BR.shopOpen) closeShop();
  if (BR.shopOpen && BR.shopOpen.pos.distanceTo(P.pos) > 4) closeShop();
  buildTick(dt); useTick(dt);
  // sync my entity
  const me = BR.me; if (me.st === 'alive' || me.st === 'knocked' || me.st === 'air' || me.st === 'heli') { me.x = P.pos.x; me.y = P.pos.y; me.z = P.pos.z; me.yaw = P.yaw; me.hp = P.brKnocked ? 0 : P.hp; me.sh = P.armor || 0; me.knock = P.brKnocked ? P.hp : 0; me.guns = INV.slots.filter(id => id && !SP.WEAP[id].item && id !== 'knife').map(id => ({ id, mag: P.inv[id].mag, res: P.inv[id].res })); }
  // vendor nameplates
  for (const v of BR.vendors) { const d = v.pos.distanceTo(P.pos); if (d < 70 && !v.mk && !v.hired) v.mk = G.marker(() => v.pos.clone().add(V3(0, 2.3, 0)), v.arms ? 'ARMS DEALER' : 'MERCENARY', 'tag'); else if ((d > 80 || v.hired) && v.mk) { G.removeMarker(v.mk); v.mk = null; } }
  if (BR.spectating) specTick(dt);
  BR.net && BR.net.tick && BR.net.tick(dt);
  hudTick(false, dt);
}
function toggleMap(on) { const el = $('#brmapov'); el.hidden = on != null ? !on : !el.hidden; if (!el.hidden) drawMap($('#brmapcv'), true); }
function toggleLB(on) { const el = $('#brlb'); el.hidden = on != null ? !on : !el.hidden; if (!el.hidden) $('#brlb .in').innerHTML = lbHTML(); }
BR.toggleMap = toggleMap; BR.toggleLB = toggleLB;

/* =============================== DEATH, SPECTATE, END =============================== */
function onMyDeath() {
  const me = BR.me; if (me.st !== 'dead') { me.st = 'dead'; feed('YOU were eliminated', 'red'); BR.net && BR.net.event && BR.net.event({ t: 'dead', id: me.id, by: -1 }); }
  $('#brknock').hidden = true; checkTeam(BR.myTeam); if (BR.over) return;
  // spectate a teammate
  const mate = BR.ents.find(e => e.team === BR.myTeam && !e.me && (e.st === 'alive' || e.st === 'knocked'));
  if (mate) { BR.spectating = true; BR.specEnt = mate; if (!mate.u) spawnUnit(mate); SP.P.mode = 'locked'; SP.blurTarget = 0; SP.post.U.damage.value = 0; $('#brspec').hidden = false; $('#brspec b').textContent = 'SPECTATING ' + mate.name; SP.state = 'play'; }
}
function specTick(dt) {
  let e = BR.specEnt; if (!e || e.st === 'dead' || !e.u) { e = BR.specEnt = BR.ents.find(x => x.team === BR.myTeam && !x.me && (x.st === 'alive' || x.st === 'knocked')); if (!e) { BR.spectating = false; return; } if (!e.u) spawnUnit(e); $('#brspec b').textContent = 'SPECTATING ' + e.name; }
  const P = SP.P, u = e.u; const back = V3(Math.sin(u.yaw), 0, Math.cos(u.yaw)); P.pos.lerp(u.pos.clone().addScaledVector(back, 3.2).add(V3(0, 0.6, 0)), Math.min(1, dt * 6)); P.yaw = SP.damp(P.yaw, u.yaw, 5, dt); P.pitch = -0.15; P.eye = 1.62;
}
function endMatch(win) {
  if (BR.over) return; BR.over = true; const tm = BR.teams[BR.myTeam]; const place = win ? 1 : tm.place || BR.teams.filter(t => !t.out).length + 1; BR.place = place;
  const kills = BR.myKills; const coins = kills * 40 + Math.max(0, 51 - place) * 10 + (win ? 1000 : 0);
  SP.Progress.coins += coins; SP.Progress.save();
  LB.games++; LB.kills += kills; if (win) LB.wins++; LB.best = Math.min(LB.best || 99, place);
  LB.hist.unshift({ place, kills, team: tm.country, flag: tm.flag, squadKills: tm.kills, d: Date.now() }); LB.hist = LB.hist.slice(0, 30); saveLB();
  F().stat && F().stat('brGames'); if (win) F().stat && F().stat('brWins');
  BR.net && BR.net.event && BR.net.role === 'host' && BR.net.event({ t: 'end', winner: win ? BR.myTeam : BR.teams.find(t => !t.out)?.id });
  setTimeout(() => showResults(win, place, coins), win ? 2500 : 1200);
  if (win) { G.hud.feed('#1 · LAST SQUAD STANDING', 'gold'); A.click(880, 0.3); setTimeout(() => A.click(1320, 0.3), 200); }
}
function showResults(win, place, coins) {
  const tm = BR.teams[BR.myTeam]; BR.on = false; SP.onTick = null; $('#brx').hidden = true; toggleMap(false); toggleLB(false); closeShop(); $('#brspec').hidden = true;
  $('#bre-title').textContent = win ? '#1 · LAST SQUAD STANDING' : '#' + place + ' OF 50';
  $('#bre-sub').textContent = tm.flag + ' TEAM ' + tm.country.toUpperCase() + (win ? ' won the match on Isla Corona.' : ' was eliminated.');
  const mates = BR.ents.filter(e => e.team === BR.myTeam);
  $('#bre-stats').innerHTML = [['Placement', '#' + place], ['Your kills', BR.myKills], ['Squad kills', tm.kills], ['Coins', '+' + coins], ['Wins', LB.wins + ' / ' + LB.games], ['Best', '#' + LB.best]].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  $('#bre-squad').innerHTML = mates.map(e => `<div class="brh"><b>${e.me ? 'YOU' : e.name}</b><span>${e.kills} kills</span><span>${e.st === 'dead' ? 'eliminated' : 'survived'}</span></div>`).join('');
  $('#bre-lb').innerHTML = lbHTML();
  SP.Input.unlock && SP.Input.unlock(); SP.showScreen('brend2');
  BR.net && BR.net.close && setTimeout(() => BR.net.close(), 4000);
}
BR.endMatch = endMatch; BR.showResults = showResults;

/* =============================== START / CLEANUP =============================== */
BR.start = function (opt = {}) {
  BR.net = opt.net || null; newMatch(opt); if (opt.applyTeams) opt.applyTeams(BR);
  SP.Audio.init && SP.Audio.init(); return SP.loadMode(brPart({ seed: BR.seed, env: opt.env }));
};
BR.cleanup = function () { document.body.classList.remove('inheli', 'building'); SP.noPauseSim = false; SP.noStreaks = false; const lb = $('#armbar .lb'); if (lb) lb.textContent = 'ARMOUR'; document.body.classList.remove('brmode'); BR.on = false; BR.spectating = false; SP.brOrder = null; SP.noRegen = false; BUILD.on = false; BR.using = null; $('#brx') && ($('#brx').hidden = true); ['#brmapov', '#brlb', '#brshop', '#brspec', '#brknock', '#bruse'].forEach(s => { const el = $(s); if (el) el.hidden = true; }); const mm = $('#minimap'); if (mm) mm.style.visibility = ''; };
const tdBase = SP.teardownPart; SP.teardownPart = function () { BR.cleanup(); return tdBase && tdBase.apply(this, arguments); };
const opl = SP.Features && SP.Features.onPartLoad;
if (SP.Features) SP.Features.onPartLoad = function (part) { if (part.map !== 'br2') BR.cleanup(); return opl && opl.apply(this, arguments); };

/* =============================== UI WIRING =============================== */
function wire() {
  $('#brmapov').addEventListener('click', e => { const cv = $('#brmapcv'); const r = cv.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width - 0.5) * 2400, z = ((e.clientY - r.top) / r.height - 0.5) * 2400; if (e.target === cv) { BR.ping = { x, z }; if (BR.pingMk) G.removeMarker(BR.pingMk); BR.pingMk = G.marker(() => V3(x, SP.W.heightAt(x, z) + 3, z), 'PING', 'obj'); drawMap(cv, true); } else toggleMap(false); });
  $('#brshop .x').addEventListener('click', closeShop);
  $('#bre-again').addEventListener('click', () => { SP.teardownPart(); SP.openBRLobby && SP.openBRLobby(); });
  $('#bre-menu').addEventListener('click', () => { SP.teardownPart(); SP.showScreen('title'); });
  $('#brspec .leave').addEventListener('click', () => { if (!BR.over) { BR.teams[BR.myTeam].place = BR.teams.filter(t => !t.out).length; BR.teams[BR.myTeam].out = true; endMatch(false); } });
  const tb = (id, fn) => { const el = $(id); if (!el) return; el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); el.addEventListener('click', e => { e.preventDefault(); fn(); }); };
  tb('#t-build', () => toggleBuild(!BUILD.on)); tb('#t-place', () => { BUILD.tap = true; }); tb('#t-piece', () => { BUILD.piece = PIECES[(PIECES.indexOf(BUILD.piece) + 1) % 3]; hudTick(true); }); tb('#t-mat', () => { BUILD.mat = MATS[(MATS.indexOf(BUILD.mat) + 1) % 3]; hudTick(true); });
  tb('#t-map', () => toggleMap()); tb('#t-lb', () => toggleLB()); tb('#t-skyjump', () => { BR.tapJump = true; }); tb('#t-drop', dropCurrent);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
BR.brPart = brPart; BR.ITEMS = ITEMS; BR.TEAMS = TEAMS; BR.PER = PER; BR.spawnUnit = spawnUnit; BR.openChest = openChest; BR.takePile = takePile; BR.zoneInit = zoneInit; BR.makeHelis = makeHelis; BR.heliPos = heliPos; BR.hudTick = hudTick; BR.lbHTML = lbHTML;
})();

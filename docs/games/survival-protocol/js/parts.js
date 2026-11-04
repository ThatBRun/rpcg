/* Survival Protocol — Chapter 1, parts 1–10 */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp, lerp, damp } = SP;
const G = SP.G, A = SP.Audio, I = SP.Input;
const PARTS = SP.PARTS = [];
const FORM = [[0, 0], [-3, 3], [3, 3.5], [-6, 7], [5, 7.5], [-2, 10], [7, 12], [-7, 13], [2, 15]];
const NAMES = ['SGT. HOUSER', 'CPL. RAMIREZ', 'PVT. DAWSON', 'OKAFOR', 'DOC LEE', 'PVT. HALE', 'PVT. BROOKS', 'PVT. VEGA', 'PVT. MITCHELL'];
SP.NAMES = NAMES;
const H = 'SGT. HOUSER', RAM = 'CPL. RAMIREZ', DAW = 'PVT. DAWSON', OKA = 'OKAFOR', DOC = 'DOC LEE', JAKE = 'JAKE', JACK = 'THE JACKAL';
const at = (x, z, W) => V3(x, W.heightAt(x, z), z);
function spawnSquad(c, W, names, cx, cz, yaw = 0) {
  names.forEach((n, i) => { const f = FORM[i % FORM.length]; const off = V3(f[0], 0, f[1]).applyAxisAngle(V3(0, 1, 0), yaw); c.ally(n, { pos: at(cx + off.x, cz + off.z, W), yaw }); });
  return c.squad;
}
function followLeader(c, leader, names) { names.forEach((n, i) => { const u = c.squad[n]; if (!u || u === leader || u.dead) return; u.behavior = 'follow'; u.follow = leader; const f = FORM[(i) % FORM.length]; u.offset = V3(f[0], 0, f[1]); u.cover = null; u.inCover = false; }); }
function followPlayer(c, names, spread = 1) { names.forEach((n, i) => { const u = c.squad[n]; if (!u || u.dead) return; u.behavior = 'follow'; u.follow = 'player'; u.offset = V3((i % 2 ? 1.6 : -1.6) * spread, 0, 2.6 + Math.floor(i / 2) * 2.2); u.cover = null; u.inCover = false; }); }
async function lead(c, u, pts, gap = 16, run = false) {
  for (const p of pts) { let arrived = false; u.moveTo(p, run).then(() => { arrived = true; }); await c.until(() => { u.hold = SP.P.pos.distanceTo(u.pos) > gap && SP.P.pos.z > u.pos.z - 2; return arrived; }); }
  u.hold = false;
}
function toCover(u, cover, peek, crouch = true) { u.behavior = 'cover'; u.cover = cover.clone(); u.peek = peek ? peek.clone() : null; u.crouchCover = crouch; u.inCover = false; u.goal = null; u.phase = 'hide'; u.t = rand(0.5, 2); }
function corpse(c, pos, look) { const u = c.foe({ pos, look }); u.die(false); u.rig.dead = 1; return u; }
SP.partsUtil = { spawnSquad, followLeader, followPlayer, lead, toCover, corpse, at, FORM };

/* ======================= PART 1 — INBOUND ======================= */
PARTS.push({
  name: 'Inbound', act: 'The Drop', map: 'heli', env: 'dusk2', place: 'Over the Sahara, Algeria', time: '18:31 LOCAL', loadout: [],
  setup(c, W, P) {
    P.mode = 'seat'; P.pos.set(0.15, 140, 2.1); P.eye = 1.12; P.yaw = 0; P.pitch = -0.05; P.lookLimit = { yaw: 0, yawR: 1.9, pMin: -0.6, pMax: 0.5 };
    const seat = (n, x, z, yaw) => { const u = c.ally(n, { pos: V3(x, 140, z), yaw, stance: 'sit' }); u.fixedY = true; u.pose = 'relaxed'; return u; };
    seat(H, 0, -2.0, Math.PI); seat(RAM, -0.9, -2.0, Math.PI); seat(DAW, 0.9, -2.0, Math.PI);
    seat(OKA, -0.95, -0.6, -Math.PI / 2); seat(DOC, -0.95, 0.4, -Math.PI / 2); seat('PVT. HALE', -0.95, 1.4, -Math.PI / 2);
    seat('PVT. BROOKS', -0.9, 2.1, 0); seat('PVT. VEGA', 0.9, 2.1, 0);
    SP.post.U.blur.value = 1; SP.blurTarget = 0.9; SP.lbTarget = 1;
  },
  async run(c, W, P) {
    A.loop('rotor', 'rotor', 0.9); A.loop('wind', 'wind', 0.05);
    const cab = SP.cabin; const speed = 32; let hb = 0, t = 0;
    SP.onTick = dt => {
      t += dt; const dz = -speed * dt; cab.position.z += dz; P.pos.z += dz; for (const u of G.units) u.pos.z += dz;
      cab.rotation.z = Math.sin(t * 0.7) * 0.012; G.trauma = Math.max(G.trauma, 0.12);
      hb -= dt; if (hb <= 0) { hb = SP.hbRate || 1.0; A.heartbeat(0.55); }
      const h = c.squad[H]; if (h) { h.pos.z = lerp(h.pos.z, cab.position.z - 2.0 + (SP.lean || 0) * 0.9, 0.08); }
    };
    await c.wait(2.5);
    await c.say(RAM + ' (RADIO)', 'Command confirms one hostage inside. Hostile count unknown. That base has been dark for years.', 5, true);
    await c.say(RAM + ' (RADIO)', 'Two minutes to the drop.', 2.6, true);
    SP.blurTarget = 0.35; SP.lean = 1; SP.hbRate = 0.85; P.camAnim = { yaw: 0, pitch: -0.08, k: 1.5 };
    await c.wait(1.4); P.camAnim = null;
    await c.say(H, 'Hey, you alright?', 2.4);
    G.hud.sub(H, 'Hey, you alright?');
    const choice = await new Promise(res => { const el = document.getElementById('choices'); el.hidden = false; const pick = n => { el.hidden = true; SP.onChoice = null; A.click(700, 0.1); res(n); }; SP.onChoice = pick; document.getElementById('ch1').onclick = () => pick(1); document.getElementById('ch2').onclick = () => pick(2); });
    SP.save.choice = choice; SP.persist(); G.hud.hideSub();
    if (choice === 1) { await c.say(JAKE, "Yeah, I'm all good.", 2.2); await c.say(H, "Good. We can't let you die down there if there are shots fired.", 4.4); }
    else { await c.say(JAKE, 'No... why?', 2); await c.say(H, "It's alright. Just keep your head up, we need you in this.", 4.4); }
    SP.lean = 0; SP.blurTarget = 0.5; P.camAnim = { yaw: -Math.PI / 2 + 0.15, pitch: -0.12, k: 1.0 }; P.lookLimit = null;
    await c.wait(5.5);
    SP.blurTarget = 1; SP.hbRate = 0.6; await c.fade(1, 2.2);
    c.complete();
  },
});
SP.onKeyChoice = code => { if (SP.onChoice && (code === 'Digit1' || code === 'Numpad1')) SP.onChoice(1); if (SP.onChoice && (code === 'Digit2' || code === 'Numpad2')) SP.onChoice(2); };

/* ======================= PART 2 — HALF A MILE ======================= */
PARTS.push({
  name: 'Half a Mile', act: 'The Drop', map: 'desert', env: 'dusk', place: 'Tassili Desert, Algeria', time: '18:44 LOCAL', loadout: ['m4', 'pistol'],
  setup(c, W, P) { P.pos.copy(at(1.5, 30, W)); spawnSquad(c, W, NAMES, 0, 20); followLeader(c, c.squad[H], NAMES); SP.post.U.blur.value = 0.8; SP.blurTarget = 0; },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.08);
    const h = c.squad[H]; c.obj('Follow Sgt. Houser', () => h.pos, 'HOUSER');
    await c.wait(1.5);
    await c.say(H, 'On me. Stay close, eyes on the rooftops.', 3.2);
    const walk = lead(c, h, [V3(-1, 0, -10), V3(-2, 0, -40), V3(3, 0, -75), V3(0, 0, -98)], 18);
    await c.wait(6); await c.say(DAW, "Half a mile in this heat. I'm gonna melt before we get there.", 3.8);
    await c.wait(0.8); await c.say(H, 'Then melt quietly, Dawson.', 2.6);
    await c.wait(5); await c.say(RAM, 'Command says the base went dark in 2009. Nobody\'s supposed to be out here.', 4.2);
    await c.wait(4); await c.say(OKA, 'Village ahead. Looks empty.', 2.6); await c.wait(0.6); await c.say(H, 'Looks. Keep your spacing.', 2.4);
    await walk; await c.near(() => h.pos, 12);
    c.complete();
  },
});

/* ======================= PART 3 — AMBUSH ======================= */
const SPOTS = [ // [cover x,z, peek x,z, crouch, roofY]
  [-22, -147.2, -22, -147.2, true, 'roof0'], [-21.3, -148.8, -22, -145.4, false], [6.4, -136.6, 6.4, -136.6, true], [-7.4, -139.2, -7.4, -139.2, true],
  [18, -155.2, 18, -155.2, true, 'roof1'], [30, -141.2, 31.9, -141.0, false], [36, -132.7, 36, -132.7, true], [-4, -179.2, -4, -179.2, true, 'roof2'],
];
function roofY(W, name) { const hs = SP.houses; const i = { roof0: 0, roof1: 1, roof2: 2 }[name]; const h = hs[i]; return h.base + h.h + 0.28; }
PARTS.push({
  name: 'Ambush', act: 'The Drop', map: 'desert', env: 'dusk', place: 'Village outskirts, Tassili Desert', time: '18:52 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'Stay behind the crates and pop out to shoot. Your health comes back after a few seconds out of fire.',
  setup(c, W, P) {
    P.pos.copy(at(1.5, -90, W)); spawnSquad(c, W, NAMES, 0, -98); c.squad['PVT. HALE'].invuln = false; c.squad['PVT. HALE'].hp = 1;
    followLeader(c, c.squad[H], NAMES);
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.08); A.loop('drone', 'drone', 0.25);
    const h = c.squad[H]; c.obj('Follow Sgt. Houser', () => h.pos, 'HOUSER');
    await lead(c, h, [V3(0, 0, -104)], 14);
    // the first shot
    const hale = c.squad['PVT. HALE']; A.gun('ak', V3(-22, 5, -147), 1.2); G.tracer(V3(-22, 4.4, -147), hale.pos.clone().add(V3(0, 1.4, 0)), [9, 3, 1]); hale.die(false); G.addTrauma(0.3);
    const foes = SPOTS.map(s => { const y = s[5] ? roofY(W, s[5]) : W.heightAt(s[0], s[1]); const u = c.foe({ pos: V3(s[0], y, s[1]), cover: V3(s[0], y, s[1]), peek: V3(s[2], y, s[3]), crouchCover: s[4], behavior: 'cover', alert: 1 }); u.inCover = true; if (s[5]) u.fixedY = true; return u; });
    const covers = SP.coverSpots; const order = [3, 4, 2, 5, 1, 6, 0, 7];
    NAMES.filter(n => n !== 'PVT. HALE').forEach((n, i) => { const u = c.squad[n]; const cv = covers[order[i % 8]].clone(); cv.x += i >= 8 ? 1 : 0; cv.y = W.heightAt(cv.x, cv.z); toCover(u, cv, V3(cv.x, cv.y, cv.z - 1.1), true); });
    c.obj('Take cover and return fire');
    await c.say(H, 'Contact! Hale is down! Get to cover!', 2.8);
    await c.wait(2.5); await c.say(H, 'Shooters on the rooftops and behind that buggy! Sarton, return fire!', 3.6);
    await c.until(() => foes.filter(f => !f.dead).length <= 3);
    // reinforcements by buggy
    c.say(DAW, 'Buggy coming in on the left! Three more!', 3);
    const bug = SP.Models.buggy(0x4e4030); const veh = new SP.Vehicle(bug, { team: 'foe', hp: 300, speed: 16, curve: new T.CatmullRomCurve3([V3(-160, 0, -175), V3(-90, 0, -150), V3(-50, 0, -138), V3(-34, 0, -135)]) });
    A.loop('eng', 'engine', 0.1);
    await c.until(() => veh.u >= 1 || veh.dead); A.stopLoop('eng'); veh.spd = 0;
    const w2 = [[-40, -131.6], [-27.5, -128.6], [-24, -144.6]].map(([x, z], i) => { const u = c.foe({ pos: at(-34 + i, -133, W), cover: at(x, z, W), peek: at(x + (i === 2 ? -3 : 0), z, W), crouchCover: i < 2, behavior: 'cover', alert: 1 }); return u; });
    W.colliderFrom(bug, 'metal', 0.3);
    await c.allDead(foes.concat(w2));
    await c.wait(1); await c.say(H, 'Clear! Hold your fire!', 2.2);
    c.complete();
  },
});

/* ======================= PART 4 — CONTRABAND ======================= */
PARTS.push({
  name: 'Contraband', act: 'The Drop', map: 'desert', env: 'dusk', place: 'Village, Tassili Desert', time: '19:03 LOCAL', loadout: ['m4', 'pistol'],
  setup(c, W, P) {
    P.pos.copy(at(0, -122, W)); P.yaw = 0;
    spawnSquad(c, W, NAMES.filter(n => n !== 'PVT. HALE'), -2, -118);
    const body = corpse(c, at(-6, -135.5, W)); corpse(c, at(9, -137, W)); corpse(c, at(-20, -146, W)); corpse(c, at(30, -142, W)); corpse(c, at(4, -102, W), { faction: 'us' });
    c.body = body;
    // stash house props
    const sh = SP.houses[5]; const b = sh.base + 0.18; SP.build.crate(W, sh.x + 4, sh.z - 2.5, 1.0, 1, 0, b); SP.build.crate(W, sh.x + 4, sh.z - 1.3, 1.0, 2, 0, b);
    W.box(2.2, 0.8, 1.0, sh.x - 2, b, sh.z - 1.5, SP.mat('wood', { color: 0x6a4a30 }), { uv: 1 });
    for (let i = 0; i < 20; i++) { const p = SP.Models.drugPack(); p.position.set(sh.x + rand(1.8, 4.6), b + (i < 10 ? 1.0 : 2.0) + 0.04, sh.z + rand(-3.0, -0.8)); p.rotation.y = rand(0, 3); W.scene.add(p); }
    const mp = new T.Mesh(new T.PlaneGeometry(0.8, 0.6), SP.flat(0xcdbf98, 0.9)); mp.rotation.x = -Math.PI / 2; mp.position.set(sh.x - 2, b + 0.81, sh.z - 1.5); W.scene.add(mp); c.mapMesh = mp;
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.08);
    const h = c.squad[H]; h.behavior = 'idle'; h.lookAt = P.pos;
    NAMES.forEach(n => { const u = c.squad[n]; if (u && u !== h) { u.behavior = 'idle'; u.stance = Math.random() < 0.5 ? 'kneel' : null; } });
    await c.say(H, "Sarton, check the bodies. I want to know who these guys are.", 3.6);
    c.obj('Search the fallen attacker', () => c.body.pos, 'SEARCH');
    await new Promise(res => G.addInteract({ pos: () => c.body.pos, text: 'Search the body', hold: 1.4, onUse: res }));
    G.hud.feed('FOUND · 3 PACKETS, PLASTIC-WRAPPED', 'gold');
    await c.say(JAKE, 'Plastic-wrapped packets. Three of them. Drugs.', 3);
    c.obj('Report to Sgt. Houser', () => h.pos, 'HOUSER');
    await new Promise(res => G.addInteract({ pos: () => h.pos, text: 'Report to Sgt. Houser', onUse: res }));
    await c.say(JAKE, 'Sarge. Drugs on one of them, packed for shipping.', 3);
    await c.say(H, "Drugs, out here? This isn't just a kidnapping.", 3.2);
    await c.say(RAM + ' (RADIO)', 'Command copies. They want the village swept before we move on.', 3.6, true);
    await c.say(H, 'Dawson, Okafor, go with Sarton. Clear those houses.', 3);
    followPlayer(c, [DAW, OKA]);
    const hs = SP.houses; const targets = [2, 4, 5];
    const inside = [];
    const put = (hi, dx, dz, look) => { const hh = hs[hi]; const u = c.foe({ pos: V3(hh.x + dx, hh.base + 0.18, hh.z + dz), behavior: 'hold', alert: 0, sight: 30 }); u.aware = false; u.lookAt = V3(hh.x + (look || 0), 0, hh.z + 10); inside.push(u); return u; };
    put(2, -3, -1); put(2, 3.5, 1.5); put(4, -3, 1); put(4, 4, -1.5, 20); put(5, -4, 1.5); put(5, 1, -2.5); put(5, -1, 2.8);
    SP.onAlert = () => { inside.forEach(u => { if (!u.dead) { u.aware = true; } }); };
    c.obj('Clear the houses (3)', () => { const n = targets.find(i => inside.some(u => !u.dead && Math.hypot(u.pos.x - hs[i].x, u.pos.z - hs[i].z) < 8)); return n != null ? V3(hs[n].x, hs[n].base, hs[n].z) : null; }, 'CLEAR');
    let cleared = -1;
    SP.onTick = () => { const left = targets.filter(i => inside.some(u => !u.dead && Math.hypot(u.pos.x - hs[i].x, u.pos.z - hs[i].z) < 9)).length; if (left !== cleared) { cleared = left; G.hud.objective('Clear the houses (' + left + ' left)'); } };
    await c.allDead(inside); SP.onTick = null;
    await c.say(DAW, 'Last room clear!', 1.8);
    const sh = hs[5]; c.obj('Search the stash house', V3(sh.x, sh.base, sh.z), 'SEARCH');
    await new Promise(res => G.addInteract({ pos: V3(sh.x + 3, sh.base, sh.z - 2), text: 'Search the stash', hold: 1.2, onUse: res }));
    await c.say(OKA, "Look at all this. That's not personal use. That's a supply line.", 3.4);
    c.obj('Take the map', () => c.mapMesh.position, 'MAP');
    await new Promise(res => G.addInteract({ pos: () => c.mapMesh.position, text: 'Take the map', hold: 1.0, onUse: res }));
    c.mapMesh.visible = false; G.hud.feed('INTEL · HAND-DRAWN MAP OF THE BASE', 'gold');
    await c.say(JAKE, "It's the base. They marked a drainage outlet on the south wall.", 3.4);
    // the runner
    const runner = c.foe({ pos: at(-40, -215, W), alert: 1, weapon: 'ak', holdFire: true, runSpeed: 6.5 }); runner.invuln = true;
    c.obj('Stop the runner', () => runner.pos, 'RUNNER');
    await c.say(DAW, 'Runner! Back of the village!', 2);
    await runner.moveTo(at(-30, -170, W), true);
    runner.remove(); const bm = SP.buggyB; const veh = new SP.Vehicle(bm, { team: 'foe', hp: 9999, speed: 18, curve: new T.CatmullRomCurve3([bm.position.clone(), V3(-60, 0, -190), V3(-100, 0, -240), V3(-160, 0, -300)]) });
    A.loop('eng', 'engine', 0.12);
    await c.say(H, "He's going to warn them. Dawson, get the buggy running. Sarton, on the gun!", 4);
    await c.wait(1.5);
    c.complete();
  },
});

/* ======================= PART 5 — DUNE RUN ======================= */
const RUN = [[-28, -172], [-70, -215], [-140, -275], [-205, -360], [-230, -460], [-180, -560], [-110, -640], [-40, -715], [20, -790]];
PARTS.push({
  name: 'Dune Run', act: 'The Drop', map: 'desert', env: 'dusk2', place: 'Erg dunes, Tassili Desert', time: '19:11 LOCAL', loadout: [],
  deathTip: 'Shoot the drivers and gunners first. The gun cools down when you stop firing.',
  setup(c, W, P) {
    const curve = new T.CatmullRomCurve3(RUN.map(([x, z]) => V3(x, 0, z))); c.curve = curve;
    const bug = SP.Models.buggy(0x6b5a3e); const veh = new SP.Vehicle(bug, { team: 'ally', hp: 1e9, speed: 0, curve }); c.veh = veh; veh.update(0);
    const gun = SP.Models.fiftyCal(); gun.position.set(0, 2.25, 0.5); bug.add(gun); c.gun = gun;
    const anchor = new T.Object3D(); anchor.position.set(0, 2.35, 1.15); bug.add(anchor);
    P.mode = 'turret'; P.turret = { anchor, rpm: 520, dmg: 80, vehDmg: 45, sound: 'fifty', muzzleWorld: () => { gun.updateMatrixWorld(true); return gun.localToWorld(gun.userData.muzzle.clone()); }, onFire: () => { gun.rotation.x = -0.02; } };
    P.turretName = 'M2 .50 CAL'; P.eye = 0; SP.buildTurretVM(); P.updAmmo();
    const daw = c.ally(DAW, { pos: V3(), stance: 'sit' }); daw.fixedY = true; daw.holdFire = true; c.driver = daw;
    // second squad buggy behind
    const b2 = SP.Models.buggy(0x5c4a35); c.veh2 = new SP.Vehicle(b2, { team: 'ally', hp: 1e9, speed: 0, curve, u: 0 });
    const hs = c.ally(H, { pos: V3(), stance: 'sit' }); hs.fixedY = true; c.h2 = hs;
    // runner ahead
    const rb = SP.Models.buggy(0x4e4030); c.runner = new SP.Vehicle(rb, { team: 'foe', hp: 1e9, speed: 0, curve, u: 0.06 });
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.15); A.loop('eng', 'engine', 0.16);
    const veh = c.veh; const len = c.curve.getLength();
    veh.spd = 17; c.veh2.u = 0; c.runner.spd = 18;
    const enemies = [];
    const spawnChaser = (side, lag, kind) => {
      const pts = RUN.map(([x, z], i) => { const a = c.curve.getTangentAt(Math.min(1, i / (RUN.length - 1))); const n = V3(-a.z, 0, a.x).normalize(); return V3(x + n.x * side, 0, z + n.z * side); });
      const cv = new T.CatmullRomCurve3(pts); const mesh = kind === 'tech' ? SP.Models.technical(SP.pick([0xd8d2c4, 0x9a8a6a, 0x7a3a28])) : SP.Models.buggy(0x3e3428);
      const v = new SP.Vehicle(mesh, { team: 'foe', hp: kind === 'tech' ? 320 : 200, speed: 0, curve: cv, u: Math.max(0, veh.u - lag) });
      v.mesh.visible = true; v.catchUp = true;
      const gunner = c.foe({ pos: v.mesh.position.clone(), alert: 1, behavior: 'hold', acc: 0.75, weapon: 'ak' }); gunner.fixedY = true; v.gunner = gunner; gunner.ride = v;
      enemies.push(v); return v;
    };
    let t = 0;
    SP.onTick = dt => {
      t += dt; const p = veh.mesh.position; const yaw = veh.mesh.rotation.y;
      c.driver.pos.copy(veh.mesh.localToWorld(V3(-0.4, 0.55, 0.15))); c.driver.yaw = yaw;
      c.veh2.u = Math.max(0, veh.u - 28 / len); c.veh2.spd = 0; c.veh2.mesh.position.copy(c.curve.getPointAt(c.veh2.u)); c.veh2.mesh.position.y = W.heightAt(c.veh2.mesh.position.x, c.veh2.mesh.position.z); c.veh2.mesh.rotation.y = yaw;
      c.h2.pos.copy(c.veh2.mesh.localToWorld(V3(0.4, 0.55, 0.15))); c.h2.yaw = yaw;
      c.runner.u = Math.min(0.995, Math.max(c.runner.u, veh.u + 55 / len));
      G.trauma = Math.max(G.trauma, 0.1 + Math.abs(veh.mesh.rotation.x) * 0.4);
      for (const v of enemies) {
        if (v.dead) continue; const target = veh.u + (v.side || 0); if (v.u < veh.u - 12 / len) v.spd = 22; else if (v.u > veh.u + 10 / len) v.spd = 14; else v.spd = 17.5;
        if (v.gunner && !v.gunner.dead) { v.gunner.pos.copy(v.mesh.localToWorld(v.mesh.userData.gun ? V3(0, 1.3, 1.6) : V3(0.4, 0.55, 0.15))); }
      }
      if (A.engineOsc) A.engineOsc.frequency.value = 50 + veh.spd * 2.4;
    };
    await c.say(DAW, 'Hold on to something!', 2);
    c.obj('Stop the technicals chasing the squad');
    await c.wait(4); spawnChaser(28, 0.04, 'tech'); await c.say(H + ' (RADIO)', 'Technical on your right flank!', 2.6, true);
    await c.wait(9); spawnChaser(-30, 0.05, 'buggy'); spawnChaser(-45, 0.08, 'tech');
    await c.say(DAW, 'Two more, left side! Light \'em up, Sarton!', 3);
    await c.wait(14); spawnChaser(32, 0.04, 'tech'); spawnChaser(-26, 0.02, 'buggy');
    await c.until(() => enemies.every(v => v.dead) || veh.u > 0.93);
    await c.until(() => veh.u > 0.9);
    // runner flips
    c.runner.spd = 0; const rb = c.runner.mesh; let k = 0; A.explosion(rb.position, 0.6);
    await c.until(() => { k += 0.02; rb.rotation.z = Math.min(Math.PI * 0.9, k * 3); rb.position.y += Math.sin(k * 4) * 0.05; return k > 0.5; });
    veh.spd = 0; c.veh2.spd = 0;
    await c.say(DAW, "He flipped it! He's done!", 2.4);
    G.hud.sub(null, '[radio static] ... ' + 'الرجال قادمون' + ' ...', true); await c.wait(2.6);
    await c.say(RAM + ' (RADIO)', "His radio's still live. Somebody at the base just answered him.", 3.6, true);
    await c.say(H + ' (RADIO)', "Then they know we're coming. Ditch the buggies behind that ridge. We go in on foot after dark.", 4.6, true);
    await c.fade(1, 1.6); c.complete();
  },
});

/* ======================= PART 6 — OVERWATCH ======================= */
function baseGuards(c, W) { // sentries used in parts 6–7
  const g = [];
  const tw = SP.towers[4]; const t1 = c.foe({ pos: tw.top.clone(), behavior: 'hold', alert: 0, look: { head: 'shemagh' } }); t1.fixedY = true; t1.aware = false; t1.lookAt = V3(14, 0, 200); t1.tagName = 'TOWER'; g.push(t1);
  const tw2 = SP.towers[1]; const t2 = c.foe({ pos: tw2.top.clone(), behavior: 'hold', alert: 0 }); t2.fixedY = true; t2.aware = false; t2.lookAt = V3(80, 0, 200); g.push(t2);
  const pa = c.foe({ pos: V3(-10, 0, 96), behavior: 'patrol', alert: 0, look: { head: 'beanie' } }); pa.aware = false; pa.path = [V3(-18, 0, 96), V3(40, 0, 98)]; g.push(pa);
  const pb = c.foe({ pos: V3(30, 0, 99), behavior: 'patrol', alert: 0 }); pb.aware = false; pb.path = [V3(45, 0, 100), V3(-12, 0, 97)]; pb.pi = 1; g.push(pb);
  const gate = c.foe({ pos: V3(4, 0, -86), behavior: 'hold', alert: 0 }); gate.aware = false; gate.lookAt = V3(4, 0, -200); g.push(gate);
  const f1 = c.foe({ pos: V3(17, 0, 13.2), behavior: 'idle', alert: 0, pose: 'relaxed' }); f1.aware = false; f1.lookAt = V3(18, 0, 12); g.push(f1);
  return g;
}
PARTS.push({
  name: 'Overwatch', act: 'The Forgotten Base', map: 'base', env: 'night', place: 'Ridge south of the base', time: '23:18 LOCAL', loadout: ['m4'],
  setup(c, W, P) {
    const r = SP.BASE.ridge; P.pos.copy(at(r.x, r.z, W)); P.yaw = 0; P.pitch = -0.04; P.mode = 'seat'; P.forceCrouch = true; P.eye = 0.75;
    const ok = c.ally(OKA, { pos: at(r.x - 1.8, r.z + 0.6, W), stance: 'kneel' }); ok.lookAt = V3(14, 0, 0);
    c.guards = baseGuards(c, W); c.guards.forEach(u => { u.ignored = true; });
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.06);
    const binoc = document.getElementById('binoc');
    let tags = 0; const need = 5;
    SP.onTick = dt => {
      if (SP.autoTest) { tags = need; if (c.lookOutlet) { const f = c.lookOutlet; c.lookOutlet = null; f(); } }
      P.binocMode = I.mouse.r; P.binoc = P.binocMode; binoc.hidden = !P.binoc; SP.hideVM(P.binoc);
      if (P.binoc && I.mouse.lp) {
        const f = P.forward(), o = P.eyePos(); let best = null, bd = 0.0009;
        for (const u of c.guards) { if (u.dead || u.tagged) continue; const to = V3(u.pos.x, u.pos.y + 1.4, u.pos.z).sub(o).normalize(); const d = 1 - to.dot(f); if (d < bd) { best = u; bd = d; } }
        if (best) { best.tagged = true; tags++; A.click(1600, 0.08); G.hud.feed('TARGET TAGGED (' + tags + '/' + need + ')', 'gold'); const u = best; u.markEl = G.marker(() => u.dead ? null : u.pos, '', 'tag').el; G.hud.objective('Tag the sentries with binoculars (' + Math.min(tags, need) + '/' + need + ')'); }
        if (c.lookOutlet) { const ol = SP.BASE.outlet; const to = V3(ol.x, W.heightAt(ol.x, ol.z) + 0.3, ol.z + 2).sub(o).normalize(); if (to.dot(f) > 0.9993) { c.lookOutlet(); c.lookOutlet = null; } }
      }
    };
    await c.wait(2);
    await c.say(OKA, "Generators running. Fresh tracks. Somebody lives here.", 3.2);
    c.obj('Tag the sentries with binoculars (0/' + need + ')');
    await c.say(OKA, 'Hold right mouse for the binos. Click to tag anyone you see.', 3.6);
    await c.until(() => tags >= need);
    await c.say(OKA, "That's all I can see from here. Six, maybe more inside.", 3.2);
    c.obj('Find the drainage outlet from the map', () => V3(SP.BASE.outlet.x, 0.5, SP.BASE.outlet.z + 2), 'OUTLET');
    await c.say(JAKE, "The map said south wall. Let me find it.", 2.6);
    await new Promise(res => { c.lookOutlet = res; });
    G.hud.feed('LOCATED · DRAINAGE OUTLET', 'gold');
    await c.say(JAKE, 'Got it. Storm drain, bottom of the south wall, right under that tower.', 3.6);
    await c.say(H + ' (RADIO)', "Good eyes. Here's the play: I take the main gate, loud, at your signal. Sarton, Doc and Mitchell go in through the drain. Okafor stays up there and covers you.", 7, true);
    await c.say(OKA, "I've got the tower guard. Move when you're ready.", 3);
    binoc.hidden = true; SP.hideVM(false); c.complete();
  },
});

/* ======================= PART 7 — SPLIT UP ======================= */
PARTS.push({
  name: 'Split Up', act: 'The Forgotten Base', map: 'base', env: 'night', place: 'South wall, the Forgotten Base', time: '23:41 LOCAL', loadout: ['sup', 'pistol'],
  deathTip: 'Stay crouched and out of the light. Take guards from behind with F.',
  setup(c, W, P) {
    P.pos.copy(at(14, 205, W)); P.yaw = 0;
    c.ally(DOC, { pos: at(12, 208, W), weapon: 'm4' }); c.ally('PVT. MITCHELL', { pos: at(16, 208, W) });
    [DOC, 'PVT. MITCHELL'].forEach(n => { c.squad[n].silent = true; c.squad[n].holdFire = true; });
    followPlayer(c, [DOC, 'PVT. MITCHELL']); c.squad[DOC].crouch = true;
    c.guards = baseGuards(c, W);
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.05);
    let alarm = false;
    const sq = [c.squad[DOC], c.squad['PVT. MITCHELL']];
    const raise = async () => { if (alarm) return; alarm = true; A.alarm(true); setTimeout(() => A.alarm(false), 9000); G.hud.feed('YOU HAVE BEEN SPOTTED', 'red'); sq.forEach(u => { u.holdFire = false; }); c.guards.forEach(u => { u.aware = true; u.alert = 1; }); for (let i = 0; i < 3; i++) { const u = c.foe({ pos: V3(50 + i * 2, 0, 92), behavior: 'assault', alert: 1 }); u.goal2 = V3(14, 0, 110); } await c.say(H + ' (RADIO)', "They're on to you! Push through, get in that drain!", 3.4, true); };
    SP.onAlert = (u) => { if (u.team === 'foe') raise(); };
    SP.onTick = () => { sq.forEach(u => u.crouch = P.crouch); };
    c.obj('Get to the drainage outlet', V3(SP.BASE.outlet.x, 0.5, SP.BASE.outlet.z + 2), 'OUTLET');
    await c.say(DOC, 'Stay low. Crouch keeps you quiet.', 2.6);
    await c.until(() => P.pos.z < 150);
    const tg = c.guards[0];
    if (!tg.dead) { await c.say(OKA + ' (RADIO)', 'Tower guard. Sending.', 1.6, true); A.gun('sup', null, 0.3); tg.die(true); G.hud.feed('OKAFOR · TOWER CLEAR', ''); }
    if (!alarm) await c.say(DOC, 'Patrol on the wall. Two of them. Take them quiet.', 3);
    c.obj('Deal with the wall patrol', () => { const a = [c.guards[2], c.guards[3]].find(u => !u.dead); return a ? a.pos : null; }, 'PATROL');
    await c.until(() => c.guards[2].dead && c.guards[3].dead && c.foes.filter(u => !u.dead && u.pos.z > 82).length === 0);
    await c.say(DOC, alarm ? 'Clear. Move, move!' : 'Clean. Nobody heard a thing.', 2.4);
    c.obj('Enter the drainage tunnel', V3(SP.BASE.outlet.x, 0.5, SP.BASE.outlet.z + 2), 'ENTER');
    await new Promise(res => G.addInteract({ pos: V3(SP.BASE.outlet.x, 0, SP.BASE.outlet.z + 2.5), radius: 3, text: 'Enter the drainage tunnel', onUse: res }));
    c.complete();
  },
});

/* ======================= PART 8 — THE TUNNEL ======================= */
PARTS.push({
  name: 'The Tunnel', act: 'The Forgotten Base', map: 'tunnel', env: 'tunnel', place: 'Storm drain under the base', time: '23:52 LOCAL', loadout: ['sup', 'pistol'],
  deathTip: 'Turn your flashlight off with T and crouch in the dark to stay hidden.',
  setup(c, W, P) {
    P.pos.set(0, 0, -1); P.yaw = 0;
    c.ally(DOC, { pos: V3(0.6, 0, 1.0) }); c.ally('PVT. MITCHELL', { pos: V3(-0.6, 0, 1.0) }); followPlayer(c, [DOC, 'PVT. MITCHELL'], 0.4);
    const fl = new T.SpotLight(0xfff1d8, 9, 30, 0.42, 0.55, 2); fl.castShadow = true; fl.shadow.mapSize.set(512, 512); fl.shadow.bias = -0.002; SP.camera.add(fl); fl.position.set(0.25, -0.2, 0); fl.target.position.set(0, -0.2, -5); SP.camera.add(fl.target); c.fl = fl; P.flash = true;
    const dead = corpse(c, V3(0.3, 0, -28)); dead.rig.root.rotation.y = 1.2;
  },
  async run(c, W, P) {
    A.loop('drip', 'drip', 0.03); A.loop('hum', 'hum', 0.02);
    const sq = [c.squad[DOC], c.squad['PVT. MITCHELL']]; sq.forEach(u => { u.silent = true; });
    let fl = 0; SP.onTick = dt => { if (I.hit('KeyT')) { P.flash = !P.flash; A.click(1100, 0.08); } c.fl.intensity = P.flash ? 9 : 0; fl += dt; SP.tunnelLights && SP.tunnelLights.forEach((l, i) => { l.intensity = (i === 3 ? 0.8 : 1.4) * (Math.random() < 0.02 ? 0.1 : 1); }); sq.forEach(u => u.crouch = P.crouch); };
    c.obj('Follow the tunnel', V3(12, 0, -50), 'TUNNEL');
    await c.say(DOC, 'Smells like nobody\'s been down here in years.', 2.8);
    await c.until(() => P.pos.z < -26 || P.pos.x > 2);
    await c.say(DOC, "Spoke too soon. One of theirs. Shot in the back... by his own people.", 3.6);
    await c.until(() => P.pos.x > 6);
    // patrol with flashlights
    const pts = [V3(24, 0, -88), V3(24, 0, -56), V3(14, 0, -50)];
    const pat = [0, 1].map(i => { const u = c.foe({ pos: V3(24, 0, -90 - i * 2.5), behavior: 'patrol', alert: 0, sight: 22, look: { head: 'beanie' } }); u.aware = false; u.path = pts; u.walkSpeed = 1.3; const l = new T.SpotLight(0xffe2b0, 6, 22, 0.4, 0.6, 2); l.position.set(0.15, 1.4, -0.3); u.rig.chest.add(l); l.target.position.set(0, 0.8, -6); u.rig.chest.add(l.target); u.light = l; return u; });
    c.obj('Get past the patrol', () => { const a = pat.find(u => !u.dead); return a ? a.pos : null; }, 'PATROL');
    await c.say(DOC, 'Lights ahead. Kill your flashlight and get down, or take them.', 3.2);
    SP.onAlert = u => { pat.forEach(x => { x.aware = true; }); sq.forEach(x => x.holdFire = false); };
    sq.forEach(u => u.holdFire = true);
    await c.until(() => pat.every(u => u.dead) || (P.pos.z < -86 && P.pos.x > 16));
    pat.forEach(u => { if (u.dead && u.light) u.light.intensity = 0; });
    c.obj('Climb out at the ladder', V3(11.2, 0, -92), 'LADDER');
    await new Promise(res => G.addInteract({ pos: V3(11.4, 0, -92), radius: 2.2, text: 'Climb the ladder', onUse: res }));
    await c.say(H + ' (RADIO)', 'Sarton, you in position?', 2, true);
    await c.say(JAKE, 'Under the manhole. Ready.', 2);
    c.complete();
  },
});

/* ======================= PART 9 — LOUD ENTRY ======================= */
function courtyardDefenders(c) {
  const spots = [[-8, -57.2, true], [8, -57.2, true], [-20, -65.2, true], [20, -65.2, true], [0, -47.2, true], [-32, -59, false], [28, -42, false], [-14, -40.6, true]];
  return spots.map(([x, z, cr]) => { const u = c.foe({ pos: V3(x, 0, z), cover: V3(x, 0, z), peek: V3(x, 0, z), crouchCover: cr, behavior: 'cover', alert: 1 }); u.inCover = true; u.lookAt = V3(x, 0, -120); return u; });
}
PARTS.push({
  name: 'Loud Entry', act: 'The Forgotten Base', map: 'base', env: 'night', place: 'Inside the walls', time: '00:04 LOCAL', loadout: ['m4', 'pistol'],
  setup(c, W, P) {
    const m = SP.BASE.manhole; P.pos.set(m.x, 0, m.z); P.yaw = Math.PI; P.yaw = 0;
    c.ally(DOC, { pos: V3(m.x + 1.2, 0, m.z + 1) }); c.ally('PVT. MITCHELL', { pos: V3(m.x - 1.2, 0, m.z + 1) }); followPlayer(c, [DOC, 'PVT. MITCHELL']);
    c.defs = courtyardDefenders(c);
    const tw = [SP.towers[2], SP.towers[3]].map(t => { const u = c.foe({ pos: t.top.clone(), behavior: 'hold', alert: 1 }); u.fixedY = true; return u; }); c.defs.push(...tw);
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.04);
    c.defs.forEach(u => { u.aware = false; u.holdFire = true; });
    await c.say(H + ' (RADIO)', 'Breaching in three... two...', 2.4, true);
    // gate blows
    const g = SP.BASE.gate; G.explosion(V3(0, 1, -82), 8, 0); SP.gateParts.forEach(m => m.visible = false); SP.gateColliders.forEach(col => W.removeCollider(col)); SP.post.U.flash.value = 0.3;
    for (let i = 0; i < 6; i++) G.particle({ pos: V3(rand(-4, 4), rand(0.5, 3), -81), vel: V3(rand(-6, 6), rand(2, 8), rand(-2, 8)), life: 3, size: 0.4, color: new T.Color(0.2, 0.2, 0.2) });
    const team = [H, RAM, DAW, 'PVT. BROOKS', 'PVT. VEGA'].map((n, i) => c.ally(n, { pos: V3(-6 + i * 3, 0, -92 - (i % 2) * 2) }));
    team.forEach((u, i) => { toCover(u, V3(-10 + i * 5, 0, -86 + (i % 2)), V3(-10 + i * 5, 0, -83), false); });
    c.defs.forEach(u => { u.aware = true; u.holdFire = false; });
    await c.say(H + ' (RADIO)', "We're in! They're all looking at us, Sarton. Hit 'em from behind!", 3.6, true);
    c.obj('Flank the gate defenders', V3(0, 0, -55), 'DEFENDERS');
    let left = -1; SP.onTick = () => { const n = c.defs.filter(u => !u.dead).length; if (n !== left) { left = n; G.hud.objective('Flank the gate defenders (' + n + ' left)'); } };
    await c.allDead(c.defs); SP.onTick = null;
    await c.say(H + ' (RADIO)', 'Gate is ours! Good work.', 2.4, true);
    c.complete();
  },
});

/* ======================= PART 10 — MOTOR POOL ======================= */
PARTS.push({
  name: 'Motor Pool', act: 'The Forgotten Base', map: 'base', env: 'night', place: 'Motor pool, the Forgotten Base', time: '00:11 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'Shoot the fuel truck when enemies are close to it. Stay well back yourself.',
  setup(c, W, P) {
    P.pos.set(14, 0, -48); P.yaw = Math.PI;
    c.ally(DOC, { pos: V3(12, 0, -50) }); c.ally('PVT. MITCHELL', { pos: V3(16, 0, -50) }); followPlayer(c, [DOC, 'PVT. MITCHELL']);
    [H, RAM, DAW].forEach((n, i) => { const u = c.ally(n, { pos: V3(-6 + i * 4, 0, -76) }); toCover(u, V3(-8 + i * 8, 0, -59.3), null, true); });
    const ft = SP.fuelTruck; c.fuel = G.destructible(ft.t, { hp: 160, radius: 13, dmg: 400, fire: 30, explode: true }); c.fuel.collider = null;
    const spots = [[28, 28.6, 24, 28.6], [36, 29, 36, 29], [26, 46, 26, 46], [44, 38, 44, 38], [42, 46, 42, 46], [50, 22, 50, 22], [22, 1, 22, 1], [-24, 1, -24, 1], [60, 13, 60, 13], [4, 2, 4, 2]];
    c.mp = spots.map(([x, z, px, pz]) => { const u = c.foe({ pos: V3(x, 0, z), cover: V3(x, 0, z), peek: V3(px, 0, pz), crouchCover: true, behavior: 'cover', alert: 1 }); u.inCover = true; return u; });
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.04);
    await c.say(H + ' (RADIO)', "We'll hold the gate. Radio chatter says the hostage is in the hangar. Sarton, go get her.", 4.4, true);
    c.obj('Fight through to the hangar door', V3(0, 0, -4), 'HANGAR');
    await c.say(DOC, 'Fuel truck in the motor pool. Light it up if they bunch up near it.', 3.4);
    await c.until(() => c.mp.filter(u => !u.dead).length <= 1 && P.pos.distanceTo(V3(0, 0, -3)) < 10);
    c.obj('Breach the hangar', V3(0, 0, -4), 'BREACH');
    await new Promise(res => G.addInteract({ pos: V3(0, 0, -4.5), radius: 3, text: 'Breach the hangar door', hold: 1.5, onUse: res }));
    A.explosion(V3(0, 1, -5), 0.6); SP.post.U.flash.value = 0.4;
    c.complete();
  },
});
})();

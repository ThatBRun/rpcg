/* Survival Protocol — Chapter 1, parts 11–20 */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp, lerp, damp } = SP;
const G = SP.G, A = SP.Audio, I = SP.Input; const PARTS = SP.PARTS;
const { followPlayer, toCover, corpse, at } = SP.partsUtil;
const H = 'SGT. HOUSER', RAM = 'CPL. RAMIREZ', DAW = 'PVT. DAWSON', OKA = 'OKAFOR', DOC = 'DOC LEE', MIT = 'PVT. MITCHELL', JAKE = 'JAKE', JACK = 'THE JACKAL', ELENA = 'DR. MOREAU';
const ELENA_LOOK = { faction: 'civ', head: 'hair', hairColor: 0x3a2416, skin: 0xd8b294, top: 0x7d8a96, pants: 0x3a3f4a, seed: 123 };
function spawnElena(c, pos, o = {}) { const u = new SP.Unit(Object.assign({ team: 'civ', name: ELENA, pos, weapon: 'none', look: Object.assign({ weapon: 'none' }, ELENA_LOOK), invuln: true, hp: 999 }, o)); c.squad[ELENA] = u; return u; }
function labFoes(c) {
  const spots = [[-12, -16.1, true], [-4, -16.2, true], [6, -18.2, true], [13, -25.4, true], [-16, -24.4, true], [14.8, -11.6, true], [-1, -30.5, false], [8, -33.2, true]];
  return spots.map(([x, z, cr]) => { const u = c.foe({ pos: V3(x, 0, z), cover: V3(x, 0, z), peek: V3(x, 0, z), crouchCover: cr, behavior: 'cover', alert: 1, sight: 40 }); u.inCover = true; return u; });
}
function alarmLights(on) { SP.alarmOn = on; }
function interiorTick(dt) { if (SP.alarmOn && SP.alarmLights) { const t = performance.now() / 1000; SP.alarmLights.forEach((l, i) => { l.intensity = (Math.sin(t * 6 + i) * 0.5 + 0.5) * 9; }); } }

/* ======================= PART 11 — THE LAB ======================= */
PARTS.push({
  name: 'The Lab', act: 'The Lab', map: 'interior', env: 'interior', place: 'Hangar, the Forgotten Base', time: '00:19 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'Blue chemical drums explode. Use them, but keep your distance.',
  setup(c, W, P) { P.pos.set(0, 0, -8.2); P.yaw = 0; c.ally(DOC, { pos: V3(-1.2, 0, -7.2) }); c.ally(MIT, { pos: V3(1.2, 0, -7.2) }); followPlayer(c, [DOC, MIT]); c.lab = labFoes(c); },
  async run(c, W, P) {
    A.loop('hum', 'hum', 0.03); SP.onTick = interiorTick;
    G.addTrauma(0.3); SP.post.U.flash.value = 0.25;
    await c.say(DOC, 'Drug lab. The whole hangar.', 2.2);
    c.obj('Clear the lab');
    let left = -1; SP.onTick = dt => { interiorTick(dt); const n = c.lab.filter(u => !u.dead).length; if (n !== left) { left = n; G.hud.objective('Clear the lab (' + n + ' left)'); } };
    await c.allDead(c.lab);
    await c.say(MIT, "That's the last of them.", 2);
    await c.say(DOC, 'This explains the drugs in the village. They cook it right here.', 3.2);
    c.complete();
  },
});

/* ======================= PART 12 — DOWN ======================= */
PARTS.push({
  name: 'Down', act: 'The Lab', map: 'interior', env: 'interior', place: 'Hangar, the Forgotten Base', time: '00:24 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'Aim for heads. You only have the pistol until Doc Lee reaches you.',
  setup(c, W, P) {
    P.pos.set(6, 0, -14); P.yaw = 0.9; c.ally(DOC, { pos: V3(8, 0, -12) }); c.ally(MIT, { pos: V3(9, 0, -13) }); followPlayer(c, [DOC, MIT]);
    [[-12, -16], [-4, -19.4], [6, -21.2], [-16, -24]].forEach(([x, z]) => corpse(c, V3(x, 0, z)));
  },
  async run(c, W, P) {
    A.loop('hum', 'hum', 0.03); SP.onTick = interiorTick;
    c.obj('Find the hostage', V3(-12, 0, -31.4), 'OFFICE');
    await c.until(() => P.pos.x < -4 || P.pos.z < -24);
    const sg = c.foe({ pos: V3(-10.5, 0, -27), weapon: 'shotgun', alert: 1, behavior: 'hold', acc: 3 }); sg.facePoint(P.pos.x, P.pos.z, 99, 1);
    await c.wait(0.4); A.gun('shotgun', sg.pos, 1.4); G.muzzle(sg.muzzle(), V3(1, 0, 0), 2, true);
    // knocked down
    P.mode = 'downed'; P.hp = 22; P.lastHit = G.time + 99; P.eye = 0.3; P.tilt = 0.5; G.addTrauma(0.9); SP.post.U.flash.value = 0.5; A.hurt(); SP.blurTarget = 0.7; SP.hbRate = 0.5;
    P.equip('pistol'); P.inv.pistol.mag = 17; P.inv.pistol.res = 34;
    P.lookLimit = { yaw: P.yaw + 0.3, yawR: 1.3, pMin: -0.2, pMax: 0.6 };
    c.obj('Survive');
    await c.say(DOC, 'Sarton! Jake, stay with me! Shoot back!', 2.4);
    SP.blurTarget = 0.35; sg.acc = 0.5; sg.behavior = 'assault'; sg.stopDist = 5;
    const more = [V3(-18, 0, -21), V3(-18, 0, -24), V3(-14, 0, -34)].map((p, i) => { const u = c.foe({ pos: p, alert: 1, behavior: 'assault', acc: 0.55 }); u.stopDist = 9 + i * 2; return u; });
    const doc = c.squad[DOC], mit = c.squad[MIT]; doc.behavior = 'idle'; doc.holdFire = true; mit.behavior = 'hold';
    const all = [sg, ...more];
    let hb = 0; SP.onTick = dt => { interiorTick(dt); hb -= dt; if (hb <= 0) { hb = 0.55; A.heartbeat(0.6); } P.tilt = damp(P.tilt, 0.45 + Math.sin(G.time * 0.8) * 0.05, 2, dt); };
    await c.until(() => all.every(u => u.dead), 30);
    all.forEach(u => { if (!u.dead) u.die(false); });
    doc.holdFire = false; await doc.moveTo(V3(P.pos.x + 0.8, 0, P.pos.z + 0.6), true);
    await c.say(DOC, 'Not today, Sarton. Hold still.', 2.4);
    await c.fade(0.85, 1.2); P.mode = 'walk'; P.hp = 100; P.eye = 1.62; P.tilt = 0; P.lookLimit = null; SP.blurTarget = 0; P.lastHit = -10; P.equip('m4'); await c.fade(0, 1.2);
    await c.say(DOC, "Plate took most of it. You're gonna have a hell of a bruise.", 3.2);
    c.complete();
  },
});

/* ======================= PART 13 — ELENA ======================= */
PARTS.push({
  name: 'Elena', act: 'The Lab', map: 'interior', env: 'interior', place: 'Hangar office, the Forgotten Base', time: '00:27 LOCAL', loadout: ['m4', 'pistol'],
  setup(c, W, P) {
    P.pos.set(-7, 0, -29); P.yaw = Math.PI / 2; c.ally(DOC, { pos: V3(-6, 0, -27) }); c.ally(MIT, { pos: V3(-5, 0, -30) }); followPlayer(c, [DOC, MIT]);
    const e = spawnElena(c, V3(-16.6, 0, -33.0), { yaw: 0 }); e.stance = 'sit'; e.hands = 'cuffed'; e.behavior = 'idle'; e.lookAt = V3(-12, 0, -31.4); c.e = e;
  },
  async run(c, W, P) {
    A.loop('hum', 'hum', 0.03); SP.onTick = interiorTick;
    c.obj('Breach the office', V3(-12, 0, -31.4), 'BREACH');
    await c.say(DOC, "Office door. If she's anywhere, she's in there.", 2.8);
    await new Promise(res => G.addInteract({ pos: V3(-11.6, 0, -31.4), radius: 2.4, text: 'Breach the door', hold: 1.2, onUse: res }));
    A.impact(V3(-12, 1, -31.4), 'metal'); A.explosion(V3(-12, 1, -31.4), 0.3); G.addTrauma(0.3);
    SP.officeDoor.visible = false; const col = W.colliders.find(x => x.obj === SP.officeDoor); if (col) W.removeCollider(col);
    await c.say(ELENA, "Don't shoot! Please! I'm not one of them!", 2.8);
    c.obj('Free the hostage', () => c.e.pos, 'HOSTAGE');
    await c.say(JAKE, "U.S. Army. You're safe. What's your name?", 2.8);
    await c.say(ELENA, 'Elena Moreau. I am a chemist. From Lyon.', 2.8);
    await new Promise(res => G.addInteract({ pos: () => c.e.pos, radius: 2.2, text: 'Cut her loose', hold: 1.6, onUse: res }));
    c.e.hands = null; c.e.stance = null;
    await c.say(ELENA, "You're not here for me, are you? You're here for him. The Jackal.", 3.6);
    await c.say(JAKE, 'Who is the Jackal?', 1.8);
    await c.say(ELENA, 'He runs all of this. He made me cook for him. Six months. The money buys his guns.', 4.4);
    c.complete();
  },
});

/* ======================= PART 14 — THE OFFICE ======================= */
PARTS.push({
  name: 'The Office', act: 'The Lab', map: 'interior', env: 'interior', place: 'Hangar office, the Forgotten Base', time: '00:31 LOCAL', loadout: ['m4', 'pistol'],
  setup(c, W, P) {
    P.pos.set(-13.2, 0, -30); P.yaw = Math.PI / 2; SP.officeDoor.visible = false; const col = W.colliders.find(x => x.obj === SP.officeDoor); if (col) W.removeCollider(col);
    const e = spawnElena(c, V3(-14.5, 0, -29), {}); e.behavior = 'idle'; e.lookAt = P.pos; c.ally(DOC, { pos: V3(-10, 0, -29) }); c.ally(MIT, { pos: V3(-9, 0, -33) });
  },
  async run(c, W, P) {
    A.loop('hum', 'hum', 0.03); SP.onTick = interiorTick;
    await c.say(ELENA, 'His laptop. His papers. Take everything.', 2.6);
    const items = [{ p: () => SP.laptop.position, t: 'Take the laptop', m: SP.laptop, f: 'INTEL · LAPTOP' }, { p: () => SP.papers.position, t: 'Take the shipping manifests', m: SP.papers, f: 'INTEL · SHIPPING MANIFESTS' }, { p: () => SP.wallMap.position, t: 'Photograph the route map', m: null, f: 'INTEL · SMUGGLING ROUTE MAP' }];
    let got = 0; c.obj('Collect the intel (0/3)');
    const marks = items.map(it => G.marker(it.p, 'INTEL', 'obj'));
    items.forEach((it, i) => G.addInteract({ pos: it.p, radius: 1.8, text: it.t, hold: 0.8, onUse: () => { got++; if (it.m) it.m.visible = false; G.removeMarker(marks[i]); G.hud.feed(it.f, 'gold'); G.hud.objective('Collect the intel (' + got + '/3)'); A.mech(0.2); } }));
    await c.until(() => got >= 3);
    await c.wait(0.8);
    A.loop('drone', 'drone', 0.35);
    await c.say(JACK + ' (SPEAKERS)', 'American soldiers. Welcome to my home.', 3.2, true);
    await c.say(JACK + ' (SPEAKERS)', 'Did you really think a hostage would fall into your lap? I sent that report myself.', 4.4, true);
    await c.say(JACK + ' (SPEAKERS)', 'You came for the chemist. I came for you.', 3.2, true);
    await c.say(RAM + ' (RADIO)', 'Sarge, we\'ve got trucks coming in from the east. A lot of them.', 3.4, true);
    await c.say(H + ' (RADIO)', "It was a trap. Sarton, get her out of there. Barracks side, now!", 3.6, true);
    c.complete();
  },
});

/* ======================= PART 15 — LOCKDOWN ======================= */
PARTS.push({
  name: 'Lockdown', act: 'The Lab', map: 'interior', env: 'interior', place: 'Barracks, the Forgotten Base', time: '00:34 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'Clear each room before you pass the door. Elena stays behind you.',
  setup(c, W, P) {
    P.pos.set(-16, 0, -22.5); P.yaw = Math.PI / 2;
    const e = spawnElena(c, V3(-14, 0, -22.5), {}); e.behavior = 'follow'; e.follow = 'player'; e.offset = V3(0.6, 0, 2.6); e.runSpeed = 4.6;
    c.ally(DOC, { pos: V3(-13, 0, -21.5) }); c.ally(MIT, { pos: V3(-13, 0, -23.5) }); followPlayer(c, [DOC, MIT]); c.squad[DOC].offset.z = 4.5; c.squad[MIT].offset.z = 5.5;
  },
  async run(c, W, P) {
    A.alarm(true); alarmLights(true); SP.onTick = interiorTick;
    (SP.labLights || []).forEach(l => l.intensity *= 0.35);
    c.obj('Escort Elena out through the barracks', SP.exitDoor, 'EXIT');
    await c.say(ELENA, 'Stay close to me. Please.', 2);
    const wave = (list) => list.map(([x, z, b]) => { const u = c.foe({ pos: V3(x, 0, z), alert: 1, behavior: b || 'assault', acc: 0.85, sight: 35 }); u.stopDist = 6; return u; });
    const w1 = wave([[-24, -28], [-31, -17], [-34, -28]]);
    await c.until(() => P.pos.x < -34 || w1.every(u => u.dead));
    const w2 = wave([[-46, -28], [-49, -17], [-55, -22.5, 'hold']]);
    await c.until(() => P.pos.x < -52 || w2.every(u => u.dead));
    const w3 = wave([[-64, -28, 'hold'], [-71, -16, 'hold'], [-71, -28], [-68, -18]]);
    await c.until(() => P.pos.x < -73 && [...w1, ...w2, ...w3].filter(u => !u.dead).length <= 1);
    await c.near(SP.exitDoor, 3);
    A.alarm(false); alarmLights(false);
    c.complete();
  },
});

/* ======================= PART 16 — REGROUP ======================= */
PARTS.push({
  name: 'Regroup', act: 'Hold the Line', map: 'base', env: 'night', place: 'Courtyard, the Forgotten Base', time: '00:41 LOCAL', loadout: ['m4', 'pistol'],
  setup(c, W, P) {
    P.pos.set(-44, 0, -22); P.yaw = -Math.PI / 2 + 0.5;
    const e = spawnElena(c, V3(-45.5, 0, -20.5), {}); e.behavior = 'follow'; e.follow = 'player'; e.offset = V3(0.8, 0, 2.4);
    c.ally(DOC, { pos: V3(-46, 0, -24) }); c.ally(MIT, { pos: V3(-47, 0, -21) }); followPlayer(c, [DOC, MIT]); c.squad[DOC].offset.z = 4; c.squad[MIT].offset.z = 5;
    const h = c.ally(H, { pos: V3(0, 0, -55) }); h.lookAt = V3(0, 0, -100); c.ally(RAM, { pos: V3(-3, 0, -54) }); c.ally(DAW, { pos: V3(3, 0, -56), stance: 'kneel' });
    const ok = c.ally(OKA, { pos: V3(SP.BASE.tower.x, 8.2, SP.BASE.tower.z) }); ok.fixedY = true; ok.lookAt = V3(0, 0, -200);
    corpse(c, V3(-6, 0, -82), { faction: 'us' }); corpse(c, V3(5, 0, -84), { faction: 'us' });
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.05);
    const h = c.squad[H];
    c.obj('Regroup with Sgt. Houser', () => h.pos, 'HOUSER');
    await c.near(() => h.pos, 7);
    h.lookAt = P.pos;
    await c.say(H, "Elena Moreau, I presume. Glad you're breathing.", 2.8);
    await c.say(JAKE, 'Brooks? Vega?', 1.6);
    await c.say(H, "At the gate. They didn't make it.", 2.6);
    await c.say(RAM, 'Bird is ten minutes out. They won\'t land under fire.', 3);
    await c.say(H, 'Then we hold for ten minutes. Radio tower. Everybody on the sandbags.', 3.6);
    h.lookAt = P.pos; await c.wait(0.8);
    if (SP.save.choice === 2) await c.say(H, "Hey. Back in the bird you told me you weren't alright. You've done fine. Keep your head up.", 4.8);
    else await c.say(H, "You said you were all good. Prove it for ten more minutes.", 3.6);
    c.complete();
  },
});

/* ======================= PART 17 — THE TOWER ======================= */
function defenseSetup(c, W, P) {
  P.pos.set(0, 0, -52); P.yaw = 0;
  const e = spawnElena(c, V3(2, 0, -45), {}); e.stance = 'sit'; e.behavior = 'idle'; e.ignored = true;
  [[H, -8, -56.6], [RAM, -3, -47.4], [DAW, 8, -56.6], [DOC, -20, -64.6], [MIT, 20, -64.6]].forEach(([n, x, z]) => { const u = c.ally(n, { pos: V3(x, 0, z + 1) }); toCover(u, V3(x, 0, z + 0.6), V3(x, 0, z + 0.6), true); u.inCover = true; });
  const ok = c.ally(OKA, { pos: V3(SP.BASE.tower.x, 8.2, SP.BASE.tower.z), behavior: 'hold', acc: 1.6 }); ok.fixedY = true; ok.crouch = true;
  // mounted M240 on the sandbags
  const mg = SP.Models.fiftyCal(); mg.scale.setScalar(0.85); mg.position.set(0, 1.28, -57.6); W.scene.add(mg); c.mg = mg;
  const anchor = new T.Object3D(); anchor.position.set(0, 1.62, -56.85); W.scene.add(anchor);
  c.mgTurret = { anchor, rpm: 650, dmg: 60, vehDmg: 30, sound: 'mg', exitable: true, muzzleWorld: () => { mg.updateMatrixWorld(true); return mg.localToWorld(mg.userData.muzzle.clone()); } };
  const use = () => { P.mode = 'turret'; P.turret = c.mgTurret; P.turretName = 'M240 MOUNTED'; P.eye = 0; SP.buildTurretVM(); P.updAmmo(); SP.vmCam.children.forEach(o => { if (o !== SP.vmFill) o.visible = true; }); c.inMG = true; G.hud.feed('[E] to leave the gun', ''); c.mgIt.enabled = false; };
  c.mgIt = G.addInteract({ pos: V3(0, 0, -56.6), radius: 2.2, text: 'Use the mounted gun', once: false, onUse: use });
  c.leaveMG = () => { if (!c.inMG) return; c.inMG = false; P.mode = 'walk'; P.eye = 1.62; P.pos.set(0, 0, -55.6); P.equip(P.cur || 'm4'); c.mgIt.enabled = true; };
}
function mgTick(c, P) { if (c.inMG) { c.mg.rotation.y = P.yaw; c.mg.rotation.x = P.pitch * 0.9; if (I.hit('KeyE')) c.leaveMG(); } }
PARTS.push({
  name: 'The Tower', act: 'Hold the Line', map: 'base', env: 'night', place: 'Radio tower, the Forgotten Base', time: '00:44 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'The mounted gun on the sandbags (E) chews through waves. Health comes back in cover.',
  setup(c, W, P) { defenseSetup(c, W, P); },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.04); A.loop('drone', 'drone', 0.3);
    const total = 180; let left = total; const bird = 10 * 60;
    SP.aggro = 1.2;
    SP.onTick = dt => { left = Math.max(0, left - dt); const s = Math.ceil(left / total * bird); G.hud.timer('BIRD ETA  ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')); mgTick(c, P); };
    c.obj('Defend the radio tower until the helicopter arrives');
    await c.say(H, 'Here they come! Hold this line!', 2.4);
    const spawnWave = (n, side) => { for (let i = 0; i < n; i++) { const x = side === 'gate' ? rand(-5, 5) : rand(60, 75); const z = side === 'gate' ? rand(-100, -88) : rand(-75, -55); const u = c.foe({ pos: V3(x, 0, z), alert: 1, behavior: 'assault', acc: 0.75 }); u.goal2 = V3(rand(-15, 15), 0, -58); u.stopDist = rand(16, 26); } };
    const waves = [[5, 'gate'], [4, 'east'], [6, 'gate'], [5, 'east'], [7, 'gate'], [6, 'gate'], [6, 'east'], [8, 'gate']];
    let wi = 0; const next = async () => { while (left > 6 && wi < waves.length) { const [n, s] = waves[wi++]; spawnWave(n, s); if (s === 'east') c.say(OKA + ' (RADIO)', 'East wall! They\'re coming over the east wall!', 2.6, true).catch(() => { }); await c.wait(21); } };
    next().catch(() => { });
    await c.wait(12); await c.say(DAW, 'Sarton, get on that gun!', 2).catch(() => { });
    await c.until(() => left <= 0);
    SP.aggro = 1; G.hud.timer(null); c.leaveMG();
    await c.say(RAM, "Bird's two minutes out! But they're bringing trucks!", 2.8);
    c.complete();
  },
});

/* ======================= PART 18 — TECHNICALS ======================= */
PARTS.push({
  name: 'Technicals', act: 'Hold the Line', map: 'base', env: 'night', place: 'Main gate, the Forgotten Base', time: '00:54 LOCAL', loadout: ['m4', 'at4'],
  deathTip: 'Switch to the AT4 with 2 and aim at the trucks. Mortars land where the whistle is loudest. Keep moving.',
  setup(c, W, P) { defenseSetup(c, W, P); SP.gateParts.forEach(m => m.visible = false); SP.gateColliders.forEach(col => W.removeCollider(col)); P.inv.at4.res = 3; },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.04); A.loop('drone', 'drone', 0.35);
    SP.onTick = () => mgTick(c, P);
    const mkTech = (pts, delay) => { const m = SP.Models.technical(SP.pick([0xd8d2c4, 0x9a8a6a])); const v = new SP.Vehicle(m, { team: 'foe', hp: 650, speed: 15, curve: new T.CatmullRomCurve3(pts.map(([x, z]) => V3(x, 0, z))) }); const gn = c.foe({ pos: m.position.clone(), alert: 1, behavior: 'hold', acc: 0.9 }); gn.fixedY = true; v.gunner = gn; v.onArrive = vv => { vv.spd = 0; }; return v; };
    const t1 = mkTech([[0, -260], [0, -150], [0, -95], [-2, -72]]);
    await c.say(H, 'Technical coming through the gate!', 2.2);
    const techs = [t1];
    SP.onTick = () => { mgTick(c, P); for (const v of techs) if (!v.dead && v.gunner && !v.gunner.dead) { v.gunner.pos.copy(v.mesh.localToWorld(V3(0, 1.3, 1.6))); v.gunner.yaw = v.mesh.rotation.y + Math.PI; } };
    await c.until(() => t1.u > 0.75 || t1.dead);
    if (!t1.dead) { await c.say(DAW, 'Rocket out!', 1.2); G.rocket(V3(8, 1.5, -57), t1.mesh.position.clone().add(V3(0, 1, 0)).sub(V3(8, 1.5, -57)).normalize(), 'ally'); }
    await c.wait(1.5); await c.say(DAW, "Woo! Scratch one! Sarton, there's an AT4 in your kit, use it!", 3.2);
    c.obj('Destroy the technicals with the AT4 (press 2)');
    const t2 = mkTech([[-120, -240], [-40, -150], [-4, -95], [-6, -70]]); const t3 = mkTech([[140, -260], [40, -160], [4, -100], [8, -74]]); techs.push(t2, t3);
    let mortar = true; (async () => { while (mortar) { await c.wait(rand(2.5, 4.5)); const tgt = P.pos.clone().add(V3(rand(-18, 18), 0, rand(-18, 18))); if (tgt.distanceTo(P.pos) < 5) tgt.x += 8; G.mortar(tgt, 1.5); } })().catch(() => { });
    for (let i = 0; i < 6; i++) { const u = c.foe({ pos: V3(rand(-4, 4), 0, rand(-110, -95)), alert: 1, behavior: 'assault' }); u.goal2 = V3(rand(-12, 12), 0, -60); u.stopDist = 20; }
    await c.wait(6); G.hud.feed('PVT. MITCHELL IS WOUNDED', 'red'); await c.say(MIT, "I'm hit! I'm hit!", 1.6).catch(() => { });
    await c.say(DOC, 'Got him! Keep those trucks off us!', 2.4).catch(() => { });
    let left = -1; SP.onTick = () => { mgTick(c, P); for (const v of techs) if (!v.dead && v.gunner && !v.gunner.dead) { v.gunner.pos.copy(v.mesh.localToWorld(V3(0, 1.3, 1.6))); } const n = [t2, t3].filter(v => !v.dead).length; if (n !== left) { left = n; G.hud.objective('Destroy the technicals with the AT4 (' + n + ' left)'); } if (P.inv.at4 && P.inv.at4.mag + P.inv.at4.res === 0 && n > 0) { P.inv.at4.res = 1; G.hud.feed('DAWSON TOSSED YOU A ROCKET', ''); } };
    await c.until(() => t2.dead && t3.dead);
    mortar = false;
    await c.say(H, 'Trucks are down! Bird is landing outside the west wall. Everybody move!', 3.6);
    c.complete();
  },
});

/* ======================= PART 19 — LAST RUN ======================= */
PARTS.push({
  name: 'Last Run', act: 'Hold the Line', map: 'base', env: 'night', place: 'Outside the west wall', time: '00:58 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'Sprint (Shift) and don\'t stop. Mortars hit where you were, not where you are.',
  setup(c, W, P) {
    SP.gateParts.forEach(m => m.visible = false); SP.gateColliders.forEach(col => W.removeCollider(col));
    P.pos.set(0, 0, -70); P.yaw = 0;
    const e = spawnElena(c, V3(1.5, 0, -68), {}); e.behavior = 'follow'; e.follow = 'player'; e.offset = V3(1, 0, 2.2); e.runSpeed = 7;
    [H, RAM, DAW, DOC, MIT].forEach((n, i) => { const u = c.ally(n, { pos: V3(-6 + i * 3, 0, -66), runSpeed: 6.4 }); });
    followPlayer(c, [RAM, DAW, DOC, MIT]); c.squad[H].behavior = 'idle';
    const heli = SP.Models.heli(); heli.position.set(SP.BASE.helipad.x, 60, SP.BASE.helipad.z); heli.rotation.y = -Math.PI / 2; W.scene.add(heli); c.heli = heli;
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.05); A.loop('rotor', 'rotor', 0.0);
    const hp = SP.BASE.helipad; const heli = c.heli; let rot = 0;
    SP.onTick = dt => { rot += dt * 24; heli.userData.rotor.rotation.y = rot; heli.userData.tail.rotation.x = rot * 1.6; heli.position.y = Math.max(W.heightAt(hp.x, hp.z) + 0.1, heli.position.y - dt * 9); const d = heli.position.distanceTo(P.pos); const g = A.loops.rotor; if (g && g.gain) g.gain.gain.value = clamp(1.6 - d / 160, 0.1, 1.2); if (heli.position.y < 15 && Math.random() < 0.6) G.particle({ pos: V3(hp.x + rand(-10, 10), W.heightAt(hp.x, hp.z) + 0.5, hp.z + rand(-10, 10)), vel: V3(rand(-6, 6), rand(0.5, 2), rand(-6, 6)), life: 2.5, size: 3, grow: 2, color: new T.Color(0.55, 0.45, 0.35), opacity: 0.4 }); };
    c.obj('Get to the helicopter', () => heli.position, 'EXTRACT');
    await c.say(H, 'Go! Get Elena on that bird! I\'ll cover the gate!', 2.8);
    const h = c.squad[H]; h.holdFire = false; h.moveTo(V3(-4, 0, -86), true).then(() => { h.behavior = 'hold'; h.lookAt = V3(40, 0, -200); });
    let mortar = true; (async () => { while (mortar) { await c.wait(rand(1.4, 2.6)); const tgt = P.pos.clone().add(V3(P.vel.x * 1.8 + rand(-10, 10), 0, P.vel.z * 1.8 + rand(-10, 10))); if (tgt.distanceTo(P.pos) < 6) tgt.z += 9; tgt.y = W.heightAt(tgt.x, tgt.z); G.mortar(tgt, 1.4); } })().catch(() => { });
    for (let i = 0; i < 8; i++) { const u = c.foe({ pos: V3(rand(30, 70), 0, rand(-150, -120)), alert: 1, behavior: 'assault', acc: 0.6 }); u.goal2 = V3(-40, 0, -110); u.stopDist = 40; }
    await c.until(() => P.pos.distanceTo(V3(hp.x, P.pos.y, hp.z)) < 9);
    mortar = false;
    c.complete();
  },
});

/* ======================= PART 20 — LEFT BEHIND ======================= */
PARTS.push({
  name: 'Left Behind', act: 'Hold the Line', map: 'base', env: 'night', place: 'Above the Forgotten Base', time: '01:01 LOCAL', loadout: [],
  setup(c, W, P) {
    SP.gateParts.forEach(m => m.visible = false);
    const hp = SP.BASE.helipad; const heli = SP.Models.heli(); heli.position.set(hp.x, W.heightAt(hp.x, hp.z) + 0.1, hp.z); heli.rotation.y = -Math.PI / 2; W.scene.add(heli); c.heli = heli;
    const inner = SP.flat(0x2e3027, 0.85, 0.2, { side: T.BackSide }); const shell = new T.Mesh(new T.BoxGeometry(2.1, 1.8, 4.2), [SP.flat(0x2e3027, 0.85, 0, { transparent: true, opacity: 0 }), inner, inner, inner, inner, inner]); shell.position.set(0, 1.9, -0.2); heli.add(shell);
    const red = new T.PointLight(SP.lin(0xff4a2a), 1.4, 5, 2); red.position.set(0, 2.6, 0); heli.add(red);
    // inside the cabin, looking out the right door toward the base (east)
    P.mode = 'seat'; P.eye = 1.15; P.lookLimit = null; c.seat = V3(0.6, 0.85, -0.1);
    P.pos.copy(heli.localToWorld(c.seat.clone())); P.yaw = -Math.PI / 2; P.pitch = -0.05;
    const e = spawnElena(c, P.pos.clone().add(V3(0, 0, 0.8)), { yaw: -Math.PI / 2 }); e.stance = 'sit'; e.fixedY = true; e.behavior = 'idle';
    // Houser's last stand outside the wall
    const h = c.ally(H, { pos: V3(-96, 0, -72), invuln: true }); h.behavior = 'idle'; h.stance = 'kneel'; h.hands = 'up'; h.lookAt = V3(-110, 0, -60); c.h = h;
    c.capt = [[-102, -66], [-92, -64], [-104, -76], [-90, -78], [-98, -82]].map(([x, z]) => { const u = c.foe({ pos: V3(x, 0, z), alert: 1, behavior: 'idle', holdFire: true }); u.lookAt = h.pos; return u; });
    SP.lbTarget = 1;
  },
  async run(c, W, P) {
    A.loop('rotor', 'rotor', 1.0); A.loop('drone', 'drone', 0.4);
    const heli = c.heli; let rot = 0, up = 0;
    SP.onTick = dt => {
      rot += dt * 26; heli.userData.rotor.rotation.y = rot; heli.userData.tail.rotation.x = rot * 1.6; up = Math.min(1, up + dt * 0.06);
      heli.position.y = W.heightAt(SP.BASE.helipad.x, SP.BASE.helipad.z) + 0.1 + up * up * 40; heli.position.x = SP.BASE.helipad.x - up * up * 30; heli.rotation.z = Math.sin(G.time * 0.7) * 0.03;
      heli.updateMatrixWorld(true); P.pos.copy(heli.localToWorld(c.seat.clone())); P.pos.y -= 0.0; const e = c.squad[ELENA]; e.pos.copy(heli.localToWorld(c.seat.clone().add(V3(0, 0, 0.8)))); G.trauma = Math.max(G.trauma, 0.12);
      const toH = c.h.pos.clone().sub(P.pos); P.camAnim = { yaw: Math.atan2(-toH.x, -toH.z), pitch: Math.atan2(toH.y + 1, Math.hypot(toH.x, toH.z)), k: 1.2 }; P.fovOverride = lerp(60, 34, up);
    };
    await c.wait(2.5);
    await c.say(JAKE, "Wait, where's Houser? Where's the Sergeant?!", 2.8);
    await c.say(DOC, "He stayed at the gate. He's... Jake, they've got him.", 3.4);
    await c.wait(1);
    const ch = SP.save.choice || 1;
    if (ch === 1) await c.say(H + ' (RADIO)', 'Told you we couldn\'t let you die down there. Now go.', 4, true);
    else await c.say(H + ' (RADIO)', 'Keep your head up, Sarton. They need you in this now.', 4, true);
    SP.blurTarget = 0.6; SP.hbRate = 0.6;
    await c.wait(1.5);
    await c.say(JACK + ' (RADIO)', 'Your sergeant is mine now, Private Sarton.', 3.6, true);
    await c.wait(1.2);
    await c.fade(1, 3);
    const card = document.getElementById('chapterend'); card.hidden = false; await c.wait(5); card.hidden = true;
    c.complete();
  },
});
})();

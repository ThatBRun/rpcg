/* Survival Protocol — Chapter 2: The Jackal's Road (10 parts) */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp, lerp, damp } = SP;
const G = SP.G, A = SP.Audio, I = SP.Input;
const { followPlayer, toCover, corpse } = SP.partsUtil;
const PARTS = SP.PARTS2 = [];
PARTS.endTitle = 'Someone sold you out';
PARTS.endText = 'Houser was moved hours before you got there. The codebook in his cell holds your own unit\'s frequencies. Chapter 3, The Leak, finds out who gave them away.';
const RAM = 'CPL. RAMIREZ', DAW = 'PVT. DAWSON', OKA = 'OKAFOR', DOC = 'DOC LEE', MIT = 'PVT. MITCHELL', JAKE = 'JAKE', JACK = 'THE JACKAL', REY = 'CPT. REYES', ELENA = 'DR. MOREAU', KARIM = 'KARIM', YUS = 'YUSUF';
SP.SQUAD_LOOK = SP.SQUAD_LOOK || {};
const LOOKS = { [REY]: { head: 'cap', skin: 0xa8775a, seed: 202, beard: false } };
const ELENA_LOOK = { weapon: 'none', faction: 'civ', head: 'hair', hairColor: 0x3a2416, skin: 0xd8b294, top: 0x7d8a96, pants: 0x3a3f4a, seed: 123 };
const at = (x, z) => V3(x, SP.W.heightAt(x, z), z);
function npc(c, name, pos, look, o = {}) { const u = new SP.Unit(Object.assign({ team: 'civ', name, pos, weapon: 'none', look: Object.assign({ weapon: 'none', faction: 'civ' }, look), invuln: true, hp: 999 }, o)); c.squad[name] = u; return u; }
function squad(c, names, x, z, yaw = 0) { return names.map((n, i) => { const off = V3((i % 2 ? 1.8 : -1.8), 0, 2.4 + Math.floor(i / 2) * 2).applyAxisAngle(V3(0, 1, 0), yaw); return c.ally(n, Object.assign({ pos: at(x + off.x, z + off.z), yaw }, LOOKS[n] ? { look: LOOKS[n] } : {})); }); }
function choice(a, b) { return new Promise(res => { const el = document.getElementById('choices'); el.querySelector('#ch1 span').textContent = a; el.querySelector('#ch2 span').textContent = b; el.hidden = false; const pick = n => { el.hidden = true; SP.onChoice = null; A.click(700, 0.1); res(n); }; SP.onChoice = pick; document.getElementById('ch1').onclick = () => pick(1); document.getElementById('ch2').onclick = () => pick(2); }); }
function countObj(c, label, list) { let last = -1; return () => { const n = list.filter(u => !u.dead).length; if (n !== last) { last = n; G.hud.objective(label + ' (' + n + ' left)'); } }; }
function tick(...fns) { SP.onTick = dt => fns.forEach(f => f && f(dt)); }
function assault(c, n, area, goal, o = {}) { const out = []; for (let i = 0; i < n; i++) { const x = rand(area[0], area[1]), z = rand(area[2], area[3]); const u = c.foe(Object.assign({ pos: at(x, z), alert: 1, behavior: 'assault', acc: 0.8 }, o)); u.goal2 = goal.clone().add(V3(rand(-6, 6), 0, rand(-6, 6))); u.stopDist = rand(10, 22); out.push(u); } return out; }
function coverFoes(c, spots, o = {}) { return spots.map(([x, z, y]) => { const p = y != null ? V3(x, y, z) : at(x, z); const u = c.foe(Object.assign({ pos: p.clone(), cover: p.clone(), peek: p.clone(), crouchCover: true, behavior: 'cover', alert: 1 }, o)); u.inCover = true; if (y != null) u.fixedY = true; return u; }); }
function popTarget(W, pos, faceYaw, onDown) {
  const g = new T.Group(); g.position.copy(pos); g.rotation.y = faceYaw; W.scene.add(g);
  const piv = new T.Group(); g.add(piv); SP.M(SP.geo.box(0.08, 0.5, 0.08), SP.mat('wood', {}), 0, 0.25, 0, g);
  SP.M(SP.geo.box(0.55, 0.85, 0.04), SP.flat(0x4a5038, 0.9), 0, 0.95, 0, piv); SP.M(SP.geo.sph(0.15, 10, 8), SP.flat(0x4a5038, 0.9), 0, 1.5, 0, piv); SP.M(SP.geo.box(0.16, 0.16, 0.05), SP.flat(0xd8d0c0, 0.8), 0, 1.05, 0.01, piv, false);
  const d = G.destructible(piv, { hp: 1, explode: false, surf: 'wood', onDestroy: () => { let k = 0; const f = () => { k += 0.08; piv.rotation.x = -Math.min(1.5, k * 1.5); if (k < 1) requestAnimationFrame(f); }; f(); A.impact(pos, 'metal'); onDown && onDown(); } });
  return { g, d };
}
function heliIn(W, pos, yaw = 0, from = 60) { const h = SP.Models.heli(); h.position.set(pos.x, pos.y + from, pos.z); h.rotation.y = yaw; W.scene.add(h); return h; }
function spinHeli(h, dt, target) { h.userData.rot = (h.userData.rot || 0) + dt * 25; h.userData.rotor.rotation.y = h.userData.rot; h.userData.tail.rotation.x = h.userData.rot * 1.6; if (target != null) h.position.y = Math.max(target, h.position.y - dt * 8); }

/* ======================= 1. DEBRIEF ======================= */
PARTS.push({
  name: 'Debrief', act: "The Jackal's Road", map: 'fob', env: 'day', place: 'FOB Tessalit, northern Mali', time: '09:12 LOCAL · TWO DAYS LATER', loadout: ['m4', 'pistol'],
  setup(c, W, P) {
    P.pos.copy(at(-20, -14)); P.yaw = Math.PI * 0.85;
    const r = c.ally(REY, { pos: at(1.6, -22), yaw: Math.PI, look: LOOKS[REY] }); r.lookAt = V3(-5, 0, -14); r.pose = 'relaxed';
    const e = npc(c, ELENA, at(-1.4, -22), ELENA_LOOK); e.lookAt = V3(0, 0, -20); e.behavior = 'idle';
    [[RAM, -2.5, -18.5], [DAW, 2.8, -18.2], [OKA, 0.4, -17.6], [DOC, -4, -20], [MIT, 4, -21]].forEach(([n, x, z]) => { const u = c.ally(n, { pos: at(x, z), pose: 'relaxed' }); u.lookAt = V3(0, 0, -21); });
    c.squad[MIT].stance = 'sit';
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.05);
    tick(dt => { const f = SP.flag; if (f) { const p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 2 + G.time * 5) * 0.15 * (x + 1.1)); } p.needsUpdate = true; } });
    c.obj('Report to the command tent', V3(0, 0, -19), 'BRIEFING');
    await c.say(DAW + ' (RADIO)', "Sarton, Captain wants everybody at the map table. Now.", 3);
    await c.near(V3(0, 0, -19.5), 5);
    c.obj(null);
    await c.lines([[REY, "Two days ago we lost Sergeant Houser. Yesterday he showed up on a Black Dune radio intercept. He's alive.", 5],
      [REY, "The manifests you pulled from that base list one name over and over. Tamanrasset. A town on the old smuggling road.", 5],
      [REY, "Dr. Moreau says the Jackal's money comes through a man there named Karim. Find Karim, and he leads us to the next link.", 5],
      [ELENA, "Karim sells fuel to anyone. But every convoy south stops at his market. If Houser is moved, it goes through him.", 5]]);
    c.obj('Study the route on the map', () => SP.fobMap.position, 'MAP');
    await new Promise(res => G.addInteract({ pos: () => SP.fobMap.position, radius: 2.6, text: 'Study the route', hold: 2, onUse: res }));
    G.hud.feed('INTEL · TAMANRASSET → HOGGAR PASS → ASSEKREM', 'gold');
    await c.say(REY, "You leave at dusk. Until then, zero your weapons at the range. All of you.", 4);
    // rifle range: three rounds of pop-up targets
    c.obj('Go to the firing line', V3(19, 0, 0), 'RANGE');
    await c.until(() => P.pos.x > 16 && Math.abs(P.pos.z) < 14);
    const okR = c.squad[OKA]; okR.moveTo(at(19, 4), false);
    await c.say(OKA, "Three strings. Four targets each. Clock starts when they pop.", 3.2);
    let total = 0, hits = 0;
    for (let round = 0; round < 3; round++) {
      const spots = SP.rangeSpots.slice(round * 4, round * 4 + 4); let down = 0; total += 4;
      const tg = spots.map(p => popTarget(W, p, -Math.PI / 2, () => { down++; hits++; }));
      c.obj('Range: string ' + (round + 1) + ' of 3 — hit 4 targets'); A.click(2000, 0.15);
      let t = 12 - round * 2; tick(dt => { t -= dt; G.hud.timer('STRING ' + (round + 1) + '  ' + Math.max(0, t).toFixed(1)); });
      await c.until(() => down >= 4 || t <= 0); G.hud.timer(null); tick();
      tg.forEach(x => { if (!x.d.dead) { x.d.dead = true; W.scene.remove(x.g); } });
      await c.say(OKA, down >= 4 ? 'Clean.' : 'Missed ' + (4 - down) + '. Tighten it up.', 1.8);
    }
    await c.say(OKA, "You put " + hits + " of " + total + " down. Now the long gun.", 2.8);
    P.give('dmr', 10, 30); P.equip('dmr');
    c.obj('Marksman range: hit 6 targets past 150 m (right click to scope)');
    let longDown = 0; const lt = SP.longSpots.map(p => popTarget(W, p, -Math.PI / 2, () => { longDown++; G.hud.objective('Marksman range: ' + longDown + ' / 6'); }));
    const marks = SP.longSpots.map(p => G.marker(() => p.clone().add(V3(0, 0.6, 0)), '', 'tag'));
    await c.say(OKA, 'Hold your breath, squeeze. Wind is calm today.', 3);
    await c.until(() => longDown >= 6, 240); marks.forEach(m => G.removeMarker(m));
    await c.say(OKA, "Good. Keep that rifle. You'll want it where we're going.", 3);
    c.obj('Board the helicopter', V3(-40, 0, -10), 'BOARD');
    await c.say(REY, "Bird is spinning up. Bring him home, Sarton.", 2.8);
    A.loop('rotor', 'rotor', 0.7);
    await new Promise(res => G.addInteract({ pos: V3(-38.5, 0, -10), radius: 3, text: 'Board the helicopter', onUse: res }));
    await c.fade(1, 1.5); c.complete();
  },
});

/* ======================= 2. TAMANRASSET (tail Karim) ======================= */
const KROUTE = [[-98, 94], [-98, 46], [-74, 46], [-50, 46], [-50, 22], [-26, 22], [-26, 4], [-14, 2], [-3, 3]];
PARTS.push({
  name: 'Tamanrasset', act: "The Jackal's Road", map: 'town', env: 'dawn', place: 'Tamanrasset, southern Algeria', time: '06:20 LOCAL', loadout: ['pistol'],
  deathTip: 'Stay between 8 and 40 meters from Karim. Too close and he spots you; too far and you lose him.',
  setup(c, W, P) {
    P.pos.copy(at(-98, 112)); P.yaw = 0;
    const k = npc(c, KARIM, at(-98, 96), { head: 'shemagh', top: 0xe6e0d2, pants: 0xd8d0c0, seed: 404 }); k.behavior = 'idle'; k.walkSpeed = 1.35; c.k = k;
    const d = c.ally(DAW, { pos: at(-96.5, 115) }); d.weapon = 'pistol'; followPlayer(c, [DAW]); d.holdFire = true;
    for (let i = 0; i < 34; i++) { const a = rand(0, 6.28), r = rand(10, 110); const p = at(Math.cos(a) * r, Math.sin(a) * r); SP.civilian(p, p, 14); }
    for (let i = 0; i < 10; i++) { const p = at(rand(-12, 12), rand(-12, 12)); SP.civilian(p, V3(0, 0, 0), 12); }
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.04);
    const k = c.k; await c.say(OKA + ' (RADIO)', "I'm up the minaret with eyes on the market. Karim's the one in white. Don't spook him.", 4.2, true);
    c.obj('Follow Karim without being seen', () => k.pos, 'KARIM');
    let sus = 0, lostT = 0, i = 0, walking = false;
    const step = async () => { while (i < KROUTE.length) { const [x, z] = KROUTE[i]; walking = true; await k.moveTo(at(x, z), false); walking = false; i++; if (i === 3 || i === 6) { k.hands = null; await c.wait(rand(3, 5)); } } };
    const go = step().catch(() => { });
    tick(dt => {
      const d = Math.hypot(P.pos.x - k.pos.x, P.pos.z - k.pos.z);
      if (d < 8) sus += dt * (P.sprinting ? 0.6 : 0.3); else sus = Math.max(0, sus - dt * 0.08);
      if (d > 40) lostT += dt; else lostT = Math.max(0, lostT - dt * 2);
      const bars = Math.round(sus * 5); G.hud.timer(d > 40 ? 'LOSING HIM  ' + (15 - lostT).toFixed(0) : 'SUSPICION  ' + '▮'.repeat(bars) + '▯'.repeat(5 - bars));
      if (sus >= 1) { G.hud.timer(null); SP.fail('Karim spotted you and disappeared into the crowd.'); }
      if (lostT > 15) { G.hud.timer(null); SP.fail('You lost Karim in the streets.'); }
    });
    await c.wait(6); await c.say(DAW, "Easy. Let him get ahead. We're just two guys buying bread.", 3.6);
    await c.until(() => i >= 3); await c.say(OKA + ' (RADIO)', 'He stopped to look behind him. Keep walking, don\'t look at him.', 3.6, true);
    await c.until(() => i >= 6); await c.say(OKA + ' (RADIO)', 'He\'s heading for the fountain. Somebody\'s waiting for him.', 3.2, true);
    await go; G.hud.timer(null); SP.onTick = null;
    c.obj('Find cover near the market', V3(-16, 0, 4), 'COVER');
    await c.near(V3(-16, 0, 4), 6);
    await c.say(OKA + ' (RADIO)', "Second man at the fountain. Young, green jacket, satchel. That's our courier.", 3.6, true);
    await c.say(DAW, "Looks like he's handing Karim a stack of cash.", 2.6);
    c.complete();
  },
});

/* ======================= 3. MARKET SQUARE ======================= */
PARTS.push({
  name: 'Market Square', act: "The Jackal's Road", map: 'town', env: 'dawn', place: 'Market, Tamanrasset', time: '06:41 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'The stalls stop bullets. Watch the rooftops to the north.',
  setup(c, W, P) {
    P.pos.copy(at(-17, 5)); P.yaw = -Math.PI / 2 + 0.2;
    const k = npc(c, KARIM, at(-2.5, 3), { head: 'shemagh', top: 0xe6e0d2, pants: 0xd8d0c0, seed: 404 }); k.behavior = 'idle'; k.lookAt = V3(0, 0, 0); c.k = k;
    const y = npc(c, YUS, at(-1.5, 2.2), { head: 'bare', top: 0x3d5a2a, pants: 0x2a2a2a, seed: 505 }); y.behavior = 'idle'; y.lookAt = V3(-3, 0, 3); c.y = y;
    squad(c, [DAW, RAM, DOC, MIT], -22, 9, -Math.PI / 2);
    for (let i = 0; i < 24; i++) { const p = at(rand(-14, 14), rand(-14, 14)); if (p.length() < 4) continue; SP.civilian(p, V3(0, 0, 0), 13); }
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.04);
    await c.say(DAW, 'Okay. We grab them both, quiet as we can.', 2.6);
    c.obj('Move in on the fountain', V3(-4, 0, 3), 'COURIER');
    await c.until(() => Math.hypot(P.pos.x - c.y.pos.x, P.pos.z - c.y.pos.z) < 11 || G.time > 40);
    await c.say(YUS, 'Americans!', 1.2);
    // ambush: shooters from the north roofs and alleys
    const ry = SP.TOWN.roofY; const roof = coverFoes(c, [[-24, -26, ry], [-12, -26, ry], [0, -26, ry], [12, -26, ry]], { sight: 90 });
    A.gun('ak', V3(-12, ry, -26), 1.2); c.k.invuln = false; c.k.die(false); G.lastEnemyShot = G.time; G.lastShot = G.time;
    c.y.behavior = 'idle'; c.y.runSpeed = 6; c.y.moveTo(at(-30, -36), true);
    const sq = [DAW, RAM, DOC, MIT].map(n => c.squad[n]);
    const cv = [[-12, 10], [-8, 14], [-16, 12], [-10, 6]]; sq.forEach((u, i) => toCover(u, at(cv[i][0], cv[i][1]), at(cv[i][0] + 1, cv[i][1] - 1), true));
    await c.say(DAW, "Karim's down! Contact north, rooftops!", 2.4);
    const w1 = roof.concat(assault(c, 6, [-30, 30, -50, -40], V3(-6, 0, 0)));
    c.obj('Survive the ambush'); tick(countObj(c, 'Survive the ambush', w1));
    await c.until(() => w1.filter(u => !u.dead).length <= 3);
    await c.say(RAM, 'More coming from the east road!', 2.2);
    const w2 = assault(c, 8, [40, 60, -10, 20], V3(4, 0, 2));
    const tech = SP.Models.technical(0xd8d2c4); const v = new SP.Vehicle(tech, { team: 'foe', hp: 520, speed: 11, curve: new T.CatmullRomCurve3([V3(110, 0, -2), V3(70, 0, -2), V3(34, 0, -2)]) }); v.onArrive = vv => { vv.spd = 0; };
    const gn = c.foe({ pos: tech.position.clone(), alert: 1, behavior: 'hold', acc: 0.9 }); gn.fixedY = true; v.gunner = gn;
    const all2 = w1.concat(w2, [gn]);
    tick(countObj(c, 'Fight off the gunmen', all2), () => { if (!v.dead && !gn.dead) { gn.pos.copy(tech.localToWorld(V3(0, 1.3, 1.6))); gn.yaw = tech.rotation.y + Math.PI; } });
    await c.say(DAW, 'Technical! Kill the gunner or put enough rounds in the engine!', 3);
    await c.until(() => all2.every(u => u.dead));
    await c.say(OKA + ' (RADIO)', "Courier went up the outside stairs on the north row. He's on the rooftops!", 3.6, true);
    await c.say(DAW, 'Go! Go! I\'ll cover the street!', 2);
    c.complete();
  },
});

/* ======================= 4. ROOFTOPS ======================= */
PARTS.push({
  name: 'Rooftops', act: "The Jackal's Road", map: 'town', env: 'dawn', place: 'Rooftops, Tamanrasset', time: '06:52 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'Use the planks between roofs. Sprint and jump if you miss one.',
  setup(c, W, P) {
    P.pos.copy(at(-66, -43)); P.yaw = Math.PI;
    const ry = SP.TOWN.roofY; const row = SP.TOWN.row;
    const path = []; row.forEach((h, i) => { path.push(V3(h.x, ry, -30)); if (i < row.length - 1) path.push(V3(h.x + 6, ry + 0.12, -30 + (i % 3 - 1) * 2.5)); });
    c.path = path;
    const y = npc(c, YUS, V3(-60, ry, -30), { head: 'bare', top: 0x3d5a2a, pants: 0x2a2a2a, seed: 505 }); y.behavior = 'idle'; y.runSpeed = 4.2; c.y = y;
    c.roofFoes = coverFoes(c, [[-12, -33.5, ry], [12, -26.5, ry], [24, -33.5, ry], [36, -26, ry], [48, -33.4, ry]], { sight: 70 });
    c.streetFoes = assault(c, 6, [-40, 40, -48, -42], V3(0, 0, -40)); c.streetFoes.forEach(u => { u.stopDist = 30; });
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.06);
    const y = c.y; c.obj('Chase the courier across the rooftops', () => y.pos, 'COURIER');
    await c.say(DAW + ' (RADIO)', 'Up the stairs, Sarton! Don\'t let him reach the end of the row!', 3);
    let k = 1; let done = false;
    const run = (async () => { while (k < c.path.length) { const p = c.path[k]; let arrived = false; y.moveTo(p, true).then(() => arrived = true); await c.until(() => { y.hold = P.pos.distanceTo(y.pos) > 32 && P.pos.y > 4; return arrived; }); k++; } done = true; })().catch(() => { });
    tick(dt => { if (P.pos.y < 3 && G.time > 20 && Math.hypot(P.pos.x - y.pos.x, P.pos.z - y.pos.z) > 45) { G.hud.timer('GET BACK ON THE ROOFS'); } else G.hud.timer(null); });
    await c.until(() => done);
    G.hud.timer(null); SP.onTick = null;
    await c.say(YUS, "Stop! Stop, I'm not armed! Don't shoot!", 2.6);
    y.hands = 'up'; c.obj('Grab the courier', () => y.pos, 'COURIER');
    await new Promise(res => G.addInteract({ pos: () => y.pos, radius: 2.4, text: 'Grab the courier', onUse: res }));
    c.complete();
  },
});

/* ======================= 5. THE COURIER ======================= */
PARTS.push({
  name: 'The Courier', act: "The Jackal's Road", map: 'town', env: 'dawn', envOver: { sunEl: 12 }, place: 'Rooftops, Tamanrasset', time: '07:01 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'Stay low behind the parapet and pop up to shoot down into the street.',
  setup(c, W, P) {
    const ry = SP.TOWN.roofY; P.pos.set(56, ry, -30); P.yaw = -Math.PI / 2;
    const y = npc(c, YUS, V3(60, ry, -30), { head: 'bare', top: 0x3d5a2a, pants: 0x2a2a2a, seed: 505 }); y.fixedY = true; y.hands = 'up'; y.stance = 'kneel'; y.lookAt = V3(50, 0, -30); c.y = y;
    const d = c.ally(DAW, { pos: V3(53, ry, -32) }); d.fixedY = true; const o = c.ally(OKA, { pos: V3(52, ry, -28) }); o.fixedY = true;
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.05); const ry = SP.TOWN.roofY;
    await c.say(JAKE, "Where is he? The American they took from the base.", 3);
    await c.say(YUS, "I carry money. Only money. I don't know any American.", 3);
    const ch = await choice('"You lie to me again and you go off this roof."', '"Talk, and we keep the Jackal\'s men away from you."');
    SP.save.choice2 = ch; SP.persist();
    if (ch === 1) { await c.say(JAKE, 'You lie to me again and you go off this roof.', 3); await c.say(YUS, "Okay! Okay! They move a prisoner tomorrow. A convoy through the Hoggar pass.", 4); }
    else { await c.say(JAKE, "Talk, and we keep the Jackal's men away from you.", 3); await c.say(YUS, "...They will kill my family. But fine. A convoy goes through the Hoggar pass tomorrow. With a prisoner.", 5); }
    await c.say(YUS, 'Where it goes after, nobody tells me. Up into the mountains. Caves.', 3.4);
    await c.say(OKA, 'Trucks. Lots of them, coming in from the south road.', 2.8);
    await c.say(RAM + ' (RADIO)', "Hold that roof. Our ride is three minutes out.", 3, true);
    // rooftop defense with timer
    c.d = c.squad[DAW]; const total = 150; let left = total; const foes = [];
    const wave = () => { const n = 6; foes.push(...assault(c, n, [30, 90, -70, -56], V3(58, 0, -40))); foes.push(...assault(c, 3, [30, 90, -5, 5], V3(58, 0, -22))); foes.forEach(u => { u.stopDist = 18; }); };
    c.obj('Hold the roof until extraction'); wave();
    tick(dt => { left -= dt; const s = Math.max(0, Math.ceil(left)); G.hud.timer('EXTRACTION  ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')); });
    const roofers = coverFoes(c, [[36, -26.5, ry], [24, -33.6, ry]]); foes.push(...roofers);
    await c.wait(45); wave(); await c.say(DAW, 'They\'re trying the back of the building!', 2.4);
    await c.wait(45); wave(); await c.say(OKA, 'Another truck. Heads down!', 2);
    await c.until(() => left <= 0); G.hud.timer(null);
    A.loop('eng', 'engine', 0.15);
    await c.say(RAM + ' (RADIO)', "Trucks are below you, east side. Bring the courier. We're going to the pass.", 3.6, true);
    await c.fade(1, 1.5); c.complete();
  },
});

/* ======================= 6. HIGHWAY (convoy ambush) ======================= */
PARTS.push({
  name: 'Highway', act: "The Jackal's Road", map: 'pass', env: 'afternoon', place: 'Hoggar pass road', time: '15:30 LOCAL', loadout: ['m4', 'at4', 'dmr'],
  deathTip: 'Use the AT4 (2) on the lead truck, then the marksman rifle (3) on the dismounts climbing the slope.',
  setup(c, W, P) {
    const L = SP.PASS.ledge; P.pos.copy(V3(L.x - 4, L.y, L.z)); P.yaw = Math.PI / 2; P.inv.at4.res = 3;
    [[OKA, -5, 6], [DAW, -3, -6], [RAM, 2, 3], [DOC, 3, -3]].forEach(([n, dx, dz]) => { const u = c.ally(n, { pos: at(L.x + dx, L.z + dz) }); toCover(u, at(L.x - 6.5, L.z + dz * 0.8), null, true); u.inCover = true; u.holdFire = true; });
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.06);
    await c.say(OKA, 'Road below runs right past us. They\'ll come from the south.', 3);
    await c.say(RAM, 'Six vehicles on the drone feed. Lead truck, two technicals, cargo trucks. One of them has a cage on the back.', 4.6);
    c.obj('Wait for the convoy');
    // convoy on the road
    const road = []; for (let z = 260; z >= -200; z -= 10) road.push(V3(SP.PASS.cx(z), 0, z)); const curve = new T.CatmullRomCurve3(road);
    const kinds = ['truck', 'tech', 'truck', 'cage', 'tech', 'truck'];
    const vs = kinds.map((k, i) => { const m = k === 'tech' ? SP.Models.technical(0xc8c0b0) : SP.Models.truck('cargo', k === 'cage' ? 0x4a4a3a : 0x6a6a4a); const v = new SP.Vehicle(m, { team: 'foe', hp: k === 'tech' ? 450 : 700, speed: 9, curve, u: Math.max(0, 0.0 - i * 0.03) }); v.kind = k; v.idx = i; if (k === 'tech') { const g = c.foe({ pos: m.position.clone(), alert: 1, behavior: 'hold', acc: 0.85 }); g.fixedY = true; v.gunner = g; } return v; });
    vs.forEach((v, i) => { v.u = 0.16 - i * 0.026; v.delay = 0.5; v.spd = 0; v.update(0); });
    let t = 0, stopped = false;
    tick(dt => { t += dt; vs.forEach(v => { if (v.dead) return; if (!stopped && t > v.delay) v.spd = 9; if (stopped) v.spd = Math.max(0, v.spd - dt * 6); if (v.gunner && !v.gunner.dead) { v.gunner.pos.copy(v.mesh.localToWorld(V3(0, 1.3, 1.6))); } }); });
    await c.until(() => vs[0].u > 0.5 || vs[0].dead); c.obj('Destroy the lead truck with the AT4 (press 2)', () => vs[0].dead ? null : vs[0].mesh.position, 'LEAD');
    await c.say(OKA, 'Lead truck. Now.', 1.4);
    await c.until(() => vs[0].dead || vs[0].u > 0.75);
    stopped = true; Object.values(c.squad).forEach(u => { u.holdFire = false; });
    await c.say(DAW, "Convoy's stopped! Light 'em up!", 2);
    const dis = []; vs.forEach(v => { if (v.kind === 'truck' || v.kind === 'cage') { const p = v.mesh.position; for (let i = 0; i < (v.kind === 'cage' ? 2 : 4); i++) { const u = c.foe({ pos: p.clone().add(V3(rand(-3, 3), 0, rand(-3, 3))), alert: 1, behavior: 'assault', acc: 0.75 }); u.goal2 = SP.PASS.ledge.clone().add(V3(-12, 0, rand(-10, 10))); u.stopDist = rand(14, 30); dis.push(u); } } });
    const allF = dis.concat(vs.filter(v => v.gunner).map(v => v.gunner));
    tick(dt => { vs.forEach(v => { if (v.gunner && !v.gunner.dead && !v.dead) v.gunner.pos.copy(v.mesh.localToWorld(V3(0, 1.3, 1.6))); if (!v.dead) v.spd = Math.max(0, v.spd - dt * 6); }); countObj(c, 'Kill the convoy guards', allF)(); });
    await c.until(() => allF.filter(u => !u.dead).length <= 6);
    await c.say(RAM, 'Second group climbing the slope on your left!', 2.4);
    const flank = assault(c, 7, [SP.PASS.ledge.x - 30, SP.PASS.ledge.x - 15, -170, -150], SP.PASS.ledge); allF.push(...flank);
    await c.until(() => allF.every(u => u.dead));
    const cage = vs.find(v => v.kind === 'cage');
    c.obj('Check the cage truck', () => cage.mesh.position, 'CAGE');
    await c.say(DAW, "Cage truck. Please let him be in there.", 2.6);
    await new Promise(res => G.addInteract({ pos: () => cage.mesh.position.clone().add(V3(0, 0, 3.6).applyAxisAngle(V3(0, 1, 0), cage.mesh.rotation.y)), radius: 4, text: 'Open the cage', hold: 1.5, onUse: res }));
    await c.say(JAKE, "...Empty. There's blood on the floor. And this.", 3);
    G.hud.feed('FOUND · HOUSER\'S WATCH', 'gold');
    await c.say(DAW, "That's Sarge's watch. They had him in here. Recently.", 3);
    await c.say(RAM, 'Driver\'s log says the prisoner was unloaded at the caves at the north end of the pass. Last night.', 4.4);
    c.complete();
  },
});

/* ======================= 7. CANYON ======================= */
PARTS.push({
  name: 'Canyon', act: "The Jackal's Road", map: 'pass', env: 'dusk', place: 'North end of the Hoggar pass', time: '18:40 LOCAL', loadout: ['dmr', 'm4'],
  deathTip: 'Watch for the glint of a scope on the cliffs. Snipers die to one marksman shot.',
  setup(c, W, P) {
    P.pos.copy(at(SP.PASS.cx(-180), -180)); P.yaw = 0;
    squad(c, [OKA, DAW, RAM], SP.PASS.cx(-180), -175, 0); followPlayer(c, [OKA, DAW, RAM]);
    const sn = [[-235, 1, 48], [-290, -1, 52], [-340, 1, 45], [-395, -1, 55], [-450, 1, 50], [-500, -1, 46]];
    c.snipers = sn.map(([z, s, off]) => { const x = SP.PASS.cx(z) + s * off; const u = c.foe({ pos: at(x, z), behavior: 'hold', alert: 1, acc: 1.6, sight: 160, crouchCover: true }); u.crouch = true; u.sniper = true; return u; });
    c.groups = [];
    [[-310, 0], [-455, 0]].forEach(([z]) => { const cx = SP.PASS.cx(z); c.groups.push(coverFoes(c, [[cx - 9, z - 3], [cx + 9, z - 4], [cx - 12, z - 10], [cx + 11, z - 12], [cx, z - 16]], { sight: 60 })); });
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.08);
    const glints = c.snipers.map(u => { const s = new T.Sprite(new T.SpriteMaterial({ color: new T.Color(14, 12, 9), transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.scale.setScalar(0.6); G.scene.add(s); return { u, s }; });
    tick(dt => { glints.forEach(g => { g.s.visible = !g.u.dead && Math.sin(G.time * 3 + g.u.id) > 0.6; if (!g.u.dead) g.s.position.copy(g.u.pos).add(V3(0, 1.2, 0)); }); countObj(c, 'Kill the snipers on the cliffs', c.snipers)(); });
    await c.say(OKA, 'Cliffs on both sides. If I were them, I\'d put snipers up high. Use the scope and look for a glint.', 4.2);
    c.obj('Kill the snipers on the cliffs');
    await c.until(() => c.snipers.filter(u => !u.dead).length <= 4 || P.pos.z < -300);
    await c.say(DAW, 'Movement on the road ahead! Behind the rocks!', 2.4);
    await c.until(() => c.groups[0].every(u => u.dead) || P.pos.z < -380);
    await c.until(() => c.snipers.filter(u => !u.dead).length <= 1 || P.pos.z < -470);
    await c.say(RAM, 'Last group by the cave mouth.', 2);
    await c.until(() => c.groups[1].every(u => u.dead));
    glints.forEach(g => G.scene.remove(g.s));
    c.obj('Reach the cave entrance', () => SP.PASS.cave, 'CAVE');
    tick();
    await c.near(SP.PASS.cave, 9);
    await c.say(OKA, 'Fresh tire tracks right up to the mouth. And boot prints.', 3);
    c.complete();
  },
});

/* ======================= 8. THE CAVES ======================= */
PARTS.push({
  name: 'The Caves', act: "The Jackal's Road", map: 'caves', env: 'cave', place: 'Caves under Assekrem', time: '20:05 LOCAL', loadout: ['m4', 'pistol'],
  deathTip: 'The camp guards are sitting down at first. Take a few quietly before the shooting starts.',
  setup(c, W, P) {
    P.pos.set(0, 0, 0); P.yaw = 0; c.ally(OKA, { pos: V3(0.8, 0, 1.5) }); c.ally(DAW, { pos: V3(-0.8, 0, 1.5) }); followPlayer(c, [OKA, DAW], 0.5);
    const fl = new T.SpotLight(0xfff1d8, 10, 34, 0.45, 0.55, 2); fl.castShadow = true; fl.shadow.mapSize.set(512, 512); fl.shadow.bias = -0.002; SP.camera.add(fl); fl.position.set(0.25, -0.2, 0); fl.target.position.set(0, -0.2, -5); SP.camera.add(fl.target); c.fl = fl; P.flash = true;
    const sit = [[-4, -60], [-2, -62], [3, -61], [5, -57]].map(([x, z]) => { const u = c.foe({ pos: V3(x, 0, z), behavior: 'idle', alert: 0, stance: 'sit', sight: 30 }); u.aware = false; u.lookAt = V3(0, 0, -58); return u; });
    const stand = [[-10, -66], [10, -50], [8, -68], [-11, -49]].map(([x, z]) => { const u = c.foe({ pos: V3(x, 0, z), behavior: 'hold', alert: 0, sight: 30 }); u.aware = false; u.lookAt = V3(0, 0, -40); return u; });
    c.camp = sit.concat(stand);
  },
  async run(c, W, P) {
    A.loop('drip', 'drip', 0.04); A.loop('hum', 'hum', 0.015);
    tick(dt => { if (I.hit('KeyT')) { P.flash = !P.flash; A.click(1100, 0.08); } c.fl.intensity = P.flash ? 10 : 0; });
    c.obj('Move through the caves', V3(0, 0, -44), 'CAVE');
    await c.say(OKA, 'Voices ahead. And firelight. Lights off and stay low.', 3);
    SP.onAlert = () => { c.camp.forEach(u => { u.aware = true; u.stance = null; u.behavior = 'assault'; u.goal2 = null; u.stopDist = 8; }); };
    c.obj('Clear the camp');
    const base = SP.onTick; tick(base, countObj(c, 'Clear the camp', c.camp));
    await c.allDead(c.camp);
    await c.say(DAW, 'Camp\'s clear. Tunnel keeps going east.', 2.4);
    c.obj('Follow the tunnel east', V3(50, 0, -58), 'TUNNEL'); tick(base);
    await c.until(() => P.pos.x > 36);
    const amb = [[50.5, -50], [51.5, -45], [56, -38], [60, -26]].map(([x, z]) => { const u = c.foe({ pos: V3(x, 0, z), alert: 1, behavior: 'assault', acc: 0.85 }); u.stopDist = 6; return u; });
    await c.say(OKA, 'Contact front!', 1.4);
    tick(base, countObj(c, 'Push through', amb)); await c.allDead(amb);
    c.obj('Plant a charge on the weapons cache', SP.CAVE.cache.clone().add(V3(4, 0, 1)), 'CACHE'); tick(base);
    await new Promise(res => G.addInteract({ pos: V3(58, 0, -28.6), radius: 2.6, text: 'Plant the charge', hold: 2.5, onUse: res }));
    let fuse = 20; c.obj('Get clear of the cache', V3(56, 0, 0), 'CLEAR');
    tick(base, dt => { fuse -= dt; G.hud.timer('CHARGE  ' + Math.max(0, fuse).toFixed(1)); });
    await c.until(() => fuse <= 0); G.hud.timer(null);
    G.explosion(V3(58, 0.6, -30), 14, 500, 'player'); G.addTrauma(1); SP.post.U.flash.value = 0.4; A.explosion(V3(58, 0, -30), 1.6);
    for (let i = 0; i < 30; i++) G.particle({ pos: V3(rand(50, 62), rand(1, 3.5), rand(-36, -24)), vel: V3(rand(-2, 2), rand(-1, 1), rand(4, 9)), life: 4, size: 2.5, grow: 2, color: new T.Color(0.25, 0.22, 0.2), opacity: 0.6 });
    await c.say(DAW, "That'll hurt their supply for a while.", 2.4);
    c.obj('Follow the tunnel north', V3(56, 0, 0), 'TUNNEL'); tick(base);
    await c.until(() => P.pos.z > -2 && P.pos.x > 50);
    c.obj('Search the ground', V3(56, 0, 4), 'SEARCH');
    await new Promise(res => G.addInteract({ pos: V3(56, 0, 4), radius: 2.4, text: 'Pick it up', hold: 1, onUse: res }));
    G.hud.feed('FOUND · HOUSER\'S DOG TAGS', 'gold');
    await c.say(JAKE, "His tags. He dropped them on purpose. He knew we'd follow.", 3.4);
    await c.say(OKA, 'Daylight up ahead. The fortress is right above us.', 2.8);
    c.obj('Climb out of the caves', SP.CAVE.exit, 'EXIT'); await c.near(SP.CAVE.exit, 4);
    c.complete();
  },
});

/* ======================= 9. STRONGHOLD ======================= */
PARTS.push({
  name: 'Stronghold', act: "The Jackal's Road", map: 'stronghold', env: 'night', place: 'Mountain fortress, Assekrem', time: '22:47 LOCAL', loadout: ['m4', 'dmr', 'pistol'],
  deathTip: 'Use the marksman rifle on the tower guards from the path before you push the gate.',
  setup(c, W, P) {
    P.pos.copy(at(-6, 86)); P.yaw = 0;
    squad(c, [OKA, DAW, RAM, DOC, MIT], -6, 89, 0); followPlayer(c, [OKA, DAW, RAM, DOC, MIT]);
    c.towerG = SP.HOLD.towers.map(t => { const u = c.foe({ pos: t.top.clone(), behavior: 'hold', alert: 0, sight: 70 }); u.fixedY = true; u.aware = false; u.lookAt = V3(0, 0, 120); return u; });
    const pa = c.foe({ pos: at(-8, 62), behavior: 'patrol', alert: 0 }); pa.aware = false; pa.path = [at(-8, 62), at(-2, 48)]; const pb = c.foe({ pos: at(4, 50), behavior: 'patrol', alert: 0 }); pb.aware = false; pb.path = [at(4, 50), at(-10, 60)];
    c.path = [pa, pb];
    c.yard = coverFoes(c, [[-8, 28.6], [10, 24.6], [-18, 1.5], [14, -2.6], [-20, 20], [-11, 20.5], [20, 18], [6, -18], [-6, -18], [-24, -18], [36, -26], [30, 4], [-34, 0], [0, 8]], { sight: 55 });
    c.yard.forEach(u => { u.aware = false; u.alert = 0; });
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.07);
    await c.say(OKA, 'Three towers. Two on the path. Take what you can quiet before we hit the gate.', 3.6);
    c.obj('Clear the path to the gate', V3(0, 0, 46), 'GATE');
    let loud = false; SP.onAlert = () => { if (loud) return; loud = true; [...c.towerG, ...c.path, ...c.yard].forEach(u => { u.aware = true; u.alert = 1; }); A.alarm(true); setTimeout(() => A.alarm(false), 8000); c.say(DAW, "They know we're here! Push!", 2).catch(() => { }); };
    await c.until(() => P.pos.z < 48 || loud);
    if (!loud) { SP.onAlert(); }
    c.obj('Take the yard'); tick(countObj(c, 'Take the yard', c.yard.concat(c.towerG)));
    await c.until(() => c.yard.concat(c.towerG).filter(u => !u.dead).length <= 2);
    tick(); c.obj('Breach the cell block', V3(21.5, 0, -12), 'CELLS');
    await new Promise(res => G.addInteract({ pos: V3(21.4, 0, -12), radius: 2.6, text: 'Breach the cell block', hold: 1.4, onUse: res }));
    A.explosion(V3(22, 1, -12), 0.4); G.addTrauma(0.3);
    const inner = [[25, -17], [25, -6]].map(([x, z]) => { const u = c.foe({ pos: V3(x, 0, z), alert: 1, behavior: 'assault', acc: 0.9 }); u.stopDist = 3; return u; });
    await c.allDead(inner);
    c.obj('Find Houser', V3(30.4, 0, -11.5), 'CELL');
    await c.say(DAW, 'Sarge! Sergeant Houser!', 1.8);
    await new Promise(res => G.addInteract({ pos: V3(30.3, 0, -11.5), radius: 2.4, text: 'Search the cell', hold: 1.5, onUse: res }));
    await c.say(JAKE, "...It's empty. Chains are still warm.", 2.6);
    G.hud.feed('FOUND · RADIO CODEBOOK (U.S. ISSUE)', 'gold');
    await c.say(JAKE, 'There\'s a codebook under the cot. This is ours. U.S. Army issue.', 3.4);
    A.loop('drone', 'drone', 0.35);
    await c.say(JACK + ' (SPEAKERS)', 'You are always one day late, Private Sarton.', 3.4, true);
    await c.say(JACK + ' (SPEAKERS)', 'Your sergeant is already far from here. And my friends in your army tell me everything you do.', 4.6, true);
    c.complete();
  },
});

/* ======================= 10. GONE ======================= */
PARTS.push({
  name: 'Gone', act: "The Jackal's Road", map: 'stronghold', env: 'night', place: 'Mountain fortress, Assekrem', time: '23:09 LOCAL', loadout: ['m4', 'at4', 'pistol'],
  deathTip: 'Keep moving toward the landing zone. At the LZ, use the rocks for cover until the helicopter lands.',
  setup(c, W, P) {
    P.pos.set(20, 0, -12); P.yaw = -Math.PI / 2 + Math.PI; P.inv.at4.res = 2;
    squad(c, [OKA, DAW, RAM, DOC, MIT], 16, -12, Math.PI / 2); followPlayer(c, [OKA, DAW, RAM, DOC, MIT]);
    for (let i = 0; i < 8; i++) { const p = at(rand(-30, 30), rand(-30, 30)); const u = c.foe({ pos: p }); u.die(false); }
  },
  async run(c, W, P) {
    A.loop('wind', 'wind', 0.07); A.loop('drone', 'drone', 0.3); A.alarm(true);
    await c.say(RAM + ' (RADIO)', "Command says bird can be at the LZ in four minutes. East gate, down the slope. Move!", 3.6, true);
    c.obj('Get to the landing zone', SP.HOLD.lz, 'LZ');
    let mortar = true; (async () => { while (mortar) { await c.wait(rand(2, 3.5)); const t = P.pos.clone().add(V3(rand(-16, 16), 0, rand(-16, 16))); if (t.distanceTo(P.pos) < 6) t.x += 8; t.y = SP.W.heightAt(t.x, t.z); G.mortar(t, 1.5); } })().catch(() => { });
    const w1 = assault(c, 8, [-30, 10, -36, -20], SP.HOLD.lz); const w2 = assault(c, 6, [-40, -20, 0, 30], V3(45, 0, -10));
    tick(countObj(c, 'Get to the LZ', w1.concat(w2)));
    await c.until(() => Math.hypot(P.pos.x - 45, P.pos.z + 10) < 8 || Math.abs(P.pos.x) > 47 || Math.abs(P.pos.z) > 42);
    A.alarm(false);
    const techs = [[[-40, 160], [0, 130], [40, 110], [55, 100]], [[140, 160], [110, 130], [85, 108]]].map(pts => { const m = SP.Models.technical(0xb8b0a0); const v = new SP.Vehicle(m, { team: 'foe', hp: 560, speed: 12, curve: new T.CatmullRomCurve3(pts.map(([x, z]) => V3(x, 0, z))) }); v.onArrive = vv => { vv.spd = 0; }; const g = c.foe({ pos: m.position.clone(), alert: 1, behavior: 'hold', acc: 0.85 }); g.fixedY = true; v.gunner = g; return v; });
    await c.near(SP.HOLD.lz, 14);
    c.obj('Hold the LZ until the helicopter lands');
    const total = 90; let left = total; const heli = heliIn(W, SP.HOLD.lz, Math.PI, 80); A.loop('rotor', 'rotor', 0.2);
    const w3 = assault(c, 10, [20, 60, 30, 60], SP.HOLD.lz);
    tick(dt => { left -= dt; const s = Math.max(0, Math.ceil(left)); G.hud.timer('BIRD ETA  ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')); spinHeli(heli, dt, left <= 0 ? SP.W.heightAt(SP.HOLD.lz.x, SP.HOLD.lz.z) + 0.1 : SP.W.heightAt(SP.HOLD.lz.x, SP.HOLD.lz.z) + 15 + left * 0.8); techs.forEach(v => { if (!v.dead && v.gunner && !v.gunner.dead) v.gunner.pos.copy(v.mesh.localToWorld(V3(0, 1.3, 1.6))); }); });
    await c.wait(40); assault(c, 8, [40, 90, 20, 50], SP.HOLD.lz);
    await c.until(() => left <= 0); mortar = false; G.hud.timer(null);
    c.obj('Get on the helicopter', () => heli.position, 'BOARD');
    await c.near(() => heli.position, 6);
    // final scene
    SP.lbTarget = 1; P.mode = 'locked'; SP.blurTarget = 0.15;
    await c.fade(1, 1.2); G.units.filter(u => u.team === 'foe').forEach(u => u.remove());
    P.pos.copy(heli.position).add(V3(0, 0.9, 0)); await c.fade(0, 1.2);
    await c.say(RAM, "I've been going through the codebook. These are our frequencies. Our call signs. This month's.", 4.6);
    await c.say(DAW, "So the Jackal's got a friend on our side.", 2.6);
    await c.say(OKA, "That's how he knew about the base. That's how he's always a day ahead.", 3.4);
    await c.say(JAKE, "Then we find who it is. And they lead us to Houser.", 3);
    await c.fade(1, 2.5); c.complete();
  },
});
})();

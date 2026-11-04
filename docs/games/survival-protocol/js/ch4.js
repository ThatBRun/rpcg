/* Survival Protocol — Chapter 4: Iron Desert (14 parts) */
'use strict';
(function () {
const T = THREE, { V3, rand } = SP; const G = SP.G, A = SP.Audio;
const RAM = 'CPL. RAMIREZ', DAW = 'PVT. DAWSON', OKA = 'OKAFOR', DOC = 'DOC LEE', MIT = 'PVT. MITCHELL', JAKE = 'JAKE', REY = 'CPT. REYES', HOU = 'SGT. HOUSER', JACK = 'THE JACKAL', WAR = 'WARDEN';
const SQ = [RAM, DAW, OKA, DOC];
const at = (x, z, y) => V3(x, y != null ? y : SP.W.heightAt(x, z), z);
const PARTS = SP.PARTS4 = [];
PARTS.endTitle = 'Houser is coming home';
PARTS.endText = 'Sgt. Houser walked out of Kufra on his own feet. Before he passed out on the helicopter, he said one thing: the Jackal is moving everything out by sea, through Oran. Chapter 5, The Jackal, ends it.';
const add = (def) => PARTS.push(SP.mission(Object.assign({ act: 'Iron Desert' }, def)));
const passPath = (z0, z1, step = 20) => { const out = []; for (let z = z0; z >= z1; z -= step) out.push([SP.PASS.cx(z), z]); return out; };
const HOUSER_ALLY = (pos, follow = true) => ({ name: HOU, look: 'houserPrisoner', pos, follow, off: -1.5, o: { team: 'ally', weapon: 'pistol', acc: 0.6, look: { weapon: 'pistol' } } });
function openGate(W) { const P = SP.PRISON; P.gateCols.forEach(c => { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); }); let k = 0; const f = () => { k += 0.03; P.gatePanels[0].position.x = -2 - k * 4; P.gatePanels[1].position.x = 2 + k * 4; if (k < 1) requestAnimationFrame(f); }; f(); }
function freeCell(W, cell) { const zw = cell.bars.z + (cell.z > cell.bars.z ? 0.7 : -0.7); W.colliders = W.colliders.filter(c => !(Math.abs((c.box.min.z + c.box.max.z) / 2 - zw) < 0.2 && Math.abs((c.box.min.x + c.box.max.x) / 2 - cell.x) < 0.3 && c.box.max.y < 2.7)); W.scene.traverse(m => { if (m.isMesh && Math.abs(m.position.z - zw) < 0.05 && Math.abs(m.position.x - cell.x) < 2.1 && Math.abs(m.position.y - 1.3) < 0.01) m.visible = false; }); }

/* 1. INSERTION */
add({
  name: 'Insertion', map: 'desert', env: 'night', place: 'Libyan border, Tassili N\'Ajjer', time: '01:30 LOCAL · FOUR DAYS LATER', loadout: ['m4', 'pistol'], squad: [RAM, DAW, OKA, DOC, MIT], flash: true,
  player: [1.5, 30, 0],
  deathTip: 'Press T for the flashlight, but it shows you to the enemy as well.',
  stages: [
    { say: [[REY, 'This is Reyes. You\'re on the ground. No air support past the border, no QRF. Whatever happens, you walk out.', 5, true], [JAKE, 'Copy. Walking.', 1.4]] },
    { go: [-2, -10], obj: 'Move north along the wadi', label: 'MOVE', r: 6 },
    { say: [[MIT, 'So this is Libya. Looks like Algeria.', 2.4], [OKA, 'It is Algeria for another four kilometres, genius.', 2.8], [DOC, 'Keep it down. Sound carries out here.', 2.2]] },
    { go: [-2, -40], obj: 'Reach the supply drop', label: 'DROP', r: 6 },
    { use: [-5, -42], text: 'Unpack the supply drop', hold: 2.5, feedText: 'ACQUIRED: EXTRA MAGAZINES · NIGHT CHARGES' },
    { say: [[RAM, 'Charges, wire, two days of water. Somebody back home likes us.', 3]] },
    { go: [3, -88], obj: 'Keep moving north', label: 'MOVE', r: 6 },
    { say: [[OKA, 'Hold. Lights on the road. Patrol.', 2]] },
    { fight: [{ n: 4, area: [-20, 20, -140, -120], goal: [3, -95], stop: 16, acc: 0.6 }], obj: 'Take out the patrol' },
    { say: [[DOC, 'They were carrying Libyan militia patches. We\'re close.', 2.8], [REY, 'Outpost ahead is the last thing between you and Kufra. Get eyes on it.', 3.4, true]] },
    { go: [0, -110], obj: 'Get eyes on the outpost', label: 'OUTPOST', r: 6 },
  ],
});

/* 2. DUNES AT NIGHT */
add({
  name: 'Dunes at Night', map: 'desert', env: 'night', place: 'Militia waystation, Wadi Bishara', time: '02:15 LOCAL', loadout: ['sup', 'pistol'], squad: [OKA], flash: true,
  player: [0, -112, 0],
  deathTip: 'Crouch (C) to stay hidden. Guards with question marks are getting suspicious.',
  stages: [
    { say: [[OKA, 'Six guards, maybe seven. If they see us they radio the prison and Houser disappears again.', 4], [JAKE, 'So they don\'t see us.', 1.6], [OKA, 'Through the village and out the north side. Quiet.', 2.4]] },
    { stealth: { guards: [[-10, -140, [[-10, -140], [12, -140]]], [30, -170, [[30, -170], [30, -205]]], [-30, -176], [0, -200, [[0, -200], [-16, -206]]], [16, -236], [-30, -245, [[-30, -245], [-10, -250]]]], go: [8, -268], r: 6, sight: 32, alarmWave: { n: 5, area: [-40, 40, -270, -250], goal: [0, -200] } }, obj: 'Get through the waystation unseen' },
    { fn: async (c) => { await c.say(c.wentLoud ? OKA : OKA, c.wentLoud ? 'Well, that was loud. Hope their radio is broken.' : 'Not one shot. They\'ll never know we were here.', 3); } },
    { go: [8, -290], obj: 'Keep heading north', label: 'NORTH', r: 6 },
  ],
});

/* 3. OUTPOST */
add({
  name: 'Outpost', map: 'desert', env: 'dawn', place: 'Militia waystation, Wadi Bishara', time: '05:55 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [RAM, DAW, OKA, DOC, MIT],
  player: [0, -268, Math.PI],
  deathTip: 'Use the AT4 on the technicals. Stay behind the walls when they open fire.',
  stages: [
    { say: [[REY, 'Change of plan. Prison convoy leaves at oh-seven-hundred. You need the outpost\'s vehicles and its radio codes. Take it.', 5, true], [RAM, 'Five of us, one outpost. Sounds fair.', 2.4], [MIT, 'There are six of us.', 1.6], [RAM, 'I wasn\'t counting you.', 1.6]] },
    { go: [-4, -248], obj: 'Move up to the north wall', label: 'MOVE', r: 6 },
    { fight: [{ n: 6, area: [-30, 30, -215, -180], goal: [0, -245] }, { n: 5, area: [-40, 40, -170, -150], goal: [0, -225], say: [DAW, 'Second group, south houses!', 2] }, { n: 2, area: [-10, 10, -150, -140], tech: [[[3, -60], [0, -140], [2, -175]], [[30, -80], [20, -150], [16, -170]]], goal: [0, -210], say: [OKA, 'Two technicals coming up the road!', 2.2] }], obj: 'Take the outpost' },
    { use: [-6, -182], text: 'Copy the radio codebook', hold: 3, obj: 'Get the outpost\'s radio codes', label: 'RADIO', feedText: 'ACQUIRED: KUFRA CONVOY SCHEDULE · CALL SIGNS' },
    { say: [[JAKE, 'Convoy codes. Call signs. And a prisoner list.', 2.6], [JAKE, 'Number forty-one: "American, sergeant, does not speak."', 3.2], [OKA, 'That\'s Houser. That\'s exactly Houser.', 2.4]] },
  ],
});

/* 4. RADIO TOWER */
add({
  name: 'Radio Tower', map: 'base', env: 'afternoon', place: 'Abandoned Libyan airfield, Jebel Uweinat', time: '13:20 LOCAL', loadout: ['m4', 'pistol'], squad: [RAM, DAW, OKA, DOC],
  player: [0, -62, Math.PI],
  deathTip: 'Hold near the sandbags around the tower while the relay uploads.',
  stages: [
    { say: [[RAM, 'Militia uses this mast to talk to Kufra. If we put our relay on it, I can listen to every word the prison says.', 4.6], [REY, 'And tell them whatever we want them to hear. Do it.', 2.8, true]] },
    { fight: [{ n: 5, area: [30, 60, -30, -10], goal: [20, -50] }, { n: 4, area: [-60, -40, -50, -20], goal: [0, -55], say: [OKA, 'Barracks, left side!', 1.6] }], obj: 'Clear the airfield' },
    { use: [26, -49], text: 'Mount the relay on the mast', hold: 3.5, obj: 'Mount the relay on the radio mast', label: 'MAST' },
    { say: [[RAM, 'Relay\'s on. Uploading. It needs two minutes and they just heard us knock.', 3.4]] },
    { defend: { secs: 100, label: 'UPLOAD', waves: [{ t: 3, n: 5, area: [30, 60, 10, 40], goal: [26, -50] }, { t: 30, n: 5, area: [-60, -40, -40, 40], goal: [26, -50], say: [DAW, 'Barracks again!', 1.6] }, { t: 55, n: 6, area: [30, 70, -30, 0], goal: [26, -50] }, { t: 78, n: 6, area: [-30, 30, 10, 60], goal: [26, -50], say: [DOC, 'They\'re coming through the hangar!', 2] }], clear: true }, obj: 'Defend the mast' },
    { say: [[RAM, 'Got it. We have their net. Listen...', 2.4], [WAR, '...the American goes to the transport at seven. Shoot him if the escort is late.', 3.6, true], [JAKE, 'Then the escort will be early.', 2]] },
  ],
});

/* 5. SUPPLY RUN */
add({
  name: 'Supply Run', map: 'pass', env: 'afternoon', place: 'Kufra road', time: '15:40 LOCAL', loadout: ['m4', 'pistol'], follow: false,
  get player() { return [SP.PASS.cx(260), 260, Math.PI]; },
  deathTip: 'Shoot the gunners on the technicals first.',
  stages: [
    { say: [[DAW, 'Militia supply truck, ahead of us, going to Kufra. If we take it, we drive right through the front gate.', 4.4], [JAKE, 'And its friends?', 1.4], [DAW, 'Its friends are behind us.', 1.8]] },
    { chase: { get path() { return passPath(260, -190, 22); }, speed: 17, driver: DAW, spawns: [{ t: 4, side: -5, kind: 'buggy', say: [DAW, 'Here they come!'] }, { t: 12, side: 5, kind: 'tech' }, { t: 22, side: -4, kind: 'buggy' }, { t: 30, side: 5, kind: 'tech', say: [JAKE, 'Technical, right side!'] }, { t: 40, side: -5, kind: 'tech' }, { t: 50, side: 4, kind: 'buggy', say: [DAW, 'Last one!'] }] }, obj: 'Keep the militia off your vehicle' },
    { get fight() { const x = SP.PASS.cx(-205); return [{ cover: [[x - 5, -205], [x + 6, -210], [x - 3, -216], [x + 4, -222]], n: 2, area: [x - 10, x + 10, -235, -225], goal: [x, -195] }]; }, obj: 'Take the supply truck' },
    { say: [[DAW, 'Truck\'s ours. Militia paint, militia plates. We look just like them.', 3.2], [JAKE, 'We smell worse.', 1.4]] },
  ],
});

/* 6. CHECKPOINT */
add({
  name: 'Checkpoint', map: 'pass', env: 'sunset', place: 'Militia checkpoint, Kufra road', time: '18:20 LOCAL', loadout: ['dmr', 'm4', 'pistol'], follow: false,
  get player() { const L = SP.PASS.ledge; return [L.x, L.z, Math.PI / 2, L.y]; },
  deathTip: 'Shoot the snipers on the road first. They have scopes too.',
  npcs: [{ name: OKA, look: 'x', pos: [0, 0], o: { team: 'ally', weapon: 'ak', look: { skin: 0x5c3a28, seed: 44, faction: 'us' } } }],
  setup(c, W, P) { const o = c.squad[OKA]; o.pos.copy(P.pos).add(V3(0, 0, 2.5)); o.pos.y = W.heightAt(o.pos.x, o.pos.z); o.behavior = 'hold'; o.stance = 'crouch'; },
  stages: [
    { say: [[OKA, 'One checkpoint between us and the prison. They know every truck by sight.', 3.2], [OKA, 'So they don\'t get to see this one. Thin them out from up here.', 3]] },
    { get snipe() { const s = [[-100, -8], [-110, 6], [-150, -5], [-160, 7], [-175, 0]]; return s.map(([z, o]) => [SP.PASS.cx(z) + o, z]); }, obj: 'Thin out the checkpoint from the ledge' },
    { say: [[OKA, 'They\'re calling for help. Go down, I\'ll cover.', 2.4]] },
    { go: () => at(SP.PASS.cx(-130), -130), obj: 'Get down to the road', label: 'ROAD', r: 6 },
    { get fight() { const x = SP.PASS.cx(-180); return [{ n: 5, area: [x - 12, x + 12, -215, -195], goal: [x, -150] }, { n: 3, area: [x - 10, x + 10, -230, -220], tech: [[[SP.PASS.cx(-300), -300], [SP.PASS.cx(-220), -220], [SP.PASS.cx(-190), -190]]], goal: [x, -160], say: [OKA, 'Reinforcements from the north!', 2] }]; }, obj: 'Clear the checkpoint' },
    { use: () => at(SP.PASS.cx(-170) + 3, -170), text: 'Take the checkpoint logbook', hold: 2, obj: 'Grab the checkpoint logbook', label: 'LOG', feedText: 'KUFRA PRISON · NIGHT SHIFT CHANGES AT 02:00' },
  ],
});

/* 7. THE PRISON */
add({
  name: 'The Prison', map: 'prison', env: 'sunset', place: 'Ridge above Kufra prison', time: '19:05 LOCAL', loadout: ['dmr', 'm4', 'pistol'], squad: [RAM, OKA], squadFixed: false,
  player: [0, 192, 0],
  deathTip: 'Shoot the tower guards first. They have the best view of the ridge.',
  stages: [
    { cut: [[JAKE, 'Kufra. Old Italian fort, new walls. Four towers.', 3], [RAM, 'Three cell blocks. Middle one is where Kessler said.', 2.8], [OKA, 'Hundreds of prisoners in there. Not just Houser.', 2.6], [JAKE, 'One thing at a time.', 1.6]], look: [0, -0.06] },
    { say: [[REY, 'Shift change is at oh-two-hundred. Until then, you have two jobs. Count them, and kill the ones who can see the ridge.', 5, true]] },
    { snipe: [[-70, 58, 7.4], [70, 58, 7.4], [-10, 72], [10, 74]], obj: 'Kill the guards who can see the ridge' },
    { say: [[OKA, 'Clean. Nobody inside heard a thing. They\'ll call it a radio fault.', 3.2], [RAM, 'Their radio says they\'re sending two guys to check the gate.', 2.8]] },
    { fight: [{ n: 4, area: [-12, 12, 66, 72], goal: [0, 110], stop: 30 }], obj: 'Deal with the patrol' },
    { say: [[REY, 'Now you wait for dark.', 1.8, true]] },
  ],
});

/* 8. WALLS */
add({
  name: 'Walls', map: 'prison', env: 'night', place: 'South wall, Kufra prison', time: '02:02 LOCAL', loadout: ['sup', 'm4', 'pistol'], squad: [OKA], flash: false,
  player: [0, 150, 0],
  deathTip: 'Stay out of the floodlights. Guards near the wall patrol in pairs.',
  stages: [
    { say: [[OKA, 'Shift change. Fresh guards, sleepy eyes. Let\'s go.', 2.6]] },
    { stealth: { guards: [[-30, 70, [[-30, 70], [30, 70]]], [30, 76, [[30, 76], [-20, 76]]], [-55, 80], [55, 82], [0, 90, [[0, 90], [14, 100]]]], go: [0, 66], r: 4, sight: 30, alarmWave: { n: 4, area: [-20, 20, 70, 80], goal: [0, 90] } }, obj: 'Reach the gate unseen' },
    { use: [0, 64], text: 'Place the breaching charge', hold: 3, obj: 'Place the breaching charge on the gate', label: 'GATE' },
    { go: [-14, 74], obj: 'Get clear of the gate', label: 'CLEAR', r: 4 },
    { fn: async (c, W) => { G.explosion(V3(0, 1.5, 62), 4, 40); openGate(W); A.alarm(true); await c.wait(1.5); } },
    { say: [[OKA, 'That woke them up!', 1.4]] },
    { fight: [{ n: 6, area: [-30, 30, 10, 40], goal: [0, 60] }, { n: 5, area: [-50, 50, -10, 20], goal: [0, 50], say: [RAM, 'We\'re through the outer wall behind you!', 2.2, true] }], obj: 'Take the yard' },
    { alarm: false },
  ],
});

/* 9. CELL BLOCK */
add({
  name: 'Cell Block', map: 'prison', env: 'night', place: 'Block A, Kufra prison', time: '02:11 LOCAL', loadout: ['m4', 'pistol'], squad: [RAM, OKA, DAW],
  player: [-36, -10, 0],
  setup(c, W) { openGate(W); },
  deathTip: 'Shoot down the corridor from the doorway before you push in.',
  stages: [
    { say: [[RAM, 'Block A is the west one. We go through it and out the east door to reach B.', 3.4], [DAW, 'Prisoners are screaming in there.', 2]] },
    { go: [-52, -32], obj: 'Get to the west door of Block A', label: 'BLOCK A', r: 4 },
    { fight: [{ cover: [[-44, -32], [-37, -32], [-30, -31.5]], n: 2, area: [-28, -23, -33, -31], goal: [-48, -32], stop: 6 }], obj: 'Clear Block A' },
    { go: [-21, -32], obj: 'Go through the block to the east door', label: 'EAST DOOR', r: 3 },
    { fight: [{ n: 5, area: [-20, 20, -24, -10], goal: [-18, -30] }], obj: 'Clear the passage to Block B' },
    { go: [-16, -36], obj: 'Get to Block B', label: 'BLOCK B', r: 3 },
  ],
});

/* 10. HOUSER */
add({
  name: 'Houser', map: 'prison', env: 'night', place: 'Block B, Kufra prison', time: '02:19 LOCAL', loadout: ['m4', 'pistol'], squad: [RAM, OKA, DAW],
  player: [-17, -36, -Math.PI / 2],
  deathTip: 'The corridor is narrow. Shoot from the door and let them come to you.',
  setup(c, W) { openGate(W); const cell = SP.PRISON.houserCell; const h = SP.npc(c, HOU, at(cell.x, cell.z + 0.6), 'houserPrisoner'); h.stance = 'sit'; h.lookAt = at(cell.x, cell.z - 4); },
  stages: [
    { say: [[JAKE, 'North side. Fourth cell.', 1.6]] },
    { fight: [{ cover: [[-8, -36], [0, -36], [8, -35.5]], n: 2, area: [10, 13, -37, -35], goal: [-12, -36], stop: 6 }], obj: 'Clear Block B' },
    { use: () => { const c = SP.PRISON.houserCell; return at(c.x, -35.6); }, text: 'Cut the cell lock', hold: 3, obj: 'Get Houser out', label: 'HOUSER' },
    { fn: async (c, W) => { freeCell(W, SP.PRISON.houserCell); const h = c.squad[HOU]; h.stance = null; await c.wait(0.8); } },
    { cut: [[HOU, '...Sarton?', 1.6], [JAKE, 'Hey. You alright?', 1.8], [HOU, 'Heh. You remembered.', 2], [HOU, 'Yeah. I\'m all good.', 2.4], [HOU, 'No. No I\'m not. Give me a gun anyway.', 3]], look: [0, -0.15] },
    { fn: async (c) => { const h = c.squad[HOU]; h.team = 'ally'; h.behavior = 'follow'; h.follow = 'player'; h.offset = V3(-1.4, 0, 2.6); h.runSpeed = 4.4; } },
    { say: [[RAM, 'Houser\'s up. We need to go. Now.', 2], [REY, 'Every guard in that fort is heading for Block B. Get out the east door.', 3.4, true]] },
    { go: [16, -36], obj: 'Get out the east door', label: 'EXIT', r: 3 },
  ],
});

/* 11. RIOT */
add({
  name: 'Riot', map: 'prison', env: 'night', place: 'Main yard, Kufra prison', time: '02:26 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [RAM, OKA, DAW], follow: true,
  player: [18, -20, Math.PI],
  npcs: [HOUSER_ALLY([16, -18])],
  civilians: [[-20, -10, 18, 7], [30, -10, 14, 5]],
  setup(c, W) { openGate(W); },
  deathTip: 'Stay away from the open yard. The guards on the admin building have a clear shot.',
  stages: [
    { say: [[HOU, 'Open the other blocks. Let them all out. Guards can\'t shoot everyone.', 3.4], [OKA, 'That\'s either very smart or very dumb.', 2.2], [HOU, 'Most of my ideas are.', 1.8]] },
    { use: [24, -32], text: 'Open Block C', hold: 2, obj: 'Open Block C', label: 'BLOCK C' },
    { feed: 'PRISONERS RELEASED · THE GUARDS ARE OVERWHELMED' },
    { defend: { secs: 90, label: 'RIOT', waves: [{ t: 2, n: 5, area: [-10, 10, 32, 48], goal: [10, -10] }, { t: 25, n: 5, area: [-60, -40, 20, 50], goal: [10, -10], say: [DAW, 'From the west building!', 1.8] }, { t: 50, n: 6, area: [30, 60, 20, 50], goal: [10, -10], say: [RAM, 'Motor pool side!', 1.6] }, { t: 70, n: 4, area: [-20, 20, 30, 50], goal: [10, -10] }], clear: true }, obj: 'Hold the yard' },
    { say: [[HOU, 'Trucks. Motor pool. East.', 1.8]] },
  ],
});

/* 12. MOTOR POOL ESCAPE */
add({
  name: 'Motor Pool Escape', map: 'prison', env: 'night', place: 'Motor pool, Kufra prison', time: '02:37 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [RAM, OKA, DAW],
  player: [10, 4, Math.PI * 0.75],
  npcs: [HOUSER_ALLY([8, 6])],
  setup(c, W) { openGate(W); },
  deathTip: 'Keep the trucks between you and the admin building.',
  stages: [
    { go: [34, 22], obj: 'Get to the motor pool', label: 'TRUCKS', r: 6 },
    { fight: [{ cover: [[40, 38], [50, 38], [62, 30]], n: 3, area: [55, 70, 45, 55], goal: [40, 30] }, { n: 4, area: [-10, 10, 32, 48], goal: [30, 30], say: [OKA, 'Admin building! Behind you!', 2] }], obj: 'Clear the motor pool' },
    { use: [55, 41], text: 'Hotwire the cargo truck', hold: 4, obj: 'Hotwire the cargo truck', label: 'TRUCK' },
    { say: [[DAW, 'Engine\'s cold! Give it a minute!', 1.8]] },
    { defend: { secs: 45, label: 'ENGINE', waves: [{ t: 1, n: 5, area: [-20, 20, 30, 50], goal: [50, 40] }, { t: 22, n: 5, area: [20, 60, -20, 0], goal: [50, 40], say: [RAM, 'More coming out of Block C!', 1.8] }] }, obj: 'Hold until the engine warms up' },
    { say: [[DAW, 'Got it! Everybody in! We\'re going through the gate!', 2.2]] },
    { fade: 1, secs: 1.4 },
  ],
});

/* 13. SANDSTORM */
add({
  name: 'Sandstorm', map: 'desert', env: 'storm', place: 'Calanscio sand sea', time: '06:40 LOCAL', loadout: ['m4', 'pistol'], squad: [RAM, OKA, DAW, DOC],
  player: [0, -300, Math.PI], loops: [['wind', 'wind', 0.2]],
  npcs: [HOUSER_ALLY([2, -298])],
  deathTip: 'You can\'t see far in the storm and neither can they. Fight at short range.',
  stages: [
    { say: [[DAW, 'Truck\'s dead. Sand in the engine. We walk.', 2.4], [DOC, 'Houser can\'t walk far.', 1.8], [HOU, 'Houser can hear you, Doc.', 1.8], [REY, 'Storm\'s covering you from the air but you\'re on foot. There\'s a waystation four clicks south. Bird meets you there.', 5, true]] },
    { go: [0, -250], obj: 'Head south through the storm', label: 'SOUTH', r: 8 },
    { say: [[OKA, 'Shapes. Ahead. Could be rocks.', 2], [OKA, 'Rocks don\'t carry rifles.', 1.8]] },
    { fight: [{ n: 6, area: [-25, 25, -235, -215], goal: [0, -250], stop: 10 }], obj: 'Fight through the storm' },
    { go: [0, -190], obj: 'Keep moving south', label: 'SOUTH', r: 8 },
    { say: [[HOU, 'Sarton. In the cell, they kept asking about you. By name.', 3.2], [JAKE, 'Kessler told them.', 1.6], [HOU, 'The Jackal wanted to know who had his laptop. He isn\'t done with you.', 3.6]] },
    { fight: [{ n: 5, area: [-35, 35, -170, -150], goal: [0, -185], stop: 10 }, { n: 4, area: [-35, 35, -215, -200], goal: [0, -185], stop: 10, say: [DAW, 'Behind us too!', 1.4] }], obj: 'Fight through the storm' },
    { go: [0, -125], obj: 'Reach the waystation', label: 'WAYSTATION', r: 8 },
  ],
});

/* 14. EXTRACTION */
add({
  name: 'Extraction', map: 'desert', env: 'dusk', place: 'Waystation, Calanscio', time: '17:30 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [RAM, OKA, DAW, DOC, MIT],
  player: [0, -118, Math.PI],
  npcs: [HOUSER_ALLY([2, -116])],
  deathTip: 'The mortar shells land where you are standing. Keep moving between the crates.',
  stages: [
    { say: [[REY, 'Bird is eight minutes out. They found you. Big column, coming from the north.', 3.6, true], [HOU, 'Of course they did.', 1.6]] },
    { defend: { secs: 150, label: 'HELICOPTER', mortar: 8, waves: [{ t: 3, n: 6, area: [-30, 30, -200, -180], goal: [0, -120] }, { t: 30, n: 5, area: [-50, -30, -170, -140], goal: [0, -120], tech: [[[0, -320], [0, -210], [2, -170]]], say: [OKA, 'Technical in the village!', 1.8] }, { t: 65, n: 6, area: [30, 50, -170, -140], goal: [0, -120], say: [DAW, 'Right flank!', 1.4] }, { t: 100, n: 7, area: [-40, 40, -230, -200], goal: [0, -125], tech: [[[40, -320], [20, -220], [16, -175]]] }, { t: 125, n: 5, area: [-30, 30, -170, -150], goal: [0, -120] }] }, obj: 'Hold until the helicopter arrives' },
    { say: [[REY, 'Bird\'s on final. Go, go!', 1.8, true]] },
    { heli: { at: [0, -100] }, obj: 'Get Houser to the helicopter' },
    { cut: [[HOU, 'Sarton.', 1.2], [JAKE, 'Yeah?', 1], [HOU, 'Oran. The harbour. He\'s moving everything by sea.', 3], [HOU, 'Thursday...', 1.8], [DOC, 'He\'s out. Pulse is fine. He\'s just done.', 2.6]] },
  ],
});
})();

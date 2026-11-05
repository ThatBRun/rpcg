/* Survival Protocol — Chapter 5: The Jackal (17 parts) */
'use strict';
(function () {
const T = THREE, { V3, rand } = SP; const G = SP.G, A = SP.Audio;
const RAM = 'CPL. RAMIREZ', DAW = 'PVT. DAWSON', OKA = 'OKAFOR', DOC = 'DOC LEE', MIT = 'PVT. MITCHELL', JAKE = 'JAKE', REY = 'CPT. REYES', HOU = 'SGT. HOUSER', JACK = 'THE JACKAL', ELENA = 'DR. MOREAU', YUS = 'YUSUF';
const at = (x, z, y) => V3(x, y != null ? y : SP.W.heightAt(x, z), z);
const DECK = 5.05;
const PARTS = SP.PARTS5 = [];
PARTS.endTitle = 'Survival Protocol';
PARTS.endText = 'The Jackal\'s network is gone: the ship, the warehouse, the villa and the man himself. Houser is back on his feet, Kessler is in a cell in Virginia, and Pvt. Jake Sarton is going home. Thanks for playing.';
const add = (def) => PARTS.push(SP.mission(Object.assign({ act: 'The Jackal' }, def)));
const passPath = (z0, z1, step = 20) => { const out = []; for (let z = z0; z >= z1; z -= step) out.push([SP.PASS.cx(z), z]); return out; };
const SQ = [HOU, RAM, DAW, OKA];
// Houser is a full squad member again in this chapter
SP.SQUAD_LOOK[HOU] = SP.SQUAD_LOOK[HOU] || { head: 'cap', beard: true, skin: 0xc79a7a, seed: 11 };
const lookUS = (seed, skin, extra) => Object.assign({ faction: 'us', seed, skin }, extra || {});

/* 1. REUNION */
add({
  name: 'Reunion', map: 'fob', env: 'day', place: 'FOB Tessalit, northern Mali', time: '10:15 LOCAL · NINE DAYS LATER', loadout: ['m4', 'pistol'], follow: false,
  player: [-14, -6, -2.4],
  npcs: [{ name: HOU, look: 'x', pos: [-32, -25], stance: 'sit', lookAt: [-28, -18], o: { team: 'ally', look: { head: 'bare', beard: true, skin: 0xc79a7a, seed: 11, faction: 'us', weapon: 'none' } } }, { name: REY, look: 'reyes', pos: [1.5, -22], lookAt: [0, -20], o: { team: 'ally' } }, { name: ELENA, look: 'elena', pos: [-1.5, -22], lookAt: [0, -20] }, { name: DOC, look: 'x', pos: [-30, -24], o: { team: 'ally', look: lookUS(55, 0xc9a07e, { medic: true }) } }],
  stages: [
    { say: [[DOC, 'He\'s awake. He\'s asking for you. Don\'t let him stand up.', 2.8]] },
    { go: [-31, -21], obj: 'Go see Houser', label: 'HOUSER', r: 3.5 },
    { cut: [[HOU, 'Sarton. They tell me you walked through a sandstorm carrying half my weight.', 3.6], [JAKE, 'More like a third. You lost weight.', 2.2], [HOU, 'Prison food.', 1.2], [HOU, 'Listen. Those nine days in Kufra, the Jackal came twice. He asked about one person. You.', 4.2], [JAKE, 'Because of the laptop.', 1.6], [HOU, 'Because you took his money. Men like him don\'t stop over a laptop. They stop when they\'re in the ground.', 4.4], [HOU, 'Go talk to Reyes. And Sarton... thank you.', 2.8]], look: [-2.4, -0.25] },
    { go: [0, -18], obj: 'Report to Captain Reyes', label: 'REYES', r: 4 },
    { cut: [[ELENA, 'Kessler finally talked. In exchange for not being sent back here.', 3.2], [REY, 'The Jackal ships through Oran. A freighter, the Sirocco. She sails Thursday with the last of his product and his weapons.', 5], [ELENA, 'The money from that ship pays for everything. The labs, the militias, the prisons.', 3.6], [REY, 'We hit the harbour, sink his business, and follow whatever\'s left to the man himself.', 4], [REY, 'Houser says he\'s coming. Doc says he isn\'t. I\'m letting Doc lose that argument.', 4]], look: [Math.PI, -0.1] },
  ],
});

/* 2. WHEELS UP */
add({
  name: 'Wheels Up', map: 'fob', env: 'dusk', place: 'FOB Tessalit, northern Mali', time: '19:20 LOCAL · THURSDAY', loadout: ['m4', 'pistol'], follow: false,
  player: [-8, 4, Math.PI],
  npcs: [{ name: OKA, look: 'x', pos: [24, 12], o: { team: 'ally', look: lookUS(44, 0x5c3a28) } }, { name: HOU, look: 'x', pos: [-36, -6], o: { team: 'ally', look: lookUS(11, 0xc79a7a, { head: 'cap', beard: true }) } }, { name: RAM, look: 'x', pos: [-38, -13], o: { team: 'ally', look: lookUS(22, 0xa8775a, { radio: true }) } }],
  stages: [
    { say: [[REY, 'Wheels up in fifteen. Get what you need.', 2.4, true]] },
    { use: [23, 14], text: 'Restock ammunition', hold: 1.5, obj: 'Restock at the ammo crates', label: 'AMMO', feedText: 'FULL LOAD · EXTRA AT4' },
    { say: [[OKA, 'Last time we hit a port I lost my boots. Sea water.', 2.6], [OKA, 'Not this time. Tied double.', 1.8]] },
    { use: [0, -20.5], text: 'Study the harbour map', hold: 2.5, obj: 'Study the harbour map at the command tent', label: 'MAP' },
    { say: [[JAKE, 'Container yard west. Ship on the east pier. Warehouse beside it. Harbourmaster\'s office by the gate.', 4], [JAKE, 'Yard, ship, warehouse, office. In that order.', 2.6]] },
    { go: [-36, -10], obj: 'Board the helicopter', label: 'HELI', r: 4 },
    { say: [[HOU, 'Thought I\'d let you go alone?', 1.8], [JAKE, 'Doc know you\'re here?', 1.4], [HOU, 'Doc\'s in the other helicopter.', 1.8]] },
    { fade: 1, secs: 1.6 },
  ],
});

/* 3. HARBOR */
add({
  name: 'Harbor', map: 'port', env: 'nightcity', place: 'Port of Oran, Algeria', time: '01:12 LOCAL', loadout: ['sup', 'pistol'], squad: [HOU],
  player: [-100, 60, 0],
  deathTip: 'Crouch in the gaps between container stacks and wait for patrols to turn.',
  loops: [['wind', 'wind', 0.05], ['hum', 'hum', 0.02]],
  stages: [
    { say: [[HOU, 'Container yard. Guards walk the lanes. We go through to the quay and nobody wakes up.', 3.8], [JAKE, 'You okay to run?', 1.4], [HOU, 'Ask me after.', 1.2]] },
    { stealth: { guards: [[-96, 12, [[-96, 12], [-96, -20]]], [-80, -7, [[-80, -7], [-112, -7]]], [-64, 20, [[-64, 20], [-64, -20]]], [-48, -21, [[-48, -21], [-104, -21]]], [-72, 0], [-88, 36, [[-88, 36], [-50, 36]]], [-112, 20]], go: [-80, -36], r: 6, sight: 30, alarmWave: { n: 5, area: [-60, -40, -36, -32], goal: [-80, -10] } }, obj: 'Cross the container yard to the quay unseen' },
    { fn: async (c) => { await c.say(HOU, c.wentLoud ? 'So much for quiet. Keep moving.' : 'Like ghosts. Just like old times.', 2.4); } },
  ],
});

/* 4. CONTAINERS */
add({
  name: 'Containers', map: 'port', env: 'nightcity', place: 'Quay, Port of Oran', time: '01:24 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [HOU, RAM, DAW, OKA],
  player: [-80, -35, -Math.PI / 2],
  deathTip: 'The cranes and container stacks give cover. Use the AT4 on the technical.',
  stages: [
    { say: [[RAM, 'Second team\'s on the quay with you. Ship\'s at the east pier.', 2.8], [OKA, 'And so are thirty of the Jackal\'s friends.', 2.2]] },
    { fight: [{ n: 6, area: [-50, -20, -32, 0], goal: [-70, -35] }, { n: 5, area: [-20, 10, -30, 10], goal: [-50, -35], say: [DAW, 'Crane, under the crane!', 1.8] }, { n: 2, area: [20, 40, -30, -20], tech: [[[110, -34], [30, -34], [0, -34]]], goal: [-30, -35], say: [OKA, 'Technical down the quay!', 2] }], obj: 'Push down the quay' },
    { go: [30, -36], obj: 'Move up to the east pier', label: 'PIER', r: 6 },
  ],
});

/* 5. THE SHIP */
add({
  name: 'The Ship', map: 'port', env: 'nightcity', place: 'Freighter Sirocco, east pier', time: '01:35 LOCAL', loadout: ['m4', 'pistol'], squad: [HOU, OKA],
  player: [32, -36, -Math.PI / 2],
  deathTip: 'Move between the containers on deck. Do not stand in the open lanes.',
  stages: [
    { say: [[HOU, 'Gangway\'s up front. Okafor, cover us.', 2], [OKA, 'Always.', 1]] },
    { go: [48.5, -41], obj: 'Get to the gangway', label: 'GANGWAY', r: 3 },
    { go: [50, -51.5], obj: 'Climb aboard', label: 'DECK', r: 2.5, orIf: P => P.pos.y > 4.5 },
    { fight: [{ cover: [[57.2, -70.3, DECK], [52, -83.5, DECK], [64, -90.1, DECK], [64.8, -60, DECK]], n: 3, area: [52, 64, -106, -103, DECK], goal: [57, -60] }, { n: 4, area: [52, 64, -106, -103, DECK], goal: [57, -70], say: [HOU, 'More from the bridge!', 1.6] }], obj: 'Clear the deck' },
    { say: [[HOU, 'Deck\'s clear. Bridge is next.', 1.8]] },
  ],
});

/* 6. BRIDGE */
add({
  name: 'Bridge', map: 'port', env: 'nightcity', place: 'Freighter Sirocco, bridge', time: '01:41 LOCAL', loadout: ['dmr', 'm4', 'pistol'], squad: [HOU], squadFixed: true,
  player: [58, -62, 0, DECK],
  deathTip: 'The crane cabins have shooters in them. Use the marksman rifle.',
  stages: [
    { say: [[OKA, 'Sarton, crane cabs! Both cranes, shooters on top!', 2.4, true]] },
    { snipe: [[-30, -58, 22.4], [15, -58, 22.4], [-26, -48, 24.8], [11, -48, 24.8]], obj: 'Kill the shooters on the cranes' },
    { fight: [{ n: 4, area: [52, 64, -106, -103, DECK], goal: [57, -75] }], obj: 'Clear the bridge' },
    { use: [58, -106.6, DECK], text: 'Download the cargo manifest', hold: 3, obj: 'Download the cargo manifest at the bridge', label: 'BRIDGE', feedText: 'MANIFEST: 2.4 TONS · WAREHOUSE 7 · LOADING AT 03:00' },
    { say: [[JAKE, 'The product isn\'t on board yet. It\'s in the warehouse next door, waiting to load.', 3.6], [HOU, 'Then we don\'t let it load.', 1.8]] },
    { go: [50, -51.5, DECK], obj: 'Get back down the gangway', label: 'GANGWAY', r: 3 },
  ],
});

/* 7. WAREHOUSE */
add({
  name: 'Warehouse', map: 'port', env: 'nightcity', place: 'Warehouse 7, Port of Oran', time: '01:52 LOCAL', loadout: ['m4', 'pistol'], squad: [HOU, RAM, DAW, OKA],
  player: [46, -36, Math.PI],
  deathTip: 'The crates inside are good cover. Clear the doorway first.',
  stages: [
    { go: [60, 10], obj: 'Get to the warehouse door', label: 'WAREHOUSE', r: 5 },
    { fight: [{ cover: [[52, 24], [66, 22], [72, 30], [48, 34]], n: 3, area: [42, 78, 36, 40], goal: [60, 20], stop: 8 }, { n: 4, area: [42, 50, 44, 50], goal: [55, 30], say: [DAW, 'Back door!', 1.2] }], obj: 'Clear the warehouse' },
    { cut: [[RAM, 'Look at this. Pallets. Hundreds of them.', 2.2], [HOU, 'Same packs as the ones in your pocket in the desert, Sarton.', 3], [JAKE, 'Feels like a long time ago.', 1.8]], look: [-1.0, -0.2] },
    { use: [71, 34], text: 'Rig the shipment with charges', hold: 3, obj: 'Rig the shipment', label: 'CHARGES' },
  ],
});

/* 8. BURN IT */
add({
  name: 'Burn It', map: 'port', env: 'nightcity', place: 'Warehouse 7, Port of Oran', time: '01:58 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [HOU, RAM, DAW, OKA], follow: false,
  player: [60, 22, 0],
  deathTip: 'Hold the doorway. Enemies come from the quay and the street.',
  setup(c) { [[HOU, 54, 20], [RAM, 66, 20], [DAW, 52, 38], [OKA, 68, 36]].forEach(([n, x, z]) => { c.squad[n].pos.copy(at(x, z)); c.squad[n].behavior = 'hold'; }); },
  stages: [
    { say: [[RAM, 'Timers need ninety seconds to arm. Remote won\'t work through this roof.', 3], [HOU, 'Then we stay ninety seconds.', 1.8]] },
    { defend: { secs: 90, label: 'ARMING', waves: [{ t: 2, n: 5, area: [40, 80, -30, -10], goal: [60, 14] }, { t: 25, n: 5, area: [20, 40, 0, 30], goal: [56, 20], say: [OKA, 'West side!', 1.2] }, { t: 50, n: 6, area: [40, 80, 50, 70], goal: [52, 38], say: [DAW, 'Back door, they\'re at the back!', 2] }, { t: 70, n: 5, area: [80, 110, 0, 30], goal: [66, 18], tech: [[[150, 6], [100, 8], [80, 10]]] }], clear: true }, obj: 'Hold the warehouse while the charges arm' },
    { say: [[RAM, 'Armed! Everybody out, two minutes!', 1.8]] },
    { go: [20, -10], obj: 'Get clear of the warehouse', label: 'CLEAR', r: 8 },
    { fn: async (c) => { const p = SP.PORT.warehouse; for (let i = 0; i < 5; i++) { G.explosion(V3(p.x + rand(-14, 14), 2, p.z + rand(-8, 8)), 6, 0); G.fires.push({ pos: V3(p.x + rand(-12, 12), 1, p.z + rand(-8, 8)), t: 1e9, safe: true }); await c.wait(0.35); } G.addTrauma(0.8); await c.wait(1.5); } },
    { say: [[HOU, 'That\'s his money going up.', 1.8], [JAKE, 'He\'ll feel that.', 1.4]] },
  ],
});

/* 9. HARBOR OFFICE */
add({
  name: 'Harbor Office', map: 'port', env: 'nightcity', place: 'Harbourmaster\'s office, Port of Oran', time: '02:10 LOCAL', loadout: ['m4', 'pistol'], squad: [HOU, RAM, DAW, OKA],
  player: [20, -10, Math.PI * 0.75],
  deathTip: 'Fight from the containers, then rush the office door.',
  stages: [
    { say: [[REY, 'Harbourmaster\'s office. Whoever signed for that ship knows where the Jackal sleeps.', 3.4, true]] },
    { go: [0, 30], obj: 'Move to the harbourmaster\'s office', label: 'OFFICE', r: 6 },
    { fight: [{ cover: [[-20, 40], [0, 41], [-28, 52]], n: 4, area: [-40, 20, 60, 75], goal: [-10, 40] }], obj: 'Clear the office' },
    { use: [-10, 49], text: 'Search the harbourmaster\'s files', hold: 3, obj: 'Search the office', label: 'FILES', feedText: 'SIGNATORY: "S. HADDAD" · ADDRESS: CAP FALCON, VILLA BLANCHE' },
    { say: [[ELENA, 'Haddad. That\'s one of his names. Cap Falcon is an hour up the coast. A white villa on the cliffs.', 4, true], [HOU, 'Then that\'s where we\'re going.', 1.8]] },
  ],
});

/* 10. COAST ROAD */
add({
  name: 'Coast Road', map: 'pass', env: 'afternoon', place: 'Coast road to Cap Falcon', time: '15:10 LOCAL', loadout: ['m4', 'pistol'], follow: false,
  get player() { return [SP.PASS.cx(260), 260, Math.PI]; },
  deathTip: 'Kill the gunners on the technicals before they get beside you.',
  stages: [
    { say: [[DAW, 'He knows we\'re coming now. Every road to that villa is going to be busy.', 3.2], [HOU, 'So drive faster.', 1.4]] },
    { chase: { get path() { return passPath(260, -200, 22); }, speed: 18, driver: DAW, spawns: [{ t: 3, side: 5, kind: 'tech', say: [HOU, 'Right side!'] }, { t: 10, side: -5, kind: 'buggy' }, { t: 18, side: 5, kind: 'buggy' }, { t: 26, side: -5, kind: 'tech', say: [DAW, 'Left!'] }, { t: 34, side: 5, kind: 'tech' }, { t: 42, side: -4, kind: 'buggy' }, { t: 50, side: 5, kind: 'tech', say: [JAKE, 'Another one!'] }] }, obj: 'Keep the Jackal\'s men off you' },
    { say: [[DAW, 'Road\'s blocked ahead. We go on foot from here.', 2.4]] },
  ],
});

/* 11. AMBUSH */
add({
  name: 'Ambush', map: 'pass', env: 'sunset', place: 'Coast road, below Cap Falcon', time: '16:20 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [HOU, DAW, RAM, OKA],
  get player() { return [SP.PASS.cx(-210), -210, 0]; },
  deathTip: 'They hold the road ahead in cover. Let the squad pin them and flank on the slopes.',
  stages: [
    { say: [[OKA, 'Roadblock ahead. Sandbags, trucks, the works.', 2.4]] },
    { get fight() { const x = SP.PASS.cx(-260); return [{ cover: [[x - 6, -258], [x + 6, -262], [x - 9, -270], [x + 8, -272]], n: 3, area: [x - 12, x + 12, -290, -280], goal: [x, -230] }]; }, obj: 'Break the roadblock' },
    { go: () => at(SP.PASS.cx(-310), -310), obj: 'Push up the road', label: 'ROAD', r: 8 },
    { get fight() { const x = SP.PASS.cx(-360); return [{ n: 6, area: [x - 15, x + 15, -380, -360], goal: [x, -320] }, { n: 2, area: [x - 8, x + 8, -400, -390], tech: [[[SP.PASS.cx(-480), -480], [SP.PASS.cx(-400), -400], [SP.PASS.cx(-360), -360]]], goal: [x, -330], say: [DAW, 'Technical coming down!', 1.8] }]; }, obj: 'Clear the road' },
    { go: () => at(SP.PASS.cx(-420), -420), obj: 'Reach the cliff path', label: 'PATH', r: 8 },
    { say: [[HOU, 'Villa\'s up top. We wait for the sun to go down.', 2.4]] },
  ],
});

/* 12. CLIFFS */
add({
  name: 'Cliffs', map: 'villa', env: 'sunset', envOver: { sunEl: 7 }, place: 'Cap Falcon', time: '19:10 LOCAL', loadout: ['sup', 'pistol'], squad: [HOU],
  player: [0, 130, 0],
  deathTip: 'Use the bushes and rocks. Guards walk the road to the gate.',
  stages: [
    { cut: [[JAKE, 'White villa, white walls, a pool, a helicopter on the lawn.', 3.2], [HOU, 'Crime pays. For a while.', 1.8]], look: [0, 0] },
    { stealth: { guards: [[-8, 100, [[-12, 100], [12, 100]]], [-24, 80], [22, 84], [0, 70, [[0, 70], [-16, 62]]], [14, 56, [[14, 56], [-14, 56]]]], go: [-14, 48], r: 5, sight: 30, alarmWave: { n: 5, area: [-20, 20, 30, 40], goal: [0, 80] } }, obj: 'Get to the villa wall unseen' },
    { fn: async (c) => { await c.say(HOU, c.wentLoud ? 'They know. Get ready for the gate.' : 'At the wall. Nobody saw a thing.', 2.4); } },
  ],
});

/* 13. THE GATE */
add({
  name: 'The Gate', map: 'villa', env: 'night', place: 'Villa Blanche, Cap Falcon', time: '19:40 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [HOU, RAM, DAW, OKA],
  player: [-12, 52, 0],
  deathTip: 'The gate is a killing zone. Shoot through it from the side before you go in.',
  stages: [
    { say: [[RAM, 'We\'re all on the wall. Your call, Sergeant.', 2], [HOU, 'Sarton\'s call. It\'s his fight.', 1.8], [JAKE, 'Gate. Now.', 1.2]] },
    { fight: [{ cover: [[-6, 36], [6, 36], [-20, 30], [20, 30]], n: 3, area: [-30, 30, 10, 26], goal: [0, 44] }, { n: 5, area: [-40, 40, 0, 14], goal: [0, 36], say: [OKA, 'More from the house!', 1.4] }], obj: 'Take the gate' },
    { go: [0, 30], obj: 'Get inside the walls', label: 'INSIDE', r: 6 },
  ],
});

/* 14. VILLA */
add({
  name: 'Villa', map: 'villa', env: 'night', place: 'Villa Blanche, Cap Falcon', time: '19:48 LOCAL', loadout: ['m4', 'pistol'], squad: [HOU, RAM, DAW, OKA],
  player: [0, 32, Math.PI * 0 + 0],
  deathTip: 'The pool area is open. Use the palms and hedges.',
  stages: [
    { fight: [{ cover: [[-14, 20], [14, 22], [-24, 4], [24, 4]], n: 4, area: [-20, 20, 0, 6], goal: [0, 24] }, { n: 5, area: [-40, -28, -30, -10], goal: [0, 14], say: [RAM, 'Garage! Left side!', 1.6] }], obj: 'Clear the courtyard' },
    { go: [0, -1], obj: 'Get to the front door', label: 'DOOR', r: 3 },
    { use: [0, -3], text: 'Breach the front door', hold: 1, obj: 'Breach the house', label: 'BREACH' },
    { fight: [{ cover: [[-8, -14], [8, -12], [0, -17], [-10, -9]], goal: [0, -6] }], obj: 'Clear the house' },
  ],
});

/* 15. THE JACKAL */
add({
  name: 'The Jackal', map: 'villa', env: 'night', place: 'Villa Blanche, Cap Falcon', time: '19:56 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [HOU, RAM, OKA],
  player: [0, -8, Math.PI],
  ammo: { m4: 300, at4: 4, pistol: 68 },
  deathTip: 'Boss fight: hit him while he moves between cover. In phase 2 kill his guards to break his armour, and step aside when you see "RPG!".',
  stages: [
    { say: [[RAM, 'House is clear. No Jackal.', 1.6], [HOU, 'Listen.', 1]] },
    { say: [[JACK, 'Private Sarton. You took my money in the desert, my ship tonight, and now my house.', 4.2], [JACK, 'I am going to leave now. You are going to stay here and burn with it.', 3.6], [HOU, 'Helipad! He\'s going for the helicopter!', 1.8]] },
    { go: [14, -8], obj: 'Get out to the helipad', label: 'HELIPAD', r: 6 },
    { boss: {
      name: 'THE JACKAL', hp: 2200, start: [34, -32], escape: 90, mortar: 7,
      covers: [[34, -32], [42, -22], [26, -30], [40, -12], [24, -14], [30, -38]],
      phases: ['PHASE 1 · THE HELIPAD', 'PHASE 2 · LAST GUARD', 'PHASE 3 · THE ESCAPE'],
      guards: { cover: [[28, -20], [38, -36], [45, -27]], n: 2, area: [20, 46, -40, -37], goal: [20, -16], stop: 14 },
      intro: [[JACK, 'You want me, soldier? Come and take me.', 2.6], [HOU, 'He\'s wearing plates under that shirt. Make every shot count.', 3]],
      p2: { say: [JACK, 'Khalid! Everyone! To me! Now!', 2.4], broken: [OKA, 'His guard\'s down! He\'s exposed!', 2], wave: { cover: [[18, -26], [36, -14]], n: 6, area: [-42, -28, -30, -10], goal: [22, -18], stop: 12 } },
      p3: { say: [JACK, 'Start the engine! We are leaving!', 2.4], wave: { n: 4, area: [-10, 10, 30, 40], goal: [20, -14], stop: 12 } },
      obj: 'Defeat the Jackal before he reaches the helicopter', after: 'Secure the Jackal',
      escapeMsg: 'The Jackal got the helicopter off the ground. Keep the pressure on in phase 3.',
    } },
    { use: () => SP.ctx.boss.pos.clone(), text: 'Disarm the Jackal', hold: 1.2, obj: 'Secure the Jackal', label: 'JACKAL' },
    { cut: [[JACK, 'Wait. Wait. Do you know how much I can pay you? You. Him. All of you.', 3.6], [JAKE, 'You can\'t afford it anymore.', 2], [JACK, 'Then shoot me, soldier. That is what you came for.', 3], [HOU, 'Your call, Sarton.', 1.6]], look: [-1.0, -0.2] },
    { choice: { a: 'Take him alive', b: 'Let the courts decide... after Houser\'s word', key: 'jackal', ra: [[JAKE, 'No. You go to trial. Every name you know, every bank, every lab. You\'ll talk for years.', 4], [HOU, 'That\'s the harder thing. Good.', 2]], rb: [[HOU, 'You kept me in a box for nine days. Now you\'ll live in one for the rest of your life.', 4], [JACK, '...', 1]] } },
  ],
});

/* 16. LAST STAND */
add({
  name: 'Last Stand', map: 'villa', env: 'night', place: 'Villa Blanche, Cap Falcon', time: '20:05 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [HOU, RAM, DAW, OKA],
  player: [0, 4, Math.PI],
  deathTip: 'Mortars are walking across the courtyard. Keep moving between cover.',
  setup(c) { const j = SP.npc(c, JACK, at(-2, -6), 'jackal', { look: { weapon: 'none' }, team: 'civ' }); j.hands = 'up'; j.stance = 'kneel'; },
  stages: [
    { say: [[REY, 'Whole militia from the town is coming up the hill for him. Extraction is ten minutes out. Hold the villa.', 4.6, true], [HOU, 'Ten minutes. Easy.', 1.4]] },
    { defend: { secs: 160, label: 'EXTRACTION', mortar: 9, waves: [{ t: 3, n: 6, area: [-20, 20, 50, 70], goal: [0, 20] }, { t: 35, n: 6, area: [-48, -40, -30, 30], goal: [0, 10], say: [OKA, 'West wall! They\'re climbing!', 1.8] }, { t: 70, n: 6, area: [40, 48, -30, 30], goal: [0, 10], say: [DAW, 'East side!', 1.4] }, { t: 100, n: 7, area: [-20, 20, 50, 80], goal: [0, 30], tech: [[[0, 160], [0, 70], [0, 50]]], say: [RAM, 'Technical on the road!', 1.6] }, { t: 135, n: 6, area: [-40, 40, 50, 70], goal: [0, 20] }] }, obj: 'Hold the villa' },
    { say: [[REY, 'Birds over the cliff. Get him on the pad.', 2.4, true]] },
    { heli: { at: [20, -30] }, obj: 'Get to the extraction helicopter' },
  ],
});

/* 17. HOME */
add({
  name: 'Home', map: 'fob', env: 'dawn', place: 'FOB Tessalit, northern Mali', time: '06:30 LOCAL · TWO DAYS LATER', loadout: [], follow: false,
  player: [-24, -8, -2.4],
  npcs: [{ name: HOU, look: 'x', pos: [-6, 6], lookAt: [-8, 4], o: { team: 'ally', look: lookUS(11, 0xc79a7a, { head: 'cap', beard: true }) } }, { name: REY, look: 'reyes', pos: [1.5, -22], lookAt: [0, -20], o: { team: 'ally' } }, { name: ELENA, look: 'elena', pos: [-1.5, -22], lookAt: [0, -20] }, { name: RAM, look: 'x', pos: [-12, 8], stance: 'sit', o: { team: 'ally', look: lookUS(22, 0xa8775a, { radio: true }) } }, { name: OKA, look: 'x', pos: [-10, 10], o: { team: 'ally', look: lookUS(44, 0x5c3a28) } }, { name: DAW, look: 'x', pos: [-14, 10], o: { team: 'ally', look: lookUS(33, 0xd8ad8e) } }],
  stages: [
    { say: [[JAKE, 'Two days. Nobody has said the word "Jackal" out loud since.', 3]] },
    { go: [0, -18], obj: 'See Captain Reyes', label: 'REYES', r: 4 },
    { cut: [[REY, 'The Jackal\'s in a cell in Algiers. Kessler pleaded guilty. Interpol has the bank records.', 4.4], [ELENA, 'The labs are closing. Without the money they can\'t pay the chemists. I would know.', 4], [REY, 'And you have orders, Sarton. Rotation home. Plane leaves tonight.', 3.4], [JAKE, 'Home.', 1.4]], look: [Math.PI, -0.1] },
    { go: [-8, 2], obj: 'Find Houser at the flagpole', label: 'HOUSER', r: 3.5 },
    { cut: [[HOU, 'So. Home.', 1.4], [JAKE, 'Yeah.', 1], [HOU, 'First day, on the helicopter, I asked you if you were alright. You remember?', 3.6], [JAKE, 'I remember.', 1.2]], look: [0.2, 0] },
    { choice: { a: '"Yeah, I\'m all good."', b: '"No. But I will be."', key: 'finalAnswer', ra: [[HOU, 'Heh. Same answer as day one. Still don\'t believe you.', 3], [HOU, 'Go home, Jake. You earned it.', 2.4]], rb: [[HOU, 'That\'s the first honest thing anybody\'s said in this place.', 3], [HOU, 'Go home, Jake. You earned it.', 2.4]] } },
    { fade: 1, secs: 2.5 },
  ],
});
})();

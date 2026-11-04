/* Survival Protocol — Chapter 3: The Leak (7 parts) */
'use strict';
(function () {
const T = THREE, { V3, rand } = SP; const G = SP.G, A = SP.Audio;
const RAM = 'CPL. RAMIREZ', DAW = 'PVT. DAWSON', OKA = 'OKAFOR', DOC = 'DOC LEE', MIT = 'PVT. MITCHELL', JAKE = 'JAKE', REY = 'CPT. REYES', ELENA = 'DR. MOREAU', KES = 'MAJ. KESSLER', JACK = 'THE JACKAL', MAN = 'MANSOUR', YUS = 'YUSUF';
const SQ = [RAM, DAW, OKA, DOC];
const at = (x, z, y) => V3(x, y != null ? y : SP.W.heightAt(x, z), z);
const PARTS = SP.PARTS3 = [];
PARTS.endTitle = 'Kufra';
PARTS.endText = 'Kessler sold Houser to a Libyan militia for a satellite phone and a bank account in Malta. Houser is alive, in a prison in the Kufra basin. Chapter 4, Iron Desert, goes to get him.';
const add = (def) => PARTS.push(SP.mission(Object.assign({ act: 'The Leak' }, def)));
const passPath = (z0, z1, step = 20) => { const out = []; for (let z = z0; z >= z1; z -= step) out.push([SP.PASS.cx(z), z]); return out; };
function prop(W, x, z, kind) { const y = SP.W.heightAt(x, z); if (kind === 'table') { W.box(1.8, 0.85, 0.9, x, y, z, SP.mat('wood', { color: 0x5a4030 }), { uv: 1 }); const l = SP.Models.laptop(); l.position.set(x, y + 0.86, z); SP.W.scene.add(l); return l; } if (kind === 'jeep') { const t = SP.Models.buggy(0x5a5a40); t.position.set(x, y, z); SP.W.scene.add(t); SP.W.colliderFrom(t, 'metal', 0.2); return t; } }
async function walkAway(c, name, pts) { const u = c.squad[name]; if (!u) return; for (const p of pts) await u.moveTo(at(p[0], p[1]), false); }

/* 1. HOMECOMING */
add({
  name: 'Homecoming', map: 'fob', env: 'afternoon', place: 'FOB Tessalit, northern Mali', time: '14:05 LOCAL · ONE DAY AFTER ASSEKREM', loadout: ['m4', 'pistol'], follow: false,
  player: [-24, -12, -2.4],
  npcs: [{ name: REY, look: 'reyes', pos: [1.5, -22], lookAt: [0, -20], o: { team: 'ally' } }, { name: ELENA, look: 'elena', pos: [-1.5, -22], lookAt: [0, -20] }, { name: RAM, look: 'x', pos: [-18, -26], o: { team: 'ally', look: { radio: true, skin: 0xa8775a, seed: 22, faction: 'us' } } }, { name: OKA, look: 'x', pos: [21, 2], o: { team: 'ally', look: { skin: 0x5c3a28, seed: 44, faction: 'us' } } }, { name: KES, look: 'kessler', pos: [18, -26], lookAt: [20, -20] }],
  setup(c, W) { prop(W, -20, -26.5, 'table'); },
  stages: [
    { say: [[JAKE, 'Thirty hours since Assekrem. Nobody here has slept much.', 3.2], [DOC, 'Sarton. Reyes wants you at the map table. Now.', 2.8]] },
    { go: [0, -18], obj: 'Report to Captain Reyes', label: 'REYES', r: 4 },
    { cut: [[REY, 'The codebook from Houser\'s cell. Elena ran it overnight.', 3.2], [ELENA, 'Every frequency your platoon used in the last six weeks. Current to the day. That book was printed somewhere with a laser printer, not copied by hand.', 5.4], [REY, 'Which means someone handed it over. From inside this wire.', 3.2], [JAKE, 'One of us.', 1.8], [REY, 'Or someone standing next to us. I want the radio logs. Ramirez is in the comms tent. Go quietly.', 4.4]], look: [Math.PI, -0.1] },
    { use: [-20, -26.5], text: 'Pull the radio logs', hold: 2.5, obj: 'Pull the radio logs in the comms tent', label: 'LOGS', feedText: 'RADIO LOGS COPIED' },
    { say: [[RAM, 'You didn\'t get these from me. Look here: oh-two-ten, four nights running. Burst transmissions, two seconds each, on our own encrypted net.', 5.4], [JAKE, 'From where?', 1.4], [RAM, 'From inside the FOB. Short range handset, not the big set. I triangulated off the two antennas. East side. Range, motor pool, or the containers.', 5.4]] },
    { go: [22, 2], obj: 'Ask Okafor about the night watch on the east side', label: 'OKAFOR', r: 4 },
    { say: [[OKA, 'Night watch on the east wall? That was me, three nights out of four.', 3.2], [OKA, 'Nobody goes out there at two in the morning except the DIA guy. Major Kessler. He says he calls home. His wife\'s in Virginia, it\'s eight in the evening there.', 5.6], [JAKE, 'Every night?', 1.4], [OKA, 'Every night. Smokes one cigarette, makes the call, goes back to bed. Never thought twice about it.', 4]] },
    { use: [40, -35], text: 'Check the handset sign-out sheet', hold: 2, obj: 'Check the signal locker by the containers', label: 'LOCKER' },
    { feed: 'HANDSET 7 · SIGNED OUT 6 NIGHTS · MAJ. R. KESSLER' },
    { say: [[JAKE, 'Handset seven. Kessler. Six nights.', 2.6]] },
    { go: [0, -18], obj: 'Tell Reyes', label: 'REYES', r: 4 },
    { cut: [[REY, 'Kessler. Defense Intelligence liaison. Six weeks in country, clearance higher than mine.', 4.2], [REY, 'If I arrest a major on a sign-out sheet, he\'s on a plane by morning and Houser is dead.', 4.4], [ELENA, 'So you need to see him do it.', 2.4], [REY, 'Tonight, Sarton. You watch him. You don\'t get seen, you don\'t touch him. You bring me proof.', 4.2]], look: [Math.PI, -0.1] },
  ],
});

/* 2. NIGHT SHIFT */
add({
  name: 'Night Shift', map: 'fob', env: 'night', place: 'FOB Tessalit, northern Mali', time: '01:58 LOCAL', loadout: ['pistol'], follow: false, flash: false,
  deathTip: 'Stay between 8 and 40 metres from Kessler. Do not sprint close to him.',
  player: [6, -38, -1.2],
  npcs: [{ name: KES, look: 'kessler', pos: [20, -26], o: { walkSpeed: 1.35 } }],
  setup(c, W) { prop(W, -14, 112, 'jeep'); },
  loops: [['wind', 'wind', 0.06], ['hum', 'hum', 0.03]],
  stages: [
    { say: [[JAKE, 'Oh-one-fifty-eight. His light just came on.', 2.8], [REY, 'Eyes only, Sarton. Keep your distance.', 2.6, true]] },
    { wait: 1.5 },
    { tail: { npc: KES, route: [[24, -20], [30, -6], [40, 4], [52, 16], [40, 36], [12, 40], [0, 42], [0, 56], [0, 66], [-6, 84], [-10, 104]], pauses: [3, 6], min: 9, max: 42,
      lines: [[2, JAKE, 'He\'s heading east. Past the range.', 2.4], [5, REY, 'Where is he going?', 1.8, true], [6, JAKE, 'Toward the south gate. Guard\'s waving him through.', 3], [8, JAKE, 'He\'s outside the wire now. Walking.', 2.6], [9, REY, 'Stay on him.', 1.6, true]], spotted: 'Kessler saw you. He\'ll be careful from now on.', lostMsg: 'You lost Kessler in the dark.', label: 'KESSLER' }, obj: 'Follow Kessler without being seen' },
    { go: [-4, 92], obj: 'Get close enough to hear', label: 'LISTEN', r: 5 },
    { cut: [[KES, 'It\'s me. Write this down.', 2.2], [KES, 'Second platoon goes to Tamanrasset on Thursday. Same team that hit Assekrem. The one called Sarton has the laptop.', 5.4], [KES, 'Tell him the old cinema, ten at night. I\'ll walk them right into it.', 3.6], [KES, 'And tell him I want the rest of my money before I say anything about Kufra.', 4]], look: [-0.3, -0.05] },
    { fn: async (c) => { walkAway(c, KES, [[-6, 84], [0, 62], [0, 42], [12, 40], [20, -26]]).catch(() => { }); await c.wait(4); } },
    { say: [[JAKE, 'Kufra. He said Kufra.', 2], [REY, 'He\'s coming back. Check where he stood. Then get inside before he does.', 3.6, true]] },
    { use: [-12, 108], text: 'Search the dead drop', hold: 2.5, obj: 'Search the rocks where Kessler stood', label: 'SEARCH', feedText: 'FOUND: PRINTED PATROL ROUTES · 2ND PLATOON' },
    { go: [0, -18], obj: 'Get back to Reyes', label: 'REYES', r: 4 },
    { say: [[REY, 'Patrol routes. Our routes. Printed on our printer.', 3.2], [REY, 'He\'s selling us to the Jackal and he knows where Houser is.', 3.4], [JAKE, 'Then we take him now.', 1.8], [REY, 'No. He\'ll lawyer up and the Jackal will know in an hour. We go to the cinema Thursday like he wants. Only we get there first.', 6]] },
  ],
});

/* 3. THE MEET */
add({
  name: 'The Meet', map: 'town', env: 'nightcity', place: 'Rooftops over the old cinema, Tamanrasset', time: '21:40 LOCAL · THURSDAY', loadout: ['dmr', 'm4', 'pistol'], follow: false, squadFixed: true,
  get player() { return [0, -30, Math.PI, SP.TOWN.roofY]; },
  deathTip: 'Stay low behind the parapet. The marksman rifle can reach every shooter in the square.',
  npcs: [{ name: OKA, look: 'x', pos: [-4, -30], o: { team: 'ally', weapon: 'ak', look: { skin: 0x5c3a28, seed: 44, faction: 'us' } } }],
  setup(c, W, P) { const o = c.squad[OKA]; o.pos.y = SP.TOWN.roofY; o.fixedY = true; o.stance = 'crouch'; o.lookAt = V3(0, 0, 10);
    const m = SP.npc(c, MAN, at(-50, 18), 'jackal', { team: 'civ', look: { top: 0x4a3a2a, seed: 31, weapon: 'none' } }); m.walkSpeed = 1.4; const k = SP.npc(c, KES, at(60, 20), 'kessler'); k.walkSpeed = 1.4; },
  loops: [['wind', 'wind', 0.05], ['hum', 'hum', 0.02]],
  stages: [
    { say: [[OKA, 'Ninety minutes on this roof. My knees are done.', 2.8], [REY, 'Overwatch, status.', 1.6, true], [JAKE, 'Square\'s empty. Too empty for a Thursday.', 2.6]] },
    { fn: async (c) => { c.squad[MAN].moveTo(at(-4, 6), false); c.squad[KES].moveTo(at(5, 7), false); await c.wait(9); } },
    { cut: [[JAKE, 'Two men. One from the west, one from the east. East is Kessler.', 3.6], [OKA, 'The other one is Mansour. The Jackal\'s money man.', 3], [MAN, 'You said the Americans come at ten.', 2.4], [KES, 'They will. Six of them. They think they\'re ambushing you.', 3.2], [MAN, 'And Kufra?', 1.4], [KES, 'Money first.', 1.4]], look: [Math.PI, -0.25] },
    { say: [[REY, 'That\'s enough. We have him on tape. Sarton, Okafor, hold-', 3, true], [OKA, 'Movement on the roofs! They\'re not waiting for ten. They\'re waiting for us.', 3.4]] },
    { fn: async (c) => { c.squad[KES].moveTo(at(70, 30), true); c.squad[MAN].moveTo(at(-70, 30), true); setTimeout(() => { [KES, MAN].forEach(n => { const u = c.squad[n]; if (u && !c.dead) u.remove(); }); }, 9000); } },
    { snipe: [[-14, 18], [16, 20], [2, 28], [-26, 6], [24, 4]], obj: 'Kill the shooters in the square' },
    { say: [[OKA, 'More coming down the east street!', 2.2]] },
    { fight: [{ n: 5, area: [30, 60, -10, 20], goal: [10, -20], stop: 18 }, { n: 5, area: [-60, -30, -5, 25], goal: [-10, -20], stop: 18, say: [OKA, 'West side too!', 1.6] }], obj: 'Hold the roof' },
    { say: [[REY, 'Kessler\'s in a car heading for the north road. We\'re coming to you. Get off that roof.', 4, true]] },
    { go: [-66, -38], obj: 'Get down the stairs at the west end', label: 'STAIRS', r: 4 },
  ],
});

/* 4. BURNED */
add({
  name: 'Burned', map: 'town', env: 'nightcity', place: 'Back streets, Tamanrasset', time: '22:06 LOCAL', loadout: ['m4', 'pistol'], squad: [RAM, DAW, OKA, DOC],
  player: [-64, -42, Math.PI * 0.95],
  deathTip: 'The streets run in a grid. Let your squad push while you shoot from the corners.',
  stages: [
    { say: [[RAM, 'Whole town knows we\'re here now.', 2.2], [REY, 'Mosque courtyard, east side. Yusuf has a truck there. Fight your way to it.', 3.6, true]] },
    { go: [-60, -60], obj: 'Move south to the cross street', label: 'MOVE', r: 6 },
    { fight: [{ n: 5, area: [-84, -40, -100, -84], goal: [-60, -62] }, { n: 4, area: [-40, -30, -90, -70], goal: [-60, -62], say: [DAW, 'More on the right!', 1.6] }], obj: 'Clear the street' },
    { go: [-36, -60], obj: 'Push east', label: 'EAST', r: 6 },
    { fight: [{ n: 4, area: [-20, -4, -70, -50], goal: [-36, -60] }, { n: 2, area: [-40, -30, -84, -78], goal: [-36, -60] }], obj: 'Clear the street' },
    { say: [[DOC, 'Is anyone hit?', 1.4], [OKA, 'Not yet. Keep moving.', 1.6]] },
    { go: [-12, -60], obj: 'Keep pushing east', label: 'EAST', r: 6 },
    { fight: [{ n: 6, area: [2, 22, -76, -46], goal: [-12, -60], say: [RAM, 'Technical! Up the street!', 2] , tech: [[[60, -60], [30, -60], [14, -60]]] }], obj: 'Clear the crossroads' },
    { go: [12, -60], obj: 'Cross the square', label: 'MOVE', r: 6 },
    { fight: [{ n: 5, area: [28, 50, -90, -76], goal: [14, -62] }, { n: 3, area: [30, 50, -50, -40], goal: [14, -62] }], obj: 'Clear the mosque approach' },
    { go: [40, -58], obj: 'Get to the mosque courtyard', label: 'MOSQUE', r: 6, then: [[YUS, 'In here! Quickly, quickly!', 2]] },
  ],
});

/* 5. SAFEHOUSE */
add({
  name: 'Safehouse', map: 'town', env: 'nightcity', place: 'Mosque courtyard, Tamanrasset', time: '22:31 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [RAM, DAW, OKA, DOC], follow: false,
  player: [40, -56, 0],
  deathTip: 'Enemies come from every street. Keep moving between the courtyard walls.',
  npcs: [{ name: YUS, look: 'yusuf', pos: [42, -66] }],
  setup(c) { [[RAM, 34, -60], [DAW, 46, -60], [OKA, 36, -78], [DOC, 44, -76]].forEach(([n, x, z]) => { const u = c.squad[n]; u.pos.copy(at(x, z)); u.behavior = 'hold'; }); },
  stages: [
    { say: [[YUS, 'The truck has no tyre. Somebody shot the tyre. Ten minutes, I change it.', 3.6], [RAM, 'Ten minutes. Great.', 1.6], [REY, 'QRF is twenty out. Hold that courtyard.', 2.6, true]] },
    { defend: { secs: 130, label: 'TYRE', waves: [{ t: 2, n: 5, area: [60, 84, -70, -50], goal: [40, -66] }, { t: 22, n: 5, area: [0, 20, -90, -70], goal: [40, -66], say: [OKA, 'West!', 1.2] }, { t: 45, n: 6, area: [30, 50, -110, -96], goal: [40, -66], say: [DAW, 'South street, lots of them!', 2] }, { t: 70, n: 4, area: [60, 84, -40, -30], goal: [40, -66], tech: [[[90, -36], [62, -38], [50, -46]]], say: [RAM, 'Technical, north-east!', 1.8] }, { t: 95, n: 7, area: [10, 70, -110, -90], goal: [40, -66] }], mortar: 9, clear: true }, obj: 'Defend the courtyard while Yusuf changes the tyre' },
    { say: [[YUS, 'Done! It is done! Get in!', 2], [REY, 'Kessler\'s car went north on the Hoggar road. Go.', 2.8, true]] },
  ],
});

/* 6. PURSUIT */
add({
  name: 'Pursuit', map: 'pass', env: 'dawn', envOver: { sunEl: 4 }, place: 'Hoggar pass road', time: '05:48 LOCAL', loadout: ['m4', 'pistol'], follow: false,
  get player() { return [SP.PASS.cx(250), 250, Math.PI]; },
  deathTip: 'Shoot the gunners on the technicals first. The trucks stop when their gunners are dead.',
  setup(c, W) { SP.build.wreckCar(W, SP.PASS.cx(-188) + 2, -188, 1.2); },
  stages: [
    { say: [[YUS, 'I drive. You shoot. That is the deal.', 2.2], [JAKE, 'Deal.', 1]] },
    { chase: { get path() { return passPath(250, -190, 22); }, speed: 16, driver: YUS, spawns: [{ t: 3, side: 5, kind: 'buggy', say: [DAW, 'Buggy behind us!'] }, { t: 14, side: -5, kind: 'tech' }, { t: 26, side: 5, kind: 'tech', say: [JAKE, 'Another one!'] }, { t: 38, side: -5, kind: 'buggy' }, { t: 48, side: 4, kind: 'tech', say: [YUS, 'They keep coming!'] }] }, obj: 'Keep the chase vehicles off the truck' },
    { say: [[YUS, 'There! His car, in the ditch!', 2]] },
    { get fight() { const x = SP.PASS.cx(-200); return [{ cover: [[x - 6, -196], [x + 7, -200], [x - 2, -206]], n: 4, area: [x - 15, x + 15, -225, -210], goal: [x, -190] }]; }, obj: 'Clear the crash site' },
    { use: () => at(SP.PASS.cx(-188), -188), text: 'Search the car', hold: 2, obj: 'Search Kessler\'s car', label: 'CAR' },
    { say: [[JAKE, 'He\'s not here. Blood on the seat. Tracks going west.', 3], [REY, 'West is the village. The one where all this started. He\'s running to his money.', 4, true]] },
  ],
});

/* 7. KESSLER */
add({
  name: 'Kessler', map: 'desert', env: 'dawn', place: 'The village where it started, Algerian border', time: '07:12 LOCAL', loadout: ['m4', 'at4', 'pistol'], squad: [RAM, DAW, OKA, DOC, REY],
  player: [1.5, 30, 0],
  deathTip: 'Use the crates on the edge of the village. The technicals come up the main street.',
  stages: [
    { say: [[REY, 'Last time you were here the Jackal\'s men cooked lunch in that stash house. Kessler\'s in there. Let\'s go get him.', 4.6], [JAKE, 'Same crates. Same walls. Feels like a year ago.', 2.8]] },
    { go: [0, -112], obj: 'Move up to the crates at the village edge', label: 'COVER', r: 7 },
    { fight: [{ n: 6, area: [-30, 30, -200, -165], goal: [0, -118] }, { n: 4, area: [-40, 40, -230, -200], goal: [0, -130], say: [OKA, 'They\'re coming out of the houses!', 2] }, { n: 3, area: [-20, 20, -240, -225], goal: [0, -140], tech: [[[0, -320], [0, -250], [2, -205]]], say: [RAM, 'Technical on the north road!', 2] }], obj: 'Take the village' },
    { go: [6, -212], obj: 'Get to the stash house', label: 'STASH HOUSE', r: 4 },
    { fn: async (c, W) => { const k = SP.npc(c, KES, at(6, -222), 'kessler', { look: { weapon: 'none' } }); k.hands = 'up'; k.lookAt = at(6, -210); } },
    { use: [6, -216], text: 'Breach the door', hold: 0.8, obj: 'Breach the stash house', label: 'BREACH' },
    { cut: [[KES, 'Don\'t shoot! I\'m an American officer!', 2.6], [JAKE, 'You were.', 1.2], [KES, 'You don\'t understand who these people are. I was getting you intelligence. I was trading.', 4.4], [JAKE, 'You traded Houser.', 2], [KES, 'He was already taken. I just... knew where they sent him.', 3.4], [REY, 'Where.', 1], [KES, 'Kufra. Libya. An old Italian fort the militia uses as a prison. He was alive four days ago.', 4.8]], look: [Math.PI, -0.1] },
    { choice: { a: 'Hand him to Reyes', b: 'Make him draw the prison layout first', key: 'kessler', ra: [[REY, 'He goes home in cuffs and answers for all of it. Good call.', 3.2]], rb: [[KES, 'Fine. Fine! Three cell blocks. Houser is in the middle one, north side.', 4], [REY, 'That\'s worth a lot more than a confession. Bag him.', 3]] } },
    { heli: { at: [0, -100] }, obj: 'Get to the helicopter' },
  ],
});
})();

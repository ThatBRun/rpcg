/* Survival Protocol 1.0 — Mission 1 "The Jackal", Chapter X: The Jackal (40 parts) */
'use strict';
(function () {
const { V3 } = SP; const G = SP.G;
const HOU = 'SGT. HOUSER', RAM = 'CPL. RAMIREZ', DAW = 'PVT. DAWSON', OKA = 'OKAFOR', DOC = 'DOC LEE', REY = 'CPT. REYES', ELE = 'DR. MOREAU', YUS = 'YUSUF', JACK = 'THE JACKAL', JAKE = 'JAKE', NAD = 'NADIA', KHA = 'KHALID', VAN = 'COL. VANCE';
const R = (who, text) => [who, text, undefined, true];
const p = (name, map, env, place, time, intro, beats, outro, extra) => Object.assign({ name, map, env, place, time, intro, beats, outro }, extra || {});
const breach = { fn: async (c, W) => { SP.G.explosion(V3(0, 1.5, 61), 4, 30, 'player'); SP.fortOpenGate(W); SP.G.hud.feed('GATE BREACHED', 'gold'); await c.wait(1.2); } };

const FINAL_BOSS = { boss: {
  name: 'THE JACKAL', hp: 9500, start: [34, -36], heliOf: 'FORT',
  covers: [[30, -30], [44, -28], [36, -44], [24, -40], [46, -44], [20, -30], [-30, -38], [-40, -30]],
  guards: { cover: [[28, -24], [40, -24]], n: 3, area: [20, 50, -50, -45], goal: [20, -20], stop: 14 },
  intro: [[JACK, 'Sarton. You have followed me across a whole country.', 3], [JACK, 'I have run out of money, out of soldiers, out of cousins. I have not run out of bullets.', 4], [HOU, 'Eight phases of crazy coming up. Stay on him.', 2.4]],
  script: [
    { label: 'PHASE 1 · THE KEEP', until: 0.88 },
    { label: 'PHASE 2 · ROYAL GUARD', until: 0.76, armorWave: { n: 7, area: [-50, -30, -50, -30], goal: [24, -24], stop: 12 }, rpg: 6, say: [JACK, 'My guard! To me!', 1.8], broken: [OKA, 'Guard\'s down! Hit him!', 1.8] },
    { label: 'PHASE 3 · FIRESTORM', until: 0.64, mortar: 3, rpg: 5, say: [JACK, 'Bring the mortars down on all of us!', 2.4] },
    { label: 'PHASE 4 · BERSERK', until: 0.52, rush: true, wave: { n: 5, area: [-20, 20, 30, 48], goal: [24, -20], stop: 8 }, say: [JACK, 'No more hiding! Face me!', 2] },
    { label: 'PHASE 5 · GUNSHIP', until: 0.3, gunship: true, center: [0, -10], radius: 42, alt: 20, rpg: 5, say: [HOU, 'He\'s in the chopper! Shoot the door gunner! That\'s him!', 2.8] },
    { label: 'PHASE 6 · CRASH LANDING', until: 0.18, crash: true, wave: { n: 6, area: [-30, 30, 20, 40], goal: [24, -24], stop: 10 }, say: [RAM, 'He\'s going down! He\'s going down!', 2] },
    { label: 'PHASE 7 · LAST LOYALISTS', until: 0.08, armorWave: { n: 8, area: [-55, -40, -20, 40], goal: [24, -24], stop: 12 }, mortar: 5, say: [JACK, 'Whoever is left! Kill them all!', 2.2], broken: [HOU, 'That\'s the last of them! It\'s just him!', 2.2] },
    { label: 'PHASE 8 · NO WAY OUT', until: 0, rush: true, escape: 150, timerLabel: 'HE\'S RUNNING FOR THE TUNNELS', say: [JACK, 'You will never take me alive!', 2.2] },
  ],
  obj: 'Defeat the Jackal', after: 'Secure the Jackal', escapeMsg: 'The Jackal reached the escape tunnels. Keep pressure on him in the final phase.',
} };

SP.PARTSX = SP.genChapter(10, 'The Jackal', [
  // ---- Act 1: Gathering (1–8)
  p('Operation Ibn Awa', 'fob', 'dawn', 'FOB Tessalit', '04:30 LOCAL · D-DAY', [[VAN, 'Operation Ibn Awa. Three phases. First we cut his roads. Then we cut his eyes. Then we go through the front door.'], [REY, 'And this time nobody leaks it. Nobody outside this tent knows.']], ['use:0', 'use:1'], [[HOU, 'Let\'s go to work.']], { loadout: ['m4', 'pistol'], squad: [HOU] }),
  p('The Southern Road', 'desert', 'day', 'Route to Tamanrasset', '07:10 LOCAL', [[OKA, 'Supply convoy heading for the fortress. We stop it here.']], ['assault:0-1+t'], [[RAM, 'Convoy\'s burning. That\'s one road.']]),
  p('Desert Village', 'desert', 'afternoon', 'Fuel depot village', '12:00 LOCAL', [[HOU, 'Fuel depot in the village. No fuel, no trucks.']], ['assault:2-3+t', 'use:1'], [[RAM, 'Charges set on the depot.']], { useText: 'Plant charges on the fuel depot' }),
  p('Night Patrol', 'desert', 'night', 'Fuel depot village', '22:00 LOCAL', [[OKA, 'They sent a patrol to check the depot. Let them walk past.']], ['stealth'], [[HOU, 'Out the north side. Clean.']], { flash: true }),
  p('Mountain Road', 'pass', 'afternoon', 'Hoggar pass', '14:30 LOCAL', [[DAW, 'Second supply road runs through the pass.']], ['assault:0-2+t'], [[HOU, 'Two roads cut.']]),
  p('Pass Chase', 'pass', 'sunset', 'Hoggar pass', '17:50 LOCAL', [[DAW, 'Fuel trucks running for the fortress. Get them.']], ['chase'], [[DAW, 'Fuel trucks down.']], { driver: DAW }),
  p('High Ground', 'pass', 'dusk', 'Hoggar pass ledge', '19:10 LOCAL', [[OKA, 'Their scouts are on the road below. Ledge.']], ['snipe', 'assault:4-5'], [[OKA, 'Three roads. He\'s cut off.']]),
  p('Atlas Relay', 'mountain', 'snow', 'Atlas mountains', '10:00 LOCAL', [R(VAN, 'His radio relay for the whole south is on the old lab mountain. Take it.')], ['assault:2-4+t', 'use:2'], [[RAM, 'Relay\'s ours. He just went deaf.']], { useText: 'Take over the relay' }),
  // ---- Act 2: Blind him (9–20)
  p('Snowfall', 'mountain', 'snownight', 'Atlas mountains', '21:30 LOCAL', [[HOU, 'His men want the relay back.']], ['defend:150+t'], [[HOU, 'They\'re done.']], { mortar: 9 }),
  p('Ridge Line', 'mountain', 'snow', 'Atlas ridge', '07:00 LOCAL', [[OKA, 'Last of his mountain men are heading down the road.']], ['chase'], [[DAW, 'Mountain\'s clear.']], { driver: DAW }),
  p('Timgad Cache', 'ruins', 'golden', 'Timgad', '18:30 LOCAL', [[NAD, 'Khalid kept a weapons cache under the theatre stage.']], ['assault:0-2+t', 'use:2'], [[NAD, 'Rockets. Mines. All of it his.']], { useText: 'Rig the weapons cache' }),
  p('Night Watch', 'ruins', 'night', 'Timgad', '22:10 LOCAL', [[HOU, 'They\'re coming for the cache. Wrong night.']], ['defend:150+t'], [[NAD, 'Cache is gone. So is the rest of his rocket stock.']], { mortar: 9 }),
  p('Temple Snipers', 'ruins', 'golden', 'Temple of Jupiter, Timgad', '06:40 LOCAL', [[OKA, 'Snipers covering the cardo. From the temple steps we can see them all.']], ['snipe', 'assault:3-4'], [[OKA, 'Ruins are clear.']]),
  p('Return to Algiers', 'city', 'day', 'Algiers', '11:00 LOCAL', [[NAD, 'His last informants in the city are meeting at the plaza.']], ['assault:0-1'], [[NAD, 'Informants in custody.']]),
  p('Rooftop Chase', 'city', 'afternoon', 'Algiers', '13:20 LOCAL', [[DAW, 'One got into a car! Boulevard!']], ['chase'], [[DAW, 'Got him.']], { driver: DAW }),
  p('City Under Siege', 'city', 'nightcity', 'Algiers', '22:00 LOCAL', [[NAD, 'He\'s hitting back. Car bombs, gunmen. He wants the city scared.']], ['assault:1-3+t'], [[HOU, 'Hold on, we\'re not done here.']]),
  p('Martyrs\' Square', 'city', 'nightcity', 'Place des Martyrs, Algiers', '23:00 LOCAL', [[NAD, 'Civilians are sheltering in the square. Nobody gets through.']], ['defend:180+t'], [[NAD, 'Algiers is safe.']], { mortar: 9 }),
  p('Harbour Run', 'port', 'nightcity', 'Port of Oran', '02:00 LOCAL', [R(VAN, 'A boat is waiting in Oran to take him out if the fortress falls. Sink it.')], ['stealth'], [[HOU, 'At the quay.']]),
  p('The Boat', 'port', 'nightcity', 'Port of Oran', '02:20 LOCAL', [[RAM, 'Boat\'s guarded heavy.']], ['assault:1-3+t', 'use:0'], [[RAM, 'Charges set. His escape boat is gone.']], { useText: 'Rig the escape boat' }),
  p('Dockside', 'port', 'dawn', 'Port of Oran', '04:40 LOCAL', [[HOU, 'They want revenge for the boat.']], ['defend:150+t'], [[HOU, 'Port\'s ours.']], { mortar: 8 }),
  // ---- Act 3: Isolate (21–28)
  p('Tamanrasset Dawn', 'town', 'dawn', 'Tamanrasset', '05:30 LOCAL', [[YUS, 'The last militia in town is loyal to him. They will not surrender.']], ['assault:0-2+t'], [[YUS, 'Half the town is cheering. The other half is hiding.']], { npcs: [{ name: YUS, look: 'yusuf', pos: [-62, -40], follow: true }] }),
  p('Town Square', 'town', 'day', 'Tamanrasset', '07:40 LOCAL', [[OKA, 'Spotters in the square again.']], ['snipe', 'assault:3-4+t'], [[YUS, 'It is over in Tamanrasset. Thank you.']]),
  p('The Villa Burns', 'villa', 'sunset', 'Cap Falcon', '18:10 LOCAL', [[NAD, 'His family is gone from the villa. His guards are not.']], ['assault:0-2+t'], [[NAD, 'Villa\'s clear. His last home.']]),
  p('Kufra Liberation', 'prison', 'day', 'Kufra prison', '09:00 LOCAL', [[HOU, 'Kufra. One last time. Let\'s empty it.']], ['assault:0-2+t', 'use:0'], [[HOU, 'Every cell open. Every prisoner walking out. Good.']], { useText: 'Open every cell block' }),
  p('Airbase Strike', 'base', 'afternoon', 'Jebel Uweinat', '14:00 LOCAL', [R(VAN, 'His last aircraft are at Uweinat. Ground them.')], ['assault:0-2+t'], [[RAM, 'Planes are burning.']]),
  p('Hold the Airfield', 'base', 'sunset', 'Jebel Uweinat', '17:00 LOCAL', [[HOU, 'Counterattack from the hills.']], ['defend:180+t'], [[VAN, 'He has no roads, no radios, no boats, no planes.']], { mortar: 8 }),
  p('Long Night', 'desert', 'night', 'Approach to Qasr Ibn Awa', '23:00 LOCAL', [[HOU, 'Fortress is two hundred kilometres south. We drive all night.']], ['assault:0-1'], [[HOU, 'Last stop before the fortress.']], { flash: true }),
  p('Last Camp', 'fob', 'dawn', 'Forward camp', '04:50 LOCAL', [[REY, 'I asked to be here. They said no. So I came anyway.'], [HOU, 'Captain, your leg.'], [REY, 'My leg can complain later.'], [VAN, 'Assault begins at sunrise.']], ['use:1', 'use:0'], [[JAKE, 'Let\'s go meet him.']], { loadout: ['m4', 'pistol'], squad: [HOU] }),
  // ---- Act 4: Qasr Ibn Awa (29–40)
  p('The Approach', 'fortress', 'dawn', 'Qasr Ibn Awa', '05:40 LOCAL', [[HOU, 'There it is. The palace of the jackal.'], [OKA, 'Big walls. Lots of windows.']], ['assault:0+t'], [[HOU, 'Keep moving up the road.']]),
  p('Outer Checkpoints', 'fortress', 'dawn', 'Qasr Ibn Awa', '06:10 LOCAL', [[RAM, 'Sandbags all the way up the road.']], ['assault:0-1+t'], [[HOU, 'Gate\'s ahead. Snipers on the towers.']]),
  p('Tower Snipers', 'fortress', 'day', 'Qasr Ibn Awa', '06:40 LOCAL', [[OKA, 'Four towers. Four snipers. Your turn, Sarton.']], ['snipe'], [[OKA, 'Towers are quiet.']]),
  p('Silent Walls', 'fortress', 'day', 'Qasr Ibn Awa', '07:00 LOCAL', [[HOU, 'Patrols on the road. Get to the gate without waking the whole fort.']], ['stealth'], [[HOU, 'At the gate.']]),
  p('Breach', 'fortress', 'day', 'Main gate, Qasr Ibn Awa', '07:20 LOCAL', [[RAM, 'Charge on the gate. On you.']], ['use:0', breach, 'assault:2+t'], [[HOU, 'We\'re inside!']], { useText: 'Plant the breaching charge' }),
  p('The Courtyard', 'fortress', 'day', 'Courtyard, Qasr Ibn Awa', '07:40 LOCAL', [[OKA, 'Courtyard\'s a kill zone. Push to the well.']], ['assault:3+t'], [[RAM, 'Courtyard\'s ours.']], { gate: true }),
  p('Market Stalls', 'fortress', 'afternoon', 'Courtyard, Qasr Ibn Awa', '08:30 LOCAL', [[HOU, 'They\'re counterattacking from the stalls.']], ['defend:150+t'], [[HOU, 'Push.']], { gate: true, mortar: 8 }),
  p('The Keep', 'fortress', 'afternoon', 'The keep, Qasr Ibn Awa', '10:00 LOCAL', [[NAD, 'The keep stairs. He\'s up there or underneath.']], ['assault:4+t'], [[RAM, 'Keep entrance taken.']], { gate: true }),
  p('Motor Pool', 'fortress', 'afternoon', 'Qasr Ibn Awa', '11:10 LOCAL', [[DAW, 'Trucks in the west yard. If he runs, he runs in one of those.']], [{ go: [-40, 30], obj: 'Move to the west yard', label: 'TRUCKS', r: 7 }, { fight: [{ n: 7, area: [-55, -30, -45, -30], goal: [-40, 20], cover: [[-44, -38], [-37, -38]] }], obj: 'Take the motor pool' }], [[DAW, 'Tyres slashed. He\'s not driving out.']], { gate: true }),
  p('The Well', 'fortress', 'sunset', 'Qasr Ibn Awa', '15:30 LOCAL', [[ELE, 'Water tests from the well. He might have used the last of the formula here.']], ['use:1', 'defend:120+t'], [[ELE, 'Clean. He bluffed. He\'s out of tricks.']], { gate: true, npcs: [{ name: ELE, look: 'elena', pos: [2, 28] }] }),
  p('Sunset Assault', 'fortress', 'sunset', 'Qasr Ibn Awa', '17:40 LOCAL', [R(VAN, 'Every fighter left is pulling back to the helipad. He\'s going to try to fly out.'), [HOU, 'Not today.']], [{ go: [36, -20], obj: 'Push to the helipad', label: 'HELIPAD', r: 7 }, { fight: [{ n: 8, area: [30, 55, -50, -40], goal: [36, -24], cover: [[40, -30], [30, -30]] }], obj: 'Clear the helipad' }], [[JAKE, 'Helipad\'s clear. Where is he?']], { gate: true }),
  p('The Jackal', 'fortress', 'dusk', 'Qasr Ibn Awa', '18:20 LOCAL', [[JACK, 'I am here, Sarton. Where else would I be?'], [HOU, 'Everybody stay sharp. This is it.']],
    [{ go: [24, -20], obj: 'Find the Jackal', label: 'JACKAL', r: 8 }, FINAL_BOSS,
     { use: () => SP.ctx.boss.pos.clone(), text: 'Disarm the Jackal', hold: 1.4, obj: 'Secure the Jackal', label: 'JACKAL' },
     { cut: [[JACK, 'It is over then.', 2], [JAKE, 'It\'s over.', 1.4], [JACK, 'You know what I remember? You. On that first day. A boy with my money in his pocket.', 4], [JAKE, 'That boy grew up.', 2], [HOU, 'Hey. Sarton. You alright?', 2]], look: [-1, -0.15] },
     { choice: { a: '"Yeah. I\'m all good."', b: '"No. But I will be."', key: 'finale', ra: [[HOU, 'Heh. You said that on day one.', 2.4], [HOU, 'This time I believe you.', 2.4]], rb: [[HOU, 'Good answer. Let\'s go home.', 2.4]] } },
    ], [[REY, 'All units, this is Reyes. The Jackal is in custody. Operation Ibn Awa is complete.', undefined, true], [VAN, 'Mission one is over, soldier. Rest up.', undefined, true]],
    { gate: true, loadout: ['m4', 'at4', 'pistol'], tip: 'Eight-phase boss fight. Kill guards to break his armour, keep moving in the firestorm, back off from his charge, shoot the door gunner on the helicopter, and finish him before he reaches the tunnels.' }),
]);
SP.PARTSX.endTitle = 'Mission 1 complete'; SP.PARTSX.endText = 'The Jackal is in a cell in Algiers, for good this time. His roads, his money, his army and his fortress are gone. Pvt. Jake Sarton and Sgt. Houser walk out of Qasr Ibn Awa together. Thank you for playing Survival Protocol.';
})();

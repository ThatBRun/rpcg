/* Survival Protocol 1.0 — Mission 1 "The Jackal", chapters 6–9 */
'use strict';
(function () {
const HOU = 'SGT. HOUSER', RAM = 'CPL. RAMIREZ', DAW = 'PVT. DAWSON', OKA = 'OKAFOR', DOC = 'DOC LEE', MIT = 'PVT. MITCHELL', REY = 'CPT. REYES', ELE = 'DR. MOREAU', YUS = 'YUSUF', JACK = 'THE JACKAL', JAKE = 'JAKE', NAD = 'NADIA', KHA = 'KHALID', VAN = 'COL. VANCE', FAR = 'DR. FARID';
const R = (who, text) => [who, text, undefined, true]; // radio line
const p = (name, map, env, place, time, intro, beats, outro, extra) => Object.assign({ name, map, env, place, time, intro, beats, outro }, extra || {});

/* ============================ CHAPTER 6 · GHOST OF ALGIERS (14) ============================ */
SP.PARTS6 = SP.genChapter(6, 'Ghost of Algiers', [
  p('Leave Cancelled', 'fob', 'dawn', 'FOB Tessalit, northern Mali', '05:40 LOCAL · TWO MONTHS LATER',
    [[JAKE, 'Forty-one days at home. I slept through every one of them.'], R(REY, 'Sarton. Command tent. Bring your boots, you won\'t be unpacking.')],
    ['use:0', [[REY, 'Six hours ago the Jackal was being moved from Serkadji prison to a courthouse in Algiers.'], [REY, 'Twelve men hit the convoy at a red light. Four guards dead. He walked away in handcuffs.'], [HOU, 'Somebody told them the route. Again.']], 'use:1', [[ELE, 'Algerian intelligence wants us there. They are sending an officer to meet you. Her name is Nadia.']]],
    [[JAKE, 'He gets one more run. That\'s all he gets.']], { loadout: ['m4', 'pistol'], squad: [HOU], tip: 'Use the map table and the ammo crates.' }),
  p('Wheels Down', 'city', 'day', 'Boulevard Zighout Youcef, Algiers', '13:10 LOCAL',
    [[NAD, 'Captain Nadia Benali, DGSN. You are Sarton. He talks about you, you know. In the transcripts.'], [JAKE, 'Good things?'], [NAD, 'No.']],
    ['go:0', 'use:1', [[NAD, 'The convoy stopped here. They had a truck waiting at the next light.']], 'fight:1'],
    [[NAD, 'Those were not his men. Those were hired. Somebody in this city is paying for him.']], { useText: 'Search the convoy wreck', npcs: [{ name: NAD, look: 'elena', pos: [3, 128], follow: true, o: { team: 'ally', weapon: 'pistol', look: { weapon: 'pistol', top: 0x2a2a30 } } }] }),
  p('The Ambush Site', 'city', 'afternoon', 'Rue Didouche Mourad, Algiers', '14:02 LOCAL',
    [[HOU, 'Contact! Second floor windows, both sides!'], [RAM, 'So much for a quiet afternoon.']],
    ['assault:0-2+t'],
    [[NAD, 'One of them had a ferry ticket. Tonight. From the port.']], { tip: 'Use the palm planters and parked cars on the boulevard.' }),
  p('Casbah', 'city', 'dusk2', 'The Casbah, Algiers', '18:45 LOCAL',
    [[NAD, 'The man selling the tickets lives up in the Casbah. He knows the Jackal\'s cousin.'], [OKA, 'Everybody in this city is somebody\'s cousin.']],
    ['assault:2-3', 'use:0'],
    [[NAD, 'The ticket man ran. He left this. A harbour gate pass for berth nine.']], { useText: 'Search the dead drop at the fountain' }),
  p('Quiet Streets', 'city', 'nightcity', 'Bab El Oued, Algiers', '22:30 LOCAL',
    [[HOU, 'Police curfew, and his people own the night. We go quietly.'], [NAD, 'If they see us, they warn the port.']],
    ['stealth'],
    [[HOU, 'We\'re through. Port is five minutes south.']]),
  p('The Informant', 'city', 'nightcity', 'Place des Martyrs, Algiers', '23:15 LOCAL',
    [[NAD, 'My informant is in the fountain square. He wants protection before he talks.'], R(REY, 'Then protect him. Everyone in Algiers knows you\'re there now.')],
    ['defend:120+t'],
    [[NAD, 'He says the Jackal is not leaving by ferry. A freighter. Berth nine. Midnight.']], { mortar: 9 }),
  p('Harbor Lights', 'port', 'nightcity', 'Port of Algiers', '23:52 LOCAL',
    [[HOU, 'Berth nine is past the container yard. Same as Oran. Feels like a rerun.'], [NAD, 'Then you know where they stand.']],
    ['stealth'], [[HOU, 'On the quay. Freighter\'s still tied up.']]),
  p('Ghost Ship', 'port', 'nightcity', 'Berth nine, Port of Algiers', '00:04 LOCAL',
    [[RAM, 'They\'re loading crates on the east pier. Lots of guards.'], [HOU, 'Then lots of noise. Go.']],
    ['assault:1-3+t'], [[OKA, 'He\'s not here. Just crates with his name on them.']]),
  p('Manifest', 'port', 'nightcity', 'Warehouse 12, Port of Algiers', '00:31 LOCAL',
    [[NAD, 'The manifest will say where this cargo goes. Find it before they burn it.']],
    ['use:1', [[NAD, 'Annaba. Then by road to Timgad. The old Roman city.']], 'defend:90'],
    [[HOU, 'Why would a drug lord meet anyone in a ruin?'], [NAD, 'Because nobody watches ruins at night.']], { useText: 'Search the harbour office' }),
  p('Coast Road', 'pass', 'afternoon', 'N3 highway towards Batna', '15:20 LOCAL',
    [[DAW, 'Two trucks of his cargo ahead. Escort\'s behind us.'], [JAKE, 'Then let\'s not stop.']],
    ['chase'], [[DAW, 'Trucks pulled off at a checkpoint. His men.']]),
  p('Checkpoint Zero', 'pass', 'sunset', 'Aurès mountains', '18:40 LOCAL',
    [[OKA, 'Fake police checkpoint. Real rifles.'], [HOU, 'Sarton, ledge. Thin them out first.']],
    ['snipe', 'assault:3-4'], [[NAD, 'They were waiting for the trucks. Timgad is twenty kilometres.']]),
  p('Ruins of Timgad', 'ruins', 'golden', 'Timgad, Roman colony of Thamugadi', '19:05 LOCAL',
    [[NAD, 'Two thousand years old. Trajan built it for his veterans.'], [HOU, 'And tonight it\'s full of the Jackal\'s.'], [HOU, 'Quiet. We see who he\'s meeting.']],
    ['stealth'], [[JAKE, 'Under the arch. Khalid. His money man.']]),
  p('The Arch', 'ruins', 'night', 'Trajan\'s Arch, Timgad', '20:10 LOCAL',
    [[KHA, 'He said you would come, Sarton. He said to say hello.'], [HOU, 'Light them up!']],
    ['assault:1-2+t', 'use:0'], [[NAD, 'Khalid ran. But he dropped his phone.']], { useText: 'Grab Khalid\'s phone' }),
  p('Black Snow', 'ruins', 'night', 'Amphitheatre, Timgad', '21:00 LOCAL',
    [[ELE, 'The phone talks to a lab in the Atlas mountains. They\'re making something new. They call it black snow.'], [HOU, 'Reinforcements coming up the hill. Hold the arch.']],
    ['defend:150+t', 'heli'], [[NAD, 'I\'m coming with you.'], [JAKE, 'Pack warm.']], { mortar: 8 }),
]);
SP.PARTS6.endTitle = 'Black Snow'; SP.PARTS6.endText = 'The Jackal is free and building something worse than anything he sold before. Khalid\'s phone points to a lab high in the Atlas mountains.';

/* ============================ CHAPTER 7 · BLACK SNOW (6) ============================ */
SP.PARTS7 = SP.genChapter(7, 'Black Snow', [
  p('Insertion', 'mountain', 'snownight', 'Djurdjura range, Atlas mountains', '02:20 LOCAL',
    [[HOU, 'Minus twelve. My beard has frozen to my face.'], [NAD, 'You should shave.'], [HOU, 'Never.'], [HOU, 'Guard posts on the road. We walk past them, not through them.']],
    ['stealth'], [[JAKE, 'Lab\'s in sight. Floodlights, four towers, generator on the east side.']], { flash: true }),
  p('The Pass', 'mountain', 'snow', 'Tizi n\'Kouilal pass', '07:10 LOCAL',
    [R(REY, 'Weather window is closing. You have until noon before the storm.'), [OKA, 'Then let\'s not spend it here.']],
    ['assault:0-2+t'], [[RAM, 'Road\'s open. Lab\'s at the end of it.']]),
  p('The Lab', 'mountain', 'snow', 'Black Snow laboratory', '09:40 LOCAL',
    [[NAD, 'Server room is in the main building. Elena needs everything on it.'], [HOU, 'Then we take the whole compound.']],
    ['assault:3-4+t', 'use:0'], [[ELE, 'Got it. Oh no. The formula. This isn\'t a drug. It\'s a weapon.']], { useText: 'Download the lab server' }),
  p('Whiteout', 'mountain', 'snow', 'Black Snow laboratory', '11:55 LOCAL', [R(REY, 'Storm\'s early. Bird can\'t fly. And he\'s sent everyone he has up that road.'), [HOU, 'Then we hold the lab.']],
    ['defend:180+t'], [[HOU, 'Is that everyone?'], [OKA, 'For now.']], { mortar: 10, envOver: { fogD: 0.02 } }),
  p('The Chemist', 'mountain', 'snow', 'Black Snow laboratory', '13:30 LOCAL',
    [[FAR, 'Please. I am Doctor Farid. I worked with Elena in Paris, years ago. He took my daughter.'], [FAR, 'Black snow goes into the water of a city. Ten thousand people sick in a day. He calls it leverage.'], [JAKE, 'Where?'], [FAR, 'He didn\'t say. But he talked about Kufra, and the old FOB.']],
    ['use:1', { choice: { a: 'Take Farid with us', b: 'Leave him to the DGSN', key: 'farid', ra: [[FAR, 'Thank you. I will tell you everything.']], rb: [[NAD, 'My people will keep him safe. And honest.']] } }],
    [[HOU, 'Charges set. Let\'s go.']], { useText: 'Plant charges on the generator', npcs: [{ name: FAR, look: 'x', pos: [10, -150], o: { team: 'civ', look: { weapon: 'none', top: 0xe8e8e8, seed: 71 } } }] }),
  p('Down the Mountain', 'mountain', 'snow', 'Atlas mountain road', '14:45 LOCAL',
    [[DAW, 'Lab\'s going up behind us. Hold on to something.'], [JAKE, 'Just drive.']],
    ['chase', 'heli'], [R(REY, 'Sarton. The FOB is under attack. He\'s here. He\'s hitting us at home.')], { driver: DAW }),
]);
SP.PARTS7.endTitle = 'Broken Arrow'; SP.PARTS7.endText = 'The lab is ash, but the Jackal has already moved. While the team was in the mountains, he went for the one place they thought was safe.';

/* ============================ CHAPTER 8 · BROKEN ARROW (19) ============================ */
SP.PARTS8 = SP.genChapter(8, 'Broken Arrow', [
  p('Siege', 'fob', 'night', 'FOB Tessalit', '22:10 LOCAL', [R(REY, 'They\'re at the south gate! All hands!'), [HOU, 'Sarton, with me! Gate!']], ['defend:150+t'], [[RAM, 'They\'re pulling back. Why are they pulling back?']], { mortar: 6, flash: true }),
  p('Mortar Line', 'desert', 'night', 'Dunes south of Tessalit', '23:30 LOCAL', [[OKA, 'Mortars are firing from the dunes. Two kilometres.'], [HOU, 'Then we walk two kilometres.']], ['assault:0-1'], [[OKA, 'Mortar team down. That was a distraction.']], { flash: true }),
  p('Aftermath', 'fob', 'dawn', 'FOB Tessalit', '05:20 LOCAL', [[DOC, 'Reyes took shrapnel in the leg. He\'ll live. He\'s yelling.'], [NAD, 'Sarton. Elena is gone. They came in through the west fence while we fought at the gate.']], ['use:2', [[JAKE, 'Her tracker. It\'s still pinging. North, into the desert.']], 'use:0'], [[HOU, 'Gear up. We\'re getting her back.']], { useText: 'Check Elena\'s tracker', loadout: ['m4', 'pistol'], squad: [HOU] }),
  p('Tracks', 'desert', 'day', 'Wadi Tilemsi', '09:00 LOCAL', [[OKA, 'Three trucks. Heavy. Heading for the old village.']], ['go:0', 'go:1', 'fight:1+t'], [[HOU, 'They left a rear guard. They know we\'re coming.']]),
  p('The Village', 'desert', 'afternoon', 'The village where it started', '13:40 LOCAL', [[JAKE, 'Third time here. I\'m starting to know the neighbours.'], [RAM, 'The neighbours are shooting at us.']], ['assault:2-3+t'], [[OKA, 'One of them is alive. He wants to talk.']]),
  p('Interrogation', 'desert', 'afternoon', 'Stash house', '14:20 LOCAL', [[KHA, 'Ah. Sarton. We meet properly.'], [KHA, 'The doctor is on her way to Kufra. Then somewhere you will never find.']], ['use:1', { choice: { a: 'Hand Khalid to Nadia', b: 'Make him give up the convoy route', key: 'khalid', ra: [[NAD, 'He will talk to me. Eventually.']], rb: [[KHA, '...The canyon road. Tonight. Fine.']] } }], [[HOU, 'Canyon road it is.']], { useText: 'Open the stash house door', npcs: [{ name: KHA, look: 'jackal', pos: [6, -222], o: { team: 'civ', look: { weapon: 'none', top: 0x5a4a3a, seed: 33 } } }] }),
  p('Canyon Run', 'pass', 'sunset', 'Hoggar pass road', '18:10 LOCAL', [[DAW, 'Convoy\'s two minutes ahead. Hang on.']], ['chase'], [[DAW, 'They ditched the trucks and went to ground. The caves.']], { driver: DAW }),
  p('Roadblock', 'pass', 'dusk', 'Hoggar pass road', '19:00 LOCAL', [[OKA, 'They\'ve blocked the road to buy time.']], ['assault:3-5+t'], [[HOU, 'Road\'s clear. Kufra by morning.']]),
  p('Kufra Again', 'prison', 'sunset', 'Ridge above Kufra prison', '06:30 LOCAL', [[HOU, 'I swore I\'d never see this place again.'], [JAKE, 'You don\'t have to come in.'], [HOU, 'Yeah I do.']], ['snipe'], [[OKA, 'Towers are down. Gate\'s already open. They want us inside.']]),
  p('Old Walls', 'prison', 'night', 'South wall, Kufra prison', '21:40 LOCAL', [[NAD, 'Elena\'s tracker is inside. Moving between buildings.']], ['stealth'], [[HOU, 'At the gate. Go loud on my mark.']]),
  p('The Yard', 'prison', 'night', 'Main yard, Kufra prison', '21:52 LOCAL', [[HOU, 'Mark!']], ['assault:1-2+t'], [[RAM, 'Warden\'s office. Her tracker is in there.']]),
  p('Warden\'s Office', 'prison', 'night', 'Admin building, Kufra prison', '22:05 LOCAL', [[JAKE, 'Just the tracker. They cut it out. There\'s blood on the desk.'], [NAD, 'And a flight plan. Airbase at Jebel Uweinat.']], ['use:2', 'defend:120'], [[HOU, 'Truck. Now.']], { useText: 'Search the warden\'s office' }),
  p('Riot Gate', 'prison', 'night', 'Motor pool, Kufra prison', '22:30 LOCAL', [[OKA, 'Every guard left in the fort is between us and that truck.']], ['assault:2-3', 'use:1'], [[DAW, 'Engine\'s running! Get in!']], { useText: 'Hotwire the truck' }),
  p('Airfield', 'base', 'dawn', 'Jebel Uweinat airfield', '05:50 LOCAL', [[HOU, 'Same airfield as last time. They\'ve moved in for real now.'], R(REY, 'A cargo plane is fuelling. If Elena gets on it, she\'s gone.')], ['assault:0-1+t'], [[RAM, 'Plane\'s in the hangar. They\'re loading it.']]),
  p('Hangar', 'base', 'day', 'Hangar 2, Jebel Uweinat', '06:20 LOCAL', [[NAD, 'She\'s in there. I can hear her shouting at them.'], [HOU, 'That\'s Elena all right.']], ['assault:2', 'use:1'], [[ELE, 'You took your time.'], [JAKE, 'Traffic.']], { useText: 'Cut Elena loose' }),
  p('Runway', 'base', 'day', 'Jebel Uweinat airfield', '06:40 LOCAL', [[ELE, 'He made me finish the formula. It\'s ready. Three canisters.'], R(REY, 'Bird is inbound. Hold the airfield.')], ['defend:150+t', 'heli'], [[ELE, 'Three canisters, Jake. And I don\'t know where they went.']], { npcs: [{ name: ELE, look: 'elena', pos: [24, -48], follow: true }], mortar: 9 }),
  p('Broken Arrow', 'fob', 'sunset', 'FOB Tessalit', '17:30 LOCAL', [[REY, 'Sit down, all of you. I\'d stand, but they took a piece of my leg.'], [REY, 'Three canisters. Intercepts say one goes to Tamanrasset. Tonight.'], [VAN, 'Colonel Vance, Joint Command. As of now this unit has every asset it asks for.']], ['use:0', 'use:1'], [[HOU, 'Tamanrasset. Of course it\'s Tamanrasset.']], { loadout: ['m4', 'pistol'], squad: [HOU] }),
  p('Night Drop', 'desert', 'night', 'Outskirts of Tamanrasset', '23:50 LOCAL', [R(VAN, 'Every militia he owns is moving into the city. Lights are going out block by block.')], ['go:0', 'go:1', 'fight:1'], [[HOU, 'City lights just went out. All of them.']], { flash: true }),
  p('Lights Out', 'desert', 'night', 'Outskirts of Tamanrasset', '00:30 LOCAL', [[OKA, 'Checkpoint between us and the city. Big one.']], ['assault:2-3+t'], [[HOU, 'We\'re in.']], { flash: true }),
]);
SP.PARTS8.endTitle = 'The Long Night'; SP.PARTS8.endText = 'Elena is safe, but the formula is finished and the Jackal has three canisters. One is somewhere in Tamanrasset, a city that has just gone dark.';

/* ============================ CHAPTER 9 · THE LONG NIGHT (15) ============================ */
SP.PARTS9 = SP.genChapter(9, 'The Long Night', [
  p('Blackout', 'town', 'nightcity', 'Tamanrasset', '00:50 LOCAL', [[YUS, 'Sarton! Over here! They took the power station first.'], [JAKE, 'Yusuf. Good to see you.'], [YUS, 'It is never good to see you. Something always explodes.']], ['assault:0-1'], [[YUS, 'The canister. People say a truck went to the mosque.']], { npcs: [{ name: YUS, look: 'yusuf', pos: [-62, -40], follow: true }] }),
  p('Streets of Fire', 'town', 'nightcity', 'Back streets, Tamanrasset', '01:20 LOCAL', [[HOU, 'Every street has a gun in it.']], ['assault:1-3+t'], [[RAM, 'Mosque is just ahead.']]),
  p('The Mosque', 'town', 'nightcity', 'Mosque courtyard, Tamanrasset', '01:55 LOCAL', [[ELE, 'Sensor says the canister is here. Close. Hold them off while I find it.']], ['defend:180+t'], [[ELE, 'Found it. Sealed. One down, two to go.']], { mortar: 8, npcs: [{ name: ELE, look: 'elena', pos: [42, -66] }] }),
  p('Rooftops', 'town', 'nightcity', 'Rooftops, Tamanrasset', '02:40 LOCAL', [[OKA, 'Their spotters are on the square. Clear them before we cross.']], ['snipe'], [[OKA, 'Square\'s clear.']]),
  p('Market Square', 'town', 'nightcity', 'Market square, Tamanrasset', '03:05 LOCAL', [[NAD, 'Second canister is moving. A water truck. Toward the reservoir road.']], ['assault:3-4+t'], [[YUS, 'Water truck went south. Toward the pass.']]),
  p('Water Truck', 'pass', 'night', 'Reservoir road', '03:40 LOCAL', [[DAW, 'Water truck ahead. Don\'t hit the tank.'], [JAKE, 'Noted.']], ['chase'], [[ELE, 'Second canister secured. Still intact. That\'s two.']], { driver: DAW }),
  p('Third Canister', 'port', 'nightcity', 'Port of Oran', '05:10 LOCAL', [R(VAN, 'Last canister was flown to Oran. Port again. Same yard.'), [HOU, 'He really likes boats.']], ['stealth'], [[HOU, 'Container yard\'s clear. The cargo is on the quay.']]),
  p('Container Maze', 'port', 'nightcity', 'Container yard, Oran', '05:30 LOCAL', [[RAM, 'Contacts in the stacks!']], ['assault:0-2+t'], [[NAD, 'The canister is in warehouse seven.']]),
  p('Burning Tanker', 'port', 'dawn', 'Warehouse 7, Oran', '05:55 LOCAL', [[ELE, 'Hold the warehouse while I seal it. It takes three minutes.']], ['assault:3', 'defend:150+t'], [[ELE, 'Sealed. That\'s all three. He has nothing left to bargain with.'], [HOU, 'Then he\'ll run.']], { mortar: 9 }),
  p('The Villa Again', 'villa', 'night', 'Cap Falcon', '21:00 LOCAL', [[NAD, 'Khalid says the Jackal kept a strongroom in the villa. Records. Maps.'], [HOU, 'Quiet this time.']], ['stealth'], [[JAKE, 'At the wall.']]),
  p('Garden of Glass', 'villa', 'night', 'Villa Blanche, Cap Falcon', '21:20 LOCAL', [[OKA, 'They\'ve fortified the garden. Glass everywhere.']], ['assault:0-2+t', 'use:2'], [[ELE, 'Maps. Coordinates. A fortress in the deep south. Qasr Ibn Awa. The palace of the jackal.']], { useText: 'Open the strongroom' }),
  p('Last Light', 'city', 'dawn', 'Algiers', '05:40 LOCAL', [[NAD, 'His last bankers are in Algiers. If we take them, his army stops being paid.']], ['assault:0-2+t'], [[NAD, 'Two bankers down. The third is at the plaza.']]),
  p('Boulevard', 'city', 'day', 'Place des Martyrs, Algiers', '07:10 LOCAL', [[HOU, 'Every gun he still pays is coming for this plaza.']], ['defend:180+t'], [[NAD, 'Accounts frozen. His army has stopped being paid.']], { mortar: 8 }),
  p('Dawn', 'city', 'day', 'Algiers', '08:00 LOCAL', [[VAN, 'Without money, his militias are leaving him. Only the true believers are left. At the fortress.']], ['assault:3-4', 'heli'], [[HOU, 'Qasr Ibn Awa.'], [JAKE, 'Let\'s finish it.']]),
  p('Council of War', 'fob', 'sunset', 'FOB Tessalit', '18:00 LOCAL', [[VAN, 'Qasr Ibn Awa. Mud walls nine metres high. Two hundred fighters. One road in.'], [REY, 'And one man inside it who has to answer for everything.'], [HOU, 'Sarton. You ready?'], [JAKE, 'Yeah. I\'m all good.']], ['use:0', 'use:1'], [[HOU, 'Heh. Liar.']], { loadout: ['m4', 'pistol'], squad: [HOU] }),
]);
SP.PARTS9.endTitle = 'Qasr Ibn Awa'; SP.PARTS9.endText = 'All three canisters are safe and the Jackal\'s money is gone. What is left of his army waits at Qasr Ibn Awa, the palace of the jackal. Chapter X ends it.';
})();

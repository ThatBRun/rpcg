/* Survival Protocol 1.0 — map kits for the existing maps + the part generator used by chapters 6–X */
'use strict';
(function () {
const { V3, rand } = SP; const G = SP.G;
const K = SP.MAPKIT = SP.MAPKIT || {};
const cx = z => Math.sin(z / 110) * 28;

K.desert = {
  start: [1.5, 30, 0],
  stops: [{ at: [-2, -40], area: [-25, 25, -90, -70] }, { at: [3, -100], area: [-30, 30, -170, -150] }, { at: [0, -118], area: [-40, 40, -230, -200], cover: [[-12, -150], [14, -156]] }, { at: [6, -205], area: [-30, 30, -265, -245] }],
  defend: { at: [0, -118], spawns: [[-30, 30, -200, -180], [-50, -30, -170, -140], [30, 50, -170, -140], [-30, 30, -230, -205]] },
  stealth: { start: [0, -112, 0], guards: [[-10, -140, [[-10, -140], [12, -140]]], [30, -170, [[30, -170], [30, -205]]], [-30, -176], [0, -200, [[0, -200], [-16, -206]]], [16, -236], [-30, -245, [[-30, -245], [-10, -250]]]], go: [8, -268] },
  lz: [0, -100], use: [[-6, -182, 'Search the house'], [6, -216, 'Search the stash house'], [-5, -42, 'Open the supply drop']],
  tech: [[0, -320], [0, -230], [2, -180]],
};
K.town = {
  start: [-64, -42, Math.PI],
  stops: [{ at: [-60, -60], area: [-84, -40, -100, -84] }, { at: [-36, -60], area: [-20, -4, -70, -50] }, { at: [-12, -60], area: [2, 22, -76, -46] }, { at: [12, -60], area: [28, 50, -90, -76] }, { at: [40, -58], area: [30, 50, -50, -40] }],
  defend: { at: [40, -66], spawns: [[60, 84, -70, -50], [0, 20, -90, -70], [30, 50, -110, -96], [60, 84, -40, -30]] },
  stealth: { guards: [[-60, -66, [[-60, -66], [-36, -66]]], [-14, -74], [12, -60, [[12, -60], [12, -84]]], [36, -74], [0, -60]], go: [40, -60] },
  get snipe() { return { from: [0, -30, Math.PI, SP.TOWN ? SP.TOWN.roofY : 6.4], targets: [[-14, 18], [16, 20], [2, 28], [-26, 6], [24, 4]] }; },
  use: [[40, -66, 'Signal Yusuf'], [-66, -40, 'Check the stairwell'], [-36, -60, 'Search the burnt car']],
  tech: [[60, -60], [30, -60], [14, -60]],
};
K.pass = {
  get start() { return [cx(250), 250, Math.PI]; },
  stops: [150, 50, -50, -150, -250, -350].map(z => ({ at: [cx(z), z], area: [cx(z - 48) - 13, cx(z - 48) + 13, z - 58, z - 40], cover: [[cx(z - 44) - 6, z - 44], [cx(z - 46) + 6, z - 46]] })),
  defend: { at: [cx(-150), -150], spawns: [[cx(-200) - 12, cx(-200) + 12, -210, -195], [cx(-100) - 12, cx(-100) + 12, -105, -95]] },
  chase: (() => { const o = []; for (let z = 260; z >= -190; z -= 22) o.push([cx(z), z]); return o; })(),
  get snipe() { const L = SP.PASS && SP.PASS.ledge; return { from: L ? [L.x, L.z, Math.PI / 2, L.y] : [cx(-120) + 25, -120, Math.PI / 2, 11], targets: [[-100, -8], [-110, 6], [-150, -5], [-160, 7], [-175, 0]].map(([z, o]) => [cx(z) + o, z]) }; },
  lz: [cx(-180), -180], use: [[cx(-170) + 3, -170, 'Search the checkpoint'], [cx(-188) + 2, -188, 'Search the wreck']],
  tech: [[cx(-300), -300], [cx(-220), -220], [cx(-190), -190]],
};
K.port = {
  start: [-100, 60, 0],
  stops: [{ at: [-80, -35], area: [-50, -20, -32, 0] }, { at: [-30, -36], area: [-20, 10, -30, 10] }, { at: [30, -36], area: [20, 40, -30, -20] }, { at: [60, 10], area: [42, 78, 36, 40], cover: [[52, 24], [66, 22], [72, 30]] }],
  defend: { at: [60, 22], spawns: [[40, 80, -30, -10], [20, 40, 0, 30], [40, 80, 50, 70], [80, 110, 0, 30]] },
  stealth: { guards: [[-96, 12, [[-96, 12], [-96, -20]]], [-80, -7, [[-80, -7], [-112, -7]]], [-64, 20, [[-64, 20], [-64, -20]]], [-48, -21, [[-48, -21], [-104, -21]]], [-72, 0], [-88, 36, [[-88, 36], [-50, 36]]]], go: [-80, -36] },
  lz: [0, 25], use: [[71, 34, 'Rig the cargo'], [-10, 49, 'Search the harbour office'], [-30, -36, 'Check the crane controls']],
  tech: [[110, -34], [30, -34], [0, -34]],
};
K.villa = {
  start: [0, 130, 0],
  stops: [{ at: [0, 60], area: [-30, 30, 10, 26], cover: [[-6, 36], [6, 36], [-20, 30], [20, 30]] }, { at: [0, 30], area: [-40, -28, -30, -10], cover: [[-14, 20], [14, 22]] }, { at: [0, -1], area: [-12, 12, -18, -10], cover: [[-8, -14], [8, -12]] }],
  defend: { at: [0, 4], spawns: [[-20, 20, 50, 70], [-48, -40, -30, 30], [40, 48, -30, 30], [-20, 20, 50, 80]] },
  stealth: { guards: [[-8, 100, [[-12, 100], [12, 100]]], [-24, 80], [22, 84], [0, 70, [[0, 70], [-16, 62]]], [14, 56, [[14, 56], [-14, 56]]]], go: [-14, 48] },
  lz: [20, -30], use: [[0, -3, 'Breach the front door'], [31, -25, 'Search the helicopter'], [-34, -14, 'Search the garage']],
  tech: [[0, 160], [0, 70], [0, 50]],
};
K.prison = {
  start: [0, 150, 0], onLoad: W => SP.prisonOpenGate && SP.prisonOpenGate(W),
  stops: [{ at: [0, 96], area: [-20, 20, 66, 80] }, { at: [0, 50], area: [-30, 30, 10, 36] }, { at: [34, 22], area: [55, 70, 45, 55], cover: [[40, 38], [50, 38]] }, { at: [0, -12], area: [-20, 20, -24, -14] }],
  defend: { at: [0, 10], spawns: [[-10, 10, 32, 48], [-60, -40, 20, 50], [30, 60, 20, 50], [-20, 20, 30, 50]] },
  stealth: { guards: [[-30, 70, [[-30, 70], [30, 70]]], [30, 76, [[30, 76], [-20, 76]]], [-55, 80], [55, 82], [0, 90, [[0, 90], [14, 100]]]], go: [0, 66] },
  snipe: { from: [0, 192, 0], targets: [[-70, 58, 7.4], [70, 58, 7.4], [-10, 72], [10, 74], [0, 80]] },
  lz: [0, 120], use: [[24, -32, 'Open Block C'], [55, 41, 'Hotwire the truck'], [0, 40, 'Search the warden\'s office']],
};
K.fob = {
  start: [-8, 4, Math.PI],
  defend: { at: [0, 30], spawns: [[-12, 12, 56, 72], [-12, 12, 62, 80]] },
  use: [[0, -20.5, 'Study the map table'], [23, 14, 'Restock ammunition'], [40, -35, 'Check the signal locker']],
  lz: [26, 2], stops: [{ at: [0, 30], area: [-12, 12, 56, 72] }],
};
K.base = {
  start: [0, -62, Math.PI],
  stops: [{ at: [20, -50], area: [30, 60, -30, -10] }, { at: [0, -30], area: [-60, -40, -50, -20] }, { at: [30, 10], area: [30, 60, 10, 40] }],
  defend: { at: [26, -50], spawns: [[30, 60, 10, 40], [-60, -40, -40, 40], [30, 70, -30, 0], [-30, 30, 10, 60]] },
  use: [[26, -49, 'Mount the relay'], [0, -6, 'Search the hangar']], lz: [0, -40],
};

/* prison gate (also used by chapter 4) */
SP.prisonOpenGate = function (W) { const P = SP.PRISON; if (!P || !P.gateCols || P.opened === W) return; P.opened = W; P.gateCols.forEach(c => { const i = W.colliders.indexOf(c); if (i >= 0) W.colliders.splice(i, 1); }); P.gatePanels[0].position.x = -6; P.gatePanels[1].position.x = 6; };

/* ======================== part generator ======================== */
const at = (x, z, y) => V3(x, y != null ? y : SP.W.heightAt(x, z), z);
const DEFAULT_SQUAD = ['SGT. HOUSER', 'CPL. RAMIREZ', 'PVT. DAWSON', 'OKAFOR'];
function spawnsOf(k, i, n, stop, opts) {
  const w = { n, area: stop.area, goal: stop.at, cover: (stop.cover || []).slice(0, Math.max(0, Math.min(3, n - 2))) };
  if (opts.tech && k.tech) w.tech = [k.tech];
  return w;
}
// beat strings: 'assault:0-2', 'go:1', 'fight:1', 'defend:120', 'stealth', 'snipe', 'chase', 'use:0', 'heli', 'tech' suffix '+t'
SP.genPart = function (d, chN, idx) {
  const k = SP.MAPKIT[d.map]; if (!k) throw new Error('no kit ' + d.map);
  const lvl = Math.min(1.6, 0.9 + chN * 0.06 + idx * 0.004);
  const stages = [];
  const say = lines => lines && lines.length && stages.push({ say: lines.map(l => [l[0], l[1], l[2] || Math.max(1.8, l[1].length / 16), l[3]]) });
  say(d.intro);
  let first = null;
  for (const b of d.beats) {
    if (typeof b !== 'string') { if (Array.isArray(b)) say(b); else stages.push(b); continue; }
    const tech = b.endsWith('+t'); const [kind, arg] = b.replace('+t', '').split(':');
    if (!first) first = kind;
    if (kind === 'assault' || kind === 'go' || kind === 'fight') {
      let a = 0, z = 0; if (arg) { const p = arg.split('-'); a = +p[0]; z = p[1] != null ? +p[1] : a; } else z = k.stops.length - 1;
      for (let i = a; i <= z; i++) { const st = k.stops[i]; if (!st) continue;
        if (kind !== 'fight') stages.push({ go: st.at, obj: d.goObj || 'Push forward', label: 'MOVE', r: 6 });
        if (kind !== 'go') { const n = Math.round((4 + (i - a)) * lvl); const waves = [spawnsOf(k, i, n, st, { tech: tech && i === z })]; if (lvl > 1.15 && i === z) waves.push(Object.assign(spawnsOf(k, i, Math.round(3 * lvl), st, {}), { say: ['SGT. HOUSER', 'More of them!', 1.4] })); stages.push({ fight: waves, obj: d.fightObj || 'Clear the area' }); }
      }
    } else if (kind === 'defend') {
      const secs = +(arg || 90); const D = k.defend; stages.push({ go: D.at, obj: 'Get to the defensive position', label: 'HOLD', r: 7 });
      const waves = []; const nW = Math.max(3, Math.round(secs / 25)); for (let i = 0; i < nW; i++) waves.push({ t: 2 + i * (secs - 15) / nW, n: Math.round((4 + (i % 3)) * lvl), area: D.spawns[i % D.spawns.length], goal: D.at, tech: (tech && i === nW - 1 && k.tech) ? [k.tech] : undefined });
      stages.push({ defend: { secs, label: d.defendLabel || 'HOLD', waves, mortar: d.mortar, clear: true }, obj: d.defendObj || 'Hold the position' });
    } else if (kind === 'stealth') {
      const S = k.stealth; stages.push({ stealth: { guards: S.guards, go: S.go, r: 6, sight: 30, alarmWave: { n: Math.round(5 * lvl), area: (k.stops[1] || k.stops[0]).area, goal: S.go } }, obj: d.stealthObj || 'Move through unseen' });
    } else if (kind === 'snipe') { stages.push({ snipe: k.snipe.targets, obj: d.snipeObj || 'Take them out from range' }); }
    else if (kind === 'chase') { const spawns = []; for (let i = 0; i < 6 + Math.round(chN / 2); i++) spawns.push({ t: 3 + i * 8, side: i % 2 ? -5 : 5, kind: i % 3 === 1 ? 'buggy' : 'tech' }); stages.push({ chase: { path: k.chase, speed: 17, driver: d.driver || 'PVT. DAWSON', spawns }, obj: d.chaseObj || 'Keep them off the vehicle' }); }
    else if (kind === 'use') { const u = k.use[+arg || 0]; stages.push({ use: [u[0], u[1], u[3]], text: d.useText || u[2], hold: 2.5, obj: d.useObj || u[2], label: 'INTERACT' }); }
    else if (kind === 'heli') { stages.push({ heli: { at: k.lz }, obj: 'Get to the helicopter' }); }
    else if (kind === 'wait') stages.push({ wait: +(arg || 2) });
  }
  say(d.outro);
  const playerFn = () => d.player || (first === 'snipe' && k.snipe ? k.snipe.from : first === 'stealth' && k.stealth && k.stealth.start ? k.stealth.start : k.start);
  const loadout = d.loadout || (first === 'snipe' ? ['dmr', 'm4', 'pistol'] : first === 'stealth' ? ['sup', 'pistol'] : ['m4', 'at4', 'pistol']);
  const squad = d.squad || (first === 'snipe' || first === 'stealth' ? ['SGT. HOUSER'] : first === 'chase' ? [] : DEFAULT_SQUAD);
  const def = {
    name: d.name, act: d.act, map: d.map, env: d.env, envOver: d.envOver, place: d.place, time: d.time, loadout, squad, squadFixed: first === 'snipe', follow: first !== 'chase' && d.follow !== false,
    npcs: d.npcs, deathTip: d.tip, flash: d.flash, civilians: d.civilians,
    setup(c, W, P) { if (k.onLoad) k.onLoad(W); if (d.gate && SP.fortOpenGate) SP.fortOpenGate(W); if (d.setup) d.setup(c, W, P); },
    stages,
  }; Object.defineProperty(def, 'player', { get: playerFn });
  const part = SP.mission(def); part.gen = true; part.boss = d.boss; return part;
};
SP.genChapter = function (chN, act, defs) { const arr = defs.map((d, i) => SP.genPart(Object.assign({ act }, d), chN, i)); return arr; };
})();

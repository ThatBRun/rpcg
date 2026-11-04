/* Survival Protocol — stage-based mission builder used by chapters 3–5 */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp, lerp, damp } = SP;
const G = SP.G, A = SP.Audio, I = SP.Input;
const { followPlayer, toCover, corpse } = SP.partsUtil;
const at = (x, z, y) => V3(x, y != null ? y : SP.W.heightAt(x, z), z);
const P3 = a => Array.isArray(a) ? at(a[0], a[1], a[2]) : a;
SP.LOOKS = {
  elena: { weapon: 'none', faction: 'civ', head: 'hair', hairColor: 0x3a2416, skin: 0xd8b294, top: 0x7d8a96, pants: 0x3a3f4a, seed: 123 },
  kessler: { faction: 'us', head: 'cap', skin: 0xd8ad8e, seed: 777, weapon: 'pistol' },
  houserPrisoner: { faction: 'civ', head: 'bare', beard: true, skin: 0xc79a7a, top: 0x6a6052, pants: 0x4a4438, seed: 11, weapon: 'none' },
  jackal: { faction: 'foe', head: 'bare', beard: true, skin: 0xa77a58, top: 0x1c1c1e, pants: 0x1c1c1e, seed: 999, weapon: 'pistol' },
  yusuf: { faction: 'civ', head: 'bare', top: 0x3d5a2a, pants: 0x2a2a2a, seed: 505, weapon: 'none' },
  reyes: { head: 'cap', skin: 0xa8775a, seed: 202 },
};
function npc(c, name, pos, lookKey, o = {}) {
  const look = Object.assign({}, SP.LOOKS[lookKey] || {}, o.look || {}); const team = o.team || (look.faction === 'us' ? 'ally' : look.faction === 'foe' ? 'foe' : 'civ');
  const u = new SP.Unit(Object.assign({ team, name, pos, weapon: look.weapon || 'none', look, invuln: true, hp: 999 }, o)); c.squad[name] = u; return u;
}
SP.npc = npc;
function countLabel(label, list) { let last = -1; return () => { const n = list.filter(u => !u.dead).length; if (n !== last) { last = n; G.hud.objective(label + ' (' + n + ' left)'); } }; }
function spawnWave(c, w) {
  const out = [];
  (w.cover || []).forEach(([x, z, y]) => { const p = at(x, z, y); const u = c.foe({ pos: p.clone(), cover: p.clone(), peek: p.clone(), crouchCover: true, behavior: 'cover', alert: 1, acc: w.acc || 0.85, weapon: w.weapon }); u.inCover = true; if (y != null) u.fixedY = true; out.push(u); });
  for (let i = 0; i < (w.n || 0); i++) {
    const a = w.area; const x = rand(a[0], a[1]), z = rand(a[2], a[3]); const u = c.foe({ pos: at(x, z, a[4]), alert: 1, behavior: 'assault', acc: w.acc || 0.8, weapon: w.weapon || (Math.random() < 0.12 ? 'shotgun' : 'ak') });
    const g = w.goal ? P3(w.goal) : SP.P.pos.clone(); u.goal2 = w.goal ? g.add(V3(rand(-6, 6), 0, rand(-6, 6))) : null; u.stopDist = w.stop || rand(10, 22); if (a[4] != null) u.fixedY = true; out.push(u);
  }
  (w.tech || []).forEach(pts => out.push(...techVehicle(c, pts)));
  return out;
}
function techVehicle(c, pts, o = {}) {
  const m = SP.Models.technical(SP.pick([0xd8d2c4, 0x9a8a6a, 0xb8b0a0])); const v = new SP.Vehicle(m, { team: 'foe', hp: o.hp || 520, speed: o.speed || 12, curve: new T.CatmullRomCurve3(pts.map(p => V3(p[0], 0, p[1]))) }); v.onArrive = vv => { vv.spd = 0; };
  const g = c.foe({ pos: m.position.clone(), alert: 1, behavior: 'hold', acc: 0.85 }); g.fixedY = true; v.gunner = g; (c.techs = c.techs || []).push(v); return [g];
}
SP.techVehicle = techVehicle;
function baseTick(c, P) {
  return dt => {
    if (c.flash) { if (I.hit('KeyT')) { P.flash = !P.flash; A.click(1100, 0.08); } c.fl.intensity = P.flash ? 10 : 0; }
    (c.techs || []).forEach(v => { if (!v.dead && v.gunner && !v.gunner.dead) { v.gunner.pos.copy(v.mesh.localToWorld(V3(0, 1.3, 1.6))); } });
    if (c.extraTick) c.extraTick(dt);
  };
}
function setTick(c, fn) { const b = c.base; SP.onTick = dt => { b(dt); fn && fn(dt); }; }
function interact(o) { return new Promise(res => G.addInteract(Object.assign({ radius: 2.6 }, o, { onUse: res }))); }
function heliModel(W, p, yaw, h) { const m = SP.Models.heli(); m.position.set(p.x, p.y + h, p.z); m.rotation.y = yaw || 0; W.scene.add(m); return m; }

/* ---------------- stages ---------------- */
const STAGES = {
  async say(s, c) { for (const l of s.say) await c.say(l[0], l[1], l[2], l[3]); },
  async wait(s, c) { await c.wait(s.wait); },
  async feed(s) { G.hud.feed(s.feed, 'gold'); },
  async fade(s, c) { await c.fade(s.fade, s.secs || 1.2); },
  async alarm(s) { A.alarm(!!s.alarm); },
  async go(s, c, W, P) { const p = typeof s.go === 'function' ? s.go : P3(s.go); c.obj(s.obj || 'Move up', p, s.label || ''); const r = s.r || 5; await c.until(() => { const q = typeof p === 'function' ? p() : p; return Math.hypot(P.pos.x - q.x, P.pos.z - q.z) < r || (s.orIf && s.orIf(P)); }); if (s.then) for (const l of s.then) await c.say(l[0], l[1], l[2], l[3]); },
  async use(s, c, W, P) { const p = typeof s.use === 'function' ? s.use() : P3(s.use); c.obj(s.obj || s.text, p, s.label || 'USE'); await interact({ pos: p, text: s.text, hold: s.hold || 0, radius: s.radius || 2.6 }); if (s.feedText) G.hud.feed(s.feedText, 'gold'); if (s.after) await s.after(c, W, P); },
  async fight(s, c, W, P) {
    const all = []; const label = s.obj || 'Clear the area';
    for (let i = 0; i < s.fight.length; i++) {
      const w = s.fight[i]; if (w.say) c.say(w.say[0], w.say[1], w.say[2], w.say[3]).catch(() => { });
      const got = spawnWave(c, w); all.push(...got); setTick(c, countLabel(label, all));
      if (i < s.fight.length - 1) await c.until(() => all.filter(u => !u.dead).length <= (w.next != null ? w.next : 2), w.maxT || 240);
    }
    await c.until(() => all.every(u => u.dead)); setTick(c);
    (c.techs || []).forEach(v => { if (!v.dead && v.gunner && v.gunner.dead) v.spd = 0; });
  },
  async defend(s, c, W, P) {
    const d = s.defend; let left = d.secs; const all = []; let wi = 0; const waves = d.waves.slice().sort((a, b) => a.t - b.t);
    c.obj(s.obj || 'Hold out'); const lbl = d.label || 'HOLD';
    setTick(c, dt => { left -= dt; const sec = Math.max(0, Math.ceil(left)); G.hud.timer(lbl + '  ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')); while (wi < waves.length && d.secs - left >= waves[wi].t) { const w = waves[wi++]; if (w.say) c.say(w.say[0], w.say[1], w.say[2], w.say[3]).catch(() => { }); all.push(...spawnWave(c, w)); } if (d.mortar && Math.random() < dt / d.mortar) { const t = P.pos.clone().add(V3(rand(-16, 16), 0, rand(-16, 16))); if (t.distanceTo(P.pos) < 6) t.x += 8; t.y = W.heightAt(t.x, t.z); G.mortar(t, 1.5); } if (d.tick) d.tick(dt, left); });
    await c.until(() => left <= 0); G.hud.timer(null); setTick(c);
    if (d.clear) await c.until(() => all.every(u => u.dead));
  },
  async tail(s, c, W, P) {
    const d = s.tail, k = c.squad[d.npc]; k.walkSpeed = d.speed || 1.35; let i = 0, sus = 0, lost = 0, done = false; const min = d.min || 8, max = d.max || 40;
    c.obj(s.obj || 'Follow without being seen', () => k.pos, d.label || 'TARGET');
    (async () => { while (i < d.route.length) { await k.moveTo(P3(d.route[i]), !!d.run); i++; if (d.pauses && d.pauses.includes(i)) await c.wait(rand(2.5, 4.5)); } done = true; })().catch(() => { });
    setTick(c, dt => { const dd = Math.hypot(P.pos.x - k.pos.x, P.pos.z - k.pos.z); if (dd < min && !SP.autoTest) sus += dt * (P.sprinting ? 0.6 : 0.3); else sus = Math.max(0, sus - dt * 0.08); if (dd > max && !SP.autoTest) lost += dt; else lost = Math.max(0, lost - dt * 2);
      const b = Math.round(sus * 5); G.hud.timer(dd > max ? 'LOSING THEM  ' + Math.max(0, 15 - lost).toFixed(0) : 'SUSPICION  ' + '▮'.repeat(b) + '▯'.repeat(5 - b));
      if (sus >= 1) { G.hud.timer(null); SP.fail(d.spotted || 'You were spotted.'); } if (lost > 15) { G.hud.timer(null); SP.fail(d.lostMsg || 'You lost them.'); } });
    if (d.lines) (async () => { for (const l of d.lines) { await c.until(() => i >= l[0]); await c.say(l[1], l[2], l[3], l[4]); } })().catch(() => { });
    await c.until(() => done); G.hud.timer(null); setTick(c);
  },
  async stealth(s, c, W, P) {
    const d = s.stealth; const guards = d.guards.map(g => { const u = c.foe({ pos: at(g[0], g[1], g[3]), behavior: g[2] && g[2].length ? 'patrol' : 'hold', alert: 0, sight: d.sight || 35, weapon: 'ak' }); u.aware = false; if (g[2] && g[2].length) u.path = g[2].map(P3); else u.lookAt = P3(g[4] || [g[0], g[1] + 20]); if (g[3] != null) u.fixedY = true; return u; });
    let loud = false; SP.onAlert = () => { if (loud) return; loud = true; guards.forEach(u => { u.aware = true; u.alert = 1; if (u.behavior === 'patrol') u.behavior = 'assault'; }); A.alarm(true); setTimeout(() => A.alarm(false), 7000); G.hud.feed('YOU HAVE BEEN SPOTTED', 'red'); if (d.alarmWave) spawnWave(c, d.alarmWave).forEach(u => guards.push(u)); };
    const p = P3(d.go); c.obj(s.obj || 'Get through unseen', p, d.label || '');
    await c.until(() => Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < (d.r || 5) && (!d.clear || guards.every(u => u.dead)));
    if (d.mustClear || loud) await c.until(() => guards.every(u => u.dead || u.pos.distanceTo(P.pos) > 70));
    SP.onAlert = null; c.wentLoud = loud;
  },
  async snipe(s, c, W, P) {
    const foes = s.snipe.map(([x, z, y]) => { const u = c.foe({ pos: at(x, z, y), behavior: 'hold', alert: 1, acc: 1.4, sight: 170 }); u.crouch = true; if (y != null) u.fixedY = true; return u; });
    const gl = foes.map(u => { const sp = new T.Sprite(new T.SpriteMaterial({ color: new T.Color(14, 12, 9), transparent: true, blending: T.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(0.6); G.scene.add(sp); return { u, sp }; });
    const cnt = countLabel(s.obj || 'Kill the snipers', foes);
    setTick(c, () => { gl.forEach(g => { g.sp.visible = !g.u.dead && Math.sin(G.time * 3 + g.u.id) > 0.6; g.sp.position.copy(g.u.pos).add(V3(0, 1.2, 0)); }); cnt(); });
    await c.until(() => foes.every(u => u.dead)); gl.forEach(g => G.scene.remove(g.sp)); setTick(c);
  },
  async choice(s, c) {
    const d = s.choice; const el = document.getElementById('choices'); el.querySelector('#ch1 span').textContent = d.a; el.querySelector('#ch2 span').textContent = d.b; el.hidden = false;
    const n = await new Promise(res => { const pick = k => { el.hidden = true; SP.onChoice = null; A.click(700, 0.1); res(k); }; SP.onChoice = pick; document.getElementById('ch1').onclick = () => pick(1); document.getElementById('ch2').onclick = () => pick(2); });
    if (d.key) { SP.save[d.key] = n; SP.persist(); } const lines = n === 1 ? d.ra : d.rb; for (const l of lines || []) await c.say(l[0], l[1], l[2], l[3]);
  },
  async cut(s, c, W, P) { const prev = P.mode; P.mode = 'locked'; c.letterbox(true); if (s.look) P.camAnim = { yaw: s.look[0], pitch: s.look[1] || 0, k: 1.5 }; for (const l of s.cut) await c.say(l[0], l[1], l[2], l[3]); P.camAnim = null; c.letterbox(false); P.mode = prev === 'locked' ? 'walk' : prev; },
  async chase(s, c, W, P) {
    const d = s.chase; const curve = new T.CatmullRomCurve3(d.path.map(p => V3(p[0], 0, p[1]))); const len = curve.getLength();
    const bug = SP.Models.buggy(0x6b5a3e); const veh = new SP.Vehicle(bug, { team: 'ally', hp: 1e9, speed: 0, curve }); veh.update(0);
    const gun = SP.Models.fiftyCal(); gun.position.set(0, 2.25, 0.5); bug.add(gun); const anchor = new T.Object3D(); anchor.position.set(0, 2.35, 1.15); bug.add(anchor);
    const keepW = P.cur; P.mode = 'turret'; P.turret = { anchor, rpm: 520, dmg: 80, vehDmg: 45, sound: 'fifty', muzzleWorld: () => { gun.updateMatrixWorld(true); return gun.localToWorld(gun.userData.muzzle.clone()); } }; P.turretName = 'M2 .50 CAL'; P.eye = 0; SP.buildTurretVM(); P.updAmmo();
    const drv = c.ally(d.driver || 'PVT. DAWSON', { pos: V3(), stance: 'sit' }); drv.fixedY = true; drv.holdFire = true;
    A.loop('eng', 'engine', 0.16); veh.spd = d.speed || 17; c.obj(s.obj || 'Stop the vehicles chasing you');
    const enemies = []; let t = 0, si = 0; const spawns = (d.spawns || []).slice().sort((a, b) => a.t - b.t);
    const chaser = (side, lag, kind) => { const pts = d.path.map((p, i) => { const tg = curve.getTangentAt(Math.min(1, i / (d.path.length - 1))); const n = V3(-tg.z, 0, tg.x).normalize(); return V3(p[0] + n.x * side, 0, p[1] + n.z * side); }); const cv = new T.CatmullRomCurve3(pts); const mesh = kind === 'tech' ? SP.Models.technical(SP.pick([0xd8d2c4, 0x9a8a6a])) : SP.Models.buggy(0x3e3428); const v = new SP.Vehicle(mesh, { team: 'foe', hp: kind === 'tech' ? 320 : 200, speed: 0, curve: cv, u: Math.max(0, veh.u - lag) }); const g = c.foe({ pos: mesh.position.clone(), alert: 1, behavior: 'hold', acc: 0.75 }); g.fixedY = true; v.gunner = g; enemies.push(v); };
    setTick(c, dt => { t += dt; while (si < spawns.length && t >= spawns[si].t) { const sp = spawns[si++]; chaser(sp.side, sp.lag || 0.04, sp.kind || 'tech'); if (sp.say) c.say(sp.say[0], sp.say[1], 2.6, sp.say[2]).catch(() => { }); }
      drv.pos.copy(bug.localToWorld(V3(-0.4, 0.55, 0.15))); drv.yaw = bug.rotation.y; G.trauma = Math.max(G.trauma, 0.1 + Math.abs(bug.rotation.x) * 0.4);
      for (const v of enemies) { if (v.dead) continue; if (v.u < veh.u - 12 / len) v.spd = (d.speed || 17) + 5; else if (v.u > veh.u + 10 / len) v.spd = (d.speed || 17) - 3; else v.spd = (d.speed || 17) + 0.5; if (v.gunner && !v.gunner.dead) v.gunner.pos.copy(v.mesh.localToWorld(v.mesh.userData.gun ? V3(0, 1.3, 1.6) : V3(0.4, 0.55, 0.15))); }
      if (A.engineOsc) A.engineOsc.frequency.value = 50 + veh.spd * 2.4; });
    await c.until(() => veh.u > 0.985); veh.spd = 0; A.stopLoop('eng');
    enemies.forEach(v => { if (!v.dead) v.destroy(); });
    P.mode = 'walk'; P.eye = 1.62; P.pos.copy(bug.localToWorld(V3(2.5, 0, 0))); P.pos.y = W.heightAt(P.pos.x, P.pos.z); P.turret = null; P.equip(keepW || Object.keys(P.inv)[0]); drv.fixedY = false; drv.stance = null; drv.pos.copy(P.pos).add(V3(1.5, 0, 1.5)); setTick(c);
  },
  async heli(s, c, W, P) {
    const d = s.heli; const p = P3(d.at); const h = heliModel(W, p, d.yaw || 0, 70); A.loop('rotor', 'rotor', 0.5); let rot = 0;
    c.extraTick = dt => { rot += dt * 25; h.userData.rotor.rotation.y = rot; h.userData.tail.rotation.x = rot * 1.6; h.position.y = Math.max(p.y + 0.1, h.position.y - dt * 9); if (h.position.y < p.y + 12 && Math.random() < 0.5) G.particle({ pos: V3(p.x + rand(-9, 9), p.y + 0.4, p.z + rand(-9, 9)), vel: V3(rand(-6, 6), rand(0.5, 2), rand(-6, 6)), life: 2.2, size: 3, grow: 2, color: new T.Color(0.55, 0.45, 0.35), opacity: 0.35 }); };
    c.obj(s.obj || 'Get to the helicopter', () => h.position, 'EXTRACT');
    await c.until(() => h.position.y < p.y + 1 && Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < 8); c.heliMesh = h;
  },
  async fn(s, c, W, P) { await s.fn(c, W, P); },
};

SP.mission = function (def) {
  return {
    name: def.name, act: def.act, map: def.map, env: def.env, envOver: def.envOver, place: def.place, time: def.time, loadout: def.loadout || ['m4', 'pistol'], deathTip: def.deathTip,
    setup(c, W, P) {
      const p = def.player || [0, 0, 0]; P.pos.copy(at(p[0], p[1], p[3])); P.yaw = p[2] || 0;
      if (def.ammo) Object.entries(def.ammo).forEach(([k, v]) => { if (P.inv[k]) P.inv[k].res = v; });
      (def.squad || []).forEach((n, i) => { const off = V3((i % 2 ? 1.7 : -1.7), 0, 2.4 + Math.floor(i / 2) * 2).applyAxisAngle(V3(0, 1, 0), P.yaw); const look = n === 'CPT. REYES' ? { look: SP.LOOKS.reyes } : {}; const u = c.ally(n, Object.assign({ pos: at(P.pos.x + off.x, P.pos.z + off.z, p[3] != null ? p[3] : undefined) }, look)); if (p[3] != null) u.fixedY = !!def.squadFixed; });
      if (def.follow !== false) followPlayer(c, def.squad || []);
      (def.npcs || []).forEach(n => { const u = npc(c, n.name, at(n.pos[0], n.pos[1], n.pos[2]), n.look, n.o || {}); if (n.follow) { u.behavior = 'follow'; u.follow = 'player'; u.offset = V3(n.off || 1, 0, 2.6); u.runSpeed = 5.5; } if (n.stance) u.stance = n.stance; if (n.hands) u.hands = n.hands; if (n.lookAt) u.lookAt = P3(n.lookAt); if (n.fixedY) u.fixedY = true; });
      if (def.flash) { const fl = new T.SpotLight(0xfff1d8, 10, 34, 0.45, 0.55, 2); fl.castShadow = true; fl.shadow.mapSize.set(512, 512); fl.shadow.bias = -0.002; SP.camera.add(fl); fl.position.set(0.25, -0.2, 0); fl.target.position.set(0, -0.2, -5); SP.camera.add(fl.target); c.fl = fl; c.flash = true; P.flash = true; }
      (def.civilians || []).forEach(([cx, cz, r, n]) => { for (let i = 0; i < n; i++) { const p2 = at(cx + rand(-r, r), cz + rand(-r, r)); SP.civilian(p2, p2, r * 0.6); } });
      (def.corpses || []).forEach(([x, z, us]) => corpse(c, at(x, z), us ? { faction: 'us' } : undefined));
      if (def.setup) def.setup(c, W, P);
    },
    async run(c, W, P) {
      (def.loops || [['wind', 'wind', 0.05]]).forEach(l => A.loop(l[0], l[1], l[2]));
      c.base = baseTick(c, P); setTick(c);
      for (const s of def.stages) { const k = Object.keys(STAGES).find(key => s[key] !== undefined); if (!k) continue; await STAGES[k](s, c, W, P); if (s.obj === undefined && k !== 'go' && k !== 'use') { } }
      G.hud.objective(null); c.complete();
    },
  };
};
})();

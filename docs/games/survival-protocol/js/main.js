/* Survival Protocol — boot, loop, part runner, menus */
'use strict';
(function () {
const T = THREE, { V3, rand, clamp, damp, lerp } = SP;
const G = SP.G, A = SP.Audio, I = SP.Input;
const $ = s => document.querySelector(s);

/* ---------- save ---------- */
const SAVE_KEY = 'survival_protocol_ch1';
SP.save = { done: [], dk: [], choice: 0, choice2: 0, last: 1, lastCh: 1 };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) Object.assign(SP.save, s); } catch (e) { }
if (!SP.save.dk) SP.save.dk = []; (SP.save.done || []).forEach(n => { if (!SP.save.dk.includes('1-' + n)) SP.save.dk.push('1-' + n); });
SP.isDone = (ch, n) => SP.save.dk.includes(ch + '-' + n);
SP.persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SP.save)); } catch (e) { } };
SP.settings = { sens: 1, quality: 'high', difficulty: 'normal', platform: null };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY + '_set') || 'null'); if (s) Object.assign(SP.settings, s); } catch (e) { }
function applySettings() {
  SP.sens = SP.settings.sens; SP.difficulty = { easy: 0.6, normal: 1, hard: 1.45 }[SP.settings.difficulty] || 1;
  const q = SP.settings.quality; SP.post.scale = q === 'high' ? 1 : q === 'medium' ? 0.8 : 0.62; SP.shadowRes = q === 'low' ? 1024 : q === 'high' ? 4096 : 2048;
  SP.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q === 'high' ? 1.5 : 1)); resize();
  try { localStorage.setItem(SAVE_KEY + '_set', JSON.stringify(SP.settings)); } catch (e) { }
}

/* ---------- renderer ---------- */
const canvas = $('#game');
const renderer = SP.renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = T.NoToneMapping; renderer.outputEncoding = T.LinearEncoding; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
SP.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
SP.post = new SP.Post(renderer);
const camera = SP.camera = new T.PerspectiveCamera(74, 1, 0.05, 4000); camera.rotation.order = 'YXZ';
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); const pr = renderer.getPixelRatio(); SP.post.setSize(w * pr, h * pr); }
addEventListener('resize', resize);
I.init(canvas);

/* ---------- part runner ---------- */
const ABORT = { abort: true };
let ctx = null, paused = true, running = false, curPart = 0, curCh = 1;
SP.CHAPTERS = [
  { n: 1, name: 'The Forgotten Base', parts: SP.PARTS },
  { n: 2, name: "The Jackal's Road", parts: SP.PARTS2 || [] },
  { n: 3, name: 'The Leak', parts: SP.PARTS3 || [] }, { n: 4, name: 'Iron Desert', parts: SP.PARTS4 || [] }, { n: 5, name: 'The Jackal', parts: SP.PARTS5 || [] }];
SP.PARTS.endTitle = 'Houser is still out there'; SP.PARTS.endText = 'The laptop, the manifests and Elena Moreau made it out. Sgt. Houser did not. Chapter 2 starts with getting him back.';
const chParts = ch => (SP.CHAPTERS[ch - 1] && SP.CHAPTERS[ch - 1].parts) || [];
SP.state = 'menu';
function teardown() {
  if (ctx) { ctx.dead = true; ctx.timers.forEach(t => t.rej(ABORT)); ctx.timers = []; ctx.untils.forEach(u => u.rej(ABORT)); ctx.untils = []; }
  if (SP.Wheel) SP.Wheel.close(false); A.stopAll(); G.clearMarkers(); G.hud.hideSub(); G.hud.prompt(null); G.hud.timer(null); G.hud.objective(null);
  if (SP.scene) { const keep = new Set(Object.values(SP.GC)); SP.scene.traverse(o => { if ((o.isMesh || o.isLine) && o.geometry && !keep.has(o.geometry)) o.geometry.dispose(); }); }
  G.units = []; G.vehicles = []; G.fx = []; G.interact = []; G.destructibles = []; G.projectiles = []; G.fires = []; G.tracers = []; G.lights = []; G.lightPool = []; G.trauma = 0;
  camera.children.slice().forEach(ch => camera.remove(ch)); SP.alarmOn = false; SP.aggro = 1;
  SP.fireLights = []; SP.labLights = null; SP.alarmLights = null; SP.cabin = null; SP.envRT && SP.envRT.dispose();
  ['onAlert', 'onUnitDeath', 'onTick'].forEach(k => SP[k] = null);
  SP.post.U.letterbox.value = 0; SP.post.U.blur.value = 0; SP.post.U.flash.value = 0; SP.post.U.damage.value = 0;
  $('#binoc').hidden = true; $('#boss').hidden = true; $('#lockoverlay').hidden = true; $('#fname').hidden = true;
}
function makeCtx(part) {
  const c = { part, dead: false, timers: [], untils: [], squad: {}, foes: [] };
  c.wait = s => new Promise((res, rej) => c.timers.push({ t: s, res, rej }));
  c.until = (fn, timeout) => new Promise((res, rej) => c.untils.push({ fn, res, rej, t: timeout || 1e9 }));
  c.say = async (name, text, secs, radio) => { if (c.dead) throw ABORT; G.hud.sub(name, text, radio); await c.wait(secs || Math.max(2.2, text.length * 0.058)); if ($('#sub').textContent.endsWith(text)) G.hud.hideSub(); };
  c.lines = async (arr) => { for (const l of arr) await c.say(l[0], l[1], l[2], l[3]); };
  c.obj = (text, posFn, label) => { G.hud.objective(text); if (c.objMarker) G.removeMarker(c.objMarker); c.objMarker = posFn ? G.marker(typeof posFn === 'function' ? posFn : () => posFn, label || '', 'obj') : null; };
  c.near = (p, r) => c.until(() => { const q = typeof p === 'function' ? p() : p; return Math.hypot(SP.P.pos.x - q.x, SP.P.pos.z - q.z) < r; });
  c.allDead = list => c.until(() => list.every(u => u.dead));
  c.fade = (v, s = 1) => { SP.fadeTarget = v; SP.fadeRate = 1 / Math.max(0.01, s); return c.wait(s); };
  c.letterbox = on => { SP.lbTarget = on ? 1 : 0; };
  c.blur = v => { SP.blurTarget = v; };
  c.foe = (o) => { const u = new SP.Unit(Object.assign({ team: 'foe' }, o)); c.foes.push(u); return u; };
  c.ally = (name, o = {}) => { const look = Object.assign({}, SP.SQUAD_LOOK[name] || {}, o.look || {}); const u = new SP.Unit(Object.assign({ team: 'ally', name, invuln: o.invuln !== false, acc: 0.7 }, o, { look })); c.squad[name] = u; return u; };
  c.complete = () => { if (c.dead) return; c.dead = true; partComplete(part); };
  return c;
}
SP.SQUAD_LOOK = { 'SGT. HOUSER': { head: 'cap', beard: true, skin: 0xc79a7a, seed: 11 }, 'CPL. RAMIREZ': { radio: true, skin: 0xa8775a, seed: 22 }, 'PVT. DAWSON': { skin: 0xd8ad8e, seed: 33 }, 'OKAFOR': { skin: 0x5c3a28, seed: 44, goggles: false }, 'DOC LEE': { medic: true, skin: 0xc9a07e, seed: 55 }, 'PVT. HALE': { seed: 66 }, 'PVT. BROOKS': { seed: 77, skin: 0x7a5038 }, 'PVT. VEGA': { seed: 88, skin: 0xa8775a }, 'PVT. MITCHELL': { seed: 99 } };
SP.loadPart = async function (n, ch) {
  ch = ch || curCh || 1; teardown(); SP.state = 'loading'; showScreen(null); $('#loading').hidden = false; $('#loadtext').textContent = 'Loading Chapter ' + ch + ' · Part ' + n; $('#touch').hidden = true;
  await new Promise(r => setTimeout(r, 40));
  const part = chParts(ch)[n - 1]; curPart = n; curCh = ch; SP.curCh = ch; SP.save.last = n; SP.save.lastCh = ch; SP.persist();
  const scene = SP.scene = G.scene = new T.Scene(); const W = SP.W = new SP.World(scene);
  G.initLights(scene); const info = SP.Maps[part.map](W, part) || {}; SP.setEnv(scene, part.env || 'dusk', part.envOver || {});
  scene.add(camera);
  const P = SP.P = new SP.Player(); P.pos.copy(info.start || V3()); P.yaw = 0; P.pitch = 0;
  SP.vmScene.remove(...SP.vmScene.children.filter(o => o.isMesh)); if (SP.VM.group) { SP.vmCam.remove(SP.VM.group); SP.VM.group = null; SP.VM.gun = null; }
  SP.Progress.beforeLoad(part); (part.loadout || ['m4']).forEach(w => P.give(w)); if (part.loadout && part.loadout.length === 0) { P.cur = null; G.hud.ammo('', '', ''); }
  SP.Progress.afterLoadout(P, part); if (part.loadout && part.loadout.length === 0) { P.cur = null; G.hud.ammo('', '', ''); }
  ctx = makeCtx(part); SP.ctx = ctx;
  SP.fade = 1; SP.fadeTarget = 0; SP.fadeRate = 0.8; SP.lbTarget = 0; SP.blurTarget = 0;
  if (part.setup) part.setup(ctx, W, P);
  // warm-up render (compile shaders)
  P.update(0.016); SP.VM.update(0.016); renderer.compile(scene, camera); renderer.compile(SP.vmScene, SP.vmCam);
  $('#loading').hidden = true; $('#hud').hidden = false; SP.state = 'play'; running = true;
  A.init();
  if (part.locked !== false && part.needsLock !== false) requestPlay(); else { paused = false; }
  introCard(part, n, ch);
  part.run(ctx, W, P).catch(e => { if (e !== ABORT) console.error(e); });
};
function introCard(part, n, ch) {
  const el = $('#intro'); el.innerHTML = ''; el.hidden = false; const lines = [`CHAPTER ${ch} · PART ${n} · ${part.name.toUpperCase()}`, part.place, part.time, 'Pvt. Jake Sarton · U.S. Army Rangers'];
  lines.forEach((l, i) => { const d = document.createElement('div'); d.className = i === 0 ? 'h' : ''; el.append(d); let k = 0; setTimeout(function ty() { if (k <= l.length) { d.textContent = l.slice(0, k++) + (k <= l.length ? '▌' : ''); if (k % 2 === 0) A.click(2400, 0.015); setTimeout(ty, 28); } }, 600 + i * 900); });
  clearTimeout(SP.introT); SP.introT = setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.hidden = true; el.classList.remove('out'); }, 900); }, 7500);
}
async function partComplete(part) {
  const list = chParts(curCh); const n = list.indexOf(part) + 1; const key = curCh + '-' + n; if (!SP.save.dk.includes(key)) SP.save.dk.push(key); SP.save.done = SP.save.dk.filter(k => k.startsWith('1-')).map(k => +k.split('-')[1]); SP.persist();
  const rewards = SP.Progress.onPartComplete(curCh, n, n >= list.length);
  running = false; SP.fadeTarget = 1; SP.fadeRate = 1; await new Promise(r => setTimeout(r, 1100));
  if (n >= list.length) { const ch = curCh; teardown(); I.unlock(); showEnd(ch, rewards); return; }
  SP.loadPart(n + 1, curCh);
}
SP.onPlayerDeath = function () {
  const P = SP.P; P.mode = 'locked'; SP.blurTarget = 0.6; G.addTrauma(0.6);
  setTimeout(() => { if (SP.state !== 'play') return; running = false; I.unlock(); $('#deadmsg').textContent = chParts(curCh)[curPart - 1].deathTip || 'Use cover. Your health comes back after a few seconds out of fire.'; showScreen('dead'); }, 1600);
};
SP.fail = function (msg) { if (SP.state !== 'play' || !running) return; running = false; paused = true; I.unlock(); $('#deadmsg').textContent = msg; $('#deadtitle').textContent = 'Mission failed'; showScreen('dead'); };

/* ---------- pointer lock / pause ---------- */
function requestPlay() { paused = true; $('#lockoverlay').hidden = false; $('#lockoverlay h2').textContent = SP.Touch.on ? 'Tap to play' : 'Click to play'; }
$('#lockbtn').addEventListener('click', () => { A.init(); if (SP.Touch.on) { I.fallback = true; $('#lockoverlay').hidden = true; paused = false; return; } I.lock(); if (I.fallback) { $('#lockoverlay').hidden = true; paused = false; } });
SP.pauseGame = () => { if (SP.state !== 'play') return; paused = true; showScreen('pause'); };
SP.onLockChange = (locked) => {
  if (locked) { $('#lockoverlay').hidden = true; if (SP.state === 'play') { paused = false; showScreen(null); } }
  else if (SP.state === 'play' && running && !I.fallback) { paused = true; showScreen('pause'); }
};
SP.onLockFail = () => { if (SP.state !== 'play') return; paused = true; showScreen(null); $('#lockoverlay').hidden = false; $('#lockoverlay .lede').textContent = 'Click Play again to lock the mouse. If it does not lock, wait a second and click again.'; };
SP.onKey = (code) => { if (SP.onKeyChoice) SP.onKeyChoice(code); if (code === 'Escape' && SP.state === 'play' && I.fallback) { paused = !paused; showScreen(paused ? 'pause' : null); } if (code === 'KeyP' && SP.state === 'play') { I.unlock(); paused = true; showScreen('pause'); } };
function showScreen(id) { ['title', 'chapters', 'pause', 'dead', 'end', 'settings', 'platform', 'armory'].forEach(s => { $('#' + s).hidden = s !== id; }); if (id) $('#lockoverlay').hidden = true; }
SP.showScreen = showScreen;

/* ---------- menus ---------- */
let viewCh = 1;
function buildChapters(ch) {
  viewCh = ch || viewCh || curCh || 1; const tabs = $('#chaptabs'); tabs.innerHTML = '';
  SP.CHAPTERS.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ctab' + (c.n === viewCh ? ' on' : '') + (c.soon ? ' soon' : ''); b.innerHTML = `<span>CH ${c.n}</span><b></b>`; b.querySelector('b').textContent = c.name; b.addEventListener('click', () => buildChapters(c.n)); tabs.append(b); });
  const C = SP.CHAPTERS[viewCh - 1]; $('#chapname').textContent = 'Chapter ' + C.n + ' · ' + C.name;
  const g = $('#partgrid'); g.innerHTML = '';
  if (C.soon) { const d = document.createElement('p'); d.className = 'lede'; d.textContent = C.count + ' parts. In production. Finish Chapter 2 to see where the story goes next.'; g.append(d); return; }
  C.parts.forEach((p, i) => { const n = i + 1; const b = document.createElement('button'); b.className = 'part' + (SP.isDone(C.n, n) ? ' done' : ''); b.type = 'button'; b.innerHTML = `<span class="pn">${String(n).padStart(2, '0')}</span><span class="pt"></span><span class="pa"></span>`; b.querySelector('.pt').textContent = p.name; b.querySelector('.pa').textContent = p.act; b.addEventListener('click', () => { A.init(); SP.loadPart(n, C.n); }); g.append(b); });
}
function showEnd(ch, rewards) {
  $('#endreward').textContent = (rewards || []).join('   ·   '); $('#endreward').hidden = !(rewards && rewards.length);
  const C = SP.CHAPTERS[ch - 1], next = SP.CHAPTERS[ch];
  $('#endeyebrow').textContent = 'END OF CHAPTER ' + ch; $('#endtitle').textContent = (C.endTitle || C.parts.endTitle) || 'Chapter complete'; $('#endtext').textContent = C.parts.endText || '';
  const go = $('#e-again'); if (next && !next.soon) { go.textContent = 'Continue to Chapter ' + next.n; go.onclick = () => SP.loadPart(1, next.n); } else { go.textContent = 'Play Chapter ' + ch + ' again'; go.onclick = () => SP.loadPart(1, ch); }
  showScreen('end');
}
$('#btn-new').addEventListener('click', () => { A.init(); SP.save.done = []; SP.save.dk = []; SP.persist(); SP.loadPart(1, 1); });
$('#btn-cont').addEventListener('click', () => { A.init(); SP.loadPart(SP.save.last || 1, SP.save.lastCh || 1); });
$('#btn-parts').addEventListener('click', () => { buildChapters(); showScreen('chapters'); });
$('#btn-set').addEventListener('click', () => { SP.setFrom = 'title'; openSettings(); });
$('#chap-back').addEventListener('click', () => showScreen(SP.state === 'play' ? 'pause' : 'title'));
$('#p-resume').addEventListener('click', () => { if (I.fallback) { paused = false; showScreen(null); } else I.lock(); });
$('#p-restart').addEventListener('click', () => SP.loadPart(curPart, curCh));
$('#p-parts').addEventListener('click', () => { buildChapters(curCh); showScreen('chapters'); });
$('#p-set').addEventListener('click', () => { SP.setFrom = 'pause'; openSettings(); });
$('#p-quit').addEventListener('click', () => { teardown(); $('#cross').hidden = true; SP.state = 'menu'; running = false; $('#hud').hidden = true; titleBackdrop(); showScreen('title'); });
$('#d-retry').addEventListener('click', () => { $('#deadtitle').textContent = 'You were killed'; SP.loadPart(curPart, curCh); });
$('#d-parts').addEventListener('click', () => { $('#deadtitle').textContent = 'You were killed'; buildChapters(); showScreen('chapters'); });
$('#e-parts').addEventListener('click', () => { buildChapters(); showScreen('chapters'); });
$('#btn-armory').addEventListener('click', () => SP.Progress.openArmory('title'));
$('#p-armory').addEventListener('click', () => SP.Progress.openArmory('pause'));
$('#e-armory').addEventListener('click', () => SP.Progress.openArmory('end'));
$('#d-armory').addEventListener('click', () => SP.Progress.openArmory('dead'));
function openSettings() { $('#s-sens').value = SP.settings.sens; $('#s-q').value = SP.settings.quality; $('#s-d').value = SP.settings.difficulty; $('#s-p').value = SP.settings.platform || 'pc'; showScreen('settings'); }
$('#s-done').addEventListener('click', () => { SP.settings.sens = +$('#s-sens').value; SP.settings.quality = $('#s-q').value; SP.settings.difficulty = $('#s-d').value; SP.settings.platform = $('#s-p').value; SP.Touch.enable(SP.settings.platform === 'mobile'); applySettings(); showScreen(SP.setFrom === 'pause' ? 'pause' : 'title'); });
$('#btn-cont').hidden = !(SP.save.last > 1 || SP.save.dk.length || SP.save.lastCh > 1);
function choosePlatform(p) { SP.settings.platform = p; if (p === 'mobile') SP.settings.quality = 'low'; if (p === 'chromebook') SP.settings.quality = 'medium'; SP.Touch.enable(p === 'mobile'); applySettings(); A.init(); showScreen('title'); }
$('#plat-pc').addEventListener('click', () => choosePlatform('pc')); $('#plat-cb').addEventListener('click', () => choosePlatform('chromebook')); $('#plat-mob').addEventListener('click', () => choosePlatform('mobile'));

/* ---------- main loop ---------- */
let last = performance.now(); SP.fade = 1; SP.fadeTarget = 0; SP.fadeRate = 1; SP.lbTarget = 0; SP.blurTarget = 0;
const nameEl = $('#fname');
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000) * (SP.timeScale || 1); last = now;
  SP.fps = SP.fps ? SP.fps * 0.95 + (1000 / Math.max(1, now - (SP._lt || now - 16))) * 0.05 : 60; SP._lt = now;
  const U = SP.post.U;
  SP.fade = SP.fade + clamp(SP.fadeTarget - SP.fade, -SP.fadeRate * dt, SP.fadeRate * dt); U.fade.value = SP.fade;
  U.letterbox.value = damp(U.letterbox.value, SP.lbTarget, 4, dt); U.blur.value = damp(U.blur.value, SP.blurTarget, 3, dt); U.flash.value = damp(U.flash.value, 0, 6, dt);
  if (SP.state === 'menu' && SP.menuTick) { SP.menuTick(dt); SP.post.render(SP.scene, camera, dt); return; }
  if (SP.state !== 'play' || !SP.scene) { $('#touch').hidden = true; return; }
  if (paused) $('#touch').hidden = true;
  if (!paused) {
    const rdt = dt; dt *= SP.Progress.worldScale(); G.time += dt; const P = SP.P;
    if (SP.W.surfaceFn) P.surfaceUnder = SP.W.surfaceFn(P.pos.x, P.pos.z);
    P.update(rdt * SP.Progress.playerScale());
    for (const u of G.units) u.update(dt);
    for (const v of G.vehicles) v.update(dt);
    G.updateProjectiles(dt); G.updateFx(dt); G.updateFires(dt); G.updateInteract(dt);
    if (ctx && !ctx.dead) {
      for (let i = ctx.timers.length - 1; i >= 0; i--) { const t = ctx.timers[i]; t.t -= dt; if (t.t <= 0) { ctx.timers.splice(i, 1); t.res(); } }
      for (let i = ctx.untils.length - 1; i >= 0; i--) { const u = ctx.untils[i]; u.t -= dt; let ok = false; try { ok = u.fn(); } catch (e) { } if (ok || u.t <= 0) { ctx.untils.splice(i, 1); u.res(ok); } }
      if (SP.onTick) SP.onTick(dt);
    }
    SP.Wheel.update(); SP.Progress.update(rdt);
    SP.updateSun(); SP.VM.update(rdt); G.updateMarkers(); G.updateCompass(); SP.updateMotes(dt);
    if (SP.sunDir && !SP.envCfg.indoor && !SP.envCfg.moon) { const sp = camera.position.clone().addScaledVector(SP.sunDir, 1000).project(camera); const on = sp.z < 1 && Math.abs(sp.x) < 1.6 && Math.abs(sp.y) < 1.6; U.sunPos.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); U.sunVis.value = damp(U.sunVis.value, on ? clamp(1.6 - Math.hypot(sp.x, sp.y), 0, 1) : 0, 4, dt); } else U.sunVis.value = 0;
    if (SP.sky) { SP.sky.position.copy(camera.position); SP.sky.material.uniforms.time.value += dt; }
    // friendly name tags
    let shown = null; const f = P.forward();
    for (const u of G.units) { if (u.team !== 'ally' || u.dead || !u.name) continue; const d = u.pos.distanceTo(P.pos); if (d > 30 || d < 1) continue; const to = V3(u.pos.x, u.pos.y + 1.5, u.pos.z).sub(P.eyePos()).normalize(); if (to.dot(f) > 0.992) { shown = u; break; } }
    if (shown) { const v = V3(shown.pos.x, shown.pos.y + 2.05, shown.pos.z).project(camera); nameEl.hidden = false; nameEl.textContent = shown.name; nameEl.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px)`; } else nameEl.hidden = true;
    $('#touch').hidden = !SP.Touch.on;
    { const zw = P.cur && SP.WEAP[P.cur] && SP.WEAP[P.cur].zoom && P.mode === 'walk'; const on = !!zw && P.adsT > 0.82; $('#scope').hidden = !on; if (zw) SP.hideVM(on); }
    $('#cross').hidden = !((P.cur && P.mode !== 'locked' && P.mode !== 'seat' && P.adsT < 0.5 && !P.binoc) || P.mode === 'turret');
    I.endFrame();
  }
  SP.post.render(SP.scene, camera, dt, SP.VM.group && SP.VM.group.visible && SP.P.mode !== 'locked' ? SP.vmScene : null, SP.vmCam);
}

/* ---------- title backdrop: helicopter over the dunes ---------- */
function titleBackdrop() {
  teardown(); const scene = SP.scene = G.scene = new T.Scene(); const W = SP.W = new SP.World(scene);
  SP.Maps.heli(W); SP.setEnv(scene, 'dusk2'); scene.add(camera); SP.P = null;
  let t = 0; camera.position.set(0.3, 141.2, 2.0); camera.rotation.set(-0.02, -Math.PI / 2 + 0.25, 0); camera.fov = 70; camera.updateProjectionMatrix();
  SP.menuTick = dt => { t += dt; camera.position.y = 141.2 + Math.sin(t * 1.3) * 0.02; camera.rotation.z = Math.sin(t * 0.9) * 0.01; if (SP.W.terrainMesh) SP.W.terrainMesh.position.z = (t * 45) % 60; SP.sky && SP.sky.position.copy(camera.position); SP.updateSun && (SP.sun.position.set(SP.sunDir.x * 150, 140 + SP.sunDir.y * 150, SP.sunDir.z * 150), SP.sun.target.position.set(0, 140, 0)); };
  SP.post.U.blur.value = 0.25; SP.blurTarget = 0.25;
}
SP.titleBackdrop = titleBackdrop;

/* ---------- boot ---------- */
async function boot() {
  applySettings(); resize();
  const keys = Object.keys(SP.TEX); const bar = $('#bootbar');
  for (let i = 0; i < keys.length; i++) { SP.TEX[keys[i]](); bar.style.width = ((i + 1) / keys.length * 100) + '%'; await new Promise(r => setTimeout(r, 0)); }
  titleBackdrop(); SP.state = 'menu'; $('#boot').hidden = true;
  if (SP.settings.platform) { SP.Touch.enable(SP.settings.platform === 'mobile'); showScreen('title'); } else { const cros = /CrOS/.test(navigator.userAgent), guess = matchMedia('(pointer: coarse)').matches; $(cros ? '#plat-cb' : guess ? '#plat-mob' : '#plat-pc').classList.add('guess'); showScreen('platform'); }
  requestAnimationFrame(frame);
}
SP.isPaused = () => paused;
SP.forceUnpause = () => { paused = false; $('#lockoverlay').hidden = true; showScreen(null); };
SP.debug = { load: (n, ch) => SP.loadPart(n, ch || 1), god: () => { SP.P.god = true; }, skip: () => ctx && ctx.complete() };
window.addEventListener('load', () => { boot().catch(e => { console.error(e); $('#boottext').textContent = 'Could not start: ' + e.message; }); });
})();

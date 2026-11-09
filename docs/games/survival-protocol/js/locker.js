/* Survival Protocol 1.2 — LOCKER: equip operator skins, gun wraps and camos, knives, crosshairs, tracer colours,
   titles and banners, with a live 3D preview. Reachable from the title, pause menu, modes, BR lobby and Season Pass. */
'use strict';
(function () {
const T = THREE; const $ = s => document.querySelector(s);
const PR = SP.Progress, PS = SP.Pass.PS, F = () => SP.Features || {};
const hex = c => '#' + (c >>> 0).toString(16).padStart(6, '0');
const toast = t => { const m = $('#lk-msg'); m.textContent = t; m.classList.remove('flash'); void m.offsetWidth; m.classList.add('flash'); };

/* ---------------- unlockables ---------------- */
const tierOf = (t, id) => { const T2 = SP.Pass.TIERS.find(x => [x.free, ...x.elite].some(r => r.t === t && r.id === id)); return T2 ? T2.n : null; };
const TRACERS = {
  amber: { name: 'Amber (default)', c: [8, 5.5, 2.2], css: '#ffb040', need: null },
  red: { name: 'Hot Red', c: [9, 1.2, 1], css: '#ff3a2a', need: null },
  green: { name: 'Toxic Green', c: [1.5, 8, 2], css: '#4aff6a', need: null },
  blue: { name: 'Plasma Blue', c: [1.4, 4, 10], css: '#3a9aff', need: { tier: 10 } },
  purple: { name: 'Void Purple', c: [6, 1.5, 10], css: '#b05aff', need: { tier: 25 } },
  white: { name: 'White Hot', c: [9, 9, 9], css: '#ffffff', need: { tier: 40 } },
  gold: { name: 'Gold Rush', c: [10, 7, 1], css: '#ffd030', need: { brWins: 1 } },
  rainbow: { name: 'Rainbow', c: null, css: 'linear-gradient(90deg,#f33,#fc3,#3f6,#3cf,#a3f)', need: { tier: 75 } },
};
const BANNERS = {
  recruit: { name: 'Recruit', bg: 'linear-gradient(135deg,#3a3326,#14110c)', need: null },
  sand: { name: 'Sandstorm', bg: 'linear-gradient(135deg,#d8a650,#7a4a1a)', need: null },
  night: { name: 'Night Ops', bg: 'linear-gradient(135deg,#1a2a4a,#05070e)', need: null },
  jungle: { name: 'Jungle', bg: 'linear-gradient(135deg,#2e5a22,#0a1a08)', need: { kills: 100 } },
  crimson: { name: 'Crimson', bg: 'linear-gradient(135deg,#a01c1c,#2a0606)', need: { kills: 500 } },
  arctic: { name: 'Arctic', bg: 'linear-gradient(135deg,#e8f4fa,#7aa4c0)', need: { tier: 15 } },
  neon: { name: 'Neon City', bg: 'linear-gradient(135deg,#ff2ad4,#2a1a6a 55%,#00e0ff)', need: { tier: 30 } },
  royale: { name: 'Last Squad Standing', bg: 'linear-gradient(135deg,#f2c14a,#a0601a 50%,#2a1a06)', need: { brWins: 1 } },
  hunter: { name: 'Squad Hunter', bg: 'repeating-linear-gradient(45deg,#2a2a2a 0 12px,#3a1a1a 12px 24px)', need: { brKills: 50 } },
  island: { name: 'Isla Corona', bg: 'radial-gradient(circle at 30% 60%,#3a8a3a,#1f6a8a 60%,#0a2a3a)', need: { brGames: 10 } },
  jackal: { name: 'The Jackal', bg: 'linear-gradient(135deg,#141008,#d4af37 70%,#141008)', need: { tier: 100 } },
  legend: { name: 'Legend', bg: 'conic-gradient(from 90deg,#f2b33d,#ff5a3a,#a65ef0,#3d8ef0,#5cc461,#f2b33d)', need: { tier: 90 } },
};
function stat(k) { const C = F().career; const LB = SP.BR && SP.BR.LB || {}; if (k === 'kills') return C && C.stats ? C.stats.kills || 0 : 0; if (k === 'brWins') return LB.wins || 0; if (k === 'brKills') return LB.kills || 0; if (k === 'brGames') return LB.games || 0; if (k === 'tier') return PS.tier || 0; return 0; }
function unlocked(need) { if (!need) return true; return Object.entries(need).every(([k, v]) => stat(k) >= v); }
function needText(need) { const [k, v] = Object.entries(need)[0]; return k === 'tier' ? 'Season Pass tier ' + v : k === 'kills' ? v + ' story kills' : k === 'brWins' ? 'Win a Battle Royale' : k === 'brKills' ? v + ' Battle Royale kills' : k === 'brGames' ? 'Play ' + v + ' Battle Royales' : ''; }
SP.tracerCol = () => { const t = TRACERS[PR.tracer] || TRACERS.amber; if (!t.c) { const h = (performance.now() / 600) % 1; const c = new T.Color().setHSL(h, 1, 0.5); return [c.r * 9, c.g * 9, c.b * 9]; } return t.c; };
PR.tracer = PR.tracer || 'amber'; PR.banner = PR.banner || 'recruit';

/* ---------------- 3D preview ---------------- */
const PV = { r: null, scene: null, cam: null, obj: null, raf: 0, spin: 0, drag: null };
function pvInit() {
  if (PV.r) return; const cv = $('#lk-cv');
  try { PV.r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { cv.hidden = true; return; }
  PV.r.outputEncoding = T.sRGBEncoding; PV.r.toneMapping = T.ACESFilmicToneMapping; PV.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  PV.scene = new T.Scene(); PV.cam = new T.PerspectiveCamera(30, 1, 0.01, 50); PV.cam.position.set(0, 0.12, 1.6);
  PV.scene.add(new T.HemisphereLight(0xfff2dd, 0x2a2420, 1.1)); const d = new T.DirectionalLight(0xffffff, 2.2); d.position.set(1.5, 2, 2); PV.scene.add(d); const d2 = new T.DirectionalLight(0x8ab0ff, 0.8); d2.position.set(-2, 0.5, -1); PV.scene.add(d2);
  const env = SP.envMap || (SP.scene && SP.scene.environment); if (env) PV.scene.environment = env;
  cv.addEventListener('pointerdown', e => { PV.drag = e.clientX; cv.setPointerCapture(e.pointerId); }); cv.addEventListener('pointermove', e => { if (PV.drag != null) { PV.spin += (e.clientX - PV.drag) * 0.012; PV.drag = e.clientX; } }); cv.addEventListener('pointerup', () => { PV.drag = null; });
}
function pvSet(make) {
  pvInit(); if (!PV.r) return; if (PV.obj) { PV.scene.remove(PV.obj); PV.obj = null; }
  let o = null; try { o = make(); } catch (e) { console.warn('locker preview', e); } if (!o) return;
  const g = new T.Group(); g.add(o); const box = new T.Box3().setFromObject(o); const s = box.getSize(new T.Vector3()); const c = box.getCenter(new T.Vector3()); o.position.sub(c); const k = 0.9 / Math.max(s.x, s.y, s.z, 0.01); g.scale.setScalar(k);
  PV.obj = g; PV.scene.add(g);
}
function pvLoop() {
  PV.raf = 0; if ($('#locker').hidden || !PV.r) return; const cv = $('#lk-cv'); const w = cv.clientWidth, h = cv.clientHeight; if (w && (cv.width !== Math.round(w * PV.r.getPixelRatio()) || cv.height !== Math.round(h * PV.r.getPixelRatio()))) { PV.r.setSize(w, h, false); PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); }
  if (PV.obj) { if (PV.drag == null) PV.spin += 0.008; PV.obj.rotation.y = PV.spin; PV.obj.rotation.x = 0.12; }
  PV.r.render(PV.scene, PV.cam); PV.raf = requestAnimationFrame(pvLoop);
}
function armModel() {
  const S = SP.Models.soldier({ faction: 'foe', top: 0xff00fe, pants: 0x00fe01, seed: 7, helmet: true });
  const topRef = SP.mat('fabric', { color: 0xff00fe, roughness: 0.95 }), pantsRef = SP.mat('fabric', { color: 0x00fe01, roughness: 0.95 }), gloveRef = SP.flat(0x2a2420, 0.8);
  const sm = new T.MeshStandardMaterial({ roughness: 0.85, color: SP.lin(0x6a6a4a) }); SP.applySkin(sm, 'sleeve'); const pm = sm.clone(); if (!pm.map) pm.color.multiplyScalar(0.7); const gm = new T.MeshStandardMaterial({ roughness: 0.6 }); SP.applySkin(gm, 'glove');
  S.root.traverse(o => { if (!o.isMesh) return; if (o.material === topRef) o.material = sm; else if (o.material === pantsRef) o.material = pm; else if (o.material === gloveRef) o.material = gm; });
  try { const id = (PR.wheel || []).find(w => w && SP.WEAP[w] && SP.WEAP[w].model && !SP.WEAP[w].melee && !SP.WEAP[w].item) || 'm4'; if (S.chest) { const gun = SP.WEAP[id].model(); gun.scale.setScalar(1); S.chest.add(gun); } } catch (e) { }
  return S.root;
}
/* ---------------- UI ---------------- */
let tab = 'operator', gunSel = null; let from = 'title';
const TABS = [['operator', 'Operator'], ['wraps', 'Gun wraps'], ['knives', 'Knives'], ['crosshair', 'Crosshair'], ['tracers', 'Tracers'], ['titles', 'Titles'], ['banners', 'Banners']];
function ownedGuns() { const ids = new Set(Object.keys(PR.owned || {}).filter(k => PR.owned[k])); (PR.wheel || []).forEach(w => w && ids.add(w)); return [...ids].filter(id => SP.WEAP[id] && SP.WEAP[id].model && !SP.WEAP[id].melee && !SP.WEAP[id].item && !SP.WEAP[id].rocket && id !== 'knife'); }
function card(o) { return `<button type="button" class="lkc${o.on ? ' on' : ''}${o.lock ? ' lock' : ''}" data-k="${o.k}"><i style="background:${o.bg}"></i><b>${o.name}</b><span>${o.sub || ''}</span></button>`; }
function render() {
  $('#lk-tabs').innerHTML = TABS.map(([k, n]) => `<button type="button" class="ctab${tab === k ? ' on' : ''}" data-t="${k}">${n}</button>`).join('');
  $('#lk-tabs').querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.t; render(); }));
  $('#lk-coins').textContent = '◆ ' + (PR.coins || 0).toLocaleString() + ' · TIER ' + PS.tier;
  const L = $('#lk-list'); let html = '', pv = null; const SK = SP.Pass.SKINS, WR = SP.Pass.WRAPS;
  if (tab === 'operator') {
    html = Object.entries(SK).map(([k, S]) => { const own = !!PS.skins[k]; const t = tierOf('skin', k); return card({ k, on: PS.skin === k, lock: !own, name: S.name, sub: own ? (PS.skin === k ? 'EQUIPPED' : 'Owned') : 'Season Pass tier ' + t, bg: S.wrap ? WR[S.wrap].css : `linear-gradient(135deg,${S.sleeve == null ? '#6a6a4a' : hex(S.sleeve)} 60%,${hex(S.glove)} 60%)` }); }).join('');
    pv = armModel; $('#lk-pvt').textContent = (SK[PS.skin] || SK.default).name;
  }
  if (tab === 'wraps') {
    const guns = ownedGuns(); if (!gunSel || !guns.includes(gunSel)) gunSel = guns[0];
    const kills = (PR.wkills || {})[gunSel] || 0; const cur = PR.camo[gunSel] || 'none';
    html = `<div class="lkguns">${guns.map(id => `<button type="button" class="achip sm${id === gunSel ? ' on' : ''}" data-g="${id}">${SP.WEAP[id].name}</button>`).join('')}</div><div class="lkgrid">` +
      Object.entries(SP.CAMOS).map(([k, C]) => { const isPass = C && C.pass; const own = !C || (isPass ? !!(PR.wraps && PR.wraps[k]) : kills >= C.kills); const t = isPass ? tierOf('wrap', k) : null; return card({ k, on: cur === k, lock: !own, name: C ? C.name : 'Factory finish', sub: own ? (cur === k ? 'EQUIPPED' : isPass ? 'Season wrap' : 'Camo') : isPass ? 'Season Pass tier ' + t : C.kills + ' kills with this gun (' + kills + ')', bg: C ? (C.css || hex(C.color)) : '#1d1d1d' }); }).join('') + '</div>' +
      `<div class="menu row"><button class="mb" type="button" id="lk-all">Put this wrap on every gun</button></div>`;
    pv = () => { const m = SP.WEAP[gunSel].model(); m.rotation.y = Math.PI / 2; return m; }; $('#lk-pvt').textContent = SP.WEAP[gunSel].name + ' · ' + (SP.CAMOS[cur] ? SP.CAMOS[cur].name : 'Factory finish');
  }
  if (tab === 'knives') {
    html = Object.entries(SP.KNIVES).map(([k, K]) => { const own = !!PR.knives[k]; return card({ k, on: PR.knife === k, lock: !own, name: K.name, sub: own ? (PR.knife === k ? 'EQUIPPED' : 'Owned · reach ' + K.range.toFixed(1) + ' m') : 'Buy for ' + K.price + ' coins · tap', bg: `linear-gradient(135deg,${hex(K.col)} 55%,${hex(K.handle)} 55%)` }); }).join('');
    pv = () => { const m = SP.Models.knife(PR.knife); m.rotation.set(0.2, Math.PI / 2, -0.9); return m; }; $('#lk-pvt').textContent = SP.KNIVES[PR.knife].name;
  }
  if (tab === 'crosshair') {
    const S = SP.settings; const styles = [['default', 'Classic'], ['dot', 'Dot'], ['circle', 'Circle'], ['none', 'None']]; const cols = [['#ece6da', 'White'], ['#8fd18a', 'Green'], ['#5fd7ff', 'Cyan'], ['#ffd23d', 'Yellow'], ['#ff5a5a', 'Red'], ['#ff6ad8', 'Pink'], ['#ff9a2a', 'Orange'], ['#b07aff', 'Purple']];
    html = `<div class="h4">Style</div><div class="lkgrid">${styles.map(([k, n]) => card({ k: 's:' + k, on: S.xhair === k, name: n, sub: S.xhair === k ? 'EQUIPPED' : '', bg: '#14110c' })).join('')}</div><div class="h4">Colour</div><div class="lkgrid">${cols.map(([c, n]) => card({ k: 'c:' + c, on: S.xcol === c, name: n, sub: S.xcol === c ? 'EQUIPPED' : '', bg: c })).join('')}</div>`;
    $('#lk-pvt').textContent = 'Crosshair'; pv = null;
  }
  if (tab === 'tracers') { html = Object.entries(TRACERS).map(([k, t]) => { const own = unlocked(t.need); return card({ k, on: PR.tracer === k, lock: !own, name: t.name, sub: own ? (PR.tracer === k ? 'EQUIPPED' : 'Unlocked') : needText(t.need), bg: t.css }); }).join(''); $('#lk-pvt').textContent = 'Your bullet tracers'; pv = null; }
  if (tab === 'titles') { html = ['', ...Object.keys(SP.Pass.TITLES)].map(k => { const own = !k || PS.titles[k]; return card({ k: k || '-', on: (PS.title || '') === k, lock: !own, name: k ? SP.Pass.TITLES[k] : 'No title', sub: own ? ((PS.title || '') === k ? 'EQUIPPED' : 'Owned') : 'Season Pass tier ' + tierOf('title', k), bg: '#1a1712' }); }).join(''); $('#lk-pvt').textContent = 'Title'; pv = null; }
  if (tab === 'banners') { html = Object.entries(BANNERS).map(([k, B]) => { const own = unlocked(B.need); return card({ k, on: PR.banner === k, lock: !own, name: B.name, sub: own ? (PR.banner === k ? 'EQUIPPED' : 'Unlocked') : needText(B.need), bg: B.bg }); }).join(''); $('#lk-pvt').textContent = 'Player card'; pv = null; }
  L.innerHTML = tab === 'wraps' || tab === 'crosshair' ? html : `<div class="lkgrid">${html}</div>`;
  L.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { gunSel = b.dataset.g; render(); }));
  L.querySelectorAll('.lkc').forEach(b => b.addEventListener('click', () => pick(b.dataset.k, b.classList.contains('lock'))));
  const all = $('#lk-all'); if (all) all.addEventListener('click', () => { const k = PR.camo[gunSel] || 'none'; const C = SP.CAMOS[k]; let n = 0; for (const id of ownedGuns()) { const ok = !C || C.pass || ((PR.wkills || {})[id] || 0) >= C.kills; if (ok) { if (k === 'none') delete PR.camo[id]; else PR.camo[id] = k; n++; } } PR.save(); toast((C ? C.name : 'Factory finish') + ' is on ' + n + ' gun' + (n === 1 ? '' : 's') + (C && !C.pass ? ' (only where you have earned it)' : '') + '.'); refresh(); });
  // preview: 3D for operator, wraps, knives; card/crosshair/tracer for the rest
  const cv = $('#lk-cv'), alt = $('#lk-alt');
  if (pv) { cv.hidden = false; alt.hidden = true; pvSet(pv); if (!PV.raf) PV.raf = requestAnimationFrame(pvLoop); }
  else { cv.hidden = true; alt.hidden = false; alt.innerHTML = altPreview(); }
  playerCard();
}
function altPreview() {
  if (tab === 'crosshair') { const S = SP.settings; return `<div class="lkxh"><div class="cross" data-style="${S.xhair}" style="--xc:${S.xcol}"><i class="l"></i><i class="r"></i><i class="t"></i><i class="b"></i></div></div>`; }
  if (tab === 'tracers') { const t = TRACERS[PR.tracer] || TRACERS.amber; return `<div class="lktr">${[0, 1, 2, 3].map(i => `<u style="background:${t.css};top:${22 + i * 16}%;animation-delay:${i * 0.18}s"></u>`).join('')}</div>`; }
  return cardHTML();
}
function cardHTML() { const B = BANNERS[PR.banner] || BANNERS.recruit; const tt = PS.title && SP.Pass.TITLES[PS.title]; return `<div class="pcard" style="background:${B.bg}"><b>${(SP.BRNet && SP.BRNet.L && SP.BRNet.L.name) || 'Pvt. Jake Sarton'}</b><span>${tt ? '“' + tt + '”' : 'No title'}</span><em>TIER ${PS.tier}${PS.elite ? ' · ELITE' : ''}</em></div>`; }
function playerCard() { const el = $('#pcard-title'); if (el) el.innerHTML = cardHTML(); }
SP.playerCardHTML = cardHTML;
function pick(k, lock) {
  if (tab === 'operator') { if (lock) { toast(SP.Pass.SKINS[k].name + ' unlocks at Season Pass tier ' + tierOf('skin', k) + '.'); return; } PS.skin = k; }
  if (tab === 'wraps') { const C = SP.CAMOS[k]; if (lock) { toast(C.pass ? C.name + ' unlocks at Season Pass tier ' + tierOf('wrap', k) + '.' : C.name + ' unlocks at ' + C.kills + ' kills with this gun.'); return; } if (k === 'none') delete PR.camo[gunSel]; else PR.camo[gunSel] = k; }
  if (tab === 'knives') { const K = SP.KNIVES[k]; if (lock) { if ((PR.coins || 0) < K.price) { toast(K.name + ' costs ' + K.price + ' coins. You have ' + (PR.coins || 0) + '.'); return; } PR.coins -= K.price; PR.knives[k] = true; toast('Bought the ' + K.name + '.'); } PR.knife = k; }
  if (tab === 'crosshair') { const S = SP.settings; const [t, v] = k.split(':'); if (t === 's') S.xhair = v; else S.xcol = k.slice(2); try { const key = 'survival_protocol_ch1_set'; const o = JSON.parse(localStorage.getItem(key) || '{}'); o.xhair = S.xhair; o.xcol = S.xcol; localStorage.setItem(key, JSON.stringify(o)); } catch (e) { } F().applySettings && F().applySettings(); }
  if (tab === 'tracers') { if (lock) { toast(TRACERS[k].name + ': ' + needText(TRACERS[k].need) + '.'); return; } PR.tracer = k; }
  if (tab === 'titles') { if (lock) { toast('This title unlocks at Season Pass tier ' + tierOf('title', k) + '.'); return; } PS.title = k === '-' ? '' : k; }
  if (tab === 'banners') { if (lock) { toast(BANNERS[k].name + ': ' + needText(BANNERS[k].need) + '.'); return; } PR.banner = k; }
  PR.save(); SP.Audio && SP.Audio.click && SP.Audio.click(1100, 0.06); refresh(); render();
}
function refresh() { const P = SP.P; if (P && P.cur && SP.buildViewModel && SP.state === 'play') { try { SP.buildViewModel(P.cur); } catch (e) { } } if (SP.Progress.applyKnife) try { SP.Progress.applyKnife(); } catch (e) { } }
const curScreen = () => { const s = [...document.querySelectorAll('.ov.screen')].find(e => !e.hidden && e.id !== 'locker'); return s ? s.id : 'title'; };
SP.openLocker = (f, t) => { from = typeof f === 'string' ? f : curScreen(); if (t) tab = t; render(); SP.showScreen('locker'); if (!PV.raf && !$('#lk-cv').hidden) PV.raf = requestAnimationFrame(pvLoop); };
function wire() {
  $('#lk-back').addEventListener('click', () => { SP.showScreen(from || 'title'); playerCard(); });
  ['#btn-locker', '#p-locker', '#mode-locker', '#bl-locker', '#pass-locker'].forEach(s => { const e = $(s); if (e) e.addEventListener('click', () => SP.openLocker()); });
  playerCard(); new MutationObserver(() => { if (!$('#title').hidden) playerCard(); }).observe($('#title'), { attributes: true, attributeFilter: ['hidden'] });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
SP.Locker = { TRACERS, BANNERS, render };
})();

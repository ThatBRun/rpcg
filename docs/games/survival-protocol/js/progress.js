/* Survival Protocol — progression: coins, skill points, skill tree, armory, weapon wheel, abilities */
'use strict';
(function () {
const T = THREE, { V3, clamp } = SP; const G = SP.G, A = SP.Audio, I = SP.Input;
const $ = s => document.querySelector(s);
const KEY = 'survival_protocol_profile';

/* ---------------- data ---------------- */
const CHAPTER_COINS = { 1: 1500, 2: 1000, 3: 900, 4: 1400, 5: 1800 };
const REPLAY_RATE = 0.25;
const SKILLS = [
  { branch: 'MOBILITY', nodes: [
    { id: 'slide', name: 'Slide', cost: 1, desc: 'Crouch while sprinting to slide. Jump out of a slide to keep your speed.' },
    { id: 'wallrun', name: 'Wall Run', cost: 2, req: 'slide', desc: 'Sprint and jump next to a wall to run along it. Press jump to kick off.' },
    { id: 'djump', name: 'Double Jump', cost: 2, req: 'wallrun', desc: 'Jump again in mid-air.' },
    { id: 'dash', name: 'Tactical Dash', cost: 3, req: 'djump', desc: 'Press Q to burst in the direction you are moving. 2 second cooldown.' },
    { id: 'marathon', name: 'Marathon', cost: 1, req: 'slide', desc: 'Sprint 12% faster and slide further.' },
  ] },
  { branch: 'COMBAT', nodes: [
    { id: 'steady', name: 'Steady Hands', cost: 1, desc: 'Every weapon kicks 35% less.' },
    { id: 'quick', name: 'Quick Hands', cost: 2, req: 'steady', desc: 'Reload 25% faster.' },
    { id: 'deadeye', name: 'Deadeye', cost: 2, req: 'quick', desc: 'Headshots deal 30% more damage.' },
    { id: 'adren', name: 'Adrenaline', cost: 3, req: 'deadeye', desc: 'Press X to slow time for 5 seconds while you move at full speed. 35 second cooldown.' },
  ] },
  { branch: 'SURVIVAL', nodes: [
    { id: 'tough', name: 'Tough', cost: 1, desc: '+25 maximum health.' },
    { id: 'regen', name: 'Field Medic', cost: 2, req: 'tough', desc: 'Health starts coming back sooner and refills faster.' },
    { id: 'armor', name: 'Body Armour', cost: 2, req: 'tough', desc: '+25 more maximum health.' },
    { id: 'ghost', name: 'Ghost', cost: 2, req: 'regen', desc: 'Your footsteps are much quieter. Guards notice you later.' },
    { id: 'second', name: 'Second Wind', cost: 3, req: 'ghost', desc: 'Once per part, a killing hit leaves you at half health instead.' },
  ] },
];
const SKILL_BY = {}; SKILLS.forEach(b => b.nodes.forEach(n => { SKILL_BY[n.id] = n; }));
const BLURB = { ar: 'Assault rifle. Good at every range.', smg: 'Fast-firing and light. Best up close.', lmg: 'Huge magazine. Slow to reload.', sniper: 'Scoped. One shot can end it.', dmr: 'Semi-auto with a scope. Hits hard at range.', shotgun: 'Devastating up close.', pistol: 'Sidearm. Fast to draw.', launcher: 'Explosive. Use it on vehicles and groups.', melee: 'Silent. One hit up close.' };
const WEAPONS = []; const weaponList = () => { if (WEAPONS.length) return WEAPONS; ['m4', 'pistol', 'sup', 'ak', 'shotgun', 'dmr', 'at4'].forEach((id, i) => WEAPONS.push({ id, price: [0, 0, 500, 600, 800, 1000, 1200][i] })); (SP.GUNS || []).forEach(g => WEAPONS.push({ id: g.id, price: g.price })); return WEAPONS; };
const UPGRADES = [
  { id: 'dmg', name: 'Damage', per: '+12%', costs: [250, 500, 900] },
  { id: 'mag', name: 'Magazine', per: '+25%', costs: [200, 400, 700] },
  { id: 'rel', name: 'Reload', per: '-12%', costs: [200, 400, 700] },
];
const MAX_SLOTS = 12; const SLOT_COSTS = { 4: 700, 6: 1200, 8: 1800, 10: 2600 }; // +2 slots per purchase, 4 → 12

/* ---------------- profile ---------------- */
const PR = SP.Progress = { coins: 0, spent: 0, skills: {}, owned: { m4: true, pistol: true }, up: {}, wheel: [], slots: 4, chapterPaid: {}, partPaid: {}, migrated: false };
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) Object.assign(PR, s); } catch (e) { }
if (!PR.knifeAdded) { PR.knifeAdded = true; if (!PR.wheel.includes('knife')) PR.wheel.push('knife'); PR.owned.knife = true; }
/* positional wheel: PR.wheel[i] is the weapon in slot i (null = empty), 12 slots, PR.slots of them unlocked */
if (!PR.wheelPos) { const old = (PR.wheel || []).filter((w, i, a) => w && PR.owned[w] && a.indexOf(w) === i); if (!old.length) old.push('m4', 'pistol', 'knife'); PR.wheel = Array(MAX_SLOTS).fill(null); old.slice(0, MAX_SLOTS).forEach((w, i) => PR.wheel[i] = w); PR.wheelPos = true; }
while (PR.wheel.length < MAX_SLOTS) PR.wheel.push(null); PR.wheel.length = MAX_SLOTS; PR.slots = Math.min(MAX_SLOTS, Math.max(4, PR.slots || 4));
PR.inWheel = w => PR.wheel.indexOf(w);
PR.wheelAdd = w => { if (PR.wheel.indexOf(w) >= 0) return PR.wheel.indexOf(w); for (let i = 0; i < PR.slots; i++) if (!PR.wheel[i]) { PR.wheel[i] = w; return i; } return -1; };
PR.wheelRemove = w => { const i = PR.wheel.indexOf(w); if (i >= 0) PR.wheel[i] = null; };
PR.wheelPut = (w, i) => { const j = PR.wheel.indexOf(w); if (j >= 0) PR.wheel[j] = PR.wheel[i] && j < PR.slots ? PR.wheel[i] : null; PR.wheel[i] = w; };
PR.att = PR.att || {}; PR.camo = PR.camo || {}; PR.knives = PR.knives || { combat: true }; PR.knife = PR.knife || 'combat';
PR.save = () => { try { const o = {}; ['coins', 'spent', 'skills', 'owned', 'up', 'wheel', 'slots', 'chapterPaid', 'partPaid', 'migrated', 'knifeAdded', 'wheelPos', 'att', 'camo', 'knives', 'knife', 'wkills', 'wxp'].forEach(k => o[k] = PR[k]); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } };
PR.points = () => Object.keys(PR.partPaid).length - PR.spent;
SP.skill = id => !!PR.skills[id];

// first run with this system: pay out for parts and chapters finished before it existed
PR.migrate = function () {
  if (PR.migrated || !SP.save) return; PR.migrated = true;
  (SP.save.dk || []).forEach(k => { PR.partPaid[k] = true; });
  (SP.CHAPTERS || []).forEach(C => { const n = (C.parts || []).length; if (!n) return; let all = true; for (let i = 1; i <= n; i++) if (!SP.isDone(C.n, i)) all = false; if (all && !PR.chapterPaid[C.n]) { PR.chapterPaid[C.n] = 1; PR.coins += CHAPTER_COINS[C.n] || 1000; } });
  PR.save();
};

/* rewards. Returns a short summary for the end-of-chapter screen. */
PR.onPartComplete = function (ch, n, last) {
  const key = ch + '-' + n; const out = [];
  if (!PR.partPaid[key]) { PR.partPaid[key] = true; PR.coins += 150; out.push('+1 SKILL POINT · +150 COINS'); G.hud.feed('+1 SKILL POINT · +150 COINS', 'gold'); }
  if (last) {
    const full = CHAPTER_COINS[ch] || 1000; let got;
    if (!PR.chapterPaid[ch]) { PR.chapterPaid[ch] = 1; got = full; } else { PR.chapterPaid[ch]++; got = Math.round(full * REPLAY_RATE); }
    PR.coins += got; out.push('+' + got + ' COINS');
  }
  PR.save(); return out;
};

/* ---------------- weapon stats ---------------- */
PR.buildStats = function () {
  const W = SP.WEAP; for (const k in W) if (!SP.WEAP_BASE[k]) SP.WEAP_BASE[k] = Object.assign({}, W[k]);
  for (const k in SP.WEAP_BASE) {
    const b = SP.WEAP_BASE[k], L = PR.up[k] || {};
    Object.assign(W[k], b, {
      dmg: b.dmg != null ? b.dmg * (1 + 0.12 * (L.dmg || 0)) : b.dmg,
      mag: b.rocket ? b.mag : Math.round(b.mag * (1 + 0.25 * (L.mag || 0))),
      reload: b.reload * (1 - 0.12 * (L.rel || 0)) * (SP.skill('quick') ? 0.75 : 1),
      kick: b.kick * (SP.skill('steady') ? 0.65 : 1),
      head: b.head * (SP.skill('deadeye') ? 1.3 : 1),
    });
    const at = (PR.att && PR.att[k]) || {}; const w = W[k];
    if (at.sup && !b.rocket && !b.melee) { w.silent = true; w.sound = 'sup'; w.dmg *= 0.94; }
    if (at.ext && !b.rocket && !b.melee) { w.mag = Math.round(w.mag * 1.5); w.reload *= 1.08; }
    if (at.laser) w.spreadH *= 0.7;
    if (at.optic === 'acog' && !w.zoom) w.adsZoom = 1.5; else if (!w.zoom) w.adsZoom = 0;
  }
  const K = SP.KNIVES && SP.KNIVES[PR.knife || 'combat']; if (K && W.knife) { W.knife.swing = K.swing; W.knife.name = K.name.toUpperCase(); W.knife.range = K.range; }
};
PR.maxHp = () => 100 + (SP.skill('tough') ? 25 : 0) + (SP.skill('armor') ? 25 : 0);

/* called by the part loader */
PR.beforeLoad = function () { PR.migrate(); PR.buildStats(); };
PR.afterLoadout = function (P, part) {
  P.maxHp = PR.maxHp(); P.hp = P.maxHp; P.secondWind = false; P.dashCd = 0; SP.slowmoT = 0; SP.slowCd = 0;
  const lo = part.loadout || ['m4'];
  W.useSlots = !!(lo.length && !part.noExtras);
  if (W.useSlots) {
    // your wheel loadout is always with you; weapons the part hands out go in extra MISSION slots after it
    const old = P.inv, inv = {};
    PR.wheel.slice(0, PR.slots).forEach(w => { if (w && PR.owned[w] && SP.WEAP[w]) inv[w] = old[w] || { mag: SP.WEAP[w].mag, res: SP.WEAP[w].mag * 4 }; });
    Object.keys(old).forEach(w => { if (!inv[w]) inv[w] = old[w]; });
    P.inv = inv; if (!P.cur || !P.inv[P.cur]) { P.cur = null; const f = Object.keys(inv)[0]; if (f) P.equip(f); }
  }
  P.updAmmo(); W.refreshButtons();
};

/* ---------------- abilities: dash cooldown display + adrenaline ---------------- */
const cds = {};
PR.cooldown = (name, secs) => { cds[name] = { t: secs, max: secs }; };
SP.slowmoT = 0; SP.slowCd = 0;
PR.update = function (dt) {
  const P = SP.P; if (!P) return;
  SP.slowCd = Math.max(0, SP.slowCd - dt);
  if (SP.skill('adren') && (I.hit('KeyX') || PR.focusTap) && SP.slowCd <= 0 && SP.slowmoT <= 0 && P.alive && P.mode !== 'locked') { SP.slowmoT = 5; SP.slowCd = 35; PR.cooldown('focus', 35); G.hud.feed('ADRENALINE', 'gold'); A.heartbeat && A.heartbeat(0.5); SP.post.U.flash.value = 0.25; }
  PR.focusTap = false;
  if (SP.slowmoT > 0) { SP.slowmoT -= dt; if (SP.slowmoT <= 0) G.hud.feed('ADRENALINE ENDS', ''); }
  for (const k in cds) cds[k].t = Math.max(0, cds[k].t - dt);
  const el = $('#abil'); const show = SP.skill('dash') || SP.skill('adren'); el.hidden = !show;
  if (show) {
    const d = $('#ab-dash'), f = $('#ab-focus'); d.hidden = !SP.skill('dash'); f.hidden = !SP.skill('adren');
    const cd = cds.dash ? cds.dash.t : 0, cf = SP.slowCd; d.classList.toggle('cool', cd > 0); f.classList.toggle('cool', cf > 0); f.classList.toggle('live', SP.slowmoT > 0);
    d.querySelector('i').style.width = (cd > 0 ? 100 - cd / 2.2 * 100 : 100) + '%'; f.querySelector('i').style.width = (cf > 0 ? 100 - cf / 35 * 100 : 100) + '%';
  }
};
/* world time scale: wheel open slows everything, adrenaline slows the world but not you */
PR.worldScale = () => (W.open ? 0.18 : SP.slowmoT > 0 ? 0.35 : 1);
PR.playerScale = () => (W.open ? 0.18 : 1);

/* ---------------- weapon wheel ---------------- */
const W = SP.Wheel = { open: false, sel: -1, vx: 0, vy: 0, list: [] };
const wheelEl = () => $('#wheel');
function slotPos(i, n) { const a = -Math.PI / 2 + i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a), a]; }
W.order = function () {
  const P = SP.P; if (!P) return []; if (!W.useSlots) return Object.keys(P.inv);
  const out = PR.wheel.slice(0, PR.slots).map(w => (w && P.inv[w]) ? w : null);
  Object.keys(P.inv).forEach(w => { if (!out.includes(w)) out.push(w); });
  return out;
};
W.build = function () {
  const P = SP.P, el = wheelEl(), ring = el.querySelector('.wslots'); ring.innerHTML = '';
  const order = W.order(); const n = Math.max(W.useSlots ? 0 : PR.slots, order.length); W.list = [];
  el.querySelector('.wring').classList.toggle('many', n > 8); el.querySelector('.wring').classList.toggle('lots', n > 12);
  for (let i = 0; i < n; i++) {
    const w = order[i]; const extra = W.useSlots && i >= PR.slots; const b = document.createElement('button'); b.type = 'button'; b.className = 'wslot' + (w ? '' : ' empty') + (w === P.cur ? ' cur' : '') + (extra ? ' mis' : '');
    const [x, y] = slotPos(i, n); const r = n > 8 ? 40 : 37; b.style.left = (50 + x * r) + '%'; b.style.top = (50 + y * r) + '%';
    if (w) { const s = P.inv[w]; b.innerHTML = `<span class="k">${extra ? 'MISSION' : i + 1}</span><b></b><span class="am"></span>`; b.querySelector('b').textContent = SP.WEAP[w].name; b.querySelector('.am').textContent = SP.WEAP[w].melee ? 'MELEE' : SP.WEAP[w].rocket ? s.mag + s.res + ' ROCKETS' : s.mag + ' / ' + s.res; }
    else b.innerHTML = '<span class="k">' + (i + 1) + '</span><b>EMPTY</b><span class="am">SET IN THE ARMORY</span>';
    const idx = i; b.addEventListener('click', e => { e.preventDefault(); if (!w) return; W.sel = idx; W.close(true); });
    b.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); if (!w) { W.close(false); return; } W.sel = idx; W.close(true); }, { passive: false });
    ring.append(b); W.list.push({ w, b });
  }
  const lockedN = MAX_SLOTS - PR.slots; el.querySelector('.wlocked').textContent = lockedN > 0 ? PR.slots + ' of 12 slots · unlock more in the Armory' : '12 of 12 slots';
  W.sel = order.indexOf(P.cur); W.mark();
};
W.mark = function () { W.list.forEach((s, i) => s.b.classList.toggle('sel', i === W.sel)); const s = W.list[W.sel]; const c = wheelEl().querySelector('.wc'); if (s && s.w) { c.querySelector('b').textContent = SP.WEAP[s.w].name; const st = SP.WEAP[s.w]; c.querySelector('span').textContent = st.pellets ? 'SHOTGUN · ' + st.mag + ' SHELLS' : st.rocket ? 'LAUNCHER' : st.zoom ? 'SCOPED · ' + st.mag + ' ROUNDS' : (st.auto ? 'FULL AUTO · ' : 'SEMI · ') + st.mag + ' ROUNDS'; } else { c.querySelector('b').textContent = 'WEAPON WHEEL'; c.querySelector('span').textContent = ''; } };
W.openW = function () {
  const P = SP.P; if (!P || !P.alive || P.mode !== 'walk' || !Object.keys(P.inv).length) return;
  W.open = true; W.vx = W.vy = 0; W.build(); wheelEl().querySelector('.whint').textContent = SP.Touch.on ? 'TAP A WEAPON · TAP OUTSIDE TO CLOSE' : I.fallback ? 'CLICK A WEAPON OR MOVE TO PICK · RELEASE F' : 'MOVE THE MOUSE TO PICK · RELEASE F TO EQUIP'; wheelEl().hidden = false; A.click(900, 0.06); document.body.classList.add('wheel-open');
};
W.close = function (apply) {
  if (!W.open) return; W.open = false; wheelEl().hidden = true; document.body.classList.remove('wheel-open');
  const s = W.list[W.sel]; if (apply && s && s.w && s.w !== SP.P.cur) { SP.P.equip(s.w); G.hud.feed(SP.WEAP[s.w].name, ''); }
};
W.aim = function (mx, my) { W.vx = clamp(W.vx + mx, -160, 160); W.vy = clamp(W.vy + my, -160, 160); const L = Math.hypot(W.vx, W.vy); if (L > 35 && W.list.length) { const a = Math.atan2(W.vy, W.vx); const n = W.list.length; let best = 0, bd = 9; for (let i = 0; i < n; i++) { const d = Math.abs(Math.atan2(Math.sin(a - slotPos(i, n)[2]), Math.cos(a - slotPos(i, n)[2]))); if (d < bd) { bd = d; best = i; } } if (best !== W.sel && W.list[best].w) { W.sel = best; W.mark(); A.click(1600, 0.03); } } };
W.update = function () {
  const P = SP.P; if (!P) return;
  if (!W.open) { if (!SP.Touch.on && I.hit('KeyF') && !G.tdAvail && P.mode === 'walk') W.openW(); }
  else { if (!SP.Touch.on && !I.down('KeyF')) W.close(true); if (!P.alive || P.mode !== 'walk') W.close(false); }
};
W.refreshButtons = function () { const on = SP.Touch && SP.Touch.on; $('#t-dash').hidden = !(on && SP.skill('dash')); $('#t-focus').hidden = !(on && SP.skill('adren')); };

/* touch buttons */
function touchBtn(id, fn) { const b = $(id); if (!b) return; b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); fn(); }, { passive: false }); const u = e => { e.preventDefault(); b.classList.remove('on'); }; b.addEventListener('touchend', u, { passive: false }); b.addEventListener('touchcancel', u, { passive: false }); }
window.addEventListener('load', () => {
  touchBtn('#t-wheel', () => { if (W.open) W.close(false); else W.openW(); });
  touchBtn('#t-dash', () => { I.pressed.KeyQ = true; });
  touchBtn('#t-focus', () => { PR.focusTap = true; });
  $('#wheel').addEventListener('touchend', e => { if (e.target.id === 'wheel' || e.target.classList.contains('wbg')) { e.preventDefault(); W.close(false); } }, { passive: false });
});

/* ---------------- armory screen ---------------- */
let armTab = 'skills';
PR.openArmory = function (from) { PR.migrate(); PR.from = from; renderArmory(); SP.showScreen('armory'); };
function purse() { $('#a-coins').textContent = PR.coins.toLocaleString(); $('#a-sp').textContent = PR.points(); }
function toast(t) { const el = $('#a-msg'); el.textContent = t; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
function renderArmory() {
  purse(); document.querySelectorAll('#a-tabs .ctab').forEach(b => b.classList.toggle('on', b.dataset.t === armTab));
  const body = $('#a-body'); body.innerHTML = '';
  if (armTab === 'skills') {
    body.className = 'atree';
    SKILLS.forEach(br => {
      const col = document.createElement('div'); col.className = 'abranch'; const h = document.createElement('div'); h.className = 'abh'; h.textContent = br.branch; col.append(h);
      br.nodes.forEach(n => {
        const owned = !!PR.skills[n.id], reqOk = !n.req || PR.skills[n.req], afford = PR.points() >= n.cost;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'anode' + (owned ? ' owned' : reqOk ? (afford ? ' avail' : ' poor') : ' locked');
        b.innerHTML = '<span class="an"></span><span class="ac"></span><span class="ad"></span>';
        b.querySelector('.an').textContent = n.name; b.querySelector('.ac').textContent = owned ? 'UNLOCKED' : !reqOk ? 'NEEDS ' + SKILL_BY[n.req].name.toUpperCase() : n.cost + (n.cost === 1 ? ' POINT' : ' POINTS'); b.querySelector('.ad').textContent = n.desc;
        b.addEventListener('click', () => {
          if (owned) return; if (!reqOk) { toast('Unlock ' + SKILL_BY[n.req].name + ' first.'); return; } if (!afford) { toast('Not enough skill points. You earn one for every part you finish.'); return; }
          PR.skills[n.id] = true; PR.spent += n.cost; PR.save(); PR.buildStats(); if (SP.P) { const m = PR.maxHp(); SP.P.hp += m - SP.P.maxHp; SP.P.maxHp = m; } W.refreshButtons(); A.click(1200, 0.12); toast(n.name + ' unlocked.'); renderArmory();
        });
        col.append(b);
      });
      body.append(col);
    });
  } else { renderWeapons(body); }
}
let wCls = 'ar', wSel = 'm4', selSlot = null;
function bars(st) {
  const rows = [['Damage', Math.min(1, (st.pellets ? st.dmg * st.pellets * 0.6 : st.rocket ? 400 : st.dmg) / 160)], ['Fire rate', Math.min(1, st.rpm / 1200)], ['Accuracy', 1 - Math.min(1, st.spreadA / 0.006)], ['Control', 1 - Math.min(1, st.kick / 0.08)], ['Magazine', Math.min(1, st.mag / 100)], ['Reload', 1 - Math.min(1, st.reload / 6)]];
  return '<div class="abars">' + rows.map(([n, v]) => `<div><span>${n}</span><i><u style="width:${Math.round(Math.max(0.04, v) * 100)}%"></u></i></div>`).join('') + '</div>';
}
function wheelButtons(act, id, name) {
  const at = PR.inWheel(id); const inW = at >= 0 && at < PR.slots;
  if (selSlot !== null) { const b = document.createElement('button'); b.type = 'button'; b.className = 'abuy'; b.textContent = 'Put in slot ' + (selSlot + 1); b.addEventListener('click', () => { PR.wheelPut(id, selSlot); toast(name + ' is in slot ' + (selSlot + 1) + '.'); selSlot = null; PR.save(); A.click(1100, 0.08); renderArmory(); }); act.append(b); }
  const b = document.createElement('button'); b.type = 'button'; b.className = 'atog' + (inW ? ' on' : '');
  b.textContent = inW ? 'In slot ' + (at + 1) + ' ✓ · tap to remove' : 'Add to wheel';
  b.addEventListener('click', () => { if (inW) PR.wheelRemove(id); else if (PR.wheelAdd(id) < 0) { toast('Your wheel is full. Tap a slot above, then Put in slot.'); return; } PR.save(); renderArmory(); });
  act.append(b);
}
function renderWeapons(body) {
  body.className = 'awpn';
  const sl = document.createElement('div'); sl.className = 'aslots';
  const next = PR.slots < MAX_SLOTS ? SLOT_COSTS[PR.slots] : null;
  sl.innerHTML = `<div><b>Weapon wheel</b><span>${PR.slots} of 12 slots unlocked</span></div>`;
  if (next) { const b = document.createElement('button'); b.type = 'button'; b.className = 'abuy'; b.textContent = `Unlock 2 slots · ${next} coins`; b.addEventListener('click', () => { if (PR.coins < next) { toast('Not enough coins. Finish parts and chapters to earn more.'); return; } PR.coins -= next; PR.slots = Math.min(MAX_SLOTS, PR.slots + 2); PR.save(); A.click(1200, 0.12); toast('Weapon wheel now has ' + PR.slots + ' slots.'); renderArmory(); }); sl.append(b); }
  body.append(sl);
  const grid = document.createElement('div'); grid.className = 'wgrid';
  for (let i = 0; i < MAX_SLOTS; i++) {
    const w = PR.wheel[i], lock = i >= PR.slots; const b = document.createElement('button'); b.type = 'button';
    b.className = 'wg' + (lock ? ' lock' : '') + (w && !lock ? ' full' : '') + (selSlot === i ? ' sel' : '');
    b.innerHTML = `<span>${i + 1}</span><b></b>`; b.querySelector('b').textContent = lock ? 'Locked' : w ? (w === 'knife' ? SP.KNIVES[PR.knife].name : (SP.WEAP_BASE[w] || SP.WEAP[w]).name) : 'Empty';
    if (lock) b.disabled = true;
    else b.addEventListener('click', () => {
      if (selSlot === null) selSlot = i;
      else if (selSlot === i) selSlot = null;
      else { const t = PR.wheel[i]; PR.wheel[i] = PR.wheel[selSlot]; PR.wheel[selSlot] = t; selSlot = null; PR.save(); A.click(900, 0.06); }
      renderArmory();
    });
    grid.append(b);
  }
  body.append(grid);
  const hint = document.createElement('div'); hint.className = 'wghint';
  if (selSlot !== null) {
    hint.innerHTML = `<span>Slot ${selSlot + 1} selected. Tap another slot to swap them, or pick a weapon below and press <b>Put in slot ${selSlot + 1}</b>.</span>`;
    if (PR.wheel[selSlot]) { const c = document.createElement('button'); c.type = 'button'; c.className = 'atog'; c.textContent = 'Empty slot ' + (selSlot + 1); c.addEventListener('click', () => { PR.wheel[selSlot] = null; selSlot = null; PR.save(); renderArmory(); }); hint.append(c); }
  } else hint.innerHTML = '<span>Tap a slot to move or change its weapon. Your wheel goes with you into every mission, chapter and part. Number keys 1–8 pick slots 1–8.</span>';
  body.append(hint);
  const chips = document.createElement('div'); chips.className = 'achips';
  ['ar', 'smg', 'lmg', 'sniper', 'dmr', 'shotgun', 'pistol', 'launcher', 'melee'].forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'achip' + (c === wCls ? ' on' : ''); const n = c === 'melee' ? Object.keys(SP.KNIVES).length : weaponList().filter(w => SP.WEAP[w.id] && SP.WEAP[w.id].cls === c).length; b.textContent = SP.CLASS_NAMES[c] + ' · ' + n; b.addEventListener('click', () => { wCls = c; const f = weaponList().find(w => SP.WEAP[w.id].cls === c); wSel = c === 'melee' ? 'knife' : f && f.id; renderArmory(); }); chips.append(b); });
  body.append(chips);
  const wrap = document.createElement('div'); wrap.className = 'asplit'; body.append(wrap);
  const list = document.createElement('div'); list.className = 'alist'; wrap.append(list);
  const det = document.createElement('div'); det.className = 'adet'; wrap.append(det);
  if (wCls === 'melee') {
    Object.entries(SP.KNIVES).forEach(([k, K]) => { const own = !!PR.knives[k]; const b = document.createElement('button'); b.type = 'button'; b.className = 'arow' + (PR.knife === k ? ' sel' : '') + (own ? ' owned' : ''); b.innerHTML = `<b></b><span>${own ? (PR.knife === k ? 'EQUIPPED' : 'OWNED') : K.price + ' COINS'}</span>`; b.querySelector('b').textContent = K.name; b.addEventListener('click', () => { if (!own) { if (PR.coins < K.price) { toast('Not enough coins.'); return; } PR.coins -= K.price; PR.knives[k] = true; toast(K.name + ' bought.'); } PR.knife = k; PR.save(); PR.buildStats(); A.click(1200, 0.1); renderArmory(); }); list.append(b); });
    const K = SP.KNIVES[PR.knife]; det.innerHTML = `<h3></h3><p class="lede">Used by the V quick-knife and by the knife in your weapon wheel. Reach ${K.range.toFixed(1)} m · ${Math.round(60 / K.swing)} swings a minute.</p>`; det.querySelector('h3').textContent = K.name;
    const ab = document.createElement('div'); ab.className = 'aact'; det.append(ab); wheelButtons(ab, 'knife', 'Knife');
    return;
  }
  weaponList().filter(w => SP.WEAP[w.id] && SP.WEAP[w.id].cls === wCls).forEach(wd => {
    const st = SP.WEAP_BASE[wd.id] || SP.WEAP[wd.id]; const own = !!PR.owned[wd.id];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'arow' + (wd.id === wSel ? ' sel' : '') + (own ? ' owned' : '');
    b.innerHTML = `<b></b><span>${own ? (PR.inWheel(wd.id) >= 0 && PR.inWheel(wd.id) < PR.slots ? 'SLOT ' + (PR.inWheel(wd.id) + 1) : 'OWNED') : wd.price + ' COINS'}</span>`; b.querySelector('b').textContent = st.name;
    b.addEventListener('click', () => { wSel = wd.id; renderArmory(); }); list.append(b);
  });
  const wd = weaponList().find(w => w.id === wSel); if (!wd) return; const st = SP.WEAP_BASE[wd.id] || SP.WEAP[wd.id]; const own = !!PR.owned[wd.id]; const L = PR.up[wd.id] || (PR.up[wd.id] = {});
  const kills = (PR.wkills && PR.wkills[wd.id]) || 0;
  det.innerHTML = `<h3></h3><p class="lede"></p>${bars(SP.WEAP[wd.id])}<div class="aact"></div><div class="aups"></div><div class="aatt"></div><div class="acamo"></div>`;
  det.querySelector('h3').textContent = st.name; det.querySelector('p').textContent = (BLURB[st.cls] || '') + (st.rocket ? '' : ` ${st.auto ? (st.defaultMode === 'burst' ? 'Burst' : 'Full auto') : 'Semi-auto'} · ${st.mag} rounds · ${kills} kills.`);
  const act = det.querySelector('.aact');
  if (!own) { const b = document.createElement('button'); b.type = 'button'; b.className = 'abuy'; b.textContent = 'Buy · ' + wd.price; b.addEventListener('click', () => { if (PR.coins < wd.price) { toast('Not enough coins. Finish parts and chapters to earn more.'); return; } PR.coins -= wd.price; PR.owned[wd.id] = true; const si = selSlot !== null ? (PR.wheelPut(wd.id, selSlot), selSlot) : PR.wheelAdd(wd.id); selSlot = null; PR.save(); A.click(1200, 0.12); toast(st.name + (si >= 0 ? ' bought and put in slot ' + (si + 1) + '.' : ' bought. Your wheel is full, so tap a slot above to make room.')); renderArmory(); }); act.append(b); return; }
  wheelButtons(act, wd.id, st.name);
  const ups = det.querySelector('.aups'); ups.innerHTML = '<div class="h4">UPGRADES</div>';
  UPGRADES.forEach(u => {
    if (st.rocket && u.id === 'mag') return; const lv = L[u.id] || 0; const row = document.createElement('div'); row.className = 'aup';
    row.innerHTML = `<span>${u.name} <em>${u.per}</em></span><span class="pips">${'●'.repeat(lv)}${'○'.repeat(3 - lv)}</span>`;
    if (lv < 3) { const c = u.costs[lv]; const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.title = 'Upgrade ' + u.name + ' for ' + c + ' coins'; b.addEventListener('click', () => { if (PR.coins < c) { toast('Not enough coins.'); return; } PR.coins -= c; L[u.id] = lv + 1; PR.save(); PR.buildStats(); A.click(1400, 0.1); toast(st.name + ' ' + u.name.toLowerCase() + ' upgraded.'); renderArmory(); }); row.append(b); }
    else { const m = document.createElement('i'); m.textContent = 'MAX'; row.append(m); }
    ups.append(row);
  });
  if (!st.rocket && st.cls !== 'pistol' || st.cls === 'pistol') {
    const aa = det.querySelector('.aatt'); aa.innerHTML = '<div class="h4">ATTACHMENTS</div>'; const at = PR.att[wd.id] || (PR.att[wd.id] = {}); const ownA = PR.attOwn || (PR.attOwn = {}); const key = (k) => wd.id + ':' + k;
    const buyOr = (k, cost, apply) => { if (!ownA[key(k)] && cost) { if (PR.coins < cost) { toast('Not enough coins.'); return; } PR.coins -= cost; ownA[key(k)] = true; } apply(); PR.save(); PR.buildStats(); A.click(1300, 0.08); renderArmory(); };
    if (!st.rocket && !st.zoom && st.cls !== 'pistol') { const row = document.createElement('div'); row.className = 'aattrow'; row.innerHTML = '<span>Optic</span>'; SP.ATTACH.optic.opts.forEach(([v, n, c]) => { const b = document.createElement('button'); b.type = 'button'; const have = !c || ownA[key('optic:' + v)]; b.className = 'achip sm' + ((at.optic || '') === v ? ' on' : ''); b.textContent = n + (have ? '' : ' · ' + c); b.addEventListener('click', () => buyOr('optic:' + v, have ? 0 : c, () => { at.optic = v || undefined; })); row.append(b); }); aa.append(row); }
    if (!st.rocket) ['sup', 'ext', 'laser'].forEach(k => { const A2 = SP.ATTACH[k]; const have = ownA[key(k)]; const row = document.createElement('div'); row.className = 'aattrow'; row.innerHTML = `<span>${A2.name} <em>${A2.desc}</em></span>`; const b = document.createElement('button'); b.type = 'button'; b.className = 'achip sm' + (at[k] ? ' on' : ''); b.textContent = at[k] ? 'ON' : have ? 'OFF' : 'Buy · ' + A2.cost; b.addEventListener('click', () => buyOr(k, have ? 0 : A2.cost, () => { at[k] = !at[k]; })); row.append(b); aa.append(row); });
  }
  if (!st.rocket) { const cc = det.querySelector('.acamo'); cc.innerHTML = '<div class="h4">CAMOS · UNLOCK WITH KILLS</div>'; const row = document.createElement('div'); row.className = 'acamos'; Object.entries(SP.CAMOS).forEach(([k, C]) => { const open = !C || kills >= C.kills; const b = document.createElement('button'); b.type = 'button'; b.className = 'acam' + ((PR.camo[wd.id] || 'none') === k ? ' on' : '') + (open ? '' : ' lock'); b.title = C ? C.name + (open ? '' : ' · ' + C.kills + ' kills') : 'Factory'; b.style.background = C ? '#' + C.color.toString(16).padStart(6, '0') : '#1d1d1d'; b.innerHTML = open ? '' : '<i>' + C.kills + '</i>'; b.addEventListener('click', () => { if (!open) { toast(C.name + ' unlocks at ' + C.kills + ' kills with this gun.'); return; } PR.camo[wd.id] = k === 'none' ? undefined : k; PR.save(); renderArmory(); }); row.append(b); }); cc.append(row); }
}
window.addEventListener('load', () => {
  document.querySelectorAll('#a-tabs .ctab').forEach(b => b.addEventListener('click', () => { armTab = b.dataset.t; renderArmory(); }));
  $('#a-back').addEventListener('click', () => SP.showScreen(PR.from || 'title'));
});
})();

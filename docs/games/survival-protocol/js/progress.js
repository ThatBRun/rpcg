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
const WEAPONS = [
  { id: 'm4', price: 0, blurb: 'Standard-issue rifle. Accurate and quick.' },
  { id: 'pistol', price: 0, blurb: 'Sidearm. Fast to draw.' },
  { id: 'sup', price: 500, blurb: 'Silenced M4. Enemies hear it far less.' },
  { id: 'ak', price: 600, blurb: 'Hits harder than the M4, kicks harder too.' },
  { id: 'shotgun', price: 800, blurb: 'Semi-auto shotgun. Devastating up close.' },
  { id: 'dmr', price: 1000, blurb: 'Scoped marksman rifle. One shot, one kill at range.' },
  { id: 'at4', price: 1200, blurb: 'Rocket launcher. Use it on vehicles and groups.' },
];
const UPGRADES = [
  { id: 'dmg', name: 'Damage', per: '+12%', costs: [250, 500, 900] },
  { id: 'mag', name: 'Magazine', per: '+25%', costs: [200, 400, 700] },
  { id: 'rel', name: 'Reload', per: '-12%', costs: [200, 400, 700] },
];
const SLOT_COSTS = { 4: 700, 6: 1200 }; // upgrade from 4 to 6, from 6 to 8

/* ---------------- profile ---------------- */
const PR = SP.Progress = { coins: 0, spent: 0, skills: {}, owned: { m4: true, pistol: true }, up: {}, wheel: [], slots: 4, chapterPaid: {}, partPaid: {}, migrated: false };
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) Object.assign(PR, s); } catch (e) { }
PR.save = () => { try { const o = {}; ['coins', 'spent', 'skills', 'owned', 'up', 'wheel', 'slots', 'chapterPaid', 'partPaid', 'migrated'].forEach(k => o[k] = PR[k]); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } };
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
  if (!PR.partPaid[key]) { PR.partPaid[key] = true; out.push('+1 SKILL POINT'); G.hud.feed('+1 SKILL POINT', 'gold'); }
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
  }
};
PR.maxHp = () => 100 + (SP.skill('tough') ? 25 : 0) + (SP.skill('armor') ? 25 : 0);

/* called by the part loader */
PR.beforeLoad = function () { PR.migrate(); PR.buildStats(); };
PR.afterLoadout = function (P, part) {
  P.maxHp = PR.maxHp(); P.hp = P.maxHp; P.secondWind = false; P.dashCd = 0; SP.slowmoT = 0; SP.slowCd = 0;
  const lo = part.loadout || ['m4'];
  const stealthPistol = lo.length === 1 && lo[0] === 'pistol';
  if (lo.length && !stealthPistol && !part.noExtras) {
    const room = PR.slots - Object.keys(P.inv).length;
    PR.wheel.filter(w => PR.owned[w] && !P.inv[w] && SP.WEAP[w]).slice(0, Math.max(0, room)).forEach(w => P.give(w));
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
W.build = function () {
  const P = SP.P, el = wheelEl(), ring = el.querySelector('.wslots'); ring.innerHTML = '';
  const inv = Object.keys(P.inv); const n = Math.max(PR.slots, inv.length); W.list = [];
  for (let i = 0; i < n; i++) {
    const w = inv[i]; const b = document.createElement('button'); b.type = 'button'; b.className = 'wslot' + (w ? '' : ' empty') + (w === P.cur ? ' cur' : '');
    const [x, y] = slotPos(i, n); b.style.left = (50 + x * 37) + '%'; b.style.top = (50 + y * 37) + '%';
    if (w) { const s = P.inv[w]; b.innerHTML = `<span class="k">${i + 1}</span><b></b><span class="am"></span>`; b.querySelector('b').textContent = SP.WEAP[w].name; b.querySelector('.am').textContent = SP.WEAP[w].rocket ? s.mag + s.res + ' ROCKETS' : s.mag + ' / ' + s.res; }
    else b.innerHTML = '<span class="k">' + (i + 1) + '</span><b>EMPTY</b><span class="am">BUY WEAPONS IN THE ARMORY</span>';
    const idx = i; b.addEventListener('click', e => { e.preventDefault(); if (!w) return; W.sel = idx; W.close(true); });
    b.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); if (!w) { W.close(false); return; } W.sel = idx; W.close(true); }, { passive: false });
    ring.append(b); W.list.push({ w, b });
  }
  const lockedN = 8 - n; el.querySelector('.wlocked').textContent = lockedN > 0 ? lockedN + ' more slots in the Armory' : '';
  W.sel = inv.indexOf(P.cur); W.mark();
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
  } else {
    body.className = 'awpn';
    const sl = document.createElement('div'); sl.className = 'aslots';
    const next = PR.slots < 8 ? SLOT_COSTS[PR.slots] : null;
    sl.innerHTML = `<div><b>Wheel slots</b><span>${PR.slots} of 8</span></div>`;
    for (let i = 0; i < 8; i++) { const d = document.createElement('i'); d.className = i < PR.slots ? 'on' : ''; sl.append(d); }
    if (next) { const b = document.createElement('button'); b.type = 'button'; b.className = 'abuy'; b.textContent = `Add 2 slots · ${next} coins`; b.addEventListener('click', () => { if (PR.coins < next) { toast('Not enough coins. Finish chapters to earn more.'); return; } PR.coins -= next; PR.slots += 2; PR.save(); A.click(1200, 0.12); toast('Weapon wheel now has ' + PR.slots + ' slots.'); renderArmory(); }); sl.append(b); }
    body.append(sl);
    const note = document.createElement('p'); note.className = 'lede'; note.textContent = 'Each part gives you its own weapons first. Weapons you add to the wheel fill the empty slots. Hold F in game to open the wheel (the WHEEL button on mobile). New weapons join the wheel at the start of the next part.'; body.append(note);
    const grid = document.createElement('div'); grid.className = 'agrid';
    WEAPONS.forEach(wd => {
      const st = SP.WEAP_BASE[wd.id] || SP.WEAP[wd.id]; if (!st) return; const owned = !!PR.owned[wd.id]; const L = PR.up[wd.id] || (PR.up[wd.id] = {});
      const card = document.createElement('div'); card.className = 'acard' + (owned ? ' owned' : '');
      card.innerHTML = '<div class="aw"><b></b><span></span></div><p></p><div class="aups"></div><div class="aact"></div>';
      card.querySelector('b').textContent = st.name; card.querySelector('.aw span').textContent = owned ? (wd.price ? 'OWNED' : 'STANDARD ISSUE') : wd.price + ' COINS'; card.querySelector('p').textContent = wd.blurb;
      const act = card.querySelector('.aact');
      if (!owned) { const b = document.createElement('button'); b.type = 'button'; b.className = 'abuy'; b.textContent = 'Buy · ' + wd.price; b.addEventListener('click', () => { if (PR.coins < wd.price) { toast('Not enough coins. Finish chapters to earn more.'); return; } PR.coins -= wd.price; PR.owned[wd.id] = true; if (!PR.wheel.includes(wd.id)) PR.wheel.push(wd.id); PR.save(); A.click(1200, 0.12); toast(st.name + ' bought and added to your wheel.'); renderArmory(); }); act.append(b); }
      else if (wd.price) { const inW = PR.wheel.includes(wd.id); const b = document.createElement('button'); b.type = 'button'; b.className = 'atog' + (inW ? ' on' : ''); b.textContent = inW ? 'In wheel ✓' : 'Add to wheel'; b.addEventListener('click', () => { const i = PR.wheel.indexOf(wd.id); if (i >= 0) PR.wheel.splice(i, 1); else PR.wheel.push(wd.id); PR.save(); renderArmory(); }); act.append(b); }
      if (owned) {
        const ups = card.querySelector('.aups');
        UPGRADES.forEach(u => {
          if (st.rocket && u.id === 'mag') return; const lv = L[u.id] || 0; const row = document.createElement('div'); row.className = 'aup';
          row.innerHTML = `<span>${u.name} <em>${u.per}</em></span><span class="pips">${'●'.repeat(lv)}${'○'.repeat(3 - lv)}</span>`;
          if (lv < 3) { const c = u.costs[lv]; const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.title = 'Upgrade ' + u.name + ' for ' + c + ' coins'; b.addEventListener('click', () => { if (PR.coins < c) { toast('Not enough coins. Finish chapters to earn more.'); return; } PR.coins -= c; L[u.id] = lv + 1; PR.save(); PR.buildStats(); A.click(1400, 0.1); toast(st.name + ' ' + u.name.toLowerCase() + ' upgraded.'); renderArmory(); }); row.append(b); }
          else { const m = document.createElement('i'); m.textContent = 'MAX'; row.append(m); }
          ups.append(row);
        });
      }
      grid.append(card);
    });
    body.append(grid);
  }
}
window.addEventListener('load', () => {
  document.querySelectorAll('#a-tabs .ctab').forEach(b => b.addEventListener('click', () => { armTab = b.dataset.t; renderArmory(); }));
  $('#a-back').addEventListener('click', () => SP.showScreen(PR.from || 'title'));
});
})();

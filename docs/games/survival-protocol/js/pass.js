/* Survival Protocol — SEASON 1 PASS "Operation Sandstorm"
   100 tiers, a free track and an Elite track (bought with in-game coins, never real money).
   Rewards: coins, skill points, gun wraps (patterned, animated), operator skins (your arms and gloves),
   knives, guns, titles and double-XP boosts. XP comes from kills, parts, chapters, Battle Royale, Horde and playtime. */
'use strict';
(function () {
const T = THREE; const $ = s => document.querySelector(s);
const PR = SP.Progress; const F = () => SP.Features || {};
const SEASON = { n: 1, name: 'Operation Sandstorm', elitePrice: 4000, tierPrice: 400 };
PR.pass = Object.assign({ xp: 0, tier: 0, elite: false, claimed: {}, skin: 'default', title: '', boostT: 0, skins: { default: true }, titles: {}, ch: {}, chDone: {}, lm: {} }, PR.pass || {});
PR.pass.ch = PR.pass.ch || {}; PR.pass.chDone = PR.pass.chDone || {}; PR.pass.lm = PR.pass.lm || {};
PR.wraps = PR.wraps || {};
const PS = PR.pass;

/* ---------------- gun wraps: procedural canvas textures ---------------- */
const WRAPS = {
  carbon: { name: 'Carbon Fibre', css: 'repeating-linear-gradient(45deg,#1a1a1c 0 4px,#2c2c30 4px 8px)' },
  digiblue: { name: 'Digital Blue', css: 'linear-gradient(90deg,#1c3a6a,#3a6ab0,#9ab8e0)' },
  hex: { name: 'Hex Grid', css: 'radial-gradient(circle,#3a5a3a 30%,#1a2a1a 32%)' },
  zebra: { name: 'Zebra', css: 'repeating-linear-gradient(120deg,#eee 0 6px,#111 6px 12px)' },
  flames: { name: 'Hot Rod Flames', css: 'linear-gradient(0deg,#1a0a04,#c83a0a,#ffb02a)', glow: true },
  ice: { name: 'Glacier', css: 'linear-gradient(135deg,#dff4ff,#7ac0e8,#e8f8ff)' },
  lava: { name: 'Magma', css: 'linear-gradient(135deg,#1a0a06,#ff5a1a,#1a0a06)', glow: true },
  neon: { name: 'Neon Grid', css: 'linear-gradient(90deg,#0a0a1a,#ff2ad4,#2af0ff)', glow: true },
  galaxy: { name: 'Galaxy', css: 'radial-gradient(circle at 30% 30%,#a07aff,#1a0a3a 60%,#05020f)', glow: true },
  dragon: { name: 'Dragon Scale', css: 'radial-gradient(circle,#2a8a4a 40%,#0a2a14 42%)' },
  circuit: { name: 'Circuit', css: 'linear-gradient(90deg,#0a1a12,#2aff8a,#0a1a12)', glow: true },
  sakura: { name: 'Sakura', css: 'radial-gradient(circle,#ffc8dc 30%,#f4f0f2 32%)' },
  damascus: { name: 'Damascus', css: 'repeating-radial-gradient(circle,#8a8a90 0 3px,#4a4a50 3px 6px)', metal: true },
  toxic: { name: 'Toxic', css: 'linear-gradient(45deg,#1a1a0a,#b8ff2a,#1a1a0a)', glow: true },
  aurora: { name: 'Aurora', css: 'linear-gradient(90deg,#0a2a3a,#2affb0,#a02aff)', glow: true },
  diamond: { name: 'Diamond', css: 'linear-gradient(135deg,#e8f8ff,#9ad8ff,#ffffff,#b8e8ff)', metal: true },
  sandstorm: { name: 'Sandstorm (Season 1)', css: 'linear-gradient(135deg,#c8a060,#8a6030,#e8c890)' },
  jackal: { name: 'Jackal Gold', css: 'linear-gradient(135deg,#1a1408,#d4af37,#1a1408)', metal: true },
};
const texCache = {};
function wrapTexture(k) {
  if (texCache[k]) return texCache[k]; const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const R = (a, b) => a + Math.random() * (b - a);
  const fill = col => { x.fillStyle = col; x.fillRect(0, 0, S, S); };
  switch (k) {
    case 'carbon': fill('#18181a'); for (let i = 0; i < S; i += 8) for (let j = 0; j < S; j += 8) { x.fillStyle = ((i + j) / 8) % 2 ? '#2a2a2e' : '#1c1c1f'; x.fillRect(i, j, 8, 4); x.fillStyle = ((i + j) / 8) % 2 ? '#202024' : '#303036'; x.fillRect(i, j + 4, 8, 4); } break;
    case 'digiblue': fill('#1c3a6a'); for (let n = 0; n < 900; n++) { x.fillStyle = ['#2a5a9a', '#9ab8e0', '#12284a', '#3a6ab0'][n % 4]; x.fillRect((R(0, S) / 8 | 0) * 8, (R(0, S) / 8 | 0) * 8, 8 * (1 + (n % 3)), 8); } break;
    case 'hex': fill('#1a2a1a'); x.strokeStyle = '#4a8a4a'; x.lineWidth = 2; for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) { const cx = i * 24 + (j % 2) * 12, cy = j * 21; x.beginPath(); for (let a = 0; a < 6; a++) x.lineTo(cx + Math.cos(a * 1.047) * 11, cy + Math.sin(a * 1.047) * 11); x.closePath(); x.stroke(); } break;
    case 'zebra': fill('#eeeeee'); x.fillStyle = '#111'; for (let i = -S; i < S * 2; i += 26) { x.beginPath(); x.moveTo(i, 0); for (let y = 0; y <= S; y += 16) x.lineTo(i + Math.sin(y * 0.05 + i) * 10 + y * 0.4, y); for (let y = S; y >= 0; y -= 16) x.lineTo(i + 10 + Math.sin(y * 0.05 + i) * 10 + y * 0.4, y); x.fill(); } break;
    case 'flames': fill('#120804'); for (let n = 0; n < 40; n++) { const g = x.createLinearGradient(0, S, 0, 0); g.addColorStop(0, '#ffde5a'); g.addColorStop(0.5, '#ff5a0a'); g.addColorStop(1, 'rgba(120,10,0,0)'); x.fillStyle = g; const bx = R(0, S), w = R(14, 40); x.beginPath(); x.moveTo(bx - w, S); x.quadraticCurveTo(bx + R(-30, 30), S * 0.5, bx + R(-10, 10), R(0, S * 0.4)); x.quadraticCurveTo(bx + R(-20, 20), S * 0.6, bx + w, S); x.fill(); } break;
    case 'ice': fill('#cfeaf8'); x.strokeStyle = 'rgba(255,255,255,0.9)'; for (let n = 0; n < 60; n++) { x.lineWidth = R(0.5, 2); x.beginPath(); let px = R(0, S), py = R(0, S); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += R(-40, 40); py += R(-40, 40); x.lineTo(px, py); } x.stroke(); } x.fillStyle = 'rgba(90,160,210,0.25)'; for (let n = 0; n < 30; n++) x.fillRect(R(0, S), R(0, S), R(10, 50), R(10, 50)); break;
    case 'lava': fill('#140804'); for (let n = 0; n < 120; n++) { x.strokeStyle = `rgba(255,${R(60, 160) | 0},20,${R(0.4, 0.9)})`; x.lineWidth = R(1, 4); x.beginPath(); let px = R(0, S), py = R(0, S); x.moveTo(px, py); for (let k = 0; k < 3; k++) { px += R(-30, 30); py += R(-30, 30); x.lineTo(px, py); } x.stroke(); } break;
    case 'neon': fill('#07071a'); x.lineWidth = 2; for (let i = 0; i <= S; i += 32) { x.strokeStyle = '#ff2ad4'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke(); x.strokeStyle = '#2af0ff'; x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); } break;
    case 'galaxy': { const g = x.createRadialGradient(80, 90, 10, 128, 128, 200); g.addColorStop(0, '#a07aff'); g.addColorStop(0.4, '#3a1a7a'); g.addColorStop(1, '#05020f'); x.fillStyle = g; x.fillRect(0, 0, S, S); for (let n = 0; n < 260; n++) { x.fillStyle = `rgba(255,255,255,${R(0.3, 1)})`; x.fillRect(R(0, S), R(0, S), R(1, 2.5), R(1, 2.5)); } break; }
    case 'dragon': fill('#0a2a14'); for (let j = 0; j < 18; j++) for (let i = 0; i < 18; i++) { const cx = i * 16 + (j % 2) * 8, cy = j * 14; const g = x.createRadialGradient(cx, cy - 4, 1, cx, cy, 10); g.addColorStop(0, '#5ad47a'); g.addColorStop(1, '#0e3a1c'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 9, 0, Math.PI); x.fill(); } break;
    case 'circuit': fill('#06140c'); x.strokeStyle = '#2aff8a'; x.lineWidth = 1.6; for (let n = 0; n < 70; n++) { let px = (R(0, S) / 16 | 0) * 16, py = (R(0, S) / 16 | 0) * 16; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { if (Math.random() < 0.5) px += (Math.random() < 0.5 ? -1 : 1) * 32; else py += (Math.random() < 0.5 ? -1 : 1) * 32; x.lineTo(px, py); } x.stroke(); x.fillStyle = '#9affc8'; x.fillRect(px - 2, py - 2, 4, 4); } break;
    case 'sakura': fill('#f6eef2'); for (let n = 0; n < 70; n++) { const cx = R(0, S), cy = R(0, S), r = R(4, 9); x.fillStyle = ['#ffb8d0', '#ff8ab0', '#ffd8e6'][n % 3]; for (let p = 0; p < 5; p++) { x.beginPath(); x.ellipse(cx + Math.cos(p * 1.256) * r, cy + Math.sin(p * 1.256) * r, r * 0.7, r * 0.45, p * 1.256, 0, 6.28); x.fill(); } } x.strokeStyle = '#5a3a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 200); x.bezierCurveTo(80, 150, 160, 220, 256, 120); x.stroke(); break;
    case 'damascus': fill('#5a5a60'); for (let i = 0; i < 40; i++) { x.strokeStyle = i % 2 ? '#9a9aa2' : '#3a3a40'; x.lineWidth = 3; x.beginPath(); for (let px = 0; px <= S; px += 8) x.lineTo(px, i * 7 + Math.sin(px * 0.05 + i * 0.7) * 12); x.stroke(); } break;
    case 'toxic': fill('#141408'); for (let n = 0; n < 60; n++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); x.fillStyle = `rgba(${R(140, 200) | 0},255,${R(20, 60) | 0},${R(0.5, 0.95)})`; x.beginPath(); x.arc(R(0, S), R(0, S), R(4, 22), 0, 6.28); x.fill(); } break;
    case 'aurora': { fill('#061420'); for (let b = 0; b < 5; b++) { const g = x.createLinearGradient(0, 0, S, 0); g.addColorStop(0, 'rgba(40,255,180,0)'); g.addColorStop(0.5, b % 2 ? 'rgba(40,255,180,0.6)' : 'rgba(160,40,255,0.55)'); g.addColorStop(1, 'rgba(40,255,180,0)'); x.fillStyle = g; x.beginPath(); for (let px = 0; px <= S; px += 8) x.lineTo(px, 40 + b * 40 + Math.sin(px * 0.03 + b) * 18); for (let px = S; px >= 0; px -= 8) x.lineTo(px, 70 + b * 40 + Math.sin(px * 0.03 + b + 1) * 18); x.fill(); } break; }
    case 'diamond': { fill('#c8ecff'); for (let n = 0; n < 50; n++) { x.fillStyle = `rgba(255,255,255,${R(0.3, 0.9)})`; const cx = R(0, S), cy = R(0, S), r = R(8, 26); x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r * 0.6, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r * 0.6, cy); x.closePath(); x.fill(); } break; }
    case 'sandstorm': fill('#b89060'); for (let n = 0; n < 500; n++) { x.fillStyle = ['#d8b880', '#8a6030', '#e8d0a0', '#a07848'][n % 4]; x.beginPath(); x.ellipse(R(0, S), R(0, S), R(6, 26), R(2, 6), R(-0.3, 0.3), 0, 6.28); x.fill(); } break;
    case 'jackal': { fill('#141008'); x.strokeStyle = '#d4af37'; x.lineWidth = 2; for (let i = -S; i < S * 2; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke(); } for (let n = 0; n < 40; n++) { x.fillStyle = 'rgba(255,220,120,0.6)'; x.fillRect(R(0, S), R(0, S), 2, 2); } break; }
  }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 3); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return texCache[k] = t;
}
SP.wrapMat = function (C) {
  const k = C.key; const W = WRAPS[k] || {}; const m = new T.MeshStandardMaterial({ map: wrapTexture(k), roughness: W.metal ? 0.28 : 0.55, metalness: W.metal ? 0.85 : 0.15 });
  if (W.glow) { m.emissive = new T.Color(1, 1, 1); m.emissiveMap = m.map; m.emissiveIntensity = 0.55; }
  return m;
};
Object.entries(WRAPS).forEach(([k, w]) => { SP.CAMOS[k] = { name: w.name, color: 0x888888, pass: true, tex: k, key: k, css: w.css, metal: !!w.metal }; });

/* ---------------- operator skins (your arms + gloves) ---------------- */
const SKINS = {
  default: { name: 'Standard Issue', sleeve: null, glove: 0x2e2a26 },
  recruit: { name: 'Desert Recruit', sleeve: 0xb49a6c, glove: 0x6a5232 },
  urban: { name: 'Urban Ops', sleeve: 0x5a5e66, glove: 0x1a1a1c },
  arctic: { name: 'Arctic Shadow', sleeve: 0xe4ecf0, glove: 0xb8c4cc },
  viper: { name: 'Jungle Viper', sleeve: 0x2e4a22, glove: 0x14200e, wrap: 'dragon' },
  raven: { name: 'Night Raven', sleeve: 0x16161c, glove: 0x0a0a0c },
  crimson: { name: 'Crimson Guard', sleeve: 0x7a1a1a, glove: 0x2a0a0a },
  ghost: { name: 'Ghost', sleeve: 0x3a3e42, glove: 0x101012, wrap: 'carbon' },
  neon: { name: 'Neon Runner', sleeve: 0x1a1a2a, glove: 0xff2ad4, wrap: 'neon' },
  royal: { name: 'Royal Guard', sleeve: 0xe8d8b8, glove: 0xb08a30 },
  frost: { name: 'Frostbite', sleeve: 0x9ad8ff, glove: 0xe8f8ff, wrap: 'ice' },
  inferno: { name: 'Inferno', sleeve: 0x2a0a04, glove: 0xff6a1a, wrap: 'lava' },
  sandstorm: { name: 'Sandstorm Commando', sleeve: 0xc8a060, glove: 0x5a4020, wrap: 'sandstorm' },
  jackal: { name: 'The Jackal', sleeve: 0x141008, glove: 0xd4af37, wrap: 'jackal' },
};
SP.applySkin = function (m, part) {
  const S = SKINS[PS.skin] || SKINS.default;
  if (part === 'glove') { m.color = new T.Color(SP.lin ? SP.lin(S.glove) : S.glove); return; }
  if (S.wrap) { m.map = wrapTexture(S.wrap); m.color = new T.Color(1, 1, 1); const W = WRAPS[S.wrap]; if (W && W.glow) { m.emissive = new T.Color(1, 1, 1); m.emissiveMap = m.map; m.emissiveIntensity = 0.35; } }
  else if (S.sleeve != null) { m.color = new T.Color(SP.lin ? SP.lin(S.sleeve) : S.sleeve); }
  m.needsUpdate = true;
};
function refreshVM() { const P = SP.P; if (P && P.cur && SP.buildViewModel && SP.state === 'play') { try { SP.buildViewModel(P.cur); } catch (e) { } } }

/* ---------------- titles ---------------- */
const TITLES = { recruit: 'Recruit', sharpshooter: 'Sharpshooter', chest: 'Chest Hunter', squad: 'Squad Leader', zone: 'Zone Runner', builder: 'Master Builder', survivor: 'Survivor', hunter: 'Jackal Hunter', elite: 'Elite Operator', sandstorm: 'Eye of the Sandstorm', legend: 'Legend' };

/* ---------------- the 100 tiers ---------------- */
const FIXED = {
  1: [{ t: 'skin', id: 'recruit' }, { t: 'skin', id: 'urban' }], 2: [{ t: 'coins', n: 300 }, { t: 'wrap', id: 'carbon' }], 3: [{ t: 'title', id: 'recruit' }, { t: 'boost', n: 30 }],
  5: [{ t: 'sp', n: 1 }, { t: 'wrap', id: 'digiblue' }], 10: [{ t: 'wrap', id: 'hex' }, { t: 'skin', id: 'raven' }], 12: [{ t: 'coins', n: 500 }, { t: 'knife', id: 'bayonet' }],
  15: [{ t: 'sp', n: 1 }, { t: 'wrap', id: 'zebra' }], 18: [{ t: 'title', id: 'sharpshooter' }, { t: 'gun', id: 'vector' }], 20: [{ t: 'skin', id: 'arctic' }, { t: 'wrap', id: 'flames' }],
  25: [{ t: 'coins', n: 1000 }, { t: 'knife', id: 'karambit' }], 28: [{ t: 'title', id: 'chest' }, { t: 'wrap', id: 'ice' }], 30: [{ t: 'sp', n: 2 }, { t: 'skin', id: 'crimson' }],
  35: [{ t: 'wrap', id: 'sakura' }, { t: 'wrap', id: 'lava' }], 38: [{ t: 'title', id: 'zone' }, { t: 'gun', id: 'scar' }], 40: [{ t: 'skin', id: 'viper' }, { t: 'wrap', id: 'neon' }],
  45: [{ t: 'coins', n: 1500 }, { t: 'knife', id: 'tomahawk' }], 48: [{ t: 'title', id: 'builder' }, { t: 'wrap', id: 'circuit' }], 50: [{ t: 'sp', n: 3 }, { t: 'skin', id: 'ghost' }],
  55: [{ t: 'wrap', id: 'damascus' }, { t: 'wrap', id: 'galaxy' }], 58: [{ t: 'title', id: 'squad' }, { t: 'gun', id: 'awm' }], 60: [{ t: 'skin', id: 'royal' }, { t: 'skin', id: 'neon' }],
  65: [{ t: 'coins', n: 2000 }, { t: 'wrap', id: 'toxic' }], 68: [{ t: 'title', id: 'survivor' }, { t: 'knife', id: 'machete' }], 70: [{ t: 'sp', n: 3 }, { t: 'skin', id: 'frost' }],
  75: [{ t: 'wrap', id: 'dragon' }, { t: 'wrap', id: 'aurora' }], 78: [{ t: 'title', id: 'hunter' }, { t: 'gun', id: 'barrett' }], 80: [{ t: 'skin', id: 'inferno' }, { t: 'wrap', id: 'diamond' }],
  85: [{ t: 'coins', n: 2500 }, { t: 'boost', n: 120 }], 88: [{ t: 'title', id: 'elite' }, { t: 'gun', id: 'm32' }], 90: [{ t: 'sp', n: 5 }, { t: 'skin', id: 'sandstorm' }],
  95: [{ t: 'wrap', id: 'sandstorm' }, { t: 'title', id: 'sandstorm' }], 100: [{ t: 'title', id: 'legend' }, { t: 'skin', id: 'jackal' }, { t: 'wrap', id: 'jackal' }, { t: 'coins', n: 10000 }, { t: 'sp', n: 10 }],
};
const TIERS = [];
for (let i = 1; i <= 100; i++) {
  let free, elite;
  if (FIXED[i]) { free = FIXED[i][0]; elite = FIXED[i].slice(1); }
  else { const r = i % 4; free = r === 0 ? { t: 'sp', n: 1 } : r === 2 ? { t: 'boost', n: 15 } : { t: 'coins', n: 150 + Math.floor(i / 10) * 50 }; elite = [i % 3 === 0 ? { t: 'sp', n: 1 } : { t: 'coins', n: 300 + Math.floor(i / 10) * 75 }]; }
  TIERS.push({ n: i, free, elite: Array.isArray(elite) ? elite : [elite] });
}
const xpFor = n => 1000 + n * 25; // XP to go from tier n to n+1
function rewardName(r) {
  switch (r.t) { case 'coins': return r.n.toLocaleString() + ' coins'; case 'sp': return r.n + ' skill point' + (r.n > 1 ? 's' : ''); case 'boost': return 'Double XP · ' + r.n + ' min'; case 'wrap': return (WRAPS[r.id] || {}).name + ' wrap'; case 'skin': return (SKINS[r.id] || {}).name + ' skin'; case 'title': return '"' + TITLES[r.id] + '" title'; case 'knife': return ((SP.KNIVES || {})[r.id] || { name: r.id }).name; case 'gun': return ((SP.WEAP || {})[r.id] || { name: r.id }).name; }
  return '';
}
function rewardIcon(r) { return { coins: '◆', sp: '★', boost: '2×', wrap: '▦', skin: '☗', title: '❝', knife: '🗡', gun: '⌖' }[r.t] || '•'; }
function grant(r) {
  switch (r.t) {
    case 'coins': PR.coins += r.n; break; case 'sp': PR.bonusSP = (PR.bonusSP || 0) + r.n; break; case 'boost': PS.boostT = (PS.boostT || 0) + r.n * 60; break;
    case 'wrap': PR.wraps[r.id] = true; break; case 'skin': PS.skins[r.id] = true; break; case 'title': PS.titles[r.id] = true; break;
    case 'knife': PR.knives = PR.knives || {}; PR.knives[r.id] = true; break; case 'gun': PR.owned[r.id] = true; if (PR.wheelAdd) PR.wheelAdd(r.id); break;
  }
}
function claimAll(silent) {
  let got = [];
  for (const T2 of TIERS) { if (T2.n > PS.tier) break; const kf = T2.n + 'f', ke = T2.n + 'e';
    if (!PS.claimed[kf]) { PS.claimed[kf] = 1; grant(T2.free); got.push(T2.free); }
    if (PS.elite && !PS.claimed[ke]) { PS.claimed[ke] = 1; T2.elite.forEach(r => { grant(r); got.push(r); }); } }
  if (got.length) { PR.save(); if (!silent) { const shown = got.slice(-3).map(rewardName).join(' · '); F().toast ? F().toast('SEASON PASS REWARD', shown + (got.length > 3 ? ' +' + (got.length - 3) + ' more' : '')) : 0; } }
  return got;
}

/* ---------------- XP ---------------- */
let popT = null;
SP.addXP = function (n, why) {
  if (!n || PS.tier >= 100) return 0; const boost = PS.boostT > 0 ? 2 : 1; n = Math.round(n * boost); PS.xp += n; let up = 0;
  while (PS.tier < 100 && PS.xp >= xpFor(PS.tier)) { PS.xp -= xpFor(PS.tier); PS.tier++; up++; }
  if (PS.tier >= 100) PS.xp = 0;
  const el = $('#xppop'); if (el) { el.textContent = '+' + n + ' XP' + (why ? ' · ' + why : '') + (boost > 1 ? ' (2×)' : ''); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(popT); popT = setTimeout(() => el.classList.remove('show'), 1600); }
  if (up) { F().toast && F().toast('SEASON TIER ' + PS.tier, up > 1 ? 'Up ' + up + ' tiers' : 'New rewards unlocked'); SP.Audio && SP.Audio.click && SP.Audio.click(1320, 0.15); claimAll(false); }
  PR.save(); hudBadge(); return n;
};
/* ---------------- season challenges (1.2) ---------------- */
const CHAL = [
  ['chests', 25, 3000, 'Open 25 chests in Battle Royale'], ['goldChests', 3, 3000, 'Open 3 golden chests'], ['floorLoot', 40, 2500, 'Pick up 40 items off the floor'],
  ['brKills', 25, 5000, 'Eliminate 25 enemies in Battle Royale'], ['brHeadshots', 10, 3500, 'Get 10 headshot eliminations in Battle Royale'], ['revives', 5, 2500, 'Revive 5 squadmates'],
  ['reboots', 3, 3000, 'Reboot 3 squadmates at a reboot van'], ['launches', 5, 2000, 'Fly off a launch pad 5 times'], ['drops', 2, 3500, 'Open 2 supply drops'],
  ['landmarks', 20, 5000, 'Visit 20 different named landmarks on Isla Corona'], ['brTop10', 5, 4000, 'Place in the top 10 five times'], ['brWins', 1, 8000, 'Win a Battle Royale match'],
  ['brMatches', 10, 3000, 'Play 10 Battle Royale matches'], ['parts', 10, 4000, 'Complete 10 story parts'], ['storyKills', 150, 4000, 'Defeat 150 enemies in the story'], ['hordeWaves', 20, 3000, 'Clear 20 Horde waves'],
];
function track(k, n = 1) {
  if (k.startsWith('landmarks:')) { const nm = k.slice(10); if (PS.lm[nm]) return; PS.lm[nm] = 1; k = 'landmarks'; PS.ch[k] = Object.keys(PS.lm).length; }
  else PS.ch[k] = (PS.ch[k] || 0) + n;
  const c = CHAL.find(c => c[0] === k); if (!c || PS.chDone[k]) { PR.save(); return; }
  if (PS.ch[k] >= c[1]) { PS.chDone[k] = true; F().toast && F().toast('CHALLENGE COMPLETE', c[3]); SP.addXP(c[2], 'CHALLENGE'); } else PR.save();
}
function chalHTML() {
  const done = CHAL.filter(c => PS.chDone[c[0]]).length;
  return `<div class="h4">Season challenges · ${done} of ${CHAL.length}</div><div class="pchal">${CHAL.map(c => { const v = Math.min(c[1], PS.ch[c[0]] || 0), ok = PS.chDone[c[0]]; return `<div class="pc${ok ? ' ok' : ''}"><span>${c[3]}</span><i><u style="width:${v / c[1] * 100}%"></u></i><b>${ok ? '✓' : v + '/' + c[1]}</b><em>${c[2].toLocaleString()} XP</em></div>`; }).join('')}</div>`;
}
const ok0 = SP.onKilled; SP.onKilled = function (u, source, head) { const r = ok0 && ok0.apply(this, arguments); if (source === 'player' && !(SP.BR && SP.BR.on)) track('storyKills'); if (source === 'player') SP.addXP(SP.BR && SP.BR.on ? (head ? 220 : 160) : (head ? 150 : 100), head ? 'HEADSHOT' : 'KILL'); return r; };
const opc = F().onPartComplete; if (SP.Features) SP.Features.onPartComplete = function () { const r = opc && opc.apply(this, arguments); SP.addXP(600, 'PART COMPLETE'); track('parts'); return r; };
SP.onBREnd = (win, place, kills) => { const x = SP.addXP((51 - place) * 40 + (win ? 3000 : place <= 10 ? 600 : 0), win ? 'VICTORY' : 'PLACED #' + place); if (SP.BR) SP.BR.passXP = x || 0; };
let lastPlay = 0; setInterval(() => { if (SP.state === 'play') { lastPlay++; if (PS.boostT > 0) PS.boostT = Math.max(0, PS.boostT - 30); if (lastPlay % 2 === 0) SP.addXP(25, 'PLAYTIME'); } }, 30000);

/* ---------------- UI ---------------- */
function hudBadge() { const b = $('#btn-pass'); if (b) { b.innerHTML = '<span class="pnew">NEW</span>Season Pass · Tier ' + PS.tier + (PS.elite ? ' · Elite' : ''); } ['#p-pass', '#mode-pass', '#bl-pass'].forEach(s => { const e = $(s); if (e) e.textContent = 'Season Pass · Tier ' + PS.tier; }); const rl = $('#rankline'); if (rl && PS.title && TITLES[PS.title] && !rl.textContent.includes('"')) rl.textContent += ' · "' + TITLES[PS.title] + '"'; }
function renderPass() {
  const el = $('#passbody'); const need = xpFor(PS.tier);
  $('#pass-head').innerHTML = `<div class="ph"><span class="eyebrow">SEASON ${SEASON.n} · ${SEASON.name.toUpperCase()}</span><b>TIER ${PS.tier}<small> / 100</small></b><div class="pxp"><i style="width:${PS.tier >= 100 ? 100 : PS.xp / need * 100}%"></i></div><span class="pxpt">${PS.tier >= 100 ? 'Season complete' : PS.xp.toLocaleString() + ' / ' + need.toLocaleString() + ' XP to tier ' + (PS.tier + 1)}${PS.boostT > 0 ? ' · DOUBLE XP ' + Math.ceil(PS.boostT / 60) + ' min' : ''}</span></div>
    <div class="pact"><span class="pcoins">◆ ${PR.coins.toLocaleString()} coins</span>${PS.elite ? '<span class="pel">ELITE PASS ACTIVE</span>' : `<button class="mb pbuy" id="pass-elite" type="button">Unlock Elite · ${SEASON.elitePrice.toLocaleString()} coins</button>`}${PS.tier < 100 ? `<button class="mb pbuy2" id="pass-tier" type="button">Buy a tier · ${SEASON.tierPrice} coins</button>` : ''}</div>`;
  const rows = TIERS.map(T2 => { const reached = T2.n <= PS.tier; const card = (r, kind) => `<div class="pr ${kind}${reached && (kind === 'free' || PS.elite) ? ' got' : ''}${kind === 'elite' && !PS.elite ? ' lock' : ''}"><em>${rewardIcon(r)}</em><span>${rewardName(r)}</span></div>`;
    return `<div class="pt${reached ? ' done' : ''}${T2.n === PS.tier + 1 ? ' next' : ''}${FIXED[T2.n] ? ' big' : ''}"><i>${T2.n}</i>${card(T2.free, 'free')}${T2.elite.map(r => card(r, 'elite')).join('')}</div>`; }).join('');
  el.innerHTML = `<div class="plegend"><span class="free">FREE TRACK</span><span class="elite">ELITE TRACK</span></div><div class="ptiers">${rows}</div>`;
  const nx = el.querySelector('.pt.next') || el.querySelector('.pt.done:last-child'); const box = el.querySelector('.ptiers'); if (nx && box) setTimeout(() => { box.scrollTop = Math.max(0, nx.offsetTop - box.offsetTop - box.clientHeight / 2); $('#pass').scrollTop = 0; }, 30);
  const be = $('#pass-elite'); if (be) be.addEventListener('click', () => { if (PR.coins < SEASON.elitePrice) { flash('Not enough coins yet. Finish parts, win Battle Royales and clear Horde waves to earn more.'); return; } PR.coins -= SEASON.elitePrice; PS.elite = true; claimAll(false); PR.save(); renderPass(); hudBadge(); });
  const bt = $('#pass-tier'); if (bt) bt.addEventListener('click', () => { if (PR.coins < SEASON.tierPrice) { flash('Not enough coins.'); return; } PR.coins -= SEASON.tierPrice; PS.xp = 0; PS.tier = Math.min(100, PS.tier + 1); claimAll(false); PR.save(); renderPass(); hudBadge(); });
  renderLocker();
}
function renderLocker() {
  const L = $('#passlocker'); const own = Object.keys(SKINS).filter(k => PS.skins[k]); const titles = Object.keys(TITLES).filter(k => PS.titles[k]); const wraps = Object.keys(WRAPS).filter(k => PR.wraps[k]);
  L.innerHTML = chalHTML() + `<div class="h4">Locker · operator skin</div><div class="lskins">${Object.entries(SKINS).map(([k, S]) => `<button type="button" class="lsk${PS.skin === k ? ' on' : ''}${PS.skins[k] ? '' : ' lock'}" data-k="${k}"><i style="background:${S.wrap ? WRAPS[S.wrap].css : '#' + ((S.sleeve == null ? 0x6a6a4a : S.sleeve).toString(16).padStart(6, '0'))}"></i><u style="background:#${S.glove.toString(16).padStart(6, '0')}"></u><span>${S.name}</span></button>`).join('')}</div>
    <div class="h4">Title</div><div class="achips">${['', ...titles].map(k => `<button type="button" class="achip sm${PS.title === k ? ' on' : ''}" data-t="${k}">${k ? TITLES[k] : 'None'}</button>`).join('')}${titles.length ? '' : '<span class="lede" style="font-size:13px">Titles unlock at tiers 3, 18, 28, 38, 48, 58, 68, 78, 88, 95 and 100.</span>'}</div>
    <div class="h4">Wraps unlocked · ${wraps.length} of ${Object.keys(WRAPS).length}</div><div class="acamos">${Object.entries(WRAPS).map(([k, W]) => `<span class="acam${PR.wraps[k] ? '' : ' lock'}" title="${W.name}" style="background:${W.css}"></span>`).join('')}</div><p class="lede" style="font-size:13px">Put wraps on any gun in the Armory, under Camos.</p>`;
  L.querySelectorAll('.lsk').forEach(b => b.addEventListener('click', () => { const k = b.dataset.k; if (!PS.skins[k]) { flash(SKINS[k].name + ' unlocks in the season pass.'); return; } PS.skin = k; PR.save(); renderLocker(); refreshVM(); }));
  L.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { PS.title = b.dataset.t; PR.save(); renderLocker(); }));
}
function flash(t) { const m = $('#pass-msg'); m.textContent = t; m.classList.remove('flash'); void m.offsetWidth; m.classList.add('flash'); }
let passFrom = 'title';
const curScreen = () => { const s = [...document.querySelectorAll('.ov.screen')].find(e => !e.hidden && e.id !== 'pass'); return s ? s.id : 'title'; };
SP.openPass = from => { passFrom = typeof from === 'string' ? from : curScreen(); claimAll(true); renderPass(); SP.showScreen('pass'); };
function resultsBar(sel) { const el = $(sel); if (!el) return; const need = xpFor(PS.tier); el.innerHTML = `<div class="rpb"><b>SEASON PASS · TIER ${PS.tier}</b><div class="pxp"><i style="width:${PS.tier >= 100 ? 100 : PS.xp / need * 100}%"></i></div><span>${PS.tier >= 100 ? 'Season complete' : PS.xp.toLocaleString() + ' / ' + need.toLocaleString() + ' XP'}</span><button class="mb" type="button">Open Season Pass</button></div>`; el.querySelector('button').addEventListener('click', () => SP.openPass()); }
function wire() {
  const b = $('#btn-pass'); if (b) b.addEventListener('click', () => SP.openPass('title')); $('#pass-back').addEventListener('click', () => SP.showScreen(passFrom || 'title'));
  ['#p-pass', '#mode-pass', '#bl-pass', '#t-passbtn'].forEach(s => { const e = $(s); if (e) e.addEventListener('click', () => SP.openPass()); });
  claimAll(true); hudBadge();
  new MutationObserver(() => { if (!$('#title').hidden) setTimeout(hudBadge, 50); }).observe($('#title'), { attributes: true, attributeFilter: ['hidden'] });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
SP.Pass = { PS, TIERS, WRAPS, SKINS, TITLES, xpFor, claimAll, track, CHAL, resultsBar };
})();

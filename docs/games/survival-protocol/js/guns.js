/* Survival Protocol — 50 guns, 5 knives, attachments and camos.
   Every gun is built from parts (receiver, barrel, stock, magazine, optic) so each has its own silhouette. */
'use strict';
(function () {
const T = THREE, { V3 } = SP; const geo = SP.geo, M = SP.M, Mods = SP.Models, MAT = SP.MAT;

/* ---------- materials ---------- */
const FIN = {
  black: () => MAT.polymer(), fde: () => MAT.fde(), metal: () => MAT.gunMetal(), wood: () => MAT.akWood(),
  olive: () => SP.flat(0x4a4f36, 0.75), tan: () => SP.flat(0xa08a64, 0.75), grey: () => SP.flat(0x5a5c5e, 0.6, 0.2), blued: () => SP.mat('metal', { color: 0x22262c, roughness: 0.35, metalness: 0.75 }),
  chrome: () => SP.mat('metal', { color: 0xb8bcc0, roughness: 0.22, metalness: 0.9 }), darkwood: () => SP.mat('wood', { color: 0x5a3420, roughness: 0.5 }),
};
const CAMOS = {
  none: null,
  desert: { name: 'Desert Digital', color: 0xb49a6c, kills: 25 }, woodland: { name: 'Woodland', color: 0x4f5a34, kills: 50 }, urban: { name: 'Urban Grey', color: 0x7a7c80, kills: 75 },
  tiger: { name: 'Tiger Stripe', color: 0xc8782a, kills: 100 }, arctic: { name: 'Arctic', color: 0xdfe6ea, kills: 150 }, crimson: { name: 'Crimson', color: 0x8a1c1c, kills: 200 },
  gold: { name: 'Gold', color: 0xd4af37, kills: 300, metal: true }, obsidian: { name: 'Obsidian', color: 0x15131a, kills: 500, metal: true },
};
SP.CAMOS = CAMOS;

/* ---------- procedural gun ---------- */
// L = spec look: {fin, acc(ent), len, bar, stock, mag, optic, grip, extras[]}
Mods.gun = function (L, att) {
  att = att || {}; const g = new T.Group();
  const camo = att.camo && CAMOS[att.camo];
  const body = camo ? (camo.metal ? SP.mat('metal', { color: camo.color, roughness: 0.3, metalness: 0.85 }) : SP.flat(camo.color, 0.7, 0.05)) : FIN[L.fin || 'black']();
  const accent = FIN[L.acc || 'metal'](), blk = MAT.polymer(), met = MAT.gunMetal();
  const len = L.len || 0.5, bar = L.bar || 0.2, bp = !!L.bullpup;
  const rz = bp ? 0.06 : -0.05;                                  // receiver centre
  M(geo.box(0.058, 0.078, len * 0.55), body, 0, 0.035, rz, g);    // receiver
  M(geo.box(0.052, 0.045, len * 0.4), accent, 0, -0.02, rz + 0.02, g);
  const hgL = len * (bp ? 0.55 : 0.6), hgZ = rz - len * 0.275 - hgL / 2;
  if (L.hg !== false) M(geo.box(L.hgW || 0.066, L.hgH || 0.068, hgL), L.hgFin ? FIN[L.hgFin]() : body, 0, 0.035, hgZ, g);
  const front = hgZ - hgL / 2;
  M(geo.cyl(L.barR || 0.011, L.barR || 0.011, bar, 8), met, 0, 0.035, front - bar / 2, g).rotation.x = Math.PI / 2;
  let muzzleZ = front - bar;
  if (att.sup) { M(geo.cyl(0.02, 0.02, 0.17, 12), blk, 0, 0.035, muzzleZ - 0.085, g).rotation.x = Math.PI / 2; muzzleZ -= 0.17; }
  else if (L.brake) { M(geo.box(0.04, 0.03, 0.06), met, 0, 0.035, muzzleZ - 0.03, g); muzzleZ -= 0.06; }
  else { M(geo.cyl(0.015, 0.015, 0.05, 8), blk, 0, 0.035, muzzleZ - 0.025, g).rotation.x = Math.PI / 2; muzzleZ -= 0.05; }
  if (L.tube) M(geo.cyl(0.016, 0.016, hgL + bar * 0.6, 8), met, 0, -0.003, front - bar * 0.3 + hgL / 2 - (hgL + bar * 0.6) / 2 + 0.05, g).rotation.x = Math.PI / 2;
  if (L.pump) M(geo.box(0.05, 0.05, 0.15), blk, 0, -0.006, front + 0.05, g);
  // grip
  const gz = bp ? rz - len * 0.2 : rz + len * 0.2;
  if (L.grip !== false) M(geo.box(0.048, 0.13, 0.062), blk, 0, -0.1, gz + 0.05, g).rotation.x = 0.35;
  // magazine
  const mz = bp ? rz + len * 0.22 : rz - len * 0.12; let mag = null;
  switch (L.mag) {
    case 'curved': mag = M(geo.box(0.042, 0.21, 0.07), L.magFin ? FIN[L.magFin]() : met, 0, -0.11, mz, g); mag.rotation.x = -0.35; break;
    case 'drum': mag = M(geo.cyl(0.08, 0.08, 0.06, 18), blk, 0, -0.12, mz, g); mag.rotation.z = Math.PI / 2; break;
    case 'box': mag = M(geo.box(0.1, 0.12, 0.13), FIN.olive(), 0.03, -0.08, mz, g); break;
    case 'short': mag = M(geo.box(0.042, 0.12, 0.06), blk, 0, -0.07, mz, g); break;
    case 'long': mag = M(geo.box(0.04, 0.26, 0.05), blk, 0, -0.14, mz, g); mag.rotation.x = -0.08; break;
    case 'top': mag = M(geo.box(0.05, 0.03, len * 0.6), SP.flat(0x9a9070, 0.3, 0, { transparent: true, opacity: 0.85 }), 0, 0.09, rz - 0.03, g); break;
    case 'side': mag = M(geo.box(0.16, 0.035, 0.045), met, -0.1, 0.03, mz, g); break;
    case 'tube': case 'none': break;
    default: mag = M(geo.box(0.045, 0.19, 0.068), blk, 0, -0.1, mz, g); mag.rotation.x = -0.12;
  }
  if (att.ext && mag) mag.scale.y *= 1.45, mag.position.y -= 0.03;
  g.userData.mag = mag;
  // stock
  const sz = rz + len * 0.275;
  switch (L.stock) {
    case 'none': break;
    case 'wood': M(geo.box(0.05, 0.1, 0.3), FIN.wood(), 0, -0.01, sz + 0.15, g).rotation.x = -0.1; break;
    case 'darkwood': M(geo.box(0.052, 0.11, 0.34), FIN.darkwood(), 0, -0.015, sz + 0.17, g).rotation.x = -0.12; break;
    case 'skeleton': M(geo.box(0.012, 0.012, 0.22), met, 0, 0.03, sz + 0.11, g); M(geo.box(0.012, 0.012, 0.2), met, 0, -0.04, sz + 0.1, g); M(geo.box(0.04, 0.1, 0.02), blk, 0, -0.005, sz + 0.22, g); break;
    case 'folded': M(geo.box(0.014, 0.08, 0.22), met, 0.04, 0.0, rz, g); break;
    case 'thumb': M(geo.box(0.05, 0.12, 0.22), body, 0, -0.02, sz + 0.1, g); M(geo.box(0.05, 0.05, 0.08), body, 0, -0.06, sz + 0.02, g); break;
    case 'sniper': M(geo.box(0.055, 0.13, 0.32), body, 0, -0.02, sz + 0.16, g); M(geo.box(0.05, 0.04, 0.12), blk, 0, 0.055, sz + 0.12, g); break;
    default: M(geo.box(0.04, 0.045, 0.2), met, 0, 0.04, sz + 0.1, g); M(geo.box(0.056, 0.1, 0.15), body, 0, 0.01, sz + 0.2, g);
  }
  // optic
  const optic = att.optic || L.optic || 'iron'; let sightY = 0.088, sightZ = rz;
  const rail = () => M(geo.box(0.022, 0.012, len * 0.5), met, 0, 0.078, rz - 0.06, g);
  if (optic === 'iron') { M(geo.box(0.008, 0.03, 0.008), met, 0, 0.09, front + 0.02, g, false); M(geo.box(0.03, 0.02, 0.01), met, 0, 0.088, rz + len * 0.2, g, false); sightY = 0.1; }
  else if (optic === 'carry') { M(geo.box(0.02, 0.05, 0.18), body, 0, 0.1, rz, g); sightY = 0.13; M(geo.box(0.008, 0.05, 0.008), met, 0, 0.09, front + 0.02, g, false); }
  else if (optic === 'red') { rail(); M(geo.box(0.035, 0.032, 0.05), blk, 0, 0.1, rz - 0.04, g); const ring = M(geo.cyl(0.024, 0.024, 0.02, 16, 1, true), blk, 0, 0.12, rz - 0.06, g); ring.rotation.x = Math.PI / 2; sightY = 0.12; }
  else if (optic === 'holo') { rail(); M(geo.box(0.045, 0.012, 0.08), blk, 0, 0.092, rz - 0.04, g); M(geo.box(0.045, 0.045, 0.008), blk, 0, 0.12, rz - 0.075, g); M(geo.box(0.045, 0.045, 0.008), blk, 0, 0.12, rz - 0.005, g); sightY = 0.12; }
  else if (optic === 'acog') { rail(); const s = M(geo.cyl(0.022, 0.026, 0.13, 12), blk, 0, 0.115, rz - 0.04, g); s.rotation.x = Math.PI / 2; sightY = 0.115; }
  else if (optic === 'scope' || optic === 'bigscope') { rail(); const r = optic === 'bigscope' ? 0.032 : 0.026; const s = M(geo.cyl(r, r, 0.32, 14), blk, 0, 0.125, rz - 0.05, g); s.rotation.x = Math.PI / 2; M(geo.cyl(r + 0.009, r, 0.07, 14), blk, 0, 0.125, rz - 0.24, g).rotation.x = Math.PI / 2; M(geo.cyl(r + 0.004, r, 0.05, 14), blk, 0, 0.125, rz + 0.13, g).rotation.x = Math.PI / 2; sightY = 0.125; }
  if (att.laser) { M(geo.box(0.025, 0.025, 0.05), blk, 0.045, 0.035, front + 0.04, g); const beam = new T.Mesh(new T.CylinderGeometry(0.0015, 0.0015, 40, 4, 1, true), new T.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.35, depthWrite: false })); beam.rotation.x = Math.PI / 2; beam.position.set(0.045, 0.035, front - 20); g.add(beam); }
  (L.extras || []).forEach(e => {
    if (e === 'bipod') { M(geo.box(0.01, 0.12, 0.01), met, 0.025, -0.03, front + 0.03, g).rotation.z = 0.2; M(geo.box(0.01, 0.12, 0.01), met, -0.025, -0.03, front + 0.03, g).rotation.z = -0.2; }
    if (e === 'fore') M(geo.box(0.035, 0.08, 0.035), blk, 0, -0.03, hgZ - hgL * 0.2, g);
    if (e === 'heat') M(geo.box(0.07, 0.03, hgL * 0.9), FIN.grey(), 0, 0.075, hgZ, g);
    if (e === 'bolt') M(geo.box(0.05, 0.012, 0.012), FIN.chrome(), 0.04, 0.05, rz + 0.06, g);
    if (e === 'dbl') M(geo.cyl(L.barR || 0.012, L.barR || 0.012, bar, 8), met, 0, 0.01, front - bar / 2, g).rotation.x = Math.PI / 2;
    if (e === 'cyl') { const c = M(geo.cyl(0.035, 0.035, 0.08, 12), met, 0, 0.0, rz - 0.03, g); c.rotation.x = Math.PI / 2; }
  });
  g.userData.muzzle = V3(0, 0.035, muzzleZ); g.userData.sight = V3(0, sightY, sightZ);
  return g;
};
Mods.pistolX = function (L, att) {
  att = att || {}; const g = new T.Group(); const camo = att.camo && CAMOS[att.camo];
  const slide = camo ? SP.mat('metal', { color: camo.color, roughness: 0.3, metalness: camo.metal ? 0.85 : 0.2 }) : FIN[L.fin || 'metal'](), frame = FIN[L.frame || 'black']();
  const len = L.len || 0.19, h = L.h || 0.035;
  M(geo.box(L.w || 0.032, h, len), slide, 0, 0.03, -0.05, g); M(geo.box((L.w || 0.032) - 0.002, 0.03, len * 0.9), frame, 0, 0.0, -0.045, g);
  M(geo.box(0.03, 0.125, 0.052), FIN[L.gripFin || L.frame || 'black'](), 0, -0.065, 0.03, g).rotation.x = 0.25;
  if (L.revolver) { const c = M(geo.cyl(0.03, 0.03, 0.06, 10), slide, 0, 0.02, -0.0, g); c.rotation.x = Math.PI / 2; M(geo.cyl(0.011, 0.011, len * 0.8, 8), slide, 0, 0.04, -0.05 - len * 0.35, g).rotation.x = Math.PI / 2; }
  M(geo.box(0.006, 0.01, 0.006), FIN.metal(), 0, 0.053, -0.04 - len / 2 + 0.01, g, false); M(geo.box(0.02, 0.01, 0.006), FIN.metal(), 0, 0.053, 0.03, g, false);
  let mz = -0.05 - len / 2; if (att.sup) { M(geo.cyl(0.016, 0.016, 0.12, 10), MAT.polymer(), 0, 0.03, mz - 0.06, g).rotation.x = Math.PI / 2; mz -= 0.12; }
  if (att.laser) M(geo.box(0.022, 0.02, 0.04), MAT.polymer(), 0, -0.005, -0.1, g);
  g.userData.muzzle = V3(0, 0.03, mz); g.userData.slide = g.children[0]; return g;
};
Mods.launcherX = function (L) {
  const g = new T.Group(), o = FIN[L.fin || 'olive'](), b = MAT.polymer(), m = MAT.gunMetal();
  if (L.kind === 'rpg') { M(geo.cyl(0.035, 0.035, 0.9, 12), SP.flat(0x5a4a30, 0.7), 0, 0.05, -0.05, g).rotation.x = Math.PI / 2; M(geo.cyl(0.04, 0.06, 0.12, 12), m, 0, 0.05, 0.45, g).rotation.x = Math.PI / 2; const w = M(new T.ConeGeometry(0.06, 0.22, 12), SP.flat(0x4c5236, 0.7), 0, 0.05, -0.65, g); w.rotation.x = -Math.PI / 2; M(geo.box(0.03, 0.1, 0.04), b, 0, -0.03, -0.05, g); M(geo.box(0.03, 0.1, 0.04), b, 0, -0.03, 0.12, g); g.userData.muzzle = V3(0, 0.05, -0.78); }
  else if (L.kind === 'mgl') { const c = M(geo.cyl(0.07, 0.07, 0.16, 6), m, 0, 0.0, -0.05, g); c.rotation.x = Math.PI / 2; M(geo.cyl(0.024, 0.024, 0.32, 10), m, 0, 0.03, -0.3, g).rotation.x = Math.PI / 2; M(geo.box(0.05, 0.1, 0.25), b, 0, -0.01, 0.2, g); M(geo.box(0.04, 0.12, 0.05), b, 0, -0.1, 0.06, g).rotation.x = 0.3; M(geo.box(0.03, 0.04, 0.08), b, 0, 0.08, -0.1, g); g.userData.muzzle = V3(0, 0.03, -0.47); }
  else { M(geo.cyl(0.045, 0.045, 1.0, 14), o, 0, 0.05, -0.1, g).rotation.x = Math.PI / 2; M(geo.box(0.08, 0.08, 0.2), b, -0.07, 0.07, -0.05, g); M(geo.box(0.03, 0.1, 0.04), b, 0, -0.03, -0.05, g); g.userData.muzzle = V3(0, 0.05, -0.65); }
  return g;
};
const KNIVES = {
  combat: { name: 'Combat Knife', blade: 0.17, w: 0.03, col: 0x8a8e92, handle: 0x1d1d1d, range: 2.6, swing: 0.6, price: 0 },
  karambit: { name: 'Karambit', blade: 0.11, w: 0.026, col: 0x2a2a2e, handle: 0x5a3a24, range: 2.3, swing: 0.42, price: 600, curve: true },
  machete: { name: 'Machete', blade: 0.36, w: 0.05, col: 0x9a9690, handle: 0x3a2a1a, range: 3.1, swing: 0.8, price: 800 },
  tomahawk: { name: 'Tomahawk', blade: 0.24, w: 0.02, col: 0x4a4a4a, handle: 0x6a4a2a, range: 2.7, swing: 0.7, price: 900, axe: true },
  bayonet: { name: 'Bayonet', blade: 0.22, w: 0.028, col: 0xb0b4b8, handle: 0x2f3a2a, range: 2.8, swing: 0.55, price: 700 },
};
SP.KNIVES = KNIVES;
Mods.knife = function (k) {
  const K = KNIVES[k] || KNIVES.combat; const g = new T.Group();
  const bladeM = SP.mat('metal', { color: K.col, roughness: 0.25, metalness: 0.9 }), hm = SP.flat(K.handle, 0.6);
  M(geo.box(0.028, 0.03, 0.12), hm, 0, 0, 0.04, g); M(geo.box(0.05, 0.012, 0.012), SP.flat(0x222222, 0.5, 0.5), 0, 0, -0.025, g);
  if (K.axe) { M(geo.box(0.02, 0.028, K.blade + 0.1), hm, 0, 0, -0.1, g); M(geo.box(0.012, 0.09, 0.06), bladeM, 0, 0.04, -0.1 - K.blade / 2, g); }
  else { const b = M(geo.box(0.005, K.w, K.blade), bladeM, 0, 0.004, -0.03 - K.blade / 2, g); if (K.curve) b.rotation.x = -0.35; const tip = M(new T.ConeGeometry(K.w / 2, 0.04, 4), bladeM, 0, 0.004, -0.03 - K.blade - 0.02, g); tip.rotation.x = -Math.PI / 2; tip.scale.x = 0.2; }
  g.userData.muzzle = V3(0, 0, -0.2); g.userData.sight = V3(0, 0.05, 0); return g;
};

/* ---------- the 50 guns ---------- */
// cls: ar smg lmg sniper dmr shotgun pistol launcher
const B = {
  ar: { auto: true, rpm: 750, dmg: 32, head: 3, mag: 30, reload: 2.3, spreadH: 0.022, spreadA: 0.0018, kick: 0.012, sound: 'm4', price: 900 },
  smg: { auto: true, rpm: 900, dmg: 24, head: 2.6, mag: 30, reload: 1.9, spreadH: 0.016, spreadA: 0.0035, kick: 0.008, sound: 'sup', price: 700 },
  lmg: { auto: true, rpm: 650, dmg: 34, head: 2.8, mag: 100, reload: 5.2, spreadH: 0.03, spreadA: 0.003, kick: 0.014, sound: 'mg', price: 1400 },
  sniper: { auto: false, rpm: 45, dmg: 160, head: 3, mag: 5, reload: 3.2, spreadH: 0.06, spreadA: 0.0002, kick: 0.07, sound: 'fifty', zoom: 18, price: 1800 },
  dmr: { auto: false, rpm: 260, dmg: 75, head: 2.6, mag: 15, reload: 2.6, spreadH: 0.03, spreadA: 0.0006, kick: 0.03, sound: 'ak', zoom: 10, price: 1200 },
  shotgun: { auto: false, rpm: 75, dmg: 20, pellets: 9, pelletSpread: 0.05, head: 1.5, mag: 6, reload: 3.4, spreadH: 0.01, spreadA: 0.008, kick: 0.045, sound: 'shotgun', price: 1000 },
  pistol: { auto: false, rpm: 380, dmg: 28, head: 2.6, mag: 15, reload: 1.5, spreadH: 0.014, spreadA: 0.004, kick: 0.02, sound: 'pistol', price: 400, vmAs: 'pistol' },
  launcher: { auto: false, rpm: 40, dmg: 0, head: 1, mag: 1, reload: 3.4, spreadH: 0, spreadA: 0, kick: 0.09, sound: 'fifty', rocket: true, price: 2200, vmAs: 'at4' },
};
const G50 = [
  // assault rifles (10)
  ['ak74', 'AK-74', 'ar', { dmg: 31, rpm: 650 }, { fin: 'darkwood', acc: 'metal', len: 0.56, bar: 0.24, stock: 'darkwood', mag: 'curved', magFin: 'fde', hgFin: 'darkwood', brake: true }],
  ['akm', 'AKM', 'ar', { dmg: 40, rpm: 600, kick: 0.017 }, { fin: 'wood', len: 0.56, bar: 0.24, stock: 'wood', mag: 'curved', hgFin: 'wood' }],
  ['m16', 'M16A4', 'ar', { auto: false, rpm: 820, dmg: 38, burst: true }, { fin: 'black', len: 0.62, bar: 0.28, stock: 'fixed', mag: 'std', optic: 'carry' }],
  ['scar', 'SCAR-L', 'ar', { dmg: 34, rpm: 625 }, { fin: 'fde', acc: 'black', len: 0.6, bar: 0.22, stock: 'fixed', mag: 'std', optic: 'holo', extras: ['fore'] }],
  ['g36', 'G36C', 'ar', { rpm: 750, dmg: 30, spreadA: 0.0022 }, { fin: 'black', len: 0.5, bar: 0.14, stock: 'skeleton', mag: 'std', optic: 'carry' }],
  ['famas', 'FAMAS', 'ar', { rpm: 1000, dmg: 28, kick: 0.01 }, { fin: 'black', len: 0.62, bar: 0.18, stock: 'none', bullpup: true, mag: 'std', optic: 'carry' }],
  ['aug', 'AUG A3', 'ar', { rpm: 700, dmg: 31, spreadA: 0.0014 }, { fin: 'olive', len: 0.62, bar: 0.22, stock: 'none', bullpup: true, mag: 'std', optic: 'acog' }],
  ['tavor', 'Tavor X95', 'ar', { rpm: 850, dmg: 30 }, { fin: 'tan', len: 0.55, bar: 0.16, stock: 'none', bullpup: true, mag: 'std', optic: 'red' }],
  ['hk416', 'HK416', 'ar', { rpm: 800, dmg: 33, kick: 0.011 }, { fin: 'black', len: 0.6, bar: 0.2, stock: 'fixed', mag: 'std', optic: 'red', extras: ['fore'] }],
  ['qbz', 'QBZ-95', 'ar', { rpm: 680, dmg: 33 }, { fin: 'olive', len: 0.62, bar: 0.2, stock: 'none', bullpup: true, mag: 'std', optic: 'carry' }],
  // SMGs (8)
  ['mp5', 'MP5', 'smg', { rpm: 800, dmg: 25, spreadA: 0.0025 }, { fin: 'black', len: 0.42, bar: 0.08, stock: 'fixed', mag: 'curved', magFin: 'black', optic: 'iron' }],
  ['mp7', 'MP7', 'smg', { rpm: 950, dmg: 22, mag: 40 }, { fin: 'black', len: 0.34, bar: 0.06, stock: 'folded', mag: 'short', optic: 'red' }],
  ['ump', 'UMP45', 'smg', { rpm: 600, dmg: 31, mag: 25 }, { fin: 'black', len: 0.44, bar: 0.08, stock: 'skeleton', mag: 'std', optic: 'holo' }],
  ['p90', 'P90', 'smg', { rpm: 900, dmg: 23, mag: 50 }, { fin: 'black', len: 0.48, bar: 0.06, stock: 'none', bullpup: true, mag: 'top', optic: 'red', grip: true }],
  ['vector', 'Vector', 'smg', { rpm: 1200, dmg: 22, mag: 25, kick: 0.006 }, { fin: 'black', acc: 'grey', len: 0.42, bar: 0.08, stock: 'skeleton', mag: 'long', optic: 'red' }],
  ['uzi', 'Uzi', 'smg', { rpm: 600, dmg: 26, mag: 32 }, { fin: 'metal', len: 0.36, bar: 0.06, stock: 'folded', mag: 'long', optic: 'iron', hg: false }],
  ['bizon', 'PP-19 Bizon', 'smg', { rpm: 700, dmg: 22, mag: 64 }, { fin: 'black', len: 0.46, bar: 0.1, stock: 'folded', mag: 'drum', optic: 'iron', tube: true }],
  ['mpx', 'MPX', 'smg', { rpm: 850, dmg: 25, mag: 30 }, { fin: 'black', len: 0.4, bar: 0.08, stock: 'skeleton', mag: 'std', optic: 'holo' }],
  // LMGs (5)
  ['m249', 'M249 SAW', 'lmg', { rpm: 750, dmg: 32, mag: 100 }, { fin: 'black', len: 0.68, bar: 0.3, stock: 'fixed', mag: 'box', optic: 'iron', extras: ['bipod', 'heat'] }],
  ['pkm', 'PKM', 'lmg', { rpm: 650, dmg: 40, mag: 100 }, { fin: 'metal', len: 0.7, bar: 0.32, stock: 'wood', mag: 'box', hgFin: 'metal', optic: 'iron', extras: ['bipod'] }],
  ['rpk', 'RPK', 'lmg', { rpm: 600, dmg: 38, mag: 75, reload: 4.2 }, { fin: 'wood', len: 0.66, bar: 0.34, stock: 'wood', mag: 'drum', hgFin: 'wood', extras: ['bipod'] }],
  ['m60', 'M60', 'lmg', { rpm: 550, dmg: 44, mag: 100, kick: 0.018 }, { fin: 'metal', len: 0.72, bar: 0.34, stock: 'fixed', mag: 'box', hgFin: 'metal', extras: ['bipod', 'heat'] }],
  ['mg4', 'MG4', 'lmg', { rpm: 800, dmg: 31, mag: 120 }, { fin: 'black', len: 0.66, bar: 0.28, stock: 'skeleton', mag: 'box', optic: 'red', extras: ['bipod'] }],
  // sniper rifles (6)
  ['m24', 'M24', 'sniper', { dmg: 150, rpm: 50 }, { fin: 'olive', len: 0.72, bar: 0.42, stock: 'sniper', mag: 'none', optic: 'scope', extras: ['bolt'] }],
  ['awm', 'AWM', 'sniper', { dmg: 185, rpm: 42, reload: 3.6 }, { fin: 'olive', acc: 'black', len: 0.74, bar: 0.46, stock: 'thumb', mag: 'short', optic: 'bigscope', brake: true, extras: ['bolt', 'bipod'] }],
  ['barrett', 'Barrett M82', 'sniper', { auto: false, rpm: 90, dmg: 240, mag: 10, kick: 0.11, reload: 4 }, { fin: 'black', len: 0.82, bar: 0.5, barR: 0.016, stock: 'sniper', mag: 'short', optic: 'bigscope', brake: true, extras: ['bipod'] }],
  ['svd', 'Dragunov SVD', 'sniper', { auto: false, rpm: 160, dmg: 110, mag: 10 }, { fin: 'wood', len: 0.7, bar: 0.46, stock: 'skeleton', mag: 'short', hgFin: 'wood', optic: 'scope' }],
  ['kar98', 'Kar98k', 'sniper', { dmg: 145, rpm: 45, mag: 5 }, { fin: 'darkwood', len: 0.74, bar: 0.4, stock: 'darkwood', mag: 'none', hgFin: 'darkwood', optic: 'scope', extras: ['bolt'] }],
  ['m110', 'M110 SASS', 'sniper', { auto: false, rpm: 200, dmg: 100, mag: 20 }, { fin: 'fde', len: 0.7, bar: 0.36, stock: 'fixed', mag: 'std', optic: 'scope', extras: ['bipod'] }],
  // marksman rifles (4)
  ['mk14', 'Mk 14 EBR', 'dmr', { dmg: 80, mag: 20 }, { fin: 'black', acc: 'fde', len: 0.68, bar: 0.3, stock: 'fixed', mag: 'short', optic: 'acog', extras: ['fore'] }],
  ['sks', 'SKS', 'dmr', { dmg: 70, mag: 10, zoom: 6 }, { fin: 'wood', len: 0.66, bar: 0.32, stock: 'wood', mag: 'none', hgFin: 'wood', optic: 'iron' }],
  ['mini14', 'Mini-14', 'dmr', { dmg: 62, rpm: 300, mag: 20, zoom: 6 }, { fin: 'wood', acc: 'metal', len: 0.62, bar: 0.28, stock: 'wood', mag: 'short', hgFin: 'wood', optic: 'red' }],
  ['g3', 'G3A3', 'dmr', { dmg: 78, rpm: 300, mag: 20, zoom: 6 }, { fin: 'black', len: 0.68, bar: 0.3, stock: 'fixed', mag: 'short', optic: 'iron' }],
  // shotguns (6)
  ['r870', 'Remington 870', 'shotgun', { dmg: 22, pellets: 9, mag: 6 }, { fin: 'black', len: 0.5, bar: 0.38, stock: 'fixed', mag: 'tube', tube: true, pump: true, hg: false, optic: 'iron' }],
  ['spas', 'SPAS-12', 'shotgun', { dmg: 20, pellets: 9, mag: 8, rpm: 110 }, { fin: 'black', len: 0.52, bar: 0.36, stock: 'folded', mag: 'tube', tube: true, pump: true, optic: 'iron', extras: ['heat'] }],
  ['aa12', 'AA-12', 'shotgun', { auto: true, rpm: 300, dmg: 14, pellets: 8, mag: 20, reload: 3.6 }, { fin: 'black', len: 0.58, bar: 0.22, stock: 'fixed', mag: 'drum', optic: 'iron', extras: ['heat'] }],
  ['ksg', 'KSG', 'shotgun', { dmg: 20, pellets: 9, mag: 14, rpm: 80 }, { fin: 'black', len: 0.55, bar: 0.24, stock: 'none', bullpup: true, mag: 'tube', tube: true, pump: true, optic: 'red' }],
  ['dbarrel', 'Double Barrel', 'shotgun', { dmg: 26, pellets: 10, mag: 2, rpm: 240, reload: 2.4 }, { fin: 'darkwood', len: 0.46, bar: 0.46, stock: 'darkwood', mag: 'none', hg: true, hgFin: 'darkwood', extras: ['dbl'], optic: 'iron' }],
  ['saiga', 'Saiga-12', 'shotgun', { rpm: 200, dmg: 16, pellets: 8, mag: 8 }, { fin: 'black', len: 0.56, bar: 0.26, stock: 'skeleton', mag: 'curved', magFin: 'black', optic: 'holo' }],
  // pistols (8)
  ['glock', 'Glock 17', 'pistol', { rpm: 420, dmg: 26, mag: 17 }, { fin: 'black', frame: 'black', len: 0.18 }, 'p'],
  ['deagle', 'Desert Eagle', 'pistol', { rpm: 200, dmg: 75, mag: 7, kick: 0.06 }, { fin: 'chrome', frame: 'black', len: 0.25, h: 0.045, w: 0.036 }, 'p'],
  ['m1911', 'M1911', 'pistol', { rpm: 330, dmg: 36, mag: 8 }, { fin: 'blued', frame: 'blued', gripFin: 'darkwood', len: 0.2 }, 'p'],
  ['m9', 'Beretta M9', 'pistol', { rpm: 380, dmg: 28, mag: 15 }, { fin: 'black', frame: 'black', len: 0.205 }, 'p'],
  ['usp', 'USP .45', 'pistol', { rpm: 340, dmg: 34, mag: 12 }, { fin: 'black', frame: 'black', len: 0.2, h: 0.038 }, 'p'],
  ['python', '.357 Revolver', 'pistol', { rpm: 160, dmg: 70, mag: 6, reload: 2.6, kick: 0.05 }, { fin: 'chrome', frame: 'chrome', gripFin: 'darkwood', len: 0.24, revolver: true }, 'p'],
  ['fiveseven', 'Five-seveN', 'pistol', { rpm: 450, dmg: 24, mag: 20 }, { fin: 'tan', frame: 'black', len: 0.2 }, 'p'],
  ['makarov', 'Makarov', 'pistol', { rpm: 360, dmg: 24, mag: 8 }, { fin: 'blued', frame: 'blued', gripFin: 'black', len: 0.16 }, 'p'],
  // launchers (3)
  ['rpg7', 'RPG-7', 'launcher', { reload: 3.6 }, { kind: 'rpg' }, 'l'],
  ['m32', 'M32 MGL', 'launcher', { mag: 6, rpm: 120, reload: 5 }, { kind: 'mgl' }, 'l'],
  ['smaw', 'SMAW', 'launcher', { reload: 4 }, { kind: 'smaw', fin: 'olive' }, 'l'],
];
SP.GUNS = [];
G50.forEach(([id, name, cls, over, look, kind]) => {
  const st = Object.assign({ name, cls }, B[cls], over);
  st.model = (att) => kind === 'p' ? Mods.pistolX(look, att || SP.gunAtt(id)) : kind === 'l' ? Mods.launcherX(look) : Mods.gun(look, att || SP.gunAtt(id));
  if (st.burst) { st.auto = true; st.defaultMode = 'burst'; }
  SP.WEAP[id] = st; SP.GUNS.push({ id, cls, price: st.price, look });
});
// the originals get a class too
Object.assign(SP.WEAP.m4, { cls: 'ar' }); Object.assign(SP.WEAP.sup, { cls: 'ar' }); Object.assign(SP.WEAP.ak, { cls: 'ar' }); Object.assign(SP.WEAP.pistol, { cls: 'pistol' });
Object.assign(SP.WEAP.shotgun, { cls: 'shotgun' }); Object.assign(SP.WEAP.dmr, { cls: 'dmr' }); Object.assign(SP.WEAP.at4, { cls: 'launcher' });
// knife as a weapon
SP.WEAP.knife = { name: 'COMBAT KNIFE', cls: 'melee', melee: true, auto: false, rpm: 100, dmg: 9999, head: 1, mag: 1, reload: 0.1, spreadH: 0, spreadA: 0, kick: 0.0, sound: 'sup', vmAs: 'knife', model: () => Mods.knife(SP.knifeKind()), swing: 0.6 };
SP.knifeKind = () => (SP.Progress && SP.Progress.knife) || 'combat';
SP.CLASS_NAMES = { ar: 'Assault rifles', smg: 'SMGs', lmg: 'Machine guns', sniper: 'Sniper rifles', dmr: 'Marksman rifles', shotgun: 'Shotguns', pistol: 'Pistols', launcher: 'Launchers', melee: 'Knives' };

/* attachments + camos for a gun, from the profile */
SP.gunAtt = id => { const PR = SP.Progress; if (!PR) return {}; const a = Object.assign({}, (PR.att && PR.att[id]) || {}); a.camo = PR.camo && PR.camo[id]; return a; };
SP.ATTACH = {
  optic: { name: 'Optic', opts: [['', 'Iron sights', 0], ['red', 'Red dot', 250], ['holo', 'Holographic', 300], ['acog', '4x ACOG', 450]] },
  sup: { name: 'Suppressor', cost: 400, desc: 'Much quieter. Slightly less damage.' },
  ext: { name: 'Extended mag', cost: 350, desc: '+50% magazine. Slower reload.' },
  laser: { name: 'Laser sight', cost: 300, desc: 'Tighter hip-fire.' },
};
})();

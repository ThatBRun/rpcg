/* Survival Protocol — models: soldiers, weapons, vehicles, props */
'use strict';
(function () {
const T = THREE, { V3, rand, lerp, clamp, damp } = SP;
const GC = {};
const geo = {
  box: (w, h, d) => GC['b' + w + h + d] || (GC['b' + w + h + d] = new T.BoxGeometry(w, h, d)),
  cyl: (a, b, h, s = 12) => GC['c' + a + b + h + s] || (GC['c' + a + b + h + s] = new T.CylinderGeometry(a, b, h, s)),
  sph: (r, w = 14, h = 10) => GC['s' + r + w + h] || (GC['s' + r + w + h] = new T.SphereGeometry(r, w, h)),
};
SP.geo = geo; SP.GC = GC;
function M(g, m, x = 0, y = 0, z = 0, parent, cast = true) { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; if (parent) parent.add(o); return o; }
SP.M = M;
const Mods = SP.Models = {};

/* -------- materials used by models -------- */
const MAT = SP.MAT = {
  gunMetal: () => SP.mat('metal', { color: 0x2c2d2f, roughness: 0.5, metalness: 0.65, ns: 0.4 }),
  polymer: () => SP.flat(0x1d1d1d, 0.72, 0.05),
  fde: () => SP.flat(0x7f6a4f, 0.75, 0.0),
  akWood: () => SP.mat('wood', { color: 0x9c5a33, roughness: 0.55 }),
  glassDark: () => SP.flat(0x0d1214, 0.08, 0.2, { env: 1.6 }),
  redDot: () => SP.flat(0x000000, 1, 0, { emissive: 0xff2010, ei: 30 }),
  rubber: () => SP.mat('rubber', { color: 0xffffff, roughness: 0.9 }),
};

/* ================= weapons (world models; -Z is forward, origin at grip) ================= */
Mods.m4 = function (fde = true) {
  const g = new T.Group(), met = MAT.gunMetal(), pol = fde ? MAT.fde() : MAT.polymer(), blk = MAT.polymer();
  M(geo.box(0.06, 0.075, 0.26), met, 0, 0.035, -0.05, g);          // upper receiver
  M(geo.box(0.055, 0.05, 0.2), met, 0, -0.02, -0.02, g);           // lower
  M(geo.box(0.07, 0.07, 0.3), pol, 0, 0.035, -0.33, g);            // handguard
  M(geo.box(0.022, 0.012, 0.56), met, 0, 0.078, -0.22, g);         // top rail
  for (let i = 0; i < 18; i++) M(geo.box(0.026, 0.006, 0.012), met, 0, 0.087, -0.47 + i * 0.03, g, false);
  M(geo.cyl(0.011, 0.011, 0.2, 8), met, 0, 0.03, -0.58, g).rotation.x = Math.PI / 2;  // barrel
  M(geo.cyl(0.016, 0.016, 0.06, 8), blk, 0, 0.03, -0.69, g).rotation.x = Math.PI / 2; // flash hider
  M(geo.box(0.05, 0.13, 0.065), blk, 0, -0.1, 0.055, g).rotation.x = 0.35;         // grip
  const mag = M(geo.box(0.045, 0.2, 0.07), blk, 0, -0.1, -0.1, g); mag.rotation.x = -0.12; g.userData.mag = mag;
  M(geo.box(0.04, 0.05, 0.25), met, 0, 0.04, 0.17, g);             // buffer tube
  M(geo.box(0.058, 0.1, 0.16), pol, 0, 0.01, 0.26, g);             // stock
  M(geo.box(0.06, 0.12, 0.03), blk, 0, 0.0, 0.345, g);             // butt pad
  // optic (Aimpoint-style)
  const tube = M(geo.cyl(0.024, 0.024, 0.1, 16), blk, 0, 0.118, -0.06, g); tube.rotation.x = Math.PI / 2;
  M(geo.box(0.03, 0.03, 0.05), blk, 0, 0.09, -0.06, g);
  M(geo.cyl(0.02, 0.02, 0.003, 16), MAT.glassDark(), 0, 0.118, -0.11, g).rotation.x = Math.PI / 2;
  const dot = M(geo.sph(0.0012, 6, 4), MAT.redDot(), 0, 0.118, -0.115, g, false); g.userData.dot = dot;
  M(geo.box(0.04, 0.02, 0.03), blk, 0.0, 0.0, -0.43, g);           // foregrip
  M(geo.box(0.035, 0.05, 0.03), blk, 0, -0.03, -0.42, g);
  M(geo.cyl(0.012, 0.012, 0.09, 8), blk, 0.045, 0.04, -0.4, g).rotation.x = Math.PI / 2; // light
  g.userData.muzzle = V3(0, 0.03, -0.73); g.userData.sight = V3(0, 0.118, -0.06);
  return g;
};
Mods.ak = function () {
  const g = new T.Group(), met = MAT.gunMetal(), wd = MAT.akWood();
  M(geo.box(0.055, 0.08, 0.32), met, 0, 0.02, -0.06, g);
  M(geo.box(0.06, 0.06, 0.24), wd, 0, 0.02, -0.33, g);
  M(geo.cyl(0.011, 0.011, 0.24, 8), met, 0, 0.04, -0.55, g).rotation.x = Math.PI / 2;
  M(geo.box(0.02, 0.02, 0.22), met, 0, 0.065, -0.3, g);
  const mag = M(geo.box(0.04, 0.2, 0.07), met, 0, -0.1, -0.12, g); mag.rotation.x = -0.35; g.userData.mag = mag;
  M(geo.box(0.045, 0.12, 0.06), wd, 0, -0.08, 0.05, g).rotation.x = 0.4;
  M(geo.box(0.05, 0.09, 0.3), wd, 0, -0.01, 0.24, g).rotation.x = -0.1;
  g.userData.muzzle = V3(0, 0.04, -0.68); return g;
};
Mods.pistol = function () {
  const g = new T.Group(), met = MAT.gunMetal(), pol = MAT.polymer();
  M(geo.box(0.032, 0.035, 0.19), met, 0, 0.03, -0.05, g);
  M(geo.box(0.03, 0.03, 0.17), pol, 0, 0.0, -0.04, g);
  M(geo.box(0.03, 0.12, 0.05), pol, 0, -0.06, 0.03, g).rotation.x = 0.25;
  M(geo.box(0.006, 0.01, 0.006), met, 0, 0.052, -0.135, g, false); M(geo.box(0.02, 0.01, 0.006), met, 0, 0.052, 0.035, g, false);
  g.userData.muzzle = V3(0, 0.03, -0.15); g.userData.slide = g.children[0]; return g;
};
Mods.shotgun = function () {
  const g = new T.Group(), met = MAT.gunMetal(), pol = MAT.polymer();
  M(geo.box(0.055, 0.07, 0.25), met, 0, 0.02, -0.05, g); M(geo.cyl(0.013, 0.013, 0.5, 8), met, 0, 0.035, -0.4, g).rotation.x = Math.PI / 2;
  M(geo.cyl(0.018, 0.018, 0.4, 8), met, 0, 0.0, -0.35, g).rotation.x = Math.PI / 2; M(geo.box(0.05, 0.05, 0.14), pol, 0, -0.005, -0.32, g);
  M(geo.box(0.05, 0.09, 0.3), pol, 0, -0.02, 0.22, g).rotation.x = -0.15; g.userData.muzzle = V3(0, 0.035, -0.66); return g;
};
Mods.at4 = function () {
  const g = new T.Group(), o = SP.flat(0x4c5236, 0.75), b = MAT.polymer();
  M(geo.cyl(0.042, 0.042, 1.0, 14), o, 0, 0.05, -0.1, g).rotation.x = Math.PI / 2;
  M(geo.cyl(0.05, 0.05, 0.05, 14), b, 0, 0.05, -0.6, g).rotation.x = Math.PI / 2; M(geo.cyl(0.05, 0.05, 0.08, 14), b, 0, 0.05, 0.42, g).rotation.x = Math.PI / 2;
  M(geo.box(0.03, 0.1, 0.04), b, 0, -0.03, -0.05, g); M(geo.box(0.03, 0.08, 0.04), b, 0, -0.03, -0.25, g); M(geo.box(0.04, 0.05, 0.03), b, -0.05, 0.11, -0.05, g);
  g.userData.muzzle = V3(0, 0.05, -0.65); return g;
};

/* ================= soldiers ================= */
const US_SKIN = [0xc79a7a, 0xa8775a, 0x7a5038, 0x5c3a28, 0xd8ad8e];
const FOE_TOPS = [0x4b4a3a, 0x2c2c2e, 0x5d5547, 0x6e6250, 0x3d4436, 0x7a6e5a, 0x463a30];
const FOE_PANTS = [0x2f2f2f, 0x3b3a33, 0x4d4639, 0x5a5242, 0x2c3330];
Mods.soldier = function (o = {}) {
  const r = SP.rng(o.seed || (Math.random() * 1e9) | 0);
  const pick = a => a[Math.floor(r() * a.length)];
  const us = o.faction === 'us', civ = o.faction === 'civ';
  const skin = SP.mat('skin', { color: o.skin || (us ? pick(US_SKIN) : pick([0xa77a58, 0x8a5f42, 0xb88c69, 0x6e4a33])), roughness: 0.55 });
  const top = us ? SP.mat('camo', { roughness: 0.92 }) : civ ? SP.mat('fabric', { color: o.top || 0x6d7f8f, roughness: 0.9 }) : SP.mat('fabric', { color: o.top || pick(FOE_TOPS), roughness: 0.95 });
  const pants = us ? SP.mat('camo', { color: 0xf0eadf, roughness: 0.92 }) : SP.mat('fabric', { color: o.pants || pick(FOE_PANTS), roughness: 0.95 });
  const vestM = SP.mat('molle', { color: us ? 0x8d7a5a : pick([0x3e4232, 0x2b2b29, 0x4f4a3a]), roughness: 0.95 });
  const boots = SP.flat(us ? 0x9a8463 : 0x2a2622, 0.85), glove = SP.flat(us ? 0x3a3530 : 0x2a2420, 0.8), dark = SP.flat(0x1a1a1a, 0.6);
  const root = new T.Group(); root.rotation.order = 'YXZ';
  const body = new T.Group(); root.add(body);
  if (!SP.blobMat) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); SP.blobMat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }); }
  const blob = new T.Mesh(new T.PlaneGeometry(1.1, 1.1), SP.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = 1; root.add(blob);
  const hips = new T.Group(); hips.position.y = 0.98; body.add(hips);
  M(geo.box(0.34, 0.2, 0.22), pants, 0, 0, 0, hips);
  if (us || r() < 0.6) M(geo.box(0.36, 0.05, 0.24), dark, 0, 0.09, 0, hips, false); // belt
  const spine = new T.Group(); spine.position.y = 0.08; hips.add(spine);
  const chest = new T.Group(); chest.position.y = 0.2; spine.add(chest);
  const torso = M(geo.cyl(0.2, 0.17, 0.48, 14), top, 0, 0.16, 0, chest); torso.scale.z = 0.62;
  M(geo.cyl(0.17, 0.16, 0.16, 12), top, 0, -0.12, 0, chest).scale.z = 0.62;
  if (us) {
    M(geo.box(0.39, 0.34, 0.27), vestM, 0, 0.16, 0, chest);
    for (let i = -1; i <= 1; i++) M(geo.box(0.085, 0.13, 0.05), vestM, i * 0.1, 0.07, -0.155, chest);
    M(geo.box(0.12, 0.07, 0.04), vestM, -0.1, 0.25, -0.15, chest); M(geo.box(0.06, 0.1, 0.04), SP.flat(0x2d2d2a, 0.7), 0.13, 0.26, -0.15, chest);
    M(geo.box(0.3, 0.32, 0.14), vestM, 0, 0.18, 0.17, chest); // back panel / pack
    if (o.radio) { M(geo.box(0.28, 0.34, 0.16), SP.flat(0x3c3f31, 0.85), 0, 0.2, 0.26, chest); const ant = M(geo.cyl(0.004, 0.004, 0.9, 4), dark, 0.1, 0.75, 0.3, chest, false); ant.rotation.z = -0.1; }
    if (o.medic) M(geo.box(0.12, 0.12, 0.01), SP.flat(0xeeeeee, 0.8), 0, 0.2, 0.25, chest);
  } else if (!civ) {
    M(geo.box(0.36, 0.2, 0.25), vestM, 0, 0.12, -0.01, chest);
    for (let i = -1; i <= 1; i++) M(geo.box(0.09, 0.12, 0.05), vestM, i * 0.1, 0.06, -0.15, chest);
  }
  const neck = M(geo.cyl(0.055, 0.06, 0.12, 8), skin, 0, 0.44, 0, chest);
  const head = new T.Group(); head.position.y = 0.55; chest.add(head);
  const skull = M(geo.sph(0.112, 16, 12), skin, 0, 0.0, 0, head); skull.scale.set(0.9, 1.08, 1);
  M(geo.box(0.03, 0.045, 0.04), skin, 0, -0.01, -0.105, head); // nose
  M(geo.box(0.02, 0.045, 0.03), skin, -0.1, 0, 0, head); M(geo.box(0.02, 0.045, 0.03), skin, 0.1, 0, 0, head);
  const eyeM = SP.flat(0x111111, 0.3); M(geo.box(0.02, 0.012, 0.01), eyeM, -0.035, 0.02, -0.1, head, false); M(geo.box(0.02, 0.012, 0.01), eyeM, 0.035, 0.02, -0.1, head, false);
  if (o.beard || (!us && r() < 0.6)) { const b = M(geo.sph(0.105, 12, 8), SP.flat(0x241a14, 0.95), 0, -0.04, -0.015, head); b.scale.set(0.86, 0.75, 0.95); }
  const hg = o.head || (us ? 'helmet' : pick(['shemagh', 'shemagh', 'beanie', 'bare', 'wrap']));
  if (hg === 'helmet') {
    const hm = SP.mat('fabric', { color: 0x8a7a5c, roughness: 0.9 });
    const h = M(new T.SphereGeometry(0.145, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hm, 0, 0.03, 0.005, head); h.scale.set(0.98, 0.95, 1.05);
    M(geo.box(0.05, 0.04, 0.03), dark, 0, 0.08, -0.14, head); M(geo.box(0.015, 0.04, 0.1), dark, -0.135, 0.02, 0, head); M(geo.box(0.015, 0.04, 0.1), dark, 0.135, 0.02, 0, head);
    if (o.goggles !== false && r() < 0.6) { const gg = M(geo.box(0.2, 0.04, 0.04), SP.flat(0x111111, 0.2, 0.3), 0, 0.09, -0.11, head); gg.rotation.x = -0.3; }
  } else if (hg === 'cap') {
    M(geo.cyl(0.118, 0.12, 0.08, 14), SP.mat('camo', {}), 0, 0.07, 0, head); M(geo.box(0.2, 0.012, 0.09), SP.mat('camo', {}), 0, 0.04, -0.12, head);
  } else if (hg === 'shemagh' || hg === 'wrap') {
    const sm = hg === 'shemagh' ? SP.mat('shemagh', { roughness: 0.95 }) : SP.mat('fabric', { color: pick([0x3a3a3a, 0x6a5a48, 0x2b3a2b]), roughness: 0.95 });
    const s1 = M(geo.sph(0.13, 14, 10), sm, 0, 0.03, 0.01, head); s1.scale.set(0.95, 0.95, 1.05);
    const s2 = M(geo.box(0.21, 0.09, 0.2), sm, 0, -0.06, -0.02, head); // face cover
    M(geo.box(0.22, 0.1, 0.2), sm, 0, -0.15, 0.03, head);
  } else if (hg === 'beanie') { const b = M(geo.sph(0.12, 14, 8), SP.flat(0x232323, 0.95), 0, 0.04, 0.005, head); b.scale.set(0.95, 0.8, 1.02); }
  else if (hg === 'hair') { const b = M(geo.sph(0.12, 14, 10), SP.flat(o.hairColor || 0x2a1a10, 0.8), 0, 0.03, 0.02, head); b.scale.set(0.96, 0.98, 1.06); const t = M(geo.box(0.16, 0.22, 0.06), SP.flat(o.hairColor || 0x2a1a10, 0.8), 0, -0.12, 0.08, head); }
  else { const b = M(geo.sph(0.116, 14, 8), SP.flat(0x1b140f, 0.9), 0, 0.03, 0.01, head); b.scale.set(0.92, 0.85, 1.02); }
  // arms
  const mkArm = (side) => {
    const sh = new T.Group(); sh.position.set(side * 0.235, 0.34, 0); chest.add(sh);
    M(geo.sph(0.07, 10, 8), top, 0, 0, 0, sh);
    M(geo.cyl(0.062, 0.054, 0.3, 10), top, 0, -0.15, 0, sh);
    const el = new T.Group(); el.position.y = -0.3; sh.add(el);
    M(geo.cyl(0.054, 0.045, 0.27, 10), us ? top : (r() < 0.5 ? top : skin), 0, -0.13, 0, el);
    const hand = M(geo.box(0.075, 0.1, 0.045), us ? glove : skin, 0, -0.31, 0, el);
    return { sh, el, hand };
  };
  const L = mkArm(-1), R = mkArm(1);
  const mkLeg = (side) => {
    const th = new T.Group(); th.position.set(side * 0.1, -0.06, 0); hips.add(th);
    M(geo.cyl(0.09, 0.07, 0.46, 10), pants, 0, -0.23, 0, th);
    if (us) M(geo.box(0.12, 0.1, 0.06), dark, 0, -0.46, -0.07, th); // knee pad
    const kn = new T.Group(); kn.position.y = -0.46; th.add(kn);
    M(geo.cyl(0.068, 0.052, 0.44, 10), pants, 0, -0.22, 0, kn);
    const ft = M(geo.box(0.11, 0.11, 0.28), boots, 0, -0.46, -0.05, kn);
    return { th, kn, ft };
  };
  const LL = mkLeg(-1), RL = mkLeg(1);
  // weapon
  let gun = null;
  if (o.weapon !== 'none') {
    gun = o.weapon === 'ak' ? Mods.ak() : o.weapon === 'shotgun' ? Mods.shotgun() : o.weapon === 'pistol' ? Mods.pistol() : Mods.m4(true);
    gun.scale.setScalar(1.0); chest.add(gun);
  }
  const S = { root, body, hips, spine, chest, head, L, R, LL, RL, gun, ph: r() * 6, breathe: r() * 6, dead: 0, deadDir: 1, flinch: 0, aimBlend: 0, crouchBlend: 0, lean: 0 };
  root.userData.rig = S;
  root.traverse(m => { if (m.isMesh) m.userData.rig = S; });
  return S;
};

/* pose/animate a soldier rig. st: {speed, crouch, aim(0..1), dead, sit, carry, hands:'up'|'cuffed'|'wave', prone} */
SP.animSoldier = function (S, dt, st) {
  const sp = st.speed || 0;
  S.crouchBlend = damp(S.crouchBlend, st.crouch ? 1 : 0, 10, dt);
  S.aimBlend = damp(S.aimBlend, st.aim != null ? st.aim : (sp > 3.5 ? 0.2 : 0.75), 8, dt);
  S.flinch = Math.max(0, S.flinch - dt * 4);
  if (st.dead) {
    S.dead = Math.min(1, S.dead + dt * 2.2); const k = S.dead * S.dead;
    S.body.rotation.x = S.deadDir * (Math.PI / 2) * k * 0.97; S.body.position.y = 0.13 * k; S.body.rotation.z = S.deadTwist * k || 0;
    S.L.sh.rotation.set(-0.2 * k + 0.5, 0, 0.9 * k); S.R.sh.rotation.set(0.3 * k, 0, -0.7 * k); S.LL.th.rotation.x = 0.3 * k; S.RL.th.rotation.x = -0.1 * k;
    S.LL.kn.rotation.x = -0.4 * k; S.RL.kn.rotation.x = -0.1 * k; S.spine.rotation.x = 0; S.head.rotation.set(0.3 * k, 0.5 * k, 0);
    if (S.gun) { S.gun.position.set(0.25, 0.1, -0.2); S.gun.rotation.set(0, 0.6, 1.4); }
    return;
  }
  const c = S.crouchBlend;
  S.ph += dt * (sp > 0.2 ? 1.6 + sp * 1.25 : 0); S.breathe += dt * 1.6;
  const amp = clamp(sp / 4, 0, 1) * (sp > 3.6 ? 0.95 : 0.6) * (1 - c * 0.5);
  const sw = Math.sin(S.ph);
  if (st.sit) {
    S.hips.position.y = 0.5; S.LL.th.rotation.x = S.RL.th.rotation.x = 1.5; S.LL.kn.rotation.x = S.RL.kn.rotation.x = -1.5; S.spine.rotation.x = -0.1;
  } else if (st.kneel) {
    S.hips.position.y = 0.55; S.LL.th.rotation.x = 1.4; S.LL.kn.rotation.x = -1.4; S.RL.th.rotation.x = -0.2; S.RL.kn.rotation.x = -1.75; S.spine.rotation.x = 0.05;
  } else {
    S.hips.position.y = lerp(0.98, 0.64, c) + Math.abs(Math.cos(S.ph)) * 0.035 * amp - 0.02 * amp;
    S.LL.th.rotation.x = sw * amp + c * 1.25; S.RL.th.rotation.x = -sw * amp + c * 0.55;
    S.LL.kn.rotation.x = -Math.max(0, Math.sin(S.ph - 1.3)) * 1.3 * amp - c * 1.9 - 0.05; S.RL.kn.rotation.x = -Math.max(0, Math.sin(S.ph + Math.PI - 1.3)) * 1.3 * amp - c * 1.15 - 0.05;
    S.spine.rotation.x = -0.06 - amp * 0.18 - c * 0.25 + Math.sin(S.breathe) * 0.01;
  }
  S.spine.rotation.z = S.lean; S.spine.rotation.y = 0;
  S.hips.rotation.y = sw * 0.08 * amp;
  const a = S.aimBlend, f = S.flinch;
  if (st.hands === 'up') { S.L.sh.rotation.set(2.9, 0, 0.3); S.R.sh.rotation.set(2.9, 0, -0.3); S.L.el.rotation.x = 0.4; S.R.el.rotation.x = 0.4; }
  else if (st.hands === 'cuffed') { S.L.sh.rotation.set(-0.3, 0, 0.25); S.R.sh.rotation.set(-0.3, 0, -0.25); S.L.el.rotation.x = 0.5; S.R.el.rotation.x = 0.5; }
  else if (st.hands === 'wave') { S.R.sh.rotation.set(2.6, 0, -0.4 + Math.sin(S.breathe * 3) * 0.3); S.R.el.rotation.x = 0.6; S.L.sh.rotation.set(0.1, 0, 0.1); S.L.el.rotation.x = 0.2; }
  else if (!S.gun || st.hands === 'free') { S.L.sh.rotation.set(-sw * amp * 0.8, 0, 0.08); S.R.sh.rotation.set(sw * amp * 0.8, 0, -0.08); S.L.el.rotation.x = 0.25 + amp * 0.4; S.R.el.rotation.x = 0.25 + amp * 0.4; }
  else {
    const raise = lerp(0.55, 1.28, a) - f * 0.5;
    S.R.sh.rotation.set(raise - 0.15, 0, -0.18); S.R.el.rotation.set(lerp(1.0, 0.55, a), 0, 0);
    S.L.sh.rotation.set(raise + 0.1, 0, 0.62); S.L.el.rotation.set(lerp(0.7, 0.25, a), 0, 0);
    S.gun.position.set(0.09, lerp(0.02, 0.29, a) - f * 0.1, lerp(-0.3, -0.3, a));
    S.gun.rotation.set(lerp(-0.55, 0, a) + f * 0.3, lerp(0.35, 0.02, a), 0);
  }
  S.head.rotation.x = -S.spine.rotation.x * 0.6 + (st.lookPitch || 0); S.head.rotation.y = st.lookYaw || 0;
};

/* ================= vehicles ================= */
Mods.wheel = function (r = 0.45, w = 0.32) {
  const g = new T.Group(); const t = M(new T.CylinderGeometry(r, r, w, 18), MAT.rubber(), 0, 0, 0, g); t.rotation.z = Math.PI / 2;
  const h = M(new T.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12), SP.mat('metal', { color: 0x5a5a55, roughness: 0.6, metalness: 0.5 }), 0, 0, 0, g); h.rotation.z = Math.PI / 2; return g;
};
Mods.buggy = function (color = 0x6b5a3e) {
  const g = new T.Group(); const paint = SP.mat('metal', { color, roughness: 0.65, metalness: 0.3 }), bar = SP.flat(0x1e1d1b, 0.5, 0.6), seat = SP.flat(0x252220, 0.9);
  M(geo.box(1.7, 0.25, 3.6), paint, 0, 0.62, 0, g); M(geo.box(1.6, 0.4, 1.0), paint, 0, 0.9, 1.25, g); M(geo.box(1.5, 0.35, 0.8), paint, 0, 0.82, -1.45, g);
  M(geo.box(0.55, 0.5, 0.55), seat, -0.4, 0.95, 0.15, g); M(geo.box(0.55, 0.5, 0.55), seat, 0.4, 0.95, 0.15, g);
  const tube = (x1, y1, z1, x2, y2, z2) => { const a = V3(x1, y1, z1), b = V3(x2, y2, z2); const l = a.distanceTo(b); const m = M(geo.cyl(0.035, 0.035, l, 6), bar, 0, 0, 0, g); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.rotateX(Math.PI / 2); };
  [[-0.78, -0.55], [0.78, -0.55], [-0.78, 0.95], [0.78, 0.95]].forEach(([x, z]) => tube(x, 0.75, z, x * 0.9, 2.0, z * 0.85));
  tube(-0.7, 2.0, -0.47, 0.7, 2.0, -0.47); tube(-0.7, 2.0, 0.8, 0.7, 2.0, 0.8); tube(-0.7, 2.0, -0.47, -0.7, 2.0, 0.8); tube(0.7, 2.0, -0.47, 0.7, 2.0, 0.8);
  M(geo.box(0.6, 0.3, 0.02), MAT.glassDark(), 0, 1.35, -0.6, g).rotation.x = -0.3;
  [[-0.98, -1.25], [0.98, -1.25], [-0.98, 1.3], [0.98, 1.3]].forEach(([x, z]) => { const w = Mods.wheel(0.48, 0.36); w.position.set(x, 0.48, z); g.add(w); (g.userData.wheels = g.userData.wheels || []).push(w); });
  M(geo.box(0.2, 0.08, 0.05), SP.flat(0xffffff, 0.3, 0, { emissive: 0xfff3d0, ei: 2 }), -0.5, 0.85, -1.86, g, false); M(geo.box(0.2, 0.08, 0.05), SP.flat(0xffffff, 0.3, 0, { emissive: 0xfff3d0, ei: 2 }), 0.5, 0.85, -1.86, g, false);
  g.userData.size = [2.2, 2.1, 3.9]; return g;
};
Mods.fiftyCal = function () { // mounted M2 / DShK
  const g = new T.Group(), m = MAT.gunMetal();
  M(geo.box(0.16, 0.18, 0.55), m, 0, 0, 0.05, g); M(geo.cyl(0.03, 0.03, 0.9, 10), m, 0, 0.02, -0.65, g).rotation.x = Math.PI / 2;
  M(geo.cyl(0.05, 0.05, 0.4, 10), m, 0, 0.02, -0.4, g).rotation.x = Math.PI / 2; M(geo.box(0.12, 0.2, 0.15), SP.flat(0x4a4f36, 0.8), 0.15, -0.05, 0.05, g);
  M(geo.box(0.3, 0.03, 0.03), m, 0, -0.02, 0.35, g); M(geo.cyl(0.02, 0.02, 0.12, 6), m, -0.15, -0.02, 0.4, g); M(geo.cyl(0.02, 0.02, 0.12, 6), m, 0.15, -0.02, 0.4, g);
  g.userData.muzzle = V3(0, 0.02, -1.1); return g;
};
Mods.technical = function (color = 0xd8d2c4) {
  const g = new T.Group(); const paint = SP.mat('metal', { color, roughness: 0.5, metalness: 0.35 }), dark = SP.flat(0x1c1c1c, 0.8);
  M(geo.box(1.85, 0.5, 5.1), paint, 0, 0.85, 0, g); M(geo.box(1.8, 0.75, 1.7), paint, 0, 1.45, -0.55, g); M(geo.box(1.82, 0.2, 1.3), paint, 0, 1.2, -1.95, g);
  M(geo.box(1.7, 0.55, 0.05), MAT.glassDark(), 0, 1.55, -1.42, g).rotation.x = -0.35; M(geo.box(0.04, 0.45, 1.2), MAT.glassDark(), -0.91, 1.55, -0.55, g); M(geo.box(0.04, 0.45, 1.2), MAT.glassDark(), 0.91, 1.55, -0.55, g);
  M(geo.box(1.85, 0.45, 0.06), paint, 0, 1.3, 2.53, g); M(geo.box(0.06, 0.45, 2.3), paint, -0.9, 1.3, 1.4, g); M(geo.box(0.06, 0.45, 2.3), paint, 0.9, 1.3, 1.4, g);
  M(geo.box(1.9, 0.25, 0.25), dark, 0, 0.65, -2.6, g); M(geo.box(1.4, 0.18, 0.04), dark, 0, 1.0, -2.56, g);
  [[-0.92, -1.65], [0.92, -1.65], [-0.92, 1.55], [0.92, 1.55]].forEach(([x, z]) => { const w = Mods.wheel(0.42, 0.3); w.position.set(x, 0.42, z); g.add(w); (g.userData.wheels = g.userData.wheels || []).push(w); });
  const post = M(geo.cyl(0.05, 0.05, 0.9, 8), dark, 0, 1.55, 1.2, g); const gun = Mods.fiftyCal(); gun.position.set(0, 2.05, 1.2); g.add(gun); g.userData.gun = gun;
  ['-0.6', '0.6'].forEach(x => M(geo.box(0.2, 0.1, 0.05), SP.flat(0xffffff, 0.3, 0, { emissive: 0xfff3d0, ei: 2 }), +x, 1.0, -2.58, g, false));
  g.userData.size = [2.0, 2.4, 5.3]; return g;
};
Mods.truck = function (kind = 'cargo', color = 0x5a5e44) {
  const g = new T.Group(); const paint = SP.mat('metal', { color, roughness: 0.7, metalness: 0.3 }), dark = SP.flat(0x1a1a1a, 0.85);
  M(geo.box(2.3, 0.45, 7.2), dark, 0, 0.95, 0, g); M(geo.box(2.3, 1.5, 1.9), paint, 0, 1.9, -2.6, g); M(geo.box(2.2, 0.6, 0.06), MAT.glassDark(), 0, 2.25, -3.56, g);
  M(geo.box(2.3, 0.8, 0.9), paint, 0, 1.35, -3.9, g);
  if (kind === 'fuel') {
    const tk = M(new T.CylinderGeometry(1.1, 1.1, 4.6, 20), SP.mat('metal', { color: 0xb5b0a2, roughness: 0.35, metalness: 0.75 }), 0, 2.15, 1.0, g); tk.rotation.x = Math.PI / 2;
    M(geo.box(2.32, 0.35, 0.02), SP.flat(0xc9461c, 0.6), 0, 2.2, -1.35, g); M(geo.box(0.6, 0.25, 0.02), SP.flat(0xf2c200, 0.6), 0, 2.2, 3.33, g);
  } else {
    M(geo.box(2.35, 0.3, 4.8), paint, 0, 1.35, 1.0, g);
    const cov = M(new T.CylinderGeometry(1.2, 1.2, 4.8, 16, 1, true, -Math.PI / 2, Math.PI), SP.mat('canvas', { roughness: 0.95, side: T.DoubleSide }), 0, 1.6, 1.0, g); cov.rotation.set(Math.PI / 2, 0, Math.PI / 2); cov.scale.set(1, 1, 0.9);
    M(geo.box(2.3, 1.1, 0.06), SP.mat('canvas', {}), 0, 2.1, 3.39, g);
  }
  [[-1.1, -2.8], [1.1, -2.8], [-1.1, 1.2], [1.1, 1.2], [-1.1, 2.6], [1.1, 2.6]].forEach(([x, z]) => { const w = Mods.wheel(0.55, 0.38); w.position.set(x, 0.55, z); g.add(w); });
  g.userData.size = [2.5, 3.3, 7.6]; return g;
};
Mods.heli = function () { // UH-60 style
  const g = new T.Group(); const paint = SP.mat('metal', { color: 0x3b3f33, roughness: 0.6, metalness: 0.35, ns: 0.3 }), dark = SP.flat(0x141414, 0.7), glass = MAT.glassDark();
  const body = M(geo.box(2.3, 1.9, 4.6), paint, 0, 1.9, 0, g);
  const nose = M(new T.CylinderGeometry(0.9, 1.15, 1.8, 14), paint, 0, 1.75, -3.1, g); nose.rotation.x = Math.PI / 2; nose.scale.x = 1.0;
  M(new T.SphereGeometry(0.9, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), paint, 0, 1.75, -4.0, g).rotation.x = -Math.PI / 2;
  M(geo.box(1.9, 0.8, 1.2), glass, 0, 2.3, -3.3, g).rotation.x = -0.35;
  const boom = M(new T.CylinderGeometry(0.28, 0.65, 6.5, 12), paint, 0, 2.3, 5.4, g); boom.rotation.x = Math.PI / 2;
  M(geo.box(0.15, 1.6, 1.0), paint, 0, 3.2, 8.4, g).rotation.x = -0.4; M(geo.box(2.2, 0.08, 0.6), paint, 0, 2.4, 7.8, g);
  M(geo.box(1.4, 0.5, 2.4), paint, 0, 3.05, -0.4, g); M(geo.cyl(0.18, 0.2, 0.5, 10), dark, 0, 3.5, -0.2, g);
  const rot = new T.Group(); rot.position.set(0, 3.75, -0.2); g.add(rot); for (let i = 0; i < 4; i++) { const b = M(geo.box(0.35, 0.04, 8.0), dark, 0, 0, 0, rot); b.position.set(Math.sin(i * Math.PI / 2) * 4, 0, Math.cos(i * Math.PI / 2) * 4); b.rotation.y = i * Math.PI / 2; }
  const tr = new T.Group(); tr.position.set(0.15, 3.4, 8.6); g.add(tr); for (let i = 0; i < 4; i++) { const b = M(geo.box(0.03, 1.4, 0.15), dark, 0, 0, 0, tr); b.rotation.x = i * Math.PI / 4; }
  M(geo.box(1.6, 0.08, 0.08), dark, 0, 0.35, -1.5, g); M(geo.box(1.6, 0.08, 0.08), dark, 0, 0.35, 1.2, g);
  M(geo.box(0.06, 0.06, 3.2), dark, -0.8, 0.12, -0.1, g); M(geo.box(0.06, 0.06, 3.2), dark, 0.8, 0.12, -0.1, g);
  M(geo.box(0.02, 1.4, 1.8), SP.flat(0x050505, 1), -1.16, 1.8, -0.2, g, false); M(geo.box(0.02, 1.4, 1.8), SP.flat(0x050505, 1), 1.16, 1.8, -0.2, g, false); // open doors (dark)
  g.userData.rotor = rot; g.userData.tail = tr; return g;
};

/* ================= props ================= */
Mods.palm = function (h = 8) {
  const g = new T.Group(); const tm = SP.mat('palm', { roughness: 0.95 }); let y = 0, x = 0, lean = rand(-0.15, 0.15);
  for (let i = 0; i < 6; i++) { const s = M(geo.cyl(0.17 - i * 0.012, 0.19 - i * 0.012, h / 6, 8), tm, x, y + h / 12, 0, g); s.rotation.z = lean; x -= Math.sin(lean) * h / 6; y += h / 6; }
  const fm = SP.frondMat || (SP.frondMat = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const k = c.getContext('2d'); k.strokeStyle = '#4c5a2a'; k.lineWidth = 3; k.beginPath(); k.moveTo(32, 0); k.lineTo(32, 256); k.stroke(); for (let i = 8; i < 250; i += 5) { k.strokeStyle = i % 10 ? '#5e6d31' : '#6f7b3c'; k.lineWidth = 2; k.beginPath(); k.moveTo(32, i); k.lineTo(32 - 30 * (1 - i / 300), i + 18); k.moveTo(32, i); k.lineTo(32 + 30 * (1 - i / 300), i + 18); k.stroke(); } const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshStandardMaterial({ map: t, alphaTest: 0.4, side: T.DoubleSide, roughness: 0.85 }); })());
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; const f = new T.Mesh(new T.PlaneGeometry(1.1, 3.4), fm); f.castShadow = true; const p = new T.Group(); p.position.set(x, y, 0); p.rotation.y = a; f.position.set(0, 0, 1.6); f.rotation.x = -Math.PI / 2 + 0.55 + rand(-0.2, 0.3); p.add(f); g.add(p); }
  return g;
};
Mods.barrel = function (color = 0x2d4c74) { const g = new T.Group(); const m = SP.mat('metal', { color, roughness: 0.55, metalness: 0.45 }); M(geo.cyl(0.29, 0.29, 0.9, 16), m, 0, 0.45, 0, g); M(geo.cyl(0.3, 0.3, 0.03, 16), m, 0, 0.3, 0, g); M(geo.cyl(0.3, 0.3, 0.03, 16), m, 0, 0.6, 0, g); return g; };
Mods.drugPack = function () { return M(geo.box(0.22, 0.07, 0.15), SP.mat('fabric', { color: 0xe8e4da, roughness: 0.4 })); };
Mods.laptop = function () { const g = new T.Group(); M(geo.box(0.34, 0.02, 0.24), SP.flat(0x222222, 0.4, 0.3), 0, 0.01, 0, g); const s = M(geo.box(0.34, 0.22, 0.01), SP.flat(0x222222, 0.4, 0.3), 0, 0.12, 0.12, g); s.rotation.x = -0.25; M(geo.box(0.3, 0.18, 0.002), SP.flat(0x10203a, 0.2, 0, { emissive: 0x3a6aa8, ei: 1.6 }), 0, 0.12, 0.112, g, false).rotation.x = -0.25; return g; };
})();

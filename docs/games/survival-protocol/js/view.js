/* Survival Protocol — first-person view model (rendered in its own pass so it never clips) */
'use strict';
(function () {
const T = THREE, { V3, rand, lerp, clamp, damp } = SP;
const geo = SP.geo, M = SP.M;
SP.vmScene = new T.Scene();
SP.vmCam = new T.PerspectiveCamera(58, 1, 0.01, 10);
SP.vmScene.add(SP.vmCam);
SP.vmSun = new T.DirectionalLight(0xffffff, 2); SP.vmScene.add(SP.vmSun); SP.vmScene.add(SP.vmSun.target);
SP.vmHemi = new T.HemisphereLight(0xffffff, 0x444444, 0.5); SP.vmScene.add(SP.vmHemi);
SP.vmFill = new T.PointLight(0xffb070, 0, 3); SP.vmCam.add(SP.vmFill); SP.vmFill.position.set(0.1, 0.05, -0.6);

SP.vmSleeveMat = () => { const m = SP.mat('camo', { roughness: 0.92 }).clone(); SP.applySkin && SP.applySkin(m, 'sleeve'); return m; };
SP.vmGloveMat = () => { const m = SP.flat(0x2e2a26, 0.75).clone(); SP.applySkin && SP.applySkin(m, 'glove'); return m; };
function limb(a, b, r, mat, parent) { const l = a.distanceTo(b); const m = M(new T.CylinderGeometry(r * 0.9, r, l, 10), mat, 0, 0, 0, parent, false); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.rotateX(Math.PI / 2); return m; }
function hand(g, p, glove, rx, left) { // palm, wrapped fingers, thumb and knuckle pad
  const h = new T.Group(); h.position.copy(p); h.rotation.x = rx; g.add(h);
  M(geo.box(0.072, 0.085, 0.08), glove, 0, 0, 0, h, false); M(geo.box(0.07, 0.04, 0.05), glove, 0, -0.035, -0.045, h, false).rotation.x = 0.6;
  for (let i = 0; i < 4; i++) M(geo.box(0.015, 0.018, 0.05), glove, -0.026 + i * 0.0175, 0.025, -0.05, h, false).rotation.x = -0.5;
  M(geo.box(0.022, 0.02, 0.055), glove, (left ? 1 : -1) * 0.04, 0.0, -0.03, h, false).rotation.z = (left ? -1 : 1) * 0.4;
  M(geo.box(0.06, 0.012, 0.035), SP.flat(0x1a1a1a, 0.6), 0, 0.044, -0.005, h, false);
  return h;
}
function arms(g, rHand, lHand, rElbow, lElbow) {
  const sleeve = SP.vmSleeveMat(), glove = SP.vmGloveMat(), watch = SP.flat(0x111111, 0.4, 0.2), glow = SP.vmGlowMat ? SP.vmGlowMat() : null;
  const cuff = (a, b, r) => { const c = a.clone().lerp(b, 0.12); const m = limb(a.clone().lerp(b, 0.06), c, r * 1.18, glow || SP.vmGloveMat(), g); return m; };
  limb(rElbow, rHand, 0.042, sleeve, g); limb(rElbow.clone().add(V3(0.08, -0.12, 0.25)), rElbow, 0.05, sleeve, g); cuff(rHand, rElbow, 0.042);
  hand(g, rHand, glove, 0.3, false);
  if (lHand) { limb(lElbow, lHand, 0.042, sleeve, g); limb(lElbow.clone().add(V3(-0.12, -0.1, 0.2)), lElbow, 0.05, sleeve, g); cuff(lHand, lElbow, 0.042); hand(g, V3(lHand.x, lHand.y - 0.02, lHand.z), glove, 0.1, true); M(geo.box(0.05, 0.05, 0.04), watch, lElbow.x * 0.25 + lHand.x * 0.75, lElbow.y * 0.25 + lHand.y * 0.75 - 0.03, lElbow.z * 0.25 + lHand.z * 0.75, g, false); }
}
const CFG = {
  m4: { hip: V3(0.17, -0.185, -0.42), ads: (s) => V3(-s.x, -s.y, -0.2), hands: [V3(0, -0.11, 0.06), V3(0, -0.035, -0.42), V3(0.12, -0.3, 0.28), V3(-0.2, -0.24, -0.15)] },
  sup: null,
  pistol: { hip: V3(0.13, -0.15, -0.38), adsP: V3(0, -0.052, -0.34), hands: [V3(0, -0.07, 0.03), V3(-0.015, -0.08, 0.02), V3(0.1, -0.25, 0.3), V3(-0.12, -0.25, 0.28)] },
  knife: { hip: V3(0.16, -0.17, -0.34), adsP: V3(0.12, -0.15, -0.34), hands: [V3(0, -0.0, 0.04), null, V3(0.1, -0.25, 0.3), null] },
  at4: { hip: V3(0.2, -0.22, -0.2), adsP: V3(0.05, -0.115, -0.25), hands: [V3(0, -0.08, -0.05), V3(0, -0.08, -0.25), V3(0.12, -0.3, 0.2), V3(-0.18, -0.3, -0.05)] },
};
CFG.sup = CFG.m4;
const VM = SP.VM = { group: null, gun: null, cfg: null, t: 0, kick: 0, swayX: 0, swayY: 0, lastYaw: 0, lastPitch: 0, shells: [], reloadPh: 0 };
// viewmodels are built once per gun + look and reused, so swapping guns never rebuilds meshes or materials
const vmCache = new Map();
function vmKey(w) { const PR = SP.Progress || {}; const PS = SP.Pass && SP.Pass.PS; return w + '|' + JSON.stringify((PR.att || {})[w] || '') + '|' + ((PR.camo || {})[w] || '') + '|' + (PS ? PS.skin : '') + '|' + (w === 'knife' ? PR.knife : ''); }
function useCached(w) {
  const k = vmKey(w), e = vmCache.get(k); if (!e) return false;
  if (VM.group) SP.vmCam.remove(VM.group);
  const { g, gun, c } = e; g.position.copy(c.hip); g.rotation.set(0, 0, 0); g.visible = true; SP.vmCam.add(g); VM.group = g; VM.gun = gun; VM.cfg = c; VM.w = w; VM.drop = 0.5;
  if (gun.userData.slide) gun.userData.slide.position.z = 0;
  const sight = gun.userData.sight || V3(0, 0.05, 0); VM.adsPos = c.adsP ? c.adsP.clone() : V3(-sight.x, -sight.y, -0.2); VM.turret = null; return true;
}
SP.buildViewModel = function (w, warmOnly) {
  if (!warmOnly && useCached(w)) return;
  if (warmOnly && vmCache.has(vmKey(w))) return;
  if (!warmOnly && VM.group) SP.vmCam.remove(VM.group);
  const g = new T.Group(); const gun = SP.WEAP[w].model(); g.add(gun);
  // see-through optic
  gun.traverse(m => { if (m.isMesh && m.material === SP.MAT.glassDark()) { m.material = new T.MeshStandardMaterial({ color: 0x9fb8c0, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.5 }); } });
  gun.traverse(m => { if (m.isMesh && m.geometry.parameters && m.geometry.parameters.radiusTop === 0.024) { m.geometry = new T.CylinderGeometry(0.024, 0.024, 0.1, 18, 1, true); m.material = SP.flat(0x1a1a1a, 0.6, 0.1, { side: T.DoubleSide }); } });
  const base = SP.WEAP[w].vmAs || w; const c = CFG[base] || CFG.m4; const h = c.hands; if (base === 'knife') { const glove = SP.vmGloveMat(); M(geo.box(0.06, 0.07, 0.09), glove, 0, 0, 0.04, gun, false); limb(V3(0.1, -0.25, 0.3), V3(0, 0, 0.04), 0.042, SP.vmSleeveMat(), gun); gun.rotation.set(0.25, 0.15, -0.35); } else arms(gun, h[0], base === 'pistol' ? null : h[1], h[2], h[3]);
  if (base === 'pistol') { const glove = SP.vmGloveMat(); M(geo.box(0.07, 0.08, 0.08), glove, -0.03, -0.08, 0.02, gun, false); limb(V3(-0.15, -0.3, 0.3), V3(-0.03, -0.08, 0.02), 0.042, SP.vmSleeveMat(), gun); }
  gun.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
  g.position.copy(c.hip);
  if (vmCache.size > 40) { const k0 = vmCache.keys().next().value; vmCache.delete(k0); }
  vmCache.set(vmKey(w), { g, gun, c });
  if (warmOnly) { // compile its shaders now (off-screen) so the first swap to it doesn't hitch
    try { g.visible = true; SP.vmCam.add(g); const prev = VM.group; if (prev) prev.visible = false; SP.renderer.compile(SP.vmScene, SP.vmCam); if (prev) prev.visible = true; } catch (e) { }
    SP.vmCam.remove(g); return;
  }
  SP.vmCam.add(g); VM.group = g; VM.gun = gun; VM.cfg = c; VM.w = w; VM.drop = 0.5;
  const sight = gun.userData.sight || V3(0, 0.05, 0);
  VM.adsPos = c.adsP ? c.adsP.clone() : V3(-sight.x, -sight.y, -0.2);
  VM.turret = null;
};
// warm a gun's viewmodel in the background (used when you pick a gun up)
SP.warmViewModel = function (w) { if (!SP.WEAP[w] || !SP.WEAP[w].model) return; const run = () => { try { SP.buildViewModel(w, true); } catch (e) { } }; (window.requestIdleCallback || (f => setTimeout(f, 30)))(run); };
SP.clearVMCache = () => vmCache.clear();
SP.buildTurretVM = function (name) {
  if (VM.group) SP.vmCam.remove(VM.group);
  const g = new T.Group(); const gun = SP.Models.fiftyCal(); gun.position.set(0, -0.32, -0.5); g.add(gun);
  const glove = SP.vmGloveMat(); M(geo.box(0.07, 0.1, 0.08), glove, -0.15, -0.36, -0.08, g, false); M(geo.box(0.07, 0.1, 0.08), glove, 0.15, -0.36, -0.08, g, false);
  limb(V3(-0.3, -0.6, 0.25), V3(-0.15, -0.36, -0.08), 0.045, SP.vmSleeveMat(), g); limb(V3(0.3, -0.6, 0.25), V3(0.15, -0.36, -0.08), 0.045, SP.vmSleeveMat(), g);
  SP.vmCam.add(g); VM.group = g; VM.gun = gun; VM.turret = gun; VM.w = 'turret';
};
SP.hideVM = function (h) { if (VM.group) VM.group.visible = !h; };
VM.muzzleWorld = function () {
  if (!VM.gun) return SP.P.eyePos(); VM.group.updateMatrixWorld(true);
  const local = VM.gun.localToWorld(VM.gun.userData.muzzle.clone()); // in vmCam space (vmCam at origin with main camera rotation)
  return local.add(SP.camera.position);
};
VM.onFire = function () {
  VM.kick = 1; const w = VM.w;
  if (VM.gun && VM.gun.userData.slide) VM.gun.userData.slide.position.z = 0.0;
  if (w === 'm4' || w === 'sup' || w === 'pistol') { // shell
    const s = new T.Mesh(geo.cyl(0.005, 0.005, 0.03, 6), SP.flat(0xc9a44a, 0.3, 0.9)); VM.group.updateMatrixWorld(true);
    const p = VM.gun.localToWorld(V3(0.03, 0.05, -0.02)); s.position.copy(p); SP.vmScene.add(s);
    const v = V3(rand(1.2, 2), rand(1.2, 2), rand(0, 0.5)).applyQuaternion(SP.vmCam.quaternion); VM.shells.push({ s, v, t: 0.6 });
  }
};
VM.update = function (dt) {
  const P = SP.P, cam = SP.camera; SP.vmCam.quaternion.copy(cam.quaternion); SP.vmCam.aspect = cam.aspect; SP.vmCam.fov = lerp(52, 40, P.adsT); SP.vmCam.updateProjectionMatrix();
  if (!VM.group) return;
  const dyaw = SP.angDiff(VM.lastYaw, P.yaw), dp = P.pitch - VM.lastPitch; VM.lastYaw = P.yaw; VM.lastPitch = P.pitch;
  VM.swayX = damp(VM.swayX, clamp(-dyaw * 1.6, -0.05, 0.05), 10, dt); VM.swayY = damp(VM.swayY, clamp(dp * 1.6, -0.05, 0.05), 10, dt);
  VM.kick = damp(VM.kick, 0, 18, dt); VM.drop = damp(VM.drop, 0, 9, dt); VM.t += dt;
  for (let i = VM.shells.length - 1; i >= 0; i--) { const s = VM.shells[i]; s.t -= dt; s.v.y -= 9 * dt; s.s.position.addScaledVector(s.v, dt); s.s.rotation.x += dt * 20; if (s.t <= 0) { SP.vmScene.remove(s.s); VM.shells.splice(i, 1); } }
  if (VM.turret) { VM.group.position.set(VM.swayX * 0.3, -VM.kick * 0.015 + Math.sin(VM.t * 30) * 0.002 * VM.kick, VM.kick * 0.04); VM.group.rotation.set(VM.kick * 0.01, 0, 0); return; }
  const a = P.adsT, sp = P.sprintT; const c = VM.cfg; const bobAmt = Math.min(1, (P.speed || 0) / 4.5) * (P.mode === 'walk' ? 1 : 0);
  const ph = P.bob * Math.PI / 1.55; const bx = Math.cos(ph) * 0.012 * bobAmt * (1 - a * 0.85), by = Math.abs(Math.sin(ph)) * 0.012 * bobAmt * (1 - a * 0.85);
  const idle = Math.sin(VM.t * 1.4) * 0.002 * (1 - a);
  const pos = c.hip.clone().lerp(VM.adsPos, a);
  pos.x += bx + VM.swayX * (1 - a * 0.7) + sp * 0.05; pos.y += -by + idle + VM.swayY * (1 - a * 0.7) - sp * 0.06 - VM.drop * 0.3; pos.z += VM.kick * 0.045 * (VM.w === 'pistol' ? 0.6 : 1);
  let rx = VM.kick * 0.05 + sp * -0.25 + VM.swayY * 2, ry = sp * 0.75 + VM.swayX * 2 * (1 - a), rz = sp * 0.25 + VM.swayX * -3 * (1 - a);
  if (P.reloadT > 0) { const w = SP.WEAP[P.cur]; const k = 1 - P.reloadT / w.reload; const e = Math.sin(clamp(k, 0, 1) * Math.PI); pos.y -= e * 0.07; rx += e * 0.25; rz += e * 0.55; const mag = VM.gun.userData.mag; if (mag) { mag.position.y = -0.1 - (k > 0.15 && k < 0.6 ? 0.35 : 0); } }
  else if (VM.gun.userData.mag) VM.gun.userData.mag.position.y = -0.1;
  if (P.mode === 'downed') { pos.x -= 0.02; pos.y += 0.02; rz += 0.3; }
  VM.group.position.copy(pos); VM.group.rotation.set(rx, ry, rz);
  if (VM.gun.userData.slide) VM.gun.userData.slide.position.z = damp(VM.gun.userData.slide.position.z, -0.05 + VM.kick * 0.04, 30, dt);
  // view-model lighting follows world sun
  if (SP.sun) { SP.vmSun.position.copy(SP.sun.position).sub(SP.sun.target.position).normalize().multiplyScalar(5); SP.vmSun.color.copy(SP.sun.color); SP.vmSun.intensity = SP.sun.intensity * (SP.vmSunMul != null ? SP.vmSunMul : 0.9); }
  SP.vmFill.intensity = VM.kick * 3;
};
})();

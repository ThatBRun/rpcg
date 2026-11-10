/* Survival Protocol 1.3 — GUNS 2.0: new, much more detailed models for every gun (bevelled receivers, rails,
   ejection ports, charging handles, trigger guards, shaped grips and stocks, curved mags, real optics), wraps and
   camos that cover the whole gun, and every finished gun merged into a handful of meshes (one per material) so
   they cost almost nothing to draw. Third-person and floor guns share one cached copy per gun. */
'use strict';
(function () {
const T = THREE, { V3 } = SP; const Mods = SP.Models, MAT = SP.MAT, CAMOS = SP.CAMOS;

/* ---------- materials ---------- */
const F = {
  black: () => MAT.polymer(), fde: () => MAT.fde(), metal: () => MAT.gunMetal(), wood: () => MAT.akWood(),
  olive: () => SP.flat(0x4a4f36, 0.72), tan: () => SP.flat(0xa08a64, 0.72), grey: () => SP.flat(0x5a5c5e, 0.55, 0.25),
  blued: () => SP.mat('metal', { color: 0x22262c, roughness: 0.35, metalness: 0.78 }), chrome: () => SP.mat('metal', { color: 0xc4c8cc, roughness: 0.18, metalness: 0.95 }),
  darkwood: () => SP.mat('wood', { color: 0x5a3420, roughness: 0.5 }), dark: () => SP.flat(0x0c0c0c, 0.6, 0.2), steel: () => SP.mat('metal', { color: 0x3a3c40, roughness: 0.38, metalness: 0.85 }),
  rubber: () => SP.flat(0x141414, 0.95),
};
function camoMat(att) {
  const c = att.camo && CAMOS[att.camo]; if (!c) return null;
  let m; if (c.tex && SP.wrapMat) { m = SP.wrapMat(c); } else m = c.metal ? SP.mat('metal', { color: c.color, roughness: 0.28, metalness: 0.85 }).clone() : SP.flat(c.color, 0.65, 0.05).clone();
  m.userData.boxUV = true; return m;
}

/* ---------- cached shaped geometry ---------- */
const GC = {}; const box = (w, h, d) => SP.geo.box(w, h, d), cyl = (a, b, h, s = 14) => SP.geo.cyl(a, b, h, s);
function rrShape(w, h, r) { const s = new T.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
// rounded-section bar running along Z (receivers, handguards, slides)
function bar(w, h, len, r = 0.008) { const k = 'bar' + [w, h, len, r]; if (GC[k]) return GC[k]; const g = new T.ExtrudeGeometry(rrShape(w, h, r), { depth: len, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0018, bevelSegments: 1, curveSegments: 3 }); g.translate(0, 0, -len / 2); return GC[k] = g; }
// side profile (points as [z, y]) extruded across X by width
function prof(key, pts, w, holes) { const k = 'pf' + key + w; if (GC[k]) return GC[k]; const s = new T.Shape(); pts.forEach(([z, y], i) => i ? s.lineTo(-z, y) : s.moveTo(-z, y)); s.closePath(); (holes || []).forEach(hp => { const h = new T.Path(); hp.forEach(([z, y], i) => i ? h.lineTo(-z, y) : h.moveTo(-z, y)); h.closePath(); s.holes.push(h); }); const g = new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 4 }); g.rotateY(Math.PI / 2); g.translate(-w / 2, 0, 0); return GC[k] = g; }

/* ---------- part placement + merge ---------- */
function P(g, geo, mat, x, y, z, rx, ry, rz) { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; g.add(m); return m; }
const tv = new T.Vector3(), tn = new T.Vector3(), nm = new T.Matrix3();
// merge every mesh under g (except keep-sets) into one mesh per material
function mergeGun(g, keep) {
  g.updateMatrixWorld(true); const inv = new T.Matrix4().copy(g.matrixWorld).invert(); const groups = new Map(); const kill = [];
  g.traverse(o => { if (!o.isMesh || o === g) return; let p = o; while (p && p !== g) { if (keep.has(p)) return; p = p.parent; } if (o.material.transparent || Array.isArray(o.material)) return; const k = o.material.uuid; if (!groups.has(k)) groups.set(k, { m: o.material, list: [] }); groups.get(k).list.push(o); kill.push(o); });
  for (const { m, list } of groups.values()) {
    let n = 0; const parts = list.map(o => { const gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; n += gg.attributes.position.count; return { o, gg }; });
    const Pa = new Float32Array(n * 3), Na = new Float32Array(n * 3), Ua = new Float32Array(n * 2); let off = 0; const box = m.userData && m.userData.boxUV;
    for (const { o, gg } of parts) {
      const mat = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(mat); const pa = gg.attributes.position, na = gg.attributes.normal, ua = gg.attributes.uv;
      for (let i = 0; i < pa.count; i++) {
        tv.fromBufferAttribute(pa, i).applyMatrix4(mat); tn.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); const j = off + i;
        Pa[j * 3] = tv.x; Pa[j * 3 + 1] = tv.y; Pa[j * 3 + 2] = tv.z; Na[j * 3] = tn.x; Na[j * 3 + 1] = tn.y; Na[j * 3 + 2] = tn.z;
        if (box) { const s = 2.2, ax = Math.abs(tn.x), ay = Math.abs(tn.y), az = Math.abs(tn.z); if (ax >= ay && ax >= az) { Ua[j * 2] = tv.z * s; Ua[j * 2 + 1] = tv.y * s; } else if (ay >= az) { Ua[j * 2] = tv.z * s; Ua[j * 2 + 1] = tv.x * s; } else { Ua[j * 2] = tv.x * s; Ua[j * 2 + 1] = tv.y * s; } }
        else if (ua) { Ua[j * 2] = ua.getX(i); Ua[j * 2 + 1] = ua.getY(i); }
      }
      off += pa.count; if (gg !== o.geometry) gg.dispose();
    }
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(Pa, 3)); bg.setAttribute('normal', new T.BufferAttribute(Na, 3)); bg.setAttribute('uv', new T.BufferAttribute(Ua, 2)); bg.computeBoundingSphere();
    const mesh = new T.Mesh(bg, m); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
  }
  for (const o of kill) o.parent.remove(o);
  return g;
}

/* ---------- rifles / SMGs / LMGs / snipers / shotguns ---------- */
Mods.gun = function (L, att) {
  att = att || {}; const g = new T.Group(); const keep = new Set();
  const wrap = camoMat(att); const bodyF = L.fin || 'black';
  const body = wrap || F[bodyF](), acc = F[L.acc || 'metal'](), blk = F.black(), met = F.metal(), stl = F.steel(), dark = F.dark();
  const wood = L.fin === 'wood' || L.fin === 'darkwood'; const furn = wrap || (L.hgFin ? F[L.hgFin]() : body);
  const len = L.len || 0.5, barL = L.bar || 0.2, bp = !!L.bullpup, ak = wood || L.mag === 'curved' && L.fin !== 'black';
  const rz = bp ? 0.06 : -0.05, rcvL = len * 0.55, Y = 0.035;
  // receiver: upper + lower, with ejection port, dust cover, forward assist, charging handle, mag release
  P(g, bar(0.056, 0.05, rcvL, 0.01), wood ? (wrap || stl) : body, 0, Y + 0.018, rz);
  P(g, bar(0.05, 0.05, rcvL * 0.88, 0.008), wrap || (wood ? stl : (L.acc ? acc : body)), 0, Y - 0.025, rz + 0.01);
  P(g, box(0.004, 0.022, 0.06), dark, 0.029, Y + 0.02, rz + 0.01);                      // ejection port
  P(g, box(0.003, 0.026, 0.07), met, 0.03, Y + 0.02, rz + 0.012);                       // dust cover
  if (!ak) { P(g, cyl(0.009, 0.009, 0.02, 10), met, 0.03, Y + 0.025, rz + rcvL * 0.32, 0, 0, Math.PI / 2); P(g, box(0.03, 0.008, 0.02), met, 0, Y + 0.046, rz + rcvL * 0.47); }
  else { P(g, box(0.012, 0.01, 0.03), F.chrome(), 0.034, Y + 0.02, rz - 0.02); P(g, box(0.058, 0.012, rcvL * 0.9), stl, 0, Y + 0.047, rz + 0.01); }
  P(g, box(0.008, 0.012, 0.02), met, -0.027, Y - 0.022, rz - rcvL * 0.12);              // mag release
  // top rail (picatinny with teeth) for non-AK guns
  if (!ak && L.rail !== false) { const rl = rcvL * 0.95; P(g, box(0.024, 0.008, rl), met, 0, Y + 0.047, rz - 0.01); for (let i = 0; i < Math.floor(rl / 0.012); i++) P(g, box(0.026, 0.005, 0.006), met, 0, Y + 0.053, rz - 0.01 - rl / 2 + 0.006 + i * 0.012); }
  // handguard
  const hgL = len * (bp ? 0.55 : 0.6), hgZ = rz - rcvL / 2 - hgL / 2; const front = hgZ - hgL / 2;
  if (L.hg !== false) {
    if (wood) { P(g, bar(L.hgW || 0.06, 0.058, hgL, 0.02), furn, 0, Y - 0.002, hgZ); P(g, bar(0.05, 0.03, hgL * 0.75, 0.012), furn, 0, Y + 0.04, hgZ + hgL * 0.08); for (let i = 0; i < 3; i++) P(g, box(0.062, 0.004, 0.004), dark, 0, Y + 0.0, hgZ - hgL * 0.3 + i * hgL * 0.3); }
    else { P(g, bar(L.hgW || 0.064, L.hgH || 0.066, hgL, 0.014), furn, 0, Y + 0.002, hgZ); for (const s of [-1, 1]) for (let i = 0; i < Math.floor(hgL / 0.05); i++) P(g, box(0.004, 0.012, 0.03), dark, s * 0.033, Y + 0.004, hgZ - hgL / 2 + 0.035 + i * 0.05); if (L.rail !== false) { P(g, box(0.022, 0.008, hgL * 0.95), met, 0, Y + 0.04, hgZ); for (let i = 0; i < Math.floor(hgL / 0.014); i++) P(g, box(0.024, 0.005, 0.006), met, 0, Y + 0.046, hgZ - hgL / 2 + 0.008 + i * 0.014); } }
  }
  // barrel, gas block, front sight, muzzle device
  const bR = L.barR || 0.011;
  P(g, cyl(bR, bR, barL + 0.04, 12), stl, 0, Y + 0.004, front - barL / 2 + 0.02, Math.PI / 2);
  if (!bp) P(g, box(0.026, 0.03, 0.03), met, 0, Y + 0.008, front - 0.012);
  let mz = front - barL;
  if (att.sup) { P(g, cyl(0.021, 0.021, 0.17, 18), blk, 0, Y + 0.004, mz - 0.085, Math.PI / 2); for (let i = 0; i < 4; i++) P(g, cyl(0.0215, 0.0215, 0.006, 18), stl, 0, Y + 0.004, mz - 0.025 - i * 0.04, Math.PI / 2); mz -= 0.17; }
  else if (L.brake) { P(g, bar(0.036, 0.03, 0.07, 0.008), met, 0, Y + 0.004, mz - 0.035); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) P(g, box(0.003, 0.018, 0.01), dark, s * 0.019, Y + 0.004, mz - 0.015 - i * 0.02); mz -= 0.07; }
  else { P(g, cyl(0.016, 0.014, 0.055, 12), met, 0, Y + 0.004, mz - 0.027, Math.PI / 2); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; P(g, box(0.003, 0.003, 0.03), dark, Math.cos(a) * 0.016, Y + 0.004 + Math.sin(a) * 0.016, mz - 0.03); } mz -= 0.055; }
  if (L.tube) P(g, cyl(0.016, 0.016, hgL + barL * 0.6, 12), met, 0, Y - 0.026, front + hgL / 2 - (hgL + barL * 0.6) / 2, Math.PI / 2);
  if (L.pump) { P(g, bar(0.054, 0.05, 0.16, 0.016), wrap || blk, 0, Y - 0.026, front + 0.05); for (let i = 0; i < 6; i++) P(g, box(0.056, 0.004, 0.006), dark, 0, Y - 0.026, front + 0.0 + i * 0.02); }
  // trigger guard + trigger + pistol grip (shaped)
  const gz = bp ? rz - len * 0.2 : rz + len * 0.2;
  P(g, SP.GC.tg || (SP.GC.tg = new T.TorusGeometry(0.026, 0.004, 6, 14, Math.PI)), met, 0, Y - 0.05, gz - 0.02, 0, Math.PI / 2, Math.PI);
  P(g, box(0.006, 0.026, 0.006), met, 0, Y - 0.06, gz - 0.02, 0.3);
  if (L.grip !== false) P(g, prof('grip', [[0.0, 0.0], [0.05, 0.0], [0.075, -0.12], [0.03, -0.13], [-0.005, -0.02]], 0.044), wrap || blk, 0, Y - 0.05, gz + 0.005);
  // magazine (kept separate so the reload can animate it)
  const mz2 = bp ? rz + len * 0.22 : rz - len * 0.12; const mag = new T.Group(); mag.position.set(0, -0.1, mz2); g.add(mag); keep.add(mag); const mi = new T.Group(); mi.position.y = Y - 0.05 + 0.1; mag.add(mi); // reload animation moves mag.y around -0.1
  const magF = wrap || (L.magFin ? F[L.magFin]() : blk);
  switch (L.mag) {
    case 'curved': P(mi, prof('akmag', [[-0.036, 0.01], [0.036, 0.01], [0.03, -0.06], [0.006, -0.13], [-0.04, -0.2], [-0.1, -0.235], [-0.135, -0.18], [-0.085, -0.13], [-0.055, -0.07]], 0.038), magF, 0, 0, 0); for (let i = 0; i < 3; i++) P(mi, box(0.04, 0.004, 0.012), F.dark(), 0, -0.05 - i * 0.05, 0.02 - i * 0.03, -0.3 - i * 0.25); P(mi, prof('akmagf', [[-0.1, -0.235], [-0.135, -0.18], [-0.143, -0.186], [-0.106, -0.245]], 0.042), F.dark(), 0, 0, 0); break;
    case 'drum': P(mi, cyl(0.08, 0.08, 0.06, 24), magF, 0, -0.07, 0, 0, 0, Math.PI / 2); P(mi, cyl(0.04, 0.04, 0.066, 16), met, 0, -0.07, 0, 0, 0, Math.PI / 2); P(mi, bar(0.04, 0.05, 0.05, 0.006), magF, 0, -0.01, 0); break;
    case 'box': P(mi, bar(0.1, 0.11, 0.13, 0.012), wrap || F.olive(), 0.03, -0.03, 0); P(mi, box(0.012, 0.03, 0.02), F.chrome(), -0.02, 0.02, 0); break;
    case 'short': P(mi, bar(0.04, 0.11, 0.06, 0.006), magF, 0, -0.03, 0); P(mi, box(0.044, 0.012, 0.064), blk, 0, -0.088, 0); break;
    case 'long': P(mi, bar(0.038, 0.25, 0.05, 0.006), magF, 0, -0.1, -0.01, -0.08); P(mi, box(0.042, 0.012, 0.054), blk, 0, -0.225, -0.02); break;
    case 'top': { const t = new T.Mesh(box(0.05, 0.03, len * 0.6), SP.flat(0x9a9070, 0.3, 0, { transparent: true, opacity: 0.85 })); t.position.set(0, 0.105, rz - 0.03 - mz2); mi.add(t); break; }
    case 'side': P(mi, bar(0.16, 0.035, 0.045, 0.006), met, -0.1, 0.045, 0); break;
    case 'tube': case 'none': break;
    default: P(mi, prof('stanag', [[-0.034, 0.01], [0.034, 0.01], [0.032, -0.08], [0.022, -0.17], [-0.046, -0.165], [-0.04, -0.08]], 0.04), magF, 0, 0, 0); P(mi, prof('stanagf', [[0.024, -0.168], [-0.048, -0.163], [-0.05, -0.18], [0.026, -0.185]], 0.044), F.black(), 0, 0, 0); for (const s2 of [-1, 1]) P(mi, box(0.002, 0.11, 0.02), F.dark(), s2 * 0.021, -0.08, 0.0, -0.06);
  }
  if (att.ext) { mi.scale.y = 1.4; }
  // stock
  const sz = rz + rcvL / 2; const stockF = wrap || (L.stock === 'wood' ? F.wood() : L.stock === 'darkwood' ? F.darkwood() : body);
  switch (L.stock) {
    case 'none': break;
    case 'wood': case 'darkwood': P(g, prof('akst' + L.stock, [[0, 0.03], [0.32, 0.0], [0.33, -0.11], [0.29, -0.115], [0.0, -0.035]], 0.046), stockF, 0, Y - 0.005, sz); P(g, box(0.05, 0.11, 0.012), F.rubber(), 0, Y - 0.06, sz + 0.33, 0.06); break;
    case 'skeleton': P(g, prof('skel', [[0, 0.02], [0.24, 0.02], [0.25, -0.1], [0.21, -0.1], [0.21, -0.02], [0.0, -0.03]], 0.04, [[[0.03, 0.008], [0.19, 0.008], [0.19, -0.018], [0.03, -0.018]]]), stockF, 0, Y, sz); break;
    case 'folded': P(g, prof('fold', [[0, 0.03], [0.2, 0.03], [0.2, -0.06], [0.0, -0.02]], 0.014, [[[0.02, 0.018], [0.18, 0.018], [0.18, -0.045], [0.02, -0.01]]]), met, 0.038, Y - 0.01, rz - 0.06); break;
    case 'thumb': P(g, prof('thumb', [[0, 0.04], [0.28, 0.03], [0.3, -0.13], [0.24, -0.135], [0.08, -0.06], [0, -0.05]], 0.05, [[[0.08, -0.01], [0.17, -0.01], [0.17, -0.05], [0.1, -0.05]]]), stockF, 0, Y - 0.01, sz); P(g, box(0.05, 0.03, 0.12), blk, 0, Y + 0.05, sz + 0.14); break;
    case 'sniper': P(g, prof('snip', [[0, 0.03], [0.33, 0.02], [0.34, -0.12], [0.3, -0.125], [0.06, -0.06], [0, -0.04]], 0.054), stockF, 0, Y - 0.005, sz); P(g, box(0.045, 0.03, 0.12), blk, 0, Y + 0.045, sz + 0.15); P(g, box(0.056, 0.12, 0.014), F.rubber(), 0, Y - 0.04, sz + 0.34); break;
    default: // AR collapsible: buffer tube + adjustable stock body
      P(g, cyl(0.016, 0.016, 0.2, 14), met, 0, Y + 0.022, sz + 0.1, Math.PI / 2);
      P(g, prof('arst', [[0.08, 0.04], [0.24, 0.035], [0.25, -0.08], [0.22, -0.085], [0.12, -0.02], [0.08, -0.01]], 0.05), stockF, 0, Y + 0.0, sz);
      P(g, box(0.052, 0.12, 0.012), F.rubber(), 0, Y - 0.02, sz + 0.25);
  }
  // optics (kept separate: the viewmodel makes glass see-through and the ADS height depends on them)
  const optic = att.optic || L.optic || 'iron'; let sightY = 0.1, sightZ = rz; const og = new T.Group(); g.add(og); keep.add(og);
  const rT = Y + 0.058;
  if (optic === 'iron') { P(og, box(0.008, 0.032, 0.008), met, 0, Y + 0.06, front + 0.005); P(og, box(0.026, 0.006, 0.01), met, 0, Y + 0.045, front + 0.005); P(og, box(0.028, 0.024, 0.012), met, 0, Y + 0.058, rz + rcvL * 0.4); P(og, box(0.008, 0.012, 0.013), dark, 0, Y + 0.066, rz + rcvL * 0.4); sightY = 0.1; }
  else if (optic === 'carry') { P(og, bar(0.024, 0.05, 0.18, 0.006), wrap || body, 0, rT + 0.02, rz); P(og, box(0.008, 0.05, 0.008), met, 0, Y + 0.05, front + 0.02); sightY = 0.13; }
  else if (optic === 'red') { P(og, bar(0.036, 0.034, 0.055, 0.008), blk, 0, rT + 0.02, rz - 0.04); const ring = new T.Mesh(new T.CylinderGeometry(0.024, 0.024, 0.02, 16, 1, true), blk); ring.position.set(0, rT + 0.04, rz - 0.06); ring.rotation.x = Math.PI / 2; og.add(ring); P(og, box(0.004, 0.004, 0.002), MAT.redDot(), 0, rT + 0.04, rz - 0.052); sightY = Y + 0.098 - 0.013 + 0.015; sightY = 0.12; }
  else if (optic === 'holo') { P(og, bar(0.046, 0.014, 0.085, 0.004), blk, 0, rT + 0.006, rz - 0.04); P(og, box(0.046, 0.048, 0.008), blk, 0, rT + 0.032, rz - 0.08); P(og, box(0.046, 0.048, 0.008), blk, 0, rT + 0.032, rz - 0.003); P(og, box(0.006, 0.048, 0.08), blk, 0.02, rT + 0.032, rz - 0.04); P(og, box(0.006, 0.048, 0.08), blk, -0.02, rT + 0.032, rz - 0.04); P(og, box(0.046, 0.006, 0.08), blk, 0, rT + 0.056, rz - 0.04); const gl = new T.Mesh(box(0.034, 0.034, 0.002), MAT.glassDark()); gl.position.set(0, rT + 0.032, rz - 0.078); og.add(gl); sightY = 0.12; }
  else if (optic === 'acog') { P(og, cyl(0.022, 0.026, 0.13, 16), blk, 0, rT + 0.03, rz - 0.04, Math.PI / 2); P(og, cyl(0.028, 0.028, 0.02, 16), blk, 0, rT + 0.03, rz - 0.1, Math.PI / 2); P(og, box(0.012, 0.012, 0.06), F.tan(), 0, rT + 0.056, rz - 0.04); P(og, box(0.03, 0.02, 0.05), blk, 0, rT + 0.006, rz - 0.04); sightY = 0.115; }
  else if (optic === 'scope' || optic === 'bigscope') { const r = optic === 'bigscope' ? 0.032 : 0.026; P(og, cyl(r * 0.8, r * 0.8, 0.3, 16), blk, 0, rT + 0.035, rz - 0.05, Math.PI / 2); P(og, cyl(r + 0.01, r * 0.8, 0.08, 18), blk, 0, rT + 0.035, rz - 0.24, Math.PI / 2); P(og, cyl(r * 0.8, r + 0.004, 0.06, 18), blk, 0, rT + 0.035, rz + 0.13, Math.PI / 2); P(og, cyl(0.011, 0.011, 0.03, 10), blk, 0, rT + 0.07, rz - 0.05); P(og, cyl(0.011, 0.011, 0.03, 10), blk, 0.034, rT + 0.035, rz - 0.05, 0, 0, Math.PI / 2); for (const zz of [-0.12, 0.04]) P(og, box(0.03, 0.03, 0.02), met, 0, rT + 0.012, rz + zz); sightY = 0.125; }
  if (att.laser) { P(og, bar(0.026, 0.026, 0.05, 0.005), blk, 0.045, Y + 0.004, front + 0.04); const beam = new T.Mesh(new T.CylinderGeometry(0.0015, 0.0015, 40, 4, 1, true), new T.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.35, depthWrite: false })); beam.rotation.x = Math.PI / 2; beam.position.set(0.045, Y + 0.004, front - 20); og.add(beam); }
  (L.extras || []).forEach(e => {
    if (e === 'bipod') for (const s of [-1, 1]) { P(g, cyl(0.005, 0.005, 0.14, 6), met, s * 0.025, Y - 0.07, front + 0.03, 0, 0, s * 0.2); P(g, box(0.014, 0.008, 0.014), F.rubber(), s * 0.04, Y - 0.14, front + 0.03); }
    if (e === 'fore') { P(g, cyl(0.016, 0.014, 0.085, 12), blk, 0, Y - 0.07, hgZ - hgL * 0.2); }
    if (e === 'heat') { P(g, bar(0.074, 0.03, hgL * 0.9, 0.01), F.grey(), 0, Y + 0.04, hgZ); for (let i = 0; i < 6; i++) P(g, box(0.076, 0.006, 0.01), dark, 0, Y + 0.05, hgZ - hgL * 0.4 + i * hgL * 0.16); }
    if (e === 'bolt') { P(g, cyl(0.005, 0.005, 0.06, 8), F.chrome(), 0.045, Y + 0.035, rz + 0.06, 0, 0, Math.PI / 2); P(g, SP.geo.sph(0.012, 10, 8), F.chrome(), 0.075, Y + 0.035, rz + 0.06); }
    if (e === 'dbl') { P(g, cyl(bR, bR, barL, 12), stl, 0, Y - 0.022, front - barL / 2, Math.PI / 2); P(g, box(0.006, 0.026, barL), met, 0, Y - 0.009, front - barL / 2); }
    if (e === 'cyl') P(g, cyl(0.035, 0.035, 0.08, 14), met, 0, Y - 0.035, rz - 0.03, Math.PI / 2);
  });
  mergeGun(g, keep);
  g.userData.mag = mag; g.userData.muzzle = V3(0, Y + 0.004, mz); g.userData.sight = V3(0, sightY, sightZ);
  return g;
};

/* ---------- pistols ---------- */
Mods.pistolX = function (L, att) {
  att = att || {}; const g = new T.Group(); const keep = new Set(); const wrap = camoMat(att);
  const slideM = wrap || F[L.fin || 'metal'](), frame = F[L.frame || 'black'](), gripM = wrap || F[L.gripFin || L.frame || 'black'](), met = F.metal(), dark = F.dark();
  const len = L.len || 0.19, h = L.h || 0.035, w = L.w || 0.032;
  const slide = new T.Group(); g.add(slide); keep.add(slide);
  if (L.revolver) {
    P(g, bar(w, 0.04, 0.08, 0.008), slideM, 0, 0.022, -0.0); P(g, cyl(0.03, 0.03, 0.055, 16), slideM, 0, 0.018, -0.01, Math.PI / 2); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P(g, cyl(0.006, 0.006, 0.056, 6), dark, Math.cos(a) * 0.022, 0.018 + Math.sin(a) * 0.022, -0.01, Math.PI / 2); }
    P(g, cyl(0.011, 0.011, len * 0.85, 12), slideM, 0, 0.034, -0.05 - len * 0.38, Math.PI / 2); P(g, box(0.012, 0.012, len * 0.85), slideM, 0, 0.046, -0.05 - len * 0.38); P(g, box(0.008, 0.02, 0.016), met, 0, 0.05, 0.04, -0.6);
    P(slide, box(0.004, 0.004, 0.004), met, 0, 0, 0);
  } else {
    P(slide, bar(w, h, len, 0.006), slideM, 0, 0.032, -0.05);
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) P(slide, box(0.002, h * 0.7, 0.004), dark, s * (w / 2 + 0.0005), 0.032, -0.05 + len / 2 - 0.012 - i * 0.008);
    P(slide, box(0.003, 0.012, 0.035), dark, w / 2 + 0.0005, 0.038, -0.04); P(slide, box(0.006, 0.01, 0.006), met, 0, 0.032 + h / 2 + 0.005, -0.05 - len / 2 + 0.01); P(slide, box(0.022, 0.01, 0.008), met, 0, 0.032 + h / 2 + 0.005, -0.05 + len / 2 - 0.01);
    P(g, bar(w - 0.003, 0.028, len * 0.88, 0.006), frame, 0, 0.002, -0.045); P(g, box(w * 0.7, 0.008, len * 0.3), frame, 0, -0.014, -0.05 - len * 0.25);
    P(g, cyl(0.007, 0.007, 0.012, 10), met, 0, 0.032, -0.05 - len / 2 - 0.004, Math.PI / 2);
  }
  P(g, SP.GC.ptg || (SP.GC.ptg = new T.TorusGeometry(0.022, 0.0035, 6, 12, Math.PI)), frame, 0, -0.014, -0.0, 0, Math.PI / 2, Math.PI);
  P(g, box(0.005, 0.02, 0.005), met, 0, -0.016, 0.0, 0.3);
  P(g, prof('pgrip' + w, [[0.0, 0.0], [0.055, 0.0], [0.085, -0.12], [0.035, -0.13], [0.0, -0.02]], w - 0.002), gripM, 0, -0.012, 0.005);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) P(g, box(0.002, 0.004, 0.03), dark, s * (w / 2), -0.04 - i * 0.017, 0.035 + i * 0.006, 0.25);
  let mz = -0.05 - len / 2 - 0.01; if (att.sup) { P(g, cyl(0.016, 0.016, 0.12, 14), F.black(), 0, 0.032, mz - 0.06, Math.PI / 2); mz -= 0.12; }
  if (att.laser) P(g, bar(0.022, 0.02, 0.04, 0.005), F.black(), 0, -0.02, -0.1);
  mergeGun(g, keep);
  g.userData.muzzle = V3(0, 0.032, mz); g.userData.slide = slide; return g;
};

/* ---------- route the original story guns through the new generator too (so wraps work on them) ---------- */
const ORIG = {
  m4: { fin: 'fde', acc: 'metal', len: 0.52, bar: 0.2, stock: 'fixed', mag: 'std', optic: 'red', extras: ['fore'] },
  sup: { fin: 'black', len: 0.52, bar: 0.18, stock: 'fixed', mag: 'std', optic: 'holo', supp: true },
  ak: { fin: 'wood', len: 0.56, bar: 0.24, stock: 'wood', mag: 'curved', hgFin: 'wood' },
  shotgun: { fin: 'black', len: 0.52, bar: 0.34, stock: 'fixed', mag: 'tube', tube: true, hg: false, optic: 'iron' },
  dmr: { fin: 'black', acc: 'fde', len: 0.66, bar: 0.3, stock: 'sniper', mag: 'short', optic: 'scope', extras: ['bipod'] },
};
for (const id in ORIG) { const W = SP.WEAP[id]; if (!W) continue; const L = ORIG[id]; W.model = att => { const a = Object.assign({}, att || SP.gunAtt(id)); if (L.supp) a.sup = true; return Mods.gun(L, a); }; }
if (SP.WEAP.pistol) SP.WEAP.pistol.model = att => Mods.pistolX({ fin: 'black', frame: 'black', len: 0.19 }, att || SP.gunAtt('pistol'));
// update the look table so other systems see them
(SP.GUNS || []).forEach(gn => { if (ORIG[gn.id]) gn.look = ORIG[gn.id]; });

/* ---------- third-person / floor copies: one cached build per gun, shared geometry ---------- */
const TP = {};
SP.tpGun = function (gid) {
  const W = SP.WEAP[gid] && SP.WEAP[gid].model ? gid : 'm4'; let src = TP[W];
  if (!src) { try { src = TP[W] = SP.WEAP[W].model({}); } catch (e) { src = TP[W] = Mods.m4(true); } }
  src.updateMatrixWorld(true); const copy = new T.Group(); src.traverse(o => { if (!o.isMesh) return; const m = new T.Mesh(o.geometry, o.material); m.applyMatrix4(o.matrixWorld); m.castShadow = true; copy.add(m); });
  copy.userData.muzzle = src.userData.muzzle; copy.userData.gid = W; return copy;
};
})();

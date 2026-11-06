/* Survival Protocol — ground detail: pebbles, stones and dry grass scattered around the player on outdoor maps */
'use strict';
(function () {
const T = THREE; const G = SP.G;
const D = SP.Detail = { w: null, meshes: [], cx: 1e9, cz: 1e9 };
const hash = (x, z, s) => { const v = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

function pebbleGeo() { const g = new T.IcosahedronGeometry(1, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + hash(p.getX(i) * 3, p.getZ(i) * 3, 1) * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.55, p.getZ(i) * k); } g.computeVertexNormals(); return g; }
function tuftGeo() {
  const pos = [], nrm = [];
  for (let b = 0; b < 7; b++) {
    const a = b / 7 * Math.PI * 2 + hash(b, 0, 2), lean = 0.25 + hash(b, 1, 3) * 0.35, h = 0.25 + hash(b, 2, 4) * 0.3, w = 0.025;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w;
    const tip = [dx * lean * h, h, dz * lean * h];
    pos.push(-px, 0, -pz, px, 0, pz, tip[0], tip[1], tip[2]);
    for (let k = 0; k < 3; k++) nrm.push(dx * 0.3, 0.9, dz * 0.3);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); return g;
}
function clear() { for (const m of D.meshes) { if (m.parent) m.parent.remove(m); } D.meshes = []; }
const dummy = new T.Object3D();

D.setup = function () {
  clear(); D.w = SP.W; D.cx = D.cz = 1e9;
  const W = SP.W; if (!W || !W.terrainH || !SP.scene) return;
  const surf = W.surface; if (!['sand', 'dirt', 'gravel', 'hard'].includes(surf)) return;
  const q = SP.settings.quality; if (q === 'low') return;
  const mul = q === 'medium' ? 0.55 : 1;
  const sand = SP.envCfg && SP.envCfg.ground != null ? new T.Color(SP.envCfg.ground) : new T.Color(0x8a6a4a);
  const rockM = new T.MeshStandardMaterial({ color: new T.Color(0x8c7a64).lerp(sand, 0.35), roughness: 0.95, metalness: 0 });
  const darkM = new T.MeshStandardMaterial({ color: 0x5d5246, roughness: 0.9 });
  const grassM = new T.MeshStandardMaterial({ color: 0x9a8a55, roughness: 1, side: T.DoubleSide });
  const mk = (geo, mat, n, kind) => { const m = new T.InstancedMesh(geo, mat, Math.floor(n * mul)); m.castShadow = kind === 'stone'; m.receiveShadow = true; m.frustumCulled = false; m.userData.kind = kind; m.count = 0; SP.scene.add(m); D.meshes.push(m); return m; };
  D.peb = mk(pebbleGeo(), rockM, 2600, 'peb');
  D.stone = mk(pebbleGeo(), darkM, 320, 'stone');
  D.tuft = surf === 'hard' ? null : mk(tuftGeo(), grassM, 1300, 'tuft');
};

function insideCollider(x, z, cols) { for (const c of cols) { const b = c.box; if (x > b.min.x - 0.2 && x < b.max.x + 0.2 && z > b.min.z - 0.2 && z < b.max.z + 0.2 && b.min.y < 1.2) return true; } return false; }
function rebuild(px, pz) {
  const W = SP.W; const R = 46; const cols = W.colliders.filter(c => { const b = c.box; return b.max.x > px - R && b.min.x < px + R && b.max.z > pz - R && b.min.z < pz + R; });
  const fill = (m, step, prob, sMin, sMax, seed, yOff) => {
    if (!m) return; let n = 0; const cap = m.instanceMatrix.count;
    const gx0 = Math.floor((px - R) / step), gx1 = Math.ceil((px + R) / step), gz0 = Math.floor((pz - R) / step), gz1 = Math.ceil((pz + R) / step);
    for (let gx = gx0; gx <= gx1 && n < cap; gx++) for (let gz = gz0; gz <= gz1 && n < cap; gz++) {
      if (hash(gx, gz, seed) > prob) continue;
      const x = (gx + hash(gx, gz, seed + 1)) * step, z = (gz + hash(gx, gz, seed + 2)) * step; const dx = x - px, dz = z - pz; if (dx * dx + dz * dz > R * R) continue;
      if (W.road && W.road(x, z)) continue; if (insideCollider(x, z, cols)) continue;
      const y = W.terrainH(x, z); if (y < -2) continue;
      const s = sMin + hash(gx, gz, seed + 3) * (sMax - sMin);
      dummy.position.set(x, y + yOff * s, z); dummy.rotation.set(hash(gx, gz, seed + 4) * 0.4, hash(gx, gz, seed + 5) * 6.28, hash(gx, gz, seed + 6) * 0.4); dummy.scale.set(s, s, s); dummy.updateMatrix(); m.setMatrixAt(n++, dummy.matrix);
    }
    m.count = n; m.instanceMatrix.needsUpdate = true;
  };
  fill(D.peb, 1.25, 0.6, 0.03, 0.09, 11, -0.2);
  fill(D.stone, 4.2, 0.35, 0.18, 0.55, 23, -0.35);
  fill(D.tuft, 2.1, 0.42, 0.8, 1.6, 37, -0.02);
}
D.update = function () {
  if (SP.W !== D.w) D.setup(); if (!D.meshes.length || !SP.P) return;
  const p = SP.P.pos; if (Math.abs(p.x - D.cx) > 9 || Math.abs(p.z - D.cz) > 9) { D.cx = p.x; D.cz = p.z; rebuild(p.x, p.z); }
};
D.clear = clear;
})();

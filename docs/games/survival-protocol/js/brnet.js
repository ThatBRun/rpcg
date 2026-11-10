/* Survival Protocol 1.0 — Battle Royale online squads.
   Same approach as Arena Strike: PeerJS's public signalling server finds a "quick play" slot, then players talk
   peer-to-peer over WebRTC data channels. The first player in a slot hosts and runs the match (all 196+ bots,
   the zone, loot); up to 3 more real players join the host's squad. Anyone missing is filled with bots. */
'use strict';
(function () {
const T = THREE, { V3, rand } = SP; const G = SP.G, A = SP.Audio;
const $ = s => document.querySelector(s);
const BR = SP.BR; const VER = 'br1';
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }];
const rid = n => Array.from({ length: n }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.random() * 32 | 0]).join('');
function sigURL() { let s = null; try { s = new URLSearchParams(location.search).get('sig'); } catch (e) { } return s || 'wss://0.peerjs.com:443/peerjs'; }

/* ---------------- PeerJS signalling + WebRTC data channels ---------------- */
class Signal {
  constructor(id) { this.id = id; this.token = rid(10); this.ws = null; this.handlers = new Map(); this.hb = 0; this.closed = false; }
  open(ms = 8000) {
    return new Promise((res, rej) => {
      let done = false; const fin = (ok, v) => { if (done) return; done = true; clearTimeout(to); ok ? res(v) : rej(v); };
      const to = setTimeout(() => { fin(false, 'signal-timeout'); this.close(); }, ms); let ws;
      try { ws = new WebSocket(`${sigURL()}?key=peerjs&id=${encodeURIComponent(this.id)}&token=${this.token}&version=1.5.4`); } catch (e) { return fin(false, 'signal-blocked'); }
      this.ws = ws;
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.type === 'OPEN') { this.hb = setInterval(() => this.raw({ type: 'HEARTBEAT' }), 5000); fin(true, this); return; } if (m.type === 'ID-TAKEN') { fin(false, 'taken'); this.close(); return; } if (m.type === 'ERROR' && !done) { fin(false, 'signal-error'); this.close(); return; } const h = this.handlers.get(m.src) || this.handlers.get('*'); if (h) h(m); };
      ws.onerror = () => fin(false, 'signal-blocked'); ws.onclose = () => { clearInterval(this.hb); fin(false, 'signal-closed'); };
    });
  }
  raw(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  send(type, dst, payload) { this.raw({ type, dst, payload }); }
  on(src, fn) { this.handlers.set(src, fn); } off(src) { this.handlers.delete(src); }
  close() { this.closed = true; clearInterval(this.hb); try { this.ws && this.ws.close(); } catch (e) { } }
}
class Conn {
  constructor(pc, dc, peer) { this.pc = pc; this.dc = dc; this.peer = peer; this.onmsg = null; this.onclose = null; this.closed = false; dc.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } this.onmsg && this.onmsg(m); }; dc.onclose = () => this.end(); pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) this.end(); }; }
  send(o) { if (this.dc.readyState === 'open') try { this.dc.send(JSON.stringify(o)); } catch (e) { } }
  end() { if (this.closed) return; this.closed = true; try { this.dc.close(); } catch (e) { } try { this.pc.close(); } catch (e) { } this.onclose && this.onclose(); }
}
function rtc(sig, peer, cid) {
  const pc = new RTCPeerConnection({ iceServers: ICE }); const q = []; let ready = false;
  pc.onicecandidate = e => { if (e.candidate) sig.send('CANDIDATE', peer, { candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate, connectionId: cid, type: 'data' }); };
  return { pc, add: c => ready ? pc.addIceCandidate(c).catch(() => { }) : q.push(c), remote: async d => { await pc.setRemoteDescription(d); ready = true; q.splice(0).forEach(c => pc.addIceCandidate(c).catch(() => { })); } };
}
function listen(sig, onConn) {
  const peers = new Map();
  sig.on('*', async m => {
    const src = m.src; if (!src) return;
    if (m.type === 'OFFER') { const cid = (m.payload && m.payload.connectionId) || rid(8); const r = rtc(sig, src, cid); peers.set(src, r); r.pc.ondatachannel = e => { const dc = e.channel; const c = new Conn(r.pc, dc, src); const go = () => onConn(c); if (dc.readyState === 'open') go(); else dc.onopen = go; };
      try { await r.remote(m.payload.sdp); const ans = await r.pc.createAnswer(); await r.pc.setLocalDescription(ans); sig.send('ANSWER', src, { sdp: r.pc.localDescription, connectionId: cid, type: 'data' }); } catch (e) { try { r.pc.close(); } catch (x) { } peers.delete(src); } }
    else if (m.type === 'CANDIDATE') { const r = peers.get(src); if (r && m.payload) r.add(m.payload.candidate); }
    else if (m.type === 'LEAVE') { const r = peers.get(src); if (r) { try { r.pc.close(); } catch (e) { } peers.delete(src); } }
  });
}
function connect(sig, dst, ms = 15000) {
  return new Promise(async (res, rej) => {
    const cid = rid(8); const r = rtc(sig, dst, cid); let done = false; const fin = (ok, v) => { if (done) return; done = true; clearTimeout(to); sig.off(dst); if (!ok) { try { r.pc.close(); } catch (e) { } rej(v); } else res(v); };
    const to = setTimeout(() => fin(false, 'connect-timeout'), ms);
    sig.on(dst, async m => { if (m.type === 'ANSWER') { try { await r.remote(m.payload.sdp); } catch (e) { fin(false, 'connect-failed'); } } else if (m.type === 'CANDIDATE' && m.payload) r.add(m.payload.candidate); else if (m.type === 'EXPIRE') fin(false, 'unavailable'); });
    const dc = r.pc.createDataChannel('game', { ordered: true }); dc.onopen = () => { const c = new Conn(r.pc, dc, dst); fin(true, c); };
    try { const off = await r.pc.createOffer(); await r.pc.setLocalDescription(off); sig.send('OFFER', dst, { sdp: r.pc.localDescription, type: 'data', connectionId: cid, label: 'game', serialization: 'json', reliable: true }); } catch (e) { fin(false, 'connect-failed'); }
  });
}
function ask(conn, msg, ms = 8000) { return new Promise((res, rej) => { const to = setTimeout(() => { conn.onmsg = null; rej('no-reply'); }, ms); conn.onmsg = m => { clearTimeout(to); conn.onmsg = null; if (m.t === 'welcome') res(m); else rej(m.t === 'full' ? 'full' : m.why || 'rejected'); }; conn.onclose = () => { clearTimeout(to); rej('closed'); }; conn.send(msg); }); }
const ERR = { 'signal-blocked': 'Online play is blocked on this page', 'signal-timeout': 'Could not reach the matchmaking server', 'signal-error': 'Matchmaking server error', 'signal-closed': 'Could not reach the matchmaking server', 'no-slot': 'All online lobbies are full' };

/* ---------------- LOBBY ---------------- */
const L = { sig: null, host: false, conns: [], humans: [], conn: null, timer: 0, country: 0, name: '', started: false };
function myName() { let n = null; try { n = localStorage.getItem('survival_protocol_name'); } catch (e) { } if (!n) { n = 'Player' + (1000 + Math.random() * 9000 | 0); try { localStorage.setItem('survival_protocol_name', n); } catch (e) { } } return n; }
function drawLobby(status) {
  const c = BR.COUNTRIES[L.country]; $('#bl-team').innerHTML = `<em>${c[1]}</em><b>TEAM ${c[0].toUpperCase()}</b><span>Your country for this match was picked at random</span>`;
  const slots = []; for (let i = 0; i < 4; i++) { const h = L.humans[i]; slots.push(`<div class="blslot ${h ? 'human' : 'bot'}"><i>${i + 1}</i><b>${h ? (h.me ? h.name + ' (you)' : h.name) : 'Bot teammate'}</b><span>${h ? (i === 0 ? 'SQUAD HOST' : 'ONLINE PLAYER') : 'FILLS AN EMPTY SPOT'}</span></div>`); }
  $('#bl-squad').innerHTML = slots.join('');
  if (status != null) $('#bl-status').textContent = status;
  const lb = BR.LB; $('#bl-lb').innerHTML = `<div class="h4">Your best teams</div>` + (lb.hist && lb.hist.length ? lb.hist.slice().sort((a, b) => a.place - b.place || b.kills - a.kills).slice(0, 6).map(h => `<div class="brh"><b>#${h.place}</b><span>${h.flag || ''} ${h.team || ''}</span><span>${h.kills} kills · squad ${h.squadKills || 0}</span></div>`).join('') : '<div class="brh"><span>No matches yet</span></div>') + `<div class="brh"><span>Wins ${lb.wins} · Matches ${lb.games} · Kills ${lb.kills}</span></div>`;
}
SP.openBRLobby = async function () {
  closeLobby(); L.started = false; L.country = Math.random() * BR.COUNTRIES.length | 0; L.name = myName(); L.humans = [{ name: L.name, me: true, skin: (SP.myOperator ? SP.myOperator() : 'default') }]; L.host = true;
  SP.showScreen('brlobby'); drawLobby('Searching for players online…'); $('#bl-play').textContent = 'Play now';
  const myId = 'sp-' + VER + '-p-' + rid(10); let sig;
  try { sig = new Signal(myId); await sig.open(); }
  catch (e) { if (L.started) return; drawLobby((ERR[e] || 'Online play unavailable') + '. You\'ll play with bot teammates. Press Play now.'); L.host = true; L.offline = true; return; }
  if (L.started) { sig.close(); return; }
  for (let s = 1; s <= 10 && !L.started; s++) {
    const slot = 'sp-' + VER + '-qp-' + s;
    try { const hs = new Signal(slot); await hs.open(); sig.close(); L.sig = hs; L.host = true; listen(hs, onJoin); drawLobby('Online lobby ' + s + ' open · waiting for players to join your squad'); startCountdown(SP.brLobbyWait || 25); return; }
    catch (e) { if (e !== 'taken') { sig.close(); drawLobby((ERR[e] || 'Online play unavailable') + '. Playing with bots.'); L.offline = true; return; } }
    try { drawLobby('Joining lobby ' + s + '…'); const c = await connect(sig, slot, 9000); const w = await ask(c, { t: 'join', name: L.name, ver: VER, skin: (SP.myOperator ? SP.myOperator() : 'default') });
      L.sig = sig; L.conn = c; L.host = false; L.country = w.country; L.humans = w.humans.map(h => ({ name: h.name, skin: h.skin, me: h.name === L.name && h.idx === w.idx })); L.idx = w.idx;
      c.onmsg = clientLobbyMsg; c.onclose = () => { if (!L.started) { drawLobby('The host left. Searching again…'); setTimeout(() => SP.openBRLobby(), 800); } };
      drawLobby('Joined an online squad · waiting for the host to start'); $('#bl-play').textContent = 'Waiting for host'; return; }
    catch (e) { /* lobby full or gone, try the next */ }
  }
  sig.close(); drawLobby('No open lobbies. You\'ll play with bot teammates.'); L.offline = true;
};
function onJoin(c) {
  c.onmsg = m => {
    if (m.t !== 'join') return; if (m.ver !== VER) { c.send({ t: 'nope', why: 'version' }); return; }
    if (L.started || L.humans.length >= 4) { c.send({ t: 'full' }); return; }
    const idx = L.humans.length; L.humans.push({ name: m.name, conn: c, skin: m.skin }); L.conns.push(c); c.idx = idx;
    c.send({ t: 'welcome', idx, country: L.country, humans: L.humans.map((h, i) => ({ name: h.name, idx: i, skin: h.skin })) });
    broadcastLobby(); drawLobby(L.humans.length + ' of 4 real players in your squad'); A.click(1200, 0.1);
    c.onmsg = null; c.onclose = () => { const i = L.humans.findIndex(h => h.conn === c); if (i > 0 && !L.started) { L.humans.splice(i, 1); L.conns = L.conns.filter(x => x !== c); broadcastLobby(); drawLobby(); } };
    if (L.humans.length >= 4) { L.timer = Math.min(L.timer, 3); }
  };
}
function broadcastLobby() { const hs = L.humans.map((h, i) => ({ name: h.name, idx: i, skin: h.skin })); L.conns.forEach(c => c.send({ t: 'lobby', humans: hs, country: L.country })); }
function clientLobbyMsg(m) {
  if (m.t === 'lobby') { L.humans = m.humans.map(h => ({ name: h.name, skin: h.skin, me: h.idx === L.idx })); L.country = m.country; drawLobby(); }
  if (m.t === 'start') { L.started = true; startClient(m); }
}
let cdT = null;
function startCountdown(s) { L.timer = s; clearInterval(cdT); cdT = setInterval(() => { if (L.started) { clearInterval(cdT); return; } L.timer--; $('#bl-count').textContent = 'Match starts in ' + Math.max(0, L.timer) + 's'; if (L.timer <= 0) { clearInterval(cdT); hostStart(); } }, 1000); }
function closeLobby() { clearInterval(cdT); $('#bl-count') && ($('#bl-count').textContent = ''); if (!L.started) { try { L.sig && L.sig.close(); } catch (e) { } L.conns.forEach(c => c.end()); L.conn && L.conn.end(); } L.sig = null; L.conns = []; L.conn = null; L.offline = false; }

/* ---------------- IN-MATCH NET ---------------- */
const NET = { role: 'off' };
function hostStart() {
  if (L.started) return; if (!L.host) return; L.started = true; clearInterval(cdT);
  const humans = L.humans.map((h, i) => ({ name: h.name, skin: h.skin, me: i === 0, peer: h.conn || null }));
  const online = humans.length > 1; const seed = Math.random() * 1e9 | 0; const env = SP.pick(['afternoon', 'day', 'afternoon']);
  if (online) { L.conns.forEach(c => c.send({ t: 'start', seed, country: L.country, env, humans: humans.map(h => h.name), skins: humans.map(h => h.skin || 'default') })); try { L.sig && L.sig.close(); } catch (e) { } }
  else { try { L.sig && L.sig.close(); } catch (e) { } }
  const net = online ? makeHost(L.conns.slice()) : null;
  BR.start({ seed, country: L.country, env, humans, net });
}
function startClient(m) {
  try { L.sig && L.sig.close(); } catch (e) { }
  const humans = m.humans.map((n, i) => ({ name: n, skin: (m.skins || [])[i], me: i === L.idx, peer: null }));
  const net = makeClient(L.conn);
  BR.start({ seed: m.seed, country: m.country, env: m.env, humans, net });
}
// ----- host -----
function makeHost(conns) {
  const N = Object.assign(Object.create(NET), { role: 'host', conns, sendT: 0, lbT: 0, fxBudget: 0 });
  N.peerEnt = c => BR.ents.find(e => e.peer === c);
  N.broadcast = (m, except) => { for (const c of N.conns) if (c !== except && !c.closed) c.send(m); };
  N.event = m => N.broadcast(m);
  N.send = m => N.broadcast(m);
  N.fx = (a, b, cls) => { if (N.fxBudget <= 0) return; N.fxBudget--; for (const c of N.conns) { const e = N.peerEnt(c); if (e && Math.hypot(e.x - a.x, e.z - a.z) < 260) c.send({ t: 'fx', a: [a.x, a.y, a.z].map(r1), b: [b.x, b.y, b.z].map(r1), c: cls }); } };
  N.hurtPeer = (e, d, from, by) => { if (e.peer) e.peer.send({ t: 'hurt', d, f: from ? [from.x, from.y, from.z].map(r1) : null, by: by ? by.id : -1 }); };
  N.revivedPeer = e => { if (e.peer) e.peer.send({ t: 'revived' }); };
  N.reviveReq = e => { BR.revive(e, BR.me); };
  N.onSetup = () => { for (const e of BR.ents) if (e.human && !e.me) e.puppet = true; };
  N.close = () => { N.conns.forEach(c => { try { c.end(); } catch (e) { } }); };
  for (const c of conns) {
    c.onclose = () => { const e = N.peerEnt(c); if (e && e.st !== 'dead' && BR.on) { G.hud.feed(e.name + ' DISCONNECTED', 'red'); e.human = false; e.puppet = false; e.peer = null; if (e.u) { e.u.puppet = false; e.u.behavior = 'follow'; e.u.follow = 'player'; } } };
    c.onmsg = m => hostMsg(N, c, m);
  }
  N.tick = dt => {
    N.sendT -= dt; N.lbT -= dt; N.fxBudget = Math.min(40, N.fxBudget + dt * 40);
    // bots revive knocked remote players
    for (const e of BR.ents) if (e.human && !e.me && e.st === 'knocked' && e.u) { const mate = BR.ents.find(x => x.team === e.team && x.u && !x.human && x.st === 'alive'); if (mate) { mate.u.follow = null; mate.u.behavior = 'assault'; mate.u.goal2 = e.u.pos.clone(); mate.u.stopDist = 1.2; if (mate.u.pos.distanceTo(e.u.pos) < 2.6) { e.revT = (e.revT || 0) + dt; if (e.revT > 6) { e.revT = 0; BR.revive(e, mate); mate.u.behavior = 'follow'; mate.u.follow = 'player'; mate.u.goal2 = null; } } } }
    if (N.sendT > 0) return; N.sendT = 0.1;
    const Z = BR.zone; const zs = [Z.cx, Z.cz, Z.r, Z.tx, Z.tz, Z.tr, Z.ph, Z.t, Z.shrink ? 1 : 0, Z.dps].map(r1);
    const st = BR.ents.map(e => ST[e.st] || 0).join('');
    const kills = N.lbT <= 0 ? BR.teams.map(t => [t.kills, t.out ? 1 : 0, t.place]) : null; if (N.lbT <= 0) N.lbT = 1;
    for (const c of N.conns) {
      if (c.closed) continue; const me = N.peerEnt(c); if (!me) continue;
      const near = []; for (const e of BR.ents) { if (e === me) continue; if (e.st !== 'alive' && e.st !== 'knocked' && !(e.st === 'dead' && BR.t - (e.deadT || 0) < 2)) continue; const x = e.u ? e.u.pos : e; if (e.team === me.team || Math.hypot(x.x - me.x, x.z - me.z) < 250) near.push([e.id, r1(x.x), r1(x.y), r1(x.z), r2(e.u ? e.u.yaw : e.yaw), e.u ? KIND[rigKind(e)] : 0, e.u && e.u.crouch ? 1 : 0, Math.round(e.hp), Math.round(e.sh)]); }
      c.send({ t: 's', tm: r1(BR.t), z: zs, st, n: near, k: kills, g: [me.gold] });
    }
  };
  return N;
}
const ST = { heli: 0, air: 1, alive: 2, knocked: 3, dead: 4 }, STR = ['heli', 'air', 'alive', 'knocked', 'dead'];
const KIND = { none: 0, m4: 1, ak: 2, shotgun: 3, pistol: 4 }, KINDR = ['none', 'm4', 'ak', 'shotgun', 'pistol'];
const rigKind = e => { const u = e.u; if (!u || !u.rig.gun) return 'none'; return u.weapon || 'm4'; };
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
function hostMsg(N, c, m) {
  const e = N.peerEnt(c); if (!e) return;
  switch (m.t) {
    case 'me': if (e.st === 'dead') return; e.x = m.p[0]; e.y = m.p[1]; e.z = m.p[2]; e.yaw = m.p[3]; e.hp = m.hp; e.sh = m.sh; e.guns = (m.g || []).map(id => ({ id, mag: 30, res: 60 })); e.mats = m.mats || e.mats; e.gold = m.gold != null ? m.gold : e.gold; e.meds = m.meds || e.meds;
      if (m.st === 'air' && e.st === 'heli') e.st = 'air'; if (m.st === 'alive' && e.st === 'air') e.st = 'alive';
      if ((e.st === 'alive' || e.st === 'knocked') && !e.u) BR.spawnUnit(e);
      if (e.u) { e.u.netPos = V3(e.x, e.y, e.z); e.u.netYaw = e.yaw; e.u.crouch = !!m.cr; e.u.knocked = e.st === 'knocked'; }
      break;
    case 'hit': { const t = BR.ents[m.id]; if (t) { BR.entDamage(t, m.d, e, m.head); if (t.u && t.u.rig) t.u.rig.flinch = 1; } break; }
    case 'knock': if (e.st === 'alive') BR.knockEnt(e, null); break;
    case 'dead': if (e.st !== 'dead') { e.st = e.st === 'knocked' ? 'knocked' : 'alive'; BR.killEnt(e, null, false); } break;
    case 'jump': if (e.st === 'heli') e.st = 'air'; break;
    case 'rev': { const t = BR.ents[m.id]; if (t && t.st === 'knocked') BR.revive(t, e); break; }
    case 'chest': { const ch = BR.chests[m.i]; if (ch && !ch.open) BR.hideChest(ch); N.broadcast(m, c); break; }
    case 'pile': BR.makePile(V3(m.x, m.y, m.z), m.items, m.from, null, m.id); N.broadcast(m, c); break;
    case 'unpile': { const p = BR.piles.find(q => q.id === m.id); if (p) BR.removePile(p); N.broadcast(m, c); break; }
    case 'build': BR.placePiece(m.s, m.mat, true); N.broadcast(m, c); break;
    case 'pdmg': { const p = BR.pieces.get(m.key); if (p) BR.damagePiece(p, m.d, true); N.broadcast(m, c); break; }
    default: if (BR.netX && BR.netX[m.t]) { BR.netX[m.t](m, e, true); N.broadcast(m, c); }
  }
}
// ----- client -----
function makeClient(conn) {
  const N = Object.assign(Object.create(NET), { role: 'client', conn, sendT: 0, last: 0 });
  N.send = m => conn.send(m); N.event = m => { if (['knock', 'dead', 'jump', 'chest', 'pile', 'unpile', 'build', 'pdmg', 'floor', 'sdopen', 'card', 'pad'].includes(m.t)) conn.send(m); };
  N.reviveReq = e => conn.send({ t: 'rev', id: e.id });
  N.onSetup = () => { for (const e of BR.ents) if (!e.me) e.puppet = true; };
  N.close = () => { try { conn.end(); } catch (e) { } };
  conn.onclose = () => { if (BR.on && !BR.over) { G.hud.feed('LOST CONNECTION TO THE HOST · MATCH ENDED', 'red'); setTimeout(() => { if (BR.on && !BR.over) BR.endMatch(false); }, 1500); } };
  conn.onmsg = m => clientMsg(N, m);
  N.tick = dt => {
    N.sendT -= dt; if (N.sendT > 0) return; N.sendT = 0.1; const P = SP.P, me = BR.me;
    conn.send({ t: 'me', p: [P.pos.x, P.pos.y, P.pos.z, P.yaw].map(r2), st: me.st, hp: Math.round(me.hp), sh: Math.round(me.sh), cr: P.crouch ? 1 : 0, g: me.guns.map(g => g.id), mats: me.mats, gold: me.gold, meds: medsOf() });
  };
  return N;
}
function medsOf() { const P = SP.P, o = {}; ['bandage', 'medkit', 'minishield', 'shieldpot'].forEach(k => { o[k] = P.inv[k] ? P.inv[k].mag : 0; }); return o; }
function clientMsg(N, m) {
  if (!BR.on && m.t !== 'end') return;
  switch (m.t) {
    case 's': {
      if (Math.abs(BR.t - m.tm) > 0.6) BR.t = m.tm; const Z = BR.zone; const z = m.z; Object.assign(Z, { cx: z[0], cz: z[1], r: z[2], tx: z[3], tz: z[4], tr: z[5], ph: z[6], t: z[7], shrink: !!z[8], dps: z[9] });
      for (let i = 0; i < m.st.length && i < BR.ents.length; i++) { const e = BR.ents[i]; if (e.me) continue; const s = STR[+m.st[i]]; if (s && e.st !== s && !(e.st === 'dead')) { e.st = s; if (e.u) e.u.knocked = s === 'knocked'; } }
      const seen = new Set();
      for (const r of m.n) { const e = BR.ents[r[0]]; if (!e || e.me) continue; seen.add(e); e.x = r[1]; e.y = r[2]; e.z = r[3]; e.yaw = r[4]; e.hp = r[7]; e.sh = r[8]; if ((e.st === 'alive' || e.st === 'knocked') && !e.u) BR.spawnUnit(e); const u = e.u; if (!u) continue; u.netPos = V3(e.x, e.y, e.z); u.netYaw = e.yaw; u.crouch = !!r[6]; u.knocked = e.st === 'knocked'; const k = KINDR[r[5]]; if (k !== (u.rig.gun ? u.weapon : 'none')) setKind(u, k); }
      for (const e of BR.ents) if (e.u && !e.me && !seen.has(e) && !(BR.spectating && BR.specEnt === e) && e.st !== 'dead') { e.u.remove(); e.u = null; }
      if (m.k) m.k.forEach((k, i) => { const t = BR.teams[i]; t.kills = k[0]; if (k[1] && !t.out) { t.out = true; t.place = k[2]; } });
      break; }
    case 'fx': { const a = V3(...m.a), b = V3(...m.b); A.gun(m.c === 'shotgun' ? 'shotgun' : 'ak', a, 0.8); G.muzzle(a, b.clone().sub(a).normalize(), 0.8, false); G.tracer(a, b, [9, 3.2, 1.2]); if (SP.P.pos.distanceTo(b) < 3) A.whiz(); break; }
    case 'hurt': { SP.brShooter = null; SP.P.hurt(m.d, m.f ? V3(...m.f) : null); break; }
    case 'revived': if (SP.P.brKnocked) { BR.me.st = 'knocked'; BR.revive(BR.me, null); } break;
    case 'knock': { const e = BR.ents[m.id]; if (e && !e.me) { e.st = 'knocked'; if (e.u) e.u.knocked = true; } break; }
    case 'revive': { const e = BR.ents[m.id]; if (e && !e.me) { e.st = 'alive'; if (e.u) { e.u.knocked = false; e.u.rig.root.rotation.x = 0; } } break; }
    case 'dead': { const e = BR.ents[m.id]; if (!e || e.me) break; e.st = 'dead'; e.deadT = BR.t; if (m.by === BR.me.id) { BR.myKills++; } if (e.u) { const u = e.u; u.knocked = false; u.rig.root.rotation.x = 0; u.puppet = false; u.brEnt = null; u.br = false; SP.Unit.prototype.damage.call(u, 1e6, null, m.head, m.by === BR.me.id ? 'player' : 'bot'); setTimeout(() => { if (e.u === u) { u.remove(); e.u = null; } }, 20000); } break; }
    case 'teamout': { const t = BR.teams[m.team]; if (t && !t.out) { t.out = true; t.place = m.place; } if (m.team === BR.myTeam && !BR.over) BR.endMatch(false); break; }
    case 'end': if (!BR.over) { if (m.winner === BR.myTeam) { BR.teams[BR.myTeam].place = 1; BR.endMatch(true); } else BR.endMatch(false); } break;
    case 'feed': G.hud.feed(m.text, m.col); break;
    case 'chest': { const ch = BR.chests[m.i]; if (ch && !ch.open) BR.hideChest(ch); break; }
    case 'pile': BR.makePile(V3(m.x, m.y, m.z), m.items, m.from, null, m.id); break;
    case 'unpile': { const p = BR.piles.find(q => q.id === m.id); if (p) BR.removePile(p); break; }
    case 'build': BR.placePiece(m.s, m.mat, true); break;
    case 'pdmg': { const p = BR.pieces.get(m.key); if (p) BR.damagePiece(p, m.d, true); break; }
    default: if (BR.netX && BR.netX[m.t]) BR.netX[m.t](m, null, false);
  }
}
function setKind(u, k) { const S = u.rig; if (S.gun) { S.gun.parent && S.gun.parent.remove(S.gun); S.gun = null; } if (k !== 'none') { const Mo = SP.Models; S.gun = k === 'ak' ? Mo.ak() : k === 'shotgun' ? Mo.shotgun() : k === 'pistol' ? Mo.pistol() : Mo.m4(true); S.chest.add(S.gun); } u.weapon = k === 'none' ? 'm4' : k; }

/* ---------------- wiring ---------------- */
function wire() {
  $('#bl-play').addEventListener('click', () => { if (!L.host) return; if (L.offline || !L.sig) { L.started = true; closeLobby(); const net = null; BR.start({ seed: Math.random() * 1e9 | 0, country: L.country, env: SP.pick(['afternoon', 'day', 'afternoon']), humans: [{ name: L.name, me: true }], net }); } else hostStart(); });
  $('#bl-back').addEventListener('click', () => { L.started = true; closeLobby(); L.started = false; SP.showScreen('modes'); });
  $('#p-quit').addEventListener('click', () => { if (BR.net) { BR.net.close && BR.net.close(); BR.net = null; } BR.cleanup && BR.cleanup(); }, true);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
SP.BRNet = { Signal, connect, listen, L };
})();

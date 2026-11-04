/* Survival Protocol — mobile touch controls */
'use strict';
(function () {
const I = SP.Input; const $ = s => document.querySelector(s);
const T = SP.Touch = { on: false, stick: null, look: null, crouch: false, aim: false };
const press = code => { I.keys[code] = true; I.pressed[code] = true; };
const release = code => { I.keys[code] = false; };
T.enable = function (on) {
  T.on = on; document.body.classList.toggle('mobile', on); $('#touch').hidden = !on || SP.state !== 'play';
  if (on) I.fallback = true;
};
function setMove(dx, dy) { // dx,dy in -1..1, up is negative dy
  const dead = 0.22; I.keys.KeyW = dy < -dead; I.keys.KeyS = dy > dead; I.keys.KeyA = dx < -dead; I.keys.KeyD = dx > dead;
  const mag = Math.hypot(dx, dy); I.keys.ShiftLeft = mag > 0.92 && dy < -0.5;
}
function init() {
  const zone = $('#t-stick'), knob = $('#t-knob'), base = $('#t-base'), lookZ = $('#t-look');
  zone.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; T.stick = { id: t.identifier, x: t.clientX, y: t.clientY }; base.style.left = t.clientX + 'px'; base.style.top = t.clientY + 'px'; base.hidden = false; knob.style.transform = 'translate(-50%,-50%)'; }, { passive: false });
  const moveStick = e => { if (!T.stick) return; for (const t of e.changedTouches) if (t.identifier === T.stick.id) { e.preventDefault(); let dx = (t.clientX - T.stick.x) / 55, dy = (t.clientY - T.stick.y) / 55; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } knob.style.transform = `translate(calc(-50% + ${dx * 46}px), calc(-50% + ${dy * 46}px))`; setMove(dx, dy); } };
  const endStick = e => { if (!T.stick) return; for (const t of e.changedTouches) if (t.identifier === T.stick.id) { T.stick = null; base.hidden = true; setMove(0, 0); } };
  zone.addEventListener('touchmove', moveStick, { passive: false }); zone.addEventListener('touchend', endStick); zone.addEventListener('touchcancel', endStick);
  lookZ.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; T.look = { id: t.identifier, x: t.clientX, y: t.clientY }; }, { passive: false });
  lookZ.addEventListener('touchmove', e => { if (!T.look) return; for (const t of e.changedTouches) if (t.identifier === T.look.id) { e.preventDefault(); I.mouse.dx += (t.clientX - T.look.x) * 2.2; I.mouse.dy += (t.clientY - T.look.y) * 2.2; T.look.x = t.clientX; T.look.y = t.clientY; } }, { passive: false });
  const endLook = e => { if (!T.look) return; for (const t of e.changedTouches) if (t.identifier === T.look.id) T.look = null; };
  lookZ.addEventListener('touchend', endLook); lookZ.addEventListener('touchcancel', endLook);
  // buttons
  const btn = (id, down, up) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); down(); }, { passive: false }); const u = e => { e.preventDefault(); b.classList.remove('on'); up && up(); }; b.addEventListener('touchend', u, { passive: false }); b.addEventListener('touchcancel', u, { passive: false }); };
  // fire also lets you look while holding it
  const fb = $('#t-fire'); let fireTouch = null;
  fb.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; fireTouch = { id: t.identifier, x: t.clientX, y: t.clientY }; fb.classList.add('on'); I.mouse.l = true; I.mouse.lp = true; SP.Audio.init(); }, { passive: false });
  fb.addEventListener('touchmove', e => { if (!fireTouch) return; for (const t of e.changedTouches) if (t.identifier === fireTouch.id) { e.preventDefault(); I.mouse.dx += (t.clientX - fireTouch.x) * 2.2; I.mouse.dy += (t.clientY - fireTouch.y) * 2.2; fireTouch.x = t.clientX; fireTouch.y = t.clientY; } }, { passive: false });
  const fu = e => { e.preventDefault(); fireTouch = null; fb.classList.remove('on'); I.mouse.l = false; }; fb.addEventListener('touchend', fu, { passive: false }); fb.addEventListener('touchcancel', fu, { passive: false });
  btn('#t-aim', () => { T.aim = !T.aim; I.mouse.r = T.aim; $('#t-aim').classList.toggle('lit', T.aim); });
  btn('#t-jump', () => press('Space'), () => release('Space'));
  btn('#t-crouch', () => { T.crouch = !T.crouch; I.keys.KeyC = T.crouch; $('#t-crouch').classList.toggle('lit', T.crouch); });
  btn('#t-reload', () => press('KeyR'), () => release('KeyR'));
  btn('#t-use', () => { press('KeyE'); press('KeyF'); }, () => { release('KeyE'); release('KeyF'); });
  btn('#t-swap', () => { const P = SP.P; if (!P) return; const list = Object.keys(P.inv); const i = list.indexOf(P.cur); press('Digit' + (((i + 1) % list.length) + 1)); });
  btn('#t-light', () => press('KeyT'), () => release('KeyT'));
  btn('#t-pause', () => { SP.pauseGame && SP.pauseGame(); });
}
window.addEventListener('load', init);
})();

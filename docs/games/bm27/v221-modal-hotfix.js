/* BM27 v2.2.1 — creation-dialog escape hotfix */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);

  function negotiationCount() {
    try { return current?.v2?.scheduleNegotiations?.outgoing?.length || 0; }
    catch { return 0; }
  }

  function snapshot() {
    try {
      return {
        schedule: current?.schedule?.length || 0,
        tournaments: current?.tournaments?.length || 0,
        negotiations: negotiationCount()
      };
    } catch {
      return { schedule: 0, tournaments: 0, negotiations: 0 };
    }
  }

  function forceClose(dialog) {
    if (!dialog) return;
    try { if (dialog.open) dialog.close('created'); } catch {}
    // Chrome normally removes `open` on close(), but remove it explicitly as a
    // second line of defense so a failed post-create render can never trap input.
    try { dialog.removeAttribute('open'); } catch {}
    try { document.activeElement?.blur?.(); } catch {}
    document.body.style.overflow = '';
  }

  function safeRefresh() {
    for (const fn of ['renderSchedule', 'renderTournaments', 'renderDynasty', 'renderAll']) {
      try {
        const f = globalThis[fn];
        if (typeof f === 'function') f();
      } catch (err) {
        console.warn(`BM27 v2.2.1: ${fn} refresh failed after creation`, err);
      }
    }
  }

  function installFormGuard(formId, dialogId, changed) {
    const form = byId(formId), dialog = byId(dialogId);
    if (!form || !dialog || form.dataset.v221Guard === '1') return;
    form.dataset.v221Guard = '1';

    form.addEventListener('submit', () => {
      const before = snapshot();
      const settle = () => {
        const after = snapshot();
        if (changed(before, after)) {
          forceClose(dialog);
          safeRefresh();
        }
      };
      // Run after the existing submit handler, then again after async/save/render
      // work has had a chance to complete.
      setTimeout(settle, 0);
      setTimeout(settle, 80);
      setTimeout(settle, 300);
    }, true);
  }

  function install() {
    installFormGuard('tournamentForm', 'tournamentDialog', (a, b) =>
      b.tournaments > a.tournaments || b.schedule > a.schedule
    );
    installFormGuard('scheduleForm', 'scheduleDialog', (a, b) =>
      b.schedule > a.schedule || b.negotiations > a.negotiations
    );

    // Make every X/cancel button inside these builders an unconditional escape.
    for (const id of ['tournamentDialog', 'scheduleDialog']) {
      const dialog = byId(id);
      dialog?.querySelectorAll('button[value="cancel"], .icon-btn').forEach(btn => {
        btn.addEventListener('click', () => forceClose(dialog), true);
      });
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', install)
    : install();
})();

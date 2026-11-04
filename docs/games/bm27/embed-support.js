/* BM27 v2.7.61 — iframe/embed support.
   Keeps BM27 usable when hosted normally or embedded in another site.
   Supabase still connects directly from the hosted BM27 origin. */
(() => {
  'use strict';

  const memoryStore = new Map();
  const memoryStorage = {
    get length() { return memoryStore.size; },
    key(index) { return [...memoryStore.keys()][index] ?? null; },
    getItem(key) { key = String(key); return memoryStore.has(key) ? memoryStore.get(key) : null; },
    setItem(key, value) { memoryStore.set(String(key), String(value)); },
    removeItem(key) { memoryStore.delete(String(key)); },
    clear() { memoryStore.clear(); }
  };

  // Some sandboxed embeds can deny Web Storage. BM27 is cloud-first, so use a
  // page-lifetime fallback instead of letting a SecurityError crash the game.
  let storageAvailable = true;
  try {
    const probe = '__bm27_embed_storage_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
  } catch (error) {
    storageAvailable = false;
    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        enumerable: true,
        value: memoryStorage
      });
    } catch {}
  }

  let framed = false;
  try { framed = window.self !== window.top; } catch { framed = true; }
  const params = new URLSearchParams(location.search);
  const embedded = framed || params.get('embed') === '1' || params.get('embedded') === '1';

  window.BM27_EMBED_MODE = embedded;
  window.BM27Embed = {
    embedded,
    framed,
    storageAvailable,
    version: '2.7.61'
  };

  if (!embedded) return;
  document.documentElement.classList.add('bm27-embedded');

  const send = (type, extra = {}) => {
    try {
      window.parent?.postMessage({
        source: 'MSHSAA-BM27',
        type,
        version: '2.7.61',
        ...extra
      }, '*');
    } catch {}
  };

  const reportHeight = () => {
    const height = Math.max(
      document.documentElement?.scrollHeight || 0,
      document.body?.scrollHeight || 0,
      window.innerHeight || 0
    );
    send('BM27_EMBED_HEIGHT', { height });
  };

  const ready = () => {
    document.body?.classList.add('bm27-embedded-body');
    send('BM27_EMBED_READY', {
      href: location.href,
      storageAvailable
    });
    reportHeight();

    // PWA installation prompts are not useful inside an iframe.
    for (const id of ['installAppBtn', 'installAppHeaderBtn']) {
      document.getElementById(id)?.classList.add('hidden');
    }

    try {
      const observer = new ResizeObserver(() => reportHeight());
      observer.observe(document.documentElement);
    } catch {
      window.addEventListener('resize', reportHeight, { passive: true });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();

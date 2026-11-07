/* Survival Protocol — offline cache so the installed app works without internet */
const VERSION = 'sp-v1.0.2';
const FILES = [
  './', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './js/core.js', './js/models.js', './js/game.js', './js/view.js', './js/maps.js', './js/parts.js', './js/parts2.js', './js/maps2.js', './js/parts3.js', './js/mission.js', './js/maps3.js', './js/maps4.js', './js/guns.js', './js/kits.js', './js/ch3.js', './js/ch4.js', './js/ch5.js', './js/ch6to9.js', './js/chX.js', './js/progress.js', './js/detail.js', './js/touch.js', './js/main.js', './js/features.js', './js/modes.js', './js/features2.js',
  './js/three.min.js',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// game files: network first (so updates arrive), fall back to cache when offline
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  e.respondWith(fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)).catch(() => { }); } return res; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});

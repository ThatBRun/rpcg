const CACHE_NAME = 'vbl-pwa-news-v3';
const APP_SHELL = [
  './',
  './index.html',
  './config.js',
  './main.js',
  './teams.json',
  './manifest.webmanifest',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './assets/vbl.png',
  './assets/los-angeles-oldtimers.png',
  './assets/louisville-mudcats.png',
  './assets/nashville-nodes.png',
  './assets/new-york-yellers.png',
  './assets/san-diego-sails.png',
  './assets/st-louis-hardhitters.png',
  './assets/tampa-bay-gunpowder.png',
  './assets/washington-firespikes.png',
  './assets/atlanta-grenades.png',
  './assets/boston-bluebirds.png',
  './assets/indiana-farmers.png',
  './assets/iowa-huskies.png',
  './assets/kansas-city-americans.png',
  './assets/las-vegas-olympians.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request,copy)).catch(()=>{}); }
    return response;
  }).catch(() => caches.match(event.request).then(x => x || caches.match('./index.html'))));
});

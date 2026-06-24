'use strict';
const VERSION = 'mba-v16';
const SHELL = ['.', 'index.html', 'css/style.css?v=16', 'js/data.js?v=16', 'js/app.js?v=16', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
/* App-Shell: network-first (damit Updates ankommen), Cache als Offline-Fallback.
   Fonts/Drittquellen: cache-first. */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request, {ignoreSearch:false}).then(r => r || caches.match('index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return resp;
      }))
    );
  }
});

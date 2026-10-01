// 黄泉潜り — service worker: lets the game open as an app and start even on a flaky connection.
// The game page itself is always fetched fresh from the network (bypassing every cache) so updates arrive right away;
// the cached copy is only used when offline.
const CACHE = 'yomi-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    const page = r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html');
    e.respondWith(fetch(r, page ? { cache: 'no-store' } : {}).then(res => {
      if (res.ok && !u.search) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
    return;
  }
  if (u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'unpkg.com' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
  }
});

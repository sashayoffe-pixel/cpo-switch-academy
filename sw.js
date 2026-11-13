/* Offline support: caches every file of the app so it works with no internet once installed
   ("Add to Home Screen"). Bump VERSION whenever files change so tablets pick up the update. */
const VERSION = 'cpo-academy-v1';
const FILES = [
    './',
    'index.html',
    'manifest.webmanifest',
    'icons/icon-180.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'css/arch.css',
    'css/base.css',
    'css/budgets.css',
    'css/dataflow.css',
    'css/factory.css',
    'css/glossary.css',
    'css/kpis.css',
    'css/noise.css',
    'js/arch/engine.js',
    'js/arch/nodes-core.js',
    'js/arch/nodes-optics.js',
    'js/arch/nodes-ptc.js',
    'js/core.js',
    'js/course-engine.js',
    'js/data/glossary.js',
    'js/sections/budgets.js',
    'js/sections/cpo-course-appendix.js',
    'js/sections/cpo-course.js',
    'js/sections/dataflow.js',
    'js/sections/factory-appendix.js',
    'js/sections/factory.js',
    'js/sections/glossary.js',
    'js/sections/guide.js',
    'js/sections/home.js',
    'js/sections/kpis.js',
    'js/sections/noise.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Cache first (works offline); refresh the cached copy in the background when online.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});

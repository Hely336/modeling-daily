/* 建模日常 Service Worker — 离线缓存核心资源（相对路径，兼容 GitHub Pages 子路径部署） */
const CACHE_NAME = 'starhub-order-v16';
const PRECACHE = [
  './',
  './index.html',
  './js/core.js',
  './js/data.js',
  './js/victor.js',
  './js/view-home.js',
  './js/view-order.js',
  './js/view-accessory.js',
  './js/view-auth.js',
  './js/view-idea.js',
  './js/view-calendar.js',
  './js/view-money.js',
  './js/view-focus.js',
  './js/view-settings.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE);
    }).catch(function(err){ console.log('[SW] precache skipped', err); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

/* 网络优先 + 缓存兜底：保证每次改版都能立刻看到新界面，断网时仍可用 */
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  // 跨域资源（B站封面/视频跳转）不拦截
  if(!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request, {cache:'no-cache'}).then(function(res){
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function(c){ c.put(e.request, copy); });
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(cached){
        return cached || caches.match('./index.html');
      });
    })
  );
});

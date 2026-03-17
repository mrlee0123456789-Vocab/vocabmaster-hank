// VocabMaster Service Worker - 离线缓存支持
const CACHE_NAME = 'vocabmaster-v1';
const OFFLINE_CACHE = 'vocabmaster-offline-v1';

// 需要离线缓存的静态资源
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/db.js',
  '/js/words-embedded.js',
  '/js/wordLoader.js',
  '/js/app.js',
  '/js/admin.js',
  '/admin.html',
  '/app.html',
  '/manifest.json'
];

// 安装时缓存核心文件
self.addEventListener('install', event => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then(cache => {
        console.log('[SW] 缓存核心文件');
        return cache.addAll(STATIC_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求：优先缓存，fallback 到网络
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 跳过跨域请求
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          console.log('[SW] 缓存命中:', event.request.url);
          return cached;
        }

        return fetch(event.request).then(response => {
          // 缓存成功的响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          // 离线时返回缓存页面
          return caches.match('/index.html');
        });
      })
  );
});

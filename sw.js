// =========================================
// 인터넷이 없어도 앱이 열리게 해주는 파일 (서비스 워커)
// - 인터넷이 되면: 항상 최신 파일을 받아오고, 휴대폰에도 새로 저장해요
// - 인터넷이 안 되면: 휴대폰에 저장해둔 파일로 열어요
// 파일 목록을 바꾸면 아래 이름의 숫자(v1)를 하나 올려주세요
// =========================================
const CACHE_NAME = 'inbody-app-v1';

const APP_FILES = [
  './',
  'index.html',
  'style.css',
  'config.js',
  'foods.js',
  'diet.js',
  'exercises.js',
  'motion.js',
  'workout.js',
  'records.js',
  'app.js',
  'manifest.json',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// 처음 설치할 때 파일을 휴대폰에 저장해요
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // 하나가 실패해도 나머지는 저장되게 하나씩 넣어요
      .then(cache => Promise.all(APP_FILES.map(file => cache.add(file).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

// 예전 이름으로 저장된 파일은 지워요
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// 파일을 달라고 할 때: 인터넷 먼저, 안 되면 저장해둔 것
self.addEventListener('fetch', event => {
  const request = event.request;
  // 같은 주소(내 앱)의 파일만 다뤄요. 음식 검색 같은 바깥 주소는 그대로 보내요
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});

// Service Worker — Land GIS VN-2000 Hybrid (PWA)
// v1: cache "app shell" (trang chính + icon) để mở lại nhanh và có thể chạy được
// khi mất mạng tạm thời. Không cache các API bản đồ/AI trực tuyến (Google/Esri/
// Gemini...) — các phần đó vẫn cần mạng như bản thân ứng dụng đã thiết kế.
const CACHE = 'landgis-shell-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Chỉ can thiệp GET cùng gốc (app shell). Mọi request khác (tile bản đồ, AI, CDN
// thư viện) để trình duyệt tự xử lý bình thường — tránh cache nhầm ảnh vệ tinh
// hay phản hồi AI, vốn cần luôn mới.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

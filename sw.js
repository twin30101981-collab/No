// Service Worker — Land GIS VN-2000 (PWA). Tệp SINH RA bởi handover/tools/deploy_pages.py từ sw.template.js — đừng sửa tay sw.js.
// Tên cache theo phiên bản: landgis-shell-v237-5c1cfd31 (đổi mỗi lần triển khai ⇒ máy cũ thấy "có bản mới").
// Chỉ cache app shell cùng gốc; tile bản đồ (landgis-tiles-*) và gói địa chính (IndexedDB) KHÔNG bị đụng tới khi nâng cấp.
const CACHE = 'landgis-shell-v237-5c1cfd31';
const SHELL = ['./', './index.html', './manifest.json', './admin-map.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './vendor/xlsx.full.min.js', './vendor/html2canvas.min.js', './vendor/jsQR.js', './vendor/jspdf.umd.min.js'];

self.addEventListener('install', (e) => {
  // Không skipWaiting tự động: bản mới chờ tới khi người dùng bấm "Cập nhật" (tránh đổi mã giữa lúc đang nhập liệu).
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))));
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => /^landgis-shell-/.test(k) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Chỉ GET cùng gốc. Điều hướng: ưu tiên bản cache (mở ngoại tuyến được), cập nhật nền; tài nguyên khác: cache-first + làm mới nền.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;
  const nav = e.request.mode === 'navigate';
  e.respondWith(
    caches.open(CACHE).then((c) => c.match(nav ? './index.html' : e.request, { ignoreSearch: true }).then((cached) => {
      const net = fetch(e.request).then((res) => { if (res && res.ok) c.put(nav ? './index.html' : e.request, res.clone()); return res; }).catch(() => cached);
      return cached || net;
    }))
  );
});

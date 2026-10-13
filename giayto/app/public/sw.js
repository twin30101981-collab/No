// G2-08: service worker — giữ mã, phông và dữ liệu nhận chữ tiếng Việt để dùng khi mất mạng.
// HM-08: phiên bản bộ đệm lấy từ ?v=<mã bản build> trong địa chỉ đăng ký (offline.ts) → mỗi bản phát hành là một SW mới,
// trình duyệt tự cài, hiện "Đã có bản mới" và dọn bộ đệm cũ. Địa chỉ không đổi trong cùng một bản build.
const BUILD = new URL(self.location.href).searchParams.get("v") || "dev";
const VERSION = `gn-${BUILD}`;
const SHARE = "gn-share"; // G2-11: tệp chia sẻ, không bị xoá khi đổi phiên bản
const OCR = "gn-ocr-v1"; // worker/lõi/dữ liệu ngôn ngữ Tesseract (lớn, ít đổi): GIỮ qua các bản phát hành
const SHELL = `${VERSION}-shell`;
const REQUIRED = ["/", "/manifest.webmanifest"]; // thiếu một trong hai thì không cài SW (tránh SW "rỗng" làm app không mở được khi mất mạng)
const OPTIONAL = ["/fonts/DejaVuSans.ttf", "/icon.svg", "/icon-192.png", "/icon-512.png"]; // lỗi thì chỉ cảnh báo
const OCR_HOSTS = ["cdn.jsdelivr.net", "unpkg.com", "tessdata.projectnaptha.com"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.all(REQUIRED.map((u) => c.add(u)));
    const rs = await Promise.allSettled(OPTIONAL.map((u) => c.add(u)));
    rs.forEach((r, i) => { if (r.status === "rejected") console.warn("[sw] không cất được", OPTIONAL[i]); });
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Bản trước dùng gn-vN-ocr: chuyển sang gn-ocr-v1 để người dùng không phải "Tải sẵn" lại.
    const keys = await caches.keys();
    for (const k of keys) {
      if (!/^gn-v\d+-ocr$/.test(k)) continue;
      const from = await caches.open(k), to = await caches.open(OCR);
      for (const req of await from.keys()) { const res = await from.match(req); if (res) await to.put(req, res); }
    }
    for (const k of await caches.keys()) if (!k.startsWith(`${VERSION}-`) && k !== SHARE && k !== OCR) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => { if (e.data === "skip-waiting") self.skipWaiting(); });

async function cacheFirst(req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") c.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(SHELL);
  const hit = await c.match(req);
  const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
  return hit || net;
}

async function networkFirstPage(req) {
  const c = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch {
    return (await c.match(req)) || (await c.match("/")) || Response.error();
  }
}

async function receiveShare(req) {
  let n = 0;
  try {
    const form = await req.formData();
    const c = await caches.open(SHARE);
    const stamp = Date.now();
    for (const f of form.getAll("files")) {
      if (!(f instanceof File) || !f.size || !/^(image\/|application\/pdf$)/.test(f.type) || n >= 50) continue;
      await c.put(`/__share/${stamp}-${n}`, new Response(f, { headers: { "content-type": f.type, "x-name": encodeURIComponent(f.name) } }));
      n++;
    }
  } catch {}
  return Response.redirect(`/?shared=${n}`, 303);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method === "POST" && new URL(req.url).pathname === "/share-target") { e.respondWith(receiveShare(req)); return; }
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (OCR_HOSTS.includes(url.hostname)) { e.respondWith(cacheFirst(req, OCR)); return; }
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  // không chặn đăng nhập, API, server function, công cụ dev
  if (p.startsWith("/~") || p.startsWith("/api") || p.startsWith("/_serverFn") || p.startsWith("/@") || p.startsWith("/__")) return; // R6.3: không dùng includes("__") — tên tệp băm như react-C21x__mS.js bị bỏ sót, mất mạng là trang trắng
  if (req.mode === "navigate") { e.respondWith(networkFirstPage(req)); return; }
  if (p.startsWith("/assets/") || p.startsWith("/fonts/") || /\.(js|css|wasm|svg|png|ico|ttf|woff2?|webmanifest)$/.test(p)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});

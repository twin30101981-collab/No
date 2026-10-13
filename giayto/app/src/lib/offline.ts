// G2-08: đăng ký service worker và tải sẵn dữ liệu nhận chữ để dùng khi mất mạng.

/** Chỉ bật ở bản đã xuất bản: trong khung xem trước/bản dev, SW sẽ giữ mã cũ gây khó hiểu. */
export function swAllowed(loc: { hostname: string; search?: string }, inIframe: boolean, isProd: boolean): boolean {
  if (!isProd || inIframe) return false;
  const sw = loc.search ? new URLSearchParams(loc.search).get("sw") : null;
  if (sw === "off") return false;
  // R6.3: ?sw=on ép bật để nghiệm thu chế độ máy bay trên bản build chạy ở localhost (vẫn tắt trong iframe/dev).
  if (sw === "on") return true;
  const h = loc.hostname;
  if (h === "localhost" || h === "127.0.0.1") return false;
  if (h.startsWith("id-preview--") || h.startsWith("preview--") || h.includes("-dev.lovable.app")) return false;
  const under = (d: string) => h === d || h.endsWith(`.${d}`);
  if (under("lovableproject.com") || under("lovableproject-dev.com") || under("beta.lovable.dev")) return false;
  return true;
}

/** HM-08: địa chỉ đăng ký SW kèm mã bản build → mỗi bản phát hành là một SW mới (xem public/sw.js). */
export const swScriptUrl = (buildId: string | undefined) => `/sw.js?v=${encodeURIComponent(buildId || "dev")}`;
export function isAppSwUrl(url: string): boolean {
  try { return new URL(url).pathname.endsWith("/sw.js"); } catch { return false; }
}

function unregisterAppSw() {
  void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => {
    const url = (r.active ?? r.waiting ?? r.installing)?.scriptURL ?? "";
    if (isAppSwUrl(url)) void r.unregister();
  })).catch(() => {});
}

/** R6.3: tệp mã/kiểu/phông cùng nguồn mà trang đã tải — cần cất vào bộ nhớ đệm của SW. */
export function shellAssetUrls(names: string[], origin: string): string[] {
  const out = new Set<string>();
  for (const n of names) {
    let u: URL;
    try { u = new URL(n, origin); } catch { continue; }
    if (u.origin !== origin) continue;
    if (u.pathname.startsWith("/assets/") || u.pathname.startsWith("/fonts/")) out.add(u.pathname + u.search);
  }
  return [...out];
}

/**
 * Lần mở đầu tiên, trang nạp xong TRƯỚC khi SW kiểm soát nên các tệp /assets/ không được cất lại
 * → mất mạng ngay sau đó thì trang không chạy được. Sau khi SW sẵn sàng, tải lại các tệp đó qua SW
 * (lấy từ bộ đệm HTTP, gần như không tốn mạng) để SW cất vào bộ nhớ đệm.
 */
function warmShellCache(reg: ServiceWorkerRegistration) {
  void navigator.serviceWorker.ready.then(async () => {
    if (!navigator.serviceWorker.controller) { // SW vừa kích hoạt: chờ clients.claim() để fetch đi qua SW
      await new Promise<void>((done) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => done(), { once: true });
        setTimeout(done, 5000);
      });
      if (!navigator.serviceWorker.controller) return;
    }
    const names = performance.getEntriesByType("resource").map((e) => e.name);
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel=modulepreload],link[rel=stylesheet]")).map((l) => l.href);
    const urls = shellAssetUrls([...names, ...links], window.location.origin);
    await Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer()).catch(() => {})));
    void reg;
  }).catch(() => {});
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let inIframe = true;
  try { inIframe = window.self !== window.top; } catch { /* khung khác nguồn */ }
  if (!swAllowed(window.location, inIframe, import.meta.env.PROD)) {
    unregisterAppSw(); // gỡ SW cũ nếu có (vd từng mở bản xem trước, hoặc ?sw=off)
    return;
  }
  const go = () => {
    void navigator.serviceWorker.register(swScriptUrl(typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : undefined), { scope: "/", updateViaCache: "none" })
      .then((reg) => { warmShellCache(reg); return watchUpdates(reg, navigator.serviceWorker); }).catch(() => {});
  };
  if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
}

// G2-10: kiểm tra bản mới — hỏi SW định kỳ, có bản chờ thì mời người dùng tải lại.
type RegLike = Pick<ServiceWorkerRegistration, "waiting" | "installing" | "update" | "addEventListener">;
type SwLike = Pick<ServiceWorkerContainer, "controller" | "addEventListener">;

export function watchUpdates(reg: RegLike, sw: SwLike, notify: (apply: () => void) => void = notifyUpdate, everyMs = 30 * 60_000) {
  if (!sw.controller) return; // lần cài đầu: không phải "bản mới"
  let shown = false;
  const offer = (w: ServiceWorker | null) => {
    if (!w || shown) return;
    shown = true;
    notify(() => {
      sw.addEventListener("controllerchange", () => window.location.reload());
      w.postMessage("skip-waiting");
    });
  };
  offer(reg.waiting);
  reg.addEventListener("updatefound", () => {
    const w = reg.installing;
    w?.addEventListener("statechange", () => { if (w.state === "installed") offer(w); });
  });
  const t = setInterval(() => { if (navigator.onLine !== false) void reg.update().catch(() => {}); }, everyMs);
  return () => clearInterval(t);
}

function notifyUpdate(apply: () => void) {
  void import("sonner").then(({ toast }) => toast("Đã có bản mới của Ghi Nhanh.", {
    duration: Infinity, action: { label: "Cập nhật", onClick: apply },
  }));
}

const READY_KEY = "ghi-nhanh-offline-ocr";
const SHELL_TAG = "shell";

export function offlineOcrReady(lang: string): boolean {
  try { return localStorage.getItem(READY_KEY) === `${lang}|${SHELL_TAG}`; } catch { return false; }
}

/**
 * B13: lưu sẵn vỏ ứng dụng — tải trước các trang chính qua service worker
 * (networkFirstPage cất vào bộ nhớ đệm) để chế độ máy bay vẫn mở và quét được.
 */
export async function prepareOfflineShell(
  routes: string[] = ["/", "/scan"],
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  for (const r of routes) {
    const res = await fetchFn(r, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Không tải được ${r} (${res.status})`);
  }
}

/** Mở một OCR worker để tải worker, lõi và dữ liệu ngôn ngữ — SW và trình duyệt giữ lại cho lần sau. */
export async function prepareOfflineOcr(lang: string): Promise<void> {
  // B13: xin trình duyệt giữ dữ liệu vĩnh viễn trước khi tải khối lớn.
  const { persistOnce } = await import("./persist");
  await persistOnce().catch(() => false);
  await prepareOfflineShell();
  const { sharedOcr } = await import("./ocr-worker");
  await sharedOcr().warm(lang);
  try { localStorage.setItem(READY_KEY, `${lang}|${SHELL_TAG}`); } catch { /* bỏ qua */ }
}

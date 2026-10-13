// TD-04: đo chế độ "Xem chữ nhỏ" của Chỉnh tay: thời gian từ lúc đổi độ sáng tới khi ảnh đầy đủ dựng xong, long task, bộ nhớ JS.
// Chạy: npx vite dev --host 127.0.0.1 --port 8081; IMG=<ảnh> CPU=4 node do-xem-chu-nho.mjs http://127.0.0.1:8081
import { chromium } from "playwright-core";
const [BASE] = process.argv.slice(2); const CPU = Number(process.env.CPU || 4);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--enable-precise-memory-info"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoOcr: false })); } catch {}
  window.__lt = 0; window.__ltMax = 0; window.__heapMax = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__lt += e.duration; window.__ltMax = Math.max(window.__ltMax, e.duration); } }).observe({ type: "longtask", buffered: true });
  setInterval(() => { const m = performance.memory?.usedJSHeapSize ?? 0; if (m > window.__heapMax) window.__heapMax = m; }, 50);
});
const p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "networkidle" });
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
await fc.setFiles([process.env.IMG]); await p.waitForURL(/\/doc\//); await p.waitForTimeout(3000);
const dim = await p.evaluate(async () => { const id = location.pathname.split("/").pop(); const { getDocs } = await import("/src/lib/db.ts"); const pg = getDocs().find((x) => x.id === id)?.pages[0]; const im = new Image(); im.src = pg.orig; await im.decode(); return `${im.naturalWidth}×${im.naturalHeight}`; });
await p.getByText("Lọc", { exact: true }).first().click(); await p.waitForTimeout(2500);
await p.getByRole("button", { name: "Xem chữ nhỏ" }).click(); await p.waitForTimeout(4000);
const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
await p.evaluate(() => { window.__lt = 0; window.__ltMax = 0; window.__heapMax = 0; });
const zoomImg = () => p.evaluate(() => { const i = [...document.querySelectorAll("img")].filter((x) => x.getBoundingClientRect().width > 200).map((x) => x.src.slice(-24)); return i.join(","); });
const thumb = p.locator('[aria-labelledby="adj-brightness-label"] [role="slider"]');
const runs = [];
for (const [n, gap] of [[1, 0], [5, 150], [5, 450]]) {
  const before = await zoomImg(); const t0 = Date.now();
  await thumb.focus();
  for (let i = 0; i < n; i++) { await p.keyboard.press("ArrowRight"); if (gap) await p.waitForTimeout(gap); }
  let after = before; while (Date.now() - t0 < 60000) { await p.waitForTimeout(100); after = await zoomImg(); const busy = await p.evaluate(() => !!document.querySelector(".animate-spin")); if (after !== before && !busy) break; }
  runs.push({ buoc: n, cach_ms: gap, xong_ms: Date.now() - t0 - n * gap });
}
const m = await p.evaluate(() => ({ longtask_tong_ms: Math.round(window.__lt), longtask_max_ms: Math.round(window.__ltMax), heap_max_MB: +(window.__heapMax / 1048576).toFixed(1) }));
console.log(JSON.stringify({ anh: dim, cpu_cham: CPU, ...m, runs }, null, 1));
await b.close();

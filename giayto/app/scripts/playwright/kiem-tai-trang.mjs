// HM-09: đo tải từng màn (cache tắt): số yêu cầu, JS, LCP; THROTTLE=slow4g giả lập 1,6 Mbps/150 ms. Cần IMG=<ảnh mẫu>.
// Chạy: IMG=src/test/fixtures/trang-mau.jpg [THROTTLE=slow4g] [ROUTES=/,/tools] node scripts/playwright/kiem-tai-trang.mjs http://127.0.0.1:4174 thu
import { chromium } from "playwright-core";
const [BASE, tag] = process.argv.slice(2);
const routes = (process.env.ROUTES || "/,/documents,/scan,/tools,/me,/compare,/id-photo,/receipts,/doc/__NEW__").split(",");
const THROTTLE = process.env.THROTTLE; // "slow4g" = 1.6 Mbps, 150 ms
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const kb = (n) => (n / 1024).toFixed(0);
// tạo 1 tài liệu để đo màn /doc, giữ IndexedDB qua storageState
let docUrl = null, state = null;
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await c.addInitScript(() => localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })));
  const p = await c.newPage(); await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
  await fc.setFiles([process.env.IMG]);
  await p.waitForURL(/\/doc\//); docUrl = new URL(p.url()).pathname; await p.waitForTimeout(2500);
  state = await c.storageState({ indexedDB: true }); await c.close();
}
for (const r0 of routes) {
  const r = r0 === "/doc/__NEW__" ? docUrl : r0;
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: state });
  await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (THROTTLE) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await p.addInitScript(() => { window.__lcp = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {} });
  await p.goto(BASE + r, { waitUntil: "load", timeout: 120000 });
  await p.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(1200);
  const m = await p.evaluate(() => {
    const rs = performance.getEntriesByType("resource"); const nav = performance.getEntriesByType("navigation")[0];
    const js = rs.filter((e) => /\.m?js(\?|$)/.test(e.name)); const css = rs.filter((e) => /\.css/.test(e.name));
    const big = [...rs].sort((a, b) => b.decodedBodySize - a.decodedBodySize).slice(0, 5).map((e) => `${e.name.split("/").pop().slice(0, 34)} ${Math.round(e.decodedBodySize / 1024)}KB`);
    return { dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), lcp: Math.round(window.__lcp), n: rs.length, jsRaw: js.reduce((a, e) => a + e.decodedBodySize, 0), jsWire: js.reduce((a, e) => a + e.transferSize, 0), cssRaw: css.reduce((a, e) => a + e.decodedBodySize, 0), allRaw: rs.reduce((a, e) => a + e.decodedBodySize, 0), big };
  });
  console.log(`[${tag}] ${r0.padEnd(11)} dcl=${m.dcl}ms load=${m.load}ms LCP=${m.lcp}ms | ${m.n} yêu cầu, JS ${kb(m.jsRaw)}KB (truyền ${kb(m.jsWire)}KB), tổng ${kb(m.allRaw)}KB\n      lớn nhất: ${m.big.join(" | ")}`);
  await ctx.close();
}
await b.close();

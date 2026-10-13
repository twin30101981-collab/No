// TD-30: thử nâng cấp từ service worker CŨ (trước HM-08: đăng ký /sw.js không query, bộ đệm gn-v6-shell + gn-v6-ocr)
// lên bản hiện tại (/sw.js?v=<BUILD_ID>, gn-<BUILD_ID>-shell + gn-ocr-v1). SW cũ là bản DỰNG LẠI từ sw.js hiện tại (xem P18).
// Chuẩn bị: S=<thư mục> có S/outA (.output với public/sw.js = SW cũ dựng lại), S/outB (.output bản mới, BUILD_ID=B1),
// S/tools/node_modules/.bin/wrangler. Chạy: S=... node kiem-nang-cap-sw-cu.mjs  (playwright-core ở thư mục riêng)
import { chromium } from "playwright-core";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
const S = process.env.S, PORT = 4191, BASE = `http://127.0.0.1:${PORT}`;
const serve = async (dir) => {
  const log = fs.openSync(`${S}/wr-${dir}.log`, "w");
  const pr = spawn(`${S}/tools/node_modules/.bin/wrangler`, ["dev", "-c", `${S}/sw/${dir}/server/wrangler.json`, "--port", String(PORT), "--ip", "127.0.0.1"], { cwd: `${S}/sw`, stdio: ["ignore", log, log], detached: true });
  for (let i = 0; i < 90; i++) { try { if (execSync(`curl -s -o /dev/null -w "%{http_code}" ${BASE}/manifest.webmanifest`).toString() === "200") return pr; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  throw new Error("không chạy được máy chủ " + dir);
};
const stop = async (pr) => { try { process.kill(-pr.pid, "SIGKILL"); } catch {} await new Promise((r) => setTimeout(r, 2500)); };
const udd = `${S}/udd-swcu`; fs.rmSync(udd, { recursive: true, force: true });
const launch = () => chromium.launchPersistentContext(udd, { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", viewport: { width: 390, height: 844 } });
const cachesInfo = (p) => p.evaluate(async () => { const o = {}; for (const k of (await caches.keys()).sort()) o[k] = (await (await caches.open(k)).keys()).length; return o; });
const regInfo = (p) => p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { active: r?.active?.scriptURL?.replace(location.origin, ""), waiting: r?.waiting?.scriptURL?.replace(location.origin, "") ?? null, installing: r?.installing?.scriptURL?.replace(location.origin, "") ?? null, controller: navigator.serviceWorker.controller?.scriptURL?.replace(location.origin, "") ?? null }; });
const out = {}; let bad = 0;
const ok = (c, m) => { console.log(`${c ? "ĐẠT" : "LỖI"} ${m}`); if (!c) bad++; };

// Bước A: người dùng cũ — SW cũ đăng ký /sw.js (không query), có gói OCR trong gn-v6-ocr.
let pr = await serve("outA"); let ctx = await launch(); let p = await ctx.newPage();
await p.goto(BASE + "/manifest.webmanifest");
await p.evaluate(async () => { await navigator.serviceWorker.register("/sw.js", { scope: "/" }); await navigator.serviceWorker.ready; });
await p.evaluate(async () => { const c = await caches.open("gn-v6-ocr"); await c.put("/fake/vie.traineddata", new Response("x".repeat(1000))); });
out.A = { reg: await regInfo(p), caches: await cachesInfo(p) };
await ctx.close(); await stop(pr);

// Bước B: phát hành bản mới. Người dùng mở app (đang bị SW cũ kiểm soát).
pr = await serve("outB"); ctx = await launch(); p = await ctx.newPage();
await p.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
await p.goto(BASE + "/?sw=on", { waitUntil: "networkidle" });
await p.waitForTimeout(8000);
out.B_truoc = { reg: await regInfo(p), caches: await cachesInfo(p), toasts: await p.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText.replace(/\s+/g, " "))) };
const btn = p.getByRole("button", { name: "Cập nhật" });
out.coNutCapNhat = await btn.count();
if (out.coNutCapNhat) { await Promise.all([p.waitForEvent("load", { timeout: 20000 }).catch(() => {}), btn.click()]); await p.waitForTimeout(5000); }
out.B_sau = { reg: await regInfo(p), caches: await cachesInfo(p) };
// Mở lại lần nữa (như người dùng mở app hôm sau) để xem trạng thái ổn định.
await p.goto(BASE + "/?sw=on", { waitUntil: "networkidle" }); await p.waitForTimeout(3000);
out.B_moLai = { reg: await regInfo(p), caches: await cachesInfo(p) };
await p.close(); await ctx.setOffline(true);
const q = await ctx.newPage(); let offTxt = "";
try { await q.goto(BASE + "/documents?sw=on", { waitUntil: "load", timeout: 15000 }); await q.waitForTimeout(1500); offTxt = (await q.evaluate(() => document.body.innerText)).slice(0, 60).replace(/\s+/g, " "); } catch (e) { offTxt = "LỖI " + e.message.slice(0, 60); }
out.ngoaiTuyen = offTxt;
console.log(JSON.stringify(out, null, 1));
const fin = out.B_moLai;
ok(out.A.reg.active === "/sw.js" && out.A.caches["gn-v6-ocr"] === 1, "A: SW cũ hoạt động, có gói OCR gn-v6-ocr");
ok(out.coNutCapNhat > 0, "B: hiện toast 'Đã có bản mới' + nút Cập nhật khi SW cũ đang kiểm soát");
ok(fin.reg.active?.startsWith("/sw.js?v=") && fin.reg.controller === fin.reg.active, `B: SW mới kiểm soát trang (${fin.reg.controller})`);
ok(fin.caches["gn-ocr-v1"] >= 1 && !Object.keys(fin.caches).some((k) => k.startsWith("gn-v6")), "B: gói OCR chuyển sang gn-ocr-v1, bộ đệm gn-v6-* đã xoá");
ok(!!offTxt && !offTxt.startsWith("LỖI"), `ngoại tuyến mở được /documents (${offTxt.slice(0, 30)})`);
await ctx.close(); await stop(pr);
console.log(bad ? `TỔNG: ${bad} LỖI` : "TỔNG: ĐẠT"); process.exit(bad ? 1 : 0);

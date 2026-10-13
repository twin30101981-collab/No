// HM-08: kiểm luồng cập nhật service worker: dựng 2 bản build (BUILD_ID=A rồi B), chép .output thành outA/outB, chạy script này.
// Cần: S=<thư mục chứa outA, outB, tools/node_modules/.bin/wrangler, work/giayto-scan, evidence>; playwright-core. Mở A → mở B → toast "Cập nhật" → cache cũ bị xoá, gói OCR giữ, ngoại tuyến.
import { chromium } from "playwright-core";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
const S = process.env.S, PORT = 4190, BASE = `http://127.0.0.1:${PORT}`;
const tag = process.argv[2] || "sau";
const serve = async (dir) => {
  const log = fs.openSync(`${S}/evidence/wr-${dir}.log`, "w");
  const pr = spawn(`${S}/tools/node_modules/.bin/wrangler`, ["dev", "-c", `${S}/${dir}/server/wrangler.json`, "--port", String(PORT), "--ip", "127.0.0.1"], { cwd: `${S}/work/giayto-scan`, stdio: ["ignore", log, log], detached: true });
  for (let i = 0; i < 60; i++) { try { if (execSync(`curl -s -o /dev/null -w "%{http_code}" ${BASE}/`).toString() === "200") return pr; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  throw new Error("server " + dir);
};
const stop = async (pr) => { try { process.kill(-pr.pid, "SIGKILL"); } catch {} await new Promise((r) => setTimeout(r, 2500)); };
const udd = `${S}/udd-${tag}`; fs.rmSync(udd, { recursive: true, force: true });
const launch = () => chromium.launchPersistentContext(udd, { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", viewport: { width: 390, height: 844 } });
const cachesInfo = (p) => p.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).length; return o; });
const out = {};
let pr = await serve("outA"); let ctx = await launch(); let p = await ctx.newPage();
await p.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
await p.goto(BASE + "/?sw=on", { waitUntil: "networkidle" });
await p.evaluate(async () => { await navigator.serviceWorker.ready; for (let i = 0; i < 40 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 250)); });
await p.waitForTimeout(4000);
await p.evaluate(async () => { const c = await caches.open("gn-ocr-v1"); await c.put("/fake/vie.traineddata", new Response("x".repeat(1000))); });
out.A = { sw: await p.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL), caches: await cachesInfo(p) };
await ctx.close(); await stop(pr);
pr = await serve("outB"); ctx = await launch(); p = await ctx.newPage();
await p.goto(BASE + "/?sw=on", { waitUntil: "networkidle" });
await p.waitForTimeout(6000);
const toasts = await p.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText.replace(/\s+/g, " ")));
out.B_truocCapNhat = { toasts, caches: await cachesInfo(p), waiting: await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting) };
const btn = p.getByRole("button", { name: "Cập nhật" });
if (await btn.count()) { await Promise.all([p.waitForEvent("load", { timeout: 20000 }).catch(() => {}), btn.click()]); await p.waitForTimeout(5000); }
await p.evaluate(async () => { for (let i = 0; i < 40 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 250)); });
out.B_sauCapNhat = { sw: await p.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL), caches: await cachesInfo(p) };
await p.close(); await ctx.setOffline(true);
out.offline = {};
for (const r of ["/documents", "/tools", "/", "/scan"]) { const q = await ctx.newPage(); try { await q.goto(BASE + r + "?sw=on", { waitUntil: "load", timeout: 15000 }); await q.waitForTimeout(1000); out.offline[r] = (await q.evaluate(() => document.body.innerText)).slice(0, 40).replace(/\s+/g, " "); } catch (e) { out.offline[r] = "LỖI " + e.message.slice(0, 50); } await q.close(); }
console.log(JSON.stringify(out, null, 1));
await ctx.close(); await stop(pr);

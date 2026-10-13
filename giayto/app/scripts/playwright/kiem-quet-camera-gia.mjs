// HM-06: /scan với camera giả (cờ --use-fake-device-for-media-stream) rồi rời trang; đếm pageerror.
// Chạy: OUT=./out node scripts/playwright/kiem-quet-camera-gia.mjs http://127.0.0.1:4174 thu   (cần OUT/shots, playwright-core)
import { chromium } from "playwright-core";
const [BASE, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ["camera"] });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoCapture: false })); } catch {} });
const p = await ctx.newPage(); const pe = [], ce = [];
p.on("pageerror", (e) => pe.push(e.message.slice(0, 120)));
p.on("console", (m) => { if (m.type() === "error") ce.push(m.text().slice(0, 120)); });
await p.goto(BASE + "/scan", { waitUntil: "networkidle" }); await p.waitForTimeout(5000);
const st = await p.evaluate(() => ({ video: !!document.querySelector("video"), playing: (() => { const v = document.querySelector("video"); return !!v && v.readyState >= 2 && !v.paused; })(), text: document.body.innerText.replace(/\s+/g, " ").slice(0, 120) }));
const shutter = p.locator("button[aria-label*='Chụp'], button:has(svg.lucide-camera)").first();
let captured = "không tìm thấy nút chụp";
if (await shutter.count()) { await shutter.click().catch(() => {}); await p.waitForTimeout(6000); captured = (await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "))).match(/(\d+)\s*(trang|ảnh)/i)?.[0] || "(không thấy số trang)"; }
await p.screenshot({ path: `${process.env.OUT}/shots/hm06_${tag}.jpg`, type: "jpeg", quality: 45 });
await p.goto(BASE + "/documents", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
console.log(`[${tag}] video=${st.video} playing=${st.playing} | chụp: ${captured} | pageerror=${pe.length} ${JSON.stringify(pe.slice(0, 2))} | console.error=${ce.length} ${JSON.stringify(ce.slice(0, 2))}\n    ${st.text}`);
await b.close();

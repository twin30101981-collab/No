// HM-09: ký số nạp lười — mở hộp thoại Ký số + Kiểm tra chữ ký (PDF=<tệp PDF chưa ký>), đếm yêu cầu gói ký số.
// Chạy: OUT=./out PDF=x.pdf node scripts/playwright/kiem-ky-so.mjs http://127.0.0.1:4174 thu   (cần OUT/shots)
import { chromium } from "playwright-core";
const [BASE, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
const p = await ctx.newPage(); const pe = [], ce = [], js = [];
p.on("pageerror", (e) => pe.push(e.message.slice(0, 120)));
p.on("console", (m) => { if (m.type() === "error") ce.push(m.text().slice(0, 120)); });
p.on("request", (r) => { if (/pdf-sign|digital-sign|p12|forge/.test(r.url())) js.push(r.url().split("/").pop()); });
await p.goto(BASE + "/tools", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
const before = js.length;
await p.getByText("Ký số", { exact: true }).first().click(); await p.waitForTimeout(2500);
const dlg = await p.evaluate(() => document.querySelector("[role=dialog]")?.innerText.replace(/\s+/g, " ").slice(0, 160) || "(không có hộp thoại)");
await p.screenshot({ path: `${process.env.OUT}/shots/hm09_${tag}_kyso.jpg`, type: "jpeg", quality: 45 });
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 15000 }), p.getByText("Kiểm tra chữ ký", { exact: true }).first().click()]);
await fc.setFiles([process.env.PDF]); await p.waitForTimeout(4000);
const res = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
console.log(`[${tag}] tải gói ký số khi mở /tools: ${before} yêu cầu; sau khi bấm: ${js.length - before} (${[...new Set(js)].join(", ")})`);
console.log(`[${tag}] hộp thoại Ký số: ${dlg}`);
console.log(`[${tag}] kiểm tra chữ ký (PDF chưa ký): ${/KHÔNG CÓ CHỮ KÝ/.test(res) ? "hiện 'KHÔNG CÓ CHỮ KÝ' ✔" : "KHÔNG thấy kết quả: " + res.slice(0, 200)}`);
console.log(`[${tag}] pageerror=${pe.length} ${JSON.stringify(pe)} console.error=${ce.length} ${JSON.stringify(ce.slice(0, 2))}`);
await b.close();

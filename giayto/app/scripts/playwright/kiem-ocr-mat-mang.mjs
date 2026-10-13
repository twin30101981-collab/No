// HM-07: kiểm nhận chữ khi gói OCR không tải được (BLOCK) hoặc tải được (REACH=1).
// Chạy: IMG=src/test/fixtures/trang-mau.jpg OUT=./out [REACH=1] node scripts/playwright/kiem-ocr-mat-mang.mjs http://127.0.0.1:4174 thu   (cần OUT/shots, playwright-core)
import { chromium } from "playwright-core";
const [BASE, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoOcr: true })); } catch {} });
if (process.env.BLOCK) await ctx.route(/cdn\.jsdelivr\.net|unpkg\.com|tessdata\.projectnaptha\.com/, (r) => r.abort());
if (process.env.REACH) await ctx.route(/worker\.min\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "/* test */" }));
const p = await ctx.newPage(); const pe = [], ce = [], reqs = [];
p.on("pageerror", (e) => pe.push(e.message.slice(0, 110)));
p.on("console", (m) => { if (m.type() === "error") ce.push(m.text().slice(0, 110)); });
p.on("requestfailed", (r) => reqs.push(r.url().slice(0, 90)));
const snap = async (n) => { const t = await p.evaluate(() => ({ toasts: [...document.querySelectorAll("[data-sonner-toast]")].map((x) => x.innerText.replace(/\s+/g, " ")), body: document.body.innerText.replace(/\s+/g, " ").slice(0, 260) })); console.log(`[${tag}] ${n}: toasts=${JSON.stringify(t.toasts)}\n    body=${t.body}`); await p.screenshot({ path: `${process.env.OUT}/shots/hm07_${tag}_${n}.jpg`, type: "jpeg", quality: 45 }); };
await p.goto(BASE + "/", { waitUntil: "networkidle" });
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
await fc.setFiles([process.env.IMG]);
await p.waitForURL(/\/doc\//, { timeout: 30000 }); await p.waitForTimeout(15000);
await snap("a_sau_nhap");
await p.getByRole("button", { name: /^Chữ$/ }).click(); await p.waitForTimeout(2500);
await snap("b_mo_chu");
console.log("buttons:", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("button")].map((x) => x.innerText.trim()).filter(Boolean).slice(0, 30))));
const btn = p.getByRole("button", { name: /Trang này/ }).first();
if (await btn.count()) { await btn.click().catch(() => {}); await p.waitForTimeout(2500); await snap("c_sau_bam"); }
console.log(`[${tag}] pageerror=${pe.length} ${JSON.stringify([...new Set(pe)])}\n[${tag}] console.error=${ce.length} ${JSON.stringify([...new Set(ce)].slice(0,3))}\n[${tag}] requestfailed=${JSON.stringify([...new Set(reqs)].slice(0,4))}`);
await b.close();

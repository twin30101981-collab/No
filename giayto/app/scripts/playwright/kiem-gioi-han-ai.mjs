// HM-03: gọi AI qua giao diện /photo-check nhiều lần để kiểm giới hạn theo IP.
// Cần: máy chủ chạy bản build có VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY (giả cũng được) và --var AI_RATE_LIMIT_PER_HOUR:3; npm i --no-save playwright-core.
// Chạy: IMG=src/test/fixtures/trang-mau.jpg OUT=./out node scripts/playwright/kiem-gioi-han-ai.mjs http://127.0.0.1:4180 thu   (cần thư mục OUT/shots)
import { chromium } from "playwright-core";
const [BASE, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
const p = await ctx.newPage(); const pe = [];
p.on("pageerror", (e) => pe.push(e.message.slice(0, 100)));
const calls = [];
p.on("response", async (r) => { if (r.url().includes("/_serverFn/")) { let t = ""; try { t = (await r.text()).slice(0, 400); } catch {} calls.push(`${r.status()} ${t}`); } });
await p.goto(BASE + "/photo-check", { waitUntil: "networkidle" });
for (let i = 1; i <= 5; i++) {
  if (i > 1) await p.goto(BASE + "/photo-check", { waitUntil: "networkidle" });
  const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 45000 }), p.getByText("Chọn ảnh", { exact: true }).click()]);
  await fc.setFiles([process.env.IMG]);
  await p.waitForFunction(() => !document.querySelector(".animate-spin"), null, { timeout: 40000 }).catch(() => {}); await p.waitForTimeout(1200);
  const toasts = await p.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText.replace(/\s+/g, " ")));
  console.log(`[${tag}] lần ${i}: gọi=${calls.length} toast=${JSON.stringify(toasts.slice(-1))}`);
}
console.log(`[${tag}] server fn trả:`); calls.forEach((c, i) => console.log(`  #${i + 1} ${c.replace(/\s+/g, " ").slice(0, 230)}`));
console.log(`[${tag}] pageerror=${pe.length}`);
await p.screenshot({ path: `${process.env.OUT}/shots/hm03_${tag}.jpg`, type: "jpeg", quality: 45 });
await b.close();

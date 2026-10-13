// HM-10: kiểm bố cục màn rộng của /documents (1 cột <1024 px, 2 cột từ 1024 px; không tràn ngang; thanh dưới đúng khung).
// Chạy: npx vite dev --port 8081; rồi (playwright-core cài ở thư mục riêng) IMG=src/test/fixtures/trang-mau.jpg OUT=./out node scripts/playwright/kiem-man-rong.mjs http://127.0.0.1:8081 sau   (cần OUT/shots)
import { chromium } from "playwright-core";
const [BASE, tag] = process.argv.slice(2);
const IMG = process.env.IMG, OUT = process.env.OUT;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0;
for (const [w, h, mobile, cols] of [[360, 800, true, 1], [390, 844, true, 1], [768, 900, false, 1], [1024, 768, false, 2], [1366, 768, false, 2]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  for (let i = 0; i < 4; i++) {
    const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
    await fc.setFiles([IMG]);
    await p.waitForURL(/\/doc\//, { timeout: 30000 }); await p.waitForTimeout(1500);
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
  }
  await p.goto(BASE + "/documents", { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
  const m = await p.evaluate(() => {
    const rows = [...document.querySelectorAll(".document-row")]; const lefts = new Set(rows.map((r) => Math.round(r.getBoundingClientRect().left)));
    const fr = document.querySelector(".phone-frame").getBoundingClientRect(); const nav = document.querySelector("nav.bottom-nav").getBoundingClientRect();
    return { n: rows.length, cols: lefts.size, frameW: Math.round(fr.width), navW: Math.round(nav.width), overX: document.documentElement.scrollWidth > innerWidth, maxRight: Math.max(...rows.map((r) => r.getBoundingClientRect().right)), iw: innerWidth };
  });
  const ok = m.n >= 4 && m.cols === cols && !m.overX && m.maxRight <= m.iw + 1 && m.navW === m.frameW && !errs.length; if (!ok) bad++;
  console.log(`[${tag}] ${w}px thẻ=${m.n} cột=${m.cols} (mong ${cols}) khung=${m.frameW} thanhDưới=${m.navW} trànNgang=${m.overX} lỗiJS=${errs.length} → ${ok ? "ĐẠT" : "LỖI"}`);
  await p.screenshot({ path: `${OUT}/shots/hm10_${tag}_${w}.jpg`, type: "jpeg", quality: 45 });
  await ctx.close();
}
await b.close(); console.log(bad ? `TỔNG: ${bad} LỖI` : "TỔNG: ĐẠT"); process.exit(bad ? 1 : 0);

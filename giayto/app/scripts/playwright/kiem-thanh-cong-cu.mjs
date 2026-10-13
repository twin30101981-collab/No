// HM-04: kiểm bố cục thanh công cụ màn tài liệu (1 hàng, không cắt chữ, không tràn ngang) ở 360/390/1024/1366 px.
// Chạy: npm i --no-save playwright-core; IMG=src/test/fixtures/trang-mau.jpg OUT=./out node scripts/playwright/kiem-thanh-cong-cu.mjs http://127.0.0.1:4174 sau   (cần thư mục OUT/shots, máy chủ đang chạy bản build)
import { chromium } from "playwright-core";
const [BASE, tag] = process.argv.slice(2);
const IMG = process.env.IMG, OUT = process.env.OUT;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0;
for (const [w, h, mobile] of [[360, 800, true], [390, 844, true], [1024, 768, false], [1366, 768, false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
  await fc.setFiles([IMG]);
  await p.waitForURL(/\/doc\//, { timeout: 30000 }); await p.waitForTimeout(3000);
  const m = await p.evaluate(() => {
    const nav = document.querySelector("nav.bottom-nav"); const bs = [...nav.querySelectorAll("button")];
    const r = bs.map((x) => { const q = x.getBoundingClientRect(); return { t: x.innerText.trim(), top: Math.round(q.top), left: Math.round(q.left), w: Math.round(q.width), h: Math.round(q.height), clipped: x.scrollWidth > x.clientWidth + 1 }; });
    const nb = nav.getBoundingClientRect();
    return { n: r.length, rows: new Set(r.map((x) => x.top)).size, navH: Math.round(nb.height), minW: Math.min(...r.map((x) => x.w)), clipped: r.filter((x) => x.clipped).map((x) => x.t), overX: document.documentElement.scrollWidth > innerWidth, right: Math.max(...r.map((x) => x.left + x.w)), iw: innerWidth };
  });
  const ok = m.rows === 1 && !m.clipped.length && !m.overX && m.right <= m.iw + 1; if (!ok) bad++;
  console.log(`[${tag}] ${w}px nút=${m.n} hàng=${m.rows} cao=${m.navH}px rộngMin=${m.minW} cắtChữ=${JSON.stringify(m.clipped)} trànNgang=${m.overX} → ${ok ? "ĐẠT" : "LỖI"}`);
  await p.screenshot({ path: `${OUT}/shots/hm04_${tag}_${w}.jpg`, type: "jpeg", quality: 45 });
  await ctx.close();
}
console.log(`[${tag}] tổng lỗi: ${bad}`);
await b.close();

// TD-44 (màn rộng cho Trang chủ/Công cụ/Tôi) + TD-46 (giao diện sáng/tối sau khi đổi màu primary).
// IMG là đường dẫn .jpg; cần 3 bản khác byte cùng thư mục tên <tên>.v0.jpg, .v1.jpg, .v2.jpg (app chặn nhập trùng nội dung).
// Chạy: npx vite dev --port 8081 --host 127.0.0.1; IMG=src/test/fixtures/trang-mau.jpg OUT=./out node scripts/playwright/kiem-td44-td46.mjs http://127.0.0.1:8081   (cần OUT/shots)
import { chromium } from "playwright-core";
const BASE = process.argv[2], IMG = process.env.IMG, OUT = process.env.OUT;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0;
const lum = (c) => { const [r, g, bl] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
for (const dark of [false, true]) for (const [w, h, mobile] of [[360, 800, true], [390, 844, true], [768, 900, false], [1024, 768, false], [1366, 768, false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript((d) => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, dark: d })); } catch {} }, dark);
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) {
    const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
    await fc.setFiles([IMG.replace(".jpg", `.v${i}.jpg`)]); await p.waitForFunction(() => /\/doc\//.test(location.pathname), null, { timeout: 60000 }); await p.waitForTimeout(1200);
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
  }
  for (const [route, sel, minCols] of [["/", ".shortcut-tile", w >= 1024 ? 8 : 4], ["/tools", ".shortcut-tile", w >= 1024 ? 8 : 4], ["/me", ".document-row", 1]]) {
    await p.goto(BASE + route, { waitUntil: "networkidle" }); await p.waitForTimeout(900);
    const m = await p.evaluate((sel) => {
      const fr = document.querySelector(".phone-frame").getBoundingClientRect(), nav = document.querySelector("nav.bottom-nav").getBoundingClientRect();
      const els = [...document.querySelectorAll(sel)]; const tops = new Set(els.slice(0, 16).map((e) => Math.round(e.getBoundingClientRect().top)));
      const first = els[0].getBoundingClientRect(); const rowTiles = els.filter((e) => Math.abs(e.getBoundingClientRect().top - first.top) < 2).length;
      const cls = document.documentElement.classList.contains("dark");
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--primary");
      const btn = document.querySelector(".bg-primary"); const cs = btn && getComputedStyle(btn);
      const rgb = (c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = "#000"; x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      return { frameW: Math.round(fr.width), navW: Math.round(nav.width), overX: document.documentElement.scrollWidth > innerWidth, rowTiles, cls, bg, fg: cs && rgb(cs.color), back: cs && rgb(cs.backgroundColor), maxRight: Math.max(...els.map((e) => e.getBoundingClientRect().right)), iw: innerWidth };
    }, sel);
    const [fgc, bgc] = [m.fg || [], m.back || []]; const ratio = fgc.length === 3 && bgc.length === 3 ? (Math.max(lum(fgc), lum(bgc)) + 0.05) / (Math.min(lum(fgc), lum(bgc)) + 0.05) : null;
    const wideOk = route === "/me" ? true : (w >= 1024 ? m.rowTiles === minCols : m.rowTiles === 4);
    const frameOk = w >= 1024 ? m.frameW === 880 : m.frameW <= 430;
    const ok = !m.overX && m.maxRight <= m.iw + 1 && m.navW === m.frameW && wideOk && frameOk && m.cls === dark && !errs.length && (ratio === null || ratio >= 4.5);
    if (!ok) bad++;
    console.log(`${dark ? "TỐI" : "SÁNG"} ${w}px ${route} khung=${m.frameW} thanhDưới=${m.navW} ô/hàng=${m.rowTiles} trànNgang=${m.overX} tươngPhảnNútChính=${ratio ? ratio.toFixed(2) : "-"} lỗiJS=${errs.length} → ${ok ? "ĐẠT" : "LỖI"}`);
    if ([360, 1366].includes(w)) await p.screenshot({ path: `${OUT}/shots/td44_${dark ? "toi" : "sang"}_${w}_${route.replace("/", "") || "home"}.jpg`, type: "jpeg", quality: 50 });
  }
  // Hàng tài liệu: nút Xóa/Chia sẻ phía sau không được lộ khi nghỉ (nền thẻ trong suốt), phải hiện khi vuốt.
  if (mobile) {
    await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
    const del = p.locator('button[aria-label="Xóa"]').first(); const row = p.locator("a.document-row").first();
    const op = () => del.evaluate((e) => getComputedStyle(e.parentElement).opacity);
    const rest = await op();
    const bx = await row.boundingBox(); const cdp = await ctx.newCDPSession(p); const y = bx.y + bx.height / 2, x0 = bx.x + bx.width - 20;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y }] });
    for (let k = 1; k <= 8; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 - k * 16, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await p.waitForTimeout(500);
    const open = await op(); const okSw = rest === "0" && open === "1"; if (!okSw) bad++;
    console.log(`${dark ? "TỐI" : "SÁNG"} ${w}px vuốt hàng: nghỉ opacity=${rest}, sau vuốt=${open} → ${okSw ? "ĐẠT" : "LỖI"}`);
  }
  await ctx.close();
}
await b.close(); console.log(bad ? `LỖI: ${bad}` : "TẤT CẢ ĐẠT"); process.exit(bad ? 1 : 0);

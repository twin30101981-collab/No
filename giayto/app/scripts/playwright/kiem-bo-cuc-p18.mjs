// TD-27: soi bố cục từng màn/lớp phủ sau khi Button/Input cao hơn (HM-05) ở màn hẹp. Mỗi trạng thái đo:
// tràn ngang, nút ra ngoài mép, nút chồng nhau, nhãn nút bị cắt, nút nằm dưới đáy màn mà không cuộn tới được.
// Chạy: npx vite dev --host 127.0.0.1 --port 8081; rồi IMG=<ảnh> OUT=<thư mục> node kiem-bo-cuc-p18.mjs http://127.0.0.1:8081
import { chromium } from "playwright-core";
const [BASE] = process.argv.slice(2); const { IMG, OUT } = process.env;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const audit = (p) => p.evaluate(() => {
  const iw = innerWidth, ih = innerHeight, out = [];
  const vis = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  const name = (e) => (e.getAttribute("aria-label") || e.textContent || e.getAttribute("placeholder") || e.tagName).trim().replace(/\s+/g, " ").slice(0, 28);
  const scrollable = (e) => { for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 1) return true; } return document.scrollingElement.scrollHeight > ih + 1; };
  // chỉ xét lớp trên cùng: nếu có hộp thoại/lớp phủ đang mở thì chỉ đo trong đó
  const layers = [...document.querySelectorAll('[role=dialog], .fixed.inset-0')].filter(vis);
  const root = layers.at(-1) ?? document.body;
  const els = [...root.querySelectorAll("button, a[href], input:not([type=hidden]), [role=slider], [role=tab], select, textarea")].filter(vis)
    .filter((e) => !e.closest("[data-sonner-toaster]"));
  if (document.documentElement.scrollWidth > iw + 1) out.push(`tràn ngang ${document.documentElement.scrollWidth}>${iw}`);
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.right > iw + 1 || r.left < -1) { let clip = false; for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowX)) { clip = true; break; } } if (!clip) out.push(`ra ngoài mép: ${name(e)} [${Math.round(r.left)}..${Math.round(r.right)}]`); }
    if (r.top > ih - 4 && !scrollable(e)) out.push(`dưới đáy, không cuộn tới: ${name(e)} (top ${Math.round(r.top)})`);
    if (e.tagName === "BUTTON" && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== "visible") out.push(`nhãn bị cắt: ${name(e)}`);
  }
  // chồng nhau: chỉ phần tử trong khung nhìn, bỏ nền mờ phủ gần toàn màn, bỏ cặp có một bên ở thanh/lớp cố định khác lớp với bên kia
  const inView = els.filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < ih && r.width * r.height < 0.6 * iw * ih; });
  const fixedRoot = (e) => { for (let a = e; a; a = a.parentElement) { const pos = getComputedStyle(a).position; if (pos === "fixed" || pos === "sticky") return a; } return null; };
  for (let i = 0; i < inView.length; i++) for (let j = i + 1; j < inView.length; j++) {
    const ei = inView[i], ej = inView[j];
    const a = ei.getBoundingClientRect(), c = ej.getBoundingClientRect();
    if (ei.contains(ej) || ej.contains(ei) || fixedRoot(ei) !== fixedRoot(ej)) continue;
    const w = Math.min(a.right, c.right) - Math.max(a.left, c.left), h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
    if (w > 4 && h > 4 && w * h > 0.25 * Math.min(a.width * a.height, c.width * c.height)) out.push(`chồng nhau: ${name(ei)} × ${name(ej)}`);
  }
  // dải cuộn ngang bị bóp chiều cao (flex-shrink + min-height:auto = 0 của phần tử overflow ≠ visible)
  for (const e of document.querySelectorAll("*")) {
    const st = getComputedStyle(e);
    if (!/(auto|scroll)/.test(st.overflowX) || !vis(e) || e.scrollWidth <= 0) continue;
    if (e.scrollHeight > e.clientHeight + 2 && !/(auto|scroll)/.test(st.overflowY === st.overflowX && e.clientHeight > 80 ? st.overflowY : "x"))
      out.push(`dải bị bóp cao: ${(e.getAttribute("data-testid") || e.getAttribute("aria-label") || e.className.toString()).slice(0, 40)} (${e.clientHeight}/${e.scrollHeight}px)`);
  }
  // tương phản chữ (WCAG): < 3 là lỗi (bỏ phần tử bị tắt). Màu oklch → đổi qua canvas.
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgb = (c) => { if (!c || c === "transparent") return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = "rgba(0,0,0,0)"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  const mix = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (e) => { const ch = []; for (let a = e; a; a = a.parentElement) { const c = rgb(getComputedStyle(a).backgroundColor); if (c && c.a > 0) ch.push(c); if (c && c.a >= 1) break; } let acc = { r: 255, g: 255, b: 255, a: 1 }; for (const c of ch.reverse()) acc = mix(c, acc); return acc; };
  for (const e of root.querySelectorAll("*")) {
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (!t || !vis(e) || e.closest("[disabled], [aria-disabled=true], [data-sonner-toaster]")) continue;
    const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > ih) continue;
    let op = 1; for (let a = e; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
    const bg = bgOf(e), f0 = rgb(getComputedStyle(e).color); if (!f0) continue;
    const fg = mix({ ...f0, a: f0.a * op }, bg); const L1 = lum(fg), L2 = lum(bg);
    const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (cr < 3) out.push(`tương phản ${cr.toFixed(2)}: "${t.slice(0, 24)}"`);
  }
  return { n: els.length, issues: [...new Set(out)] };
});
let total = 0;
for (const [w, h] of [[360, 640], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, permissions: ["camera"] });
  await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoOcr: false })); } catch {} });
  const p = await ctx.newPage();
  const check = async (tag) => { await p.waitForTimeout(900); const r = await audit(p); total += r.issues.length; console.log(`[${w}×${h}] ${tag}: ${r.n} phần tử, ${r.issues.length ? "VẤN ĐỀ: " + r.issues.join(" | ") : "ổn"}`); await p.screenshot({ path: `${OUT}/bc_${w}_${tag.replace(/[^\w]+/g, "-")}.jpg`, type: "jpeg", quality: 50 }); };
  for (const r of ["/", "/documents", "/tools", "/me"]) { await p.goto(BASE + r, { waitUntil: "networkidle" }); await check(`trang ${r}`); }
  await p.goto(BASE + "/scan", { waitUntil: "networkidle" }); await p.waitForTimeout(3000); await check("màn Quét (camera giả)");
  await p.goto(BASE + "/tools", { waitUntil: "networkidle" }); await p.getByText("Ký số", { exact: true }).first().click(); await check("hộp thoại Ký số"); await p.keyboard.press("Escape");
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
  await fc.setFiles([IMG]); await p.waitForURL(/\/doc\//, { timeout: 30000 }); await p.waitForTimeout(2500);
  const docUrl = p.url();
  await check("màn Tài liệu");
  for (const [label, tag] of [["Cắt", "Cắt"], ["Lọc", "Chỉnh tay"], ["Ký/Vẽ", "Ký-Vẽ"], ["Chữ", "Nhận chữ"], ["Tùy chọn", "Tùy chọn"]]) {
    await p.getByText(label, { exact: true }).first().click(); await check(tag);
    if (tag === "Chỉnh tay") { await p.evaluate(() => { for (const e of document.querySelectorAll("*")) if (e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) e.scrollTop = e.scrollHeight; }); await check("Chỉnh tay (cuộn cuối)"); }
    if (tag === "Ký-Vẽ") { const top = p.locator(".fixed.inset-0").last(); if (await top.getByRole("button", { name: "Hủy" }).count()) { await top.getByRole("button", { name: "Hủy" }).click(); await check("Ký-Vẽ (sau khi đóng hộp ký mới)"); } }
    await p.goto(docUrl, { waitUntil: "networkidle" }); await p.waitForTimeout(800); // về lại màn Tài liệu, không phụ thuộc nút đóng
  }
  await ctx.close();
}
await b.close(); console.log(`TỔNG: ${total} vấn đề`);

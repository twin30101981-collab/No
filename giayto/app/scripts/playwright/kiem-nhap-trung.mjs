// Nhập ảnh trùng: hộp thoại của app (không phải window.confirm); Huỷ → toast "bỏ qua", Vẫn thêm → mở tài liệu.
// Chạy: npx vite dev --port 8081 --host 127.0.0.1; IMG=src/test/fixtures/trang-mau.jpg node scripts/playwright/kiem-nhap-trung.mjs http://127.0.0.1:8081
import { chromium } from "playwright-core";
const BASE = process.argv[2], IMG = process.env.IMG;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
const p = await ctx.newPage(); const errs = [], native = [];
p.on("pageerror", (e) => errs.push(String(e))); p.on("dialog", (d) => { native.push(d.type()); d.dismiss(); });
const imp = async () => { const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]); await fc.setFiles([IMG]); };
let bad = 0; const chk = (n, ok) => { console.log(`${n} → ${ok ? "ĐẠT" : "LỖI"}`); if (!ok) bad++; };
await p.goto(BASE + "/", { waitUntil: "networkidle" });
await imp(); await p.waitForFunction(() => /\/doc\//.test(location.pathname), null, { timeout: 60000 });
await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
await imp(); const dlg = p.getByRole("alertdialog"); await dlg.waitFor({ timeout: 20000 });
chk("lần 2: hộp thoại app hiện, nêu ảnh trùng", /trùng|nhập trước/.test(await dlg.innerText()));
await dlg.getByRole("button", { name: "Huỷ" }).click(); await p.waitForTimeout(1500);
chk("Huỷ: ở lại Trang chủ", !/\/doc\//.test(p.url()));
chk("Huỷ: toast 'bỏ qua ảnh trùng', không báo 'không hợp lệ'", /Đã bỏ qua ảnh trùng/.test(await p.locator("body").innerText()) && !/Không có ảnh hoặc PDF hợp lệ/.test(await p.locator("body").innerText()));
await imp(); await dlg.waitFor({ timeout: 20000 }); await dlg.getByRole("button", { name: "Vẫn thêm" }).click();
await p.waitForFunction(() => /\/doc\//.test(location.pathname), null, { timeout: 30000 });
chk("Vẫn thêm: mở tài liệu mới", true);
chk("không dùng hộp thoại gốc, 0 pageerror", native.length === 0 && errs.length === 0);
await b.close(); console.log(bad ? `LỖI: ${bad}` : "TẤT CẢ ĐẠT"); process.exit(bad ? 1 : 0);

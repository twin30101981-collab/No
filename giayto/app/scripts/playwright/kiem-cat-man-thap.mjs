// TD-27/P18: màn Cắt trên màn thấp 360×640 — kéo góc trên-trái rồi bấm Áp dụng; quad phải đổi và lưu.
// Chạy: npx vite dev --host 127.0.0.1 --port 8081; IMG=<ảnh chụp> node kiem-cat-man-thap.mjs http://127.0.0.1:8081
import { chromium } from "playwright-core";
const [BASE] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoOcr: false })); } catch {} });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(BASE + "/", { waitUntil: "networkidle" });
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
await fc.setFiles([process.env.IMG]); await p.waitForURL(/\/doc\//); await p.waitForTimeout(2500);
const quad = () => p.evaluate(async () => { const id = location.pathname.split("/").pop(); const { getDocs } = await import("/src/lib/db.ts"); return getDocs().find((x) => x.id === id)?.pages[0]?.edit.quad ?? null; });
const q0 = await quad();
await p.getByText("Cắt", { exact: true }).first().click(); await p.waitForTimeout(1500);
const apply = p.getByRole("button", { name: "Áp dụng" });
const vis = await apply.evaluate((e) => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
const h = await p.locator(".crop-handle").first().boundingBox();
await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await p.mouse.down();
await p.mouse.move(h.x + h.width / 2 + 25, h.y + h.height / 2 + 25, { steps: 6 }); await p.mouse.up();
await apply.click();
let q1 = null; for (let t = 0; t < 40 && !q1; t++) { await p.waitForTimeout(500); q1 = await quad(); }
const st = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 120));
console.log("màn sau Áp dụng:", st);
const moved = !!q1 && JSON.stringify(q1) !== JSON.stringify(q0);
console.log(`Áp dụng trong màn hình=${vis}; quad trước=${JSON.stringify(q0)?.slice(0, 40)} sau=${JSON.stringify(q1)?.slice(0, 40)}; lỗi JS=${errs.length}`);
const ok = vis && moved && !errs.length;
console.log(ok ? "TỔNG: ĐẠT" : "TỔNG: LỖI"); await b.close(); process.exit(ok ? 0 : 1);

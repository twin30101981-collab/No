// TF-01: nút Chia sẻ / Gửi tới không được im lặng khi navigator.share bị từ chối (hết quyền chia sẻ sau khi dựng PDF lâu).
// Giả lập navigator.share/canShare theo kịch bản (Chromium Linux không có bảng chia sẻ thật). Mô hình lỗi thật: sau khi dựng PDF lâu,
// trình duyệt ném NotAllowedError ở lần gọi share đầu; lần chạm kế tiếp (có quyền mới) thì chia sẻ được.
// Chuẩn bị: npx vite dev --port 8084 --host 127.0.0.1
// Chạy:     LANG=C.UTF-8 node scripts/playwright/kiem-chia-se.mjs http://127.0.0.1:8084   (mã cũ P19: ca "needs-tap/failed/unsupported" phải LỖI)
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://127.0.0.1:8084";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0; const errs = [];
const chk = (n, ok, extra = "") => { console.log(`${ok ? "ĐẠT" : "LỖI"}  ${n}${extra ? "  " + extra : ""}`); if (!ok) bad++; };

// mode: 'expire' (lần 1 NotAllowedError, lần 2 ok) | 'abort' | 'typeerr' | 'cannot' (canShare=false) | 'none' (không có API) | 'ok'
async function run(mode, act) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await ctx.addInitScript((mode) => {
    try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {}
    window.__share = { calls: [], files: [] };
    if (mode === "none") { try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch {} return; }
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => mode !== "cannot" });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => {
      window.__share.calls.push(mode); window.__share.files.push((d.files ?? []).map((f) => `${f.name}|${f.type}|${f.size}`));
      if (mode === "abort") throw new DOMException("cancelled", "AbortError");
      if (mode === "typeerr") throw new TypeError("boom");
      if (mode === "expire" && window.__share.calls.length === 1) throw new DOMException("Must be handling a user gesture", "NotAllowedError");
    } });
  }, mode);
  const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(`${mode}: ${e.message.slice(0, 120)}`));
  await p.goto(BASE + "/me", { waitUntil: "networkidle" });
  // gieo 1 tài liệu 1 trang có ảnh thật
  await p.evaluate(async () => {
    const blob = await new Promise((res) => { const c = document.createElement("canvas"); c.width = 300; c.height = 400; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 300, 400); g.fillStyle = "#222"; g.font = "30px sans-serif"; g.fillText("Thu nghiem", 20, 80); c.toBlob(res, "image/jpeg", 0.9); });
    const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = Date.now();
    await new Promise((res, rej) => { const t = db.transaction("docs", "readwrite"); const s = t.objectStore("docs"); s.clear(); s.put({ id: "d1", name: "Hợp đồng thử", folder: "Chung", kind: "Tài liệu", createdAt: now, updatedAt: now, pages: [{ id: "p1", orig: "", src: "=", origB: blob, origFp: "o", edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } }] }); t.oncomplete = res; t.onerror = () => rej(t.error); });
    db.close();
  });
  await p.goto(BASE + "/doc/d1", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await p.locator("nav").getByRole("button", { name: "Tùy chọn" }).click(); await p.waitForTimeout(600);
  const downloads = []; p.on("download", (d) => downloads.push(d.suggestedFilename()));
  await act(p);
  await p.waitForTimeout(2500);
  const toasts = await p.locator("[data-sonner-toast]").allInnerTexts();
  const share = await p.evaluate(() => window.__share);
  return { p, ctx, downloads, toasts: toasts.map((t) => t.replace(/\n/g, " ")), share };
}
const clickShare = (p) => p.getByRole("button", { name: /Chia sẻ PDF/ }).click();

// 1) hết quyền chia sẻ (NotAllowedError) → hiện thẻ chạm lần 2; chạm → chia sẻ đúng tệp PDF; không tải về
{ const r = await run("expire", clickShare);
  chk("NotAllowedError: KHÔNG im lặng — hiện thẻ “Tệp đã sẵn sàng”", r.toasts.some((t) => /Tệp đã sẵn sàng/.test(t) && /Chia sẻ/.test(t)), r.toasts.join(" ‖ ").slice(0, 140));
  chk("NotAllowedError: chưa tự tải về (chờ người dùng chạm)", r.downloads.length === 0, JSON.stringify(r.downloads));
  if (process.env.SHOT) await r.p.screenshot({ path: process.env.SHOT });
  const bx = await r.p.locator("[data-sonner-toast]").getByRole("button", { name: "Chia sẻ" }).boundingBox().catch(() => null);
  chk("nút “Chia sẻ” trên thẻ đủ vùng chạm (cao ≥ 40 px)", !!bx && bx.height >= 40, bx ? `${Math.round(bx.width)}×${Math.round(bx.height)}` : "không thấy");
  await r.p.locator("[data-sonner-toast]").getByRole("button", { name: "Chia sẻ" }).click().catch(() => {});
  await r.p.waitForTimeout(1500);
  const s = await r.p.evaluate(() => window.__share);
  chk("chạm “Chia sẻ” → gọi share lần 2 với đúng tệp PDF", s.calls.length === 2 && /\.pdf\|application\/pdf\|\d+/.test(s.files[1]?.[0] ?? ""), JSON.stringify(s.files));
  chk("sau khi chia sẻ được: không tải về thêm", (await r.p.evaluate(() => 0)) === 0 && r.downloads.length === 0);
  await r.ctx.close(); }

// 1b) hết quyền → chạm “Lưu về máy” → tải về
{ const r = await run("expire", clickShare);
  await r.p.locator("[data-sonner-toast]").getByRole("button", { name: "Lưu về máy" }).click().catch(() => {}); await r.p.waitForTimeout(1500);
  chk("thẻ: “Lưu về máy” tải được PDF", r.downloads.length === 1 && /\.pdf$/.test(r.downloads[0] ?? ""), JSON.stringify(r.downloads)); await r.ctx.close(); }

// 2) người dùng đóng bảng chia sẻ (AbortError) → không tải, không báo lỗi
{ const r = await run("abort", clickShare);
  chk("AbortError: coi là huỷ — không tải về", r.downloads.length === 0);
  chk("AbortError: không báo lỗi", !r.toasts.some((t) => /Không|lỗi/i.test(t)), r.toasts.join(" ‖ ")); await r.ctx.close(); }

// 3) lỗi khác (TypeError) → tải về + báo
{ const r = await run("typeerr", clickShare);
  chk("lỗi khác: tự tải PDF về", r.downloads.length === 1 && /\.pdf$/.test(r.downloads[0] ?? ""), JSON.stringify(r.downloads));
  chk("lỗi khác: báo rõ đã lưu về máy", r.toasts.some((t) => /Không mở được bảng chia sẻ/.test(t) && /đã lưu/i.test(t)), r.toasts.join(" ‖ ").slice(0, 140)); await r.ctx.close(); }

// 4) máy không chấp nhận loại tệp (canShare=false) → tải về + báo (TF-02)
{ const r = await run("cannot", clickShare);
  chk("canShare=false: tải về", r.downloads.length === 1);
  chk("canShare=false: báo “không chia sẻ được loại tệp này”", r.toasts.some((t) => /không chia sẻ được loại tệp/.test(t)), r.toasts.join(" ‖ ").slice(0, 140)); await r.ctx.close(); }

// 5) máy tính không có bảng chia sẻ → tải về + báo “Đã lưu”
{ const r = await run("none", clickShare);
  chk("không có API chia sẻ: tải về", r.downloads.length === 1);
  chk("không có API chia sẻ: báo “Đã lưu”", r.toasts.some((t) => /Đã lưu/.test(t)), r.toasts.join(" ‖ ").slice(0, 100)); await r.ctx.close(); }

// 6) bình thường: chia sẻ được → không tải, không báo thừa
{ const r = await run("ok", clickShare);
  chk("share ok: gọi 1 lần với PDF", r.share.calls.length === 1 && /\.pdf\|application\/pdf/.test(r.share.files[0]?.[0] ?? ""), JSON.stringify(r.share.files));
  chk("share ok: không tải về", r.downloads.length === 0); await r.ctx.close(); }

// 7) “Khác…” (sendFile) cũng không im lặng khi hết quyền
{ const r = await run("expire", (p) => p.getByRole("button", { name: "Khác…" }).click());
  chk("Gửi tới → Khác…: hết quyền → hiện thẻ chạm lần 2", r.toasts.some((t) => /Tệp đã sẵn sàng/.test(t)), r.toasts.join(" ‖ ").slice(0, 120));
  chk("Gửi tới → Khác…: chưa tải về", r.downloads.length === 0); await r.ctx.close(); }

chk("không có pageerror", errs.length === 0, errs.slice(0, 2).join(" | "));
await b.close(); console.log(bad === 0 ? "TẤT CẢ ĐẠT" : `${bad} ca lỗi`); process.exit(bad === 0 ? 0 : 1);

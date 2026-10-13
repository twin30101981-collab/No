// TF-02: "Gửi tới" theo nền tảng. (1) Email có nhập người nhận TRÊN ĐIỆN THOẠI phải đính kèm thật qua bảng chia sẻ (trước đây tải về rồi
// mở mailto không đính kèm) và chép địa chỉ người nhận vào bộ nhớ tạm; (2) Zalo trên MÁY TÍNH: tải tệp + hướng dẫn kéo thả + nút mở Zalo web.
// navigator.share/clipboard được GIẢ LẬP (Chromium Linux không có bảng chia sẻ thật).
// Chuẩn bị: npx vite dev --port 8085 --host 127.0.0.1
// Chạy:     LANG=C.UTF-8 node scripts/playwright/kiem-gui-toi.mjs http://127.0.0.1:8085   (mã cũ: các ca (1),(2) phải LỖI)
import { chromium } from "playwright-core";
const BASE = process.argv[2] || "http://127.0.0.1:8085";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0; const errs = [];
const chk = (n, ok, extra = "") => { console.log(`${ok ? "ĐẠT" : "LỖI"}  ${n}${extra ? "  " + extra : ""}`); if (!ok) bad++; };

async function run(device, act) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await ctx.addInitScript((device) => {
    try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {}
    window.__share = { calls: [], files: [], text: [] }; window.__clip = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { window.__clip.push(t); } } });
    if (device === "pc") { try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch {} return; }
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => { window.__share.calls.push(1); window.__share.files.push((d.files ?? []).map((f) => f.name)); window.__share.text.push(d.text ?? ""); } });
  }, device);
  await ctx.route("https://chat.zalo.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>zalo</title>" })); // sandbox không có mạng ra ngoài
  const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(`${device}: ${e.message.slice(0, 120)}`));
  await p.goto(BASE + "/me", { waitUntil: "networkidle" });
  await p.evaluate(async () => {
    const blob = await new Promise((res) => { const c = document.createElement("canvas"); c.width = 300; c.height = 400; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 300, 400); g.fillStyle = "#222"; g.font = "30px sans-serif"; g.fillText("Thu nghiem", 20, 80); c.toBlob(res, "image/jpeg", 0.9); });
    const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); const now = Date.now();
    await new Promise((res, rej) => { const t = db.transaction("docs", "readwrite"); const s = t.objectStore("docs"); s.clear(); s.put({ id: "d1", name: "Hợp đồng thử", folder: "Chung", kind: "Tài liệu", createdAt: now, updatedAt: now, pages: [{ id: "p1", orig: "", src: "=", origB: blob, origFp: "o", edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } }] }); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close();
  });
  await p.goto(BASE + "/doc/d1", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await p.locator("nav").getByRole("button", { name: "Tùy chọn" }).click(); await p.waitForTimeout(600);
  const downloads = []; p.on("download", (d) => downloads.push(d.suggestedFilename()));
  const popups = []; ctx.on("page", (pg) => popups.push(pg));
  await act(p);
  await p.waitForTimeout(2500);
  const toasts = (await p.locator("[data-sonner-toast]").allInnerTexts()).map((t) => t.replace(/\n/g, " "));
  const st = await p.evaluate(() => ({ share: window.__share, clip: window.__clip }));
  return { p, ctx, downloads, toasts, popups, ...st };
}

// (1) Email + người nhận, điện thoại
{ const r = await run("phone", async (p) => { await p.getByPlaceholder("Email người nhận (tùy chọn)").fill("nguoi.nhan@example.com"); await p.getByRole("button", { name: "Email", exact: true }).click(); });
  chk("Email có người nhận (điện thoại): mở bảng chia sẻ với tệp PDF đính kèm", r.share.calls.length === 1 && /\.pdf$/.test(r.share.files[0]?.[0] ?? ""), JSON.stringify(r.share.files));
  chk("Email có người nhận (điện thoại): KHÔNG tải về rồi mở thư rỗng", r.downloads.length === 0, JSON.stringify(r.downloads));
  chk("Email: địa chỉ người nhận được chép vào bộ nhớ tạm", r.clip.includes("nguoi.nhan@example.com"), JSON.stringify(r.clip));
  chk("Email: nhắc dán địa chỉ vào ô Người nhận", r.toasts.some((t) => /nguoi\.nhan@example\.com/.test(t) && /dán/i.test(t)), r.toasts.join(" ‖ ").slice(0, 140));
  await r.ctx.close(); }
// (1b) Email KHÔNG nhập người nhận, điện thoại: vẫn chia sẻ bình thường, không chép gì
{ const r = await run("phone", (p) => p.getByRole("button", { name: "Email", exact: true }).click());
  chk("Email không người nhận (điện thoại): chia sẻ 1 lần, không chép bộ nhớ tạm", r.share.calls.length === 1 && r.clip.length === 0 && r.downloads.length === 0); await r.ctx.close(); }
// (2) Zalo trên máy tính
{ const r = await run("pc", (p) => p.getByRole("button", { name: "Zalo", exact: true }).click());
  chk("Zalo (máy tính): tải PDF về", r.downloads.length === 1);
  chk("Zalo (máy tính): có hướng dẫn kéo tệp vào khung chat", r.toasts.some((t) => /kéo/i.test(t) && /Zalo/.test(t)), r.toasts.join(" ‖ ").slice(0, 160));
  const open = r.p.locator("[data-sonner-toast]").getByRole("button", { name: "Mở Zalo" });
  chk("Zalo (máy tính): có nút “Mở Zalo”", (await open.count()) === 1);
  const [pop] = await Promise.all([r.ctx.waitForEvent("page", { timeout: 8000 }).catch(() => null), open.click().catch(() => {})]);
  chk("Zalo (máy tính): “Mở Zalo” mở chat.zalo.me ở tab mới", !!pop && /^https:\/\/chat\.zalo\.me/.test(pop.url()), pop ? pop.url() : "không mở"); await r.ctx.close(); }
// (3) Zalo điện thoại: bảng chia sẻ như cũ
{ const r = await run("phone", (p) => p.getByRole("button", { name: "Zalo", exact: true }).click());
  chk("Zalo (điện thoại): chia sẻ tệp qua bảng chia sẻ, không tải về", r.share.calls.length === 1 && r.downloads.length === 0); await r.ctx.close(); }
// (4) Email trên máy tính (không có bảng chia sẻ): tải về + thông báo đính kèm
{ const r = await run("pc", async (p) => { await p.getByPlaceholder("Email người nhận (tùy chọn)").fill("nguoi.nhan@example.com"); await p.getByRole("button", { name: "Email", exact: true }).click(); });
  chk("Email (máy tính): tải PDF về + báo đính kèm vào thư", r.downloads.length === 1 && r.toasts.some((t) => /đính kèm/i.test(t)), r.toasts.join(" ‖ ").slice(0, 120)); await r.ctx.close(); }
chk("không có pageerror", errs.length === 0, errs.slice(0, 2).join(" | "));
await b.close(); console.log(bad === 0 ? "TẤT CẢ ĐẠT" : `${bad} ca lỗi`); process.exit(bad === 0 ? 0 : 1);

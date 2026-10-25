// Quy trình chụp (lỗi máy thật 13/10: chụp xong không chụp tiếp được, bấm Đóng không thoát).
// Camera giả phát một cảnh (y4m); CPU giả lập chậm để giống điện thoại. Kiểm: chụp nhiều lần liên tiếp không mất trang,
// màn cắt KHÔNG tự bật giữa chừng, "Kiểm mép" mở màn cắt theo ý người dùng, chụp lại/xoá trang, toast không che nút Đóng,
// Đóng khi còn trang → hỏi, Xong → mở tài liệu đủ trang; 0 pageerror.
// Chuẩn bị y4m: python3 -I scripts/playwright/tao-camera-gia.py anh-chup-man-hinh.jpg canh.y4m 36 384 1044 1584 (khung ngắm trong ảnh 1080×2400 người dùng gửi 13/10).
// Cảnh máy dò chắc mép (không có dấu Kiểm mép): thêm UNSURE=0.
// Chạy: npx vite dev --port 8081 --host 127.0.0.1; Y4M=/đường/dẫn/canh.y4m RATE=6 OUT=./out node scripts/playwright/kiem-quy-trinh-chup.mjs http://127.0.0.1:8081
import { chromium } from "playwright-core";
const BASE = process.argv[2], Y4M = process.env.Y4M, RATE = +(process.env.RATE || 6), OUT = process.env.OUT || ".";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${Y4M}`] });
let bad = 0; const chk = (n, ok, extra = "") => { console.log(`${ok ? "ĐẠT" : "LỖI"}  ${n}${extra ? "  " + extra : ""}`); if (!ok) bad++; };

async function session(fn) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, permissions: ["camera"] });
  await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoCapture: false })); } catch {} });
  const p = await ctx.newPage(); const pe = []; p.on("pageerror", (e) => pe.push(e.message.slice(0, 160)));
  await p.goto(BASE + "/scan", { waitUntil: "networkidle" }); await p.waitForTimeout(4000);
  const cdp = await ctx.newCDPSession(p); if (RATE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  const S = () => p.evaluate(() => { const st = document.querySelector('[aria-label="Các trang đã chụp"]');
    return { pages: st ? st.querySelectorAll('button[aria-label^="Chụp lại trang"]').length : 0, jobs: st ? st.querySelectorAll("[data-job-state]").length : 0,
      unsure: st ? st.querySelectorAll('button[aria-label^="Kiểm mép trang"]').length : 0, crop: !!document.querySelector('[data-testid="crop-area"]'),
      dialog: !!document.querySelector('[role="alertdialog"]'), path: location.pathname }; });
  // chạm thật (CDP) vào giữa phần tử — không chờ "ổn định" như locator.tap
  const touch = async (sel) => { const bx = await p.locator(sel).first().boundingBox(); if (!bx) return false;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); return true; };
  const until = async (cond, ms = 40000) => { const t = Date.now(); let s; while (Date.now() - t < ms) { s = await S(); if (cond(s)) return { ok: true, s, ms: Date.now() - t }; if (s.crop) return { ok: false, s, ms: Date.now() - t }; await p.waitForTimeout(250); } return { ok: false, s, ms }; };
  await fn({ p, S, touch, until, cdp });
  chk("không có pageerror", pe.length === 0, pe.slice(0, 2).join(" | "));
  await ctx.close();
}

console.log(`camera giả: ${Y4M} · CPU chậm ${RATE}×`);
await session(async ({ p, S, touch, until }) => {
  // 1–3: chụp liên tiếp, lần sau bấm khi lần trước còn đang xử lý
  await touch('button[aria-label="Chụp"]'); await p.waitForTimeout(1200);
  await touch('button[aria-label="Chụp"]'); await p.waitForTimeout(1200);
  await touch('button[aria-label="Chụp"]');
  const r = await until((s) => s.pages === 3 && s.jobs === 0, 90000);
  chk("chụp 3 lần liên tiếp → đủ 3 trang, màn cắt không tự bật", r.ok, JSON.stringify(r.s) + ` (${r.ms} ms)`);
  const s0 = await S(); if (process.env.UNSURE !== "0") chk("trang máy chưa chắc mép có dấu “Kiểm mép” (không chặn màn hình)", s0.unsure >= 1, `unsure=${s0.unsure}`); else console.log(`(cảnh máy chắc mép: unsure=${s0.unsure})`);
  await p.screenshot({ path: `${OUT}/qtc-3trang.jpg`, type: "jpeg", quality: 50 });
  // 4: Kiểm mép → màn cắt mở theo ý người dùng → Áp dụng → vẫn 3 trang, bỏ dấu
  if (s0.unsure) {
    await touch('button[aria-label^="Kiểm mép trang"]');
    const o = await until((s) => s.crop, 20000).catch(() => ({ ok: false })); const opened = (await S()).crop;
    chk("chạm “Kiểm mép” mở màn cắt", opened);
    if (opened) { await p.screenshot({ path: `${OUT}/qtc-kiem-mep.jpg`, type: "jpeg", quality: 50 });
      await touch('button:has-text("Áp dụng")'); await p.waitForTimeout(500);
      const a = await until((s) => !s.crop && s.pages === 3 && s.unsure === s0.unsure - 1, 40000);
      chk("Áp dụng khung → vẫn 3 trang, bớt 1 dấu “Kiểm mép”", a.ok, JSON.stringify(a.s)); }
    void o;
  }
  // 5: chụp lại trang 2 → vẫn 3 trang
  await touch('button[aria-label="Chụp lại trang 2"]'); await p.waitForTimeout(600);
  await touch('button[aria-label="Chụp"]');
  const rt = await until((s) => s.pages === 3 && s.jobs === 0, 60000); chk("chụp lại trang 2 → vẫn 3 trang", rt.ok, JSON.stringify(rt.s));
  // 6: xoá trang 3
  await touch('button[aria-label="Xoá trang 3"]'); const del = await until((s) => s.pages === 2, 15000); chk("xoá trang 3 → còn 2", del.ok, JSON.stringify(del.s));
  // 7: toast không che nút Đóng
  await touch('button[aria-label="Chụp liên tục"]'); await p.waitForTimeout(700);
  const hit = await p.evaluate(() => { const r = document.querySelector('button[aria-label="Đóng"]').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { toast: !!document.querySelector("[data-sonner-toast]"), onClose: !e.closest("[data-sonner-toast]") && e.closest("button")?.getAttribute("aria-label") === "Đóng" }; });
  chk("đang có thông báo vẫn chạm được nút Đóng", hit.toast && hit.onClose, JSON.stringify(hit));
  await touch('button[aria-label="Chụp liên tục"]'); await p.waitForTimeout(400);
  // 8: chụp rồi bấm Đóng ngay trong lúc đang xử lý → hộp hỏi; Huỷ giữ nguyên; Bỏ trang → về Trang chủ
  await touch('button[aria-label="Chụp"]'); await p.waitForTimeout(2500);
  await touch('button[aria-label="Đóng"]');
  const d = await until((s) => s.dialog, 20000); chk("Đóng khi còn trang → hỏi trước khi bỏ", d.ok, JSON.stringify(d.s));
  if (d.ok) { await p.getByRole("alertdialog").getByRole("button", { name: "Huỷ" }).click(); const k = await until((s) => !s.dialog && s.path === "/scan" && s.pages >= 2, 20000); chk("Huỷ → ở lại, giữ trang", k.ok, JSON.stringify(k.s)); }
  await touch('button[aria-label="Đóng"]'); await until((s) => s.dialog, 20000);
  await p.getByRole("alertdialog").getByRole("button", { name: "Bỏ trang" }).click().catch(() => {});
  const out = await until((s) => s.path === "/", 20000); chk("Bỏ trang → về Trang chủ", out.ok, JSON.stringify(out.s));
});
await session(async ({ p, touch, until }) => {
  // 9: chụp 2 trang rồi Xong → mở tài liệu 2 trang
  await touch('button[aria-label="Chụp"]'); await p.waitForTimeout(1500); await touch('button[aria-label="Chụp"]');
  const r = await until((s) => s.pages === 2 && s.jobs === 0, 90000); chk("chụp 2 trang", r.ok, JSON.stringify(r.s));
  await touch('button:has-text("Xong")'); await p.waitForTimeout(2500);
  const fb = await p.evaluate(() => ({ path: location.pathname, saving: /Đang lưu/.test(document.body.innerText) }));
  chk("bấm Xong → thấy ngay “Đang lưu…” (không im lặng)", fb.saving || fb.path.startsWith("/doc"), JSON.stringify(fb));
  const t0 = Date.now(); const ok = await p.waitForURL(/\/doc\//, { timeout: 180000 }).then(() => true, () => false);
  console.log(`      (lưu xong sau ~${Math.round((Date.now() - t0) / 1000) + 2} s)`); await p.waitForTimeout(1500);
  const txt = ok ? await p.locator("body").innerText() : ""; chk("Xong → mở tài liệu 2 trang", ok && /Trang 1\/2/.test(txt), txt.replace(/\s+/g, " ").slice(0, 60));
});
await b.close(); console.log(bad ? `LỖI: ${bad}` : "TẤT CẢ ĐẠT"); process.exit(bad ? 1 : 0);

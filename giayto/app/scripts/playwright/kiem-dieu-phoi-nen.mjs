// CS-02: bộ điều phối nền toàn app. (A) việc "finish" của trang ĐÃ LƯU được hoàn thiện khi KHÔNG ở màn Chụp (ghi thẳng vào tài liệu);
// (B) tải lại giữa chừng vẫn chạy tiếp (resume ở __root); (C) rời màn Chụp giữa chừng không huỷ việc nền.
// FLAG=off: tắt cờ globalPipeline = hành vi CŨ (bộ xử lý chỉ trong màn Chụp, huỷ khi rời màn) — dùng để tái hiện lỗi.
// Chuẩn bị: npx vite dev --port 8087 --host 127.0.0.1 ; camera: tao-camera-gia.py → canh.y4m
// Chạy:     Y4M=canh.y4m [FLAG=off] LANG=C.UTF-8 node scripts/playwright/kiem-dieu-phoi-nen.mjs http://127.0.0.1:8087
import { chromium } from "playwright-core";
const BASE = process.argv[2] || "http://127.0.0.1:8087", Y4M = process.env.Y4M, FLAG = process.env.FLAG === "off" ? "off" : "on";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", ...(Y4M ? [`--use-file-for-fake-video-capture=${Y4M}`] : [])] });
let bad = 0; const errs = [];
const chk = (n, ok, extra = "") => { console.log(`${ok ? (FLAG === "off" ? "TÁI HIỆN LỖI CŨ" : "ĐẠT") : "LỖI"}  ${n}${extra ? "  " + extra : ""}`); if (!ok) bad++; };
console.log(`cờ globalPipeline = ${FLAG}`);

async function newCtx() {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, permissions: ["camera"] });
  await ctx.addInitScript((flag) => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoCapture: false, ...(flag === "off" ? { globalPipeline: false } : {}) })); } catch {} }, FLAG);
  const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message.slice(0, 140)));
  return { ctx, p };
}
// 3 tài liệu... đúng 1 tài liệu 3 trang: bản nháp nhỏ (300×400) + ảnh gốc lớn (1800×2400)
const seed = (p) => p.evaluate(async () => {
  const img = (w, h, t) => new Promise((res) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, w, h); g.fillStyle = "#222"; g.font = `${w / 12}px sans-serif`; for (let i = 0; i < 12; i++) g.fillText(`${t} dòng ${i}`, w / 20, (i + 1) * h / 14); c.toDataURL; c.toBlob(res, "image/jpeg", 0.9); });
  const du = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); const now = Date.now(); const pages = []; const origs = [];
  for (let i = 0; i < 3; i++) { const big = await img(1800, 2400, "trang" + i), draft = await img(300, 400, "nhap" + i); origs.push(await du(big));
    pages.push({ id: "pg" + i, orig: "", src: "", origB: big, srcB: draft, origFp: "o" + i, srcFp: "s" + i, edit: { rotation: 0, filter: "auto", brightness: 0, contrast: 0 } }); }
  await new Promise((res, rej) => { const t = db.transaction("docs", "readwrite"); const s = t.objectStore("docs"); s.clear(); s.put({ id: "dx", name: "Tài liệu chờ hoàn thiện", folder: "Chung", kind: "Tài liệu", createdAt: now, updatedAt: now, pages }); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close();
  const j = indexedDB.deleteDatabase("ghi-nhanh-jobs"); await new Promise((r) => { j.onsuccess = r; j.onerror = r; j.onblocked = r; });
  return origs;
});
const longSides = (p) => p.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const d = await new Promise((res, rej) => { const q = db.transaction("docs").objectStore("docs").get("dx"); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); db.close();
  const out = []; for (const pg of d.pages) { const blob = pg.srcB ?? (pg.src === "=" ? pg.origB : null); if (!blob) { out.push(0); continue; } const bm = await createImageBitmap(blob); out.push(Math.max(bm.width, bm.height)); } return out;
});
const waitFull = async (p, ms) => { const t = Date.now(); let s = []; while (Date.now() - t < ms) { s = await longSides(p); if (s.length === 3 && s.every((x) => x > 1200)) return { ok: true, s, ms: Date.now() - t }; await p.waitForTimeout(500); } return { ok: false, s, ms: Date.now() - t }; };
const enqueue = (p, origs) => p.evaluate(async (origs) => {
  const { bgQueue } = await import("/src/lib/bg-queue.ts");
  for (let i = 0; i < 3; i++) await bgQueue.enqueue("pg" + i, "finish", { orig: origs[i], edit: { rotation: 0, filter: "auto", brightness: 0, contrast: 0 }, targetLong: 2400 });
  return bgQueue.size;
}, origs);

// A) đang ở màn /documents (KHÔNG phải màn Chụp) → việc finish vẫn được xử lý và ghi vào tài liệu
{ const { ctx, p } = await newCtx(); await p.goto(BASE + "/documents", { waitUntil: "networkidle" });
  const origs = await seed(p); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  const before = await longSides(p); await enqueue(p, origs);
  const r = await waitFull(p, 60000);
  chk("A: ngoài màn Chụp, trang đã lưu được hoàn thiện (cạnh dài > 1200 px)", FLAG === "on" ? r.ok : !r.ok, `trước ${JSON.stringify(before)} → sau ${JSON.stringify(r.s)} (${r.ms} ms)`);
  if (FLAG === "off") { const q = await p.evaluate(async () => { const { bgQueue } = await import("/src/lib/bg-queue.ts"); return bgQueue.list().map((j) => j.state + ":" + (j.error ?? "").slice(0, 40)); });
    console.log("      (cờ tắt: việc nền kẹt, không ai xử lý) " + JSON.stringify(q.slice(0, 2))); }
  await ctx.close(); }

// B) tải lại giữa chừng: việc còn dở được chạy tiếp ở __root
if (FLAG === "on") { const { ctx, p } = await newCtx(); await p.goto(BASE + "/documents", { waitUntil: "networkidle" });
  const origs = await seed(p); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await enqueue(p, origs); await p.waitForTimeout(400);
  const mid = await longSides(p);
  await p.reload({ waitUntil: "networkidle" }); // việc đã ghi xuống kho nên còn dở sau khi tải lại
  const r = await waitFull(p, 120000);
  chk("B: tải lại giữa chừng → vẫn hoàn thiện đủ 3 trang", r.ok, `giữa chừng ${JSON.stringify(mid)} → ${JSON.stringify(r.s)} (${r.ms} ms)`);
  const left = await p.evaluate(async () => { const { bgQueue } = await import("/src/lib/bg-queue.ts"); return bgQueue.size; }); chk("B: hàng đợi cạn sau khi xong", left === 0, `size=${left}`);
  await ctx.close(); }

// C) rời màn Chụp giữa chừng (quay lại): việc nền không bị huỷ
if (Y4M) { const { ctx, p } = await newCtx(); await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.goto(BASE + "/scan", { waitUntil: "networkidle" }); await p.waitForTimeout(3500);
  const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const touch = async (sel) => { const bx = await p.locator(sel).first().boundingBox(); await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 }] }); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); };
  for (let i = 0; i < 3; i++) { await touch('button[aria-label="Chụp"]'); await p.waitForTimeout(350); }
  await p.waitForFunction(() => document.querySelectorAll('button[aria-label^="Chụp lại trang"]').length >= 1, null, { timeout: 90000 });
  await p.goBack(); // rời màn Chụp khi còn trang đang xử lý (chưa Xong)
  // kết quả bản đầy đủ của trang chưa lưu phải về kho của bộ điều phối (cờ bật) — cờ tắt: việc bị huỷ/không có người nhận
  let n = 0; const t0 = Date.now(); while (Date.now() - t0 < 60000 && n === 0) { n = await p.evaluate(async () => { const m = await import("/src/lib/pipeline/runner.ts"); return m.finishedStore.size(); }); if (!n) await p.waitForTimeout(500); }
  chk("C: rời màn Chụp giữa chừng → bản đầy đủ vẫn được dựng ở nền", FLAG === "on" ? n > 0 : n === 0, `bản đầy đủ nhận được: ${n} (sau ${Math.round((Date.now() - t0) / 1000)} s)`);
  await ctx.close(); }

chk("không có pageerror", errs.length === 0, errs.slice(0, 2).join(" | "));
await b.close(); console.log(bad === 0 ? "TẤT CẢ ĐẠT" : `${bad} ca lỗi`); process.exit(bad === 0 ? 0 : 1);

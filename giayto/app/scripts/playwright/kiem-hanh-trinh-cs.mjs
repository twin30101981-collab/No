// CS-00: đo GỐC cả hành trình "chụp N trang → Xong → thấy tài liệu → Xuất" (camera giả) + xác minh G-05 bằng chạy thật.
// Chỉ ĐO và QUAN SÁT — không có ngưỡng đạt/trượt (mục tiêu của đề án ghi để so); mã thoát 1 chỉ khi hành trình không hoàn tất
// hoặc có pageerror. Số đo ghi ra $OUT/cs00-<RATE>x.json để so trước/sau ở các hạng mục CS-02…CS-04.
// Chuẩn bị camera: python3 -I scripts/playwright/tao-camera-gia.py de-an-nang-cap-scan/kiem-chung/bo-anh-NB/goc/IMG_NB_01.jpg canh.y4m
// Chạy:  npx vite dev --port 8081 --host 127.0.0.1
//        Y4M=/đường/dẫn/canh.y4m RATE=1 N=10 OUT=./out node scripts/playwright/kiem-hanh-trinh-cs.mjs http://127.0.0.1:8081
// XONG_NOW=1: bấm Xong NGAY sau lần chụp cuối (ca người dùng thật, đúng TD-47); mặc định chờ khay rảnh rồi mới bấm Xong.
// TAP_GAP_MS=300: bấm chụp dồn dập mỗi 300 ms KHÔNG chờ trang vào khay (chụp liên tục thật); đếm số lần bấm bị bỏ qua.
// RATE = tốc độ CPU giả lập chậm (1 = máy khoẻ, 6 = điện thoại tầm thấp). Lưu ý: chạy vite dev, không phải bản build.
import { chromium } from "playwright-core";
import { writeFileSync, mkdirSync } from "node:fs";

const XONG_NOW = process.env.XONG_NOW === "1"; const GAP = +(process.env.TAP_GAP_MS || 0); const MODE = (XONG_NOW ? "xong-ngay" : "cho-rảnh") + (GAP ? `-dồn${GAP}` : "");
const BASE = process.argv[2] || "http://127.0.0.1:8081", Y4M = process.env.Y4M, RATE = +(process.env.RATE || 1), N = +(process.env.N || 10), OUT = process.env.OUT || ".";
if (!Y4M) { console.error("Thiếu Y4M=…"); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${Y4M}`] });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, permissions: ["camera"], acceptDownloads: true });
await ctx.addInitScript(() => {
  try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoCapture: false })); } catch {}
  // G-05: quan sát bản đồ số đo chất lượng (metricsCache) — nó có giá trị {blur, glare, skew, brightness, contrast}
  const R = { sets: [], gets: [] }; window.__cs = R; const maps = new WeakSet();
  const isM = (v) => v && typeof v === "object" && "blur" in v && "glare" in v && "skew" in v && "brightness" in v;
  const os = Map.prototype.set, og = Map.prototype.get;
  Map.prototype.set = function (k, v) { if (isM(v)) { maps.add(this); R.sets.push(String(k).slice(0, 70)); } return os.call(this, k, v); };
  Map.prototype.get = function (k) { const r = og.call(this, k); if (maps.has(this)) R.gets.push({ k: String(k).slice(0, 70), hit: r !== undefined }); return r; };
});
const p = await ctx.newPage(); const pageErrors = [];
p.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 160)));
await p.goto(BASE + "/scan", { waitUntil: "networkidle" }); await p.waitForTimeout(4000);
const cdp = await ctx.newCDPSession(p); await cdp.send("Performance.enable");
if (RATE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });

const R = { rate: RATE, n: N, capturedAt: new Date().toISOString(), tapToTray_ms: [], tapToReady_ms: [], notes: [] };
const heap = async () => (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? 0;
let peak = await heap(); const sampler = setInterval(async () => { try { peak = Math.max(peak, await heap()); } catch {} }, 400);
const S = () => p.evaluate(() => { const st = document.querySelector('[aria-label="Các trang đã chụp"]');
  return { pages: st ? st.querySelectorAll('button[aria-label^="Chụp lại trang"]').length : 0, jobs: st ? st.querySelectorAll("[data-job-state]").length : 0,
    crop: !!document.querySelector('[data-testid="crop-area"]'), shutterDisabled: !!document.querySelector('button[aria-label="Chụp"]')?.disabled, path: location.pathname }; });
const touch = async (sel) => { const bx = await p.locator(sel).first().boundingBox(); if (!bx) return false;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); return true; };
const until = async (cond, ms) => { const t = Date.now(); let s; while (Date.now() - t < ms) { s = await S(); if (cond(s)) return { ok: true, s, ms: Date.now() - t }; await p.waitForTimeout(100); } return { ok: false, s, ms: Date.now() - t }; };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(`Hành trình ${N} trang · CPU ${RATE}× · ${MODE} · camera ${Y4M}`);

// 1) chụp N lần, bấm lại NGAY khi nút cho phép — đo "bấm → trang vào khay" và "bấm → chụp tiếp được"
const tFirst = Date.now(); let broke = null;
if (GAP) {
  for (let i = 0; i < N; i++) { await touch('button[aria-label="Chụp"]'); await p.waitForTimeout(GAP); }
  const all = await until((s) => s.pages >= N || s.crop, 240000); R.pagesAfterRapidTaps = (await S()).pages; R.tapsLost = N - R.pagesAfterRapidTaps;
  if (!all.ok) { R.notes.push(`bấm ${N} lần dồn dập → chỉ có ${R.pagesAfterRapidTaps} trang`); }
}
for (let i = 0; i < (GAP ? 0 : N); i++) {
  const t = Date.now(); await touch('button[aria-label="Chụp"]');
  const tray = await until((s) => s.pages >= i + 1 || s.crop, 60000);
  if (!tray.ok || tray.s.crop) { broke = `lần ${i + 1}: ${JSON.stringify(tray.s)}`; break; }
  R.tapToTray_ms.push(Date.now() - t);
  const ready = await until((s) => !s.shutterDisabled, 30000); R.tapToReady_ms.push(Date.now() - t); void ready;
}
if (GAP && R.tapsLost) console.log(`Bấm dồn ${N} lần → ${R.pagesAfterRapidTaps} trang (mất ${R.tapsLost} lần bấm)`);
if (broke) { R.notes.push("hành trình đứt: " + broke); console.log("LỖI  " + broke); }
const tAllTapped = Date.now() - tFirst;
R.mode = MODE; R.captureLoop_ms = tAllTapped; R.pendingJobsAtLastTap = (await S()).jobs;
if (!XONG_NOW) { const bg = await until((s) => s.jobs === 0, 240000); R.untilTrayIdle_ms = Date.now() - tFirst; R.trayIdleReached = bg.ok; }
const sceneUnsure = await p.evaluate(() => document.querySelectorAll('button[aria-label^="Kiểm mép trang"]').length); R.unsureBadges = sceneUnsure;
await p.screenshot({ path: `${OUT}/cs00-${RATE}x-${MODE}-khay.jpg`, type: "jpeg", quality: 50 });

// 2) Xong → thấy tài liệu
const tX = Date.now(); await touch('button:has-text("Xong")');
const arrived = await p.waitForURL(/\/doc\//, { timeout: 300000 }).then(() => true, () => false);
R.tapDone_to_docVisible_ms = Date.now() - tX; R.docOpened = arrived;
console.log(`Xong → tài liệu: ${R.tapDone_to_docVisible_ms} ms (${arrived ? "ok" : "KHÔNG mở được"})`);

// 3) màn Tài liệu: nhãn "Đang xử lý…" (G-03) và trạng thái trang sau 12 s
let sawProcessing = false; const tDoc = Date.now();
while (Date.now() - tDoc < 12000) { if (await p.evaluate(() => /Đang xử lý…/.test(document.body.innerText))) { sawProcessing = true; break; } await p.waitForTimeout(200); }
R.docPageShowsProcessingLabel = sawProcessing;
const info = await p.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const docs = await new Promise((res, rej) => { const q = db.transaction("docs").objectStore("docs").getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); db.close();
  const d = docs.sort((a, b) => b.updatedAt - a.updatedAt)[0]; const f = {};
  for (const pg of d?.pages ?? []) f[pg.edit?.filter] = (f[pg.edit?.filter] ?? 0) + 1;
  return { pages: d?.pages?.length ?? 0, filters: f, withText: (d?.pages ?? []).filter((x) => (x.text ?? "").trim()).length, name: d?.name, cs: window.__cs, def: JSON.parse(localStorage.getItem("ghi-nhanh-settings") || "{}").defaultFilter ?? null };
});
const cs = info.cs; const lookups = cs.gets.length, hits = cs.gets.filter((g) => g.hit).length;
R.doc = { pages: info.pages, filters: info.filters, pagesWithOcrText_at12s: info.withText, name: info.name };
R.g05 = { metricsStored: cs.sets.length, metricsStoredKeysSample: cs.sets.slice(0, 2), lookupsAfterSave: lookups, lookupHits: hits, lookupKeysSample: cs.gets.slice(0, 2).map((g) => g.k) };
console.log(`G-05: số đo lưu ${R.g05.metricsStored} · tra cứu ${lookups} · trúng ${hits} · bộ lọc các trang: ${JSON.stringify(info.filters)}`);

// 4) Xuất 1 chạm
const tE = Date.now();
const dl = await Promise.all([p.waitForEvent("download", { timeout: 240000 }).then(() => true, () => false), touch('nav button:has-text("Xuất")').then(() => 0)]);
R.export_ms = Date.now() - tE; R.exportDownloaded = dl[0];
console.log(`Xuất: ${R.export_ms} ms (${dl[0] ? "đã tải PDF" : "KHÔNG tải được"})`);
clearInterval(sampler); peak = Math.max(peak, await heap()); R.jsHeapPeak_MB = Math.round(peak / 1048576); R.jsHeapEnd_MB = Math.round((await heap()) / 1048576);
R.pageErrors = pageErrors;
R.summary = { tapToTray_median_ms: med(R.tapToTray_ms), tapToReady_median_ms: med(R.tapToReady_ms) };
await b.close();
writeFileSync(`${OUT}/cs00-${RATE}x-${MODE}.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify({ ...R.summary, captureLoop_ms: R.captureLoop_ms, pendingJobsAtLastTap: R.pendingJobsAtLastTap, untilTrayIdle_ms: R.untilTrayIdle_ms, xong_ms: R.tapDone_to_docVisible_ms, export_ms: R.export_ms, heapPeakMB: R.jsHeapPeak_MB, unsureBadges: R.unsureBadges, docProcessingLabel: R.docPageShowsProcessingLabel }));
const fail = !!broke || !arrived || pageErrors.length > 0;
console.log(fail ? `KHÔNG HOÀN TẤT / pageerror: ${pageErrors.slice(0, 2).join(" | ")}` : "HÀNH TRÌNH HOÀN TẤT (số đo ở " + `${OUT}/cs00-${RATE}x-${MODE}.json)`);
process.exit(fail ? 1 : 0);

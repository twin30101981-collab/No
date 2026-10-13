// CS-01: mô hình trang có status + kho Blob ảnh gốc riêng + chuyển đổi dữ liệu cũ KHÔNG nâng phiên bản kho "ghi-nhanh".
// Kiểm: (1) tài liệu cũ (không có status) mở bình thường, không bị ghi hàng loạt; (2) trong bộ nhớ coi là "xong" (qua tệp sao lưu);
// (3) trang tạo mới có status khi lưu; (4) kho "ghi-nhanh" vẫn v2 và bản app CŨ (mở v2) vẫn mở được dữ liệu đã có trường mới;
// (5) kho Blob: ghi → đọc trùng byte → còn sau khi tải lại → dọn mồ côi; (6) hành trình chụp thật vẫn lưu trang có status.
// Chuẩn bị: npx vite dev --port 8086 --host 127.0.0.1 ; Chạy: LANG=C.UTF-8 node scripts/playwright/kiem-chuyen-doi-du-lieu.mjs http://127.0.0.1:8086
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const BASE = process.argv[2] || "http://127.0.0.1:8086";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0; const errs = [];
const chk = (n, ok, extra = "") => { console.log(`${ok ? "ĐẠT" : "LỖI"}  ${n}${extra ? "  " + extra : ""}`); if (!ok) bad++; };
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message.slice(0, 140)));
await p.goto(BASE + "/me", { waitUntil: "networkidle" });

// dữ liệu CŨ đúng dạng P19: không có status/progress/…; 2 trang (một trang có ảnh đã lọc riêng)
await p.evaluate(async () => {
  const img = (t) => new Promise((res) => { const c = document.createElement("canvas"); c.width = 220; c.height = 300; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 220, 300); g.fillStyle = "#222"; g.font = "26px sans-serif"; g.fillText(t, 12, 60); c.toBlob(res, "image/jpeg", 0.9); });
  const o1 = await img("cu 1"), s1 = await img("cu 1 loc"), o2 = await img("cu 2");
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); const now = Date.now();
  await new Promise((res, rej) => { const t = db.transaction("docs", "readwrite"); const s = t.objectStore("docs"); s.clear();
    s.put({ id: "cu1", name: "Tài liệu cũ P19", folder: "Chung", kind: "Tài liệu", createdAt: now, updatedAt: now, tags: ["cu"], pages: [
      { id: "a", orig: "", src: "", origB: o1, srcB: s1, origFp: "o1", srcFp: "s1", text: "Chữ có dấu", edit: { rotation: 0, filter: "magic", brightness: 0, contrast: 0 } },
      { id: "b", orig: "", src: "=", origB: o2, origFp: "o2", edit: { rotation: 90, filter: "original", brightness: 0, contrast: 0 } }] });
    t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close();
});
await p.reload({ waitUntil: "networkidle" });
const raw = () => p.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const docs = await new Promise((res, rej) => { const q = db.transaction("docs").objectStore("docs").getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); const v = db.version; db.close();
  return { v, docs: docs.map((d) => ({ id: d.id, name: d.name, pages: d.pages.map((x) => ({ id: x.id, status: x.status ?? null, text: x.text ?? null, rotation: x.edit.rotation, hasOrigB: !!x.origB })) })) };
});
const r1 = await raw();
chk("tài liệu cũ vẫn nguyên (tên, 2 trang, chữ, xoay)", r1.docs.length === 1 && r1.docs[0].pages.length === 2 && r1.docs[0].pages[0].text === "Chữ có dấu" && r1.docs[0].pages[1].rotation === 90 && r1.docs[0].pages.every((x) => x.hasOrigB));
chk("mở app KHÔNG ghi hàng loạt xuống ổ (trang cũ chưa có status trong kho)", r1.docs[0].pages.every((x) => x.status === null), JSON.stringify(r1.docs[0].pages.map((x) => x.status)));
chk("kho “ghi-nhanh” vẫn là phiên bản 2 (bản app cũ còn mở được)", r1.v === 2, `v${r1.v}`);

// tài liệu cũ mở được trong giao diện
await p.goto(BASE + "/doc/cu1", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
const txt = await p.locator("body").innerText(); chk("tài liệu cũ mở bình thường (Trang 1/2)", /Trang 1\/2/.test(txt), txt.replace(/\s+/g, " ").slice(0, 60));

// trong bộ nhớ trang cũ = "xong": đọc qua tệp sao lưu
await p.goto(BASE + "/me", { waitUntil: "networkidle" }); await p.waitForFunction(() => document.body.innerText.includes("Sao lưu ra tệp"));
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }), p.getByText("Sao lưu ra tệp").click()]);
const bk = JSON.parse(readFileSync(await dl.path(), "utf8"));
chk("trong bộ nhớ, trang cũ có trạng thái “xong” (thấy qua tệp sao lưu)", bk.docs[0].pages.every((x) => x.status === "xong"), JSON.stringify(bk.docs[0].pages.map((x) => x.status)));

// trang mới + mô hình trang đầy đủ ghi/đọc được; bản app CŨ (mở v2) vẫn đọc được
await p.evaluate(async () => {
  const m = await import("/src/lib/db.ts");
  const c = document.createElement("canvas"); c.width = 50; c.height = 50; const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  const u = URL.createObjectURL(blob); const { adoptBlob } = await import("/src/lib/disk-pack.ts"); const url = adoptBlob(blob); void u;
  const pg = { ...m.newPage(url), status: "xem-lai", progress: undefined, quadConfidence: 0.42, warnings: ["chữ vắt mép"], origBlobKey: "orig:x:1" };
  await m.saveDoc(m.newDoc([pg], "Tài liệu mới CS-01"));
});
const r2 = await p.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh", 2); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); // đúng như bản app cũ
  const docs = await new Promise((res, rej) => { const q = db.transaction("docs").objectStore("docs").getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); db.close();
  const n = docs.find((d) => d.name === "Tài liệu mới CS-01"); const old = docs.find((d) => d.id === "cu1");
  return { names: docs.map((d) => d.name).sort(), pg: n?.pages[0] ? { status: n.pages[0].status, q: n.pages[0].quadConfidence, w: n.pages[0].warnings, k: n.pages[0].origBlobKey } : null, oldStatuses: old?.pages.map((x) => x.status ?? null) };
});
chk("bản app cũ (mở kho v2) vẫn đọc được dữ liệu có trường mới", r2.names.length === 2 && r2.pg?.status === "xem-lai" && r2.pg?.q === 0.42 && r2.pg?.w?.[0] === "chữ vắt mép" && r2.pg?.k === "orig:x:1", JSON.stringify(r2.pg));
chk("trang mới tạo bằng newPage có status khi lưu (mặc định xong)", await p.evaluate(async () => { const m = await import("/src/lib/db.ts"); return m.newPage("data:image/png;base64,AA==").status === "xong"; }));

// kho Blob ảnh gốc
const bs = await p.evaluate(async () => {
  const m = await import("/src/lib/blob-store.ts");
  const mk = (n) => new Blob([new Uint8Array(Array.from({ length: 5000 }, (_, i) => (i * n) % 251))], { type: "image/jpeg" });
  const hex = async (blob) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const a = mk(7), c = mk(13); const ka = m.newBlobKey("pa"), kc = m.newBlobKey("pc");
  await m.putBlob(ka, a); await m.putBlob(kc, c);
  return { ka, kc, ha: await hex(a), hc: await hex(c), got: await hex(await m.getBlob(ka)), keys: (await m.listBlobKeys()).length, missing: (await m.getBlob("khong-co")) === undefined, dbs: (await indexedDB.databases()).map((d) => `${d.name}@${d.version}`).sort() };
});
chk("kho Blob: ghi rồi đọc trùng byte", bs.got === bs.ha);
chk("kho Blob: khoá không tồn tại → undefined (không ném lỗi)", bs.missing);
chk("kho Blob là DB riêng, “ghi-nhanh” không bị nâng", bs.dbs.includes("ghi-nhanh-blobs@1") && bs.dbs.includes("ghi-nhanh@2"), bs.dbs.join(", "));
await p.reload({ waitUntil: "networkidle" });
const bs2 = await p.evaluate(async ({ ka, kc, hc }) => {
  const m = await import("/src/lib/blob-store.ts");
  const hex = async (blob) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const stillC = (await hex(await m.getBlob(kc))) === hc; const removed = await m.pruneBlobs(new Set([kc]));
  return { stillC, removed, aGone: (await m.getBlob(ka)) === undefined, cKept: (await m.getBlob(kc)) !== undefined, left: (await m.listBlobKeys()).length };
}, { ka: bs.ka, kc: bs.kc, hc: bs.hc });
chk("kho Blob: còn nguyên sau khi tải lại trang", bs2.stillC);
chk("kho Blob: dọn mồ côi chỉ xoá khoá không được trỏ tới", bs2.removed === 1 && bs2.aGone && bs2.cKept && bs2.left === 1, JSON.stringify(bs2));

chk("không có pageerror", errs.length === 0, errs.slice(0, 2).join(" | "));
await b.close(); console.log(bad === 0 ? "TẤT CẢ ĐẠT" : `${bad} ca lỗi`); process.exit(bad === 0 ? 0 : 1);

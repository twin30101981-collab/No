// BL-01 (RS-20): sao lưu → xoá hết → khôi phục: từng ảnh phải TRÙNG BYTE; tệp sao lưu không được chứa "blob:".
// Dữ liệu thử đặt thẳng vào IndexedDB dạng Blob nhị phân (đúng dạng app lưu thật), không cần camera.
// Chuẩn bị:  npx vite dev --port 8083 --host 127.0.0.1   (không cần Supabase)
// Chạy:      node scripts/playwright/kiem-sao-luu.mjs http://127.0.0.1:8083   (playwright-core cài ở thư mục riêng)
// Chạy trên mã cũ P19 thì ca "không có blob:" và "ảnh trùng byte" phải LỖI (tái hiện RS-20). Mã thoát 0 = đạt hết.
import { chromium } from "playwright-core";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:8083";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0;
const chk = (n, ok, extra = "") => { console.log(`${ok ? "ĐẠT" : "LỖI"}  ${n}${extra ? "  " + extra : ""}`); if (!ok) bad++; };
const errs = [];
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message.slice(0, 140)));
await p.goto(BASE + "/me", { waitUntil: "networkidle" });

// 1) gieo 2 tài liệu (3 trang), mỗi ảnh có nội dung khác nhau; trả về băm byte của từng ảnh
const seeded = await p.evaluate(async () => {
  const img = (seed, kind) => new Promise((res) => {
    const c = document.createElement("canvas"); c.width = 200 + seed * 7; c.height = 260; const g = c.getContext("2d");
    g.fillStyle = `hsl(${seed * 53 % 360} 60% 80%)`; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#222"; g.font = "28px sans-serif"; g.fillText(`${kind} ${seed}`, 12, 60 + seed * 5);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgb(${(i * 37 + seed) % 255},${(i * 91) % 255},${(seed * 17 + i) % 255})`; g.fillRect((i * 13 + seed) % c.width, (i * 29) % c.height, 9, 9); }
    c.toBlob(res, "image/jpeg", 0.9);
  });
  const hex = async (blob) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const mkPage = async (id, seed, same) => {
    const ob = await img(seed, "goc"); const sb = same ? ob : await img(seed + 100, "loc");
    return { page: { id, orig: "", src: same ? "=" : "", origB: ob, srcB: same ? undefined : sb, origFp: `o${id}`, srcFp: `s${id}`, edit: { rotation: 0, filter: "magic", brightness: 0, contrast: 0 }, text: `Chữ tiếng Việt có dấu ${id}` }, ob: await hex(ob), sb: await hex(sb) };
  };
  const a1 = await mkPage("p1", 1, false), a2 = await mkPage("p2", 2, true), b1 = await mkPage("p3", 3, false);
  const now = Date.now();
  const docs = [
    { id: "doc-a", name: "Hợp đồng thuê nhà", folder: "Chung", kind: "Tài liệu", createdAt: now - 5000, updatedAt: now - 2000, pages: [a1.page, a2.page], tags: ["quan-trong"] },
    { id: "doc-b", name: "Hoá đơn điện", folder: "Chung", kind: "Tài liệu", createdAt: now - 4000, updatedAt: now - 1000, pages: [b1.page] },
  ];
  await new Promise((res, rej) => { const t = db.transaction("docs", "readwrite"); t.objectStore("docs").clear(); docs.forEach((d) => t.objectStore("docs").put(d)); t.oncomplete = res; t.onerror = () => rej(t.error); });
  db.close();
  return { hashes: { "doc-a/p1/orig": a1.ob, "doc-a/p1/src": a1.sb, "doc-a/p2/orig": a2.ob, "doc-b/p3/orig": b1.ob, "doc-b/p3/src": b1.sb } };
});
await p.reload({ waitUntil: "networkidle" });
await p.waitForFunction(() => document.body.innerText.includes("Sao lưu ra tệp"));

// 2) Sao lưu → bắt tệp tải về
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }), p.getByText("Sao lưu ra tệp").click()]);
const path = await dl.path(); const raw = readFileSync(path, "utf8");
const backupFile = "/tmp/claude-0/kiem-sao-luu-backup.json"; (await import("node:fs")).writeFileSync(backupFile, raw);
chk("tệp sao lưu không chứa địa chỉ blob:", !/"blob:/.test(raw), `kích thước ${(raw.length / 1024).toFixed(0)} KB`);
let parsed = null; try { parsed = JSON.parse(raw); } catch {}
chk("tệp sao lưu là JSON hợp lệ có 2 tài liệu", parsed?.docs?.length === 2);
chk("tệp ghi số phiên bản mới + tổng kiểm", (parsed?.version ?? 0) >= 4 && !!parsed?.index?.length, `version=${parsed?.version}`);

// 3) xoá sạch dữ liệu máy (như máy mới) rồi khôi phục
await p.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  await new Promise((res, rej) => { const t = db.transaction("docs", "readwrite"); t.objectStore("docs").clear(); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close();
});
await p.reload({ waitUntil: "networkidle" });
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Khôi phục từ tệp").click()]);
await fc.setFiles(backupFile);
// hộp thoại: chọn GỘP nếu có (mã mới), nếu không thì "Khôi phục" (mã cũ)
const dlg = p.locator('[role="alertdialog"]');
await dlg.waitFor({ timeout: 8000 });
const merge = dlg.getByRole("button", { name: /Gộp|Khôi phục/ }).first();
await merge.click();
await p.waitForTimeout(2500);

// 4) so byte từng ảnh trong kho với bản gốc
const after = await p.evaluate(async () => {
  const hex = async (blob) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const docs = await new Promise((res, rej) => { const q = db.transaction("docs").objectStore("docs").getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); db.close();
  const out = { n: docs.length, names: docs.map((d) => d.name), h: {}, text: {} };
  for (const d of docs) for (const pg of d.pages) {
    const key = `${d.id}/${pg.id}`;
    const o = pg.origB ?? (pg.orig?.startsWith("data:") ? await (await fetch(pg.orig)).blob() : null);
    const s = pg.src === "=" ? o : pg.srcB ?? (pg.src?.startsWith("data:") ? await (await fetch(pg.src)).blob() : null);
    out.h[`${key}/orig`] = o ? await hex(o) : `không có ảnh (orig=${String(pg.orig).slice(0, 30)})`;
    if (pg.src !== "=") out.h[`${key}/src`] = s ? await hex(s) : `không có ảnh (src=${String(pg.src).slice(0, 30)})`;
    out.text[key] = pg.text;
  }
  return out;
});
chk("sau khôi phục có đủ 2 tài liệu đúng tên", after.n === 2 && after.names.includes("Hợp đồng thuê nhà") && after.names.includes("Hoá đơn điện"), JSON.stringify(after.names));
let same = 0, total = 0; const diffs = [];
for (const [k, h] of Object.entries(seeded.hashes)) { total++; if (after.h[k] === h) same++; else diffs.push(`${k}: ${String(after.h[k]).slice(0, 40)}`); }
chk(`ảnh trùng byte với bản gốc (${same}/${total})`, same === total, diffs.slice(0, 2).join(" | "));
chk("chữ nhận dạng (có dấu) giữ nguyên", after.text["doc-a/p1"] === "Chữ tiếng Việt có dấu p1");


// ——— Ca biên và lỗi ———
const fs = await import("node:fs");
const store = () => p.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const docs = await new Promise((res, rej) => { const q = db.transaction("docs").objectStore("docs").getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); db.close();
  return docs.map((d) => `${d.id}|${d.name}`).sort();
});
const seed = (list) => p.evaluate(async (list) => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("ghi-nhanh"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  await new Promise((res, rej) => { const t = db.transaction("docs", "readwrite"); t.objectStore("docs").clear(); list.forEach((d) => t.objectStore("docs").put(d)); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close();
}, list);
const tiny = (id) => ({ id, orig: "data:image/jpeg;base64,/9j/4AAQSkZJRg==", src: "=", edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } });
const dsk = (id, name, t) => ({ id, name, folder: "Chung", kind: "Tài liệu", createdAt: t, updatedAt: t, pages: [{ ...tiny("pg-" + id), origB: new Blob([new Uint8Array([1, 2, 3, +id.length])], { type: "image/jpeg" }) , orig: "" }] });
const toastText = async (re, ms = 6000) => p.locator("[data-sonner-toast]").filter({ hasText: re }).first().innerText({ timeout: ms }).catch(() => "");
async function pick(file) { const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Khôi phục từ tệp").click()]); await fc.setFiles(file); }

// A) GỘP không xoá gì của máy; bản mới hơn trên máy được giữ
await p.goto(BASE + "/me", { waitUntil: "networkidle" });
const NOW = Date.now();
await seed([
  { id: "doc-c", name: "Chỉ có trên máy", folder: "Chung", kind: "Tài liệu", createdAt: NOW, updatedAt: NOW, pages: [] },
  { id: "doc-a", name: "Hợp đồng (bản MỚI trên máy)", folder: "Chung", kind: "Tài liệu", createdAt: NOW, updatedAt: NOW + 99999, pages: [] },
]);
await p.reload({ waitUntil: "networkidle" });
await pick(backupFile);
await p.locator('[role="alertdialog"]').getByRole("button", { name: "Gộp" }).click(); await p.waitForTimeout(2000);
const m = await store();
chk("GỘP: giữ tài liệu chỉ có trên máy", m.includes("doc-c|Chỉ có trên máy"));
chk("GỘP: bản mới hơn trên máy không bị tệp cũ đè", m.includes("doc-a|Hợp đồng (bản MỚI trên máy)"), m.join(" ; "));
chk("GỘP: tài liệu mới từ tệp được thêm", m.includes("doc-b|Hoá đơn điện") && m.length === 3, `${m.length} tài liệu`);
const tg = await toastText(/Đã gộp/); chk("GỘP: báo rõ thêm/cập nhật/giữ nguyên", /thêm 1, cập nhật 0, giữ nguyên 1/.test(tg), tg.replace(/\n/g, " "));

// B) tệp sao lưu CŨ chỉ có địa chỉ blob: → từ chối, không đổi dữ liệu
fs.writeFileSync("/tmp/claude-0/kiem-sao-luu-cu.json", JSON.stringify({ app: "ghi-nhanh", version: 3, docs: [{ id: "x", name: "Tài liệu cũ", pages: [{ id: "p", orig: "blob:http://127.0.0.1/abc", src: "blob:http://127.0.0.1/abc", edit: {} }] }] }));
const before = await store();
await pick("/tmp/claude-0/kiem-sao-luu-cu.json");
const tb = await toastText(/Không khôi phục được/);
const why = await toastText(/địa chỉ ảnh tạm/);
chk("tệp cũ chứa blob: bị từ chối kèm lý do dễ hiểu", /địa chỉ ảnh tạm/.test(why) && /Không khôi phục được/.test(tb), why.replace(/\n/g, " ").slice(0, 120));
chk("tệp cũ: dữ liệu trên máy không đổi", JSON.stringify(await store()) === JSON.stringify(before));

// C) không phải JSON / không phải tệp của app
fs.writeFileSync("/tmp/claude-0/kiem-sao-luu-rac.json", "đây không phải json {");
await pick("/tmp/claude-0/kiem-sao-luu-rac.json");
const tj = await toastText(/Không khôi phục được/); chk("tệp không phải JSON: báo lỗi tiếng Việt", /Không khôi phục được/.test(tj));
chk("tệp rác: dữ liệu không đổi", JSON.stringify(await store()) === JSON.stringify(before));

// D) sai tổng kiểm: sửa 1 chữ trong tài liệu doc-b → doc-b bị loại, doc-a vẫn khôi phục
const tampered = fs.readFileSync(backupFile, "utf8").replace("Hoá đơn điện", "Hoá đơn ĐIỆN");
fs.writeFileSync("/tmp/claude-0/kiem-sao-luu-sua.json", tampered);
await seed([]); await p.reload({ waitUntil: "networkidle" });
await pick("/tmp/claude-0/kiem-sao-luu-sua.json");
const d = p.locator('[role="alertdialog"]'); await d.waitFor({ timeout: 8000 });
chk("sai tổng kiểm: hộp thoại nêu tài liệu hỏng bị bỏ qua", /1 tài liệu hỏng bị bỏ qua/.test(await d.innerText()) && /sai tổng kiểm/.test(await d.innerText()));
await d.getByRole("button", { name: "Gộp" }).click(); await p.waitForTimeout(1800);
const t2 = await store(); chk("sai tổng kiểm: chỉ khôi phục tài liệu nguyên vẹn", t2.length === 1 && t2[0].startsWith("doc-a|"), t2.join(" ; "));

// E) THAY THẾ: tự tải bản dự phòng rồi mới thay
await seed([{ id: "doc-z", name: "Tài liệu sẽ bị thay", folder: "Chung", kind: "Tài liệu", createdAt: NOW, updatedAt: NOW, pages: [] }]); await p.reload({ waitUntil: "networkidle" });
await pick(backupFile);
const d2 = p.locator('[role="alertdialog"]'); await d2.waitFor({ timeout: 8000 });
if (process.env.SHOT) { await p.waitForTimeout(700); await p.screenshot({ path: process.env.SHOT }); }
const [safety] = await Promise.all([p.waitForEvent("download", { timeout: 15000 }), d2.getByRole("button", { name: "Thay thế" }).click()]);
const safetyJson = JSON.parse(readFileSync(await safety.path(), "utf8"));
chk("THAY THẾ: tải về bản dự phòng chứa dữ liệu cũ", /du-phong/.test(safety.suggestedFilename()) && safetyJson.docs?.some((x) => x.id === "doc-z"), safety.suggestedFilename());
await p.locator('[role="alertdialog"]').getByRole("button", { name: "Thay thế" }).click(); await p.waitForTimeout(2200);
const t3 = await store(); chk("THAY THẾ: kho chỉ còn đúng nội dung tệp", t3.length === 2 && !t3.some((x) => x.startsWith("doc-z")), t3.join(" ; "));
// Huỷ giữa chừng không đổi gì
await seed([{ id: "doc-z", name: "Tài liệu sẽ bị thay", folder: "Chung", kind: "Tài liệu", createdAt: NOW, updatedAt: NOW, pages: [] }]); await p.reload({ waitUntil: "networkidle" });
await pick(backupFile);
await p.locator('[role="alertdialog"]').getByRole("button", { name: "Huỷ" }).click(); await p.waitForTimeout(800);
chk("Huỷ ở hộp chọn: dữ liệu không đổi", JSON.stringify(await store()) === JSON.stringify(["doc-z|Tài liệu sẽ bị thay"]));

chk("không có pageerror", errs.length === 0, errs.slice(0, 2).join(" | "));
await b.close();
console.log(bad === 0 ? "TẤT CẢ ĐẠT" : `${bad} ca lỗi`);
process.exit(bad === 0 ? 0 : 1);

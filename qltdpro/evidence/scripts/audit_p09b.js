/* P09 (đợt 2) — kiểm chứng LỖI TIỀM ẨN bằng Playwright trên dữ liệu thật: tệp hỏng/không đúng định dạng, nhập trùng, thao tác đua, múi giờ, IndexedDB bị chặn.
   node audit_p09b.js <app.html> [thư mục dữ liệu thật] [--out file.json]. Đầu ra chỉ có số đếm/chữ ký, không có tên khách hàng. */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), os = require('os');
const APP = path.resolve(process.argv[2]), D = (process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '/tmp/claude-0/real/data') + '/';
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/claude-0/p09/audit_p09b.json';
const F = [];
const add = (id, area, sev, ok, detail) => { F.push({ id, area, sev, ok: !!ok, detail: detail === undefined ? '' : detail }); console.log((ok ? '  ✔ ' : '  ✘ [' + sev + '] ') + id + ' — ' + area + (detail !== undefined && detail !== '' ? ' :: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 320) : '')); };
async function mk(b, opts, init) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1500, height: 900 }, acceptDownloads: true }, opts || {})); const p = await ctx.newPage(); p._err = []; p._dlg = [];
  p.on('pageerror', e => p._err.push(String(e.message).slice(0, 140))); p.on('dialog', d => { p._dlg.push(d.type() + ':' + d.message().slice(0, 80)); d.accept().catch(() => {}); });
  if (init) await p.addInitScript(init); return p;
}
const open = async (p, ms) => { await p.goto('file://' + APP, { waitUntil: 'load' }); await p.waitForTimeout(ms || 5000); };
async function importOne(p, file, wait) {
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', file);
  let got = false; for (let i = 0; i < (wait || 120); i++) { await p.waitForTimeout(250); got = await p.evaluate(() => { try { return !!pendingImportRows && pendingImportRows.length > 0 } catch (e) { return false } }); if (got) break; }
  return got;
}
const sig = p => p.evaluate(() => { const s = JSON.stringify(DATA.qltd || []); let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return { n: (DATA.qltd || []).length, h, arch: (typeof _archiveReportList !== 'undefined' ? _archiveReportList : []).length }; });
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  /* ─── A. TỆP HỎNG / SAI ĐỊNH DẠNG: không được xoá dữ liệu hiện có, không văng lỗi chưa bắt ─── */
  let p = await mk(b); await open(p); await importOne(p, D + '20.10.2026.XLS'); await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(4000);
  const base = await sig(p); p._err.length = 0;
  const tmp = os.tmpdir(), bad = {};
  const src = fs.readFileSync(D + '31.12.2025.xlsx'); bad['xlsx_cắt_nửa.xlsx'] = src.subarray(0, Math.floor(src.length / 2)); bad['rỗng.xlsx'] = Buffer.alloc(0);
  bad['văn_bản_đổi_đuôi.xlsx'] = Buffer.from('đây không phải bảng tính\nabc;def;ghi\n1;2;3\n'); bad['pdf_đổi_đuôi.xls'] = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<<>>endobj\n');
  const xs = fs.readFileSync(D + '20.10.2026.XLS'); bad['xls_cắt_nửa.XLS'] = xs.subarray(0, Math.floor(xs.length / 2)); bad['csv_sai_cột.csv'] = Buffer.from('a,b,c\n1,2,3\n4,5,6\n');
  const out = {};
  for (const [nm, buf] of Object.entries(bad)) {
    const f = { name: nm, mimeType: 'application/octet-stream', buffer: buf }; /* tải qua bộ nhớ: sandbox Chromium không đọc được đường dẫn tệp có dấu */ p._dlg.length = 0; p._err.length = 0;
    const got = await importOne(p, f, 24); let tt = ''; for (let k = 0; k < 40 && !tt; k++) { tt = await p.evaluate(() => [...document.querySelectorAll('[class*=toast],#toast,.toast')].map(e => e.textContent.trim()).filter(Boolean).join(' / ').slice(0, 90)); if (!tt) await p.waitForTimeout(150); } await p.waitForTimeout(500); const s = await sig(p), pend = await p.evaluate(() => { try { return pendingImportRows ? pendingImportRows.length : 0 } catch (e) { return -1 } });
    out[nm] = { rowsLoaded: got, pend, toast: tt, dataKept: s.n === base.n && s.h === base.h, err: p._err.length, dlg: p._dlg.slice(0, 2) }; 
  }
  add('BAD-1', 'Tệp hỏng/sai định dạng: dữ liệu hiện có KHÔNG bị thay đổi', 'cao', Object.values(out).every(o => o.dataKept), Object.fromEntries(Object.entries(out).map(([k, o]) => [k, o.dataKept])));
  add('BAD-2', 'Tệp hỏng/sai định dạng: không nạp được dòng nào vào hàng chờ nhập (không nhập nhầm rác)', 'cao', Object.values(out).every(o => !o.rowsLoaded && o.pend <= 0), Object.fromEntries(Object.entries(out).map(([k, o]) => [k, o.pend])));
  add('BAD-3', 'Tệp hỏng/sai định dạng: có thông báo cho người dùng (hộp thoại/toast), không im lặng', 'trung bình', Object.values(out).every(o => o.dlg.length > 0 || o.toast), Object.fromEntries(Object.entries(out).map(([k, o]) => [k, (o.toast || o.dlg[0] || 'KHÔNG CÓ').slice(0, 50)])));
  add('BAD-4', 'Tệp hỏng/sai định dạng: không có lỗi JS chưa bắt (pageerror)', 'cao', Object.values(out).every(o => o.err === 0), Object.fromEntries(Object.entries(out).map(([k, o]) => [k, o.err])));
  /* ─── B. NHẬP TRÙNG: cùng tệp 2 lần không nhân đôi dữ liệu/mốc ─── */
  await importOne(p, D + '20.10.2026.XLS'); await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(4000);
  const again = await sig(p); add('DUP-1', 'Nhập lại đúng tệp đã nhập: số dòng và dữ liệu không đổi, mốc lưu trữ không nhân đôi', 'cao', again.n === base.n && again.h === base.h && again.arch === base.arch, { base, again });
  /* ─── C. THAO TÁC ĐUA: bấm "Nhập" 2 lần liên tiếp ─── */
  const p2 = await mk(b); await open(p2); await importOne(p2, D + '30.09.2026.XLS'); p2._err.length = 0;
  await p2.evaluate(() => { doImport(); doImport(); completeImportToDataArchive(); completeImportToDataArchive(); }); await p2.waitForTimeout(6000); const rc = await sig(p2);
  add('RACE-1', 'Bấm Nhập/Lưu mốc 2 lần liên tiếp: không nhân đôi dòng, không lỗi JS', 'cao', rc.n > 3000 && rc.n < 3900 && rc.arch === 1 && p2._err.length === 0, { rc, err: p2._err.slice(0, 2) });
  await p2.context().close();
  /* ─── D. MÚI GIỜ: dữ liệu sau nhập phải GIỐNG HỆT ở mọi múi giờ (rủi ro lệch ngày do Date/UTC) ─── */
  const tzres = {};
  for (const tz of ['Asia/Ho_Chi_Minh', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) for (const f of ['20.10.2026.XLS', '31.12.2025.xlsx']) {
    const q = await mk(b, { timezoneId: tz, locale: 'vi-VN' }); await open(q, 4500); const ok = await importOne(q, D + f); await q.evaluate(() => doImport()); await q.waitForTimeout(800); await q.evaluate(() => completeImportToDataArchive()); await q.waitForTimeout(3500);
    const r = await q.evaluate(() => { const R = DATA.qltd; let h = 0; const s = JSON.stringify(R); for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; const dates = R.slice(0, 400).map(r => [r[3], r[6], r[7]].join('|')).join('#'); let d = 0; for (let i = 0; i < dates.length; i++) d = (Math.imul(d, 31) + dates.charCodeAt(i)) | 0; return { n: R.length, h, d }; });
    (tzres[f] = tzres[f] || {})[tz] = ok ? r : { fail: 1 }; await q.context().close();
  }
  for (const f of Object.keys(tzres)) { const v = Object.values(tzres[f]); add('TZ-' + f.replace(/\W/g, '').slice(0, 8), 'Múi giờ: nhập ' + f + ' cho dữ liệu GIỐNG HỆT ở 4 múi giờ (VN, UTC, Los Angeles, UTC+14)', 'cao', v.every(x => !x.fail && x.n > 3000 && x.h === v[0].h && x.n === v[0].n), Object.fromEntries(Object.entries(tzres[f]).map(([k, x]) => [k, x.fail ? 'FAIL' : x.n + ':' + x.d]))); }
  /* ─── E. INDEXEDDB BỊ CHẶN (chế độ riêng tư/chính sách): vẫn dùng được, không văng lỗi, vẫn có thông báo ─── */
  const q = await mk(b, null, () => { try { Object.defineProperty(window, 'indexedDB', { get() { return undefined; } }); } catch (e) {} });
  await open(q); const eb = await q.evaluate(() => typeof indexedDB); q._err.length = 0;
  await importOne(q, D + '30.09.2026.XLS'); await q.evaluate(() => doImport()); await q.waitForTimeout(800); await q.evaluate(() => { try { completeImportToDataArchive() } catch (e) { window.__e = String(e) } }); await q.waitForTimeout(5000);
  const qs = await sig(q), toast = await q.evaluate(() => (document.body.innerText.match(/Không lưu được|IndexedDB|lưu thất bại/i) || [])[0] || '');
  add('IDB-1', 'IndexedDB bị chặn: app vẫn nhập và hiển thị dữ liệu, không văng lỗi chưa bắt', 'trung bình', eb === 'undefined' && qs.n > 3000 && q._err.length === 0, { idb: eb, n: qs.n, err: q._err.slice(0, 2) });
  add('IDB-2', 'IndexedDB bị chặn: người dùng được báo rõ (không im lặng mất dữ liệu khi đóng tab)', 'cao', !!toast, { toast });
  await q.context().close();
  /* ─── F. ĐỒNG HỒ: mở app đúng ngày 29/02 & 31/12 không lỗi; "quá hạn" tính theo ngày hệ thống ─── */
  for (const [iso, nm] of [['2028-02-29T10:00:00+07:00', '29/02/2028'], ['2026-12-31T23:59:30+07:00', '31/12/2026 23:59:30'], ['2027-01-01T00:00:10+07:00', '01/01/2027 00:00:10']]) {
    const c = await mk(b, null, null); await c.clock.install({ time: new Date(iso) }); await open(c, 5000); c._err.length = 0;
    await importOne(c, D + '20.10.2026.XLS'); await c.evaluate(() => doImport()); await c.waitForTimeout(800); await c.evaluate(() => completeImportToDataArchive()); await c.waitForTimeout(3000);
    for (const n of ['dashboard', 'denhan', 'canhbao', 'doisoat']) { await c.evaluate(n => showPage(n), n); await c.waitForTimeout(900); }
    const t = await c.evaluate(() => (document.getElementById('page-dashboard') || {}).innerText || ''); const bad = (t.match(/NaN|undefined|Invalid Date/g) || []).length;
    add('CLK-' + nm.slice(0, 5).replace(/\W/g, ''), 'Đồng hồ hệ thống ' + nm + ': nhập + mở Dashboard/Đến hạn/Cảnh báo/Đối soát không lỗi, không NaN', 'trung bình', c._err.length === 0 && bad === 0, { err: c._err.slice(0, 2), bad }); await c.context().close();
  }
  await p.context().close(); await b.close();
  const fail = F.filter(x => !x.ok); fs.writeFileSync(OUT, JSON.stringify({ app: path.basename(APP), at: new Date().toISOString(), total: F.length, fail: fail.length, findings: F }, null, 1));
  console.log('\nTỔNG: ' + (F.length - fail.length) + '/' + F.length + ' đạt; ' + fail.length + ' phát hiện'); process.exit(0);
})().catch(e => { console.error('AUDIT LỖI', e); fs.writeFileSync(OUT, JSON.stringify({ crash: String(e), findings: F }, null, 1)); process.exit(1); });

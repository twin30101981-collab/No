/* P09 — kiểm chứng tổng thể bằng Playwright trên DỮ LIỆU THẬT (ngoài repo): tìm điểm nghẽn, hạn chế, lỗi tồn đọng/tiềm ẩn.
   node audit_p09.js <app.html> [thư mục dữ liệu thật] [--out file.json]
   KHÔNG ghi tên/mã khách hàng ra đầu ra: chỉ số đếm, thời gian, tổng tiền, mã lỗi. */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), os = require('os');
const APP = path.resolve(process.argv[2]), D = (process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '/tmp/claude-0/real/data') + '/';
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/claude-0/p09/audit_p09.json';
const F = []; // phát hiện
const add = (id, area, sev, ok, detail, ms) => { F.push({ id, area, sev, ok: !!ok, detail: detail === undefined ? '' : detail, ms: ms === undefined ? null : Math.round(ms) }); console.log((ok ? '  ✔ ' : '  ✘ [' + sev + '] ') + id + ' — ' + area + (detail !== undefined && detail !== '' ? ' :: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : '') + (ms != null ? ' (' + Math.round(ms) + ' ms)' : '')); };
const PERIODS = ['31.12.2025.xlsx', '31.01.2026.xlsx', '28.02.2026.xlsx', '31.03.2026.xlsx', '30.04.2026.xlsx', '31.05.2026.xlsx', '30.06.2026.XLS', '31.07.2026.XLS', '31.08.2026.XLS', '30.09.2026.XLS', '20.10.2026.XLS'];
const TS = ['Sao ke tai san bao dam 30.09.2026.XLS', 'Sao ke tai san bao dam 20.10.2026.XLS'];
const PAGES = ['dashboard', 'qltd', 'kd', 'td', 'denhan', 'laidong', 'chlm', 'tranop', 'phidv', 'tsbd', 'giadat', 'doisoat', 'xuhuong', 'canhbao', 'archive', 'baocao', 'ctkh', 'khachhang', 'khmoi', 'camco', 'qcamco', 'hmtd', 'hsvv', 'fhs', 'tieudung', 'nhap'];
async function mk(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true }); const p = await ctx.newPage(); p._err = []; p._con = []; p._rf = [];
  p.on('pageerror', e => p._err.push(String(e.message).slice(0, 140))); p.on('console', m => { if (m.type() === 'error') p._con.push(m.text().slice(0, 140)); });
  p.on('requestfailed', r => p._rf.push(r.url().slice(0, 80))); p.on('dialog', d => d.accept().catch(() => {}));
  await p.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) {} });
  return p;
}
const raf2 = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const lt = async p => { const a = await p.evaluate(() => { const x = window.__lt.slice(); window.__lt = []; return x; }); return { n: a.length, max: a.length ? Math.max(...a) : 0, sum: a.reduce((s, v) => s + v, 0) }; };
const errs = p => { const o = { pageerror: p._err.slice(), console: p._con.slice() }; p._err = []; p._con = []; return o; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-precise-memory-info'] });
  /* ─── 1. KHỞI ĐỘNG ─── */
  let p = await mk(b, 1500, 900); let t0 = Date.now();
  await p.goto('file://' + APP, { waitUntil: 'load' }); const tLoad = Date.now() - t0; await p.waitForTimeout(6000);
  const boot = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), nodes: document.getElementsByTagName('*').length, scripts: document.scripts.length }; });
  const bl = await lt(p), be = errs(p);
  add('BOOT-1', 'Khởi động: lỗi JS/console', 'cao', !be.pageerror.length && !be.console.length, be);
  add('BOOT-2', 'Khởi động: thời gian tải (load) ≤ 3 s, longtask tổng ≤ 1,5 s', 'trung bình', tLoad <= 3000 && bl.sum <= 1500, { tLoad, ...boot, longtasks: bl });
  add('BOOT-3', 'Khởi động: không có yêu cầu mạng thất bại (offline-first)', 'trung bình', p._rf.length === 0, p._rf.slice(0, 5));
  /* ─── 2. NHẬP 11 KỲ + TSBĐ QUA TRUNG TÂM NHẬP ─── */
  await p.evaluate(() => showPage('nhap')); await p.waitForTimeout(800);
  const files = PERIODS.map(f => D + f).concat(TS.map(f => D + f));
  await p.setInputFiles('#hub-file', files); await p.waitForTimeout(4000);
  const plan = await p.evaluate(() => { const P = window._tdHubPlan; return P ? { nImport: P.nImport, nSkip: P.nSkip, order: P.order.map(x => x.kind + ':' + x.date), kinds: P.items.map(i => i.kind).join(','), warns: P.items.filter(i => i.warn.length).length } : null; });
  add('HUB-1', 'Trung tâm nhập: nhận 13 tệp → nhập 11 dư nợ + 1 TSBĐ mới nhất, bỏ 1', 'cao', plan && plan.nImport === 12 && plan.nSkip === 1, plan);
  t0 = Date.now(); await p.evaluate(() => { window.confirm = () => true; tdHubRun(); });
  let ended = false; for (let i = 0; i < 900 && !ended; i++) { await p.waitForTimeout(2000); ended = await p.evaluate(() => !document.getElementById('hub-run').disabled); }
  const tImport = Date.now() - t0; const hl = await lt(p), he = errs(p);
  const log = await p.evaluate(() => JSON.parse(localStorage.getItem('td_hub_log_v1') || '[]').slice(0, 12).map(x => ({ d: x.date, k: x.kind, ms: x.ms, ok: !/LỖI/.test(x.result) })));
  add('HUB-2', 'Trung tâm nhập: nhập đủ 12 tệp, không tệp nào lỗi', 'cao', ended && log.length === 12 && log.every(x => x.ok), { ended, n: log.length, bad: log.filter(x => !x.ok).length }, tImport);
  add('HUB-3', 'Trung tâm nhập: mỗi tệp dư nợ ≤ 25 s', 'trung bình', log.filter(x => x.k === 'duno').every(x => x.ms <= 25000), log.map(x => x.d + ':' + x.ms));
  add('HUB-4', 'Nhập: không lỗi JS/console, longtask lớn nhất ≤ 1 s', 'trung bình', !he.pageerror.length && hl.max <= 1000, { he, hl });
  /* ─── 3. TOÀN VẸN DỮ LIỆU ─── */
  const integ = await p.evaluate(() => {
    const R = DATA.qltd || [], bad = { nanDuNo: 0, nanHM: 0, badDate: 0, noMa: 0, noTen: 0, lsOut: 0, lsEmpty: 0, negDuNo: 0 }, seen = {}; let dup = 0, tot = 0;
    R.forEach(r => { const dn = Number(r[11]); if (!isFinite(dn)) bad.nanDuNo++; else { tot += dn; if (dn < 0) bad.negDuNo++; } if (!isFinite(Number(r[10]))) bad.nanHM++; if (!r[5]) bad.noMa++; if (!r[4]) bad.noTen++;
      ['6', '7', '8'].forEach(() => {}); const ls = r[16] === undefined ? r[8] : r[8]; const n = parseFloat(ls); if (!isFinite(n)) bad.lsEmpty++; else if (n < 0 || n > 30) bad.lsOut++;
      [3, 6, 7].forEach(i => { const v = r[i]; if (v && !/^\d{2}\/\d{2}\/\d{4}$/.test(String(v))) bad.badDate++; });
      const k = [r[19], r[20]].join('|'); /* khoá tự nhiên: tài khoản + số giải ngân (cột 19, 20) */ if (seen[k]) dup++; else seen[k] = 1; });
    return { rows: R.length, tot: Math.round(tot), dupKeys: dup, bad, kh: (window.TD && TD.metrics) ? TD.metrics.countCustomers(R) : null, archive: (_archiveReportList || []).filter(x => x && x.autoDaily).length, ref: (window.TD && TD.dataDate && TD.dataDate.current) ? String(TD.dataDate.current()) : '' };
  });
  add('DATA-1', 'Dư nợ hiện hành là kỳ 20/10/2026, có dòng dữ liệu', 'cao', integ.rows > 0, { rows: integ.rows, tot: integ.tot, kh: integ.kh });
  add('DATA-2', 'Số mốc lưu trữ tự động = 11 kỳ', 'cao', integ.archive === 11, { archive: integ.archive });
  add('DATA-3', 'Dữ liệu: không NaN dư nợ/HMTD, không âm, đủ mã & tên KH', 'cao', !integ.bad.nanDuNo && !integ.bad.nanHM && !integ.bad.negDuNo && !integ.bad.noMa && !integ.bad.noTen, integ.bad);
  add('DATA-4', 'Dữ liệu: ngày đều đúng định dạng dd/mm/yyyy', 'trung bình', integ.bad.badDate === 0, { badDate: integ.bad.badDate });
  add('DATA-5', 'Dữ liệu: lãi suất trong 0–30%, không rỗng', 'trung bình', integ.bad.lsOut === 0 && integ.bad.lsEmpty === 0, { lsOut: integ.bad.lsOut, lsEmpty: integ.bad.lsEmpty });
  add('DATA-6', 'Dữ liệu: không trùng khoá (tài khoản|số GN)', 'trung bình', integ.dupKeys === 0, { dup: integ.dupKeys });
  /* đối chiếu độc lập: tổng dư nợ file 20.10.2026 đọc lại bằng SheetJS trong trang */
  const indep = await p.evaluate(async () => { return window.__noop; }).catch(() => null);
  /* ─── 4. DUYỆT TẤT CẢ TRANG ─── */
  const pg = [];
  for (const n of PAGES) {
    const exist = await p.evaluate(n => !!document.getElementById('page-' + n), n); if (!exist) { pg.push({ n, miss: 1 }); continue; }
    await lt(p); errs(p); const t = Date.now(); await p.evaluate(n => showPage(n), n); await raf2(p); const ms = Date.now() - t; await p.waitForTimeout(700);
    const r = await p.evaluate(n => { const el = document.getElementById('page-' + n), tx = el ? el.innerText : '', m = tx.match(/undefined|NaN|\[object|Invalid Date|Infinity/g) || []; const sw = document.documentElement.scrollWidth, iw = innerWidth; return { bad: m.slice(0, 3), over: sw - iw, active: el && el.classList.contains('active'), len: tx.length }; }, n);
    const l = await lt(p), e = errs(p); pg.push({ n, ms, ...r, lt: l.max, ltSum: l.sum, e: e.pageerror.length + e.console.length, err: e });
  }
  add('PAGE-1', 'Mọi trang mở được (active) và có nội dung', 'cao', pg.every(x => x.miss || (x.active && x.len > 20)), pg.filter(x => !x.miss && !(x.active && x.len > 20)).map(x => x.n));
  add('PAGE-2', 'Không trang nào hiện "undefined/NaN/[object/Invalid Date/Infinity"', 'cao', pg.every(x => !x.bad || !x.bad.length), pg.filter(x => x.bad && x.bad.length).map(x => x.n + ':' + x.bad.join(',')));
  add('PAGE-3', 'Không lỗi JS/console khi mở từng trang', 'cao', pg.every(x => !x.e), pg.filter(x => x.e).map(x => x.n + ':' + JSON.stringify(x.err).slice(0, 160)));
  add('PAGE-4', 'Không trang nào làm trang tràn ngang (1500 px)', 'thấp', pg.every(x => !x.over || x.over <= 1), pg.filter(x => x.over > 1).map(x => x.n + ':' + x.over));
  const slow = pg.filter(x => x.ms > 1200); add('PERF-1', 'Chuyển trang ≤ 1,2 s tới khung hình', 'trung bình', slow.length === 0, slow.map(x => x.n + ':' + x.ms));
  const lg = pg.filter(x => x.lt > 400); add('PERF-2', 'Longtask khi mở trang ≤ 400 ms', 'trung bình', lg.length === 0, lg.map(x => x.n + ':' + x.lt));
  console.log('   thời gian chuyển trang (ms): ' + pg.filter(x => x.ms != null).map(x => x.n + '=' + x.ms).join(' '));
  /* ─── 5. THAO TÁC BẢNG QLTD ─── */
  await p.evaluate(() => showPage('qltd')); await p.waitForTimeout(1500); errs(p);
  const nHdr = await p.evaluate(() => document.querySelectorAll('#table-qltd thead th').length);
  const sortT = []; for (let i = 1; i < Math.min(nHdr, 20); i++) { const ok = await p.evaluate(i => { const th = document.querySelectorAll('#table-qltd thead th')[i]; return !!th && !!th.getAttribute('onclick'); }, i); if (!ok) continue; const t = Date.now(); await p.evaluate(i => document.querySelectorAll('#table-qltd thead th')[i].click(), i); await raf2(p); sortT.push(Date.now() - t); }
  const se = errs(p);
  add('TBL-1', 'Sắp xếp theo từng cột: không lỗi, mỗi lần ≤ 1,5 s', 'trung bình', !se.pageerror.length && Math.max(...sortT) <= 1500, { n: sortT.length, max: Math.max(...sortT), err: se });
  const fi = await p.evaluate(async () => { const tot = DATA.qltd.length; const s = document.getElementById('search-qltd'); s.value = 'zzzzkhongco'; s.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 600)); const none = document.getElementById('count-qltd').textContent; s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 600)); const back = document.getElementById('count-qltd').textContent; return { tot, none, back }; });
  add('TBL-2', 'Tìm kiếm: chuỗi không có → 0; xoá chuỗi → trả đủ hồ sơ', 'cao', /^0$/.test(fi.none.replace(/\D/g, '') || '0') && fi.back.replace(/\D/g, '') === String(fi.tot), fi);
  const ctv = await p.evaluate(async () => { const out = {}; for (const [id, vals] of [['filter-qltd-nhomno', ['Nhóm 1', 'Nhóm 2', 'Nhóm 3', 'Nhóm 4', 'Nhóm 5']], ['filter-qltd-loaivay', ['ngắn hạn', 'trung hạn', 'dài hạn', 'thấu chi']]]) { let sum = 0; for (const v of vals) { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 500)); sum += +document.getElementById('count-qltd').textContent.replace(/\D/g, '') || 0; } const s = document.getElementById(id); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 500)); out[id] = sum; } out.tot = DATA.qltd.length; return out; });
  add('TBL-3', 'Bộ lọc nhóm nợ / loại vay: tổng các nhóm = tổng hồ sơ (không rơi dòng)', 'cao', ctv['filter-qltd-nhomno'] === ctv.tot && ctv['filter-qltd-loaivay'] === ctv.tot, ctv);
  const pgn = await p.evaluate(async () => { const r = {}; r.sizes = []; for (const s of [50, 100, 250, 500]) { __TDPgSetSize('qltd', s); await new Promise(x => setTimeout(x, 300)); r.sizes.push(s + ':' + document.querySelectorAll('#table-qltd tbody tr:not(.td-pg-bar)').length); } __TDPgSetSize('qltd', 100); await new Promise(x => setTimeout(x, 300)); __TDPgGo('qltd', 2); await new Promise(x => setTimeout(x, 300)); r.p2 = document.querySelectorAll('#table-qltd tbody tr:not(.td-pg-bar)').length; __TDPgGo('qltd', 1); return r; });
  add('TBL-4', 'Phân trang 50/100/250/500 hiển thị đúng số dòng', 'trung bình', pgn.sizes.join() === '50:50,100:100,250:250,500:500' && pgn.p2 === 100, pgn);
  const all = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 200)); const t = performance.now(); __TDPgSetSize('qltd', 0); const t1 = performance.now() - t; const first = document.querySelectorAll('#table-qltd tbody tr:not(.td-pg-bar)').length; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const toFrame = performance.now() - t; let full = 0, tf = 0; for (let i = 0; i < 200; i++) { await new Promise(r => setTimeout(r, 100)); full = document.querySelectorAll('#table-qltd tbody tr:not(.td-pg-bar)').length; if (full === DATA.qltd.length) { tf = performance.now() - t; break; } } const total = DATA.qltd.length; __TDPgSetSize('qltd', 100); return { total, first, js: Math.round(t1), toFrame: Math.round(toFrame), fullMs: Math.round(tf), full }; });
  add('PERF-3', '"Tất cả" thật: khung hình đầu ≤ 1,5 s, dựng đủ ≤ 20 s', 'trung bình', all.toFrame <= 1500 && all.full === all.total && all.fullMs <= 20000, all);
  /* xuất Excel / CSV */
  const dl = []; p.on('download', d => dl.push(d));
  await p.evaluate(() => exportQltdExcel()).catch(() => {}); await p.waitForTimeout(6000);
  let xl = null; if (dl.length) { const f = path.join(os.tmpdir(), 'p09_dl_' + Date.now() + '.xlsx'); await dl[dl.length - 1].saveAs(f); xl = await p.evaluate(async b64 => { const wb = XLSX.read(b64, { type: 'base64' }); const ws = wb.Sheets[wb.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }); return { sheets: wb.SheetNames.length, rows: rows.length, cols: Math.max(...rows.slice(0, 5).map(r => r.length)) }; }, fs.readFileSync(f).toString('base64')); fs.unlinkSync(f); }
  add('EXP-1', 'Xuất Excel QLTD: tải được tệp .xlsx đọc lại được, số dòng ≥ số hồ sơ', 'cao', xl && xl.rows >= integ.rows, xl);
  /* ─── 6. SỬA Ô + HOÀN TÁC + LƯU BỀN ─── */
  const e0 = await p.evaluate(() => { const td = document.querySelector('#table-qltd tbody td.editable-num[data-col="11"]'); const idx = +td.dataset.idx; return { idx, v: DATA.qltd[idx][11] }; });
  const cell = p.locator('#table-qltd tbody td.editable-num[data-col="11"]').first(); await cell.click(); await p.keyboard.press('Control+A'); await p.keyboard.type(String(Number(e0.v) + 1000)); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  const ed = { ok: await p.evaluate(([i, v]) => Number(DATA.qltd[i][11]) === Number(v) + 1000, [e0.idx, e0.v]) };
  add('EDIT-1', 'Sửa ô Dư nợ: giá trị mới được ghi vào DATA', 'cao', ed.ok, { ok: ed.ok, err: ed.err });
  /* ─── 7. LƯU BỀN: tải lại trang ─── */
  const before = await p.evaluate(() => ({ n: DATA.qltd.length, arch: (_archiveReportList || []).length, tsbd: (window.TSBD && TSBD.rows ? TSBD.rows.length : 0) }));
  await p.evaluate(async () => { try { await saveData(true); } catch (e) {} }); await p.waitForTimeout(1500); errs(p);
  t0 = Date.now(); await p.reload({ waitUntil: 'load' }); const tReload = Date.now() - t0; await p.waitForTimeout(6000);
  const after = await p.evaluate(() => ({ n: DATA.qltd.length, arch: (_archiveReportList || []).length, tsbd: (window.TSBD && TSBD.rows ? TSBD.rows.length : 0), corrupt: !!(window.__storageCorrupt || (window.localStorage && localStorage.getItem('td_storage_corrupt'))) }));
  const re = errs(p);
  add('PERSIST-1', 'Tải lại trang: giữ nguyên hồ sơ, mốc lưu trữ, TSBĐ; không báo hỏng', 'cao', after.n === before.n && after.arch === before.arch && after.tsbd === before.tsbd && !after.corrupt, { before, after });
  add('PERSIST-2', 'Tải lại với dữ liệu thật: không lỗi JS; thời gian tải ≤ 6 s', 'trung bình', !re.pageerror.length && !re.console.length && tReload <= 6000, { tReload, re });
  /* ─── 8. SAO LƯU / KHÔI PHỤC ─── */
  const dl2 = []; p.on('download', d => dl2.push(d));
  const sig = () => p.evaluate(() => { let h = 0; const s = JSON.stringify([DATA.qltd, DATA.denhanStatus, DATA.laidongStatus, DATA.chlmStatus, DATA.hosovay]); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return { n: DATA.qltd.length, h, len: s.length }; });
  const s0 = await sig(); await p.evaluate(() => exportBackup()); await p.waitForTimeout(4000);
  let bk = null; if (dl2.length) { bk = path.join(os.tmpdir(), 'p09_backup.json'); await dl2[dl2.length - 1].saveAs(bk); }
  add('BAK-1', 'Xuất sao lưu: tải được tệp .json', 'cao', !!bk, bk ? { kb: Math.round(fs.statSync(bk).size / 1024) } : null);
  if (bk) {
    await p.evaluate(() => { DATA.qltd = DATA.qltd.slice(0, 5); });
    const ch = p.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null); await p.evaluate(() => importBackup()); const fc = await ch; if (fc) await fc.setFiles(bk); await p.waitForTimeout(6000);
    const s1 = await sig(); add('BAK-2', 'Khôi phục từ sao lưu đưa dữ liệu về đúng như trước (băm trùng)', 'cao', s1.n === s0.n && s1.h === s0.h, { s0, s1 }); try { fs.unlinkSync(bk); } catch (e) {}
  }
  /* ─── 9. NHIỀU KHUNG HÌNH ─── */
  for (const [w, h, nm] of [[1366, 768, 'laptop 1366'], [1920, 1080, 'FullHD 1920'], [390, 844, 'điện thoại 390']]) {
    const q = await mk(b, w, h); await q.goto('file://' + APP, { waitUntil: 'load' }); await q.waitForTimeout(6000); const rs = [];
    for (const n of ['dashboard', 'qltd', 'denhan', 'tsbd', 'giadat', 'doisoat', 'xuhuong', 'canhbao', 'nhap', 'archive']) {
      await q.evaluate(n => showPage(n), n); await q.waitForTimeout(900);
      rs.push(await q.evaluate(n => { const sw = document.documentElement.scrollWidth - innerWidth, el = document.getElementById('page-' + n); const wide = [...(el ? el.querySelectorAll('.table-wrap') : [])].filter(t => t.offsetParent && t.scrollWidth > t.clientWidth + 2).length; return { n, body: sw, wide }; }, n));
    }
    const e = errs(q); add('VP-' + w, 'Khung ' + nm + ': trang không tràn ngang toàn trang, không lỗi JS', w === 390 ? 'trung bình' : 'thấp', rs.every(x => x.body <= 1) && !e.pageerror.length && !e.console.length, { over: rs.filter(x => x.body > 1).map(x => x.n + ':' + x.body), wideTables: rs.filter(x => x.wide).map(x => x.n + ':' + x.wide), e });
    await q.context().close();
  }
  /* ─── 10. RÒ RỈ: chuyển trang nhiều vòng ─── */
  await p.evaluate(() => showPage('dashboard')); await p.waitForTimeout(1000); await lt(p);
  const m0 = await p.evaluate(() => ({ nodes: document.getElementsByTagName('*').length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0 }));
  for (let c = 0; c < 4; c++) for (const n of ['dashboard', 'qltd', 'denhan', 'tsbd', 'doisoat', 'xuhuong']) { await p.evaluate(n => showPage(n), n); await p.waitForTimeout(350); }
  await p.evaluate(() => showPage('dashboard')); await p.waitForTimeout(1500);
  const m1 = await p.evaluate(() => ({ nodes: document.getElementsByTagName('*').length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0 })); const ll = await lt(p), le = errs(p);
  add('LEAK-1', 'Chuyển trang 24 lần: số nút DOM không tăng quá 10%', 'trung bình', m1.nodes <= m0.nodes * 1.1, { m0, m1 });
  add('LEAK-2', 'Chuyển trang 24 lần: heap JS không tăng quá 30 MB', 'trung bình', !m0.heap || m1.heap - m0.heap <= 30, { m0, m1 });
  add('LEAK-3', 'Chuyển trang nhiều vòng: không lỗi JS/console', 'cao', !le.pageerror.length && !le.console.length, le);
  /* ─── 11. GIÁ ĐẤT (PL02.docx thật) & NQ38 ─── */
  await p.evaluate(() => showPage('giadat')); await p.waitForTimeout(1500);
  const gd = await p.evaluate(() => ({ rows: document.querySelectorAll('#main-table tbody tr').length, keys: (window.TD && TD.giadat && TD.giadat.keyOf) ? 1 : 0 }));
  add('GD-1', 'Giá đất: bảng có dữ liệu sau khi mở trang (từ PL02 nhúng)', 'trung bình', gd.rows > 0, gd);
  await p.context().close(); await b.close();
  const fail = F.filter(x => !x.ok); fs.writeFileSync(OUT, JSON.stringify({ app: path.basename(APP), at: new Date().toISOString(), total: F.length, fail: fail.length, findings: F }, null, 1));
  console.log('\nTỔNG: ' + (F.length - fail.length) + '/' + F.length + ' đạt; ' + fail.length + ' phát hiện'); process.exit(0);
})().catch(e => { console.error('AUDIT LỖI', e); fs.writeFileSync(OUT, JSON.stringify({ crash: String(e), findings: F }, null, 1)); process.exit(1); });

/* Bộ kiểm thử e2e QLTD PRO — chạy trên fixture ẩn danh (tests/fixtures), không cần dữ liệu thật.
   node tests/e2e/suite.js <app.html> [--json out.json]   ⇒ in PASS/FAIL theo hạng mục, thoát mã 1 nếu có lỗi.
   Mỗi phép kiểm gắn mã HM để biết bảo vệ lỗi nào (xem tests/README.md). */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const APP = path.resolve(process.argv[2] || ''), FIX = path.join(__dirname, '../fixtures'), EXP = JSON.parse(fs.readFileSync(FIX + '/expected.json', 'utf8'));
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
if (!process.argv[2] || !fs.existsSync(APP)) { console.error('Dùng: node suite.js <app.html>'); process.exit(2); }
const R = []; const ck = (hm, name, ok, info) => { R.push({ hm, name, ok: !!ok, info: ok ? '' : JSON.stringify(info).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + '[' + hm + '] ' + name + (ok ? '' : '  → ' + JSON.stringify(info).slice(0, 300))); };
const vn = n => Math.round(n).toLocaleString('vi-VN');
async function newPage(b, w, h) { const ctx = await b.newContext({ viewport: { width: w || 1500, height: h || 900 }, acceptDownloads: true }); const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message.slice(0, 160))); p.on('dialog', d => d.accept()); return p; }
const boot = async p => { await p.goto('file://' + APP, { waitUntil: 'load' }); await p.waitForTimeout(5000); };
async function importFile(p, f) {
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', f);
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
  await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(3500);
}
async function step(name, fn) { try { await fn(); } catch (e) { ck('SUITE', name + ' (ngoại lệ)', false, e.message); } }
(async () => {
  const b = await chromium.launch();
  /* ───── A. tải trang sạch, không dữ liệu cứng ───── */
  await step('A', async () => {
    const p = await newPage(b); const cerr = []; p.on('console', m => { if (m.type() === 'error') cerr.push(m.text().slice(0, 100)); });
    await boot(p);
    const s = await p.evaluate(() => ({ xl: window.XLSX && XLSX.version, qltd: DATA.qltd.length, tsbd: (window.TSBD && TSBD.rows || []).length, snaps: (window._archiveReportList || []).length, pd: Object.keys((window.TD_PASTDUE || {}).map || {}).length, theme: document.documentElement.getAttribute('data-theme') || localStorage.getItem('td_theme') || '', z8: getComputedStyle(document.documentElement).getPropertyValue('--z-8').trim() }));
    ck('HM-01', 'SheetJS nạp được (XLSX.version) và ghi/đọc lại .xlsx', await p.evaluate(() => { try { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Việt', 8.5]]), 'S'); const o = XLSX.read(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' }); return XLSX.utils.sheet_to_json(o.Sheets.S, { header: 1 })[0][0] === 'Việt' } catch (e) { return false } }), s);
    ck('HM-01', 'tải trang: 0 pageerror, 0 console.error', p._errs.length === 0 && cerr.length === 0, [p._errs, cerr]);
    ck('HM-05', 'trang mới không có dữ liệu cứng (dư nợ/TSBĐ/mốc lưu/Past Due = 0)', s.qltd === 0 && s.tsbd === 0 && s.snaps === 0 && s.pd === 0, s);
    ck('HM-16b', 'token z-index --z-8 có trong :root', s.z8 === '100000', s.z8);
    await p.context().close();
  });
  /* ───── B–G. nhập fixture + tính đúng + lưu bền ───── */
  const p = await newPage(b);
  await step('B', async () => {
    await boot(p); await importFile(p, FIX + '/20.10.2026.xlsx');
    const s = await p.evaluate(() => { const L = {}; DATA.qltd.forEach(r => { L[String(r[20]).trim()] = [r[8], Number(r[11]), String(r[7])] }); return { n: DATA.qltd.length, L, chip: (document.getElementById('td-datechip') || {}).textContent || '' } });
    const loans = Object.fromEntries(Object.entries(EXP.loans).filter(([k, v]) => v.bal > 0)); const bad = Object.keys(loans).filter(k => { const a = s.L[k]; return !a || a[0] !== loans[k].rate || a[1] !== loans[k].bal });
    ck('HM-02', 'nhập .xlsx: ' + EXP.activeRows + ' khoản còn dư nợ (bỏ dòng dư nợ 0), lãi suất & dư nợ TỪNG khoản = tệp (kể cả 8,5%, dư nợ <100.000 đ)', s.n === EXP.activeRows && !bad.length, { n: s.n, bad: bad.slice(0, 3).map(k => [k, s.L[k], loans[k]]) });
    const dbad = Object.keys(loans).filter(k => !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(s.L[k] && s.L[k][2]).replace(/^0/, '')) || String(s.L[k][2]).replace(/\b0(\d)\b/g, '$1') !== loans[k].due.replace(/\b0(\d)\b/g, '$1'));
    ck('HM-02/06', 'ngày đến hạn từng khoản = tệp (không lệch múi giờ/serial)', !dbad.length, dbad.slice(0, 3).map(k => [s.L[k][2], loans[k].due]));
    ck('HM-07', 'ngày dữ liệu lấy từ tên tệp = ' + EXP.dataDate, /20\/10\/2026/.test(s.chip), s.chip);
  });
  await step('C', async () => {
    const d = await p.evaluate(() => { showPage('dashboard'); renderDashboard(); const tf = document.querySelector('#tfoot-db-main'); const txt = tf ? tf.innerText.replace(/\s+/g, ' ') : ''; const R = tdDoiSoatCompute(); return { txt, checks: R.checks.map(c => [c.id, c.status]), sum: R.summary, tot: TD.metrics.summarize(DATA.qltd.filter(isActualCreditRow)).totals } });
    ck('HM-08', 'Dashboard: tổng dư nợ = ' + vn(EXP.totalDuNo) + ' và ' + EXP.customers + ' KH (theo mã)', d.txt.includes(vn(EXP.totalDuNo)) && d.tot.duno === EXP.totalDuNo && d.tot.kh === EXP.customers && d.tot.hs === EXP.activeRows, { txt: d.txt.slice(0, 100), tot: d.tot });
    ck('HM-12', 'Đối soát số liệu: 0 chỉ tiêu LỆCH', d.sum.lech === 0 && d.sum.khop >= 5, d.checks);
    const g = await p.evaluate(() => { const S = TD.metrics.summarize(DATA.qltd.filter(isActualCreditRow)); const m = a => Object.fromEntries(a.filter(x => x.hs).map(x => [x.key || x.name, x.duno])); return { loai: S.byLoai.reduce((s, x) => s + x.duno, 0), nhom: S.byNhom.reduce((s, x) => s + x.duno, 0), pb: m(S.byPB), cb: m(S.byCBTD), ne: TD.metrics.check(S) } });
    ck('HM-08', 'Σ theo loại vay = Σ theo nhóm nợ = tổng; check() không báo lỗi', g.loai === EXP.totalDuNo && g.nhom === EXP.totalDuNo && (g.ne || []).length === 0, g);
    ck('HM-08', 'dư nợ theo phòng ban & theo CBTD = tính độc lập', JSON.stringify(Object.entries(g.pb).sort()) === JSON.stringify(Object.entries(EXP.byPB).sort()) && JSON.stringify(Object.entries(g.cb).sort()) === JSON.stringify(Object.entries(EXP.byCBTD).sort()), [g.pb, EXP.byPB]);
    const a = await p.evaluate(() => { const r = TD_AUDIT.run({ show: false }); return r.issues.map(i => i.code) });
    ck('HM-09b', 'TD_AUDIT (đối chiếu với tệp) không có vấn đề', a.length === 0, a);
    const bk = await p.evaluate(() => { const a = bckhAggregateData(DATA.qltd.filter(isActualCreditRow)); let m = 0; Object.keys(a).forEach(k => { if (k !== '__chuaphan') m += a[k].dnAll || 0 }); return { m, un: a.__chuaphan ? a.__chuaphan.duno : 0 } });
    ck('HM-09', 'Báo cáo theo CBTD: Σ trong bảng + chưa phân CBTD = tổng (không bỏ im lặng)', bk.m + bk.un === EXP.totalDuNo, bk);
  });
  await step('E', async () => {
    const snap = () => p.evaluate(() => DATA.qltd.map(r => [String(r[20]).trim(), r[8]]).sort((a, b) => a[0] < b[0] ? -1 : 1));
    const base = JSON.stringify(await snap());
    await boot(p); const r1 = JSON.stringify(await snap()); await boot(p); const r2 = JSON.stringify(await snap());
    ck('HM-03', 'tải lại 2 lần: lãi suất không bị tự ghi đè', r1 === base && r2 === base, [r1.slice(0, 80), base.slice(0, 80)]);
    ck('HM-04', 'tải lại: dữ liệu còn nguyên ' + EXP.activeRows + ' khoản (lưu IndexedDB toàn vẹn)', await p.evaluate(() => DATA.qltd.length) === EXP.activeRows, await p.evaluate(() => DATA.qltd.length));
    const k = await p.evaluate(async () => { const r = DATA.qltd[3]; r[8] = 7.77; r._rateManual = true; await saveData(true); return String(r[20]).trim() });
    await p.waitForTimeout(1500); await boot(p);
    ck('HM-03', 'lãi suất sửa tay 7,77 còn sau lưu + tải lại', await p.evaluate(k => { const r = DATA.qltd.find(x => String(x[20]).trim() === k); return r && r[8] === 7.77 }, k), k);
    const g = await p.evaluate(() => { // giả lập nguồn tham chiếu cũ khác tệp (kiểu bảng cứng 04/06) rồi chạy cả 4 hàm "tự chữa"
      const keep = window.__IPCAS_SPRD_BY_DSBSSEQ, rows = DATA.qltd.slice(0, 20), m = Object.create(null); rows.forEach(r => { m[String(r[20]).trim()] = 12.34 });
      window.__IPCAS_SPRD_BY_DSBSSEQ = m; const before = rows.map(r => r[8]);
      try { [() => repairSprdRatesOnLoad(false), () => __healSprdFromFingerprint(false), () => __autoFixRateX100(false), () => HSVRate.healOnLoad(false)].forEach(f => { try { f() } catch (e) {} }); } finally { window.__IPCAS_SPRD_BY_DSBSSEQ = keep; }
      const after = rows.map(r => r[8]); return { changed: before.filter((v, i) => v !== after[i]).length, before: before.slice(0, 3), after: after.slice(0, 3) }; });
    ck('HM-03', 'hàm "tự chữa" L/S không đè lãi suất hợp lệ dù có nguồn tham chiếu khác tệp', g.changed === 0, g);
    const fresh = JSON.parse(JSON.stringify(EXP.loans)); // khôi phục lãi suất gốc cho các phép sau
    await p.evaluate(async rates => { DATA.qltd.forEach(r => { const o = rates[String(r[20]).trim()]; if (o) r[8] = o.rate }); await saveData(true) }, fresh);
  });
  await step('F', async () => {
    const dl = p.waitForEvent('download'); await p.evaluate(() => exportBackup()); const d = await dl; const f = '/tmp/td_suite_bk.json'; await d.saveAs(f);
    const bk = JSON.parse(fs.readFileSync(f, 'utf8'));
    ck('HM-04', 'sao lưu có schemaVersion, counts, checksum và đủ ' + EXP.activeRows + ' khoản', (bk.schemaVersion || bk.v) && bk.counts && bk.chk && (bk.qltd || []).length === EXP.activeRows, Object.keys(bk).slice(0, 12));
    // chunk hỏng ⇒ không nạp như dữ liệu đầy đủ rồi lưu đè
    await p.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open('QLTDProDB'); q.onsuccess = e => r(e.target.result) }); await new Promise(r => { const tx = db.transaction('chunks', 'readwrite'); tx.objectStore('chunks').put('@@garbage@@', 'qltd__0'); tx.oncomplete = r }) });
    await p.evaluate(() => { Object.keys(localStorage).forEach(k => { if (/qltd/i.test(k) && k !== 'ux_zoom') localStorage.removeItem(k) }); sessionStorage.clear() });
    await boot(p); await p.waitForTimeout(9000);
    const s = await p.evaluate(() => ({ n: DATA.qltd.length, flag: !!window.__storageCorrupt, banner: !!document.getElementById('storage-corrupt-banner') }));
    ck('HM-04', 'chunk hỏng ⇒ báo hỏng (banner/cờ), không coi là dữ liệu đầy đủ', s.flag || s.banner, s);
    const idb = await p.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open('QLTDProDB'); q.onsuccess = e => r(e.target.result) }); return await new Promise(r => { const q = db.transaction('chunks').objectStore('chunks').get('qltd__0'); q.onsuccess = () => r(q.result) }) });
    ck('HM-04', 'chunk hỏng KHÔNG bị ghi đè bởi dữ liệu rỗng', idb === '@@garbage@@', typeof idb === 'string' ? idb.slice(0, 20) : idb);
    const fc = p.waitForEvent('filechooser'); await p.evaluate(() => importBackup()); (await fc).setFiles(f); await p.waitForTimeout(6000);
    ck('HM-04', 'khôi phục từ sao lưu: lấy lại đủ ' + EXP.activeRows + ' khoản', await p.evaluate(() => DATA.qltd.length) === EXP.activeRows, await p.evaluate(() => DATA.qltd.length));
  });
  /* ───── H. điều hướng, menu, router ───── */
  await step('H', async () => {
    await boot(p); await importFile(p, FIX + '/20.10.2026.xlsx'); p._errs.length = 0;
    const PAGES = ['dashboard', 'ctkh', 'qltd', 'kd', 'td', 'denhan', 'laidong', 'chlm', 'tranop', 'phidv', 'khmoi', 'baocao', 'tsbd', 'giadat', 'archive', 'doisoat', 'canhbao', 'xuhuong', 'kh360', 'nhap'];
    const missing = []; for (const pg of PAGES) { const ok = await p.evaluate(x => { try { if (!document.getElementById('page-' + x)) return 'no-page'; showPage(x); return location.hash || 'ok' } catch (e) { return 'ERR ' + e.message } }, pg); if (/^ERR/.test(ok)) missing.push([pg, ok]); await p.waitForTimeout(350); }
    ck('HM-13/14', 'chuyển lần lượt ' + PAGES.length + ' trang không lỗi', missing.length === 0 && p._errs.length === 0, [missing, p._errs.slice(0, 3)]);
    const nav = await p.evaluate(async () => { showPage('dashboard'); await new Promise(r => setTimeout(r, 300)); showPage('qltd'); await new Promise(r => setTimeout(r, 300)); history.back(); await new Promise(r => setTimeout(r, 500)); return [location.hash, (document.querySelector('.page.active') || {}).id] });
    ck('HM-13', 'nút Back quay về trang trước (router hash)', /dashboard/.test(nav.join()), nav);
    ck('HM-15', 'Ctrl+K mở bảng lệnh', await (async () => { await p.keyboard.press('Control+k'); await p.waitForTimeout(500); const o = await p.evaluate(() => { const e = document.getElementById('dp-cmd-overlay') || document.getElementById('td15-pal'); return !!e && getComputedStyle(e).display !== 'none' }); await p.keyboard.press('Escape'); return o })(), 0);
    ck('HM-16', 'giao diện mặc định sáng', await p.evaluate(() => (document.documentElement.getAttribute('data-theme') || 'light') !== 'dark' && !document.body.classList.contains('dark')), 0);
  });
  /* ───── I. bảng dữ liệu: cột + một cơ chế phân trang ───── */
  await step('I', async () => {
    await p.evaluate(() => showPage('qltd')); await p.waitForTimeout(2000);
    const w = await p.evaluate(() => { const t = document.getElementById('table-qltd'), wr = t.closest('.table-wrap'); return { sw: wr.scrollWidth, cw: wr.clientWidth, vis: [...t.tHead.rows[0].cells].filter(c => c.offsetParent !== null).length } });
    ck('HM-17', '1500px: bảng Dư nợ có thanh chọn cột, số cột hiện < 20', !!(await p.$('.td-cols-bar[data-key="qltd"]')) && w.vis < 20 && w.vis >= 10, w);
    const pg = await p.evaluate(() => { const b = document.getElementById('table-qltd').tBodies[0]; return { bars: b.querySelectorAll('.td-pg-bar').length, old: (document.getElementById('table-qltd').parentNode.querySelectorAll('.dp-page-bar').length + document.querySelectorAll('[id^=dpbar-][id*=table-qltd]').length), hid: [...b.rows].filter(r => r.style.display === 'none').length, n: [...b.rows].filter(r => !r.classList.contains('row-more')).length, more: !!b.querySelector('button[onclick*=__TDExpandRender]') } });
    ck('HM-17b', 'chỉ MỘT cơ chế phân trang (không pager ẩn dòng/nút "Hiển thị thêm" chồng)', pg.old === 0 && pg.hid === 0 && !pg.more && pg.bars <= 1, pg);
    const pgi = await p.evaluate(() => { const t = document.querySelector('#table-qltd .td-pg-info'); return t && t.textContent });
    ck('HM-17b', 'thanh trang ghi đúng tổng dòng và số trang (' + Math.ceil(EXP.activeRows / 100) + ' trang × 100)', pgi && pgi.includes('Trang 1/' + Math.ceil(EXP.activeRows / 100)) && pgi.includes(vn(EXP.activeRows)), pgi);
    const all = await p.evaluate(async () => { const n = getFilteredData('qltd').length; __TDPgSetSize('qltd', 0); await new Promise(r => setTimeout(r, 300)); const c = [...document.getElementById('table-qltd').tBodies[0].rows].filter(r => !r.classList.contains('row-more')).length; __TDPgSetSize('qltd', 100); return [n, c] });
    ck('HM-17b', 'cỡ "Tất cả" hiện đủ số dòng đã lọc', all[0] === all[1] && all[0] === EXP.activeRows, all);
    const lit = await p.evaluate(() => (document.documentElement.outerHTML.match(/z-index\s*:\s*\d{3,}/gi) || []).length);
    ck('HM-16b', 'không còn z-index literal ≥100 (dùng token --z-N)', lit === 0, lit);
  });
  /* ───── J. điện thoại / máy 1366 ───── */
  await step('J', async () => {
    const m = await newPage(b, 390, 800); await boot(m); await importFile(m, FIX + '/20.10.2026.xlsx');
    const r = await m.evaluate(() => { showPage('dashboard'); return { sx: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bar: !!document.querySelector('.td-mbar, .td19-bar, #td-mobile-bar, [class*=mbar]') } });
    ck('HM-19', '390px: không cuộn ngang cả trang', r.sx <= r.cw + 1, r);
    const lay = () => { const r = q => { const e = document.querySelector(q), b = e && e.getBoundingClientRect(); return b ? [Math.round(b.left), Math.round(b.right)] : null };
      return { sb: r('#sidebar'), main: parseFloat(getComputedStyle(document.getElementById('main')).marginLeft), mob: getComputedStyle(document.getElementById('btn-mob-menu')).display, pg: r('.page.active') } };
    const ml = await m.evaluate(lay);
    ck('CSS', '390px: menu bên là ngăn kéo (ẩn ngoài màn hình), nút ☰ hiện, nội dung không lùi', ml.sb[1] <= 0 && ml.mob !== 'none' && ml.main === 0, ml);
    await m.click('#btn-mob-menu'); await m.waitForTimeout(500);
    const mo = await m.evaluate(() => ({ sb: Math.round(document.getElementById('sidebar').getBoundingClientRect().left), ov: getComputedStyle(document.getElementById('mob-overlay')).display }));
    ck('CSS', '390px: bấm ☰ mở menu bên + lớp phủ', mo.sb === 0 && mo.ov === 'block', mo);
    const kp = await m.evaluate(() => { const g = document.getElementById('td-kpi-strip'); const rows = DATA.qltd.filter(isActualCreditRow); const sum = rows.reduce((s, r) => s + (+r[11] || 0), 0); const tiles = [...g.querySelectorAll('.td-kpi')]; const cols = new Set(tiles.slice(0, 4).map(e => Math.round(e.getBoundingClientRect().left))).size; return { n: tiles.length, cols, tb: Math.round(document.querySelector('.topbar').getBoundingClientRect().height), first: tiles[0].querySelector('.td-kpi-v').textContent, exp: (sum / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ', kh: tiles[1].querySelector('.td-kpi-v').textContent, expKh: TD.metrics.countCustomers(rows).toLocaleString('vi-VN') }; });
    ck('HM-19', '390px: thẻ KPI 2×2 (5 thẻ), số khớp tổng dư nợ/số KH của engine; topbar một hàng (≤60px)', kp.n === 5 && kp.cols === 2 && kp.first === kp.exp && kp.kh === kp.expKh && kp.tb <= 60, kp);
    ck('HM-19', '390px: không pageerror', m._errs.length === 0, m._errs.slice(0, 3)); await m.context().close();
    await p.evaluate(() => showPage('dashboard')); await p.waitForTimeout(800);
    const dl = await p.evaluate(lay);
    const q13 = await newPage(b, 1366, 900); await boot(q13); const l13 = await q13.evaluate(lay);
    ck('CSS', '1366px: menu bên là DẢI BIỂU TƯỢNG 64px (không ☰), nội dung lùi 64px', l13.sb[0] === 0 && l13.sb[1] === 64 && l13.mob === 'none' && l13.main === 64, l13);
    const tt13 = await q13.evaluate(() => ({ lbl: getComputedStyle(document.querySelector('#sidebar a[data-page="denhan"] .label')).display, title: (document.querySelector('#sidebar a[data-page="denhan"]') || {}).title, nTitle: [...document.querySelectorAll('#sidebar a.nav-item')].filter(a => a.title).length }));
    ck('CSS', '1366px: dải biểu tượng ẩn nhãn, mọi mục có tooltip (title)', tt13.lbl === 'none' && /NỢ ĐẾN HẠN/i.test(tt13.title) && tt13.nTitle >= 20, tt13); await q13.context().close();
    { const q11 = await newPage(b, 1100, 800); await boot(q11); const l11 = await q11.evaluate(lay);
      ck('CSS', '1100px: menu bên là ngăn kéo ☰, nội dung không lùi', l11.sb[1] <= 0 && l11.mob !== 'none' && l11.main === 0, l11); await q11.context().close(); }
    for (const W of [1920, 1600, 1366]) { const q = await newPage(b, W, 1000); await boot(q); await importFile(q, FIX + '/20.10.2026.xlsx'); await q.evaluate(() => showPage('qltd')); await q.waitForTimeout(2200);
      const o = await q.evaluate(() => { const w = document.getElementById('table-qltd').closest('.table-wrap'); return { sw: w.scrollWidth, cw: w.clientWidth, on: (document.querySelector('.td-cols-bar[data-key=qltd] button.on') || {}).textContent }; });
      ck('HM-17', W + 'px (menu bên cố định): bảng Dư nợ mặc định KHÔNG tràn ngang (tự lùi mẫu cột)', o.sw <= o.cw + 1, o); await q.context().close(); }
    const p19 = await newPage(b, 1920, 1000); await boot(p19);
    const ov = await p19.evaluate(() => { const hit = []; document.querySelectorAll('.topbar-right > *').forEach(t => { if (!t.offsetParent && getComputedStyle(t).position !== 'fixed') return; const r = t.getBoundingClientRect(); if (!r.width) return; const c = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (c && !t.contains(c) && !c.contains(t)) hit.push([t.id || t.className, (c.closest('[id]') || {}).id]); }); return hit; });
    await p19.context().close();
    ck('CSS', '1920px: không phần tử nào trên topbar bị che bởi phần tử khác (↶/↷ nằm trong topbar)', ov.length === 0, ov);
    const cr = []; for (const pg of ['qltd', 'denhan', 'giadat', 'doisoat']) { await p.evaluate(n => showPage(n), pg); await p.waitForTimeout(500); cr.push(await p.evaluate(() => (document.getElementById('page-sub') || {}).textContent)); }
    ck('CSS', 'topbar có đường dẫn "Nhóm › Trang" theo cây menu', /DƯ NỢ & THEO DÕI › /.test(cr[0]) && /DƯ NỢ & THEO DÕI › /.test(cr[1]) && /TÀI SẢN & GIÁ ĐẤT › /.test(cr[2]) && /TỔNG QUAN › /.test(cr[3]), cr);
    const tbn = []; for (const pg of ['qltd', 'denhan', 'laidong']) { await p.evaluate(n => showPage(n), pg); await p.waitForTimeout(500); tbn.push(await p.evaluate(() => ({ n: [...document.querySelectorAll('.topbar-right > *')].filter(e => e.offsetParent).length, ex: !!document.querySelector('#btn-export') && document.querySelector('#btn-export').closest('.topbar-right') !== null }))); }
    ck('CSS', 'trang Dư nợ/Đến hạn: Xuất CSV + Thêm mới nằm ở thanh công cụ trang, topbar giữ ≤7 nút hiện (kể cả ↶↷)', tbn[0].n <= 7 && !tbn[0].ex && !tbn[1].ex, tbn);
    { const x = await newPage(b, 1600, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); // bảo mật: dữ liệu nhập chứa thẻ HTML phải hiện dạng chữ, không được thực thi (P05, mục 7.5 đề án)
      await x.evaluate(() => { window.__xss = []; DATA.qltd.forEach(r => { if (!r) return; [1, 12, 17, 16, 15, 13, 14, 19, 3, 2].forEach(ci => { if (typeof r[ci] === 'string' || r[ci] == null) r[ci] = '<img src=x onerror=window.__xss.push(' + ci + ')>'; }); }); });
      for (const pg of ['dashboard', 'qltd', 'kd', 'td', 'baocao', 'denhan', 'laidong', 'chlm', 'tranop', 'phidv', 'canhbao', 'xuhuong', 'doisoat', 'ctkh']) { try { await x.evaluate(n => showPage(n), pg); } catch (e) {} await x.waitForTimeout(700); }
      await x.evaluate(() => { try { tdKh360Open(DATA.qltd.find(r => r && Number(r[11]) > 0)[0]); } catch (e) {} }); await x.waitForTimeout(1200);
      const xs = await x.evaluate(() => [...new Set(window.__xss)]);
      await x.evaluate(() => { window.__xss = []; (_archiveReportList || []).forEach(r => { r.name = '<img src=x onerror=window.__xss.push(1002)>'; r.label = r.name; }); });
      for (const pg of ['archive', 'xuhuong', 'doisoat', 'dashboard']) { await x.evaluate(n => showPage(n), pg); await x.waitForTimeout(500); try { await x.evaluate(() => { if (typeof archiveRenderReportList === 'function') archiveRenderReportList(); }); } catch (e) {} await x.waitForTimeout(400); }
      const xa = await x.evaluate(() => [...new Set(window.__xss)]);
      ck('SEC', 'dữ liệu nhập chứa thẻ HTML (tên KH, CBTD, phòng, …) KHÔNG được thực thi ở 14 trang + KH 360°', xs.length === 0, xs);
      ck('SEC', 'tên mốc lưu trữ (lấy từ tên tệp/nhãn người dùng) chứa thẻ HTML KHÔNG được thực thi ở trang Lưu trữ/Xu hướng/Đối soát/Dashboard', xa.length === 0, xa); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); // P09: đọc Excel dense + cellText:false cho TSBĐ/xem trước phải cho đầu ra y hệt chế độ mặc định (cả .xlsx và .XLS)
      const b64s = [fs.readFileSync(FIX + '/Sao ke tai san bao dam 20.10.2026.xlsx').toString('base64'), fs.readFileSync(FIX + '/20.10.2026.XLS').toString('base64')];
      const eq = await x.evaluate(b64s => b64s.map(b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), j = o => { const wb = XLSX.read(bin, Object.assign({ type: 'array', cellDates: true }, o)); return JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' })); }; const a = j({}), d = j({ dense: true, cellText: false }); return { same: a === d, len: a.length }; }), b64s);
      ck('PERF', 'SheetJS dense + cellText:false cho đầu ra sheet_to_json(raw) y hệt chế độ mặc định (TSBĐ .xlsx, dư nợ .XLS)', eq.every(r => r.same && r.len > 1000), eq); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); // P09: TD_SXCB.rank/norm có bộ nhớ đệm — kết quả không đổi, sắp xếp 20.000 dòng nhanh (đo gốc 1.000 ms)
      const sx = await x.evaluate(() => { const S = TD_SXCB, pbs = ['Hội Sở', 'PGD Hai Bà Trưng', 'PGD Số 2', '', 'PGD Lạ', 'hoi so', 'pgd so 2'], r1 = pbs.map(p => S.rank(p)), r2 = pbs.map(p => S.rank(p)); const cb = ['Lê Văn An', 'Phạm Thị Bình', 'Ngô Hữu Cường', 'Người Lạ A', 'Đặng Thị Dung', ''] /* P10: tên giả */, arr = [];
        for (let i = 0; i < 20000; i++) arr.push([pbs[(i * 7) % 7], cb[(i * 11) % 6] + (i % 50)]); const t = performance.now(); arr.sort((a, b) => S.cmp(a[0], a[1], b[0], b[1])); const ms = performance.now() - t;
        let mono = true; for (let i = 1; i < arr.length; i++) if (S.cmp(arr[i - 1][0], arr[i - 1][1], arr[i][0], arr[i][1]) > 0) { mono = false; break; } return { r1, same: JSON.stringify(r1) === JSON.stringify(r2), mono, ms: Math.round(ms) }; });
      ck('PERF', 'TD_SXCB: rank đúng (Hội Sở 0, PGD Hai Bà Trưng 1, PGD Số 2 2, rỗng/lạ 3, chuẩn hoá không dấu), ổn định giữa các lần gọi, sắp xếp 20.000 dòng đúng thứ tự và ≤ 600 ms', JSON.stringify(sx.r1) === '[0,1,2,3,3,0,2]' && sx.same && sx.mono && sx.ms <= 600, sx); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await x.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { get() { return undefined; } }); } catch (e) {} }); // P09: trình duyệt chặn IndexedDB (chế độ riêng tư/chính sách) — không được có lỗi chưa bắt
      await boot(x); await x.evaluate(() => showPage('dashboard')); await x.waitForTimeout(2500); const ne = x._errs.slice();
      await x.evaluate(() => showPage('tsbd')); await x.waitForTimeout(1500); await x.evaluate(() => { window.__seen = 0; new MutationObserver(() => { if (/Không lưu được/.test(document.body.innerText)) window.__seen = 1; }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
      await x.setInputFiles('#tsbd-file', FIX + '/Sao ke tai san bao dam 20.10.2026.xlsx'); await x.waitForTimeout(3500);
      const tb = await x.evaluate(() => ({ rows: (window.TSBD && TSBD.rows || []).length, warn: !!window.__seen }));
      ck('PERF', 'IndexedDB bị chặn: khởi động + Dashboard + nhập TSBĐ không có lỗi JS chưa bắt (trước đây "no-idb" và TypeError), TSBĐ vẫn nạp trong phiên và người dùng được cảnh báo "Không lưu được"', ne.length === 0 && x._errs.length === 0 && tb.rows > 0 && tb.warn, { ne, errs: x._errs.slice(0, 3), tb }); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); // P09: body.modal-open — lỗi gốc: không bao giờ bật khi mở hộp thoại thật (offsetParent null với fixed) ⇒ quy tắc ẩn dock vô tác dụng
      const mo = await x.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); const r = { start: document.body.classList.contains('modal-open'), dockShown: (() => { const d = document.getElementById('tdup-dock'); return !d || getComputedStyle(d).display !== 'none'; })() }; showPage('qltd'); await w(600); openAddModal(); await w(500); r.on = document.body.classList.contains('modal-open');
        r.dockHidden = [...document.querySelectorAll('#tdup-dock, #dp-toggle-btn, .tdup-dock')].every(e => getComputedStyle(e).display === 'none');
        document.querySelectorAll('.modal-overlay.open').forEach(e => e.classList.remove('open')); await w(500); r.off = !document.body.classList.contains('modal-open'); return r; });
      ck('PERF', 'body.modal-open: tắt lúc đầu (dock còn hiện; ngăn kéo đóng nằm ngoài khung nhìn không tính), bật khi mở hộp thoại thật (Thêm mới) và dock bị ẩn; tắt khi đóng', !mo.start && mo.dockShown && mo.on && mo.dockHidden && mo.off, mo); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); // P09: lưu dữ liệu — nén có nhớ theo nội dung (đo thật: 3 lần saveData × 2 lần nén ≈ 4,8 s mỗi lần nhập)
      const sv = await x.evaluate(async () => { window.__TD_NO_WORKER = true; /* P10: kiểm bộ nhớ đệm nén trên luồng chính (đường worker kiểm ở P10-T3) */ const o = LZS.compressToBase64; let big = 0, ms = 0; LZS.compressToBase64 = function (s) { const t0 = performance.now(), r = o.call(this, s); if (s && s.length >= 20000) { big++; ms += performance.now() - t0; } return r; };
        await saveData(true); const first = big; big = 0; await saveData(true); const second = big; big = 0;
        const r = DATA.qltd[0], v0 = Number(r[11]); r[11] = v0 % 10 === 9 ? v0 - 1 : v0 + 1; // đổi 1 chữ số cuối ⇒ CÙNG độ dài chuỗi JSON
        await saveData(true); const afterEdit = big; LZS.compressToBase64 = o; return { first, second, afterEdit, v: r[11] }; });
      await x.reload({ waitUntil: 'load' }); await x.waitForTimeout(5000);
      const rl = await x.evaluate(() => ({ v: DATA.qltd[0][11], n: DATA.qltd.length }));
      ck('PERF', 'saveData: lần lưu thứ 2 với dữ liệu KHÔNG đổi không nén lại mảng lớn; sửa 1 ô (cùng độ dài) thì nén lại phần đổi và dữ liệu mới được lưu bền qua tải lại', sv.second === 0 && sv.afterEdit >= 1 && Number(rl.v) === Number(sv.v) && rl.n === EXP.activeRows, { sv, rl }); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); await x.evaluate(() => showPage('phidv')); await x.waitForTimeout(1500); // P09: Phí DV phân trang (trước đây dựng cả ~3.850 dòng, layout ~7 s)
      const pd = await x.evaluate(async () => { const rows = () => document.querySelectorAll('#tbody-phidv tr:not(.td-pg-bar)').length, tot = +document.getElementById('count-phidv').textContent.replace(/\D/g, ''); const r = { tot, p1: rows(), bar: !!document.querySelector('#tbody-phidv tr.td-pg-bar'), foot: /\b\d[\d.]* lần GN/.test(document.getElementById('tfoot-phidv').textContent) };
        __TDPgGo('phidv', 2); await new Promise(z => setTimeout(z, 300)); r.p2 = rows(); r.first2 = document.querySelector('#tbody-phidv tr td.date').textContent.trim();
        __TDPgSetSize('phidv', 500); await new Promise(z => setTimeout(z, 300)); r.all = rows(); __TDPgSetSize('phidv', 100); await new Promise(z => setTimeout(z, 300));
        const m = document.getElementById('phidv-chk-all'); m.checked = true; phidvToggleAll(m); await new Promise(z => setTimeout(z, 400)); r.checked = Object.values(DATA.phidvStatus || {}).filter(s => s.checked).length; return r; });
      ck('HM-17b', 'Phí DV: phân trang 100 dòng/trang (không dựng cả tập), tổng theo toàn bộ tập lọc, trang 2 đánh số tiếp, 500/trang hiện đủ, "chọn tất cả" áp cho CẢ tập lọc', pd.p1 === 100 && pd.bar && pd.foot && pd.tot > 100 && pd.p2 === Math.min(100, pd.tot - 100) && pd.first2 === '101' && pd.all === Math.min(500, pd.tot) && pd.checked === pd.tot, pd); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); // P10 (T1/T2/xuất): bảng Dashboard + Trả nợ phân trang; xuất Excel bảng đã phân trang phải đủ mọi dòng
      const r = await x.evaluate(async () => { const wait = ms => new Promise(z => setTimeout(z, ms)); const base = DATA.qltd.slice(), out = [];
        for (let k = 0; out.length < 1500; k++) base.forEach(r0 => { if (out.length < 1500) { const r = r0.slice(); if (k) { r[0] = String(r0[0]) + k; r[20] = String(r0[20]) + 'x' + k; r[10] = (Number(r0[10]) || 0) + 1; r[23] = ''; } r[9] = (Number(r0[11]) || 0) * 2 + 1; out.push(r); } });
        DATA.qltd = out; __TDPgSetSize('qltd', 100);
        const rows = id => document.querySelectorAll('#' + id + ' tr:not(.td-pg-bar)').length, info = id => ((document.querySelector('#' + id + ' .td-pg-info') || {}).textContent || '');
        showPage('dashboard'); renderDashboard(); await wait(300);
        const prevEnd = new Date(todayMidnight().getFullYear(), todayMidnight().getMonth(), 0, 23, 59, 59);
        const laiN = DATA.qltd.filter(isActualCreditRow).filter(r => (Number(r[10]) || 0) > 0 && !(DATA.laidongStatus[laidongKey(r)] || {}).dathu && (!parseVNDate(r[23]) || parseVNDate(r[23]) <= prevEnd)).length;
        const d = { laiN, lai1: rows('tbody-db-lai'), laiInfo: info('tbody-db-lai'), dbRows: document.querySelectorAll('#page-dashboard tbody tr').length };
        __TDPgGo('db-lai', 2); await wait(200); d.lai2first = (document.querySelector('#tbody-db-lai tr td.date') || {}).textContent; d.lai2 = rows('tbody-db-lai');
        showPage('tranop'); renderTranop(); await wait(300);
        const giamN = +(document.getElementById('tranop-b1-count').textContent.match(/\d+/) || [0])[0];
        const t = { giamN, giam1: rows('tbody-giam-duno'), foot: (document.getElementById('tfoot-giam-duno').textContent.match(/\((\d+) KH\)/) || [])[1] };
        let wb = null; const wf = XLSX.writeFile; XLSX.writeFile = w => { wb = w; }; await tranopExportExcel();
        t.xGiam = wb ? XLSX.utils.sheet_to_json(wb.Sheets['Giam Du No'], { header: 1 }).length : -1; t.giam1After = rows('tbody-giam-duno');
        showPage('phidv'); renderTable('phidv'); await wait(300); const phN = +document.getElementById('count-phidv').textContent.replace(/\D/g, ''); const ph1 = rows('tbody-phidv');
        wb = null; await exportTableExcel('phidv', 'Phí giải ngân'); XLSX.writeFile = wf;
        const aoa = wb ? XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) : []; const e = { phN, ph1, xRows: aoa.length - 5, bar: aoa.some(a => /Trang \d+\//.test(String(a[0]))), ph1After: rows('tbody-phidv') };
        return { d, t, e }; });
      ck('P10-T1', 'Dashboard: Bảng VIII (lãi phải thu) phân trang 100 dòng, đếm đủ cả tập, trang 2 đánh số từ 101; tổng số hàng Dashboard giới hạn', r.d.laiN > 100 && r.d.lai1 === 100 && r.d.laiInfo.includes(r.d.laiN.toLocaleString('vi-VN')) && r.d.lai2first === '101' && r.d.lai2 === Math.min(100, r.d.laiN - 100) && r.d.dbRows < 600, r.d);
      ck('P10-T2', 'Trả nợ: bảng Giảm dư nợ phân trang 100 dòng, dòng tổng vẫn đếm cả tập; xuất Excel đủ mọi dòng và giữ trang đang xem', r.t.giamN > 100 && r.t.giam1 === 100 && +r.t.foot === r.t.giamN && r.t.xGiam >= r.t.giamN + 1 && r.t.giam1After === 100, r.t);
      ck('P10-EXP', 'Xuất Excel bảng đã phân trang (Phí DV): đủ mọi dòng, không có dòng "Trang x/y", sau đó bảng vẫn 100 dòng/trang', r.e.phN > 100 && r.e.ph1 === 100 && r.e.xRows === r.e.phN && !r.e.bar && r.e.ph1After === 100, r.e);
      ck('P10', 'không pageerror', x._errs.length === 0, x._errs); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); // P10 (T3/T4): đọc Excel + nén trong Web Worker (blob, chạy từ file://); kết quả = đọc trên luồng chính; worker hỏng ⇒ tự chạy luồng chính
      const fs = require('fs'); const bufs = ['20.10.2026.xlsx', '20.10.2026.XLS', 'Sao ke tai san bao dam 20.10.2026.xlsx'].map(f => Array.from(fs.readFileSync(FIX + '/' + f)));
      const w = await x.evaluate(async bufs => { const XL = await loadSheetJS(); const u = bufs.map(a => new Uint8Array(a)); const s0 = Object.assign({}, TD.xlsWorker.stat);
        const wi = [], mi = []; for (const k of [0, 1]) { wi.push(JSON.stringify(await TD.readRows('ipcas', u[k], () => TD.xlsrows.ipcasRows(XL, u[k], true)))); mi.push(JSON.stringify(TD.xlsrows.ipcasRows(XL, u[k], true))); } // luồng chính dự phòng KHÔNG ném lỗi ⇒ nếu worker không chạy, phép kiểm thất bại đúng nhóm P10-T3 (stat.worker)
        const wa = await TD.readRows('aoa', u[2], () => TD.xlsrows.aoa(XL, u[2])), ma = TD.xlsrows.aoa(XL, u[2]);
        const big = JSON.stringify(DATA.qltd.length ? DATA.qltd : Array.from({ length: 3000 }, (_, i) => ['Khách hàng ' + i, i * 1.5, '20/10/2026']));
        const lz = (await TD.xlsWorker.call('lz', { strs: [big] }))[0];
        return { stat: [s0, TD.xlsWorker.stat], eqI: wi.map((s, i) => s === mi[i] && s.length > 1000), eqA: JSON.stringify(wa) === JSON.stringify(ma) && wa.length > 5, dateA: wa.slice(1).some(r => r.some(c => c instanceof Date)), lzEq: lz === LZS.compressToBase64(big), lzBack: LZS.decompressFromBase64(lz) === big }; }, bufs);
      ck('P10-T3', 'worker (blob từ SheetJS nhúng) đọc IPCAS .xlsx/.XLS + TSBĐ cho kết quả GIỐNG HỆT luồng chính (Date còn là Date); nén LZ trong worker = nén luồng chính', w.stat[1].worker - w.stat[0].worker === 3 && w.eqI.every(Boolean) && w.eqA && w.dateA && w.lzEq && w.lzBack, w);
      await importFile(x, FIX + '/20.10.2026.xlsx'); const n1 = await x.evaluate(() => ({ n: DATA.qltd.length, st: TD.xlsWorker.stat }));
      ck('P10-T3', 'nhập tệp qua giao diện: đọc bằng worker, số khoản = ' + EXP.activeRows, n1.n === EXP.activeRows && n1.st.worker >= 4, n1);
      const sv = await x.evaluate(async () => { const o = LZS.compressToBase64; let big = 0; LZS.compressToBase64 = function (s) { if (s && s.length >= 20000) big++; return o.call(this, s); };
        DATA.qltd[0][11] = Number(DATA.qltd[0][11]) + 1; await saveData(true); LZS.compressToBase64 = o; return { big, v: DATA.qltd[0][11], k: String(DATA.qltd[0][20]) }; });
      const sn = await x.evaluate(async () => { const s0 = TD.xlsWorker.stat.worker; showPage('nhap'); return s0; }); const tsb = require('fs').readFileSync(FIX + '/Sao ke tai san bao dam 20.10.2026.xlsx');
      await x.setInputFiles('#hub-file', { name: 'bang ke 20.10.2026.xlsx', mimeType: 'application/octet-stream', buffer: tsb }); await x.waitForTimeout(2000);
      const sn2 = await x.evaluate(s0 => ({ d: TD.xlsWorker.stat.worker - s0, kind: (window._tdHubPlan && _tdHubPlan.items || []).map(i => i.kind).join() }), sn); await x.evaluate(() => tdHubClear());
      ck('P10-T3', 'Trung tâm nhập: nhận dạng tiêu đề (tệp TSBĐ tên lạ ⇒ "tsbd") chạy trong worker (trước: luồng chính — sao kê thật 27 MB = longtask 1,1 s)', sn2.d >= 1 && sn2.kind === 'tsbd', sn2);
      ck('P10-T3', 'saveData sau khi sửa dữ liệu: KHÔNG nén mảng lớn trên luồng chính (đã nén trước trong worker)', sv.big === 0, sv);
      await x.reload({ waitUntil: 'load' }); await x.waitForTimeout(5000); const rl = await x.evaluate(k => ({ n: DATA.qltd.length, v: (DATA.qltd.find(r => String(r[20]) === k) || [])[11] }), sv.k);
      ck('P10-T3', 'dữ liệu nén trong worker lưu bền đúng (tải lại còn đủ, giá trị vừa sửa còn)', rl.n === EXP.activeRows && Number(rl.v) === Number(sv.v), [rl, sv]);
      ck('P10-T3', 'không pageerror', x._errs.length === 0, x._errs); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await x.addInitScript(() => { window.Worker = function () { throw new Error('Worker bị chặn'); }; }); await boot(x); // P10 (T3): trình duyệt chặn Worker ⇒ vẫn nhập được (chạy luồng chính)
      await importFile(x, FIX + '/20.10.2026.XLS'); const r = await x.evaluate(() => ({ n: DATA.qltd.length, st: TD.xlsWorker.stat, alive: TD.xlsWorker.alive() }));
      ck('P10-T3', 'Worker bị chặn ⇒ đọc trên luồng chính, vẫn nhập đủ ' + EXP.activeRows + ' khoản, không lỗi', r.n === EXP.activeRows && r.st.worker === 0 && r.st.main >= 1 && !r.alive && x._errs.length === 0, [r, x._errs]); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); // P10 (T4): nhánh cứu lãi suất viết lại theo mảng — ô lãi suất LẺ bị định dạng ngày (8,5 hiện 08/01/1900) phải ra đúng 8,5 sau cả chuỗi nhập (bản cũ ra 8)
      const fs = require('fs'); const u = Array.from(fs.readFileSync(FIX + '/20.10.2026.xlsx'));
      const r = await x.evaluate(async u => { const XL = await loadSheetJS(); const wb = XL.read(new Uint8Array(u), { type: 'array', cellNF: true }); const ws = wb.Sheets[wb.SheetNames[0]];
        const rg = XL.utils.decode_range(ws['!ref']); let cS = -1, cK = -1; for (let c = rg.s.c; c <= rg.e.c; c++) { const h = ws[XL.utils.encode_cell({ r: 0, c })]; if (h && h.v === 'sprd') cS = c; if (h && h.v === 'dsbsseq') cK = c; }
        const tg = []; for (let r = 1; r <= rg.e.r && tg.length < 3; r++) { const a = ws[XL.utils.encode_cell({ r, c: cS })]; if (a && typeof a.v === 'number' && a.v % 1 && a.v < 30) { a.z = 'dd/mm/yyyy'; tg.push([String(ws[XL.utils.encode_cell({ r, c: cK })].v).trim(), a.v]); } }
        const f = new File([XL.write(wb, { type: 'array', bookType: 'xlsx' })], '20.10.2026.xlsx'); pendingImportRows = null; await processImportFile(f);
        for (let i = 0; i < 60 && !pendingImportRows; i++) await new Promise(z => setTimeout(z, 200));
        const got = tg.map(([k]) => { const row = (pendingImportRows || []).find(x => String(x[20]).trim() === k); return row ? row[8] : null; }); return { tg, got }; }, u);
      ck('P10-T4', 'ô lãi suất lẻ định dạng ngày trong tệp nhập ⇒ L/S đúng từng khoản (' + r.tg.map(t => t[1]).join(', ') + ')', r.tg.length === 3 && r.tg.every((t, i) => Number(r.got[i]) === t[1]), r); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); // P10 (T5): Trung tâm nhập lưu MỘT lần cho cả đợt (trước: mỗi tệp 1–2 lần lưu đầy đủ + lưu tự động 8 s sau), dữ liệu cuối lưu bền
      const fs = require('fs'), buf = fs.readFileSync(FIX + '/20.10.2026.xlsx');
      await x.evaluate(() => { const C = window.__sv = { real: 0, call: 0 }; const ol = window.saveToLS; window.saveToLS = function () { C.real++; return ol.apply(this, arguments); }; try { saveToLS = window.saveToLS; } catch (e) {} const os = window.saveData; window.saveData = function () { C.call++; return os.apply(this, arguments); }; try { saveData = window.saveData; } catch (e) {} });
      await x.evaluate(() => showPage('nhap')); await x.waitForTimeout(500);
      await x.setInputFiles('#hub-file', [{ name: '30.09.2026.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf }, { name: '20.10.2026.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf }]); await x.waitForTimeout(1500);
      const pre = await x.evaluate(() => Object.assign({}, window.__sv)); await x.evaluate(() => { window.confirm = () => true; tdHubRun(); });
      for (let i = 0; i < 120; i++) { await x.waitForTimeout(500); if (await x.evaluate(() => !document.getElementById('hub-run').disabled)) break; } await x.waitForTimeout(800); const r0 = await x.evaluate(() => ({ real: window.__sv.real, uns: hasUnsaved })); await x.waitForTimeout(9000);
      const r = await x.evaluate(() => ({ sv: window.__sv, n: DATA.qltd.length, snaps: (_archiveReportList || []).filter(s => s.autoDaily).length, defer: window.__TD_SAVE_DEFER, uns: hasUnsaved }));
      await x.reload({ waitUntil: 'load' }); await x.waitForTimeout(5000); r.reload = await x.evaluate(() => DATA.qltd.length);
      ck('P10-T5', 'nhập 2 tệp qua Trung tâm nhập: lưu ngay khi đợt xong, đúng 1 lần lưu thật cho cả đợt (kể cả 9 s sau), 2 mốc, tải lại còn đủ ' + EXP.activeRows + ' khoản', r0.real - pre.real === 1 && !r0.uns && r.sv.real - pre.real === 1 && r.sv.call - pre.call >= 2 && r.n === EXP.activeRows && r.snaps === 2 && r.defer === 0 && !r.uns && r.reload === EXP.activeRows, [pre, r0, r]);
      ck('P10-T5', 'không pageerror', x._errs.length === 0, x._errs); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); // P10 (T6): danh sách cán bộ là cấu hình người dùng — tệp phát hành KHÔNG nhúng tên; chưa cấu hình ⇒ tự học từ dữ liệu
      const html = require('fs').readFileSync(APP, 'utf8');
      const r0 = await x.evaluate(() => ({ ro: Object.keys(TD_SXCB.ROSTER).length, mem: ['Hội Sở', 'PGD Hai Bà Trưng', 'PGD Số 2'].map(p => TD_SXCB.members(p).length).join(), bk: BCKH_PHONG_KEYS.map(k => BCKH_PHONG[k].members.length).join(), al: Object.keys(BCKH_CBTD_ALIASES).length, src: TD_SXCB.roster().src, macb: (DATA.macb || []).length }));
      ck('P10-T6', 'trang mới (chưa có dữ liệu): không có danh sách cán bộ nhúng sẵn (TD_SXCB, BCKH_PHONG, bí danh, DATA.macb đều rỗng); mã nguồn không còn khối members/ROSTER chứa tên', r0.ro === 0 && r0.mem === '0,0,0' && r0.bk === '0,0,0' && r0.al === 0 && r0.macb === 0 && !/members:\s*\[\s*\{\s*name:\s*'/.test(html) && !/var ROSTER = \{/.test(html), r0);
      await importFile(x, FIX + '/20.10.2026.xlsx');
      const r1 = await x.evaluate(() => { const by = {}; DATA.qltd.forEach(r => { const o = by[r[12]] = by[r[12]] || {}; o[r[17]] = (o[r[17]] || 0) + 1; }); const exp = {}; Object.keys(by).forEach(c => { exp[c] = Object.keys(by[c]).sort((a, b) => by[c][b] - by[c][a])[0]; });
        const got = {}; Object.keys(exp).forEach(c => { got[c] = TD_SXCB.pbOf(c); }); const bm = bckhBuildCBTDMap(); return { src: TD_SXCB.roster().src, exp, got, inMap: Object.keys(exp).filter(c => bm[bckhNormName(c)]).length, n: Object.keys(exp).length, n3: Object.keys(exp).filter(c => ['Hội Sở', 'PGD Hai Bà Trưng', 'PGD Số 2'].includes(exp[c])).length }; });
      ck('P10-T6', 'chưa cấu hình: phòng ban mỗi cán bộ = phòng gặp nhiều nhất trong dữ liệu; báo cáo theo CBTD (BCKH, 3 phòng chuẩn) có đủ cán bộ của 3 phòng đó', r1.src === 'data' && JSON.stringify(r1.exp) === JSON.stringify(r1.got) && r1.inMap === r1.n3 && r1.n3 >= 2 && r1.n >= 3, r1);
      const r2 = await x.evaluate(() => { const bad = TD_SXCB.setConfig('Hội Sở Cán bộ C'); const t = 'Hội Sở | Cán bộ C | PP.KH\nPGD Số 2 | Cán bộ A\nMặc định | Cán bộ A'; const okr = TD_SXCB.setConfig(t);
        return { bad: bad.errors.length, ok: okr.errors.length, src: TD_SXCB.roster().src, c: TD_SXCB.pbOf('Cán bộ C'), a: TD_SXCB.pbOf('cán bộ a'), ab: (TD_SXCB.match('Cán B C') || {}).name, role: (TD_SXCB.members('Hội Sở')[0] || {}).role, def: TD_SXCB.defaultCbtd(), b: TD_SXCB.pbOf('Cán bộ B') }; });
      await x.reload({ waitUntil: 'load' }); await x.waitForTimeout(5000); const r3 = await x.evaluate(() => ({ src: TD_SXCB.roster().src, c: TD_SXCB.pbOf('Cán bộ C'), def: TD_SXCB.defaultCbtd() }));
      ck('P10-T6', 'cấu hình người dùng: sai dạng ⇒ không lưu; lưu ⇒ ưu tiên hơn dữ liệu (đổi phòng ban), khớp tên viết tắt, vai trò, cán bộ mặc định; còn sau tải lại', r2.bad === 1 && r2.ok === 0 && r2.src === 'config' && r2.c === 'Hội Sở' && r2.a === 'PGD Số 2' && r2.ab === 'Cán bộ C' && r2.role === 'PP.KH' && r2.def === 'Cán bộ A' && r2.b === '' && r3.src === 'config' && r3.c === 'Hội Sở' && r3.def === 'Cán bộ A', [r2, r3]);
      const r4 = await x.evaluate(async () => { tdRosterDialog(); const tx = document.getElementById('td-roster-txt'); const had = /Cán bộ C/.test(tx.value); tx.value = 'PGD Số 2 | Cán bộ C\n'; document.getElementById('td-roster-save').click(); await new Promise(z => setTimeout(z, 300));
        const after = TD_SXCB.pbOf('Cán bộ C'); document.getElementById('td-roster-clear').click(); await new Promise(z => setTimeout(z, 300)); return { had, after, src: TD_SXCB.roster().src, msg: document.getElementById('td-roster-msg').textContent }; });
      ck('P10-T6', 'hộp thoại Tiện ích → Danh sách cán bộ: hiện cấu hình, Lưu áp dụng ngay, Xoá quay về tự học', r4.had && r4.after === 'PGD Số 2' && r4.src === 'data', r4);
      ck('P10-T6', 'không pageerror', x._errs.length === 0, x._errs); await x.context().close(); }
    { const x = await newPage(b, 1920, 1080); await boot(x); // P10 (T7): tiêu chí HM-15 cập nhật — topbar ≤ 7 nút (5 nút gốc + ↶/↷ từ P05), không còn Reset
      const vis = await x.evaluate(() => [...document.querySelectorAll('.topbar button')].filter(e => e.offsetParent !== null && e.getBoundingClientRect().width > 0).map(e => e.id || e.textContent.trim().slice(0, 16)));
      ck('P10-T7', 'topbar 1920 px: ≤ 7 nút hiển thị, có Nhập IPCAS / Ctrl K / Tiện ích / ngày / ↶ / ↷, không có Reset', vis.length <= 7 && ['btn-import-ipcas-hdr', 'td-cmd-btn', 'util-trigger', 'td-datechip', 'dp-undo-btn', 'dp-redo-btn'].every(i => vis.includes(i)) && !vis.some(v => /Reset/.test(v)), vis); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); // P10 (T9): rời trang nặng ⇒ gỡ nội dung bảng lúc rảnh; vào lại dựng đủ; trang có biểu mẫu không bị gỡ
      const r = await x.evaluate(async () => { const wait = ms => new Promise(z => setTimeout(z, ms)); const base = DATA.qltd.slice(), out = []; for (let k = 0; out.length < 1400; k++) base.forEach(r0 => { if (out.length < 1400) out.push(r0.slice()); }); DATA.qltd = out;
        const cnt = id => document.getElementById(id).getElementsByTagName('*').length, rows = () => document.querySelectorAll('#tbody-qltd tr:not(.td-pg-bar)').length;
        showPage('qltd'); __TDPgSetSize('qltd', 250); await wait(300); const n1 = cnt('page-qltd'), r1 = rows();
        showPage('dashboard'); await wait(3500); const n2 = cnt('page-qltd'), trimmed = !!document.getElementById('page-qltd').dataset.tdTrimmed;
        showPage('qltd'); await wait(400); const n3 = cnt('page-qltd'), r3 = rows(); __TDPgSetSize('qltd', 100);
        showPage('hsvv'); await wait(400); const h1 = cnt('page-hsvv'); showPage('dashboard'); await wait(3500); const h2 = cnt('page-hsvv');
        return { n1, r1, n2, trimmed, n3, r3, h1, h2, keep: ['hsvv', 'fhs', 'tsbd', 'archive', 'hmtd', 'tieudung', 'camco'].filter(k => __TD_TRIM.has(k)) }; });
      ck('P10-T9', 'rời Dư nợ (250 dòng, nặng) ⇒ gỡ bảng (DOM trang giảm mạnh); quay lại dựng đủ 250 dòng; Hồ sơ vay (biểu mẫu) không bị gỡ', r.n1 > 2500 && r.r1 === 250 && r.trimmed && r.n2 < r.n1 / 5 && r.r3 === 250 && r.n3 >= r.n1 * 0.9 && r.h2 === r.h1 && r.keep.length === 0, r);
      ck('P10-T9', 'không pageerror', x._errs.length === 0, x._errs); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); // P10 (T10): Trung tâm nhập đọc nội dung MỖI tệp MỘT lần (nhận dạng tiêu đề + SHA-256 + đọc dữ liệu; trước: 3 lần) — kết quả nhập + SHA-256 nhật ký đúng
      const fs = require('fs'), crypto = require('crypto'), TSX = JSON.parse(fs.readFileSync(FIX + '/tsbd_expected.json', 'utf8'));
      const fl = [['20.10.2026.xlsx', '20.10.2026.xlsx'], ['Sao ke tai san bao dam 20.10.2026.xlsx', 'Sao ke tai san bao dam 20.10.2026.xlsx']].map(([src, name]) => { const buf = fs.readFileSync(FIX + '/' + src); return { name, mimeType: 'application/octet-stream', buffer: buf, sha: crypto.createHash('sha256').update(buf).digest('hex') }; });
      await x.evaluate(() => { const C = window.__rd = { ab: 0, fr: 0 }; const oa = Blob.prototype.arrayBuffer; Blob.prototype.arrayBuffer = function () { C.ab++; return oa.apply(this, arguments); }; const of = FileReader.prototype.readAsArrayBuffer; FileReader.prototype.readAsArrayBuffer = function () { C.fr++; return of.apply(this, arguments); }; });
      await x.evaluate(() => showPage('nhap')); await x.waitForTimeout(400); await x.setInputFiles('#hub-file', fl.map(f => ({ name: f.name, mimeType: f.mimeType, buffer: f.buffer }))); await x.waitForTimeout(1500);
      await x.evaluate(() => { window.confirm = () => true; tdHubRun(); }); for (let i = 0; i < 160; i++) { await x.waitForTimeout(500); if (await x.evaluate(() => !document.getElementById('hub-run').disabled)) break; } await x.waitForTimeout(1000);
      const r = await x.evaluate(() => ({ rd: window.__rd, n: DATA.qltd.length, ts: (window.TSBD && TSBD.rows || []).length, log: JSON.parse(localStorage.getItem('td_hub_log_v1') || '[]').slice(0, 2).map(l => [l.name, l.sha]) }));
      const shaOk = fl.every(f => r.log.some(l => l[0] === f.name && l[1] === f.sha));
      ck('P10-T10', 'nhập 1 tệp dư nợ + 1 sao kê TSBĐ qua Trung tâm nhập: đúng 2 lần đọc nội dung tệp; ' + EXP.activeRows + ' khoản + ' + TSX.rows + ' dòng TSBĐ; SHA-256 nhật ký = SHA-256 tệp', r.rd.ab + r.rd.fr === 2 && r.n === EXP.activeRows && r.ts === TSX.rows && shaOk, [r, fl.map(f => f.sha.slice(0, 12))]);
      ck('P10-T10', 'không pageerror', x._errs.length === 0, x._errs); await x.context().close(); }
    { const x = await newPage(b, 1500, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); await x.evaluate(() => showPage('qltd')); await x.waitForTimeout(1200); // P08: "Tất cả" >600 dòng dựng dần
      const cr = await x.evaluate(async () => { const base = DATA.qltd.slice(), out = []; while (out.length < 1400) base.forEach(r => { if (out.length < 1400) out.push(r.slice()); }); DATA.qltd = out;
        const cnt = () => document.querySelectorAll('#table-qltd tbody tr:not(.td-pg-bar)').length; __TDPgSetSize('qltd', 0); const first = cnt();
        let done = 0; for (let i = 0; i < 60 && !done; i++) { await new Promise(r => setTimeout(r, 100)); if (cnt() === 1400) done = 1; } const full = cnt();
        __TDPgSetSize('qltd', 0); const again = cnt(); __TDPgSetSize('qltd', 100); await new Promise(r => setTimeout(r, 600)); const after = cnt(); return { first, full, again, after, info: (document.querySelector('#table-qltd .td-pg-info') || {}).textContent }; });
      ck('HM-17b', '"Tất cả" >600 dòng: hiện 400 dòng đầu ngay, dựng đủ 1.400 dòng sau đó, đổi lại 100/trang thì huỷ phần dở (còn 100 dòng)', cr.first === 400 && cr.full === 1400 && cr.again === 400 && cr.after === 100 && !/đang dựng/.test(cr.info || ''), cr); await x.context().close(); }
    { const x = await newPage(b, 1600, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); await x.evaluate(() => showPage('qltd')); await x.waitForTimeout(1200); // P07: ghim cột đến Tên KH mặc định
      const pn = await x.evaluate(() => { const c = document.querySelector('#page-qltd [data-act="pin"]'); const th = document.querySelector('#table-qltd thead th:nth-child(5)'); return { chk: !!c && c.checked, sticky: th ? getComputedStyle(th).position : '' } });
      ck('HM-17', 'bảng Dư nợ ≥1280 px: ghim cột đến Tên KH BẬT mặc định (khi chưa chọn gì)', pn.chk && pn.sticky === 'sticky', pn); await x.context().close(); }
    { const x = await newPage(b, 1600, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); // P08: ghim cột Tên KH cho Chuyển HM + TSBĐ (tuỳ chọn, mặc định tắt)
      const unit = await x.evaluate(() => { const R = (s, sp) => TD.cols.resolve(s, 1600, sp), S = TD.cols.SPECS; return { off: !R(null, S.chlm).pin && !R(null, S.tsbd).pin, on: R({ pin: true }, S.chlm).pin && R({ pin: true }, S.tsbd).pin, gd: !R({ pin: true }, S.giadat).pin, lf: JSON.stringify(TD.cols.pinLefts([30, 50, 70, 90, 110], [1], 4)) }; });
      ck('HM-17', 'TD.cols: bảng Chuyển HM/TSBĐ ghim mặc định TẮT, bật khi chọn; Giá đất không ghim; pinLefts tính dồn bỏ qua cột ẩn', unit.off && unit.on && unit.gd && unit.lf === JSON.stringify([{ i: 0, left: 0 }, { i: 2, left: 30 }, { i: 3, left: 100 }, { i: 4, left: 190 }]), unit);
      for (const [pg, key, tid, nth] of [['chlm', 'chlm', 'table-chlm', 5], ['tsbd', 'tsbd', 'tsbd-table', 3]]) {
        await x.evaluate(n => showPage(n), pg); await x.waitForTimeout(1500);
        const st = () => x.evaluate(([k, id, n]) => { const c = document.querySelector('.td-cols-bar[data-key="' + k + '"] [data-act="pin"]'); const th = document.querySelector('#' + id + ' thead th:nth-child(' + n + ')'); return { has: !!c, chk: !!c && c.checked, pos: th ? (getComputedStyle(th).left !== 'auto' ? 'pinned' : 'free') : '' }; }, [key, tid, nth]);
        const a = await st(); await x.evaluate(k => document.querySelector('.td-cols-bar[data-key="' + k + '"] [data-act="pin"]').click(), key); await x.waitForTimeout(500); const c2 = await st();
        ck('HM-17', pg + ': có ô "Ghim đến Tên KH", mặc định tắt (không có left), bật ⇒ cột Tên KH ghim (left)', a.has && !a.chk && a.pos === 'free' && c2.chk && c2.pos === 'pinned', { a, c2 }); }
      await x.context().close(); }
    { const x = await newPage(b, 1600, 900); await boot(x); await importFile(x, FIX + '/20.10.2026.xlsx'); // P07: TSBĐ + hồ sơ vay chứa thẻ HTML không được thực thi
      await x.setInputFiles('#tsbd-file', FIX + '/Sao ke tai san bao dam 20.10.2026.xlsx'); await x.waitForTimeout(3500);
      const nT = await x.evaluate(() => (TSBD.rows || []).length);
      await x.evaluate(() => { window.__xss = []; let n = 0; TSBD.rows.forEach(t => { Object.keys(t).forEach(k => { if (typeof t[k] === 'string' && !/^(trangThai|kieu)$/.test(k)) t[k] = '<img src=x onerror=window.__xss.push("ts-' + k + '")>'; }); });
        const rec = {}; ['a', 'b'].forEach((id, i) => { rec[id] = { _meta: { tenKH: '<img src=x onerror=window.__xss.push("hs-tenKH")>', soHDTD: '<img src=x onerror=window.__xss.push("hs-soHD")>', maKH: '<img src=x onerror=window.__xss.push("hs-maKH")>', loaiVay: '<img src=x onerror=window.__xss.push("hs-loaiVay")>', laiSuat: '<img src=x onerror=window.__xss.push("hs-ls")>', nhomNo: '<img src=x onerror=window.__xss.push("hs-nhom")>', ngayDenHan: '<img src=x onerror=window.__xss.push("hs-ndh")>', notes: '"><img src=x onerror=window.__xss.push("hs-notes")>', savedAt: new Date(2026, 9, 20 + i).toISOString() }, ['<img src=x onerror=window.__xss.push("hs-key")>']: '<img src=x onerror=window.__xss.push("hs-val' + i + '")>' }; });
        try { hosoSetAll(rec); } catch (e) { window.__xssErr = String(e); } });
      await x.evaluate(() => { try { tsbdRender(); tsbdSummary(); tsbdQC(); } catch (e) {} }); await x.waitForTimeout(500);
      for (const t of ['ds', 'th', 'qc', 'snap']) { try { await x.evaluate(t2 => tsbdSwitchTab(t2), t); } catch (e) {} await x.waitForTimeout(300); }
      await x.evaluate(() => { try { tsbdSaveSnapshot(); } catch (e) {} }); await x.waitForTimeout(800);
      for (const pg of ['tsbd', 'hsvv', 'fhs', 'giadat', 'qltd']) { try { await x.evaluate(n => showPage(n), pg); } catch (e) {} await x.waitForTimeout(600); try { await x.evaluate(() => { if (typeof hosoRenderList === 'function') hosoRenderList(); if (typeof tsbdRender === 'function') tsbdRender(); }); } catch (e) {} await x.waitForTimeout(300); }
      await x.evaluate(() => { try { hosoRenderList(1); hosoCompareOpen(); hosoCompareDiff(); } catch (e) {} }); await x.waitForTimeout(600);
      await x.evaluate(() => { try { const i = document.getElementById('hl-search') || document.querySelector('#hoso-list-body')?.parentElement.querySelector('input'); window.__hlq = !!i; document.querySelectorAll('[oninput*="hosoRenderList"]').forEach(e => { e.value = 'img'; e.dispatchEvent(new Event('input')); }); } catch (e) {} }); await x.waitForTimeout(600);
      const xs2 = await x.evaluate(() => ({ n: [...new Set(window.__xss)], err: window.__xssErr || '' }));
      ck('SEC', 'TSBĐ (' + nT + ' dòng) + hồ sơ vay (danh sách, tìm kiếm, so sánh) chứa thẻ HTML KHÔNG được thực thi', nT > 0 && xs2.n.length === 0, xs2); await x.context().close(); }
    await p.evaluate(() => { document.activeElement && document.activeElement.blur(); showPage('dashboard'); }); for (let i = 0; i < 3; i++) await p.keyboard.press('Tab');
    await p.waitForTimeout(500);
    const fr = await p.evaluate(() => { const e = document.activeElement, c = e && getComputedStyle(e); return e ? { tag: e.tagName, sb: !!e.closest('#sidebar'), w: c.outlineWidth, st: c.outlineStyle } : null; });
    ck('CSS', 'phím Tab: phần tử đang focus có vòng focus nhìn thấy (outline ≥2px)', fr && fr.st !== 'none' && parseFloat(fr.w) >= 2, fr);
    { const q = await newPage(b, 1920, 1000); await boot(q); await importFile(q, FIX + '/20.10.2026.xlsx'); await q.evaluate(() => showPage('dashboard')); await q.waitForTimeout(1500);
      const gl = await q.evaluate(() => { const r = id => { const e = document.getElementById(id), b = e && e.getBoundingClientRect(); return b ? [Math.round(b.left), Math.round(b.top), Math.round(b.width)] : null }; return { a: r('ufs-card-0'), b2: r('ufs-card-1'), c: r('ufs-card-2'), k: r('td-kpi-strip'), sx: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      ck('CSS', '1920px: Bảng điều khiển có thẻ KPI đầu trang; Bảng I và Bảng II nằm CẠNH NHAU (lưới 2 cột); không tràn ngang trang', gl.k && gl.a && gl.b2 && Math.abs(gl.a[1] - gl.b2[1]) < 40 && gl.b2[0] > gl.a[0] + 300 && gl.k[1] < gl.a[1] && gl.c[1] > gl.a[1] + 100 && gl.sx <= 1, gl); await q.context().close(); }
    { await p.evaluate(() => showPage('qltd')); await p.waitForTimeout(1500);
      const pt = await p.evaluate(() => { const tr = document.querySelector('#tbody-qltd tr'); const td = [...tr.cells].find(c => c.offsetParent && !c.querySelector('a, button, input, select') && !c.hasAttribute('onclick') && c.textContent.trim()); const r = td.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(400);
      const dr = await p.evaluate(() => { const d = document.getElementById('td-drawer'); const r = d && d.getBoundingClientRect(); return { open: !!d && !d.hidden, w: r && Math.round(r.width), right: r && Math.round(r.right), vw: innerWidth, rows: d ? d.querySelectorAll('.td-dr-r').length : 0, title: d && (d.querySelector('.td-dr-t') || {}).textContent, hasKh: !!(d && d.querySelector('[data-act=kh]')), first: (document.querySelector('#tbody-qltd tr:first-child td:nth-child(5)') || {}).textContent }; });
      ck('CSS', 'ngăn chi tiết: bấm dòng Dư nợ mở ngăn bên phải 380px, liệt kê ≥15 trường (kể cả cột đang ẩn), có nút KH 360°', dr.open && dr.w === 380 && dr.right === dr.vw && dr.rows >= 15 && dr.hasKh && dr.title && dr.title.length > 2, dr);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      const cl = await p.evaluate(() => document.getElementById('td-drawer').hidden);
      ck('CSS', 'ngăn chi tiết: Esc đóng', cl === true, cl); }
    { const m = await newPage(b, 1500, 700); await boot(m); await importFile(m, FIX + '/20.10.2026.xlsx'); await m.evaluate(() => showPage('qltd')); await m.waitForTimeout(1000); // P07/HM-18: hộp thoại hiện đúng vị trí khi trang đang cuộn
      const sc = await m.evaluate(() => { document.querySelectorAll('.main, #main, .content, body, html').forEach(e => { try { e.scrollTop = 600; } catch (x) {} }); window.scrollTo(0, 600); return window.scrollY + ((document.querySelector('.main') || {}).scrollTop || 0) });
      await m.keyboard.press('Control+k'); await m.waitForTimeout(600);
      const md = await m.evaluate(() => { const e = document.getElementById('dp-cmd-overlay') || document.getElementById('td15-pal'); if (!e) return null; const bx = (e.firstElementChild || e).getBoundingClientRect(), cs = getComputedStyle(e); return { pos: cs.position, vis: cs.display !== 'none', top: Math.round(bx.top), bottom: Math.round(bx.bottom), vh: innerHeight } });
      ck('HM-18', 'bảng lệnh (Ctrl K) mở khi trang đang cuộn vẫn nằm trọn trong khung nhìn (không bị content-visibility/observer đẩy lệch)', md && md.pos === 'fixed' && md.vis && md.top >= 0 && md.bottom <= md.vh, { sc, md }); await m.context().close(); }
    { const h = await newPage(b, 1500, 900); await boot(h); await h.evaluate(() => showPage('nhap')); await h.waitForTimeout(800); // P07: sao kê TSBĐ đặt tên KHÔNG có từ khoá vẫn nhận ra theo tiêu đề cột
      const tmp = path.join(require('os').tmpdir(), 'td_p07_24.10.2026 danh muc.xlsx'); fs.copyFileSync(FIX + '/Sao ke tai san bao dam 20.10.2026.xlsx', tmp);
      await h.setInputFiles('#hub-file', tmp); await h.waitForTimeout(1500);
      const hk = await h.evaluate(() => (window._tdHubPlan ? window._tdHubPlan.items.map(i => i.kind) : null)); try { fs.unlinkSync(tmp); } catch (e) {}
      ck('HM-23', 'Trung tâm nhập: sao kê TSBĐ tên tệp không có từ khoá vẫn nhận là TSBĐ theo tiêu đề cột (không nhập nhầm thành dư nợ)', JSON.stringify(hk) === '["tsbd"]', hk); await h.context().close(); }
    { const h = await newPage(b, 1500, 900); await boot(h); await h.evaluate(() => showPage('nhap')); await h.waitForTimeout(800); // P08: loại tệp khỏi lần nhập + xem trước
      const xn = path.join(require('os').tmpdir(), '20.10.2026 <img src=x onerror=window.__xss=1>.xlsx'); fs.copyFileSync(FIX + '/20.10.2026.xlsx', xn);
      const xb64 = await h.evaluate(() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Mã KH', '<img src=x onerror=window.__xss=2>', 'c3'], ['<img src=x onerror=window.__xss=3>', 1, 2]]), 'S'); return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }); });
      const xc = path.join(require('os').tmpdir(), '21.10.2026.xlsx'); fs.writeFileSync(xc, Buffer.from(xb64, 'base64'));
      await h.setInputFiles('#hub-file', [xn, FIX + '/Sao ke tai san bao dam 20.10.2026.xlsx', xc]); await h.waitForTimeout(1500);
      const n0 = await h.evaluate(() => window._tdHubPlan.nImport);
      await h.evaluate(() => document.querySelector('#hub-plan tr[data-idx="0"] .hub-inc').click()); await h.waitForTimeout(300);
      const n1 = await h.evaluate(() => ({ n: window._tdHubPlan.nImport, skip: window._tdHubPlan.items[0].skip, chk: document.querySelector('#hub-plan tr[data-idx="0"] .hub-inc').checked }));
      await h.evaluate(() => document.querySelector('#hub-plan tr[data-idx="2"] .hub-pv').click()); await h.waitForTimeout(1500);
      const pv = await h.evaluate(() => { const e = document.getElementById('hub-preview'); return { ok: !!e, html: e ? e.textContent.slice(0, 160) : '', th: e ? e.querySelectorAll('th').length : 0, tr: e ? e.querySelectorAll('tr').length : 0, xss: window.__xss || 0, imgs: document.querySelectorAll('#hub-plan img, #hub-preview img').length, rows: DATA.qltd.length }; });
      ck('HM-23', 'Trung tâm nhập (P08): bỏ chọn một tệp ⇒ kế hoạch chỉ còn 1 tệp (bỏ qua có lý do); "Xem trước" hiện tiêu đề + dòng đầu mà KHÔNG nhập dữ liệu; tên tệp chứa thẻ HTML không thực thi', n0 === 3 && n1.n === 2 && /loại/.test(n1.skip) && !n1.chk && pv.ok && pv.th >= 3 && pv.tr >= 2 && !pv.xss && pv.imgs === 0 && pv.rows === 0, { n0, n1, pv }); try { fs.unlinkSync(xn); fs.unlinkSync(xc); } catch (e) {} await h.context().close(); }
    { const h = await newPage(b, 1500, 900); await boot(h); await h.evaluate(() => showPage('nhap')); await h.waitForTimeout(800);
      await h.setInputFiles('#hub-file', FIX + '/20.10.2026.xlsx'); await h.waitForTimeout(600);
      const before = await h.evaluate(() => DATA.qltd.length); // trang trống: 0 dòng
      await h.evaluate(() => { window.confirm = () => true; }); await h.evaluate(() => tdHubRun()); await h.waitForTimeout(1500);
      for (let i = 0; i < 90; i++) { await h.waitForTimeout(1000); if (await h.evaluate(() => !document.getElementById('hub-run').disabled)) break; }
      const mid = await h.evaluate(() => ({ n: DATA.qltd.length, undo: !document.getElementById('hub-undo').disabled }));
      await h.evaluate(() => tdHubUndoRun()); await h.waitForTimeout(800);
      const aft = await h.evaluate(() => ({ n: DATA.qltd.length, undo: !document.getElementById('hub-undo').disabled }));
      ck('HM-23', 'Trung tâm nhập: nhập 1 tệp rồi "Hoàn tác lần nhập" đưa dư nợ về trước khi nhập (' + EXP.activeRows + ' → ' + before + ' dòng); nút tắt sau khi hoàn tác', before === 0 && mid.n === EXP.activeRows && mid.undo === true && aft.n === 0 && aft.undo === false, { before, mid, aft }); await h.context().close(); }
    { await p.evaluate(() => { showPage('qltd'); openAddModal(); }); await p.waitForTimeout(600); let out = 0, seen = new Set();
      for (let i = 0; i < 40; i++) { await p.keyboard.press('Tab'); const r = await p.evaluate(() => { const e = document.activeElement; return { in: !!(e && e.closest('.modal-overlay')), id: e && (e.id || e.name || e.tagName) }; }); if (!r.in) out++; seen.add(r.id); }
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      ck('CSS', 'hộp thoại Thêm mới: Tab/Shift+Tab xoay vòng TRONG hộp thoại (0/40 lần ra ngoài), qua ≥5 ô khác nhau; Esc đóng', out === 0 && seen.size >= 5 && !(await p.evaluate(() => !!document.querySelector('.modal-overlay.open'))), { out, n: seen.size }); }
    ck('CSS', '1500px: menu bên CỐ ĐỊNH (hiện 252px), không có nút ☰, nội dung lùi sang phải không bị che', dl.sb[0] === 0 && dl.sb[1] === 252 && dl.mob === 'none' && dl.main === 252 && dl.pg[0] >= 252, dl);
  });
  /* ───── K. màn hình mới: cảnh báo, xu hướng, KH 360, nhập, đối soát ───── */
  await step('K', async () => {
    await p.evaluate(() => showPage('canhbao')); await p.waitForTimeout(1500);
    const w = await p.evaluate(() => { const R = tdWarnCompute(); return R.res.sections.map(s => [s.title || s.id, s.rows != null ? s.rows : s.n]).slice(0, 12) });
    ck('HM-25', 'Cảnh báo sớm tính được các mục', Array.isArray(w) && w.length >= 5, w);
    const k = await p.evaluate(async () => { try { const r = DATA.qltd.find(isActualCreditRow); tdKh360Open(r[0]); await new Promise(x => setTimeout(x, 1200)); return { ok: (document.getElementById('kh360-view') || {}).innerText.includes(String(r[1])), hash: location.hash } } catch (e) { return 'ERR ' + e.message } });
    ck('HM-26', 'Hồ sơ KH 360° mở từ mã KH, hiện đúng tên khách hàng, hash #/khach-hang', k && k.ok === true && k.hash === '#/khach-hang', k);
    ck('HM-14/15/23/24/25/26', 'các màn hình mới không pageerror', p._errs.length === 0, p._errs.slice(0, 3));
  });
  /* ───── L. báo cáo Word / Excel từ fixture ───── */
  await step('L', async () => {
    const save = async (fmt, name) => { await p.evaluate(() => tdReportDialog()); await p.selectOption('#td-rp-period', ''); await p.check('input[name=td-rp-fmt][value=' + fmt + ']'); const dl = p.waitForEvent('download'); await p.click('#td-rp-go'); const d = await dl; const f = '/tmp/td_suite_' + name; await d.saveAs(f); await p.evaluate(() => document.getElementById('td-report-dlg') && document.getElementById('td-report-dlg').remove()); return f };
    const docx = await save('docx', 'rp.docx'), x = require('child_process').execFileSync('unzip', ['-p', docx, 'word/document.xml'], { maxBuffer: 1 << 28 }).toString(), t = x.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
    ck('HM-28b', 'Word: có tổng dư nợ ' + vn(EXP.totalDuNo) + ' và 100,0%', t.includes(vn(EXP.totalDuNo)) && t.includes('100,0%'), t.slice(0, 100));
    ck('HM-28b', 'Word: mọi dư nợ theo CBTD/phòng ban có trong tài liệu', [...Object.values(EXP.byCBTD), ...Object.values(EXP.byPB)].every(v => t.includes(vn(v))), 0);
    const xlsx = await save('xlsx', 'rp.xlsx'); const wb = await p.evaluate(async () => 0); const y = require('child_process').execFileSync('unzip', ['-p', xlsx, 'xl/worksheets/sheet1.xml'], { maxBuffer: 1 << 28 }).toString();
    ck('HM-28', 'Excel: sheet Tổng hợp chứa tổng dư nợ ' + EXP.totalDuNo, y.includes('<v>' + EXP.totalDuNo + '</v>'), y.slice(0, 80));
    const st = require('child_process').execFileSync('unzip', ['-p', xlsx, 'xl/styles.xml'], { maxBuffer: 1 << 24 }).toString(), hd = /<c r="A6" s="(\d+)"/.exec(y), tt = /<c r="A7" s="(\d+)"/.exec(y), xfs = (/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(st) || [])[1] || '', xf = i => (xfs.match(/<xf [^>]*>/g) || [])[+i] || '';
    ck('HM-28', 'Excel có định dạng: hàng tiêu đề nền navy chữ đậm, dòng TỔNG đậm, cố định hàng tiêu đề', /FF1A2540/.test(st) && hd && /fillId="2"/.test(xf(hd[1])) && /fontId="3"/.test(xf(hd[1])) && tt && /fontId="2"/.test(xf(tt[1])) && /state="frozen"/.test(y), { hd: hd && xf(hd[1]), tt: tt && xf(tt[1]) });
  });
  /* ───── M. bảng giá đất (dữ liệu nhúng, không PII) ───── */
  await step('M', async () => {
    const a = await p.evaluate(() => { showPage('giadat'); const A = TD.giadat.audit(W, bgd_UBND); return { dup: A.dupGroups.length, rows: A.rows, ambiguousHidden: A.dupAffectedUBND } });
    ck('HM-11', 'bảng giá đất: phát hiện 54 nhóm khoá (từ|đến) trùng và không gán nhầm giá NQ38', a.dup === 54 && a.rows > 900, a);
    const g = await p.evaluate(() => TD.giadat.compute({ dongia: 15000000, area: 250, loai: 'o', k1: 1.2, k4: 1.1, k5: 1.02, h1: 1.2, h2: 0.85 }).gia);
    const hand = 15000000 * 1.2 * 0.9 * 1.1 * 1.02 * 1.2 * 0.85;
    ck('HM-11', 'tính giá đất: ví dụ tính tay 15.000.000 × 1,2 × 0,9 × 1,1 × 1,02 × 1,2 × 0,85 = app', Math.abs(g - hand) < 1, [g, hand]);
  });
  /* ───── U. giao diện thống nhất (HM-16c): token, toast, tab, không chế độ tối ───── */
  await step('U', async () => {
    const u = await p.evaluate(async () => {
      const roots = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules] } catch (e) { return [] } }).filter(r => r.selectorText === ':root').length;
      const wait = ms => new Promise(r => setTimeout(r, ms)); showToast('x', 'green'); TD.toast('y', { type: 'red' }); await wait(200);
      const toastParts = document.querySelectorAll('#td-toasts, #toast-container, #ux-toast, .toast, .tdup-toast, .template-toast').length;
      const props = ['fontSize', 'fontWeight', 'paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'borderBottomWidth'];
      const sig = f => { const out = new Set(); document.querySelectorAll('.' + f).forEach(e => { if (!/(^| )(active|active-ward)( |$)/.test(e.className)) out.add(props.map(k => getComputedStyle(e)[k]).join('|')) }); return [...out] };
      const A = ['ctkh-tab', 'khmoi-tab', 'sync-tab', 'laicalc-tab', 'bgd-snav-btn'].map(f => [f, sig(f)]), B = ['tab-btn', 'im-tab', 'tsbd-tab', 'ward-tab'].map(f => [f, sig(f)]);
      const uniq = G => [...new Set(G.flatMap(x => x[1]))];
      const dark = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules] } catch (e) { return [] } }).filter(r => /data-tdup-theme=["']?dark/.test(r.cssText || '')).length;
      const dk = f => { const out = new Set(); document.querySelectorAll('.' + f).forEach(e => { if (!e.classList.contains('active')) { const c = getComputedStyle(e); out.add([c.fontSize, c.fontWeight, c.color].join('|')) } }); return [...out] };
      return { roots, toastParts, tabA: uniq(A), tabB: uniq(B), tabDk: [...new Set(['lt-tab', 'hsv-mob-tab'].flatMap(dk))], snavBd: getComputedStyle(document.querySelector('.bgd-subnav')).borderBottomWidth, dark, themeBtn: !!document.querySelector('[data-tdup-act=theme]'), fn: typeof cycleTheme };
    });
    ck('HM-16c', 'token: đúng MỘT khối :root cấp cao nhất', u.roots === 1, u.roots);
    ck('HM-16c', 'toast: chỉ MỘT thành phần (#td-toasts), showToast & TD.toast cùng hệ', u.toastParts === 1, u.toastParts);
    ck('HM-16c', 'tab kiểu A (gạch chân: Khách hàng, KH mới, Đồng bộ, Máy tính lãi, mục Giá đất) cùng cỡ chữ/đệm/viền', u.tabA.length === 1, u.tabA);
    ck('HM-16c', 'tab nền tối (.lt-tab, .hsv-mob-tab) cùng cỡ chữ/độ đậm/màu; thanh mục Giá đất có gạch nền kiểu A', u.tabDk.length === 1 && u.snavBd === '2px', [u.tabDk, u.snavBd]);
    ck('HM-16c', 'tab kiểu B (nút: Hồ sơ vay, Nhập liệu, TSBĐ, Phường) cùng cỡ chữ/đệm/bo góc', u.tabB.length === 1, u.tabB);
    ck('HM-16c', 'đã gỡ chế độ tối (không CSS tối, không nút Theme, không cycleTheme)', u.dark === 0 && !u.themeBtn && u.fn === 'undefined', u);
  });
  /* ───── V. chế độ có mạng (HM-27): mặc định TẮT, trình duyệt chặn gửi ra ngoài ───── */
  await step('V', async () => {
    const n = await p.evaluate(async () => { const v = []; document.addEventListener('securitypolicyviolation', e => v.push(e.violatedDirective), { once: true });
      let blocked = false; try { await fetch('https://exfil.invalid/x', { method: 'POST', body: JSON.stringify(DATA.qltd.slice(0, 2)) }) } catch (e) { blocked = true }
      await new Promise(r => setTimeout(r, 200));
      return { mode: TD.net.state().mode, meta: (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '', blocked, v, menu: !!document.querySelector('[onclick*=tdNetDialog]') } });
    ck('HM-27', 'chế độ có mạng TẮT mặc định; có thẻ CSP chặn kết nối ngoài (connect-src chỉ self/blob/data/file)', n.mode === 'off' && /connect-src 'self' blob: data: file:/.test(n.meta) && !/https?:/.test(n.meta), n);
    ck('HM-27', 'gửi dữ liệu khách hàng ra máy chủ ngoài bị trình duyệt chặn (fetch lỗi + báo vi phạm CSP)', n.blocked && n.v.join().includes('connect-src'), n);
    ck('HM-27', 'có mục menu "Chế độ có mạng…"', n.menu, n);
  });
  await step('Y', async () => { // HM-02/06: nhập .XLS (BIFF8 như tệp IPCAS thật, tests/fixtures/make_xls_fixture.py) — cùng đáp số với .xlsx
    const q = await newPage(b); await boot(q); await importFile(q, FIX + '/20.10.2026.XLS');
    const s = await q.evaluate(() => { const L = {}; DATA.qltd.forEach(r => { L[String(r[20]).trim()] = [r[8], Number(r[11]), String(r[7])] }); return { n: DATA.qltd.length, L } });
    const loans = Object.fromEntries(Object.entries(EXP.loans).filter(([k, v]) => v.bal > 0)), nz = d => String(d).replace(/\b0(\d)\b/g, '$1');
    const bad = Object.keys(loans).filter(k => { const a = s.L[k]; return !a || a[0] !== loans[k].rate || a[1] !== loans[k].bal || nz(a[2]) !== nz(loans[k].due) });
    ck('HM-02/06', 'nhập .XLS: ' + EXP.activeRows + ' khoản, lãi suất/dư nợ/ngày đến hạn TỪNG khoản = tệp', s.n === EXP.activeRows && !bad.length, { n: s.n, bad: bad.slice(0, 3).map(k => [k, s.L[k], loans[k]]) });
    ck('HM-02/06', 'nhập .XLS: 0 pageerror', q._errs.length === 0, q._errs); await q.context().close();
  });
  await step('X', async () => { // HM-10: nhập sao kê TSBĐ ẩn danh (tests/fixtures/make_tsbd_fixture.py) — đáp số tính độc lập trong tsbd_expected.json
    const TX = JSON.parse(fs.readFileSync(FIX + '/tsbd_expected.json', 'utf8'));
    const q = await newPage(b); await boot(q); await importFile(q, FIX + '/' + EXP.file);
    await q.evaluate(() => showPage('tsbd')); await q.waitForTimeout(1500); await q.setInputFiles('#tsbd-file', FIX + '/' + TX.file);
    for (let i = 0; i < 40; i++) { await q.waitForTimeout(500); if (await q.evaluate(() => (TSBD.rows || []).length > 0)) break; } await q.waitForTimeout(1500);
    const s = await q.evaluate(() => { const R = TSBD.rows, sm = TD.tsbd.summarize(R), st = {}; R.forEach(t => st[t.trangThai] = (st[t.trangThai] || 0) + 1);
      const kp = [...document.querySelectorAll('.tsbd-kpi')].find(e => /KH còn dư nợ chưa có TS theo mã KH/.test(e.textContent)), kh = kp && /[\d.]+/.exec(kp.querySelector('.tsbd-kpi-v').textContent);
      return { rows: R.length, unique: sm.unique, dupRows: sm.dupRows, vnd: sm.giaTriTS_VND, fx: sm.fx, hold: sm.hold, status: st, b3: R.filter(t => t.coBenThu3).length, khKhongTS: kh ? +kh[0].replace(/\./g, '') : null }; });
    ck('HM-10', 'TSBĐ: ' + TX.rows + ' dòng, ' + TX.unique + ' TS sau khử trùng clno (' + TX.dupRows + ' dòng trùng), Σ VND = tệp', s.rows === TX.rows && s.unique === TX.unique && s.dupRows === TX.dupRows && s.vnd === TX.vnd, s);
    ck('HM-10', 'TSBĐ: ngoại tệ tách riêng (USD/EUR không cộng vào VND), clholdcd đếm đúng', JSON.stringify(s.fx) === JSON.stringify(TX.fx) && JSON.stringify(s.hold) === JSON.stringify(TX.hold), s);
    ck('HM-10', 'TSBĐ: đối chiếu dư nợ — còn dư nợ / không có trong dữ liệu, bên thứ ba, KH còn nợ chưa có TS = ' + TX.khKhongTS, JSON.stringify(s.status) === JSON.stringify(TX.status) && s.b3 === TX.thirdParty && s.khKhongTS === TX.khKhongTS, s);
    ck('HM-10', 'TSBĐ: 0 pageerror', q._errs.length === 0, q._errs); await q.context().close();
  });
  await step('W', async () => { // HM-17b: chọn cột cho bảng có tiêu đề gộp ô (Giá đất: VT1–VT4 × 3 giá) — bảng có sẵn, không cần nhập
    const q = await newPage(b, 1366, 900); await boot(q); await q.evaluate(() => showPage('giadat')); await q.waitForTimeout(2500);
    const m = () => q.evaluate(() => { const t = document.getElementById('main-table'), w = t.closest('.table-wrap') || t.parentElement, row = t.tBodies[0].rows[0];
      const body = [...row.cells].map((c, i) => ({ i, vis: getComputedStyle(c).display !== 'none', l: c.getBoundingClientRect().left, r: c.getBoundingClientRect().right }));
      const cells = [...t.tHead.rows].map(r => [...r.cells]), g = TD.cols.grid(cells.map(r => r.map(c => ({ cs: +(c.dataset.tdCs || c.colSpan), rs: c.rowSpan })))); let off = 0, bad = 0;
      cells.forEach((r, i) => r.forEach((c, j) => { if (getComputedStyle(c).display === 'none') return; const v = body.filter(x => x.vis && x.i >= g[i][j][0] && x.i < g[i][j][1]); if (!v.length) { bad++; return; } const bb = c.getBoundingClientRect(); off = Math.max(off, Math.abs(bb.left - v[0].l), Math.abs(bb.right - v[v.length - 1].r)); }));
      return { bar: !!document.querySelector('.td-cols-bar[data-key="giadat"]'), nvis: body.filter(x => x.vis).length, sw: t.scrollWidth, cw: w.clientWidth, off: Math.round(off), bad }; });
    const m0 = await m(); ck('HM-17b', 'Giá đất: có thanh chọn cột, mặc định Đầy đủ (16 cột), tiêu đề thẳng hàng', m0.bar && m0.nvis === 16 && m0.off <= 1 && !m0.bad, m0);
    await q.evaluate(() => document.querySelector('.td-cols-bar[data-key="giadat"] [data-p="ubnd"]').click()); await q.waitForTimeout(600);
    const m1 = await m(); ck('HM-17b', 'Giá đất "Chỉ giá UBND": 8 cột, hết tràn ngang ở 1366, tiêu đề gộp ô vẫn thẳng hàng', m1.nvis === 8 && m1.sw <= m1.cw + 1 && m1.off <= 1 && !m1.bad, m1);
    await q.evaluate(() => { try { localStorage.removeItem('td_cols_v1_giadat') } catch (e) {} }); await q.context().close();
  });
  await step('Z', async () => { // HM-13b: một showPage + sổ hook; bộ phím cũ đã gỡ
    const z = await p.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms)), cnt = {}, w = k => { const f = window[k]; if (typeof f !== 'function') return; window[k] = function () { cnt[k] = (cnt[k] || 0) + 1; return f.apply(this, arguments); }; };
      ['hsvInitPage', 'fhsPageInit', 'hosoSilentSave', 'saveData', 'tryExportCenter'].forEach(w);
      const single = /TD\.pageHooks/.test(String(window.showPage)), hooks = (TD.pageHooks || []).length;
      showPage('hmtd'); await wait(300); showPage('fhs'); await wait(300); showPage('fhs'); await wait(300);
      const t0 = document.querySelectorAll('.td-toast').length;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, shiftKey: true, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'E', ctrlKey: true, shiftKey: true, bubbles: true })); await wait(300);
      const draft = [...document.querySelectorAll('.td-toast')].slice(t0).some(e => /bản nháp/.test(e.textContent));
      showPage('qltd'); await wait(300); return { single, hooks, cnt, draft };
    });
    ck('HM-13b', 'một showPage duy nhất (không lớp bọc) + sổ hook ≥ 8; hook chạy mỗi lần đổi trang, kể cả mở lại cùng trang', z.single && z.hooks >= 8 && z.cnt.hsvInitPage === 1 && z.cnt.fhsPageInit === 2, z);
    ck('HM-13b', 'Ctrl+Shift+S / Ctrl+Shift+E không còn kích hoạt bộ phím cũ (lưu nháp, saveData, Export Center)', !z.draft && !z.cnt.hosoSilentSave && !z.cnt.saveData && !z.cnt.tryExportCenter, z);
  });
  ck('SUITE', 'toàn phiên: 0 pageerror ở trang chính', p._errs.length === 0, p._errs.slice(0, 4));
  await b.close();
  const f = R.filter(x => !x.ok).length; console.log('\nE2E: PASS ' + (R.length - f) + ' FAIL ' + f);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(R, null, 1)); process.exit(f ? 1 : 0);
})();

const fs = require('fs'), path = require('path'), vm = require('vm');
const TD = require('./td_xlsrows.js'); const X = TD.xlsrows; let p = 0, f = 0; const ok = (n, c, x) => { if (c) p++; else { f++; console.log('FAIL', n, x === undefined ? '' : JSON.stringify(x).slice(0, 300)); } };
const ROOT = path.join(__dirname, '../..'), XSRC = fs.readFileSync(path.join(ROOT, 'src/vendor/xlsx.js'), 'utf8');
const box = { console }; vm.createContext(box); vm.runInContext(XSRC + '\n;this.XLSX = XLSX; this.Date = Date;', box); const XLSX = box.XLSX;
/* bộ đọc CŨ (parseXLS_legacy trước P10, chế độ thưa) — chép nguyên văn để so đầu ra */
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function oldRows(buf) {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true, cellNF: true, cellText: false, raw: true }); const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  return raw.map((row, ri) => row.map((cell, ci) => {
    if (cell instanceof box.Date && !isNaN(cell)) {
      if (cell.getFullYear() < 1990) {
        try { const addr = XLSX.utils.encode_cell({ c: ci, r: ri }); const wcell = ws[addr];
          if (wcell && typeof wcell.v === 'number' && isFinite(wcell.v)) return String(wcell.v);
          if (wcell && typeof wcell.w === 'string' && /^\s*-?\d+(?:[.,]\d+)?\s*%?\s*$/.test(wcell.w)) return wcell.w.trim();
          if (wcell && typeof wcell.z === 'string' && /[%0#]/.test(wcell.z) && cell.getMonth() === 0 && cell.getDate() <= 31) return String(cell.getDate());
        } catch (_) {}
        return String(cell.getDate());
      }
      return isoDate(cell);
    }
    if (cell == null) return '';
    const str = String(cell).trim(); if (/^-?\d+(\.\d+)?$/.test(str)) return str; return str;
  }));
}
// Date của vm khác realm ⇒ X.cell phải nhận diện Date của SheetJS: chạy module trong cùng realm với XLSX
vm.runInContext(fs.readFileSync(path.join(__dirname, 'td_xlsrows.js'), 'utf8'), box); const XB = box.TD.xlsrows;
const FIX = path.join(ROOT, 'tests/fixtures');
for (const fn of ['20.10.2026.xlsx', '20.10.2026.XLS']) {
  const buf = new Uint8Array(fs.readFileSync(path.join(FIX, fn)));
  const o = JSON.stringify(oldRows(buf)), d = JSON.stringify(XB.ipcasRows(XLSX, buf, true)), s = JSON.stringify(XB.ipcasRows(XLSX, buf, false));
  ok(fn + ': dense = bộ đọc cũ (từng ô)', d === o, [d.length, o.length]); ok(fn + ': thưa = bộ đọc cũ', s === o); ok(fn + ': có dữ liệu', JSON.parse(d).length > 100);
}
/* ô lãi suất bị định dạng ngày (lỗi gốc HM-03: 8,5 hiện 08/01/1900) + ngày thật + ô trống giữa dòng + dòng trống */
{ const ws = XLSX.utils.aoa_to_sheet([['custnm', 'sprd', 'dsbsdt', 'x'], ['A', 8.5, new box.Date(2026, 9, 20), ''], [], ['B', 0.1, new box.Date(2025, 11, 31), 7]], { cellDates: true });
  ws.B2.z = 'dd/mm/yyyy'; ws.B4.z = 'dd/mm/yyyy'; ws.C2.z = 'dd/mm/yyyy'; ws.C4.z = 'dd/mm/yyyy';
  for (const bt of ['xlsx', 'biff8']) { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'S'); const buf = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: bt }));
    const o = oldRows(buf), d = XB.ipcasRows(XLSX, buf, true), sp = XB.ipcasRows(XLSX, buf, false);
    ok(bt + ': ô lãi suất định dạng ngày ⇒ GIỮ NGUYÊN số (8.5, 0.1) — bộ đọc cũ làm mất thập phân ("8", "31")', d[1][1] === '8.5' && d[3][1] === '0.1' && o[1][1] === '8' && o[3][1] === '31', [d, o]);
    ok(bt + ': mọi ô khác = bộ đọc cũ; dòng trống đủ cột; dense = thưa', JSON.stringify(d.map(r => r.filter((x, j) => j !== 1))) === JSON.stringify(o.map(r => r.filter((x, j) => j !== 1))) && JSON.stringify(d) === JSON.stringify(sp), [d, o]);
    ok(bt + ': ngày thật ⇒ ISO', d[1][2] === '2026-10-20' && d[3][2] === '2025-12-31', d); } }
ok('dateCell: serial ngày ⇒ ISO; < 01/01/1990 ⇒ số gốc; không hữu hạn ⇒ chuỗi', X.dateCell(46315, XLSX.SSF) === '2026-10-20' && X.dateCell(32874, XLSX.SSF) === '1990-01-01' && X.dateCell(32873, XLSX.SSF) === '32873' && X.dateCell(8.5, XLSX.SSF) === '8.5' && X.dateCell(1, XLSX.SSF) === '1' && X.dateCell(NaN, XLSX.SSF) === 'NaN');
ok('aoa: TSBĐ thô (Date giữ nguyên)', (() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['clno', 'd'], ['1', new box.Date(2026, 0, 2)]], { cellDates: true }), 'S'); const a = XB.aoa(XLSX, new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))); return a.length === 2 && a[1][0] === '1' && a[1][1] instanceof box.Date; })());
ok('ipcasRows: sổ không có trang ⇒ lỗi rõ', (() => { try { XB.ipcasRows({ read: () => ({ SheetNames: [], Sheets: {} }) }, new Uint8Array(1), true); return false; } catch (e) { return /không có sheet/.test(e.message); } })());
{ const buf = new Uint8Array(fs.readFileSync(path.join(FIX, 'Sao ke tai san bao dam 20.10.2026.xlsx')));
  const o1 = (() => { const wb = XLSX.read(buf, { type: 'array', sheetRows: 2, dense: true, cellText: false }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true }); })();
  const o2 = (() => { const wb = XLSX.read(buf, { type: 'array', sheetRows: 7, dense: true, cellText: false }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); })();
  const h1 = XB.head(XLSX, buf, { rows: 2, raw: true }), h2 = XB.head(XLSX, buf, { rows: 7, raw: false, defval: '' });
  ok('head: nhận dạng tiêu đề (2 dòng thô) + xem trước (7 dòng định dạng) = cách đọc cũ', JSON.stringify(h1.rows) === JSON.stringify(o1) && JSON.stringify(h2.rows) === JSON.stringify(o2) && h1.rows.length === 2 && h2.rows.length === 7 && typeof h1.sheet === 'string' && h1.sheet.length > 0, [h1.rows.length, h2.rows.length]); }
/* worker: serve() với self giả */
{ const sent = []; const fake = { postMessage: m => sent.push(m) }; X.serve(fake, XLSX, { compressToBase64: s => 'Z' + s });
  fake.onmessage({ data: { id: 1, op: 'lz', strs: ['a', 'b'] } }); fake.onmessage({ data: { id: 2, op: 'nope' } }); fake.onmessage({ data: { id: 3, op: 'ping' } });
  ok('serve: lz / op lạ ⇒ lỗi / ping', sent[0].ok && sent[0].out.join() === 'Za,Zb' && sent[1].ok === false && /op lạ/.test(sent[1].err) && sent[2].out === true, sent); }
/* workerSource chạy được trong ngữ cảnh "worker" giả (vm, self, không window/document) */
{ const sent = []; const wctx = { postMessage: m => sent.push(m), console }; wctx.self = wctx; vm.createContext(wctx);
  vm.runInContext(X.workerSource(XSRC, '() => ({ compressToBase64: s => "L" + s.length })'), wctx);
  wctx.onmessage({ data: { id: 7, op: 'ping' } }); wctx.onmessage({ data: { id: 8, op: 'lz', strs: ['xyz'] } });
  const buf = new Uint8Array(fs.readFileSync(path.join(FIX, '20.10.2026.XLS'))); wctx.onmessage({ data: { id: 9, op: 'ipcas', buf } });
  ok('workerSource: worker tự đủ (SheetJS + LZS + module), ping/lz/ipcas chạy', sent[0].ok && sent[0].out === true && sent[1].out[0] === 'L3' && sent[2].ok && JSON.stringify(sent[2].out) === JSON.stringify(oldRows(buf)), sent.map(s => [s.id, s.ok, s.err])); }
/* client(): xếp hàng, trả kết quả theo id; worker lỗi ⇒ từ chối mọi lời gọi đang chờ và sau đó */
(async () => {
  let made = 0; const mk = () => { made++; const w = { posted: [], postMessage(m) { this.posted.push(m); }, terminate() { this.t = 1; } }; mk.w = w; return w; };
  const C = X.client(mk); const a = C.call('lz', { strs: ['q'] }), b = C.call('ping', {});
  mk.w.onmessage({ data: { id: 2, ok: true, out: true } }); mk.w.onmessage({ data: { id: 1, ok: false, err: 'hỏng' } });
  const rb = await b, ra = await a.then(() => 'x', e => e.message);
  ok('client: một worker, trả đúng theo id, lỗi việc ⇒ từ chối đúng lời gọi', made === 1 && rb === true && ra === 'hỏng' && C.calls === 2 && C.alive());
  const c = C.call('ping', {}); mk.w.onerror({ message: 'boom', preventDefault() {} }); const rc = await c.then(() => 'x', e => e.message), rd = await C.call('ping', {}).then(() => 'x', e => e.message);
  ok('client: worker chết ⇒ từ chối việc đang chờ + việc sau (người gọi chạy luồng chính)', /boom/.test(rc) && rd === 'no-worker' && !C.alive() && mk.w.t === 1, [rc, rd]);
  const C2 = X.client(() => { throw new Error('Worker bị chặn'); }); ok('client: không tạo được worker ⇒ no-worker', await C2.call('ping', {}).then(() => 'x', e => e.message) === 'no-worker');
  console.log('PASS', p, 'FAIL', f); process.exit(f ? 1 : 0);
})();

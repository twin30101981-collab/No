/* node td_reportdocx.test.js — dựng .docx bằng docx 9.0.2 (bản nhúng trong app) từ dữ liệu tổng hợp, mở lại bằng unzip và đối chiếu từng số */
const fs = require('fs'), vm = require('vm'), cp = require('child_process'), path = require('path');
const ctx = { setTimeout, clearTimeout, setImmediate, console, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer }; ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
const APP = process.argv[2]; // app .html: lấy docx-umd nhúng sẵn (đúng bản người dùng chạy)
if (!APP || !fs.existsSync(APP)) { console.log('Dùng: node td_reportdocx.test.js <app.html>'); process.exit(2); }
const html = fs.readFileSync(APP, 'utf8'), i0 = html.indexOf('<script id="td-vendor-docx-umd"');
vm.runInContext(html.slice(html.indexOf('>', i0) + 1, html.indexOf('</script>', i0)), ctx);
const D = ctx.docx, X = require('./td_reportdocx.js').reportdocx;
require('./td_metrics.js'); require('./td_report.js'); require('./td_doisoat.js');
const TD = global.TD || globalThis.TD;
let pass = 0, fail = 0; const ck = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + JSON.stringify(x).slice(0, 300))); };
const mk = (ma, ten, dn, loai, cb, pb, nh) => [ma, ten, 'H' + ma, '', '', 2e9, '', '01/12/2027', 9, 0, 0, dn, cb, loai, '', ' ', 0, pb, nh];
const rows = [mk('1', 'A', 1234567890, 'Vay ngắn hạn (TK 211)', 'CB A', 'Phòng 1', 'Nhóm 1'), mk('2', 'B', 2e9, 'Vay trung hạn (TK 212)', 'CB B', 'Phòng 2', 'Nhóm 1'), mk('3', 'C', 5e8, 'Vay dài hạn (TK 213)', 'CB A', 'Phòng 1', 'Nhóm 2'), mk('4', 'D', 7e8, 'Thấu chi', 'CB B', 'Phòng 2', 'Nhóm 1')];
const S = TD.metrics.summarize(rows, { today: new Date(2026, 9, 20) });
const checks = TD.doisoat.checks({ dataDate: '20/10/2026', rows: { hs: S.totals.hs, duno: S.totals.duno, kh: S.totals.kh }, dash: { duno: S.totals.duno + 5e6, kh: S.totals.kh, sumLoai: S.totals.duno, sumNhom: S.totals.duno, sumPB: S.totals.duno }, snap: null, tsbd: null, bckh: null, ls: null });
const sheets = TD.report.sheets({ dataDate: '20/10/2026', summary: S, checks, periods: [], warn: null, at: '22/10/2026', by: 'Tester' });
ck('khối: title/kv/section/table', (() => { const b = X.blocks(sheets[0].rows); return b[0].kind === 'title' && b.some(x => x.kind === 'kv') && b.some(x => x.kind === 'section') && b.filter(x => x.kind === 'table').length === 3; })(), X.blocks(sheets[0].rows).map(b => b.kind));
const doc = X.build(D, sheets, { dataDate: '20/10/2026', signers: ['Người lập', 'Kiểm soát', 'Giám đốc'], by: 'Tester' });
D.Packer.toBase64String(doc).then(b64 => { const buf = Buffer.from(b64, 'base64');
  const f = require('os').tmpdir() + '/td_rd_t.docx'; fs.writeFileSync(f, buf);
  const xml = cp.execFileSync('unzip', ['-p', f, 'word/document.xml'], { maxBuffer: 1 << 28 }).toString();
  const txt = xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
  ck('là zip hợp lệ có document.xml', xml.length > 1000 && buf.slice(0, 2).toString() === 'PK', buf.length);
  const tot = S.totals.duno;
  ck('tổng dư nợ ' + X.fmtInt(tot) + ' có trong Word', txt.includes(X.fmtInt(tot)), 0);
  ck('mọi dư nợ theo loại vay/CBTD/phòng có trong Word', [...S.byLoai, ...S.byCBTD, ...S.byPB].filter(g => g.hs).every(g => txt.includes(X.fmtInt(g.duno))), 0);
  ck('số trang tính = số section', (xml.match(/<w:sectPr/g) || []).length === sheets.length, (xml.match(/<w:sectPr/g) || []).length);
  ck('Theo CBTD (8 cột) in ngang', /w:orient="landscape"/.test(xml), 0);
  ck('biên bản: LỆCH tô vàng + chữ đỏ', xml.includes('w:fill="' + 'FFF3B0' + '"') && xml.includes('B91C1C') && /LỆCH/.test(txt), 0);
  ck('biên bản: KHỚP chữ xanh', xml.includes('15803D') && /KHỚP/.test(txt), 0);
  ck('tiêu đề bảng nền navy chữ trắng', xml.includes('w:fill="1A2540"') && xml.includes('w:color w:val="FFFFFF"'), 0);
  ck('chữ ký 3 cột', /Người lập/.test(txt) && /Kiểm soát/.test(txt) && /Giám đốc/.test(txt) && /Ký, ghi rõ họ tên/.test(txt), 0);
  ck('% tổng = 100,0%', /100,0%/.test(txt), 0);
  const noSig = X.build(D, sheets, {}); return D.Packer.toBase64String(noSig).then(b64b => { const b2 = Buffer.from(b64b, 'base64'); const x2 = cp.execFileSync('unzip', ['-p', (fs.writeFileSync(require('os').tmpdir() + '/td_rd_t2.docx', b2), require('os').tmpdir() + '/td_rd_t2.docx'), 'word/document.xml'], { maxBuffer: 1 << 28 }).toString(); ck('không chọn ký ⇒ không có khối chữ ký', !/Ký, ghi rõ họ tên/.test(x2), 0); });
}).then(() => { console.log('PASS', pass, 'FAIL', fail); process.exit(fail ? 1 : 0); }).catch(e => { console.log('FAIL lỗi', e.stack); process.exit(1); });

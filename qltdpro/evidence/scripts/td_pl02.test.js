/* node td_pl02.test.js <app.html> <PL02.docx> — đối chiếu bộ đọc mới với kết quả quét ngoại tuyến đã đóng (hm11_docx_issues.json) */
const fs = require('fs'), cp = require('child_process'), path = require('path');
const TD = require('./td_pl02.js'); const P = TD.pl02;
const [app, docx] = process.argv.slice(2);
const s = fs.readFileSync(app, 'utf8'), i = s.indexOf('<script id="bgdat-scripts"'), blk = s.slice(i, s.indexOf('</script>', i));
const a = blk.indexOf('const W='), W = eval('(' + blk.slice(a + 8, blk.indexOf('\n', a)).replace(/;\s*$/, '') + ')');
const xml = cp.execFileSync('unzip', ['-p', docx, 'word/document.xml'], { maxBuffer: 1 << 29 }).toString('utf8');
const rows = P.parse(xml), R = P.issues(rows, W), ref = JSON.parse(fs.readFileSync(path.join(__dirname, '../hm11_docx_issues.json'), 'utf8'));
let pass = 0, fail = 0; const ck = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + JSON.stringify(x).slice(0, 300))); };
const sig = a => a.map(r => JSON.stringify(r.map(v => typeof v === 'boolean' ? v : String(v).replace(/\s+/g, ' ')))).sort().join('\n');
console.log('rows', rows.length, 'wards', [...new Set(rows.map(r => r.ward))].length);
ck('số dòng PL02 đọc được > 0 và 8 phường', rows.length > 800 && new Set(rows.map(r => r.ward)).size === 8, rows.length);
ck('ô lỗi = ' + ref.errCells.length + ' (khớp quét ngoại tuyến)', R.errCells.length === ref.errCells.length, R.errCells.length);
ck('dòng thiếu = ' + ref.missingRows.length, R.missingRows.length === ref.missingRows.length, R.missingRows.length);
ck('nội dung ô lỗi trùng từng ô', sig(R.errCells) === sig(ref.errCells), [R.errCells[0], ref.errCells[0]]);
ck('nội dung dòng thiếu trùng từng dòng', sig(R.missingRows) === sig(ref.missingRows), [R.missingRows[0], ref.missingRows[0]]);
ck('isNum', P.isNum('85.000') && P.isNum('22.500') && !P.isNum('#DIV/0!') && !P.isNum('chưa hoàn thiện'), 0);
console.log('PASS', pass, 'FAIL', fail); process.exit(fail ? 1 : 0);

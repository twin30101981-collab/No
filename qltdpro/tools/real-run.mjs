#!/usr/bin/env node
/* P10 (T8): MỘT lệnh dựng môi trường + chạy bộ kịch bản kiểm trên DỮ LIỆU THẬT (không phụ thuộc /tmp/claude-0/work1, cổng :8765 cố định).
   node tools/real-run.mjs --data <thư mục dữ liệu thật> [--app app/<tệp>.html] [--work <thư mục tạm>] [--only hm23,hm24] [--keep]
   Dữ liệu thật phải để NGOÀI repo; thư mục tạm (mặc định trong os.tmpdir()) chứa tệp trích/đối chiếu có dữ liệu khách hàng ⇒ tự xoá khi xong (trừ --keep).
   Bước dựng: kiểm đủ tệp → tệp phụ HM-23 (bản trùng, pdf) → Python xlrd/openpyxl (tự cài vào thư mục tạm nếu thiếu) → máy chủ HTTP cổng ngẫu nhiên
   phục vụ app ở /index.html → trích dòng (extract.js) + đối chiếu độc lập (*_indep.py) + SHA-256 → chạy 12 kịch bản → tổng kết, mã thoát 0/1. */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import http from 'node:http'; import crypto from 'node:crypto'; import cp from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), SC = path.join(ROOT, 'evidence/scripts');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }, has = k => argv.includes(k);
const DATA = path.resolve(arg('--data', process.env.QLTD_REAL_DATA || '/tmp/claude-0/real/data'));
const APP = path.resolve(arg('--app', fs.readdirSync(path.join(ROOT, 'app')).filter(f => f.endsWith('.html')).sort().map(f => path.join(ROOT, 'app', f)).pop() || ''));
const WORK = path.resolve(arg('--work', fs.mkdtempSync(path.join(os.tmpdir(), 'qltd-real-')))), ONLY = (arg('--only', '') || '').split(',').filter(Boolean);
const PER = ['31.12.2025.xlsx', '31.01.2026.xlsx', '28.02.2026.xlsx', '31.03.2026.xlsx', '30.04.2026.xlsx', '31.05.2026.xlsx', '30.06.2026.XLS', '31.07.2026.XLS', '31.08.2026.XLS', '30.09.2026.XLS', '20.10.2026.XLS'];
const NEED = [...PER, 'Sao ke tai san bao dam 30.09.2026.XLS', 'Sao ke tai san bao dam 20.10.2026.XLS', 'PL02.docx'];
const log = m => console.log(m), die = m => { console.error('✘ ' + m); process.exit(2); };
if (DATA.startsWith(ROOT + path.sep)) die('thư mục dữ liệu thật nằm TRONG repo — hãy để ngoài repo (dữ liệu khách hàng)');
const miss = NEED.filter(f => !fs.existsSync(path.join(DATA, f))); if (miss.length) die('thiếu tệp trong ' + DATA + ': ' + miss.join(', '));
if (!fs.existsSync(APP)) die('không thấy app: ' + APP);
const EXTRA = path.join(WORK, 'extra'), ROWS = path.join(WORK, 'rows'), OUT = path.join(WORK, 'out'), LOGS = path.join(WORK, 'logs'), PYLIB = arg('--pylib', process.env.QLTD_PYLIB || path.join(WORK, 'pylib'));
[EXTRA, ROWS, OUT, LOGS].forEach(d => fs.mkdirSync(d, { recursive: true }));
log('Dữ liệu: ' + DATA + '\nApp: ' + path.relative(ROOT, APP) + '\nThư mục tạm: ' + WORK);
// 1. tệp phụ cho HM-23 (Trung tâm nhập: bản trùng ngày + tệp sai loại)
fs.copyFileSync(path.join(DATA, '30.09.2026.XLS'), path.join(EXTRA, '30.09.2026 (1).XLS'));
fs.writeFileSync(path.join(EXTRA, 'ghi_chu.pdf'), '%PDF-1.4\n% tệp giả cho kiểm thử Trung tâm nhập (bỏ qua loại tệp)\n%%EOF\n');
// 2. Python xlrd + openpyxl
const env = Object.assign({}, process.env, { QLTD_REAL_DATA: DATA, QLTD_REAL_EXTRA: EXTRA, QLTD_REAL_ROWS: ROWS, QLTD_WORK: WORK, QLTD_OUT: OUT, QLTD_APP: APP, QLTD_PYLIB: PYLIB, PYTHONPATH: PYLIB + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : '') });
const pyOk = () => cp.spawnSync('python3', ['-c', 'import xlrd, openpyxl'], { env }).status === 0;
if (!pyOk()) { log('… cài xlrd + openpyxl vào ' + PYLIB); const r = cp.spawnSync('python3', ['-m', 'pip', 'install', '-q', '--target', PYLIB, 'xlrd', 'openpyxl'], { env, encoding: 'utf8' }); if (!pyOk()) die('không cài được xlrd/openpyxl: ' + (r.stderr || '').slice(-300)); }
// 3. máy chủ HTTP cổng ngẫu nhiên: /index.html = app (kịch bản cũ chạy trên http://…/index.html)
const html = fs.readFileSync(APP);
const srv = http.createServer((q, s) => { if (q.url.split('?')[0] === '/index.html' || q.url === '/') { s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); s.end(html); } else { s.writeHead(404); s.end(); } });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); env.QLTD_APP_URL = 'http://127.0.0.1:' + srv.address().port + '/index.html'; log('Máy chủ: ' + env.QLTD_APP_URL);
const run = (cmd, args, t, outFile) => new Promise(res => { const c = cp.spawn(cmd, args, { cwd: SC, env }); let o = ''; c.stdout.on('data', d => o += d); c.stderr.on('data', d => o += d);
  const to = setTimeout(() => { o += '\n[HẾT GIỜ]'; c.kill('SIGKILL'); }, t); c.on('close', code => { clearTimeout(to); if (outFile) fs.writeFileSync(outFile, o); res({ code, o }); }); });
// 4. chuẩn bị đối chiếu độc lập
const t0 = Date.now();
{ const r = await run('node', ['extract.js', ...PER], 1800000, path.join(LOGS, 'extract.txt')); if (r.code !== 0 || !fs.existsSync(path.join(ROWS, 'rows_20_10_2026_XLS.json'))) die('extract.js lỗi — xem ' + LOGS + '/extract.txt'); }
for (const [py, out] of [['trend_indep.py', 'trend_indep.json'], ['kh360_indep.py', 'kh360_indep.json'], ['report_indep.py', 'report_indep.json'], ['warn_indep.py', 'warn_indep.json'], ['ts_indep.py', 'ts_indep.json']]) {
  const r = await run('python3', [py], 600000); if (r.code !== 0) die(py + ' lỗi: ' + r.o.slice(-300)); fs.writeFileSync(path.join(WORK, out), r.o.trim().split('\n').pop()); }
const sha = {}; for (const d of [DATA, EXTRA]) for (const f of fs.readdirSync(d)) sha[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(d, f))).digest('hex');
fs.writeFileSync(path.join(WORK, 'sha_all.json'), JSON.stringify(sha));
log('Đã dựng môi trường (' + Math.round((Date.now() - t0) / 1000) + ' s).\n');
// 5. kịch bản: [tên, lệnh, đối số, cách chấm]
const passFail = o => { const m = /PASS (\d+) FAIL (\d+)\s*$/.exec(o.trim()); return m ? { ok: +m[2] === 0 && +m[1] > 0, note: m[1] + ' đạt / ' + m[2] + ' lỗi' } : { ok: false, note: 'không thấy dòng PASS/FAIL' }; };
const noErr = o => { const m = /errs (\[.*\])\s*$/m.exec(o); return m ? { ok: m[1] === '[]', note: m[1] === '[]' ? 'không lỗi JS' : 'lỗi JS: ' + m[1].slice(0, 120) } : { ok: false, note: 'không thấy dòng errs' }; };
const F = 'file://' + APP;
const SCN = [
  ['hm17c', ['hm17c_real.js', APP, DATA], passFail], ['hm23', ['hm23_test.js', F], passFail], ['hm24', ['hm24_test.js', F], passFail], ['hm25', ['hm25_test.js', F], passFail],
  ['hm26', ['hm26_test.js', F], passFail], ['hm15', ['hm15_test.js', APP], passFail], ['hm19', ['hm19_test.js', F], passFail],
  ['hm09b', ['hm09b_real.js'], o => { const e = noErr(o); let iss = null; try { iss = JSON.parse(o.slice(o.indexOf('{'), o.lastIndexOf('}') + 1)).issues; } catch (x) {} return { ok: e.ok && Array.isArray(iss) && iss.length === 0, note: 'vấn đề đối chiếu: ' + (iss ? iss.length : '?') + ' · ' + e.note }; }],
  ['real10', ['real10.js'], noErr], ['real12', ['real12.js'], noErr],
  ['hm28b', ['hm28b_real.js', APP], noErr, ['python3', ['hm28b_check.py'], passFail]],
  ['td_pl02', ['td_pl02.test.js', APP, path.join(DATA, 'PL02.docx')], passFail]
].filter(s => !ONLY.length || ONLY.includes(s[0]));
let bad = 0;
for (const [name, args, judge, then] of SCN) {
  const t = Date.now(), r = await run('node', args, 1800000, path.join(LOGS, name + '.txt')); let j = judge(r.o);
  if (j.ok && then) { const r2 = await run(then[0], then[1], 600000, path.join(LOGS, name + '_check.txt')); const j2 = then[2](r2.o); j = { ok: j2.ok, note: j.note + ' · kiểm chéo: ' + j2.note }; }
  if (!j.ok) bad++; log((j.ok ? '✔ ' : '✘ ') + name.padEnd(8) + ' ' + j.note + '  (' + Math.round((Date.now() - t) / 1000) + ' s)');
}
srv.close();
log('\nTỔNG: ' + (SCN.length - bad) + '/' + SCN.length + ' kịch bản đạt' + (bad ? ' — xem nhật ký ở ' + LOGS : ''));
if (has('--keep') || bad) log('Giữ thư mục tạm (CÓ dữ liệu trích từ tệp thật — xoá khi xong): ' + WORK);
else fs.rmSync(WORK, { recursive: true, force: true });
process.exit(bad ? 1 : 0);

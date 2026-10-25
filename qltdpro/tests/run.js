#!/usr/bin/env node
/* QLTD PRO — chạy MỘT lệnh, báo pass/fail toàn bộ bộ kiểm thử.
   node tests/run.js [--app <app.html>] [--no-e2e] [--mutation] [--real <thư mục dữ liệu thật>]
   Tầng 0  src/ → tools/build.mjs dựng ra ĐÚNG tệp phát hành; các cổng (biên dịch, check-vendor, scan-pii) bắt được lỗi giả
   Tầng 1  biên dịch mọi khối <script> của app (chống lỗi kiểu HM-01)
   Tầng 2  kiểm thử đơn vị các module td_*.js (Node thuần)
   Tầng 3  module nhúng trong app = tệp nguồn (không lệch giữa nguồn đã kiểm thử và bản chạy)
   Tầng 4  e2e Playwright trên fixture ẩn danh (tests/fixtures) — mỗi phép kiểm gắn mã HM
   --mutation  cố ý phá mã trong bản sao của app, kiểm tra bộ test PHÁT HIỆN được (test thất bại với mã lỗi)
   --real <dir>  (tuỳ chọn) kiểm thử bổ sung trên tệp dữ liệu thật nếu có (không đóng gói vì PII) */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..'), SC = path.join(ROOT, 'evidence/scripts');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; }, has = k => process.argv.includes(k);
let APP = arg('--app'); if (!APP) { const a = fs.readdirSync(path.join(ROOT, 'app')).filter(f => /\.html$/.test(f)).sort(); APP = path.join(ROOT, 'app', a[a.length - 1]); }
APP = path.resolve(APP); if (!fs.existsSync(APP)) { console.error('Không thấy app: ' + APP); process.exit(2); }
const env = Object.assign({}, process.env, { NODE_PATH: process.env.NODE_PATH || cp.execSync('npm root -g').toString().trim() });
const rows = []; const add = (tang, name, ok, info) => { rows.push({ tang, name, ok, info: info || '' }); console.log((ok ? '  ✔ ' : '  ✘ ') + name + (info ? '  — ' + info : '')); };
const run = (cmd, args, t) => { const r = cp.spawnSync(cmd, args, { env, encoding: 'utf8', timeout: t || 600000, maxBuffer: 1 << 26 }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
console.log('App: ' + path.relative(ROOT, APP) + '\n');
console.log('Tầng 0 — src/ dựng ra đúng tệp phát hành (HM-20) và các cổng build bắt được lỗi');
if (path.dirname(APP) !== path.join(ROOT, 'app')) console.log('  … bỏ qua (app không nằm trong app/)');
else { const r = run('node', [path.join(__dirname, 'src.test.js'), APP], 300000), m = /PASS (\d+)\s+FAIL (\d+)/.exec(r.out); add(0, 'src → build == app: ' + (m ? m[1] + ' phép kiểm đạt, ' + m[2] + ' lỗi' : '?'), r.code === 0 && m && +m[2] === 0, r.code ? r.out.split('\n').filter((l) => /^FAIL/.test(l)).slice(0, 2).join(' | ') : ''); }
console.log('\nTầng 1 — biên dịch mọi khối <script>');
{ const r = run('node', [path.join(SC, 'check_scripts.js'), APP]); let j = {}; try { j = JSON.parse(r.out.trim().split('\n').pop()) } catch (e) {} add(1, 'check_scripts: ' + (j.checked || '?') + ' khối, ' + (j.failed == null ? '?' : j.failed) + ' lỗi', r.code === 0 && j.failed === 0, j.failed ? JSON.stringify(j.bad).slice(0, 160) : ''); }
console.log('\nTầng 2 — kiểm thử đơn vị (module td_*.js)');
const NEEDS_APP = ['td_reportdocx.test.js'], NEEDS_REAL = ['td_pl02.test.js'];
fs.readdirSync(SC).filter(f => /^td_.*\.test\.js$/.test(f)).sort().forEach(f => {
  if (NEEDS_REAL.includes(f) && !has('--real')) { console.log('  … ' + f + ' bỏ qua (cần PL02 .docx thật: --real)'); return; }
  const a = NEEDS_APP.includes(f) ? [path.join(SC, f), APP] : NEEDS_REAL.includes(f) ? [path.join(SC, f), APP, path.join(arg('--real'), 'PL02.docx')] : [path.join(SC, f)];
  const r = run('node', a, 120000), m = /PASS (\d+)\s+FAIL (\d+)/.exec(r.out) || /(\d+) đạt, (\d+) lỗi/.exec(r.out);
  add(2, f.replace('.test.js', '') + (m ? ': ' + m[1] + ' ca đạt, ' + m[2] + ' lỗi' : ''), r.code === 0 && (!m || +m[2] === 0), r.code ? r.out.trim().split('\n').slice(-2).join(' | ').slice(0, 200) : '');
});
console.log('\nTầng 3 — module nhúng trong app = tệp nguồn');
{ const html = fs.readFileSync(APP, 'utf8').replace(/\s+/g, ''); let n = 0, bad = []; // so sánh bỏ khoảng trắng (script nhúng có thể đổi thụt lề)
  fs.readdirSync(SC).filter(f => /^td_[a-z0-9]+\.js$/.test(f)).sort().forEach(f => { // chấp nhận cả bản giữ lẫn bản bỏ dòng module.exports
    const raw = fs.readFileSync(path.join(SC, f), 'utf8'), no = raw.replace(/^[ \t]*if \(typeof module !== 'undefined' && module\.exports\)[^\n]*\n/m, ''); n++;
    if (!html.includes(raw.replace(/\s+/g, '')) && !html.includes(no.replace(/\s+/g, ''))) bad.push(f); });
  add(3, n + ' module nguồn đều nhúng nguyên văn trong app', bad.length === 0, bad.join(', ')); }
if (!has('--no-e2e')) {
  console.log('\nTầng 4 — e2e (Playwright + Chromium, fixture ẩn danh)');
  const r = run('node', [path.join(__dirname, 'e2e/suite.js'), APP, '--json', '/tmp/td_e2e.json'], 900000);
  let J = []; try { J = JSON.parse(fs.readFileSync('/tmp/td_e2e.json', 'utf8')) } catch (e) {}
  if (!J.length) add(4, 'e2e không chạy được', false, r.out.slice(-300)); else { const f = J.filter(x => !x.ok); add(4, 'e2e: ' + (J.length - f.length) + '/' + J.length + ' phép kiểm đạt (' + [...new Set(J.map(x => x.hm))].length + ' nhóm HM)', f.length === 0, f.slice(0, 3).map(x => '[' + x.hm + '] ' + x.name).join(' | ')); }
}
if (has('--mutation')) { console.log('\nTầng 5 — đột biến (bộ test phải thất bại với mã lỗi)'); const r = run('node', [path.join(__dirname, 'mutation.js'), APP], 10800000); process.stdout.write(r.out.split('\n').map(l => '  ' + l).join('\n') + '\n'); add(5, 'bộ test phát hiện mọi đột biến', r.code === 0); }
if (has('--real')) console.log('\n(--real: các kiểm thử dữ liệu thật nằm ở evidence/scripts/hm*_real.js, hm17b_test.js… — chạy riêng, xem tests/README.md)');
const f = rows.filter(x => !x.ok); console.log('\n' + '═'.repeat(60) + '\nTỔNG: ' + (rows.length - f.length) + '/' + rows.length + ' nhóm đạt' + (f.length ? ' — ' + f.length + ' NHÓM LỖI' : ' — TẤT CẢ ĐẠT')); process.exit(f.length ? 1 : 0);

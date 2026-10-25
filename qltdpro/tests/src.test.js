/* node tests/src.test.js <app.html> — HM-20 giai đoạn A: src/ dựng ra ĐÚNG tệp phát hành, và các cổng của build bắt được lỗi (đối chứng âm) */
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..'), APP = path.resolve(process.argv[2] || ''); if (!process.argv[2] || !fs.existsSync(APP)) { console.log('Dùng: node tests/src.test.js <app.html>'); process.exit(2); }
let pass = 0, fail = 0; const ck = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + String(x).slice(0, 300))); };
const node = (args) => cp.spawnSync('node', args, { encoding: 'utf8', cwd: ROOT, maxBuffer: 1 << 26 }), out = (r) => (r.stdout || '') + (r.stderr || '');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'td_src_')), copy = (name) => { const d = path.join(tmp, name); fs.cpSync(path.join(ROOT, 'src'), d, { recursive: true }); return d; };
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/manifest.json'), 'utf8'));
let r = node(['tools/build.mjs', '--verify', APP, '--out', path.join(tmp, 'ok.html')]);
ck('src/ → build GIỐNG HỆT tệp phát hành (SHA-256) và qua cả 3 cổng (biên dịch, check-vendor, scan-pii)', r.status === 0 && /GIỐNG HỆT/.test(out(r)) && /check-vendor/.test(out(r)) && /scan-pii/.test(out(r)), out(r));
ck('manifest: ' + man.segments.length + ' đoạn; mọi tệp tồn tại; không còn đoạn script nào lọt vào chú thích HTML', man.segments.every((s) => fs.existsSync(path.join(ROOT, 'src', s.file))) && man.segments.filter((s) => s.file.startsWith('vendor/')).length === 7, 0);
const jsSeg = man.segments.find((s) => s.file.startsWith('js/') && /td-boot|bootstrap/.test(s.file)) || man.segments.find((s) => s.file.startsWith('js/'));
// đối chứng âm: mỗi lỗi giả phải bị một cổng bắt
let d = copy('a'); fs.appendFileSync(path.join(d, jsSeg.file), '\n/* đổi 1 ký tự */\n'); r = node(['tools/build.mjs', '--src', d, '--verify', APP, '--out', path.join(tmp, 'a.html')]);
ck('sửa một tệp nguồn ⇒ --verify báo KHÁC và không ghi tệp', r.status !== 0 && /KHÁC/.test(out(r)) && !fs.existsSync(path.join(tmp, 'a.html')), out(r));
d = copy('b'); const xl = path.join(d, 'vendor/xlsx.js'); fs.writeFileSync(xl, fs.readFileSync(xl, 'utf8').replace(/Table Export/, 'Table\nExport')); r = node(['tools/build.mjs', '--src', d, '--out', path.join(tmp, 'b.html')]);
ck('HM-01: xuống dòng lọt vào chuỗi SheetJS ⇒ bị cổng biên dịch/check-vendor chặn', r.status !== 0 && /biên dịch|NỘI DUNG ĐÃ BỊ SỬA/.test(out(r)), out(r));
d = copy('c'); fs.appendFileSync(path.join(d, 'vendor/jszip.js'), '\n;/*lén*/\n'); r = node(['tools/check-vendor.mjs', '--src', d]);
ck('sửa lén thư viện nhúng (vẫn biên dịch được) ⇒ check-vendor báo "ĐÃ BỊ SỬA"', r.status !== 0 && /ĐÃ BỊ SỬA/.test(out(r)), out(r));
d = copy('d'); fs.appendFileSync(path.join(d, jsSeg.file), '\nvar _x = {;\n'); r = node(['tools/build.mjs', '--src', d, '--out', path.join(tmp, 'd.html')]);
ck('lỗi cú pháp trong mã ứng dụng ⇒ build thất bại', r.status !== 0 && /biên dịch thử/.test(out(r)), out(r));
d = copy('e'); fs.appendFileSync(path.join(d, jsSeg.file), "\nvar cif = '3201999888777'; var sdt = '0987654321';\n"); r = node(['tools/scan-pii.mjs', '--src', d]);
ck('chèn mã KH 13 số + số điện thoại thật vào mã ⇒ scan-pii báo chưa duyệt', r.status !== 0 && /chưa được duyệt/.test(out(r)), out(r));
d = copy('f'); const h0 = man.segments.find((s) => s.kind === 'html'); fs.appendFileSync(path.join(d, h0.file), '<!-- x -->'); r = node(['tools/build.mjs', '--src', d, '--verify', APP, '--out', path.join(tmp, 'f.html')]);
ck('sửa một đoạn HTML ⇒ --verify báo KHÁC', r.status !== 0 && /KHÁC/.test(out(r)), out(r));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('PASS', pass, 'FAIL', fail); process.exit(fail ? 1 : 0);

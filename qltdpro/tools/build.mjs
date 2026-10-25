#!/usr/bin/env node
// Dựng tệp HTML MỘT TỆP từ src/ theo thứ tự trong manifest (mở được bằng file://).
//   node tools/build.mjs                       → dist/<release>
//   node tools/build.mjs --verify app/<tệp>    → SHA-256 bản dựng phải BẰNG tệp phát hành đã có (giai đoạn A: tách nguồn không đổi hành vi)
//   node tools/build.mjs --release             → ghi thẳng vào app/<release>
//   --src <thư mục>  dùng thư mục src khác; --no-gates bỏ các cổng kiểm tra (không khuyến nghị)
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, sha256, arg, has, srcDir, loadManifest, readSeg, assemble, isJs, compileErr } from './lib.mjs';
import { checkVendor } from './check-vendor.mjs'; import { checkPii } from './scan-pii.mjs';
const dir = srcDir(), m = loadManifest(dir); let fail = 0; const bad = (t) => { console.error('✘ ' + t); fail++; };
if (!has('--no-gates')) {
  const ce = m.segments.filter(isJs).map((s) => [s.file, compileErr(readSeg(dir, s), s.file)]).filter((x) => x[1]);
  if (ce.length) bad('biên dịch thử: ' + ce.length + ' khối lỗi\n  ' + ce.map((x) => x[0] + ': ' + x[1]).join('\n  ')); else console.log(`✔ biên dịch thử: ${m.segments.filter(isJs).length} khối script`);
  const v = checkVendor(dir); if (v.errs.length) bad('check-vendor:\n  ' + v.errs.join('\n  ')); else console.log(`✔ check-vendor: ${Object.keys(v.cur).length} thư viện nguyên vẹn`);
  const p = checkPii(dir); if (p.errs.length) bad('scan-pii:\n  ' + p.errs.join('\n  ')); else console.log(`✔ scan-pii: không có chuỗi giống dữ liệu cá nhân ngoài danh sách đã duyệt (${p.found.size} đã duyệt)`);
}
const html = assemble(dir, m), buf = Buffer.from(html, 'utf8'), sha = sha256(buf);
const out = has('--release') ? path.join(ROOT, 'app', m.release) : path.resolve(arg('--out', path.join(ROOT, 'dist', m.release)));
const ver = arg('--verify'); if (ver) { const ref = sha256(fs.readFileSync(ver)); if (ref === sha) console.log(`✔ verify: bản dựng GIỐNG HỆT ${path.basename(ver)} (SHA-256 ${sha.slice(0, 16)}…)`); else bad(`verify: bản dựng ${sha.slice(0, 16)}… KHÁC ${path.basename(ver)} ${ref.slice(0, 16)}…`); }
if (fail) { console.error(`\nBuild THẤT BẠI (${fail} lỗi) — không ghi tệp.`); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf);
console.log(`✔ đã dựng ${path.relative(ROOT, out)} — ${(buf.length / 1048576).toFixed(2)} MB, SHA-256 ${sha}`);

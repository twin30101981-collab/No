#!/usr/bin/env node
// Kiểm tra thư viện nhúng (src/vendor): đủ tệp, biên dịch được, và KHÔNG bị sửa so với băm đã ghi trong src/vendor/VENDORS.json.
// (HM-01: hai khối <style> từng bị chèn nhầm vào chuỗi JS của SheetJS ⇒ cả thư viện hỏng.)  --update: ghi lại băm sau khi CHỦ ĐỘNG nâng cấp thư viện.
import fs from 'node:fs'; import path from 'node:path';
import { sha256, srcDir, loadManifest, readSeg, isVendor, compileErr, has } from './lib.mjs';
export function checkVendor(dir) {
  const m = loadManifest(dir), vf = path.join(dir, 'vendor', 'VENDORS.json'), errs = [], cur = {};
  m.segments.filter(isVendor).forEach((s) => { const code = readSeg(dir, s); cur[s.file] = { sha256: sha256(code), bytes: Buffer.byteLength(code) };
    const ce = compileErr(code, s.file); if (ce) errs.push(`${s.file}: không biên dịch được — ${ce}`); if (!code.trim()) errs.push(`${s.file}: rỗng`); });
  if (has('--update')) { fs.writeFileSync(vf, JSON.stringify(cur, null, 1) + '\n'); return { errs, cur, updated: true }; }
  if (!fs.existsSync(vf)) { errs.push('thiếu src/vendor/VENDORS.json (chạy: node tools/check-vendor.mjs --update)'); return { errs, cur }; }
  const rec = JSON.parse(fs.readFileSync(vf, 'utf8'));
  for (const k of Object.keys(rec)) if (!cur[k]) errs.push(`${k}: có trong VENDORS.json nhưng không còn trong manifest`);
  for (const k of Object.keys(cur)) { if (!rec[k]) errs.push(`${k}: thư viện mới chưa được ghi băm (--update sau khi xem xét)`); else if (rec[k].sha256 !== cur[k].sha256) errs.push(`${k}: NỘI DUNG ĐÃ BỊ SỬA (băm ${cur[k].sha256.slice(0, 12)}… ≠ ${rec[k].sha256.slice(0, 12)}…)`); }
  return { errs, cur };
}
if (import.meta.url === 'file://' + process.argv[1]) {
  const r = checkVendor(srcDir()); const n = Object.keys(r.cur).length;
  if (r.updated) console.log(`✔ đã ghi băm ${n} thư viện vào src/vendor/VENDORS.json`);
  else if (r.errs.length) { console.error('✘ check-vendor:\n  ' + r.errs.join('\n  ')); process.exit(1); } else console.log(`✔ check-vendor: ${n} thư viện nguyên vẹn, biên dịch được`);
}

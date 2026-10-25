#!/usr/bin/env node
// Quét src/ (không gồm thư viện) tìm chuỗi giống dữ liệu cá nhân: mã KH 13 số (32…), số khoản vay IPCAS, CCCD 12 số, số điện thoại, email, số TK 13–16 số.
// Mọi khớp phải nằm trong danh sách ĐÃ DUYỆT (tools/pii-allow.json, lưu băm SHA-256 của giá trị — không lưu giá trị). Khớp mới ⇒ build thất bại.
// --approve: ghi lại danh sách duyệt từ trạng thái hiện tại (chỉ chạy sau khi NGƯỜI quyết định chấp nhận). Nền: HM-05 (21/10/2026); P10 (25/10/2026) gỡ DATA.macb + giá trị trông như thật ⇒ chỉ còn placeholder/hằng số. Băm số ngắn (số TK có tiền tố cố định) đảo ngược được ⇒ không bao giờ duyệt số thật.
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, sha256, srcDir, loadManifest, readSeg, isVendor, has } from './lib.mjs';
export const PATTERNS = { 'mã KH 13 số': /(?<![\d.])32\d{11}(?![\d])/g, 'số khoản vay IPCAS': /\b32\d{2}L[A-Z]{2}\d{9}\b/g, 'CCCD 12 số': /(?<![\d.])\d{12}(?![\d.])/g,
  'điện thoại VN': /(?<![\d.])0[35789]\d{8}(?![\d])/g, 'email': /[\w.+-]+@[\w-]+\.[a-z]{2,}(?:\.[a-z]{2,})?/gi, 'số TK 13–16 số': /(?<![\d.])\d{13,16}(?![\d.])/g };
const EMAIL_OK = /@\d+\.\d+\.\d+$/; // docx@9.0.2 … (tên gói@phiên bản, không phải email)
export function scan(dir) {
  const m = loadManifest(dir), found = new Map();
  for (const s of m.segments) { if (isVendor(s)) continue; const text = readSeg(dir, s);
    for (const [k, re] of Object.entries(PATTERNS)) { re.lastIndex = 0; let x; while ((x = re.exec(text))) { if (k === 'email' && EMAIL_OK.test(x[0])) continue; const h = sha256(k + '|' + x[0]); if (!found.has(h)) found.set(h, { kind: k, file: s.file, preview: x[0].slice(0, 3) + '…' + x[0].slice(-2) }); } } }
  return found;
}
export function checkPii(dir, allowFile = path.join(ROOT, 'tools', 'pii-allow.json')) {
  const found = scan(dir);
  if (has('--approve')) { fs.writeFileSync(allowFile, JSON.stringify({ ghi_chu: 'Băm SHA-256 của các chuỗi giống dữ liệu cá nhân ĐÃ ĐƯỢC DUYỆT (chỉ placeholder/ví dụ/hằng số — P10 25/10/2026 đã gỡ DATA.macb theo quyết định người dùng). Không chứa giá trị gốc. LƯU Ý: băm số ngắn có thể đảo ngược — KHÔNG duyệt số thật.', approved: [...found.keys()].sort() }, null, 1) + '\n'); return { errs: [], found, approved: true }; }
  const allow = new Set(fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')).approved : []);
  const errs = []; for (const [h, v] of found) if (!allow.has(h)) errs.push(`${v.file}: ${v.kind} chưa được duyệt (${v.preview})`);
  return { errs, found };
}
if (import.meta.url === 'file://' + process.argv[1]) {
  const r = checkPii(srcDir());
  if (r.approved) console.log(`✔ đã ghi ${r.found.size} giá trị được duyệt vào tools/pii-allow.json`);
  else if (r.errs.length) { console.error('✘ scan-pii: phát hiện chuỗi giống dữ liệu cá nhân CHƯA duyệt:\n  ' + r.errs.join('\n  ')); process.exit(1); } else console.log(`✔ scan-pii: ${r.found.size} chuỗi giống dữ liệu cá nhân đều thuộc danh sách đã duyệt; không có chuỗi mới`);
}

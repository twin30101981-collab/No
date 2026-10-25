// Tiện ích dùng chung cho công cụ build (Node thuần, không phụ thuộc gói ngoài)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import vm from 'node:vm';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');
export const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
export const has = (k) => process.argv.includes(k);
export const srcDir = () => path.resolve(arg('--src', path.join(ROOT, 'src')));
export const loadManifest = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
export const readSeg = (dir, s) => fs.readFileSync(path.join(dir, s.file), 'utf8');
/** Ghép đúng theo thứ tự manifest: html nguyên văn; script/style bọc lại bằng đúng chuỗi thuộc tính ban đầu. */
export function assemble(dir, m = loadManifest(dir)) {
  return m.segments.map((s) => s.kind === 'html' ? readSeg(dir, s) : '<' + s.kind + s.attrs + '>' + readSeg(dir, s) + '</' + s.kind + '>').join('');
}
/** Khối script có phải mã JS cần biên dịch thử không (bỏ qua type dữ liệu như application/json, text/template…) */
export function isJs(s) { const t = /\btype\s*=\s*["']([^"']*)["']/i.exec(s.attrs || ''); return s.kind === 'script' && (!t || /^(text|application)\/(javascript|x-td-deferred)$|^module$/i.test(t[1])); }
export function compileErr(code, name) { try { new vm.Script(code, { filename: name }); return null; } catch (e) { return e.message; } }
export const isVendor = (s) => s.kind === 'script' && s.file.startsWith('vendor/');

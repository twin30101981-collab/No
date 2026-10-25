#!/usr/bin/env node
// Tách một tệp HTML phát hành thành src/ (một lần, cơ học): ranh giới <script>/<style> giữ nguyên thứ tự; ghép lại phải byte-giống-hệt.
// node tools/split.mjs <app.html> [--src src] [--release <tên tệp phát hành>]
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, sha256, arg, assemble } from './lib.mjs';
const app = process.argv[2]; if (!app || app.startsWith('--')) { console.error('Dùng: node tools/split.mjs <app.html> [--src src]'); process.exit(2); }
const out = path.resolve(arg('--src', path.join(ROOT, 'src'))), text = fs.readFileSync(app, 'utf8'), srcSha = sha256(fs.readFileSync(app));
const slug = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const nameOf = (kind, attrs, code) => {
  const id = /\bid\s*=\s*"([^"]+)"/.exec(attrs), tag = /data-tag\s*=\s*"([^"]+)"/.exec(attrs);
  if (id) return slug(id[1]); if (tag) return slug(tag[1]);
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 40);
  const cm = lines.filter((l) => /^(\/\*|\*|\/\/)/.test(l)).map((l) => l.replace(/^[\s/*#=─═-]+|[\s*/]+$/g, '')).find((l) => /[A-Za-zÀ-ỹ]{4}/.test(l) && !/^(function|const|let|var)\b/.test(l));
  if (cm && slug(cm).length >= 4) return slug(cm);
  const decl = /(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(code.slice(0, 4000)); return slug(decl && decl[1]) || kind;
};
fs.rmSync(out, { recursive: true, force: true }); for (const d of ['html', 'js', 'css', 'vendor']) fs.mkdirSync(path.join(out, d), { recursive: true });
const segs = []; let pos = 0, n = 0; const used = new Set();
const pad = (i) => String(i).padStart(3, '0');
const push = (s, content) => { fs.writeFileSync(path.join(out, s.file), content); segs.push(s); };
// Bộ quét theo HTML: bỏ qua <!-- … --> (chú thích có thể chứa chữ "<script …>" — nếu không sẽ nuốt nhầm cả khối vendor kế tiếp)
const openRe = /<!--|<(script|style)(?=[\s>])([^>]*)>/g; let m;
while ((m = openRe.exec(text))) {
  if (m[0] === '<!--') { const e = text.indexOf('-->', m.index + 4); openRe.lastIndex = e < 0 ? text.length : e + 3; continue; }
  const kind = m[1], attrs = m[2], close = '</' + kind + '>', from = m.index + m[0].length, end = text.indexOf(close, from);
  if (end < 0) break; const code = text.slice(from, end);
  if (m.index > pos) push({ kind: 'html', file: `html/${pad(n++)}.html` }, text.slice(pos, m.index));
  let file;
  if (kind === 'style') file = `css/${pad(n++)}-${nameOf(kind, attrs, code)}.css`;
  else if (/\bid\s*=\s*"td-vendor-([^"]+)"/.test(attrs) && /data-vendor/.test(attrs)) { const v = /id\s*=\s*"td-vendor-([^"]+)"/.exec(attrs)[1]; file = `vendor/${slug(v)}.js`; n++; }
  else file = `js/${pad(n++)}-${nameOf(kind, attrs, code)}.js`;
  if (used.has(file)) file = file.replace(/(\.\w+)$/, `-${n}$1`); used.add(file);
  push({ kind, file, attrs }, code); pos = end + close.length; openRe.lastIndex = pos;
}
push({ kind: 'html', file: `html/${pad(n++)}.html` }, text.slice(pos));
const manifest = { format: 1, release: arg('--release', path.basename(app)), source_sha256: srcSha, segments: segs };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
const back = sha256(Buffer.from(assemble(out, manifest), 'utf8'));
const c = (k) => segs.filter((s) => s.kind === k).length;
console.log(`Đã tách ${segs.length} đoạn: ${c('html')} html, ${c('style')} css, ${segs.filter((s) => s.file.startsWith('js/')).length} js, ${segs.filter((s) => s.file.startsWith('vendor/')).length} vendor → ${path.relative(process.cwd(), out)}`);
console.log(back === srcSha ? '✔ ghép lại byte-giống-hệt bản gốc (SHA-256 ' + back.slice(0, 16) + '…)' : '✘ KHÔNG khớp: ' + back.slice(0, 16) + ' ≠ ' + srcSha.slice(0, 16)); process.exit(back === srcSha ? 0 : 1);

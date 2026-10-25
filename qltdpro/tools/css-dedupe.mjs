#!/usr/bin/env node
/* HM-21 (phạm vi nhỏ): xoá quy tắc CSS trùng Y HỆT (cùng ngữ cảnh @media/@supports, cùng selector, cùng khai báo) khi có bản giống hệt
   đứng SAU trong thứ tự tài liệu (src/css theo thứ tự tệp). Bản sau luôn quyết định giá trị nên bản trước là thừa ⇒ không đổi cascade.
   node tools/css-dedupe.mjs          — báo cáo (không sửa)
   node tools/css-dedupe.mjs --write  — ghi lại các tệp src/css */
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), DIR = path.join(ROOT, 'src/css');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.css')).sort();
const unc = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const normSel = s => unc(s).replace(/\s+/g, ' ').replace(/\s*([,>+~])\s*/g, '$1').trim(); // không bỏ khoảng trắng quanh ':' (".x :hover" ≠ ".x:hover")
const normBody = s => unc(s).replace(/\s+/g, ' ').replace(/\s*([;:,])\s*/g, '$1').replace(/;+$/, '').trim();
const norm = s => { const b = s.indexOf('{'); return b < 0 ? normSel(s) : normSel(s.slice(0, b)) + '{' + normBody(s.slice(b + 1, s.lastIndexOf('}'))) + '}'; };
/* scan(text, from, to, ctx, out): ghi {start,end,key,ctx} cho mỗi quy tắc; đệ quy vào @media/@supports */
function skipWsComments(t, i, to) { for (;;) { while (i < to && /\s/.test(t[i])) i++; if (t.startsWith('/*', i)) { const e = t.indexOf('*/', i + 2); i = e < 0 ? to : e + 2; continue; } return i; } }
function matchBlock(t, i, to) { // i ở '{' ⇒ vị trí sau '}' tương ứng
  let d = 0; for (; i < to; i++) { const c = t[i];
    if (c === '/' && t[i + 1] === '*') { const e = t.indexOf('*/', i + 2); i = e < 0 ? to : e + 1; continue; }
    if (c === '"' || c === "'") { for (i++; i < to && t[i] !== c; i++) if (t[i] === '\\') i++; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (d === 0) return i + 1; } }
  return to;
}
function scan(t, from, to, ctx, out) {
  let i = from;
  for (;;) {
    i = skipWsComments(t, i, to); if (i >= to) return;
    let bad = false; if (t[i] === '}') bad = true; // như trình duyệt: '}' thừa ở cấp gốc thuộc về selector của quy tắc kế tiếp ⇒ quy tắc đó vô hiệu
    let j = i; while (j < to && t[j] !== '{' && t[j] !== ';') { if (t.startsWith('/*', j)) { const e = t.indexOf('*/', j + 2); j = e < 0 ? to : e + 2; continue; } j++; }
    if (j >= to) return;
    if (t[j] === ';') { i = j + 1; continue; } // @import/@charset
    const prelude = t.slice(i, j), end = matchBlock(t, j, to);
    if (!bad && /^@(media|supports)\b/i.test(prelude.trim())) scan(t, j + 1, end - 1, ctx + '|' + norm(prelude), out);
    else if (!bad) out.push({ start: i, end, ctx, key: ctx + '§' + norm(t.slice(i, end)) }); // quy tắc vô hiệu: không dùng, không sửa
    i = end;
  }
}
const all = [];
files.forEach((f, fi) => { const t = fs.readFileSync(path.join(DIR, f), 'utf8'), out = []; scan(t, 0, t.length, '', out); out.forEach(r => all.push(Object.assign(r, { f, fi }))); });
/* khai báo: tách theo ';' ngoài ngoặc/chuỗi ⇒ [{prop, imp, text}] */
function decls(body) {
  const out = []; let d = 0, q = '', cur = '';
  for (let i = 0; i < body.length; i++) { const c = body[i];
    if (q) { cur += c; if (c === '\\') { cur += body[++i] || ''; } else if (c === q) q = ''; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '/' && body[i + 1] === '*') { const e = body.indexOf('*/', i + 2); cur += body.slice(i, e < 0 ? body.length : e + 2); i = e < 0 ? body.length : e + 1; continue; }
    if (c === '(') d++; else if (c === ')') d--;
    if (c === ';' && d === 0) { out.push(cur); cur = ''; continue; }
    cur += c; }
  if (cur.trim()) out.push(cur);
  return out.map(t => { const m = /^\s*(?:\/\*[\s\S]*?\*\/\s*)*([-a-zA-Z]+)\s*:([\s\S]*)$/.exec(t); return m ? { prop: m[1].toLowerCase(), imp: /!\s*important\s*$/i.test(m[2].replace(/\/\*[\s\S]*?\*\//g, '').trim()), text: t } : { prop: null, text: t }; });
}
// mức khai báo: (ngữ cảnh, selector) ⇒ khai báo của quy tắc sau đè khai báo cùng thuộc tính ở quy tắc trước (nếu !important ≥)
const PRUNE = process.argv.includes('--prune');
const TXT = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(DIR, f), 'utf8')]));
all.forEach(r => { const t = TXT[r.f].slice(r.start, r.end), b = t.indexOf('{');
  r.sel = norm(t.slice(0, b)); r.at = /^@/.test(r.sel); r.body = t.slice(b + 1, t.lastIndexOf('}')); r.ds = r.at || /[{}]/.test(r.body) ? null : decls(r.body); });
/* xác nhận bằng Chromium (playwright): selector phân tích được và khai báo được hỗ trợ — quy tắc/khai báo trình duyệt bỏ qua thì không thể "đè" */
async function browserCheck(rules) {
  const { createRequire } = await import('module'); const req = createRequire(import.meta.url); let pw;
  try { pw = req('playwright'); } catch (e) { try { pw = req(req('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } catch (e2) { console.error('✘ cần playwright để xác nhận bằng trình duyệt'); process.exit(2); } }
  const b = await pw.chromium.launch(), p = await b.newPage();
  const sels = [...new Set(rules.map(r => r.sel))], ds = [...new Set(rules.flatMap(r => r.ds.filter(d => d.prop).map(d => d.prop + '\u0000' + unc(d.text).replace(/^[^:]*:/, '').replace(/!\s*important\s*$/i, '').trim())))];
  const res = await p.evaluate(([sels, ds]) => ({ sel: sels.map(x => { try { const sh = new CSSStyleSheet(); sh.replaceSync(x + '{}'); return sh.cssRules.length === 1; } catch (e) { return false; } }),
    d: ds.map(x => { const [k, v] = x.split('\u0000'); return k.startsWith('--') || CSS.supports(k, v); }) }), [sels, ds]);
  await b.close();
  const okSel = new Map(sels.map((x, i) => [x, res.sel[i]])), okD = new Map(ds.map((x, i) => [x, res.d[i]]));
  rules.forEach(r => { r.selOk = okSel.get(r.sel); r.ds.forEach(d => { if (d.prop) d.ok = r.selOk && okD.get(d.prop + '\u0000' + unc(d.text).replace(/^[^:]*:/, '').replace(/!\s*important\s*$/i, '').trim()); }); });
}
let pruned = 0;
if (PRUNE) {
  await browserCheck(all.filter(r => r.ds));
  const seen = new Map(); // (ctx§sel) ⇒ Map(prop ⇒ imp mạnh nhất đã gặp ở các quy tắc SAU)
  for (let k = all.length - 1; k >= 0; k--) { const r = all[k]; if (!r.ds) continue;
    const id = r.ctx + '§' + r.sel, later = seen.get(id) || new Map();
    r.keep = r.ds.filter(d => !(d.prop && later.has(d.prop) && (later.get(d.prop) || !d.imp)));
    pruned += r.ds.length - r.keep.length;
    r.ds.forEach(d => { if (d.prop && d.ok) later.set(d.prop, (later.get(d.prop) || false) || d.imp); }); seen.set(id, later); }
}
const last = new Map(); all.forEach((r, k) => last.set(r.key, k));
const drop = all.filter((r, k) => (last.get(r.key) !== k && (!PRUNE || !r.ds || r.selOk)) || (r.keep && r.keep.filter(d => d.prop).length === 0 && r.ds.some(d => d.prop)));
const edit = PRUNE ? all.filter(r => r.keep && r.keep.length !== r.ds.length && drop.indexOf(r) < 0) : [];
console.log(all.length + ' quy tắc; xoá ' + drop.length + ' quy tắc thừa' + (PRUNE ? '; bỏ ' + pruned + ' khai báo bị quy tắc sau cùng selector đè (' + edit.length + ' quy tắc được rút gọn)' : ' (trùng y hệt)'));
if (process.argv.includes('--write')) {
  files.forEach(f => {
    const rs = drop.concat(edit).filter(r => r.f === f).sort((a, b) => b.start - a.start); if (!rs.length) return;
    let t = fs.readFileSync(path.join(DIR, f), 'utf8');
    rs.forEach(r => { const rep = drop.indexOf(r) >= 0 ? '' : t.slice(r.start, r.end).replace(/\{[\s\S]*\}$/, '{' + r.keep.map(d => d.text.trim()).filter(Boolean).join(';') + '}'); t = t.slice(0, r.start) + rep + t.slice(r.end); });
    fs.writeFileSync(path.join(DIR, f), t); console.log('  ' + f + ': sửa ' + rs.length + ' quy tắc');
  });
} else drop.slice(0, 8).forEach(r => console.log('  ' + r.f + ' ' + (r.ctx || '(gốc)').slice(0, 40) + ' :: ' + r.key.split('§')[1].slice(0, 100)));

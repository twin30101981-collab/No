// HM-08f — tìm khai báo `!important` THỪA: bỏ độ ưu tiên của nó thì kiểu dáng tính toán của MỌI phần tử khớp selector không đổi ở mọi trạng thái/độ rộng đã dựng.
// Dùng: node tests/tools/important_scan.js app/land-gis.html out.json  → {redundant:[{sheet,path,sel,prop}], needed:n, unknown:n}
const S = require('./states'); const fs = require('fs');
const agg = {};   // key -> {sel,prop,sheet,path, matched:0, needed:false}
(async () => {
  await S.run(process.argv[2], [360, 390, 430, 1366], async (p, name, W) => {
    const rs = await p.evaluate(() => {
      const res = []; const rules = [];
      function walk(list, sheet, path, mediaOk) {
        for (let i = 0; i < list.length; i++) {
          const r = list[i];
          if (r.type === 1) rules.push({ r, sheet, path: path.concat(i) });
          else if (r.type === 4 && r.cssRules) { const mt = r.media.mediaText; if (/print/.test(mt)) continue; walk(r.cssRules, sheet, path.concat(i), true); }   // bỏ @media print; @media màn hình: chỉ khối đang áp dụng mới ảnh hưởng
          else if (r.type === 12 && r.cssRules) walk(r.cssRules, sheet, path.concat(i), true);
        }
      }
      Array.from(document.styleSheets).forEach((sh, si) => { let l; try { l = sh.cssRules; } catch (e) { return; } const on = sh.ownerNode, tx = on && on.tagName === 'STYLE' ? on.textContent : ''; walk(l, si + '#' + tx.length + ':' + tx.slice(0, 60), [], false); });
      const skipSel = /:(hover|focus|active|visited|focus-within|focus-visible|target|checked|disabled|before|after|first-line|first-letter|placeholder|selection|-webkit|-moz)|::/i;
      const decls = r => { const t = r.cssText, b = t.slice(t.indexOf('{') + 1, t.lastIndexOf('}')), out = []; let cur = '', d = 0; for (const ch of b) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ';' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out.map(x => x.trim()).filter(x => /!important\s*$/.test(x)).map(x => { const k = x.indexOf(':'); return { prop: x.slice(0, k).trim().toLowerCase(), value: x.slice(k + 1).replace(/\s*!important\s*$/, '').trim() }; }); };
      const bySel = {}; rules.forEach(({ r }) => { (bySel[r.selectorText] = bySel[r.selectorText] || []).push(r); });   // bản sao cùng selector (CSS được nạp lại bởi JS) phải đổi ĐỒNG THỜI
      rules.forEach(({ r, sheet, path }) => {
        const st = r.style, ds = decls(r); if (!ds.length) return;
        const sel = r.selectorText; const skip = skipSel.test(sel);
        let els = []; if (!skip) { try { els = Array.from(document.querySelectorAll(sel)); } catch (e) { return; } }
        ds.forEach(d => {
          const t = document.createElement('i').style; t.setProperty(d.prop, d.value); const L = []; for (let i = 0; i < t.length; i++) if (st.getPropertyPriority(t[i]) === 'important') L.push(t[i]);
          if (!L.length) { res.push({ sheet, path, sel, prop: d.prop, matched: 0, changed: false, skip: true }); return; }
          if (skip) { res.push({ sheet, path, sel, prop: d.prop, matched: 0, changed: false, skip: true }); return; }
          const vals = L.map(k => st.getPropertyValue(k)), before = els.map(e => { const cs = getComputedStyle(e); return L.map(k => cs.getPropertyValue(k)).join('|'); });
          const grp = (bySel[sel] || [r]).filter(x => L.every(k => x.style.getPropertyPriority(k) === 'important'));
          grp.forEach(x => L.forEach((k, i) => x.style.setProperty(k, vals[i], '')));
          const after = els.map(e => { const cs = getComputedStyle(e); return L.map(k => cs.getPropertyValue(k)).join('|'); });
          grp.forEach(x => L.forEach((k, i) => x.style.setProperty(k, x.style.getPropertyValue(k), 'important')));
          let changed = false; for (let i = 0; i < els.length; i++) if (before[i] !== after[i]) { changed = true; break; }
          res.push({ sheet, path, sel, prop: d.prop, matched: els.length, changed });
        });
      });
      return res;
    });
    for (const x of rs) { const key = x.sheet + '|' + x.path.join('.') + '|' + x.prop; const a = agg[key] || (agg[key] = { sheet: x.sheet, path: x.path, sel: x.sel, prop: x.prop, matched: 0, needed: false, skip: false }); a.matched += x.matched; if (x.changed) a.needed = true; if (x.skip) a.skip = true; }
  }, { themes: ['light', 'dark'] });
  let red = Object.values(agg).filter(a => !a.needed && !a.skip && a.matched > 0);
  const keyOf = a => a.sheet + '|' + a.path.join('.') + '|' + a.prop;
  // PHA 2: bỏ ĐỒNG THỜI toàn bộ khai báo "thừa" rồi so kiểu dáng tính toán của mọi phần tử; khai báo gây khác biệt (tương tác giữa các luật) được trả về nhóm "cần".
  for (let iter = 0; iter < 8; iter++) {
    const R = red.map(a => ({ sheet: a.sheet, path: a.path, sel: a.sel, prop: a.prop })), culprits = new Set(); let unexplained = 0;
    await S.run(process.argv[2], [360, 390, 430, 1366], async (p, name, W) => {
      const r = await p.evaluate((R) => {
        const snap = () => Array.from(document.querySelectorAll('body, body *')).map(e => { const cs = getComputedStyle(e), o = {}; for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (k.startsWith('--') || /^(transition|animation|-webkit-)/.test(k) || k === 'perspective-origin' || k === 'transform-origin') continue; o[k] = cs.getPropertyValue(k); } return o; });
        const base = snap(), rules = {};
        const walk = (list, sheet, path) => { for (let i = 0; i < list.length; i++) { const r = list[i]; if (r.type === 1) rules[sheet + '|' + path.concat(i).join('.')] = r; else if ((r.type === 4 || r.type === 12) && r.cssRules && !/print/.test((r.media && r.media.mediaText) || '')) walk(r.cssRules, sheet, path.concat(i)); } };
        Array.from(document.styleSheets).forEach((sh, si) => { let l; try { l = sh.cssRules; } catch (e) { return; } const on = sh.ownerNode, tx = on && on.tagName === 'STYLE' ? on.textContent : ''; walk(l, si + '#' + tx.length + ':' + tx.slice(0, 60), []); });
        const allRules = Object.values(rules), applied = [];
        R.forEach((a, idx) => { const rule = rules[a.sheet + '|' + a.path.join('.')]; if (!rule) return; const t = document.createElement('i').style; const decl = rule.cssText.match(new RegExp('(?:^|[;{\\s])' + a.prop.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]*?)\\s*!important')); if (!decl) return; t.setProperty(a.prop, decl[1]); const L = []; for (let i = 0; i < t.length; i++) if (rule.style.getPropertyPriority(t[i]) === 'important') L.push(t[i]); allRules.filter(x => x.selectorText === rule.selectorText && L.every(k => x.style.getPropertyPriority(k) === 'important')).forEach(x => L.forEach(k => x.style.setProperty(k, x.style.getPropertyValue(k), ''))); applied.push({ idx, rule, L }); });
        const after = snap(), els = document.querySelectorAll('body, body *'), culprits = [], unexplained = [];
        for (let i = 0; i < els.length; i++) for (const k in base[i]) if (base[i][k] !== after[i][k]) { const c = applied.filter(x => x.L.includes(k) && els[i].matches(x.rule.selectorText)); if (c.length) c.forEach(x => culprits.push(x.idx)); else unexplained.push(els[i].tagName + ':' + k); }
        return { culprits: Array.from(new Set(culprits)), unexplained: unexplained.length };
      }, R);
      r.culprits.forEach(i => culprits.add(i)); unexplained += r.unexplained;
    }, { themes: ['light', 'dark'] });
    console.log('pha 2 vòng', iter, '· ứng viên', red.length, '· gây khác biệt:', culprits.size, '· khác biệt không quy được:', unexplained);
    if (!culprits.size) break;
    red = red.filter((a, i) => !culprits.has(i));
  }
  const all = Object.values(agg);
  fs.writeFileSync(process.argv[3], JSON.stringify({ redundant: red, needed: all.filter(a => a.needed).length, unknown: all.filter(a => !a.needed && (a.skip || a.matched === 0)).length, total: all.length }));
  console.log('khai báo !important (longhand):', all.length, '· thừa:', red.length, '· cần:', all.filter(a => a.needed).length, '· chưa rõ (không khớp phần tử/giả lớp):', all.filter(a => !a.needed && (a.skip || a.matched === 0)).length);
})();

// HM-08f — sau khi gỡ !important, tìm luật (trong bản GỐC) có !important khớp các phần tử bị đổi kiểu dáng, giao với danh sách đã gỡ → ghi keep.json để strip_important.py giữ lại.
// Dùng: node tests/tools/important_culprits.js ban_goc.html dumpA.json dumpB.json dumpA_lap.json imp.json keep.json
const S = require('./states'); const fs = require('fs');
const [orig, fa, fb, fn, fimp, fkeep] = process.argv.slice(2); const A = JSON.parse(fs.readFileSync(fa)), B = JSON.parse(fs.readFileSync(fb)), N = JSON.parse(fs.readFileSync(fn));
const R = JSON.parse(fs.readFileSync(fimp)).redundant; const want = new Set(R.map(e => e.sel.replace(/\s+/g, '') + '|' + e.prop)); const keep = new Set(fs.existsSync(fkeep) ? JSON.parse(fs.readFileSync(fkeep)) : []);
(async () => {
  await S.run(orig, [360, 390, 430, 1366], async (p, name, W) => {
    const k = W + '-' + name; if (!A[k] || !B[k] || A[k].length !== B[k].length) return;
    const idx = []; for (let i = 0; i < A[k].length; i++) { if (N[k] && N[k][i] && (A[k][i][1] !== N[k][i][1] || A[k][i][2] !== N[k][i][2])) continue; if (A[k][i][1] !== B[k][i][1] || A[k][i][2] !== B[k][i][2]) idx.push(i); }
    if (!idx.length) return;
    const found = await p.evaluate((idx) => { const els = document.querySelectorAll('body, body *'), out = new Set();
      const walk = (l, f) => { for (const r of l) { if (r.type === 1) f(r); else if ((r.type === 4 || r.type === 12) && r.cssRules && !/print/.test(r.media ? r.media.mediaText : '')) walk(r.cssRules, f); } };
      idx.forEach(i => { const e = els[i]; Array.from(document.styleSheets).forEach(sh => { try { walk(sh.cssRules, r => { let m = false; try { m = e.matches(r.selectorText); } catch (x) { } if (!m) return; for (let j = 0; j < r.style.length; j++) { const q = r.style[j]; if (r.style.getPropertyPriority(q) === 'important') out.add(r.selectorText.replace(/\s+/g, '') + '|' + q); } }); } catch (x) { } }); });
      return Array.from(out); }, idx);
    found.forEach(f => keep.add(f));
  }, { themes: ['light', 'dark'] });
  // khai báo trong imp.json có thể là shorthand (prop) → giữ nếu prop trùng hoặc là tiền tố của longhand bị khớp
  const kept = R.filter(e => { const s = e.sel.replace(/\s+/g, ''); return Array.from(keep).some(f => { const [fs_, fp] = f.split('|'); return fs_ === s && (fp === e.prop || fp.startsWith(e.prop + '-')); }); }).map(e => e.sel.replace(/\s+/g, '') + '|' + e.prop);
  fs.writeFileSync(fkeep, JSON.stringify(Array.from(new Set(kept)))); console.log('giữ lại', new Set(kept).size, 'khai báo (trên tổng', R.length, 'đã định gỡ)');
})();

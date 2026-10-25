/* HM-21: băm giá trị CSS TÍNH RA (mọi thuộc tính) của mọi phần tử của trang đang mở + thanh bên + thanh trên (≤6000), trên mọi trang, ở 1500 px và 390 px — để so trước/sau khi gộp CSS.
   node hm21_css_cmp.js <app.html> <out.json>   (fixture ẩn danh) */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const APP = path.resolve(process.argv[2]), FIX = path.join(__dirname, '../../tests/fixtures');
(async () => {
  const b = await chromium.launch(), out = {};
  for (const W of [1500, 390]) {
    const p = await (await b.newContext({ viewport: { width: W, height: 900 } })).newPage(); p.on('dialog', d => d.accept());
    await p.goto('file://' + APP); await p.waitForTimeout(5000);
    await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', FIX + '/20.10.2026.xlsx');
    for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
    await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(3500);
    const pages = await p.evaluate(() => [...document.querySelectorAll('[data-page]')].map(e => e.dataset.page).filter((v, i, a) => a.indexOf(v) === i && document.getElementById('page-' + v)));
    for (const pg of pages) {
      await p.evaluate(pg => showPage(pg), pg); await p.waitForTimeout(900);
      out[W + ':' + pg] = await p.evaluate(() => {
        const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };
        const roots = [document.querySelector('.page.active'), document.getElementById('sidebar'), document.querySelector('.topbar')].filter(Boolean), els = roots.flatMap(r => [r, ...r.querySelectorAll('*')]).slice(0, 6000), res = [];
        for (const e of els) { const cs = getComputedStyle(e); let s = ''; for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (/^transition|^animation|caret/.test(k)) continue; s += k + ':' + cs.getPropertyValue(k) + ';'; }
          res.push((e.id ? '#' + e.id : e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '')) + '=' + h(s)); }
        return res; });
    }
    await p.context().close();
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(out)); console.log(Object.keys(out).length, 'trang×cỡ màn hình,', Object.values(out).reduce((a, x) => a + x.length, 0), 'phần tử'); await b.close();
})();

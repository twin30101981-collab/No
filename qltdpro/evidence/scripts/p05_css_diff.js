/* P05 (lỗi CSS nền): so giá trị CSS TÍNH RA của 2 bản app, từng phần tử, từng thuộc tính, mọi trang, ở 1500 px và 390 px; chụp ảnh Dashboard.
   node p05_css_diff.js <app_cu.html> <app_moi.html> <thu_muc_ra>   (fixture ẩn danh) */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const FIX = path.join(__dirname, '../../tests/fixtures'), OUT = path.resolve(process.argv[4]); fs.mkdirSync(OUT, { recursive: true });
async function open(b, APP, W) {
  const p = await (await b.newContext({ viewport: { width: W, height: 900 } })).newPage(); p.on('dialog', d => d.accept());
  await p.goto('file://' + path.resolve(APP)); await p.waitForTimeout(5000);
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', FIX + '/20.10.2026.xlsx');
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
  await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(3500);
  return p;
}
const snap = p => p.evaluate(() => {
  const roots = [document.querySelector('.page.active'), document.getElementById('sidebar'), document.querySelector('.topbar'), document.getElementById('btn-mob-menu')].filter(Boolean);
  const els = roots.flatMap(r => [r, ...r.querySelectorAll('*')]).slice(0, 6000);
  return els.map(e => { const cs = getComputedStyle(e); let s = ''; for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (/^transition|^animation|caret/.test(k)) continue; s += k + '\u0001' + cs.getPropertyValue(k) + '\u0002'; }
    return [(e.id ? '#' + e.id : e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '')), s]; });
});
(async () => {
  const b = await chromium.launch(), flat = {}; let nEl = 0, nDiff = 0, nPg = 0;
  for (const W of [1500, 390]) {
    const pa = await open(b, process.argv[2], W), pb = await open(b, process.argv[3], W);
    const pages = await pa.evaluate(() => [...document.querySelectorAll('[data-page]')].map(e => e.dataset.page).filter((v, i, a) => a.indexOf(v) === i && document.getElementById('page-' + v)));
    for (const pg of pages) {
      nPg++; const k = W + ':' + pg;
      for (const [p, t] of [[pa, 'cu'], [pb, 'moi']]) { await p.evaluate(pg => showPage(pg), pg); await p.waitForTimeout(900);
        if (['dashboard', 'hsvv', 'hmtd', 'fhs'].includes(pg)) await p.screenshot({ path: path.join(OUT, `${t}_${W}_${pg}.png`) }); }
      const A = await snap(pa), B = await snap(pb);
      if (A.length !== B.length) flat[k] = { _so_phan_tu: [A.length, B.length] };
      for (let i = 0; i < Math.min(A.length, B.length); i++) { nEl++; if (A[i][1] === B[i][1]) continue; nDiff++;
        const m = s => Object.fromEntries(s.split('\u0002').filter(Boolean).map(x => x.split('\u0001'))), a = m(A[i][1]), c = m(B[i][1]);
        const e = ((flat[k] = flat[k] || {})[A[i][0]] = flat[k][A[i][0]] || []);
        for (const q in a) if (a[q] !== c[q]) { const x = q + ': ' + a[q] + ' → ' + c[q]; if (!e.includes(x)) e.push(x); } }
    }
    await pa.context().close(); await pb.context().close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'css_diff.json'), JSON.stringify(flat, null, 1));
  console.log(nPg, 'trang×cỡ,', nEl, 'phần tử so,', nDiff, 'phần tử khác; trang có khác:', Object.keys(flat).length);
})();

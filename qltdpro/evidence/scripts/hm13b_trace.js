/* HM-13b: dấu vết hành vi khi đổi trang — so bản trước/sau khi gộp các lớp bọc showPage.
   node hm13b_trace.js <app.html> <out.json>  (fixture ẩn danh, không cần dữ liệu thật) */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const APP = path.resolve(process.argv[2]), FIX = path.join(__dirname, '../../tests/fixtures');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160))); p.on('dialog', d => d.accept());
  await p.goto('file://' + APP); await p.waitForTimeout(5000);
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', FIX + '/20.10.2026.xlsx');
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
  await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(3500);
  const pages = await p.evaluate(() => [...document.querySelectorAll('[data-page]')].map(e => e.dataset.page).filter((v, i, a) => a.indexOf(v) === i && document.getElementById('page-' + v)));
  await p.evaluate(() => { window.__cnt = {}; const w = (o, k, lbl) => { const f = o && o[k]; if (typeof f !== 'function') return; o[k] = function () { window.__cnt[lbl] = (window.__cnt[lbl] || 0) + 1; return f.apply(this, arguments); }; };
    ['ufsInit', 'fhsPageInit', 'hsvInitPage', 'ctkhInit', 'pageFsUpdateBtn', 'tsbdInit', 'tdDoiSoatRun', 'renderDashboard', 'renderGiaDat', 'renderTranop'].forEach(k => w(window, k, k)); if (window.TDCMP) { w(TDCMP, 'mount', 'TDCMP.mount'); w(TDCMP, 'render', 'TDCMP.render'); } });
  const out = {};
  for (const pg of pages.concat(['qltd', 'fhs', 'qltd'])) { // mở lại trang cũ: hook vẫn phải chạy
    await p.evaluate(() => { window.__cnt = {}; }); await p.evaluate(pg => showPage(pg), pg); await p.waitForTimeout(700);
    const s = await p.evaluate(pg => { const page = document.getElementById('page-' + pg) || document.body;
      return { active: (document.querySelector('.page.active') || {}).id, title: (document.getElementById('page-title') || {}).textContent, cnt: Object.assign({}, window.__cnt),
        print: page.querySelectorAll('.btn-print-section').length, fbt: document.querySelectorAll('.fb-toggle-btn,.filter-bar-toggle,[data-fb-toggle]').length,
        scanned: page.querySelectorAll('tbody tr[tabindex]').length, export: (document.getElementById('btn-export') || {}).style ? document.getElementById('btn-export').style.display : '' }; }, pg);
    out[pg + (out[pg] ? '#2' : '')] = s;
  }
  out.__errs = errs; fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1)); console.log(Object.keys(out).length - 1, 'trang, pageerror', errs.length); await b.close();
})();

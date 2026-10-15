// HM-44 — hồ sơ PDF theo dòng chảy: Mẫu B ≤ 4 trang chính + phụ lục; không trang trống; không dòng/bảng rơi sang trang riêng; không cắt mép phải. Kiểm bằng Chromium in PDF + pdftotext.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), os = require('os'), fs = require('fs'); const { execFileSync } = require('child_process'); const { report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  await p.evaluate(B => { const pts = B.khoi_chinh.map(q => ({ x: q[0], y: q[1] })); drawPlot('Thửa 131', pts, 105.5, { so_thua: '131', to_ban_do: '10.1', dien_tich_m2: B.dien_tich_gcn, dien_tich_khong_cap_gcn: B.khong_cap_gcn, canh_gcn: B.khoi_chinh.map(q => q[2]).join(', ') }, false, 3); LG60.open(plots[plots.length - 1]); }, B);
  await p.waitForTimeout(3500); await p.evaluate(() => LG60.preparePrint()); await p.emulateMedia({ media: 'print' });
  const pdf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-')), 'h.pdf'); await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  const n = +/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }))[1]; const pg = []; for (let i = 1; i <= n; i++) pg.push(execFileSync('pdftotext', ['-f', String(i), '-l', String(i), '-layout', pdf, '-'], { encoding: 'utf8' }));
  const chars = pg.map(t => t.replace(/\s+/g, '').length);
  const dom = await p.evaluate(() => { const pages = [...document.querySelectorAll('.lg60-page')].filter(e => e.getBoundingClientRect().width > 0); const annex = pages.filter(e => e.querySelector('.lg60-annex-body')).length; return { main: pages.length - annex, annex }; });
  // cắt mép: không từ nào vượt lề phải (10 mm) của trang PDF — đọc từ pdftotext -bbox
  const bbox = execFileSync('pdftotext', ['-bbox', pdf, '-'], { encoding: 'utf8' }); const pw = +/<page width="([\d.]+)"/.exec(bbox)[1]; let clip = 0, maxX = 0; for (const m of bbox.matchAll(/xMax="([\d.]+)"/g)) { const x = +m[1]; if (x > maxX) maxX = x; if (x > pw - 28.35 + 3) clip++; }
  dom.clip = clip; dom.maxX = Math.round(maxX); dom.pageW = Math.round(pw);
  const tail = pg.map(t => t.split('\n').filter(l => l.trim()).length);
  const ok = report('hm44_pdf_flow', { toi_da_4_trang_chinh: n - dom.annex <= 4, khong_trang_trong: chars.every(c => c > 60), khong_cat_mep_phai: dom.clip === 0,
    khong_trang_chi_con_vai_dong: tail.slice(0, n - dom.annex).every(l => l >= 8), ket_luan_con_trong_pdf: /ĐẠT/.test(pg.join('')) && /Trang \d+ \/ \d+/.test(pg.join('')), khong_loi_trang: errs.length === 0 }, { pages: n, annex: dom.annex, chars, lines: tail, dom, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

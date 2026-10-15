// HM-37 — đối chiếu mốc chung/cạnh chung với sổ thửa bên cạnh: mốc lệch > 0,05 m báo kèm toạ độ hai sổ; chồng lấn/hở dọc cạnh chung; biên bản 1 trang "chỉ tham khảo".
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), fs = require('fs'), os = require('os'); const { execFileSync } = require('child_process'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; const P = a => a.map(q => ({ x: q[0], y: q[1] }));
    // A: hình chữ nhật 20 × 10; B: sát cạnh Đông của A. Hai mốc chung: lệch 0,045 m (khớp) và 0,089 m (vượt); cạnh chung có khe hở ~0,04 m
    drawPlot('A', P([[2259000, 568000], [2259000, 568010], [2259020, 568010], [2259020, 568000]]), 105.5, { so_thua: '130', to_ban_do: '10.1' }, false, 3);
    drawPlot('B', P([[2259000.02, 568010.04], [2259000, 568020], [2259020, 568020], [2259020.08, 568010.04]]), 105.5, { so_thua: '132', to_ban_do: '10.1' }, false, 3);
    drawPlot('C', P([[2259000, 568009.5], [2259000, 568020], [2259020, 568020], [2259020, 568009.5]]), 105.5, { so_thua: '133' }, false, 3);   // chồng lấn A 0,5 m × 20 m = 10 m²
    const A = plots[0], B = plots[1], C = plots[2]; const c = LG37.compare(A, B); o.moc = c.moc.map(m => [m.ten_a, m.ten_b, +m.lech.toFixed(3), m.vuot, m.a.x, m.b.x]); o.canh = c.canh.map(x => [x.i, +x.chung.toFixed(1), +x.sep_tb.toFixed(3), +x.ho_m2.toFixed(2)]); o.chong = +c.chong_lan.toFixed(2); o.ho = +c.ho.toFixed(2);
    const c2 = LG37.compare(A, C); o.chong2 = +c2.chong_lan.toFixed(1);
    // giao diện: Hồ sơ A → Giáp ranh → Biên bản với B
    setSelectedPlotId('A'); Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Hồ sơ/.test(x.innerText))[0].click(); await w(800); document.querySelector('[data-lg103-act="prof-giap"]').click(); await w(2500);
    const btn = Array.from(document.querySelectorAll('[data-lg103-act="doichieu-nb"]')); o.btns = btn.map(x => x.getAttribute('data-id')); btn.filter(x => x.getAttribute('data-id') === 'B')[0].click(); await w(700);
    o.text = document.getElementById('lg21-host').innerText; return o; });
  await p.evaluate(() => document.body.classList.add('lg21-printing')); await p.emulateMedia({ media: 'print' }); const pdf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bb-')), 'b.pdf'); await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  const pages = +/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }))[1];
  const ok = report('hm37_doichieu', { hai_moc_chung: r.moc.length === 2, moc_lech_0_045_khop_moc_lech_0_089_vuot: r.moc.some(m => m[2] === 0.045 && m[3] === false) && r.moc.some(m => m[2] === 0.089 && m[3] === true), co_toa_do_hai_so: /2259000[,.]00; 568010[,.]00/.test(r.text.replace(/ /g, ' ')) || /2259000,00/.test(r.text),
    canh_chung_va_phan_ho: r.canh.length === 1 && r.canh[0][1] >= 19 && r.canh[0][2] > 0.03 && r.canh[0][2] < 0.06 && r.ho > 0.5 && r.ho < 1.2, chong_lan_10m2: r.chong2 === 10, nut_bien_ban_tu_tab_giap_ranh: r.btns.includes('B'), bien_ban_1_trang_chi_tham_khao: pages === 1 && /chỉ để tham khảo/i.test(r.text) && /BIÊN BẢN ĐỐI CHIẾU RANH GIỚI/.test(r.text) && /lệch &gt; 0,05|lệch > 0,05/.test(r.text.replace(/&gt;/g, '>')), khong_loi_trang: errs.length === 0 }, { r: { ...r, text: r.text.slice(0, 300) }, pages, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

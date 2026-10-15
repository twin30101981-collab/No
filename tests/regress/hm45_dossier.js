// HM-45 — hồ sơ kỹ thuật: tên chủ trống không điền mã thửa; số 2259336,23; KTT 105°30′; kết luận theo 0,05√A+0,0003A; không nhãn "v125".
const { open, report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(B => {
    const pts = B.khoi_chinh.map(q => ({ x: q[0], y: q[1] }));
    drawPlot('Thửa 131', pts, 105.5, { so_thua: '131', to_ban_do: '10.1', dien_tich_m2: B.dien_tich_gcn, dien_tich_khong_cap_gcn: B.khong_cap_gcn,
      canh_gcn: B.khoi_chinh.map(q => q[2]).join(', ') }, false, 3);
    const plot = plots[plots.length - 1]; const D = LG60.buildDossier(plot);
    LG60.open(plot); const host = document.getElementById('lg60-host') || document.querySelector('[id^=lg60]');
    const txt = (document.body.innerText || '') + ' ' + (host ? host.innerText : '');
    const pages = Array.from(document.querySelectorAll('.lg60-page')).map(e => e.innerText).join('\n');
    return { chu: D.HS.chu, lon0: D.HS.lon0, devTol: D.devTol, devOk: D.devOk, pages: pages.slice(0, 20000), logs: D.logs.join(' | ') }; }, B);
  const pg = r.pages;
  const ok = report('hm45_dossier', {
    chu_de_trong_khong_dien_ma_thua: r.chu === '' && /để trống/.test(pg) && !/Tên chủ sử dụng\s*\n?\s*Thửa 131/.test(pg),
    so_dang_2259336_23: /2259336,23/.test(pg) && !/\b336,23 – /.test(pg),
    ktt_105_30: r.lon0 === '105°30′' && /105°30′/.test(pg),
    ket_luan_cong_thuc_moi: r.devOk === true && /0,05√A \+ 0,0003A/.test(pg) && !/≤ 1%/.test(pg),
    khong_nhan_phien_ban: !/\bv\d{2,3}\b/i.test(pg) && !/\bv\d{2,3}\b/i.test(r.logs) }, { lon0: r.lon0, chu: r.chu, devTol: r.devTol, pageChars: pg.length });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

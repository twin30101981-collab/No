// HM-18a/18b — tách thửa: theo đường thẳng & theo diện tích (±0,01 m²), mốc mới, hồ sơ PDF + DXF cho từng thửa mới, giao diện.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const P = a => a.map(q => ({ x: q[0], y: q[1] })), w = ms => new Promise(r => setTimeout(r, ms)), o = {};
    const rect = P([[100, 200], [100, 220], [150, 220], [150, 200]]);   // 50 x 20 = 1000 m²
    const l = LGSplit.splitByLine(rect, { x: 100, y: 210 }, { x: 150, y: 210 });   // cắt dọc giữa
    o.line = { ok: l.ok, a: l.phan.map(x => +x.dien_tich.toFixed(4)), lech: l.lech, moi: l.moc_moi.length, tenMoi: l.moc_moi.map(m => m.ten) };
    const dg = LGSplit.splitByLine(rect, rect[0], rect[2]); o.diag = { ok: dg.ok, a: dg.phan.map(x => +x.dien_tich.toFixed(3)), moi: dg.moc_moi.length };
    const irr = P([[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69], [2259316.99, 568036.18], [2259336.65, 568034.94]]);
    const tot = lgCoreArea(irr), tg = 31.4;
    const a = LGSplit.splitByArea(irr, tg, { edge: 0 }); o.area = { ok: a.ok, tot, p1: a.phan[0].dien_tich, p2: a.phan[1].dien_tich, sai: a.sai_so_muc_tieu, lech: a.lech, moi: a.moc_moi.length };
    const a2 = LGSplit.splitByArea(rect, 250, { azimuth: 90 }); o.az = { p1: a2.phan[0].dien_tich, ok: a2.ok };
    o.bad = [LGSplit.splitByArea(rect, 0, { edge: 0 }).ok, LGSplit.splitByArea(rect, 1000, { edge: 0 }).ok, LGSplit.splitByLine(rect, { x: 1, y: 1 }, { x: 1, y: 1 }).ok, LGSplit.splitByLine(rect, { x: 500, y: 0 }, { x: 500, y: 9 }).ok];
    // giao diện
    drawPlot('Thửa 7', irr, 105.5, { so_thua: '7', to_ban_do: '10' }, false, 3);
    const pl = plots.filter(q => q.id === 'Thửa 7')[0]; try { window.currentPlotId = pl.id; } catch (e) {}
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thêm/.test(x.innerText))[0].click(); await w(600);
    const row = document.querySelector('[data-lg103-act="split-open"]'); o.row = !!row;
    if (row) { row.click(); await w(500); o.form = !!document.getElementById('lg-split-target');
      document.getElementById('lg-split-target').value = '31.4'; document.querySelector('[data-lg103-act="split-run"]').click(); await w(400);
      o.uiSvg = !!document.querySelector('.lg-split-res svg'); o.uiRows = document.querySelectorAll('.lg-split-res table').length;
      document.querySelector('[data-lg103-act="split-pdf"]').click(); await w(600);
      const txt = Array.from(document.querySelectorAll('.lg21-page')).map(e => e.innerText).join('\n'); o.pages = document.querySelectorAll('.lg21-page').length; o.pdfHas = /PHƯƠNG ÁN TÁCH THỬA/.test(txt) && /THỬA MỚI 7-1/.test(txt) && /THỬA MỚI 7-2/.test(txt) && /N1/.test(txt); }
    o.dxf = LGSplit.last && LGSplit.last.ok ? [0, 1].map(i => { const t = LGSplit.dxfOf(LGSplit.last, LGSplit.last.plot, i); return { eof: /EOF\s*$/.test(t), lw: (t.match(/LWPOLYLINE/g) || []).length, bangTD: /BANG TOA DO/.test(t), n: LGSplit.last.phan[i].points.length }; }) : null;
    return o; });
  const ok = report('hm18_split', {
    cat_duong_thang_2_phan_500: r.line.ok && r.line.a.every(x => Math.abs(x - 500) < 0.01) && r.line.lech < 0.01, hai_moc_moi_N1_N2: r.line.moi === 2 && r.line.tenMoi.join() === 'N1,N2',
    theo_dien_tich_khop_001: r.area.ok && Math.abs(r.area.sai) < 0.01 && Math.abs(r.area.p1 - 31.4) < 0.01, tong_bang_goc: r.area.lech < 0.01 && Math.abs(r.area.p1 + r.area.p2 - r.area.tot) < 0.01, co_2_moc_moi: r.area.moi === 2,
    theo_phuong_vi: r.az.ok && Math.abs(r.az.p1 - 250) < 0.01, qua_hai_moc_co_san_khong_them_moc: r.diag.ok && r.diag.moi === 0 && r.diag.a.every(x => Math.abs(x - 500) < 0.01), dau_vao_sai_bi_tu_choi: r.bad.every(x => x === false),
    ui_form: r.form && r.uiSvg && r.uiRows >= 3, hoso_pdf_3_trang: r.pages === 3 && r.pdfHas, dxf_2_file: Array.isArray(r.dxf) && r.dxf.every(d => d.eof && d.lw === 1 && d.bangTD) , khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

// HM-14 — che CCCD/CMND khi in/xuất: bật → chỉ 3 số cuối trên hồ sơ (LG60), bản in A4, trang GCN PDF; mặc định tắt giữ nguyên.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const pts = [[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69]].map(q => ({ x: q[0], y: q[1] }));
    drawPlot('Thửa 5', pts, 105.5, { so_thua: '5', to_ban_do: '1', chu_su_dung: 'Chủ thử nghiệm', cccd_cmnd: '012345678901', dien_tich_m2: 100 }, false, 3);
    const plot = plots[plots.length - 1], o = {}; const hs = () => LG60.buildDossier(plot).HS.cccd; const gcn = () => LG51.buildPages ? null : null;
    o.off = hs(); o.fn0 = lgMaskId('012345678901');
    const w = ms => new Promise(r => setTimeout(r, ms));
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thêm/.test(x.innerText))[0].click(); await w(700);
    const row = document.querySelector('[data-lg103-act="mask-id"]'); o.row = !!row; row.click(); await w(400);
    o.on = hs(); o.fn1 = lgMaskId('012345678901'); o.multi = lgMaskId('012345678901; 987654321'); o.short = lgMaskId('12'); o.sw = document.querySelector('[data-lg103-act="mask-id"]').getAttribute('aria-checked');
    LG60.open(plot); await w(800); o.page = Array.from(document.querySelectorAll('.lg60-page')).map(e => e.innerText).join('\n');
    const pgs = await LG51.buildPages(plot, {}); o.gcn = pgs.map(x => x.innerText || '').join('\n');
    return o; });
  const ok = report('hm14_mask', { mac_dinh_giu_nguyen: r.off === '012345678901' && r.fn0 === '012345678901', co_cong_tac: r.row && r.sw === 'true', bat_che_chi_3_so_cuoi: r.on === '•••••••••901' && r.fn1 === '•••••••••901' && r.multi === '•••••••••901; ••••••321' && r.short === '12',
    ho_so_khong_con_so_day_du: !/012345678901/.test(r.page) && /901/.test(r.page), trang_gcn_pdf_che: !/012345678901/.test(r.gcn) && /•+901/.test(r.gcn), khong_loi_trang: errs.length === 0 }, { r: { ...r, page: r.page.slice(0, 80), gcn: r.gcn.slice(0, 80) }, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

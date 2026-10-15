// HM-13 — lịch sử biến động (trang IV GCN): nhiều dòng (ngày, nội dung, cơ quan xác nhận), tách từ ghi chú AI, hiện trên hồ sơ in.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; const pts = [[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69]].map(q => ({ x: q[0], y: q[1] }));
    drawPlot('Thửa 5', pts, 105.5, { so_thua: '5', to_ban_do: '1', dien_tich_m2: 100, ghi_chu_bien_dong: '16/04/2012 Cấp GCN lần đầu.\n03/09/2019 Chuyển nhượng cho bà Nguyễn Thị A. Xác nhận: Chi nhánh VPĐKĐĐ huyện X\n22/01/2021 Thế chấp ngân hàng Y' }, false, 3);
    const plot = plots[plots.length - 1]; setSelectedPlotId(plot.id);
    o.parse = LG13.parseDate('3/9/2019'); o.bad = LG13.parseDate('31/13/2019'); const note = LG13.fromNote(plot.meta.ghi_chu_bien_dong); o.note = note.map(x => [x.ngay, x.co_quan]);
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Hồ sơ/.test(x.innerText))[0].click(); await w(800); document.querySelector('[data-lg103-act="prof-bd"]').click(); await w(500);
    o.emptyMsg = /Chưa có dòng biến động/.test(document.getElementById('lg103-body').innerText);
    // thêm tay (ngày sau), rồi tách từ ghi chú (ngày trước) → phải sắp xếp theo thời gian
    document.querySelector('[data-lg103-act="bd-add"]').click(); await w(400); const f = document.querySelector('.lg13-form'); f.querySelector('[data-f=ngay]').value = '10/10/2024'; f.querySelector('[data-f=noi_dung]').value = 'Đính chính diện tích'; f.querySelector('[data-f=co_quan]').value = 'Sở NN&MT'; document.querySelector('[data-lg103-act="bd-save"]').click(); await w(700);
    document.querySelector('[data-lg103-act="bd-import"]').click(); await w(500);
    o.list = LG13.list(plot).map(e => [e.ngay, e.noi_dung.slice(0, 18), e.co_quan]); o.rows = document.querySelectorAll('.lg13-row').length;
    // ngày sai bị chặn
    document.querySelector('[data-lg103-act="bd-add"]').click(); await w(400); const f2 = document.querySelector('.lg13-form'); f2.querySelector('[data-f=ngay]').value = '99/99/2020'; f2.querySelector('[data-f=noi_dung]').value = 'x'; document.querySelector('[data-lg103-act="bd-save"]').click(); await w(300); o.blocked = LG13.list(plot).length === o.list.length && !!document.querySelector('.lg13-form');
    // sửa + xoá
    LG13.update(plot, 0, { ngay: '17/04/2012', noi_dung: 'Cấp GCN lần đầu (đính chính ngày)', co_quan: '' }); LG13.remove(plot, 3); o.afterEdit = LG13.list(plot).map(e => e.ngay);
    LG60.open(plot); await w(900); o.print = Array.from(document.querySelectorAll('.lg60-page')).map(e => e.innerText).join('\n');
    return o; });
  const ok = report('hm13_bien_dong', { doc_ngay_va_bao_sai: r.parse && r.parse.text === '03/09/2019' && r.bad === null, tach_ghi_chu_3_dong_co_quan: r.note.length === 3 && r.note[1][0] === '03/09/2019' && /Chi nhánh VPĐKĐĐ huyện X/.test(r.note[1][1]), ban_dau_trong: r.emptyMsg,
    nhieu_dong_sap_theo_ngay: r.list.length === 4 && r.list.map(x => x[0]).join() === '16/04/2012,03/09/2019,22/01/2021,10/10/2024' && r.rows === 4, chan_ngay_sai: r.blocked, sua_va_xoa: r.afterEdit.join() === '17/04/2012,03/09/2019,22/01/2021', hien_tren_ho_so_in: /NHỮNG THAY ĐỔI SAU KHI CẤP GIẤY CHỨNG NHẬN/.test(r.print) && /17\/04\/2012/.test(r.print) && /Chuyển nhượng/.test(r.print), khong_loi_trang: errs.length === 0 }, { r: { ...r, print: r.print.length }, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

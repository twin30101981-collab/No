// HM-24 — quy đổi toạ độ hàng loạt: VN-2000 ↔ WGS84 khớp proj4 (<1e-7° / <1 mm), tự đổi cột, báo dòng sai, CSV có BOM.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const o = {}, w = ms => new Promise(r => setTimeout(r, ms)); const def = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 }); const ref = proj4(def, 'WGS84', [568027.14, 2259336.23]);
    const rows = LG24.convert('2259336.23 568027.14\n568027.23, 2259334.17\nA1\t2259334.42\t568031.07\nhỏng dòng\n9999999 1', 'vn2wgs', { ktt: 105.5, mui: 3 });
    o.rows = rows.map(x => ({ stt: x.stt, loi: x.loi || '', ghi: x.ghi_chu, lat: x.lat, lng: x.lng, ten: x.ten || '' })); o.dLat = Math.abs(rows[0].lat - ref[1]); o.dLng = Math.abs(rows[0].lng - ref[0]);
    const back = LG24.convert(rows[0].lat + ' ' + rows[0].lng + '\n' + rows[0].lng + ' ' + rows[0].lat, 'wgs2vn', { ktt: 105.5, mui: 3 }); o.dBac = Math.abs(back[0].bac - 2259336.23); o.dDong = Math.abs(back[0].dong - 568027.14); o.swap = back[1].ghi_chu;
    const csv = LG24.toCSV(rows, { ktt: 105.5 }); o.bom = csv.charCodeAt(0) === 0xFEFF; o.head = csv.split('\r\n')[0]; o.lines = csv.split('\r\n').length;
    // giao diện
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thêm/.test(x.innerText))[0].click(); await w(700);
    document.querySelector('[data-lg103-act="conv-batch"]').click(); await w(500); document.getElementById('lg24-prov').value = 'NAM_DINH'; document.getElementById('lg24-in').value = '2259336.23 568027.14\n2259334.17 568027.23';
    document.querySelector('[data-lg103-act="conv-run"]').click(); await w(300); o.tableRows = document.querySelectorAll('.lg24-t tbody tr').length; o.firstLat = document.querySelector('.lg24-t tbody tr td:nth-child(4)').innerText; o.ktt = (VN2000_PROVINCES.NAM_DINH || {}).lon0;
    return o; });
  const ok = report('hm24_convert', { vn2000_sang_wgs84_chinh_xac: r.dLat < 1e-7 && r.dLng < 1e-7, wgs84_sang_vn2000_chinh_xac: r.dBac < 0.001 && r.dDong < 0.001, tu_doi_cot: /Y,X/.test(r.rows[1].ghi) && Math.abs(r.rows[1].lat - r.rows[2].lat) < 1e-3, cot_ten_bo_qua: r.rows[2].ten === 'A1' && !r.rows[2].loi,
    dong_sai_duoc_bao: !!r.rows[3].loi && !!r.rows[4].loi, doi_cot_kinh_vi_do: /kinh,vĩ/.test(r.swap), csv_co_bom_va_tieu_de_tieng_viet: r.bom && /Vĩ độ/.test(r.head) && r.lines === 7, giao_dien_bang_ket_qua: r.tableRows === 2 && /^\d+\.\d{8}$/.test(r.firstLat), khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

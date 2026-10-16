// HM-08f — màn "GPS thực địa" dựng lại trong sheet (thay tab-gps-offline): định vị GPS → WGS84/VN-2000/tỉnh; nhập mốc tay (kiểm hợp lệ, xoá mốc cuối, ≥3 mốc mới được vẽ), giữ mốc khi đóng/mở sheet, nút nhanh vẫn chạy.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const o = {}, w = ms => new Promise(r => setTimeout(r, ms));
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    const def = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 }), ll = proj4(def, 'WGS84', [585000, 2259340]);
    navigator.geolocation.getCurrentPosition = (ok) => ok({ coords: { latitude: ll[1], longitude: ll[0], accuracy: 4.5 } });
    o.legacy = ['tab-gps-offline', 'btn-trigger-gps-live', 'manual-x'].filter(id => document.getElementById(id));
    // nút nhanh khi sheet chưa mở: không lỗi
    document.getElementById('btn-quick-gps-locate').click(); await w(700);
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Nhập/.test(x.innerText))[0].click(); await w(500);
    document.querySelector('[data-lg103-act="import-gps"]').click(); await w(500);
    o.sheet = !!document.getElementById('manual-x') && !!document.getElementById('manual-province-select') && document.getElementById('manual-province-select').options.length > 5;
    document.querySelector('[data-lg103-act="gps-live"]').click(); await w(900);
    o.card = document.getElementById('gps-live-card').style.display; o.wgs = document.getElementById('gps-wgs84-val').innerText; o.vn = document.getElementById('gps-vn2000-val').innerText; o.prov = document.getElementById('gps-province-detected').innerText;
    // nhập tay
    const add = async (x, y) => { document.getElementById('manual-x').value = x; document.getElementById('manual-y').value = y; document.querySelector('[data-lg103-act="man-add"]').click(); await w(300); };
    await add('', ''); o.rong = lgManualCount();
    await add('2259340', '585000'); await add('2259340', '585020'); o.hai = lgManualCount(); o.finishAn = getComputedStyle(document.getElementById('btn-finish-manual-plot')).display === 'none';
    document.querySelector('[data-lg103-act="man-finish"]').click(); await w(300); o.chua_du = plots.length;
    await add('2259320', '585020'); o.ba = lgManualCount(); o.finishHien = getComputedStyle(document.getElementById('btn-finish-manual-plot')).display !== 'none'; o.status = document.getElementById('manual-pts-status').innerText.slice(0, 40);
    document.querySelector('[data-lg103-act="man-undo"]').click(); await w(200); o.saukhoa = lgManualCount();
    // đóng/mở lại sheet vẫn giữ mốc
    document.getElementById('lg103-sheet').classList.remove('on'); lgOpenFieldGps(); await w(300); o.giu = lgManualCount() === 2 && /2 mốc/.test(document.getElementById('manual-pts-status').innerText);
    await add('2259320', '585020'); await add('2259320', '585000'); const n0 = plots.length;
    document.querySelector('[data-lg103-act="man-finish"]').click(); await w(1500); o.ve = plots.length === n0 + 1; o.hetmoc = lgManualCount(); o.ten = plots[plots.length - 1].id; o.npts = plots[plots.length - 1].points.length;
    return o; });
  const ok = report('hm08f_gps_field', { panel_cu_da_go: r.legacy.length === 0, sheet_co_o_nhap_va_chon_tinh: r.sheet, gps_hien_wgs84_vn2000_tinh: r.card === 'block' && /Lat: 20\.\d+, Lng: 106\.\d+ · ±4\.5 m/.test(r.wgs) && /X \(Bắc\): 2259340\.\d\d/.test(r.vn) && /Y \(Đông\): 58500\d\.\d\d/.test(r.vn) && /KTT/.test(r.prov),
    nhap_thieu_khong_them: r.rong === 0, can_3_moc: r.hai === 2 && r.finishAn && r.chua_du === 0, hien_nut_hoan_tat_tu_3_moc: r.ba === 3 && r.finishHien && /3 mốc/.test(r.status), xoa_moc_cuoi: r.saukhoa === 2, giu_moc_khi_dong_mo_sheet: r.giu, ve_thua_4_moc: r.ve && r.npts === 4 && r.hetmoc === 0 && /Thực Địa/.test(r.ten), khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

// HM-08f — màn "Cắm mốc RTK" dựng lại trong sheet (thay tab-stakeout): chọn thửa → danh sách mốc đổi theo (sửa lỗi cũ), bật/tắt dẫn đường, mũi tên/khoảng cách/phương vị, báo "đã tới mốc", đóng sheet tự tắt GPS, chưa có thửa thì báo, vào từ menu Nhập sổ.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}, m = { __restoring: true, coordOrderConfirmed: 'as-is' };
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    o.legacy = ['tab-stakeout', 'stakeout-panel', 'btn-start-stakeout'].filter(id => document.getElementById(id));
    lgOpenStakeout(); await w(300); o.khongThua = !document.getElementById('btn-start-stakeout');
    const P = a => a.map((q, i) => ({ x: q[0], y: q[1], ten: String(i + 1) }));
    drawPlot('Thửa 1', P([[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69]]), 105.5, Object.assign({ so_thua: '1' }, m), false, 3);
    drawPlot('Thửa 2', P([[2259436.23, 568127.14], [2259434.17, 568127.23], [2259434.42, 568131.07], [2259416.85, 568131.69], [2259420.99, 568136.18]]), 105.5, Object.assign({ so_thua: '2' }, m), false, 3);
    await w(3000);
    let watching = 0, cleared = 0, cb = null; navigator.geolocation.watchPosition = (ok) => { watching++; cb = ok; return 55; }; navigator.geolocation.clearWatch = () => { cleared++; };
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Nhập/.test(x.innerText))[0].click(); await w(500);
    document.querySelector('[data-lg103-act="import-rtk"]').click(); await w(500);
    o.dbg = document.getElementById('lg103-body').innerText.slice(0, 120); o.sheet = !!document.getElementById('btn-start-stakeout'); o.plots = (document.getElementById('stakeout-plot-select') || {options: []}).options.length;
    if (!document.getElementById('stakeout-plot-select')) return o; const ps = document.getElementById('stakeout-plot-select'); ps.value = 'Thửa 2'; ps.dispatchEvent(new Event('change', { bubbles: true })); await w(200); o.pins2 = document.getElementById('stakeout-pin-select').options.length;
    ps.value = 'Thửa 1'; ps.dispatchEvent(new Event('change', { bubbles: true })); await w(200); o.pins1 = document.getElementById('stakeout-pin-select').options.length;
    document.getElementById('stakeout-pin-select').value = '0';
    const def = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 }), ll = (dN, dE) => { const q = proj4(def, 'WGS84', [568027.14 + (dE || 0), 2259336.23 + dN]); return { latitude: q[1], longitude: q[0], accuracy: 1 }; };
    document.querySelector('[data-lg103-act="stk-toggle"]').click(); await w(300); o.on = watching === 1 && lgStakeoutActive() && document.getElementById('stakeout-panel').style.display === 'block' && /Tắt/.test(document.getElementById('btn-start-stakeout').innerText);
    cb({ coords: ll(-30) }); await w(100);   // đứng cách mốc 30 m về phía Nam → mốc ở phía Bắc
    o.dist = document.getElementById('stakeout-dist').innerText; o.bear = document.getElementById('stakeout-bearing').innerText; o.arrow = document.getElementById('stakeout-arrow').style.transform; o.msgFar = document.getElementById('stakeout-proximity-msg').innerText;
    cb({ coords: ll(-0.2) }); await w(100); o.msgNear = document.getElementById('stakeout-proximity-msg').innerText;
    // đóng sheet → tắt GPS
    LandGIS.ui.closeSheet(); await w(200); o.offByClose = !lgStakeoutActive() && cleared === 1;
    // mở lại, bật, rồi chuyển sang màn khác (openSheet khác tiêu đề) → tắt
    lgOpenStakeout(); await w(300); document.querySelector('[data-lg103-act="stk-toggle"]').click(); await w(200); o.on2 = lgStakeoutActive();
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thêm/.test(x.innerText))[0].click(); await w(400); document.querySelector('[data-lg103-act="plots-tools"]').click(); await w(300); o.offBySwitch = !lgStakeoutActive();
    // bật/tắt bằng nút
    lgOpenStakeout(); await w(300); document.querySelector('[data-lg103-act="stk-toggle"]').click(); await w(200); document.querySelector('[data-lg103-act="stk-toggle"]').click(); await w(200); o.toggleOff = !lgStakeoutActive() && /Bật/.test(document.getElementById('btn-start-stakeout').innerText);
    return o; });
  const ok = report('hm08f_rtk', { panel_cu_da_go: r.legacy.length === 0, chua_co_thua_khong_mo_man: r.khongThua, vao_tu_menu_nhap_so: r.sheet && r.plots === 2, doi_thua_doi_danh_sach_moc: r.pins2 === 5 && r.pins1 === 4,
    bat_dan_duong: r.on, khoang_cach_va_phuong_vi: /^30\.0\d m$/.test(r.dist) && /Phương vị cắm mốc: (360\.0|0\.\d|359\.\d)°/.test(r.bear) && r.msgFar === '', bao_da_toi_moc: /ĐÚNG MỐC/.test(r.msgNear), dong_sheet_tu_tat_gps: r.offByClose, doi_man_tu_tat_gps: r.on2 && r.offBySwitch, bat_tat_bang_nut: r.toggleOff, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

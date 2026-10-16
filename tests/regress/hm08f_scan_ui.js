// HM-08f (hướng A) — khung màn "Scan sổ đỏ": đầu trang + 3 bước, tuỳ chọn ảnh gập, hệ toạ độ gập (mở khi có kết quả), bổ sung trang khác gập; đủ 31 id logic cũ; sidebar chỉ còn màn này.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2], { width: 390, height: 844 });
  const r = await p.evaluate(async () => {
    const o = {}, ids = ['btn-rotate-img', 'chk-enhance-image', 'camera-capture-upload', 'sodo-file-upload', 'roi-wrapper', 'roi-canvas', 'btn-auto-detect-roi', 'btn-reset-crop', 'btn-process-scan-locate', 'sodo-pending', 'sodo-result', 'sodo-metadata', 'sodo-list', 'province-select', 'gcn-date-box', 'input-gcn-issue-date', 'btn-apply-gcn-date', 'zone-select', 'closure-check-box', 'closure-title', 'closure-details', 'lsq-weight-mode', 'btn-apply-lsq', 'btn-apply-bowditch', 'btn-undo-adjust', 'btn-draw-sodo', 'supplement-camera-upload', 'supplement-file-upload', 'supplement-pending', 'supplement-result'];
    const vis = e => { const r = e && e.getBoundingClientRect(); return !!r && r.width > 0 && r.height > 0; };
    o.hidden0 = !vis(document.getElementById('sidebar')); lgOpenScan(); await new Promise(r => setTimeout(r, 300)); o.shown = vis(document.getElementById('sidebar')) && vis(document.getElementById('lg-scan-back'));
    o.thieu = ids.filter(i => !document.getElementById(i)); o.tabs = document.querySelectorAll('#sidebar .tab-content').length;
    const t = document.getElementById('lg-scan-title'); o.title = t ? t.innerText : ''; o.titleVis = vis(t); o.steps = Array.from(document.querySelectorAll('#tab-scan-ai .lg-scan-steps li')).map(x => x.innerText);
    const opts = document.querySelector('#tab-scan-ai details.lg-scan-opts'); o.optsClosed = opts && !opts.open; o.rotateInOpts = !!opts.querySelector('#btn-rotate-img') && !!opts.querySelector('#chk-enhance-image');
    o.rotateHidden = !document.getElementById('btn-rotate-img').checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }); opts.querySelector('summary').click(); await new Promise(r => setTimeout(r, 200)); o.rotateShown = document.getElementById('btn-rotate-img').checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }); o.enhanceDefault = document.getElementById('chk-enhance-image').checked;
    const sys = document.querySelectorAll('#tab-scan-ai details.lg-scan-opts')[1]; o.sysOpen = sys && sys.open && !!sys.querySelector('#province-select') && !!sys.querySelector('#zone-select') && !!sys.querySelector('#gcn-date-box');
    const more = document.querySelector('#tab-scan-ai details.lg-scan-more'); o.moreClosed = more && !more.open && !!more.querySelector('#supplement-file-upload');
    o.bigBtns = vis(document.querySelector('label[for="camera-capture-upload"]')) && vis(document.querySelector('label[for="sodo-file-upload"]'));
    o.provinceOpts = document.getElementById('province-select').options.length; o.hasHeaderTag = !!document.querySelector('#tab-scan-ai header'); document.getElementById('lg-scan-back').click(); await new Promise(r => setTimeout(r, 200)); o.closed = !vis(document.getElementById('sidebar')); o.mapAfter = document.body.classList.contains('lg62-map');
    return o; });
  const ok = report('hm08f_scan_ui', { du_31_id_logic: r.thieu.length === 0, man_scan_an_luc_mo_app_va_mo_bang_lgOpenScan: r.hidden0 && r.shown, sidebar_chi_con_man_scan: r.tabs === 1, dau_trang_va_3_buoc: /Scan sổ đỏ/.test(r.title) && r.titleVis && r.steps.length === 3, tuy_chon_anh_gap: r.optsClosed && r.rotateInOpts && r.rotateHidden && r.rotateShown && r.enhanceDefault, he_toa_do_co_tinh_khuc_zone_ngay_cap: r.sysOpen, bo_sung_trang_khac_gap: r.moreClosed, hai_nut_chup_chon_hien_ngay: r.bigBtns, danh_sach_tinh_con: r.provinceOpts > 5, khong_dung_the_header_bi_an: !r.hasHeaderTag, nut_ve_ban_do_dong_man_scan: r.closed && r.mapAfter, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

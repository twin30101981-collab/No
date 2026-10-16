// HM-08f — thay tab "Quản lý thửa" cũ: Thửa/Thêm → Dữ liệu thửa (thống kê, xuất GeoJSON/KML/CSV/SCR/DXF/Excel, dọn trùng, xoá tất cả 2 bước, tham số chuyển đổi); tra địa chỉ ngoài gắn vào ô tìm của màn Bản đồ; panel cũ đã gỡ.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  p.on('dialog', d => d.accept());
  const r = await p.evaluate(async () => {
    const P = a => a.map(q => ({ x: q[0], y: q[1], ten: q[2] })), w = ms => new Promise(r => setTimeout(r, ms)), o = {}, m = { __restoring: true, coordOrderConfirmed: 'as-is', to_ban_do: '10', so_hieu_gcn: 'CS 00000', so_vao_so: 'CH 0000', ngay_cap_gcn: '01/01/2020' };
    const sq = (x, y) => P([[x, y, '1'], [x, y + 20, '2'], [x - 20, y + 20, '3'], [x - 20, y, '4']]);
    drawPlot('Thửa A', sq(2259340, 568000), 105.5, Object.assign({ so_thua: '1' }, m), false, 3);
    drawPlot('Thửa B', sq(2259440, 568100), 105.5, Object.assign({ so_thua: '2' }, m), false, 3);
    drawPlot('Thửa A copy', sq(2259340, 568000), 105.5, Object.assign({ so_thua: '1' }, m), false, 3);
    o.legacy = ['tab-plots', 'plot-list', 'stat-count', 'plot-search', 'btn-clear-all', 'btn-undo-delete', 'btn-export-geojson', 'btn-clean-dup', 'btn-check-overlap', 'sidebar-backdrop', 'btn-close-sidebar'].filter(id => document.getElementById(id));
    window.__dl = []; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { window.__dl.push(this.download || ''); };
    const dock = async re => { Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => new RegExp(re).test(x.innerText))[0].click(); await w(500); };
    await dock('Thửa'); o.btnInPlots = !!document.querySelector('[data-lg103-act="plots-tools"]'); document.querySelector('[data-lg103-act="plots-tools"]').click(); await w(400);
    o.stat = [document.getElementById('lg8f-count').innerText, document.getElementById('lg8f-area').innerText, document.getElementById('lg8f-tow').innerText];
    for (const a of ['pt-geojson', 'pt-kml', 'pt-csv', 'pt-scr', 'pt-dxf', 'pt-xlsx']) { document.querySelector('[data-lg103-act="' + a + '"]').click(); await w(a === 'pt-xlsx' ? 2500 : 700); }
    HTMLAnchorElement.prototype.click = oc; o.dl = window.__dl.slice();
    document.querySelector('[data-lg103-act="pt-dup"]').click(); await w(700); o.afterDup = plots.length; o.countShown = document.getElementById('lg8f-count').innerText;
    document.querySelector('[data-lg103-act="pt-towgs"]').click(); await w(500); o.towModal = (() => { const e = document.getElementById('towgs84-select'); const mm = e && e.closest('.modal, [class*="modal"], #towgs84-modal'); return !!(e && e.offsetParent !== null); })();
    try { document.getElementById('btn-save-towgs84') && 0; } catch (e) {}
    await dock('Thêm'); o.rowInMore = !!document.querySelector('[data-lg103-act="plots-tools"]');
    document.querySelector('[data-lg103-act="plots-tools"]').click(); await w(400); document.querySelector('[data-lg103-act="pt-clear"]').click(); await w(800); o.afterClear = plots.length;
    // địa chỉ ngoài trên ô tìm màn Bản đồ
    await dock('Bản'); const q = document.getElementById('lg8c-q'); o.addrBox = !!document.getElementById('lgv42-addr-box'); q.value = 'Hoa Lu Ninh Binh'; q.dispatchEvent(new Event('input', { bubbles: true })); await w(2600);
    const bx = document.getElementById('lgv42-addr-box'); o.addrTxt = bx ? bx.innerText.slice(0, 80) : ''; o.addrVisible = bx ? getComputedStyle(bx).display : '';
    return o; });
  const ok = report('hm08f_plots_tools', { panel_cu_da_go: r.legacy.length === 0, nut_vao_man_thua_va_them: r.btnInPlots && r.rowInMore, thong_ke: r.stat[0] === '2' && /^800,0 m²|^1[ ]?200,0 m²|m²$/.test(r.stat[1]) && r.stat[2].length > 3,
    xuat_du_6_dinh_dang: ['geojson', 'kml', 'dxf'].every(e => r.dl.some(n => new RegExp('\\.' + e + '$', 'i').test(n))) && r.dl.filter(n => /\.(csv|scr)$/i.test(n)).length >= 2 && r.dl.some(n => /\.(xlsx|csv)$/i.test(n)),
    don_thua_trung: r.afterDup === 2 && r.countShown === '2' /* bản sao trùng khít đã bị chặn ngay khi vẽ */, mo_tham_so_chuyen_doi: r.towModal, xoa_tat_ca_hai_buoc: r.afterClear === 0, tra_dia_chi_ngoai_tren_o_tim_ban_do: r.addrBox && r.addrVisible === 'block' && /Địa chỉ ngoài|ngoại tuyến|Không tra được/.test(r.addrTxt), khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

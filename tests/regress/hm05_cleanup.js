// HM-05 — gỡ LG_AUDIT; lần mở đầu sau nâng cấp dọn nhật ký/khoá cũ nhưng GIỮ dữ liệu & cấu hình; nhật ký không ghi CCCD/họ tên.
const { open, report } = require('../lib'); const path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.route(/^https?:/, r => r.abort()); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + path.resolve(process.argv[2]);
  await p.goto(url); await p.waitForTimeout(2500);
  // Giả lập người dùng cũ (lược đồ 119) có dữ liệu + nhật ký + bản sao hỏng cũ/mới + khoá cấu hình.
  await p.evaluate(() => { const S = Storage.prototype.setItem.bind(localStorage), old = Date.now() - 90 * 86400000, rec = Date.now() - 3600000;
    S('landgis_schema_version', '119');
    S('land_gis_v18_cache', JSON.stringify([{ id: 'T1', points: [{ x: 2259336.23, y: 568027.14 }, { x: 2259334.17, y: 568027.23 }, { x: 2259334.42, y: 568031.07 }], lon0: 105.5, zone: 3, meta: { chu_su_dung: 'Nguyen Van Test' } }]));
    S('landgis_v42_diag_log', '[{"msg":"x"}]'); S('landgis_v87_log', '[{"msg":"y"}]'); S('lgv80_log', '[1]');
    S('land_gis_v18_cache_corrupt_' + old, 'xx'); S('land_gis_v18_cache_corrupt_' + rec, 'yy');
    S('landgis_sv_key', 'KEY-GIA'); S('landgis_surveyor_name', 'Nguoi do Test'); S('lgv80_config', '{"a":1}'); S('land_gis_towgs84', '{}'); });
  await p.reload(); await p.waitForTimeout(3500);
  const r = await p.evaluate(() => { const g = k => Storage.prototype.getItem.call(localStorage, k), keys = Object.keys(localStorage);
    window.LGV42.record('info', 'test', 'CCCD 036085001234 và 123456789, chủ Nguyen Van Test'); const last = window.LGV42.log.slice(-1)[0];
    return { audit: typeof window.LG_AUDIT, sec: !!document.getElementById('lg148-section'),
      stale: ['landgis_v42_diag_log', 'landgis_v87_log', 'lgv80_log'].filter(k => /"msg":"[xy]"|^\[1\]$/.test(g(k) || '')).length,
      oldCorrupt: keys.filter(k => /corrupt_/.test(k) && Date.now() - parseInt(k.split('_').pop()) > 30 * 86400000).length,
      recentCorrupt: keys.filter(k => /corrupt_/.test(k) && Date.now() - parseInt(k.split('_').pop()) < 86400000).length,
      plots: window.plots.length, key: g('landgis_sv_key'), surveyor: g('landgis_surveyor_name'), cfg: g('lgv80_config'), tw: g('land_gis_towgs84'),
      schema: g('landgis_schema_version'), info: window.lgLegacyCleanupInfo, log: last.msg }; });
  const ok = report('hm05_cleanup', {
    khong_con_LG_AUDIT: r.audit === 'undefined' && !r.sec,
    don_nhat_ky_cu: r.stale === 0 && r.info.removed.length >= 3,
    don_ban_sao_hong_qua_30_ngay: r.oldCorrupt === 0 && r.recentCorrupt === 1,
    giu_du_lieu_va_cau_hinh: r.plots === 1 && r.key === 'KEY-GIA' && r.surveyor === 'Nguoi do Test' && r.cfg === '{"a":1}' && r.tw === '{}',
    co_danh_sach_khoa_giu: r.info.keep.includes('land_gis_v18_cache') && r.schema === '120',
    nhat_ky_khong_ghi_CCCD_ho_ten: !/036085001234|123456789|Nguyen Van Test/.test(r.log) }, r);
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

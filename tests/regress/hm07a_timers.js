// HM-07a — bộ đếm/observer nền: có bảng thống kê; giảm ≥50% thay đổi DOM khi nhàn rỗi (không tính ô ảnh bản đồ); ẩn app thì bộ đếm ngủ + GPS tạm dừng; watchPosition có clearWatch.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__mut = 0; document.addEventListener('DOMContentLoaded', () => { new MutationObserver(ms => { ms.forEach(m => { const t = m.target; const cls = (t.className && t.className.toString()) || ''; if (/leaflet-tile/.test(cls) || (t.closest && t.closest('.leaflet-tile-pane'))) return; window.__mut++; }); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); }); });
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(12000);
  await p.evaluate(() => { window.__mut = 0; }); await p.waitForTimeout(10000);
  const idle = await p.evaluate(() => window.__mut);
  const T = await p.evaluate(() => ({ stats: window.LG_TIMERS && LG_TIMERS.stats(), rows: window.LG_TIMERS ? LG_TIMERS.table().length : 0 }));
  // ẩn app
  const h = await p.evaluate(async () => {
    const total = () => LG_TIMERS.table().filter(r => r.loai === 'interval').reduce((s, r) => s + r.chay, 0);
    if (window.LG73) LG73.trulySecure = true;   // đi qua đường cảm biến thật (https) để kiểm bộ đăng ký GPS
    const id = navigator.geolocation.watchPosition(() => { }, () => { }, {});
    const w0 = LG_TIMERS.stats().watches;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    const a = total(); await new Promise(r => setTimeout(r, 3000)); const bb = total();
    const gpsPaused = LG_TIMERS.table().some(r => r.loai === 'gps' && r.tamDung);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 2000)); const c = total();
    const gpsBack = LG_TIMERS.table().some(r => r.loai === 'gps' && !r.tamDung);
    navigator.geolocation.clearWatch(id);
    return { w0, hiddenDelta: bb - a, resumedDelta: c - bb, gpsPaused, gpsBack, w1: LG_TIMERS.stats().watches }; });
  const ok = report('hm07a_timers', {
    co_bang_thong_ke_theo_nhom: !!(T.stats && T.stats.byPeriod && T.stats.intervals > 0 && T.stats.observers > 0) && T.rows > 0,
    giam_it_nhat_50pct_DOM_nhan_roi: idle <= 200,   // baseline đo được ≈ 400 thay đổi/10 s
    an_app_bo_dem_ngu: h.hiddenDelta <= 2 && h.resumedDelta > 2,
    gps_tam_dung_va_tiep_tuc: h.gpsPaused && h.gpsBack,
    watchPosition_co_clearWatch: h.w0 === 1 && h.w1 === 0 }, { idle, T, h });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

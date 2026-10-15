// HM-08i — Màn Thửa: danh sách ảo hoá (500 thửa cuộn mượt), tìm, lọc Đạt/Không đạt/Chưa GCN, trạng thái đồng bộ.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
  const N = 500;
  const r = await p.evaluate(async (N) => {
    const w8 = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      const dx = (i % 25) * 40, dy = Math.floor(i / 25) * 40, sq = [[0, 0], [10, 0], [10, 10], [0, 10]].map(q => ({ x: 2259000 + dy + q[1], y: 568000 + dx + q[0] }));
      // 100 m² đúng sổ (đạt) / sai sổ (không đạt) / không có GCN
      const meta = { so_thua: String(i + 1), to_ban_do: String(1 + (i % 7)), dia_chi: i % 50 === 0 ? 'Phường Đặc Biệt' : 'xã A', __restoring: true };
      if (i % 3 === 0) meta.dien_tich_m2 = 100; else if (i % 3 === 1) meta.dien_tich_m2 = 160;
      plots.push({ id: 'P' + (i + 1), points: sq, lon0: 105.5, zone: 3, meta });   // dữ liệu thửa tổng hợp (không dựng polygon bản đồ) để thử danh sách 500 thửa
    }
    out.buildMs = Math.round(performance.now() - t0); out.n = plots.length;
    window.LG172 = window.LG172 || {}; LG172.rows = plots.filter((_, i) => i % 5 === 0).map(x => ({ ma_thua: x.id }));
    LandGIS.ui.switchDock('plots'); await w8(500);
    const box = document.getElementById('lg103-plist');
    out.rowsDom = box.querySelectorAll('.lg103-prow').length; out.hasBox = !!box;
    // cuộn tới cuối: hàng cuối phải được dựng
    box.scrollTop = box.scrollHeight; box.dispatchEvent(new Event('scroll')); await w8(300);
    out.lastRendered = !!box.querySelector('[data-pid="P' + N + '"]'); out.rowsAfterScroll = box.querySelectorAll('.lg103-prow').length;
    // đo thời gian dựng một cửa sổ
    const ts = []; for (let k = 0; k < 20; k++) { box.scrollTop = k * 700; const t = performance.now(); lgRefreshPlotList(); ts.push(performance.now() - t); } ts.sort((a, b) => a - b); out.medianMs = +ts[10].toFixed(2);
    const items = f => lgPlotListItems(plots, f);
    out.all = items({ q: '', f: 'all' }).length; out.ok = items({ f: 'ok' }).length; out.bad = items({ f: 'bad' }).length; out.none = items({ f: 'none' }).length; out.uns = items({ f: 'unsynced' }).length;
    out.q1 = items({ q: 'P250' }).map(x => x.id); out.qAddr = items({ q: 'dac biet' }).length; out.qTo = items({ q: 'tờ 3' }).length;
    out.syncMark = items({ q: 'P1', f: 'all' }).filter(x => x.id === 'P1')[0].sync;
    // gõ vào ô tìm kiếm thật
    const q = document.getElementById('lg103-pq'); q.value = 'P499'; q.dispatchEvent(new Event('input')); await w8(500);
    out.typed = [...document.querySelectorAll('#lg103-plist .lg103-prow')].map(e => e.dataset.pid).join(',');
    out.count = document.getElementById('lg103-pcount').textContent;
    return out; }, N);
  const ok = report('hm08i_plots', {
    du_500_thua: r.n === N,
    ao_hoa_chi_dung_vai_chuc_hang: r.rowsDom > 0 && r.rowsDom < 40 && r.rowsAfterScroll < 40 && r.lastRendered,
    cuon_muot_median_duoi_10ms: r.medianMs <= 10,
    loc_Dat_KhongDat_ChuaGCN: r.ok === 167 && r.bad === 167 && r.none === 166 && r.all === N,
    tim_theo_ma_to_dia_chi: r.q1.includes('P250') && r.qAddr === 10 && r.qTo > 0 && /P499/.test(r.typed),
    trang_thai_dong_bo: r.syncMark === true && r.uns === 400 }, r);
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

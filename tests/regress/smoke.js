// Khói 390 px & 1366 px: nạp app, 0 pageerror, có bản đồ, không tràn ngang. (HM-01)
const { open, report } = require('../lib');
(async () => {
  const checks = {};
  for (const [n, vp] of [['390', { width: 390, height: 844 }], ['1366', { width: 1366, height: 768 }]]) {
    const { b, p, errs } = await open(process.argv[2], vp);
    const i = await p.evaluate(() => ({ map: !!document.querySelector('.leaflet-container'), h: document.documentElement.scrollWidth > innerWidth }));
    checks['pageerror_' + n + '=0'] = errs.length === 0; checks['map_' + n] = i.map; checks['khong_tran_ngang_' + n] = !i.h;
    await b.close();
  }
  process.exit(report('smoke', checks) ? 0 : 1);
})();

// HM-08a — chạm tâm 5 nút dock luôn trúng nút kể cả khi có toast; tối đa 1 toast; không cuộn ngang ở 360/390/430 px.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const checks = {}; const detail = {};
  for (const w of [360, 390, 430]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: true })).newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
    const r = await p.evaluate(async () => {
      for (let i = 0; i < 6; i++) { toast({ title: 'Thông báo ' + (i % 2), description: 'nội dung ' + i + ' khá dài để thử chồng lấp trên màn hình nhỏ ' + i }); LGV42.notify('warn', 'Cảnh báo ' + i, 'mô tả dài ' + i); }
      toast({ title: 'Lỗi thật', description: 'x', variant: 'destructive' });
      await new Promise(r => setTimeout(r, 600));
      const btns = [...document.querySelectorAll('.lg103-dbtn')].filter(e => e.getBoundingClientRect().width > 0);
      const miss = btns.filter(e => { const r = e.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(el === e || e.contains(el)); }).length;
      const a = document.getElementById('lg46-snack'), h = document.getElementById('lg46-snack');   // HM-46a: một snackbar chung
      const dup = (() => { for (let i = 0; i < 3; i++) LGV42.notify('info', 'Trùng', 'cùng nội dung'); return h.children.length; })();
      return { n: btns.length, miss, appToasts: a.children.length, v42Toasts: h ? h.children.length : 0, dup, hscroll: document.documentElement.scrollWidth > innerWidth }; });
    checks['dock_' + w + '_5_nut_chạm_trúng'] = r.n === 5 && r.miss === 0;
    checks['toi_da_1_toast_' + w] = r.appToasts <= 1 && r.v42Toasts <= 1 && r.dup <= 1;
    checks['khong_cuon_ngang_' + w] = !r.hscroll && errs.length === 0; detail[w] = r;
    await p.context().close();
  }
  const ok = report('hm08a_layout', checks, detail); await b.close(); process.exit(ok ? 0 : 1);
})();

// HM-08f — không còn luật CSS "chết" (selector chứa class/id không xuất hiện ở đâu ngoài CSS) và số !important không tăng; khói 360/390/430 không pageerror.
const { open, report } = require('../lib'); const { spawnSync } = require('child_process'); const path = require('path'), fs = require('fs');
(async () => {
  const app = process.argv[2], tool = path.join(__dirname, '..', '..', 'handover/tools/prune_dead_css.py');
  const r = spawnSync('python3', [tool, app], { encoding: 'utf8' }); const m = /luật chết bỏ: (\d+) \(selector chết (\d+)\)/.exec(r.stdout || '');
  const imp = (fs.readFileSync(app, 'utf8').match(/!important/g) || []).length;
  const o = { chet: m ? +m[1] : -1, selChet: m ? +m[2] : -1, imp, errs: [] };
  for (const w of [360, 390, 430]) { const { b, p, errs } = await open(app, { width: w, height: 800 }); await p.waitForTimeout(500); if (errs.length) o.errs.push(w + ':' + errs[0]); await b.close(); }
  const ok = report('hm08f_css', { khong_con_luat_css_chet: o.chet === 0 && o.selChet === 0, important_khong_tang: o.imp <= 760, khoi_360_390_430_khong_loi_trang: o.errs.length === 0 }, o);
  process.exit(ok ? 0 : 1);
})();

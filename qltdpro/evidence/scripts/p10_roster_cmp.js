/* P10 (T6) — so phân nhóm cán bộ → phòng ban giữa hai bản app trên DỮ LIỆU THẬT (hồ sơ trình duyệt bền đã nhập 11 kỳ).
   node p10_roster_cmp.js <app.html> <out.json> [--profile DIR]. out.json chứa tên cán bộ ⇒ để NGOÀI repo. In ra số đếm. */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const APP = path.resolve(process.argv[2]), OUT = process.argv[3], PROF = arg('--profile', '/tmp/claude-0/p10/profile');
(async () => {
  const ctx = await chromium.launchPersistentContext(PROF, { headless: true, args: ['--no-sandbox'] }); const p = ctx.pages()[0] || await ctx.newPage();
  await p.goto('file://' + APP); await p.waitForTimeout(7000);
  const r = await p.evaluate(() => { const names = new Set(); (DATA.qltd || []).forEach(x => x[12] && names.add(String(x[12]).trim())); (_archiveReportList || []).forEach(s => (s.reportData || []).forEach(x => x && x[12] && names.add(String(x[12]).trim())));
    const bm = bckhBuildCBTDMap(); const out = {}; [...names].sort().forEach(n => { out[n] = { pb: TD_SXCB.pbOf(n), bk: (bm[bckhNormName(n)] || '').replace(/_\d+$/, '') }; }); return { n: DATA.qltd.length, out }; });
  fs.writeFileSync(OUT, JSON.stringify(r.out, null, 1));
  const v = Object.values(r.out); console.log(JSON.stringify({ hoso: r.n, canbo: v.length, coPhong: v.filter(x => x.pb).length, coNhomBCKH: v.filter(x => x.bk).length }));
  await ctx.close();
})();

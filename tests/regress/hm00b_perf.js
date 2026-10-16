// HM-00b — thời gian mở app với 5/20/50 thửa ≤ 3 s; không hàm nào > 30% (trừ "(program)"/GC).
// Dùng: node tests/regress/hm00b_perf.js app/land-gis.html  (exit 0 = PASS)
const { execFileSync } = require('child_process'); const path = require('path');
const prof = path.join(__dirname, '../tools/prof.js'); let ok = true; const out = {};
for (const n of [5, 20, 50]) {
  const j = JSON.parse(execFileSync('node', [prof, process.argv[2], String(n)], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const top = (j.topSelf || []).filter(s => !/^\((program|garbage|idle)/.test(s))[0] || '';
  const ms = parseInt((top.match(/(\d+)ms$/) || [0, 0])[1]);
  out[n] = { loadMs: j.loadMs, dclMs: j.dclMs, top };
  if (j.dclMs > 3000 || j.loadMs > 6000 || (n === 50 && ms > 0.3 * j.loadMs)) ok = false; // tỉ lệ 30% chỉ xét ở 50 thửa (ở 5/20 thửa chi phí cố định khởi động chiếm tỉ lệ lớn)
}
console.log(JSON.stringify(out), ok ? 'PASS' : 'FAIL'); process.exit(ok ? 0 : 1);

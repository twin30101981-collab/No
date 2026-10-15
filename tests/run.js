// Chạy toàn bộ bộ hồi quy bằng 1 lệnh:  node tests/run.js app/land-gis.html
// Test có tên hm02_*/hm03_*... nằm trong XFAIL (đặc tả hạng mục chưa làm): FAIL là bình thường, PASS sớm cũng báo.
// Khi một hạng mục xong, xoá tên test khỏi tests/xfail.json.
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const app = process.argv[2] || 'app/land-gis.html';
const xfail = JSON.parse(fs.readFileSync(path.join(__dirname, 'xfail.json'), 'utf8'));
let bad = 0;
for (const f of fs.readdirSync(path.join(__dirname, 'regress')).filter(f => f.endsWith('.js')).sort()) {
  const name = f.replace(/\.js$/, ''); const t0 = Date.now();
  const r = spawnSync('node', [path.join(__dirname, 'regress', f), app], { encoding: 'utf8', timeout: 600000 });
  const pass = r.status === 0, x = xfail.includes(name);
  const st = pass ? (x ? 'XPASS (bỏ khỏi xfail.json!)' : 'PASS') : (x ? 'XFAIL' : 'FAIL');
  if ((!pass && !x) || (pass && x)) bad++;
  console.log(`${st.padEnd(8)} ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (!pass && !x) console.log('   ' + (r.stdout + r.stderr).trim().split('\n').slice(-2).join('\n   '));
}
console.log(bad ? `\nKẾT QUẢ: FAIL (${bad})` : '\nKẾT QUẢ: PASS'); process.exit(bad ? 1 : 0);

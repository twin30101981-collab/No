// HM-46d — "bản đồ lớp trên cùng": ở mỗi trạng thái/độ rộng, lấy phần tử trên cùng (elementFromPoint) tại lưới điểm 12 px → JSON.
// So trước–sau khi đổi z-index: python3 tests/tools/zprobediff.py A.json B.json. Thêm trạng thái có snackbar để phủ lớp thông báo.
// Dùng: node tests/tools/zprobe.js app/land-gis.html out.json
const S = require('./states'); const fs = require('fs'); const out = {};
const probe = p => p.evaluate(() => {
  const k = e => !e ? '-' : e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '');
  const layer = e => { let x = e, last = e; while (x && x !== document.body) { const cs = getComputedStyle(x); if (cs.position !== 'static' && cs.zIndex !== 'auto') last = x; x = x.parentElement; } return k(last) + '>' + k(e); };
  const r = [], W = innerWidth, H = innerHeight; for (let y = 6; y < H; y += 12) for (let x = 6; x < W; x += 12) r.push(layer(document.elementFromPoint(x, y))); return r; });
(async () => {
  await S.run(process.argv[2], [360, 390, 430, 1366], async (p, name, W) => {
    out[W + '-' + name] = await probe(p);
    if (/^1-ban-do|^2-thua/.test(name)) { await p.evaluate(() => { window.lgSnack && lgSnack('Kiểm tra lớp thông báo'); }); await p.waitForTimeout(300); out[W + '-' + name + '+snack'] = await probe(p); await p.evaluate(() => { const s = document.getElementById('lg46-snack'); if (s) s.style.display = 'none'; }); }
  });
  fs.writeFileSync(process.argv[3], JSON.stringify(out)); console.log('xong', Object.keys(out).length, 'trạng thái');
})();

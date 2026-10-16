// Chụp "dấu vân tay" kiểu dáng tính toán của MỌI phần tử ở từng trạng thái/độ rộng → JSON. So trước–sau bằng tests/tools/cssdiff.py. (HM-08f)
// Dùng: node tests/tools/cssdump.js app/land-gis.html out.json
const S = require('./states'); const fs = require('fs'); const out = {};
(async () => {
  await S.run(process.argv[2], [360, 390, 430, 1366], async (p, name, W) => {
    out[W + '-' + name] = await p.evaluate(() => {
      const hs = s => { let a = 5381; for (let i = 0; i < s.length; i++) a = ((a << 5) + a + s.charCodeAt(i)) | 0; return (a >>> 0).toString(36); };
      const r = []; const els = document.querySelectorAll('body, body *');
      for (const e of els) { if (e.closest('.leaflet-tile-pane,.leaflet-zoom-animated svg')) { } const cs = getComputedStyle(e); let s = ''; for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (k.startsWith('--') || /^(transition|animation|-webkit-)/.test(k) || k === 'perspective-origin' || k === 'transform-origin') continue; s += k + ':' + cs.getPropertyValue(k) + ';'; }
        const bb = e.getBoundingClientRect(); r.push([e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''), hs(s), Math.round(bb.x) + ',' + Math.round(bb.y) + ',' + Math.round(bb.width) + ',' + Math.round(bb.height)]); }
      return r; });
  }, { themes: ['light', 'dark'] });
  fs.writeFileSync(process.argv[3], JSON.stringify(out)); console.log('xong', Object.keys(out).length, 'trạng thái');
})();

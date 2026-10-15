// HM-11b — thư viện xuất/quét chạy khi mất mạng: vendor/ cùng byte với SRI đã ghim, SW cache sẵn, loadLib dùng bản cục bộ; PDF/Excel/QR chạy ngoại tuyến.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'); const { report } = require('../lib');
const root = path.join(__dirname, '..', '..');
(async () => {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
  const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(root, u); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('nf'); } r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f)); }).listen(0);
  const base = 'http://localhost:' + srv.address().port + '/'; const html = fs.readFileSync(root + '/index.html', 'utf8');
  // SRI ghim trong app phải khớp đúng byte các tệp vendor/
  const sri = JSON.parse(/window\.LG_SRI = (\{[\s\S]*?\});/.exec(html)[1].replace(/'/g, '"')); const vend = JSON.parse(/window\.LG_VENDOR = (\{[^}]*\});/.exec(html)[1].replace(/'/g, '"'));
  const sriOk = Object.entries(vend).every(([f, key]) => 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(root + '/vendor/' + f)).digest('base64') === sri[key]);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = [], ext = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!localhost)/, r => { ext.push(r.request().url().slice(0, 60)); r.abort(); });
  await p.goto(base); await p.waitForTimeout(5000); await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(3000);
  const cached = await p.evaluate(async () => { const c = await caches.open((await caches.keys()).find(k => /^landgis-shell-/.test(k))); return (await c.keys()).map(q => new URL(q.url).pathname).filter(u => /vendor/.test(u)); });
  ext.length = 0; await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(4500);
  const r = await p.evaluate(async () => {
    const o = {}; await ensureXLSX(); await ensureHtml2Canvas(); await ensureJsQR(); await loadLib('jspdf', ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js']);
    o.srcs = Array.from(document.scripts).map(s => s.getAttribute('src') || '').filter(u => /vendor|cdn|unpkg/.test(u));
    o.xlsx = (() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[1, 2], [3, 4]]), 'S'); return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }).byteLength; })();
    const { jsPDF } = window.jspdf; const d = new jsPDF(); d.text('thử', 10, 10); o.pdf = d.output('arraybuffer').byteLength;
    o.qr = typeof jsQR === 'function' && jsQR(new Uint8ClampedArray(21 * 21 * 4).fill(255), 21, 21) === null; o.h2c = typeof html2canvas === 'function';
    return o;
  });
  const ok = report('hm11b_offline_libs', { sri_khop_byte_vendor: sriOk, sw_cache_san_4_thu_vien: cached.length === 4, nap_tu_vendor_khi_mat_mang: r.srcs.length >= 4 && r.srcs.every(u => /^\.\/vendor\//.test(u) || /vendor/.test(u)), xlsx_chay: r.xlsx > 1000, pdf_chay: r.pdf > 500, qr_va_html2canvas_chay: r.qr && r.h2c, khong_goi_cdn_thu_vien: !ext.some(u => /cdn|unpkg|jsdelivr/.test(u)), khong_loi_trang: errs.length === 0 }, { r, cached, ext, errs });
  await b.close(); srv.close(); process.exit(ok ? 0 : 1);
})();

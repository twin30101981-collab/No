// HM-15 — Chia sẻ hồ sơ PDF: máy hỗ trợ → navigator.share với File PDF; không hỗ trợ → tải file; người dùng huỷ → không lỗi.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), http = require('http'), fs = require('fs'); const { report } = require('../lib');
const root = path.join(__dirname, '..', '..');
(async () => {
  const html = fs.readFileSync(path.resolve(process.argv[2])); const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u.startsWith('/vendor/')) { const f = path.join(root, u); if (fs.existsSync(f)) { r.setHeader('content-type', 'text/javascript'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; return r.end(); } r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(html); }).listen(0);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort()); await p.goto('http://localhost:' + srv.address().port + '/'); await p.waitForTimeout(3500);
  await p.evaluate(() => { const pts = [[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69]].map(q => ({ x: q[0], y: q[1] })); drawPlot('Thửa 5', pts, 105.5, { so_thua: '5', to_ban_do: '1', dien_tich_m2: 100 }, false, 3); });
  const r = {};
  // 1) có Web Share: ghi nhận File truyền vào
  await p.evaluate(() => { window.__shared = null; navigator.canShare = d => !!(d && d.files && d.files.length); navigator.share = async d => { window.__shared = { n: d.files.length, type: d.files[0].type, name: d.files[0].name, size: d.files[0].size }; }; });
  r.s1 = await p.evaluate(() => lgSharePlotPdf()); r.shared = await p.evaluate(() => window.__shared);
  // 2) không hỗ trợ → tải file
  await p.evaluate(() => { navigator.canShare = undefined; navigator.share = undefined; });
  const dl = p.waitForEvent('download', { timeout: 120000 }); r.s2 = await p.evaluate(() => lgSharePlotPdf()).catch(() => 'downloaded'); /* Chromium đóng ngữ cảnh khi bắt đầu tải file → coi 'download' là bằng chứng */ const d = await dl; r.dlName = d.suggestedFilename();
  // 3) người dùng huỷ bảng chia sẻ
  await p.evaluate(() => { navigator.canShare = () => true; navigator.share = async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; }; }); r.s3 = await p.evaluate(() => lgSharePlotPdf());
  // 4) nút trong Hồ sơ
  r.btn = await p.evaluate(async () => { Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Hồ sơ/.test(x.innerText))[0].click(); await new Promise(r => setTimeout(r, 900)); return !!document.querySelector('[data-lg103-act="share-pdf"]'); });
  const ok = report('hm15_share', { web_share_gui_file_pdf: r.s1 === 'shared' && r.shared && r.shared.n === 1 && r.shared.type === 'application/pdf' && r.shared.size > 1500 && /\.pdf$/.test(r.shared.name), khong_ho_tro_thi_tai_file: r.s2 === 'downloaded' && /^BaoCaoChiTiet_.*\.pdf$/.test(r.dlName), huy_khong_loi: r.s3 === 'cancelled', co_nut_chia_se_trong_ho_so: r.btn, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); srv.close(); process.exit(ok ? 0 : 1);
})();

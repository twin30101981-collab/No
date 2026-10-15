// HM-11 — PWA: index.html = bản app hiện tại; tên cache theo phiên bản; mở ngoại tuyến lần 2; thông báo "Có bản mới" → Cập nhật; cache tile không bị xoá; manifest khoá dọc.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const http = require('http'), fs = require('fs'), path = require('path'); const { report } = require('../lib');
const root = path.join(__dirname, '..', '..'); const appPath = path.resolve(process.argv[2]);
(async () => {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' }; let swOverride = null;
  const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(root, u);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('nf'); }
    let body = fs.readFileSync(f); if (u === '/sw.js' && swOverride) body = Buffer.from(swOverride); r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); r.setHeader('cache-control', 'no-cache'); r.end(body); }).listen(0);
  const port = srv.address().port, base = 'http://localhost:' + port + '/';
  const same = fs.readFileSync(root + '/index.html').equals(fs.readFileSync(appPath)); const sw = fs.readFileSync(root + '/sw.js', 'utf8'); const tag = (/landgis-shell-([\w.-]+)'/.exec(sw) || [])[1];
  const man = JSON.parse(fs.readFileSync(root + '/manifest.json', 'utf8'));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await p.goto(base); await p.waitForTimeout(5000);
  const r = {}; r.ready = await p.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return !!reg.active; });
  await p.evaluate(async () => { await (await caches.open('landgis-tiles-v1')).put('/tile/1', new Response('x')); });
  r.keys1 = await p.evaluate(() => caches.keys()); r.shellCached = await p.evaluate(async () => { const c = await caches.open((await caches.keys()).find(k => /^landgis-shell-/.test(k))); return (await c.keys()).map(q => new URL(q.url).pathname); });
  await p.reload(); await p.waitForTimeout(3000); // lần 2: đã có controller
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(4500);
  r.offline = await p.evaluate(() => ({ map: typeof map !== 'undefined' && !!map, dock: !!document.getElementById('lg103-dock'), title: document.title }));
  await ctx.setOffline(false); await p.reload(); await p.waitForTimeout(4500);
  // bản mới: sw.js đổi tên cache
  swOverride = sw.replace(/landgis-shell-[\w.-]+'/, "landgis-shell-v999-test'");
  await p.evaluate(() => lgSwCheckUpdate()); await p.waitForTimeout(2500);
  r.bar = await p.evaluate(() => { const b = document.getElementById('lg11-upd'); return b ? b.innerText : null; });
  const nav = p.waitForNavigation({ timeout: 15000 }).catch(() => null); await p.evaluate(() => document.querySelector('#lg11-upd [data-u=go]').click()); await nav; await p.waitForTimeout(4000);
  r.keys2 = await p.evaluate(() => caches.keys());
  const ok = report('hm11_pwa', {
    index_trung_ban_app: same, ten_cache_theo_phien_ban: /^v\d+-[0-9a-f]{8}$/.test(tag || '') && r.keys1.includes('landgis-shell-' + tag), shell_day_du: ['/', '/index.html', '/manifest.json', '/admin-map.json'].every(u => r.shellCached.includes(u)),
    khoa_doc: man.orientation === 'portrait' && man.start_url === './', mo_ngoai_tuyen_lan_2: r.ready && r.offline.map && r.offline.dock,
    thong_bao_co_ban_moi: !!r.bar && /Có bản mới/.test(r.bar), cap_nhat_doi_cache_xoa_cu: r.keys2.includes('landgis-shell-v999-test') && !r.keys2.includes('landgis-shell-' + tag),
    cache_tile_con_nguyen: r.keys2.includes('landgis-tiles-v1'), khong_loi_trang: errs.length === 0 }, { tag, r, errs });
  await b.close(); srv.close(); process.exit(ok ? 0 : 1);
})();

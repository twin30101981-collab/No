// HM-40 — phụ lục ảnh hồ sơ: có ảnh khi dùng Esri (CORS) hoặc từ ô đã lưu (ngoại tuyến); không có ảnh → bỏ phụ lục, không in lỗi kỹ thuật.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report, fx } = require('../lib');
// PNG 256×256 hợp lệ nhỏ (xanh lá) tạo bằng canvas trong trang → dùng base64 từ Node bằng zlib
const zlib = require('zlib'); function png() { const w = 256, h = 256, raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; const v = ((x * 73856093) ^ (y * 19349663)) >>> 0; raw[o] = v & 255; raw[o + 1] = (v >> 8) & 255; raw[o + 2] = (v >> 16) & 255; } }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
(async () => {
  const B = fx('so-mau-B.json'), tile = png(); const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  let mode = 'esri'; const seen = new Set(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:/, r => { const u = r.request().url();
    if (mode !== 'down' && /server\.arcgisonline\.com/.test(u)) { seen.add(u); return r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: tile }); }
    return r.abort(); });
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const mk = () => p.evaluate(B => { const pts = B.khoi_chinh.map(q => ({ x: q[0], y: q[1] })); drawPlot('Thửa 131', pts, 105.5, { so_thua: '131', to_ban_do: '10.1', dien_tich_m2: B.dien_tich_gcn }, false, 3); return plots.length; }, B);
  await mk();
  const cap = () => p.evaluate(async () => { const pl = plots[plots.length - 1]; const r = await LG59.sectionHTML(pl, LG59.SECTIONS[0]); return { ok: r.ok, img: /<img /.test(r.html), len: r.html.length, loi: /Chưa lấy được|CORS/.test(r.html) }; });
  const r = {};
  // 1) Esri có CORS → có ảnh
  r.esri = await p.evaluate(async () => { Object.values(LG_LAYER_DEFS).forEach(d => { if (map.hasLayer(d.layer)) map.removeLayer(d.layer); }); LG_LAYER_DEFS.esri_img.layer.addTo(map); const pl = plots[plots.length - 1]; LG59.sectionHTML.__lg63 && 0; const c = await LG51.captureSatellite(pl, { layerKey: 'esri_img' }); return { ok: !!(c && c.data), tiles: c && c.tiles, key: c && c.sourceKey }; });
  // 2) lưu các ô đã tải vào Cache API rồi tắt mạng → vẫn có ảnh từ ô đã lưu
  const urls = [...seen]; await p.evaluate(async ([urls, b64]) => { const c = await caches.open(LG_TILE_CACHE); const bytes = Uint8Array.from(atob(b64), x => x.charCodeAt(0)); for (const u of urls) await c.put(u, new Response(bytes, { headers: { 'content-type': 'image/png' } })); }, [urls, tile.toString('base64')]);
  mode = 'down'; r.cache = await p.evaluate(async () => { const pl = plots[plots.length - 1]; const c = await LG51.captureSatellite(pl, { layerKey: 'esri_img' }); return { ok: !!(c && c.data), key: c && c.sourceKey }; });
  // 3) không ô lưu + không mạng → bỏ phụ lục (PDF không có trang lỗi), màn hình hồ sơ ẩn trang phụ lục
  await p.evaluate(async () => { await caches.delete(LG_TILE_CACHE); if (LG63 && LG63.cache) LG63.cache = {}; });
  await p.evaluate(B => { const pts = B.khoi_chinh.map(q => ({ x: q[0] + 3000, y: q[1] })); drawPlot('Thửa 132', pts, 105.5, { so_thua: '132', to_ban_do: '10.1', dien_tich_m2: B.dien_tich_gcn }, false, 3); }, B);   // vùng khác → không dính bộ nhớ ảnh của trình duyệt
  r.sec = await p.evaluate(async () => { const pl = plots[plots.length - 1]; if (window.LG63 && LG63.cache) for (const k in LG63.cache) delete LG63.cache[k]; const s = await LG59.sectionHTML(pl, LG59.SECTIONS[0]); return { ok: s.ok, h: s.html.replace(/<[^>]+>/g, ' ').slice(0, 300), n: plots.length, id: pl.id }; });
  r.pdf = await p.evaluate(async () => { const pl = plots[plots.length - 1]; const pages = await LG59.buildPdfPages(pl); return { n: pages.length, txt: pages.map(x => x.innerText).join('\n').slice(0, 4000) }; });
  r.ui = await p.evaluate(async () => { const pl = plots[plots.length - 1]; LG60.open(pl); await new Promise(r => setTimeout(r, 1500)); const btns = Array.from(document.querySelectorAll('[data-annex-load]')); for (const bt of btns) { try { bt.click(); } catch (e) { } } await new Promise(r => setTimeout(r, 14000));
    const pages = Array.from(document.querySelectorAll('.lg60-page')); const vis = pages.filter(x => getComputedStyle(x).display !== 'none'); const omit = pages.filter(x => x.classList.contains('lg60-omit')).length; return { all: pages.length, visible: vis.length, omit, txt: vis.map(x => x.innerText).join('\n') }; });
  const bad = /Chưa lấy được|CORS|Không tải được mục|chặn|OpenStreetMap chưa có/;
  const ok = report('hm40_appendix', { co_anh_khi_dung_esri: r.esri.ok && r.esri.key === 'esri_img', co_anh_tu_o_da_luu_khi_mat_mang: r.cache.ok && r.cache.key === 'esri_img',
    khong_anh_thi_muc_that_bai: r.sec.ok === false, pdf_bo_phu_luc_khong_in_loi: r.pdf.n < 4 && !bad.test(r.pdf.txt), ho_so_an_trang_phu_luc_that_bai: r.ui.omit >= 1 && !bad.test(r.ui.txt), khong_loi_trang: errs.length === 0 }, { r: { esri: r.esri, cache: r.cache, sec: r.sec, pdfN: r.pdf.n, ui: { all: r.ui.all, visible: r.ui.visible, omit: r.ui.omit } }, bad: (r.ui.txt.match(bad) || r.pdf.txt.match(bad)), errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

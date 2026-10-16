// HM-39 — quản lý lớp nền: ngoại tuyến (0 lần đổi, ≤1 thông báo), mạng tốt (lớp phủ ranh giới tắt mặc định → ≥35% ít ô hơn), chặn Google (đổi 1 lần sang Esri, 1 thông báo).
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHFc9ZQAAAABJRU5ErkJggg==', 'base64');
const OBS = () => { window.__seen = []; const known = new WeakSet(); setInterval(() => { document.querySelectorAll('#lg46-snack > *, #toast-wrap > *, #lgv42-toast-host > *').forEach(el => { if (!known.has(el)) { known.add(el); window.__seen.push((el.textContent || '').trim().slice(0, 90)); } }); }, 50); window.__trans = []; let lk; setInterval(() => { if (!window.map || !window.LG_LAYER_DEFS) return; const k = Object.keys(LG_LAYER_DEFS).find(k => map.hasLayer(LG_LAYER_DEFS[k].layer)); if (k && k !== lk) { lk = k; window.__trans.push(k); } }, 50); };
async function run(b, file, { block = false, offline = false, overlay = false }) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, offline });
  const p = await ctx.newPage(); let tiles = 0, boundary = 0; const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(OBS);
  if (overlay) await p.addInitScript(() => { try { localStorage.setItem('land_gis_overlay_state_v39', JSON.stringify({ 'Ranh giới hành chính (Esri)': true })); localStorage.setItem('land_gis_overlay_state_v33', JSON.stringify({ 'Ranh giới hành chính (Esri)': true })); } catch (e) { } });
  await p.route(/^https?:/, r => { const u = r.request().url(); const isTile = /google\.com\/vt|arcgisonline|cartocdn|openstreetmap/.test(u);
    if (isTile && offline) return r.abort();
    if (isTile) { if (block && /google\.com/.test(u)) return r.abort(); tiles++; if (/World_Boundaries/.test(u)) boundary++; return r.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } }); }
    return r.abort(); });
  await p.goto('file://' + path.resolve(file)); await p.waitForTimeout(4500);
  for (let i = 0; i < 6; i++) { await p.evaluate(() => map.panBy([260, 90], { animate: false })); await p.waitForTimeout(900); }
  await p.waitForTimeout(block ? 6000 : 1500);
  const r = await p.evaluate(() => ({ active: Object.keys(LG_LAYER_DEFS).find(k => map.hasLayer(LG_LAYER_DEFS[k].layer)), notified: window.__lgOfflineNotified === true, cnt: window.__trans.length - 1, trans: window.__trans, seen: window.__seen })); r.tiles = tiles; r.boundary = boundary; r.errs = errs; await ctx.close(); return r;
}
(async () => {
  const f = process.argv[2]; const b = await chromium.launch(); const checks = {}; const d = {};
  const good = await run(b, f, {}), withOv = await run(b, f, { overlay: true }); d.good = good; d.withOv = { tiles: withOv.tiles, boundary: withOv.boundary };
  checks['mac_dinh_khong_tai_lop_ranh_gioi'] = good.boundary === 0 && withOv.boundary > 0;
  checks['giam_it_nhat_35pct_o_anh'] = good.tiles <= 0.65 * withOv.tiles;
  checks['mang_tot_khong_doi_lop'] = good.cnt === 0 && good.active === 'ggl_hybrid';
  const off = await run(b, f, { offline: true }); d.off = off;
  checks['ngoai_tuyen_0_lan_doi_lop'] = off.cnt === 0 && off.active === 'ggl_hybrid';
  checks['ngoai_tuyen_toi_da_1_thong_bao'] = off.seen.length <= 1 && off.notified === true;
  const blk = await run(b, f, { block: true }); d.blk = blk;
  checks['chan_Google_doi_1_lan_sang_Esri'] = blk.cnt === 1 && blk.active === 'esri_img';
  checks['chan_Google_dung_1_thong_bao'] = blk.seen.length === 1;
  checks['khong_loi_trang'] = !good.errs.length && !off.errs.length && !blk.errs.length;
  const ok = report('hm39_layers', checks, d); await b.close(); process.exit(ok ? 0 : 1);
})();

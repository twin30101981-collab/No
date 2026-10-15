// HM-09 — ô bản đồ lỗi: tự đổi lớp nền tối đa N lần rồi DỪNG và báo; không đổi/tải lại liên tục; ngoại tuyến thì không đổi.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  let tileReq = 0; await p.route(/^https?:/, r => { if (/mt\d|arcgisonline|tile|openstreetmap|google/.test(r.request().url())) tileReq++; r.abort(); });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const defs = LG_LAYER_DEFS;
    const active = () => Object.keys(defs).find(k => map.hasLayer(defs[k].layer)) || null;
    const toasts = []; const ot = window.toast; window.toast = function (o) { toasts.push(o && o.title); return ot.apply(this, arguments); };
    window.__lgFailoverCount = 0; window.__lgFailoverHalted = false; window.__lgFailoverTried.clear();
    const seen = []; for (let i = 0; i < 9; i++) { const k = active(); if (k && seen[seen.length - 1] !== k) seen.push(k); if (k) lgTileHealthCheck(k); map.panBy([40, 0], { animate: false }); await w(1700); }
    const out = { seen, count: window.__lgFailoverCount, halted: window.__lgFailoverHalted, stopMsgs: toasts.filter(t => /Đã dừng tự đổi lớp/.test(t || '')).length };
    // ngoại tuyến: không đổi gì
    window.__lgFailoverCount = 0; window.__lgFailoverHalted = false; const k0 = active();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); for (let i = 0; i < 3; i++) { lgTileHealthCheck(active()); map.panBy([40, 0], { animate: false }); await w(1700); }
    out.offlineSame = active() === k0 && window.__lgFailoverCount === 0;
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    return out; });
  const ok = report('hm09_failover', {
    doi_toi_da_3_lan: r.count <= 3 && r.seen.length <= 4,
    dung_va_bao_1_lan: r.halted === true && r.stopMsgs === 1,
    ngoai_tuyen_khong_doi: r.offlineSame === true }, { r, tileReq });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

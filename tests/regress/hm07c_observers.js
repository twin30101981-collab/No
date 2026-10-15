// HM-07c — gom MutationObserver (≤3 observer thật), không xoá quy tắc CSS lúc chạy, ngữ nghĩa observer giữ nguyên, nạp 50 thửa ≤2 s, kéo bản đồ ≤10 ms/khung.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { execFileSync } = require('child_process'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__del = 0; const d = CSSStyleSheet.prototype.deleteRule; CSSStyleSheet.prototype.deleteRule = function () { window.__del++; return d.apply(this, arguments); };
    const g = CSSGroupingRule.prototype.deleteRule; CSSGroupingRule.prototype.deleteRule = function () { window.__del++; return g.apply(this, arguments); }; });
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(8000);
  const r = await p.evaluate(async () => {
    const wait = () => new Promise(r => setTimeout(r, 60)); const out = {};
    out.hubs = (window.LG_OBSERVER_HUBS ? LG_OBSERVER_HUBS() : []).length; out.del = window.__del;
    // ngữ nghĩa: attributeFilter / subtree / childList / disconnect
    const host = document.createElement('div'), kid = document.createElement('span'); host.appendChild(kid); document.body.appendChild(host);
    const got = { cls: 0, any: 0, kidAttr: 0, child: 0, childDeep: 0, dis: 0 };
    const o1 = new MutationObserver(m => { got.cls += m.length; }); o1.observe(host, { attributes: true, attributeFilter: ['class'] });
    const o2 = new MutationObserver(m => { got.any += m.length; }); o2.observe(host, { attributes: true });
    const o3 = new MutationObserver(m => { got.kidAttr += m.length; }); o3.observe(host, { attributes: true });                 // không subtree: KHÔNG thấy thay đổi của kid
    const o4 = new MutationObserver(m => { got.child += m.length; }); o4.observe(host, { childList: true });
    const o5 = new MutationObserver(m => { got.childDeep += m.length; }); o5.observe(host, { childList: true, subtree: true });
    const o6 = new MutationObserver(m => { got.dis += m.length; }); o6.observe(host, { attributes: true }); o6.disconnect();
    host.setAttribute('title', 'x'); host.className = 'a'; kid.setAttribute('title', 'y'); host.appendChild(document.createElement('i')); kid.appendChild(document.createElement('b')); await wait();
    out.got = got; host.remove();
    // mốc thời gian kéo bản đồ
    const m = window.map || window.LG_MAP || (window.LG && LG.map); const t = [];
    for (let i = 0; i < 12; i++) { const t0 = performance.now(); m.panBy([i % 2 ? 300 : -300, i % 3 ? 200 : -200], { animate: false }); document.body.getBoundingClientRect(); t.push(performance.now() - t0); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); }
    t.sort((a, b) => a - b); out.panMedian = Math.round(t[6]);
    return out; });
  const load50 = JSON.parse(execFileSync('node', [path.join(__dirname, '../tools/prof.js'), process.argv[2], '50'], { encoding: 'utf8', maxBuffer: 1 << 26 })).loadMs;
  const g = r.got;
  const ok = report('hm07c_observers', {
    toi_da_3_observer_that: r.hubs >= 1 && r.hubs <= 3,
    khong_xoa_quy_tac_CSS_luc_chay: r.del === 0,
    ngu_nghia_observer_giu_nguyen: g.cls === 1 && g.any === 2 && g.kidAttr === 2 && g.child === 1 && g.childDeep === 2 && g.dis === 0,
    nap_50_thua_duoi_2s: load50 <= 2000,
    keo_ban_do_duoi_10ms: r.panMedian <= 10 }, { r, load50 });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

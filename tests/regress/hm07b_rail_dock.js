// HM-07b — thanh rail (lg62) và dock (lg113) không dựng lại / bật tắt lớp lặp khi không đổi trạng thái; vẫn cập nhật khi đổi trạng thái thật.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(12000);
  const r = await p.evaluate(async () => {
    const rail = document.getElementById('lg62-rail'), dock = document.querySelector('.lg103-dbtn').parentElement, cnt = { rail: 0, dock: 0 };
    const mo = (el, k) => { const o = new MutationObserver(m => { cnt[k] += m.length; }); o.observe(el, { subtree: true, childList: true, attributes: true }); return o; };
    const o1 = mo(rail, 'rail'), o2 = mo(dock, 'dock');
    const kids0 = rail.children.length, btns0 = [...dock.querySelectorAll('.lg103-dbtn')].filter(e => e.getBoundingClientRect().width > 0).length;
    await new Promise(r => setTimeout(r, 10000));
    const idle = { rail: cnt.rail, dock: cnt.dock };
    // đổi trạng thái thật: bấm một nút dock → dock phải cập nhật (có thay đổi) và vẫn đủ nút
    cnt.dock = 0; cnt.rail = 0;
    const second = [...dock.querySelectorAll('.lg103-dbtn')][1]; second && second.click();
    await new Promise(r => setTimeout(r, 1500));
    o1.disconnect(); o2.disconnect();
    return { idle, kids0, kids1: rail.children.length, btns0, btns1: [...dock.querySelectorAll('.lg103-dbtn')].filter(e => e.getBoundingClientRect().width > 0).length, afterClick: { rail: cnt.rail, dock: cnt.dock } }; });
  const ok = report('hm07b_rail_dock', {
    rail_khong_dung_lai_khi_khong_doi: r.idle.rail === 0,
    dock_khong_bat_tat_lop_lap: r.idle.dock === 0,
    van_du_nut_va_cap_nhat_khi_doi_trang_thai: r.kids0 > 0 && r.kids1 === r.kids0 && r.btns0 === 5 && r.btns1 === 5 && (r.afterClick.dock + r.afterClick.rail) > 0 }, r);
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

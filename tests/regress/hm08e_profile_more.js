// HM-08e — Hồ sơ thửa (mockup ⑤) + Thêm dạng danh sách + Chế độ chuyên gia bền, mặc định tắt (mockup ⑥).
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const b = await chromium.launch(); const checks = {}; const detail = {};
  for (const w of [360, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, hasTouch: true }); const p = await ctx.newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
    const r = await p.evaluate(async (B) => {
      const w8 = ms => new Promise(r => setTimeout(r, ms)); const out = {};
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      drawPlot('Thửa 131', B.khoi_chinh.map(q => ({ x: q[0], y: q[1] })), 105.5, { so_thua: '131', to_ban_do: '10.1', dia_chi: 'Đường Phạm Ngũ Lão', phuong_xa: 'Mỹ Xá', nguon_goc_su_dung: 'Nhận chuyển nhượng QSDĐ', loai_dat: 'ODT', dien_tich_m2: B.dien_tich_gcn, dien_tich_khong_cap_gcn: B.khong_cap_gcn }, false, 3);
      await w8(3500); const body = () => document.getElementById('lg103-body');
      LandGIS.ui.switchDock('profile'); await w8(300);
      out.title = document.querySelector('#lg103-sheet .lg103-grip h4').textContent; out.prof = body().innerText; out.sketch = !!body().querySelector('.lg8e-sketch svg polygon'); out.head = (body().querySelector('.lg8e-phead') || {}).innerText || '';
      LandGIS.ui.switchDock('more'); await w8(300);
      out.rows = [...body().querySelectorAll('.lg8e-row')].filter(vis).length; out.rowH = Math.min(...[...body().querySelectorAll('.lg8e-row')].map(e => e.getBoundingClientRect().height));
      const has = sel => !!body().querySelector(sel);
      out.expertOff = ['legacy-tool', 'diag', 'mem', 'panel184'].map(a => has('[data-lg103-act="' + a + '"]')).concat(has('[data-lg123-act="v51"]'));
      out.classOff = document.body.classList.contains('lg-expert');
      body().querySelector('[data-lg103-act="expert-toggle"]').click(); await w8(200);
      out.expertOn = ['legacy-tool', 'diag', 'mem', 'panel184'].map(a => has('[data-lg103-act="' + a + '"]')).concat(has('[data-lg123-act="v51"]'));
      out.classOn = document.body.classList.contains('lg-expert'); out.stored = localStorage.getItem('landgis_expert');
      out.swChecked = body().querySelector('[data-lg103-act="expert-toggle"]').getAttribute('aria-checked');
      out.hscroll = document.documentElement.scrollWidth > innerWidth; return out; }, B);
    checks['ho_so_dau_de_' + w] = /thửa 131/i.test(r.title) && /131.{1,6}10\.1/.test(r.head) && /Đạt/.test(r.head);
    checks['ho_so_so_do_va_thong_tin_' + w] = r.sketch && ['Địa chỉ', 'Mục đích', 'Nguồn gốc'].every(k => r.prof.includes(k)) && /Mỹ Xá/.test(r.prof);
    checks['them_dang_danh_sach_' + w] = r.rows >= 12 && r.rowH >= 44 && !r.hscroll;
    checks['chuyen_gia_mac_dinh_tat_' + w] = r.expertOff.every(x => !x) && !r.classOff;
    checks['chuyen_gia_bat_hien_cong_cu_' + w] = r.expertOn.every(Boolean) && r.classOn && r.stored === '1' && r.swChecked === 'true';
    await p.reload(); await p.waitForTimeout(4500);
    const kept = await p.evaluate(() => { LandGIS.ui.switchDock('more'); return new Promise(r => setTimeout(() => r(!!document.querySelector('#lg103-body [data-lg103-act="legacy-tool"]')), 300)); });
    checks['chuyen_gia_ben_sau_tai_lai_' + w] = kept; checks['khong_loi_trang_' + w] = errs.length === 0; detail[w] = { title: r.title, head: r.head, errs, expertOff: r.expertOff, rows: r.rows };
    await ctx.close();
  }
  const ok = report('hm08e_profile_more', checks, detail); await b.close(); process.exit(ok ? 0 : 1);
})();

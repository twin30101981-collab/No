// HM-08b — điều hướng mới: dock 5 mục (Bản đồ, Thửa, Nhập sổ, Hồ sơ, Thêm); không còn hàng tab ngang & nút nổi trùng; mọi chức năng cũ còn đường vào.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const b = await chromium.launch(); const checks = {}; const detail = {};
  for (const w of [360, 390, 430]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 844 }, hasTouch: true })).newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
    const r = await p.evaluate(async (B) => {
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; const out = {};
      const w8 = ms => new Promise(r => setTimeout(r, ms));
      out.dock = [...document.querySelectorAll('.lg103-dbtn')].filter(vis).map(e => e.textContent.replace(/\s+/g, ' ').trim());
      out.tabsVisible = [...document.querySelectorAll('.nav-tabs, .tab-btn')].filter(vis).length;
      out.floatVisible = ['lg185-theme-fab', 'lg185-cmp-fab', 'lg184-fab'].filter(id => { const e = document.getElementById(id); return e && vis(e); }).length;
      out.hscroll = document.documentElement.scrollWidth > innerWidth;
      drawPlot('Thửa 131', B.khoi_chinh.map(q => ({ x: q[0], y: q[1] })), 105.5, { so_thua: '131', dien_tich_m2: B.dien_tich_gcn, dien_tich_khong_cap_gcn: B.khong_cap_gcn }, false, 3);
      await w8(3500);   // lớp v62 tự chuyển về bản đồ sau khi có thửa — chờ xong rồi mới thử đường vào
      const sheetText = () => (document.getElementById('lg103-body') || {}).innerText || '';
      const open = async key => { LandGIS.ui.switchDock(key); await w8(250); return sheetText(); };
      out.plots = await open('plots'); out.imp = await open('import'); out.prof = await open('profile'); out.more = await open('more');
      // đường vào chức năng cũ: bấm đúng nút trong khay → màn đích hiện ra
      const clickAct = async (key, act) => { LandGIS.ui.switchDock(key); await w8(200); const b = document.querySelector('#lg103-body [data-lg103-act="' + act + '"],#lg103-body [data-lg108-act="' + act + '"],#lg103-body [data-lg109-act="' + act + '"]'); if (!b) return false; b.click(); await w8(900); return true; };
      const active = id => { const e = document.getElementById(id); return !!e && e.classList.contains('active') && vis(e); };
      out.reach = {};
      for (const [act, tab] of [['import-qr', 'tab-qr'], ['import-cad', 'tab-import'], ['import-gps', 'tab-gps-offline'], ['import-rtk', 'tab-stakeout'], ['legacy-plots', 'tab-plots'], ['import-pick', 'tab-scan-ai']]) {
        await clickAct(act === 'legacy-plots' ? 'plots' : 'import', act); out.reach[act] = active(tab);
      }
      await clickAct('import', 'import-book'); out.reach.book = !!document.getElementById('lg145-mask'); const mk = document.getElementById('lg145-mask'); if (mk) mk.remove();
      await clickAct('import', 'import-edges'); out.reach.edges = !!(window.LG170 && LG170.state && (LG170.state.open || document.querySelector('#lg170-panel,.lg170-panel'))); try { LG170.close(); } catch (e) { }
      await clickAct('profile', 'pdf'); out.reach.pdf = !!document.querySelector('.lg60-host,.lg60-root,#lg60-host'); try { LG60.close(); } catch (e) { }
      const th0 = document.documentElement.getAttribute('data-lg-theme'); await clickAct('more', 'theme'); out.reach.theme = document.documentElement.getAttribute('data-lg-theme') !== th0;
      await clickAct('more', 'ai-key'); out.reach.key = getComputedStyle(document.getElementById('key-modal')).display !== 'none'; closeKeyModal();
      await clickAct('more', 'backup'); out.reach.backup = !!document.querySelector('#lg31-proj-file'); document.querySelectorAll('.lg31-sheet,[id^=lg31-sheet]').forEach(e => e.remove());
      out.reach.legacyTool = !!document.querySelector('[data-lg103-act="legacy-tool"]') || (LandGIS.ui.switchDock('more'), !!document.querySelector('#lg103-body [data-lg103-act="legacy-tool"]'));
      LandGIS.ui.closeSheet(); return out; }, B);
    const imp = r.imp, more = r.more, prof = r.prof;
    checks['dock_5_muc_' + w] = r.dock.length === 5 && /Bản Đồ/.test(r.dock[0]) && /Thửa/.test(r.dock[1]) && /Nhập sổ/.test(r.dock[2]) && /Hồ sơ/.test(r.dock[3]) && /Thêm/.test(r.dock[4]);
    checks['go_tab_ngang_va_nut_noi_' + w] = r.tabsVisible === 0 && r.floatVisible === 0 && !r.hscroll;
    checks['nhap_so_du_8_cach_' + w] = ['Chụp sổ đỏ', 'Chọn ảnh', 'Quét QR', 'Nhập bảng kê', 'Cạnh + góc', 'CAD', 'GPS thực địa', 'RTK'].every(k => imp.includes(k));
    checks['ho_so_tab_va_thanh_xuat_' + w] = ['Tổng quan', 'Toạ độ', 'Cạnh', 'Ảnh', 'In A4', 'PDF', 'DXF'].every(k => prof.includes(k)) && /Đạt/.test(prof);
    checks['chuc_nang_cu_con_duong_vao_' + w] = Object.values(r.reach).every(Boolean);
    checks['them_4_nhom_' + w] = ['Bản đồ', 'Cài đặt', 'Trợ giúp', 'Chế độ chuyên gia'].every(k => more.includes(k)) && r.plots.includes('Thửa 131') && errs.length === 0;
    detail[w] = { reach: r.reach, dock: r.dock, tabsVisible: r.tabsVisible, floatVisible: r.floatVisible }; await p.context().close();
  }
  const ok = report('hm08b_nav', checks, detail); await b.close(); process.exit(ok ? 0 : 1);
})();

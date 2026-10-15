// HM-08c — Màn Bản đồ (mockup ①): ô tìm, chip KTT/lớp nền/nhãn, 2 nút tròn, thẻ thửa đang chọn dạng sheet 3 trạng thái, không chồng lớp ở nửa dưới màn.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const b = await chromium.launch(); const checks = {}; const detail = {};
  for (const w of [360, 390, 430]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 844 }, hasTouch: true })).newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
    const r = await p.evaluate(async (B) => {
      const w8 = ms => new Promise(r => setTimeout(r, ms)); const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
      let located = 0; document.getElementById('btn-quick-gps-locate').addEventListener('click', () => { located++; });
      drawPlot('Thửa 131', B.khoi_chinh.map(q => ({ x: q[0], y: q[1] })), 105.5, { so_thua: '131', to_ban_do: '10.1', dien_tich_m2: B.dien_tich_gcn, dien_tich_khong_cap_gcn: B.khong_cap_gcn, dia_chi: 'Phạm Ngũ Lão · Xóm B · Mỹ Xá' }, false, 3);
      await w8(4500);
      const out = {}; const sheet = document.getElementById('lg103-sheet');
      out.top = vis(document.getElementById('lg8c-top')); out.q = vis(document.getElementById('lg8c-q')); out.chips = [...document.querySelectorAll('#lg8c-chips button')].filter(vis).map(e => e.textContent.trim());
      out.fabs = [...document.querySelectorAll('#lg8c-fabs button')].filter(vis).length; out.railHidden = !vis(document.getElementById('lg62-rail')); out.infoHidden = !vis(document.getElementById('plot-info-panel'));
      out.cardOn = sheet.classList.contains('on') && sheet.classList.contains('lg8c-card-on'); out.card = (document.getElementById('lg103-body') || {}).innerText || '';
      // toast + chồng lớp nửa dưới
      toast({ title: 'Thử thông báo', description: 'một dòng' }); LGV42.notify('info', 'Thử v42', 'mô tả'); await w8(900);
      const half = innerHeight / 2, allowed = ['lg103-dock', 'lg103-sheet', 'lg8c-fabs', 'toast-wrap', 'lgv42-toast-host', 'lg8c-top'];
      const rects = {};
      document.querySelectorAll('body *').forEach(e => { const cs = getComputedStyle(e); if (!['fixed', 'absolute'].includes(cs.position)) return; if (e.closest('.leaflet-container,#map,#map-wrap,.map-wrap,.leaflet-pane,.leaflet-control')) return; if (e.closest('#lg103-dock,#lg103-sheet,#lg8c-fabs,#lg8c-top,#toast-wrap,#lgv42-toast-host')) return; if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.bottom <= half || r.top >= innerHeight) return; if (+cs.opacity === 0) return; (rects.other = rects.other || []).push((e.id || e.className.toString().split(' ')[0]) + '@' + Math.round(r.top)); });
      out.others = rects.other || [];
      const R = id => { const e = document.getElementById(id); return e && vis(e) ? e.getBoundingClientRect() : null; };
      const set = { dock: R('lg103-dock'), sheet: R('lg103-sheet'), fabs: R('lg8c-fabs'), toast: R('lgv42-toast-host') };
      const names = Object.keys(set).filter(k => set[k]); const hit = [];
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) { const a = set[names[i]], c = set[names[j]]; if (a.left < c.right && c.left < a.right && a.top < c.bottom - 1 && c.top < a.bottom - 1) hit.push(names[i] + '×' + names[j]); }
      out.overlap = hit;
      // sheet 3 trạng thái
      const H = async st => { LandGIS.ui.setSheetState(st); await w8(600); return sheet.getBoundingClientRect().height; };
      out.heights = [await H('peak'), await H('medium'), await H('full')]; LandGIS.ui.setSheetState('peak'); await w8(600);
      // tìm kiếm + chip KTT + nút tròn
      const q = document.getElementById('lg8c-q'); q.value = 'Thửa 131'; q.dispatchEvent(new Event('input')); await w8(200);
      out.res = (document.getElementById('lg8c-res').innerText || '').includes('Thửa 131');
      document.getElementById('lg8c-loc').click(); out.located = located;
      lg8cPaintChips(); out.ktt = document.querySelector('[data-chip="ktt"]').textContent;
      return out; }, B);
    const c = r.card;
    checks['o_tim_chip_nut_tron_' + w] = r.top && r.q && r.chips.length === 3 && r.fabs === 2 && /105°30′/.test(r.ktt);
    checks['the_thua_dang_chon_' + w] = r.cardOn && /Thửa 131 · Tờ 10\.1/.test(c) && /ĐẠT/.test(c) && /89,90 m²/.test(c) && /Hồ sơ/.test(c) && /Chỉ đường/.test(c) && /📷/.test(c);
    checks['bo_rail_va_bang_cu_' + w] = r.railHidden && r.infoHidden;
    checks['khong_chong_lop_nua_duoi_' + w] = r.overlap.length === 0 && r.others.length === 0;
    checks['sheet_3_trang_thai_' + w] = r.heights[0] < r.heights[1] && r.heights[1] < r.heights[2];
    checks['tim_va_dinh_vi_' + w] = r.res && r.located === 1 && errs.length === 0;
    detail[w] = { overlap: r.overlap, others: r.others, heights: r.heights, chips: r.chips }; await p.context().close();
  }
  const ok = report('hm08c_map', checks, detail); await b.close(); process.exit(ok ? 0 : 1);
})();

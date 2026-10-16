// HM-08f — ảnh/camera nối vào bước 1 của luồng Nhập sổ 3 bước: ảnh → AI giả lập → điền sẵn; số nghi ngờ tô vàng; lỗi báo rõ; không tự tạo thửa.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const checks = {};
  const pt = (t, x, y, c) => ({ ten: t, x, y, s: 10, do_tin_cay_x: c, do_tin_cay_y: c });
  const ai = { loai_trang: 'bang_toa_do', co_bang_toa_do: true, so_thua: '131', to_ban_do: '10', dia_chi: 'Xã A', dien_tich_tong_m2: 100,
    diem_moc: [pt('1', 2259300, 600100, 0.99), pt('2', 2259300, 600110, 0.7), pt('3', 2259290, 600110, 0.99), pt('4', 2259290, 600100, 0.99)],
    khoi_phu: [], giap_ranh: [{ huong: 'bac', doi_tuong: 'Đường', do_tin_cay: 0.9 }], tin_cay: { dien_tich_tong_m2: 0.8 } };
  const run = async (mode) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:/, r => {
      if (/generativelanguage/.test(r.request().url())) {
        if (mode === 'err') return r.fulfill({ status: 500, body: 'boom' });
        const j = mode === 'notable' ? Object.assign({}, ai, { co_bang_toa_do: false, diem_moc: [] }) : ai;
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(j) }] } }] }) });
      } return r.abort(); });
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(4000);
    await p.evaluate(() => { window.lgIsOpaqueLocalOrigin = () => false; try { localStorage.setItem('gemini_api_key', 'G'); lgKeySet('gemini_api_key', 'G'); lgKeySet('landgis_ai_provider_mode', 'gemini'); } catch (e) {} });
    const before = await p.evaluate(() => plots.length);
    await p.evaluate(() => window.lg8dOpen()); await p.waitForSelector('#lg8d textarea');
    const hasBtns = await p.evaluate(() => !!document.querySelector('#lg8d [data-w="cam"]') && !!document.querySelector('#lg8d [data-w="pick"]') && !!document.querySelector('#lg8d [data-w="roi"]') && document.getElementById('lg8d-cam').getAttribute('capture') === 'environment');
    await p.setInputFiles('#lg8d-pick', { name: 'so.png', mimeType: 'image/png', buffer: PNG });
    await p.waitForFunction(() => { const m = document.querySelector('#lg8d main'); return m && !/Đang đọc/.test(m.innerText); }, null, { timeout: 15000 }); await p.waitForTimeout(300);
    const o = await p.evaluate(() => ({ text: (document.getElementById('lg8d-text') || {}).value, gcn: (document.getElementById('lg8d-gcn') || {}).value, so: (document.getElementById('lg8d-so') || {}).value, to: (document.getElementById('lg8d-to') || {}).value, main: document.getElementById('lg8d').querySelector('main').innerText, plots: plots.length }));
    o.hasBtns = hasBtns; o.before = before;
    if (mode === 'ok') { await p.click('[data-w="next"]'); await p.waitForTimeout(300); o.yellow = await p.evaluate(() => document.querySelectorAll('#lg8d tr.lg-review').length); o.plotsStep2 = await p.evaluate(() => plots.length); }
    o.errs = errs.length; await p.context().close(); return o;
  };
  const ok = await run('ok'), er = await run('err'), nt = await run('notable');
  checks.nut_camera_chon_anh_khoanh_vung = ok.hasBtns;
  checks.dien_san = /^1 2259300 600100/.test(ok.text) && ok.gcn === '100' && ok.so === '131' && ok.to === '10' && /Đã đọc 4 mốc/.test(ok.main);
  checks.giap_ranh_hien = /Giáp ranh/.test(ok.main) && /Đường/.test(ok.main);
  checks.so_nghi_ngo_to_vang = ok.yellow === 1;
  checks.chua_xac_nhan_khong_tao_thua = ok.plots === ok.before && ok.plotsStep2 === ok.before;
  checks.loi_ai_bao_ro = /Đọc ảnh thất bại|Không gọi được AI/.test(er.main) && er.plots === er.before && er.text === '';
  checks.khong_co_bang_bao_ro = /không có bảng toạ độ/.test(nt.main) && nt.text === '';
  checks.khong_loi_trang = ok.errs === 0 && er.errs === 0 && nt.errs === 0;
  const pass = report('hm08f_wizard_photo', checks, { ok: ok.main.slice(0, 300), er: er.main.slice(0, 300) });
  await b.close(); process.exit(pass ? 0 : 1);
})();

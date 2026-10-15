// HM-08d — luồng Nhập sổ 3 bước (Đọc → Kiểm tra bảng kê → Kết quả): Mẫu A/B chạy hết luồng ở 390 px; thanh nút luôn trong màn hình kể cả khi viewport thấp (bàn phím ảo).
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report, fx } = require('../lib');
const txt = (rows, closeRow) => rows.map((q, i) => `${i + 1} ${q[0]} ${q[1]} ${q[2] == null ? '' : q[2]}`).join('\n') + (closeRow ? `\n1 ${rows[0][0]} ${rows[0][1]}` : '');
(async () => {
  const A = fx('so-mau-A.json'), B = fx('so-mau-B.json'); const b = await chromium.launch(); const checks = {}; const detail = {};
  const run = async (name, T, gcn, kc, expect, vh) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: vh || 844 }, hasTouch: true })).newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
    await p.evaluate(() => LandGIS.ui.switchDock('import')); await p.waitForTimeout(300);
    await p.click('#lg103-body [data-lg103-act="import-book"]'); await p.waitForSelector('#lg8d textarea');
    const inView = async () => p.evaluate(() => { const f = document.querySelector('#lg8d footer'), r = f.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0 && [...f.querySelectorAll('button')].every(x => { const q = x.getBoundingClientRect(); return q.width > 40 && q.height >= 44 && q.bottom <= innerHeight + 1; }); });
    const o = { step1: await inView() };
    await p.fill('#lg8d-text', T); await p.fill('#lg8d-gcn', String(gcn)); await p.fill('#lg8d-kc', String(kc || '')); await p.fill('#lg8d-so', '131'); await p.fill('#lg8d-to', '10.1'); await p.selectOption('#lg8d-prov', 'NAM_DINH');
    await p.click('[data-w="next"]'); await p.waitForTimeout(300);
    o.step2txt = await p.innerText('#lg8d main'); o.step2 = await inView(); o.canDraw = await p.evaluate(() => !document.querySelector('[data-w="draw"]').disabled);
    await p.click('[data-w="draw"]'); await p.waitForTimeout(2500);
    o.step3txt = await p.innerText('#lg8d main'); o.step3 = await inView(); o.plots = await p.evaluate(() => plots.length); o.stepsOn = await p.evaluate(() => [...document.querySelectorAll('#lg8d .steps span')].map(s => s.className).join(','));
    o.errs = errs.length; await p.context().close(); return o;
  };
  const rb = await run('B', txt(B.khoi_chinh, true), B.dien_tich_gcn, B.khong_cap_gcn);
  const ra = await run('A', txt(A.khoi_chinh, true) + '\n\n' + A.khoi_phu.map((q, i) => `${8 + i} ${q[0]} ${q[1]}${q[2] == null ? '' : ' ' + q[2]}`).join('\n'), A.dien_tich_gcn, 0);
  const rl = await run('B-thap', txt(B.khoi_chinh, true), B.dien_tich_gcn, B.khong_cap_gcn, null, 380);
  checks.mauB_ba_buoc_dat = /ĐẠT/.test(rb.step2txt) && rb.canDraw && /Đã dựng thửa/.test(rb.step3txt) && /Đạt/.test(rb.step3txt) && rb.plots === 1 && rb.stepsOn === 'done,done,on';
  checks.mauA_khoi_phu_tach_rieng = /Khối phụ tách riêng: 4 mốc/.test(ra.step2txt) && /ĐẠT/.test(ra.step2txt) && ra.canDraw && /Đã dựng thửa/.test(ra.step3txt) && ra.plots === 1;
  checks.nut_luon_trong_man_hinh = rb.step1 && rb.step2 && rb.step3 && ra.step1 && ra.step2 && rl.step1 && rl.step2 && rl.step3;
  checks.khong_loi_trang = rb.errs === 0 && ra.errs === 0 && rl.errs === 0;
  const ok = report('hm08d_wizard', checks, { rb: { s2: rb.step2txt.slice(0, 200), s3: rb.step3txt.slice(0, 160) }, ra: { s2: ra.step2txt.slice(0, 200), s3: ra.step3txt.slice(0, 160) } });
  await b.close(); process.exit(ok ? 0 : 1);
})();

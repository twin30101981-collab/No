// HM-21 — báo cáo đối chiếu 1 trang: sơ đồ, bảng diện tích, công thức, kết luận, ngày giờ, QR; che CCCD theo HM-14; QR quá dài → mã tra cứu (không mất QR âm thầm); in ra đúng 1 trang A4.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), fs = require('fs'), os = require('os'); const { execFileSync } = require('child_process'); const { report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const r = await p.evaluate(async B => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; const pts = B.khoi_chinh.map(q => ({ x: q[0], y: q[1] }));
    drawPlot('Thửa 131', pts, 105.5, { so_thua: '131', to_ban_do: '10.1', dien_tich_m2: B.dien_tich_gcn, dien_tich_khong_cap_gcn: B.khong_cap_gcn, chu_su_dung: 'Chủ thử', cccd_cmnd: '012345678901', dia_chi: 'Phố Thử, Phường A' }, false, 3);
    const plot = plots[plots.length - 1]; setSelectedPlotId(plot.id);
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Hồ sơ/.test(x.innerText))[0].click(); await w(800); document.querySelector('[data-lg103-act="doichieu"]').click(); await w(800);
    const t = document.getElementById('lg21-host').innerText; o.text = t; o.svg = !!document.querySelector('#lg21-host .lg21-sketch svg'); o.qrSvg = !!document.querySelector('#lg21-host .lg21-qr svg'); o.cccdFull = /012345678901/.test(t);
    localStorage.setItem('landgis_mask_id', '1'); LG21.open(plot); await w(300); o.cccdMasked = /•{9}901/.test(document.getElementById('lg21-host').innerText) && !/012345678901/.test(document.getElementById('lg21-host').innerText); localStorage.removeItem('landgis_mask_id');
    const q = LG21.qr(plot); o.qrMode = q.mode; o.qrBytes = q.bytes;
    // QR quá dài: id rất dài
    const long = Object.assign({}, plot, { id: 'Thửa ' + 'X'.repeat(260) }); const ql = LG21.qr(long); o.longMode = ql.mode; o.longHasSvg = !!ql.svg; o.longTxt = ql.txt.length; const lh = LG21.html(long); o.longNote = /mã tra cứu/i.test(lh.replace(/<[^>]+>/g, ' '));
    LG21.open(plot); return o; }, B);
  await p.evaluate(() => document.body.classList.add('lg21-printing')); await p.emulateMedia({ media: 'print' }); const pdf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bc-')), 'b.pdf'); await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  const pages = +/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }))[1]; const ptxt = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' });
  const ok = report('hm21_baocao', { co_so_do_va_qr: r.svg && r.qrSvg, bang_dien_tich_cong_thuc_ket_luan: /Diện tích đo từ toạ độ/.test(r.text) && /0,05·√A \+ 0,0003·A/.test(r.text) && /Kết luận: ĐẠT/.test(r.text) && /Sai số cho phép/.test(r.text), ngay_gio: /\d{1,2}\/\d{1,2}\/\d{4}/.test(r.text) && /\d{2}:\d{2}/.test(r.text),
    mac_dinh_cccd_day_du_bat_che_3_so: r.cccdFull && r.cccdMasked, qr_day_du_khi_vua: r.qrMode === 'day-du', qr_dai_thi_ma_tra_cuu_khong_mat_qr: r.longMode === 'rut-gon' && r.longHasSvg && r.longNote && r.longTxt < 40, in_1_trang_a4: pages === 1 && /ĐẠT/.test(ptxt), khong_loi_trang: errs.length === 0 }, { r: { ...r, text: r.text.slice(0, 120) }, pages, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

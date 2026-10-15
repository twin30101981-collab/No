// HM-25 — xuất theo biểu mẫu: bộ điền mẫu ({{x}}, {{{so_do}}}, |dp, lặp mốc, điều kiện), mã hoá HTML & chống chèn mẫu, nạp/kiểm biểu mẫu (cân khối, chặn script), mẫu bảng → CSV BOM / Excel, giao diện.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const P = a => a.map(q => ({ x: q[0], y: q[1], ten: q[2] })), w = ms => new Promise(r => setTimeout(r, ms)), o = {};
    drawPlot('F1', P([[2259340, 568000, 'A'], [2259340, 568020, 'B'], [2259320, 568020, 'C'], [2259320, 568000, 'D']]), 105.5, { so_thua: '131', to_ban_do: '10.1', dia_chi: 'Xã X', chu_su_dung: '<b>{{so_thua}}</b>', cccd_cmnd: '001234567890', dien_tich_m2: '90' }, false, 3);
    const pl = plots.filter(q => q.id === 'F1')[0], D = LGForms.plotData(pl); o.D = { so: D.so_thua, moc: D.moc.length, dt: +D.dien_tich_do.toFixed(2), m0: D.moc[0].ten, kl: D.ket_luan, svg: /<svg/.test(D.so_do) };
    o.r1 = LGForms.render('T{{so_thua}}|{{dien_tich_do|2}}|{{#moc}}[{{stt}}:{{ten}}:{{x|3}}]{{/moc}}|{{#neu to_ban_do}}to={{to_ban_do}}{{/neu}}{{#neu khong_co}}XX{{/neu}}', D);
    o.r2 = LGForms.render('{{chu_su_dung}}', D); o.r3 = LGForms.render('{{{so_do}}}', D).slice(0, 5);
    o.v = [LGForms.validate('html', '{{#moc}}x'), LGForms.validate('html', '{{#moc}}x{{/moc}}'), LGForms.validate('bang', '{"dong":"moc","cot":[]}'), LGForms.validate('bang', 'khong json'), LGForms.validate('bang', '{"dong":"abc","cot":[{"truong":"x"}]}'), LGForms.validate('bang', '{"dong":"moc","cot":[{"truong":"x"}]}')];
    o.bad = [LGForms.add('x', 'html', '<script>alert(1)</script>').ok, LGForms.add('x', 'html', '<img src=x onerror=alert(1)>').ok, LGForms.add('', 'html', 'hi').ok, LGForms.add('Mẫu của tôi', 'html', '<p>Thửa {{so_thua}}</p>{{#moc}}<i>{{ten}}</i>{{/moc}}').ok];
    o.n = LGForms.list().length;
    // bảng
    const t1 = LGForms.table(LGForms.get('mac-dinh-bang-moc-xlsx'), pl); o.t1 = { head: t1.head.join('|'), rows: t1.rows.length, r0: t1.rows[0] };
    const t2 = LGForms.table(LGForms.get('mac-dinh-bang-thua'), pl); o.t2 = { rows: t2.rows.length, hasF1: t2.rows.some(rw => rw[0] === '131') };
    const csv = LGForms.toCSV(t1); o.csv = { bom: csv.charCodeAt(0) === 0xFEFF, head: csv.split('\r\n')[0], l1: csv.split('\r\n')[1] };
    window.__dl = []; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { window.__dl.push(this.download); };
    o.ex = await LGForms.exportTable('mac-dinh-bang-moc-xlsx', pl, 'csv'); o.ex2 = await LGForms.exportTable('mac-dinh-bang-moc-xlsx', pl, 'xlsx'); o.dl = window.__dl.slice(); HTMLAnchorElement.prototype.click = oc;
    // giao diện
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Hồ sơ/.test(x.innerText))[0].click(); await w(300);
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thêm/.test(x.innerText))[0].click(); await w(600);
    const row = document.querySelector('[data-lg103-act="forms-open"]'); o.row = !!row; row.click(); await w(400); o.cards = document.querySelectorAll('.lg25-row').length;
    document.getElementById('lg25-name').value = 'Mẫu UI'; document.getElementById('lg25-body').value = '<h3>Thửa {{so_thua}}</h3>{{#moc}}<p>{{ten}}</p>{{/moc}}'; document.querySelector('[data-lg103-act="frm-add"]').click(); await w(300); o.cards2 = document.querySelectorAll('.lg25-row').length;
    const openBtns = document.querySelectorAll('[data-lg103-act="frm-open"]'); openBtns[openBtns.length - 1].click(); await w(600); const txt = (document.querySelector('.lg25-page') || {}).innerText || ''; o.page = /Thửa 131/.test(txt) && /A/.test(txt) && /D/.test(txt);
    return o; });
  const ok = report('hm25_forms', { du_lieu: r.D.so === '131' && r.D.moc === 4 && r.D.kl && r.D.svg, dien_mau: /^T131\|400,00\|\[1:A:2259340,000\]\[2:B:2259340,000\]\[3:C:2259320,000\]\[4:D:2259320,000\]\|to=10\.1$/.test(r.r1), ma_hoa_va_chong_chen_mau: r.r2 === '&lt;b&gt;&#123;&#123;so_thua}}&lt;/b&gt;' || (!/131/.test(r.r2) && /&lt;b&gt;/.test(r.r2)), so_do_tho: r.r3.startsWith('<svg'),
    kiem_tra_mau: r.v[0] && !r.v[1] && r.v[2] && r.v[3] && r.v[4] && !r.v[5], chan_script_va_su_kien: r.bad[0] === false && r.bad[1] === false && r.bad[2] === false && r.bad[3] === true, danh_sach: r.n === 4, bang_moc: r.t1.rows === 4 && /^STT\|Mốc/.test(r.t1.head) && r.t1.r0[1] === 'A', bang_thua: r.t2.rows >= 1 && r.t2.hasF1,
    csv_bom_dau_phay_dong: r.csv.bom && /^STT;Mốc/.test(r.csv.head.replace(/^\ufeff/, '')) && /^1;A;2259340,000;568000,000;20,00;/.test(r.csv.l1), ten_file_giu_dau: /^Toạ_độ_mốc-/.test(r.dl[0]), xuat_file: r.ex.ok && r.ex.dong === 4 && r.dl.length >= 2 && /\.csv$/.test(r.dl[0]), giao_dien: r.row && r.cards === 4 && r.cards2 === 5 && r.page, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

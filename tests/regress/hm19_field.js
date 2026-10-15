// HM-19 — đối soát mốc thực địa: GPS giả lập tại mốc / lệch 4 m; kết luận theo sai số GPS; ghi chú+ảnh theo mốc lưu vào hồ sơ; báo cáo; giao diện tab Thực địa.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const P = a => a.map(q => ({ x: q[0], y: q[1], ten: q[2] })), w = ms => new Promise(r => setTimeout(r, ms)), o = {};
    drawPlot('Thửa 19', P([[2259336.23, 568027.14, 'A'], [2259334.17, 568027.23, 'B'], [2259334.42, 568031.07, 'C'], [2259316.85, 568031.69, 'D']]), 105.5, { so_thua: '19', to_ban_do: '10.1' }, false, 3);
    const pl = plots.filter(q => q.id === 'Thửa 19')[0], def = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 });
    const ll = (x, y) => { const q = proj4(def, 'WGS84', [y, x]); return { lat: q[1], lng: q[0] }; };
    // tại đúng mốc A (±3 m)
    const f0 = Object.assign(ll(2259336.23, 568027.14), { acc: 3 }), c0 = LGField.compare(pl, 0, f0); o.c0 = { ok: c0.ok, d: c0.dist, dat: c0.dat };
    // lệch 4 m về phía Nam (x giảm 4) — GPS ±3 → lệch; mốc sổ nằm về phía Bắc của người đứng (hướng ≈ 0°)
    const f1 = Object.assign(ll(2259332.23, 568027.14), { acc: 3 }), c1 = LGField.compare(pl, 0, f1); o.c1 = { d: c1.dist, az: c1.az, huong: c1.huong, dat: c1.dat };
    const f2 = Object.assign(ll(2259336.23, 568031.14), { acc: 8 }), c2 = LGField.compare(pl, 0, f2); o.c2 = { d: c2.dist, huong: c2.huong, dat: c2.dat, cb: c2.canh_bao.length };
    o.bad = [LGField.compare(pl, 9, f0).ok, LGField.compare(pl, 0, null).ok];
    LGField.save(pl, 0, f1, { ghi_chu: 'Mốc xi măng, lún nhẹ', anh: 'data:image/jpeg;base64,/9j/AAAA' }); LGField.save(pl, 1, f0);
    o.saved = Object.assign({}, pl.meta.doi_soat_moc.A, { anh: undefined }); o.sum = LGField.summary(pl); o.keepNote = (LGField.save(pl, 0, f0), pl.meta.doi_soat_moc.A.ghi_chu);
    const stored = JSON.parse(localStorage.getItem('land_gis_v18_cache') || '[]').filter(q => q.id === 'Thửa 19')[0]; o.persisted = !!(stored && stored.meta && stored.meta.doi_soat_moc && stored.meta.doi_soat_moc.A && stored.meta.doi_soat_moc.A.ghi_chu);
    // giao diện + GPS giả lập
    navigator.geolocation.getCurrentPosition = (ok) => ok({ coords: { latitude: f1.lat, longitude: f1.lng, accuracy: 3 } });
    window.currentPlotId = pl.id; Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Hồ sơ/.test(x.innerText))[0].click(); await w(700);
    document.querySelector('[data-lg103-act="prof-field"]').click(); await w(300); o.rows = document.querySelectorAll('.lg19-row').length;
    document.querySelector('.lg19-row[data-i="0"] [data-lg103-act="fld-gps"]').click(); await w(500);
    const row2 = document.querySelector('.lg19-row[data-i="0"]').innerText; o.row2 = row2; o.row2Ok = /Lệch 4,\d\d m/.test(row2) && /GPS ±3,0 m/.test(row2);
    document.querySelector('.lg19-row[data-i="3"] [data-lg103-act="fld-note"]').click(); await w(300); document.getElementById('lg19-note').value = 'Cọc gỗ'; document.querySelector('[data-lg103-act="fld-note-save"]').click(); await w(400);
    o.noteShown = /Cọc gỗ/.test(document.querySelector('.lg19-row[data-i="3"]').innerText);
    document.querySelector('[data-lg103-act="fld-report"]').click(); await w(600); const txt = (document.querySelector('.lg21-page') || {}).innerText || '';
    o.rep = /BÁO CÁO ĐỐI SOÁT MỐC THỰC ĐỊA/.test(txt) && /Cọc gỗ/.test(txt) && /Mốc xi măng/.test(txt) && /Lệch/.test(txt); o.repImg = !!document.querySelector('.lg21-page img');
    return o; });
  const ok = report('hm19_field', { tai_moc_khop: r.c0.ok && r.c0.d < 0.01 && r.c0.dat, lech_4m: Math.abs(r.c1.d - 4) < 0.02 && !r.c1.dat && r.c1.huong === 'Bắc', gps_kem_8m_van_khop_nhung_canh_bao: Math.abs(r.c2.d - 4) < 0.02 && r.c2.huong === 'Tây' && r.c2.dat && r.c2.cb === 1, dau_vao_sai_tu_choi: r.bad.every(x => x === false), luu_vao_ho_so: r.saved.ghi_chu === 'Mốc xi măng, lún nhẹ' && r.saved.dat === false && r.sum.da_do === 2 && r.sum.khop === 1 && r.sum.lech === 1 && r.sum.co_anh === 1, giu_ghi_chu_khi_do_lai: r.keepNote === 'Mốc xi măng, lún nhẹ', ben_vung_localStorage: r.persisted,
    ui_tab_4_moc: r.rows === 4, ui_do_gps: r.row2Ok, ui_ghi_chu: r.noteShown, bao_cao: r.rep && r.repImg, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

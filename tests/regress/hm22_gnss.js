// HM-22 — NMEA từ máy thu GNSS/RTK ngoài: phân tích GGA/RMC/GST (checksum), ghép gói BLE bị cắt, fix RTK, kết nối BLE/Serial giả lập, HM-19 dùng GNSS ngoài, giao diện.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const o = {}, w = ms => new Promise(r => setTimeout(r, ms)), N = body => '$' + body + '*' + LGGnss.checksum(body);
    // 20°25'26.0" ≈ 20.423889 ; 106°09'13.5" ≈ 106.153750 → ddmm.mmmm
    const gga = q => N('GNGGA,123519.00,2025.43340,N,10609.22500,E,' + q + ',18,0.8,5.4,M,-20.1,M,1.0,0000'), gst = N('GNGST,123519.00,0.5,0.02,0.01,45.0,0.012,0.016,0.03');
    o.p = LGGnss.parse(gga(4)); o.badCs = LGGnss.parse(gga(4).replace('10609', '10608')); o.gst = LGGnss.parse(gst); o.rmc = LGGnss.parse(N('GNRMC,123519.00,A,2025.43340,N,10609.22500,E,0.1,90.0,151026,,,A'));
    // ghép gói bị cắt
    const line = gst + '\r\n' + gga(4) + '\r\n'; for (let i = 0; i < line.length; i += 7) LGGnss.feed(line.slice(i, i + 7)); o.st0 = LGGnss.status();
    // BLE giả lập
    const listeners = []; const chr = { addEventListener: (t, f) => listeners.push(f), startNotifications: async () => {}, stopNotifications: async () => {} };
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: { requestDevice: async (opt) => ({ name: 'Reach RS3', gatt: { connected: true, connect: async () => ({ getPrimaryService: async (u) => { if (!/6e400001/.test(u)) throw new Error('no'); return { getCharacteristic: async () => chr }; } }), disconnect() { this.connected = false; } }, addEventListener() {} }) } });
    const sNo = LGGnss.status(); o.noConn = sNo.ket_noi;
    const stc = await LGGnss.connectBLE(); o.conn = stc.ket_noi && stc.loai === 'ble' && stc.ten === 'Reach RS3';
    const enc = new TextEncoder(); const push = t => listeners.forEach(f => f({ target: { value: enc.encode(t) } }));
    push(gst + '\r\n' + gga(4).slice(0, 30)); push(gga(4).slice(30) + '\r\n'); await w(50); o.rtk = LGGnss.status(); o.fresh = LGGnss.fresh(5000);
    push(gga(5) + '\r\n'); o.flt = LGGnss.status().q; LGGnss._state.gst = null; push(gga(1) + '\r\n'); o.gps = LGGnss.status();
    // HM-19 dùng GNSS ngoài
    drawPlot('G1', [[2259336.23, 568027.14, 'A'], [2259334.17, 568027.23, 'B'], [2259334.42, 568031.07, 'C'], [2259316.85, 568031.69, 'D']].map(q => ({ x: q[0], y: q[1], ten: q[2] })), 105.5, { so_thua: 'G1' }, false, 3);
    const pl = plots.filter(q => q.id === 'G1')[0], def = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 }), q4 = proj4(def, 'WGS84', [568027.14, 2259336.23]);
    const dd = v => { const d = Math.floor(v), m = (v - d) * 60; return [d, m]; };
    const nm = (la, lo) => { const [a, am] = dd(la), [c, cm] = dd(lo); return N('GNGGA,123519.00,' + String(a).padStart(2, '0') + am.toFixed(7).padStart(10, '0') + ',N,' + String(c).padStart(3, '0') + cm.toFixed(7).padStart(10, '0') + ',E,4,20,0.7,5.0,M,0,M,1.0,0000'); };
    push(gst + '\r\n' + nm(q4[1], q4[0]) + '\r\n'); await w(50);
    const m = await LGField.measure(pl, 0); o.meas = { ok: m.ok, d: m.dist, acc: m.acc, dat: m.dat, nguon: m.rec && m.rec.nguon, q: m.rec && m.rec.q };
    // giao diện
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thêm/.test(x.innerText))[0].click(); await w(600);
    const row = document.querySelector('[data-lg103-act="gnss-open"]'); o.row = !!row; row.click(); await w(400); const t = (document.querySelector('.lg22') || {}).innerText || ''; o.ui = /Reach RS3/.test(t) && /cm|m/.test(t) && /Ngắt kết nối/.test(t);
    document.querySelector('[data-lg103-act="gnss-off"]').click(); await w(200); o.off = !LGGnss.status().ket_noi && /Chưa kết nối/.test(document.querySelector('.lg22').innerText) && !!document.querySelector('[data-lg103-act="gnss-ble"]');
    // Serial giả lập
    let chunks = [enc.encode(gga(4).slice(0, 20)), enc.encode(gga(4).slice(20) + '\r\n')], i = 0;
    Object.defineProperty(navigator, 'serial', { configurable: true, value: { requestPort: async () => ({ open: async () => {}, close: async () => {}, readable: { getReader: () => ({ read: async () => (i < chunks.length ? { done: false, value: chunks[i++] } : (await new Promise(() => {}))), cancel() {} }) } }) } });
    const ss = await LGGnss.connectSerial(9600); await w(100); o.serial = ss.ket_noi && ss.loai === 'serial' && LGGnss.status().q === 4;
    // không có hỗ trợ
    Object.defineProperty(navigator, 'bluetooth', { value: undefined, configurable: true }); o.noBle = await LGGnss.connectBLE().then(() => 'ok', e => String(e.message));
    return o; });
  const ok = report('hm22_gnss', {
    gga_dung: r.p && Math.abs(r.p.lat - 20.423889) < 1e-5 && Math.abs(r.p.lng - 106.1537) < 1e-4 && r.p.q === 4 && r.p.sats === 18 && r.p.hdop === 0.8 && r.p.ok, sai_checksum_bi_loai: r.badCs === null, gst_sai_so: r.gst && Math.abs(r.gst.hAcc - Math.hypot(0.012, 0.016)) < 1e-9, rmc: r.rmc && r.rmc.valid && r.rmc.course === 90,
    ghep_goi_bi_cat: r.st0.cau >= 2 && r.st0.cau_loi === 0 && r.st0.q === 4, ble_ket_noi: r.noConn === false && r.conn, rtk_fixed_cm: r.rtk.rtk_fixed && r.rtk.acc < 0.03 && !r.rtk.acc_uoc_tinh && /Fixed/.test(r.rtk.chat_luong) && r.fresh, rtk_float: r.flt === 5, gps_don_uoc_tinh_tu_hdop: r.gps.q === 1 && r.gps.acc_uoc_tinh,
    hm19_dung_gnss_ngoai: r.meas.ok && r.meas.d < 0.05 && r.meas.nguon === 'GNSS ngoài' && r.meas.q === 4 && r.meas.acc < 0.03, ui: r.row && r.ui && r.off, serial: r.serial, thieu_ho_tro_bao_loi_ro: /Web Bluetooth/.test(r.noBle), khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

// HM-16 — dẫn đường/cắm mốc: giữ màn hình sáng (Wake Lock), rung khi cách mốc < ngưỡng (cấu hình), tự nhả khi tắt. Dùng Wake Lock/rung/GPS giả lập (file:// không phải nguồn an toàn).
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; const log = []; let released = 0, req = 0; const listeners = [];
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async t => { req++; log.push('request:' + t); const l = { released: false, release: async () => { l.released = true; released++; log.push('release'); }, addEventListener: (e, f) => listeners.push(f) }; return l; } } });
    const vib = []; navigator.vibrate = p => { vib.push(p); return true; };
    // GPS giả: đứng cách mốc 3 m → 0,8 m → 0,3 m
    const pts = [[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69]].map(q => ({ x: q[0], y: q[1] }));
    drawPlot('Thửa 7', pts, 105.5, { so_thua: '7' }, false, 3); updateStakeoutSelects(); await w(200);
    document.getElementById('stakeout-plot-select').value = 'Thửa 7'; updateStakeoutPins(); document.getElementById('stakeout-pin-select').value = '0';
    const def = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 }); const ll = (dN) => { const q = proj4(def, 'WGS84', [568027.14, 2259336.23 + dN]); return { latitude: q[1], longitude: q[0], accuracy: 1 }; };
    let cb = null; navigator.geolocation.watchPosition = (ok) => { cb = ok; return 77; }; navigator.geolocation.clearWatch = () => { };
    document.getElementById('btn-start-stakeout').click(); await w(300); o.reqOn = req; o.wakeActive = lgWake.active();
    o.vibInputExists = !!document.getElementById('stakeout-vib'); cb({ coords: ll(3) }); await w(50); o.vibFar = vib.length;
    cb({ coords: ll(0.8) }); await w(50); o.vibNear = vib.length; o.vibPattern = JSON.stringify(vib[vib.length - 1]);
    await w(1600); cb({ coords: ll(0.3) }); await w(50); o.vibVeryNear = JSON.stringify(vib[vib.length - 1]);
    // đổi ngưỡng về 0 → không rung nữa
    document.getElementById('stakeout-vib').value = '0'; await w(1600); const n = vib.length; cb({ coords: ll(0.3) }); await w(50); o.vibOff = vib.length === n;
    // quay lại màn hình (visibility) vẫn giữ khoá
    document.getElementById('stakeout-vib').value = '1';
    document.getElementById('btn-start-stakeout').click(); await w(300); o.released = released; o.wakeActiveAfter = lgWake.active(); o.log = log.slice();
    return o; });
  const ok = report('hm16_wake', { co_o_cau_hinh_rung: r.vibInputExists, xin_wake_lock_khi_bat_dan_duong: r.reqOn === 1 && r.wakeActive === true, khong_rung_khi_xa: r.vibFar === 0, rung_khi_duoi_1m: r.vibNear === 1 && r.vibPattern === '120', rung_manh_hon_duoi_0_5m: r.vibVeryNear === '[200,80,200]',
    nguong_0_tat_rung: r.vibOff, tu_nha_khi_tat: r.released === 1 && r.wakeActiveAfter === false, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

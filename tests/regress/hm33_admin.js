// HM-33 — tra xã/phường mới ↔ cũ ↔ KTT (cơ chế; dữ liệu thật do người dùng cung cấp).
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(4500);
  const r = await p.evaluate(() => {
    const keys = Object.keys(VN2000_PROVINCES); const nb = 'NINH_BINH', hn = 'HA_NAM', nd = 'NAM_DINH';
    const n = LGAdmin.load([{ moi: 'Phường Thử Một', loai: 'phường', cu: [{ ten: 'Xã A', huyen: 'Huyện X', tinh: nb }] },
      { moi: 'Xã Thử Hai', loai: 'xã', cu: [{ ten: 'Xã Bê', huyen: 'Huyện Y', tinh: hn }, { ten: 'Thị trấn Cê', huyen: 'Huyện Z', tinh: nd }] }]);
    return { n, keys: [nb, hn, nd].every(k => VN2000_PROVINCES[k]), moi: LGAdmin.lookup('phuong thu mot'), cu: LGAdmin.lookup('Xã A'), cuHauTo: LGAdmin.lookup('a'), nhieu: LGAdmin.lookup('xa be'), khong: LGAdmin.lookup('không có'), lon: [nb, hn, nd].map(k => VN2000_PROVINCES[k].lon0) };
  });
  const ok = report('hm33_admin', {
    nap_2_dong: r.n === 2, tra_theo_ten_moi: r.moi.length === 1 && r.moi[0].cu[0].ten === 'Xã A', tra_theo_ten_cu: r.cu.length === 1 && r.cu[0].moi === 'Phường Thử Một',
    ktt_theo_dia_ban_cu: r.cu[0].ktt.length === 1 && r.cu[0].ktt[0] === r.lon[0], nhieu_ktt_duoc_bao: r.nhieu[0].ktt.length === new Set([r.lon[1], r.lon[2]]).size && r.nhieu[0].nhieuKtt === (new Set([r.lon[1], r.lon[2]]).size > 1),
    khong_co_tra_rong: r.khong.length === 0, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

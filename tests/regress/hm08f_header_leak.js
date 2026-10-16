// HM-08f — thanh trên không được nhân bản nút "Hiển thị cạnh thửa & GPS" theo thời gian (lỗi: 76 nút sau 30 s).
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]); await p.waitForTimeout(9000);
  const n = await p.evaluate(() => document.querySelectorAll('#lg110-tools').length);
  const ok = report('hm08f_header_leak', { mot_nut_cong_cu: n === 1, khong_loi_trang: errs.length === 0 }, { n });
  await b.close(); process.exit(ok ? 0 : 1);
})();

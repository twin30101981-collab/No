/* P10 (T8): đường dẫn cho kịch bản dữ liệu thật — lấy từ biến môi trường (do tools/real-run.mjs đặt); không đặt ⇒ mặc định như các phiên cũ. */
const R = process.env.QLTD_REAL_ROOT || '/tmp/claude-0/real';
module.exports = {
  DATA: process.env.QLTD_REAL_DATA || R + '/data',      // 11 kỳ dư nợ, 2 sao kê TSBĐ, PL01/PL02/NQ38 (dữ liệu thật — NGOÀI repo)
  EXTRA: process.env.QLTD_REAL_EXTRA || R + '/extra',   // tệp phụ cho HM-23: bản trùng "30.09.2026 (1).XLS", ghi_chu.pdf
  ROWS: process.env.QLTD_REAL_ROWS || R,                // rows_<tệp>.json (extract.js)
  WORK: process.env.QLTD_WORK || '/tmp/claude-0/work1', // tệp đối chiếu độc lập (*_indep.json, sha_all.json) + tệp tải về
  OUT: process.env.QLTD_OUT || '/tmp/claude-0/w/out',   // báo cáo Word/Excel tải về (hm28b)
  APP_URL: process.env.QLTD_APP_URL || 'http://127.0.0.1:8765/index.html',
  APP: process.env.QLTD_APP || ''
};

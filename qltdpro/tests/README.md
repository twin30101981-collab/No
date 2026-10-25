# Bộ kiểm thử hồi quy QLTD PRO (HM-22)

Chạy **một lệnh**, báo pass/fail toàn bộ:

```sh
node tests/run.js                      # app mới nhất trong app/
node tests/run.js --app app/<tệp>.html # chỉ định bản
node tests/run.js --mutation           # thêm tầng đột biến (chậm hơn, ~6–8 phút)
node tests/run.js --no-e2e             # chỉ tầng 1–3 (vài giây, không cần trình duyệt)
```

Thoát mã 0 = tất cả đạt, 1 = có lỗi. Yêu cầu: Node ≥ 18, `playwright` (cài toàn cục, `NODE_PATH` tự dò) + Chromium, lệnh `unzip`.

## Các tầng

| Tầng | Kiểm gì | Bảo vệ |
|---|---|---|
| 0 | `src/` → `tools/build.mjs` dựng ra **đúng** tệp phát hành (SHA-256); 6 đối chứng âm (sửa nguồn, sửa lén thư viện, lỗi cú pháp, SheetJS hỏng kiểu HM-01, chèn dữ liệu cá nhân, sửa HTML) | HM-20 |
| 1 | Biên dịch thử mọi khối `<script>` của app | HM-01 (một khối hỏng làm mất cả SheetJS) |
| 2 | Kiểm thử đơn vị 15 module `td_*.js` (số/ngày, KPI, đối soát, giá đất, báo cáo Excel/Word, router, xu hướng, cảnh báo, KH 360°, TSBĐ…) | HM-06…HM-28b |
| 3 | Module nhúng trong app **giống hệt** tệp nguồn đã kiểm thử | tránh “test đạt nhưng bản chạy khác” |
| 4 | e2e Playwright trên **fixture ẩn danh** (`tests/fixtures`): nhập .xlsx, tính, lưu/tải lại, sao lưu, các trang, bảng, phân trang, báo cáo Word/Excel, giá đất | HM-01…HM-28b (mỗi phép kiểm gắn mã HM) |
| 5 | (`--mutation`) cố ý tái tạo các lỗi đã sửa (P10: 59 đột biến) vào bản sao của app; bộ test **phải** thất bại đúng nhóm | chứng minh test thật sự bắt được lỗi |

## Fixture

`tests/fixtures/make_fixtures.py` sinh `20.10.2026.xlsx` (định dạng IPCAS 87 cột, 320 dòng, 120 khách hàng giả “Khách hàng NNN”, lãi suất 8,5/7,77/…, dư nợ < 100.000 đ, dòng dư nợ 0) và `expected.json` (đáp số tính độc lập từ chính các dòng sinh ra). Không có dữ liệu thật. Sinh lại: `python3 make_fixtures.py` (cần `openpyxl`).

P04 thêm (định dạng lấy theo tệp thật, giá trị đều giả):
- `make_xls_fixture.py` ⇒ `20.10.2026.XLS` — cùng dữ liệu, ghi dạng BIFF8 như tệp IPCAS thật (cần `xlwt`); e2e bước Y.
- `make_tsbd_fixture.py` ⇒ `Sao ke tai san bao dam 20.10.2026.xlsx` (39 cột như sao kê thật; TS trùng `clno`, USD/EUR, bên thứ ba, TS của KH ngoài dữ liệu, TS hết hạn, định giá cũ) + `tsbd_expected.json`; e2e bước X (HM-10).

## Dữ liệu thật (tuỳ chọn, không đóng gói vì có thông tin cá nhân)

Các kiểm thử trên tệp IPCAS/TSBĐ/PL02 thật nằm ở `evidence/scripts/` (`hm17b_test.js`, `hm17c_real.js` (chọn cột Chuyển HM/TSBĐ/Giá đất), `hm28b_real.js` + `hm28b_check.py`, `td_pl02.test.js`, `hm09b_real.js`, `real10.js`…). Chúng cần thư mục dữ liệu ở `/tmp/claude-0/real/data` (tên tệp như bản gốc) và `pip install xlrd openpyxl` (PL02: `node tests/run.js --real /tmp/claude-0/real/data`, cần `PL02.docx` trong thư mục). Chạy riêng khi có dữ liệu.

## Thêm kiểm thử mới

- Hàm thuần mới → `evidence/scripts/td_<tên>.js` + `td_<tên>.test.js` (in `PASS n FAIL m`), runner tự nhặt; nhúng vào app nguyên văn để tầng 3 kiểm.
- Hành vi giao diện → thêm `ck('HM-xx', 'mô tả', điều kiện, thông tin)` vào `tests/e2e/suite.js`.
- Lỗi mới sửa → thêm một đột biến vào `tests/mutation.js` (mẫu chuỗi mã → mã lỗi) để chứng minh test bắt được.

## Kiểm chứng trên dữ liệu thật (P09)
Dữ liệu thật để NGOÀI repo tại `/tmp/claude-0/real/data` (11 kỳ dư nợ `dd.mm.yyyy.xlsx|XLS`, 2 sao kê `Sao ke tai san bao dam dd.mm.yyyy.XLS`, `PL01.docx`, `PL02.docx`, `NQ38.pdf`).
- `node evidence/scripts/audit_p09.js <app.html>` — 37 phép kiểm tổng thể (nhập 13 tệp, toàn vẹn, 26 trang, bảng, lưu bền, sao lưu, khung hình, rò rỉ). Xuất JSON.
- `node evidence/scripts/audit_p09b.js <app.html>` — 13 phép kiểm lỗi tiềm ẩn (tệp hỏng, nhập trùng, đua, 4 múi giờ, IndexedDB bị chặn, đồng hồ).
- `node evidence/scripts/prof_p09.js <app.html> phidv,dashboard,…` — CPU profile theo trang (hồ sơ bền `/tmp/claude-0/p09/profile`).
- **P10 (T8) — MỘT lệnh cho 12 kịch bản dữ liệu thật:** `node tools/real-run.mjs --data <thư mục dữ liệu thật> [--app app/<tệp>.html] [--only hm23,hm24] [--keep]`.
  Tự dựng môi trường trong thư mục tạm (os.tmpdir(), tự xoá khi đạt hết): tệp phụ HM-23 (bản trùng `30.09.2026 (1).XLS`, `ghi_chu.pdf`), Python xlrd/openpyxl (tự `pip install --target` nếu thiếu),
  máy chủ HTTP cổng ngẫu nhiên phục vụ app ở `/index.html`, trích dòng (`extract.js`, 11 kỳ) + đối chiếu độc lập (`*_indep.py`) + `sha_all.json`; chạy hm17c, hm23, hm24, hm25, hm26, hm15, hm19,
  hm09b, real10, real12, hm28b (+ `hm28b_check.py`), td_pl02; in tổng kết, mã thoát 0/1. Đường dẫn trong kịch bản lấy từ `evidence/scripts/_realenv.js|.py` (biến môi trường `QLTD_*`).
  Thư mục dữ liệu nằm trong repo ⇒ lệnh từ chối chạy. Kết quả P10: 12/12 đạt.
- (Lịch sử) Kịch bản cũ (hm17c/23/24/25/26, hm09b, real10, real12, hm28b, td_pl02, hm15, hm19) trước P10 cần thêm: máy chủ `python3 -m http.server 8765` phục vụ `index.html` = app; `/tmp/claude-0/work1/{sha_all,trend_indep,kh360_indep,report_indep}.json` (sinh từ `extract.js` + `*_indep.py`, cần `pip install xlrd`); `/tmp/claude-0/real/extra/{30.09.2026 (1).XLS,ghi_chu.pdf}`.
- Sandbox Chromium không đọc được đường dẫn tệp có dấu tiếng Việt: tải tệp qua bộ nhớ (`setInputFiles({name,mimeType,buffer})`).

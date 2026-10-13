# TD-33 (P18, 13/10/2026): ký số bằng chứng thư .p12 thật

Chứng thư thử (CHỈ ĐỂ THỬ, khoá riêng không bí mật): CA tự ký "Ghi Nhanh Test CA" → người ký "Nguyễn Văn Thử", tạo bằng OpenSSL 3.0.13:
- moi-aes: PKCS#12 mặc định OpenSSL 3 (PBES2/PBKDF2/AES-256-CBC, MAC SHA-256), có chuỗi CA.
- cu-3des: `-legacy` (3DES/RC2), có chuỗi CA.
- app-tao-ui: chứng thư tự ký tạo ngay trong hộp thoại Ký số (tên có dấu).

Ký qua giao diện /tools → Ký số (Chromium, scripts/playwright/kiem-ky-so-p12.mjs) rồi kiểm ĐỘC LẬP bằng `pdfsig` (poppler/NSS) — xem pdfsig.txt.

Lỗi tìm thấy và đã sửa (đỏ trước khi sửa, có kiểm thử):
1. .p12 do app tạo với tên có dấu KHÔNG mở lại được (cả app lẫn openssl: "sai mật khẩu hoặc tệp hỏng") — forge ghi CN PrintableString/friendlyName BMPString từ chuỗi thô.
2. Tên UTF-8 trong .p12 của openssl hiện vỡ mã "Nguyá»n VÄn Thá»­" (toast + Kiểm tra chữ ký).
3. /Reason "Duyệt tài liệu" thành "DuyÇt tài liÇu", /Name vỡ mã trong PDF (PDFString.of cắt ký tự > 255) → PDFHexString.fromText.
4. Chứng thư tự ký tên có dấu: issuerAndSerialNumber bị mã UTF-8 hai lần → pdfsig "Unknown Validation Failure", không tìm ra người ký.
5. readSignature cắt mọi "00" cuối → chữ ký có byte cuối 0x00 (~1/256) bị báo "không hợp lệ" (phát hiện qua 1 lần kiểm thử chập chờn).
6. Số serial có thể âm (RFC 5280 yêu cầu dương).

Kết quả sau sửa: cả 3 PDF "Signature is Valid", CN "Nguyễn Văn Thử"; "Certificate issuer is unknown" là đúng vì CA thử không nằm trong kho tin cậy.
Chưa kiểm: chứng thư của tổ chức chứng thực thật (CA công cộng/VNPT/Viettel…), Adobe Acrobat.

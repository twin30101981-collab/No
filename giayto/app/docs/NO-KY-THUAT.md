# Nợ kỹ thuật – nâng cấp scan (cập nhật 13/10/2026, đóng phiên P17; phần A–E bên dưới là bản 07/10/2026)

## 0. Cập nhật 13/10/2026 — sau đề án nâng cấp (HM-01…HM-18)
Nguồn chi tiết: handover/backlog.json (phát hiện F-01…F-14, hạng mục, bằng chứng) và de-an/DE_AN_GIAYTO_v1.2.docx.

### 0.1 Đã đóng trong đề án (có bằng chứng trong ZIP từng hạng mục)
| Mã cũ / phát hiện | Nội dung | Đóng bởi |
| --- | --- | --- |
| F-01 | Vitest thoát mã 1 dù 830 đạt (thiếu IndexedDB trong app-routing.test) | HM-01 |
| F-14 | App không bắt lỗi khi IndexedDB bị chặn/không có | HM-15 |
| F-08 | Màn rộng chỉ 1 cột 430 px (màn Tài liệu) | HM-10 (P17) |
| R6.2 phần 2 | So OCR với CamScanner: app Auto 98,68% vs Cam tốt nhất 98,88% (chênh −0,2 ≥ −2) — ĐẠT, xem TD-42/43 | HM-12 (P17) |
| F-04 | 13 hàm AI không giới hạn, không cần đăng nhập | HM-03 (60 lượt/giờ/IP, Q1=b) |
| F-06 | Thanh công cụ màn tài liệu gãy hàng | HM-04 |
| F-07 | 78 vùng chạm < 40 px | HM-05 |
| F-11 | Cảnh báo hook/lint (không có lỗi thật; dọn lint) | HM-06 |
| F-09 | Nhận chữ lỗi im lặng + pageerror khi không tải được gói | HM-07 |
| F-10 | Service worker không báo bản mới, cache cũ tồn đọng, nuốt lỗi | HM-08 |
| F-12 | Màn Công cụ nạp sớm ~0,7 MB (pdf-lib + node-forge) | HM-09 |
| F-02 | Cài đặt không tái lập (@testing-library/dom, script kiểm tra) | HM-17 (Q2) |
| R6.1e (khối màu mép bị ép đen) | Góc tối 42,6% → 0,5% ở ảnh NB; 221 ca cũ không hồi quy | HM-11 (một phần, xem TD-29) |
| 13 mục S/V cũ dở dang | Rà soát: 6 xong, 1 hủy, 6 chờ | HM-13 |
| F-03 | (phát hiện SAI — app đã có persistOnce + hiển thị dung lượng) | HM-02 hủy |
| TD-22 (môi trường không kiểm được) | Nay có Playwright + Chromium + kịch bản scripts/playwright/ (V3 khả dụng) | giảm mạnh |

### 0.2 Nợ còn mở / phát sinh
| Mã | Nợ | Mức | Ghi chú / đóng bằng |
| --- | --- | --- | --- |
| TD-26 | Mọi kiểm chứng chạy trên Chromium + localhost/giả lập; chưa Cloudflare thật, Safari, Firefox, máy Android/iPhone thật, AI thật | Cao | HM-14 (UAT máy thật B13) — việc của người dùng |
| TD-27 | Button/Input dùng chung cao hơn 4–8 px trên TOÀN app (HM-05); mới soi hình vài màn + đo tràn ngang | Trung | Xem từng màn (Chỉnh tay, Ký/Vẽ, hộp thoại) trên máy thật; hoàn tác về ZIP P09 nếu chật |
| TD-28 | Giới hạn AI đếm trong bộ nhớ từng bản chạy máy chủ (không bền, không chia sẻ); chung IP chung hạn mức; chưa miễn trừ người đã đăng nhập; con số 60 là lựa chọn của trợ lý; không xác định được IP thì không giới hạn | Trung | Nâng cấp bộ đếm bền (bảng Supabase) nếu cần hạn mức chính xác; chỉnh AI_RATE_LIMIT_PER_HOUR |
| TD-29 | [Q6=a, 13/10: chấp nhận; HM-18 hủy] Cổng R6.1: 5 ca ảnh NB còn trượt (magic, sharp, mono, gray, eco) vì app không dò được mép giấy (quad=null), góc trên-trái là mặt bàn tối; sharp lệch nền 9% có từ trước | Trung | Q6: (a) chấp nhận / (b) HM-18 dò mép cho ảnh tạp chí / (c) nới cổng |
| TD-30 | Service worker theo bản build: chưa thử nâng cấp từ SW cũ thật (/sw.js không query, cache gn-v6) ở trình duyệt; phần chuyển gn-v6-ocr→gn-ocr-v1 chỉ kiểm V2; chưa biết Lovable có đặt BUILD_ID/GITHUB_SHA (mặc định dùng thời điểm build → mỗi bản phát hành hiện toast "Đã có bản mới") | Trung | Thử khi triển khai; đặt BUILD_ID |
| TD-31 | OCR lần đầu cần mạng (không tự lưu gói; Q4=không): mất mạng ngay lần đầu thì báo rõ + nút "Tải sẵn" ở mục Tôi | Thấp | Quyết định chủ dự án; nếu đổi: +~13 MB lõi + dữ liệu ngôn ngữ |
| TD-32 | OCR nền sau khi quét (post-capture.ts) vẫn im lặng khi lỗi; thao tác lưu khi IndexedDB bị chặn vẫn báo lỗi chung | Thấp | Ghi nhận, chưa xử lý |
| TD-33 | Ký số: chưa kiểm ký thật với chứng thư .p12; tải trước ~650 KB nền sau 4 s ở màn Công cụ | Thấp | Kiểm tay; logic ký có pdf-sign.test.ts |
| TD-34 | F-05: mật khẩu liên kết chia sẻ không giới hạn số lần thử | Thấp | Rủi ro thấp (mã 22 ký tự + PBKDF2); làm nếu muốn |
| TD-35 | Lint: 1 lỗi ở tệp tự sinh previewAuthStorage.ts (không sửa) + 10 cảnh báo react-refresh (shadcn/ui, dev-only); 7.518 dòng lệch prettier (không format hàng loạt) | Thấp | npm run lint:src bỏ qua tệp tự sinh |
| TD-36 | Độ nghiêng dòng chữ cấp ô chưa đạt ≤0,5° trên 3 ảnh Q (nửa trên 2,25/1,75/0,75°; nửa dưới 1,25/1,00/1,00°); người dùng chấp nhận (Q5=a) | Thấp | Mở lại nếu máy thật thấy chữ nghiêng; số đo cũ không so trực tiếp được (kịch bản đo cũ không còn) |
| TD-37 | Nhập ảnh từ thư viện không tự chạy dò khung/nắn (phải bấm "Tự dò góc"); đúng theo R4.1 nhưng dễ gây hiểu nhầm | Thấp | Cân nhắc gợi ý trên UI |
| TD-38 | bun.lock sửa tay 1 dòng (workspace devDependency) cho khớp package.json; chưa chạy bun install đầy đủ (registry 403 ngoài Lovable) | Thấp | Lovable sẽ xác nhận khi cài |
| TD-39 | ĐÃ ĐÓNG 13/10/2026: mã đã commit/đẩy lên nhánh claude/read-content-continue-progress-1a7044 (thư mục giayto/ của repo twin30101981-collab/No). Lưu ý: nhánh khác nhánh cũ web-app-upgrade-o0g6az; chưa tạo PR | — | Tạo PR khi người dùng yêu cầu |
| TD-40 | scripts/dong-bo-tien-do.py ghi đè TIEP-THEO.md/LO-TRINH.md; tien-do.json nay có thêm 18 mục HM-xx nên chạy lại script có thể lệch | Thấp | Không chạy khi chưa đọc; ghi chú trong TIEP-THEO.md |
| TD-42 | HM-12 chấm OCR bằng shim CLI dùng tesseract.js 7.0.0 + dữ liệu vie 4.0.0_best_int (sandbox không có tesseract gốc, apt/tải traineddata bị chặn); số đo (app 98,68% vs Cam 98,88%) là tham chiếu cùng động cơ cho cả hai phía | Thấp | Chạy lại so-ocr.py trên máy có tesseract-ocr-vie nếu cần chặt chẽ |
| TD-43 | Chữ chuẩn chỉ 1 trang NB (666 từ); trợ lý chép + tự rà (13/10), chưa người dùng rà; nhãn Cam "Thần kỳ"→magic là suy đoán; cổng R6.1 trên trang NB 2/8 bộ lọc (liên quan TD-29) | Thấp | Thêm trang mẫu khác/người dùng rà chữ chuẩn |
| TD-44 | HM-10 chỉ mở rộng màn Tài liệu (AppShell prop wide, 880 px từ 1024 px); Trang chủ/Công cụ/Tôi và trình soạn thảo toàn màn hình vẫn 430 px; kiểm bằng vite dev + Chromium, chưa bản build/máy thật | Thấp | Mở rộng thêm cần duyệt thiết kế riêng |
| TD-45 | Mã app nằm ở thư mục con giayto/ của repo No (cạnh app cũ ở gốc repo); script kiểm cần chạy từ giayto/app; vite dev trong sandbox cần --host 127.0.0.1 (không có IPv6); playwright python phải khớp bản trình duyệt (1.56.0 cho chromium-1194) | Thấp | Ghi nhận |
| TD-41 | Đề án docx nền (v4) của gói R vẫn thiếu (xem TIEP-THEO R6.5); đề án nâng cấp v1.2 là tài liệu RIÊNG | Thấp | Gửi đề án mới nhất khi làm R6.5 |

### 0.3 Còn chờ người dùng (không có việc nào khác trợ lý làm một mình ngoài HM-10)
Q6 (HM-18) • HM-12 (ảnh CamScanner cùng trang + máy có tesseract tiếng Việt) • HM-14 (máy thật Android/iPhone, AI thật, ảnh 12 MP; gộp V0, S12c, TD-01, TD-15 quyết định chủ dự án) • HM-10 (bố cục màn rộng, tùy chọn) • cho phép đẩy lên GitHub.

---

Quy ước: **Chặn** = phải xử lý trước khi ghi "xong" cho S12c/S13; **Cao/Trung/Thấp** = mức ảnh hưởng nếu để lại. Mỗi mục có cách đóng nợ.

## A. Chưa kiểm chứng (nợ lớn nhất, gốc là môi trường soạn không có bun/mạng/AI/trình duyệt)
| Mã | Nợ | Mức | Đóng bằng |
| --- | --- | --- | --- |
| TD-01 | S12c chưa chạy AI thật (3 lời gọi), chưa kiểm UI Chẩn đoán (xác nhận/Hủy/đổi bộ lọc/ngoại tuyến), chưa soi log máy chủ | Chặn | `bash progress/S12/s12c/chay-s12c.sh` trên máy có bun + Lovable Cloud AI; xem ov_*.jpg bằng mắt |
| ~~TD-02~~ | **ĐÃ ĐÓNG 10/10/2026:** `bunx vitest run` 142 tệp / 538 kiểm thử đạt; `tsgo --noEmit` 0 lỗi; `vite build` OK trên môi trường có bun. (Trước đó: mã S12/S13 chỉ qua bộ chạy thay thế scripts/thay-vitest 39/39.) | ~~Chặn~~ Xong | Cùng lệnh ở TD-01 (bước 0). Ghi số tệp/kiểm thử mới; baseline cũ 108 tệp / 404 |
| ~~TD-03~~ | **ĐÃ ĐÓNG 10/10/2026 (phần kiểm thử):** 6 kiểm thử thành phần cho adjust-editor.tsx đạt (Hủy/Lưu/Hoàn tác/Làm lại/Đặt lại/thanh trượt) — src/components/adjust-editor.test.tsx; hồi quy 143 tệp / 544 đạt, tsgo sạch. **Còn lại:** chạy tay trên trình duyệt/điện thoại thật (tải lại, PDF) gộp vào V13-UAT. | ~~Chặn~~ Xong phần 1 | Playwright 1 tài liệu + máy thật (S14). Kiểm thử thành phần (`@testing-library/react` + jsdom đã có trong devDependencies, chạy được bằng `bunx vitest run` trên máy có bun): ① Hủy khi có thay đổi hỏi xác nhận, không đổi thì đóng thẳng; ② Lưu khi không đổi KHÔNG gọi onApply; ③ Lưu khi đổi gọi onApply đúng 1 lần với bản nháp; ④ Hoàn tác/Làm lại/Đặt lại bật-tắt đúng; ⑤ thanh trượt chỉ ghi lịch sử khi thả tay. Cần mock `@/lib/image`, `confirmDialog`, `CropEditor` và polyfill `ResizeObserver` cho chế độ Xem chữ nhỏ |
| TD-04 | Chế độ "Xem chữ nhỏ" dựng `renderPage` đầy đủ mỗi lần nháp đổi (debounce 300 ms), giữ ảnh dạng data URL trong state; chưa đo RAM/thời gian trên máy yếu | Cao | Đo bằng perf-stats; nếu nặng: dựng theo vùng đang xem hoặc chỉ dựng khi bấm |

## B. Chức năng S13 còn thiếu so với đề án §8.6
| Mã | Nợ | Mức | Ghi chú / hướng làm |
| --- | --- | --- | --- |
| TD-05 | Chưa hiển thị vùng sẽ cắt trước khi Lưu (yêu cầu bắt buộc "không mất chữ/chữ ký/bảng") | Cao | **Đã đo (S13c):** KHÔNG dùng `detectTextLines` làm nguồn hộp – trên 3 ảnh gốc chỉ ra 7–9 dòng (trang thật ~25 dòng), nối sai dòng, thiếu nửa dải hai đầu, dính hình mờ "XIAOMI" và trang kế. **Nên dùng từ OCR**: trang …555 có 233 từ trong khung, 66 hẳn ngoài (bỏ qua), 8 vắt ngang mép (báo) khi thử khung cố ý lẹm 4% (progress/S13/s13c). Phần thuần đã có (`boxFromOcrWord`, `edgeCutCheck`); chưa nối UI |
| TD-06 | Nguồn OCR cho TD-05 chưa sẵn: `recognizeWords` (ocr.ts) trả y âm kiểu PDF theo tâm dòng và không có độ tin cậy; OCR cả ảnh gốc mất ≈ 2,8 s ở 960×1280 (sandbox), chậm hơn ở 4096 px | Cao | Thêm hàm trả hộp điểm ảnh (y xuống) + conf; chạy nền, chỉ khi mở màn Chỉnh tay; thu nhỏ ảnh gốc ≈ 1600 px; hủy khi đóng |
| TD-07 | Hộp chữ ký và bảng chưa có nguồn (OCR không bắt nét ký; `ContentKind` "sign"/"table" chưa ai cấp) | Trung | Dùng `signature-photo.extractInk` cho nét ký; đường kẻ bảng từ `pdf-form`/dò đường – cần thiết kế |
| TD-08 | ĐÃ ĐÓNG P3.2 (xoay khung rotateQuad, không sửa renderGeometry) | Chưa xoay mịn: `renderGeometry` (image.ts) chỉ đúng bội số 90° (hoán đổi rộng/cao theo `r % 180`) | Trung | Cho góc nhỏ ±5° cần sửa renderGeometry (hoặc dùng `deskew-quad`/`line-skew`) rồi mới thêm thanh trượt |
| ~~TD-09~~ | Gợi ý nắn cong + độ tin cậy | Trung | ĐÃ XONG 10/10/2026 (P4): dewarp-suggest.ts + thẻ gợi ý trong Chỉnh tay |
| ~~TD-10~~ | ĐÃ ĐÓNG (R5.1, 11/10/2026): pdf-frame-check.ts kiểm khung PDF khớp xem trước, lệch ≤ 0,5% trên 7 tỉ lệ ảnh; PDF 20 trang Chuẩn 4,6 MB ≤ 5 MB | — | pdf-frame-check.test.ts (14 kiểm thử) |

## C. Thiết kế / nhất quán
| Mã | Nợ | Mức | Ghi chú |
| --- | --- | --- | --- |
| TD-11 | Hai luồng chỉnh song song: FilterPanel/CropEditor/Xoay áp dụng ngay; AdjustEditor chỉ ghi khi Lưu → hành vi khác nhau, người dùng dễ nhầm | Trung | Quyết định S13d: thay hẳn hoặc để AdjustEditor là cửa chính |
| TD-12 | AdjustEditor chỉ áp dụng cho trang hiện tại; FilterPanel có "Áp dụng tất cả" | Thấp | Thêm nếu người dùng cần |
| TD-13 | Không bọc SafeBoundary cho AdjustEditor vì thông điệp hiện tại ("Phần AI gặp sự cố") sai ngữ cảnh | Thấp | Cho SafeBoundary nhận thông điệp tuỳ chọn |
| TD-14 | Thanh trượt giữ giá trị "đang kéo" ở state riêng (`live`); nếu onValueCommit không bắn (kéo ra ngoài) số hiển thị có thể lệch tới lần kéo sau | Thấp | Kiểm trên thiết bị cảm ứng |
| ~~TD-23~~ | **ĐÃ ĐÓNG 10/10/2026:** useBlocker + confirmDialog khi isDirty; kiểm thử thành phần đạt. Trước đó: Nháp chưa lưu mất **im lặng** khi người dùng bấm Back của trình duyệt/Android hoặc đổi tuyến: AdjustEditor là lớp phủ trong route doc.$id, chưa có chặn rời màn. Đúng yêu cầu "rời màn hình không đổi trang đã lưu" nhưng mất công chỉnh | Trung | Thử `useBlocker` của TanStack Router khi `isDirty`, hỏi bằng `confirmDialog`; kiểm trên Android |
| ~~TD-24~~ | **ĐÃ ĐÓNG 10/10/2026:** Slider có aria-labelledby, nút Vừa khung/100% và So sánh/Xem chữ nhỏ có aria-pressed; kiểm thử đạt. Trước đó: Truy cập: nhãn "Độ sáng/Tương phản" là `<label>` không gắn với thanh trượt, Slider chưa có `aria-label`; nút Vừa khung/100% và So sánh/Xem chữ nhỏ chưa có `aria-pressed` | Thấp | Thêm `aria-label`/`aria-pressed`; kiểm bằng đọc màn hình |
| ~~TD-25~~ | **ĐÃ ĐÓNG 10/10/2026:** chuẩn hoá % 360 tại 2 nút Xoay trong doc.$id.tsx. Trước đó: Góc xoay cộng dồn không chuẩn hoá ở nguồn (doc.$id.tsx: `rotation + 90` ở nút Xoay và IconBtn Xoay → 360, 450…). Vô hại vì image.ts, render-cache.ts và edit-session.ts đều chuẩn hoá khi dùng (lỗi liên quan đã sửa ở rà soát S13b lần 2) | Thấp | Chuẩn hoá `% 360` khi ghi + 1 kiểm thử; không bắt buộc |

## D. Chẩn đoán AI (S12) còn mở
| Mã | Nợ | Mức | Ghi chú |
| --- | --- | --- | --- |
| TD-15 | Bốn quyết định chủ dự án (a) ngưỡng báo giả, (b) bốn nhóm lỗi shadow/edge_noise/cut_text/skew so với đề án §8.5 (chữ mờ/nền tối/trang cong/lệch), (c) ảnh > 3 MB chặn hay tự thu nhỏ (S12d), (d) đồng bộ DOCX | Chặn (a); còn lại Trung | Ghi trong TIEP-THEO.md |
| TD-16 | Ảnh lỗi thật `bo-anh-Q/loi/` không có trong zip; S12c chỉ đo BÁO GIẢ trên ảnh đã sạch, chưa đo BỎ SÓT | Cao | Bổ sung ảnh lỗi thật hoặc tạo bộ ảnh lỗi có chủ đích |
| TD-17 | `imageVersion` băm lấy mẫu (≈ 4096 điểm) nên hai ảnh khác rất ít byte có thể trùng khoá | Thấp | Thêm độ dài + băm đầy đủ phần đầu/cuối nếu cần |
| TD-18 | `run_s12c.py` mở trình duyệt mới cho mỗi ảnh; chưa chạy thử thật | Thấp | Theo dõi khi chạy TD-01 |

## E. Tài liệu và công cụ tiến độ
| Mã | Nợ | Mức | Ghi chú |
| --- | --- | --- | --- |
| TD-19 | `tien-do.json`: từ S11p trở đi lưu thành khoá cấp trên cùng (S11p…S13b) chứ không nằm trong mảng `buoc` (42 mục, cuối là S11o). `app-tien-do.html` chỉ đọc `d.buoc` nên **không hiện S11p→S13b**; còn cache `localStorage 'td'` có thể che bản mới. Mẫu `trang_thai` cũng không thống nhất ("đang làm – …" dài) | Trung | Chuẩn hoá: đưa các mục vào `buoc` với `ma/ten/trang_thai/nghiem_thu`, dùng đúng giá trị TT của viewer; ghi chi tiết ở trường riêng |
| TD-20 | DOCX đề án v4.1 chưa đồng bộ trạng thái (cột "Chờ" còn nguyên cho S2…S13) | Trung | Chỉ cập nhật sau khi có bằng chứng G1–G6 |
| ~~TD-21~~ | **ĐÃ ĐÓNG 10/10/2026 (P0.4):** số hồi quy mới 146 tệp / 561 kiểm thử đạt, build OK — đã ghi vào tien-do.json (mục P0) | ~~Thấp~~ Xong | — |
| TD-22 | Môi trường soạn không có bun/Playwright/AI/jsdom nên các phiên soạn không tự kiểm được. **Giảm một phần (07/10):** bộ chạy thay thế đã vào repo (scripts/thay-vitest) nên phiên sau không phải dựng lại; nhưng chỉ phủ kiểm thử thuần, không phủ giao diện | Cao | Có máy hoặc CI chạy `chay-s12c.sh` sau mỗi phiên; hoặc cung cấp node_modules + bun cho môi trường soạn |

## Đã trả (có bằng chứng)
- 07/10/2026, rà soát S13b lần 2 (progress/S13/README-S13.md): ① `resetSession` để sót `paper` khi bản đã lưu chưa từng cắt; ② `editsEqual` coi xoay đủ vòng (360 ≡ 0) là thay đổi. Cả hai sửa ở edit-session.ts, +6 kiểm thử (3 đỏ với mã cũ), bộ chạy thay thế 39/39.

## Quyết định đã ghi nhận
- 07/10/2026 (rà soát S13b lần 2): S13b giữ trạng thái "đã viết, chưa kiểm chứng" – không ghi xong vì chưa chạy trình duyệt/build; rà soát tĩnh chỉ giảm rủi ro, không thay Playwright.
- 07/10/2026 (S13c): không dùng `detectTextLines` làm nguồn hộp nội dung cho cảnh báo cắt; dùng từ OCR, chỉ báo hộp bị cắt **ngang** mép (`edgeCutCheck`), bỏ qua chữ hẳn ngoài khung.
- Cảnh báo cắt chỉ là chỉ báo cho người dùng; không thay việc soi mắt ở 100% (đề án §8.3/§8.7).

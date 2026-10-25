const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,ShadingType,HeadingLevel,AlignmentType,ImageRun,LevelFormat,BorderStyle,PageBreak,Footer,PageNumber,TableOfContents}=require('docx');
const A='/tmp/claude-0/-home-user-Land-gis/2e8cc673-19a4-526d-b340-61c18539555e/scratchpad/audit/';
const TW=9638, F='Times New Roman';
const C={done:'E3F4E8',part:'FFF4D6',no:'FBE3E1',new:'E6EEF9',hd:'1F3A5F'};
const t=(s,o={})=>new TextRun({text:s,font:F,size:o.size||22,bold:o.b,italics:o.i,color:o.color});
const P=(s,o={})=>new Paragraph({spacing:{after:o.after??100,before:o.before||0,line:276},alignment:o.align,children:Array.isArray(s)?s:[t(s,o)]});
const H1=s=>new Paragraph({heading:HeadingLevel.HEADING_1,spacing:{before:300,after:140},children:[new TextRun({text:s,font:F,size:30,bold:true,color:C.hd})]});
const H2=s=>new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:220,after:100},children:[new TextRun({text:s,font:F,size:26,bold:true,color:C.hd})]});
const B=(s,l=0)=>new Paragraph({numbering:{reference:'b',level:l},spacing:{after:60,line:276},children:Array.isArray(s)?s:[t(s)]});
const rich=s=>{const out=[];s.split(/(\*\*[^*]+\*\*)/).forEach(x=>{if(!x)return;if(x.startsWith('**'))out.push(t(x.slice(2,-2),{b:true}));else out.push(t(x))});return out};
const border={style:BorderStyle.SINGLE,size:4,color:'A0A8B4'};const borders={top:border,bottom:border,left:border,right:border};
function cellP(text,o){return String(text).split('\n').map(line=>new Paragraph({spacing:{after:30},children:line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(x=>x.startsWith('**')?t(x.slice(2,-2),{b:true,size:19,color:o&&o.color}):t(x,{size:19,b:o&&o.b,color:o&&o.color}))}));}
function table(cols,rows){const ws=cols.map(c=>c[1]);const sum=ws.reduce((a,b)=>a+b,0);
 const mk=(v,w,fill,o)=>new TableCell({borders,width:{size:w,type:WidthType.DXA},shading:fill?{fill,type:ShadingType.CLEAR,color:'auto'}:undefined,margins:{top:50,bottom:50,left:90,right:90},children:cellP(v,o)});
 const hdr=new TableRow({tableHeader:true,children:cols.map(([h,w])=>mk(h,w,C.hd,{b:true,color:'FFFFFF'}))});
 const body=rows.map(r=>new TableRow({children:r.map((v,i)=>mk(v,ws[i],r._fill))}));
 return new Table({width:{size:sum,type:WidthType.DXA},columnWidths:ws,rows:[hdr,...body]});}
const row=(fill,...cells)=>{const r=cells;r._fill=fill;return r};
const img=(f,w,h)=>new Paragraph({keepNext:true,alignment:AlignmentType.CENTER,spacing:{after:60},children:[new ImageRun({type:'png',data:fs.readFileSync(A+f),transformation:{width:w,height:h}})]});
const cap=s=>P([t(s,{i:true,size:19})],{align:AlignmentType.CENTER,after:160});
const ST={X:'Đã xong',M:'Một phần',K:'Chưa làm',Q:'Theo quyết định',N:'Mới phát hiện'};

const ch=[];
// ===== Bìa
ch.push(new Paragraph({spacing:{before:1800,after:200},alignment:AlignmentType.CENTER,children:[t('BÁO CÁO RÀ SOÁT ĐỀ ÁN',{b:true,size:40,color:C.hd})]}));
ch.push(P([t('NÂNG CẤP QUẢN LÝ TÍN DỤNG PRO (QLTD PRO)',{b:true,size:30})],{align:AlignmentType.CENTER,after:300}));
ch.push(P([t('Đối chiếu Đề án v1.0 (21/10/2026) với bản phát hành P05 — các hạng mục chưa thực hiện, thực hiện một phần, và các điểm mới phát hiện; trọng tâm Mục 8 trở đi (giao diện, bố cục mới)',{i:true,size:24})],{align:AlignmentType.CENTER,after:600}));
ch.push(table([['Mục',2600],['Nội dung',7038]],[
 ['Bản app rà soát','QLTD_PRO_v2026-10-23_v22.3-P05.html (5,76 MB)\nSHA-256 6c64da5e…24cb'],
 ['Căn cứ','Đề án DE_AN_QLTDPRO_v1.0 (mục 1–15, phụ lục A); handover/backlog.json; evidence/*_result.md (P01–P05)'],
 ['Cách kiểm','Đọc lại toàn văn đề án; đối chiếu tiêu chí nghiệm thu từng hạng mục; ĐO TRỰC TIẾP app P05 bằng Playwright + Chromium ở 1920×1080, 1600×900, 1366×768, 390×844 trên dữ liệu mẫu ẩn danh (tests/fixtures); kết quả kiểm thử hồi quy P05 (22/22 nhóm, 17 đột biến) và hồi quy dữ liệu thật'],
 ['Ngày lập','23/10/2026 — cập nhật lần 2 sau khi anh/chị phê duyệt toàn bộ: đã làm thêm dải biểu tượng 64 px, thẻ KPI + lưới 2 cột, KPI 2×2 + topbar một hàng trên điện thoại, ngăn chi tiết 380 px, nhóm menu thu/mở, tabular-nums, hoàn tác lần nhập, bẫy bàn phím hộp thoại, escape tên mốc lưu trữ'],
 ['Quy ước trạng thái','Đã xong · Một phần · Chưa làm · Theo quyết định (không làm/đổi hướng theo quyết định của anh/chị) · Mới phát hiện (lỗi/thiếu sót phát hiện khi rà soát lần này)'],
]));
ch.push(P([t('Ảnh chụp trong báo cáo dùng dữ liệu mẫu ẩn danh ("Khách hàng NNN"), không chứa dữ liệu khách hàng thật.',{i:true,size:20})],{before:200}));
ch.push(new Paragraph({children:[new PageBreak()]}));

// ===== 1 Tóm tắt
ch.push(H1('1. Tóm tắt'));
ch.push(P('Đề án gồm 28 hạng mục (HM-01…HM-28) chia 5 đợt, cộng các hạng mục con phát sinh (HM-09b, 11b, 13b, 16b, 16c, 17b, 28b, P05-CSS). Sau 5 phiên:'));
ch.push(B(rich('**Đợt 1 (ổn định dữ liệu) và Đợt 2 (đồng nhất số liệu): cơ bản xong.** Còn sót phần nhỏ: gom 9 hàm định dạng fmt*, giá NQ38 cho 54 khoá trùng (thiếu Phụ lục I), quy đổi ngoại tệ TSBĐ.')));
ch.push(B(rich('**Đợt 3 (giao diện & điều hướng): đã xong phần "sửa" và PHẦN LỚN "khung giao diện mới" của Mục 8.1** (sau khi anh/chị phê duyệt): dải biểu tượng 64 px, breadcrumb, thẻ KPI + xu hướng, lưới 2 cột Bảng điều khiển, ngăn chi tiết 380 px, tabular-nums, KPI 2×2 + topbar 1 hàng trên điện thoại, nhóm menu thu/mở. Còn: lưới cho các trang khác, bảng → thẻ thật trên điện thoại, ghim cột KH mặc định.')));
ch.push(B(rich('**Đợt 4 (kiến trúc): giai đoạn A xong (src/ + build + kiểm thử); giai đoạn B (module hoá, gỡ ~320 lớp vá) dừng theo quyết định P05.**')));
ch.push(B(rich('**Đợt 5 (tính năng mới): 6/6 hạng mục đã có và đạt V3**, mỗi mục còn phần mở rộng chưa làm (xem Mục 4.6).')));
ch.push(B(rich('**Rà soát lần này phát hiện 7 điểm mới (Mục 3); 4 điểm đã được sửa ngay trong ngày** (3.1 tràn ngang 1920 do menu cố định — nặng nhất; 3.2 nút ↶/↷ đè nút Lưu; 3.4 nút riêng trên topbar trang Dư nợ; 3.7 rà escape dữ liệu nhập) cùng breadcrumb "Nhóm › Trang". Còn lại 3 điểm cần anh/chị duyệt giao diện (3.3, 3.5, 3.6).')));
ch.push(P('Thống kê theo tiêu chí nghiệm thu từng hạng mục (28 hạng mục gốc):',{before:120}));
ch.push(table([['Trạng thái',3200],['Số HM',1300],['Hạng mục',5138]],[
 row(C.done,'Đạt đủ tiêu chí','21','HM-01…05, 07, 08, 09, 10, 12, 13, 14, 15, 16, 19, 22, 23, 24, 25, 26, 28'),
 row(C.part,'Một phần','5','HM-06 (fmt*), HM-11 (54 khoá NQ38), HM-17 (tràn ở 1920 — hồi quy P05; "Tất cả" chậm), HM-18 (observer/interval), HM-20 (giai đoạn B)'),
 row(C.part,'Đạt nhưng còn mở rộng','1','HM-27 (thiếu SRI 3 thư viện; chưa thử AI/máy chủ cập nhật thật)'),
 row(C.no,'Dừng theo quyết định','1','HM-21 (module hoá, gỡ lớp vá)'),
]));

// ===== 2 bảng tổng hợp
ch.push(H1('2. Trạng thái 28 hạng mục theo lộ trình (Mục 9 đề án)'));
const hm=[
['HM-01','SheetJS nhúng hỏng','X','—'],
['HM-02','Bộ đọc .xlsx không biến số thành ngày','X','Chưa thử trên Edge/Windows thật.'],
['HM-03','Chặn ghi đè lãi suất khi khởi động','X','Dữ liệu cũ đã lưu với LS 19% không tự sửa — phải nhập lại tệp gốc.'],
['HM-04','Lưu trữ toàn vẹn, sao lưu đủ','X','TWIN_Archive_v1 chưa có checksum.'],
['HM-05','Gỡ dữ liệu cứng/PII','X','DATA.macb (danh mục cán bộ) vẫn giữ — chờ quyết định giữ/bỏ.'],
['HM-06','TD.num / TD.date dùng chung','M','Chưa gom 9 hàm fmt*; vài đoạn còn regex ngày riêng.'],
['HM-07','"Ngày dữ liệu" là nguồn sự thật','X','—'],
['HM-08','Engine KPI (lõi + Dashboard)','X','Bảng theo CBTD vẫn 8 cột cố định (không có cột "Khác").'],
['HM-09/09b','KPI phần 2 + TDCMP/TDUP5/TD_AUDIT','X','Trang KHKD không khôi phục; mã mồ côi đã gỡ (P05).'],
['HM-10','Đối soát TSBĐ','X','Chưa quy đổi USD/EUR; apprno trống nên không nối TS → hợp đồng; TS bên thứ ba ghép theo tên chưa làm.'],
['HM-11/11b','Giá đất: khoá, lỗi dữ liệu, nối HSVV; nhập PL02','M','54 khoá NQ38 trùng chưa bổ sung giá theo tên đường (cần Phụ lục I NQ38).'],
['HM-12','Trang Đối soát số liệu','X','Chưa đối soát TDCMP/TDUP5/Lịch trả nợ; biên bản chỉ .txt, ô "người lập" trống.'],
['HM-13/13b','Một router + một showPage','X','—'],
['HM-14','Cây menu 6 nhóm','X','Menu cao 1.454 px > màn 1080 px — phải cuộn (xem 3.5).'],
['HM-15','Topbar gọn, Ctrl K, 1 bộ phím tắt','X','Đã sửa nút ↶/↷ đè nút Lưu và 2 nút riêng của trang Dư nợ (3.2, 3.4).'],
['HM-16/16b/16c','Token, z-index, toast, tab; gỡ chế độ tối','X','Chế độ tối đã GỠ theo quyết định (đề án đề xuất "tuỳ chọn, mặc định tắt").'],
['HM-17/17b','Hệ bảng cho màn rộng','M','Đã sửa tràn ở 1920 (3.1). Còn: "Tất cả" 3.848 dòng dựng 2,5–6 s; chưa ghim cột cho Chuyển HM/TSBĐ/Giá đất; bảng Chuyển HM/TSBĐ/Giá đất mặc định "Đầy đủ" (quyết định P04b) nên cuộn ngang trong khung ở zoom 125% (xem 5.2).'],
['HM-18','Hiệu năng: observer, interval','M','Còn 8 MutationObserver và 12 setInterval; Dashboard ~500–600 ms layout.'],
['HM-19','Giao diện điện thoại','X','Bảng chưa chuyển thành thẻ; Đến hạn/Lãi đọng/TSBĐ/Giá đất vẫn cuộn ngang; chưa thử máy thật/Safari iOS.'],
['HM-20','Tách src/ + build','M','Giai đoạn A xong; giai đoạn B = HM-21.'],
['HM-21','Module hoá, gỡ lớp vá','Q','Dừng theo quyết định P05 (còn ~320 gán window.X, 78 khối script).'],
['HM-22','Bộ kiểm thử hồi quy','X','e2e 65, 17 đột biến, CI GitHub.'],
['HM-23','Trung tâm nhập dữ liệu','X','Nhận dạng theo TÊN tệp (không đọc tiêu đề cột); không có bước xem trước/loại dòng khi nhập hàng loạt.'],
['HM-24','Xu hướng nhiều kỳ','X','Trục thời gian chia đều theo thứ tự mốc, không theo khoảng ngày thật.'],
['HM-25','Cảnh báo sớm','X','Ngưỡng cố định trong mã (LS 4–13%, định giá >36 tháng) — chưa có màn hình chỉnh ngưỡng.'],
['HM-26','Khách hàng 360°','X','Không có ngăn chi tiết khoản vay; không có mục Giá đất theo KH; tab Hồ sơ vay chỉ báo "chưa liên kết".'],
['HM-27','Chế độ có mạng','M','Thiếu SRI SheetJS/docxtemplater/mammoth; chưa thử khoá AI và máy chủ cập nhật thật.'],
['HM-28/28b','Báo cáo Word/Excel chuẩn','X','Chưa có mẫu .docx chuẩn của cơ quan (cần anh/chị gửi).'],
];
const fillOf={X:C.done,M:C.part,K:C.no,Q:C.no};
ch.push(table([['Mã',1150],['Hạng mục',2900],['Trạng thái',1250],['Còn thiếu / ghi chú',4338]],hm.map(r=>row(fillOf[r[2]],r[0],r[1],ST[r[2]],r[3]))));

// ===== 3 Mới phát hiện
ch.push(H1('3. Điểm mới phát hiện khi rà soát (chưa có trong backlog)'));
ch.push(P('Đo trên app P05, dữ liệu mẫu ẩn danh, Playwright + Chromium.'));
ch.push(table([['#',500],['Phát hiện',3700],['Bằng chứng đo',2700],['Đề xuất xử lý',2738]],[
 row(C.done,'3.1','**[ĐÃ SỬA] Hồi quy P05 — bảng Dư nợ tràn ngang ở 1920×1080.** Mẫu cột "Gọn 1920" (16 cột) được thiết kế cho bề ngang trước khi có menu bên cố định.','1920: khung bảng 1.590 px, bảng 1.646 px; cột NHÓM bị cắt (Hình 1). 1600: mẫu tự chọn 10 cột — vừa. 1366: vừa.','ĐÃ SỬA: mẫu cột mặc định tự lùi Gọn 1920 → Gọn 1600 (mẫu mới) → Gọn 1366 cho tới khi bảng vừa khung; e2e ở 1920 và 1600 + đột biến. Sau sửa: 1920 → 13 cột, 1.590/1.590 px, không tràn.'),
 row(C.done,'3.2','**[ĐÃ SỬA] Nút Hoàn tác/Làm lại (↶ ↷) đè lên topbar** — che một phần nút "Lưu" và "Tìm / lệnh".','elementFromPoint tại tâm nút Lưu trả về #dp-undo-btn (1920 px). Có từ trước P05.','ĐÃ SỬA: ↶/↷ nằm trong .topbar-right; e2e ở 1920 (không phần tử topbar bị che) + đột biến.'),
 row(C.done,'3.3','**[ĐÃ SỬA] Bảng điều khiển dùng ít bề ngang ở màn rộng.** Bảng I–V rộng tối đa ~1.100 px trong vùng 1.668 px; nửa phải trống.','1920: tblMaxW = 1.103 px / dashW = 1.668 px (Hình 2). Đề án Hình 2 nêu đúng vấn đề này ("bảng chỉ dùng ~40% bề ngang").','ĐÃ SỬA: lưới 2 cột ở ≥1600 px (Bảng I | Bảng II), thẻ KPI đầu trang; Bảng III–VIII giữ toàn bề ngang (bảng rộng).'),
 row(C.done,'3.4','**[ĐÃ SỬA] Topbar không nhất quán giữa các trang.** Trang Dư nợ thêm "Xuất CSV", "Thêm mới" ngay trên topbar (8 nút), trái với HM-15 (6 nút).','qltd_1920: 8 nút trên topbar.','ĐÃ SỬA: Xuất CSV/Thêm mới chuyển xuống thanh công cụ của trang (Dư nợ/NH/TD/Đến hạn/Chuyển HM); topbar còn 7 nút kể cả ↶↷.'),
 row(C.done,'3.5','**[ĐÃ SỬA] Menu bên cao 1.454 px**, vượt màn 1080/900/768 — phải cuộn mới thấy nhóm Nghiệp vụ/Hệ thống.','sidebar scrollHeight = 1.454 px (1920/1366).','ĐÃ SỬA: nhóm thu/mở (mặc định thu NGHIỆP VỤ + HỆ THỐNG → ~1.215 px), mục thấp hơn khi màn <1000 px cao; dải biểu tượng ở 1280–1439 px không cần cuộn.'),
 row(C.done,'3.6','**[ĐÃ SỬA] Điện thoại: topbar 2 hàng (94 px); Bảng điều khiển hiện bảng rộng cuộn ngang, không có KPI 2×2** như mockup Hình 12.','390: topbarH = 94 px; Bảng I cắt cột (Hình 3).','ĐÃ SỬA: topbar 1 hàng 58 px (chỉ biểu tượng), thẻ KPI 2×2 trước các bảng (e2e). Bảng vẫn rộng nhưng bấm dòng mở ngăn chi tiết.'),
 row(C.part,'3.7','**[ĐÃ XỬ LÝ MỘT PHẦN] Bảo mật: 326 chỗ gán innerHTML** chưa được rà; đề án mục 7.5 nêu rủi ro chèn mã [GT] nhưng không có hạng mục xử lý.','grep src/js: 326 "innerHTML".','ĐÃ LÀM: tiêm chuỗi <img onerror> vào 10 cột chữ của dư nợ, mở 14 trang + KH 360° ⇒ 0 lần thực thi; escape 4 chỗ còn sót (nhãn mốc, tên CBTD, nhãn phòng); e2e bảo mật + đột biến. CÒN: rà tĩnh các mẫu HTML nhiều dòng; dữ liệu ngoài dư nợ (TSBĐ, ghi chú KH, hồ sơ vay).'),
]));
ch.push(img('qltd_1920.png',600,338));ch.push(cap('Hình 1. Trang Dư nợ 1920×1080, mẫu "Gọn 1920": cột NHÓM bị cắt ở mép phải (hồi quy P05)'));
ch.push(img('qltd_1920_after.png',600,338));ch.push(cap('Hình 1b. Sau sửa: cùng trang, mẫu tự lùi sang "Gọn 1600" — bảng vừa khung (1.590/1.590 px), breadcrumb trên topbar, ↶/↷ trong topbar, Xuất CSV/Thêm mới ở thanh công cụ'));

// ===== 4 Muc 8
ch.push(H1('4. Rà soát chi tiết Mục 8 — đề xuất nâng cấp, giao diện, bố cục mới'));
ch.push(H2('4.1. Mục 8.1 — Khung giao diện mới cho desktop'));
ch.push(P('Đề án đề xuất 4 nhóm thay đổi khung giao diện. Đối chiếu từng điểm với app P05 (số đo ở cột giữa):'));
ch.push(table([['Đề xuất trong đề án',2900],['Hiện trạng P05 (đo)',3300],['Trạng thái',1200],['Còn phải làm',2238]],[
 row(C.part,'Topbar 52 px','58 px ở máy tính; 94 px (2 hàng) ở 390 px; ↶/↷ đã nằm trong topbar','Một phần','Giảm còn 52 px; 1 hàng trên điện thoại'),
 row(C.done,'Logo + đường dẫn trang (breadcrumb)','ĐÃ LÀM: dòng nhỏ dưới tên trang "DƯ NỢ & THEO DÕI › DƯ NỢ" (lấy từ cây menu; ẩn trên điện thoại)','Đã xong','—'),
 row(C.done,'Ô tìm kiếm / bảng lệnh (Ctrl K)','Nút "Tìm / lệnh Ctrl K" mở bảng lệnh (HM-15) — là nút, không phải ô nhập','Đã xong (dạng nút)','Tuỳ chọn: đổi thành ô nhập giả'),
 row(C.done,'Chip "Ngày dữ liệu"','Có (📅 Dữ liệu dd/mm/yyyy, bấm đổi Dữ liệu ↔ Hôm nay)','Đã xong','—'),
 row(C.done,'Trạng thái lưu','Có ("✅ Lưu hh:mm:ss")','Đã xong','—'),
 row(C.done,'Nút Nhập dữ liệu','Có ("📂 Nhập IPCAS"); Trung tâm nhập ở menu','Đã xong','Cân nhắc trỏ nút về Trung tâm nhập (nhiều tệp)'),
 row(C.done,'Menu ⋯','Có ("⋯ Tiện ích", 8 nút cũ chuyển vào)','Đã xong','—'),
 row(C.done,'Sidebar 6 nhóm, luôn mở ở ≥1600 px','6 nhóm, 25 mục; luôn mở ở ≥1440 px (P05, theo quyết định)','Đã xong (ngưỡng 1440)','—'),
 row(C.done,'Thu thành dải biểu tượng 64 px ở 1280–1599 px','ĐÃ LÀM: 1280–1439 px = dải 64 px (tooltip mọi mục, chấm số nhỏ); <1280 px = ngăn kéo ☰; bảng Gọn tự lùi nếu vẫn tràn','Đã xong','—'),
 row(C.done,'Thanh 5 mục ở dưới trên điện thoại','Có: Tổng quan · Dư nợ · Đến hạn · Tài sản · Menu (HM-19)','Đã xong','—'),
 row(C.part,'Vùng nội dung lưới 12 cột','ĐÃ LÀM cho Bảng điều khiển: lưới 2 cột ở ≥1600 px (Bảng I | Bảng II), thẻ KPI tự co (auto-fit) 5→2×2','Một phần','Lưới cho các trang khác (KH 360°, Đến hạn…) — chưa'),
 row(C.done,'Ngăn chi tiết 380 px bên phải khi chọn một dòng (1920) / lớp phủ (1366)','ĐÃ LÀM: bấm dòng Dư nợ/NH/TD/Đến hạn/Lãi đọng/Chuyển HM/Giải ngân/Trả nợ → ngăn 380 px (lớp phủ) liệt kê MỌI cột (kể cả cột đang ẩn), nút KH 360° và Sửa; Esc đóng','Đã xong','Ngăn "đẩy" nội dung (hiện là lớp phủ); TSBĐ chưa gắn'),
 row(C.done,'Một bộ token màu – chữ – khoảng cách','Một khối :root, z-index ≤8 bậc, 1 hệ toast, tab ≤2 kiểu (HM-16b/16c)','Đã xong','—'),
 row(C.done,'Phông Inter + số dạng tabular','Be Vietnam Pro (thống nhất — HM-16); ĐÃ BẬT tabular-nums cho mọi ô bảng và thẻ KPI','Đã xong','—'),
 row(C.no,'Chế độ tối tuỳ chọn, mặc định tắt','Đã GỠ hẳn (HM-16c, theo quyết định)','Theo quyết định','Nếu cần lại: làm trên bộ token mới'),
]));
ch.push(img('dash_1920.png',600,338));ch.push(cap('Hình 2. Bảng điều khiển 1920×1080 (P05): menu bên cố định, dải đối soát + cảnh báo; bảng chỉ dùng ~2/3 bề ngang, chưa có thẻ KPI/xu hướng'));

ch.push(H2('4.2. Các mockup giao diện (Hình 9–17 của đề án)'));
ch.push(table([['Mockup',2300],['Thành phần trong mockup',2700],['Hiện trạng P05',2900],['Còn thiếu',1738]],[
 row(C.part,'H.9 Lưới bố cục theo 3 nhóm màn hình','≥1600 / 1280–1599 / điện thoại','≥1440 menu cố định; <1440 ngăn kéo; ≤768 điện thoại','Bậc 1280–1439 (dải biểu tượng); lưới 12 cột'),
 row(C.done,'H.10 Bảng điều khiển 1920','Chip ngày · dải đối soát · thẻ KPI · xu hướng · cảnh báo sớm','ĐÃ XONG: 5 thẻ KPI (Tổng dư nợ + so kỳ trước, KH, Nhóm 2–5, Quá hạn, đường xu hướng thu nhỏ — bấm mở trang liên quan); Bảng I|II cạnh nhau','Biểu đồ xu hướng chỉ hiện khi có ≥2 mốc đã lưu'),
 row(C.part,'H.11 Dư nợ 1366','Sidebar thu gọn · mẫu cột "Gọn 1366" · cột KH ghim trái · dòng tổng theo bộ lọc','ĐÃ LÀM: dải biểu tượng 64 px; mẫu cột (Đầy đủ/Gọn 1920/Gọn 1600/Gọn 1366/Điện thoại) tự lùi; dòng tổng có; ghim là tuỳ chọn, mặc định TẮT (MỘT PHẦN)','Bật ghim cột Tên KH mặc định (chưa — chờ ý kiến)'),
 row(C.part,'H.12 Điện thoại 390','KPI 2×2 · việc cần xử lý · thanh điều hướng dưới','ĐÃ LÀM: KPI 2×2, topbar 1 hàng (58 px), thanh dưới 5 mục, nhắc nợ gấp; bấm dòng bảng → ngăn chi tiết toàn bề ngang thay cho "thẻ" (MỘT PHẦN)','Chưa đổi các bảng thành thẻ thật; "việc cần xử lý" dùng dải cảnh báo'),
 row(C.done,'H.13 Trang Đối soát số liệu','App · tệp gốc · chênh lệch · trạng thái; dải trên Dashboard; biên bản','10 chỉ tiêu, dải trạng thái, biên bản .txt','Biên bản Word/PDF; thêm chỉ tiêu Lịch trả nợ/TDCMP'),
 row(C.part,'H.14 Trung tâm nhập dữ liệu','Kéo thả nhiều tệp · tự nhận loại & ngày · kiểm tra quy tắc · so kỳ trước · lưu mốc để hoàn tác · nhật ký','Kéo thả nhiều tệp, nhận theo TÊN tệp, xếp theo ngày, nhật ký nhập + xuất CSV, cảnh báo chất lượng','Nhận dạng theo tiêu đề cột; bước "Kiểm tra & đối soát" xem trước từng tệp, cho loại dòng; nút hoàn tác lần nhập'),
 row(C.done,'H.15 TSBĐ','KPI sau lọc · ghép theo KH · cảnh báo tỷ lệ thấp / định giá cũ / chưa có TS','Có đủ (HM-10, HM-25)','Quy đổi ngoại tệ; nối TS → hợp đồng'),
 row(C.part,'H.16 Giá đất','Chọn đoạn đường có tên đường · hệ số PL01 · kết quả theo diện tích · đưa sang hồ sơ vay','Có hệ số, kết quả theo diện tích, nút đưa G0 sang HSVV; nhập PL02 .docx mới','54 khoá NQ38 trùng chưa có giá theo tên đường (thiếu Phụ lục I)'),
 row(C.part,'H.17 Khách hàng 360°','Khoản vay · TSBĐ · lịch sử 11 kỳ · ngăn chi tiết khoản vay','Thẻ KPI 4 ô + 5 tab; chi tiết từng dòng dùng ngăn chi tiết chung từ trang Dư nợ','Ngăn chi tiết ngay trong KH 360° (hiện chỉ mở từ bảng); Giá đất theo KH; bảng tab hẹp (Hình 4)'),
]));
ch.push(img('fin/dash_1920.png',600,338));ch.push(cap('Hình 2b. SAU PHÊ DUYỆT: Bảng điều khiển 1920×1080 — thẻ KPI đầu trang, Bảng I | Bảng II cạnh nhau, breadcrumb, menu có nhóm thu/mở'));
ch.push(img('fin/dash_1366.png',600,338));ch.push(cap('Hình 2c. SAU PHÊ DUYỆT: 1366×768 — dải biểu tượng 64 px'));
ch.push(img('fin/dash_390.png',230,497));ch.push(cap('Hình 3. SAU PHÊ DUYỆT: điện thoại 390×844 — topbar 1 hàng, KPI 2×2, thanh điều hướng dưới (trước: topbar 2 hàng 94 px, không có KPI)'));
ch.push(img('kh360_1920.png',560,315));ch.push(cap('Hình 4. Khách hàng 360° 1920×1080 (P05): thẻ KPI + tab; chưa có ngăn chi tiết, bảng hẹp'));

ch.push(H2('4.3. Mục 8.2 — Cần sửa: dữ liệu và số liệu'));
ch.push(table([['Đề xuất',3300],['Trạng thái',1300],['Phần còn lại',5038]],[
 row(C.done,'Bộ đọc thống nhất .xlsx/.xls/.csv, từ điển 87 cột','Đã xong','Chưa thử Edge/Windows thật'),
 row(C.done,'Lớp "sửa tay" lãi suất; gỡ bảng lãi suất cứng','Đã xong','Dữ liệu cũ lưu với LS 19% phải nhập lại'),
 row(C.part,'Kho dữ liệu có phiên bản, một giao dịch, kiểm số dòng, sao lưu có checksum','Một phần','TWIN_Archive_v1 chưa có checksum'),
 row(C.part,'Gỡ seed/PII; dữ liệu mẫu ẩn danh; nút xoá dữ liệu cục bộ','Một phần','DATA.macb còn giữ (chờ quyết định); "dữ liệu mẫu ẩn danh để demo" trong app chưa có (chỉ có fixture kiểm thử)'),
 row(C.part,'TD.num / TD.date dùng chung','Một phần','Gom 9 hàm fmt*'),
 row(C.done,'"Ngày dữ liệu" cho đến hạn/quá hạn/mốc','Đã xong','—'),
 row(C.done,'TD.metrics: một engine KPI, KH theo mã, dòng "Chưa phân CBTD"','Đã xong','Bảng CBTD chưa có cột "Khác"'),
 row(C.part,'TSBĐ: lọc trạng thái/hiệu lực/tiền tệ, khử trùng, ghép theo KH','Một phần','Ngoại tệ tách riêng nhưng chưa quy đổi (thiếu tỷ giá)'),
 row(C.part,'Giá đất: khoá có tên đường, trang lỗi bảng giá, nối HSVV','Một phần','54 khoá trùng (cần Phụ lục I NQ38)'),
]));
ch.push(H2('4.4. Mục 8.3–8.5 — Đối soát, Trung tâm nhập, TSBĐ & Giá đất'));
ch.push(B(rich('**Đối soát (8.3):** đã có 10 chỉ tiêu, dải trạng thái, biên bản. Chưa: biên bản Word/PDF có người lập; chỉ tiêu cho TDCMP, TDUP5, Lịch trả nợ.')));
ch.push(B(rich('**Trung tâm nhập (8.4):** chưa có: nhận loại tệp theo nội dung (tiêu đề cột) thay vì tên tệp; bước xem trước "Kiểm tra & đối soát" từng tệp trước khi ghi; loại dòng lỗi; hoàn tác cả lần nhập từ một nút.')));
ch.push(B(rich('**TSBĐ (8.5):** chưa quy đổi USD/EUR; chưa nối tài sản với hợp đồng (apprno gần như trống trong sao kê); 7 KH chưa có TS theo mã KH có thể có TS đứng tên bên thứ ba — chưa ghép.')));
ch.push(B(rich('**Giá đất (8.5):** 54 khoá NQ38 dùng chung giữa nhiều đường vẫn chưa tách giá (OCR NQ38 cho thấy tệp chỉ có nghị quyết + quy định chung, không có Phụ lục I).')));
ch.push(H2('4.5. Mục 8.6 — Ý tưởng tính năng mới (đều đã làm, còn mở rộng)'));
ch.push(table([['Tính năng',2200],['Đã có',3300],['Chưa có / mở rộng',4138]],[
 row(C.done,'Khách hàng 360°','Trang riêng, thẻ KPI, 5 tab, ghi chú theo mã KH, Ctrl K mở thẳng','Ngăn chi tiết khoản vay; Giá đất theo KH; liên kết hồ sơ vay thật'),
 row(C.done,'Cảnh báo sớm','9 mục, theo ngày dữ liệu, dải trên Dashboard','Màn hình chỉnh ngưỡng (đang cố định trong mã); gửi danh sách theo CBTD'),
 row(C.done,'Xu hướng nhiều kỳ','Trang Xu hướng (SVG), chia theo Tổng/Nhóm/Phòng/CBTD/Loại vay, CSV','Trục thời gian theo ngày thật; biểu đồ thu nhỏ trên Dashboard'),
 row(C.part,'Chế độ có mạng','CSP chặn mạng mặc định; kiểm tra bản mới; thư viện dự phòng có SRI (docx, JSZip, PizZip); AI có xem trước + đồng ý','SRI cho SheetJS 0.20.3, docxtemplater, mammoth; thử khoá AI thật; dịch vụ cập nhật thật'),
 row(C.done,'Mẫu báo cáo chuẩn Word/Excel','Word (.docx) chọn kỳ; Excel có định dạng (TD.xlsx)','Mẫu .docx chuẩn của cơ quan (cần anh/chị gửi)'),
]));
ch.push(H2('4.6. Mục 8.7 — Cây thư mục mã nguồn'));
ch.push(P('Giai đoạn A xong: src/ (4 CSS, 78 khối script, 7 thư viện), tools/build|check-vendor|scan-pii|css-dedupe, build ra đúng tệp phát hành (SHA-256). Giai đoạn B (chia module theo cây đề xuất, gỡ ~320 lớp vá window.X, giảm ≥50% khối script — tiêu chí HM-21) dừng theo quyết định P05. Hệ quả: mã vẫn là các khối script toàn cục; thêm tính năng giao diện lớn (lưới 12 cột, ngăn chi tiết) sẽ tốn công hơn và rủi ro hơn.'));

// ===== 5 Muc 9-15
ch.push(H1('5. Rà soát Mục 9–15'));
ch.push(H2('5.1. Mục 9 — Mốc nghiệm thu từng đợt'));
ch.push(table([['Mốc',2000],['Cam kết trong đề án',3500],['Đánh giá P05',4138]],[
 row(C.done,'M1 – Số liệu đúng','Nhập .xls/.xlsx; LS đúng; không mất dữ liệu; không còn dữ liệu cứng/PII','Đạt'),
 row(C.done,'M2 – Báo cáo khớp','Mọi màn hình cùng số; trang Đối soát; đến hạn theo ngày dữ liệu','Đạt (real12: 10/10 khớp trên dữ liệu thật 20/10)'),
 row(C.part,'M3 – Giao diện mới','Menu 6 nhóm; F5/Back; bảng vừa 1366/1920; điện thoại dùng được','Menu, F5/Back, bảng Dư nợ vừa 1366/1920 (đã sửa 3.1), điện thoại: đạt. Khung giao diện 8.1 mới làm một phần.'),
 row(C.part,'M4 – Kiến trúc mới','Mã nguồn module + build + kiểm thử; phát hành 1 tệp','Build + kiểm thử + 1 tệp: đạt; "mã nguồn module": dừng theo quyết định'),
 row(C.done,'M5 – Tính năng mới','Theo từng mục được duyệt','6/6 mục đạt V3'),
]));
ch.push(H2('5.2. Mục 10 — Chiến lược kiểm chứng: phần chưa làm'));
ch.push(B(rich('**Zoom 125% — ĐÃ ĐO** (1366→1.093 px, 1600→1.280 px, 1920→1.536 px; 20 trang): KHÔNG trang nào cuộn ngang, topbar vẫn 58 px. Bảng Dư nợ/KD/TD/Đến hạn/Lãi đọng vừa khung ở 1.280–1.536 px; ở 1.093 px bảng cuộn trong khung (bình thường). Các bảng Chuyển HM, Trả nợ, TSBĐ, Giá đất, Đối soát, KH mới cuộn ngang TRONG khung ở mọi cỡ zoom vì mặc định "Đầy đủ" (quyết định P04b) — nếu muốn mặc định gọn như bảng Dư nợ cần anh/chị quyết định.')));
ch.push(B(rich('**Bàn phím — ĐÃ ĐO:** Tab đi qua 28 mục menu theo thứ tự trên xuống; Enter trên mục menu chuyển trang đúng (#/lich-tra-no); phần tử đang focus có vòng focus 2 px (đã có sẵn từ trước, e2e mới khoá lại). CHƯA kiểm: Tab/Enter trong từng form/modal.')));
ch.push(B('Đo cuộn mượt bảng 3.918 dòng: chế độ "Tất cả" dựng 2,5–6 s — chưa đạt mục tiêu "mượt".'));
ch.push(B('Thử trên Edge/Windows thật và Safari iOS / điện thoại thật (mới chỉ Chromium Linux).'));
ch.push(B('Phép kiểm e2e ở 1920 cho bảng Dư nợ — ĐÃ BỔ SUNG (e2e 72 phép; 20 đột biến).'));
ch.push(H2('5.3. Mục 11–12 — Vận hành, rủi ro, đường lui'));
ch.push(B(rich('**Sự cố dữ liệu (chưa đóng):** nhánh ccr-266ec07a-kxmt78 (commit 649fdb2 chứa dữ liệu khách hàng thật) VẪN CÒN trên GitHub — cần anh/chị xoá hoặc cho phép Claude xoá, rồi nhờ GitHub Support dọn commit mồ côi. Thu hồi khoá API đã lộ trong ảnh chat.')));
ch.push(B(rich('**Rủi ro migrate:** dữ liệu đã lưu trong trình duyệt từ bản cũ (LS 19%, seed TSBĐ) không tự sửa — đề án yêu cầu "hướng dẫn nhập lại từ tệp gốc": chưa có hướng dẫn trong app.')));
ch.push(B(rich('**Quy tắc nghiệp vụ công khai:** ngưỡng cảnh báo, cách hiểu clholdcd (N = đang giữ) đã chốt; chưa có trang "Quy tắc" tập trung hiển thị cho người dùng.')));
ch.push(H2('5.4. Mục 13 — Tiêu chí nghiệm thu tổng'));
ch.push(table([['#',500],['Tiêu chí',4300],['Kết quả P05',1300],['Ghi chú',3538]],[
 row(C.done,'1','Nhập 11 tệp dư nợ + 2 TSBĐ; số dòng, Σ dư nợ, số KH, phân bố LS, nhóm nợ khớp tệp','Đạt','HM-23/24 trên 11 kỳ thật'),
 row(C.done,'2','Tải lại 3 lần không đổi số; sửa tay được giữ','Đạt','HM-03'),
 row(C.done,'3','Trang Đối soát mọi chỉ tiêu "Khớp" hoặc có lý do','Đạt','10/10 khớp'),
 row(C.done,'4','Không PII; mọi script biên dịch; không pageerror','Đạt','scan-pii, check_scripts'),
 row(C.done,'5','Mọi trang có lối vào; F5/Back; KHÔNG tràn ngang ở 1366 và 1920 với bố cục mặc định; dùng được ở 390 px','Đạt (sau sửa 3.1)','Trang không cuộn ngang ở mọi cỡ đã đo; bảng Dư nợ vừa khung ở 1920/1600/1366'),
 row(C.done,'6','Kiểm thử hồi quy một lệnh và đạt','Đạt','22/22, 17 đột biến'),
]));
ch.push(H2('5.5. Mục 14 — Quyết định và câu hỏi mở'));
ch.push(P('3 quyết định chính đã chốt (tách nguồn ở Đợt 4; gỡ dữ liệu cứng; đến hạn theo ngày dữ liệu). Câu hỏi mở: ô "#DIV/0!/Chưa hoàn thiện" trong PL02 — đã liệt kê ở trang lỗi bảng giá; NQ38 — đã OCR, thiếu Phụ lục I; phạm vi TSBĐ — đã chốt clholdcd. Còn chờ anh/chị: xoá nhánh dữ liệu; DATA.macb giữ/bỏ; mẫu .docx; Past Due thật; khoá AI.'));

// ===== 6 de xuat
ch.push(H1('6. Đề xuất thứ tự làm tiếp (phiên P06) — việc đã xong trong ngày được đánh dấu ✔'));
ch.push(table([['Ưu tiên',900],['Việc',4900],['Loại',1500],['Cần anh/chị',2338]],[
 row(C.done,'1 ✔','ĐÃ XONG: Sửa tràn ngang bảng Dư nợ ở 1920 + phép kiểm e2e 1920/1600','Lỗi (hồi quy P05)','—'),
 row(C.done,'2 ✔','ĐÃ XONG: Nút ↶/↷ vào topbar; Xuất CSV/Thêm mới xuống thanh công cụ trang','Lỗi giao diện','—'),
 row(C.done,'3 ✔','ĐÃ XONG: Dải biểu tượng 64 px ở 1280–1439 px; nhóm menu thu/mở (mặc định thu NGHIỆP VỤ, HỆ THỐNG; nhớ trạng thái)','Khung 8.1','—'),
 row(C.done,'4 ✔','ĐÃ XONG: Bảng điều khiển: thẻ KPI đầu trang, lưới 2 cột ở ≥1600 px, xu hướng thu nhỏ','Khung 8.1 / H.10','—'),
 row(C.done,'5 ✔','ĐÃ XONG (một phần): topbar 1 hàng, KPI 2×2; bảng → ngăn chi tiết (chưa thành thẻ thật)','H.12 / HM-19','—'),
 row(C.done,'6 ✔','ĐÃ XONG: Ngăn chi tiết 380 px (Dư nợ/Đến hạn/Lãi đọng/Chuyển HM/Giải ngân/Trả nợ); tabular-nums. CÒN: ghim cột KH mặc định, gắn TSBĐ/KH 360°','Khung 8.1 / H.11, H.17','—'),
 row(C.done,'7 ✔','ĐÃ XONG: Breadcrumb "Nhóm › Trang" trên topbar','Khung 8.1','—'),
 row(C.part,'8 (phần lớn)','ĐÃ LÀM: tiêm chuỗi độc vào dữ liệu dư nợ, TSBĐ (22 trường), ghi chú KH, tên mốc lưu trữ; 14 trang + KH 360° + Lưu trữ; escape thêm 12 chỗ tên mốc. CÒN: hồ sơ vay (HSVV/FHS), rà tĩnh mẫu nhiều dòng','Bảo mật (7.5)','Không'),
 row(C.part,'9 (một phần)','ĐÃ LÀM: nút "Hoàn tác lần nhập (dư nợ)" (khôi phục dữ liệu dư nợ trước khi nhập; trong bộ nhớ đến khi tải lại). CÒN: nhận loại theo tiêu đề cột, bước xem trước, hoàn tác TSBĐ/mốc lưu trữ','H.14 / HM-23','Không'),
 row(C.part,'10 (phần lớn)','ĐÃ ĐO: zoom 125%, Tab/Enter menu; hộp thoại: thêm bẫy Tab (trước đây Tab chui ra menu), Esc đóng. CÒN: Edge/Windows/iPhone thật','Kiểm chứng (10)','Chạy thử trên máy thật'),
 row(C.part,'11 (một phần)','ĐÃ LÀM: không quét bảng định kỳ khi tab bị ẩn. CÒN: gỡ 8 observer, "Tất cả" 3.848 dòng dựng dần','Hiệu năng','Không'),
 row(C.part,'12','Giá NQ38 theo tên đường; quy đổi ngoại tệ TSBĐ; mẫu .docx cơ quan; SRI 3 thư viện','Dữ liệu / tệp','Gửi Phụ lục I, tỷ giá, mẫu .docx'),
]));
ch.push(P([t('Ghi chú: mục 3–6 thay đổi giao diện nhìn thấy — theo nguyên tắc đề án, cần anh/chị duyệt trước (có thể duyệt theo ảnh chụp trước/sau như P05).',{i:true})],{before:120}));

const doc=new Document({creator:'QLTD PRO',title:'Báo cáo rà soát đề án QLTD PRO',
 styles:{default:{document:{run:{font:F,size:22}}},paragraphStyles:[{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:30,bold:true,font:F},paragraph:{outlineLevel:0}},{id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:26,bold:true,font:F},paragraph:{outlineLevel:1}}]},
 numbering:{config:[{reference:'b',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:540,hanging:280}}}},{level:1,format:LevelFormat.BULLET,text:'–',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:1000,hanging:280}}}}]}]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({font:F,size:18,children:['Báo cáo rà soát đề án QLTD PRO — trang ',PageNumber.CURRENT]})]})]})},
  children:ch}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync(process.argv[2],b);console.log('ok',b.length)});

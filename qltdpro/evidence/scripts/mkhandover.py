"""mkhandover.py <thu_muc_goi> <so_phien> <app_name> <sha> <next_text_file> : sinh lại HANDOVER.md từ backlog.json + evidence/hm*_result.md"""
import sys, json, glob, os, re
d, ph, app, sha, nxt = sys.argv[1:6]
b = json.load(open(f'{d}/handover/backlog.json', encoding='utf-8'))
rows = []
for h in b['hang_muc']:
    rows.append(f"| {h['id']} | {h['ten']} | {h['uu_tien']} | {h['trang_thai']} | {h.get('bac_kiem_chung_dat') or ''} |")
res = []
for f in sorted(glob.glob(f'{d}/evidence/hm*_result.md')):
    t = open(f, encoding='utf-8').read().strip().splitlines()
    hm = os.path.basename(f)[:4].upper().replace('HM', 'HM-')
    res.append(f"- **{t[0].lstrip('# ').strip()}** (evidence/{os.path.basename(f)})")
done = [h['id'] for h in b['hang_muc'] if h['trang_thai'] in ('DAT_V3', 'DAT_V2', 'DA_BAN_GIAO', 'DAT_MOT_PHAN')]
md = f"""# BÀN GIAO — QLTDPRO — Phiên P{ph} — luỹ kế {done[0] if done else ''}…{done[-1] if done else ''}
Skill: web-app-repair-upgrade v3.2.0 (tệp skill không đính kèm — làm theo HANDOVER/backlog) | Chế độ: 3, TỰ ĐỘNG thực thi liên tục.
## 1. Dự án và môi trường
HTML5 một tệp, không build. Kiểm thử: `python3 -m http.server <cổng>` + Playwright (NODE_PATH=$(npm root -g)); cổng kiểm tra: `node evidence/scripts/check_scripts.js <app.html>` (0 lỗi). Mỗi HM có apply_hmXX.py (áp tuần tự từ bản gốc v22.3: hm01…hmNN, mỗi script <vào> <ra>), module nguồn td_*.js (nhúng nguyên văn + Node test), hmXX_test.js.
Dữ liệu lưu: IndexedDB QLTDProDB v3 (+TWIN_Archive_v1, QLTDProTSBD), localStorage.
App hiện hành: app/{app} — SHA-256 {sha}. Bản gốc v22.3 (13,98 MB, SHA e51038ee…7fbb37) do người dùng giữ, chứa dữ liệu thật nên KHÔNG đóng gói.
Dữ liệu thật (11 kỳ dư nợ 12/2025–10/2026, sao kê TSBĐ 30/09 và 20/10, GIA DAT 2026: PL01/PL02/NQ38) do người dùng gửi kèm ở P02, KHÔNG đóng gói (PII) — phiên sau cần gửi lại. V3 của HM-08→HM-28 chạy trên dữ liệu thật và đối chiếu lập trình độc lập bằng Python (xlrd/openpyxl; cài bằng pip --target); các script *_indep.py / *_check.py nằm trong evidence/scripts.
## 2. Trạng thái hạng mục (khớp backlog.json)
| HM | Tên | Ưu tiên | Trạng thái | Bậc |
|---|---|---|---|---|
""" + "\n".join(rows) + """
## 3. Kết quả đã đóng
""" + "\n".join(res) + """
## 4. Hạng mục kế tiếp
""" + open(nxt, encoding='utf-8').read().strip() + """
## 5. Việc dở dang: xem backlog.json (ghi_chu_ban_giao của HM mới nhất).
## 6. Quyết định đã chốt: xem backlog.json → quyet_dinh_da_chot. Đến hạn/quá hạn theo ngày dữ liệu (chip topbar chuyển "hôm nay"); tách nguồn Đợt 4: hỏi người dùng trước HM-20; ZIP không chứa tệp gốc v22.3/IPCAS.
## 7. Lỗi nền / ngoài phạm vi: xem backlog.json → loi_nen_ngoai_pham_vi và HANDOVER P01 (LS=19% dữ liệu cũ phải nhập lại; TWIN_Archive_v1 chưa có checksum; NQ38 PDF scan).
## 8. Việc người dùng cần làm
1. Kiểm tay bản mới trên dữ liệu thật: mở app, nhập tệp dư nợ mới nhất (tên có ngày) → chip "Dữ liệu dd/mm/yyyy"; Dashboard: các bảng I/II/III cộng đúng tổng, dòng "Khác"/"Không rõ nhóm" chỉ hiện khi có khoản.
2. Gửi tệp IPCAS thật (20.10.2026.XLS, 30.06.2026.XLS, 1 .xlsx; sao kê TSBĐ cho HM-10) để đối chiếu cũ/mới V3 trước khi tiếp HM-10/11.
## 9. Đường lui: áp lại apply_hm01…NN từ bản gốc v22.3, hoặc dùng ZIP phiên trước.
## 10. File đã chạm: chỉ app (vùng ghi ở hmXX_result.md).
"""
open(f'{d}/handover/HANDOVER.md', 'w', encoding='utf-8').write(md)

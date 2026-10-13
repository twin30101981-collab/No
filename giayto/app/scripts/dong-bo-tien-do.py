#!/usr/bin/env python3
"""R0.1 – Đồng bộ trạng thái theo "Lộ trình tổng thể các hạng mục còn lại v5" (11/10/2026).

tien-do.json là nguồn sự thật duy nhất. Kịch bản này:
1. Gộp mã trùng trong `buoc` (B13, S10e…): giữ bản có trạng thái "tiến xa" nhất, nối ghi chú.
2. Cập nhật / bổ sung các mục P… theo bảng đối chiếu của tài liệu v5.
3. Ghi lộ trình 27 gói R0.1…R6.5 vào khoá `lo_trinh_r`.
4. Sinh lại LO-TRINH.md (phần trạng thái) và TIEP-THEO.md từ tien-do.json.
Chạy lại nhiều lần cho kết quả như nhau (idempotent).
Dùng: python3 scripts/dong-bo-tien-do.py
"""
import json
from datetime import date

PATH = "de-an-nang-cap-scan/tien-do.json"
R_XONG = {"R0.1", "R1.1", "R1.2", "R3.1", "R1.3", "R1.4"}
NHAT_KY = [
    "- 2026-10-11 R0.1: Đồng bộ trạng thái theo lộ trình v5; gộp mã trùng B13, S10e; thêm 27 gói R",
    "- 2026-10-11 R1.1: Một cửa chỉnh – nút Lọc mở Chỉnh tay; gợi ý bộ lọc, Áp tất cả, Trang tương tự, chẩn đoán chuyển vào; xoá FilterPanel áp ngay (TD-11/12); 164 tệp / 692 kiểm thử đạt; tsgo sạch; build OK",
    "- 2026-10-11 R1.2: Nút “Giữ để xem ảnh gốc” trên màn Chỉnh tay (giữ = thấy 100% gốc, thả = về vị trí cũ); hộp hỏi khi rời màn chưa lưu và Áp tất cả trang đã có từ R1.1/TD-23; 164 tệp / 694 kiểm thử đạt; tsgo sạch",
    "- 2026-10-11 R3.1: Nhật ký quyết định theo trang (page-review.ts), nhãn cam “Xem lại” khi điểm < 70, thẻ lọc Tất cả / Cần xem lại / Đã sửa tay trên màn tài liệu; 165 tệp / 699 kiểm thử đạt; tsgo sạch",
    "- 2026-10-11 R1.3: Bỏ data URL ở giao diện (bộ tẩy, bút vẽ) – canvas-url.ts xuất Blob/object URL, giải phóng canvas, thu hồi URL tạm; adoptBlob đăng ký với kho; còn QR nhỏ (giữ); 166 tệp / 703 kiểm thử đạt; tsgo sạch",
    "- 2026-10-11 R1.4: Bỏ data URL đợt 2 ở 7 tệp lib (moire, redact, signatures, sr-enhance, translate-overlay, files, id-watermark) – trang trả về object URL đã đăng ký, canvas giải phóng ngay; thêm r14-leak.test.ts kiểm rò rỉ bitmap/object URL; 167 tệp / 714 kiểm thử đạt; tsgo sạch; build OK",
]
NGAY = "2026-10-11"
HANG = {"xong": 6, "xong-phan-1": 5, "da-do-chua-dat": 4, "dang-lam": 3, "tiep-theo": 2, "cho": 1, "bo-qua": 0}

# (mã, tên, trạng thái chuẩn, ghi chú) theo mục 2 tài liệu v5
P_V5 = [
    ("P1.1", "Baseline perf-stats", "xong-phan-1", "Thiếu số trên điện thoại tầm trung → R2.5"),
    ("P2", "Hàng đợi nền bền IndexedDB", "xong", None),
    ("P2.1", "Gom worker thành 1 bể", "cho", "→ R2.1, R2.2"),
    ("P2.2", "Bỏ data URL (TD-04)", "xong-phan-1", "Còn 15 tệp → R1.3, R1.4"),
    ("P2.3", "Cache theo khoá + xử lý theo ô", "cho", "→ R2.3"),
    ("P2.4", "Xoá thuật toán cũ", "cho", "→ R2.6"),
    ("P3.1", "Kính lúp + khung cắt an toàn", "xong", None),
    ("P3.3", "Tô vùng sắp cắt (TD-05) + hộp OCR (TD-06)", "xong-phan-1", "→ R1.5"),
    ("P3.4", "Trang báo ngang", "xong", None),
    ("P5.1", "Một cửa chỉnh (TD-11/12)", "xong", "R1.1 xong 11/10/2026"),
    ("P5.2", "Xem trước WebGL + thanh 0–100", "cho", "→ R2.4"),
    ("P5.3", "Tinh chỉnh 7 bộ lọc theo 17.4", "cho", "→ R6.1"),
    ("P5.4", "So sánh, Áp dụng tất cả, chặn rời màn (TD-23)", "xong-phan-1", "→ R1.2"),
    ("P6.1", "Dán ảnh, HEIC", "xong", None),
    ("P6.2", "Phân loại ảnh nhập + pHash", "cho", "→ R4.1"),
    ("P6.3", "Lưới kéo-thả, chọn nhiều, ô Thêm", "cho", "→ R4.2"),
    ("P7", "Gói đầy đủ ZIP, xuất hàng loạt", "xong", None),
    ("P7.1", "Xuất 1 chạm + PDF 3 mức + khớp xem trước", "cho", "→ R5.1, R3.5"),
    ("P7.2", "OCR ẩn trong PDF", "cho", "→ R5.2"),
    ("P7.3", "UAT máy thật", "cho", "CHẶN – chờ người dùng thử máy thật → R6.4"),
    ("P7.4", "Đề án bản cuối", "cho", "→ R6.5"),
    ("P8.1", "Chấm điểm trang (page-grade.ts)", "xong", None),
    ("P8.6", "Học theo người dùng", "cho", "→ R3.3"),
    ("P8.7", "Chế độ Tự động mặc định", "cho", "→ R3.5"),
]


def gop_trung(buoc):
    out, idx = [], {}
    for b in buoc:
        ma = b["ma"]
        if ma not in idx:
            idx[ma] = len(out); out.append(dict(b)); continue
        cu = out[idx[ma]]
        chinh, phu = (b, cu) if HANG.get(b["trang_thai"], 0) > HANG.get(cu["trang_thai"], 0) else (cu, b)
        moi = {**phu, **chinh}
        ghi = [g for g in (chinh.get("ghi_chu"), phu.get("ghi_chu")) if g]
        if ghi:
            moi["ghi_chu"] = " | ".join(dict.fromkeys(ghi))
        out[idx[ma]] = moi
    return out


def ap_v5(buoc):
    idx = {b["ma"]: i for i, b in enumerate(buoc)}
    for ma, ten, tt, ghi in P_V5:
        moi = {"ma": ma, "ten": ten, "trang_thai": tt}
        if ghi:
            moi["ghi_chu"] = ghi
        if ma in idx:
            cu = buoc[idx[ma]]
            if HANG.get(tt, 0) >= HANG.get(cu["trang_thai"], 0):  # không bao giờ hạ trạng thái đã tiến xa hơn
                cu.update(trang_thai=tt)
            if ghi and ghi not in (cu.get("ghi_chu") or ""):
                cu["ghi_chu"] = f"{cu['ghi_chu']} | {ghi}" if cu.get("ghi_chu") else ghi
        else:
            idx[ma] = len(buoc); buoc.append(moi)
    # B13 = UAT máy thật: bị chặn chờ người dùng (cùng P7.3)
    if "B13" in idx:
        b = buoc[idx["B13"]]
        b["trang_thai"] = "cho"
        if "R6.4" not in (b.get("ghi_chu") or ""):
            b["ghi_chu"] = (b.get("ghi_chu", "") + " | CHẶN – chờ ảnh/máy thật → R6.4").strip(" |")
    return buoc


def doc_r():
    with open("de-an-nang-cap-scan/lo-trinh-r.json", encoding="utf-8") as f:
        return json.load(f)


def sinh_md(d):
    st = {}
    for b in d["buoc"]:
        st[b["trang_thai"]] = st.get(b["trang_thai"], 0) + 1
    r = d["lo_trinh_r"]
    L = ["# Lộ trình thực hiện – nguồn: tien-do.json (sinh tự động bởi scripts/dong-bo-tien-do.py)", "",
         f"Cập nhật {d['cap_nhat']}. Thay thế LO-TRINH-CON-LAI-20261010.docx (đã lỗi thời).", "",
         "## Tổng hợp trạng thái mục cũ (B/S/V/P)", ""]
    L += [f"- {k}: {st[k]}" for k in sorted(st, key=lambda k: -HANG.get(k, 0))]
    L += ["", "## Lộ trình 27 gói R (mỗi gói ≤ 4 credit)", ""]
    dot = None
    for g in r:
        if g["dot"] != dot:
            dot = g["dot"]; L += ["", f"### Đợt {dot}"]
        ten = f"{g['ma']} {g['viec']}"
        dong = f"~~{ten}~~" if g["trang_thai"] == "xong" else ten
        L.append(f"- {dong} — {g['trang_thai']}; kiểm chứng: {g['kiem_chung']}; phụ thuộc: {g['phu_thuoc']}")
    L += ["", "Lịch sử chi tiết các bước P0–P8: de-an-nang-cap-scan/LO-TRINH-LICH-SU-P.md", "", "## Nhật ký bàn giao", ""] + d.get("nhat_ky", [])
    return "\n".join(L) + "\n"


def sinh_tiep(d):
    r = d["lo_trinh_r"]
    xong = {g["ma"] for g in r if g["trang_thai"] == "xong"}
    def san_sang(g):
        if g["trang_thai"] == "xong" or g["phu_thuoc"].startswith("Cần") or g["phu_thuoc"] == "Tất cả":
            return False
        pt = [p.strip() for p in g["phu_thuoc"].split(",") if p.strip() not in ("—", "")]
        return all(p in xong for p in pt)
    L = ["# Bước kế tiếp (sinh tự động từ tien-do.json)", "",
         f"Gói đã xong: {', '.join(sorted(xong)) or 'chưa có'}.", "",
         f"## Làm tiếp: {d['buoc_ke_tiep']}", ""]
    L += [f"- {g['ma']}: {g['viec']} (kiểm chứng: {g['kiem_chung']})" for g in r if san_sang(g)]
    L += ["", "## Bị chặn chờ người dùng", ""]
    L += [f"- {g['ma']}: {g['viec']} — {g['phu_thuoc']}" for g in r if g["phu_thuoc"].startswith("Cần")]
    return "\n".join(L) + "\n"


def main():
    d = json.load(open(PATH, encoding="utf-8"))
    d["buoc"] = ap_v5(gop_trung(d["buoc"]))
    r = doc_r()
    # Giữ trạng thái/kiểm chứng đã ghi trong tien-do.json (nguồn sự thật) — chỉ dùng lo-trinh-r.json làm mẫu
    # cho gói chưa có; tránh chạy lại làm tụt gói đã xong về "cho" (lỗi lệch từ R2.6/R6.1/R6.3).
    cu = {g["ma"]: g for g in d.get("lo_trinh_r", [])}
    for g in r:
        if g["ma"] in cu:
            g["trang_thai"] = cu[g["ma"]]["trang_thai"]
            g["kiem_chung"] = cu[g["ma"]].get("kiem_chung", g["kiem_chung"])
        if g["ma"] in R_XONG:
            g["trang_thai"] = "xong"
    d["lo_trinh_r"] = r
    d["phien_ban_de_an"] = "v5"
    d["cap_nhat"] = NGAY
    d["ket_thuc"] = False
    d.setdefault("buoc_ke_tiep", "R2.6 hoặc R3.5 (song song được: R4.3, R5.1, R6.1)")  # không ghi đè giá trị đã cập nhật
    d.setdefault("nhat_ky", [])
    for log in NHAT_KY:
        if log not in d["nhat_ky"]:
            d["nhat_ky"].append(log)
    json.dump(d, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open("LO-TRINH.md", "w", encoding="utf-8").write(sinh_md(d))
    open("TIEP-THEO.md", "w", encoding="utf-8").write(sinh_tiep(d))
    ma = [b["ma"] for b in d["buoc"]]
    assert len(ma) == len(set(ma)), "còn mã trùng"
    print(f"OK: {len(ma)} mục cũ, {len(r)} gói R, kế tiếp {d['buoc_ke_tiep']}")


if __name__ == "__main__":
    main()

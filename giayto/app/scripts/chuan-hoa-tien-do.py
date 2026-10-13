#!/usr/bin/env python3
"""P0.1 – Chuẩn hoá tien-do.json về một mảng `buoc` thống nhất.

- Gộp các khoá cấp cao S*/V*/TD-* (dict rời) vào mảng `buoc`.
- Đồng nhất tên trường: id->ma, buoc_ke/tiep->ke_tiep, noi_dung->ghi_chu.
- Giữ nguyên các khoá meta (du_an, phien_ban_de_an, cap_nhat, ...).
"""
import json
import sys
from datetime import date

PATH = "de-an-nang-cap-scan/tien-do.json"
META_GIU = {"du_an", "phien_ban_de_an", "cap_nhat", "credit_moi_buoc", "buoc", "ket_thuc", "de_an_v4", "no_ky_thuat", "buoc_ke_tiep"}


# Nhóm trạng thái chuẩn dùng thống nhất trong app tiến độ
TT_CHUAN = ("xong", "xong-phan-1", "dang-lam", "da-do-chua-dat", "tiep-theo", "cho", "bo-qua")
TT_MAP = {
    "xong": "xong", "đạt": "xong", "đã nghiệm thu": "xong",
    "xong phần 1": "xong-phan-1", "xong-phan-1": "xong-phan-1", "xong mot phan": "xong-phan-1",
    "dang-lam": "dang-lam", "đang làm": "dang-lam",
    "đã đo, chưa đạt": "da-do-chua-dat", "đã đo – chưa đạt": "da-do-chua-dat",
    "da_do_chua_dat": "da-do-chua-dat", "đã đo, chưa đạt hết": "da-do-chua-dat",
    "tiep_theo": "tiep-theo", "ke_tiep": "tiep-theo",
    "cho": "cho", "bo_qua": "bo-qua",
}


def chuan_trang_thai(raw: str) -> tuple[str, str | None]:
    """Trả về (trạng thái chuẩn, ghi chú phần bị cắt ra nếu có)."""
    if raw in TT_MAP:
        return TT_MAP[raw], None
    for k, v in TT_MAP.items():
        if raw.startswith(k):
            return v, raw
    return "dang-lam", raw


def chuan_buoc(ma: str, b: dict) -> dict:
    out = {"ma": ma}
    out["ten"] = b.get("ten") or b.get("noi_dung") or ma
    tt, ghi_tt = chuan_trang_thai(b.get("trang_thai", "cho"))
    out["trang_thai"] = tt
    for nguon, dich in (("ngay", "ngay"), ("nghiem_thu", "nghiem_thu"), ("bang_chung", "bang_chung"),
                        ("ket_qua", "ket_qua"), ("kiem_thu", "kiem_thu"), ("con_thieu", "con_thieu"),
                        ("con_lai", "con_lai"), ("da_lam", "da_lam")):
        if b.get(nguon):
            out[dich] = b[nguon]
    ghi = b.get("ghi_chu") or (b.get("noi_dung") if b.get("ten") else None)
    if ghi_tt and ghi_tt != ghi:
        ghi = f"{ghi} | {ghi_tt}" if ghi else ghi_tt
    if ghi:
        out["ghi_chu"] = ghi
    ke = b.get("ke_tiep") or b.get("buoc_ke") or b.get("tiep")
    if ke:
        out["ke_tiep"] = ke
    return out


def main() -> None:
    d = json.load(open(PATH, encoding="utf-8"))
    buoc = [chuan_buoc(b.get("ma") or b.get("id"), b) for b in d["buoc"]]
    co = {b["ma"] for b in buoc}
    for k in list(d):
        if k in META_GIU:
            continue
        v = d[k]
        if isinstance(v, dict) and "trang_thai" in v:
            if k not in co:
                buoc.append(chuan_buoc(k, v))
                co.add(k)
            del d[k]
        # khoá không phải bước (vd S13b_UI) giữ nguyên
    d["buoc"] = buoc
    d["cap_nhat"] = date.today().isoformat()
    json.dump(d, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"Chuẩn hoá xong: {len(buoc)} bước trong mảng buoc")


if __name__ == "__main__":
    sys.exit(main())

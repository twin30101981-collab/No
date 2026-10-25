#!/usr/bin/env python3
"""R6.2 – Bước 2: chấm tỉ lệ OCR đúng ký tự của ảnh NB (bài báo Ninh Bình) và so với bản CamScanner.

Nguồn so sánh (cùng một trang, cùng một máy OCR, cùng chữ chuẩn):
  goc/        ảnh chụp gốc chưa xử lý                       (mốc đáy)
  anh-app/    đầu ra pipeline app, 8 bộ lọc (chay-app.py)    (đối tượng kiểm)
  doi-chung/  ngưỡng thích ứng OpenCV trên ảnh app "original" (mốc thuật toán chung – KHÔNG phải Cam)
  cam/        ảnh xuất từ CamScanner cùng trang (jpg/png/pdf)  (đối chứng cần người dùng gửi)
Chữ chuẩn: chuan-chu/<ten>.txt (<ten> là phần đầu tên ảnh, ví dụ IMG_NB_01).

Chỉ số (sau khi chuẩn hoá NFC, nháy/gạch nối, gộp khoảng trắng):
  dung_ky_tu = LCS(chuẩn, OCR) / số ký tự chuẩn   ← chỉ số chính "tỉ lệ OCR đúng ký tự" (không phạt chữ thừa từ ảnh minh hoạ)
  cer        = Levenshtein(chuẩn, OCR) / số ký tự chuẩn (chỉ số phụ, phạt cả chữ thừa)
  *_khong_dau: như trên nhưng bỏ dấu tiếng Việt ở cả hai phía (tách lỗi chữ cái khỏi lỗi dấu).
Tiêu chí R6.2: dung_ky_tu(app, bộ lọc auto) ≥ dung_ky_tu(Cam tốt nhất) − 2 điểm %.

Máy OCR: tesseract CLI, ngôn ngữ 'vie' nếu có; nếu thiếu thì dùng 'eng' và ghi rõ trong kết quả – khi đó
chỉ số *_khong_dau mới có ý nghĩa tham chiếu, KHÔNG dùng để gạch mục R6.2.
  python3 scripts/kiem-chung-r62/so-ocr.py [--ngon-ngu vie] [--psm 3]
"""
import argparse, glob, json, os, re, shutil, subprocess, sys, tempfile, unicodedata
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KC = ROOT + "/de-an-nang-cap-scan/kiem-chung"
BO = KC + "/bo-anh-NB"
OUT = KC + "/R6.2"
NGUONG_DIEM = 0.02
FILTERS = ["original", "magic", "auto", "sharp", "mono", "gray", "ink", "eco"]


def chuan_hoa(s):
    s = unicodedata.normalize("NFC", s)
    for a, b in (("“", '"'), ("”", '"'), ("„", '"'), ("‘", "'"), ("’", "'"), ("–", "-"), ("—", "-"), ("|", "")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def bo_dau(s):
    s = s.replace("đ", "d").replace("Đ", "D")
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"))


def _arr(s):
    return np.frombuffer(s.encode("utf-32-le"), dtype=np.uint32).astype(np.int64)


def lev(x, y):
    a, b = _arr(x), _arr(y)
    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return max(n, m)
    idx = np.arange(m + 1)
    prev = idx.copy()
    for i in range(1, n + 1):
        tmp = np.empty(m + 1, dtype=np.int64)
        tmp[0] = i
        tmp[1:] = np.minimum(prev[1:] + 1, prev[:-1] + (b != a[i - 1]))
        prev = np.minimum.accumulate(tmp - idx) + idx
    return int(prev[m])


def lcs(x, y):
    a, b = _arr(x), _arr(y)
    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return 0
    prev = np.zeros(m + 1, dtype=np.int64)
    for i in range(1, n + 1):
        cand = np.where(b == a[i - 1], prev[:-1] + 1, 0)
        cur = np.maximum.accumulate(np.maximum(prev[1:], cand))
        prev = np.concatenate(([0], cur))
    return int(prev[m])


def cham(chuan, ocr):
    c, o = chuan_hoa(chuan), chuan_hoa(ocr)
    cd, od = bo_dau(c), bo_dau(o)
    return {
        "dung_ky_tu": round(lcs(c, o) / len(c), 4), "cer": round(lev(c, o) / len(c), 4),
        "dung_ky_tu_khong_dau": round(lcs(cd, od) / len(cd), 4), "cer_khong_dau": round(lev(cd, od) / len(cd), 4),
        "so_ky_tu_chuan": len(c), "so_ky_tu_ocr": len(o),
    }


def ngon_ngu_co_san(muon):
    try:
        ds = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout.split()
    except FileNotFoundError:
        sys.exit("Không có tesseract trong PATH")
    if muon in ds:
        return muon
    print(f"CẢNH BÁO: tesseract thiếu '{muon}' → dùng 'eng' (chỉ số tham chiếu, không gạch mục)", file=sys.stderr)
    return "eng"


def ocr(path, lang, psm, cache):
    if os.path.exists(cache) and os.path.getmtime(cache) >= os.path.getmtime(path):
        return open(cache, encoding="utf-8").read()
    txt = subprocess.run(["tesseract", path, "stdout", "-l", lang, "--psm", str(psm)], capture_output=True, text=True).stdout
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    open(cache, "w", encoding="utf-8").write(txt)
    return txt


def pdf_sang_anh(pdf, tmp):
    if not shutil.which("pdftoppm"):
        print("Bỏ qua", pdf, "(thiếu pdftoppm)", file=sys.stderr)
        return []
    base = os.path.join(tmp, os.path.basename(pdf)[:-4])
    subprocess.run(["pdftoppm", "-r", "200", "-png", pdf, base], check=True)
    return sorted(glob.glob(base + "*.png"))


def doi_chung(anh_app, ra):
    """Mốc thuật toán chung: ngưỡng thích ứng Gauss trên ảnh app 'original' (đã nắn hình học, chưa lọc)."""
    try:
        import cv2
    except ImportError:
        return {}
    kq = {}
    os.makedirs(ra, exist_ok=True)
    for p in sorted(glob.glob(anh_app + "/*_original.jpg")):
        g = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY)
        g = cv2.GaussianBlur(g, (3, 3), 0)
        t = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 41, 14)
        o = os.path.join(ra, os.path.basename(p).replace("_original.jpg", "_nguong-thich-ung.png"))
        cv2.imwrite(o, t)
        kq[o] = True
    return kq


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ngon-ngu", default="vie")
    ap.add_argument("--psm", type=int, default=3)
    a = ap.parse_args()
    lang = ngon_ngu_co_san(a.ngon_ngu)
    chuan = {os.path.basename(p)[:-4]: open(p, encoding="utf-8").read() for p in sorted(glob.glob(BO + "/chuan-chu/*.txt"))}
    if not chuan:
        sys.exit("Thiếu chữ chuẩn trong " + BO + "/chuan-chu")
    dc_dir = OUT + "/anh-doi-chung"
    doi_chung(OUT + "/anh-app", dc_dir)
    tmp = tempfile.mkdtemp(prefix="r62-cam-")
    tap = {"goc": [], "app": [], "doi-chung": [], "cam": []}
    for ten in chuan:
        tap["goc"] += sorted(glob.glob(f"{BO}/goc/{ten}.jpg"))
        tap["app"] += sorted(glob.glob(f"{OUT}/anh-app/{ten}_*.jpg"))
        tap["doi-chung"] += sorted(glob.glob(f"{dc_dir}/{ten}_*.png"))
        for p in sorted(glob.glob(f"{BO}/cam/{ten}*")):
            if p.lower().endswith(".pdf"):
                tap["cam"] += pdf_sang_anh(p, tmp)
            elif p.lower().endswith((".jpg", ".jpeg", ".png")):
                tap["cam"].append(p)
    kq = {}
    for nhom, ds in tap.items():
        for p in ds:
            ten = next(t for t in chuan if os.path.basename(p).startswith(t))
            nhan = os.path.basename(p).rsplit(".", 1)[0]
            txt = ocr(p, lang, a.psm, f"{OUT}/ocr/{nhom}/{nhan}.txt")
            r = cham(chuan[ten], txt)
            kq[f"{nhom}|{nhan}"] = {"nhom": nhom, "trang": ten, **r}
            print(f"{nhom:9s} {nhan:34s} đúng ký tự {r['dung_ky_tu']*100:5.1f}%  CER {r['cer']*100:5.1f}%  "
                  f"(không dấu: {r['dung_ky_tu_khong_dau']*100:5.1f}% / {r['cer_khong_dau']*100:5.1f}%)", file=sys.stderr, flush=True)
    # Tiêu chí
    danh_gia = {}
    for ten in chuan:
        app = {k.split("|")[1][len(ten) + 1:]: v for k, v in kq.items() if v["nhom"] == "app" and v["trang"] == ten}
        cam = {k.split("|")[1]: v for k, v in kq.items() if v["nhom"] == "cam" and v["trang"] == ten}
        d = {"app_auto": app.get("auto", {}).get("dung_ky_tu"), "app_tot_nhat": max((v["dung_ky_tu"] for v in app.values()), default=None),
             "bo_loc_tot_nhat": max(app, key=lambda k: app[k]["dung_ky_tu"]) if app else None}
        if cam and d["app_auto"] is not None:
            tot = max(cam, key=lambda k: cam[k]["dung_ky_tu"])
            d.update({"cam_tot_nhat": cam[tot]["dung_ky_tu"], "cam_tot_nhat_la": tot,
                      "chenh_lech_diem": round(d["app_auto"] - cam[tot]["dung_ky_tu"], 4),
                      "dat": (d["app_auto"] >= cam[tot]["dung_ky_tu"] - NGUONG_DIEM) if lang == a.ngon_ngu else None})
            if lang != a.ngon_ngu:
                d["ghi_chu"] = f"KHÔNG KẾT LUẬN: máy OCR thiếu '{a.ngon_ngu}', đã dùng '{lang}' – chạy lại trên máy có tesseract-ocr-vie"
        else:
            d.update({"cam_tot_nhat": None, "dat": None,
                      "ghi_chu": "CHƯA ĐÁNH GIÁ: thiếu ảnh Cam cùng trang trong bo-anh-NB/cam/" if not cam else "thiếu ảnh app"})
        danh_gia[ten] = d
    res = {"ngon_ngu_ocr": lang, "ngon_ngu_yeu_cau": a.ngon_ngu, "psm": a.psm, "nguong_diem": NGUONG_DIEM,
           "chi_so_chinh": "dung_ky_tu", "danh_gia": danh_gia, "chi_tiet": kq}
    json.dump(res, open(OUT + "/ket-qua-ocr.json", "w"), ensure_ascii=False, indent=1)
    # Bảng markdown
    L = ["| Nhóm | Ảnh | Đúng ký tự | CER | Đúng ký tự (không dấu) | CER (không dấu) |", "| --- | --- | ---: | ---: | ---: | ---: |"]
    for k, v in kq.items():
        L.append(f"| {v['nhom']} | {k.split('|')[1]} | {v['dung_ky_tu']*100:.1f}% | {v['cer']*100:.1f}% | {v['dung_ky_tu_khong_dau']*100:.1f}% | {v['cer_khong_dau']*100:.1f}% |")
    open(OUT + "/bang-so-sanh.md", "w", encoding="utf-8").write(f"Máy OCR: tesseract '{lang}' psm {a.psm}\n\n" + "\n".join(L) + "\n")
    print(json.dumps({"ngon_ngu_ocr": lang, "danh_gia": danh_gia}, ensure_ascii=False, indent=1))


main()

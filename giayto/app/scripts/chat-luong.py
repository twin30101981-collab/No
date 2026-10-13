#!/usr/bin/env python3
"""B01 — Bộ kiểm chất lượng ảnh.
Chấm điểm ảnh đầu ra pipeline (mặc định progress/V12/chuan): độ nét (phương sai Laplace),
độ thẳng (góc nghiêng dòng chữ, độ) và OCR (độ tin cậy trung bình tesseract 'vie', số từ).
  python3 scripts/chat-luong.py                 # ghi mốc chat-luong-moc.json
  python3 scripts/chat-luong.py --so-sanh DIR   # chấm DIR và so với mốc, lệch > 1% thì thoát mã 1
"""
import sys, json, glob, os, subprocess, csv, io
import numpy as np
from PIL import Image

MOC = "de-an-nang-cap-scan/kiem-chung/chat-luong-moc.json"
NGUONG = 0.01

def gray(p, long=1600):
    im = Image.open(p).convert("L"); s = long / max(im.size)
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.BILINEAR)
    return im

def net(a):
    a = a.astype(np.float64)
    lap = -4 * a[1:-1, 1:-1] + a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:]
    return float(lap.var())

def nghieng(im):
    a = (np.asarray(im.resize((im.width // 2, im.height // 2))) < 128).astype(np.float64)
    best, ang = -1, 0.0
    for d in np.arange(-5, 5.01, 0.25):
        r = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).rotate(d, resample=Image.NEAREST)) > 0
        v = r.sum(1).astype(np.float64).var()
        if v > best: best, ang = v, float(d)
    return ang

def ocr(im):
    out = subprocess.run(["tesseract", "-", "-", "-l", "vie", "--psm", "3", "tsv"],
                         input=_png(im), capture_output=True, check=True).stdout.decode()
    confs = [float(r["conf"]) for r in csv.DictReader(io.StringIO(out), delimiter="\t")
             if r.get("text", "").strip() and float(r["conf"]) >= 0]
    return {"tu": len(confs), "tin_cay": round(sum(confs) / len(confs), 2) if confs else 0.0}

def _png(im):
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()

def cham(thu_muc):
    kq = {}
    for p in sorted(glob.glob(os.path.join(thu_muc, "*.png")) + glob.glob(os.path.join(thu_muc, "*.jpg"))):
        im = gray(p); ten = os.path.basename(p)
        r = {"net": round(net(np.asarray(im)), 2), "nghieng": nghieng(im)}
        if "_auto" in ten: r["ocr"] = ocr(im)   # OCR chỉ cho bộ lọc auto để chạy nhanh
        kq[ten] = r
        print(ten, r, file=sys.stderr)
    return kq

def tong(kq):
    ocrs = [v["ocr"] for v in kq.values() if "ocr" in v]
    return {"so_anh": len(kq),
            "net_tb": round(float(np.mean([v["net"] for v in kq.values()])), 2),
            "nghieng_tb_tuyet_doi": round(float(np.mean([abs(v["nghieng"]) for v in kq.values()])), 3),
            "ocr_tin_cay_tb": round(float(np.mean([o["tin_cay"] for o in ocrs])), 2) if ocrs else 0,
            "ocr_tu": int(sum(o["tu"] for o in ocrs))}

def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--so-sanh":
        moc = json.load(open(MOC))["tong"]; moi = tong(cham(sys.argv[2])); loi = []
        for k in ("net_tb", "ocr_tin_cay_tb", "ocr_tu"):
            if moc[k] and (moc[k] - moi[k]) / moc[k] > NGUONG: loi.append(f"{k}: {moc[k]} → {moi[k]}")
        if moi["nghieng_tb_tuyet_doi"] > moc["nghieng_tb_tuyet_doi"] + 0.25: loi.append("nghieng tăng")
        print(json.dumps({"moc": moc, "moi": moi, "loi": loi}, ensure_ascii=False, indent=1))
        sys.exit(1 if loi else 0)
    src = sys.argv[1] if len(sys.argv) > 1 else "progress/V12/chuan"
    kq = cham(src)
    json.dump({"nguon": src, "phien_ban": "V12", "tong": tong(kq), "anh": kq},
              open(MOC, "w"), ensure_ascii=False, indent=1)
    print(json.dumps(tong(kq), ensure_ascii=False))

if __name__ == "__main__":
    main()

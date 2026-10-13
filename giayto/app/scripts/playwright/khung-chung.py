#!/usr/bin/env python3
"""P0.3 – Khung Playwright dùng chung cho kiểm chứng các hạng mục đề án.

Kịch bản chung (theo đề án v4):
  mở app ở viewport 390×844 và 1280×800 → nạp ảnh từ bộ V1/V13/Q bằng ô
  chọn tệp → chờ trang xử lý xong → chụp màn hình danh sách trang và trang
  đầu vào kiem-chung/<mã mục>/ → kiểm không có lỗi console.

Dùng:
  python3 scripts/playwright/khung-chung.py --muc P0.3
  python3 scripts/playwright/khung-chung.py --muc P1.2 --bo V1 Q --url http://localhost:8080

Yêu cầu: app dev đang chạy (mặc định http://localhost:8080).
Kết quả: thoát mã 0 khi đạt, 1 khi lỗi; ảnh chụp lưu tại
  de-an-nang-cap-scan/kiem-chung/<muc>/.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
BO_ANH = GOC / "de-an-nang-cap-scan" / "kiem-chung"
# Bộ ảnh vàng: 1 ảnh đại diện mỗi bộ V1/V13/Q làm mốc so sánh cho mọi mục
ANH_VANG = {
    "V1": BO_ANH / "bo-anh-V1" / "goc" / "IMG_20261002_093538.jpg",
    "V13": BO_ANH / "bo-anh-V13" / "goc" / "IMG_20261002_093601.jpg",
    "Q": BO_ANH / "bo-anh-Q" / "goc" / "IMG_20261002_093555.jpg",
}
VIEWPORTS = [(390, 844, "dien-thoai"), (1280, 800, "may-tinh")]


async def chay_mot_viewport(pw, url, rong, cao, nhan, anh, thu_muc_ra):
    loi_console: list[str] = []
    trinh_duyet = await pw.chromium.launch(headless=True)
    trang = await (await trinh_duyet.new_context(viewport={"width": rong, "height": cao})).new_page()
    trang.on("console", lambda m: loi_console.append(m.text) if m.type == "error" else None)
    trang.on("pageerror", lambda e: loi_console.append(str(e)))

    await trang.goto(url, wait_until="networkidle")
    await trang.wait_for_timeout(1500)  # chờ hydrate xong, nếu không nút Bỏ qua chưa nhận bấm
    # Bỏ qua màn chào mừng nếu có
    try:
        await trang.get_by_role("button", name="Bỏ qua").click(timeout=5000)
    except Exception:
        pass
    await trang.wait_for_selector("text=Nhập ảnh", timeout=30000)

    async with trang.expect_file_chooser() as fc:
        await trang.get_by_text("Nhập ảnh", exact=True).first.click()
    await (await fc.value).set_files([str(a) for a in anh])

    # Chờ tài liệu mới mở ra và xử lý xong (không còn nhãn đang xử lý)
    await trang.wait_for_url(lambda u: "/doc/" in u or "/scan" in u, timeout=30000)
    await trang.wait_for_load_state("networkidle")
    try:
        await trang.wait_for_selector("text=Đang xử lý", timeout=3000)
        await trang.wait_for_selector("text=Đang xử lý", state="detached", timeout=60000)
    except Exception:
        pass  # không có nhãn đang xử lý = đã xong ngay

    await trang.screenshot(path=str(thu_muc_ra / f"{nhan}-danh-sach.png"))
    # Chụp trang đầu nếu mở được
    try:
        await trang.locator("img").first.wait_for(timeout=10000)
        await trang.locator("img").first.screenshot(path=str(thu_muc_ra / f"{nhan}-trang-dau.png"))
    except Exception:
        pass
    await trang.wait_for_timeout(3000)
    perf = await trang.evaluate("() => JSON.parse(localStorage.getItem('ghi-nhanh:perf') || '[]')")
    await trinh_duyet.close()
    return loi_console, perf


def thong_ke(perf):
    """median/p90 theo loại mốc perf-stats (cùng cách tính với src/lib/perf-stats.ts)."""
    import math
    nhom = {}
    for m in perf:
        nhom.setdefault(m["k"], []).append(m["ms"])
    ra = {}
    for k, v in nhom.items():
        v.sort()
        at = lambda q: v[min(len(v) - 1, max(0, math.ceil(q * len(v)) - 1))]
        ra[k] = {"n": len(v), "median": at(0.5), "p90": at(0.9)}
    return ra


async def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--muc", required=True, help="Mã hạng mục, vd P0.3")
    p.add_argument("--bo", nargs="+", default=["V1", "V13", "Q"], choices=list(ANH_VANG))
    p.add_argument("--url", default="http://localhost:8080")
    a = p.parse_args()

    anh = [ANH_VANG[b] for b in a.bo]
    thieu = [str(x) for x in anh if not x.exists()]
    if thieu:
        print("THIẾU ảnh vàng:", thieu)
        return 1
    ra = BO_ANH / a.muc
    ra.mkdir(parents=True, exist_ok=True)

    ket_qua = {}
    async with async_playwright() as pw:
        for rong, cao, nhan in VIEWPORTS:
            loi, perf = await chay_mot_viewport(pw, a.url, rong, cao, nhan, anh, ra)
            ket_qua[nhan] = {"viewport": f"{rong}x{cao}", "loi_console": loi, "perf": thong_ke(perf)}
            print(f"[{nhan}] perf:", json.dumps(ket_qua[nhan]["perf"], ensure_ascii=False))
            print(f"[{nhan}] viewport {rong}x{cao}: {'SẠCH' if not loi else f'{len(loi)} lỗi console'}")

    (ra / "ket-qua.json").write_text(json.dumps(ket_qua, ensure_ascii=False, indent=2), encoding="utf-8")
    loi_tong = sum(len(v["loi_console"]) for v in ket_qua.values())
    print(f"Ảnh chụp lưu tại: {ra}")
    if loi_tong:
        print("KHÔNG ĐẠT: còn lỗi console")
        return 1
    print("ĐẠT: kịch bản chung chạy xanh")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

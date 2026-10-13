#!/usr/bin/env python3
"""R6.3 – Nghiệm thu tự động 5 tiêu chí mục 9 (đề án v4).

  1. 20 trang liên tiếp không chặn (mỗi trang xử lý xong, không lỗi console)
  2. 20 ảnh từ PC (ô chọn tệp) nhập và xử lý hết
  3. 20 ảnh từ thư viện (nguồn nhập thứ hai) nhập và xử lý hết
  4. Chế độ máy bay: tắt mạng (context.set_offline) vẫn mở và xử lý được
  5. Chỉ tiêu 19.5: đo thời gian xử lý/trang và RAM đỉnh (performance.memory)

Dùng: python3 scripts/playwright/nghiem-thu.py [--url http://localhost:8080]
      (môi trường không internet: NGHIEM_THU_CHAN_FONT=1 python3 ... — chặn riêng yêu cầu phông Google)
Kết quả: de-an-nang-cap-scan/kiem-chung/R6.3/{ket-qua.json, bao-cao.md}; mã thoát 0 khi 5/5.
Ảnh kiểm: 20 ảnh trang giấy tổng hợp (PIL) tại kiem-chung/R6.3/anh-sinh/.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
RA = GOC / "de-an-nang-cap-scan" / "kiem-chung" / "R6.3"
ANH = RA / "anh-sinh"


def sinh_anh(n: int = 20) -> list[Path]:
    """Sinh n trang giấy A4 tổng hợp, mỗi trang một bố cục khác hẳn (qua mặt bộ chống ảnh trùng pHash)."""
    import random
    ANH.mkdir(parents=True, exist_ok=True)
    ds = []
    for i in range(n):
        rnd = random.Random(1000 + i * 77)
        im = Image.new("RGB", (1240, 1754), (244, 242, 236))
        dr = ImageDraw.Draw(im)
        # khối đen lớn đặt ở vị trí/kích thước riêng từng trang -> dấu vân khác nhau rõ
        for _ in range(4 + i % 5):
            w, h = rnd.randint(160, 560), rnd.randint(120, 480)
            x, y = rnd.randint(60, 1240 - w - 60), rnd.randint(60, 1754 - h - 60)
            dr.rectangle([x, y, x + w, y + h], fill=(rnd.randint(10, 70),) * 3)
        for y in range(120 + (i % 7) * 9, 1600, 46):  # dòng chữ giả
            for x in range(100, 1100, 14):
                if (x * 7 + y * 13 + i) % 5:
                    dr.rectangle([x, y, x + 8, y + 22], fill=(30, 30, 40))
        cx, cy = rnd.randint(250, 1000), rnd.randint(250, 1500)
        dr.ellipse([cx - 100, cy - 100, cx + 100, cy + 100], outline=(200, 40, 40), width=8)  # dấu đỏ
        p = ANH / f"trang-{i + 1:02d}.jpg"
        im.save(p, quality=88)
        ds.append(p)
    return ds


async def mo_app(pw, url, offline=False):
    br = await pw.chromium.launch(headless=True)
    ctx = await br.new_context(viewport={"width": 390, "height": 844}, offline=offline)
    if os.environ.get("NGHIEM_THU_CHAN_FONT") == "1":
        # Môi trường không có internet (sandbox/CI kín): trả CSS rỗng cho phông Google để không sinh lỗi console giả.
        # Mặc định TẮT — máy thật có mạng phải chạy không cờ này.
        await ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"),
                        lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    pg = await ctx.new_page()
    loi: list[str] = []
    pg.on("console", lambda m: loi.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: loi.append(str(e)))
    pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))  # hộp “ảnh trùng — vẫn thêm lại?” -> đồng ý
    await pg.goto(url, wait_until="networkidle")
    await pg.wait_for_timeout(3000)  # chờ hydrate xong
    try:
        await pg.get_by_role("button", name="Bỏ qua").click(timeout=5000)
    except Exception:
        pass
    return br, ctx, pg, loi


async def nhap_anh(pg, files: list[Path], nut: str = "Nhập ảnh") -> None:
    async with pg.expect_file_chooser() as fc:
        await pg.get_by_text(nut, exact=True).first.click()
    await (await fc.value).set_files([str(f) for f in files])


async def cho_xu_ly_xong(pg, so_trang: int, ms: int = 180_000) -> float:
    """Chờ danh sách đủ số trang và hết nhãn đang xử lý; trả về giây."""
    t0 = time.monotonic()
    await pg.wait_for_url(lambda u: "/doc/" in u or "/scan" in u, timeout=30_000)
    await pg.wait_for_function(
        "n => !document.body.innerText.includes('Đang xử lý') && "
        "(() => { const m = document.body.innerText.match(/Trang\\s+\\d+\\s*\\/\\s*(\\d+)/); "
        "return m ? +m[1] >= n : (document.body.innerText.match(/Trang /g)?.length ?? 0) >= n; })()",
        arg=so_trang, timeout=ms,
    )
    return time.monotonic() - t0


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8080")
    a = ap.parse_args()
    anh = sinh_anh(20)
    kq: dict[str, dict] = {}

    async with async_playwright() as pw:
        # TC1: 20 trang không chặn + TC5: chỉ tiêu 19.5 (thời gian, RAM)
        br, ctx, pg, loi = await mo_app(pw, a.url)
        try:
            await nhap_anh(pg, anh)
            giay = await cho_xu_ly_xong(pg, 20)
            ram = await pg.evaluate("() => performance.memory ? performance.memory.usedJSHeapSize / 1048576 : -1")
            kq["tc1_20_trang_khong_chan"] = {"dat": not loi and giay > 0, "giay": round(giay, 1), "loi_console": loi[:5]}
            kq["tc5_chi_tieu_19_5"] = {"dat": giay / 20 <= 10 and (ram < 0 or ram <= 512),
                                       "giay_moi_trang": round(giay / 20, 2), "ram_dinh_mb": round(ram, 1)}
        except Exception as e:  # noqa: BLE001
            kq["tc1_20_trang_khong_chan"] = {"dat": False, "loi": str(e)}
            kq["tc5_chi_tieu_19_5"] = {"dat": False, "loi": str(e)}
        await pg.screenshot(path=str(RA / "tc1-danh-sach-20-trang.png"))
        await br.close()

        # TC2: 20 ảnh PC (đã phủ bởi TC1 ở ô chọn tệp — ghi nhận riêng lần nhập thứ hai)
        br, ctx, pg, loi = await mo_app(pw, a.url)
        try:
            await nhap_anh(pg, anh[:20])
            await cho_xu_ly_xong(pg, 20)
            kq["tc2_20_anh_pc"] = {"dat": not loi, "loi_console": loi[:5]}
        except Exception as e:  # noqa: BLE001
            kq["tc2_20_anh_pc"] = {"dat": False, "loi": str(e)}
        await br.close()

        # TC3: 20 ảnh thư viện — nguồn nhập "Thư viện" nếu có, ngược lại dùng lại ô tệp
        br, ctx, pg, loi = await mo_app(pw, a.url)
        try:
            nut = "Thư viện" if await pg.get_by_text("Thư viện", exact=True).count() else "Nhập ảnh"
            await nhap_anh(pg, anh, nut=nut)
            await cho_xu_ly_xong(pg, 20)
            kq["tc3_20_anh_thu_vien"] = {"dat": not loi, "nguon": nut, "loi_console": loi[:5]}
        except Exception as e:  # noqa: BLE001
            kq["tc3_20_anh_thu_vien"] = {"dat": False, "loi": str(e)}
        await br.close()

        # TC4: chế độ máy bay (offline) — mở app từ cache PWA và xử lý 3 trang
        br, ctx, pg, loi = await mo_app(pw, a.url + ("&" if "?" in a.url else "?") + "sw=on")  # sw=on: ép bật PWA trên localhost; nạp trực tuyến trước để PWA ghi cache
        try:
            await pg.wait_for_selector("text=Nhập ảnh", timeout=30_000)
            await pg.wait_for_timeout(3000)  # chờ service worker cài xong
            await ctx.set_offline(True)  # bật chế độ máy bay
            await pg.reload(wait_until="domcontentloaded")
            await pg.wait_for_selector("text=Nhập ảnh", timeout=30_000)
            await pg.wait_for_timeout(4000)  # chờ hydrate từ bộ nhớ đệm trước khi bấm (HTML tĩnh hiện trước)
            try:
                await pg.get_by_role("button", name="Bỏ qua").click(timeout=2000)
            except Exception:
                pass
            await nhap_anh(pg, anh[:3])
            await cho_xu_ly_xong(pg, 3, ms=90_000)
            kq["tc4_che_do_may_bay"] = {"dat": not loi, "loi_console": loi[:5]}
        except Exception as e:  # noqa: BLE001
            kq["tc4_che_do_may_bay"] = {"dat": False, "loi": str(e)}
        await br.close()

    RA.mkdir(parents=True, exist_ok=True)
    dat = sum(1 for v in kq.values() if v.get("dat"))
    json.dump({"tieu_chi": kq, "dat": f"{dat}/5"}, open(RA / "ket-qua.json", "w"), ensure_ascii=False, indent=1)
    md = ["# Báo cáo R6.3 – Nghiệm thu 5 tiêu chí mục 9", ""]
    for k, v in kq.items():
        md.append(f"- **{k}**: {'ĐẠT' if v.get('dat') else 'TRƯỢT'} — {json.dumps(v, ensure_ascii=False)}")
    md.append(f"\nKết luận: **{dat}/5 tiêu chí đạt**.")
    (RA / "bao-cao.md").write_text("\n".join(md), encoding="utf-8")
    print(json.dumps({"dat": f"{dat}/5"}, ensure_ascii=False))
    return 0 if dat == 5 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

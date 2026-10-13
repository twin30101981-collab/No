# R6.2 – Bước 1: dựng ảnh NB qua pipeline THẬT của app (renderPage) cho 8 bộ lọc và đo cổng chất lượng R6.1
# trên ảnh thật (TIEP-THEO R6.3c yêu cầu chạy lại kiem-chung-r61 trên ảnh của R6.2).
# Ảnh đầu ra lưu ở de-an-nang-cap-scan/kiem-chung/R6.2/anh-app/ để so-ocr.py chấm OCR.
#
# Hai chế độ:
#   --che-do vite   (mặc định) như kiem-chung-r61.py: cần `npx vite dev --port 8081`, mở /field-test.
#   --che-do goi    không cần node_modules: đóng gói riêng image.ts + quality-gate.ts bằng esbuild
#                   (dùng khi sandbox chặn registry npm). Worker bị tắt → pipeline chạy trên luồng chính
#                   (đúng đường dự phòng "Không có Worker → chạy luồng chính" của worker-call.ts).
#
#   python3 scripts/kiem-chung-r62/chay-app.py --che-do goi --esbuild /đường/dẫn/esbuild
import argparse, asyncio, base64, glob, json, os, subprocess, sys, tempfile
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KC = ROOT + "/de-an-nang-cap-scan/kiem-chung"
BO = KC + "/bo-anh-NB"
OUT = KC + "/R6.2"
FILTERS = ["original", "magic", "auto", "sharp", "mono", "gray", "ink", "eco"]

JS = """async ({b64, filters, dai}) => {
  const im = window.__im ?? await import('/src/lib/image.ts');
  const qg = window.__qg ?? await import('/src/lib/quality-gate.ts');
  const src = URL.createObjectURL(await (await fetch('data:image/jpeg;base64,' + b64)).blob());
  im.releaseRenderCache();
  const t0 = performance.now();
  const info = await im.detectQuadInfo(src);
  const res = { quad: info.quad, sure: info.sure, ms_do_khung: Math.round(performance.now() - t0), ket: {} };
  for (const f of filters) {
    const t1 = performance.now();
    const url = await im.renderPage(src, { quad: info.quad ?? undefined, rotation: 0, filter: f, brightness: 0, contrast: 0, tools: null }, dai);
    const ms = Math.round(performance.now() - t1);
    const o = await im.loadImg(url);
    const cv = document.createElement('canvas'); const s = Math.min(1, 1200 / o.naturalWidth);
    cv.width = Math.round(o.naturalWidth * s); cv.height = Math.round(o.naturalHeight * s);
    const ctx = cv.getContext('2d'); ctx.drawImage(o, 0, 0, cv.width, cv.height);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    res.ket[f] = { cong: qg.measureGate(d, cv.width, cv.height), ms, w: o.naturalWidth, h: o.naturalHeight, url };
  }
  return res;
}"""


def dong_goi(esbuild):
    tmp = tempfile.mkdtemp(prefix="r62-")
    out = tmp + "/goi.js"
    cmd = [esbuild, ROOT + "/scripts/kiem-chung-r62/dau-vao.ts", "--bundle", "--format=iife", "--platform=browser",
           "--target=es2022", "--define:import.meta.url=\"http://localhost/\"", "--outfile=" + out, "--log-level=warning"]
    subprocess.run(cmd, check=True, cwd=ROOT)
    return out


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--che-do", choices=["vite", "goi"], default="vite")
    ap.add_argument("--url", default="http://127.0.0.1:8081")
    ap.add_argument("--esbuild", default="esbuild")
    ap.add_argument("--dai", type=int, default=2339, help="cạnh dài ảnh dựng (px); 2339 = A4 200 dpi (PDF Chuẩn)")
    a = ap.parse_args()
    os.makedirs(OUT + "/anh-app", exist_ok=True)
    imgs = sorted(glob.glob(BO + "/goc/IMG_*.jpg"))
    if not imgs:
        sys.exit("Không có ảnh trong " + BO + "/goc")
    goi = dong_goi(a.esbuild) if a.che_do == "goi" else None
    ket, loi = {}, []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
        pg = await (await b.new_context(viewport={"width": 1280, "height": 1800}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: loi.append(str(e)[:200]))
        if goi:
            await pg.route("http://r62.local/**", lambda r: r.fulfill(body="<!doctype html><html><body></body></html>", content_type="text/html"))
            await pg.add_init_script("delete window.Worker;")
            await pg.goto("http://r62.local/index.html")
            await pg.add_script_tag(path=goi)
        else:
            await pg.goto(a.url + "/field-test", wait_until="networkidle", timeout=120000)
        for f in imgs:
            ten = os.path.basename(f)[:-4]
            b64 = base64.b64encode(open(f, "rb").read()).decode()
            r = await pg.evaluate(JS, {"b64": b64, "filters": FILTERS, "dai": a.dai})
            for k, v in r["ket"].items():
                url = v.pop("url")
                open(f"{OUT}/anh-app/{ten}_{k}.jpg", "wb").write(base64.b64decode(url.split(",", 1)[1]))
            ket[ten] = r
            print(ten, "xong", file=sys.stderr, flush=True)
        await b.close()
    tong = sum(len(v["ket"]) for v in ket.values())
    dat = sum(1 for v in ket.values() for c in v["ket"].values() if c["cong"]["pass"])
    json.dump({"che_do": a.che_do, "dai_px": a.dai, "ca_dat": dat, "so_ca": tong, "chi_tiet": ket, "loi_trang": loi},
              open(OUT + "/ket-qua-app.json", "w"), ensure_ascii=False, indent=1)
    print(json.dumps({"cong_R6.1_tren_anh_NB": f"{dat}/{tong}", "loi_trang": loi}, ensure_ascii=False))


asyncio.run(main())

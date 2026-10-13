# R6.1: kiểm chứng 7 bộ lọc + Khử bóng/Khử nhiễu 3 cấp theo chỉ số 17.4.
# Dựng từng ảnh mẫu qua pipeline thật (renderPage) rồi đo cổng chất lượng
# (quality-gate.ts): độ lệch nền ≤ 8%, ΔL ≥ 60, góc tối ≤ 5% (R6.1c: nới từ 0,2%).
#   python3 scripts/kiem-chung-r61.py
import asyncio, json, base64, glob, os, sys
from playwright.async_api import async_playwright

B = "http://127.0.0.1:8081"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = ROOT + "/de-an-nang-cap-scan/kiem-chung/R6.1"
os.makedirs(OUT, exist_ok=True)
IMGS = sorted(glob.glob(ROOT + "/de-an-nang-cap-scan/kiem-chung/bo-anh-*/goc/IMG_*.jpg"))
# 7 bộ lọc cải thiện (không gồm Màu gốc và 2 bộ lọc-công cụ shadow/denoise)
FILTERS = ["magic", "auto", "sharp", "mono", "gray", "ink", "eco"]
TOOLS = [{"deshadow": l} for l in (1, 2, 3)] + [{"denoise": l} for l in (1, 2, 3)]

# Một lần gọi cho cả ảnh: dò khung 1 lần, dựng mọi cấu hình ở cỡ 1400 px, đo cổng ngay trong trang.
JS = """async (b64)=>{
  const im = await import('/src/lib/image.ts');
  const qg = await import('/src/lib/quality-gate.ts');
  const src = URL.createObjectURL(await (await fetch('data:image/jpeg;base64,'+b64)).blob());
  im.releaseRenderCache(); const info = await im.detectQuadInfo(src);
  const filters = %s;
  const tools = %s;
  const cases = filters.map(f=>({k:f, f, t:null}))
    .concat(tools.map(t=>({k:'auto+'+Object.keys(t)[0]+Object.values(t)[0], f:'auto', t})));
  const res = {};
  for (const c of cases) {
    const out = await im.renderPage(src, {quad: info.quad, rotation: 0, filter: c.f, brightness: 0, contrast: 0, tools: c.t}, 1400);
    const o = await im.loadImg(out);
    const cv = document.createElement('canvas'); const s = Math.min(1, 1200 / o.naturalWidth);
    cv.width = Math.round(o.naturalWidth * s); cv.height = Math.round(o.naturalHeight * s);
    const ctx = cv.getContext('2d'); ctx.drawImage(o, 0, 0, cv.width, cv.height);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    res[c.k] = qg.measureGate(d, cv.width, cv.height);
  }
  return res;
}""" % (json.dumps(FILTERS), json.dumps(TOOLS))

async def main():
    res, errs = {}, []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
        pg = await (await b.new_context(viewport={"width": 1280, "height": 1800}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        await pg.goto(B + "/field-test", wait_until="networkidle", timeout=120000)
        for f in IMGS:
            ten = os.path.basename(f)[:-4]
            b64 = base64.b64encode(open(f, "rb").read()).decode()
            r = await pg.evaluate(JS, b64)
            for k, v in r.items():
                res[f"{ten}|{k}"] = v
            print(ten, "xong", file=sys.stderr, flush=True)
        await b.close()
    tong = len(res)
    dat = sum(1 for v in res.values() if v["pass"])
    theo_loc = {}
    for k, v in res.items():
        cau_hinh = k.split("|")[1]
        t = theo_loc.setdefault(cau_hinh, {"dat": 0, "tong": 0})
        t["tong"] += 1
        t["dat"] += 1 if v["pass"] else 0
    kq = {"nguong": {"do_lech_nen": "<=8%", "deltaL": ">=60", "goc_toi": "<=5%"},
          "so_anh": len(IMGS), "so_ca": tong, "ca_dat": dat, "ti_le_dat": round(dat / tong * 100, 1),
          "theo_cau_hinh": theo_loc, "chi_tiet": res, "loi_trang": errs}
    json.dump(kq, open(OUT + "/ket-qua.json", "w"), ensure_ascii=False, indent=1)
    print(json.dumps({"ca_dat": f"{dat}/{tong}", "theo_cau_hinh": theo_loc, "loi_trang": errs}, ensure_ascii=False, indent=1))

asyncio.run(main())

import asyncio, json, sys, time
# S1 – đo chuẩn: dev server đang chạy, rồi  python3 scripts/do-chuan-s1.py [so_trang] [base_url] [video.mjpeg]
# P1.1: tham số 3 (tuỳ chọn) = tệp MJPEG làm camera giả, dựng từ ảnh vàng V1/V13/Q
from playwright.async_api import async_playwright
N=int(sys.argv[1]) if len(sys.argv)>1 else 10
B=sys.argv[2] if len(sys.argv)>2 else "http://localhost:8080"
V=sys.argv[3] if len(sys.argv)>3 else None
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--enable-precise-memory-info"]+([f"--use-file-for-fake-video-capture={V}"] if V else []))
    pg=await (await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,permissions=["camera"])).new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e)[:200]))
    await pg.goto(B+"/scan",wait_until="networkidle",timeout=90000)
    await pg.evaluate("localStorage.removeItem('ghi-nhanh:perf')")
    await pg.wait_for_timeout(3000)
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelector('[aria-label=\"Chụp liên tục\"]').click()")
    await pg.evaluate("document.querySelector('[aria-label=\"Tự chụp\"]').click()")  # tắt tự chụp để chỉ đo lần bấm tay
    sh=pg.locator("button.shutter"); peak=0; walls=[]
    t_all=time.time()
    for i in range(N):
      await pg.wait_for_function("()=>!document.querySelector('button.shutter').disabled",timeout=60000)
      t=time.time(); await pg.evaluate("document.querySelector('button.shutter').click()"); await pg.wait_for_timeout(50)
      await pg.wait_for_function("()=>!document.querySelector('button.shutter').disabled",timeout=60000)
      walls.append(round((time.time()-t)*1000))
      m=await pg.evaluate("performance.memory?performance.memory.usedJSHeapSize:0"); peak=max(peak,m)
    total=round((time.time()-t_all)*1000)
    await pg.screenshot(path=f"de-an-nang-cap-scan/kiem-chung/{'P1.1/'+V.split('/')[-1].split('.')[0] if V else 's2'}_sau-{N}-trang.png")
    rep=await pg.evaluate("""async()=>{const m=await import('/src/lib/perf-stats.ts');return m.stageReport(m.readPerf());}""")
    print(json.dumps({"trang":N,"tong_ms":total,"nha_nut_tuong_ms":walls,"ram_dinh_MB":round(peak/1048576,1),"cong_doan":rep,"loi_trang":errs},ensure_ascii=False))
    await b.close()
asyncio.run(main())

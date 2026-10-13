# B11: camera giả (3 s mờ → nét). Kiểm: thanh "Độ nét" thấp khi mờ, không tự chụp ảnh mờ, tự chụp khi nét.
# Tạo /tmp/browser/b11/cam.y4m bằng ffmpeg từ kiem-chung/b7_anh-that-trang3.jpg (xem TIEP-THEO.md).
import asyncio, json
from playwright.async_api import async_playwright
B="http://localhost:8080"; OUT="/tmp/browser/b11"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",f"--use-file-for-fake-video-capture={OUT}/cam.y4m"])
    ctx=await b.new_context(viewport={"width":390,"height":844},has_touch=True,device_scale_factor=2,permissions=["camera"])
    pg=await ctx.new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e)[:200])); pg.on("console",lambda m: errs.append(m.text) if "B11" in m.text or "mờ" in m.text else None)
    await pg.goto(B+"/",wait_until="networkidle",timeout=120000)
    await pg.evaluate("async()=>{(await import('/src/lib/settings.ts')).setSettings({onboarded:true,autoCapture:true})}")
    await pg.goto(B+"/scan",wait_until="networkidle"); log=[]
    for i in range(30):
      await pg.wait_for_timeout(500)
      m=pg.get_by_role("meter",name="Độ nét")
      v=await m.get_attribute("aria-valuenow") if await m.count() else None
      rv=await pg.get_by_role("button",name="Giữ trang").count()
      hint=await pg.locator(".scan-hint").first.inner_text() if await pg.locator(".scan-hint").count() else ""
      log.append({"t":round((i+1)*0.5,1),"do_net":v,"diem":await m.get_attribute("data-score") if await m.count() else None,"goi_y":hint,"man_xem_lai":rv>0})
      if i in (3,29) or rv: await pg.screenshot(path=f"{OUT}/b11_{i}.png")
      if rv: break
    print(json.dumps({"log":log,"errs":errs},ensure_ascii=False,indent=1))
    await b.close()
asyncio.run(main())

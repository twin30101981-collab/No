# B12: hồi quy tổng các trang + chụp bằng camera giả, kiểm huy hiệu điểm trang. Cần /tmp/browser/b11/cam.y4m (xem TIEP-THEO.md).
import asyncio, json
from playwright.async_api import async_playwright
B="http://localhost:8080"; OUT="/tmp/browser/b12"
ROUTES=["/","/scan","/documents","/tools","/me","/compare","/id-photo","/measure","/receipts","/trash","/photo-check","/field-test","/tools/history","/sync","/pair","/auth"]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--use-file-for-fake-video-capture=/tmp/browser/b11/cam.y4m"])
    ctx=await b.new_context(viewport={"width":390,"height":844},has_touch=True,device_scale_factor=2,permissions=["camera"],service_workers="block")
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e: errs.append(f"{pg.url}: {str(e)[:200]}"))
    await pg.goto(B+"/",wait_until="networkidle",timeout=120000)
    await pg.evaluate("async()=>{(await import('/src/lib/settings.ts')).setSettings({onboarded:true,autoCapture:true})}")
    res={}
    for i,r in enumerate(ROUTES):
      resp=await pg.goto(B+r,wait_until="networkidle",timeout=90000); await pg.wait_for_timeout(600)
      res[r]=resp.status if resp else None; await pg.screenshot(path=f"{OUT}/r{i:02d}{r.replace('/','_')}.png")
    await pg.goto(B+"/scan",wait_until="networkidle")
    keep=pg.get_by_role("button",name="Giữ trang")
    await keep.wait_for(timeout=20000); await pg.screenshot(path=f"{OUT}/b12_1_chup.png"); await keep.click()
    badge=pg.locator(".grade-badge"); await badge.first.wait_for(timeout=15000)
    info={"diem":await badge.first.inner_text(),"muc":await badge.first.get_attribute("data-grade"),"nhan":await badge.first.get_attribute("aria-label"),"parts":await badge.first.get_attribute("data-parts")}
    await pg.screenshot(path=f"{OUT}/b12_2_diem-trang.png")
    log=await pg.evaluate("JSON.parse(localStorage.getItem('ghi-nhanh:scan-log')||'[]').map(e=>[e.code,e.count||1])")
    print(json.dumps({"routes":res,"badge":info,"log":log,"errs":errs},ensure_ascii=False,indent=1))
    await b.close()
asyncio.run(main())

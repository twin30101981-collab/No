import asyncio, json, base64, glob, os
from playwright.async_api import async_playwright
B="http://localhost:8080"; OUT="/tmp/browser/v0"
JS="""async (b64)=>{
 const im=await import('/src/lib/image.ts');
 const bl=await (await fetch('data:image/jpeg;base64,'+b64)).blob();
 const src=URL.createObjectURL(bl); globalThis.__v0=[]; im.releaseRenderCache();
 const t0=performance.now(); const info=await im.detectQuadInfo(src); const det=performance.now()-t0;
 const edit={quad:info.quad,rotation:0,filter:'auto',brightness:0,contrast:0};
 const t1=performance.now(); const prev=await im.renderPreview(src,edit); const tPrev=performance.now()-t1;
 const s1=[...globalThis.__v0]; globalThis.__v0=[];
 const t2=performance.now(); const out=await im.renderPage(src,edit); const tFull=performance.now()-t2;
 const o=await im.loadImg(out);
 return {detectMs:Math.round(det),sure:info.sure,previewMs:Math.round(tPrev),previewSteps:s1,fullMs:Math.round(tFull),fullSteps:globalThis.__v0,out:[o.naturalWidth,o.naturalHeight],heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null};
}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--enable-precise-memory-info","--enable-unsafe-swiftshader"])
    pg=await (await b.new_context(viewport={"width":1280,"height":1800},service_workers="block")).new_page()
    errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)[:200]))
    await pg.goto(B+"/field-test",wait_until="networkidle",timeout=120000)
    await pg.screenshot(path=OUT+"/field-test.png")
    res={}
    for f in sorted(glob.glob(OUT+"/IMG_*.jpg")):
      r=await pg.evaluate(JS,base64.b64encode(open(f,'rb').read()).decode()); res[os.path.basename(f)]=r; print(os.path.basename(f),json.dumps(r))
    json.dump({"anh":"3 ảnh Q phóng lên 3000x4000 (12 MP)","may":"máy chủ, Chromium headless","ket_qua":res,"loi_trang":errs},open(OUT+"/so-do-V0.json","w"),ensure_ascii=False,indent=1)
    print("errs",errs); await b.close()
asyncio.run(main())

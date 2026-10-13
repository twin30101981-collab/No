import asyncio, json
# Kiểm chứng B2b: bunx vite dev --port 8090  rồi  python3 scripts/kiem-chung-b2b.py
from playwright.async_api import async_playwright
B="http://127.0.0.1:8090"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--enable-precise-memory-info"])
    pg=await (await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2)).new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e)[:200]))
    await pg.goto(B+"/scan",wait_until="networkidle",timeout=90000); await pg.wait_for_timeout(2500)
    await pg.screenshot(path="shots/b2b_scan.png")
    out=await pg.evaluate("""async()=>{
      const im=await import('/src/lib/image.ts');
      const mk=(seed)=>{const c=document.createElement('canvas');c.width=4096;c.height=3072;const x=c.getContext('2d');
        x.fillStyle='#555';x.fillRect(0,0,4096,3072);x.fillStyle='#f4f1ea';x.fillRect(500,300,3000,2500);
        x.fillStyle='#222';x.font='60px serif';for(let i=0;i<30;i++)x.fillText('Dòng chữ '+seed+' – '+i,600,450+i*75);
        return c.toDataURL('image/jpeg',0.95);};
      const orig=mk(0); const quad=[[500/4096,300/3072],[3500/4096,300/3072],[3500/4096,2800/3072],[500/4096,2800/3072]];
      const base={quad,rotation:0,filter:'auto',brightness:0,contrast:0};
      const t=async(f)=>{const t0=performance.now();await f();return Math.round(performance.now()-t0);};
      const lan_dau=await t(()=>im.renderPreview(orig,base));
      const doi_loc={};
      for(const f of ['mono','gray','magic','sharp','eco']) doi_loc[f]=await t(()=>im.renderPreview(orig,{...base,filter:f}));
      const quay_lai_auto=await t(()=>im.renderPreview(orig,base));
      const full=await t(()=>im.renderPage(orig,base));
      im.releaseRenderCache(); im.resetDecodePeak();
      const pages=[];for(let i=1;i<=10;i++)pages.push(mk(i));
      const h0=performance.memory.usedJSHeapSize;
      await Promise.all(pages.map(o=>im.renderPreview(o,base)));
      const st=im.renderCacheStats(); im.releaseRenderCache();
      return {lan_dau_ms:lan_dau,doi_loc_ms:doi_loc,quay_lai_ms:quay_lai_auto,dung_3508_ms:full,
        chup10:{giai_ma_dong_thoi_dinh:st.decode.peak,anh_goc_giu_lai:st.decoded,truoc_B2b_dinh:10}};
    }""")
    print(json.dumps({"errors":errs,"b2b":out},ensure_ascii=False))
    await b.close()
asyncio.run(main())

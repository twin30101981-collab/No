import asyncio, json, base64
# Kịch bản kiểm chứng Playwright. Chạy: bunx vite dev --port 8090  rồi  python3 scripts/kiem-chung-b1.py
from playwright.async_api import async_playwright
B="http://127.0.0.1:8090"
R=["/","/scan","/documents","/tools","/me","/compare","/id-photo","/measure","/receipts","/trash","/photo-check","/field-test","/tools/history","/sync","/pair","/auth"]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
    ctx=await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2)
    pg=await ctx.new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(("pageerror",pg.url,str(e)[:200])))
    pg.on("console",lambda m: m.type=="error" and errs.append(("console",pg.url,m.text[:200])))
    res=[]
    for i,r in enumerate(R):
      n=len(errs); await pg.goto(B+r,wait_until="networkidle",timeout=60000); await pg.wait_for_timeout(1200)
      await pg.screenshot(path=f"shots/{i:02d}{r.replace('/','_') or '_home'}.png")
      res.append((r,len(errs)-n))
    # B1 pipeline check
    await pg.goto(B+"/tools",wait_until="networkidle")
    out=await pg.evaluate("""async()=>{
      const im=await import('/src/lib/image.ts'); const fl=await import('/src/lib/files.ts');
      const c=document.createElement('canvas'); c.width=1200; c.height=1600; const x=c.getContext('2d');
      x.fillStyle='#222'; x.fillRect(0,0,1200,1600);
      x.fillStyle='#f4f1ea'; x.beginPath(); x.moveTo(330,420); x.lineTo(870,440); x.lineTo(890,1180); x.lineTo(310,1160); x.closePath(); x.fill();
      x.fillStyle='#111'; x.font='16px serif'; for(let i=0;i<30;i++) x.fillText('Ghi Nhanh – kiem chung B1 dong '+(i+1), 360, 480+i*22);
      const orig=c.toDataURL('image/jpeg',0.95);
      const quad=[[330/1200,420/1600],[870/1200,440/1600],[890/1200,1180/1600],[310/1200,1160/1600]];
      const t=performance.now();
      const src=await im.renderPage(orig,{quad,paper:'a4',filter:'auto',rotation:0,brightness:0,contrast:0},im.targetLong('high'));
      const ms=Math.round(performance.now()-t);
      const img=await new Promise(r=>{const i=new Image(); i.onload=()=>r(i); i.src=src;});
      const blob=await fl.imagesToPdf([src],{size:'high'});
      const buf=new Uint8Array(await blob.arrayBuffer()); let s=''; for(let i=0;i<buf.length;i+=0x8000) s+=String.fromCharCode(...buf.subarray(i,i+0x8000));
      document.body.innerHTML='<div style="padding:8px;font:14px sans-serif;background:#fff"><b>B1: trang dựng '+img.naturalWidth+'×'+img.naturalHeight+' px ('+ms+' ms)</b><br>Ảnh gốc 1200×1600, tờ giấy ~560×740 px<br><img style="width:48%;border:1px solid #999" src="'+orig+'"> <img style="width:48%;border:1px solid #999" src="'+src+'"></div>';
      return {w:img.naturalWidth,h:img.naturalHeight,ms,pdf:btoa(s)};
    }""")
    await pg.wait_for_timeout(500); await pg.screenshot(path="shots/99_b1_pipeline.png")
    open("b1.pdf","wb").write(base64.b64decode(out.pop("pdf")))
    print(json.dumps({"routes":res,"errors":errs,"b1":out},ensure_ascii=False,indent=1))
    await b.close()
asyncio.run(main())

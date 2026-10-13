import asyncio, json, base64
from playwright.async_api import async_playwright
B="http://localhost:8080"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=await (await b.new_context(viewport={"width":1280,"height":1800})).new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e)[:200]))
    await pg.goto(B+"/scan",wait_until="networkidle",timeout=120000); await pg.wait_for_timeout(2000)
    await pg.screenshot(path="/tmp/browser/b7/shots/scan.png")
    out=await pg.evaluate("""async()=>{try{return await (async()=>{
      const dw=await import('/src/lib/dewarp.ts'); const wm=await import('/src/lib/warp-mesh.ts');
      const wc=await import('/src/lib/worker-call.ts'); const im=await import('/src/lib/image.ts');
      window.__step='';const res={pool:wc.poolInfo(), cores:navigator.hardwareConcurrency, cmp:[], real:[]};
      for (const name of ['__b7a.jpg','__b7b.jpg']) {
        window.__step='const img=await';const img=await im.loadImg('/'+name); const W=img.naturalWidth,H=img.naturalHeight;
        const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(img,0,0);
        const sd=x.getImageData(0,0,W,H).data;
        const q=[[W*.1,H*.08],[W*.88,H*.06],[W*.92,H*.9],[W*.08,H*.92]], ow=700, oh=990;
        const curves=dw.edgeCurves(sd,W,H,q);
        window.__step='const g=wm';const g=wm.gpuWarpMesh(img,W,H,q,ow,oh,[ [0,30],null,[0,20],null ]);
        const cpu=dw.warpCurved(sd,W,H,q,ow,oh,[ [0,30],null,[0,20],null ]);
        let s=0,m=0,big=0; if(g) for(let i=0;i<g.length;i+=4) for(let k=0;k<3;k++){const d=Math.abs(g[i+k]-cpu[i+k]); s+=d; if(d>m)m=d; if(d>8)big++;}
        res.cmp.push({name, gpu:!!g, reason:wm.gpuWarpStats.reason, ms:wm.gpuWarpStats.ms, meanDiff: g? s/(ow*oh*3):null, maxDiff:m, over8: big/(ow*oh*3)});
        const t0=performance.now();
        window.__step='const qd=';const qd=await im.detectQuadFromSrc('/'+name);
        window.__step='const url=';const url=await im.renderPage('/'+name,{quad:qd??undefined,rotation:0,filter:'auto',brightness:0,contrast:0}, 2339);
        res.real.push({name, quad:qd, engine:im.warpStats.engine, ms:Math.round(performance.now()-t0), url});
      }
      // pool: 6 việc song song
      window.__step='const jobs=';const jobs=Array.from({length:6},()=>wc.runPixels({op:'gray',d:new Uint8ClampedArray(1200*1600*4).fill(200),W:1200,H:1600}));
      const t1=performance.now(); await Promise.all(jobs); res.poolMs=Math.round(performance.now()-t1); res.pool=wc.poolInfo();
      return res;})()}catch(e){return {fail:String(e&&e.message||e), type:e&&e.type, target:e&&e.target&&e.target.src, step:window.__step}}}""")
    if "fail" in out: print(out); return
    for i,r in enumerate(out["real"]):
      u=r.pop("url"); 
      if isinstance(u,str) and u.startswith("data:"):
        open(f"/tmp/browser/b7/shots/real_{i}.jpg","wb").write(base64.b64decode(u.split(",",1)[1]))
    out["errs"]=errs; print(json.dumps(out,ensure_ascii=False,indent=1))
    await b.close()
asyncio.run(main())

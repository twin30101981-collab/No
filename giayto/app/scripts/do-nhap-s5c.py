import asyncio
from playwright.async_api import async_playwright
JS = """async () => {
 const {normalize} = await import('/src/lib/image.ts'); const {pmapOrdered} = await import('/src/lib/pmap.ts');
 const c = document.createElement('canvas'); c.width=4000; c.height=3000; const x=c.getContext('2d');
 for(let i=0;i<4000;i++){x.fillStyle=`hsl(${i%360},60%,${30+i%50}%)`;x.fillRect(Math.random()*4000,Math.random()*3000,90,60);}
 const blobs=[]; for(let i=0;i<30;i++) blobs.push(await new Promise(r=>c.toBlob(r,'image/jpeg',0.95)));
 const mb=(blobs[0].size/1e6).toFixed(1);
 let t=performance.now(); for(const b of blobs) await normalize(b,3508,0.9); const seq=performance.now()-t;
 t=performance.now(); const out=[]; await pmapOrdered(blobs,3,b=>normalize(b,3508,0.9),r=>{out.push(r)}); const par=performance.now()-t;
 return {mb, cores:navigator.hardwareConcurrency, seq:Math.round(seq), par:Math.round(par), n:out.length};
}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True); pg=await (await b.new_context(viewport={"width":1280,"height":1800})).new_page()
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto("http://localhost:8080/",wait_until="networkidle")
    print(await pg.evaluate(JS), "errors:",errs); await b.close()
asyncio.run(main())

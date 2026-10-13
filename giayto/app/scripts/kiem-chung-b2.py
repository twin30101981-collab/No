import asyncio, json
# Kiểm chứng B2: bunx vite dev --port 8090  rồi  python3 scripts/kiem-chung-b2.py
from playwright.async_api import async_playwright
B="http://127.0.0.1:8090"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
    pg=await (await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2)).new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e)[:200]))
    await pg.goto(B+"/scan",wait_until="networkidle",timeout=60000); await pg.wait_for_timeout(2500)
    await pg.screenshot(path="shots/b2_scan.png")
    out=await pg.evaluate("""async()=>{
      const cap=await import('/src/lib/capture.ts'); const im=await import('/src/lib/image.ts');
      const s=await navigator.mediaDevices.getUserMedia({video:cap.cameraTries()[0]});
      const st=s.getVideoTracks()[0].getSettings(); const caps=s.getVideoTracks()[0].getCapabilities?.()||{};
      const v=document.createElement('video'); v.srcObject=s; v.muted=true; await v.play(); await new Promise(r=>setTimeout(r,500));
      const c=document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight; c.getContext('2d').drawImage(v,0,0);
      const o=await im.normalize(c,cap.CAPTURE_MAX,cap.CAPTURE_Q); const i=await im.loadImg(o);
      // Ảnh 12 MP nhập từ thư viện
      const g=document.createElement('canvas'); g.width=4000; g.height=3000; g.getContext('2d').fillRect(0,0,10,10);
      const gi=await im.loadImg(await im.normalize(g,cap.CAPTURE_MAX,cap.CAPTURE_Q));
      s.getTracks().forEach(t=>t.stop());
      return {camera:[st.width,st.height],maxCam:[caps.width?.max,caps.height?.max],goc:[i.naturalWidth,i.naturalHeight],thuVien:[gi.naturalWidth,gi.naturalHeight]};
    }""")
    print(json.dumps({"errors":errs,"b2":out},ensure_ascii=False))
    await b.close()
asyncio.run(main())

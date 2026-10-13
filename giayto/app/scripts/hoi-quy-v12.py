# V12: hồi quy hình ảnh. Lần đầu (hoặc --cap-nhat) ghi ảnh chuẩn; các lần sau so từng ảnh với chuẩn.
import asyncio, json, base64, glob, os, sys, io
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright
B="http://localhost:8080"; ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE=ROOT+"/progress/V12/chuan"; OUT="/tmp/browser/v12"; os.makedirs(BASE,exist_ok=True); os.makedirs(OUT,exist_ok=True)
IMGS=sorted(glob.glob(ROOT+"/de-an-nang-cap-scan/kiem-chung/bo-anh-*/goc/IMG_*.jpg"))
FILTERS=["auto","sharp","mono","original"]
UPDATE="--cap-nhat" in sys.argv
JS="""async ([b64,filter])=>{
 const im=await import('/src/lib/image.ts');
 const src=URL.createObjectURL(await (await fetch('data:image/jpeg;base64,'+b64)).blob());
 im.releaseRenderCache(); const info=await im.detectQuadInfo(src);
 const out=await im.renderPage(src,{quad:info.quad,rotation:0,filter,brightness:0,contrast:0});
 const o=await im.loadImg(out); const c=document.createElement('canvas'); const s=Math.min(1,800/o.naturalWidth);
 c.width=Math.round(o.naturalWidth*s); c.height=Math.round(o.naturalHeight*s); c.getContext('2d').drawImage(o,0,0,c.width,c.height);
 return {png:c.toDataURL('image/png'),w:o.naturalWidth,h:o.naturalHeight,sure:info.sure};
}"""
def load(d): return np.asarray(Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('L'),dtype=np.int16)
async def main():
  res={}; fails=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=["--enable-unsafe-swiftshader"])
    pg=await (await b.new_context(viewport={"width":1280,"height":1800},service_workers="block")).new_page()
    errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)[:200]))
    await pg.goto(B+"/field-test",wait_until="networkidle",timeout=120000)
    for f in IMGS:
      b64=base64.b64encode(open(f,'rb').read()).decode()
      for flt in FILTERS:
        k=f"{os.path.basename(f)[:-4]}_{flt}"; r=await pg.evaluate(JS,[b64,flt]); a=load(r['png'])
        Image.fromarray(a.astype(np.uint8)).save(f"{OUT}/{k}.png"); ref=f"{BASE}/{k}.png"
        if UPDATE or not os.path.exists(ref): Image.fromarray(a.astype(np.uint8)).save(ref); res[k]={"chuan":"ghi mới","kich_thuoc":[r['w'],r['h']]}; continue
        c=np.asarray(Image.open(ref).convert('L'),dtype=np.int16)
        if c.shape!=a.shape: res[k]={"dat":False,"ly_do":f"đổi cỡ {c.shape}->{a.shape}"}; fails.append(k); continue
        d=np.abs(c-a); mad=float(d.mean()); px=float((d>32).mean()*100); ok=mad<=1.5 and px<=1.0
        res[k]={"dat":ok,"lech_tb":round(mad,3),"diem_lech_pct":round(px,3)}
        if not ok: fails.append(k); Image.fromarray(np.clip(d*4,0,255).astype(np.uint8)).save(f"{OUT}/{k}_lech.png")
    await b.close()
  json.dump({"anh":len(IMGS),"bo_loc":FILTERS,"nguong":"lệch TB ≤1,5 mức và ≤1% điểm lệch >32","ket_qua":res,"khong_dat":fails,"loi_trang":errs},open(ROOT+"/progress/V12/ket-qua-V12.json","w"),ensure_ascii=False,indent=1)
  print("so ca",len(res),"khong dat",fails,"loi trang",errs); sys.exit(1 if fails or errs else 0)
asyncio.run(main())

// HM-11: tỉ lệ điểm tối ở 4 góc sau từng bước (gốc, flatten, autoLevel, docChain). OUT=... node ... http://127.0.0.1:8081 <ảnh> <nhãn>
import { chromium } from "playwright-core";
import fs from "node:fs";
const [BASE, img, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--enable-unsafe-swiftshader"] });
const pg = await (await b.newContext({ viewport: { width: 1280, height: 1800 }, serviceWorkers: "block" })).newPage();
pg.on("pageerror", (e) => console.log("PE", String(e).slice(0, 160)));
await pg.goto(BASE + "/field-test", { waitUntil: "networkidle", timeout: 120000 });
const b64 = fs.readFileSync(img).toString("base64");
const JS = `(async (b64)=>{
  const im = await import('/src/lib/image.ts'); const wc = await import('/src/lib/worker-call.ts');
  const al = await import('/src/lib/auto-level.ts'); const px = await import('/src/lib/pixels.ts'); const idp = await import('/src/lib/ink-deepen.ts');
  const src = URL.createObjectURL(await (await fetch('data:image/jpeg;base64,'+b64)).blob());
  im.releaseRenderCache(); const info = await im.detectQuadInfo(src);
  const out = await im.renderPage(src,{quad:info.quad,rotation:0,filter:'original',brightness:0,contrast:0,tools:null},1400); const o = await im.loadImg(out);
  const cv = document.createElement('canvas'); const s = Math.min(1,1200/o.naturalWidth); cv.width=Math.round(o.naturalWidth*s); cv.height=Math.round(o.naturalHeight*s);
  const x = cv.getContext('2d'); x.drawImage(o,0,0,cv.width,cv.height); const W=cv.width,H=cv.height; const base = x.getImageData(0,0,W,H).data;
  const lstar=(y)=>{const t=y/255;const f=t>0.008856?Math.cbrt(t):7.787*t+16/116;return 116*f-16};
  const cw=Math.round(W*0.05), ch=Math.round(H*0.05); const pos=[[0,0],[W-cw,0],[0,H-ch],[W-cw,H-ch]];
  const frac=(d)=>pos.map(([x0,y0])=>{let k=0,n=0;for(let y=y0;y<y0+ch;y++)for(let x=x0;x<x0+cw;x++){const i=(y*W+x)*4;n++;if(lstar(d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114)<20)k++}return +(k/n*100).toFixed(1)});
  const R = {W,H, quad: !!info.quad}; const keep={};
  const copy=()=>new Uint8ClampedArray(base);
  R.original = frac(base); keep.original=base;
  let d = await wc.runPixels({op:'flatten', d:copy(), W,H}); R.flatten = frac(d); keep.flatten=new Uint8ClampedArray(d);
  d = new Uint8ClampedArray(d); al.autoLevel(d,1.55); R.autoLevel = frac(d); keep.autoLevel=new Uint8ClampedArray(d);
  const d2 = px.docChain(new Uint8ClampedArray(keep.flatten), W,H,false); R.docChain_tu_flatten = frac(d2); keep.docChain=new Uint8ClampedArray(d2);
  const d3 = new Uint8ClampedArray(d2); idp.inkDeepen(d3,170,2.2); R.docChain_inkDeepen = frac(d3);
  // ảnh minh hoạ góc dưới-trái qua các bước
  const S=3, sw=Math.round(cw*S), sh=Math.round(ch*S); const names=['original','flatten','autoLevel','docChain']; const c2=document.createElement('canvas'); c2.width=sw*4+30; c2.height=sh; const g=c2.getContext('2d'); g.fillStyle='#888'; g.fillRect(0,0,c2.width,c2.height);
  names.forEach((nm,k)=>{ const t=document.createElement('canvas'); t.width=W; t.height=H; t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(keep[nm]),W,H),0,0); g.imageSmoothingEnabled=false; g.drawImage(t,0,H-ch,cw,ch,k*(sw+10),0,sw,sh); });
  R.png = c2.toDataURL('image/png'); return R; })`;
const r = await pg.evaluate(`${JS}(${JSON.stringify(b64)})`);
fs.writeFileSync(`${process.env.OUT}/shots/hm11_stages_${tag}.png`, Buffer.from(r.png.split(",")[1], "base64")); delete r.png;
console.log(JSON.stringify(r));
await b.close();

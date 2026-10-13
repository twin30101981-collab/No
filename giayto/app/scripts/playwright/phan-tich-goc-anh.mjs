// HM-11: đo điểm tối từng góc của ảnh kết quả và nguồn của chúng. OUT=<thư mục có shots/> node ... http://127.0.0.1:8081 <ảnh> <nhãn> [bộ lọc]
import { chromium } from "playwright-core";
import fs from "node:fs";
const [BASE, img, tag, filter = "auto"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--enable-unsafe-swiftshader"] });
const pg = await (await b.newContext({ viewport: { width: 1280, height: 1800 }, serviceWorkers: "block" })).newPage();
await pg.goto(BASE + "/field-test", { waitUntil: "networkidle", timeout: 120000 });
const b64 = fs.readFileSync(img).toString("base64");
const JS = `(async (b64, filter)=>{
  const im = await import('/src/lib/image.ts');
  const src = URL.createObjectURL(await (await fetch('data:image/jpeg;base64,'+b64)).blob());
  im.releaseRenderCache(); const info = await im.detectQuadInfo(src);
  const get = async (f) => { const out = await im.renderPage(src,{quad:info.quad,rotation:0,filter:f,brightness:0,contrast:0,tools:null},1400); const o = await im.loadImg(out);
    const cv = document.createElement('canvas'); const s = Math.min(1,1200/o.naturalWidth); cv.width=Math.round(o.naturalWidth*s); cv.height=Math.round(o.naturalHeight*s);
    const x = cv.getContext('2d'); x.drawImage(o,0,0,cv.width,cv.height); return {cv, d:x.getImageData(0,0,cv.width,cv.height).data, W:cv.width, H:cv.height}; };
  const o = await get('original'), a = await get(filter);
  const W=a.W,H=a.H, cw=Math.round(W*0.05), ch=Math.round(H*0.05);
  const names=['trên-trái','trên-phải','dưới-trái','dưới-phải']; const pos=[[0,0],[W-cw,0],[0,H-ch],[W-cw,H-ch]];
  const lstar=(y)=>{const t=y/255;const f=t>0.008856?Math.cbrt(t):7.787*t+16/116;return 116*f-16};
  const rows=[];
  pos.forEach(([x0,y0],k)=>{ let dark=0,n=0,sat=0,ltrung=0,gray=0; const hist={};
    for(let y=y0;y<y0+ch;y++)for(let x=x0;x<x0+cw;x++){ const i=(y*W+x)*4; n++;
      const yl=a.d[i]*0.299+a.d[i+1]*0.587+a.d[i+2]*0.114; if(lstar(yl)<20){dark++;
        const r=o.d[i],g=o.d[i+1],bb=o.d[i+2],mx=Math.max(r,g,bb),mn=Math.min(r,g,bb),c=mx-mn,ly=r*0.3+g*0.59+bb*0.11;
        const kind=(c>=40&&c/mx>=0.35&&ly<170)?'bão hoà-tối':(ly<60?'nguồn rất tối (xám/đen)':(c>=25?'màu nhạt/trung bình':'nguồn sáng/trung bình'));
        hist[kind]=(hist[kind]||0)+1; } }
    rows.push({goc:names[k],toi:+(dark/n*100).toFixed(1),nguonCuaDiemToi:hist}); });
  // ảnh 4 góc ghép (nguồn trên, kết quả dưới) để xem
  const S=4, cv=document.createElement('canvas'); cv.width=cw*4*S+30; cv.height=ch*2*S+10; const c2=cv.getContext('2d'); c2.fillStyle='#888'; c2.fillRect(0,0,cv.width,cv.height);
  pos.forEach(([x0,y0],k)=>{ c2.imageSmoothingEnabled=false; c2.drawImage(o.cv,x0,y0,cw,ch,k*(cw*S+10),0,cw*S,ch*S); c2.drawImage(a.cv,x0,y0,cw,ch,k*(cw*S+10),ch*S+10,cw*S,ch*S); });
  return {rows, W, H, png: cv.toDataURL('image/png')}; })`;
const r = await pg.evaluate(`${JS}(${JSON.stringify(b64)}, ${JSON.stringify(filter)})`);
fs.writeFileSync(`${process.env.OUT}/shots/hm11_goc_${tag}_${filter}.png`, Buffer.from(r.png.split(",")[1], "base64"));
console.log(`[${tag}/${filter}] ${r.W}×${r.H}`); for (const x of r.rows) console.log(" ", x.goc.padEnd(10), x.toi + "%", JSON.stringify(x.nguonCuaDiemToi));
await b.close();

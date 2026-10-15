const { chromium } = require('/opt/node-tools/node_modules/playwright');
const jsQR = require(process.argv[3]+'/node_modules/jsqr');
const T=['Thửa 131 · Tờ 10.1 · Mỹ Xá','https://tracuuqr.vbdlis.vn/?q=13-69907570','LANDGIS|131|10.1|89.9|20.4241,106.1538|Đạt','x'.repeat(150),'Đường Phạm Ngũ Lão, xóm B, Phúc Trọng, xã Mỹ Xá, thành phố Nam Định — thửa 131 tờ 10.1, 89,9 m², ĐẠT','y'.repeat(260)];
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext()).newPage(); await p.route(/^https?:/,r=>r.abort());
await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(2500);
for (const t of T){
  const m=await p.evaluate(t=>{try{const r=lgMakeQRMatrix(t);return {n:r.n,m:r.m.map(row=>Array.from(row).map(v=>v?1:0))}}catch(e){return {err:e.message}}},t);
  if(m.err){console.log(JSON.stringify(t.slice(0,40)),'ERR',m.err);continue}
  const sc=6,q=4,N=(m.n+2*q)*sc,data=new Uint8ClampedArray(N*N*4).fill(255);
  for(let y=0;y<m.n;y++)for(let x=0;x<m.n;x++)if(m.m[y][x])for(let dy=0;dy<sc;dy++)for(let dx=0;dx<sc;dx++){const i=(((y+q)*sc+dy)*N+((x+q)*sc+dx))*4;data[i]=data[i+1]=data[i+2]=0}
  const d=jsQR(data,N,N);
  console.log(JSON.stringify(t.slice(0,40)),'len',Buffer.byteLength(t),'n',m.n,'decoded',d?(d.data===t?'KHỚP':'SAI: '+d.data.slice(0,30)):'KHÔNG ĐỌC ĐƯỢC');
}
await b.close();})();

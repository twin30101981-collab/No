// Thử nghiệm khả thi: tìm thửa theo diện tích + dãy cạnh (sổ không toạ độ)
const zlib=require('zlib');
let seed=42;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const area=p=>{let s=0;for(let i=0;i<p.length;i++){const j=(i+1)%p.length;s+=p[i][0]*p[j][1]-p[j][0]*p[i][1]}return Math.abs(s)/2};
const edges=p=>p.map((a,i)=>{const b=p[(i+1)%p.length];return Math.hypot(b[0]-a[0],b[1]-a[1])});
const B=[[2259336.23,568027.14],[2259334.17,568027.23],[2259334.42,568031.07],[2259316.85,568031.69],[2259316.59,568031.70],[2259316.99,568036.18],[2259317.37,568036.15],[2259336.65,568034.94]];
const N=20000,parcels=[];
for(let i=0;i<N;i++){const n=4+Math.floor(rnd()*6),cx=2259000+rnd()*3000,cy=567000+rnd()*3000,R=4+rnd()*14;
 const p=[];for(let k=0;k<n;k++){const a=k/n*2*Math.PI+rnd()*0.4,rr=R*(0.7+rnd()*0.5);p.push([+(cx+rr*Math.cos(a)).toFixed(2),+(cy+rr*Math.sin(a)).toFixed(2)])}
 parcels.push({to:String(1+Math.floor(i/400)),thua:String(i%400+1),pts:p});}
// thửa 131 thật: đổi điểm bắt đầu + đảo chiều (dữ liệu CSDL có thể đánh mốc khác sổ)
const rot=B.slice(3).concat(B.slice(0,3)).reverse();
parcels.splice(12345,0,{to:'10.1',thua:'131',pts:rot});
// tiền xử lý: diện tích + cạnh
const t0=Date.now();parcels.forEach(p=>{p.A=area(p.pts);p.E=edges(p.pts)});const tPre=Date.now()-t0;
function score(qE,qA,p){ if(p.E.length!==qE.length) return 0;
 const tol=0.05*Math.sqrt(qA)+0.0003*qA; if(Math.abs(p.A-qA)>Math.max(3*tol,0.03*qA)) return 0;
 let best=1e9;const n=qE.length;
 for(const dir of [1,-1])for(let s=0;s<n;s++){let e=0;for(let k=0;k<n;k++){const j=((s+dir*k)%n+n)%n;e+=Math.abs(p.E[j]-qE[k])}best=Math.min(best,e)}
 const meanErr=best/n; return Math.max(0,1-meanErr/0.5)*Math.max(0,1-Math.abs(p.A-qA)/(3*tol+1e-9))};
// truy vấn: cạnh như in trên sổ, diện tích hình học 91,29
const qE=[2.06,3.85,17.58,0.26,4.50,0.38,19.32,7.81],qA=91.29;
const t1=process.hrtime.bigint();const res=parcels.map(p=>({p,s:score(qE,qA,p)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,3);
const tq=Number(process.hrtime.bigint()-t1)/1e6;
// cỡ gói: JSON gọn + gzip
const pack=JSON.stringify(parcels.map(p=>[p.to,p.thua,p.pts.map(q=>[Math.round((q[0]-2259000)*100),Math.round((q[1]-567000)*100)])]));
const gz=zlib.gzipSync(pack,{level:9}).length;
console.log(JSON.stringify({parcels:parcels.length,preprocessMs:tPre,queryMs:+tq.toFixed(1),top:res.map(x=>({to:x.p.to,thua:x.p.thua,score:+(x.s*100).toFixed(0),A:+x.p.A.toFixed(2)})),packRawKB:Math.round(pack.length/1024),packGzipKB:Math.round(gz/1024),bytesPerParcelGzip:+(gz/parcels.length).toFixed(1)}));

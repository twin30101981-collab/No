// Thử nghiệm: xác định thửa giáp ranh theo từng cạnh + đối chiếu mốc chung giữa 2 sổ
const A={id:'131',to:'10.1',pts:[[2259336.23,568027.14],[2259334.17,568027.23],[2259334.42,568031.07],[2259316.85,568031.69],[2259316.59,568031.70],[2259316.99,568036.18],[2259317.37,568036.15],[2259336.65,568034.94]]};
// Láng giềng giả lập: 130 (phía Tây, chung cạnh 3–4 khít), 132 (phía Đông, chung cạnh 7–8 nhưng mốc 8 trên sổ 132 lệch 0,12 m)
const N=[
 {id:'130',to:'10.1',pts:[[2259334.42,568031.07],[2259334.30,568024.10],[2259316.70,568024.80],[2259316.85,568031.69]]},
 {id:'132',to:'10.1',pts:[[2259317.37,568036.15],[2259317.80,568041.20],[2259336.95,568040.10],[2259336.77,568034.94]]},
 {id:'88',to:'12',pts:[[2259400,568100],[2259410,568100],[2259410,568110],[2259400,568110]]}];
const TOL=0.10, VTOL=0.30;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1], len=a=>Math.hypot(a[0],a[1]);
function segOverlap(p1,p2,q1,q2){ // độ dài phần chung của 2 đoạn gần thẳng hàng
  const d=sub(p2,p1),L=len(d),u=[d[0]/L,d[1]/L],n=[-u[1],u[0]];
  const off1=Math.abs(dot(sub(q1,p1),n)),off2=Math.abs(dot(sub(q2,p1),n));
  if(off1>TOL||off2>TOL) return 0;
  const t1=dot(sub(q1,p1),u),t2=dot(sub(q2,p1),u);
  return Math.max(0,Math.min(L,Math.max(t1,t2))-Math.max(0,Math.min(t1,t2)));}
function dirName(p1,p2,poly){ // hướng pháp tuyến ra ngoài của cạnh (X = Bắc, Y = Đông)
  let sa=0;for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;sa+=poly[i][0]*poly[j][1]-poly[j][0]*poly[i][1]}
  const d=sub(p2,p1);let n=sa>0?[d[1],-d[0]]:[-d[1],d[0]]; // ngoài = phải nếu vòng ngược chiều kim đồng hồ trong hệ (X,Y)
  // kiểm lại bằng điểm thử: trung điểm + n nhỏ phải nằm ngoài đa giác
  const m=[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2],L=len(n),t=[m[0]+n[0]/L*0.05,m[1]+n[1]/L*0.05];
  let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>t[1])!==(yj>t[1]))&&(t[0]<(xj-xi)*(t[1]-yi)/(yj-yi)+xi))inside=!inside}
  if(inside)n=[-n[0],-n[1]];
  let az=Math.atan2(n[1],n[0])*180/Math.PI; if(az<0)az+=360;
  return ['Bắc','Đông Bắc','Đông','Đông Nam','Nam','Tây Nam','Tây','Tây Bắc'][Math.round(az/45)%8];}
const rows=[];
A.pts.forEach((p1,i)=>{const p2=A.pts[(i+1)%A.pts.length];const L=len(sub(p2,p1));
  const hits=[];N.forEach(nb=>nb.pts.forEach((q1,j)=>{const q2=nb.pts[(j+1)%nb.pts.length];const ov=segOverlap(p1,p2,q1,q2);if(ov>0.2)hits.push(nb.to+'/'+nb.id+' ('+ov.toFixed(2)+' m)')}));
  rows.push({canh:(i+1)+'–'+((i+1)%A.pts.length+1),dai:+L.toFixed(2),huong:dirName(p1,p2,A.pts),giap:hits.join(', ')||'—'});});
// mốc chung: đỉnh của A gần đỉnh láng giềng
const moc=[];N.forEach(nb=>{const used=new Set();A.pts.forEach((p,i)=>{let best=null;nb.pts.forEach((q,j)=>{if(used.has(j))return;const d=len(sub(p,q));if(d<0.20&&(!best||d<best.d))best={j,d}});
  if(best){used.add(best.j);moc.push({moc:i+1,thua:nb.to+'/'+nb.id,lech_m:+best.d.toFixed(3),ket_luan:best.d<=0.05?'khớp':'LỆCH — cần đối chiếu 2 sổ'})}})});
const tuCan={};rows.forEach(r=>{if(r.giap!=='—'){(tuCan[r.huong]=tuCan[r.huong]||new Set()).add(r.giap.replace(/ \(.*/,''))}});
console.log(JSON.stringify({canh:rows,mocChung:moc,tuCan:Object.fromEntries(Object.entries(tuCan).map(([k,v])=>[k,[...v]]))},null,1));

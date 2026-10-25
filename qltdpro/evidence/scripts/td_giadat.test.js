const fs=require('fs');const TD=require('./td_giadat.js');const G=TD.giadat;let p=0,f=0;const ok=(n,c,x)=>{if(c)p++;else{f++;console.log('FAIL',n,x)}};
const W={P:[['1','Đường A','Đoạn 1','Đoạn 2',100,50,75,60,30,45,0,0,0,0,0,0],['2','Đường B','Đoạn 1','Đoạn 2',90,40,70,0,0,0,0,0,0,0,0,0],['3','Đường C','X','Y',10,5,7.5,0,0,0,0,0,0,0,0,0]]};
const UB={P:{'đoạn 1|||đoạn 2':[22,8,4,2],'x|||y':[6,3,2,1]}};
const idx=G.index(W);
let r=G.lookupUBND(idx,UB,'P','Đoạn 1','Đoạn  2','Đường A');ok('khoá trùng ⇒ ambiguous, price null',r.ambiguous&&r.price===null&&r.n===2,r);
r=G.lookupUBND(idx,UB,'P','X','Y','Đường C');ok('khoá duy nhất ⇒ có giá',!r.ambiguous&&r.price[0]===6,r);
r=G.lookupUBND(idx,UB,'P','Q','Z','');ok('không có ⇒ null',r.price===null&&!r.ambiguous);
const A=G.audit(W,UB);ok('audit nhóm trùng 1 (2 dòng)',A.dupGroups.length===1&&A.dupRows===2&&A.dupAffectedUBND===2,A);
ok('audit TB lệch: B VT1 tb70≠65',A.tbLech.length===1&&A.tbLech[0].stt==='2',A.tbLech);
ok('audit UBND>thấp nhất: A VT1 22>50? không; C VT1 6>5 có',A.ubndCaoHonThap.some(x=>x.stt==='3'&&x.vt===1),A.ubndCaoHonThap);
// ví dụ tính tay: 15.000 × K1 1,2 × K2(250m² đất ở=0,9) × K4 1,1 × K5 1,02 × H1 1,2 × H2 0,85 
const c=G.compute({dongia:15000,k1:1.2,area:250,loai:'o',k4:1.1,k5:1.02,h1:1.2,h2:0.85});
const hand=15000*1.2*0.9*1.1*1.02*1.2*0.85;ok('tính tay',Math.abs(c.gia-hand)<1e-6&&c.k2===0.9,[c,hand]);
[[0,1],[99,1],[100,.9],[299.9,.9],[300,.8],[500,.7],[999,.7],[1000,.5]].forEach(([a,e])=>ok('K2 ở '+a,G.coeff(a,'o')===e));
[[199,1],[200,.95],[500,.9],[2000,.8],[5000,.7],[10000,.5]].forEach(([a,e])=>ok('K3 nn '+a,G.coeff(a,'nn')===e));
// dữ liệu thật (nếu có)
if(fs.existsSync('/tmp/claude-0/real/W.json')){const RW=JSON.parse(fs.readFileSync('/tmp/claude-0/real/W.json'));const s=fs.readFileSync('/tmp/claude-0/real/UB.json','utf8');const RUB=eval('('+s+')');
 const R=G.audit(RW,RUB);console.log('THẬT',JSON.stringify({rows:R.rows,nhomTrung:R.dupGroups.length,dongTrung:R.dupRows,anhHuongUBND:R.dupAffectedUBND,tbLech:R.tbLech.length,ubndCaoHonThap:R.ubndCaoHonThap.length,khongUBND:R.khongCoUBND,khongGia:R.khongCoGia}));}
console.log('PASS',p,'FAIL',f);process.exit(f?1:0);

const TD=require('./td_doisoat.js');const D=TD.doisoat;let p=0,f=0;const ok=(n,c,x)=>{if(c)p++;else{f++;console.log('FAIL',n,x)}};
const base={dataDate:'20/10/2026',rows:{hs:3,duno:600,kh:2},dash:{duno:600,kh:2,sumLoai:600,sumNhom:600,sumPB:600},snap:{duno:600,kh:2,dayKey:'20/10/2026'},tsbd:{khCon:2,src:'x'},bckh:{mapped:500,unassigned:100},ls:{high:1,total:10}};
let c=D.checks(base),S=D.summary(c);ok('tất cả khớp',S.lech===0&&S.khop===10,S);ok('text',/✅ 10\/10/.test(S.text),S.text);
let b=JSON.parse(JSON.stringify(base));b.dash.sumNhom=550;b.snap.duno=590;c=D.checks(b);S=D.summary(c);ok('phát hiện 2 lệch',S.lech===2&&c.find(x=>x.id==='D3').status==='lech'&&c.find(x=>x.id==='S1').status==='lech',S);
b=JSON.parse(JSON.stringify(base));b.tsbd=null;b.snap=null;b.bckh=null;b.dash=null;c=D.checks(b);S=D.summary(c);ok('thiếu nguồn ⇒ bỏ qua, không lệch',S.lech===0&&S.bo_qua===9,S);
b=JSON.parse(JSON.stringify(base));b.ls={high:9,total:10};c=D.checks(b);ok('LS ≥18% >70% cảnh báo',c.find(x=>x.id==='L1').status==='lech');
const r=D.report(base,D.checks(base),{at:'t',by:'u'});ok('biên bản có kết luận + chỉ tiêu',/Kết luận: ✅/.test(r)&&/\[KHỚP\] D1/.test(r)&&r.split('\n').length>15,r.slice(0,200));
b=JSON.parse(JSON.stringify(base));b.dash.duno=700;ok('biên bản ghi chênh',/chênh: 100/.test(D.report(b,D.checks(b),{})));
console.log('PASS',p,'FAIL',f);process.exit(f?1:0);

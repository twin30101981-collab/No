const TD=require('./td_tsbd.js');const T=TD.tsbd;let p=0,f=0;const ok=(n,c,x)=>{if(c)p++;else{f++;console.log('FAIL',n,x)}};
const R=[{soTS:'A',maKH:'1',giaTriTS:100,giaTriTC:100,tienTe:'VND',loaiTS:'BĐS'},{soTS:'A',maKH:'1',giaTriTS:100,giaTriTC:100,tienTe:'VND',loaiTS:'BĐS'},
 {soTS:'B',maKH:'1',giaTriTS:50,giaTriTC:40,tienTe:'VND',loaiTS:'BĐS'},{soTS:'C',maKH:'2',giaTriTS:7,giaTriTC:7,tienTe:'USD',loaiTS:'Khác'},{soTS:'D',maKH:'3',giaTriTS:30,giaTriTC:0,tienTe:'',loaiTS:'Khác',giuTS:'N'},{soTS:'',maKH:'3',giaTriTS:5,giaTriTC:5}];
const S=T.summarize(R);
ok('rows/unique',S.rows===6&&S.unique===5&&S.dupRows===1&&S.dupKeys===1,S);
ok('Σ VND khử trùng = 100+50+30+5',S.giaTriTS_VND===185,S.giaTriTS_VND);
ok('Σ thô = cộng lặp',S.giaTriTS_raw===292,S.giaTriTS_raw);
ok('USD tách riêng',S.fx.USD&&S.fx.USD[1]===7&&S.fx.USD[0]===1,S.fx);
ok('giữ (trống)',S.hold['(trống)']===5&&S.hold.N===1,S.hold);
const m=T.byKH(R);ok('KH1: A+B, value=100+40',m.get('1').n===2&&m.get('1').value===140,m.get('1'));
ok('KH3: giaTriTC=0 ⇒ dùng clamt',m.get('3').value===35,m.get('3'));
const C=T.coverage(R,{'1':200,'2':10,'3':0,'9':500});
ok('KH còn nợ: 1,2,9',C.khCon===3,C);ok('KH 9 không TS',C.khKhongTS.length===1&&C.khKhongTS[0].key==='9');
ok('KH2 chỉ có USD ⇒ tính là có TS nhưng value 0',C.khCoTS===2,C);
ok('tỷ lệ phủ = 140/(200+10)',Math.abs(C.tyLePhu-140/210)<1e-9,C.tyLePhu);ok('dưới 100%: KH1 (140<200) & KH2',C.duoi100===2,C.duoi100);
ok('rỗng',T.summarize([]).unique===0&&T.coverage([],{}).khCon===0);
console.log('PASS',p,'FAIL',f);process.exit(f?1:0);

const TD=require('./td_cols.js');const C=TD.cols;let p=0,f=0;const ok=(n,c,x)=>{if(c)p++;else{f++;console.log('FAIL',n,x)}};
ok('mặc định theo màn hình',C.defaultPreset(1920)==='g1920'&&C.defaultPreset(1366)==='g1366'&&C.defaultPreset(1800)==='g1920'&&C.defaultPreset(1799)==='g1366'&&C.defaultPreset(390)==='dt'&&C.defaultPreset(699)==='dt'&&C.defaultPreset(700)==='g1366');
ok('preset điện thoại: chỉ 0,4,12,19',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].filter(i=>C.PRESETS.dt.hide.indexOf(i)<0).join()==='0,4,12,19');
ok('sanitize bỏ cột luôn hiện/ngoài phạm vi/trùng',JSON.stringify(C.sanitize([12,4,0,99,-1,6,6,'8']))==='[6,8]');
let r=C.resolve(null,1920);ok('resolve mặc định',r.preset==='g1920'&&r.hide.join()==='6,15,17,18'&&r.pin===true,r);ok('P07 ghim mặc định: bật ≥1280, tắt <1280, tôn trọng lựa chọn đã lưu',C.resolve(null,1280).pin===true&&C.resolve(null,1100).pin===false&&C.resolve({preset:'g1366',pin:false},1920).pin===false&&C.resolve({pin:true},1100).pin===true);
r=C.resolve({preset:'full'},1366);ok('resolve full',r.preset==='full'&&r.hide.length===0);
r=C.resolve({hide:[3,4,12,7]},1920);ok('resolve custom giữ cột luôn hiện',r.preset==='custom'&&r.hide.join()==='3,7',r);
r=C.resolve({preset:'khong-co'},1366);ok('preset lạ ⇒ mặc định',r.preset==='g1366');
ok('preset không ẩn cột luôn hiện',Object.values(C.PRESETS).every(x=>x.hide.every(i=>C.ALWAYS.indexOf(i)<0)));
const w=[84,110,113,127,177,106,110,127,112,139,95,109,95,93,106,126,66,353,390,97];
const wide=w.reduce((a,b)=>a+b,0);const fit=(h)=>w.reduce((a,b,i)=>a+(h.indexOf(i)<0?b:0),0);
ok('tổng rộng đầy đủ ≈2734',Math.abs(wide-2734)<=2);ok('Gọn 1920 ≤ 1842 (vùng bảng ở 1920)',fit(C.PRESETS.g1920.hide)<=1842,fit(C.PRESETS.g1920.hide));ok('Điện thoại ≤ 453 (cột 0,4,12,19)',fit(C.PRESETS.dt.hide)<=453,fit(C.PRESETS.dt.hide));ok('Gọn 1600 ≤ 1560 (vùng bảng ≈1.590 px khi menu cố định) và rộng hơn Gọn 1366',fit(C.PRESETS.g1600.hide)<=1560&&fit(C.PRESETS.g1600.hide)>fit(C.PRESETS.g1366.hide),fit(C.PRESETS.g1600.hide));ok('chuỗi lùi FIT: g1920→g1600→g1366, đều là preset có thật',C.FIT.join()==='g1920,g1600,g1366'&&C.FIT.every(p=>C.PRESETS[p]),C.FIT);
ok('Gọn 1366 ≤ 1290',fit(C.PRESETS.g1366.hide)<=1290,fit(C.PRESETS.g1366.hide));
const pl=C.pinLefts(w,C.PRESETS.g1366.hide);ok('ghim: cột hiện 0,1,4 với left cộng dồn',JSON.stringify(pl)==='[{"i":0,"left":0},{"i":1,"left":84},{"i":4,"left":194}]',pl);
const css=C.css('table-qltd',[6],pl);ok('css ẩn + ghim',/#table-qltd thead th:nth-child\(7\)/.test(css)&&/sticky;left:194px/.test(css),css.slice(0,200));
// HM-17b: đặc tả bảng khác
const SP=C.SPECS;
ok('bảng khác: mặc định Đầy đủ (không tự ẩn), không ghim',['chlm','tsbd','giadat'].every(k=>{const r=C.resolve(null,1366,SP[k]);return r.preset==='full'&&r.hide.length===0&&r.pin===false}));
ok('bảng khác: preset của bảng, preset lạ ⇒ full',C.resolve({preset:'ubnd'},1366,SP.giadat).hide.join()==='4,5,7,8,10,11,13,14'&&C.resolve({preset:'g1366'},1366,SP.chlm).preset==='full');
ok('bảng khác: sanitize theo ncol/always riêng',JSON.stringify(C.sanitize([0,4,10,11,12,99],SP.chlm))==='[11]'&&JSON.stringify(C.sanitize([0,1,15,16],SP.giadat))==='[15]');
ok('bảng khác: preset không ẩn cột luôn hiện, trong phạm vi',Object.values(SP).every(S=>Object.values(S.presets).every(x=>x.hide.every(i=>S.always.indexOf(i)<0&&i<S.ncol))));
const sum=(w,h)=>w.reduce((a,b,i)=>a+(h.indexOf(i)<0?b:0),0); // bề rộng cột đo trên dữ liệu thật 20/10/2026 ở 1366 px
const W={chlm:[31,138,124,136,234,106,158,116,130,95,126,175],tsbd:[37,185,199,170,131,255,214,110,74,160,92,93,130,115,194],giadat:[36,173,238,404,90,96,101,90,96,101,90,96,101,90,96,101]};
ok('Gọn vừa vùng bảng 1288 px ở 1366',sum(W.chlm,SP.chlm.presets.gon.hide)<=1288&&sum(W.tsbd,SP.tsbd.presets.gon.hide)<=1288&&sum(W.giadat,SP.giadat.presets.ubnd.hide)<=1288,[sum(W.chlm,SP.chlm.presets.gon.hide),sum(W.tsbd,SP.tsbd.presets.gon.hide),sum(W.giadat,SP.giadat.presets.ubnd.hide)]);
// tiêu đề Giá đất: hàng 1 = STT,Tên,Từ,Đến (rowspan 2) + VT1..VT4 (colspan 3); hàng 2 = 12 ô giá
const g=C.grid([[{cs:1,rs:2},{cs:1,rs:2},{cs:1,rs:2},{cs:1,rs:2},{cs:3},{cs:3},{cs:3},{cs:3}],Array(12).fill({cs:1})]);
ok('grid: hàng 2 bắt đầu ở cột logic 4 (bỏ qua ô rowspan)',JSON.stringify(g[0].slice(4))==='[[4,7],[7,10],[10,13],[13,16]]'&&JSON.stringify(g[1][0])==='[4,5]'&&JSON.stringify(g[1][11])==='[15,16]',g);
const hU=SP.giadat.presets.ubnd.hide;ok('span: chỉ UBND ⇒ mỗi VT còn 1 cột; chỉ VT1 ⇒ VT2..4 ẩn',g[0].slice(4).map(r=>C.span(r,hU)).join()==='1,1,1,1'&&g[0].slice(4).map(r=>C.span(r,SP.giadat.presets.vt1.hide)).join()==='3,0,0,0');
const gf=C.grid([[{cs:8},{cs:1},{cs:1},{cs:1},{cs:1}]]);ok('dòng tổng Chuyển HM: ô TỔNG colspan 8 ⇒ 6 khi ẩn cột 2,7',C.span(gf[0][0],SP.chlm.presets.gon.hide)===6&&C.span(gf[0][2],SP.chlm.presets.gon.hide)===0);
ok('css bodyOnly không đụng thead',!/thead/.test(C.css('main-table',[4],null,true))&&/#main-table tbody td:nth-child\(5\)/.test(C.css('main-table',[4],null,true)));
console.log('PASS',p,'FAIL',f);process.exit(f?1:0);

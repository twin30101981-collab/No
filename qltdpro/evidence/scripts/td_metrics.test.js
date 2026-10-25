const TD=require('./td_numdate.js'); require('./td_metrics.js'); const M=TD.metrics; let p=0,f=0;const ok=(n,c,x)=>{if(c)p++;else{f++;console.log('FAIL',n,x)}};
const R=(ma,ten,so,hm,due,lai,dn,cb,loai,pb,nhom)=>[ma,ten,so,'','',hm,'',due,'','',lai,dn,cb,loai,'',' ','', pb,nhom];
const rows=[R('1','A','H1',5e9,'10/10/2026',0,1e9,'X','Vay ngắn hạn (TK 211)','Hội Sở','Nhóm 1'),
 R('1','A','H2',5e9,'15/10/2026',1e6,2e9,'X','Vay trung hạn (TK 212)','Hội Sở','Nhóm 2'),
 R('2','B','H3',1e9,'01/12/2026',0,3e9,'','Vay trung và dài hạn','PGD Số 2',''),
 R('','C Ten','H4',1e9,'01/12/2026',0,4e9,'Y','Gì đó lạ','PGD Số 2','Nhóm 9'),
 R('3','D','H5',1e9,'01/12/2026',0,5e9,'Y','Thấu chi trên TK khách hàng','','3'),
 R('4','E','H6',1e9,'01/12/2026',0,6e9,'Y','Vay dài hạn (TK 213)','Hội Sở','Nhóm 3')];
const today=new Date(2026,9,20);
const S=M.summarize(rows,{today});
ok('total',S.totals.duno===21e9&&S.totals.hs===6,S.totals);
ok('KH theo mã: A 2 dòng = 1 KH; 5 KH',S.totals.kh===5,S.totals.kh);
ok('bất biến',M.check(S).length===0,M.check(S));
const L=Object.fromEntries(S.byLoai.map(g=>[g.key,g]));
ok('loại: mỗi dòng đúng 1 loại',L.trunghan.hs+L.daihan.hs===3&&L.nganhan.hs===1,[L.trunghan.hs,L.daihan.hs]);
ok('loại lạ = Khác',L.khac.hs===1&&L.khac.duno===4e9,L.khac);
ok('thấu chi',L.thauchi.hs===1);
const N=Object.fromEntries(S.byNhom.map(g=>[g.key,g]));
ok('nhóm trống/lạ = Không rõ nhóm',N['Không rõ nhóm'].hs===2&&N['Không rõ nhóm'].duno===7e9,N['Không rõ nhóm']);
ok('nhóm "3" = Nhóm 3',N['Nhóm 3'].hs===2,N['Nhóm 3'].hs);
ok('nhomRank',M.nhomRank('Nhóm 4')===4&&M.nhomRank('')===0&&M.nhomRank(null)===0);
ok('PB trống',S.byPB.find(g=>g.key==='(Chưa phân loại)').hs===1);
ok('CBTD trống',S.byCBTD.find(g=>g.key==='(Chưa phân công)').hs===1);
ok('quá hạn 2 khoản (10/10,15/10) <20/10',S.overdue.length===2&&S.overdueDN===3e9,[S.overdue.length,S.overdueDN]);
ok('đến hạn trong tháng 0 (đều đã quá)',S.duehan.length===2,S.duehan.length); // 10/10 và 15/10 ≥ đầu tháng ≤ today
const S2=M.summarize(rows,{today:new Date(2026,9,12)});
ok('ngày dữ liệu 12/10: quá hạn 1 (10/10), đến hạn trong tháng 1',S2.overdue.length===1&&S2.duehan.length===1,[S2.overdue.length,S2.duehan.length]);
// past due map: gộp theo HĐTD, bỏ cleared
const pd={'1|H1':{duNoQH:5e8,laiQH:0},'1|H2':{cleared:true}};
const S3=M.summarize(rows,{today:new Date(2026,9,1),pastDue:pd});
ok('pastDue: H1 vào, H2 cleared bị bỏ',S3.overdue.length===1&&S3.overdueDN===5e8,[S3.overdue.length,S3.overdueDN]);
ok('summarize không đột biến dữ liệu',rows[0][11]===1e9);
ok('rỗng',M.check(M.summarize([],{today})).length===0&&M.summarize([],{today}).totals.kh===0);
ok('dư nợ chữ/NaN không phá',M.summarize([R('9','Z','H',0,'',0,'abc','','','','')],{today}).totals.duno===0);
console.log('PASS',p,'FAIL',f);process.exit(f?1:0);

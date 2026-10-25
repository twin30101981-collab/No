/* td_xlsx: XML hợp lệ, vai trò dòng, kiểu ô; dựng gói bằng JSZip nhúng và (nếu có python3 + openpyxl) đọc lại để kiểm giá trị + định dạng */
const TD=require('./td_numdate.js');require('./td_metrics.js');require('./td_doisoat.js');require('./td_report.js');require('./td_xlsx.js');const X=TD.xlsx;let p=0,f=0;const ok=(n,c,x)=>{if(c)p++;else{f++;console.log('FAIL',n,x)}};
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const Rw=(ma,ten,dn,cb,pb,nh,loai)=>[ma,ten,'H','','',0,'','',9,'','',dn,cb,loai,'',' ','',pb,nh];
const rows=[Rw('1','A & <B>',100,'X','Hội Sở','Nhóm 1','Vay ngắn hạn (TK 211)'),Rw('1','A',50,'X','Hội Sở','Nhóm 1','Vay trung hạn (TK 212)'),Rw('2','B',200,'Y','PGD Số 2','Nhóm 2','Thấu chi'),Rw('3','C',30,'','PGD Số 2','','Lạ')];
const S=TD.metrics.summarize(rows,{today:new Date(2026,9,20)});
const chk=TD.doisoat.checks({dataDate:'20/10/2026',rows:{hs:4,duno:380,kh:3},dash:{duno:380,kh:3,sumLoai:380,sumNhom:380,sumPB:381},snap:null,tsbd:null,bckh:null,ls:{high:0,total:4}});
const sheets=TD.report.sheets({dataDate:'20/10/2026',summary:S,checks:chk,periods:[{key:'a',totals:{duno:1,kh:1,hs:1}},{key:'b',totals:{duno:3,kh:2,hs:2}}],warn:[{title:'x',count:2,kh:1,duno:5}],at:'t',by:'u'});
const T=sheets[0].rows;
ok('cột chữ: A, Z, AA, AZ, BA',[0,25,26,51,52].map(X.col).join()==='A,Z,AA,AZ,BA');
ok('vai trò dòng Tổng hợp',['title','info','info','info','blank','head','total','blank','section','head'].join()===T.slice(0,10).map((r,i)=>X.rowKind(T,i)).join(),T.slice(0,10).map((r,i)=>X.rowKind(T,i)));
ok('kiểu ô: tiền/%/số/tổng',X.styleOf(sheets[0],'data',3,5)===X.S.money&&X.styleOf(sheets[0],'data',4,.5)===X.S.pct&&X.styleOf(sheets[0],'data',1,2)===X.S.int&&X.styleOf(sheets[0],'total',3,9)===X.S.totMoney&&X.styleOf(sheets[0],'data',5,'KHỚP')===X.S.ok&&X.styleOf(sheets[0],'data',5,'LỆCH')===X.S.bad);
const F=X.files(sheets);ok('gói đủ tệp ('+Object.keys(F).length+')',['[Content_Types].xml','_rels/.rels','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml'].every(k=>F[k])&&sheets.every((s,i)=>F['xl/worksheets/sheet'+(i+1)+'.xml']));
ok('thoát ký tự XML (& < >)',/A &amp; &lt;B&gt;/.test(Object.values(F).join(''))||!/A & <B>/.test(Object.values(F).join('')));
ok('tên trang: bỏ ký tự cấm, ≤31, không trùng',(()=>{const u={};const a=X.safeName('a/b:c*?[x]'.repeat(5),u),b=X.safeName('a/b:c*?[x]'.repeat(5),u);return a.length<=31&&!/[\[\]:*?\/\\]/.test(a)&&a!==b})());
ok('số cellXfs = số kiểu khai báo',(X.styles().match(/<xf numFmtId/g)||[]).length-1===Object.keys(X.S).length);
// đóng gói + đọc lại bằng openpyxl
const JSZip=require(path.join(__dirname,'../../src/vendor/jszip.js'));
X.build(sheets,JSZip).then(buf=>{
  const out=path.join(os.tmpdir(),'td_xlsx_test.xlsx');fs.writeFileSync(out,Buffer.from(buf));ok('dựng gói .xlsx ('+buf.length+' byte)',buf.length>2000);
  const py=`import sys,json\nsys.path.insert(0,'/tmp/claude-0/pylib')\nimport openpyxl\nwb=openpyxl.load_workbook(sys.argv[1])\no={'names':wb.sheetnames,'vals':[[list(r) for r in ws.iter_rows(values_only=True)] for ws in wb.worksheets]}\nws=wb.worksheets[0]\nc=lambda a:ws[a]\no['title']=[c('A1').font.b,c('A1').font.sz]\no['head']=[c('A6').font.b,c('A6').fill.fgColor.rgb,c('A6').font.color.rgb if c('A6').font.color else None,c('B6').border.left.style]\no['tot']=[c('A7').font.b,c('D7').number_format,c('E7').number_format,c('D7').font.b]\no['merge']=[str(m) for m in ws.merged_cells.ranges][:2]\no['freeze']=ws.freeze_panes\nbb=wb.worksheets[3]\no['bb']=[(bb.cell(r,6).value,bb.cell(r,6).font.color.rgb if bb.cell(r,6).font.color else None) for r in range(5,bb.max_row+1) if bb.cell(r,6).value in ('KHỚP','LỆCH')]\nprint(json.dumps(o,ensure_ascii=False,default=str))`;
  const r=cp.spawnSync('python3',['-c',py,out],{encoding:'utf8'});
  if(r.status!==0){console.log('… bỏ qua đọc lại (cần python3 + openpyxl):',(r.stderr||'').split('\n').slice(-2).join(' '));}
  else{const o=JSON.parse(r.stdout);
    ok('openpyxl đọc được, đúng tên trang',JSON.stringify(o.names)===JSON.stringify(sheets.map(s=>s.name)),o.names);
    const norm=v=>v==null?'':v;ok('giá trị mọi ô = TD.report.sheets',sheets.every((s,i)=>s.rows.every((row,ri)=>row.every((v,ci)=>norm((o.vals[i][ri]||[])[ci])===v))),'lệch');
    ok('tiêu đề đậm 14',o.title[0]===true&&o.title[1]==14,o.title);
    ok('hàng tiêu đề cột: đậm, nền navy, chữ trắng, viền',o.head[0]===true&&/1A2540$/.test(o.head[1])&&/FFFFFF$/.test(o.head[2])&&o.head[3]==='thin',o.head);
    ok('dòng TỔNG: đậm; dư nợ #,##0; % 0.0%',o.tot[0]===true&&o.tot[1]==='#,##0'&&o.tot[2]==='0.0%'&&o.tot[3]===true,o.tot);
    ok('gộp ô tiêu đề + cố định hàng tiêu đề',o.merge.indexOf('A1:E1')>=0&&o.freeze==='A7',[o.merge,o.freeze]);
    ok('biên bản: KHỚP xanh, LỆCH đỏ',o.bb.some(x=>x[0]==='KHỚP'&&/15803D$/.test(x[1]))&&o.bb.some(x=>x[0]==='LỆCH'&&/B91C1C$/.test(x[1])),o.bb);}
  fs.unlinkSync(out);console.log('PASS',p,'FAIL',f);process.exit(f?1:0);
}).catch(e=>{console.log('FAIL build',e.message);process.exit(1)});

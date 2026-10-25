import json,openpyxl,sys
I=json.load(open('/tmp/claude-0/work1/report_indep.json'))
wb=openpyxl.load_workbook('/tmp/claude-0/work1/baocao.xlsx',data_only=True)
res=[];ck=lambda n,c,x='':res.append(('PASS ' if c else 'FAIL ')+n+('' if c else ' '+str(x)[:300]))
ck('6 trang tính',wb.sheetnames==['Tổng hợp','Theo phòng ban','Theo CBTD','Biên bản đối soát','Xu hướng các kỳ','Cảnh báo sớm'],wb.sheetnames)
ws=wb['Tổng hợp'];R=[[c for c in r] for r in ws.iter_rows(values_only=True)]
ck('ngày dữ liệu 20/10/2026',any(r[0]=='Ngày dữ liệu' and r[1]=='20/10/2026' for r in R))
tong=[r for r in R if r[0]=='TỔNG CỘNG'][0]
ck('TỔNG: KH, khoản, dư nợ khớp tính độc lập',[tong[3],tong[1],tong[2]]==I['tot'],[tong,I['tot']])
loai={r[0]:r for r in R if r[0] in I['loai']}
ck('Theo loại vay: dư nợ/KH/khoản từng loại khớp (4 loại có số liệu)',all(loai[k][3]==v[0] and loai[k][1]==v[1] and loai[k][2]==v[2] for k,v in I['loai'].items()),{k:(loai.get(k),v) for k,v in I['loai'].items() if k not in loai or loai[k][3]!=v[0]})
ck('Σ loại vay = tổng',sum(v[3] for v in loai.values())==I['tot'][0])
nh={r[0]:r[3] for r in R if isinstance(r[0],str) and r[0].startswith('Nhóm ') and isinstance(r[3],(int,float))}
ck('Theo nhóm nợ khớp (Nhóm 1/2) và Σ = tổng',all(nh.get(k,0)==v for k,v in I['nhom'].items()) and sum(nh.values())==I['tot'][0],[nh,I['nhom']])
pct=[r for r in R if r[0]=='TỔNG CỘNG'][0][4];ck('% tổng = 100%',abs(pct-1)<1e-9,pct)
ws=wb['Theo phòng ban'];P={r[0]:r for r in ws.iter_rows(min_row=4,values_only=True) if r[0] and isinstance(r[3],(int,float))}
ck('Theo phòng ban khớp từng phòng',all(P[k][3]==v[0] and P[k][1]==v[1] and P[k][2]==v[2] for k,v in I['pb'].items()),[(k,P.get(k),v) for k,v in I['pb'].items() if k not in P or P[k][3]!=v[0]][:3])
ws=wb['Theo CBTD'];C={r[0]:r for r in ws.iter_rows(min_row=4,values_only=True) if r[0] and r[0]!='TỔNG CỘNG' and isinstance(r[6],(int,float))}
ck('Theo CBTD: dư nợ/KH/khoản từng CBTD khớp',all(C[k][6]==v[0] and C[k][2]==v[1] and C[k][3]==v[2] for k,v in I['cbtd'].items()),[(k,C.get(k),v) for k,v in I['cbtd'].items() if k not in C or C[k][6]!=v[0]][:3])
ck('Theo CBTD: cột ngắn hạn+thấu chi / trung-dài khớp',all(C[k][4]==v[0] and C[k][5]==v[1] for k,v in I['nhtd'].items()),[(k,C.get(k),v) for k,v in I['nhtd'].items() if C[k][4]!=v[0] or C[k][5]!=v[1]][:3])
ws=wb['Biên bản đối soát'];B=list(ws.iter_rows(min_row=5,values_only=True))
ck('Biên bản đối soát: 10 chỉ tiêu, tất cả KHỚP',len([b for b in B if b[0]])==10 and all(b[5]=='KHỚP' for b in B if b[0]),B[:3])
ws=wb['Xu hướng các kỳ'];X=[r for r in ws.iter_rows(min_row=4,values_only=True) if r[0]]
ck('Xu hướng: 2 kỳ (30/09, 20/10) đúng dư nợ & thay đổi',len(X)==2 and X[1][1]==2160375016661 and X[0][1]==2180310962058 and X[1][4]==2160375016661-2180310962058,X)
ws=wb['Cảnh báo sớm'];W=[r for r in ws.iter_rows(min_row=5,values_only=True) if r[0]]
ck('Cảnh báo sớm: 9 mục',len(W)==9,len(W))
fmt=wb['Tổng hợp']['D7'].number_format;ck('định dạng số #,##0 / %',fmt=='#,##0' and wb['Tổng hợp']['E7'].number_format=='0.0%',[fmt,wb['Tổng hợp']['E7'].number_format])
print('\n'.join(res));print('PASS',sum(1 for r in res if r.startswith('PASS')),'FAIL',sum(1 for r in res if r.startswith('FAIL')))

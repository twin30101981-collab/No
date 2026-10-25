import _realenv as E  # P10 (T8)
import sys,json,re,collections
sys.path.insert(0,E.PYLIB)
import xlrd
def mdig(v):
    s=str(v).strip()
    if re.fullmatch(r'[\d.]+e\+?\d+',s,re.I): s='%d'%float(s)
    d=re.sub(r'\D','',s)
    if not d: return ''
    if len(d)>13:d=d[-13:]
    return d.zfill(13)
J=lambda f:json.load(open(E.ROWS+'/rows_'+f+'.json'))
periods=[('31/12/2025','31_12_2025_xlsx'),('31/05/2026','31_05_2026_xlsx'),('30/06/2026','30_06_2026_XLS'),('30/09/2026','30_09_2026_XLS'),('20/10/2026','20_10_2026_XLS')]
cur=J('20_10_2026_XLS')
key=lambda r:('M:'+str(r[0]).strip()) if str(r[0]).strip() else 'N:'+re.sub(r'\s+',' ',str(r[1]).strip()).upper()
dn=collections.defaultdict(float)
for r in cur: dn[key(r)]+=float(r[11] or 0)
top=max(dn,key=dn.get);ma=top[2:]
rank=lambda x:int(re.search(r'\d+',str(x))[0]) if re.search(r'\d+',str(x or '')) else 0
mine=[r for r in cur if key(r)==top];act=[r for r in mine if float(r[11] or 0)>0]
seen={};hm=0
for r in mine:
    k=str(r[2] or '')
    if k and k not in seen: seen[k]=1;hm+=float(r[5] or 0)
out={'key':top,'ma':ma,'ten':mine[0][1],'duno':round(sum(float(r[11]) for r in act)),'nKhoan':len(act),'nHDTD':len({str(r[2] or '') for r in act}),'hmtd':round(hm),'nhom':max(rank(r[18]) for r in act)}
hist=[]
for lab,f in periods:
    rows=J(f);a=[r for r in rows if key(r)==top and float(r[11] or 0)>0];hist.append([lab,round(sum(float(r[11]) for r in a)),len(a),max([rank(r[18]) for r in a] or [0])])
out['hist']=hist
wb=xlrd.open_workbook(E.DATA+'/Sao ke tai san bao dam 20.10.2026.XLS',logfile=open('/dev/null','w'));sh=wb.sheet_by_index(0);h=sh.row_values(0)
R=[dict(zip(h,sh.row_values(i))) for i in range(1,sh.nrows)]
s=set();gt=0;n=0;fx=0
for r in R:
    if mdig(r['plgcustno'] or r['clcustno'])!=mdig(ma): continue
    if r['clno'] in s: continue
    s.add(r['clno']);n+=1
    if r['clccycd'].strip() in('VND',''): gt+= r['plgamt'] if r['plgamt']>0 else r['clamt']
    else: fx+=1
out['ts']={'n':n,'gt':round(gt),'fx':fx}
print(json.dumps(out,ensure_ascii=False))

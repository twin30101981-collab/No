import _realenv as E  # P10 (T8)
import sys,json,re; sys.path.insert(0,E.PYLIB)
import xlrd,collections
def mdig(v):
    s=str(v).strip()
    if re.fullmatch(r'[\d.]+e\+?\d+',s,re.I): s='%d'%float(s)
    d=re.sub(r'\D','',s)
    if not d: return ''
    if len(d)>13:d=d[-13:]
    return d.zfill(13)
wb=xlrd.open_workbook(E.DATA+'/Sao ke tai san bao dam 20.10.2026.XLS',logfile=open('/dev/null','w'));sh=wb.sheet_by_index(0)
h=sh.row_values(0);R=[dict(zip(h,sh.row_values(i))) for i in range(1,sh.nrows)]
rows=json.load(open(E.ROWS+'/rows_20_10_2026_XLS.json'))
dn=collections.defaultdict(float)
for r in rows: dn[mdig(r[0])]+=float(r[11] or 0)
seen=set();U=[]
for r in R:
    if r['clno'] in seen: continue
    seen.add(r['clno']);U.append(r)
vnd=[r for r in U if r['clccycd'].strip() in('VND','')]
out={'unique':len(U),'sumClamtVND':round(sum(r['clamt'] for r in vnd)),'dupRows':len(R)-len(U),'raw':round(sum(r['clamt'] for r in R))}
kh=collections.defaultdict(float);hasts=set()
for r in U:
    k=mdig(r['plgcustno'] or r['clcustno']);hasts.add(k)
    if r['clccycd'].strip() in('VND',''): kh[k]+= r['plgamt'] if r['plgamt']>0 else r['clamt']
con={k:v for k,v in dn.items() if v>0}
khong=[k for k in con if k not in hasts];co=[k for k in con if k in hasts]
out.update(khCon=len(con),khKhongTS=len(khong),khCoTS=len(co),tyLePhu=sum(kh[k] for k in co)/sum(con[k] for k in co),duoi100=sum(1 for k in co if kh[k]<con[k]))
print(json.dumps(out))

import _realenv as E  # P10 (T8)
import sys,json,re,collections,datetime
sys.path.insert(0,E.PYLIB)
import xlrd
def mdig(v):
    s=str(v).strip()
    if re.fullmatch(r'[\d.]+e\+?\d+',s,re.I): s='%d'%float(s)
    d=re.sub(r'\D','',s)
    if not d: return ''
    if len(d)>13:d=d[-13:]
    return d.zfill(13)
today=datetime.date(2026,10,20)
rows=json.load(open(E.ROWS+'/rows_20_10_2026_XLS.json'));prev=json.load(open(E.ROWS+'/rows_30_09_2026_XLS.json'))
def pd(s):
    m=re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})',str(s));return datetime.date(int(m[3]),int(m[2]),int(m[1])) if m else None
def key(r):
    m=str(r[0]).strip();return 'M:'+m if m else 'N:'+re.sub(r'\s+',' ',str(r[1]).strip()).upper()
act=[r for r in rows if float(r[11] or 0)>0]
out={'over':0,'d7':0,'d15':0,'d30':0,'ls':0}
for r in act:
    d=pd(r[7])
    if d:
        k=(d-today).days
        if k<0:out['over']+=1
        elif k<=7:out['d7']+=1
        elif k<=15:out['d15']+=1
        elif k<=30:out['d30']+=1
    try:v=float(str(r[8]).replace('%','').replace(',','.'))
    except:v=0
    if not(v>0) or v<4 or v>=13: out['ls']+=1
rank=lambda x:int(re.search(r'\d+',str(x))[0]) if re.search(r'\d+',str(x or '')) else 0
pm={}
for r in prev: pm[key(r)]=max(pm.get(key(r),0),rank(r[18]))
cur={}
for r in act: cur[key(r)]=max(cur.get(key(r),0),rank(r[18]))
out['nhom']=sum(1 for k,v in cur.items() if v>=2 and k in pm and pm[k]<=1)
# TSBĐ
wb=xlrd.open_workbook(E.DATA+'/Sao ke tai san bao dam 20.10.2026.XLS',logfile=open('/dev/null','w'));sh=wb.sheet_by_index(0)
h=sh.row_values(0);R=[dict(zip(h,sh.row_values(i))) for i in range(1,sh.nrows)]
dn=collections.defaultdict(float)
for r in rows: dn[mdig(r[0])]+=float(r[11] or 0)
base=datetime.date(1899,12,30)
def dt(x):
    return base+datetime.timedelta(days=int(x)) if isinstance(x,float) and x>0 else None
cut=datetime.date(2023,10,20)
seen=set();ex=0;old=0
for r in R:
    k=mdig(r['plgcustno'] or r['clcustno'])
    if dn.get(k,0)<=0: continue
    sk=(r['clno'],k)
    if sk in seen: continue
    seen.add(sk)
    e=dt(r['exprdt']);v=dt(r['ntydt'])
    if e and 1990<=e.year<=2100 and e<today: ex+=1
    if v and 1990<=v.year<=2100 and v<cut: old+=1
out['tsHet']=ex;out['tsCu']=old
has={mdig(r['plgcustno'] or r['clcustno']) for r in R}
out['tsKhong']=sum(1 for k,v in dn.items() if v>0 and k not in has)
print(json.dumps(out))

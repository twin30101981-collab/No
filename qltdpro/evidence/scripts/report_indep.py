import _realenv as E  # P10 (T8)
import sys,json,re,collections,datetime
rows=json.load(open(E.ROWS+'/rows_20_10_2026_XLS.json'))
act=[r for r in rows if float(r[11] or 0)>0]
def loai(v):
    v=str(v or '').lower()
    if re.search(r'thấu\s*chi',v):return 'Thấu chi'
    if re.search(r'ngắn\s*hạn',v):return 'Vay ngắn hạn (TK 211)'
    if re.search(r'trung\s*hạn',v):return 'Vay trung hạn (TK 212)'
    if re.search(r'dài\s*hạn',v):return 'Vay dài hạn (TK 213)'
    return 'Khác (chưa phân loại)'
key=lambda r:('M:'+str(r[0]).strip()) if str(r[0]).strip() else 'N:'+re.sub(r'\s+',' ',str(r[1]).strip()).upper()
def grp(f):
    g=collections.defaultdict(lambda:[0.0,set(),0])
    for r in act:
        k=f(r);g[k][0]+=float(r[11]);g[k][1].add(key(r));g[k][2]+=1
    return {k:[round(v[0]),len(v[1]),v[2]] for k,v in g.items()}
out={'tot':[round(sum(float(r[11]) for r in act)),len({key(r) for r in act}),len(act)],'loai':grp(lambda r:loai(r[13])),'pb':grp(lambda r:r[17] or '(Chưa phân loại)'),'cbtd':grp(lambda r:r[12] or '(Chưa phân công)')}
nh=collections.defaultdict(float)
for r in act:
    m=re.search(r'\d+',str(r[18] or ''));k='Nhóm %s'%m[0] if m and 1<=int(m[0])<=5 else 'Không rõ nhóm';nh[k]+=float(r[11])
out['nhom']={k:round(v) for k,v in nh.items()}
# NH+thấu chi / TDH theo CBTD
nhtd=collections.defaultdict(lambda:[0.0,0.0])
for r in act:
    l=loai(r[13]);c=r[12] or '(Chưa phân công)'
    if l in ('Thấu chi','Vay ngắn hạn (TK 211)'):nhtd[c][0]+=float(r[11])
    elif l in ('Vay trung hạn (TK 212)','Vay dài hạn (TK 213)'):nhtd[c][1]+=float(r[11])
out['nhtd']={k:[round(v[0]),round(v[1])] for k,v in nhtd.items()}
print(json.dumps(out,ensure_ascii=False))

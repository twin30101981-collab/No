import json,sys,collections
sys.path.insert(0,'/tmp/claude-0/-home-user-Land-gis/ff4265b5-f7e8-56b6-a26f-6593fab38265/scratchpad/qltd_s0/pylib')
import xlrd
P='/tmp/claude-0/-home-user-Land-gis/ff4265b5-f7e8-56b6-a26f-6593fab38265/scratchpad/qltd_s0/data_private/'
def truth(f):
    sh=xlrd.open_workbook(P+f).sheet_by_index(0);h=sh.row_values(0);k=h.index('dsbsseq');s=h.index('sprd');b=h.index('dsbsbal')
    return {str(sh.cell_value(r,k)).strip():float(sh.cell_value(r,s) or 0) for r in range(1,sh.nrows) if (sh.cell_value(r,b) or 0)>0}
t=truth('20.10.2026.XLS'); t6=truth('30.06.2026.XLS')
chg=sum(1 for k in t if k in t6 and abs(t[k]-t6[k])>1e-9)
print(f'Khoản có lãi suất khác nhau giữa 30/06 và 20/10 (cùng số khoản vay): {chg}/{sum(1 for k in t if k in t6)}')
for tag in ['before','after']:
    j=json.load(open(P+f'hm03_{tag}.json'));ed=set(j['edited'])
    for stage in ['inSession','reload1','reload2','reload3']:
        rows=j[stage];bad=collections.Counter();n=0;edok=0;edbad=0
        for k,v,m in rows:
            if k in ed and stage in('reload2','reload3'):
                if abs(float(v)-7.77)<1e-9: edok+=1
                else: edbad+=1
                continue
            n+=1
            if k not in t or abs(float(v)-t[k])>1e-9: bad[(v,t.get(k))]+=1
        extra=f' | sửa tay giữ được {edok}/5' if stage in('reload2','reload3') else ''
        print(f'{tag:6} {stage:9} dòng {len(rows)} | sai so với tệp 20/10: {sum(bad.values()):4}{extra}', dict(bad.most_common(3)) if bad else '')

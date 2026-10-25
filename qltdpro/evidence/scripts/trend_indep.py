import _realenv as E  # P10 (T8)
import sys,json,re,datetime,collections
sys.path.insert(0,E.PYLIB)
import xlrd,openpyxl
D=E.DATA+'/'
files=['31.12.2025.xlsx','31.01.2026.xlsx','28.02.2026.xlsx','31.03.2026.xlsx','30.04.2026.xlsx','31.05.2026.xlsx','30.06.2026.XLS','31.07.2026.XLS','31.08.2026.XLS','30.09.2026.XLS','20.10.2026.XLS']
def rd(f):
    if f.lower().endswith('.xls'):
        wb=xlrd.open_workbook(D+f,logfile=open('/dev/null','w'));sh=wb.sheet_by_index(0);h=[str(x).strip().lower() for x in sh.row_values(0)]
        return h,[sh.row_values(i) for i in range(1,sh.nrows)]
    wb=openpyxl.load_workbook(D+f,read_only=True,data_only=True);ws=wb.worksheets[0];it=ws.iter_rows(values_only=True);h=[str(x or '').strip().lower() for x in next(it)];return h,[list(r) for r in it]
out={}
for f in files:
    h,R=rd(f);ib=h.index('brcd');ic=h.index('custnm');idn=h.index('dsbsbal')
    tot=0;kh=collections.defaultdict(float);hs=0
    for r in R:
        if not str(r[ic] or '').strip(): continue
        try:v=float(r[idn] or 0)
        except:v=0
        if v>0:
            m=str(r[ib] or '').strip();k='M:'+m if m else 'N:'+str(r[ic]).strip().upper()
            tot+=v;kh[k]+=v;hs+=1
    out[f]={'duno':round(tot),'kh':sum(1 for v in kh.values() if v>0),'hs':hs}
print(json.dumps(out))

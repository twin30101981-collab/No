import json,sys,collections,datetime,openpyxl
sys.path.insert(0,'/tmp/claude-0/-home-user-Land-gis/ff4265b5-f7e8-56b6-a26f-6593fab38265/scratchpad/qltd_s0/pylib')
P='/tmp/claude-0/-home-user-Land-gis/ff4265b5-f7e8-56b6-a26f-6593fab38265/scratchpad/qltd_s0/data_private/'
def vn(d): return d.strftime('%d/%m/%Y') if isinstance(d,(datetime.datetime,datetime.date)) else None
def truth(f):
    if f.lower().endswith('.xlsx'):
        ws=openpyxl.load_workbook(P+f,read_only=True).active;rows=list(ws.iter_rows(values_only=True));h=[str(x).strip().lower() for x in rows[0]];rows=rows[1:]
        g=lambda r,n:r[h.index(n)]
        return {str(g(r,'dsbsseq')).strip():(float(g(r,'sprd') or 0),float(g(r,'dsbsbal') or 0),vn(g(r,'dsbsdt')),vn(g(r,'dsbsmatdt')),vn(g(r,'apprdt'))) for r in rows if g(r,'custnm')}
    import xlrd
    sh=xlrd.open_workbook(P+f).sheet_by_index(0);h=[str(x).strip().lower() for x in sh.row_values(0)];wb=xlrd.open_workbook(P+f)
    def d(r,n):
        c=sh.cell(r,h.index(n))
        if c.ctype==xlrd.XL_CELL_DATE: return xlrd.xldate_as_datetime(c.value,wb.datemode)
        return None
    return {str(sh.cell_value(r,h.index('dsbsseq'))).strip():(float(sh.cell_value(r,h.index('sprd')) or 0),float(sh.cell_value(r,h.index('dsbsbal')) or 0),vn(d(r,'dsbsdt')),vn(d(r,'dsbsmatdt')),vn(d(r,'apprdt'))) for r in range(1,sh.nrows) if sh.cell_value(r,h.index('custnm'))}
res={}
for tag in ['before','after']:
    j=json.load(open(P+f'hm02_{tag}.json'))
    for mode in j:
        for f,rows in j[mode].items():
            if f.endswith('_errs') or f=='errs' or rows is None: continue
            t=truth(f); n=len(rows); rate=bal=dd=0; ex=collections.Counter(); sumapp=0
            for r in rows:
                k=str(r[0]).strip(); tr=t.get(k)
                if tr is None: rate+=1; continue
                if abs(float(r[1] or 0)-tr[0])>1e-9: rate+=1; ex[(r[1],tr[0])]+=1
                if abs(float(r[2] or 0)-tr[1])>0.5: bal+=1
                if (r[4]!=(tr[2] or '') or r[5]!=(tr[3] or '')) : dd+=1
                sumapp+=float(r[2] or 0)
            print(f'{tag:6} {mode:8} {f:18} dòng app {n:5}/tệp {len(t):5} | sai LS {rate:5} | sai dư nợ {bal:3} | sai ngày GN/ĐH {dd:4} | Σ app {int(sumapp):,} vs tệp {int(sum(v[1] for v in t.values())):,}', dict(ex.most_common(2)) if ex else '')

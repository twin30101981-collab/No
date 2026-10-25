"""Sinh fixture ẩn danh định dạng IPCAS (.xlsx, 87 cột như tệp thật) + expected.json tính độc lập từ chính các dòng vừa sinh.
Không chứa dữ liệu thật: tên 'Khách hàng NNN', mã giả, số cố định theo hạt giống. Chạy: PYTHONPATH=<pylib> python3 make_fixtures.py (cần openpyxl)."""
import json, random, datetime, os
import openpyxl
HDR = ['brcd','custseq','custnm','apprseq','apprdt','apprmatdt','ccy','appramt','dsbsseq','dsbsdt','dsbsmatdt','sprd','sprdpst','dsbsamt','dsbsccy','rpmtamt','intamt','dsbsbal','dsbsamt2','rpmtamt2','intamt2','subunit','custstscd','custtpcd','custtpnm','custdtltpcd','custdtltpnm','ecomist','ecomistnm','taxtpcdloc','taxtpcdlocnm','ofcno','ofcnm','pstintamt','pstintamt2','buscd','lntpcd','lnsbtpcd','lstrpmtdt','lstintchrgprd','nxtrpmtschddt','nxtintschddt','exmtintamt','exmtintamt2','finainsttpcd','finainsttpcdnm','sicdloc','province','provincenm','district','districtnm','zipcd','addr1','secured','fndrstpcd','fndrsnm','exemptint','exemptinttype','fndprpstpcd','fndprpstpcd_code','intrpmtamt','AQCCDFIN','intrpmtamt2','commcd','commmn','grpno','trctcd','trctnm','BSNSSCLTPCD','usrid','usrnm','acramt','lceqa','yrdays','intcmth','intrpymth','inttrmmth','remark','chitiet_htls','ctcv','credittype','lumpartpcd','intparpymnttp','intpymntint','udpcd1','udpcd2','Officeruser']
assert len(HDR) == 87
rnd = random.Random(20261020)
LOAI = ['Vay ngắn hạn (TK 211)', 'Vay trung hạn (TK 212)', 'Vay dài hạn (TK 213)', 'Thấu chi']
CB = ['Cán bộ A', 'Cán bộ B', 'Cán bộ C']
PB = ['Hội Sở', 'PGD Số 1', 'PGD Số 2']
NH = ['Nhóm 1', 'Nhóm 1', 'Nhóm 1', 'Nhóm 2', 'Nhóm 3']
RATES = [8.5, 7.77, 11.0, 4.86, 13.0, 9.2, 6.5, 10.5]
AMTS = [95000, 99999, 1500000000, 250000000, 730000000, 48500000, 2000000000, 120000000, 0]
rows = []
for i in range(320):
    c = i % 120  # 120 khách hàng, một số có nhiều khoản
    due = datetime.datetime(2027, 1 + (i % 12), 1 + (i % 27))
    rows.append({'cif': '99%011d' % (1000 + c), 'name': 'Khách hàng %03d' % (c + 1), 'appr': 'APPR%04d' % c, 'dsbs': 'DSBS%05d' % (10000 + i),
                 'rate': RATES[i % len(RATES)], 'bal': AMTS[i % len(AMTS)] if i % 7 else 0, 'due': due, 'loai': LOAI[i % 4], 'cb': CB[i % 3], 'pb': PB[(i // 3) % 3], 'nh': NH[i % 5]})
wb = openpyxl.Workbook(); ws = wb.active; ws.append(HDR)
for r in rows:
    v = [None] * 87
    v[0], v[1], v[2], v[3] = r['cif'], '9901', r['name'], r['appr']
    v[4], v[5] = datetime.datetime(2025, 1, 15), r['due']
    v[6], v[7], v[8] = 'VND', 3000000000, r['dsbs']
    v[9], v[10], v[11], v[13], v[14], v[15], v[16], v[17] = datetime.datetime(2025, 1, 15), r['due'], r['rate'], r['bal'], 'VND', 0, 0, r['bal']
    v[31], v[32], v[36], v[61], v[67] = '990000001', r['cb'], r['loai'], r['nh'], r['pb']
    v[52] = 'Số 1 Đường Thử'; v[48] = 'Tỉnh Thử'; v[64] = 'Phường Thử'
    ws.append(v)
here = os.path.dirname(os.path.abspath(__file__))
wb.save(os.path.join(here, '20.10.2026.xlsx'))
act = [r for r in rows if r['bal'] > 0]
def grp(key):
    g = {}
    for r in act: g[r[key]] = g.get(r[key], 0) + r['bal']
    return g
exp = {'file': '20.10.2026.xlsx', 'dataDate': '20/10/2026', 'rows': len(rows), 'activeRows': len(act), 'totalDuNo': sum(r['bal'] for r in act), 'customers': len({r['cif'] for r in act}),
       'byLoai': grp('loai'), 'byNhom': grp('nh'), 'byPB': grp('pb'), 'byCBTD': grp('cb'),
       'loans': {r['dsbs']: {'rate': r['rate'], 'bal': r['bal'], 'due': r['due'].strftime('%d/%m/%Y')} for r in rows}}
json.dump(exp, open(os.path.join(here, 'expected.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK', exp['rows'], exp['activeRows'], exp['totalDuNo'], exp['customers'])

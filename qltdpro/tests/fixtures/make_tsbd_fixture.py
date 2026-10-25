"""Sinh fixture ẩn danh SAO KÊ TÀI SẢN BẢO ĐẢM (39 cột như tệp IPCAS thật) + tsbd_expected.json tính độc lập.
Khách hàng giả trùng với 20.10.2026.xlsx (make_fixtures.py, cùng hạt giống công thức). Không chứa dữ liệu thật:
mã TS 'TSF…', tên 'Khách hàng NNN' / 'Chủ TS ngoài NNN', địa chỉ 'Thửa thử NNN'. Giá trị phân loại (loại TS, đơn vị, kiểu thế chấp)
là danh mục chung của IPCAS. Chạy: PYTHONPATH=<pylib> python3 make_tsbd_fixture.py (cần openpyxl)."""
import json, datetime, os, collections
import openpyxl
HDR = ['clno','clcustno','clcustnm','ntydt','mgrdt','cltpcd','cldtltpcd','cltpnm','clqtysz','clunittpcd','clloc','clccycd','clamt','acctno','empno','empnm','rvwopn','plgno','plgdt','plgtpcd','exprdt','plgccycd','avblamtrt','avblamt','plgamt','plgcustno','plgcustnm','apprno','acctkey','rem','subunit','usrid','name_1','usrnm','lnofcno','lnofcnm','trctcd','name_2','clholdcd']
assert len(HDR) == 39
# dư nợ theo KH của fixture dư nợ — cùng công thức với make_fixtures.py
AMTS = [95000, 99999, 1500000000, 250000000, 730000000, 48500000, 2000000000, 120000000, 0]
dn = collections.Counter()
for i in range(320):
    c = i % 120; dn['99%011d' % (1000 + c)] += (AMTS[i % len(AMTS)] if i % 7 else 0)
for c in range(120): dn.setdefault('99%011d' % (1000 + c), 0)
name = lambda c: 'Khách hàng %03d' % (c + 1)
BDS = ('[Bất động sản]', 'Quyền sử dụng đất và tài sản gắn liền trên đất', 'm2 ')
TG = ('[Chứng chỉ tiền gửi]', '[Sổ tiền gửi]', 'ea ')
KIEU = '[Thế chấp cho t/cả các khoản vay (không giới hạn)'
D = datetime.datetime
ts = []  # mỗi phần tử = một dòng sao kê
def add(clno, owner, owner_nm, cust, cust_nm, kind, amt, plg, ccy='VND', hold='N     ', expr=D(2030, 12, 31), nty=D(2025, 6, 1), plgno=None):
    ts.append({'clno': clno, 'clcustno': owner, 'clcustnm': owner_nm, 'plgcustno': cust, 'plgcustnm': cust_nm, 'kind': kind, 'clamt': amt, 'plgamt': plg,
               'ccy': ccy, 'hold': hold, 'expr': expr, 'nty': nty, 'plgno': plgno or ('HDTC' + clno[3:])})
for c in range(100):                                   # 100 KH có 1 TS (VND); 1/4 là tiền gửi; 1/5 không có giá trị thế chấp (⇒ lấy clamt)
    cif = '99%011d' % (1000 + c); amt = 400000000 + 37000000 * c
    add('TSF%05d' % c, cif, name(c), cif, name(c), TG if c % 4 == 0 else BDS, amt, 0 if c % 5 == 0 else round(amt * 0.7),
        hold='N     ' if c % 3 else '      ', expr=D(2026, 1, 15) if c % 17 == 0 else D(2030, 12, 31), nty=D(2022, 3, 1) if c % 11 == 0 else D(2025, 6, 1))
for c in range(20):                                    # 20 KH có thêm TS thứ hai
    cif = '99%011d' % (1000 + c); add('TSF%05d' % (200 + c), cif, name(c), cif, name(c), BDS, 900000000, 600000000)
for c in range(10):                                    # cùng TS thế chấp qua HĐ thứ hai ⇒ dòng trùng clno (chỉ tính 1 lần)
    r = dict(ts[c]); r['plgno'] = 'HDTC2' + r['clno'][3:]; ts.append(r)
for k, c in enumerate(range(100, 105)):                # ngoại tệ: 3 USD, 2 EUR (không cộng vào tổng VND)
    cif = '99%011d' % (1000 + c); add('TSF%05d' % (300 + k), cif, name(c), cif, name(c), TG, 10000 + 1000 * k, 10000 + 1000 * k, ccy='USD' if k < 3 else 'EUR')
for k, c in enumerate(range(105, 110)):                # bên thứ ba: chủ TS khác KH vay
    cif = '99%011d' % (1000 + c); own = '99%011d' % (7000 + k)
    add('TSF%05d' % (400 + k), own, 'Chủ TS ngoài %03d' % (k + 1), cif, name(c), BDS, 1200000000, 800000000)
for k in range(5):                                     # TS của KH không có trong dữ liệu dư nợ
    own = '99%011d' % (5000 + k); add('TSF%05d' % (500 + k), own, 'Chủ TS ngoài %03d' % (10 + k), own, 'Chủ TS ngoài %03d' % (10 + k), BDS, 700000000, 500000000)
here = os.path.dirname(os.path.abspath(__file__))
wb = openpyxl.Workbook(); ws = wb.active; ws.append(HDR)
for i, t in enumerate(ts):
    v = {h: '' for h in HDR}
    v.update(clno=t['clno'], clcustno=t['clcustno'], clcustnm=t['clcustnm'], ntydt=t['nty'], mgrdt=t['nty'], cltpcd=t['kind'][0], cldtltpcd=t['kind'][1], clqtysz=120.5,
             clunittpcd=t['kind'][2], clloc='Thửa thử %03d' % i, clccycd=t['ccy'], clamt=t['clamt'], acctno='              ', empno='990000001    ', empnm='Cán bộ A',
             plgno=t['plgno'], plgdt=D(2025, 1, 15), plgtpcd=KIEU, exprdt=t['expr'], plgccycd=t['ccy'], avblamtrt=70.0, avblamt=0.0, plgamt=t['plgamt'],
             plgcustno=t['plgcustno'], plgcustnm=t['plgcustnm'], apprno='              ', acctkey='990000 - [Chi nhánh thử]', subunit=0.0, usrid='thu', name_1='Có',
             usrnm='Cán bộ A', lnofcno='990000001', lnofcnm='Cán bộ A', trctcd='Hội Sở', name_2='GCN %06d' % i, clholdcd=t['hold'])
    ws.append([v[h] for h in HDR])
F = 'Sao ke tai san bao dam 20.10.2026.xlsx'
wb.save(os.path.join(here, F))
# đáp số độc lập
seen, uniq = set(), []
for t in ts:
    if t['clno'] in seen: continue
    seen.add(t['clno']); uniq.append(t)
fx = {}
for t in uniq:
    if t['ccy'] != 'VND': f = fx.setdefault(t['ccy'], [0, 0]); f[0] += 1; f[1] += t['clamt']
hold = collections.Counter((t['hold'].strip() or '(trống)') for t in ts)
def status(t):  # khớp theo mã KH vay, rồi mã chủ TS (tên KH giả không trùng nên không có khớp theo tên)
    for k in (t['plgcustno'], t['clcustno']):
        if k in dn: return 'con' if dn[k] > 0 else 'tt'
    return 'kct'
st = collections.Counter(status(t) for t in ts)
kh_ts = {t['plgcustno'] for t in uniq if t['ccy'] != 'VND' or (t['plgamt'] or t['clamt']) > 0}
con = [k for k, v in dn.items() if v > 0]
exp = {'file': F, 'rows': len(ts), 'unique': len(uniq), 'dupRows': len(ts) - len(uniq),
       'vnd': sum(t['clamt'] for t in uniq if t['ccy'] == 'VND'), 'fx': fx, 'hold': dict(hold), 'status': dict(st),
       'thirdParty': sum(1 for t in ts if t['clcustno'] != t['plgcustno']),
       'khCon': len(con), 'khCoTS': sum(1 for k in con if k in kh_ts), 'khKhongTS': sum(1 for k in con if k not in kh_ts)}
json.dump(exp, open(os.path.join(here, 'tsbd_expected.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK', json.dumps(exp, ensure_ascii=False))

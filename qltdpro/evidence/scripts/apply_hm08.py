"""HM-08: engine KPI duy nhất TD.metrics (nguồn: td_metrics.js cùng thư mục) + Dashboard dùng engine.
 - Σ theo loại vay / nhóm nợ / phòng ban luôn = tổng; thêm dòng "Khác (chưa phân loại)" và "Không rõ nhóm" (chỉ hiện khi có dữ liệu).
 - Nhóm nợ lấy chữ số (sửa regex /d+/ sai ⇒ nhóm cao nhất của KH ở Top 10 luôn bằng 0 ⇒ lấy dòng cuối).
 - Quá hạn/đến hạn tính trong engine (ngày = todayMidnight ⇒ ngày dữ liệu, HM-07).
Dùng: python3 apply_hm08.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'td_metrics.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:80], s.count(old))
    s = s.replace(old, new)
def cut(a, b, new):  # thay đoạn [a, b) bằng new; a,b phải duy nhất
    global s
    assert s.count(a) == 1 and s.count(b) == 1, (a[:60], s.count(a), b[:60], s.count(b))
    i = s.index(a); j = s.index(b, i); assert j > i
    s = s[:i] + new + s[j:]

rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n\nfunction tdRenderDateChip() { // HM-07")

cut("  // ─── Tính toán tổng hợp\n", "  // ─── Phân loại theo loại vay\n",
"""  // ─── Tính toán tổng hợp (HM-08: TD.metrics — một engine cho mọi con số)
  const _pdMap0 = (window.TD_PASTDUE && TD_PASTDUE.map) || {};
  const MET = TD.metrics.summarize(rows, { today, pastDue: _pdMap0, parseDate: parseVNDate });
  try { const _e = TD.metrics.check(MET); if (_e.length) console.warn('[TD.metrics] bất biến lệch:', _e); } catch (e) {}
  const totalDuNo = MET.totals.duno;
  const totalLai  = MET.totals.lai;
  const totalKH   = MET.totals.kh;
  const totalHMTD = MET.totals.hmtd;

""")
cut("  const CATS = [\n", "  // ─── Quá hạn & sắp đến hạn\n",
"""  const CATS = [
    { name: 'Vay ngắn hạn (TK 211)', key: 'nganhan', chip: 'chip-blue', icon: '💼' },
    { name: 'Vay trung hạn (TK 212)', key: 'trunghan', chip: 'chip-orange', icon: '🏠' },
    { name: 'Vay dài hạn (TK 213)', key: 'daihan', chip: 'chip-red', icon: '🏢' },
    { name: 'Thấu chi', key: 'thauchi', chip: 'chip-purple', icon: '💳' },
    { name: 'Khác (chưa phân loại)', key: 'khac', chip: 'chip-gray', icon: '❔' }, // HM-08: chỉ hiện khi có khoản
  ];
  const stats = {};
  MET.byLoai.forEach(g => { stats[g.key] = { rows: g.rows, khCount: g.kh, hsCount: g.hs, duno: g.duno, hmtd: g.hmtd, lai: g.lai }; });

""")
cut("  const _odRaw = rows.filter(r => {\n", "  // KPI STRIP đã bỏ",
"""  // HM-08: quá hạn/đến hạn do TD.metrics tính (cùng quy tắc cũ; ngày = ngày dữ liệu, HM-07)
  const overdueRows = MET.overdue;
  const duehanRows = MET.duehan;
  const overdueDN = MET.overdueDN;
  const duehanDN  = MET.duehanDN;

""")
rep("  const mainHtml = CATS.map((c, i) => {\n    const s = stats[c.key];\n",
    "  const mainHtml = CATS.filter(c => c.key !== 'khac' || stats.khac.hsCount > 0).map((c, i) => {\n    const s = stats[c.key];\n")
cut("  const NHOM_LIST = ['Nhóm 1'", "  $('tbody-db-nhomno').innerHTML = nhomHtml;",
"""  const nhomChipCls = {'Nhóm 1':'chip-green','Nhóm 2':'chip-blue','Nhóm 3':'chip-orange','Nhóm 4':'chip-red','Nhóm 5':'chip-red','Không rõ nhóm':'chip-gray'};
  const nhomHtml = MET.byNhom.filter(g => g.key !== TD.metrics.NHOM_UNKNOWN || g.hs > 0).map(g => {
    const n = g.key, s = { duno: g.duno, khSet: { size: g.kh } };
    const pct = totalDuNo ? (s.duno/totalDuNo*100) : 0;
    return `<tr>
      <td style="text-align:center"><span class="chip ${nhomChipCls[n]}">${escapeHtml(n)}</span></td>
      <td style="text-align:center;font-variant-numeric:tabular-nums">${fmtNum(s.khSet.size)}</td>
      <td class="money">${fmtMoney(s.duno)}</td>
      <td class="num">${pct.toFixed(2)}%</td>
    </tr>`;
  }).join('');
""")
rep("const nr = parseInt(String(r[18] || '').match(/d+/)?.[0] || '0', 10);", "const nr = TD.metrics.nhomRank(r[18]); // HM-08: regex cũ /d+/ không khớp chữ số")
open(dst, 'w', encoding='utf-8').write(s)
print('OK', len(s.encode('utf-8')))

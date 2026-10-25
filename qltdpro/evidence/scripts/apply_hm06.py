"""HM-06: module số/ngày dùng chung TD.num / TD.date (nguồn: td_numdate.js cùng thư mục).
 - Nhúng module trước parseVNDate toàn cục; parseVNDate toàn cục, bản TDUP5, bản phân kỳ, 2 bản parseNum,
   groupDigits/stripDots (rootfix v6) đều gọi module.
 - smartDateToVN: chỉ coi là số seri Excel khi chuỗi là số thuần (ngày ISO sai như 2026-02-31 không còn thành năm 1905).
Dùng: python3 apply_hm06.py <vao.html> <ra.html>"""
import sys, os, hashlib
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'td_numdate.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:80], s.count(old))
    s = s.replace(old, new)

# 1+2. module + parseVNDate toàn cục
i = s.index('// Parse "dd/mm/yyyy" → Date\nfunction parseVNDate(s) {')
j = s.index('/**\n * smartDateToVN', i)
s = s[:i] + mod.rstrip() + '\n\n// Parse "dd/mm/yyyy" → Date (HM-06: gọi TD.date.parse — hợp lệ hoá ngày, từ chối 31/02)\nfunction parseVNDate(s) { return window.TD.date.parse(s); }\n\n' + s[j:]

# 3. smartDateToVN: số seri Excel chỉ cho chuỗi số thuần
rep("  const num = parseFloat(str);\n  if (!isNaN(num) && num > 1 && num < 100000) return excelSerialToVNDate(num);\n  return str;",
    "  if (/^\\d+(\\.\\d+)?$/.test(str)) { // HM-06: chỉ số thuần mới là seri Excel\n    const num = parseFloat(str);\n    if (!isNaN(num) && num > 1 && num < 100000) return excelSerialToVNDate(num);\n  }\n  return str;")

# 4. TDUP5
rep("""  function parseVNDate(s){
    if(!s) return null;
    s=String(s).trim();
    var m=s.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{2,4})/);
    if(!m) return null;
    var d=+m[1], mo=+m[2]-1, y=+m[3]; if(y<100) y+=2000;
    var dt=new Date(y,mo,d); return isNaN(dt)?null:dt;
  }
  function parseNum(s){
    if(s==null) return 0;
    var t=String(s).replace(/[^\\d.,\\-]/g,'').replace(/\\./g,'').replace(',','.');
    var n=parseFloat(t); return isNaN(n)?0:n;
  }""", """  function parseVNDate(s){ return window.TD.date.find(s); } // HM-06: ngày hợp lệ đầu tiên trong văn bản (không còn cắt nhầm "2026-05-31" thành 26/05/2031)
  function parseNum(s){ return window.TD.num.toNumber(s, 0); } // HM-06""")

# 5. phân kỳ
rep("""  function parseVNDate(s){
    if(!s) return null;
    s=String(s).trim();
    var m=s.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{2,4})/);
    if(!m) return null;
    var d=+m[1], mo=+m[2]-1, y=+m[3]; if(y<100) y+=2000;
    var dt=new Date(y,mo,d); dt.setHours(0,0,0,0);
    return isNaN(dt)?null:dt;
  }""", "  function parseVNDate(s){ return window.TD.date.parse(s); } // HM-06")

# 6. quá hạn (pastdue)
rep("""  function parseNum(s){
    if (s == null) return 0;
    var t = String(s).replace(/[^\\d.,\\-]/g,'').replace(/\\./g,'').replace(',','.');
    var n = parseFloat(t); return isNaN(n) ? 0 : n;
  }""", "  function parseNum(s){ return window.TD.num.toNumber(s, 0); } // HM-06: \"300,000,000\" không còn thành 300")

# 7. rootfix v6
rep("""  function groupDigits(s) {
    var d = String(s == null ? '' : s).replace(/[^\\d]/g, '').replace(/^0+(?=\\d)/, '');
    return d ? d.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') : '';
  }
  function stripDots(s) { return String(s == null ? '' : s).replace(/[^\\d]/g, ''); }""",
    "  function groupDigits(s) { return window.TD.num.groupVND(s); } // HM-06: số thực không còn mất dấu thập phân (×100)\n  function stripDots(s) { return window.TD.num.stripVND(s); }")

open(dst, 'w', encoding='utf-8').write(s)
print('OK', hashlib.sha256(s.encode('utf-8')).hexdigest(), len(s.encode()))

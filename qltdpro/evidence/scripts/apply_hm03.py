"""HM-03: chặn ghi đè lãi suất khi khởi động / khi hiển thị.
 - Gỡ bảng lãi suất cứng 04/06/2026 (__IPCAS_SPRD_PIPE, ~3.700 cặp dsbsseq:sprd).
 - Quy tắc mới: sửa tự động chỉ được thay giá trị KHÔNG hợp lệ (trống, <1, >30); giá trị trông hợp lệ chỉ bị
   ghi đè khi người dùng chủ động (nút Khôi phục L/S) hoặc khi nhập tệp IPCAS mới.
 - Bộ dò "L/S đồng loạt" tự chạy không còn ép ghi đè (force=true).
 - HSVRate.format không còn ghi ngược số vào dữ liệu khi vẽ bảng (chỉ chuẩn hoá chuỗi → số).
Dùng: python3 apply_hm03.py <vao.html> <ra.html>"""
import sys, re, hashlib
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:70], s.count(old))
    s = s.replace(old, new)

# 1. gỡ bảng cứng
i = s.index("window.__IPCAS_SPRD_PIPE = [")
j = s.index("].join('|');", i) + len("].join('|');")
s = s[:i] + "window.__IPCAS_SPRD_PIPE = ''; // HM-03: đã gỡ bảng lãi suất cứng 04/06/2026 — lãi suất chỉ lấy từ tệp IPCAS đang nhập" + s[j:]
rep("window.__IPCAS_RATE_SOURCE = '04.06.2026.xlsx';", "window.__IPCAS_RATE_SOURCE = '';")

# 2. hàm cổng
rep("window.__getSprdTarget = function(r, opts){", """/* HM-03: cổng ghi đè L/S. Sửa tự động chỉ được thay giá trị không hợp lệ (trống, <1, >30);
   giá trị trông hợp lệ chỉ bị ghi đè khi người dùng chủ động (force===true) hoặc khi nhập tệp IPCAS mới. */
window.__rateMayOverwrite = function(r, force){
  if (force === true) return true;
  if (!r) return false;
  var cur = window.HSVRate ? window.HSVRate.toNum(r[8]) : parseFloat(String(r[8]).replace(/,/g, '.'));
  return !isFinite(cur) || cur < 1 || cur > 30;
};
window.__getSprdTarget = function(r, opts){""")

# 3. healOnLoad
rep("if (v !== '' && isFinite(v) && Math.abs((parseFloat(r[8]) || 0) - Number(v)) > 0.001) {",
    "if (v !== '' && isFinite(v) && Math.abs((parseFloat(r[8]) || 0) - Number(v)) > 0.001 && window.__rateMayOverwrite(r, false)) {")

# 4. __healSprdFromFingerprint
rep("      if (!isFinite(cur) || Math.abs(cur - target) > 0.001) {\n        r[8] = Math.round(Number(target) * 100) / 100;\n        if (force || looksComposed) delete r._rateManual;",
    "      if (force !== true && !looksComposed && !window.__rateMayOverwrite(r, false)) return; // HM-03\n      if (!isFinite(cur) || Math.abs(cur - target) > 0.001) {\n        r[8] = Math.round(Number(target) * 100) / 100;\n        if (force || looksComposed) delete r._rateManual;")

# 5. __autoFixRateX100
rep("        if (r._rateManual === true && !looksComposed) return;\n        r[8] = Math.round(Number(target) * 100) / 100;\n        if (looksComposed) delete r._rateManual;",
    "        if (r._rateManual === true && !looksComposed) return;\n        if (force !== true && !looksComposed && !window.__rateMayOverwrite(r, false)) return; // HM-03\n        r[8] = Math.round(Number(target) * 100) / 100;\n        if (looksComposed) delete r._rateManual;")

# 6. repairSprdRatesOnLoad
rep("window.repairSprdRatesOnLoad = function(){", "window.repairSprdRatesOnLoad = function(force){")
rep("if (!r._rateManual || suspectFlag || zeroOrBad || looksComposed || Math.abs(cur - fixed) > 0.001) {",
    "if (force === true || looksComposed || window.__rateMayOverwrite(r, false)) { // HM-03")
rep("(window.repairSprdRatesOnLoad && (window.repairSprdRatesOnLoad().repaired || 0))",
    "(window.repairSprdRatesOnLoad && (window.repairSprdRatesOnLoad(true).repaired || 0))")

# 7. bộ dò đồng loạt tự chạy: không ép ghi đè, nhắc người dùng nhập lại tệp
rep("try { if (window.__healSprdFromFingerprint) healed = window.__healSprdFromFingerprint(true) || 0; } catch(_e){}\n      try { localStorage.setItem('td_uniform_rate_cleaned_v1', '1'); } catch(_e){}",
    "try { if (window.__healSprdFromFingerprint) healed = window.__healSprdFromFingerprint(false) || 0; } catch(_e){}\n      try { localStorage.setItem('td_uniform_rate_cleaned_v1', '1'); } catch(_e){}")
rep("console.warn('[UNIFORM-RATE-HEAL v13.8.8] Phát hiện L/S đồng loạt ' + topVal + '% nhưng chưa có SPRD raw/map để khôi phục; không xoá dữ liệu.');",
    "console.warn('[UNIFORM-RATE-HEAL v13.8.8] Phát hiện L/S đồng loạt ' + topVal + '% nhưng chưa có SPRD raw/map để khôi phục; không xoá dữ liệu.');\n      try { if (typeof showToast === 'function') showToast('⚠ ' + Math.round(ratio*100) + '% khoản có cùng L/S ' + topVal + '% — nghi lỗi nhập cũ. Hãy nhập lại tệp IPCAS (.xls/.xlsx) để lấy đúng lãi suất.', 'red'); } catch(_e){}")

# 8. HSVRate.format không ghi ngược số
rep("if (r && r[8] !== n && isFinite(this.toNum(r[8]))) r[8] = n;",
    "if (r && typeof r[8] === 'string' && r[8] !== n && isFinite(this.toNum(r[8]))) r[8] = n; // HM-03: chỉ chuẩn hoá chuỗi → số")

open(dst, 'w', encoding='utf-8').write(s)
print('OK', hashlib.sha256(s.encode('utf-8')).hexdigest(), 'bytes', len(s.encode()))

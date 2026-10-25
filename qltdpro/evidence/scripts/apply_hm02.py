"""HM-02: bộ đọc .xlsx không biến số thành ngày.
 1. parseXLSX ưu tiên SheetJS (đã sửa ở HM-01) — cùng đường với .xls đã kiểm chứng.
 2. Bộ đọc tự viết giữ làm dự phòng, nhưng chỉ đổi số → ngày khi ô có định dạng ngày (styles.xml),
    xử lý thẻ <c .../> tự đóng, và chọn sheet đầu tiên theo workbook.xml.
 3. loadSheetJS chờ nạp thư viện trì hoãn thay vì báo lỗi.
Dùng: python3 apply_hm02.py <vao.html> <ra.html>"""
import sys, hashlib
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:60], s.count(old))
    s = s.replace(old, new)

# ---- 1. wrapper + đổi tên bộ đọc cũ
rep("""async function parseXLSX(file) {
  const buf = await file.arrayBuffer();
  const zip = unzip(new Uint8Array(buf));
""", """async function parseXLSX(file) {
  // HM-02: ưu tiên SheetJS (cùng đường với .xls); bộ đọc tự viết chỉ là dự phòng khi thư viện không nạp được.
  try {
    if (typeof XLSX === 'undefined' && typeof window.TD_ensureVendors === 'function') await window.TD_ensureVendors();
  } catch (e) { console.warn('[HM-02] Không nạp được thư viện đọc Excel, dùng bộ đọc dự phòng:', e); }
  if (typeof XLSX !== 'undefined') return parseXLS_legacy(file);
  return parseXLSX_fallback(file);
}
async function parseXLSX_fallback(file) {
  const buf = await file.arrayBuffer();
  const zip = unzip(new Uint8Array(buf));
  const _xmlAttr = (a, n) => { const m = new RegExp('\\\\b' + n + '="([^"]*)"').exec(a); return m ? m[1] : null; };
  const _unesc = t => t.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');

  // HM-02: tập chỉ số kiểu (s="n") mang định dạng ngày — chỉ ô thuộc tập này mới được đổi số → ngày
  const dateXf = new Set();
  const stEntry = zip['xl/styles.xml'];
  if (stEntry) {
    const st = new TextDecoder().decode(await inflateEntry(stEntry));
    const customDate = new Set();
    const nfRe = /<numFmt\\b([^>]*?)\\/?>/g;
    let nm;
    while ((nm = nfRe.exec(st))) {
      const id = _xmlAttr(nm[1], 'numFmtId'), code = _xmlAttr(nm[1], 'formatCode');
      if (id == null || code == null) continue;
      const bare = _unesc(code).replace(/"[^"]*"|\\[[^\\]]*\\]|\\\\./g, '');
      if (/[dmyhs]/i.test(bare)) customDate.add(+id);
    }
    const isDateFmt = id => (id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58) || customDate.has(id);
    const xfs = /<cellXfs\\b[^>]*>([\\s\\S]*?)<\\/cellXfs>/.exec(st);
    if (xfs) {
      const xfRe = /<xf\\b([^>]*?)\\/?>/g;
      let xm, idx = 0;
      while ((xm = xfRe.exec(xfs[1]))) { if (isDateFmt(+(_xmlAttr(xm[1], 'numFmtId') || 0))) dateXf.add(idx); idx++; }
    }
  }
""")

# ---- 2. sheet đầu tiên theo workbook.xml
rep("""  // First sheet is typically xl/worksheets/sheet1.xml
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const shEntry = zip[sheetPath];
  if (!shEntry) throw new Error('Không tìm thấy sheet1.xml');""", """  // HM-02: sheet đầu tiên theo workbook.xml + rels (dự phòng sheet1.xml)
  let sheetPath = 'xl/worksheets/sheet1.xml';
  try {
    const first = /<sheet\\b[^>]*>/.exec(wbXml);
    const rid = first && _xmlAttr(first[0], 'r:id');
    const relEntry = zip['xl/_rels/workbook.xml.rels'];
    if (rid && relEntry) {
      const rels = new TextDecoder().decode(await inflateEntry(relEntry));
      const re2 = /<Relationship\\b[^>]*>/g;
      let rr;
      while ((rr = re2.exec(rels))) {
        if (_xmlAttr(rr[0], 'Id') === rid) {
          const tg = _xmlAttr(rr[0], 'Target');
          if (tg) sheetPath = tg.charAt(0) === '/' ? tg.slice(1) : 'xl/' + tg;
          break;
        }
      }
    }
  } catch (e) { console.warn('[HM-02] Không đọc được rels, dùng sheet1.xml:', e); }
  const shEntry = zip[sheetPath];
  if (!shEntry) throw new Error('Không tìm thấy ' + sheetPath);""")

# ---- 3. regex ô + chuyển ngày chỉ theo định dạng ô
rep("""    const cellRe = /<c r="([A-Z]+)\\d+"(?:\\s+s="\\d+")?(?:\\s+t="([^"]+)")?[^>]*>([\\s\\S]*?)<\\/c>/g;
    let cm;
    while ((cm = cellRe.exec(rowXml))) {
      const colRef = cm[1];
      const type = cm[2] || '';
      const inner = cm[3];
      let val = '';""", """    // HM-02: <c .../> tự đóng (ô trống có kiểu) không còn nuốt ô kế tiếp
    const cellRe = /<c\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(rowXml))) {
      const colRef = (/\\br="([A-Z]+)\\d+"/.exec(cm[1]) || [])[1];
      if (!colRef) continue;
      const type = _xmlAttr(cm[1], 't') || '';
      const styleIdx = _xmlAttr(cm[1], 's');
      const inner = cm[2] || '';
      let val = '';""")
rep("""        const num = parseFloat(val);
        if (!isNaN(num) && num > 1 && num < 100000) {""", """        const num = parseFloat(val);
        if (type === 'd') {
          val = String(val).slice(0, 10);
        } else if (!isNaN(num) && num > 1 && num < 100000 && styleIdx != null && dateXf.has(+styleIdx)) {""")

# ---- 4. loadSheetJS chờ thư viện trì hoãn
rep("""  if (typeof XLSX !== 'undefined') return XLSX;
  throw new Error('XLSX không có sẵn (bundle offline lỗi)');""", """  if (typeof XLSX === 'undefined' && typeof window.TD_ensureVendors === 'function') {
    try { await window.TD_ensureVendors(); } catch (e) { console.warn('[HM-02] TD_ensureVendors lỗi:', e); }
  }
  if (typeof XLSX !== 'undefined') return XLSX;
  throw new Error('XLSX không có sẵn (bundle offline lỗi)');""")

open(dst, 'w', encoding='utf-8').write(s)
print('OK', hashlib.sha256(s.encode('utf-8')).hexdigest())

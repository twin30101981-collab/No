"""HM-04: lưu trữ toàn vẹn + sao lưu đầy đủ.
 1. Ghi MỘT giao dịch IndexedDB cho meta + mọi mảng lớn; xoá chunk thừa; meta có checksum từng chunk.
 2. Đọc chunk có kiểm tra (thiếu/sai checksum/không giải nén/sai số phần tử) -> đánh dấu hỏng, KHÔNG trả [] im lặng;
    thử khôi phục từ bản LocalStorage; nếu không được thì chặn tự động lưu đè và hiện thông báo.
 3. loadData luôn khôi phục meta (hosovay, chlmStatus, hdvSnapshots, hdvCurrentPeriod…).
 4. Sao lưu v3: đủ trường + schemaVersion + checksum; khôi phục kiểm checksum.
Dùng: python3 apply_hm04.py <vao.html> <ra.html>"""
import sys, hashlib
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không khớp số lần', old[:70], s.count(old))
    s = s.replace(old, new)

# ---- 1+2. thay idbSetChunked & idbGetChunked
i = s.index("/* Ghi từng mảng lớn thành chunk riêng trong store 'chunks' */")
j = s.index("/* Lưu meta nhỏ (status objects) vào store chính, đã nén */")
NEW_IDB = r"""/* HM-04: băm nhanh (cyrb53) để phát hiện chunk hỏng/cắt dở */
function _hm04Hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
function _hm04Pack(arr) {
  const CHUNK = 2000; // số phần tử / chunk
  const total = Math.ceil(arr.length / CHUNK) || 1;
  const chunks = [], sums = [];
  for (let i = 0; i < total; i++) {
    const c = LZS.compressToBase64(JSON.stringify(arr.slice(i * CHUNK, (i + 1) * CHUNK)));
    chunks.push(c); sums.push(_hm04Hash(c));
  }
  return { meta: { totalChunks: total, length: arr.length, sums: sums, ts: Date.now(), v: 2 }, chunks: chunks };
}
/* HM-04: đánh dấu dữ liệu lưu cục bộ bị hỏng — saveData/saveToLS sẽ không ghi đè khoá này */
function _hm04MarkCorrupt(key, reason, expected) {
  window.__storageCorrupt = window.__storageCorrupt || {};
  window.__storageCorrupt[key] = { reason: reason, expected: expected };
  console.error('[HM-04] Dữ liệu lưu cục bộ "' + key + '" bị hỏng: ' + reason + ' (kỳ vọng ' + expected + ' phần tử). Đã chặn ghi đè.');
}
window.__storageClearCorrupt = function () {
  window.__storageCorrupt = null;
  try { const b = document.getElementById('storage-corrupt-banner'); if (b) b.remove(); } catch (_) {}
};
window.showStorageCorruptBanner = function () {
  try {
    const c = window.__storageCorrupt; if (!c || !Object.keys(c).length || document.getElementById('storage-corrupt-banner')) return;
    const div = document.createElement('div');
    div.id = 'storage-corrupt-banner';
    div.style.cssText = 'position:sticky;top:0;z-index:99999;background:#fee2e2;border-bottom:2px solid #b91c1c;color:#7f1d1d;padding:10px 16px;font-weight:600;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
    div.innerHTML = '⛔ Dữ liệu lưu trên máy bị hỏng (' + Object.keys(c).map(k => k + ': ' + c[k].reason).join('; ') + '). Đã DỪNG tự động lưu để không ghi đè. Hãy khôi phục từ tệp sao lưu hoặc nhập lại tệp IPCAS. '
      + '<button onclick="try{importBackup()}catch(e){}" style="background:#b91c1c;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer">Khôi phục từ sao lưu</button>';
    (document.body || document.documentElement).insertBefore(div, document.body ? document.body.firstChild : null);
  } catch (_) {}
};

/* HM-04: ghi meta + mọi mảng lớn trong MỘT giao dịch (hoặc ghi hết, hoặc không ghi gì); xoá chunk thừa */
async function idbSaveAll(payload, arrays) {
  const db = await openIDB();
  const packed = {};
  Object.keys(arrays).forEach(k => { packed[k] = _hm04Pack(arrays[k]); });
  const mainC = payload ? LZS.compressToBase64(JSON.stringify(payload)) : null;
  return new Promise((res, rej) => {
    const tx = db.transaction([IDB_STORE, IDB_CHUNKS], 'readwrite');
    const st = tx.objectStore(IDB_CHUNKS);
    if (mainC !== null) tx.objectStore(IDB_STORE).put(mainC, 'main');
    Object.keys(packed).forEach(key => {
      const p = packed[key];
      const rq = st.get(`${key}__meta`);
      rq.onsuccess = () => {
        const old = rq.result;
        const oldTotal = old && old.totalChunks ? old.totalChunks : 0;
        for (let i = p.chunks.length; i < oldTotal; i++) st.delete(`${key}__${i}`);
        p.chunks.forEach((c, i) => st.put(c, `${key}__${i}`));
        st.put(p.meta, `${key}__meta`);
      };
    });
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error || new Error('Giao dịch IndexedDB bị huỷ'));
  });
}
async function idbSetChunked(key, arr) {
  const o = {}; o[key] = arr;
  return idbSaveAll(null, o);
}

async function idbGetChunked(key) {
  try {
    const db = await openIDB();
    const meta = await new Promise(res => {
      const tx = db.transaction(IDB_CHUNKS, 'readonly');
      const req = tx.objectStore(IDB_CHUNKS).get(`${key}__meta`);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => res(null);
    });
    if (!meta) return [];
    const parts = await Promise.all(
      Array.from({ length: meta.totalChunks }, (_, i) =>
        new Promise(res => {
          const tx = db.transaction(IDB_CHUNKS, 'readonly');
          const req = tx.objectStore(IDB_CHUNKS).get(`${key}__${i}`);
          req.onsuccess = () => {
            const raw = req.result;
            if (typeof raw !== 'string') return res({ bad: 'thiếu chunk ' + i });
            if (meta.sums && meta.sums[i] && _hm04Hash(raw) !== meta.sums[i]) return res({ bad: 'chunk ' + i + ' sai checksum' });
            try {
              const a = JSON.parse(LZS.decompressFromBase64(raw) || '');
              if (!Array.isArray(a)) return res({ bad: 'chunk ' + i + ' không phải mảng' });
              res({ a: a });
            } catch (e) { res({ bad: 'chunk ' + i + ' không giải nén được' }); }
          };
          req.onerror = () => res({ bad: 'chunk ' + i + ' lỗi đọc' });
        })
      )
    );
    let bad = (parts.find(p => p.bad) || {}).bad;
    const arr = bad ? [] : parts.flatMap(p => p.a);
    if (!bad && typeof meta.length === 'number' && arr.length !== meta.length) bad = 'số phần tử ' + arr.length + ' khác ' + meta.length;
    if (bad) { _hm04MarkCorrupt(key, bad, meta.length); return []; }
    return arr;
  } catch (e) { console.warn('[HM-04] idbGetChunked', key, e); return []; }
}

"""
s = s[:i] + NEW_IDB + s[j:]

# idbSet không ghi khi đang chặn? (meta nhỏ vẫn an toàn) — giữ nguyên.

# ---- saveToLS: không ghi đè bản LocalStorage khi còn dữ liệu hỏng chưa xử lý
rep("function saveToLS() {\n  try {", "function saveToLS() {\n  if (window.__storageCorrupt && Object.keys(window.__storageCorrupt).length) return; // HM-04: giữ nguyên bản dự phòng\n  try {")

# ---- saveData: một giao dịch + chặn khoá hỏng + báo lỗi
rep("""  saveToLS();
  // IndexedDB: lưu meta + chunked arrays song song
  const [ok] = await Promise.all([
    idbSet(getPayload()),
    idbSetChunked('qltd', DATA.qltd),
    idbSetChunked('hdv',  DATA.hdv  || []),
    idbSetChunked('macb', DATA.macb || []),
    idbSetChunked('list', DATA.list || []),
  ]);""", """  saveToLS();
  // HM-04: một giao dịch cho meta + mảng lớn; khoá đang bị đánh dấu hỏng thì không ghi đè
  const _arrays = { qltd: DATA.qltd, hdv: DATA.hdv || [], macb: DATA.macb || [], list: DATA.list || [] };
  const _blocked = window.__storageCorrupt ? Object.keys(window.__storageCorrupt) : [];
  _blocked.forEach(k => { delete _arrays[k]; });
  let ok = false;
  try { ok = await idbSaveAll(getPayload(), _arrays); }
  catch (e) {
    console.error('[HM-04] Lưu IndexedDB thất bại:', e);
    try { showToast('⚠ Không lưu được vào IndexedDB — hãy xuất sao lưu ngay (Tiện ích → Backup).', 'red'); } catch (_) {}
  }
  if (_blocked.length) window.showStorageCorruptBanner();""")

# ---- loadData: khôi phục meta luôn + phục hồi chunk hỏng từ LocalStorage
rep("  const [idbMeta, qltdArr, hdvArr, macbArr, listArr] = await Promise.all([", "  let [idbMeta, qltdArr, hdvArr, macbArr, listArr] = await Promise.all([")
rep("""  if (qltdArr && qltdArr.length) {
    DATA.qltd = qltdArr;""", """  // HM-04: meta (hosovay, chlmStatus, hdvSnapshots…) luôn được khôi phục, kể cả khi mảng lớn trống
  if (idbMeta) {
    if (idbMeta.denhanStatus && typeof idbMeta.denhanStatus === 'object') DATA.denhanStatus = idbMeta.denhanStatus;
    if (idbMeta.laidongStatus && typeof idbMeta.laidongStatus === 'object') DATA.laidongStatus = idbMeta.laidongStatus;
    if (Array.isArray(idbMeta.phidvExtra)) DATA.phidvExtra = idbMeta.phidvExtra;
    if (idbMeta.phidvStatus && typeof idbMeta.phidvStatus === 'object') DATA.phidvStatus = idbMeta.phidvStatus;
    if (idbMeta.chlmStatus && typeof idbMeta.chlmStatus === 'object') DATA.chlmStatus = idbMeta.chlmStatus;
    if (idbMeta.hdvSnapshots && typeof idbMeta.hdvSnapshots === 'object') DATA.hdvSnapshots = idbMeta.hdvSnapshots;
    if (idbMeta.hdvCurrentPeriod) DATA.hdvCurrentPeriod = idbMeta.hdvCurrentPeriod;
    if (idbMeta.hosovay && typeof idbMeta.hosovay === 'object') DATA.hosovay = idbMeta.hosovay;
    if (idbMeta.khmoiExclude && typeof idbMeta.khmoiExclude === 'object') DATA.khmoiExclude = Object.assign({ camco:{}, newcust:{} }, idbMeta.khmoiExclude);
  }
  // HM-04: chunk IndexedDB hỏng -> thử phục hồi từ bản LocalStorage (cùng lần lưu)
  if (window.__storageCorrupt && Object.keys(window.__storageCorrupt).length) {
    try {
      const rawLS = localStorage.getItem(LS_KEY);
      if (rawLS) {
        const pLS = JSON.parse(rawLS);
        const fromLS = (k) => { try { if (Array.isArray(pLS[k]) && pLS[k].length) return pLS[k]; if (pLS[k + '_lz']) { const a = JSON.parse(LZS.decompressFromBase64(pLS[k + '_lz'])); if (Array.isArray(a) && a.length) return a; } } catch (_) {} return null; };
        const rec = [];
        Object.keys(window.__storageCorrupt).slice().forEach(k => {
          const a = fromLS(k);
          if (!a) return;
          if (k === 'qltd') qltdArr = a; else if (k === 'hdv') hdvArr = a; else if (k === 'macb') macbArr = a; else if (k === 'list') listArr = a;
          delete window.__storageCorrupt[k]; rec.push(k);
        });
        if (rec.length) {
          console.warn('[HM-04] Đã phục hồi từ LocalStorage:', rec.join(', '));
          setTimeout(function () { try { showToast('🩹 Dữ liệu IndexedDB bị hỏng đã được phục hồi từ bản dự phòng: ' + rec.join(', '), 'gold'); } catch (_) {} }, 1500);
          setTimeout(function () { try { saveData(true); } catch (_) {} }, 3000); // ghi lại bản sạch vào IndexedDB
        }
      }
    } catch (e) { console.warn('[HM-04] Không đọc được bản dự phòng LocalStorage', e); }
    if (!Object.keys(window.__storageCorrupt).length) window.__storageCorrupt = null;
    else setTimeout(window.showStorageCorruptBanner, 1200);
  }
  if (qltdArr && qltdArr.length) {
    DATA.qltd = qltdArr;""")

# ---- xoá cờ hỏng khi người dùng chủ động thay thế dữ liệu
rep("  if (!confirm(msg)) return;\n  \n  // ✅ PRO-35 FIX", "  if (!confirm(msg)) return;\n  if (window.__storageClearCorrupt) window.__storageClearCorrupt(); // HM-04: người dùng đã xác nhận thay thế toàn bộ\n  \n  // ✅ PRO-35 FIX")
rep("      applyPayload(saved);\n      try { if(window.sanitizeAllRates)", "      if (window.__storageClearCorrupt) window.__storageClearCorrupt(); // HM-04\n      applyPayload(saved);\n      try { if(window.sanitizeAllRates)")
rep("  await idbClear();\n  localStorage.removeItem(LS_KEY);", "  await idbClear();\n  if (window.__storageClearCorrupt) window.__storageClearCorrupt(); // HM-04\n  localStorage.removeItem(LS_KEY);")
rep("  try { await idbClear(); } catch(e) {}", "  try { await idbClear(); } catch(e) {}\n  if (window.__storageClearCorrupt) window.__storageClearCorrupt(); // HM-04")

# ---- sao lưu v3: đủ trường + schema + checksum
rep("""  const p = {
    v: 2, ts: Date.now(),
    exportedAt: new Date().toLocaleString('vi-VN'),
    qltd: DATA.qltd,""", """  const p = {
    v: 3, schemaVersion: 3, app: 'QLTD_PRO', ts: Date.now(),
    exportedAt: new Date().toLocaleString('vi-VN'),
    qltd: DATA.qltd,""")
rep("""    chlmStatus:    DATA.chlmStatus || {},  // ✅ CHLM
  };
  const blob = new Blob([JSON.stringify(p)], { type: 'application/json' });""", """    chlmStatus:    DATA.chlmStatus || {},  // ✅ CHLM
    hosovay:       DATA.hosovay || {},          // HM-04: trước đây không được sao lưu
    phidvExtra:    DATA.phidvExtra || [],
    phidvStatus:   DATA.phidvStatus || {},
    khmoiExclude:  DATA.khmoiExclude || { camco:{}, newcust:{} },
  };
  p.counts = { qltd: p.qltd.length, hdv: p.hdv.length, macb: p.macb.length, list: p.list.length };
  p.chk = _hm04Hash(_hm04BackupBody(p));
  const blob = new Blob([JSON.stringify(p)], { type: 'application/json' });""")
rep("function exportBackup() {", """function _hm04BackupBody(p) {
  return JSON.stringify([p.qltd, p.hdv, p.hdvSnapshots, p.hdvCurrentPeriod, p.macb, p.list, p.denhanStatus, p.laidongStatus, p.chlmStatus, p.hosovay, p.phidvExtra, p.phidvStatus, p.khmoiExclude]);
}
function exportBackup() {""")
rep("      if (!Array.isArray(saved.qltd)) { alert('File không hợp lệ - không tìm thấy DATA.qltd'); return; }",
    "      if (!Array.isArray(saved.qltd)) { alert('File không hợp lệ - không tìm thấy DATA.qltd'); return; }\n      if (saved.chk && saved.chk !== _hm04Hash(_hm04BackupBody(saved))) {\n        if (!confirm('⚠ Tệp sao lưu có checksum KHÔNG khớp (có thể bị sửa hoặc hỏng).\\nBạn vẫn muốn khôi phục?')) return;\n      }")

open(dst, 'w', encoding='utf-8').write(s)
print('OK', hashlib.sha256(s.encode('utf-8')).hexdigest(), len(s.encode()))

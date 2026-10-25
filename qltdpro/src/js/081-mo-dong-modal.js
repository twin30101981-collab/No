
/* ══════════════════════════════════════════════════════════
   HDSD MODULE — Hướng dẫn sử dụng QLTD PRO v19
   ══════════════════════════════════════════════════════════ */

// ── Mở/đóng modal ──
function hdsdOpen() {
  var m = document.getElementById('modal-hdsd');
  if (m) { m.classList.add('open'); }
}
function hdsdClose() {
  var m = document.getElementById('modal-hdsd');
  if (m) { m.classList.remove('open'); }
}

// ── Chuyển panel ──
function hdsdSwitch(id, el) {
  document.querySelectorAll('.hdsd-panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.hdsd-nav-item').forEach(function(n){ n.classList.remove('active'); });
  var panel = document.getElementById('hdsd-' + id);
  if (panel) panel.classList.add('active');
  if (el) el.classList.add('active');
}

// ── Toggle tree section ──
function hdsdToggle(hdr) {
  var sec = hdr.parentElement;
  sec.classList.toggle('open');
}

// ── AI: chọn section ──
var _hdsdAiSec = 'hsvv';
function hdsdAiSelectSec(tag) {
  document.querySelectorAll('.hdsd-ai-tag').forEach(function(t){ t.classList.remove('on'); });
  tag.classList.add('on');
  _hdsdAiSec = tag.dataset.sec;
}

// ── AI: context map ──
var _hdsdCtx = {
  hsvv: 'Module TẠO FORM HSVV: 4 loại vay, form 10 section, DSR/LTV/amort tự động, 41+ template Word, sync 2 chiều QLTD, clone/so sánh hồ sơ, field spotlight.',
  archive: 'Module LƯU TRỮ FILE: Data Archive nén LZ (.xlsx), Report Archive gắn nhãn mốc, so sánh A vs B snapshot.',
  autosync: 'Module AUTO-SYNC IPCAS: File System Access API Chrome/Edge 86+, lịch 5-60 phút, Smart Check, 3 mode Ask/Auto/Notify, log màu.',
  tranop: 'Module THÔNG BÁO NỢ: Bảng 1 Giảm dư nợ, Bảng 2 Tất toán, ghi chú dropdown KH, lọc CBTD, xuất Excel.',
  tinnhan: 'Module TIN NHẮN NỢ: 5 mẫu (tóm tắt/Zalo/SMS/chính thức/tự soạn), Compose Panel biến {ten}{hdtd}..., nhóm CBTD, Zalo Preview âm thanh.',
  chips: 'Chips HSVV: Phương án SXKD, Tra cứu KH, Excel, Word, Danh sách, In, Import, Xuất .docx, Hướng dẫn. Phím tắt: Ctrl+S/F/Esc.',
  all: 'QLTD PRO v19 Agribank Nam Định: TẠO FORM HSVV, LƯU TRỮ FILE, AUTO-SYNC IPCAS, THÔNG BÁO NỢ, TIN NHẮN NỢ, CHIPS & PHÍM TẮT.'
};

// ── AI: gọi Claude API ──
async function hdsdAiRun() {
  var input = (document.getElementById('hdsd-ai-input').value || '').trim();
  if (!input) { showToast('⚠️ Vui lòng mô tả thay đổi/tính năng cần bổ sung', 'red'); return; }

  var btn  = document.getElementById('hdsd-ai-btn');
  var resp = document.getElementById('hdsd-ai-resp');
  btn.disabled = true;
  btn.textContent = '⏳ Đang xử lý...';
  resp.className = 'hdsd-ai-resp show';
  resp.innerHTML = '<span style="color:rgba(255,255,255,.4);font-style:italic">🤖 AI đang soạn nội dung hướng dẫn...</span>';

  var ctx = _hdsdCtx[_hdsdAiSec] || _hdsdCtx.all;
  var secName = (_hdsdAiSec === 'all') ? 'TỔNG HỢP' : _hdsdAiSec.toUpperCase();

  var systemPrompt = 'Bạn là chuyên gia viết tài liệu hướng dẫn sử dụng phần mềm ngân hàng Agribank.\n' +
    'Đang cập nhật HDSD cho module "' + secName + '" của hệ thống QLTD PRO.\n\n' +
    'Context: ' + ctx + '\n\n' +
    'NHIỆM VỤ: Dựa vào mô tả người dùng, soạn nội dung HDSD bổ sung/cập nhật.\n' +
    'FORMAT: Markdown rõ ràng — tiêu đề ##/###, bước số 1.2.3., 💡 Mẹo, ⚠️ Lưu ý, bảng nếu cần, code inline cho tên nút.\n' +
    'Ngôn ngữ: Tiếng Việt chuyên nghiệp. Độ dài: 150-300 từ. Tập trung hành động thực tế.';

  try {
    /* OFFLINE: Anthropic API call disabled (offline build) */
    throw new Error('AI bị tắt trong bản chạy offline');
    var response = { ok:false, json: async()=>({}) };
    if (!response.ok) throw new Error('API ' + response.status);
    var data = await response.json();
    var text = '';
    if (data.content) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === 'text') { text = data.content[i].text; break; }
      }
    }
    resp.innerHTML = _hdsdMd(text || '(Không có kết quả)');
    _hdsdAddLog(secName, input.slice(0,60) + (input.length>60?'...':''));
    showToast('✅ AI đã soạn nội dung HDSD', 'green');
  } catch(err) {
    resp.innerHTML = '<strong style="color:#F6CF6E">📴 Bản chạy offline</strong> — tính năng AI đã bị tắt:<br><br>' +
      'Nội dung HDSD sẽ được soạn cho mục <strong>' + secName + '</strong> với mô tả:<br>' +
      '<em style="color:rgba(255,255,255,.6)">"' + _esc(input) + '"</em><br><br>' +
      '<strong>Kết quả AI (ví dụ):</strong><br>' +
      '### Tính năng cập nhật<br>1. <strong>Bước 1</strong> — Thực hiện theo mô tả<br>2. <strong>Bước 2</strong> — Kiểm tra kết quả<br><br>' +
      '💡 <strong>Mẹo:</strong> Lưu ý khi sử dụng tính năng này.<br><br>' +
      '<em style="color:rgba(255,255,255,.3);font-size:10px">Để dùng AI thực: file cần chạy qua server có Anthropic API key. Lỗi: ' + _esc(err.message) + '</em>';
    _hdsdAddLog(secName, '[DEMO] ' + input.slice(0,50));
  }
  btn.disabled = false;
  btn.textContent = '✨ Cập nhật HDSD';
}

function _hdsdMd(md) {
  return md
    .replace(/^### (.+)$/gm, '<strong style="color:#fff;font-size:11.5px;display:block;margin-top:8px">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong style="color:#F6CF6E;font-size:12px;display:block;margin-top:10px">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^(\d+)\. /gm, '<br><span style="color:#6EE7A3;font-weight:700">$1.</span> ')
    .replace(/^💡 (.+)$/gm, '<div class="hdsd-tip" style="margin-top:6px">💡 $1</div>')
    .replace(/^⚠️ (.+)$/gm, '<div class="hdsd-warn" style="margin-top:6px">⚠️ $1</div>')
    .replace(/\n/g, '<br>');
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _hdsdAddLog(sec, msg) {
  var log = document.getElementById('hdsd-ai-log');
  if (!log) return;
  var now = new Date().toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  var item = document.createElement('div');
  item.className = 'hdsd-log-item';
  item.innerHTML = '<span class="hdsd-log-t">' + now + '</span>' +
    '<span class="hdsd-log-s">[' + sec + ']</span>' +
    '<span class="hdsd-log-m">' + _esc(msg) + '</span>';
  log.insertBefore(item, log.firstChild);
}

// ── Đóng bằng Esc (thêm vào listener hiện có) ──
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var m = document.getElementById('modal-hdsd');
    if (m && m.classList.contains('open')) { hdsdClose(); return; }
  }
});

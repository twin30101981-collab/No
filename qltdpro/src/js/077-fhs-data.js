
/* ══════════════════════════════════════════════════════════
   FORM HỒ SƠ MODULE (FHS) — v21.1
   Chip loại → chip con → rows với search/scroll
   ══════════════════════════════════════════════════════════ */

// ── FHS_DATA ──────────────────────────────────────────────────
const FHS_DATA = {
  HMTD:{
    label:'HẠN MỨC TÍN DỤNG',icon:'🏦',
    chips:{
      ttc:{label:'Thông tin chung',icon:'📝',loop:true,fields:[
        'Ngày giao-nhận','Ngày tháng năm','Ngày tháng năm NN','Ngày bìa HS',
        'Ngày CIC','Người QHKH/QLN','Người thẩm định','Người duyệt',
        'Chức vụ người duyệt','Số ủy quyền TD','Tên khách hàng vay',
        'Tên khách hàng in hoa','Mã khách hàng','Tài khoản thanh toán',
        'Xưng hô','Loại CMND','CMND','Nam/nữ','Năm sinh người vay',
        'Địa chỉ','Địa chỉ theo hộ khẩu','Số điện thoại','Nghề nghiệp',
        'Đăng ký kinh doanh số','Địa chỉ kinh doanh',
        'Người thừa kế','Người thừa kế viết hoa','Xưng hô người thừa kế',
        'Quan hệ người thừa kế','CMT người thừa kế','Loại CMT người thừa kế',
        'Năm sinh người thừa kế','Địa chỉ người thừa kế','Hộ khẩu người thừa kế',
        'Bên vay','Số tiền vay','Số tiền vay bằng chữ',
        'HMTD duyệt','HMTD duyệt bằng chữ','Ngày đến hạn HMTD',
        'Số HĐ tín dụng','Ngày HĐ tín dụng','Dư nợ','Dư nợ bằng chữ',
        'Thể loại vay','Mục đích vay','Mục đích vay cụ thể',
        'Thu nhập năm trước','Phương thức thanh toán','Thời hạn vay',
        'Chấm điểm','Xếp hạng','Tổng nhu cầu vốn','Vốn tự có',
        'Tài sản số 1','Tài sản số 2','Tài sản số 3','Tài sản số 4',
        'Tổng giá trị tài sản thế chấp'
      ]},
      nn:{label:'Nhận nợ',icon:'💳',loop:false,fields:[
        'Ngày tháng năm nhận nợ','Ngày nhận nợ','Thời hạn trả nợ cuối',
        'Tổng doanh thu BCĐXGN','Doanh thu kế hoạch','Hạn mức tín dụng tối đa',
        'Số tiền nhận nợ NN','Số tiền nhận nợ NN bằng chữ',
        'Số tiền sau khi NN','Số tiền sau khi NN bằng chữ',
        'Người thụ hưởng','CCCD/Căn cước','Địa chỉ người thụ hưởng',
        'TK người thụ hưởng','Mở tại ngân hàng','Lãi ước của nhận nợ',
        'Số tiền ước cộng thêm NN','Chuyển khoản cho','Nguồn thu từ HĐKD chính'
      ]},
      tsbd:{label:'Tài sản bảo đảm',icon:'🏠',loop:true,fields:[
        'Mã khách hàng chủ tài sản','Chủ tài sản','Chủ tài sản viết hoa',
        'Xưng hô chủ tài sản','CMT chủ tài sản','Loại CMT chủ tài sản',
        'Năm sinh chủ tài sản','Địa chỉ chủ tài sản','Địa chỉ hộ khẩu chủ tài sản',
        'Người thừa kế chủ tài sản','Xưng hô thừa kế chủ tài sản',
        'Bên thế chấp','Bên thế chấp in hoa','Tên TSBĐ','Số bìa đỏ',
        'Địa chỉ đất','Đặc điểm nhà trên bìa','Diện tích đất','DTĐ bằng chữ',
        'Số thửa','Số tờ bản đồ','Loại đất','Đất ở',
        'Diện tích sàn','Nguồn gốc','Thời hạn sử dụng',
        'Đặc điểm nhà','Kết cấu nhà','Số tầng',
        'Vị trí theo bảng giá đất','Số BBĐG','Ngày BBĐG',
        'Diện tích XD','Diện tích SD','Giá đất G0',
        'Giá trị đất','Giá trị m2 nhà','Giá trị nhà','Giá trị nhà làm tròn số',
        'Tổng giá trị TS','TGTTS bằng chữ',
        'Nghĩa vụ bảo đảm','NVBĐ bằng chữ',
        'Số HĐ thế chấp','Ngày ký HĐTC','Loại HĐTC','Giá trị ĐBTS'
      ]}
    }
  },
  TD:{
    label:'TIÊU DÙNG',icon:'🛒',
    chips:{
      ttc:{label:'Thông tin chung',icon:'📝',loop:true,fields:[
        'Năm vay','Năm đến hạn','Người thẩm định','Người duyệt',
        'Chức vụ người duyệt','Tên khách hàng','Ngày tháng năm NN',
        'Ngày tháng năm','Ngày giao-nhận','Ngày CIC',
        'Mã khách hàng','Mục đích vay','Lãi suất vay','Lãi suất tháng',
        'Số điện thoại','Tài khoản thanh toán',
        'Tên khách hàng vay','Tên khách hàng vay in hoa',
        'Loại CMND','CMND','Xưng hô','Nam/nữ','Năm sinh người vay',
        'Địa chỉ','Địa chỉ theo hộ khẩu','Nghề nghiệp',
        'Người thừa kế','Xưng hô người thừa kế',
        'Quan hệ người thừa kế','CMT người thừa kế',
        'Thể loại vay','Thời hạn vay','Số tiền vay','Số tiền vay bằng chữ',
        'Tổng nhu cầu vốn','Vốn tự có','Tỷ lệ vốn tự có',
        'Số tháng định kỳ','Số kỳ trả nợ gốc','Ngày trả nợ cuối cùng',
        'Nguồn thu nhập 1','Số tiền thu nhập 1',
        'Nguồn thu nhập 2','Số tiền thu nhập 2',
        'Tổng nguồn thu nhập','Số HĐ tín dụng','Ngày HĐ tín dụng'
      ]},
      tsbd:{label:'Tài sản bảo đảm',icon:'🏠',loop:true,fields:[
        'Mã khách hàng chủ tài sản','Chủ tài sản','Chủ tài sản viết hoa',
        'Xưng hô chủ tài sản','CMT chủ tài sản','Loại CMT chủ tài sản',
        'Năm sinh chủ tài sản','Địa chỉ chủ tài sản',
        'Bên thế chấp','Bên thế chấp in hoa','Tên TSBĐ','Số bìa đỏ',
        'Địa chỉ đất','Đặc điểm nhà trên bìa','Diện tích đất','DTĐ bằng chữ',
        'Số thửa','Số tờ bản đồ','Loại đất','Đất ở',
        'Diện tích sàn','Nguồn gốc','Thời hạn sử dụng',
        'Đặc điểm nhà','Kết cấu nhà','Số tầng',
        'Vị trí theo bảng giá đất','Số BBĐG','Ngày BBĐG',
        'Diện tích XD','Diện tích SD','Giá đất G0',
        'Giá trị đất','Giá trị m2 nhà','Giá trị nhà','Giá trị nhà làm tròn số',
        'Tổng giá trị TS','TGTTS bằng chữ',
        'Nghĩa vụ bảo đảm','NVBĐ bằng chữ',
        'Số HĐ thế chấp','Ngày ký HĐTC','Loại HĐTC','Giá trị ĐBTS'
      ]}
    }
  },
  CC:{
    label:'CẦM CỐ',icon:'🔒',
    chips:{
      ttc:{label:'Thông tin chung',icon:'📝',loop:true,fields:[
        'Tên khách hàng','Ngày tháng năm','Ngày hồ sơ',
        'Tên khách hàng in hoa','Danh xưng','Năm sinh',
        'Loại CMND','CMND','Địa chỉ','Số điện thoại',
        'Người thụ hưởng','Địa chỉ người thụ hưởng','Số TK người thụ hưởng',
        'Tổng nhu cầu vốn','Số tiền vay','Bằng chữ',
        'Vốn đối ứng','Tỷ lệ vốn đối ứng','Mục đích vay',
        'Lãi suất vay','Lãi sổ tiết kiệm','Thời hạn vay','Hạn trả cuối cùng',
        'Số HĐ tín dụng','Ngày HĐTD','Mã khách hàng','Ngày giao/nhận',
        'Tổng Sổ TK','Tổng tiền Sổ TK bằng chữ'
      ]},
      tscc:{label:'Tài sản cầm cố',icon:'🏦',loop:true,fields:[
        'Tổ chức phát hành','Số seri','Ngày phát hành','Ngày đến hạn',
        'Số dư','Số dư bằng chữ','Lãi suất','Kỳ hạn',
        'Tiền lãi','Cộng gốc + lãi','Số ngày vay',
        'Lãi vay STK','Mức vay tối đa'
      ]}
    }
  }
};

// ── State ─────────────────────────────────────────────────────
var _fhsLoai = null;
var _fhsChip = null;
var _fhsVals = {};
var _fhsCustomData = {}; // custom field definitions
var _fhsAutoSaveTimer = null;

function _fhsKey(l,c){ return l+'_'+c; }
function _fhsGetInst(l,c){
  var k=_fhsKey(l,c);
  if(!_fhsVals[k]) _fhsVals[k]=[{}];
  return _fhsVals[k];
}
function _fhsGetChipData(loai,chip){
  var ck='fhs_custom_'+loai+'_'+chip;
  return (_fhsCustomData[ck]) || FHS_DATA[loai].chips[chip];
}
function _fhsIsDateField(fn){
  var n=fn.toLowerCase();
  return n.indexOf('ngày')>=0||n.indexOf('ngay')>=0||n.indexOf('hạn')>=0||
         n.indexOf('tháng năm')>=0||n.indexOf('ký hđtc')>=0;
}
// ── Persistence ────────────────────────────────────────────────
function _fhsAutoSave(){
  clearTimeout(_fhsAutoSaveTimer);
  _fhsAutoSaveTimer=setTimeout(_fhsSaveNow,900);
}
function _fhsSaveNow(){
  try{ localStorage.setItem('fhs_vals_v2',JSON.stringify(_fhsVals));
       localStorage.setItem('fhs_custom_v2',JSON.stringify(_fhsCustomData)); }catch(e){}
}
function _fhsLoadStorage(){
  try{ var v=localStorage.getItem('fhs_vals_v2');
       if(v){var p=JSON.parse(v);if(p&&typeof p==='object')_fhsVals=p;}
       var c=localStorage.getItem('fhs_custom_v2');
       if(c){var pc=JSON.parse(c);if(pc&&typeof pc==='object')_fhsCustomData=pc;} }catch(e){}
}
_fhsLoadStorage();
function fhsSaveAll(){ _fhsSaveNow(); if(window.showToast)showToast('✅ Đã lưu Form Hồ Sơ vào bộ nhớ','green'); }
function fhsResetAll(){
  if(!confirm('⚠️ RESET SẠCH toàn bộ Form Hồ Sơ?\n\nXóa: dữ liệu đã nhập, trường tùy chỉnh, dữ liệu đã lưu.\n\nKHÔNG THỂ hoàn tác!')) return;
  _fhsVals={}; _fhsCustomData={};
  localStorage.removeItem('fhs_vals_v2'); localStorage.removeItem('fhs_custom_v2');
  if(_fhsLoai&&_fhsChip){_fhsRenderRows(_fhsLoai,_fhsChip);_fhsUpdateInfo();}
  if(window.showToast)showToast('🔴 Đã reset sạch Form Hồ Sơ','orange');
}
// ── Field CRUD ─────────────────────────────────────────────────
function _fhsAddField(loai,chip){
  var name=prompt('Tên trường mới (VD: Ghi chú thêm):');
  if(!name||!name.trim()) return;
  name=name.trim();
  var ck='fhs_custom_'+loai+'_'+chip;
  var cd=_fhsGetChipData(loai,chip);
  if(!_fhsCustomData[ck]) _fhsCustomData[ck]={label:cd.label,icon:cd.icon,loop:cd.loop,fields:cd.fields.slice()};
  if(_fhsCustomData[ck].fields.indexOf(name)>=0){if(window.showToast)showToast('⚠️ Tên đã tồn tại','orange');return;}
  _fhsCustomData[ck].fields.push(name);
  _fhsSaveNow(); _fhsRenderRows(loai,chip); _fhsUpdateInfo();
  if(window.showToast)showToast('✅ Đã thêm: '+name,'green');
}
function _fhsDeleteField(loai,chip,field){
  if(!confirm('Xóa trường "'+field+'"?')) return;
  var ck='fhs_custom_'+loai+'_'+chip;
  var cd=_fhsGetChipData(loai,chip);
  if(!_fhsCustomData[ck]) _fhsCustomData[ck]={label:cd.label,icon:cd.icon,loop:cd.loop,fields:cd.fields.slice()};
  var i=_fhsCustomData[ck].fields.indexOf(field);
  if(i>=0) _fhsCustomData[ck].fields.splice(i,1);
  _fhsGetInst(loai,chip).forEach(function(iv){delete iv[field];});
  _fhsSaveNow(); _fhsRenderRows(loai,chip); _fhsUpdateInfo();
  if(window.showToast)showToast('🗑 Đã xóa: '+field,'orange');
}
function _fhsRenameField(loai,chip,field){
  var n=prompt('Đổi tên "'+field+'" thành:',field);
  if(!n||!n.trim()||n.trim()===field) return;
  n=n.trim();
  var ck='fhs_custom_'+loai+'_'+chip;
  var cd=_fhsGetChipData(loai,chip);
  if(!_fhsCustomData[ck]) _fhsCustomData[ck]={label:cd.label,icon:cd.icon,loop:cd.loop,fields:cd.fields.slice()};
  var i=_fhsCustomData[ck].fields.indexOf(field);
  if(i<0){if(window.showToast)showToast('⚠️ Không tìm thấy trường','red');return;}
  _fhsCustomData[ck].fields[i]=n;
  _fhsGetInst(loai,chip).forEach(function(iv){if(field in iv){iv[n]=iv[field];delete iv[field];}});
  _fhsSaveNow(); _fhsRenderRows(loai,chip); _fhsUpdateInfo();
  if(window.showToast)showToast('✅ Đổi tên: '+field+' → '+n,'green');
}

// ── Formula menu (v24 — nâng cấp) ─────────────────────────────
var _fhsFormulas=[
  // Nhóm: Văn bản
  {id:'upper',      label:'🔡 Viết HOA',                desc:'In hoa toàn bộ nội dung trường', group:'Văn bản'},
  {id:'lower',      label:'🔠 Viết thường',             desc:'Chuyển về chữ thường toàn bộ', group:'Văn bản'},
  {id:'title_case', label:'🅰️ Viết Hoa Đầu Từ',        desc:'Viết hoa chữ cái đầu mỗi từ', group:'Văn bản'},
  {id:'trim',       label:'✂️ Xóa khoảng trắng thừa',  desc:'Xóa khoảng trắng đầu/cuối và trùng lặp', group:'Văn bản'},
  {id:'copy',       label:'📋 Copy từ trường khác',     desc:'Sao chép giá trị từ 1 trường bất kỳ', group:'Văn bản'},
  // Nhóm: Tùy chọn nhanh
  {id:'xungho',     label:'👤 Ông/Bà',                  desc:'Chọn nhanh: Ông hoặc Bà', group:'Tùy chọn'},
  {id:'chucdanh',   label:'🏅 Chức danh người duyệt',   desc:'Giám đốc / Phó Giám đốc / Trưởng phòng...', group:'Tùy chọn'},
  {id:'soquyen',    label:'📜 Số ủy quyền',             desc:'Điền số ủy quyền 1 hoặc số ủy quyền 2', group:'Tùy chọn'},
  {id:'loaicmt',    label:'🪪 Loại CMND/CCCD',          desc:'Căn cước / CCCD / CMND / Hộ chiếu', group:'Tùy chọn'},
  {id:'namnu',      label:'⚧ Nam/Nữ',                  desc:'Chọn nhanh: Nam hoặc Nữ', group:'Tùy chọn'},
  // Nhóm: Số liệu
  {id:'so2chu',     label:'💰 Số → Bằng chữ (VNĐ)',    desc:'Đọc số tiền thành chữ tiếng Việt', group:'Số liệu'},
  {id:'so2chu_full',label:'💬 Số → Chữ đầy đủ (có đồng)',desc:'Đọc số tiền: "... đồng chẵn" hoặc "... đồng"', group:'Số liệu'},
  {id:'fmt_money',  label:'🏦 Định dạng số tiền',       desc:'Thêm dấu phân cách nghìn (1.700.000.000)', group:'Số liệu'},
  {id:'calc',       label:'🧮 Tính đa phép (+−×÷)',     desc:'Nhập biểu thức: A+B, A-B, AxB, A/B với tên trường', group:'Số liệu'},
  {id:'pct',        label:'% Tỷ lệ A/B',               desc:'(A ÷ B) × 100 → điền phần trăm', group:'Số liệu'},
  {id:'round_mil',  label:'🔢 Làm tròn triệu đồng',    desc:'Làm tròn số đến đơn vị triệu (x000000)', group:'Số liệu'},
  // Nhóm: Ngày tháng
  {id:'ngaykt',     label:'📅 Tính ngày đến hạn',       desc:'Ngày bắt đầu + N tháng', group:'Ngày tháng'},
  {id:'today',      label:'📆 Ngày hôm nay',            desc:'Điền ngày hiện tại (dd/mm/yyyy)', group:'Ngày tháng'},
  {id:'thang_nam',  label:'📅 Tháng và năm hiện tại',   desc:'Điền "tháng MM năm YYYY"', group:'Ngày tháng'},
  // Nhóm: Agribank chuẩn
  {id:'agr_chuky',  label:'🏦 Chu kỳ trả lãi',         desc:'Điền: "01 (một) tháng/lần" (chuẩn)', group:'Agribank'},
  {id:'agr_htgn',   label:'💵 Hình thức giải ngân',     desc:'Điền: "Chuyển khoản vào tài khoản" (chuẩn)', group:'Agribank'},
  {id:'agr_httra',  label:'📋 Hình thức trả nợ',        desc:'Điền: "Trả theo kỳ hạn" (chuẩn)', group:'Agribank'},
];

// Danh sách tùy chọn nhanh
var _fhsQuickOpts={
  xungho:  ['Ông','Bà','Anh','Chị'],
  chucdanh:['Giám đốc','Phó Giám đốc','Trưởng phòng','Phó Trưởng phòng','Giám đốc Chi nhánh','Phó Giám đốc Chi nhánh','Chuyên viên'],
  soquyen: ['Nhập số ủy quyền 1...','Nhập số ủy quyền 2...'],
  loaicmt: ['CMND','CCCD','Hộ chiếu','Giấy khai sinh'],
  namnu:   ['Nam','Nữ'],
};

function _fhsShowFormulaMenu(field,iIdx,inputEl,btn,loai,chip){
  var ex=document.getElementById('fhs-fm-popup'); if(ex){ex.remove();return;}
  var m=document.createElement('div'); m.id='fhs-fm-popup'; m.className='fhs-fm-popup';
  m.innerHTML='<div class="fhs-fm-title">⚡ Công thức cho: <strong>'+field+'</strong></div>';

  // Nhóm các công thức
  var groups={};
  _fhsFormulas.forEach(function(f){
    if(!groups[f.group])groups[f.group]=[];
    groups[f.group].push(f);
  });
  Object.keys(groups).forEach(function(g){
    var gl=document.createElement('div');
    gl.style.cssText='font-size:9.5px;font-weight:800;color:#8a9ab0;text-transform:uppercase;letter-spacing:.7px;padding:5px 12px 2px;';
    gl.textContent=g;
    m.appendChild(gl);
    groups[g].forEach(function(f){
      var it=document.createElement('div'); it.className='fhs-fm-item';
      it.innerHTML='<span class="fhs-fm-lbl">'+f.label+'</span><span class="fhs-fm-desc">'+f.desc+'</span>';
      it.onclick=function(){ _fhsApplyFormula(f.id,field,iIdx,inputEl,loai,chip); m.remove(); };
      m.appendChild(it);
    });
  });

  var cl=document.createElement('button'); cl.className='fhs-fm-close'; cl.textContent='✕ Đóng';
  cl.onclick=function(){m.remove();}; m.appendChild(cl);
  document.body.appendChild(m);
  var r=btn.getBoundingClientRect();
  m.style.cssText='position:fixed;top:'+(r.bottom+4)+'px;left:'+Math.min(r.left,window.innerWidth-290)+'px;z-index:calc(var(--z-7,99990) + 4);width:285px;';
  setTimeout(function(){
    function h(e){if(!m.contains(e.target)){m.remove();document.removeEventListener('click',h);}}
    document.addEventListener('click',h);
  },80);
}

function _fhsSetVal(iv,field,inputEl,val){
  /* Helper: ghi vào object + input + lưu — DUY NHẤT 1 chỗ để tránh bug */
  iv[field]=val;
  inputEl.value=val;
  inputEl.classList.toggle('filled',!!val);
  _fhsAutoSave();
}

function _fhsApplyFormula(id,field,iIdx,inputEl,loai,chip){
  /* FIX v24: lấy inputEl thực sự từ DOM (tránh stale closure bug) */
  var realInp=document.querySelector('.fhs-rows-wrap .fhs-row[data-fn="'+field.toLowerCase()+'"] .fhs-row-input');
  if(realInp) inputEl=realInp;

  var iv=_fhsGetInst(loai,chip)[iIdx];

  if(id==='upper'){
    /* FIX: đọc cả iv[field] lẫn inputEl.value — ưu tiên inputEl nếu iv trống */
    var src=(inputEl.value||iv[field]||'').trim();
    if(!src){ showToast&&showToast('⚠️ Trường đang trống, hãy nhập giá trị trước','orange'); return; }
    var v=src.toUpperCase();
    _fhsSetVal(iv,field,inputEl,v);
    showToast&&showToast('✅ Đã viết hoa: '+v.slice(0,30),'green');

  } else if(id==='copy'){
    var src2=prompt('Tên trường nguồn (chính xác):'); if(!src2)return;
    var val2=iv[src2.trim()];
    if(val2===undefined||val2===''){showToast&&showToast('⚠️ Trường "'+src2+'" trống/không tồn tại','orange');return;}
    _fhsSetVal(iv,field,inputEl,val2);
    showToast&&showToast('✅ Đã copy: '+String(val2).slice(0,30),'green');

  } else if(id==='xungho'||id==='chucdanh'||id==='loaicmt'||id==='namnu'){
    var opts=_fhsQuickOpts[id];
    var chosen=_fhsQuickPick(opts); if(!chosen)return;
    _fhsSetVal(iv,field,inputEl,chosen);
    showToast&&showToast('✅ Đã chọn: '+chosen,'green');

  } else if(id==='soquyen'){
    var uq=prompt('Nhập số ủy quyền (ví dụ: 1234/2025/UQ-AGR):',''); if(uq===null)return;
    _fhsSetVal(iv,field,inputEl,uq.trim());
    showToast&&showToast('✅ Đã điền: '+uq.trim(),'green');

  } else if(id==='so2chu'){
    var rawNum=String(inputEl.value||iv[field]||'').replace(/[^0-9]/g,'');
    var srcN=prompt('Số tiền (VNĐ):',rawNum);
    if(srcN===null)return;
    var n2=parseFloat(srcN.replace(/[^0-9]/g,''));
    if(isNaN(n2)){showToast&&showToast('⚠️ Không phải số','orange');return;}
    var chu=_fhsN2W(n2);
    _fhsSetVal(iv,field,inputEl,chu);
    showToast&&showToast('✅ Đã điền bằng chữ','green');

  } else if(id==='calc'){
    /* Đa phép tính: biểu thức nhập với ký hiệu tùy chọn:
       + tổng, - trừ, x nhân, / chia
       Ví dụ: "Số tiền vay + Vốn tự có" hoặc "Giá đất G0 x Diện tích đất"
       Hỗ trợ cả tên trường lẫn số trực tiếp */
    var expr=prompt(
      'Nhập biểu thức (dùng tên trường hoặc số, toán tử: + − x /):\n'+
      'Ví dụ: "Số tiền vay + Vốn tự có"\n'+
      'Hoặc:  "Giá đất G0 x Diện tích đất"\n'+
      'Hoặc:  "Tổng nhu cầu vốn - 500000000"\n\n'+
      'Toán tử được nhận: + (cộng), - (trừ), x hoặc * (nhân), / (chia)'
    ,'');
    if(expr===null||!expr.trim())return;
    // Tokenize: tách theo toán tử
    var opMatch=expr.match(/^(.+?)([+\-x\*\/])(.+)$/);
    if(!opMatch){showToast&&showToast('⚠️ Không nhận dạng được biểu thức','orange');return;}
    var tokA=opMatch[1].trim(), op=opMatch[2].trim(), tokB=opMatch[3].trim();
    function resolveToken(tok){
      var asNum=parseFloat(tok.replace(/[^0-9.\-]/g,''));
      if(!isNaN(asNum)&&tok.replace(/[^0-9.\-]/g,'')===tok.replace(/\s/g,''))return asNum;
      var fieldVal=iv[tok];
      if(fieldVal===undefined){
        // Try case-insensitive match
        var lk=tok.toLowerCase();
        for(var k in iv){if(k.toLowerCase()===lk){fieldVal=iv[k];break;}}
      }
      if(fieldVal===undefined||fieldVal==='')return NaN;
      return parseFloat(String(fieldVal).replace(/[^0-9.\-]/g,''));
    }
    var a2=resolveToken(tokA), b2=resolveToken(tokB);
    if(isNaN(a2)){showToast&&showToast('⚠️ Không tìm thấy hoặc không phải số: "'+tokA+'"','orange');return;}
    if(isNaN(b2)){showToast&&showToast('⚠️ Không tìm thấy hoặc không phải số: "'+tokB+'"','orange');return;}
    var resC;
    if(op==='+'){ resC=a2+b2; }
    else if(op==='-'){ resC=a2-b2; }
    else if(op==='x'||op==='*'){ resC=a2*b2; }
    else if(op==='/'){ if(b2===0){showToast&&showToast('⚠️ Chia cho 0','orange');return;} resC=a2/b2; }
    var isInt=(resC===Math.floor(resC));
    var resStr=isInt?Math.round(resC).toLocaleString('vi-VN'):resC.toFixed(4);
    _fhsSetVal(iv,field,inputEl,resStr);
    showToast&&showToast('✅ '+tokA+' '+op+' '+tokB+' = '+resStr,'green');

  } else if(id==='pct'){
    var faP=prompt('Tên trường TỬ (A):'); if(!faP)return;
    var fbP=prompt('Tên trường MẪU (B — số bị chia):'); if(!fbP)return;
    var aP=parseFloat(String(iv[faP.trim()]||0).replace(/[^0-9.]/g,''));
    var bP=parseFloat(String(iv[fbP.trim()]||1).replace(/[^0-9.]/g,''));
    if(isNaN(aP)||isNaN(bP)){showToast&&showToast('⚠️ Không phải số','orange');return;}
    if(bP===0){showToast&&showToast('⚠️ Chia cho 0','orange');return;}
    var resP=((aP/bP)*100).toFixed(2)+'%';
    _fhsSetVal(iv,field,inputEl,resP);
    showToast&&showToast('✅ Tỷ lệ: '+resP,'green');

  } else if(id==='ngaykt'){
    var base=prompt('Ngày bắt đầu (DD/MM/YYYY):',inputEl.value||iv[field]||''); if(!base)return;
    var addM=parseInt(prompt('Cộng thêm (tháng):','12')||'0',10); if(isNaN(addM))return;
    var p=base.split('/');
    if(p.length!==3){showToast&&showToast('⚠️ Định dạng: DD/MM/YYYY','orange');return;}
    var dt=new Date(+p[2],+p[1]-1+addM,+p[0]);
    var res=('0'+dt.getDate()).slice(-2)+'/'+('0'+(dt.getMonth()+1)).slice(-2)+'/'+dt.getFullYear();
    _fhsSetVal(iv,field,inputEl,res);
    showToast&&showToast('✅ Ngày đến hạn: '+res,'green');

  } else if(id==='lower'){
    var src=(inputEl.value||iv[field]||'').trim();
    if(!src){showToast&&showToast('⚠️ Trường đang trống','orange');return;}
    _fhsSetVal(iv,field,inputEl,src.toLowerCase());
    showToast&&showToast('✅ Đã viết thường','green');

  } else if(id==='title_case'){
    var src=(inputEl.value||iv[field]||'').trim();
    if(!src){showToast&&showToast('⚠️ Trường đang trống','orange');return;}
    var v=src.replace(/\w\S*/g,function(t){return t.charAt(0).toUpperCase()+t.substr(1).toLowerCase();});
    _fhsSetVal(iv,field,inputEl,v);
    showToast&&showToast('✅ Đã viết hoa đầu từ','green');

  } else if(id==='trim'){
    var src=(inputEl.value||iv[field]||'');
    var v=src.trim().replace(/\s+/g,' ');
    _fhsSetVal(iv,field,inputEl,v);
    showToast&&showToast('✅ Đã xóa khoảng trắng thừa','green');

  } else if(id==='so2chu_full'){
    var raw=(inputEl.value||iv[field]||'').replace(/[^0-9]/g,'');
    var n=parseInt(raw,10); if(isNaN(n)||n<0){showToast&&showToast('⚠️ Nhập số trước','orange');return;}
    var chu=(typeof docSo==='function'?docSo(n):(typeof numberToWords==='function'?numberToWords(n):'')) || _fhsSo2Chu(n);
    var v=chu+' đồng chẵn';
    _fhsSetVal(iv,field,inputEl,v);
    showToast&&showToast('✅ '+v.slice(0,40),'green');

  } else if(id==='fmt_money'){
    var raw=(inputEl.value||iv[field]||'').replace(/[^0-9]/g,'');
    var n=parseInt(raw); if(isNaN(n)){showToast&&showToast('⚠️ Nhập số trước','orange');return;}
    var v=n.toLocaleString('vi-VN');
    _fhsSetVal(iv,field,inputEl,v);
    showToast&&showToast('✅ Định dạng: '+v,'green');

  } else if(id==='round_mil'){
    var raw=(inputEl.value||iv[field]||'').replace(/[^0-9]/g,'');
    var n=parseInt(raw); if(isNaN(n)){showToast&&showToast('⚠️ Nhập số trước','orange');return;}
    var v=Math.round(n/1000000)*1000000;
    _fhsSetVal(iv,field,inputEl,String(v));
    showToast&&showToast('✅ Làm tròn: '+v.toLocaleString('vi-VN')+' đồng','green');

  } else if(id==='today'){
    var now=new Date();
    var v=('0'+now.getDate()).slice(-2)+'/'+('0'+(now.getMonth()+1)).slice(-2)+'/'+now.getFullYear();
    _fhsSetVal(iv,field,inputEl,v);
    showToast&&showToast('✅ Ngày hôm nay: '+v,'green');

  } else if(id==='thang_nam'){
    var now=new Date();
    var v='tháng '+('0'+(now.getMonth()+1)).slice(-2)+' năm '+now.getFullYear();
    _fhsSetVal(iv,field,inputEl,v);
    showToast&&showToast('✅ '+v,'green');

  } else if(id==='agr_chuky'){
    _fhsSetVal(iv,field,inputEl,'01 (một) tháng/lần');
    showToast&&showToast('✅ Đã điền chu kỳ trả lãi chuẩn','green');

  } else if(id==='agr_htgn'){
    _fhsSetVal(iv,field,inputEl,'Chuyển khoản vào tài khoản');
    showToast&&showToast('✅ Đã điền hình thức giải ngân chuẩn','green');

  } else if(id==='agr_httra'){
    _fhsSetVal(iv,field,inputEl,'Trả theo kỳ hạn');
    showToast&&showToast('✅ Đã điền hình thức trả nợ chuẩn','green');
  }
}

/* Helper đọc số thành chữ (fallback nếu không có hàm docSo) */
function _fhsSo2Chu(n){
  if(typeof docSo==='function') return docSo(n);
  var units=['','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  var teens=['mười','mười một','mười hai','mười ba','mười bốn','mười lăm','mười sáu','mười bảy','mười tám','mười chín'];
  function readHundreds(n){
    var s='';
    if(n>=100){s+=units[Math.floor(n/100)]+' trăm ';n%=100;}
    if(n>=20){s+=units[Math.floor(n/10)]+' mươi ';n%=10;if(n>0)s+=(n===1?'mốt':n===5?'lăm':units[n])+' ';}
    else if(n>=10){s+=teens[n-10]+' ';}
    else if(n>0){s+=units[n]+' ';}
    return s.trim();
  }
  if(n===0) return 'không';
  var groups=[],s='';
  var labels=['','nghìn','triệu','tỷ'];
  var tmp=n;
  while(tmp>0){groups.push(tmp%1000);tmp=Math.floor(tmp/1000);}
  for(var i=groups.length-1;i>=0;i--){
    if(groups[i]){s+=readHundreds(groups[i])+(labels[i]?' '+labels[i]:'')+' ';}
  }
  return s.trim();
}

/* ════════════════════════════════════════════════════════════════
   PAGE-FHS ENGINE — Bridge FHS panel sang page-fhs
   Dùng chung _fhsData, _fhsLoai, _fhsChip với overlay FHS
   Chỉ redirect DOM target khi đang ở page-fhs
   ════════════════════════════════════════════════════════════════ */

/* Xác định FHS đang ở mode nào: 'page' hoặc 'overlay' */
function _fhsMode() {
  return (typeof activeTable !== 'undefined' && activeTable === 'fhs') ? 'page' : 'overlay';
}

/* Lấy đúng element theo mode */
function _fhsEl(id) {
  if (_fhsMode() === 'page') {
    const pageMap = {
      'fhs-body':         'fhs-page-body',
      'fhs-sub-chips':    'fhs-page-sub-chips',
      'fhs-search-bar':   'fhs-page-search-bar',
      'fhs-search-input': 'fhs-page-search-input',
      'fhs-search-count': 'fhs-page-search-count',
      'fhs-info':         'fhs-page-info',
      'fhs-title':        'fhs-page-title',
      'fhs-sync-bar':     'fhs-page-sync-bar',
    };
    return document.getElementById(pageMap[id] || id);
  }
  return document.getElementById(id);
}

/* Patch: override getElementById chỉ cho các FHS calls — dùng Proxy nhẹ */
(function() {
  /* Patch fhsSelectLoai để dùng đúng container */
  var _orig = window.fhsSelectLoai;
  window.fhsSelectLoai = function(loai) {
    /* Sync loai-chip highlight cho page-fhs nếu đang ở đó */
    if (_fhsMode() === 'page') {
      document.querySelectorAll('#fhs-page-loai-chips .fhs-loai-chip').forEach(function(el) {
        el.classList.toggle('active', el.dataset.loai === loai);
      });
    }
    _orig(loai);
    /* Sau khi render overlay, copy nội dung sang page nếu cần */
    if (_fhsMode() === 'page') {
      _fhsPageSyncFromOverlay();
    }
  };
})();

/* Khi showPage('fhs') được gọi → init page FHS */
TD.onShowPage(function (name) { if (name === 'fhs') setTimeout(fhsPageInit, 50); }); // HM-13b

/* Init page-fhs lần đầu hoặc khi quay lại */
var _fhsPageInited = false;
function fhsPageInit() {
  /* Highlight chip đang active nếu đã có _fhsLoai */
  if (_fhsLoai) {
    document.querySelectorAll('#fhs-page-loai-chips .fhs-loai-chip').forEach(function(el) {
      el.classList.toggle('active', el.dataset.loai === _fhsLoai);
    });
    _fhsPageSyncFromOverlay();
  } else if (!_fhsPageInited) {
    /* Auto-chọn HMTD lần đầu */
    _fhsPageInited = true;
    fhsPageSelectLoai('HMTD');
  }
}

/* Chọn loại từ page-fhs chips */
function fhsPageSelectLoai(loai) {
  /* Delegate sang fhsSelectLoai (overlay engine), sau đó copy sang page */
  /* Tạm set activeTable để _fhsMode() trả về 'page' TRƯỚC khi gọi */
  var prevActive = typeof activeTable !== 'undefined' ? activeTable : '';
  if (typeof activeTable !== 'undefined') activeTable = 'fhs';
  fhsSelectLoai(loai);
  if (typeof activeTable !== 'undefined') activeTable = prevActive || 'fhs';
}

/* Copy rendered content từ overlay FHS body → page FHS body */
function _fhsPageSyncFromOverlay() {
  var src_body = document.getElementById('fhs-body');
  var dst_body = document.getElementById('fhs-page-body');
  var src_sub  = document.getElementById('fhs-sub-chips');
  var dst_sub  = document.getElementById('fhs-page-sub-chips');
  var src_sb   = document.getElementById('fhs-search-bar');
  var dst_sb   = document.getElementById('fhs-page-search-bar');
  var src_info = document.getElementById('fhs-info');
  var dst_info = document.getElementById('fhs-page-info');
  var src_title= document.getElementById('fhs-title');
  var dst_title= document.getElementById('fhs-page-title');

  if (dst_body && src_body) {
    /* Fix #4: không clone đè nếu user đang gõ vào input trong page body
       → tránh mất focus và mất nội dung đang nhập */
    var activeEl = document.activeElement;
    var userTypingInPage = (
        (dst_body && dst_body.contains && dst_body.contains(activeEl)) ||
        (dst_sub  && dst_sub.contains  && dst_sub.contains(activeEl))
      ) && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
      // P1-1 FIX: guard mở rộng cho dst_sub
      if (!userTypingInPage) {
      dst_body.innerHTML = src_body.innerHTML;
      _fhsPageBindInputs(dst_body);
    }
  }
  if (dst_sub && src_sub) {
    dst_sub.innerHTML = src_sub.innerHTML;
    dst_sub.style.display = src_sub.style.display || 'flex';
    /* Re-bind sub-chip clicks */
    dst_sub.querySelectorAll('.fhs-sub-chip').forEach(function(chip) {
      var key = chip.dataset.chip;
      chip.onclick = function() {
        /* Click sub-chip → delegate sang overlay engine rồi sync lại */
        var overlayChip = document.querySelector('#fhs-sub-chips .fhs-sub-chip[data-chip="'+key+'"]');
        if (overlayChip) overlayChip.click();
        setTimeout(_fhsPageSyncFromOverlay, 30);
      };
    });
  }
  if (dst_sb && src_sb) dst_sb.style.display = src_sb.style.display;
  if (dst_info && src_info) dst_info.textContent = src_info.textContent;
  if (dst_title && src_title) dst_title.textContent = src_title.textContent;
}

/* Bind inputs trong page-fhs body — sync lại vào overlay khi user nhập */
function _fhsPageBindInputs(container) {
  container.querySelectorAll('.fhs-row-input').forEach(function(inp) {
    /* Xác định field name từ row */
    var row = inp.closest('.fhs-row');
    if (!row) return;
    var fn = row.dataset.fn;
    /* Sync 2 chiều: khi nhập ở page → cập nhật overlay input cùng fn */
    inp.addEventListener('input', function() {
      var overlayInp = document.querySelector('#fhs-body .fhs-row[data-fn="'+fn+'"] .fhs-row-input');
      if (overlayInp && overlayInp.value !== inp.value) {
        overlayInp.value = inp.value;
        /* Trigger overlay input event để lưu vào _fhsData */
        overlayInp.dispatchEvent(new Event('input', {bubbles: true}));
        overlayInp.dispatchEvent(new Event('change', {bubbles: true}));
      }
      inp.classList.toggle('filled', !!inp.value);
    });
  });

  /* Re-bind nút ⚡ công thức — delegate sang overlay */
  container.querySelectorAll('[onclick*="_fhsShowFormulaMenu"]').forEach(function(btn) {
    var origOnclick = btn.getAttribute('onclick');
    btn.onclick = function() {
      /* Tìm nút tương ứng ở overlay và click */
      var row = btn.closest('.fhs-row');
      if (!row) return;
      var fn = row.dataset.fn;
      var overlayBtn = document.querySelector('#fhs-body .fhs-row[data-fn="'+fn+'"] [onclick*="_fhsShowFormulaMenu"]');
      if (overlayBtn) overlayBtn.click();
    };
  });

  /* Re-bind nút xóa field (🗑) */
  container.querySelectorAll('[onclick*="fhsClearField"]').forEach(function(btn) {
    var row = btn.closest('.fhs-row');
    if (!row) return;
    var fn = row.dataset.fn;
    btn.onclick = function() {
      var overlayBtn = document.querySelector('#fhs-body .fhs-row[data-fn="'+fn+'"] [onclick*="fhsClearField"]');
      if (overlayBtn) overlayBtn.click();
      setTimeout(_fhsPageSyncFromOverlay, 50);
    };
  });
}

/* Page-fhs wrappers cho các nút footer */
function fhsPageSaveAll()   { fhsSaveAll(); }
function fhsPageResetAll()  {
  /* Fix #1: bỏ confirm trùng — fhsResetAll() đã có confirm riêng */
  fhsResetAll();
  setTimeout(_fhsPageSyncFromOverlay, 50);
}
function fhsPageClearForm() {
  fhsClearForm();
  setTimeout(_fhsPageSyncFromOverlay, 50);
}
function fhsPageFilterFields(q) {
  /* Lọc trực tiếp trong page body */
  var rows = document.querySelectorAll('#fhs-page-body .fhs-row');
  var count = 0;
  rows.forEach(function(row) {
    var fn = (row.dataset.fn || '').toLowerCase();
    var inp = row.querySelector('.fhs-row-input');
    var val = inp ? inp.value.toLowerCase() : '';
    var match = !q || fn.includes(q.toLowerCase()) || val.includes(q.toLowerCase());
    row.style.display = match ? '' : 'none';
    if (match) count++;
  });
  var countEl = document.getElementById('fhs-page-search-count');
  if (countEl) countEl.textContent = q ? count + ' kết quả' : '';
}

/* Patch _fhsRenderRows để sau khi overlay render xong → tự sync sang page */
(function() {
  var _origRender = window._fhsRenderRows;
  if (typeof _origRender === 'function') {
    window._fhsRenderRows = function(loai, chip) {
      _origRender(loai, chip);
      if (_fhsMode() === 'page') {
        setTimeout(_fhsPageSyncFromOverlay, 20);
      }
    };
  }
})();

/* Patch _fhsUpdateInfo để update cả page info */
(function() {
  var _origInfo = window._fhsUpdateInfo;
  if (typeof _origInfo === 'function') {
    window._fhsUpdateInfo = function() {
      _origInfo();
      var src = document.getElementById('fhs-info');
      var dst = document.getElementById('fhs-page-info');
      if (src && dst) dst.textContent = src.textContent;
    };
  }
})();
function fhsInitNgayThangNam() {
  var now = new Date();
  var mm   = String(now.getMonth()+1).padStart(2,'0');
  var yyyy = now.getFullYear();
  document.querySelectorAll('.ngay-thang-nam-input').forEach(function(el){
    if (!el.value) el.placeholder = 'ngày ..... tháng ' + mm + ' năm ' + yyyy;
  });
}
function fhsNgayToText(hiddenId, textId) {
  var h = document.getElementById(hiddenId);
  var t = document.getElementById(textId);
  if (!h || !t || !h.value) return;
  var parts = h.value.split('-'); // YYYY-MM-DD
  if (parts.length !== 3) return;
  t.value = 'ngày ' + parts[2] + ' tháng ' + parts[1] + ' năm ' + parts[0];
}
function fhsTextToNgay(textEl, hiddenId) {
  var h = document.getElementById(hiddenId);
  if (!h) return;
  var v = textEl.value.trim();
  var m = v.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
  if (m) {
    h.value = m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
    if (hiddenId==='ngayHDTD' && typeof calcNgayDenHan==='function') calcNgayDenHan();
    if (hiddenId==='ngayNhanNo') {
      if (typeof calcNgayTraNoCuoi==='function') calcNgayTraNoCuoi();
      if (typeof calcLaiUocNN==='function') calcLaiUocNN();
    }
    return;
  }
  m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) h.value = m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
}
document.addEventListener('DOMContentLoaded', fhsInitNgayThangNam);

/* Tự động đọc số → chữ từ field nguồn sang field đích */
function fhsAutoSo2Chu(srcId, dstId) {
  var src = document.getElementById(srcId);
  var dst = document.getElementById(dstId);
  if (!src || !dst) return;
  var raw = (src.value || '').replace(/[^0-9]/g,'');
  var n = parseInt(raw);
  if (isNaN(n) || n < 0) { showToast&&showToast('⚠️ Chưa nhập số tiền','orange'); return; }
  var chu = (typeof docSo==='function' ? docSo(n) : _fhsSo2Chu(n));
  var v = chu.charAt(0).toUpperCase() + chu.slice(1) + ' đồng chẵn';
  dst.value = v;
  dst.classList.add('filled');
  showToast&&showToast('✅ '+v.slice(0,50),'green');
}

/* Placeholder date dạng ..../..../...... (kiểu filter) — 
   auto init cho các filter input dd/mm/yyyy */
function fhsInitDatePlaceholders() {
  document.querySelectorAll('input.date-input-vn[placeholder="dd/mm/yyyy"]').forEach(function(el){
    if (!el.value && !el.dataset.pInit) {
      el.placeholder = '../../../....';
      el.dataset.pInit = '1';
    }
  });
}

/* Hiện popup chọn nhanh (thay thế prompt để UX tốt hơn) */
function _fhsQuickPick(opts){
  var ex=document.getElementById('fhs-qp-popup'); if(ex)ex.remove();
  return new Promise(function(resolve){
    var m=document.createElement('div');
    m.id='fhs-qp-popup';
    m.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'+
      'background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.22);z-index:var(--z-8,100000);'+
      'padding:16px 20px;min-width:220px;font-family:inherit';
    m.innerHTML='<div style="font-size:12px;font-weight:700;color:#1a3a5c;margin-bottom:10px">Chọn một tùy chọn:</div>';
    opts.forEach(function(o){
      var btn=document.createElement('button');
      btn.textContent=o;
      btn.style.cssText='display:block;width:100%;text-align:left;padding:8px 12px;margin-bottom:5px;'+
        'border:1.5px solid #d0d9e6;border-radius:7px;background:#f5f8fc;cursor:pointer;'+
        'font-size:13px;font-weight:600;color:#1a3a5c;font-family:inherit;';
      btn.onmouseenter=function(){this.style.background='#e8f0fb';};
      btn.onmouseleave=function(){this.style.background='#f5f8fc';};
      btn.onclick=function(){m.remove();resolve(o);};
      m.appendChild(btn);
    });
    var cl=document.createElement('button');
    cl.textContent='✕ Hủy';
    cl.style.cssText='margin-top:4px;width:100%;padding:6px;border:none;background:none;color:#666;cursor:pointer;font-family:inherit;font-size:11px;';
    cl.onclick=function(){m.remove();resolve(null);};
    m.appendChild(cl);
    document.body.appendChild(m);
  });
}
/* Override _fhsQuickPick để dùng sync (vì applyFormula không async) */
(function(){
  window._fhsQuickPick=function(opts){
    // Dùng prompt với danh sách đánh số để thay thế Promise trong môi trường sync
    var list=opts.map(function(o,i){return (i+1)+'. '+o;}).join('\n');
    var ans=prompt('Chọn (nhập số thứ tự):\n\n'+list,'1');
    if(ans===null)return null;
    var idx=parseInt(ans)-1;
    if(isNaN(idx)||idx<0||idx>=opts.length){return null;}
    return opts[idx];
  };
})();

function _fhsN2W(n){
  if(n===0)return 'Không đồng';
  var u=['','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  function rg(g,isFirst){
    var h=Math.floor(g/100),t=Math.floor((g%100)/10),un=g%10,s='';
    if(h>0)s+=u[h]+' trăm'; else if(!isFirst&&(t>0||un>0))s+='không trăm';
    if(t>1)s+=(s?' ':'')+u[t]+' mươi'; else if(t===1)s+=(s?' ':'')+'mười'; else if(h>0&&un>0)s+=(s?' ':'')+'lẻ';
    if(un>0){var uw=(t>=2&&un===1)?'mốt':(t>=2&&un===5)?'lăm':u[un]; s+=(s?' ':'')+uw;}
    return s.trim();
  }
  var parts=[],ty=Math.floor(n/1e9),tr=Math.floor((n%1e9)/1e6),ng=Math.floor((n%1e6)/1e3),dv=n%1e3;
  if(ty>0)parts.push(rg(ty,!parts.length)+' tỷ');
  if(tr>0)parts.push(rg(tr,!parts.length)+' triệu');
  if(ng>0)parts.push(rg(ng,!parts.length)+' nghìn');
  if(dv>0)parts.push(rg(dv,!parts.length));
  var s=parts.join(' ').replace(/\s+/g,' ').trim();
  return s.charAt(0).toUpperCase()+s.slice(1)+' đồng';
}

// ── Open panel (no loai pre-selected) ─────────────────────────
function openFhsPanel(){
  document.getElementById('fhs-title').textContent='FORM HỒ SƠ';
  document.getElementById('fhs-subtitle').textContent='Chọn loại hồ sơ → Tab → Nhập → Xuất Word';
  document.getElementById('fhs-sub-chips').style.display='none';
  document.getElementById('fhs-search-bar').style.display='none';
  document.getElementById('fhs-body').innerHTML='<div class="fhs-empty">📋 Chọn loại hồ sơ bên trên để bắt đầu</div>';
  document.getElementById('fhs-info').textContent='Điền thông tin rồi xuất Word';
  // reset loai chip active
  document.querySelectorAll('.fhs-loai-chip').forEach(function(el){ el.classList.remove('active'); });
  _fhsLoai=null; _fhsChip=null;
  document.getElementById('fhs-overlay').classList.add('show');
}

function closeFhsForm(){
  document.getElementById('fhs-overlay').classList.remove('show');
}
function fhsOverlayClick(e){
  if(e.target===document.getElementById('fhs-overlay')) closeFhsForm();
}

// ── Select loại ───────────────────────────────────────────────
function fhsSelectLoai(loai){
  _fhsLoai=loai;
  // Highlight loai chip
  document.querySelectorAll('.fhs-loai-chip').forEach(function(el){
    el.classList.toggle('active', el.dataset.loai===loai);
  });
  var loaiData=FHS_DATA[loai];
  document.getElementById('fhs-title').textContent='FORM HỒ SƠ – '+loaiData.label;
  // Render sub-chips
  var sc=document.getElementById('fhs-sub-chips');
  sc.innerHTML='';
  sc.style.display='flex';
  var keys=Object.keys(loaiData.chips);
  keys.forEach(function(k){
    var c=loaiData.chips[k];
    var cnt=_fhsGetInst(loai,k).reduce(function(s,i){ return s+Object.keys(i).length; },0);
    var el=document.createElement('div');
    el.className='fhs-sub-chip'+(k===_fhsChip?' active':'');
    el.dataset.chip=k;
    el.innerHTML=c.icon+' '+c.label+
      ' <span style="background:#E8EDF4;color:#5A7080;border-radius:10px;padding:1px 7px;font-size:10px;margin-left:3px">'+
      c.fields.length+'</span>';
    el.onclick=(function(key){ return function(){
      _fhsChip=key;
      document.querySelectorAll('.fhs-sub-chip').forEach(function(e){ e.classList.remove('active'); });
      el.classList.add('active');
      _fhsRenderRows(loai,key);
      _fhsUpdateInfo();
      if (typeof fhsStepNavUpdate === 'function') setTimeout(fhsStepNavUpdate, 0);
    }; })(k);
    sc.appendChild(el);
  });
  // Auto-select first chip
  if(!_fhsChip || !loaiData.chips[_fhsChip]){
    _fhsChip=keys[0];
    sc.querySelector('.fhs-sub-chip').classList.add('active');
  }
  _fhsRenderRows(loai,_fhsChip);
  _fhsUpdateInfo();
  // Cập nhật thanh điều hướng bước
  if (typeof fhsStepNavUpdate === 'function') setTimeout(fhsStepNavUpdate, 0);
}

// ── Render rows ───────────────────────────────────────────────
function _fhsRenderRows(loai, chip){
  var chipData=_fhsGetChipData(loai,chip);
  var instances=_fhsGetInst(loai,chip);
  var body=document.getElementById('fhs-body');
  body.innerHTML='';

  // Show search bar
  var sb=document.getElementById('fhs-search-bar');
  sb.style.display='block';
  var si=document.getElementById('fhs-search-input');
  si.value='';
  document.getElementById('fhs-search-count').textContent='';

  var wrap=document.createElement('div');
  wrap.className='fhs-rows-wrap';
  body.appendChild(wrap);

  // ── Section title ──
  var st=document.createElement('div');
  st.className='fhs-section-title';
  st.innerHTML=chipData.icon+' '+chipData.label.toUpperCase();
  wrap.appendChild(st);

  // ── Excel-style table container ──
  var excelWrap=document.createElement('div');
  excelWrap.className='fhs-rows-wrap-excel';
  wrap.appendChild(excelWrap);
  wrap._excelWrap = excelWrap;
  // Column header row (Excel-style)
  var colHdr=document.createElement('div');
  colHdr.style.cssText='display:flex;align-items:center;background:#0D2137;color:#fff;font-size:10px;font-weight:800;letter-spacing:.4px;border-bottom:2px solid #1E4A77;min-height:28px;';
  colHdr.innerHTML=
    '<div style="width:34px;min-width:34px;text-align:center;padding:0 4px;flex-shrink:0;border-right:1px solid rgba(255,255,255,.15)">#</div>'+
    '<div style="width:195px;flex-shrink:0;padding:0 10px;border-right:1px solid rgba(255,255,255,.15)">TÊN TRƯỜNG</div>'+
    '<div style="min-width:120px;max-width:160px;flex-shrink:0;padding:0 8px;border-right:1px solid rgba(255,255,255,.15)">PLACEHOLDER</div>'+
    '<div style="flex:1;padding:0 10px;">GIÁ TRỊ NHẬP</div>';
  excelWrap.appendChild(colHdr);

  // ── Loop bar ──
  if(chipData.loop){
    _fhsBuildLoopBar(wrap, loai, chip, instances);
  }

  // ── Render each instance ──
  instances.forEach(function(iVals, idx){
    if(chipData.loop && instances.length>1){
      var hdr=document.createElement('div');
      hdr.className='fhs-instance-hdr';
      hdr.innerHTML='📌 Bộ '+(idx+1)+
        (chip==='tsbd'?' – Tài sản bảo đảm':
         chip==='tscc'?' – Sổ cầm cố':' – Thông tin');
      (wrap._excelWrap || wrap).appendChild(hdr);
    }
    var suffix=(chipData.loop && instances.length>1)?'_'+(idx+1):'';
    chipData.fields.forEach(function(fn, fi){
      var phName=fn+suffix;
      var row=document.createElement('div');
      row.className='fhs-row fhs-row-v2';
      row.dataset.fn=fn.toLowerCase();

      var num=document.createElement('div');
      num.className='fhs-row-num';
      num.textContent=(fi+1+(idx*chipData.fields.length));

      // Label wrapper — hover shows placeholder tooltip
      var lbl=document.createElement('div');
      lbl.className='fhs-row-label fhs-lbl-v2';
      lbl.textContent=fn+(suffix?' '+suffix:'');
      // Tooltip placeholder
      var ph=document.createElement('span');
      ph.className='fhs-ph-tip';
      ph.textContent='{{'+phName+'}}';
      lbl.appendChild(ph);

      // Input — with date auto-slash if needed
      var inp=document.createElement('input');
      inp.className='fhs-row-input';
      inp.type='text';
      var isDate=_fhsIsDateField(fn);
      if(isDate){
        inp.placeholder='DD/MM/YYYY';
        inp.maxLength=10;
        inp.classList.add('fhs-date-inp');
        inp.setAttribute('inputmode','numeric');
      } else {
        inp.placeholder='Nhập giá trị…';
      }
      inp.value=iVals[fn]||'';
      if(inp.value) inp.classList.add('filled');

      (function(field,iIdx){
        if(isDate){
          inp.addEventListener('keydown',function(e){
            if([8,46,9,27,13,37,38,39,40].indexOf(e.keyCode)!==-1||e.ctrlKey||e.metaKey)return;
            if(!/[0-9]/.test(e.key))e.preventDefault();
          });
          inp.addEventListener('input',function(){
            var digits=inp.value.replace(/[^0-9]/g,'');
            var out='';
            if(digits.length>=1)out=digits.substring(0,2);
            if(digits.length>2)out+='/'+digits.substring(2,4);
            if(digits.length>4)out+='/'+digits.substring(4,8);
            if(inp.value!==out)inp.value=out;
            _fhsGetInst(_fhsLoai,_fhsChip)[iIdx][field]=inp.value;
            inp.classList.toggle('filled',!!inp.value);
            _fhsAutoSave();
          });
        } else {
          inp.addEventListener('input',function(){
            _fhsGetInst(_fhsLoai,_fhsChip)[iIdx][field]=inp.value;
            inp.classList.toggle('filled',!!inp.value);
            _fhsAutoSave();
          });
        }
      })(fn,idx);

      // ── Action buttons ──
      var acts=document.createElement('div');
      acts.className='fhs-row-acts';

      var fBtn=document.createElement('button');
      fBtn.className='fhs-act-btn fhs-act-fx';
      fBtn.title='Công thức tự tính';
      fBtn.innerHTML='⚡';
      (function(field,iIdx,inputEl){
        fBtn.onclick=function(e){e.stopPropagation();_fhsShowFormulaMenu(field,iIdx,inputEl,fBtn,loai,chip);};
      })(fn,idx,inp);

      var eBtn=document.createElement('button');
      eBtn.className='fhs-act-btn fhs-act-edit';
      eBtn.title='Đổi tên trường / placeholder';
      eBtn.innerHTML='✏️';
      (function(field,chipKey,loaiKey){
        eBtn.onclick=function(e){e.stopPropagation();_fhsRenameField(loaiKey,chipKey,field);};
      })(fn,chip,loai);

      var dBtn=document.createElement('button');
      dBtn.className='fhs-act-btn fhs-act-del';
      dBtn.title='Xóa trường này';
      dBtn.innerHTML='🗑';
      (function(field,chipKey,loaiKey){
        dBtn.onclick=function(e){e.stopPropagation();_fhsDeleteField(loaiKey,chipKey,field);};
      })(fn,chip,loai);

      acts.appendChild(fBtn); acts.appendChild(eBtn); acts.appendChild(dBtn);

      row.appendChild(num);
      row.appendChild(lbl);
      row.appendChild(inp);
      row.appendChild(acts);
      (wrap._excelWrap || wrap).appendChild(row);
    });
  });

  // ── Add new field button ──
  var addRow=document.createElement('div');
  addRow.style.cssText='padding:10px 18px 4px;';
  var addBtn=document.createElement('button');
  addBtn.className='fhs-add-field-btn';
  addBtn.innerHTML='➕ Thêm trường mới vào tab này';
  (function(chipKey,loaiKey){addBtn.onclick=function(){_fhsAddField(loaiKey,chipKey);};})( chip,loai);
  addRow.appendChild(addBtn);
  wrap.appendChild(addRow);
}

// ── Loop bar builder ──────────────────────────────────────────
function _fhsBuildLoopBar(container, loai, chip, instances){
  var bar=document.createElement('div');
  bar.className='fhs-loop-bar';
  bar.id='fhs-loop-bar-'+chip;
  bar.innerHTML='<span>🔁 <strong>'+instances.length+'</strong> bộ '+
    (chip==='tsbd'||chip==='tscc'?'tài sản':'thông tin')+'</span>';
  var addBtn=document.createElement('button');
  addBtn.className='fhs-loop-btn fhs-loop-add';
  addBtn.textContent='➕ Thêm bộ';
  addBtn.onclick=function(){ _fhsAddInst(loai,chip); };
  bar.appendChild(addBtn);
  if(instances.length>1){
    var delBtn=document.createElement('button');
    delBtn.className='fhs-loop-btn fhs-loop-del';
    delBtn.textContent='✖ Xóa bộ cuối';
    delBtn.onclick=function(){ _fhsRemoveInst(loai,chip); };
    bar.appendChild(delBtn);
  }
  container.appendChild(bar);
}

function _fhsAddInst(loai,chip){
  var inst=_fhsGetInst(loai,chip);
  if(inst.length>=8){ if(window.showToast) showToast('⚠️ Tối đa 8 bộ','orange'); return; }
  inst.push({});
  _fhsRenderRows(loai,chip); _fhsUpdateInfo();
}
function _fhsRemoveInst(loai,chip){
  var inst=_fhsGetInst(loai,chip);
  if(inst.length<=1) return;
  inst.pop();
  _fhsRenderRows(loai,chip); _fhsUpdateInfo();
}

// ── Search / filter ───────────────────────────────────────────
function fhsFilterFields(q){
  q=q.trim().toLowerCase();
  var rows=document.querySelectorAll('#fhs-body .fhs-row');
  var shown=0;
  rows.forEach(function(row){
    var match= !q ||
      row.dataset.fn.includes(q) ||
      (row.querySelector('.fhs-row-ph')||{}).textContent.toLowerCase().includes(q) ||
      (row.querySelector('.fhs-row-input')||{}).value.toLowerCase().includes(q);
    row.classList.toggle('fhs-hidden',!match);
    row.classList.toggle('fhs-highlight', !!q && match);
    if(match) shown++;
  });
  document.getElementById('fhs-search-count').textContent =
    q ? (shown+'/'+rows.length) : '';
}

// ── Utility ───────────────────────────────────────────────────
function _fhsUpdateInfo(){
  if(!_fhsLoai||!_fhsChip) return;
  var cd=FHS_DATA[_fhsLoai].chips[_fhsChip];
  var inst=_fhsGetInst(_fhsLoai,_fhsChip);
  var total=cd.fields.length*inst.length;
  var filled=inst.reduce(function(s,iv){
    return s+Object.keys(iv).filter(function(k){ return iv[k]; }).length;
  },0);
  document.getElementById('fhs-info').textContent=
    FHS_DATA[_fhsLoai].label+' › '+cd.label+
    ' • '+filled+'/'+total+' đã nhập';
}

function fhsClearForm(){
  if(!_fhsLoai||!_fhsChip) return;
  if(!confirm('Xóa tất cả giá trị đã nhập trong tab này?')) return;
  _fhsVals[_fhsKey(_fhsLoai,_fhsChip)]=[{}];
  _fhsRenderRows(_fhsLoai,_fhsChip); _fhsUpdateInfo();
}

// ── Xuất DOCX ─────────────────────────────────────────────────
async function fhsExportDocx(){
  if(!_fhsLoai||!_fhsChip){ alert('Vui lòng chọn loại hồ sơ trước.'); return; }
  if(typeof docx==='undefined'){ alert('Đang tải thư viện docx… vui lòng thử lại sau 2 giây.'); return; }
  var loaiData=FHS_DATA[_fhsLoai];
  var allChips=Object.keys(loaiData.chips);
  try{
    var D=docx;
    var children=[];
    children.push(new D.Paragraph({
      alignment:D.AlignmentType.CENTER, spacing:{after:200},
      children:[new D.TextRun({text:'HỒ SƠ '+loaiData.label,bold:true,size:32,font:'Times New Roman',color:'0D2137'})]
    }));
    children.push(new D.Paragraph({
      alignment:D.AlignmentType.CENTER, spacing:{after:400},
      children:[new D.TextRun({text:'Agribank – Chi nhánh Thiên Trường Nam Định',size:22,font:'Times New Roman',color:'5A7080',italics:true})]
    }));
    var bd={style:D.BorderStyle.SINGLE,size:1,color:'CCCCCC'};
    var bds={top:bd,bottom:bd,left:bd,right:bd};
    for(var ci=0;ci<allChips.length;ci++){
      var cKey=allChips[ci];
      var cData=loaiData.chips[cKey];
      var instances=_fhsGetInst(_fhsLoai,cKey);
      children.push(new D.Paragraph({
        spacing:{before:300,after:120},
        children:[new D.TextRun({text:cData.label.toUpperCase(),bold:true,size:26,font:'Times New Roman',color:'0D2137'})]
      }));
      children.push(new D.Paragraph({
        border:{bottom:{style:D.BorderStyle.SINGLE,size:6,color:'1E4A77',space:1}},
        spacing:{after:160}
      }));
      for(var ii=0;ii<instances.length;ii++){
        var iVals=instances[ii];
        var suffix=(cData.loop&&instances.length>1)?'_'+(ii+1):'';
        if(cData.loop&&instances.length>1){
          children.push(new D.Paragraph({
            spacing:{before:160,after:80},
            children:[new D.TextRun({
              text:'📌 Bộ '+(ii+1)+(cKey==='tsbd'?' – Tài sản bảo đảm':cKey==='tscc'?' – Sổ cầm cố':' – Thông tin'),
              bold:true,size:22,font:'Times New Roman',color:'1E4A77'
            })]
          }));
        }
        var hRow=new D.TableRow({tableHeader:true,children:[
          new D.TableCell({borders:bds,width:{size:3800,type:D.WidthType.DXA},
            shading:{fill:'0D2137',type:D.ShadingType.CLEAR},
            margins:{top:70,bottom:70,left:100,right:100},
            children:[new D.Paragraph({children:[new D.TextRun({text:'TRƯỜNG THÔNG TIN',bold:true,color:'FFFFFF',size:18,font:'Times New Roman'})]})]
          }),
          new D.TableCell({borders:bds,width:{size:5560,type:D.WidthType.DXA},
            shading:{fill:'0D2137',type:D.ShadingType.CLEAR},
            margins:{top:70,bottom:70,left:100,right:100},
            children:[new D.Paragraph({children:[new D.TextRun({text:'GIÁ TRỊ / PLACEHOLDER',bold:true,color:'FFFFFF',size:18,font:'Times New Roman'})]})]
          })
        ]});
        var dataRows=cData.fields.map(function(fn,ri){
          var val=iVals[fn]||'';
          var phName=fn+suffix;
          var display=val!==''?val:'{{'+phName+'}}';
          var isPlaceholder=val==='';
          var bg=ri%2===0?'FFFFFF':'F5F7FA';
          return new D.TableRow({children:[
            new D.TableCell({borders:bds,width:{size:3800,type:D.WidthType.DXA},
              shading:{fill:bg,type:D.ShadingType.CLEAR},
              margins:{top:50,bottom:50,left:100,right:80},
              children:[new D.Paragraph({children:[new D.TextRun({text:phName,size:19,font:'Times New Roman'})]})]
            }),
            new D.TableCell({borders:bds,width:{size:5560,type:D.WidthType.DXA},
              shading:{fill:bg,type:D.ShadingType.CLEAR},
              margins:{top:50,bottom:50,left:100,right:80},
              children:[new D.Paragraph({children:[new D.TextRun({
                text:display,size:19,font:'Times New Roman',
                bold:!isPlaceholder,color:isPlaceholder?'1E4A77':'000000',italics:isPlaceholder
              })]})]
            })
          ]});
        });
        children.push(new D.Table({
          width:{size:9360,type:D.WidthType.DXA},
          columnWidths:[3800,5560],
          rows:[hRow].concat(dataRows)
        }));
        children.push(new D.Paragraph({spacing:{after:160}}));
      }
    }
    children.push(new D.Paragraph({spacing:{before:400}}));
    children.push(new D.Paragraph({
      alignment:D.AlignmentType.RIGHT,
      children:[new D.TextRun({text:'Ninh Bình, ngày _____ tháng _____ năm _____',size:20,font:'Times New Roman',italics:true})]
    }));
    var doc=new D.Document({sections:[{
      properties:{page:{size:{width:11906,height:16838},margin:{top:1134,right:851,bottom:1134,left:1701}}},
      children:children
    }]});
    var buffer=await D.Packer.toBuffer(doc);
    var blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    var now=new Date();
    var stamp=('0'+now.getDate()).slice(-2)+('0'+(now.getMonth()+1)).slice(-2)+now.getFullYear();
    var filename='HoSo_'+_fhsLoai+'_'+stamp+'.docx';
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download=filename; a.click();
    URL.revokeObjectURL(url);
    if(window.showToast) showToast('✅ Xuất '+filename+' thành công','green');
  }catch(err){
    console.error(err);
    alert('Lỗi xuất file: '+err.message);
  }
}

// ── Legacy compat ─────────────────────────────────────────────
function openFhsForm(loai, chip){
  openFhsPanel();
  setTimeout(function(){ fhsSelectLoai(loai); },50);
  setTimeout(function(){
    if(chip){
      _fhsChip=chip;
      document.querySelectorAll('.fhs-sub-chip').forEach(function(el){
        el.classList.toggle('active', el.dataset.chip===chip);
      });
      _fhsRenderRows(loai,chip); _fhsUpdateInfo();
    }
  },120);
}
function toggleFhsNav(){}

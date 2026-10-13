// G2-12: mẫu trích xuất giấy tờ Việt Nam — danh sách trường, gợi ý cho AI và quy tắc kiểm tra.
export type FieldRule = { label: string; hint: string; required?: boolean; check?: (v: string) => boolean };
export type VnTemplate = { id: string; type: string; label: string; guide: string; fields: FieldRule[] };

const digits = (v: string) => v.replace(/\D/g, "");
export const isTaxCode = (v: string) => /^\d{10}(-?\d{3})?$/.test(v.replace(/[\s.]/g, ""));
export const isDate = (v: string) => /^(0?[1-9]|[12]\d|3[01])[/.-](0?[1-9]|1[0-2])[/.-](19|20)\d{2}$/.test(v.trim());
export const isMoney = (v: string) => /\d/.test(v) && /^[\d\s.,]+(đ|vnđ|vnd|đồng)?$/i.test(v.trim());
export const parseMoney = (v: string) => Number(digits(v.split(/[,](?=\d{1,2}$)/)[0])) || 0;
/** Biển số VN: 30A-123.45, 51F1-234.56, 29-B1 123.45 */
export const isPlate = (v: string) => /^\d{2}\s*-?\s*[A-Z]{1,2}\d?\s*-?\s*\d{3}\.?\d{1,2}$/i.test(v.trim());
export const isVin = (v: string) => /^[A-HJ-NPR-Z0-9]{6,17}$/i.test(v.replace(/[\s-]/g, ""));

/** GPLX PET: 12 chữ số. */
export const isLicenseNo = (v: string) => /^\d{12}$/.test(v.replace(/\s/g, ""));
export const isLicenseClass = (v: string) => /^(A1|A2|A3|A4|A|B1|B2|B|C1|C|D1|D2|D|BE|C1E|CE|D1E|D2E|DE|FB2|FC|FD|FE)(\s*[,;]\s*(A1|A2|A3|A4|A|B1|B2|B|C1|C|D1|D2|D|BE|C1E|CE|D1E|D2E|DE|FB2|FC|FD|FE))*$/i.test(v.trim());

export const VN_TEMPLATES: VnTemplate[] = [
  {
    id: "vat", type: "Hoá đơn", label: "Hoá đơn VAT",
    guide: "Hoá đơn giá trị gia tăng (GTGT/VAT), có thể là hoá đơn điện tử.",
    fields: [
      { label: "Ký hiệu", hint: "ký hiệu hoá đơn, vd 1C26TAA" },
      { label: "Số hoá đơn", hint: "số hoá đơn", required: true, check: (v) => /\d/.test(v) },
      { label: "Ngày", hint: "ngày lập hoá đơn dd/mm/yyyy", required: true, check: isDate },
      { label: "Bên bán", hint: "tên đơn vị bán", required: true },
      { label: "Mã số thuế bên bán", hint: "MST 10 hoặc 13 số", required: true, check: isTaxCode },
      { label: "Bên mua", hint: "tên người/đơn vị mua" },
      { label: "Mã số thuế bên mua", hint: "MST bên mua nếu có", check: isTaxCode },
      { label: "Tiền trước thuế", hint: "cộng tiền hàng", check: isMoney },
      { label: "Thuế suất", hint: "vd 8% hoặc 10%", check: (v) => /^(0|5|8|10|KCT|KKKNT)\s*%?$/i.test(v.trim()) },
      { label: "Tiền thuế", hint: "tiền thuế GTGT", check: isMoney },
      { label: "Tổng thanh toán", hint: "tổng cộng tiền thanh toán", required: true, check: isMoney },
      { label: "Mã tra cứu", hint: "mã tra cứu/mã CQT nếu có" },
    ],
  },
  {
    id: "xe", type: "Giấy đăng ký xe", label: "Giấy đăng ký xe",
    guide: "Giấy chứng nhận đăng ký xe (cà vẹt) ô tô hoặc mô tô.",
    fields: [
      { label: "Chủ xe", hint: "tên chủ xe", required: true },
      { label: "Địa chỉ", hint: "địa chỉ chủ xe" },
      { label: "Biển số", hint: "biển số đăng ký, vd 30A-123.45", required: true, check: isPlate },
      { label: "Nhãn hiệu", hint: "nhãn hiệu xe" },
      { label: "Số loại", hint: "số loại/model" },
      { label: "Màu sơn", hint: "màu sơn" },
      { label: "Số máy", hint: "số máy", required: true, check: isVin },
      { label: "Số khung", hint: "số khung", required: true, check: isVin },
      { label: "Dung tích", hint: "dung tích xi lanh, cm3" },
      { label: "Ngày đăng ký", hint: "ngày đăng ký lần đầu dd/mm/yyyy", check: isDate },
    ],
  },
  {
    id: "sodo", type: "Sổ đỏ", label: "Sổ đỏ / sổ hồng",
    guide: "Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở và tài sản gắn liền với đất.",
    fields: [
      { label: "Số phát hành", hint: "số seri phát hành, vd CS 123456", required: true, check: (v) => /^[A-Z]{2}\s?\d{6,}$/i.test(v.trim()) },
      { label: "Số vào sổ", hint: "số vào sổ cấp GCN" },
      { label: "Người sử dụng", hint: "họ tên người sử dụng đất/chủ sở hữu", required: true },
      { label: "Thửa đất số", hint: "số thửa", required: true, check: (v) => /\d/.test(v) },
      { label: "Tờ bản đồ số", hint: "số tờ bản đồ", required: true, check: (v) => /\d/.test(v) },
      { label: "Địa chỉ thửa đất", hint: "địa chỉ thửa đất" },
      { label: "Diện tích", hint: "diện tích m²", required: true, check: (v) => /\d/.test(v) },
      { label: "Mục đích sử dụng", hint: "vd Đất ở tại đô thị" },
      { label: "Thời hạn sử dụng", hint: "vd Lâu dài" },
      { label: "Ngày cấp", hint: "ngày cấp dd/mm/yyyy", check: isDate },
    ],
  },
  // G2-13: bằng lái, giấy khai sinh, hợp đồng.
  {
    id: "banglai", type: "Bằng lái", label: "Giấy phép lái xe",
    guide: "Giấy phép lái xe Việt Nam (thẻ PET), hạng A1, A, B, C...",
    fields: [
      { label: "Số GPLX", hint: "số giấy phép, 12 chữ số", required: true, check: isLicenseNo },
      { label: "Họ tên", hint: "họ và tên", required: true },
      { label: "Ngày sinh", hint: "dd/mm/yyyy", required: true, check: isDate },
      { label: "Quốc tịch", hint: "vd Việt Nam" },
      { label: "Nơi cư trú", hint: "địa chỉ cư trú" },
      { label: "Hạng", hint: "vd A1, B, C1", required: true, check: isLicenseClass },
      { label: "Ngày cấp", hint: "ngày trúng tuyển/cấp dd/mm/yyyy", check: isDate },
      { label: "Có giá trị đến", hint: "dd/mm/yyyy hoặc Không thời hạn", check: (v) => isDate(v) || /không thời hạn/i.test(v) },
    ],
  },
  {
    id: "khaisinh", type: "Giấy khai sinh", label: "Giấy khai sinh",
    guide: "Giấy khai sinh (bản chính hoặc trích lục) do UBND cấp xã cấp.",
    fields: [
      { label: "Họ tên", hint: "họ, chữ đệm, tên người được khai sinh", required: true },
      { label: "Ngày sinh", hint: "dd/mm/yyyy", required: true, check: isDate },
      { label: "Giới tính", hint: "Nam hoặc Nữ", required: true, check: (v) => /^(nam|nữ)$/i.test(v.trim()) },
      { label: "Dân tộc", hint: "vd Kinh" },
      { label: "Quốc tịch", hint: "vd Việt Nam" },
      { label: "Nơi sinh", hint: "nơi sinh" },
      { label: "Số định danh cá nhân", hint: "12 chữ số", check: (v) => /^\d{12}$/.test(digits(v)) && digits(v).length === v.replace(/\s/g, "").length },
      { label: "Họ tên mẹ", hint: "họ tên người mẹ" },
      { label: "Họ tên cha", hint: "họ tên người cha" },
      { label: "Số", hint: "số đăng ký khai sinh" },
      { label: "Ngày đăng ký", hint: "dd/mm/yyyy", check: isDate },
    ],
  },
  {
    id: "hopdong", type: "Hợp đồng", label: "Hợp đồng",
    guide: "Hợp đồng (mua bán, dịch vụ, lao động, thuê...) giữa Bên A và Bên B.",
    fields: [
      { label: "Số hợp đồng", hint: "số/ký hiệu hợp đồng, vd 12/2026/HĐMB" },
      { label: "Tên hợp đồng", hint: "vd Hợp đồng mua bán", required: true },
      { label: "Ngày ký", hint: "dd/mm/yyyy", required: true, check: isDate },
      { label: "Bên A", hint: "tên bên A", required: true },
      { label: "Mã số thuế bên A", hint: "MST bên A nếu có", check: isTaxCode },
      { label: "Bên B", hint: "tên bên B", required: true },
      { label: "Mã số thuế bên B", hint: "MST bên B nếu có", check: isTaxCode },
      { label: "Giá trị hợp đồng", hint: "tổng giá trị", check: isMoney },
      { label: "Thời hạn", hint: "thời hạn thực hiện" },
      { label: "Ngày hiệu lực", hint: "dd/mm/yyyy", check: isDate },
      { label: "Ngày hết hạn", hint: "dd/mm/yyyy", check: isDate },
    ],
  },
];

const toTime = (v: string) => { const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : NaN; };

export const templateById = (id?: string) => VN_TEMPLATES.find((t) => t.id === id);
export const templateByType = (type: string) => VN_TEMPLATES.find((t) => t.type === type);

/** Đoạn hướng dẫn thêm vào lời nhắc AI khi người dùng chọn mẫu. */
export function templatePrompt(t: VnTemplate) {
  return `\nNgười dùng đã chọn mẫu "${t.label}" (${t.guide}). Đặt type = "${t.type}". fields phải dùng ĐÚNG các nhãn sau theo thứ tự, bỏ qua trường không thấy trong ảnh:\n${t.fields.map((f) => `- ${f.label}: ${f.hint}`).join("\n")}`;
}

/** Kiểm tra trường theo mẫu: sai định dạng + đối chiếu tiền hàng + thuế = tổng (hoá đơn). */
export function checkTemplateFields(t: VnTemplate, fields: { label: string; value: string }[]) {
  const get = (l: string) => fields.find((f) => f.label.toLowerCase() === l.toLowerCase())?.value.trim() ?? "";
  const bad = new Set<string>();
  for (const r of t.fields) { const v = get(r.label); if (v && r.check && !r.check(v)) bad.add(r.label); }
  const notes: string[] = [];
  if (t.id === "vat") {
    const pre = parseMoney(get("Tiền trước thuế")), tax = parseMoney(get("Tiền thuế")), total = parseMoney(get("Tổng thanh toán"));
    if (pre && tax && total && Math.abs(pre + tax - total) > Math.max(2, total * 0.001)) {
      bad.add("Tổng thanh toán"); notes.push("Tiền trước thuế + tiền thuế không khớp tổng thanh toán");
    }
  }
  const before = (a: string, b: string, note: string) => {
    const x = toTime(get(a)), y = toTime(get(b));
    if (!isNaN(x) && !isNaN(y) && x > y) { bad.add(b); notes.push(note); }
  };
  if (t.id === "banglai") { before("Ngày sinh", "Ngày cấp", "Ngày cấp trước ngày sinh"); before("Ngày cấp", "Có giá trị đến", "Hết hạn trước ngày cấp"); }
  if (t.id === "khaisinh") before("Ngày sinh", "Ngày đăng ký", "Ngày đăng ký trước ngày sinh");
  if (t.id === "hopdong") { before("Ngày hiệu lực", "Ngày hết hạn", "Ngày hết hạn trước ngày hiệu lực"); const a = get("Bên A"), b = get("Bên B"); if (a && b && a.toLowerCase() === b.toLowerCase()) { bad.add("Bên B"); notes.push("Bên A và Bên B trùng nhau"); } }
  return { bad: [...bad], notes, required: t.fields.filter((f) => f.required).map((f) => f.label) };
}

import { describe, expect, it } from "vitest";
import { detectDocType, normalizeText, DOC_TYPE_MIN_CONFIDENCE } from "./doc-type";

describe("normalizeText", () => {
  it("bỏ dấu và thường hoá", () => {
    expect(normalizeText("Hoá Đơn  GTGT Đồng")).toBe("hoa don gtgt dong");
  });
});

describe("detectDocType", () => {
  it("nhận hoá đơn VAT từ chữ OCR", () => {
    const text = "HOÁ ĐƠN GIÁ TRỊ GIA TĂNG (GTGT) Ký hiệu 1C26TAA Số 0001234 Đơn vị bán: Công ty TNHH ABC Mã số thuế: 0101234567 Cộng tiền hàng: 1.000.000 Thuế suất: 10% Tiền thuế GTGT: 100.000 Tổng cộng tiền thanh toán: 1.100.000";
    const r = detectDocType(text)!;
    expect(r.template.id).toBe("vat");
    expect(r.confidence).toBeGreaterThanOrEqual(DOC_TYPE_MIN_CONFIDENCE);
  });

  it("nhận giấy đăng ký xe nhờ từ khoá + biển số", () => {
    const text = "GIẤY CHỨNG NHẬN ĐĂNG KÝ XE Chủ xe: Nguyễn Văn A Biển số: 30A-123.45 Nhãn hiệu: TOYOTA Số khung: RLHBC123456789012 Số máy: 2ZR1234567 Màu sơn: Trắng";
    expect(detectDocType(text)!.template.id).toBe("xe");
  });

  it("nhận giấy khai sinh", () => {
    const text = "GIẤY KHAI SINH Họ tên: Trần Thị B Ngày sinh: 01/02/2020 Nơi sinh: Hà Nội Quê quán: Nam Định Dân tộc: Kinh Họ tên cha: Trần Văn C Họ tên mẹ: Nguyễn Thị D";
    expect(detectDocType(text)!.template.id).toBe("khaisinh");
  });

  it("nhận hợp đồng", () => {
    const text = "HỢP ĐỒNG MUA BÁN Số 12/2026/HĐMB Bên A: Công ty X Bên B: Công ty Y Giá trị hợp đồng: 500.000.000 đồng Ngày hiệu lực: 01/10/2026 Ngày hết hạn: 01/10/2027 Các điều khoản thoả thuận";
    expect(detectDocType(text)!.template.id).toBe("hopdong");
  });

  it("vẫn nhận được khi OCR mất dấu", () => {
    const text = "GIAY KHAI SINH Ho ten: Le Van E Ngay sinh: 05/06/2019 Noi sinh: Hue Que quan: Quang Tri Dan toc: Kinh Ho ten cha: Le Van F Ho ten me: Pham Thi G";
    expect(detectDocType(text)!.template.id).toBe("khaisinh");
  });

  it("trả null với văn bản chung chung", () => {
    expect(detectDocType("xin chào hôm nay trời đẹp quá, đi chơi không")).toBeNull();
  });

  it("trả null với văn bản quá ngắn", () => {
    expect(detectDocType("hoa don")).toBeNull();
  });

  it("trả null khi hai loại ngang nhau (không đủ chắc)", () => {
    const text = "biên bản họp có nhắc hợp đồng và hoá đơn gtgt cùng mã số thuế của công ty";
    const r = detectDocType(text);
    if (r) expect(r.confidence).toBeGreaterThanOrEqual(DOC_TYPE_MIN_CONFIDENCE);
  });
});

import { describe, expect, it } from "vitest";
import { createP12, importP12, isCertValid } from "./p12";

describe("p12", () => {
  it("tạo .p12 rồi mở lại đúng mật khẩu, giữ nguyên thông tin", () => {
    const { p12Bytes, info } = createP12({
      commonName: "Nguyen Van A",
      organization: "Lop 12A",
      email: "a@example.com",
      password: "matkhau1",
      days: 30,
    });
    expect(p12Bytes.length).toBeGreaterThan(500);
    const opened = importP12(p12Bytes, "matkhau1");
    expect(opened.info.commonName).toBe("Nguyen Van A");
    expect(opened.info.organization).toBe("Lop 12A");
    expect(opened.info.sha256Fingerprint).toBe(info.sha256Fingerprint);
    expect(opened.privateKeyPem).toContain("PRIVATE KEY");
  });

  it("sai mật khẩu thì báo lỗi rõ ràng", () => {
    const { p12Bytes } = createP12({
      commonName: "B",
      password: "dung123",
    });
    expect(() => importP12(p12Bytes, "sai456")).toThrow(/mật khẩu|hỏng/);
  });

  it("kiểm tra hạn chứng thư", () => {
    const { info } = createP12({ commonName: "C", password: "abc123", days: 10 });
    expect(isCertValid(info, new Date())).toBe(true);
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(isCertValid(info, future)).toBe(false);
    expect(() => createP12({ commonName: "D", password: "123" })).toThrow();
  });
});

// TD-33 (P18): tên có dấu tiếng Việt. Trước khi sửa, .p12 do app tạo với tên có dấu không mở lại được
// (forge ghi CN là PrintableString và friendlyName BMPString từ chuỗi thô → cắt byte, hỏng MAC),
// còn .p12 tạo bằng openssl (CN UTF8String) hiện tên vỡ mã "Nguyá»n…".
describe("p12 – tên tiếng Việt (TD-33)", () => {
  it("tạo .p12 tên có dấu rồi mở lại được, giữ đúng tên", () => {
    const { p12Bytes, info } = createP12({ commonName: "Nguyễn Văn Thử", organization: "Công ty Ánh Dương", password: "matkhau1", days: 30 });
    expect(info.commonName).toBe("Nguyễn Văn Thử");
    const opened = importP12(p12Bytes, "matkhau1");
    expect(opened.info.commonName).toBe("Nguyễn Văn Thử");
    expect(opened.info.organization).toBe("Công ty Ánh Dương");
    expect(opened.info.sha256Fingerprint).toBe(info.sha256Fingerprint);
  });
  it("đọc đúng tên UTF-8 trong .p12 tạo bằng openssl (AES-256/PBES2, có chuỗi CA)", async () => {
    const { readFileSync } = await import("node:fs");
    const bytes = new Uint8Array(readFileSync("src/test/fixtures/p12-openssl-utf8-chi-de-thu.p12"));
    const k = importP12(bytes, "matkhau123");
    expect(k.info.commonName).toBe("Nguyễn Văn Thử");
    expect(k.info.organization).toBe("P18");
  });
});

describe("p12 – số serial dương (RFC 5280)", () => {
  it("byte đầu của serial < 0x80", () => {
    for (let i = 0; i < 8; i++) {
      const { p12Bytes } = createP12({ commonName: "A", password: "matkhau1", days: 1 });
      expect(parseInt(importP12(p12Bytes, "matkhau1").info.serialNumber.slice(0, 2), 16)).toBeLessThan(0x80);
    }
  });
});

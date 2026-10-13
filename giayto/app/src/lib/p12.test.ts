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

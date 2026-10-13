import { describe, expect, it } from "vitest";
import { checkPassword, expiresAt, hashPassword, linkStatus, newToken, shareUrl, verifyPassword } from "./share-links";

describe("share-links (G3-06)", () => {
  it("hạn 7 ngày tính từ lúc tạo; không hết hạn trả null", () => {
    const now = Date.parse("2026-10-03T00:00:00Z");
    expect(expiresAt("7d", now)).toBe("2026-10-10T00:00:00.000Z");
    expect(expiresAt("1h", now)).toBe("2026-10-03T01:00:00.000Z");
    expect(expiresAt("never", now)).toBeNull();
  });
  it("mật khẩu đúng mở được, sai thì không", async () => {
    const h = await hashPassword("abcd1234");
    expect(h.startsWith("pbkdf2$")).toBe(true);
    expect(await verifyPassword("abcd1234", h)).toBe(true);
    expect(await verifyPassword("abcd1235", h)).toBe(false);
  });
  it("mật khẩu ngắn hơn 4 ký tự bị từ chối, để trống thì không cần", () => {
    expect(checkPassword("abc")).not.toBeNull();
    expect(checkPassword("")).toBeNull();
  });
  it("liên kết hết hạn/thu hồi không còn hiệu lực", () => {
    const now = Date.parse("2026-10-03T00:00:00Z");
    expect(linkStatus({ expires_at: "2026-10-02T00:00:00Z", revoked_at: null }, now)).toBe("expired");
    expect(linkStatus({ expires_at: null, revoked_at: "2026-10-01T00:00:00Z" }, now)).toBe("revoked");
    expect(linkStatus({ expires_at: null, revoked_at: null }, now)).toBe("active");
  });
  it("mã liên kết 22 ký tự, không trùng, URL dạng /s/<mã>", () => {
    const a = newToken(); expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/); expect(newToken()).not.toBe(a);
    expect(shareUrl("https://x.app/", a)).toBe(`https://x.app/s/${a}`);
  });
});

describe("G3-07 thu hồi", () => {
  it("liên kết đã thu hồi không mở được dù còn hạn", () => {
    expect(linkStatus({ expires_at: "2099-01-01T00:00:00Z", revoked_at: "2026-10-03T00:00:00Z" }, Date.parse("2026-10-03T01:00:00Z"))).toBe("revoked");
  });
});

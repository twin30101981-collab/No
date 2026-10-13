import { describe, expect, it } from "vitest";
import { mailtoUrl, sendMessage, zaloShareUrl } from "./send-to";

describe("send-to", () => {
  it("builds mailto with valid recipients only and Vietnamese subject", () => {
    const u = mailtoUrl({ to: "a@b.vn; sai, c@d.com", subject: "Hợp đồng", body: "Xin chào" });
    expect(u.startsWith("mailto:a%40b.vn,c%40d.com?subject=")).toBe(true);
    expect(decodeURIComponent(u.split("subject=")[1]!.split("&")[0]!)).toBe("Hợp đồng");
    expect(u).toContain("&body=");
  });
  it("trims long bodies under the URL limit", () => {
    const u = mailtoUrl({ subject: "x", body: "Đ".repeat(5000) });
    expect(u.length).toBeLessThanOrEqual(1800);
    expect(decodeURIComponent(u).endsWith("…")).toBe(true);
  });
  it("zalo link and message", () => {
    expect(zaloShareUrl("https://x.vn/s/1?a=b")).toBe("https://zalo.me/share?url=https%3A%2F%2Fx.vn%2Fs%2F1%3Fa%3Db");
    expect(sendMessage("CCCD", 2)).toContain("(2 trang)");
    expect(sendMessage("CCCD", 2, "https://l")).toContain("Xem tại: https://l");
  });
});

import { describe, expect, it } from "vitest";
import { isAppSwUrl, swScriptUrl } from "./offline";

// HM-08: SW đăng ký với ?v=<mã build>; mã gỡ SW cũ phải nhận ra địa chỉ có query.
describe("địa chỉ đăng ký service worker", () => {
  it("gắn mã bản build; không có mã thì dùng 'dev'", () => {
    expect(swScriptUrl("20261012a")).toBe("/sw.js?v=20261012a");
    expect(swScriptUrl(undefined)).toBe("/sw.js?v=dev");
    expect(swScriptUrl("a b&c")).toBe("/sw.js?v=a%20b%26c");
  });
  it("isAppSwUrl nhận cả địa chỉ cũ lẫn có ?v=, bỏ qua SW khác", () => {
    expect(isAppSwUrl("https://x.app/sw.js")).toBe(true);
    expect(isAppSwUrl("https://x.app/sw.js?v=1")).toBe(true);
    expect(isAppSwUrl("https://x.app/other-sw.js")).toBe(false);
    expect(isAppSwUrl("")).toBe(false);
  });
});

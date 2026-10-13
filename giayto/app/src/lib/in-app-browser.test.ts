import { describe, expect, it } from "vitest";
import { chromeIntentUrl, detectInAppBrowser } from "./in-app-browser";

const ANDROID = "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36";
describe("BL-00 / GG-03 trình duyệt nhúng", () => {
  it("nhận ra Zalo, Facebook, Messenger, Instagram, TikTok, Line", () => {
    expect(detectInAppBrowser(ANDROID + " Zalo/22.1")).toBe("Zalo");
    expect(detectInAppBrowser("Mozilla/5.0 (iPhone) AppleWebKit/605 [FBAN/FBIOS;FBAV/450.0]")).toBe("Facebook");
    expect(detectInAppBrowser(ANDROID + " [FB_IAB/Orca-Android;FBAV/400]")).toBe("Facebook");
    expect(detectInAppBrowser("Mozilla/5.0 (iPhone) Instagram 300.0")).toBe("Instagram");
    expect(detectInAppBrowser(ANDROID + " musical_ly_2023")).toBe("TikTok");
    expect(detectInAppBrowser(ANDROID + " Line/13.0")).toBe("Line");
  });
  it("Android WebView chung bị chặn; Chrome/Safari thường thì không", () => {
    expect(detectInAppBrowser("Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 Version/4.0 Chrome/118 Mobile Safari/537.36")).toBe("ứng dụng khác");
    expect(detectInAppBrowser(ANDROID)).toBeNull();
    expect(detectInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBeNull();
    expect(detectInAppBrowser("")).toBeNull();
  });
  it("liên kết mở bằng Chrome chỉ có trên Android", () => {
    expect(chromeIntentUrl("https://ghinhanh.app/auth?x=1", ANDROID)).toBe("intent://ghinhanh.app/auth?x=1#Intent;scheme=https;package=com.android.chrome;end");
    expect(chromeIntentUrl("https://ghinhanh.app/auth", "Mozilla/5.0 (iPhone)")).toBeNull();
    expect(chromeIntentUrl("không phải url", ANDROID)).toBeNull();
  });
});

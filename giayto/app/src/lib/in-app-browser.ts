// BL-00 / GG-03, GG-04: Google chặn đăng nhập trong trình duyệt nhúng (Zalo, Facebook, Messenger, TikTok…)
// bằng lỗi 403 disallowed_useragent. Nhận ra sớm để hướng dẫn mở bằng Chrome/Safari thay vì để người dùng gặp trang lỗi.

const IN_APP: Array<[RegExp, string]> = [
  [/Zalo/i, "Zalo"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/Messenger|MessengerLite/i, "Messenger"],
  [/Instagram/i, "Instagram"],
  [/TikTok|musical_ly|Bytedance/i, "TikTok"],
  [/\bLine\//i, "Line"],
  [/Viber/i, "Viber"],
  [/Snapchat/i, "Snapchat"],
  [/Twitter|TwitterAndroid/i, "X (Twitter)"],
  [/LinkedInApp/i, "LinkedIn"],
];

/** Tên ứng dụng đang nhúng trình duyệt, hoặc null nếu là trình duyệt thường. */
export function detectInAppBrowser(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): string | null {
  for (const [re, name] of IN_APP) if (re.test(ua)) return name;
  // Android WebView chung ("; wv)") không phải Chrome thật; Google cũng chặn
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return "ứng dụng khác";
  return null;
}

/** PWA đã cài trên iPhone/iPad (chế độ standalone): trang Google có thể mở ở khung Safari riêng, phiên không về app. */
export function isIosStandalonePwa(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true || (window.matchMedia?.("(display-mode: standalone)").matches ?? false);
  return ios && standalone;
}

/** Liên kết mở thẳng bằng Chrome trên Android (iOS không có cách tương đương → chỉ sao chép liên kết). */
export function chromeIntentUrl(href: string, ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): string | null {
  if (!/Android/i.test(ua)) return null;
  try {
    const u = new URL(href);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;end`;
  } catch { return null; }
}

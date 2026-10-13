import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: {} }));
import { authMessage } from "./auth";

describe("authMessage", () => {
  it("dịch lỗi thường gặp", () => {
    expect(authMessage("Invalid login credentials")).toBe("Sai email hoặc mật khẩu");
    expect(authMessage("Email not confirmed")).toMatch(/chưa xác nhận/);
    expect(authMessage("User already registered")).toMatch(/đã có tài khoản/);
  });
  it("GG-05: lỗi tiếng Anh của bộ đăng nhập Google được dịch", () => {
    for (const en of ["Popup was blocked", "Sign in was cancelled", "This flow is not supported in Preview mode. Please open the app in a new tab to sign in.", "State is invalid", "No tokens received", "OAuth timed out waiting for response", "Sign in failed", "access_denied", "Unsupported provider: provider is not enabled", "disallowed_useragent"]) {
      const vi = authMessage(en);
      expect(vi, en).not.toBe(en);
      expect(vi, en).toMatch(/[ăâêôơưđàáảãạ]/i);
    }
  });
  it("giữ nguyên lỗi lạ", () => expect(authMessage("xyz")).toBe("xyz"));
});

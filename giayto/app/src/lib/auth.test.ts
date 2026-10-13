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
  it("giữ nguyên lỗi lạ", () => expect(authMessage("xyz")).toBe("xyz"));
});

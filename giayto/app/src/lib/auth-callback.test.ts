import { describe, expect, it, vi } from "vitest";
import { completeAuthCallback, hasAuthCallback, parseAuthCallback, rememberAuthNext, safeNext, takeAuthNext } from "./auth-callback";

const L = (pathname: string, hash = "", search = "") => ({ pathname, hash, search });
const mem = () => { const m = new Map<string, string>(); return { m, setItem: (k: string, v: string) => void m.set(k, v), getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => void m.delete(k) }; };

describe("BL-00 nhận diện lượt quay về đăng nhập", () => {
  it("nhận mã phiên dạng hash ở trang chủ (GG-01)", () => {
    const i = parseAuthCallback(L("/", "#access_token=a&refresh_token=r&expires_in=3600"));
    expect(i).toMatchObject({ kind: "tokens", accessToken: "a", refreshToken: "r" });
  });
  it("nhận mã phiên dạng query, thư xác nhận email về /me", () => {
    expect(parseAuthCallback(L("/me", "", "?access_token=a&refresh_token=r"))?.kind).toBe("tokens");
  });
  it("nhận lỗi trên URL, ưu tiên error_description (GG-07)", () => {
    expect(parseAuthCallback(L("/", "", "?error=access_denied&error_description=User+cancelled"))).toMatchObject({ kind: "error", error: "User cancelled" });
    expect(parseAuthCallback(L("/", "#error=server_error"))).toMatchObject({ kind: "error", error: "server_error" });
  });
  it("nhận ?code= chỉ ở / và /auth", () => {
    expect(parseAuthCallback(L("/", "", "?code=abc"))?.kind).toBe("code");
    expect(parseAuthCallback(L("/me", "", "?code=abc"))).toBeNull();
  });
  it("bỏ qua màn khác và URL thường (không bắt nhầm)", () => {
    expect(parseAuthCallback(L("/documents", "#access_token=a&refresh_token=r"))).toBeNull();
    expect(parseAuthCallback(L("/", "", "?q=1"))).toBeNull();
    expect(parseAuthCallback(L("/s/abc", "", "?error=x"))).toBeNull();
    expect(hasAuthCallback(L("/", "#access_token=a"))).toBe(false); // thiếu refresh_token → không phải phiên đủ
  });
});

describe("BL-00 đích quay về", () => {
  it("chỉ nhận đường nội bộ (chặn chuyển hướng ra ngoài)", () => {
    expect(safeNext("/sync")).toBe("/sync");
    for (const bad of ["//evil.com", "http://evil.com", "/\\evil", "", null, undefined, "javascript:alert(1)"]) expect(safeNext(bad as string)).toBe("/me");
  });
  it("lưu rồi lấy ra đúng một lần", () => {
    const s = mem(); rememberAuthNext("/sync", s);
    expect(takeAuthNext(s)).toBe("/sync"); expect(takeAuthNext(s)).toBe("/me");
  });
  it("kho lỗi (chế độ riêng tư) không làm hỏng luồng", () => {
    const bad = { setItem: () => { throw new Error("denied"); }, getItem: () => { throw new Error("denied"); }, removeItem: () => {} };
    expect(() => rememberAuthNext("/sync", bad)).not.toThrow();
    expect(takeAuthNext(bad)).toBe("/me");
  });
});

describe("BL-00 completeAuthCallback", () => {
  const user = { email: "a@b.vn" };
  it("có phiên: trả user, xoá mã khỏi URL, trả đích đã lưu", async () => {
    const replaceUrl = vi.fn();
    const getSession = vi.fn().mockResolvedValue({ data: { session: { user } } });
    const r = await completeAuthCallback({ loc: L("/", "#access_token=a&refresh_token=r"), replaceUrl, getClient: async () => ({ auth: { getSession, setSession: vi.fn() } }), next: () => "/sync" });
    expect(r).toEqual({ user, error: null, next: "/sync" });
    expect(replaceUrl).toHaveBeenCalledWith("/");
  });
  it("thư viện không tự nhận: dùng setSession với cặp mã đọc được", async () => {
    const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    const setSession = vi.fn().mockResolvedValue({ data: { session: { user } } });
    const r = await completeAuthCallback({ loc: L("/", "#access_token=a&refresh_token=r"), replaceUrl: vi.fn(), getClient: async () => ({ auth: { getSession, setSession } }), next: () => "/me" });
    expect(setSession).toHaveBeenCalledWith({ access_token: "a", refresh_token: "r" });
    expect(r.user).toEqual(user);
  });
  it("lỗi trên URL: không gọi Supabase, vẫn xoá URL", async () => {
    const replaceUrl = vi.fn(); const getClient = vi.fn();
    const r = await completeAuthCallback({ loc: L("/", "", "?error=access_denied"), replaceUrl, getClient, next: () => "/me" });
    expect(r).toMatchObject({ user: null, error: "access_denied" });
    expect(getClient).not.toHaveBeenCalled(); expect(replaceUrl).toHaveBeenCalledWith("/");
  });
  it("Supabase ném lỗi: trả lỗi, không treo, vẫn xoá mã khỏi URL", async () => {
    const replaceUrl = vi.fn();
    const r = await completeAuthCallback({ loc: L("/", "#access_token=a&refresh_token=r"), replaceUrl, getClient: async () => { throw new Error("Missing Supabase environment"); }, next: () => "/me" });
    expect(r.user).toBeNull(); expect(r.error).toMatch(/Missing Supabase/); expect(replaceUrl).toHaveBeenCalled();
  });
  it("không có phiên và không có cặp mã: báo 'No tokens received'", async () => {
    const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    const r = await completeAuthCallback({ loc: L("/", "", "?code=abc"), replaceUrl: vi.fn(), getClient: async () => ({ auth: { getSession, setSession: vi.fn() } }), next: () => "/me" });
    expect(r).toMatchObject({ user: null, error: "No tokens received" });
  });
});

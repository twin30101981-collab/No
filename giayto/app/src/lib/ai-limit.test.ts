import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter, limitFromEnv, limitedFail } from "./ai-limit";
import { classifyAiFailure, isAutoRetryable } from "./scan-errors";
import { friendlyError } from "./errors";

// HM-03 (Q1=b): giới hạn số lần gọi AI theo khách (IP) mỗi giờ.
describe("createRateLimiter", () => {
  const H = 3_600_000;
  it("cho đủ N lần trong cửa sổ rồi chặn, báo thời gian chờ", () => {
    let t = 1_000; const l = createRateLimiter({ limit: 3, windowMs: H, now: () => t });
    expect([l.hit("a"), l.hit("a"), l.hit("a")].map((r) => r.ok)).toEqual([true, true, true]);
    t += 60_000; const r = l.hit("a");
    expect(r).toEqual({ ok: false, retryAfterSec: H / 1000 - 60 });
  });
  it("hết cửa sổ thì cho lại; mỗi khách tính riêng", () => {
    let t = 0; const l = createRateLimiter({ limit: 1, windowMs: H, now: () => t });
    expect(l.hit("a").ok).toBe(true); expect(l.hit("a").ok).toBe(false); expect(l.hit("b").ok).toBe(true);
    t = H + 1; expect(l.hit("a").ok).toBe(true);
  });
  it("lượt bị chặn không kéo dài thời gian chờ", () => {
    let t = 0; const l = createRateLimiter({ limit: 1, windowMs: H, now: () => t });
    l.hit("a"); t = H - 1000; l.hit("a"); l.hit("a"); t = H + 1;
    expect(l.hit("a").ok).toBe(true);
  });
  it("giới hạn số khách lưu để không phình bộ nhớ", () => {
    const l = createRateLimiter({ limit: 1, windowMs: H, now: () => 0, maxKeys: 3 });
    for (const k of ["a", "b", "c", "d", "e"]) l.hit(k);
    expect(l.size()).toBeLessThanOrEqual(3);
  });
  it("limit ≤ 0 nghĩa là tắt giới hạn", () => {
    const l = createRateLimiter({ limit: 0, windowMs: H, now: () => 0 });
    for (let i = 0; i < 1000; i++) expect(l.hit("a").ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("ưu tiên cf-connecting-ip, rồi x-real-ip, rồi phần tử đầu x-forwarded-for", () => {
    expect(clientKey(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }))).toBe("1.1.1.1");
    expect(clientKey(new Headers({ "x-real-ip": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientKey(new Headers({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" }))).toBe("3.3.3.3");
  });
  it("không xác định được → null (không giới hạn, tránh khoá nhầm mọi người)", () => {
    expect(clientKey(new Headers())).toBeNull();
    expect(clientKey(undefined)).toBeNull();
  });
});

describe("limitFromEnv", () => {
  it("mặc định 60; đọc số hợp lệ; sai → mặc định", () => {
    expect(limitFromEnv(undefined)).toBe(60); expect(limitFromEnv("5")).toBe(5);
    expect(limitFromEnv("0")).toBe(0); expect(limitFromEnv("abc")).toBe(60); expect(limitFromEnv("-2")).toBe(60);
  });
});

describe("thông báo lỗi cho người dùng", () => {
  it("lỗi hết lượt là mã riêng, không tự thử lại, không nhầm 'quá tải một phút'", () => {
    const f = limitedFail(125);
    expect(f.ok).toBe(false); expect(f.code).toBe(429); expect(f.message).toMatch(/3 phút/);
    const c = classifyAiFailure(f.code, f.message);
    expect(c).toBe("AI_LIMIT"); expect(isAutoRetryable(c)).toBe(false);
    expect(classifyAiFailure(429, "AI đang quá tải. Hãy đợi khoảng một phút rồi thử lại.")).toBe("AI_BUSY");
  });
  it("toast hiện đúng lý do hết lượt thay vì 'Đã có lỗi xảy ra'", () => {
    const f = friendlyError(new Error(limitedFail(600).message));
    expect(f.title).toMatch(/hết lượt AI/i); expect(f.hint).toMatch(/Thử lại sau/);
  });
});

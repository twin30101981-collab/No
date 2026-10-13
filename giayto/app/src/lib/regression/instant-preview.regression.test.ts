import { describe, it, expect } from "vitest";
import { instantPreview, previewStats } from "../instant-preview";

describe("Hồi quy V8b xem trước trong Worker", () => {
  it("môi trường không có Worker/OffscreenCanvas (jsdom) rơi về luồng chính, không lỗi", async () => {
    const before = { ...previewStats };
    // jsdom không có Worker → instantPreview phải tự rơi về đường canvas cũ
    const fake = { width: 8, height: 8 } as CanvasImageSource & { width: number; height: number };
    const url = await instantPreview(fake, 4);
    // jsdom canvas không vẽ được → có thể undefined, nhưng không được ném lỗi
    expect(url === undefined || typeof url === "string").toBe(true);
    expect(previewStats.worker).toBe(before.worker); // không đếm worker trong jsdom
    expect(previewStats.main + previewStats.fallback).toBeGreaterThan(before.main + before.fallback);
  });
  it("thống kê __previewStats được gắn lên globalThis", () => {
    expect((globalThis as { __previewStats?: typeof previewStats }).__previewStats).toBe(previewStats);
  });
});

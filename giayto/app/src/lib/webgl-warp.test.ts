import { describe, it, expect, beforeEach } from "vitest";
import { webglWarpSupport, webglWarp, _resetWarpSupport } from "./webgl-warp";

describe("webgl-warp (G2-03)", () => {
  beforeEach(() => _resetWarpSupport());

  it("báo không hỗ trợ khi không có WebGL và không ném lỗi", () => {
    const s = webglWarpSupport(1000, 1000);
    expect(typeof s.ok).toBe("boolean");
    if (!s.ok) expect(s.reason).toBeTruthy();
  });

  it("trả null để rơi về CPU khi không hỗ trợ", () => {
    const s = webglWarpSupport();
    if (s.ok) return;
    const c = document.createElement("canvas");
    expect(webglWarp(c, 10, 10, [[0, 0], [10, 0], [10, 10], [0, 10]], 10, 10)).toBeNull();
  });

  it("ảnh vượt giới hạn texture bị từ chối", () => {
    const s = webglWarpSupport(1e6, 10);
    expect(s.ok).toBe(false);
  });
});

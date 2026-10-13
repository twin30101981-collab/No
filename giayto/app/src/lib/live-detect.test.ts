import { describe, expect, it } from "vitest";
import { nextDetectSize, LIVE_DETECT_MIN, LIVE_DETECT_MAX, LIVE_DETECT_STEP } from "./live-detect";

describe("P1.3 bắt khung 4 góc thời gian thực (ảnh nhỏ 320–480 px)", () => {
  it("mặc định dò trên bản 320 px", () => {
    expect(nextDetectSize(LIVE_DETECT_MIN, 0, false)).toBe(320);
  });
  it("leo kích thước khi mất khung nhiều nhịp liền, không quá 480", () => {
    let s = LIVE_DETECT_MIN;
    s = nextDetectSize(s, 6, false);
    expect(s).toBe(320 + LIVE_DETECT_STEP);
    s = nextDetectSize(s, 12, false);
    expect(s).toBe(480);
    s = nextDetectSize(s, 20, false);
    expect(s).toBe(LIVE_DETECT_MAX);
  });
  it("chưa đủ nhịp mất khung thì giữ nguyên kích thước", () => {
    expect(nextDetectSize(400, 3, false)).toBe(400);
  });
  it("khoá được khung thì hạ về 320 cho nhẹ", () => {
    expect(nextDetectSize(480, 0, true)).toBe(320);
    expect(nextDetectSize(400, 0, true)).toBe(320);
  });
  it("kẹp giá trị lạ về khoảng 320–480", () => {
    expect(nextDetectSize(100, 0, false)).toBe(320);
    expect(nextDetectSize(999, 0, false)).toBe(480);
  });
});

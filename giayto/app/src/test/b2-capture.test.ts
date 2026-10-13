import { describe, it, expect } from "vitest";
import { cameraTries, keptLong, a4Dpi, lowRes, CAPTURE_MAX, CAPTURE_Q } from "@/lib/capture";

describe("B2 chụp độ phân giải cao", () => {
  it("V13-B02: xin camera 2560×1920 trước tiên", () => {
    const t = cameraTries()[0];
    expect(t.width).toEqual({ ideal: 2560 }); expect(t.height).toEqual({ ideal: 1920 });
  });
  it("mức 2 là 1920×1440, mức 3 là 1280×960", () => { expect(cameraTries()[1].width).toEqual({ ideal: 1920 }); expect(cameraTries()[2].width).toEqual({ ideal: 1280 }); });
  it("có các mức dự phòng hạ dần", () => { expect(cameraTries().length).toBeGreaterThanOrEqual(4); expect(cameraTries().at(-1)).toEqual({}); });
  it("ảnh 12 MP thu về 2560 px", () => { expect(keptLong(4000, 3000)).toBe(2560); expect(CAPTURE_MAX).toBe(2560); expect(keptLong(8000, 6000)).toBe(CAPTURE_MAX); });
  it("không phóng to ảnh nhỏ", () => { expect(keptLong(1280, 960)).toBe(1280); });
  it("JPEG 0,88 một lần", () => { expect(CAPTURE_Q).toBe(0.88); });
  it("cảnh báo dưới 200 dpi", () => { expect(a4Dpi(3508, 2480)).toBe(300); expect(lowRes(1280, 960)).toBe(true); expect(lowRes(4000, 3000)).toBe(false); expect(lowRes(2560, 1920)).toBe(false); expect(lowRes()).toBe(false); });
});

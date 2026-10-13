import { describe, expect, it } from "vitest";
import { captureWarning, TILT_WARNING, AREA_WARNING } from "./capture-quality";
import { QUALITY_THRESHOLDS } from "./quality";

const good = { sharp: 120, glare: 0, luma: 160, tilt: 0.05, area: 0.5 };

describe("P1.4 cảnh báo chất lượng khi chụp", () => {
  it("khung tốt thì không cảnh báo", () => {
    expect(captureWarning(good)).toBeNull();
  });
  it("tối nặng là reject và được ưu tiên cao nhất", () => {
    const w = captureWarning({ ...good, luma: QUALITY_THRESHOLDS.DARK_REJECT - 1, glare: 1, sharp: 0 });
    expect(w).toMatchObject({ kind: "dark", level: "reject" });
  });
  it("lóa mất chữ là reject", () => {
    const w = captureWarning({ ...good, glare: QUALITY_THRESHOLDS.GLARE_REJECT + 0.01 });
    expect(w).toMatchObject({ kind: "glare", level: "reject" });
  });
  it("mờ dưới ngưỡng từ chối là reject, dưới ngưỡng cảnh báo là warn", () => {
    expect(captureWarning({ ...good, sharp: QUALITY_THRESHOLDS.BLUR_REJECT - 1 })).toMatchObject({ kind: "blur", level: "reject" });
    expect(captureWarning({ ...good, sharp: QUALITY_THRESHOLDS.BLUR_WARNING - 1 })).toMatchObject({ kind: "blur", level: "warn" });
  });
  it("nghiêng và xa là warn", () => {
    expect(captureWarning({ ...good, tilt: TILT_WARNING + 0.01 })).toMatchObject({ kind: "tilt", level: "warn" });
    expect(captureWarning({ ...good, area: AREA_WARNING - 0.01 })).toMatchObject({ kind: "closer", level: "warn" });
  });
  it("hơi tối là warn, không phải reject", () => {
    const w = captureWarning({ ...good, luma: QUALITY_THRESHOLDS.DARK_WARNING - 1 });
    expect(w).toMatchObject({ kind: "dark", level: "warn" });
  });
  it("chưa dò được khung (area null) thì bỏ qua nhắc lại gần", () => {
    expect(captureWarning({ ...good, area: null })).toBeNull();
  });
});

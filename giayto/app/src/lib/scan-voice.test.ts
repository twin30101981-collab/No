import { describe, expect, it } from "vitest";
import { ScanGuide, VOICE_LINES } from "./scan-voice";

describe("ScanGuide", () => {
  it("nói sau khi lời nhắc đứng yên đủ lâu", () => {
    const g = new ScanGuide();
    expect(g.push("closer", 0)).toBeNull();
    expect(g.push("closer", 500)).toBeNull();
    expect(g.push("closer", 800)).toBe("closer");
    expect(g.push("closer", 5000)).toBeNull();
  });
  it("bỏ qua lời nhắc nhấp nháy và giữ khoảng cách giữa hai câu", () => {
    const g = new ScanGuide();
    g.push("blur", 0); g.push("glare", 300); g.push("blur", 600);
    expect(g.push("blur", 1000)).toBeNull();
    expect(g.push("blur", 1400)).toBe("blur");
    g.push("tilt", 1500);
    expect(g.push("tilt", 2500)).toBeNull(); // chưa đủ 2,5 giây
    expect(g.push("tilt", 4000)).toBe("tilt");
  });
  it("không lặp cùng câu quá sớm, reset sau khi chụp", () => {
    const g = new ScanGuide();
    g.push("hold", 0); expect(g.push("hold", 800)).toBe("hold");
    g.push("found", 900); expect(g.push("found", 3400)).toBe("found");
    g.push("hold", 3500); expect(g.push("hold", 6500)).toBeNull();
    g.reset(); g.push("hold", 6600); expect(g.push("hold", 9500)).toBe("hold");
  });
  it("có câu cho mọi lời nhắc", () => { for (const v of Object.values(VOICE_LINES)) expect(v.length).toBeGreaterThan(3); });
});

import { describe, expect, it } from "vitest";
import { guardImage, imageVersion, matchesVersion, normalizeDiagnosis, diagFallback, diagLogLine, MAX_BYTES, MAX_DATA_CHARS } from "@/lib/scan-diagnose";

describe("S12 scan-diagnose", () => {
  it("chặn ảnh hỏng, nhỏ, lớn, ngoại tuyến", () => {
    const ok = { width: 3000, height: 4000, bytes: 2e6, online: true };
    expect(guardImage(ok).ok).toBe(true);
    expect(guardImage({ ...ok, online: false }).ok).toBe(false);
    expect(guardImage({ ...ok, width: 0 }).ok).toBe(false);
    expect(guardImage({ ...ok, width: 600 }).ok).toBe(false);
    expect(guardImage({ ...ok, bytes: 9e6 }).ok).toBe(false);
  });
  it("khoá phiên bản đổi khi ảnh hoặc bộ lọc đổi", () => {
    const a = imageVersion("p1", "auto", "data:abc".repeat(100));
    expect(imageVersion("p1", "auto", "data:abc".repeat(100))).toBe(a);
    expect(imageVersion("p1", "bw", "data:abc".repeat(100))).not.toBe(a);
    expect(imageVersion("p1", "auto", "data:abd".repeat(100))).not.toBe(a);
    // TD-17: khác 1 ký tự ở vị trí không lấy mẫu, cùng độ dài → vẫn phải khác khoá
    const big = "A".repeat(1 << 20);
    const big2 = big.slice(0, 1001) + "B" + big.slice(1002);
    expect(imageVersion("p1", "auto", big2)).not.toBe(imageVersion("p1", "auto", big));
    expect(matchesVersion({ version: a, issues: [], summary: "" }, a)).toBe(true);
    expect(matchesVersion({ version: a, issues: [], summary: "" }, "x")).toBe(false);
  });
  it("chuẩn hoá: bỏ nhóm lạ, kẹp vùng, gộp trùng, sắp theo mức nặng", () => {
    const d = normalizeDiagnosis({ summary: "s", issues: [
      { group: "skew", severity: 0.3, confidence: 0.9, note: "n", regions: [{ x: 0.1, y: 0.5, w: 0.8, h: 0.5 }] },
      { group: "shadow", severity: 1.7, confidence: -1, note: "b", regions: [{ x: 0.9, y: 0.9, w: 0.5, h: 0.5 }] },
      { group: "shadow", severity: 0.2, confidence: 0.6, regions: [] },
      { group: "lạ", severity: 1 },
      { group: "cut_text", severity: 0 },
    ] }, "v");
    expect(d.issues.map((i) => i.group)).toEqual(["shadow", "skew"]);
    expect(d.issues[0]).toMatchObject({ severity: 1, confidence: 0.6 });
    expect(d.issues[0].regions[0].w).toBeCloseTo(0.1);
    expect(normalizeDiagnosis(null, "v").issues).toEqual([]);
  });
  it("dự phòng và log không lộ nội dung", () => {
    expect(diagFallback(402)).toMatch(/Hết lượt/);
    expect(diagFallback("offline")).toMatch(/ngoại tuyến/);
    const line = diagLogLine("p1:auto:9:abc", normalizeDiagnosis({ issues: [{ group: "skew", severity: 0.5, note: "Hợp đồng số 12" }] }, "v"));
    expect(line).not.toMatch(/Hợp đồng|p1/);
    expect(diagLogLine("p1:auto:9:abc", null, 429)).toContain("code=429");
  });
  it("trần dung lượng khớp giới hạn máy chủ: qua cổng chặn thì máy chủ nhận", () => {
    const base = { width: 3000, height: 4000, online: true };
    expect(guardImage({ ...base, bytes: MAX_BYTES }).ok).toBe(true);
    expect(guardImage({ ...base, bytes: MAX_BYTES + 1 }).ok).toBe(false);
    // đúng trần: base64 (4/3) + tiền tố dài nhất 64 ký tự vẫn ≤ trần data URL của máy chủ
    expect(64 + Math.ceil(MAX_BYTES / 3) * 4).toBeLessThanOrEqual(MAX_DATA_CHARS);
  });
});

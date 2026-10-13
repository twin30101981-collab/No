import { describe, expect, it } from "vitest";
import { checkExtraction } from "@/lib/extract-check";
import { classifyAiFailure, isAutoRetryable, MAX_AUTO_RETRY, SCAN_ERRORS } from "@/lib/scan-errors";
import { glareLevel, qualityScore } from "@/lib/quality";

const ok = { type: "Biên bản", title: "BB", summary: "s", keyPoints: ["a"], confidence: 0.9, tags: [], fields: [{ label: "Ngày lập", value: "02/10/2026" }, { label: "Nội dung", value: "x" }, { label: "Thành phần", value: "A" }] };

describe("kiểm tra kết quả AI", () => {
  it("chấp nhận khi đủ trường", () => expect(checkExtraction(ok).verdict).toBe("accept"));
  it("cần xem lại khi thiếu trường", () => { const r = checkExtraction({ ...ok, fields: ok.fields.slice(0, 1) }); expect(r.verdict).toBe("review"); expect(r.missing).toContain("Nội dung"); });
  it("sai schema", () => expect(checkExtraction({ foo: 1 }).valid).toBe(false));
  it("rỗng", () => expect(checkExtraction({ ...ok, summary: "", keyPoints: [], fields: [] }).empty).toBe(true));
  it("độ chắc thấp", () => expect(checkExtraction({ ...ok, confidence: 0.3 }).verdict).toBe("review"));
});
describe("mã lỗi & retry", () => {
  it("phân loại", () => {
    expect(classifyAiFailure(0, "timeout")).toBe("AI_TIMEOUT");
    expect(classifyAiFailure(0)).toBe("AI_NETWORK");
    expect(classifyAiFailure(402)).toBe("AI_BLOCKED");
    expect(classifyAiFailure(500)).toBe("AI_EXTRACTION_FAILED");
  });
  it("không retry khi bị chặn/quá tải", () => { expect(isAutoRetryable("AI_BLOCKED")).toBe(false); expect(isAutoRetryable("AI_BUSY")).toBe(false); expect(isAutoRetryable("AI_EMPTY_RESULT")).toBe(true); });
  it("giới hạn 1 lần", () => expect(MAX_AUTO_RETRY).toBe(1));
  it("mỗi mã có thông báo và hướng xử lý", () => Object.values(SCAN_ERRORS).forEach((e) => { expect(e.message).toBeTruthy(); expect(e.hint).toBeTruthy(); }));
});
describe("chất lượng ảnh", () => {
  it("chói", () => { expect(glareLevel(0, 0)).toBe("none"); expect(glareLevel(0.01, 0)).toBe("light"); expect(glareLevel(0.03, 0.05)).toBe("text"); expect(glareLevel(0.1, 0)).toBe("severe"); });
  it("điểm", () => { expect(qualityScore({ blur: 200, brightness: 180, contrast: 70, glare: 0, side: 2000 })).toBe(100); expect(qualityScore({ blur: 5, brightness: 30, contrast: 5, glare: 0.1, side: 400 })).toBeLessThan(15); });
});

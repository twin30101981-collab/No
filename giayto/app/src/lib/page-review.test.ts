import { describe, expect, it } from "vitest";
import { decisionNote, filterPages, needsReview, REVIEW_THRESHOLD } from "./page-review";
import type { Page } from "./db";

const mk = (id: string, manual = false): Page => ({ id, orig: "", src: "", edit: { rotation: 0, filter: "auto", brightness: 0, contrast: 0 }, manual });
const pages = [mk("a"), mk("b"), mk("c", true)];
const reviews = { a: { score: 85, note: "" }, b: { score: 69, note: "" }, c: { score: 40, note: "" } };

describe("R3.1 thẻ lọc & nhãn Cần xem lại", () => {
  it("ngưỡng là 70: 69 cần xem lại, 70 thì không", () => {
    expect(REVIEW_THRESHOLD).toBe(70);
    expect(needsReview(69)).toBe(true);
    expect(needsReview(70)).toBe(false);
  });
  it("thẻ Cần xem lại chỉ chứa trang điểm < 70", () => expect(filterPages(pages, reviews, "review")).toEqual([1, 2]));
  it("thẻ Đã sửa tay chỉ chứa trang đã sửa", () => expect(filterPages(pages, reviews, "manual")).toEqual([2]));
  it("thẻ Tất cả chứa mọi trang; trang chưa đo không bị gắn nhãn", () => {
    expect(filterPages(pages, reviews, "all")).toEqual([0, 1, 2]);
    expect(filterPages(pages, {}, "review")).toEqual([]);
  });
  it("nhật ký nói rõ vấn đề → bộ lọc", () => {
    const n = decisionNote({ blur: 80, brightness: 70, contrast: 50, glare: 0 }, "bright");
    expect(n).toContain("→ Làm sáng");
    expect(n).toContain("hơi tối");
  });
});

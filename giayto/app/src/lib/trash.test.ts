import { describe, expect, it } from "vitest";
import { daysLeft, expiredIds, leftLabel, TRASH_DAYS } from "./trash";

const DAY = 86_400_000, now = 1_800_000_000_000;
describe("trash", () => {
  it("đếm ngày còn lại, làm tròn lên", () => {
    expect(daysLeft(now, now)).toBe(TRASH_DAYS);
    expect(daysLeft(now - 29.5 * DAY, now)).toBe(1);
    expect(daysLeft(now - 40 * DAY, now)).toBe(0);
  });
  it("chỉ chọn tài liệu trong thùng rác đủ 30 ngày", () => {
    const docs = [{ id: "a" }, { id: "b", deletedAt: now - 30 * DAY }, { id: "c", deletedAt: now - 29 * DAY }, { id: "d", deletedAt: now - 90 * DAY }];
    expect(expiredIds(docs, now)).toEqual(["b", "d"]);
  });
  it("nhãn dễ hiểu", () => {
    expect(leftLabel(now - 10 * DAY, now)).toBe("Tự xóa sau 20 ngày");
    expect(leftLabel(now - 29.9 * DAY, now)).toBe("Tự xóa trong hôm nay");
  });
});

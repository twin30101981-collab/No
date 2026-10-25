import { describe, expect, it } from "vitest";
import { MIN_PICKS, preferredFilter, recordChoice, type UserChoices } from "./user-recipe";

describe("R3.3 recordChoice", () => {
  it("ghi lựa chọn theo loại tài liệu, cộng dồn số lần", () => {
    let all: UserChoices = {};
    all = recordChoice(all, "hopdong", "sharp");
    all = recordChoice(all, "hopdong", "sharp");
    all = recordChoice(all, "sodo", "vivid");
    expect(all["hopdong"]?.sharp).toBe(2);
    expect(all["sodo"]?.vivid).toBe(1);
  });

  it("bất biến: không sửa bảng cũ", () => {
    const a: UserChoices = {};
    const b = recordChoice(a, "hopdong", "mono");
    expect(a).toEqual({});
    expect(b["hopdong"]?.mono).toBe(1);
  });

  it("loại rỗng/thiếu → không ghi", () => {
    expect(recordChoice({}, null, "sharp")).toEqual({});
    expect(recordChoice({}, undefined, "sharp")).toEqual({});
    expect(recordChoice({}, "", "sharp")).toEqual({});
  });
});

describe("R3.3 preferredFilter", () => {
  it("trả bộ lọc được chọn nhiều nhất khi đủ số lần tối thiểu", () => {
    const all: UserChoices = { hopdong: { sharp: 2, mono: 1 } };
    expect(preferredFilter(all, "hopdong")).toBe("sharp");
  });

  it("hoà phiếu → không ưu tiên", () => {
    const all: UserChoices = { hopdong: { sharp: 1, mono: 1 } };
    expect(preferredFilter(all, "hopdong")).toBeNull();
  });

  it("chưa đủ số lần tối thiểu → không ưu tiên", () => {
    const all: UserChoices = { hopdong: { sharp: MIN_PICKS - 1 } };
    expect(preferredFilter(all, "hopdong")).toBeNull();
  });

  it("loại chưa từng ghi hoặc thiếu → null", () => {
    expect(preferredFilter({}, "vat")).toBeNull();
    expect(preferredFilter({ hopdong: { sharp: 3 } }, null)).toBeNull();
  });
});

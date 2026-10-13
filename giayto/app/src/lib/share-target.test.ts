import { describe, expect, it } from "vitest";
import { acceptShared } from "./share-target";

describe("acceptShared", () => {
  it("giữ ảnh và PDF, bỏ loại khác và tệp rỗng", () => {
    const r = acceptShared([
      { type: "image/jpeg", size: 10 }, { type: "application/pdf", size: 5 },
      { type: "text/plain", size: 3 }, { type: "image/png", size: 0 },
    ]);
    expect(r.map((f) => f.type)).toEqual(["image/jpeg", "application/pdf"]);
  });
  it("giới hạn 50 tệp", () => {
    expect(acceptShared(Array.from({ length: 60 }, () => ({ type: "image/png", size: 1 }))).length).toBe(50);
  });
});

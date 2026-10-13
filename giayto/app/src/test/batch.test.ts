import { describe, expect, it } from "vitest";
import { uniqueNames } from "@/lib/batch";
describe("batch", () => {
  it("makes unique zip names", () => {
    expect(uniqueNames(["Hóa đơn", "Hóa đơn", "a/b"], "pdf")).toEqual(["Hóa đơn.pdf", "Hóa đơn-2.pdf", "a-b.pdf"]);
  });
});

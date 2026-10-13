import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public/sw.js", () => {
  const sw = readFileSync("public/sw.js", "utf8");
  it("không bỏ sót tệp băm có “__” trong tên (react-C21x__mS.js)", () => {
    expect(sw).not.toContain('p.includes("__")');
    expect(sw).toContain('p.startsWith("/__")');
  });
});

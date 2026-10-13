import { describe, it, expect } from "vitest";
import { dataUrlToBlob } from "./image";
describe("S4 dataUrlToBlob", () => {
  it("giữ nguyên byte và kiểu", async () => {
    const b = dataUrlToBlob("data:image/jpeg;base64," + btoa("\xff\xd8abc"));
    expect(b.type).toBe("image/jpeg"); expect(b.size).toBe(5);
  });
  it("mặc định image/jpeg khi thiếu kiểu", () => { expect(dataUrlToBlob("data:;base64," + btoa("x")).type).toBe("image/jpeg"); });
});

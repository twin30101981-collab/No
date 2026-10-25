import { describe, expect, it } from "vitest";
import { driveError, folderQuery, multipartBody } from "./drive";

describe("drive", () => {
  it("escapes folder query", () => {
    expect(folderQuery("A'b")).toContain("name='A\\'b'");
    expect(folderQuery()).toContain("trashed=false");
  });
  it("builds multipart body", async () => {
    const b = multipartBody({ name: "x.pdf" }, new Blob(["PDF"], { type: "application/pdf" }), "BB");
    expect(b.type.toLowerCase()).toBe("multipart/related; boundary=bb");
    const head = '--BB\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"x.pdf"}\r\n--BB\r\nContent-Type: application/pdf\r\n\r\n';
    expect(b.size).toBe(head.length + 3 + "\r\n--BB--".length);
  });
  it("maps errors", () => {
    expect(driveError(401)).toMatch(/hết hạn/);
    expect(driveError(403, "storageQuotaExceeded")).toMatch(/dung lượng/);
    expect(driveError(503)).toMatch(/bận/);
  });
});

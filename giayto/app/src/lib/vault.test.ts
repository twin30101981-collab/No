import { describe, expect, it } from "vitest";
import { deriveKey, encryptJson, decryptJson, newSalt, sealDoc, openDoc } from "./vault";
import type { Doc } from "./db";

const doc: Doc = { id: "a", name: "CCCD", folder: "Chung", kind: "Thẻ", createdAt: 1, updatedAt: 2, locked: true,
  pages: [{ id: "p", orig: "data:image/jpeg;base64,AAA", src: "data:x", edit: { rotation: 0, filter: "auto", brightness: 0, contrast: 0 }, text: "001203004567" }],
  fields: { so: "001203004567" }, tags: ["mật"] };

describe("vault (G3-08)", () => {
  it("mã hoá rồi giải mã đúng với cùng PIN", async () => {
    const salt = newSalt(); const k = await deriveKey("1234", salt, 1000);
    const b = await encryptJson(k, { a: 1, s: "Việt" });
    expect(await decryptJson(await deriveKey("1234", salt, 1000), b)).toEqual({ a: 1, s: "Việt" });
  });
  it("sai PIN thì không giải mã được", async () => {
    const salt = newSalt();
    const b = await encryptJson(await deriveKey("1234", salt, 1000), { x: 1 });
    await expect(decryptJson(await deriveKey("9999", salt, 1000), b)).rejects.toBeTruthy();
  });
  it("bản lưu không chứa nội dung rõ, mở lại khôi phục đủ", async () => {
    const k = await deriveKey("1234", newSalt(), 1000);
    const sealed = await sealDoc(doc, k);
    expect(sealed.pages).toEqual([]); expect(sealed.fields).toBeUndefined();
    expect(JSON.stringify(sealed)).not.toContain("001203004567");
    expect(sealed.name).toBe("CCCD");
    expect(await openDoc(sealed, k)).toEqual(doc);
  });
});

import { newDataKey, wrapDataKey, unwrapDataKey, newRecoveryCode, normRecovery, sealVerified } from "./vault";
describe("vault (G3-09)", () => {
  it("khoá dữ liệu bọc bằng PIN và mã khôi phục, cả hai mở được cùng tài liệu", async () => {
    const dek = await newDataKey(); const sealed = await sealVerified(doc, dek);
    const ps = newSalt(), rs = newSalt(), code = newRecoveryCode();
    const wp = await wrapDataKey(dek, await deriveKey("1234", ps, 1000));
    const wr = await wrapDataKey(dek, await deriveKey(normRecovery(code), rs, 1000));
    expect(await openDoc(sealed, await unwrapDataKey(wp, await deriveKey("1234", ps, 1000)))).toEqual(doc);
    expect(await openDoc(sealed, await unwrapDataKey(wr, await deriveKey(normRecovery(code.toLowerCase()), rs, 1000)))).toEqual(doc);
    await expect(unwrapDataKey(wp, await deriveKey("0000", ps, 1000))).rejects.toBeTruthy();
  });
  it("mã khôi phục 24 ký tự, không có ký tự dễ nhầm", () => {
    const c = normRecovery(newRecoveryCode());
    expect(c).toHaveLength(24); expect(c).not.toMatch(/[01OI]/);
  });
});

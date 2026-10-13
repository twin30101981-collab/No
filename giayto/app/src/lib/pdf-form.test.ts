import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { addFreeFields, changedValues, fieldLabel, normalizeFreeField, readFormFields } from "./pdf-form";

describe("pdf form", () => {
  it("labels fields readably", () => { expect(fieldLabel("applicant.full_name[0]")).toBe("full name"); expect(fieldLabel("dateOfBirth")).toBe("date Of Birth"); });
  it("reads text, checkbox and dropdown fields", async () => {
    const d = await PDFDocument.create(); const p = d.addPage(); const f = d.getForm();
    f.createTextField("ho_ten").addToPage(p, { x: 50, y: 700 }); f.getTextField("ho_ten").setText("An");
    f.createCheckBox("dong_y").addToPage(p, { x: 50, y: 650 });
    const dd = f.createDropdown("gioi_tinh"); dd.addOptions(["Nam", "Nữ"]); dd.addToPage(p, { x: 50, y: 600 });
    const fields = await readFormFields(await d.save());
    expect(fields.map((x) => [x.name, x.kind, x.value])).toEqual([["ho_ten", "text", "An"], ["dong_y", "check", ""], ["gioi_tinh", "select", ""]]);
    expect(changedValues(fields, { ho_ten: "An", dong_y: "1" }).map((c) => c.f.name)).toEqual(["dong_y"]);
  });
  it("normalizes free field placement", () => {
    expect(normalizeFreeField({ id: "a", kind: "text", page: 8, x: -2, y: 4, value: "A", fontSize: 60 }, 2)).toMatchObject({ page: 1, x: 0, y: 1, fontSize: 36 });
  });
  it("bakes a free tick into the selected page", async () => {
    const d = await PDFDocument.create(); d.addPage([300, 400]); d.addPage([300, 400]);
    const before = await d.save();
    const out = await addFreeFields(before, [{ id: "tick", kind: "check", page: 1, x: 0.5, y: 0.5, value: "1" }]);
    expect(out.type).toBe("application/pdf");
    expect(out.size).toBeGreaterThan(before.byteLength);
  });
});

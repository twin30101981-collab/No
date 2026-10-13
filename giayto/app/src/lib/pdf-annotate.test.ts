import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { toBytes, addPdfAnnotations, fromPdfRect, normalizeAnnotation, readPdfAnnotations, toPdfRect } from "./pdf-annotate";

const blank = async () => { const doc = await PDFDocument.create(); doc.addPage([300, 400]); doc.addPage([300, 400]); return doc.save(); };

describe("pdf annotations", () => {
  it("keeps annotations inside the selected page", () => {
    const item = normalizeAnnotation({ id: "a", kind: "rectangle", page: 9, x: 0.9, y: -1, width: 0.8, height: 4 }, 2);
    expect(item).toMatchObject({ page: 1, x: 0.9, y: 0, height: 1 });
    expect(item.width).toBeCloseTo(0.1);
  });

  it("converts boxes to PDF rects and back", () => {
    const box = { x: 0.1, y: 0.2, width: 0.5, height: 0.25 };
    const back = fromPdfRect(toPdfRect(box, 300, 400), 300, 400);
    for (const k of Object.keys(box) as (keyof typeof box)[]) expect(back[k]).toBeCloseTo(box[k]);
  });

  it("bakes underline and rectangle into page content when flattening", async () => {
    const before = await blank();
    const out = await addPdfAnnotations(before, [
      { id: "u", kind: "underline", page: 0, x: 0.1, y: 0.2, width: 0.5, height: 0.03 },
      { id: "r", kind: "rectangle", page: 0, x: 0.2, y: 0.4, width: 0.4, height: 0.2 },
    ], { flatten: true });
    expect(out.size).toBeGreaterThan(before.byteLength);
    expect(await readPdfAnnotations(out)).toHaveLength(0);
  });

  it("saves standard annotations that can be read back and edited", async () => {
    const out = await addPdfAnnotations(await blank(), [
      { id: "u", kind: "underline", page: 0, x: 0.1, y: 0.2, width: 0.5, height: 0.03 },
      { id: "r", kind: "rectangle", page: 1, x: 0.2, y: 0.4, width: 0.4, height: 0.2 },
    ]);
    const doc = await PDFDocument.load(await toBytes(out));
    expect(doc.getPages()[0].node.Annots()?.size()).toBe(1);
    const read = await readPdfAnnotations(out);
    expect(read.map((a) => [a.id, a.kind, a.page])).toEqual([["u", "underline", 0], ["r", "rectangle", 1]]);
    expect(read[1].x).toBeCloseTo(0.2); expect(read[1].width).toBeCloseTo(0.4);

    // Re-saving replaces previous editable annotations instead of duplicating them.
    const again = await addPdfAnnotations(out, read.filter((a) => a.id !== "u"));
    const reread = await readPdfAnnotations(again);
    expect(reread.map((a) => a.id)).toEqual(["r"]);
  });
});

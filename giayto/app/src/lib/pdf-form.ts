/** G3-26: read the fillable fields already inside a PDF (AcroForm) and write values back with pdf-lib. */
export type FormField = { name: string; label: string; kind: "text" | "check" | "radio" | "select" | "other"; value: string; options?: string[]; multiline?: boolean; page: number; readOnly: boolean };
export type FreePdfField = { id: string; kind: "text" | "check"; page: number; x: number; y: number; value: string; fontSize?: number };

/** Keep page-relative placement safe even when a tap lands on an edge. Pure. */
export function normalizeFreeField(field: FreePdfField, pageCount: number): FreePdfField {
  const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return { ...field, page: Math.max(0, Math.min(Math.max(0, pageCount - 1), Math.floor(field.page || 0))), x: clamp(field.x), y: clamp(field.y), fontSize: Math.max(8, Math.min(36, field.fontSize ?? 14)) };
}

/** Human label from a field name: "applicant.full_name[0]" → "full name". Pure. */
export function fieldLabel(name: string) {
  const last = name.split(".").filter(Boolean).pop() ?? name;
  return last.replace(/\[\d+\]$/, "").replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim() || name;
}

/** Values are only written for fields that changed and are not read-only. Pure. */
export function changedValues(fields: FormField[], values: Record<string, string>) {
  return fields.filter((f) => !f.readOnly && f.kind !== "other" && values[f.name] !== undefined && values[f.name] !== f.value).map((f) => ({ f, v: values[f.name] }));
}

type Src = Blob | ArrayBuffer | Uint8Array;
async function load(file: Src) {
  const lib = await import("pdf-lib");
  return { lib, doc: await lib.PDFDocument.load(file instanceof Blob ? await file.arrayBuffer() : file, { ignoreEncryption: true }) };
}

export async function readFormFields(file: Src): Promise<FormField[]> {
  const { lib, doc } = await load(file);
  const pages = doc.getPages().map((p) => p.ref);
  return doc.getForm().getFields().map((f) => {
    const name = f.getName();
    const w = f.acroField.getWidgets()[0]; const pr = w?.P(); const page = Math.max(0, pr ? pages.findIndex((r) => r === pr || r.toString() === pr.toString()) : 0);
    const base = { name, label: fieldLabel(name), page, readOnly: f.isReadOnly() };
    if (f instanceof lib.PDFTextField) return { ...base, kind: "text" as const, value: f.getText() ?? "", multiline: f.isMultiline() };
    if (f instanceof lib.PDFCheckBox) return { ...base, kind: "check" as const, value: f.isChecked() ? "1" : "" };
    if (f instanceof lib.PDFRadioGroup) return { ...base, kind: "radio" as const, value: f.getSelected() ?? "", options: f.getOptions() };
    if (f instanceof lib.PDFDropdown || f instanceof lib.PDFOptionList) return { ...base, kind: "select" as const, value: f.getSelected()[0] ?? "", options: f.getOptions() };
    return { ...base, kind: "other" as const, value: "", readOnly: true };
  }).sort((a, b) => a.page - b.page);
}

/** Fill fields, regenerating appearances with an embedded Unicode font so Vietnamese shows in every viewer. */
export async function fillFormFields(file: Src, fields: FormField[], values: Record<string, string>, flatten = false) {
  const { lib, doc } = await load(file);
  const fontkit = (await import("@pdf-lib/fontkit")).default; doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await (await fetch("/fonts/DejaVuSans.ttf")).arrayBuffer(), { subset: false });
  const form = doc.getForm();
  for (const { f, v } of changedValues(fields, values)) {
    const x = form.getField(f.name);
    if (x instanceof lib.PDFTextField) { const max = x.getMaxLength(); x.setText(max ? v.slice(0, max) : v); }
    else if (x instanceof lib.PDFCheckBox) { if (v) x.check(); else x.uncheck(); }
    else if (x instanceof lib.PDFRadioGroup) { if (v) x.select(v); else x.clear(); }
    else if (x instanceof lib.PDFDropdown || x instanceof lib.PDFOptionList) { if (v) x.select(v); else x.clear(); }
  }
  form.updateFieldAppearances(font);
  if (flatten) form.flatten();
  return new Blob([(await doc.save()) as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/** Bake freely placed text and ticks into PDF pages. Coordinates are 0..1 from the page's top-left. */
export async function addFreeFields(file: Src, freeFields: FreePdfField[]) {
  const { lib, doc } = await load(file);
  const pages = doc.getPages();
  const fields = freeFields.map((field) => normalizeFreeField(field, pages.length));
  let font: Awaited<ReturnType<typeof doc.embedFont>> | undefined;
  if (fields.some((field) => field.kind === "text" && field.value.trim())) {
    const fontkit = (await import("@pdf-lib/fontkit")).default;
    doc.registerFontkit(fontkit);
    const response = await fetch("/fonts/DejaVuSans.ttf");
    if (!response.ok) throw new Error("Không tải được phông chữ tiếng Việt.");
    font = await doc.embedFont(await response.arrayBuffer(), { subset: false });
  }
  for (const field of fields) {
    const page = pages[field.page];
    if (!page) continue;
    const { width, height } = page.getSize();
    const x = field.x * width, y = height - field.y * height;
    if (field.kind === "text") {
      const value = field.value.trim();
      if (!value || !font) continue;
      const size = field.fontSize ?? 14;
      page.drawText(value, { x, y: Math.max(0, y - size), size, font, color: lib.rgb(0, 0, 0), maxWidth: Math.max(1, width - x) });
    } else if (field.value) {
      const size = Math.max(9, field.fontSize ?? 14), bottom = Math.max(0, y - size);
      page.drawRectangle({ x, y: bottom, width: size, height: size, borderWidth: 1, borderColor: lib.rgb(0, 0, 0) });
      page.drawLine({ start: { x: x + size * 0.18, y: bottom + size * 0.52 }, end: { x: x + size * 0.43, y: bottom + size * 0.23 }, thickness: 1.8, color: lib.rgb(0, 0, 0) });
      page.drawLine({ start: { x: x + size * 0.43, y: bottom + size * 0.23 }, end: { x: x + size * 0.86, y: bottom + size * 0.82 }, thickness: 1.8, color: lib.rgb(0, 0, 0) });
    }
  }
  return new Blob([(await doc.save()) as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

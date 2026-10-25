import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_DATA_CHARS, diagLogLine, normalizeDiagnosis } from "./scan-diagnose";

const img = z.string().startsWith("data:image/").max(4_000_000);

export const aiExtract = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ images: z.array(img).min(1).max(4), template: z.enum(["vat", "xe", "sodo"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { extractFromImages, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, data: await extractFromImages(data.images, data.template) }; } catch (e) { console.error(e); return toFail(e); }
  });

export const aiText = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    task: z.enum(["translate", "summarize", "solve", "handwrite"]),
    text: z.string().max(30_000).optional(),
    images: z.array(img).max(4).optional(),
    lang: z.string().max(40).optional(),
  }).refine((v) => v.text?.trim() || v.images?.length, "empty").parse(d))
  .handler(async ({ data }) => {
    const { runTextTask, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, text: await runTextTask(data.task, data) }; } catch (e) { console.error(e); return toFail(e); }
  });

/** Đọc từng dòng kèm toạ độ ô (dữ liệu thô). */
export const aiRows = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ images: z.array(img).min(1).max(4) }).parse(d))
  .handler(async ({ data }) => {
    const { rowsFromImages, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, data: await rowsFromImages(data.images) }; } catch (e) { console.error(e); return toFail(e); }
  });

/** Bảng từ ảnh gốc: AI đọc từng dòng, cột được ghép bằng toạ độ (columns.ts). */
export const aiTable = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ images: z.array(img).min(1).max(4) }).parse(d))
  .handler(async ({ data }) => {
    const { rowsFromImages, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    const { rowsToGrid } = await import("./columns");
    try {
      const r = await rowsFromImages(data.images);
      return { ok: true as const, data: { title: r.title, rows: rowsToGrid(r.rows) } };
    } catch (e) { console.error(e); return toFail(e); }
  });

export const aiLayout = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ images: z.array(img).min(1).max(4) }).parse(d))
  .handler(async ({ data }) => {
    const { layoutFromImages, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, data: await layoutFromImages(data.images) }; } catch (e) { console.error(e); return toFail(e); }
  });

/** Hỏi đáp với tài liệu (G3-10): nhận chữ các trang, tự chọn đoạn liên quan, trả lời kèm trang. */
export const aiDocAsk = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    question: z.string().trim().min(1).max(1_000),
    pages: z.array(z.string().max(50_000)).min(1).max(60),
  }).parse(d))
  .handler(async ({ data }) => {
    const { answerDocQuestion, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    const { chunkDocument, selectChunks, buildContext } = await import("./doc-qa");
    try {
      const chunks = selectChunks(chunkDocument(data.pages.map((text) => ({ text }))), data.question);
      if (!chunks.length) return { ok: false as const, code: 422, message: "Tài liệu chưa có chữ. Hãy nhận chữ (OCR/AI) trước rồi hỏi lại." };
      const r = await answerDocQuestion(data.question, buildContext(chunks));
      return { ok: true as const, answer: r.answer, pages: r.pages, usedPages: [...new Set(chunks.map((c) => c.page))] };
    } catch (e) { console.error(e); return toFail(e); }
  });

/** G3-12: AI tự đặt tên & phân loại sau khi quét. */
export const aiClassify = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ images: z.array(img).min(1).max(2) }).parse(d))
  .handler(async ({ data }) => {
    const { classifyImages, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, data: await classifyImages(data.images) }; } catch (e) { console.error(e); return toFail(e); }
  });

/** G3-14: dịch các khối chữ đã lấy khung từ ảnh. */
export const aiTranslateBlocks = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ texts: z.array(z.string().max(4000)).min(1).max(200), lang: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { translateBlocks, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, texts: await translateBlocks(data.texts, data.lang) }; } catch (e) { console.error(e); return toFail(e); }
  });

/** G3-16: ảnh người trên nền xanh lục để tách nền ảnh thẻ. */
export const aiPersonGreen = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ image: img }).parse(d))
  .handler(async ({ data }) => {
    const { greenScreenPerson, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, image: await greenScreenPerson(data.image) }; } catch (e) { console.error(e); return toFail(e); }
  });

/** G3-18: trích tổng tiền, ngày từ ảnh hoá đơn/biên lai. */
export const aiReceipt = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ image: img }).parse(d))
  .handler(async ({ data }) => {
    const { receiptFromImage, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, data: await receiptFromImage(data.image) }; } catch (e) { console.error(e); return toFail(e); }
  });

export const aiPaperCorners = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ image: img }).parse(d))
  .handler(async ({ data }) => {
    const { paperCornersFromImage, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, data: await paperCornersFromImage(data.image) }; } catch (e) { console.error(e); return toFail(e); }
  });

/** Chấm độ rõ, ánh sáng, độ chói, góc chụp và gợi ý chụp lại. */
export const aiPhotoCheck = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ image: img }).parse(d))
  .handler(async ({ data }) => {
    const { checkDocPhoto, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try { return { ok: true as const, data: await checkDocPhoto(data.image) }; } catch (e) { console.error(e); return toFail(e); }
  });

/** S12 – chẩn đoán ảnh quét (chỉ gọi khi người dùng bấm); log không chứa nội dung. */
export const aiScanDiagnose = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(MAX_DATA_CHARS), version: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { diagnoseScan, toFail, aiGate } = await import("./ai.server");
    const limited = await aiGate(); if (limited) return limited;
    try {
      const d = normalizeDiagnosis(await diagnoseScan(data.image), data.version);
      console.log(diagLogLine(data.version, d));
      return { ok: true as const, data: d };
    } catch (e) { const f = toFail(e); console.log(diagLogLine(data.version, null, f.code)); return f; }
  });

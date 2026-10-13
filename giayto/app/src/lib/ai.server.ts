import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema, Output, streamText, type ModelMessage } from "ai";
import { AI_LIMIT_WINDOW_MS, clientKey, createRateLimiter, limitedFail, limitFromEnv } from "./ai-limit";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID = "X-Lovable-AIG-Run-ID";

export type AiFail = { ok: false; code: number; message: string };

function provider(apiKey: string) {
  let runId: string | undefined;
  return createOpenAI({
    baseURL: GATEWAY, apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID) ?? undefined;
      return res;
    },
  });
}

const OPTS = { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } } as const;

/** Chuyển lỗi gateway thành thông báo tiếng Việt; không tự gửi lại. */
export function toFail(e: unknown): AiFail {
  const err = e as { statusCode?: number; status?: number; responseBody?: string; message?: string; lastError?: unknown };
  const inner = (err.lastError ?? err) as typeof err;
  const code = inner.statusCode ?? inner.status ?? 500;
  let body = ""; try { body = JSON.parse(inner.responseBody ?? "{}")?.message ?? ""; } catch { /* */ }
  if (code === 402) return { ok: false, code, message: body || "Đã hết lượt AI miễn phí của tháng. Chủ ứng dụng cần nạp thêm để tiếp tục." };
  if (code === 429) return { ok: false, code, message: "AI đang quá tải. Hãy đợi khoảng một phút rồi thử lại." };
  if (code === 403) return { ok: false, code, message: body || "AI đang bị giới hạn cho ứng dụng này." };
  if (code === 401) return { ok: false, code, message: "AI chưa được cấu hình trên máy chủ." };
  if (code === 400) return { ok: false, code, message: "Ảnh quá lớn hoặc không hợp lệ. Hãy thử trang khác." };
  return { ok: false, code, message: "AI tạm thời không phản hồi. Hãy thử lại sau ít phút." };
}

// HM-03: cổng giới hạn số lần gọi AI theo khách (xem ai-limit.ts); gọi đầu mỗi hàm AI.
let limiter: ReturnType<typeof createRateLimiter> | null = null;
export async function aiGate(): Promise<AiFail | null> {
  limiter ??= createRateLimiter({ limit: limitFromEnv(process.env['AI_RATE_LIMIT_PER_HOUR']), windowMs: AI_LIMIT_WINDOW_MS });
  const { getRequest } = await import("@tanstack/react-start/server");
  const k = clientKey(getRequest()?.headers);
  if (!k) return null;
  const r = limiter.hit(k);
  if (r.ok) return null;
  console.log("[ai-limit] vượt giới hạn, chặn 1 lượt");
  return limitedFail(r.retryAfterSec);
}

function key() { const k = process.env['LOVABLE_API_KEY']; if (!k) throw Object.assign(new Error("no key"), { statusCode: 401 }); return k; }

const filePart = (url: string) => ({ type: "file" as const, data: url, mediaType: url.slice(5, url.indexOf(";")) || "image/jpeg" });

export const DOC_TYPES = ["Hoá đơn", "CCCD/Hộ chiếu", "Hợp đồng", "Biên lai", "Biên bản", "Báo cáo", "Công văn", "Đơn từ", "Sao kê/Chứng từ ngân hàng", "Danh thiếp", "Giấy đăng ký xe", "Sổ đỏ", "Ghi chú", "Khác"] as const;
export type Extraction = { type: string; title: string; summary: string; keyPoints: string[]; confidence: number; fields: { label: string; value: string }[]; tags: string[] };

const EXTRACT_SCHEMA = jsonSchema<Extraction>({
  type: "object", additionalProperties: false,
  required: ["type", "title", "summary", "keyPoints", "confidence", "fields", "tags"],
  properties: {
    type: { type: "string", enum: [...DOC_TYPES] },
    title: { type: "string" }, summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } }, confidence: { type: "number" },
    fields: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "value"], properties: { label: { type: "string" }, value: { type: "string" } } } },
    tags: { type: "array", items: { type: "string" } },
  },
});

export async function extractFromImages(images: string[], template?: string): Promise<Extraction> {
  const { templateById, templatePrompt } = await import("./vn-templates");
  const tpl = templateById(template);
  const instructions = `Bạn đọc ảnh tài liệu đã quét và trích thông tin quan trọng bằng tiếng Việt.
- type: một trong ${DOC_TYPES.join(", ")}.
- title: tên ngắn gọn cho tài liệu (tối đa 60 ký tự), ví dụ "Hoá đơn Điện lực 09/2026".
- summary: một câu tóm tắt.
- keyPoints: 3–6 ý chính ngắn gọn của nội dung (ai, việc gì, khi nào, con số, kết luận).
- confidence: độ chắc chắn về loại tài liệu, từ 0 đến 1.
- fields: các trường theo loại. Hoá đơn/Biên lai: Số tiền, Ngày, Bên bán, Bên mua, Số hoá đơn, Mã số thuế. CCCD/Hộ chiếu: Họ tên, Số giấy tờ, Ngày sinh, Giới tính, Quê quán, Ngày hết hạn. Hợp đồng: Các bên, Ngày ký, Thời hạn, Giá trị. Danh thiếp: Họ tên, Chức vụ, Công ty, Điện thoại, Email, Địa chỉ. Chỉ đưa trường thấy rõ trong ảnh, giữ nguyên số và định dạng.
- tags: 1–3 thẻ ngắn gợi ý (ví dụ "Điện", "Công việc").${tpl ? templatePrompt(tpl) : ""}`;
  const messages: ModelMessage[] = [
    { role: "user", content: [{ type: "text", text: "Trích xuất thông tin từ (các) trang sau." }, ...images.map(filePart)] },
  ];
  let failure: unknown;
  const r = streamText({ model: provider(key()).responses(MODEL), instructions, messages, onError: ({ error }) => { failure = error; }, output: Output.object({ schema: EXTRACT_SCHEMA }), providerOptions: OPTS });
  try { return (await r.output) as Extraction; } catch (e) { throw failure ?? e; }
}

export type TextTask = "translate" | "summarize" | "solve" | "handwrite";
const TASK_PROMPT: Record<TextTask, string> = {
  translate: "Dịch nội dung sang {lang}. Giữ định dạng dòng. Chỉ trả về bản dịch.",
  summarize: "Tóm tắt nội dung bằng tiếng Việt: một đoạn ngắn rồi 3–6 gạch đầu dòng ý chính.",
  handwrite: "Ảnh chứa chữ viết tay (tiếng Việt hoặc ngoại ngữ). Chép lại nguyên văn, đủ dấu tiếng Việt, giữ xuống dòng và gạch đầu dòng như trong ảnh. Không sửa lỗi chính tả, không thêm lời bình. Chữ không đọc được ghi ⟦?⟧. Chỉ trả về văn bản đã chép.",
  solve: "Đây là bài tập. Giải từng bước rõ ràng bằng tiếng Việt, ghi đáp số cuối cùng. Dùng văn bản thuần, không dùng LaTeX.",
};

export async function runTextTask(task: TextTask, input: { text?: string | undefined; images?: string[] | undefined; lang?: string | undefined }) {
  const content = [
    { type: "text" as const, text: input.text ? `Nội dung:\n${input.text}` : "Nội dung nằm trong ảnh." },
    ...(input.images ?? []).map(filePart),
  ];
  let failure: unknown;
  const r = streamText({
    model: provider(key()).responses(MODEL), providerOptions: OPTS, onError: ({ error }) => { failure = error; },
    instructions: TASK_PROMPT[task].replace("{lang}", input.lang ?? "tiếng Anh"),
    messages: [{ role: "user", content }],
  });
  try { const t = await r.text; if (failure) throw failure; return t; } catch (e) { throw failure ?? e; }
}

export type Table = { title: string; rows: string[][] };
const TABLE_SCHEMA = jsonSchema<Table>({
  type: "object", additionalProperties: false, required: ["title", "rows"],
  properties: { title: { type: "string" }, rows: { type: "array", items: { type: "array", items: { type: "string" } } } },
});

/** Đọc bảng trong ảnh thành các hàng/ô; hàng đầu là tiêu đề cột. */
export async function tableFromImages(images: string[]): Promise<Table> {
  const instructions = `Bạn chuyển bảng (hoặc danh sách có cột) trong ảnh thành dữ liệu bảng tính.
- Ảnh có thể bị xoay ngang hoặc ngược: tự đọc theo đúng chiều của chữ.
- rows: hàng đầu là tiêu đề cột, các hàng sau là dữ liệu, mọi hàng cùng số cột, đúng bằng số cột thật của bảng (đếm theo đường kẻ dọc). Không gộp hai cột vào một ô, không bỏ cột trống.
- Tiêu đề nhiều tầng (ô gộp như "DƯ NỢ" phủ nhiều cột): gộp thành một hàng tiêu đề, mỗi ô ghi "Nhóm - Tên cột" hoặc chỉ tên cột.
- Giữ nguyên chữ và số như trong ảnh (dấu chấm hàng nghìn kiểu Việt Nam), kể cả số trong ngoặc "(98.855)".
- Ranh giới ô là đường kẻ dọc, KHÔNG phải khoảng trắng. Dấu "-" nằm cùng ô với số (dù đứng tách ở mép trái ô, ví dụ "-   1.156") là dấu âm: ghi "-1.156". Ô chỉ có một dấu "-" (nghĩa là bằng 0) thì ghi "-" và số ở ô bên phải vẫn thuộc cột bên phải. Tuyệt đối không ghép dấu "-" của ô này với số của ô kế bên, không dồn số sang trái.
- Ô trống để "".
- Giữ cả hàng tổng/nhóm (Hội Sở, TỔNG...) và hàng trống nằm giữa bảng.
- Nếu ảnh không có bảng, mỗi dòng chữ là một hàng một cột.
- Ô nào chữ/số mờ, bị che hoặc bạn đọc chưa chắc: vẫn ghi giá trị đoán tốt nhất rồi thêm "⟦?⟧" ở cuối ô.
- title: tên ngắn cho bảng (tối đa 40 ký tự).`;
  let failure: unknown;
  const r = streamText({
    model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; },
    messages: [{ role: "user", content: [{ type: "text", text: "Chuyển bảng trong ảnh sang bảng tính." }, ...images.map(filePart)] }],
    output: Output.object({ schema: TABLE_SCHEMA }),
  });
  try { return (await r.output) as Table; } catch (e) { throw failure ?? e; }
}

import type { RowIn } from "./columns";
export type RowsResult = { title: string; rows: RowIn[] };
const ROWS_SCHEMA = jsonSchema<RowsResult>({
  type: "object", additionalProperties: false, required: ["title", "rows"],
  properties: {
    title: { type: "string" },
    rows: { type: "array", items: { type: "object", additionalProperties: false, required: ["y", "cells"], properties: {
      y: { type: "number" },
      cells: { type: "array", items: { type: "object", additionalProperties: false, required: ["x0", "x1", "text"], properties: { x0: { type: "number" }, x1: { type: "number" }, text: { type: "string" } } } },
    } } },
  },
});

/** Đọc ảnh gốc (không xoay) theo từng dòng, mỗi ô kèm toạ độ ngang để ghép cột ở phía máy. */
export async function rowsFromImages(images: string[]): Promise<RowsResult> {
  const instructions = `Bạn chép lại bảng (hoặc chữ) trong ảnh theo TỪNG DÒNG, mỗi ô kèm vị trí ngang.
- Đọc theo đúng chiều của chữ, kể cả khi ảnh nằm ngang hay ngược. Toạ độ tính theo chiều đọc đó: x0, x1 là mép trái/phải của ô, y là vị trí dọc của dòng, cùng thang 0–1000.
- Một ô = một vùng giữa hai đường kẻ dọc (hoặc một nhóm chữ tách biệt nếu bảng không kẻ). x0/x1 là mép ô (đường kẻ), không phải mép chữ.
- Ô gộp (ví dụ "DƯ NỢ" phủ nhiều cột) là MỘT ô với x0/x1 trải hết các cột nó phủ.
- Không ghi ô trống. NGOẠI LỆ BẮT BUỘC: ô chỉ có một dấu "-" (hoặc "–") KHÔNG phải ô trống — luôn ghi thành một ô text "-" với x0/x1 của ô đó, kể cả ở cột Đầu năm/đầu kỳ. Giữ nguyên chữ và số (dấu chấm hàng nghìn kiểu Việt Nam, số trong ngoặc "(98.855)").
- Dấu "-" nằm cùng ô với số là dấu âm: ghi chung trong text của ô đó. Không ghép dấu "-" của ô này với số của ô bên cạnh.
- Giữ hàng tổng/nhóm. Chữ/số đọc chưa chắc: ghi giá trị đoán tốt nhất rồi thêm "⟦?⟧" cuối ô.
- title: tên ngắn cho bảng (tối đa 40 ký tự).`;
  let failure: unknown;
  const r = streamText({
    model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; },
    messages: [{ role: "user", content: [{ type: "text", text: "Chép bảng trong ảnh theo từng dòng kèm toạ độ ô." }, ...images.map(filePart)] }],
    output: Output.object({ schema: ROWS_SCHEMA }),
  });
  try { return (await r.output) as RowsResult; } catch (e) { throw failure ?? e; }
}

import type { Block } from "./docx";
const LAYOUT_SCHEMA = jsonSchema<{ title: string; blocks: Block[] }>({
  type: "object", additionalProperties: false, required: ["title", "blocks"],
  properties: {
    title: { type: "string" },
    blocks: { type: "array", items: { type: "object", additionalProperties: false, required: ["kind", "level", "text", "align", "bold", "rows"], properties: {
      kind: { type: "string", enum: ["heading", "paragraph", "bullet", "number", "table"] },
      level: { type: "number" }, text: { type: "string" },
      align: { type: "string", enum: ["left", "center", "right", "justify"] }, bold: { type: "boolean" },
      rows: { type: "array", items: { type: "array", items: { type: "string" } } },
    } } },
  },
});

/** Đọc bố cục trang (tiêu đề, đoạn, danh sách, bảng) để dựng tệp Word. */
export async function layoutFromImages(images: string[]) {
  const instructions = `Bạn chép lại toàn bộ nội dung ảnh tài liệu thành các khối theo đúng thứ tự đọc, giữ nguyên chữ, dấu tiếng Việt và số.
- heading: tiêu đề/đề mục, level 1 cho tiêu đề chính, 2–3 cho mục con. Quốc hiệu, tên cơ quan, tên văn bản thường căn giữa (align "center").
- paragraph: một đoạn văn liền (nối các dòng bị ngắt trong cùng đoạn), align "justify" cho thân văn bản, "right" cho ngày tháng/chữ ký nếu nằm bên phải.
- bullet / number: từng mục danh sách, bỏ ký hiệu đầu dòng.
- table: mọi bảng, rows hàng đầu là tiêu đề cột, các hàng cùng số cột, ô trống "".
- Các trường không dùng: level 1, text "", rows [], bold false. Không thêm nội dung không có trong ảnh.
- Chữ/số nào đọc chưa chắc (mờ, che, nhoè): ghi giá trị đoán tốt nhất rồi thêm "⟦?⟧" ngay sau từ/ô đó.
- title: tên ngắn cho tài liệu (tối đa 60 ký tự).`;
  let failure: unknown;
  const r = streamText({
    model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; },
    messages: [{ role: "user", content: [{ type: "text", text: "Chuyển (các) trang sau thành văn bản Word giữ bố cục." }, ...images.map(filePart)] }],
    output: Output.object({ schema: LAYOUT_SCHEMA }),
  });
  try { return (await r.output) as { title: string; blocks: Block[] }; } catch (e) { throw failure ?? e; }
}

export type DocAnswer = { answer: string; pages: number[] };

/** Trả lời câu hỏi về tài liệu từ các đoạn đã chọn (doc-qa.ts), kèm trích dẫn trang. */
export async function answerDocQuestion(question: string, context: string): Promise<DocAnswer> {
  const instructions = `Bạn là trợ lý trả lời câu hỏi về một tài liệu đã quét. Ngữ cảnh gồm các đoạn chữ đọc được, mỗi đoạn bắt đầu bằng [Trang N].
- Chỉ trả lời từ ngữ cảnh; không suy đoán ngoài tài liệu.
- Mỗi ý trả lời phải ghi trang nguồn dạng [Trang N] (nhiều trang: [Trang 1, 3]).
- Không tìm thấy trong ngữ cảnh: nói rõ "Tài liệu không ghi phần này" và gợi ý cách hỏi khác nếu hợp lý.
- Trả lời ngắn gọn bằng tiếng Việt, văn bản thuần, giữ nguyên số liệu/dấu câu như tài liệu.`;
  let failure: unknown;
  const r = streamText({
    model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; },
    messages: [{ role: "user", content: [{ type: "text", text: `Câu hỏi: ${question}\n\nNgữ cảnh:\n${context}` }] }],
  });
  try {
    const answer = (await r.text).trim();
    if (failure) throw failure;
    const { citedPages } = await import("./doc-qa");
    return { answer, pages: citedPages(answer) };
  } catch (e) { throw failure ?? e; }
}

export type Classification = { title: string; type: string; tags: string[]; confidence: number };
const CLASSIFY_SCHEMA = jsonSchema<Classification>({
  type: "object", additionalProperties: false, required: ["title", "type", "tags", "confidence"],
  properties: { title: { type: "string" }, type: { type: "string", enum: [...DOC_TYPES] }, tags: { type: "array", items: { type: "string" } }, confidence: { type: "number" } },
});

/** G3-12: đặt tên ngắn + phân loại tài liệu vừa quét (nhẹ hơn trích xuất đầy đủ). */
export async function classifyImages(images: string[]): Promise<Classification> {
  const instructions = `Bạn xem ảnh tài liệu vừa quét và đặt tên, phân loại bằng tiếng Việt.
- title: tên ngắn gọn, cụ thể (tối đa 60 ký tự), gồm loại + bên liên quan + kỳ/ngày nếu thấy, ví dụ "Hoá đơn Điện lực 09/2026", "Hợp đồng thuê nhà Nguyễn Văn A". Không ghi số giấy tờ tuỳ thân đầy đủ.
- type: một trong ${DOC_TYPES.join(", ")}.
- tags: 0–3 thẻ ngắn (1–2 từ), ví dụ "Điện", "Nhà", "Công việc".
- confidence: độ chắc chắn 0–1.`;
  const messages: ModelMessage[] = [{ role: "user", content: [{ type: "text", text: "Đặt tên và phân loại tài liệu này." }, ...images.map(filePart)] }];
  let failure: unknown;
  const r = streamText({ model: provider(key()).responses(MODEL), instructions, messages, onError: ({ error }) => { failure = error; }, output: Output.object({ schema: CLASSIFY_SCHEMA }), providerOptions: OPTS });
  try { return (await r.output) as Classification; } catch (e) { throw failure ?? e; }
}

/** G3-14: dịch từng khối chữ, trả mảng cùng thứ tự và độ dài. */
export async function translateBlocks(texts: string[], lang: string): Promise<string[]> {
  const schema = jsonSchema<{ items: string[] }>({ type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "string" } } } });
  const instructions = `Dịch từng mục trong danh sách sang ${lang}. Trả về items có đúng ${texts.length} phần tử, cùng thứ tự. Giữ xuống dòng, số liệu, tên riêng; mục không cần dịch thì giữ nguyên. Bản dịch ngắn gọn để vừa khung chữ gốc.`;
  let failure: unknown;
  const r = streamText({ model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; }, output: Output.object({ schema }),
    messages: [{ role: "user", content: [{ type: "text", text: JSON.stringify(texts) }] }] });
  try { return ((await r.output) as { items: string[] }).items; } catch (e) { throw failure ?? e; }
}

/** G3-16: nhờ mô hình ảnh thay nền bằng màu xanh lục thuần (#00FF00), giữ nguyên người; client tách mặt nạ bằng khoá màu. */
export async function greenScreenPerson(image: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}` },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      modalities: ["image", "text"],
      messages: [{ role: "user", content: [
        { type: "text", text: "Ảnh chân dung để làm ảnh thẻ. Giữ NGUYÊN người (mặt, tóc, quần áo, tư thế, khung hình, kích thước) không chỉnh sửa gì. Chỉ thay toàn bộ nền phía sau bằng một màu xanh lục thuần #00FF00 phẳng, không bóng, không viền. Tóc phải tách gọn khỏi nền." },
        { type: "image_url", image_url: { url: image } },
      ] }],
    }),
  });
  if (!res.ok) throw Object.assign(new Error("image gateway"), { statusCode: res.status, responseBody: await res.text() });
  const j = await res.json() as { choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[] };
  const url = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url?.startsWith("data:image/")) throw Object.assign(new Error("no image"), { statusCode: 500 });
  return url;
}

/** G3-18: đọc hoá đơn/biên lai — tên cửa hàng, tổng tiền phải trả, ngày, nhóm chi tiêu. */
export async function receiptFromImage(image: string) {
  const schema = jsonSchema<{ merchant: string; total: string; date: string; category: string; confidence: number }>({
    type: "object", additionalProperties: false, required: ["merchant", "total", "date", "category", "confidence"],
    properties: { merchant: { type: "string" }, total: { type: "string" }, date: { type: "string" }, category: { type: "string", enum: ["Ăn uống", "Đi lại", "Mua sắm", "Điện nước", "Y tế", "Giáo dục", "Khác"] }, confidence: { type: "number" } },
  });
  const instructions = `Bạn đọc ảnh hoá đơn/biên lai Việt Nam.
- merchant: tên cửa hàng/đơn vị bán (ngắn).
- total: TỔNG SỐ TIỀN PHẢI THANH TOÁN cuối cùng (sau giảm giá, đã gồm VAT), chép đúng chữ số như trên giấy, ví dụ "1.234.500". Không lấy tiền khách đưa hay tiền thối. Không thấy thì để "".
- date: ngày trên hoá đơn dạng dd/mm/yyyy; không thấy thì "".
- category: nhóm chi tiêu phù hợp nhất.
- confidence: độ chắc chắn 0–1 về total và date.`;
  let failure: unknown;
  const r = streamText({ model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; }, output: Output.object({ schema }),
    messages: [{ role: "user", content: [{ type: "text", text: "Đọc hoá đơn này." }, filePart(image)] }] });
  try { return await r.output; } catch (e) { throw failure ?? e; }
}

export async function paperCornersFromImage(image: string) {
  const schema = jsonSchema<{ found: boolean; corners: { x: number; y: number }[]; confidence: number }>({
    type: "object", additionalProperties: false, required: ["found", "corners", "confidence"],
    properties: { found: { type: "boolean" }, confidence: { type: "number" },
      corners: { type: "array", items: { type: "object", additionalProperties: false, required: ["x", "y"], properties: { x: { type: "number" }, y: { type: "number" } } } } },
  });
  const instructions = `Tìm tờ giấy/tài liệu/thẻ chính trong ảnh. Trả 4 góc của tờ giấy (không phải khung chữ) theo toạ độ 0–1000 so với chiều rộng (x) và chiều cao (y) ảnh, gốc ở góc trên trái. Nếu nhiều tờ giấy chồng lên nhau, chọn tờ nằm trên cùng ở giữa ảnh; mép của nó thường là một vạch mờ hoặc bóng nhẹ giữa hai vùng trắng. Bỏ qua dòng chữ, bảng, chữ ký và dấu thời gian của điện thoại in trên ảnh. Góc bị che hoặc lệch khỏi ảnh thì ước lượng theo phần mép còn thấy (được phép hơi ra ngoài 0–1000). Không thấy tờ giấy rõ ràng thì found=false, corners=[]. confidence 0–1.`;
  let failure: unknown;
  const r = streamText({ model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; }, output: Output.object({ schema }),
    messages: [{ role: "user", content: [{ type: "text", text: "Tìm 4 góc tờ giấy." }, filePart(image)] }] });
  try { return await r.output; } catch (e) { throw failure ?? e; }
}

export type PhotoCheck = {
  overall: number; verdict: string;
  sharpness: { score: number; note: string };
  lighting: { score: number; note: string };
  glare: { score: number; note: string };
  angle: { score: number; note: string };
  tips: string[];
};
const crit = () => ({ type: "object" as const, additionalProperties: false, required: ["score", "note"], properties: { score: { type: "number" as const }, note: { type: "string" as const } } });
const PHOTO_SCHEMA = jsonSchema<PhotoCheck>({
  type: "object", additionalProperties: false,
  required: ["overall", "verdict", "sharpness", "lighting", "glare", "angle", "tips"],
  properties: { overall: { type: "number" }, verdict: { type: "string" }, sharpness: crit(), lighting: crit(), glare: crit(), angle: crit(), tips: { type: "array", items: { type: "string" } } },
});

/** Đánh giá chất lượng ảnh chụp tài liệu và gợi ý cách chụp lại. */
export async function checkDocPhoto(image: string): Promise<PhotoCheck> {
  const instructions = `Bạn là chuyên gia chụp tài liệu. Chấm ảnh tài liệu theo thang 0–10 (10 là tốt nhất) bằng tiếng Việt:
- sharpness: độ rõ nét của chữ (mờ, rung tay, lệch nét).
- lighting: ánh sáng đủ và đều (quá tối, quá sáng, bóng đổ của tay/điện thoại).
- glare: mức KHÔNG bị chói/loá (10 = không có điểm loá; thấp = có vệt phản chiếu che chữ).
- angle: góc chụp (10 = chụp thẳng từ trên xuống, giấy vuông vức, đủ 4 góc trong khung).
Mỗi mục có note: một câu ngắn nêu vấn đề cụ thể thấy trong ảnh (vị trí nếu có).
- overall: điểm tổng 0–10. verdict: một câu kết luận (dùng được hay nên chụp lại).
- tips: 2–5 hướng dẫn hành động cụ thể để chụp lại tốt hơn, ưu tiên vấn đề nặng nhất trước. Nếu ảnh đã tốt, tips nêu cách giữ chất lượng.`;
  let failure: unknown;
  const r = streamText({
    model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; },
    messages: [{ role: "user", content: [{ type: "text", text: "Đánh giá ảnh chụp tài liệu này." }, filePart(image)] }],
    output: Output.object({ schema: PHOTO_SCHEMA }),
  });
  try { return (await r.output) as PhotoCheck; } catch (e) { throw failure ?? e; }
}

/** S12 – chẩn đoán 4 nhóm lỗi ảnh quét, có vùng đánh dấu (toạ độ 0–1) và độ tin cậy. */
const DIAG_SCHEMA = jsonSchema<{ summary: string; issues: { group: string; severity: number; confidence: number; note: string; regions: { x: number; y: number; w: number; h: number }[] }[] }>({
  type: "object", additionalProperties: false, required: ["summary", "issues"],
  properties: {
    summary: { type: "string" },
    issues: { type: "array", items: { type: "object", additionalProperties: false, required: ["group", "severity", "confidence", "note", "regions"], properties: {
      group: { type: "string", enum: ["shadow", "edge_noise", "cut_text", "skew"] },
      severity: { type: "number" }, confidence: { type: "number" }, note: { type: "string" },
      regions: { type: "array", items: { type: "object", additionalProperties: false, required: ["x", "y", "w", "h"], properties: { x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" } } } },
    } } },
  },
});
export async function diagnoseScan(image: string) {
  const instructions = `Bạn kiểm tra chất lượng ảnh tài liệu ĐÃ QUÉT (đã cắt, nắn). Chỉ báo 4 nhóm lỗi:
- shadow: bóng xám/vệt tối (thường ở góc).
- edge_noise: rác điểm ảnh, chấm đen, vạch ở mép.
- cut_text: chữ bị cắt mất ở mép.
- skew: dòng chữ còn cong/nghiêng.
Mỗi lỗi: severity 0–1, confidence 0–1, note một câu tiếng Việt KHÔNG chép nội dung tài liệu, regions là hộp x,y,w,h theo tỉ lệ 0–1 của ảnh. Không có lỗi thì issues rỗng. summary một câu.`;
  let failure: unknown;
  const r = streamText({
    model: provider(key()).responses(MODEL), instructions, providerOptions: OPTS, onError: ({ error }) => { failure = error; },
    messages: [{ role: "user", content: [{ type: "text", text: "Chẩn đoán ảnh quét này." }, filePart(image)] }],
    output: Output.object({ schema: DIAG_SCHEMA }),
  });
  try { return await r.output; } catch (e) { throw failure ?? e; }
}

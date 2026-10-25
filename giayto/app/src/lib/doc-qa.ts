/**
 * Hỏi đáp với tài liệu (G3-10): chia nội dung các trang thành đoạn,
 * chọn đoạn liên quan tới câu hỏi, dựng ngữ cảnh gửi AI kèm số trang.
 * Giao diện chat và lịch sử làm ở G3-11.
 */

export type QaChunk = {
  /** Số trang (bắt đầu từ 1). */
  page: number;
  /** Thứ tự đoạn trong trang. */
  index: number;
  text: string;
};

/** Tách chữ một trang thành các đoạn theo dòng trống; đoạn dài cắt bớt theo câu. */
export function chunkPageText(text: string, maxLen = 900): string[] {
  const paras = text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of paras) {
    if (p.length <= maxLen) { out.push(p); continue; }
    // Cắt đoạn quá dài theo dấu câu, không bỏ sót phần đuôi.
    let rest = p;
    while (rest.length > maxLen) {
      const cut = rest.slice(0, maxLen);
      const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "));
      const at = dot > maxLen * 0.4 ? dot + 1 : maxLen;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/** Chia toàn bộ tài liệu thành đoạn có gắn số trang; bỏ trang chưa có chữ. */
export function chunkDocument(pages: { text?: string | undefined }[], maxLen = 900): QaChunk[] {
  const chunks: QaChunk[] = [];
  pages.forEach((p, i) => {
    if (!p.text?.trim()) return;
    chunkPageText(p.text, maxLen).forEach((text, index) => chunks.push({ page: i + 1, index, text }));
  });
  return chunks;
}

const VI_STOP = new Set([
  "và", "của", "là", "có", "cho", "trong", "với", "một", "các", "được", "này", "đó",
  "không", "đã", "theo", "từ", "về", "như", "thì", "mà", "ở", "bao", "nhiêu", "gì",
  "ai", "nào", "khi", "đến", "trên", "dưới", "sau", "trước", "hay", "hoặc", "nhé", "ạ",
]);

/** Tách từ khoá của câu hỏi: chữ thường, bỏ dấu câu và từ nối thông dụng. */
export function queryTerms(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !VI_STOP.has(w));
}

/** Điểm liên quan của một đoạn: số từ khoá khác nhau xuất hiện + thưởng cụm số/tiền khớp. */
export function scoreChunk(chunk: QaChunk, terms: string[]): number {
  if (!terms.length) return 0;
  const text = chunk.text.toLowerCase();
  let score = 0;
  for (const t of terms) if (text.includes(t)) score += 1 + Math.min(3, text.split(t).length - 1) * 0.25;
  return score;
}

/**
 * Chọn các đoạn gửi AI: ưu tiên điểm cao, giữ thứ tự trang, không quá ngân sách ký tự.
 * Khi không đoạn nào khớp từ khoá, lấy các đoạn đầu tài liệu (AI vẫn trả lời được câu tổng quan).
 */
export function selectChunks(chunks: QaChunk[], question: string, budget = 12_000): QaChunk[] {
  const terms = queryTerms(question);
  const scored = chunks.map((c) => ({ c, s: scoreChunk(c, terms) }));
  const hit = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const picked: QaChunk[] = [];
  let used = 0;
  for (const { c } of hit) {
    if (used + c.text.length > budget) continue;
    picked.push(c);
    used += c.text.length;
  }
  if (!picked.length) {
    for (const c of chunks) {
      if (used + c.text.length > budget) break;
      picked.push(c);
      used += c.text.length;
    }
  }
  return picked.sort((a, b) => a.page - b.page || a.index - b.index);
}

/** Dựng khối ngữ cảnh có đánh số trang để đưa vào lời nhắc AI. */
export function buildContext(chunks: QaChunk[]): string {
  return chunks.map((c) => `[Trang ${c.page}] ${c.text}`).join("\n\n");
}

/** Trích số trang được trích dẫn trong câu trả lời (dạng "Trang 2", "[Trang 2, 3]"). */
export function citedPages(answer: string): number[] {
  const pages = new Set<number>();
  for (const m of answer.matchAll(/[Tt]rang\s+([\d,\s]+)/g)) {
    for (const n of m[1]!.split(",")) {
      const v = parseInt(n.trim(), 10);
      if (Number.isFinite(v) && v > 0) pages.add(v);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

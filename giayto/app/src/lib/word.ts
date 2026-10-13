import { blocksToDocx, textToBlocks, type Block } from "./docx";
import { compress } from "./image";
import { recognize } from "./ocr";

type LayoutFn = (a: { data: { images: string[] } }) => Promise<{ ok: true; data: { title: string; blocks: Block[] } } | { ok: false; code: number; message: string }>;

/** Page images → real .docx. AI reads layout (first 4 pages per call); falls back to OCR text structure. */
export async function imagesToWord(srcs: string[], name: string, layout: LayoutFn, knownText?: string) {
  const blocks: Block[] = []; let title = name; let note = "";
  try {
    for (let i = 0; i < srcs.length; i += 4) {
      const images = await Promise.all(srcs.slice(i, i + 4).map((s) => compress(s, 1600, 0.8)));
      const r = await layout({ data: { images } });
      if (!r.ok) throw Object.assign(new Error(r.message), { aiMessage: r.message });
      if (i === 0 && r.data.title) title = r.data.title;
      blocks.push(...r.data.blocks);
    }
    if (!blocks.some((b) => b.text.trim() || b.rows.length)) throw new Error("empty");
  } catch (e) {
    blocks.length = 0;
    note = ((e as { aiMessage?: string }).aiMessage ?? "AI chưa đọc được bố cục.") + " Đã dùng cách đọc chữ thường.";
    let text = knownText?.trim() ?? "";
    if (!text) for (const s of srcs) text += (await recognize(s)) + "\n\n";
    blocks.push(...textToBlocks(text));
  }
  return { blob: blocksToDocx(blocks, title), title, blocks, note };
}

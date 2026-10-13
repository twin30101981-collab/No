/** P7: gói xuất đầy đủ — PDF + ảnh từng trang + chữ nhận được, trong một ZIP. */
import { zip } from "./xlsx";

export type BundleEntry = { name: string; kind: "pdf" | "image" | "text" };

/** Kế hoạch tên tệp trong gói (thuần, kiểm thử được). Trang đánh số 2 chữ số (3 nếu ≥ 100 trang). */
export function planBundle(base: string, pageTypes: string[], hasText: boolean): BundleEntry[] {
  const b = base.trim() || "tai-lieu";
  const pad = pageTypes.length >= 100 ? 3 : 2;
  const out: BundleEntry[] = [{ name: `${b}.pdf`, kind: "pdf" }];
  pageTypes.forEach((t, i) => out.push({ name: `anh/${b}-trang-${String(i + 1).padStart(pad, "0")}.${t.includes("png") ? "png" : "jpg"}`, kind: "image" }));
  if (hasText) out.push({ name: `${b}-chu.txt`, kind: "text" });
  return out;
}

export async function buildBundle(base: string, pdf: Blob, pageSrcs: string[], text: string): Promise<Blob> {
  const imgs = await Promise.all(pageSrcs.map(async (s) => (await fetch(s)).blob()));
  const hasText = text.trim().length > 0;
  const plan = planBundle(base, imgs.map((b) => b.type), hasText);
  const files: [string, string | Uint8Array][] = [[plan[0].name, new Uint8Array(await pdf.arrayBuffer())]];
  for (let i = 0; i < imgs.length; i++) files.push([plan[i + 1].name, new Uint8Array(await imgs[i].arrayBuffer())]);
  if (hasText) files.push([plan[plan.length - 1].name, text]);
  return zip(files, "application/zip");
}

/** Tên thư mục duy nhất cho từng tài liệu trong gói hàng loạt (thuần). */
export function uniqueFolders(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const b = n.trim() || "tai-lieu"; const k = b.toLowerCase(); const c = (seen.get(k) ?? 0) + 1; seen.set(k, c);
    return c === 1 ? b : `${b}-${c}`;
  });
}

export type BundleSource = { name: string; pdf: () => Promise<Blob>; pages: string[]; text: string };

/** P7.2: mỗi tài liệu một thư mục gói đầy đủ trong một ZIP; tài liệu lỗi bị bỏ qua và báo lại, không dừng cả lô. */
export async function buildBatchBundle(srcs: BundleSource[], onP?: (done: number, total: number, name: string) => void) {
  const folders = uniqueFolders(srcs.map((s) => s.name));
  const files: [string, string | Uint8Array][] = []; const failed: string[] = [];
  for (let i = 0; i < srcs.length; i++) {
    const s = srcs[i]; onP?.(i, srcs.length, s.name);
    try {
      const imgs = await Promise.all(s.pages.map(async (p) => (await fetch(p)).blob()));
      const hasText = s.text.trim().length > 0;
      const plan = planBundle(folders[i], imgs.map((b) => b.type), hasText);
      const pdf = await s.pdf();
      const part: [string, string | Uint8Array][] = [[`${folders[i]}/${plan[0].name}`, new Uint8Array(await pdf.arrayBuffer())]];
      for (let k = 0; k < imgs.length; k++) part.push([`${folders[i]}/${plan[k + 1].name}`, new Uint8Array(await imgs[k].arrayBuffer())]);
      if (hasText) part.push([`${folders[i]}/${plan[plan.length - 1].name}`, s.text]);
      files.push(...part);
    } catch (e) { console.error("bundle", s.name, e); failed.push(s.name); }
  }
  onP?.(srcs.length, srcs.length, "");
  return { blob: files.length ? zip(files, "application/zip") : null, count: srcs.length - failed.length, failed };
}

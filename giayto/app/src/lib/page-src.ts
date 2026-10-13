/** S15f2: lớp trung gian cho nguồn ảnh trang — chấp nhận cả data URL lẫn blob: URL.
 *  Bước đệm trước khi bộ nhớ chuyển hẳn sang Blob/object URL (S15f3): mọi chỗ cần base64
 *  (AI, chia sẻ, đồng bộ) phải đi qua srcToDataUrl thay vì giả định chuỗi "data:". */
export const isDataUrl = (s: string) => s.startsWith("data:");
export const isBlobUrl = (s: string) => s.startsWith("blob:");

export function dataUrlBlob(u: string): Blob {
  const i = u.indexOf(","); const meta = u.slice(5, i); const body = u.slice(i + 1);
  if (meta.endsWith(";base64")) {
    const raw = atob(body); const a = new Uint8Array(raw.length);
    for (let k = 0; k < raw.length; k++) a[k] = raw.charCodeAt(k);
    return new Blob([a], { type: meta.replace(";base64", "") || "image/jpeg" });
  }
  return new Blob([decodeURIComponent(body)], { type: meta || "text/plain" });
}

export async function srcToBlob(s: string): Promise<Blob> {
  if (isDataUrl(s)) return dataUrlBlob(s);
  const r = await fetch(s); if (!r.ok) throw new Error(`Không đọc được ảnh (${r.status})`);
  return r.blob();
}

export async function srcToDataUrl(s: string): Promise<string> {
  if (isDataUrl(s)) return s;
  const b = await srcToBlob(s);
  const buf = new Uint8Array(await b.arrayBuffer()); let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:${b.type || "image/jpeg"};base64,${btoa(bin)}`;
}

/** Ước lượng số byte ảnh (data URL: theo base64; blob: không biết → -1). */
export function srcBytes(s: string): number {
  if (!isDataUrl(s)) return -1;
  const k = s.indexOf(","); return k < 0 ? 0 : Math.floor((s.length - k - 1) * 0.75);
}

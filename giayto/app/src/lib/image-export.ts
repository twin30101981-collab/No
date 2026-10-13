import { zip } from "./xlsx";

const load = (src: string) => new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("Không đọc được ảnh trang")); i.src = src; });
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error("Ảnh quá lớn để tạo"))), type, q));

/** Sharp lossless PNG of one page. */
export async function pageToPng(src: string): Promise<Blob> {
  const i = await load(src); const c = document.createElement("canvas");
  c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext("2d")!.drawImage(i, 0, 0);
  const b = await toBlob(c, "image/png"); c.width = 0; return b;
}

/** All pages stacked into one tall JPG for messaging apps; width capped and total height kept under canvas limits. */
export async function pagesToLongImage(srcs: string[], width = 1080): Promise<Blob> {
  const imgs = await Promise.all(srcs.map(load));
  const gap = 16; let w = width;
  let h = imgs.reduce((s, i) => s + Math.round(i.naturalHeight * (w / i.naturalWidth)), 0) + gap * (imgs.length - 1);
  const MAX = 16000; if (h > MAX) { const k = MAX / h; w = Math.round(w * k); h = MAX; }
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  let y = 0;
  for (const i of imgs) { const ih = Math.round(i.naturalHeight * (w / i.naturalWidth)); g.drawImage(i, 0, y, w, ih); y += ih + gap; }
  const b = await toBlob(c, "image/jpeg", 0.85); c.width = 0; return b;
}

/** ZIP with every page as its own JPG (stored, not recompressed). */
export async function pagesToZip(srcs: string[], base: string): Promise<Blob> {
  const files: [string, Uint8Array][] = [];
  for (let k = 0; k < srcs.length; k++) {
    const b = await (await fetch(srcs[k])).blob();
    const ext = b.type.includes("png") ? "png" : "jpg";
    files.push([`${base}-trang-${String(k + 1).padStart(2, "0")}.${ext}`, new Uint8Array(await b.arrayBuffer())]);
  }
  return zip(files, "application/zip");
}

import { loadImg } from "@/lib/image";
import { canvasToPageUrl } from "@/lib/canvas-url";
import { type Region, regionPixels } from "@/lib/region";

/** Fill boxes with solid black, alpha 255 (pure, in place). Nothing of the original survives inside a box. */
export function redactPixels(d: Uint8ClampedArray, w: number, h: number, regions: Region[]) {
  for (const r of regions) {
    const b = regionPixels(r, w, h, 0);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const i = (y * w + x) * 4; d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255; }
  }
  return d;
}

/** Burn black boxes into the page pixels (not an overlay) and re-encode, so the hidden content cannot be recovered. */
export async function applyRedactions(src: string, regions: Region[]) {
  const img = await loadImg(src);
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  redactPixels(data.data, c.width, c.height, regions); ctx.putImageData(data, 0, 0);
  return canvasToPageUrl(c, "image/jpeg", 0.92);
}

// G3-12: chạy nền sau khi lưu bản quét — gửi trang đầu (thu nhỏ) cho AI, áp tên/thẻ, cho phép hoàn tác.
import { toast } from "sonner";
import { aiClassify } from "./ai.functions";
import { applyClassification } from "./auto-name";
import { createFolder, ensureTag, getLibrary, ROOT_FOLDER } from "./library";
import { applyNaming } from "./name-rules";
import { getDocs, saveDoc, type Doc } from "./db";
import { getSettings } from "./settings";
import { isScanActive, whenScanIdle } from "./priority-gate";

async function shrink(src: string, max = 1024) {
  const img = new Image(); img.src = src; await img.decode();
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

export async function autoNameDoc(id: string) {
  if (!getSettings().autoName || !navigator.onLine) return;
  if (isScanActive()) await whenScanIdle(); // B08: đang chụp thì chờ, nhường CPU cho camera
  const start = getDocs().find((d) => d.id === id);
  if (!start || start.locked || !start.pages.length) return;
  try {
    const images = await Promise.all(start.pages.slice(0, 2).map((p) => shrink(p.src)));
    const r = await aiClassify({ data: { images } });
    if (!r.ok) return;
    const cur = getDocs().find((d) => d.id === id); if (!cur) return;
    const classified = applyClassification(cur, r.data); if (!classified) return;
    const st = getSettings();
    const next = applyNaming(classified, { title: classified.name, type: r.data.type }, st.nameTemplate, st.folderRules ?? [], ROOT_FOLDER);
    if (next.folder !== cur.folder && !getLibrary().folders.includes(next.folder)) {
      const parts = next.folder.split("/");
      parts.forEach((_, i) => { const f = parts.slice(0, i + 1).join("/"); if (!getLibrary().folders.includes(f)) createFolder(f); });
    }
    for (const t of next.tags ?? []) if (!(cur.tags ?? []).includes(t)) ensureTag(t);
    await saveDoc(next, false);
    const before: Doc = cur;
    toast(`AI đặt tên: ${next.name}`, {
      description: [next.tags?.length ? `Thẻ: ${next.tags.join(", ")}` : "", next.folder !== cur.folder ? `Chuyển vào: ${next.folder}` : ""].filter(Boolean).join(" · ") || undefined,
      action: { label: "Hoàn tác", onClick: () => { const now = getDocs().find((d) => d.id === id); if (now) void saveDoc({ ...now, name: before.name, folder: before.folder, tags: before.tags ?? [], fields: before.fields ?? {} }, false); } },
    });
  } catch (e) { console.warn("auto-name", e); }
}

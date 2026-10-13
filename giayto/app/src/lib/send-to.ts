/** G4-21: send a document to other services (email, Zalo, system share). Pure helpers + thin browser glue. */
import { download } from "./files";

export type SendTarget = "system" | "email" | "zalo";

/** mailto: link with subject/body; body trimmed so the URL stays under common client limits (~1800 chars). */
export function mailtoUrl(opts: { to?: string | undefined; subject: string; body?: string | undefined }) {
  const to = (opts.to ?? "").split(/[,;\s]+/).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)).join(",");
  let body = opts.body ?? "";
  const base = `mailto:${encodeURIComponent(to).replace(/%2C/g, ",")}?subject=${encodeURIComponent(opts.subject)}`;
  const max = 1800 - base.length - 6;
  while (body && encodeURIComponent(body).length > max) body = body.slice(0, Math.floor(body.length * 0.9));
  if (body !== (opts.body ?? "")) body = body.trimEnd() + "…";
  return body ? `${base}&body=${encodeURIComponent(body)}` : base;
}

/** Zalo share page for a public link (Zalo has no web API for files; files go through the system share sheet). */
export function zaloShareUrl(link: string) {
  return `https://zalo.me/share?url=${encodeURIComponent(link)}`;
}

/** Default message body for a document. */
export function sendMessage(name: string, pages: number, link?: string) {
  return [`Gửi bạn tài liệu "${name}" (${pages} trang).`, link ? `Xem tại: ${link}` : "Tệp PDF đính kèm.", "", "— Gửi từ Ghi Nhanh"].join("\n");
}

export function canShareFiles(file?: File) {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  return navigator.canShare({ files: [file ?? new File([""], "a.pdf", { type: "application/pdf" })] });
}

/**
 * Send a file. With a share sheet (phones), files are attached directly — the user picks Mail, Zalo, Messenger…
 * Without it (desktop), the file is saved and the mail app opens so the user attaches it.
 */
export async function sendFile(target: SendTarget, blob: Blob, name: string, meta: { title: string; pages: number; to?: string | undefined; link?: string | undefined }): Promise<"shared" | "cancelled" | "fallback"> {
  const file = new File([blob], name, { type: blob.type || "application/pdf" });
  const text = sendMessage(meta.title, meta.pages, meta.link);
  if (target === "zalo" && meta.link) { window.open(zaloShareUrl(meta.link), "_blank", "noopener"); return "shared"; }
  if (canShareFiles(file) && !(target === "email" && meta.to)) {
    try { await navigator.share({ files: [file], title: meta.title, text }); return "shared"; }
    catch (e) { if ((e as Error)?.name === "AbortError") return "cancelled"; }
  }
  download(blob, name);
  if (target === "email") window.location.href = mailtoUrl({ to: meta.to, subject: meta.title, body: sendMessage(meta.title, meta.pages, meta.link) + `\n\n(Đính kèm tệp ${name} vừa tải về.)` });
  return "fallback";
}

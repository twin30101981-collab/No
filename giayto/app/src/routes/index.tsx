import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ClipboardPaste, FileText, Grid2X2, IdCard, ImagePlus, Lightbulb, Search, Sparkles, Type, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { DocRow } from "@/components/doc-row";
import { deleteDocs, restoreDocs, useDocs } from "@/lib/db";
import { matchesQuery, removeQuickFilter, useLibrary } from "@/lib/library";
import { TagChip } from "@/components/library-ui";
import { docToPdf, safeName, shareOrDownload } from "@/lib/files";
import { filesToPages, useImport } from "@/lib/importer";
import { newDoc, saveDoc } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { readClipboardImages } from "@/lib/image-input";
import { useImagePaste } from "@/lib/use-image-paste";
import { takeSharedFiles } from "@/lib/share-target";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Ghi Nhanh — Quét tài liệu trên điện thoại" },
    { name: "description", content: "Quét nhiều trang, cắt thẳng, nhận diện chữ tiếng Việt và xuất PDF ngay trên điện thoại." },
    { property: "og:title", content: "Ghi Nhanh — Quét tài liệu trên điện thoại" },
    { property: "og:description", content: "Quét nhiều trang, cắt thẳng, nhận diện chữ tiếng Việt và xuất PDF ngay trên điện thoại." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  validateSearch: (s: Record<string, unknown>): { shared?: number } => (s['shared'] != null ? { shared: Number(s['shared']) || 0 } : {}),
  component: Home,
});

function Home() {
  const { docs, ready } = useDocs();
  const lib = useLibrary();
  const [query, setQuery] = useState("");
  const importFiles = useImport();
  const [pasting, setPasting] = useState(false);
  useImagePaste((files) => importFiles(files, "Ảnh dán"), !pasting);
  async function pasteImage() {
    if (pasting) return;
    setPasting(true);
    try { await importFiles(await readClipboardImages(), "Ảnh dán"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không dán được ảnh"); }
    finally { setPasting(false); }
  }
  const navigate = useNavigate();
  const { shared } = Route.useSearch();
  const sharedDone = useRef(false);
  // G2-11: tệp chia sẻ từ app khác → lưu thành một tài liệu rồi mở
  useEffect(() => {
    if (shared === undefined || sharedDone.current) return;
    sharedDone.current = true;
    void (async () => {
      const id = toast.loading("Đang nhận tệp chia sẻ…");
      try {
        const files = await takeSharedFiles();
        if (!files.length) { toast.error("Không nhận được ảnh hoặc PDF nào. Hãy chia sẻ ảnh hoặc tệp PDF.", { id }); navigate({ to: "/", search: {}, replace: true }); return; }
        const pages = await filesToPages(files);
        if (!pages.length) { toast.error("Tệp chia sẻ không đọc được", { id }); navigate({ to: "/", search: {}, replace: true }); return; }
        const doc = await saveDoc(newDoc(pages, files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : undefined, "Chia sẻ"));
        toast.success(`Đã nhận ${pages.length} trang`, { id });
        navigate({ to: "/doc/$id", params: { id: doc.id }, replace: true });
      } catch { toast.error("Không đọc được tệp chia sẻ. Thử chia sẻ lại.", { id }); }
    })();
  }, [shared, navigate]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs.slice(0, 8);
    return docs.filter((d) => matchesQuery(d, q));
  }, [docs, query]);
  const unnamed = docs.filter((d) => !d.pages.some((p) => p.text) && !d.locked).length;

  const shortcuts = [
    { label: "Quét", icon: Camera, primary: true, run: () => navigate({ to: "/scan" }) },
    { label: "Công cụ PDF", icon: FileText, run: () => navigate({ to: "/tools" }) },
    { label: "Nhập ảnh", icon: ImagePlus, run: () => importFiles("image/*", "Ảnh") },
    { label: "Nhập tập tin", icon: Upload, run: () => importFiles("application/pdf,image/*", "PDF") },
    { label: "Thẻ ID", icon: IdCard, run: () => navigate({ to: "/scan", search: { mode: "id" } }) },
    { label: "Trích văn bản", icon: Type, run: () => importFiles("image/*,application/pdf", "Văn bản", "ocr") },
    { label: "Solver AI", icon: Sparkles, run: () => importFiles("image/*", "Bài tập", "ai-solve") },
    { label: "Tất cả", icon: Grid2X2, run: () => navigate({ to: "/tools" }) },
  ];

  return (
    <AppShell wide>
      <header className="rise grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="brand-mark grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary font-display text-sm font-bold text-primary-foreground">G</div>
          <div className="min-w-0"><p className="font-display truncate text-[1.0625rem] font-semibold leading-none">Ghi Nhanh</p><p className="mt-1 text-[0.6875rem] font-medium text-muted-foreground">Quét · Nhận chữ · PDF</p></div>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[0.625rem] font-bold text-primary">{docs.length} tài liệu</span>
      </header>

      <section className="rise rise-1 px-5 pt-4">
        <label className="glass-field flex h-12 items-center gap-2.5 rounded-[14px] px-3.5" htmlFor="search">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input id="search" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-muted-foreground" placeholder="Tìm tên, chữ trong ảnh, thẻ" />
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[0.625rem] font-bold text-primary">OCR</span>
        </label>
      </section>

      {!query && (
        <section className="rise rise-2 px-5 pt-5">
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
            {shortcuts.map(({ label, icon: Icon, primary, run }) => (
              <button key={label} onClick={run} className="shortcut-tile flex h-[78px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[14px] px-1 active:scale-95">
                <span className={`grid size-9 place-items-center rounded-[10px] ${primary ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}><Icon className="size-[18px]" /></span>
                <span className="w-full truncate text-center text-[0.65625rem] font-semibold">{label}</span>
              </button>
            ))}
          </div>
          <Button variant="glass" className="mt-3 w-full" disabled={pasting} onClick={() => void pasteImage()}><ClipboardPaste /> {pasting ? "Đang dán…" : "Dán ảnh"}</Button>
        </section>
      )}

      {!query && (lib.quick.length > 0 || lib.tags.length > 0) && (
        <section className="rise rise-2 px-5 pt-4">
          <h2 className="font-display text-[0.875rem] font-semibold">Bộ lọc nhanh</h2>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {lib.quick.map((q) => (
              <span key={q.id} className="shortcut-tile flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-3.5 pr-2 text-xs font-semibold">
                <Link to="/documents" search={{ qf: q.id }}>{q.name}</Link>
                <button aria-label={`Xoá bộ lọc ${q.name}`} onClick={() => removeQuickFilter(q.id)}><X className="size-3.5 text-muted-foreground" /></button>
              </span>
            ))}
            {lib.tags.map((t) => <Link key={t.name} to="/documents" search={{ tag: t.name }} className="flex shrink-0 items-center"><TagChip name={t.name} /></Link>)}
          </div>
        </section>
      )}

      {!query && unnamed > 0 && (
        <section className="rise rise-2 px-5 pt-4">
          <div className="document-row flex items-center gap-3 rounded-[14px] p-3">
            <Lightbulb className="size-5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-xs leading-5">Bạn có <b>{unnamed}</b> tài liệu chưa nhận diện chữ. Nhận chữ để tìm kiếm và tự đặt tên.</p>
          </div>
        </section>
      )}

      <section className="rise rise-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[0.875rem] font-semibold">{query ? `Kết quả (${results.length})` : "Gần đây"}</h2>
          <Link to="/documents" className="inline-flex min-h-10 items-center text-[0.75rem] font-semibold text-primary">Xem tất cả</Link>
        </div>
        <div className="mt-3 flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
          {results.map((doc) => (
            <DocRow key={doc.id} doc={doc}
              onDelete={async () => { await deleteDocs([doc.id]); toast("Đã chuyển vào thùng rác", { action: { label: "Hoàn tác", onClick: () => void restoreDocs([doc.id]) } }); }}
              onShare={async () => { await shareOrDownload(await docToPdf(doc), `${safeName(doc.name)}.pdf`); }} />
          ))}
          {ready && !results.length && (
            <div className="document-row flex flex-col items-center gap-3 rounded-[16px] px-6 py-8 text-center">
              <Camera className="size-8 text-primary" />
              <p className="text-sm font-semibold">{query ? "Không tìm thấy tài liệu" : "Chưa có tài liệu"}</p>
              <p className="text-xs text-muted-foreground">Nhấn nút máy ảnh bên dưới để quét trang đầu tiên.</p>
            </div>
          )}
        </div>
        {!query && docs.length > 0 && <p className="mt-3 text-center text-[0.6875rem] text-muted-foreground">Mẹo: vuốt sang trái để chia sẻ hoặc xóa</p>}
      </section>
    </AppShell>
  );
}

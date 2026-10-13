import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Combine, FileOutput, Folder, FolderInput, FolderPlus, LayoutGrid, List, Pencil, Search, Share2, SlidersHorizontal, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog, promptDialog } from "@/lib/dialog";
import { AppShell } from "@/components/app-shell";
import { DocRow } from "@/components/doc-row";
import { BatchExport } from "@/components/batch-export";
import { Button } from "@/components/ui/button";
import { deleteDocs, restoreDocs, newDoc, saveDoc, saveDocs, useDocs } from "@/lib/db";
import { srcBytes } from "@/lib/disk-pack";
import { FilterSheet, FolderCrumbs, FolderPicker, TagChip, TagPicker } from "@/components/library-ui";
import {
  activeFilterCount, allFolders, applyFilter, baseName, childFolders, createFolder, deleteFolder, type DocFilter,
  emptyFilter, inFolder, parentOf, renameFolder, ROOT_FOLDER, saveQuickFilter, useLibrary,
} from "@/lib/library";
import { docToPdf, imagesToPdf, safeName, shareOrDownload } from "@/lib/files";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [
    { title: "Tài liệu — Ghi Nhanh" },
    { name: "description", content: "Toàn bộ tài liệu đã quét, sắp xếp theo thư mục, loại và ngày." },
    { property: "og:title", content: "Tài liệu — Ghi Nhanh" },
    { property: "og:description", content: "Toàn bộ tài liệu đã quét, sắp xếp theo thư mục, loại và ngày." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  validateSearch: (s: Record<string, unknown>): { qf?: string; tag?: string } => ({
    ...(typeof s["qf"] === "string" ? { qf: s["qf"] } : {}), ...(typeof s["tag"] === "string" ? { tag: s["tag"] } : {}),
  }),
  component: Documents,
});

type Sort = "date" | "name" | "size";
const SORT_LABEL: Record<Sort, string> = { date: "Mới nhất", name: "Tên A–Z", size: "Dung lượng" };

function Documents() {
  const { docs } = useDocs();
  const lib = useLibrary();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [filter, setFilter] = useState<DocFilter>(() => emptyFilter());
  const [sort, setSort] = useState<Sort>("date");
  const [grid, setGrid] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sheet, setSheet] = useState<"filter" | "move" | "tags" | null>(null);
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const selectMode = selected.length > 0;
  const [batchOpen, setBatchOpen] = useState(false);

  useEffect(() => {
    const qf = search.qf && lib.quick.find((q) => q.id === search.qf);
    if (qf) setFilter({ ...emptyFilter(), ...qf.filter });
    else if (search.tag) setFilter({ ...emptyFilter(), tags: [search.tag] });
  }, [search.qf, search.tag, lib.quick]);

  const folders = useMemo(() => allFolders(lib, docs), [lib, docs]);
  const subfolders = childFolders(folders, filter.folder);
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => { setLimit(PAGE); }, [filter, sort]);
  const kinds = useMemo(() => [...new Set(docs.map((d) => d.kind))].sort((a, b) => a.localeCompare(b, "vi")), [docs]);
  const list = useMemo(() => {
    const size = (d: typeof docs[number]) => d.pages.reduce((n, p) => n + srcBytes(p.src), 0);
    return applyFilter(docs, filter).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "vi") : sort === "size" ? size(b) - size(a) : b.updatedAt - a.updatedAt);
  }, [docs, filter, sort]);
  const chosen = docs.filter((d) => selected.includes(d.id));
  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const set = (p: Partial<DocFilter>) => setFilter((f) => ({ ...f, ...p }));
  const nActive = activeFilterCount(filter);

  async function merge() {
    if (chosen.length < 2) { toast("Chọn ít nhất 2 tài liệu để ghép"); return; }
    const doc = await saveDoc(newDoc(chosen.flatMap((d) => d.pages), `Ghép ${chosen.length} tài liệu`, "Ghép"));
    setSelected([]); navigate({ to: "/doc/$id", params: { id: doc.id } });
  }
  async function moveTo(folder: string, ids = selected) {
    await saveDocs(docs.filter((x) => ids.includes(x.id)).map((d) => ({ ...d, folder })));
    setSelected([]); setSheet(null); toast.success(`Đã chuyển ${ids.length} tài liệu vào "${baseName(folder)}"`);
  }
  async function applyTags() {
    await saveDocs(chosen.map((d) => ({ ...d, tags: [...new Set([...(d.tags ?? []), ...bulkTags])] })));
    toast.success(`Đã gắn ${bulkTags.length} thẻ cho ${chosen.length} tài liệu`); setBulkTags([]); setSelected([]); setSheet(null);
  }
  async function share() {
    const blob = chosen.length === 1 ? await docToPdf(chosen[0]) : await imagesToPdf(chosen.flatMap((d) => d.pages.map((p) => p.src)), { searchable: true });
    await shareOrDownload(blob, `${safeName(chosen.length === 1 ? chosen[0].name : "ghi-nhanh")}.pdf`);
  }
  async function remove() {
    if (!(await confirmDialog(`Xóa ${chosen.length} tài liệu?`, { message: "Không thể hoàn tác.", okText: "Xóa", danger: true }))) return;
    const ids = selected; await deleteDocs(ids); setSelected([]); toast(`Đã chuyển ${ids.length} tài liệu vào thùng rác`, { action: { label: "Hoàn tác", onClick: () => void restoreDocs(ids) } });
  }
  async function newFolder() {
    const n = (await promptDialog(filter.folder ? `Thư mục con trong "${baseName(filter.folder)}"` : "Thư mục mới", { placeholder: "Tên thư mục", okText: "Tạo" }))?.replace(/\//g, "-");
    if (!n) return; const path = filter.folder ? `${filter.folder}/${n}` : n; createFolder(path); toast.success(`Đã tạo "${n}"`);
  }
  async function rename() {
    const f = filter.folder; if (!f) return;
    const n = (await promptDialog("Đổi tên thư mục", { defaultValue: baseName(f), okText: "Lưu" }))?.replace(/\//g, "-"); if (!n || n === baseName(f)) return;
    const p = parentOf(f); const to = p ? `${p}/${n}` : n;
    await renameFolder(f, to, docs); set({ folder: to }); toast.success("Đã đổi tên");
  }
  async function removeFolder() {
    const f = filter.folder; if (!f) return;
    const count = docs.filter((d) => inFolder(d.folder, f)).length;
    if (!(await confirmDialog(`Xoá thư mục "${baseName(f)}"?`, { message: `Các thư mục con cũng bị xoá. ${count} tài liệu sẽ chuyển lên "${parentOf(f) ?? ROOT_FOLDER}".`, okText: "Xoá", danger: true }))) return;
    await deleteFolder(f, docs); set({ folder: parentOf(f) }); toast("Đã xoá thư mục");
  }

  return (
    <AppShell wide title={selectMode ? `Đã chọn ${selected.length}` : "Tài liệu"} action={
      selectMode
        ? <Button variant="glass" size="icon" aria-label="Bỏ chọn" onClick={() => setSelected([])}><X /></Button>
        : <div className="flex gap-1.5">
            <Button variant="glass" size="icon" aria-label="Đổi cách sắp xếp" onClick={() => setSort((s) => s === "date" ? "name" : s === "name" ? "size" : "date")}><ArrowDownUp /></Button>
            <Button variant="glass" size="icon" aria-label="Đổi kiểu hiển thị" onClick={() => setGrid((g) => !g)}>{grid ? <List /> : <LayoutGrid />}</Button>
          </div>
    }>
      <div className="rise rise-1 flex gap-2 px-5 pt-4">
        <label className="glass-field flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input value={filter.q} onChange={(e) => set({ q: e.target.value })} placeholder="Tên, chữ trong ảnh, thẻ…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {filter.q && <button aria-label="Xoá tìm kiếm" onClick={() => set({ q: "" })}><X className="size-4 text-muted-foreground" /></button>}
        </label>
        <Button variant={nActive ? "default" : "glass"} className="h-11 gap-1.5" onClick={() => setSheet("filter")} aria-label="Bộ lọc"><SlidersHorizontal />{nActive || null}</Button>
      </div>

      <div className="rise rise-1 flex items-center gap-2 px-5 pt-3">
        <div className="min-w-0 flex-1"><FolderCrumbs folder={filter.folder} onGo={(f) => set({ folder: f })} /></div>
        {filter.folder && filter.folder !== ROOT_FOLDER && <>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Đổi tên thư mục" onClick={rename}><Pencil /></Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Xoá thư mục" onClick={removeFolder}><Trash2 /></Button>
        </>}
        <Button variant="ghost" size="icon" className="size-10" aria-label="Tạo thư mục" onClick={newFolder}><FolderPlus /></Button>
      </div>

      {subfolders.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-5 pt-2 [scrollbar-width:none]">
          {subfolders.map((f) => (
            <button key={f} onClick={() => set({ folder: f })}
              onDragOver={(e) => { e.preventDefault(); setDropOn(f); }} onDragLeave={() => setDropOn(null)}
              onDrop={(e) => { e.preventDefault(); setDropOn(null); const id = e.dataTransfer.getData("text/doc-id"); if (id) void moveTo(f, selected.includes(id) ? selected : [id]); }}
              className={`shortcut-tile flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-xs font-semibold ${dropOn === f ? "ring-2 ring-primary" : ""}`}>
              <Folder className="size-4 text-primary" />{baseName(f)}
              <span className="text-[0.625rem] font-normal text-muted-foreground">{docs.filter((d) => inFolder(d.folder, f)).length}</span>
            </button>
          ))}
        </div>
      )}

      {(filter.tags.length > 0 || filter.kind || filter.from || filter.to || filter.ocr !== "any") && (
        <div className="flex flex-wrap gap-1.5 px-5 pt-2">
          {filter.tags.map((t) => <TagChip key={t} name={t} onRemove={() => set({ tags: filter.tags.filter((x) => x !== t) })} />)}
          {filter.kind && <Pill onRemove={() => set({ kind: null })}>{filter.kind}</Pill>}
          {(filter.from || filter.to) && <Pill onRemove={() => set({ from: "", to: "" })}>{filter.from || "…"} → {filter.to || "…"}</Pill>}
          {filter.ocr !== "any" && <Pill onRemove={() => set({ ocr: "any" })}>{filter.ocr === "yes" ? "Đã nhận chữ" : "Chưa nhận chữ"}</Pill>}
        </div>
      )}
      <p className="px-5 pt-2 text-[0.6875rem] text-muted-foreground">{list.length} tài liệu · {SORT_LABEL[sort]} · Giữ lâu để chọn nhiều</p>

      <div className={`rise rise-2 px-5 pt-3 ${grid ? "grid grid-cols-2 gap-2.5 lg:grid-cols-4" : "flex flex-col gap-2.5 lg:grid lg:grid-cols-2"}`}>
        {list.slice(0, limit).map((doc) => (
          <DocRow key={doc.id} doc={doc} grid={grid} selectMode={selectMode} selected={selected.includes(doc.id)}
            onLongPress={() => toggle(doc.id)} onToggle={() => toggle(doc.id)}
            onDelete={async () => { await deleteDocs([doc.id]); toast("Đã chuyển vào thùng rác", { action: { label: "Hoàn tác", onClick: () => void restoreDocs([doc.id]) } }); }}
            onShare={async () => { await shareOrDownload(await docToPdf(doc), `${safeName(doc.name)}.pdf`); }} />
        ))}
        {list.length > limit && <LoadMore onMore={() => setLimit((n) => n + PAGE)} />}
        {!list.length && <p className="col-span-full py-16 text-center text-sm text-muted-foreground">Không có tài liệu phù hợp</p>}
      </div>

      {selectMode && (
        <div className="bottom-nav fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto grid w-[calc(100%-24px)] max-w-[406px] grid-cols-6 rounded-[16px] p-1.5">
          {[{ i: <Share2 />, l: "Chia sẻ", f: share }, { i: <FileOutput />, l: "Xuất", f: () => setBatchOpen(true) }, { i: <Combine />, l: "Ghép", f: merge }, { i: <FolderInput />, l: "Thư mục", f: () => setSheet("move") }, { i: <Tags />, l: "Gắn thẻ", f: () => setSheet("tags") }, { i: <Trash2 />, l: "Xóa", f: remove }].map((a) => (
            <Button key={a.l} variant="ghost" className={`h-14 flex-col gap-1 px-0 text-[0.625rem] ${a.l === "Xóa" ? "text-destructive" : ""}`} onClick={a.f}>{a.i}{a.l}</Button>
          ))}
        </div>
      )}

      <BatchExport docs={chosen} open={batchOpen} onClose={() => setBatchOpen(false)} onDone={() => { setBatchOpen(false); setSelected([]); }} />
      <FilterSheet open={sheet === "filter"} onOpenChange={(o) => setSheet(o ? "filter" : null)} value={filter} onChange={setFilter} kinds={kinds}
        onSaveQuick={(name) => { saveQuickFilter(name, filter); toast.success(`Đã lưu "${name}" vào Trang chủ`); }} />
      <FolderPicker open={sheet === "move"} onOpenChange={(o) => setSheet(o ? "move" : null)} title={`Chuyển ${selected.length} tài liệu vào`}
        value={chosen.length && chosen.every((d) => d.folder === chosen[0].folder) ? chosen[0].folder : undefined} onPick={(f) => void moveTo(f)} />
      <TagPicker open={sheet === "tags"} onOpenChange={(o) => { if (!o && bulkTags.length) void applyTags(); else setSheet(o ? "tags" : null); }}
        title={`Gắn thẻ cho ${selected.length} tài liệu`} value={bulkTags} onChange={setBulkTags} />
    </AppShell>
  );
}

function Pill({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return <span className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary px-1.5 text-[0.625rem] font-bold text-primary">{children}<button aria-label="Bỏ" onClick={onRemove}><X className="size-3" /></button></span>;
}

const PAGE = 40;
/** Hiện dần 40 tài liệu mỗi lần khi cuộn tới cuối — giữ danh sách mượt khi có hàng trăm tài liệu. */
function LoadMore({ onMore }: { onMore: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) onMore(); }, { rootMargin: "400px" });
    io.observe(el); return () => io.disconnect();
  }, [onMore]);
  return <div ref={ref} className="col-span-full h-8" />;
}

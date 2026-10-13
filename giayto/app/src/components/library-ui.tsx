import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronRight, Folder, FolderPlus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDocs } from "@/lib/db";
import {
  allFolders, baseName, createFolder, type DocFilter, ensureTag, parentOf, tagColor, TAG_COLORS, useLibrary,
} from "@/lib/library";

const tagStyle = (c: number) => ({ "--tag-c": `var(--tag-${c % TAG_COLORS})` }) as CSSProperties;

export function TagChip({ name, onRemove, active, onClick }: { name: string; onRemove?: () => void; active?: boolean; onClick?: () => void }) {
  const lib = useLibrary();
  const cls = `inline-flex h-6 max-w-full shrink-0 items-center gap-1 rounded-md px-1.5 text-[0.625rem] font-bold ${active === false ? "bg-muted text-muted-foreground" : "tag-chip"} ${active ? "ring-1 ring-current" : ""}`;
  const inner = <><span className="tag-dot size-1.5 shrink-0 rounded-full" /><span className="truncate">{name}</span>{onRemove && <X className="size-3 shrink-0" onClick={(e) => { e.stopPropagation(); onRemove(); }} />}</>;
  return onClick
    ? <button type="button" onClick={onClick} style={tagStyle(tagColor(lib, name))} className={cls}>{inner}</button>
    : <span style={tagStyle(tagColor(lib, name))} className={cls}>{inner}</span>;
}

function BottomSheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-[430px] overflow-y-auto rounded-t-[20px] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle className="font-display text-left">{title}</SheetTitle></SheetHeader>
        <div className="px-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/** Folder tree picker with inline "new subfolder". */
export function FolderPicker({ open, onOpenChange, value, onPick, title = "Chọn thư mục" }: {
  open: boolean; onOpenChange: (o: boolean) => void; value?: string | undefined; onPick: (folder: string) => void; title?: string;
}) {
  const lib = useLibrary(); const { docs } = useDocs();
  const folders = allFolders(lib, docs);
  const [newIn, setNewIn] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState("");
  const depth = (f: string) => f.split("/").length - 1;
  function add() {
    const n = name.trim().replace(/\//g, "-"); if (!n) return;
    const path = newIn ? `${newIn}/${n}` : n; createFolder(path); setNewIn(undefined); setName(""); onPick(path);
  }
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col gap-1">
        {folders.map((f) => (
          <div key={f} className="flex items-center gap-1" style={{ paddingLeft: depth(f) * 16 }}>
            <button onClick={() => onPick(f)} className={`flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] px-3 text-left text-sm ${value === f ? "bg-secondary font-semibold text-primary" : "hover:bg-muted"}`}>
              <Folder className="size-4 shrink-0" /><span className="truncate">{baseName(f)}</span>{value === f && <Check className="ml-auto size-4" />}
            </button>
            <Button variant="ghost" size="icon" aria-label={`Tạo thư mục con trong ${f}`} onClick={() => { setNewIn(f); setName(""); }}><FolderPlus /></Button>
          </div>
        ))}
      </div>
      {newIn !== undefined ? (
        <div className="mt-3">
          <p className="mb-1 text-[0.6875rem] text-muted-foreground">Thư mục mới {newIn ? `trong "${newIn}"` : "ở gốc"}</p>
          <div className="flex gap-2">
            <Input autoFocus className="h-11" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Tên thư mục" />
            <Button className="h-11" onClick={add}>Tạo</Button>
          </div>
        </div>
      ) : (
        <Button variant="glass" className="mt-3 w-full" onClick={() => { setNewIn(null); setName(""); }}><Plus /> Thư mục mới ở gốc</Button>
      )}
    </BottomSheet>
  );
}

/** Toggle tags on/off, with creation of new tags. */
export function TagPicker({ open, onOpenChange, value, onChange, title = "Gắn thẻ" }: {
  open: boolean; onOpenChange: (o: boolean) => void; value: string[]; onChange: (tags: string[]) => void; title?: string;
}) {
  const lib = useLibrary(); const [name, setName] = useState("");
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  function add() { const n = name.trim(); if (!n) return; ensureTag(n); const real = lib.tags.find((t) => t.name.toLowerCase() === n.toLowerCase())?.name ?? n; if (!value.includes(real)) onChange([...value, real]); setName(""); }
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-wrap gap-2">
        {lib.tags.map((t) => <TagChip key={t.name} name={t.name} active={value.includes(t.name)} onClick={() => toggle(t.name)} />)}
        {!lib.tags.length && <p className="text-xs text-muted-foreground">Chưa có thẻ nào. Tạo thẻ đầu tiên bên dưới.</p>}
      </div>
      <div className="mt-4 flex gap-2">
        <Input className="h-11" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Tên thẻ mới" />
        <Button className="h-11" onClick={add}><Plus /> Thêm</Button>
      </div>
      <Button variant="glass" className="mt-3 w-full" onClick={() => onOpenChange(false)}>Xong</Button>
    </BottomSheet>
  );
}

/** Combined filter editor: tags, kind, date range, OCR status. */
export function FilterSheet({ open, onOpenChange, value, onChange, kinds, onSaveQuick }: {
  open: boolean; onOpenChange: (o: boolean) => void; value: DocFilter; onChange: (f: DocFilter) => void; kinds: string[]; onSaveQuick: (name: string) => void;
}) {
  const lib = useLibrary(); const [qname, setQname] = useState("");
  const set = (p: Partial<DocFilter>) => onChange({ ...value, ...p });
  const pill = (on: boolean) => `h-9 rounded-full px-3.5 text-xs font-semibold ${on ? "bg-primary text-primary-foreground" : "shortcut-tile"}`;
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Bộ lọc">
      <p className="mb-2 text-xs font-semibold">Thẻ (phải có tất cả)</p>
      <div className="flex flex-wrap gap-2">
        {lib.tags.map((t) => <TagChip key={t.name} name={t.name} active={value.tags.includes(t.name)} onClick={() => set({ tags: value.tags.includes(t.name) ? value.tags.filter((x) => x !== t.name) : [...value.tags, t.name] })} />)}
        {!lib.tags.length && <p className="text-xs text-muted-foreground">Chưa có thẻ.</p>}
      </div>
      <p className="mb-2 mt-4 text-xs font-semibold">Loại tài liệu</p>
      <div className="flex flex-wrap gap-2">
        <button className={pill(!value.kind)} onClick={() => set({ kind: null })}>Tất cả</button>
        {kinds.map((k) => <button key={k} className={pill(value.kind === k)} onClick={() => set({ kind: k })}>{k}</button>)}
      </div>
      <p className="mb-2 mt-4 text-xs font-semibold">Ngày tạo</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[0.6875rem] text-muted-foreground">Từ<Input type="date" className="mt-1 h-11" value={value.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="text-[0.6875rem] text-muted-foreground">Đến<Input type="date" className="mt-1 h-11" value={value.to} onChange={(e) => set({ to: e.target.value })} /></label>
      </div>
      <p className="mb-2 mt-4 text-xs font-semibold">Chữ nhận dạng</p>
      <div className="flex gap-2">
        {([["any", "Tất cả"], ["yes", "Đã nhận chữ"], ["no", "Chưa nhận chữ"]] as const).map(([k, l]) => <button key={k} className={pill(value.ocr === k)} onClick={() => set({ ocr: k })}>{l}</button>)}
      </div>
      <p className="mb-2 mt-5 text-xs font-semibold">Lưu thành Bộ lọc nhanh (hiện ở Trang chủ)</p>
      <div className="flex gap-2">
        <Input className="h-11" value={qname} onChange={(e) => setQname(e.target.value)} placeholder="Ví dụ: Hoá đơn tháng này" />
        <Button className="h-11" disabled={!qname.trim()} onClick={() => { onSaveQuick(qname.trim()); setQname(""); }}>Lưu</Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="glass" onClick={() => onChange({ ...value, tags: [], kind: null, from: "", to: "", ocr: "any" })}>Xoá bộ lọc</Button>
        <Button onClick={() => onOpenChange(false)}>Xem kết quả</Button>
      </div>
    </BottomSheet>
  );
}

export function FolderCrumbs({ folder, onGo }: { folder: string | null; onGo: (f: string | null) => void }) {
  const parts: string[] = []; let p = folder; while (p) { parts.unshift(p); p = parentOf(p); }
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs [scrollbar-width:none]">
      <button onClick={() => onGo(null)} className={`min-w-10 shrink-0 py-3 font-semibold ${folder ? "text-primary" : ""}`}>Tất cả</button>
      {parts.map((f, i) => (
        <span key={f} className="flex shrink-0 items-center gap-1"><ChevronRight className="size-3 text-muted-foreground" />
          <button onClick={() => onGo(f)} className={`font-semibold ${i < parts.length - 1 ? "text-primary" : ""}`}>{baseName(f)}</button>
        </span>
      ))}
    </div>
  );
}

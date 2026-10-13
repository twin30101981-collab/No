import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Lock, Share2, Trash2 } from "lucide-react";
import { memo, useRef, useState } from "react";
import { useThumb } from "@/lib/thumbs";
import { type Doc, docSize, timeAgo } from "@/lib/db";
import { TagChip } from "@/components/library-ui";
import { baseName } from "@/lib/library";

type Props = {
  doc: Doc; selectMode?: boolean; selected?: boolean;
  onLongPress?: () => void; onToggle?: () => void; onDelete?: () => void; onShare?: () => void; grid?: boolean;
};

/** Document row: swipe left for share/delete, long-press to multi-select. */
export const DocRow = memo(function DocRow({ doc, selectMode, selected, onLongPress, onToggle, onDelete, onShare, grid }: Props) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<number>(0);
  const moved = useRef(false);

  const small = useThumb(doc);
  const thumb = doc.locked
    ? <div className="document-thumb grid h-full w-full place-items-center"><Lock className="size-5 text-primary" /></div>
    : doc.pages[0] ? (small ? <img src={small} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="document-thumb h-full w-full animate-pulse" />) : <div className="document-thumb h-full w-full" />;

  const handlers = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { clearTimeout(timer.current); e.dataTransfer.setData("text/doc-id", doc.id); },
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY }; moved.current = false;
      timer.current = window.setTimeout(() => { moved.current = true; navigator.vibrate?.(15); onLongPress?.(); }, 480);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return;
      const x = e.clientX - start.current.x, y = e.clientY - start.current.y;
      if (Math.abs(x) > 8 || Math.abs(y) > 8) { clearTimeout(timer.current); }
      if (!grid && !selectMode && Math.abs(x) > Math.abs(y) && Math.abs(x) > 10) { moved.current = true; setDx(Math.max(-132, Math.min(0, x + (dx < 0 ? -132 : 0)))); }
    },
    onPointerUp: () => { clearTimeout(timer.current); start.current = null; setDx((v) => (v < -60 ? -132 : 0)); },
    onPointerCancel: () => { clearTimeout(timer.current); start.current = null; },
    onClickCapture: (e: React.MouseEvent) => {
      if (moved.current || dx < 0) { e.preventDefault(); e.stopPropagation(); if (dx < 0 && !moved.current) setDx(0); return; }
      if (selectMode) { e.preventDefault(); onToggle?.(); }
    },
  };

  if (grid) {
    return (
      <Link to="/doc/$id" params={{ id: doc.id }} {...handlers} className={`document-row relative block select-none overflow-hidden rounded-[14px] p-2 ${selected ? "ring-2 ring-primary" : ""}`}>
        <div className="aspect-[3/4] overflow-hidden rounded-[8px] bg-muted">{thumb}</div>
        <p className="mt-2 truncate text-xs font-semibold">{doc.name}</p>
        <p className="truncate text-[0.625rem] text-muted-foreground">{doc.pages.length} trang · {timeAgo(doc.updatedAt)}</p>
        {selectMode && <SelectDot on={!!selected} />}
      </Link>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-[16px]">
      <div className="absolute inset-y-0 right-0 flex w-[132px]">
        <button aria-label="Chia sẻ" onClick={() => { setDx(0); onShare?.(); }} className="grid flex-1 place-items-center bg-secondary text-primary"><Share2 className="size-5" /></button>
        <button aria-label="Xóa" onClick={() => { setDx(0); onDelete?.(); }} className="grid flex-1 place-items-center bg-destructive text-destructive-foreground"><Trash2 className="size-5" /></button>
      </div>
      <Link to="/doc/$id" params={{ id: doc.id }} {...handlers} style={{ transform: `translateX(${dx}px)` }}
        className={`document-row relative grid w-full touch-pan-y select-none grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] p-2.5 transition-transform ${selected ? "ring-2 ring-primary" : ""}`}>
        <div className="h-[68px] w-[52px] overflow-hidden rounded-[8px] bg-muted">{thumb}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{doc.name}</p>
          <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{doc.pages.length} trang · {docSize(doc)} · {timeAgo(doc.updatedAt)}</p>
          <div className="mt-1.5 flex min-w-0 gap-1">
            <span className="truncate rounded-md bg-secondary px-1.5 py-0.5 text-[0.625rem] font-bold text-primary">{doc.kind}</span>
            <span className="truncate rounded-md bg-muted px-1.5 py-0.5 text-[0.625rem] text-muted-foreground">{baseName(doc.folder)}</span>
            {doc.tags?.slice(0, 2).map((t) => <TagChip key={t} name={t} />)}
            {(doc.tags?.length ?? 0) > 2 && <span className="shrink-0 text-[0.625rem] text-muted-foreground">+{doc.tags!.length - 2}</span>}
            {doc.pages.some((p) => p.text) && <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[0.625rem] text-muted-foreground">Đã OCR</span>}
          </div>
        </div>
        {selectMode ? <SelectDot on={!!selected} inline /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </Link>
    </div>
  );
});

function SelectDot({ on, inline }: { on: boolean; inline?: boolean }) {
  return <span className={`${inline ? "" : "absolute right-3 top-3"} grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-card"}`}>{on && <Check className="size-3.5" />}</span>;
}

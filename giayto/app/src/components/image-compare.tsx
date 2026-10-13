import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { GripVertical } from "lucide-react";

export function comparePosition(clientX: number, left: number, width: number) {
  if (width <= 0) return 50;
  return Math.min(100, Math.max(0, ((clientX - left) / width) * 100));
}

/** R1.2 – giữ nút “Xem gốc” thì thanh chia dồn hết sang phải (thấy 100% ảnh gốc); thả ra trở về vị trí cũ. */
export function effectivePosition(position: number, holdOriginal: boolean) {
  return holdOriginal ? 100 : position;
}

export function ImageCompare({ before, after, loading = false, holdOriginal = false }: { before: string; after: string; loading?: boolean; holdOriginal?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const [rawPosition, setPosition] = useState(50);
  const position = effectivePosition(rawPosition, holdOriginal);

  function move(clientX: number) {
    const rect = frame.current?.getBoundingClientRect();
    if (rect) setPosition(comparePosition(clientX, rect.left, rect.width));
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event.clientX);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (event.key === "Home") setPosition(0);
    else if (event.key === "End") setPosition(100);
    else setPosition((value) => Math.min(100, Math.max(0, value + (event.key === "ArrowLeft" ? -5 : 5))));
  }

  return (
    <div
      ref={frame}
      className="relative isolate h-48 w-full touch-none overflow-hidden rounded-lg bg-editor select-none"
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); move(event.clientX); }}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
    >
      <img src={after} alt="Ảnh sau khi lọc" className="absolute inset-0 size-full object-contain" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={before} alt="Ảnh gốc trước khi lọc" className="size-full object-contain" draggable={false} />
      </div>
      <span className="absolute left-2 top-2 rounded bg-foreground/75 px-2 py-1 text-[0.625rem] font-bold text-background">Gốc</span>
      <span className="absolute right-2 top-2 rounded bg-foreground/75 px-2 py-1 text-[0.625rem] font-bold text-background">Sau</span>
      <div className="absolute inset-y-0 w-px bg-primary-foreground shadow-sm" style={{ left: `${position}%` }} />
      <div
        role="slider"
        aria-label="So sánh ảnh gốc và ảnh sau khi lọc"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-primary-foreground bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ left: `${position}%` }}
      >
        <GripVertical className="size-5" />
      </div>
      {loading && <div className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-primary" aria-label="Đang cập nhật ảnh xem trước" />}
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { aiDocAsk } from "@/lib/ai.functions";
import type { Doc } from "@/lib/db";
import { confirmDialog } from "@/lib/dialog";
import { type ChatMsg, clearHistory, getQuota, loadHistory, refundQuotaSlot, saveHistory, splitCitations, takeQuotaSlot } from "@/lib/doc-chat";

const SUGGEST = ["Tóm tắt nội dung chính", "Có những số tiền nào?", "Hạn chót / ngày quan trọng là gì?"];

/** Chat hỏi đáp với tài liệu (G3-11). onPage: nhảy tới trang được trích dẫn (0-based). */
export function DocChat({ doc, onPage }: { doc: Doc; onPage?: (i: number) => void }) {
  const ask = useServerFn(aiDocAsk);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState(() => getQuota());
  const end = useRef<HTMLDivElement>(null);
  const hasText = doc.pages.some((p) => p.text?.trim());

  useEffect(() => { setMsgs(loadHistory(doc.id)); setQuota(getQuota()); }, [doc.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, busy]);

  const push = (m: ChatMsg) => setMsgs((list) => saveHistory(doc.id, [...list, m]));

  async function send(text = q) {
    const question = text.trim();
    if (!question || busy) return;
    if (!hasText) { toast("Tài liệu chưa có chữ. Hãy nhận chữ (OCR/AI) trước."); return; }
    const slot = takeQuotaSlot();
    if (!slot) { toast.error(`Đã hết ${quota.limit} lượt hỏi hôm nay. Mai hỏi tiếp nhé.`); return; }
    setQuota(slot); setQ(""); setBusy(true);
    push({ role: "user", text: question, at: Date.now() });
    try {
      const r = await ask({ data: { question, pages: doc.pages.map((p) => (p.text ?? "").slice(0, 50_000)).slice(0, 60) } });
      if (r.ok) push({ role: "ai", text: r.answer, pages: r.pages, at: Date.now() });
      else { refundQuotaSlot(); setQuota(getQuota()); push({ role: "ai", text: r.message, at: Date.now(), error: true }); }
    } catch {
      refundQuotaSlot(); setQuota(getQuota());
      push({ role: "ai", text: "Không kết nối được AI. Kiểm tra mạng rồi hỏi lại.", at: Date.now(), error: true });
    } finally { setBusy(false); }
  }

  async function clear() {
    if (!(await confirmDialog("Xoá lịch sử hỏi đáp?", { message: "Chỉ xoá trên máy này.", okText: "Xoá" }))) return;
    clearHistory(doc.id); setMsgs([]);
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-[0.6875rem] text-muted-foreground">
        <span>Còn {quota.left}/{quota.limit} lượt hỏi hôm nay</span>
        {msgs.length > 0 && <button onClick={() => void clear()} className="flex items-center gap-1 font-semibold"><Trash2 className="size-3.5" /> Xoá lịch sử</button>}
      </div>
      {!hasText && <p className="rounded-[10px] bg-muted p-3 text-xs text-muted-foreground">Tài liệu chưa có chữ. Mở “Nhận diện chữ” để đọc chữ các trang, rồi quay lại hỏi.</p>}
      <div className="max-h-[42vh] space-y-2 overflow-y-auto" aria-live="polite">
        {msgs.length === 0 && hasText && (
          <div className="space-y-1.5 py-2">
            <p className="text-center text-xs text-muted-foreground">Hỏi bất cứ điều gì về tài liệu này. AI chỉ trả lời từ nội dung tài liệu và ghi rõ trang.</p>
            <div className="flex flex-wrap justify-center gap-1.5">{SUGGEST.map((s) => <button key={s} onClick={() => void send(s)} className="rounded-full border border-border px-2.5 py-1 text-[0.6875rem] font-semibold text-primary">{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[88%] rounded-[12px] px-3 py-2 text-sm leading-6 ${m.role === "user" ? "bg-primary text-primary-foreground" : m.error ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
              <p className="whitespace-pre-wrap">
                {m.role === "ai" && !m.error ? splitCitations(m.text).map((part, k) => part.t === "text" ? <span key={k}>{part.v}</span> : (
                  <button key={k} onClick={() => part.v >= 1 && part.v <= doc.pages.length && onPage?.(part.v - 1)} className="mx-0.5 rounded-full bg-card px-1.5 text-[0.6875rem] font-semibold text-primary">Trang {part.v}</button>
                )) : m.text}
              </p>
              {m.role === "ai" && !m.error && (
                <button aria-label="Sao chép câu trả lời" onClick={() => { void navigator.clipboard.writeText(m.text); toast("Đã sao chép"); }} className="mt-1 flex items-center gap-1 text-[0.6875rem] text-muted-foreground"><Copy className="size-3" /> Sao chép</button>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> AI đang đọc tài liệu…</div>}
        <div ref={end} />
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <textarea value={q} onChange={(e) => setQ(e.target.value)} maxLength={1000} rows={2} placeholder="Nhập câu hỏi…" disabled={!hasText || quota.left <= 0}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          className="min-w-0 flex-1 resize-none rounded-[10px] border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <Button type="submit" size="icon" aria-label="Gửi câu hỏi" disabled={busy || !q.trim() || !hasText || quota.left <= 0}>{busy ? <Loader2 className="animate-spin" /> : <Send />}</Button>
      </form>
    </div>
  );
}

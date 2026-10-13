import { useQueuedServerFn } from "@/lib/ai-queue";
import { rowsToXlsx } from "@/lib/xlsx";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, CircleHelp, Copy, Eye, FileSpreadsheet, Loader2, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiExtract, aiText } from "@/lib/ai.functions";
import { type Doc, docText, saveDoc } from "@/lib/db";
import { confirmDialog } from "@/lib/dialog";
import { download, safeName } from "@/lib/files";
import { compress, enhanceForOcr } from "@/lib/image";
import { checkExtraction, type CheckResult } from "@/lib/extract-check";
import { DocChat } from "@/components/doc-chat";
import { TranslateOverlayPanel } from "@/components/translate-overlay-panel";
import { VN_TEMPLATES } from "@/lib/vn-templates";
import { classifyAiFailure, isAutoRetryable, MAX_AUTO_RETRY, SCAN_ERRORS, type ScanErrorCode } from "@/lib/scan-errors";
import { Link } from "@tanstack/react-router";
import { createFolder, ensureTag, getLibrary } from "@/lib/library";
import { checkQuality } from "@/lib/quality";
import { logScan, newScanSession } from "@/lib/scan-log";

export type AiTab = "extract" | "handwrite" | "summarize" | "translate" | "solve" | "ask";
const TABS: [AiTab, string][] = [["extract", "Trích xuất"], ["handwrite", "Viết tay"], ["summarize", "Tóm tắt"], ["translate", "Dịch"], ["solve", "Giải bài"], ["ask", "Hỏi đáp"]];
const LANGS = ["tiếng Anh", "tiếng Việt", "tiếng Trung", "tiếng Nhật", "tiếng Hàn", "tiếng Pháp"];
const DEFAULT_NAME = /^\S.* \d{2}-\d{2} \d{2}:\d{2}$/;

/** Ảnh gửi cho AI được thu nhỏ để nhanh và tiết kiệm (tối đa 4 trang). */
const prepImages = (doc: Doc, pages: number[]) => Promise.all(pages.slice(0, 4).map((i) => compress(doc.pages[i].src, 1400, 0.75)));

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
const RETAKE_TIPS = ["Đưa điện thoại gần hơn", "Giữ điện thoại thẳng, song song với giấy", "Tránh đèn phản chiếu lên giấy", "Đưa toàn bộ biên bản vào khung", "Giữ điện thoại ổn định khi chụp"];

export function AiPanel({ doc, active, initial = "extract", autoRun = false }: { doc: Doc; active: number; initial?: AiTab; autoRun?: boolean }) {
  const ran = useRef(false);
  const [tab, setTab] = useState<AiTab>(initial);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState("");
  const [quality, setQuality] = useState<string[]>([]);
  const [sel, setSel] = useState<number[]>([active]);
  const [failure, setFailure] = useState<{ code: ScanErrorCode; retake: boolean; diag: string[] } | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [stage, setStage] = useState("");
  const [preview, setPreview] = useState(false);
  const [res, setRes] = useState<{ title: string; type: string; points: string[]; conf: number } | null>(null);
  const [lang, setLang] = useState(LANGS[0]);
  const [tpl, setTpl] = useState<"" | "vat" | "xe" | "sodo">("");
  const [out, setOut] = useState<Partial<Record<AiTab, string>>>({});
  const extractFn = useQueuedServerFn(aiExtract, "Trích xuất AI");
  const textFn = useQueuedServerFn(aiText, "Xử lý chữ AI");
  const pages = sel.length ? [...sel].sort((a, b) => a - b) : [active];
  const toggle = (i: number) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length >= 4 ? (toast("Chọn tối đa 4 trang"), s) : [...s, i]));
  const fields = Object.entries(doc.fields ?? {});

  function fail(r: { code: number; message: string }) {
    toast.error(r.message);
    if (r.code === 402 || r.code === 403) setBlocked(r.message); // không tự gửi lại
  }

  /** Image Quality Gate: trả về false nếu người dùng chọn chụp lại. */
  async function gate(session: string): Promise<boolean> {
    setQuality([]);
    const reports = await Promise.all(pages.map(async (i) => ({ i, r: await checkQuality(doc.pages[i].src).catch(() => null) })));
    const bad = reports.filter((x) => x.r && x.r.level !== "ok");
    bad.forEach((x) => logScan({ scanSessionId: session, code: x.r!.issues[0].code, message: `Trang ${x.i + 1}: ${x.r!.level}`, imageResolution: `${x.r!.metrics.width}x${x.r!.metrics.height}`, imageQualityScore: x.r!.score, blurScore: x.r!.metrics.blur, skewAngle: x.r!.metrics.skew, glareScore: x.r!.metrics.glare, meta: x.r!.metrics }));
    setQuality(bad.flatMap((x) => x.r!.issues.map((s) => `Trang ${x.i + 1}: ${s.message}`)));
    const rejected = bad.filter((x) => x.r!.level === "reject");
    if (!rejected.length) return true;
    return confirmDialog("Ảnh chưa đạt chất lượng", {
      message: rejected.flatMap((x) => x.r!.issues.filter((s) => s.level === "reject").map((s) => `Trang ${x.i + 1}: ${s.message}`)).join("\n") + "\n\nNên chụp lại để AI đọc chính xác hơn.",
      okText: "Vẫn gửi AI",
    });
  }

  async function extract() {
    if (/cccd|căn cước|hộ chiếu|cmnd/i.test(`${doc.kind} ${doc.name} ${docText(doc)}`) &&
      !(await confirmDialog("Gửi giấy tờ tuỳ thân cho AI?", { message: "Ảnh có thể chứa thông tin cá nhân (CCCD/hộ chiếu). Ảnh chỉ được dùng để đọc thông tin, không lưu lại trên máy chủ.", okText: "Gửi" }))) return;
    setBusy(true); setFailure(null); setCheck(null);
    const session = newScanSession();
    const q0 = await checkQuality(doc.pages[pages[0]].src).catch(() => null);
    const base = { scanSessionId: session, imageResolution: q0 ? `${q0.metrics.width}x${q0.metrics.height}` : undefined, imageQualityScore: q0?.score, blurScore: q0?.metrics.blur, skewAngle: q0?.metrics.skew, glareScore: q0?.metrics.glare };
    try {
      if (!(await gate(session))) { setFailure({ code: "SCAN_IMAGE_TOO_BLURRY", retake: true, diag: quality }); return; }
      // Lần 1: ảnh chuẩn. Lần 2 (tự động, tối đa MAX_AUTO_RETRY): ảnh tăng cường cho OCR.
      type R = Awaited<ReturnType<typeof extractFn>>;
      let r: R | null = null; let lastCode: ScanErrorCode = "AI_EXTRACTION_FAILED"; let checked: CheckResult | null = null;
      for (let attempt = 1; attempt <= 1 + MAX_AUTO_RETRY; attempt++) {
        const t0 = Date.now();
        try {
          setStage(attempt === 1 ? "AI đang đọc…" : "Đang làm rõ ảnh và đọc lại…");
          const images = attempt === 1 ? await prepImages(doc, pages) : await Promise.all(pages.slice(0, 4).map((i) => enhanceForOcr(doc.pages[i].src)));
          r = await withTimeout(extractFn({ data: { images, ...(tpl ? { template: tpl } : {}) } }), 90_000);
        } catch (e) {
          r = { ok: false, code: 0, message: String((e as Error)?.message ?? "") };
          console.error(e);
        }
        if (r.ok) {
          checked = checkExtraction(r.data);
          if (checked.valid && !checked.empty) { logScan({ ...base, code: "AI_OK", message: checked.verdict, attempt, retryCount: attempt - 1, aiStatus: "ok", ms: Date.now() - t0 }); break; }
          lastCode = checked.valid ? "AI_EMPTY_RESULT" : "AI_INVALID_RESPONSE";
        } else lastCode = classifyAiFailure(r.code, r.message);
        logScan({ ...base, code: lastCode, message: r.ok ? lastCode : r.message, attempt, retryCount: attempt - 1, aiStatus: "fail", ms: Date.now() - t0 });
        if (!r.ok && (r.code === 402 || r.code === 403)) setBlocked(r.message); // không tự gửi lại
        if (attempt <= MAX_AUTO_RETRY && isAutoRetryable(lastCode)) { toast("AI đọc chưa được, đang làm rõ ảnh và thử lại…"); continue; }
        r = null; break;
      }
      if (!r || !r.ok || !checked) { setFailure({ code: lastCode, retake: isAutoRetryable(lastCode), diag: quality }); return; }
      const x = r.data;
      setCheck(checked);
      const next: Doc = { ...doc, kind: x.type, fields: Object.fromEntries(x.fields.filter((f) => f.value.trim()).map((f) => [f.label, f.value])), tags: [...new Set([...(doc.tags ?? []), ...x.tags])] };
      x.tags.forEach(ensureTag);
      if (DEFAULT_NAME.test(doc.name) && x.title) next.name = x.title;
      if ((doc.folder === "Chung" || !doc.folder) && x.type !== "Khác") {
        if (!getLibrary().folders.includes(x.type.replace(/\//g, "-"))) createFolder(x.type.replace(/\//g, "-"));
        next.folder = x.type.replace(/\//g, "-");
      }
      await saveDoc(next);
      setOut((o) => ({ ...o, extract: x.summary }));
      setRes({ title: x.title, type: x.type, points: x.keyPoints ?? [], conf: x.confidence ?? 0 });
      if (checked.verdict === "review") toast.warning("Một số thông tin chưa được nhận diện chính xác. Vui lòng kiểm tra lại.");
      else toast.success(`Nhận dạng: ${x.type}`, { description: next.name !== doc.name ? `Đã đặt tên "${next.name}"` : undefined });
    } catch (e) {
      console.error(e); logScan({ ...base, code: "AI_EXTRACTION_FAILED", message: String((e as Error)?.message ?? e), aiStatus: "crash" });
      setFailure({ code: "AI_EXTRACTION_FAILED", retake: true, diag: quality });
    } finally { setBusy(false); setStage(""); }
  }

  // Tự trích xuất khi vừa quét xong (nút "Trích xuất" ở màn Quét) — chỉ chạy một lần.
  useEffect(() => {
    if (autoRun && !ran.current) { ran.current = true; void extract(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  async function textTask(task: Exclude<AiTab, "extract">) {
    setBusy(true);
    try {
      const text = pages.map((i) => doc.pages[i].text ?? "").join("\n").trim();
      const r = await textFn({ data: { task, lang, ...(text && task !== "handwrite" ? { text } : { images: await prepImages(doc, pages) }) } });
      if (!r.ok) return fail(r);
      setOut((o) => ({ ...o, [task]: r.text }));
    } catch (e) { toast.error("Không gửi được yêu cầu. Kiểm tra mạng rồi thử lại."); console.error(e); } finally { setBusy(false); }
  }

  const setField = (k: string, v: string | null, nk = k) => {
    const entries = Object.entries(doc.fields ?? {});
    const next = entries.some(([a]) => a === k) ? entries.flatMap(([a, b]) => (a === k ? (v === null ? [] : [[nk, v]]) : [[a, b]])) : [...entries, [nk, v ?? ""]];
    void saveDoc({ ...doc, fields: Object.fromEntries(next) }, false);
  };
  const exportCsv = () => {
    download(rowsToXlsx([["Trường", "Giá trị"], ...fields.map(([k, v]) => [k, v])], "Thong tin", false), `${safeName(doc.name)}-thong-tin.xlsx`);
  };

  const result = out[tab];
  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6 rounded-[12px] bg-muted p-1">
        {TABS.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`rounded-[9px] py-1.5 text-xs font-semibold ${tab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{l}</button>)}
      </div>
      {tab === "ask" && <DocChat doc={doc} />}
      {tab !== "ask" && doc.pages.length > 1 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[0.6875rem] font-semibold text-muted-foreground">Chọn trang gửi cho AI ({pages.length}/4)</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {doc.pages.map((p, i) => (
              <button key={i} onClick={() => toggle(i)} aria-pressed={sel.includes(i)} className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-[8px] border-2 ${sel.includes(i) ? "border-primary" : "border-transparent opacity-60"}`}>
                <img src={p.thumb ?? p.src} alt={`Trang ${i + 1}`} className="size-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[0.625rem] font-semibold">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === "extract" && (
        <div className="mt-3" role="radiogroup" aria-label="Mẫu giấy tờ">
          <p className="mb-1 text-[0.6875rem] font-semibold text-muted-foreground">Mẫu giấy tờ</p>
          <div className="flex flex-wrap gap-1.5">{[["", "Tự nhận"] as const, ...VN_TEMPLATES.map((t) => [t.id, t.label] as const)].map(([id, label]) => <button key={id} role="radio" aria-checked={tpl === id} onClick={() => setTpl(id as typeof tpl)} className={`rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold ${tpl === id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{label}</button>)}</div>
        </div>
      )}
      {tab === "translate" && (
        <div className="mt-3 flex flex-wrap gap-1.5">{LANGS.map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold ${lang === l ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{l}</button>)}</div>
      )}
      {tab === "translate" && <TranslateOverlayPanel doc={doc} page={pages[0]} lang={lang} />}
      {quality.length > 0 && <ul className="mt-3 list-disc space-y-0.5 rounded-[10px] bg-muted p-3 pl-6 text-xs text-muted-foreground">{quality.map((q, i) => <li key={i}>{q}</li>)}</ul>}
      {blocked && <p className="mt-3 rounded-[10px] bg-destructive/10 p-3 text-xs text-destructive">{blocked}</p>}
      {tab !== "ask" && <Button className="mt-3 w-full" disabled={busy || !!blocked} onClick={() => (tab === "extract" ? extract() : textTask(tab))}>
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? stage || "AI đang đọc…" : TABS.find(([t]) => t === tab)![1] + " bằng AI"}
      </Button>}

      {tab === "extract" && failure && !busy && (
        <div role="alert" className="mt-3 rounded-[12px] border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-destructive"><AlertTriangle className="size-4" /> Chưa thể trích xuất</p>
          <p className="mt-1 text-xs">{SCAN_ERRORS[failure.code].message} {SCAN_ERRORS[failure.code].hint}</p>
          <p className="mt-2 text-[0.6875rem] font-semibold text-muted-foreground">Nguyên nhân có thể:</p>
          <ul className="list-disc pl-5 text-xs text-muted-foreground">{(failure.diag.length ? failure.diag : ["Ảnh bị mờ", "Biên bản bị nghiêng", "Có vùng chói", "Ánh sáng không đủ", "Chữ quá nhỏ"]).map((t, i) => <li key={i}>{t}</li>)}</ul>
          {failure.retake && <><p className="mt-2 text-[0.6875rem] font-semibold text-muted-foreground">Khi chụp lại:</p><ul className="list-disc pl-5 text-xs text-muted-foreground">{RETAKE_TIPS.map((t) => <li key={t}>{t}</li>)}</ul></>}
          <p className="mt-2 text-[0.625rem] text-muted-foreground">Mã lỗi: {failure.code}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" asChild><Link to="/scan" search={{ doc: doc.id }}><Camera /> Chụp lại</Link></Button>
            <Button size="sm" variant="glass" disabled={!!blocked} onClick={() => void extract()}><RotateCcw /> Thử lại</Button>
            <Button size="sm" variant="ghost" className="col-span-2" onClick={() => setPreview((v) => !v)}><Eye /> {preview ? "Ẩn ảnh" : "Xem ảnh đã chụp"}</Button>
          </div>
        </div>
      )}
      {tab === "extract" && (preview || (check && res)) && (
        <div className="mt-3">
          {check && res && <Button size="sm" variant="ghost" className="w-full" onClick={() => setPreview((v) => !v)}><Eye /> {preview ? "Ẩn ảnh gốc" : "Xem ảnh gốc để đối chiếu"}</Button>}
          {preview && <div className="mt-2 flex gap-2 overflow-x-auto">{pages.map((i) => <img key={i} src={doc.pages[i].orig || doc.pages[i].src} alt={`Ảnh gốc trang ${i + 1}`} className="max-h-[45vh] rounded-[10px] border object-contain" />)}</div>}
        </div>
      )}
      {tab === "extract" && check && res && check.checks.length > 0 && (
        <div className="mt-3 rounded-[12px] bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">{check.verdict === "accept" ? "Kết quả đã qua kiểm tra" : "⚠️ Một số thông tin chưa được nhận diện chính xác. Vui lòng kiểm tra lại."}</p>
          <ul className="space-y-0.5">{check.checks.map((c, i) => <li key={i} className="flex items-center gap-1.5">{c.ok ? <Check className="size-3.5 text-primary" /> : <CircleHelp className="size-3.5 text-destructive" />}<span className="font-semibold">{c.label}</span><span className="truncate text-muted-foreground">{c.value || "chưa có — hãy bổ sung bên dưới"}</span></li>)}</ul>
          {check.notes?.map((n) => <p key={n} className="mt-1 font-semibold text-destructive">{n}</p>)}
          {check.missing.length > 0 && <Button size="sm" variant="glass" className="mt-2 w-full" onClick={() => check.missing.forEach((m) => !fields.some(([k]) => k === m) && setField(m, ""))}><Plus /> Thêm trường còn thiếu để sửa</Button>}
        </div>
      )}
      {tab === "extract" && (
        <div className="mt-4 space-y-2">
          {res && (
            <div className="document-row space-y-2 rounded-[12px] p-3">
              <div className="flex flex-wrap items-center gap-1.5 text-[0.6875rem] font-semibold">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-primary">{res.type}</span>
                <span className="text-muted-foreground">Độ chắc chắn {Math.round(res.conf * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 text-sm font-semibold">{res.title}</p>
                {res.title && doc.name !== res.title && <Button size="sm" variant="glass" onClick={() => void saveDoc({ ...doc, name: res.title }).then(() => toast.success("Đã đổi tên"))}>Dùng tên này</Button>}
              </div>
              {result && <p className="text-xs text-muted-foreground">{result}</p>}
              {res.points.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-xs">{res.points.map((t, i) => <li key={i}>{t}</li>)}</ul>}
              <Button size="sm" variant="ghost" className="w-full" onClick={() => { void navigator.clipboard.writeText([res.title, result, ...res.points.map((t) => "- " + t)].filter(Boolean).join("\n")); toast("Đã sao chép nội dung chính"); }}><Copy /> Chép nội dung chính</Button>
            </div>
          )}
          {fields.map(([k, v]) => (
            <div key={k} className="document-row rounded-[12px] p-2.5">
              <div className="flex items-center gap-1">
                <input defaultValue={k} onBlur={(e) => e.target.value.trim() && e.target.value !== k && setField(k, v, e.target.value.trim())} className="min-w-0 flex-1 bg-transparent text-[0.6875rem] font-semibold text-muted-foreground outline-none" />
                <button aria-label="Sao chép" onClick={() => { void navigator.clipboard.writeText(v); toast("Đã sao chép " + k); }} className="p-1 text-primary"><Copy className="size-3.5" /></button>
                <button aria-label="Xoá trường" onClick={() => setField(k, null)} className="p-1 text-muted-foreground"><Trash2 className="size-3.5" /></button>
              </div>
              <Input defaultValue={v} onBlur={(e) => e.target.value !== v && setField(k, e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
          ))}
          {fields.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button variant="glass" size="sm" onClick={() => setField(`Trường ${fields.length + 1}`, "")}><Plus /> Thêm</Button>
              <Button variant="glass" size="sm" onClick={() => { void navigator.clipboard.writeText(fields.map(([k, v]) => `${k}: ${v}`).join("\n")); toast("Đã sao chép tất cả"); }}><Check /> Chép hết</Button>
              <Button variant="glass" size="sm" onClick={exportCsv}><FileSpreadsheet /> Excel</Button>
            </div>
          )}
          {!fields.length && !busy && <p className="py-4 text-center text-xs text-muted-foreground">AI sẽ nhận dạng loại giấy tờ, lấy các thông tin quan trọng, tự đặt tên và gợi ý thẻ, thư mục.</p>}
        </div>
      )}
      {tab !== "extract" && tab !== "ask" && result && (
        <>
          <pre className="mt-4 max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-[12px] bg-muted p-3 font-sans text-sm leading-6">{result}</pre>
          <Button variant="glass" size="sm" className="mt-2 w-full" onClick={() => { void navigator.clipboard.writeText(result); toast("Đã sao chép"); }}><Copy /> Sao chép</Button>
          {tab === "handwrite" && pages.length === 1 && <Button variant="glass" size="sm" className="mt-2 w-full" onClick={() => void saveDoc({ ...doc, pages: doc.pages.map((p, i) => (i === pages[0] ? { ...p, text: result.replace(/⟦\?⟧/g, "") } : p)) }).then(() => toast.success("Đã lưu làm chữ của trang"))}><Check /> Lưu làm chữ của trang</Button>}
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2, ScanSearch } from "lucide-react";
import { downloadBaseline, readBaseline, readPerf, slowWarnings, slowWarningText } from "@/lib/perf-stats";
import { Button } from "@/components/ui/button";
import { useQueuedServerFn } from "@/lib/ai-queue";
import { aiScanDiagnose } from "@/lib/ai.functions";
import { confirmDialog } from "@/lib/dialog";
import { DIAG_LABEL, diagFallback, guardImage, imageVersion, matchesVersion, type Diagnosis } from "@/lib/scan-diagnose";

const imgSize = (src: string) => new Promise<{ width: number; height: number }>((ok) => {
  const i = new Image(); i.onload = () => ok({ width: i.naturalWidth, height: i.naturalHeight }); i.onerror = () => ok({ width: 0, height: 0 }); i.src = src;
});
import { srcBytes, srcToDataUrl } from "@/lib/page-src";
const dataBytes = (src: string) => Math.max(0, srcBytes(src));

/** S12b – chẩn đoán AI cho trang hiện tại: chỉ chạy khi bấm, hỏi xác nhận, kết quả gắn phiên bản ảnh. */
export function ScanDiagnosePanel({ pageId, filter, src }: { pageId: string; filter: string; src: string }) {
  const fn = useQueuedServerFn(aiScanDiagnose, "Chẩn đoán ảnh quét");
  const version = useMemo(() => imageVersion(pageId, filter, src), [pageId, filter, src]);
  const [res, setRes] = useState<Diagnosis | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { setMsg(""); }, [version]);
  const shown = matchesVersion(res, version) ? res : null;

  const run = async () => {
    setMsg("");
    const online = typeof navigator === "undefined" || navigator.onLine;
    // S15f3: trang có thể là blob: URL → đổi sang data URL trước khi đo dung lượng và gửi AI.
    const data = await srcToDataUrl(src).catch(() => "");
    if (!data) { setMsg("Không đọc được ảnh trang."); return; }
    const g = guardImage({ ...(await imgSize(data)), bytes: dataBytes(data), online });
    if (!g.ok) { setMsg(online ? g.reason : diagFallback("offline")); return; }
    if (!(await confirmDialog("Gửi ảnh trang này cho AI?", { message: "Ảnh được gửi đi để tìm bóng tối, rác mép, chữ bị cắt và dòng nghiêng. Nội dung không được lưu trong nhật ký.", okText: "Gửi" }))) return;
    setBusy(true);
    try {
      const r = await fn({ data: { image: data, version } });
      if (r.ok) setRes(r.data); else setMsg(r.code === 402 || r.code === 429 ? diagFallback(r.code) : r.message);
    } catch { setMsg(diagFallback(navigator.onLine ? 500 : "offline")); } finally { setBusy(false); }
  };

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Chẩn đoán AI</h3>
        <Button size="sm" variant="glass" disabled={busy} onClick={run}>{busy ? <Loader2 className="animate-spin" /> : <ScanSearch />} {shown ? "Chẩn đoán lại" : "Chẩn đoán"}</Button>
      </div>
      <Button size="sm" variant="outline" onClick={() => downloadBaseline()}><Download /> Xuất số đo</Button>
      <SlowPerfNotice />
      {msg && <p className="text-xs text-muted-foreground" role="status">{msg}</p>}
      {res && !shown && <p className="text-xs text-muted-foreground">Ảnh đã đổi – kết quả cũ không còn áp dụng.</p>}
      {shown && (
        <>
          <div className="relative overflow-hidden rounded-lg border">
            <img src={src} alt="Trang đang chẩn đoán" className="block w-full" />
            {shown.issues.flatMap((it, a) => it.regions.map((q, b) => (
              <div key={`${a}-${b}`} aria-label={DIAG_LABEL[it.group]} className="absolute rounded-sm border-2 border-destructive bg-destructive/10"
                style={{ left: `${q.x * 100}%`, top: `${q.y * 100}%`, width: `${q.w * 100}%`, height: `${q.h * 100}%` }} />
            )))}
          </div>
          {shown.issues.length === 0 ? <p className="text-sm">Không thấy lỗi đáng kể.</p> : (
            <ul className="space-y-1.5 text-sm">
              {shown.issues.map((it) => (
                <li key={it.group}><span className="font-medium">{DIAG_LABEL[it.group]}</span> · nặng {Math.round(it.severity * 100)}% · tin cậy {Math.round(it.confidence * 100)}%{it.note && <span className="block text-xs text-muted-foreground">{it.note}</span>}</li>
              ))}
            </ul>
          )}
          {shown.summary && <p className="text-xs text-muted-foreground">{shown.summary}</p>}
        </>
      )}
    </section>
  );
}

/** B16: so số đo hiện tại với mốc đã lưu; cảnh báo khi một mốc chậm hơn 20%. */
function SlowPerfNotice() {
  const warnings = useMemo(() => {
    const base = readBaseline();
    return base ? slowWarnings(readPerf(), base) : [];
  }, []);
  if (!warnings.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
      <p className="flex items-center gap-1 font-medium"><AlertTriangle className="size-3.5" /> Máy đang chậm hơn mốc đo trước</p>
      <ul className="mt-1 list-inside list-disc text-muted-foreground">
        {warnings.map((w) => <li key={w.kind}>{slowWarningText(w)}</li>)}
      </ul>
    </div>
  );
}

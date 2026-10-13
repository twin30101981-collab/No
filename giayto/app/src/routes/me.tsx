import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CloudUpload, Database, Download, Eraser, KeyRound, Lock, Moon, Smartphone, Trash2, Type, BookOpen, Upload, UserRound } from "lucide-react";
import { signOut, useUser } from "@/lib/auth";
import { syncAll } from "@/lib/cloud-sync";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Switch } from "@/components/ui/switch";
import { replaceAll, saveDocs, useDocs } from "@/lib/db";
import { BackupError, buildBackup, mergeLibrary, parseBackup, planMerge } from "@/lib/backup";
import { breakdown, cleanTemp, fmtBytes, level, type Level } from "@/lib/storage";
import { getLibrary, setLibrary } from "@/lib/library";
import { download } from "@/lib/files";
import { pickFiles } from "@/lib/importer";
import { getPinSalt, getSettings, hashPin, lockNow, setSettings, useSettings } from "@/lib/settings";
import { newSalt } from "@/lib/vault";
import { promptDialog } from "@/lib/dialog";
import { choiceDialog, confirmDialog, pinDialog } from "@/lib/dialog";
import { showError } from "@/lib/errors";
import { useInstall } from "@/lib/install";
import { offlineOcrReady, prepareOfflineOcr } from "@/lib/offline";
import { historyForBackup, restoreHistory } from "@/lib/history";
import { clearScanLog, readScanLog } from "@/lib/scan-log";
import { compareBench } from "@/lib/crop-bench";
import { NamingRules } from "@/components/naming-rules";
import { buildReport, clearPerf, downloadBaseline, readPerf, type PerfReport } from "@/lib/perf-stats";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [
    { title: "Cài đặt — Ghi Nhanh" },
    { name: "description", content: "Chất lượng ảnh, khổ giấy, ngôn ngữ nhận chữ, mã PIN và sao lưu tài liệu." },
    { property: "og:title", content: "Cài đặt — Ghi Nhanh" },
    { property: "og:description", content: "Chất lượng ảnh, khổ giấy, ngôn ngữ nhận chữ, mã PIN và sao lưu tài liệu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Me,
});

function Me() {
  const s = useSettings();
  const { user } = useUser();
  const [sync, setSync] = useState("");
  const { docs, all, trash } = useDocs();
  const [usage, setUsage] = useState("");
  const [lvl, setLvl] = useState<Level>("ok");
  const parts = breakdown(all);
  const inst = useInstall();
  const [ocrReady, setOcrReady] = useState(false); const [ocrBusy, setOcrBusy] = useState(false);
  useEffect(() => setOcrReady(offlineOcrReady(s.ocrLang)), [s.ocrLang]);
  const [logCount, setLogCount] = useState(0);
  const [bench, setBench] = useState("");
  const [perf, setPerf] = useState<PerfReport | null>(null);
  const [perfCount, setPerfCount] = useState(0);
  useEffect(() => { const sp = readPerf(); setPerf(buildReport(sp, readScanLog())); setPerfCount(sp.length); }, []);
  useEffect(() => setLogCount(readScanLog().length), []);
  useEffect(() => { navigator.storage?.estimate?.().then((e) => { setUsage(`${fmtBytes(e.usage ?? 0)} / ${fmtBytes(e.quota ?? 0)}`); setLvl(level(e.usage ?? 0, e.quota ?? 0)); }); }, [all]);
  async function cleanUp() {
    const fixed = cleanTemp(all);
    if (typeof caches !== "undefined") for (const k of await caches.keys().catch(() => [])) if (k.startsWith("gn-tmp")) await caches.delete(k);
    if (!fixed.length) { toast("Không có ảnh tạm để dọn"); return; }
    await saveDocs(fixed); toast.success(`Đã dọn ${fmtBytes(parts.temp)} ảnh tạm`);
  }

  async function setPin() {
    if (s.pin) {
      const cur = await pinDialog("Tắt mã PIN", "Nhập mã PIN hiện tại. Tài liệu đã khoá sẽ mở tự do."); if (!cur) return;
      if ((await hashPin(cur)) !== s.pin) { toast.error("Sai mã PIN", { description: "Thử lại với mã bạn đã đặt." }); return; }
      const { unlockVault, rekeyVault } = await import("@/lib/db");
      if (!(await unlockVault(cur, getPinSalt()))) { toast.error("Không giải mã được tài liệu đã khoá"); return; }
      await rekeyVault(null); setSettings({ pin: "" }); toast("Đã tắt mã PIN"); return;
    }
    const pin = await pinDialog("Đặt mã PIN", "Nhập 4–6 chữ số."); if (!pin) return;
    const again = await pinDialog("Nhập lại mã PIN", "Để chắc chắn bạn nhớ đúng."); if (again === null) return;
    if (again !== pin) { toast.error("Hai lần nhập không khớp", { description: "Hãy đặt lại mã PIN." }); return; }
    const salt = newSalt(); setSettings({ pin: await hashPin(pin), pinSalt: salt });
    await (await import("@/lib/db")).rekeyVault({ pin, salt }); toast.success("Đã bật mã PIN. Khóa tài liệu trong menu của tài liệu.");
  }
  async function makeRecovery() {
    const { createRecovery, unlockVault } = await import("@/lib/db");
    const { getVaultKey } = await import("@/lib/vault");
    if (!getVaultKey()) {
      const cur = await pinDialog("Nhập mã PIN", "Để tạo mã khôi phục."); if (!cur) return;
      if ((await hashPin(cur)) !== s.pin || !(await unlockVault(cur, getPinSalt()))) { toast.error("Sai mã PIN"); return; }
    }
    const code = await createRecovery();
    await navigator.clipboard?.writeText(code).catch(() => {});
    await confirmDialog("Mã khôi phục của bạn", { message: `${code}\n\nGhi lại và cất ở nơi an toàn (đã chép vào bộ nhớ tạm). Mã chỉ hiện một lần; tạo mã mới thì mã cũ hết hiệu lực. Mất cả PIN lẫn mã này thì không mở lại được tài liệu đã khoá.`, okText: "Tôi đã ghi lại" });
  }
  async function forgotPin() {
    const code = await promptDialog("Quên mã PIN", { message: "Nhập mã khôi phục (24 ký tự).", placeholder: "XXXX-XXXX-…", okText: "Tiếp tục" }); if (!code) return;
    const pin = await pinDialog("Đặt mã PIN mới", "Nhập 4–6 chữ số."); if (!pin) return;
    const { recoverVault } = await import("@/lib/db");
    if (await recoverVault(code, pin)) toast.success("Đã đặt PIN mới, tài liệu đã khoá vẫn nguyên vẹn");
    else toast.error("Mã khôi phục không đúng", { description: "Kiểm tra lại từng ký tự rồi thử lại." });
  }
  async function backup() {
    const id = toast.loading("Đang tạo tệp sao lưu…");
    try {
      const blob = await buildBackup({ docs: all, vault: getSettings().vaultWrap, library: getLibrary(), conversions: await historyForBackup() });
      download(blob, `ghi-nhanh-sao-luu-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success(`Đã sao lưu ${all.length} tài liệu (${fmtBytes(blob.size)})`, { id });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof BackupError ? e.message : "Không sao lưu được", { id, description: "Chưa tải tệp nào về. Thử lại; nếu vẫn lỗi hãy tải lại trang rồi sao lưu." });
    }
  }
  async function restore() {
    const [f] = await pickFiles("application/json,.json", false); if (!f) return;
    const id = toast.loading("Đang kiểm tra tệp sao lưu…");
    try {
      const r = await parseBackup(await f.text()); toast.dismiss(id);
      if (!r.ok) { toast.error("Không khôi phục được", { description: r.error }); return; }
      const mine = getSettings().vaultWrap, theirs = r.data.vault;
      const sameVault = !theirs || !mine || JSON.stringify(mine) === JSON.stringify(theirs);
      const bad = r.skipped.length ? `\n\n${r.skipped.length} tài liệu hỏng bị bỏ qua (${r.skipped.slice(0, 2).map((x) => `${x.name}: ${x.why}`).join("; ")}${r.skipped.length > 2 ? "…" : ""}).` : "";
      const pick = await choiceDialog(`Khôi phục ${r.docs.length} tài liệu?`, {
        message: `Gộp (khuyên dùng): thêm tài liệu mới, giữ bản mới hơn khi trùng, không xoá gì trên máy này.\nThay thế: bỏ toàn bộ dữ liệu hiện tại, dùng đúng như tệp (app tự tải bản dự phòng trước).${bad}`,
        okText: "Gộp", altText: "Thay thế",
      });
      if (!pick) return;
      if (pick === "ok") {
        const plan = planMerge(all, r.docs, { sameVault });
        if (plan.toSave.length) await saveDocs(plan.toSave);
        if (theirs && !mine) setSettings({ vaultWrap: theirs });
        if (r.data.library) setLibrary(mergeLibrary(getLibrary(), r.data.library));
        if (r.data.conversions) await restoreHistory(r.data.conversions as Parameters<typeof restoreHistory>[0]);
        toast.success(`Đã gộp: thêm ${plan.added}, cập nhật ${plan.updated}, giữ nguyên ${plan.kept}`, { description: plan.skippedLocked ? `${plan.skippedLocked} tài liệu khoá PIN bỏ qua vì khác khoá của máy này — dùng Thay thế nếu muốn lấy về.` : undefined });
        return;
      }
      if (all.length) {
        download(await buildBackup({ docs: all, vault: mine, library: getLibrary(), conversions: await historyForBackup() }), `ghi-nhanh-du-phong-truoc-khoi-phuc-${new Date().toISOString().slice(0, 10)}.json`);
      }
      if (!(await confirmDialog("Thay thế toàn bộ?", { message: `${all.length} tài liệu hiện có sẽ được thay bằng ${r.docs.length} tài liệu trong tệp.${all.length ? " Bản dự phòng vừa được tải về máy." : ""}`, okText: "Thay thế", danger: true }))) return;
      if (theirs) setSettings({ vaultWrap: theirs });
      await replaceAll(r.docs);
      if (r.data.library) setLibrary(r.data.library);
      if (r.data.conversions) await restoreHistory(r.data.conversions as Parameters<typeof restoreHistory>[0]);
      toast.success(`Đã thay thế bằng ${r.docs.length} tài liệu`);
    } catch (e) { toast.dismiss(id); showError(e, "Không khôi phục được"); }
  }

  return (
    <AppShell wide title="Tôi">
      <section className="rise rise-1 px-5 pt-4">
        <div className="document-row flex items-center gap-3 rounded-[16px] p-4">
          <div className="brand-mark grid size-12 shrink-0 place-items-center rounded-[12px] bg-primary font-display text-lg font-bold text-primary-foreground">G</div>
          <div className="min-w-0"><p className="font-display font-semibold">Ghi Nhanh</p><p className="text-xs text-muted-foreground">Không quảng cáo · Không giới hạn trang · Lưu trên máy</p></div>
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4">
      <Group title="Quét">
        <Choice label="Chất lượng ảnh" value={s.quality} options={[["normal", "Thường"], ["high", "Cao"]]} onChange={(v) => setSettings({ quality: v as never })} />
        <Choice label="Bộ lọc mặc định" value={s.defaultFilter} options={[["magic", "Thần kỳ"], ["auto", "Tự động"], ["sharp", "Sắc nét"], ["original", "Gốc"]]} onChange={(v) => setSettings({ defaultFilter: v as never })} />
        <Row label="Tự chụp khi máy đứng yên"><Switch aria-label="Tự chụp khi máy đứng yên" checked={s.autoCapture} onCheckedChange={(v) => setSettings({ autoCapture: v })} /></Row>
        <Row label="Chất lượng tối đa (chụp chậm hơn)"><Switch aria-label="Chất lượng tối đa" checked={s.maxQuality} onCheckedChange={(v) => setSettings({ maxQuality: v })} /></Row>
        <Row label="Âm báo khi chụp"><Switch aria-label="Âm báo khi chụp" checked={s.captureSound} onCheckedChange={(v) => setSettings({ captureSound: v })} /></Row>
        <Row label="AI tự đặt tên sau khi quét"><Switch aria-label="AI tự đặt tên sau khi quét" checked={s.autoName} onCheckedChange={(v) => setSettings({ autoName: v })} /></Row>
        {s.autoName && <NamingRules />}
        <Row label="Tự nhận chữ sau khi quét"><Switch aria-label="Tự nhận chữ sau khi quét" checked={s.autoOcr ?? true} onCheckedChange={(v) => setSettings({ autoOcr: v })} /></Row>
        <Row label="Đọc hướng dẫn khi quét"><Switch aria-label="Đọc hướng dẫn khi quét" checked={s.voiceGuide} onCheckedChange={(v) => setSettings({ voiceGuide: v })} /></Row>
        <Row label="Rung theo hướng dẫn"><Switch aria-label="Rung theo hướng dẫn" checked={s.guideVibrate} onCheckedChange={(v) => setSettings({ guideVibrate: v })} /></Row>
        <Row label="Rung khi chụp"><Switch aria-label="Rung khi chụp" checked={s.captureVibrate} onCheckedChange={(v) => setSettings({ captureVibrate: v })} /></Row>
      </Group>
      <Group title="Xuất & nhận chữ">
        <Choice label="Khổ giấy" value={s.paper} options={[["a4", "A4"], ["letter", "Letter"]]} onChange={(v) => setSettings({ paper: v as never })} />
        <Choice label="Ngôn ngữ chữ" value={s.ocrLang} options={[["vie+eng", "Việt + Anh"], ["vie", "Việt"], ["eng", "Anh"]]} onChange={(v) => setSettings({ ocrLang: v as never })} />
        <Row label={ocrReady ? "Dùng khi mất mạng: đã sẵn sàng" : "Tải sẵn để mở app & nhận chữ khi mất mạng"}>
          <button type="button" disabled={ocrBusy} className="min-h-10 min-w-10 text-sm font-semibold text-primary disabled:opacity-50" onClick={async () => {
            setOcrBusy(true);
            try { await prepareOfflineOcr(s.ocrLang); setOcrReady(true); toast.success("Đã tải sẵn dữ liệu nhận chữ"); }
            catch (e) { showError(e, "Chưa tải được — kiểm tra mạng rồi thử lại"); }
            finally { setOcrBusy(false); }
          }}>{ocrBusy ? "Đang tải…" : ocrReady ? "Tải lại" : "Tải sẵn"}</button>
        </Row>
      </Group>
      <Group title="Giao diện & riêng tư">
        <Row label="Chữ lớn" icon={<Type />}><Switch aria-label="Chữ lớn" checked={s.largeText} onCheckedChange={(v) => setSettings({ largeText: v })} /></Row>
        <button onClick={() => setSettings({ onboarded: false })} className="w-full"><Row label="Xem lại hướng dẫn" icon={<BookOpen />}><span className="text-xs font-semibold text-primary">Mở</span></Row></button>
        <Row label="Chế độ tối" icon={<Moon />}><Switch aria-label="Chế độ tối" checked={s.dark} onCheckedChange={(v) => setSettings({ dark: v })} /></Row>
        <button onClick={setPin} className="w-full"><Row label={s.pin ? "Mã PIN: đang bật" : "Đặt mã PIN"} icon={<KeyRound />}><span className="text-xs font-semibold text-primary">{s.pin ? "Tắt" : "Bật"}</span></Row></button>
        {s.pin && <Choice label="Tự khoá sau" value={String(s.autoLock)} options={[["0", "Ngay"], ["1", "1 phút"], ["5", "5 phút"], ["15", "15 phút"]]} onChange={(v) => setSettings({ autoLock: Number(v) })} />}
        {s.pin && <button onClick={makeRecovery} className="w-full"><Row label={s.vaultWrap?.rec ? "Mã khôi phục: đã tạo" : "Tạo mã khôi phục"} icon={<KeyRound />}><span className="text-xs font-semibold text-primary">{s.vaultWrap?.rec ? "Tạo lại" : "Tạo"}</span></Row></button>}
        {s.pin && s.vaultWrap?.rec && <button onClick={forgotPin} className="w-full"><Row label="Quên mã PIN?" icon={<KeyRound />}><span className="text-xs font-semibold text-primary">Dùng mã khôi phục</span></Row></button>}
        {s.pin && <button onClick={() => { lockNow(); toast("Đã khoá tất cả tài liệu"); }} className="w-full"><Row label="Khoá ngay" icon={<Lock />}><span /></Row></button>}
      </Group>
      <Group title="Tài khoản">
        {user ? (
          <>
          <button onClick={async () => { await signOut(); toast("Đã đăng xuất"); }} className="w-full"><Row label={`Đã đăng nhập: ${user.email ?? ""}`} icon={<UserRound />}><span className="text-xs font-semibold text-primary">Đăng xuất</span></Row></button>
          <button disabled={!!sync} onClick={async () => {
            setSync("Đang chuẩn bị…");
            try {
              const r = await syncAll(all, setSync);
              if (r.failed.length) toast.error(`Chưa đồng bộ được ${r.failed.length} tài liệu`, { description: `${r.failed.slice(0, 3).join(", ")} — kiểm tra mạng rồi bấm lại.` });
              else toast.success(r.sent || r.received ? `Đã tải về ${r.received} · tải lên ${r.sent} tài liệu` : "Máy và đám mây đã giống nhau");
            } catch (e) { showError(e, "Chưa đồng bộ được"); } finally { setSync(""); }
          }} className="w-full disabled:opacity-60"><Row label={sync || "Đồng bộ với đám mây"} icon={<CloudUpload />}><span className="text-xs text-muted-foreground">bản mới nhất thắng</span></Row></button>
          <Link to="/sync" className="block w-full"><Row label="Màn hình đồng bộ · xung đột · xoá tài khoản" icon={<CloudUpload />}><span className="text-xs font-semibold text-primary">Mở</span></Row></Link>
          </>
        ) : (
          <Link to="/auth" className="block w-full"><Row label="Đăng nhập (không bắt buộc)" icon={<UserRound />}><span className="text-xs font-semibold text-primary">Email · Google</span></Row></Link>
        )}
      </Group>
      <Group title="Dữ liệu">
        {lvl !== "ok" && <Row label={lvl === "full" ? "Bộ nhớ gần đầy — có thể không lưu được ảnh mới. Dọn thùng rác hoặc ảnh tạm." : "Đã dùng trên 80% bộ nhớ cho app. Nên dọn bớt."} icon={<AlertTriangle className="!text-destructive" />}><span /></Row>}
        <Row label={`Đã dùng ${usage || "…"}`} icon={<Database />}><span className="text-xs text-muted-foreground">{docs.length} tài liệu</span></Row>
        <button onClick={() => { downloadBaseline(); toast(perfCount ? "Đã tải tệp số đo tốc độ" : "Chưa có số đo — hãy chụp vài trang trước", { description: perfCount ? undefined : "Vào Quét, chụp khoảng 20 trang rồi bấm lại ở đây." }); }} className="w-full"><Row label="Tải số đo tốc độ (perf-baseline.json)" icon={<Download />}><span className="text-xs text-muted-foreground">{perfCount} lần đo</span></Row></button>
        <Row label={`Tài liệu ${fmtBytes(parts.active)} · Thùng rác ${fmtBytes(parts.trash)} · Ảnh tạm ${fmtBytes(parts.temp)}`}><span /></Row>
        <button onClick={cleanUp} className="w-full"><Row label="Dọn ảnh tạm" icon={<Eraser />}><span className="text-xs text-muted-foreground">{fmtBytes(parts.temp)}</span></Row></button>
        <Link to="/trash" className="block w-full"><Row label="Thùng rác" icon={<Trash2 />}><span className="text-xs text-muted-foreground">{trash.length} tài liệu · giữ 30 ngày</span></Row></Link>
        <button onClick={backup} className="w-full"><Row label="Sao lưu ra tệp" icon={<Download />}><span /></Row></button>
        <button onClick={restore} className="w-full"><Row label="Khôi phục từ tệp" icon={<Upload />}><span /></Row></button>
        {perf && <PerfCard r={perf} onClear={() => { clearPerf(); setPerf(buildReport([], readScanLog())); setPerfCount(0); toast("Đã xoá số đo tốc độ"); }} />}
        <button onClick={() => { setBench("Đang đo…"); setTimeout(() => { const c = compareBench(); const r = c.cur; setBench(`Mới ${r.correct}/${r.total} · Cũ ${c.old.correct}/${c.old.total}`); if (c.worse.length) toast("Bộ dò mới kém hơn ở: " + c.worse.join(", ")); if (r.rate < 0.95) toast("Chưa đạt 95%", { description: r.results.filter((x) => !x.ok).map((x) => x.name).join(", ") }); }, 30); }} className="w-full"><Row label="Đo tỉ lệ cắt đúng (24 ảnh mẫu)" icon={<Database />}><span className="text-xs text-muted-foreground">{bench || "Bấm để đo"}</span></Row></button>
        <button onClick={() => { const l = readScanLog(); if (!l.length) { toast("Chưa có nhật ký quét"); return; } download(new Blob([JSON.stringify(l, null, 2)], { type: "application/json" }), `ghi-nhanh-nhat-ky-quet-${new Date().toISOString().slice(0, 10)}.json`); }} className="w-full"><Row label="Tải nhật ký lỗi quét/AI" icon={<Download />}><span className="text-xs text-muted-foreground">{logCount} mục</span></Row></button>
        <button onClick={async () => { if (await confirmDialog("Xoá nhật ký quét?", { okText: "Xoá", danger: true })) { clearScanLog(); setLogCount(0); toast("Đã xoá nhật ký"); } }} className="w-full"><Row label="Xoá nhật ký quét" icon={<Database />}><span /></Row></button>
      </Group>
      <Group title="Cài như ứng dụng">
        {inst.installed ? <Row label="Đã cài trên máy này" icon={<Smartphone />}><span /></Row>
          : inst.canPrompt ? <button onClick={async () => { if (await inst.install()) toast.success("Đã cài Ghi Nhanh"); }} className="w-full"><Row label="Cài Ghi Nhanh lên màn hình chính" icon={<Smartphone />}><span className="text-xs font-semibold text-primary">Cài</span></Row></button>
          : <Row label={inst.ios ? "Bấm nút Chia sẻ của Safari → “Thêm vào MH chính”" : "Mở menu trình duyệt → “Cài ứng dụng” / “Thêm vào màn hình chính”"} icon={<Smartphone />}><span /></Row>}
      </Group>
      </div>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rise rise-2 px-5 pt-5"><h2 className="mb-2 font-display text-[0.8125rem] font-semibold text-muted-foreground">{title}</h2><div className="document-row divide-y divide-border overflow-hidden rounded-[16px]">{children}</div></section>;
}
function Row({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex min-h-[52px] items-center gap-3 px-4 py-2 text-left [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-primary">{icon}<span className="min-w-0 flex-1 text-sm">{label}</span>{children}</div>;
}
function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      <div className="flex shrink-0 rounded-[10px] bg-muted p-0.5">
        {options.map(([v, l]) => <button key={v} onClick={() => onChange(v)} className={`h-10 min-w-10 rounded-[8px] px-2.5 text-xs font-semibold ${value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}
      </div>
    </div>
  );
}

function PerfCard({ r, onClear }: { r: PerfReport; onClear: () => void }) {
  const sec = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} giây` : `${ms} ms`);
  const line = (label: string, st: { count: number; median: number; p90: number }) => (
    <div className="flex justify-between gap-3 text-sm"><span>{label}</span><span className="text-muted-foreground">{st.count ? `${sec(st.median)} · chậm nhất ~${sec(st.p90)} (${st.count} lần)` : "chưa có"}</span></div>
  );
  return (
    <div className="document-row space-y-2 rounded-[16px] p-4">
      <p className="font-display font-semibold">Tốc độ & lỗi trên máy này</p>
      {line("Nắn ảnh (card đồ hoạ)", r.warpGpu)}
      {line("Nắn ảnh (bộ xử lý)", r.warpCpu)}
      {line("AI đọc trang", r.ai)}
      <div className="flex justify-between gap-3 text-sm"><span>Tỉ lệ lỗi AI</span><span className={r.ai.errorRate > 0.2 ? "text-destructive" : "text-muted-foreground"}>{r.ai.ok + r.ai.fail ? `${Math.round(r.ai.errorRate * 100)}% (${r.ai.fail}/${r.ai.ok + r.ai.fail})` : "chưa có"}</span></div>
      {r.topErrors.length > 0 && <p className="text-xs text-muted-foreground">Lỗi hay gặp: {r.topErrors.map((e) => `${e.code} ×${e.n}`).join(", ")}</p>}
      <button onClick={onClear} className="py-3 text-xs text-muted-foreground underline">Xoá số đo tốc độ</button>
    </div>
  );
}

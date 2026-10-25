// G3-13: chỉnh mẫu đặt tên và quy tắc tự chuyển thư mục (trong trang Tôi).
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { setSettings, useSettings } from "@/lib/settings";
import { FIELD_LABEL, PLACEHOLDERS, renderTemplate, type RuleField } from "@/lib/name-rules";

export function NamingRules() {
  const s = useSettings();
  const rules = s.folderRules ?? [];
  const [field, setField] = useState<RuleField>("type");
  const [contains, setContains] = useState("");
  const [folder, setFolder] = useState("");
  const sample = renderTemplate(s.nameTemplate, { title: "Điện lực tháng 9", type: "Hoá đơn", tags: ["Nhà"], date: Date.now() });

  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <label className="text-sm" htmlFor="name-tpl">Mẫu đặt tên</label>
        <Input id="name-tpl" className="mt-1" value={s.nameTemplate} placeholder="{ten}" onChange={(e) => setSettings({ nameTemplate: e.target.value })} />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {PLACEHOLDERS.map(([k, l]) => (
            <button key={k} type="button" title={l} onClick={() => setSettings({ nameTemplate: `${s.nameTemplate}${s.nameTemplate ? " " : ""}${k}` })} className="rounded-[8px] bg-muted px-2 min-h-10 text-xs font-semibold text-muted-foreground">{k}</button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Ví dụ: {sample}</p>
      </div>
      <div>
        <p className="text-sm">Tự chuyển thư mục</p>
        <p className="text-xs text-muted-foreground">Quy tắc đầu tiên khớp được dùng; chỉ áp cho tài liệu đang ở "Chung".</p>
        <ul className="mt-2 space-y-1">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-[10px] bg-muted px-2.5 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate">{FIELD_LABEL[r.field]} có "{r.contains}" → <b>{r.folder}</b></span>
              <button type="button" aria-label="Xoá quy tắc" onClick={() => setSettings({ folderRules: rules.filter((x) => x.id !== r.id) })}><X className="size-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <select aria-label="Điều kiện" value={field} onChange={(e) => setField(e.target.value as RuleField)} className="h-10 rounded-[8px] border bg-background px-2 text-xs">
            {(Object.keys(FIELD_LABEL) as RuleField[]).map((f) => <option key={f} value={f}>{FIELD_LABEL[f]}</option>)}
          </select>
          <Input aria-label="Chứa chữ" className="h-10 w-24 flex-1 text-xs" placeholder="hoá đơn" value={contains} onChange={(e) => setContains(e.target.value)} />
          <Input aria-label="Thư mục" className="h-10 w-24 flex-1 text-xs" placeholder="Chi tiêu/Hoá đơn" value={folder} onChange={(e) => setFolder(e.target.value)} />
          <button type="button" aria-label="Thêm quy tắc" disabled={!contains.trim() || !folder.trim()} className="grid size-10 place-items-center rounded-[8px] bg-primary text-primary-foreground disabled:opacity-40"
            onClick={() => { setSettings({ folderRules: [...rules, { id: crypto.randomUUID(), field, contains: contains.trim(), folder: folder.trim() }] }); setContains(""); setFolder(""); }}>
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { linkStatus, verifyPassword } from "./share-links";

// G3-07: xem công khai qua mã liên kết. Kiểm tra mã/hạn/thu hồi/mật khẩu trước, rồi mới đọc bằng quyền quản trị.
export const openSharedDoc = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{22}$/), password: z.string().max(64).default("") }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("share_links").select("document_id, expires_at, revoked_at, password_hash").eq("token", data.token).maybeSingle();
    if (!link) return { ok: false as const, code: "missing" as const, message: "Liên kết không tồn tại." };
    const st = linkStatus(link, Date.now());
    if (st === "revoked") return { ok: false as const, code: "revoked" as const, message: "Người chia sẻ đã thu hồi liên kết này." };
    if (st === "expired") return { ok: false as const, code: "expired" as const, message: "Liên kết đã hết hạn." };
    if (link.password_hash) {
      if (!data.password) return { ok: false as const, code: "password" as const, message: "Nhập mật khẩu để xem tài liệu." };
      if (!(await verifyPassword(data.password, link.password_hash))) return { ok: false as const, code: "password" as const, message: "Sai mật khẩu, thử lại." };
    }
    const { data: doc } = await supabaseAdmin.from("documents").select("name, deleted_at").eq("id", link.document_id).maybeSingle();
    if (!doc || doc.deleted_at) return { ok: false as const, code: "missing" as const, message: "Tài liệu không còn nữa." };
    const { data: pages } = await supabaseAdmin.from("pages").select("src_path, position").eq("document_id", link.document_id).order("position");
    const paths = (pages ?? []).map((p) => p.src_path).filter((p): p is string => !!p);
    const { data: signed } = paths.length ? await supabaseAdmin.storage.from("pages").createSignedUrls(paths, 3600) : { data: [] };
    return { ok: true as const, name: doc.name, images: (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[] };
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", data.id).is("revoked_at", null);
    return error ? { ok: false as const, message: "Chưa thu hồi được, thử lại sau." } : { ok: true as const };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkPassword, EXPIRY_OPTIONS, expiresAt, hashPassword, newToken, type ExpiryId } from "./share-links";

// G3-06: tạo liên kết chia sẻ cho tài liệu đã đồng bộ lên mây (RLS: chỉ chủ tài liệu).
export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    localId: z.string().min(1).max(200),
    expiry: z.enum(EXPIRY_OPTIONS.map((o) => o.id) as [ExpiryId, ...ExpiryId[]]),
    password: z.string().max(64).default(""),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const bad = checkPassword(data.password);
    if (bad) return { ok: false as const, message: bad };
    const { data: doc } = await context.supabase.from("documents").select("id").eq("local_id", data.localId).maybeSingle();
    if (!doc) return { ok: false as const, message: "Tài liệu chưa có trên mây. Hãy đồng bộ rồi thử lại." };
    const row = {
      user_id: context.userId, document_id: doc.id, token: newToken(),
      expires_at: expiresAt(data.expiry, Date.now()),
      password_hash: data.password ? await hashPassword(data.password) : null,
    };
    const { error } = await context.supabase.from("share_links").insert(row);
    if (error) return { ok: false as const, message: "Chưa tạo được liên kết, thử lại sau." };
    return { ok: true as const, token: row.token, expiresAt: row.expires_at, hasPassword: !!row.password_hash };
  });

export const listShareLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ localId: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase.from("documents").select("id").eq("local_id", data.localId).maybeSingle();
    if (!doc) return [];
    const { data: rows } = await context.supabase.from("share_links")
      .select("id, token, expires_at, revoked_at, password_hash, created_at").eq("document_id", doc.id).order("created_at", { ascending: false });
    return (rows ?? []).map(({ password_hash, ...r }) => ({ ...r, hasPassword: !!password_hash }));
  });

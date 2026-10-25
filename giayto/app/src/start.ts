import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Gắn phiên đăng nhập vào mọi lệnh gọi máy chủ. Khi chưa cấu hình đám mây thì bỏ qua,
// để các nút chạy trên máy (dò góc, cắt, xuất...) không bị hỏng theo.
const attachAuthSafe = createMiddleware({ type: "function" }).client(async ({ next }) => {
  if (!import.meta.env["VITE_SUPABASE_URL"] || !import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) return next();
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachAuthSafe],
  
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));

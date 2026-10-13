import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
// Phông nhúng cục bộ (app chạy ngoại tuyến) — thay Google Fonts
import "@fontsource/manrope/vietnamese-400.css";
import "@fontsource/manrope/vietnamese-500.css";
import "@fontsource/manrope/vietnamese-600.css";
import "@fontsource/manrope/vietnamese-700.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/sora/latin-ext-500.css";
import "@fontsource/sora/latin-ext-600.css";
import "@fontsource/sora/latin-ext-700.css";
import "@fontsource/sora/latin-500.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/sora/latin-700.css";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { installAutoLock, useSettings } from "../lib/settings";
import { installGlobalErrorToasts } from "../lib/errors";
import { registerServiceWorker } from "../lib/offline";
import { AppDialog } from "@/components/app-dialog";
import { Onboarding } from "@/components/onboarding";
import { Toaster } from "@/components/ui/sonner";
import { OcrDock } from "@/components/ocr-dock";
import { AiQueueDock } from "@/components/ai-queue-dock";
import { OfflineBanner } from "@/components/offline-banner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Không tìm thấy trang</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Trang bạn tìm không tồn tại hoặc đã được chuyển đi.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const msg = error instanceof Error ? error.message : String(error);
  const noCloud = /Missing Supabase environment/i.test(msg);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {noCloud ? "Chưa kết nối máy chủ đám mây" : "Không tải được trang này"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {noCloud
            ? "Tính năng này cần đăng nhập/đồng bộ qua Lovable Cloud nhưng bản này chưa được cấu hình. Các tính năng trên máy (quét, PDF, công cụ) vẫn dùng bình thường."
            : "Đã có lỗi xảy ra. Bạn thử tải lại hoặc quay về trang chủ."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Thử lại
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#006F59" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Ghi Nhanh" },
      { title: "Ghi Nhanh" },
      { name: "description", content: "Ứng dụng quét, nhận diện chữ và xuất PDF." },
      { name: "author", content: "Ghi Nhanh" },
      { property: "og:title", content: "Ghi Nhanh" },
      { property: "og:description", content: "Ứng dụng quét, nhận diện chữ và xuất PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { dark, largeText } = useSettings();
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => { document.documentElement.classList.toggle("large-text", largeText); }, [largeText]);
  useEffect(() => { const a = installAutoLock(); const b = installGlobalErrorToasts(); registerServiceWorker(); return () => { a(); b(); }; }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <OcrDock />
      <OfflineBanner />
      <AiQueueDock />
      {/* Thông báo nằm DƯỚI hàng nút đầu màn (Đóng, đèn, lưu…): trước đây toast phủ lên nút Đóng của màn chụp → chạm trúng toast */}
      <Toaster position="top-center" richColors closeButton offset={{ top: "calc(env(safe-area-inset-top) + 64px)" }} mobileOffset={{ top: "calc(env(safe-area-inset-top) + 64px)" }} />
      <AppDialog />
      <Onboarding />
    </QueryClientProvider>
  );
}

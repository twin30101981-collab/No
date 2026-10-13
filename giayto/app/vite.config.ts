// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// HM-08: mã bản build (đổi mỗi lần build) — offline.ts đăng ký /sw.js?v=<mã> để mỗi bản phát hành là một service worker mới.
// Ưu tiên biến môi trường BUILD_ID/commit của nơi triển khai; không có thì dùng thời điểm build.
const BUILD_ID = (process.env["BUILD_ID"] || process.env["GITHUB_SHA"]?.slice(0, 10) || process.env["CF_PAGES_COMMIT_SHA"]?.slice(0, 10) || new Date().toISOString().replace(/\D/g, "").slice(0, 14)).replace(/[^\w.-]/g, "");

export default defineConfig({
  vite: { define: { __BUILD_ID__: JSON.stringify(BUILD_ID) } },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// HM-09: thư viện nặng chỉ được nạp lười (import() khi cần). Một `import ... from "pdf-lib"` tĩnh ở bất kỳ tệp nào
// kéo cả thư viện (373 KB) vào gói đầu của mọi màn dùng tệp đó (đã xảy ra: pdf-sign.ts → màn /tools).
const HEAVY = ["pdf-lib", "jspdf", "pdfjs-dist", "heic-to", "html2canvas", "tesseract.js", "@pdf-lib/fontkit", "node-forge"];
// Ngoại lệ có chủ đích: ghi lý do tại đây. Mặc định rỗng.
// Chỉ được nạp qua import() từ màn hình (digital-sign-dialog nạp lười ở tools.tsx).
const ALLOW: Record<string, string[]> = {
  "src/lib/pdf-sign.ts": ["pdf-lib", "node-forge"],
  "src/lib/p12.ts": ["node-forge"],
};
const LAZY_ONLY = ["@/lib/pdf-sign", "@/lib/p12", "@/components/digital-sign-dialog"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe("thư viện nặng chỉ nạp lười", () => {
  it("không có import tĩnh (không phải import type) tới thư viện nặng", () => {
    const bad: string[] = [];
    for (const f of files("src")) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/^import\s+(?!type\b)[^;]*?\sfrom\s+["']([^"']+)["']/gm)) {
        const mod = m[1]!;
        if (HEAVY.some((h) => mod === h || mod.startsWith(h + "/")) && !(ALLOW[f] ?? []).includes(mod)) bad.push(`${f} → ${mod}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("mô-đun ký số (chứa thư viện nặng) không bị import tĩnh từ màn hình (routes)", () => {
    const bad: string[] = [];
    for (const f of files("src/routes")) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/^import\s+(?!type\b)[^;]*?\sfrom\s+["']([^"']+)["']/gm)) if (LAZY_ONLY.includes(m[1]!)) bad.push(`${f} → ${m[1]}`);
    }
    expect(bad).toEqual([]);
  });
});

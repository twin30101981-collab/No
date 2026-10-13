/** Chạy các tệp kiểm thử qua shim. Dùng: tsx --tsconfig scripts/thay-vitest/tsconfig.json scripts/thay-vitest/chay.ts <tệp...> */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cases, fullName, hooksOf } from "./shim";

const files = process.argv.slice(2);
if (!files.length) { console.error("Cần ít nhất một tệp kiểm thử."); process.exit(2); }

let pass = 0, fail = 0, unloadable = 0;
for (const f of files) {
  const start = cases.length;
  try { await import(pathToFileURL(path.resolve(f)).href); }
  catch (e) { unloadable++; console.log(`⚠ KHÔNG NẠP ĐƯỢC ${f}: ${(e as Error).message.split("\n")[0]}`); continue; }
  const mine = cases.slice(start);
  let ok = 0;
  for (const c of mine) {
    const h = hooksOf(c);
    try { for (const b of h.before) await b(); await c.fn(); ok++; }
    catch (e) { fail++; console.log(`✗ ${f} › ${fullName(c)}\n    ${(e as Error).message}`); }
    finally { for (const a of h.after) { try { await a(); } catch { /* bỏ qua lỗi dọn dẹp */ } } }
  }
  pass += ok;
  console.log(`${ok === mine.length ? "✓" : "✗"} ${f}: ${ok}/${mine.length}`);
}
console.log(`\nTổng: ${pass} đạt, ${fail} lỗi, ${unloadable} tệp không nạp được (bộ chạy thay thế — KHÔNG thay bunx vitest run)`);
process.exit(fail || unloadable ? 1 : 0);

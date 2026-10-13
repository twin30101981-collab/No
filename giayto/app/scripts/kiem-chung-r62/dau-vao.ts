// R6.2: điểm vào để đóng gói riêng phần dựng trang (image.ts) + cổng chất lượng bằng esbuild,
// dùng khi KHÔNG cài được node_modules (sandbox chặn registry). Môi trường đủ npm dùng vite dev như R6.1.
import * as im from "../../src/lib/image";
import * as qg from "../../src/lib/quality-gate";
(globalThis as unknown as { __im: typeof im; __qg: typeof qg }).__im = im;
(globalThis as unknown as { __im: typeof im; __qg: typeof qg }).__qg = qg;

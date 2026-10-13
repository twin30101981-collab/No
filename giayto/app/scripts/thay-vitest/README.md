# Bộ chạy thay thế vitest (chỉ cho môi trường soạn)

Dùng khi **không có bun/node_modules** (phiên soạn trong sandbox). **KHÔNG thay `bunx vitest run`** – có bun thì dùng vitest thật và bỏ qua thư mục này.

## Phạm vi
- Chỉ kiểm thử thuần: không DOM/jsdom, không `vi.mock`.
- Có: `describe`, `it`/`test`, `beforeEach`, `afterEach`, `expect` với `toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`, `toBeNull/Undefined/Defined/Truthy/Falsy/NaN`, `toBeCloseTo`, `toBeGreaterThan(OrEqual)`, `toBeLessThan(OrEqual)`, `toMatch`, `toContain`, `toHaveLength`, `toThrow` và `.not`.
- Tệp không nạp được (thiếu thư viện) báo "KHÔNG NẠP ĐƯỢC" và lệnh thoát mã ≠ 0; tệp dùng `window`/`document` sẽ lỗi.

## Chạy (cần `tsx`)
```
tsx --tsconfig scripts/thay-vitest/tsconfig.json scripts/thay-vitest/chay.ts \
  src/test/s13-edit-session.test.ts src/test/s13b-edit-view.test.ts src/test/s12-scan-diagnose.test.ts
```
Mốc 07/10/2026: 39 đạt (23 + 11 + 5).

## Kiểm kiểu (cần `tsc`)
```
tsc -p scripts/thay-vitest/tsconfig.kiem-kieu.json
```
Danh sách `files` trong tsconfig.kiem-kieu.json là các mô-đun thuần S12/S13; thêm tệp mới vào đó. Lỗi `Cannot find module 'react'` ở db.ts/settings.ts là do môi trường thiếu kiểu react, không phải lỗi mã.

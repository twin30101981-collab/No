#!/usr/bin/env node
// Đóng gói mã nguồn bàn giao thành file zip.
// Cách dùng: bun scripts/dong-goi.mjs [ten-file.zip]
// Mặc định tạo: ban-giao-<yyyymmdd-hhmm>.zip trong /tmp, loại trừ .git, node_modules, dist, .lovable.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const outDir = '/tmp/ban-giao';
mkdirSync(outDir, { recursive: true });
const out = process.argv[2] ?? join(outDir, `ban-giao-${stamp}.zip`);

const exclude = [
  '.git', '.git/*', 'node_modules', 'node_modules/*', 'dist', 'dist/*',
  '.lovable', '.lovable/*', '.workspace', '.workspace/*', '.tanstack', '.tanstack/*',
  '.env', '.env.*', 'src/routeTree.gen.ts', 'tsconfig.tsbuildinfo', '*.log', '.DS_Store',
];

if (existsSync(out)) execFileSync('rm', [out]);
execFileSync('zip', ['-r', out, '.', '-x', ...exclude], { cwd: root, stdio: 'pipe' });

const listing = execFileSync('unzip', ['-l', out], { encoding: 'utf8' });
const count = listing.trim().split('\n').length - 4; // trừ dòng tiêu đề/tổng kết
console.log(`Đã tạo: ${out}`);
console.log(`Số mục trong zip: ${count}`);
if (/(^|\s)(\.git|.*\/\.git|node_modules|.*\/node_modules|\.lovable|\.workspace|\.tanstack)(\/|\s)|(^|\s)src\/routeTree\.gen\.ts(\s|$)|(^|\s)\.env(\.|\s)/m.test(listing)) {
  console.error('CẢNH BÁO: zip còn chứa tệp nội bộ hoặc đầu ra tự sinh!');
  process.exit(1);
}
console.log('Kiểm tra loại trừ: sạch (không node_modules/.git).');

#!/usr/bin/env bash
# P0.2 – Đóng gói ZIP chuẩn theo đề án v4.
# Dùng: bash scripts/dong-goi.sh P0.2 "Mô tả ngắn việc đã làm"
# ZIP gồm: app web (không node_modules/.git/dist), LO-TRINH.md, TIEP-THEO.md, tien-do.json.
set -euo pipefail
BUOC="${1:?Thiếu mã bước, ví dụ P0.2}"; MOTA="${2:-}"
NGAY=$(date +%Y%m%d); TEN="giayto-scan-${BUOC}-${NGAY}"
STAGE="/tmp/${TEN}/giayto-scan"; rm -rf "/tmp/${TEN}" "/tmp/${TEN}.zip"; mkdir -p "$STAGE"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude node_modules --exclude .git --exclude '.git/**' --exclude dist \
    --exclude .output --exclude .vinxi --exclude .wrangler --exclude package-lock.json --exclude '*.log' ./ "$STAGE/"
else  # môi trường không có rsync (sandbox): dùng tar, cùng danh sách loại trừ
  tar -cf - --exclude=node_modules --exclude=.git --exclude=dist --exclude=.output --exclude=.vinxi \
    --exclude=.wrangler --exclude=package-lock.json --exclude='*.log' . | tar -xf - -C "$STAGE"
fi
for f in LO-TRINH.md TIEP-THEO.md; do
  [ -s "$STAGE/$f" ] || { echo "THIẾU $f — hãy điền theo mẫu"; exit 1; }
done
echo "- $(date -Iseconds) $BUOC: $MOTA" >> "$STAGE/LO-TRINH.md"
( cd "/tmp/${TEN}" && zip -qr "/tmp/${TEN}.zip" giayto-scan )
# Nghiệm thu: ZIP không chứa node_modules/.git
if unzip -l "/tmp/${TEN}.zip" | grep -qE 'node_modules/|\.git/'; then
  echo "LỖI: ZIP còn node_modules hoặc .git"; exit 1
fi
unzip -l "/tmp/${TEN}.zip" | tail -1
mkdir -p /mnt/documents && cp "/tmp/${TEN}.zip" /mnt/documents/
echo "ĐÃ ĐÓNG GÓI: /mnt/documents/${TEN}.zip"

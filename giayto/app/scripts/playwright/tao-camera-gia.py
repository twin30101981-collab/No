# Tạo tệp camera giả (.y4m) cho Chromium (--use-file-for-fake-video-capture) từ một ảnh.
# Dùng: python3 -I scripts/playwright/tao-camera-gia.py anh.jpg ra.y4m [x0 y0 x1 y1]  (vùng cắt tuỳ chọn, ví dụ khung ngắm trong ảnh chụp màn hình)
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
if len(sys.argv) == 7: im = im.crop(tuple(int(v) for v in sys.argv[3:7]))
W = 1920; H = round(W * im.height / im.width) // 2 * 2
v = im.resize((W, H))
Y, Cb, Cr = v.convert("YCbCr").split()
f = Y.tobytes() + Cb.resize((W // 2, H // 2)).tobytes() + Cr.resize((W // 2, H // 2)).tobytes()
with open(out, "wb") as o:
    o.write(f"YUV4MPEG2 W{W} H{H} F15:1 Ip A1:1 C420jpeg\n".encode())
    for _ in range(4): o.write(b"FRAME\n" + f)
print(out, W, H)

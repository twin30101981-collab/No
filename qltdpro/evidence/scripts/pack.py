"""pack.py <thu_muc_goi> <app.html> <ten_app> : cập nhật app, scripts, MANIFEST, ZIP vào scratchpad. Nội dung handover/evidence do người gọi ghi trước."""
import sys, os, shutil, hashlib, subprocess
pk, app, name = sys.argv[1:4]
base = '/tmp/claude-0/work1'
d = f'{base}/{pk}'
for f in os.listdir(f'{d}/app'): os.remove(f'{d}/app/{f}')
shutil.copy(app, f'{d}/app/{name}')
for f in os.listdir(f'{base}/build'):
    if f.endswith(('.js', '.py')) and f not in ('dbg.js',) and not f.startswith('check_vendor'):
        shutil.copy(f'{base}/build/{f}', f'{d}/evidence/scripts/{f}')
m = f'{d}/handover/MANIFEST.sha256'
if os.path.exists(m): os.remove(m)
lines = []
for r, _, fs in os.walk(d):
    for f in sorted(fs):
        p = os.path.join(r, f); rel = './' + os.path.relpath(p, d)
        lines.append((rel, hashlib.sha256(open(p, 'rb').read()).hexdigest()))
lines.sort()
open(m, 'w').write(''.join(f'{h}  {r}\n' for r, h in lines))
sp = '/tmp/claude-0/-home-user-Land-gis/cd10ff0d-4441-5cce-abf8-3c43c961ea48/scratchpad'
z = shutil.make_archive(f'{sp}/{pk}', 'zip', base, pk)
print(z, os.path.getsize(z), hashlib.sha256(open(app, 'rb').read()).hexdigest())

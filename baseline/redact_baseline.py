"""Ẩn dữ liệu cá nhân trong bản gốc Land GIS v237 trước khi đưa lên repo công khai.
- LG_AUDIT (10 hồ sơ thật: họ tên, địa chỉ, toạ độ) -> mảng rỗng (quyết định 15/10/2026: xoá dữ liệu cũ mất an toàn)
- Họ tên chủ sử dụng thật -> "Chủ sử dụng mẫu N"
- Số CCCD (12 số) / CMND (9 số) -> chuỗi 0 cùng độ dài
Cách dùng: python3 redact_baseline.py <vào.html> <ra.html>"""
import re,sys,json,hashlib
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding='utf-8').read()
h0=hashlib.sha256(s.encode()).hexdigest()
m=re.search(r'window\.LG_AUDIT = (\[.*?\]);\n',s,re.S)
names=set()
for r in json.loads(m.group(1)):
  for n in re.split(r'\s*(?:&|và)\s*',r['owner']): names.add(n.strip())
for mm in re.finditer(r'(?:chu_su_dung|owner|chủ sử dụng|Ông/bà|Ông|Bà)["\'\s:=]{1,6}["\']([A-ZÀ-Ỹ][^"\'\n]{3,80})["\']',s):
  for part in re.split(r'\s*(?:&|;|và)\s*',mm.group(1)):
    part=re.sub(r'^(Ông|Bà)\s+','',part.strip()); part=re.sub(r'\s*\(sinh \d{4}\)','',part).strip()
    if re.match(r'^[A-ZĐÀ-Ỹ][a-zà-ỹ]+( [A-ZĐÀ-Ỹ][a-zà-ỹ]+){1,4}$',part) and part not in ('Chủ sử dụng','Địa chỉ chủ sử dụng'): names.add(part)
s=s[:m.start(1)]+'[]'+s[m.end(1):]
names=sorted(names,key=len,reverse=True)
for i,n in enumerate(names,1): s=s.replace(n,'Chủ sử dụng mẫu %d'%i)
s=re.sub(r'(?<!\d)0\d{11}(?!\d)',lambda x:'0'*12,s)
s=re.sub(r'((?:CMND|cmnd)[^0-9\n]{0,20})(\d{9})(?!\d)',lambda x:x.group(1)+'0'*9,s)
open(dst,'w',encoding='utf-8').write(s)
h1=hashlib.sha256(s.encode()).hexdigest()
print(json.dumps({'names_redacted':len(names),'sha256_goc':h0,'sha256_da_an':h1},ensure_ascii=False))

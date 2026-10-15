import re,sys,collections
src=open(sys.argv[1],encoding='utf-8').read()
lines=src.split('\n')
print('lines',len(lines),'bytes',len(src.encode()))
# blocks
blocks=[]
for m in re.finditer(r'<(script|style)([^>]*)>(.*?)</\1>',src,re.S):
    ln=src.count('\n',0,m.start())+1
    blocks.append((m.group(1),m.group(2).strip()[:60],ln,m.group(3).count('\n'),len(m.group(3))))
c=collections.Counter(); s=collections.Counter()
for b in blocks: c[b[0]]+=1; s[b[0]]+=b[4]
print('blocks',dict(c),'bytes',dict(s))
big=sorted(blocks,key=lambda b:-b[4])[:25]
for b in big: print(' ',b[0],b[1],'L%d'%b[2],'lines',b[3],'bytes',b[4])
# base64 data
b64=re.findall(r'data:[a-z/+-]+;base64,[A-Za-z0-9+/=]{200,}',src)
print('base64 data URIs',len(b64),'total bytes',sum(len(x) for x in b64))
for x in sorted(b64,key=len,reverse=True)[:8]: print('  ',x[:40],len(x))
def cnt(p,flags=0): return len(re.findall(p,src,flags))
pats={'function decl':r'\bfunction\s+[A-Za-z_$][\w$]*\s*\(','innerHTML':r'\.innerHTML\s*[+]?=','insertAdjacentHTML':r'insertAdjacentHTML','eval(':r'\beval\(','new Function':r'new Function','document.write':r'document\.write','localStorage':r'localStorage','sessionStorage':r'sessionStorage','indexedDB':r'indexedDB','fetch(':r'\bfetch\(','XMLHttpRequest':r'XMLHttpRequest','addEventListener':r'addEventListener','onclick=':r'onclick=','console.log':r'console\.log','console.error':r'console\.error','console.warn':r'console\.warn','catch{}':r'catch\s*(\([^)]*\))?\s*\{\s*\}','TODO/FIXME':r'TODO|FIXME','setInterval':r'setInterval','setTimeout':r'setTimeout','MutationObserver':r'MutationObserver','!important':r'!important','window.__':r'window\.__\w+','serviceWorker':r'serviceWorker','prototype override (orig =)':r'const\s+_?orig\w*\s*=\s*window\.\w+','api key literal sk-':r'sk-[A-Za-z0-9]{10,}','AIza key':r'AIza[0-9A-Za-z_-]{20,}'}
for k,p in pats.items(): print(f'{k:28s}',cnt(p))
fn=re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(',src)
fc=collections.Counter(fn)
dup=[(k,v) for k,v in fc.items() if v>1]
print('unique fn names',len(fc),'redeclared',len(dup))
print(' top redeclared',sorted(dup,key=lambda x:-x[1])[:30])
ids=re.findall(r'\bid="([^"]+)"',src)
ic=collections.Counter(ids)
print('ids',len(ids),'unique',len(ic),'dup ids',[(k,v) for k,v in ic.items() if v>1][:30])
keys=set(re.findall(r'localStorage\.(?:getItem|setItem|removeItem)\(\s*[\'"]([^\'"]+)',src))
print('LS keys literal',len(keys),sorted(keys)[:80])
hosts=collections.Counter(re.findall(r'https?://([a-zA-Z0-9.-]+)',src))
print('hosts',len(hosts)); print(sorted(hosts.items(),key=lambda x:-x[1])[:70])
vers=collections.Counter(re.findall(r'\bv(\d{2,3})(?:-fix|-|\b)',src))
print('version tags count',len(vers),'max',max(map(int,vers)) if vers else None)
wrap=re.findall(r'window\.(\w+)\s*=\s*function',src); wc=collections.Counter(wrap)
print('window.X=function overrides >1',sorted([(k,v) for k,v in wc.items() if v>1],key=lambda x:-x[1])[:40])

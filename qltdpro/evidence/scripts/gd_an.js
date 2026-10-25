const fs=require('fs');const s=fs.readFileSync('../app_hm10.html','utf8');
const i=s.indexOf('<script id="bgdat-scripts"');const j=s.indexOf('</script>',i);const blk=s.slice(i,j);
const a=blk.indexOf('const W=');const b=blk.indexOf('\n',a);const W=eval('('+blk.slice(a+8,b).replace(/;\s*$/,'')+')');
const c=blk.indexOf('const bgd_UBND=');const d=blk.indexOf('\n',c);
const ub=blk.slice(c+15,d).replace(/;\s*$/,'');
console.log('W wards',Object.keys(W).length,'rows',Object.values(W).reduce((x,y)=>x+y.length,0));
console.log('row sample',JSON.stringify(W['Phường Nam Định'][0]),'len',W['Phường Nam Định'][0].length);
// duplicate keys ward|tu|den
const n=k=>String(k||'').toLowerCase().trim().replace(/\s+/g,' ');
let dup=0,tot=0;const ex=[];
for(const [w,rows] of Object.entries(W)){const m=new Map();rows.forEach((r,ix)=>{tot++;const k=n(r[2])+'|||'+n(r[3]);if(m.has(k)){dup++;if(ex.length<3)ex.push([w,r.slice(0,4),m.get(k).slice(0,4)])}else m.set(k,r)})}
console.log('total rows',tot,'dup (tu|den) keys',dup,JSON.stringify(ex));
// dup keys including duong
let dup2=0;for(const [w,rows] of Object.entries(W)){const m=new Set();rows.forEach(r=>{const k=n(r[1])+'|'+n(r[2])+'|||'+n(r[3]);if(m.has(k))dup2++;m.add(k)})}
console.log('dup with tên đường',dup2);
// UBND object: count keys; check dup literal keys by regex
const keys=[...ub.matchAll(/"([^"]+\|\|\|[^"]*)":\[/g)].map(x=>x[1]);
console.log('UBND literal entries',keys.length,'distinct',new Set(keys).size);
// error cells
let bad=0,inc=0,tb=0,nq=0;const errs=[];
for(const [w,rows] of Object.entries(W))rows.forEach(r=>{r.slice(4).forEach((v,ix)=>{if(typeof v!=='number'||!isFinite(v)){bad++;if(errs.length<5)errs.push([w,r[1],r[2],ix,v])}})});
console.log('non-numeric price cells',bad,JSON.stringify(errs));
console.log('lens',[...new Set(Object.values(W).flat().map(r=>r.length))]);
// ---- UBND theo thứ tự literal (giữ trùng) ----
const wardsPos=[...ub.matchAll(/"(Phường [^"]+|Xã [^"]+)":\{/g)].map(m=>({w:m[1],i:m.index}));
console.log('ubnd wards',wardsPos.map(x=>x.w).join(' / '));
let allOk=0,allMiss=0;const report=[];
wardsPos.forEach((wp,ix)=>{const seg=ub.slice(wp.i,ix+1<wardsPos.length?wardsPos[ix+1].i:undefined);
 const ent=[...seg.matchAll(/"([^"]*\|\|\|[^"]*)":\[([^\]]*)\]/g)].map(m=>({k:m[1],v:m[2]}));
 const rows=W[wp.w]||[];let p=0,matched=0,miss=0;const rowKeys=rows.map(r=>n(r[2])+'|||'+n(r[3]));
 ent.forEach(e=>{let q=p;while(q<rowKeys.length&&rowKeys[q]!==e.k)q++;if(q<rowKeys.length){matched++;p=q+1}else miss++});
 report.push([wp.w,rows.length,ent.length,new Set(ent.map(e=>e.k)).size,matched,miss]);allOk+=matched;allMiss+=miss});
console.log('ward,rowsW,entUBND,distinct,orderedMatch,unmatched');report.forEach(r=>console.log(r.join(' | ')));console.log('ordered match',allOk,'unmatched',allMiss);

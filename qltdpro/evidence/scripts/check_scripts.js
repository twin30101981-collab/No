// Biên dịch thử mọi khối <script> JS trong tệp HTML (kể cả vendor trì hoãn); bỏ qua chú thích HTML ngoài script
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let pos=0,n=0;const bad=[];
for(;;){
  const c=s.indexOf('<!--',pos), k=s.search ? s.slice(pos).search(/<script\b/i) : -1;
  const sc=k<0?-1:pos+k; if(sc<0)break;
  if(c>=0&&c<sc){pos=s.indexOf('-->',c)+3;continue;}
  const gt=s.indexOf('>',sc);const attrs=s.slice(sc+7,gt);const end=s.indexOf('</script>',gt);
  const body=s.slice(gt+1,end);pos=end+9;
  if(/\bsrc=/.test(attrs))continue;
  const t=(attrs.match(/type="([^"]+)"/)||[])[1]||'';
  if(t&&!/javascript|x-td-deferred/.test(t))continue;
  n++;try{new Function(body)}catch(e){bad.push({id:(attrs.match(/id="([^"]+)"/)||[])[1]||'(no id)',line:s.slice(0,sc).split('\n').length,err:e.message})}
}
console.log(JSON.stringify({checked:n,failed:bad.length,bad}));process.exit(bad.length?1:0);

const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const out={};
 for(const [k,f] of [['cu',process.argv[2]],['moi',process.argv[3]]]){const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();p.on('dialog',d=>d.accept());
  await p.goto('file://'+f,{waitUntil:'load'});await p.waitForTimeout(6000);
  out[k]=await p.evaluate(async()=>{const r={};const top=(x,y)=>{const e=document.elementFromPoint(x,y);let n=e,path=[];for(let i=0;n&&i<4;i++,n=n.parentElement)path.push(n.id||n.tagName);return path.join('<')};
   const cx=750,cy=450;
   try{TD_AUDIT.run({show:true})}catch(e){}
   r.audit=top(1300,100);
   try{showToast('thử','green')}catch(e){}
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));await new Promise(r=>setTimeout(r,600));
   r.palette=top(cx,cy);const po=document.getElementById('dp-cmd-overlay');if(po)po.style.display='none';const ap=document.getElementById('td-audit-panel');if(ap)ap.remove();
   const ids=[...document.querySelectorAll('[id]')].filter(e=>/modal|overlay|ov$/i.test(e.id)).slice(0,60);
   r.n=ids.length;
   // bật lần lượt từng lớp phủ, ghi phần tử trên cùng ở giữa màn hình
   r.each=ids.map(e=>{const old=e.style.cssText;e.style.display='flex';const t=top(cx,cy);e.style.cssText=old;return e.id+'→'+t});
   return r;});
  await p.close();}
 const same=JSON.stringify(out.cu)===JSON.stringify(out.moi);
 console.log(JSON.stringify(out.moi).slice(0,600));console.log(same?'PASS lớp phủ trên cùng ở mọi tình huống giống hệt bản cũ ('+out.moi.n+' lớp phủ + palette + bảng audit)':'FAIL khác: '+JSON.stringify([out.cu,out.moi]).slice(0,800));await b.close()})();

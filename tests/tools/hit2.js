const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})).newPage();
await p.route(/^https?:/,r=>r.abort()); await p.goto('file://'+require('path').resolve(process.argv[2]));
for (const t of [2000,5000,9000]){ await p.waitForTimeout(t===2000?2000:3000);
const r=await p.evaluate(()=>{const h=document.elementFromPoint(117,812);const chain=[];let e=h;while(e&&chain.length<5){chain.push((e.id?'#'+e.id:'')+(e.className?'.'+String(e.className).split(' ').slice(0,2).join('.'):'')+'<'+e.tagName+'>');e=e.parentElement}
 const toast=document.getElementById('lgv42-toast-host');return {chain,toastKids:toast?toast.children.length:null,toastPE:toast?getComputedStyle(toast).pointerEvents:null}});
console.log(t,JSON.stringify(r));}
await b.close();})();

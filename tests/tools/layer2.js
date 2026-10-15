const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext()).newPage(); await p.route(/^https?:/,r=>r.abort());
await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(6000);
const r=await p.evaluate(()=>{const o=[];map.eachLayer(l=>{if(l._url)o.push({url:l._url,pane:l.options.pane,z:l.options.zIndex,opacity:l.options.opacity,cls:l.options.className,id:l._leaflet_id})});return o});
console.log(JSON.stringify(r,null,1));await b.close();})();

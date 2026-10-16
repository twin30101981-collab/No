const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file:///tmp/tk.html');
await p.pdf({path:process.argv[2],format:'A4',margin:{top:'16mm',bottom:'16mm',left:'12mm',right:'12mm'},printBackground:true,displayHeaderFooter:true,footerTemplate:'<div style="font-size:8px;width:100%;text-align:center"><span class="pageNumber"></span>/<span class="totalPages"></span></div>',headerTemplate:'<div></div>'});await b.close()})();

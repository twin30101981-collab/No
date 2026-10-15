const { chromium } = require('/opt/node-tools/node_modules/playwright');
const A=['phường Vũng Tàu, Thành phố Hồ Chí Minh','phường Bà Rịa, Thành phố Hồ Chí Minh','phường Thành Đông, thành phố Hải Phòng','phường Hải Dương, thành phố Hải Phòng','xã Côn Đảo, Thành phố Hồ Chí Minh','phường Thanh Khê, thành phố Đà Nẵng','phường Hội An, thành phố Đà Nẵng','phường Buôn Ma Thuột, tỉnh Đắk Lắk','phường Tuy Hòa, tỉnh Đắk Lắk','phường Đà Lạt, tỉnh Lâm Đồng','phường Phan Thiết, tỉnh Lâm Đồng'];
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext()).newPage(); await p.route(/^https?:/,r=>r.abort());
await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(3000);
const r=await p.evaluate(A=>A.map(a=>{let h;try{h=LG146.provinceFromAddress(a)}catch(e){h='ERR '+e.message}return [a,h?JSON.stringify(h).slice(0,90):null]}),A);
console.log(r.map(x=>x.join('  =>  ')).join('\n')); await b.close();})();

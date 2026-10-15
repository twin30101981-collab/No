const { chromium } = require('/opt/node-tools/node_modules/playwright');
const T=`1 2260081.59 570346.55 0.50
2 2260081.96 570346.89 3.02
3 2260083.99 570349.13 5.59
4 2260080.98 570353.84 4.54
5 2260077.72 570350.68 1.38
6 2260076.73 570349.72 5.64
7 2260080.72 570345.74 1.19
1 2260081.59 570346.55

8 2260077.72 570350.68 2.69
9 2260079.53 570348.69 1.06
10 2260080.25 570347.91 1.91
11 2260081.59 570346.55`;
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext()).newPage(); await p.route(/^https?:/,r=>r.abort());
await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(4000);
const r=await p.evaluate(T=>{const a=LG145.parseBookText(T);const c=LG145.checkBook({points:a.points,sides:a.sides,dien_tich_m2:29.7});return {n:a.points.length,area:c.area,okArea:c.okArea,okEdge:c.okEdge,msg:c.msg}},T);
console.log(JSON.stringify(r,null,1)); await b.close();})();

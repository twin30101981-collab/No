const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path=process.argv[2];
const S1=`1 2260081.59 570346.55 0.50
2 2260081.96 570346.89 3.02
3 2260083.99 570349.13 5.59
4 2260080.98 570353.84 4.54
5 2260077.72 570350.68 1.38
6 2260076.73 570349.72 5.64
7 2260080.72 570345.74 1.19
1 2260081.59 570346.55`;
const S1plan=[[2260081.59,570346.55],[2260077.72,570350.68],[2260079.53,570348.69],[2260080.25,570347.91]];
const S2=`1 2259336.23 568027.14 2.06
2 2259334.17 568027.23 3.85
3 2259334.42 568031.07 17.58
4 2259316.85 568031.69 0.26
5 2259316.59 568031.70 4.50
6 2259316.99 568036.18 0.38
7 2259317.37 568036.15 19.32
8 2259336.65 568034.94 7.81
1 2259336.23 568027.14`;
// OCR-style noisy variant: comma decimals, merged row, missing S
const S2noisy=S2.replace(/(\d)\.(\d\d)\b/g,'$1,$2').replace('4 2259316,85','4 2259316,85');
(async()=>{
 const b=await chromium.launch(); const p=await (await b.newContext()).newPage();
 await p.route(/^https?:/,r=>r.abort());
 await p.goto('file://'+require('path').resolve(path)); await p.waitForTimeout(5000);
 const r=await p.evaluate(([S1,S2,S2noisy,S1plan])=>{
  const o={};
  const P=window.LG145&&LG145.parseBookText;
  const a=P(S1), c=P(S2), n=P(S2noisy);
  o.s1={n:a.points.length,sides:a.sides,check:LG145.checkBook({points:a.points,sides:a.sides,dien_tich_m2:29.7})};
  o.s2={n:c.points.length,check:LG145.checkBook({points:c.points,sides:c.sides,dien_tich_m2:89.9})};
  o.s2_total913=LG145.checkBook({points:c.points,sides:c.sides,dien_tich_m2:91.3}).okArea;
  o.s2noisy={n:n.points.length,sides:n.sides&&n.sides.length};
  o.calcArea_s1=calcArea(a.points); o.calcArea_s2=calcArea(c.points);
  o.lgcore=window.LGCore&&LGCore.Geometry?[LGCore.Geometry.area(a.points.map(p=>({x:p.x,y:p.y}))),Object.keys(LGCore.Geometry)]:null;
  o.plan_s1=calcArea(S1plan.map(q=>({x:q[0],y:q[1]})));
  o.tol=[calcPermissibleAreaError(29.7),calcPermissibleAreaError(89.9)];
  try{const def='+proj=tmerc +lat_0=0 +lon_0=105.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-191.90441429,-39.30318279,-111.45032835,-0.00928836,0.01975479,-0.00427372,0.252906278 +units=m +no_defs';
   o.ll1=proj4(def,'EPSG:4326',[a.points[0].y,a.points[0].x]); o.ll2=proj4(def,'EPSG:4326',[c.points[0].y,c.points[0].x]);}catch(e){o.projErr=String(e)}
  o.provinces=window.LG_PROVINCES?Object.keys(LG_PROVINCES).length:null;
  o.mo=(window.__lgMO||null);
  return o;},[S1,S2,S2noisy,S1plan]);
 console.log(JSON.stringify(r,null,1)); await b.close();})();

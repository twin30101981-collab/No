const { chromium } = require('playwright'); const path=require('path');
const APP=path.resolve(process.argv[2]), FIX=process.argv[3], OUT=process.argv[4];
async function open(b,W,H){const p=await (await b.newContext({viewport:{width:W,height:H}})).newPage();p.on('dialog',d=>d.accept());
 await p.goto('file://'+APP);await p.waitForTimeout(5000);
 await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});await p.setInputFiles('#import-file',FIX+'/20.10.2026.xlsx');
 for(let i=0;i<60;i++){await p.waitForTimeout(500);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(800);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(3500);return p;}
(async()=>{const b=await chromium.launch();const res={};
for(const [W,H] of [[1920,1080],[1600,900],[1366,768],[390,844]]){
 const p=await open(b,W,H);
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(1200);
 await p.screenshot({path:`${OUT}/dash_${W}.png`});
 const r=await p.evaluate(()=>{const q=s=>document.querySelector(s);const rect=e=>e?e.getBoundingClientRect():null;
  const tb=q('.topbar'),sb=q('#sidebar');const cs=e=>e?getComputedStyle(e):{};
  const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect();const c=getComputedStyle(e);return r.width>0&&r.height>0&&c.display!=='none'&&c.visibility!=='hidden'};
  const tbBtns=[...tb.querySelectorAll('button,a,.chip,[id$=chip],input')].filter(vis).map(e=>(e.id||e.className||e.tagName).toString().slice(0,30)+':'+(e.textContent||e.placeholder||'').trim().slice(0,18));
  const groups=[...document.querySelectorAll('#sidebar .sidebar-section')].map(e=>e.textContent.trim().slice(0,25));
  const navItems=document.querySelectorAll('#sidebar a.nav-item,#sidebar a.nav-child-item').length;
  const mbar=[...document.querySelectorAll('.td-mbar a,.td-mbar button,#td-mobile-bar a,[class*=mbar] a,[class*=mbar] button')].filter(vis).map(e=>e.textContent.trim().slice(0,12));
  return {topbarH:Math.round(rect(tb).height),topbarRows:'',tbBtns,breadcrumb:!!q('.breadcrumb,[class*=crumb]'),searchInTopbar:!!tb.querySelector('input[type=search],input[placeholder*="Tìm"]'),
   sidebar:{left:Math.round(rect(sb).left),w:Math.round(rect(sb).width),vis:rect(sb).right>0},groups,navItems,sidebarScrollH:sb.scrollHeight,
   mainML:cs(q('#main')).marginLeft,mob:cs(q('#btn-mob-menu')).display,mbar,font:cs(document.body).fontFamily.slice(0,60),numFont:cs(q('.kpi-value,.stat-value,td')||document.body).fontVariantNumeric,
   dark:!!q('[data-theme=dark]')||document.documentElement.classList.contains('dark'),themeBtn:!!q('#btn-theme,[onclick*=Theme]'),
   recon:!!q('#td-recon-strip,[id*=doisoat-strip],[id*=recon]'),warnStrip:!![...document.querySelectorAll('#page-dashboard *')].find(e=>/Cảnh báo sớm/.test(e.textContent)&&e.children.length<3),
   trendOnDash:!![...document.querySelectorAll('#page-dashboard svg')].length,dashW:Math.round(rect(q('#page-dashboard')).width),
   tblMaxW:Math.max(...[...document.querySelectorAll('#page-dashboard table')].map(t=>t.getBoundingClientRect().width)),
   sx:document.documentElement.scrollWidth>document.documentElement.clientWidth};});
 await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(1800);
 await p.screenshot({path:`${OUT}/qltd_${W}.png`});
 r.qltd=await p.evaluate(()=>{const t=document.getElementById('table-qltd'),w=t.closest('.table-wrap');const th=[...t.tHead.rows[0].cells].filter(c=>c.offsetParent);
  const sticky=th.slice(0,4).map(c=>getComputedStyle(c).position+'/'+getComputedStyle(c).left);const body=t.tBodies[0].rows[0];const bs=body?[...body.cells].slice(0,4).map(c=>getComputedStyle(c).position):[];
  const foot=!!(t.tFoot&&t.tFoot.rows.length)||!!document.querySelector('#page-qltd .total-row,#page-qltd tr.tong,#page-qltd [class*=total]');
  const preset=[...document.querySelectorAll('.td-cols-bar[data-key=qltd] [data-p]')].map(e=>e.textContent.trim()+(e.classList.contains('active')?'*':''));
  return {nvis:th.length,sw:w.scrollWidth,cw:w.clientWidth,sticky,bs,foot,preset,detailPane:!!document.querySelector('.detail-pane,[class*=drawer][class*=open],#td-detail')};});
 res[W]=r; await p.context().close();}
console.log(JSON.stringify(res,null,1));await b.close();})();

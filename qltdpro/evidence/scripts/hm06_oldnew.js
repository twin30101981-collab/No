// Chạy các ca lỗi đã xác minh trên HÀM CŨ (trích nguyên văn từ bản HM-05) và trên module mới
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');const TD=require('./td_numdate.js');
const grab=(startMarker,endMarker)=>{const i=s.indexOf(startMarker);if(i<0)throw new Error('thiếu '+startMarker);return s.slice(i,s.indexOf(endMarker,i))};
const gVN=new Function(grab('function parseVNDate(s) {\n  if (!s) return null;\n  if (s instanceof Date)','/**\n * smartDateToVN')+';return parseVNDate;')();
const t5=grab('  function parseVNDate(s){\n    if(!s) return null;\n    s=String(s).trim();\n    var m=s.match(/(\\d{1,2})','// ---------- 1) Detect');
const t5f=new Function(t5+';return {parseVNDate:parseVNDate,parseNum:parseNum};')();
const gd=new Function(grab('  function groupDigits(s) {','  function enhanceMoneyInputs')+';return groupDigits;')();
const iso=d=>d?d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2):null;
const rows=[
 ['parseNum("300,000,000")',t5f.parseNum('300,000,000'),TD.num.toNumber('300,000,000'),300000000],
 ['parseNum("1,234,567.5")',t5f.parseNum('1,234,567.5'),TD.num.toNumber('1,234,567.5'),1234567.5],
 ['parseNum("300.000.000")',t5f.parseNum('300.000.000'),TD.num.toNumber('300.000.000'),300000000],
 ['TDUP5 ngày "2026-05-31"',iso(t5f.parseVNDate('2026-05-31')),iso(TD.date.find('2026-05-31')),'2026-05-31'],
 ['ngày "31/02/2026"',iso(gVN('31/02/2026')),iso(TD.date.parse('31/02/2026')),null],
 ['ngày "2026-02-31"',iso(gVN('2026-02-31')),iso(TD.date.parse('2026-02-31')),null],
 ['groupDigits(1234567.89)',gd(1234567.89),TD.num.groupVND(1234567.89),'1.234.568'],
];
let bad=0;console.log('Ca | hàm cũ | module mới | mong đợi');
for(const [n,o,nw,e] of rows){const okOld=Object.is(o,e),okNew=Object.is(nw,e);if(!okNew)bad++;console.log(`${n} | ${o} ${okOld?'(đúng)':'(SAI)'} | ${nw} ${okNew?'(đúng)':'(SAI)'} | ${e}`)}
process.exit(bad?1:0);

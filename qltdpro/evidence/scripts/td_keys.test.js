const TD=require('./td_keys.js');const K=TD.keys;let p=0,f=0;const ok=(n,c,x)=>{if(c)p++;else{f++;console.log('FAIL',n,x)}};
const E=(key,o)=>Object.assign({key,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false},o||{});
ok('Ctrl+S',K.route(E('s',{ctrlKey:true}))==='save');ok('Cmd+S',K.route(E('S',{metaKey:true}))==='save');ok('Ctrl+Shift+S không chặn',K.route(E('s',{ctrlKey:true,shiftKey:true}))===null);
ok('Ctrl+E',K.route(E('e',{ctrlKey:true}))==='export');ok('Ctrl+K',K.route(E('k',{ctrlKey:true}))==='palette');ok('Ctrl+Shift+K',K.route(E('K',{ctrlKey:true,shiftKey:true}))==='palette');
ok('Ctrl+L không chặn',K.route(E('l',{ctrlKey:true}))===null);ok('s không Ctrl',K.route(E('s'))===null);ok('Alt+Ctrl+S bỏ qua',K.route(E('s',{ctrlKey:true,altKey:true}))===null);ok('null',K.route(null)===null);
ok('exportPlan qltd',K.exportPlan('qltd')[0]==='exportQltdExcel');ok('exportPlan denhan',K.exportPlan('denhan').join()==='exportTableExcel,denhan,Đến hạn');ok('exportPlan tsbd',K.exportPlan('tsbd')[0]==='tsbdExportExcel');ok('exportPlan dashboard null',K.exportPlan('dashboard')===null);
console.log('PASS',p,'FAIL',f);process.exit(f?1:0);

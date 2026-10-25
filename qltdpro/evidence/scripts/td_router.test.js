const TD=require('./td_router.js');const R=TD.router;let p=0,f=0;const ok=(n,c,x)=>{if(c)p++;else{f++;console.log('FAIL',n,x)}};
ok('slug qltd',R.slug('qltd')==='du-no');ok('slug lạ giữ nguyên',R.slug('abc')==='abc');
ok('parse du-no',R.parse('#/du-no')==='qltd');ok('parse tong-quan',R.parse('#/tong-quan')==='dashboard');ok('parse dư dấu /',R.parse('#/tai-san/')==='tsbd');
ok('parse sai',R.parse('')===null&&R.parse('#abc')===null&&R.parse('#/Ab C')===null&&R.parse(null)===null);
ok('hash',R.hash('doisoat')==='#/doi-soat');
['dashboard','qltd','kd','td','qcamco','denhan','laidong','chlm','tranop','phidv','khmoi','hdv','baocao','bckh','ctkh','tsbd','giadat','doisoat','archive','macb','hsvv','hmtd','tieudung','camco','fhs'].forEach(n=>ok('khứ hồi '+n,R.parse(R.hash(n))===n,n));
let c=0;R.onPageEnter('x',()=>c++);R.onPageEnter('*',()=>c++);R.fire('x');ok('hook theo trang + *',c===2,c);R.onPageEnter('y',()=>{throw new Error('x')});R.fire('y');ok('hook lỗi không phá',true);
console.log('PASS',p,'FAIL',f);process.exit(f?1:0);

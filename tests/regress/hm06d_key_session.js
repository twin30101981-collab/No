// HM-06d — chế độ khoá "chỉ trong phiên": bật → xoá mọi bản lâu dài; lựa chọn nhớ bền; tab mới không dùng lại khoá cũ.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const url = 'file://' + path.resolve(process.argv[2]);
  await p.goto(url); await p.waitForTimeout(3000);
  // khoá cũ lưu lâu dài (IndexedDB + localStorage)
  await p.evaluate(async () => { localStorage.setItem('claude_api_key', 'OLD-LS'); await LGCore.DataStore.put('settings', { key: 'apikey:gemini_api_key', value: 'OLD-IDB', at: 1 }); });
  await p.reload(); await p.waitForTimeout(3000);
  // bật chế độ phiên và lưu khoá mới qua đúng nút giao diện
  await p.evaluate(() => { openKeyModal(); document.getElementById('chk-key-session-only').checked = true;
    document.getElementById('input-custom-api-key').value = 'SESS-KEY'; document.getElementById('btn-save-key').click(); });
  await p.waitForTimeout(800);
  const r1 = await p.evaluate(async () => ({ idb: await LGCore.DataStore.get('settings', 'apikey:gemini_api_key'), idb2: await LGCore.DataStore.get('settings', 'apikey:claude_api_key'),
    ls: localStorage.getItem('claude_api_key'), ls2: localStorage.getItem('gemini_api_key'), pref: localStorage.getItem('landgis_key_session_pref'), cur: lgKeyGet('gemini_api_key') }));
  // tab mới cùng trình duyệt: sessionStorage rỗng nhưng lựa chọn vẫn nhớ, không dùng lại khoá cũ
  const p2 = await ctx.newPage(); await p2.route(/^https?:/, r => r.abort()); await p2.goto(url); await p2.waitForTimeout(3000);
  const r2 = await p2.evaluate(async () => ({ mode: lgKeySessionOnly(), gem: lgKeyGet('gemini_api_key'), cl: lgKeyGet('claude_api_key'), idb: await LGCore.DataStore.get('settings', 'apikey:gemini_api_key') }));
  const ok = report('hm06d_key_session', {
    bat_che_do_phien_xoa_ban_lau_dai: !r1.idb && !r1.idb2 && !r1.ls && !r1.ls2 && r1.cur === 'SESS-KEY',
    lua_chon_duoc_nho_ben: r1.pref === '1' && r2.mode === true,
    tab_moi_khong_dung_lai_khoa_cu: r2.gem === '' && r2.cl === '' && !r2.idb }, { r1, r2 });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

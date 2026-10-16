// HM-08h — truy cập: 0 nút không tên, 0 ô nhập không nhãn, tiêu đề không nhảy cấp, 0 onclick nội dòng (bộ uỷ quyền data-lg-call hoạt động).
const { open, report } = require('../lib'); const fs = require('fs'), path = require('path');
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8'); const { b, p, errs } = await open(process.argv[2]);
  await p.evaluate(() => { const bt = Array.from(document.querySelectorAll('.lg103-dbtn')); bt.forEach(x => x.click()); }); await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => { const o = { btn: [], inp: [], hd: [] };
    const nameB = b => !!(b.getAttribute('aria-label') || b.getAttribute('aria-labelledby') || b.getAttribute('title') || (b.textContent || '').replace(/\s+/g, '').length || b.querySelector('img[alt]:not([alt=""])'));
    const lab = i => !!(i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || i.getAttribute('title') || (i.id && document.querySelector('label[for="' + CSS.escape(i.id) + '"]')) || i.closest('label'));
    document.querySelectorAll('button,[role=button]').forEach(b => { if (!nameB(b)) o.btn.push(b.id || b.className); });
    document.querySelectorAll('input,select,textarea').forEach(i => { if (i.type !== 'hidden' && !['button', 'submit'].includes(i.type) && !lab(i)) o.inp.push(i.id || i.type); });
    let prev = 0; document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => { const l = +(h.getAttribute('aria-level') || h.tagName[1]); if (prev && l > prev + 1) o.hd.push('h' + prev + '→' + l); prev = l; });
    o.onclickDom = document.querySelectorAll('[onclick]').length;
    // hành vi: nút tab cũ, mở/đóng hộp khoá AI qua data-lg-call
    const tabBtn = document.createElement('button'); tabBtn.setAttribute('data-lg-call', 'switchTab'); tabBtn.setAttribute('data-lg-arg', 'tab-qr'); tabBtn.setAttribute('data-lg-this', '1'); document.body.appendChild(tabBtn); tabBtn.click(); await new Promise(r => setTimeout(r, 300)); o.tab = document.getElementById('tab-qr').classList.contains('active'); tabBtn.remove();
    openKeyModal(); await new Promise(r => setTimeout(r, 300)); const km = document.getElementById('modal-key-config') || document.querySelector('.modal.open, [id*=key-modal]'); const closeBtn = document.querySelector('[data-lg-call="closeKeyModal"]');
    o.keyOpen = !!closeBtn; closeBtn.click(); await new Promise(r => setTimeout(r, 300)); o.keyClosed = (typeof isKeyModalOpen === 'function') ? !isKeyModalOpen() : true;
    return o; });
  const ok = report('hm08h_a11y', { khong_nut_thieu_ten: r.btn.length === 0, khong_o_nhap_thieu_nhan: r.inp.length === 0, tieu_de_khong_nhay_cap: r.hd.length === 0, khong_onclick_trong_nguon: !/\sonclick=/.test(src), khong_onclick_trong_dom: r.onclickDom === 0,
    bo_uy_quyen_chuyen_tab: r.tab, bo_uy_quyen_dong_hop: r.keyOpen && r.keyClosed, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();

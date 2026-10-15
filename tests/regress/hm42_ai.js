// HM-42 — một lần gọi AI/ảnh, lời nhắc theo loại trang, structured outputs (Claude), khối phụ, độ tin cậy từng số, giáp ranh có cấu trúc.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    window.lgIsOpaqueLocalOrigin = () => false;
    const out = {}; const reqs = [];
    const pt = (t, x, y, cx, cy) => ({ ten: t, x, y, s: 5.5, do_tin_cay_x: cx, do_tin_cay_y: cy });
    const aiJson = { loai_trang: 'so_do', co_bang_toa_do: true, so_thua: '12', to_ban_do: '5', dien_tich_tong_m2: 36.8, tin_cay: { dien_tich_tong_m2: 0.85, so_thua: 0.99 },
      diem_moc: [pt('1', 2259336.23, 600100.5, 0.99, 0.99), pt('2', 2259340.1, 600110.2, 0.99, 0.7), pt('3', 2259330.1, 600112.2, 0.97, 0.98), pt('4', 2259326.5, 600102.2, 0.98, 0.98), pt('5', 2259326.1, 600101.2, 0.98, 0.98), pt('6', 2259327.1, 600100.2, 0.98, 0.98), pt('7', 2259330.1, 600099.2, 0.98, 0.98)],
      khoi_phu: [{ ten: 'Khối phụ', dien_tich_m2: 7.1, diem_moc: [pt('A', 2259350.1, 600120.2, 0.95, 0.95), pt('B', 2259352.1, 600121.2, 0.95, 0.95), pt('C', 2259351.1, 600123.2, 0.95, 0.95), pt('D', 2259349.1, 600122.2, 0.95, 0.95)] }],
      giap_ranh: [{ huong: 'bac', doi_tuong: 'Thửa 13', do_tin_cay: 0.9 }, { huong: 'nam', doi_tuong: 'Đường', do_tin_cay: 0.9 }], giap_ranh_dong: 'Thửa 11' };
    const realFetch = window.fetch;
    window.fetch = async (u, o) => { const body = o && o.body ? JSON.parse(o.body) : null; reqs.push({ u: String(u), body });
      if (/anthropic/.test(u)) return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(aiJson) }] }), { status: 200 });
      if (/generativelanguage/.test(u)) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(aiJson) }] } }] }), { status: 200 });
      return realFetch(u, o); };
    // Gemini
    try { localStorage.setItem('gemini_api_key', 'G'); lgKeySet('gemini_api_key', 'G'); lgKeySet('landgis_ai_provider_mode', 'gemini'); } catch (e) {}
    const r1 = await callGemini25FlashAPI('AAAA');
    out.geminiCalls = reqs.filter(q => /generativelanguage/.test(q.u)).length;
    out.promptByPage = /loai_trang/.test(reqs[0].body.contents[0].parts[0].text) && /khoi_phu/.test(reqs[0].body.contents[0].parts[0].text);
    out.nMain = r1.diem_moc.length; out.nPhu = (r1.khoi_phu[0] || {}).diem_moc ? r1.khoi_phu[0].diem_moc.length : -1;
    out.minConf = r1.diem_moc[1].do_tin_cay; out.review = r1.so_phai_ra_soat;
    out.gr = ['bac', 'dong', 'nam', 'tay'].map(d => r1['giap_ranh_' + d] || null); out.grStruct = r1.giap_ranh.length;
    // trang bổ sung dùng cùng 1 lần gọi
    reqs.length = 0; await callGeminiSupplementAPI('AAAA'); out.supplementCalls = reqs.length;
    // Claude: structured outputs
    reqs.length = 0; lgKeySet('landgis_ai_provider_mode', 'claude'); lgKeySet('claude_api_key', 'sk-ant-x'); localStorage.setItem('claude_api_key', 'sk-ant-x');
    const r2 = await callGemini25FlashAPI('AAAA'); const cq = reqs.find(q => /anthropic/.test(q.u));
    out.claudeCalls = reqs.length; const fmt = cq && cq.body.output_config && cq.body.output_config.format;
    out.schema = !!fmt && fmt.type === 'json_schema' && fmt.schema.additionalProperties === false && !!fmt.schema.properties.khoi_phu && !!fmt.schema.properties.giap_ranh;
    out.claudeMain = r2.diem_moc.length; out.dbg = JSON.stringify(cq && cq.body && Object.keys(cq.body)) + JSON.stringify(fmt && Object.keys(fmt));
    // UI rà soát: 80–90% tô vàng
    sodoCoords = [{ ten: '1', x: 1, y: 2, aiConf: 0.85 }, { ten: '2', x: 1, y: 2, aiConf: 0.99 }, { ten: '3', x: 1, y: 2, aiConf: 0.5 }];
    renderSodoList(); const el = document.getElementById('sodo-list');
    out.yellow = el ? el.querySelectorAll('.lg-review').length : -1; out.html = el ? el.innerHTML.length : -1;
    window.fetch = realFetch; return out; });
  const ok = report('hm42_ai', {
    mot_lan_goi: r.geminiCalls === 1 && r.supplementCalls === 1 && r.claudeCalls === 1,
    loi_nhac_theo_trang: r.promptByPage,
    khoi_chinh_7_phu_4: r.nMain === 7 && r.nPhu === 4 && r.claudeMain === 7,
    tin_cay_tung_so: r.minConf === 0.7 && r.review.includes('mốc 2') && r.review.includes('dien_tich_tong_m2'),
    giap_ranh_cau_truc: r.gr.join('|') === 'Thửa 13|Thửa 11|Đường|' && r.grStruct === 3,
    structured_outputs_claude: r.schema,
    to_vang_duoi_90: r.yellow === 1 }, { r });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

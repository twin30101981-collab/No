// HM-10 — danh mục model AI một chỗ: mặc định Opus 5.5, bỏ ID cũ, 404 → model kế + báo, stop_reason, structured outputs, khoá Gemini qua header.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const out = {}; const reqs = [];
    const html = document.documentElement.outerHTML;
    out.noOldIds = !/claude-haiku-3-5|claude-haiku-4-5|"claude-sonnet-5"/.test(html.replace(/<script[\s\S]*?<\/script>/g, m => m)) ? true : false;
    out.src = typeof LG_AI_MODELS !== 'undefined';
    localStorage.removeItem('landgis_claude_model'); try { localStorage.setItem('landgis_claude_model', 'claude-haiku-4-5-20251001'); } catch (e) {}
    out.defaultModel = getActiveClaudeModel();
    out.opts = [...document.querySelectorAll('#select-claude-model option')].map(o => o.value);
    const realFetch = window.fetch; const w = (body, status) => new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
    let mode = '404first';
    window.fetch = async (u, o) => { const body = o && o.body ? JSON.parse(o.body) : null; reqs.push({ u: String(u), h: o && o.headers, body });
      if (/anthropic/.test(u)) {
        if (mode === '404first' && body.model === 'claude-opus-5-5') return w({ error: { type: 'not_found_error', message: 'model: claude-opus-5-5' } }, 404);
        if (mode === 'maxtok') return w({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"a":' }] });
        if (mode === 'refusal') return w({ stop_reason: 'refusal', content: [] });
        return w({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"ok":true}' }] });
      }
      if (/generativelanguage/.test(u)) return w({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] });
      return realFetch(u, o); };
    localStorage.setItem('claude_api_key', 'sk-ant-test');
    try { lgKeySet && lgKeySet('claude_api_key', 'sk-ant-test'); } catch (e) {}
    window.lgIsOpaqueLocalOrigin = () => false; const TINY = 'iVBORw0KGgo=';
    const j1 = await callClaudeVisionJSON('x', TINY, { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false });
    const claudeReqs = reqs.filter(q => /anthropic/.test(q.u));
    out.fallbackModels = claudeReqs.map(q => q.body.model); out.j1 = j1;
    const last = claudeReqs[claudeReqs.length - 1].body;
    out.maxTokens = last.max_tokens; out.noTemp = !('temperature' in last); out.hasSchema = !!(last.output_config && last.output_config.format && last.output_config.format.type === 'json_schema');
    out.fallbackNoted = (window.__lgClaudeFallbackNotes || []).length === 1;
    mode = 'maxtok'; try { await callClaudeVisionJSON('x', TINY); out.maxtok = 'no-error'; } catch (e) { out.maxtok = e.message; }
    mode = 'refusal'; try { await callClaudeVisionJSON('x', TINY); out.refusal = 'no-error'; } catch (e) { out.refusal = e.message; }
    // Gemini: khoá qua header, không nằm trong URL
    const g = reqs.length; try { await callGeminiVisionOnce('gemini-2.5-flash', 'GKEY123', { contents: [] }); } catch (e) {}
    const gr = reqs.slice(g).find(q => /generativelanguage/.test(q.u)) || {};
    out.geminiHeader = gr.h && gr.h['x-goog-api-key'] === 'GKEY123'; out.geminiUrlClean = gr.u && !/key=/.test(gr.u);
    window.fetch = realFetch; return out; });
  const ok = report('hm10_models', {
    mac_dinh_opus: r.defaultModel === 'claude-opus-5-5' && r.opts[0] === 'claude-opus-5-5' && r.opts.length === 3,
    id_cu_da_bo: r.noOldIds,
    "404_chuyen_model_ke_va_bao": r.fallbackModels.join() === 'claude-opus-5-5,claude-sonnet-5-5' && r.fallbackNoted && r.j1 && r.j1.ok === true,
    max_tokens_16000_khong_temperature: r.maxTokens === 16000 && r.noTemp,
    structured_outputs: r.hasSchema,
    stop_reason_max_tokens: /max_tokens/.test(r.maxtok),
    stop_reason_refusal: /từ chối/.test(r.refusal),
    gemini_header: r.geminiHeader && r.geminiUrlClean }, { r });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();

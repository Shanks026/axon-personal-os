// run via run_script: eval(await readFile('tools/gen-canvas.js'))
(async () => {
  const ALL = JSON.parse(await readFile('screens.json'));
  const PAGES = JSON.parse(await readFile('pages.json'));
  for (const pg of PAGES) {
  const screens = ALL.filter(s => pg.ids.includes(s.id));
  const L = '--bg:#ffffff;--card:#ffffff;--muted:#f5f5f5;--hover:#efefef;--border:#e7e7e7;--border2:#d4d4d4;--fg:#1d1d1f;--mfg:#6e6e73;--faint:#aeaeb2;--primary:#1d1d1f;--pfg:#ffffff;--destr:#ff3b30;--ok:#34c759;--warn:#ff9500;--review:#af52de;--sidebar:#f7f7f6;--overlay:rgba(0,0,0,.22);';
  const D = '--bg:#0b0b0b;--card:#1a1a1a;--muted:#222222;--hover:#2c2c2e;--border:#2c2c2e;--border2:#3a3a3c;--fg:#f5f5f7;--mfg:#98989d;--faint:#636366;--primary:#f5f5f7;--pfg:#1d1d1f;--destr:#ff453a;--ok:#30d158;--warn:#ff9f0a;--review:#bf5af2;--sidebar:#131313;--overlay:rgba(0,0,0,.6);';
  const A = { thmp: ['#007aff', '#0a84ff'], global: ['#1d1d1f', '#f5f5f7'], personal: ['#34c759', '#30d158'], side: ['#af52de', '#bf5af2'] };
  const frame = (s, dark) => {
    const a = A[s.acc || 'thmp'][dark ? 1 : 0];
    const vars = (dark ? D : L) + `--accent:${a};--accent-soft:${a}${dark ? '2e' : '17'}`;
    const w = s.w || 1440;
    const sh = dark ? '0 0 0 1px rgba(0,0,0,.25),0 20px 50px rgba(0,0,0,.2)' : '0 0 0 1px rgba(0,0,0,.06),0 20px 50px rgba(0,0,0,.08)';
    const props = (s.props || '') + (dark ? ' dark="{{ true }}"' : '');
    return `<div style="flex-shrink:0;width:${w}px;height:${s.h}px;border-radius:${w < 500 ? 36 : 12}px;overflow:hidden;box-shadow:${sh};${vars}"><dc-import name="${s.dc}" style="width:100%;height:100%" ${props} hint-size="${w}px,${s.h}px"></dc-import></div>`;
  };
  const rows = screens.map(s => {
    const frames = s.items ? s.items.map(it => frame({ ...s, ...it }, !!it.dark)).join('\n') : (s.single ? frame(s, false) : frame(s, false) + '\n' + frame(s, true));
    return `<div id="s${s.id}" data-screen-label="${s.id} ${s.name}" style="display:flex;flex-direction:column;gap:16px">
<div style="display:flex;align-items:baseline;gap:12px;white-space:nowrap"><span style="font-family:Geist Mono,monospace;font-size:14px;color:#6c6c76">${s.id}</span><span style="font-size:24px;font-weight:600">${s.name}</span>${s.note ? `<span style="font-size:15px;color:#6c6c76">${s.note}</span>` : ''}</div>
<div style="display:flex;gap:40px;align-items:flex-start">${frames}</div></div>`;
  }).join('\n');
  const toc = PAGES.map(p => `<a href="${p.file}" style="font-size:14px;text-decoration:none;white-space:nowrap;padding:6px 12px;border-radius:8px;${p.file===pg.file?'background:#18181b;color:#fafafa':'background:#fff;color:#3f3f46'}">${p.title}</a>`).join('') + '<a href="Axon Foundations.dc.html" style="font-size:14px;text-decoration:none;white-space:nowrap;padding:6px 12px;border-radius:8px;background:#fff;color:#3f3f46">Foundations</a><span style="width:24px"></span>' + screens.map(s => `<a href="#s${s.id}" style="font-size:14px;color:#3f3f46;text-decoration:none;white-space:nowrap"><span style="font-family:Geist Mono,monospace;color:#a0a0aa;margin-right:6px">${s.id}</span>${s.name}</a>`).join('');
  const body = `<helmet>
<meta name="design_doc_mode" content="canvas">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&amp;family=Geist+Mono:wght@400;500&amp;display=swap">
<style>body{margin:0;background:#f0f0f0}a{color:#3b6fe0}a:hover{color:#2a55b8}</style>
</helmet>
<div style="width:max-content;padding:80px;display:flex;flex-direction:column;gap:96px;font-family:Geist,system-ui,sans-serif;color:#18181b">
<div style="display:flex;flex-direction:column;gap:12px;max-width:2920px">
<div style="font-size:44px;font-weight:600;letter-spacing:-0.03em">Axon — ${pg.title}</div>
<div style="font-size:16px;color:#6c6c76">Desktop 1440 · light and dark side by side · mobile 390. Tokens, motion and components: <a href="Axon Foundations.dc.html">Axon Foundations</a>.</div>
<div style="display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:8px">${toc}</div>
</div>
${rows}
</div>`;
  let h = await readFile('Axon Screens.dc.html');
  const i = h.indexOf('<x-dc>') + 6, j = h.indexOf('</x-dc>');
  h = h.slice(0, i) + '\n' + body + '\n' + h.slice(j);
  await saveFile(pg.file, h);
  log('ok', pg.file, screens.length);
  }
})();

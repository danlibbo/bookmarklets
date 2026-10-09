(() => {
  // Self-contained UI; no external styles, scripts or server requests.
  function selectedText() {
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName) && typeof active.selectionStart === 'number') {
      return active.value.slice(active.selectionStart, active.selectionEnd);
    }
    return window.getSelection()?.toString() || '';
  }
  function toolPanel(id, title, contents) {
    const old = document.getElementById(id);
    old?.bookmarkletCleanup?.();
    old?.remove();
    const host = document.createElement('div');
    host.id = id;
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{color-scheme:light}*{box-sizing:border-box}section{pointer-events:auto;position:fixed;bottom:18px;right:18px;width:min(460px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow:auto;padding:20px;border:1px solid #bbc9d1;border-radius:12px;background:#fff;color:#172b37;box-shadow:0 8px 40px #0004;font:14px/1.5 system-ui,sans-serif}header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}h2{font-size:20px;line-height:1.25;margin:0}p{margin:10px 0;color:#506575}button,input,textarea,select{font:inherit;color:#172b37}button{cursor:pointer;padding:8px 12px;border:1px solid #b9c8cf;border-radius:7px;background:#f5f8f7}button:hover{background:#e5efeb}button.primary{background:#005e58;color:white;border-color:#005e58}button:disabled{opacity:.5;cursor:default}button.close{padding:2px 9px;font-size:22px;background:white}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #d19a21;outline-offset:2px}label{display:block;margin:10px 0 5px;font-weight:600}input:not([type=checkbox]),textarea,select{display:block;width:100%;padding:8px;border:1px solid #bac9d0;border-radius:6px;background:#fff}textarea{font:12px/1.5 ui-monospace,monospace;resize:vertical;min-height:80px}.row{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.check{font-weight:400;margin:8px 0}.check input{margin-right:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f6f5;padding:10px;border-radius:6px;font:12px/1.6 ui-monospace,monospace}small{color:#506575}.status{min-height:20px;overflow-wrap:anywhere;font-size:13px;color:#005e58}[hidden]{display:none!important}
    </style><section role="region" aria-label="${title}"><header><h2>${title}</h2><button type="button" class="close" aria-label="Close tool">×</button></header>${contents}<p class="status" role="status" aria-live="polite"></p></section>`;
    document.documentElement.appendChild(host);
    const status = message => { root.querySelector('.status').textContent = message; };
    let cleanup = () => {};
    const close = () => { cleanup(); host.remove(); };
    host.bookmarkletCleanup = () => cleanup();
    root.querySelector('.close').addEventListener('click', close);
    return { host, root, status, close, onClose: callback => { cleanup = callback; } };
  }
  async function copyText(text, ui) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Unavailable');
      await navigator.clipboard.writeText(text);
      ui.status('Copied to clipboard.');
      return true;
    } catch (error) {
      const field = document.createElement('textarea');
      field.value = text;
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      ui.root.querySelector('section').appendChild(field);
      field.focus(); field.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (copyError) { /* Manual fallback. */ }
      field.remove();
      if (copied) ui.status('Copied to clipboard.');
      else {
        const output = ui.root.querySelector('[data-output]');
        if (output) { output.value = text; output.focus(); output.select(); ui.status('Copy was blocked. The output is selected; press Ctrl+C or Command+C.'); }
        else { prompt('Copy this text:', text); ui.status('Copy the text from the prompt.'); }
      }
      return copied;
    }
  }

  const initial = selectedText();
  const ui = toolPanel('bm-clean-text', 'Clean text', `
    <p>Select text before running, or paste it below.</p>
    <label for="input">Input</label><textarea id="input" rows="5"></textarea>
    <label class="check"><input id="lines" type="checkbox" checked>Remove repeated blank lines</label>
    <label class="check"><input id="single" type="checkbox">Join lines into one paragraph</label>
    <label for="output">Plain-text output</label><textarea id="output" data-output rows="5" readonly></textarea>
    <div class="row"><button class="primary" id="copy">Copy clean text</button></div>`);
  const input = ui.root.querySelector('#input');
  const output = ui.root.querySelector('#output');
  input.value = initial;
  function clean() {
    let text = input.value.replace(/\r\n?/g, '\n').replace(/[\u00a0\u202f]/g, ' ').replace(/\u200b|\ufeff/g, '');
    text = text.split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).join('\n').trim();
    if (ui.root.querySelector('#lines').checked) text = text.replace(/\n{3,}/g, '\n\n');
    if (ui.root.querySelector('#single').checked) text = text.replace(/\n+/g, ' ');
    output.value = text;
  }
  input.addEventListener('input', clean);
  ui.root.querySelectorAll('input[type=checkbox]').forEach(control => control.addEventListener('change', clean));
  ui.root.querySelector('#copy').addEventListener('click', () => copyText(output.value, ui));
  clean();

})();

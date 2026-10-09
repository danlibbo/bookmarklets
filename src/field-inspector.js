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

  const ui = toolPanel('bm-field-inspector', 'Field inspector', `
    <p>Choose Pick element, then click a field, label or page element. Press Escape to stop picking.</p>
    <div class="row"><button id="pick" class="primary">Pick element</button><button id="selector-copy">Copy selector</button><button id="details-copy">Copy details</button></div>
    <label for="output">Element details</label><textarea id="output" data-output readonly rows="12"></textarea>`);
  const output = ui.root.querySelector('#output');
  const highlight = document.createElement('div');
  highlight.style.cssText = 'position:fixed;border:2px solid #008b80;background:#008b801a;pointer-events:none;display:none';
  ui.root.appendChild(highlight);
  let picking = false, hovered = null, selected = null, selector = '', details = '';
  function selectorFor(element) {
    const scope = element.getRootNode();
    const unique = text => { try { return scope.querySelectorAll(text).length === 1; } catch (error) { return false; } };
    const segments = [];
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      if (node.id) {
        const id = '#' + CSS.escape(node.id);
        if (unique(id)) { segments.unshift(id); break; }
      }
      let segment = node.localName;
      const siblings = node.parentElement ? [...node.parentElement.children].filter(sibling => sibling.localName === node.localName) : [];
      if (siblings.length > 1) segment += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
      segments.unshift(segment);
      if (unique(segments.join(' > '))) break;
    }
    return segments.join(' > ');
  }
  function inspect(element) {
    selected = element;
    selector = selectorFor(element);
    const labelTexts = element.labels ? [...element.labels].map(label => label.innerText.trim()) : [];
    const labelledBy = (element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map(id => element.getRootNode().getElementById?.(id)?.textContent.trim()).filter(Boolean);
    const report = {
      tag: element.localName, id: element.id || null, name: element.getAttribute('name'), type: element.getAttribute('type'),
      labels: labelTexts, ariaLabel: element.getAttribute('aria-label'), ariaLabelledByText: labelledBy,
      placeholder: element.getAttribute('placeholder'), role: element.getAttribute('role'),
      required: element.required === true || element.getAttribute('aria-required') === 'true',
      disabled: element.disabled === true || element.getAttribute('aria-disabled') === 'true',
      readOnly: element.readOnly === true, autocomplete: element.getAttribute('autocomplete'),
      selector, matches: element.getRootNode().querySelectorAll(selector).length,
      selectorScope: element.getRootNode() instanceof ShadowRoot ? 'Inside this element’s shadow root' : 'Current document'
    };
    if (element.tagName === 'SELECT') report.options = [...element.options].map(option => option.textContent.trim());
    details = JSON.stringify(report, null, 2);
    output.value = details;
    ui.status('Element inspected. Selector copied separately with Copy selector.');
  }
  function draw() {
    const element = picking ? hovered : selected;
    if (!element?.isConnected) { highlight.style.display = 'none'; return; }
    const rect = element.getBoundingClientRect();
    Object.assign(highlight.style, { display: 'block', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
  }
  const own = event => event.composedPath().includes(ui.host);
  function move(event) { if (!picking || own(event)) return; hovered = event.composedPath().find(node => node instanceof Element); draw(); }
  function click(event) {
    if (!picking || own(event)) return;
    const element = event.composedPath().find(node => node instanceof Element);
    if (!element) return;
    event.preventDefault(); event.stopImmediatePropagation();
    picking = false; inspect(element); draw();
    ui.root.querySelector('#pick').textContent = 'Pick another element';
  }
  function key(event) { if (event.key === 'Escape') { picking = false; hovered = null; draw(); ui.status('Picking stopped.'); } }
  document.addEventListener('pointermove', move, true);
  document.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  window.addEventListener('scroll', draw, true); window.addEventListener('resize', draw);
  ui.onClose(() => { document.removeEventListener('pointermove', move, true); document.removeEventListener('click', click, true); document.removeEventListener('keydown', key, true); window.removeEventListener('scroll', draw, true); window.removeEventListener('resize', draw); });
  ui.root.querySelector('#pick').addEventListener('click', () => { picking = true; ui.status('Click a page element.'); });
  ui.root.querySelector('#selector-copy').addEventListener('click', () => selector ? copyText(selector, ui) : ui.status('Pick an element first.'));
  ui.root.querySelector('#details-copy').addEventListener('click', () => details ? copyText(details, ui) : ui.status('Pick an element first.'));

})();

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

  const old = document.getElementById('bm-screenshot-tidy');
  if (old) { old.bookmarkletCleanup?.(); old.remove(); return; }
  const ui = toolPanel('bm-screenshot-tidy', 'Screenshot tidy', `
    <p>Automatically cover detectable personal details with opaque masks.</p>
    <label class="check"><input id="emails" type="checkbox" checked>Email addresses</label>
    <label class="check"><input id="phones" type="checkbox" checked>Likely phone numbers</label>
    <label class="check"><input id="names" type="checkbox" checked>Names found in labelled fields and columns</label>
    <label for="extra">Additional names / text to cover (one per line)</label><textarea id="extra" rows="2"></textarea>
    <div class="row"><button id="scan" class="primary">Rescan</button><button id="pick">Click to cover</button><button id="undo">Undo manual cover</button></div>
    <div class="row"><button id="hide">Hide controls for 15 seconds</button><button id="restore">Restore page</button></div>
    <small>Review before capturing. Unlabelled names, images, canvas content and embedded frames can be missed. Masks only change the display; underlying page data remains. Escape or running this bookmarklet again restores the page.</small>`);
  const maskLayer = document.createElement('div');
  maskLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:-1;overflow:hidden';
  ui.root.appendChild(maskLayer);
  const highlight = document.createElement('div');
  highlight.style.cssText = 'position:fixed;border:2px solid #e38a18;pointer-events:none;display:none';
  ui.root.appendChild(highlight);
  let auto = [], manual = [], picking = false, hovered = null, closed = false, scanTimer, showTimer, frame;
  const emailPattern = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/gi;
  const phonePattern = /(?<![\p{L}\p{N}])\+?\d[\d(). \-]{6,}\d(?![\p{L}\p{N}])/gu;
  const nameLabel = /^(?:(?:full|first|last|given|family|display|contact|patient|doctor|user)\s*name|name|patient|doctor|requester|requested by|assignee|assigned to|contact person)\s*:?(?:\s*\*)?$/i;
  const nameKey = /^(?:name|fullname|firstname|lastname|givenname|familyname|displayname|contactname|patientname|doctorname|username)$/;
  const isOwn = node => node === ui.host || ui.host.contains(node);
  const visible = element => {
    if (!element || isOwn(element) || element.closest('script,style,noscript,template')) return false;
    const css = getComputedStyle(element);
    return css.display !== 'none' && css.visibility !== 'hidden' && element.getClientRects().length > 0;
  };
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function scan() {
    if (closed) return;
    auto = [];
    const roots = [document.body];
    // Include accessible open shadow roots; tool UIs and frames are excluded.
    for (let i = 0; i < roots.length; i++) {
      roots[i].querySelectorAll('*').forEach(element => { if (!isOwn(element) && !element.id?.startsWith('bm-') && element.shadowRoot) roots.push(element.shadowRoot); });
    }
    const elements = new Set();
    const inferredNames = new Set();
    function cover(element, inferName = false) {
      if (!visible(element) || elements.has(element)) return;
      elements.add(element); auto.push({ element });
      const text = (element.value ?? element.innerText ?? element.textContent ?? '').trim();
      if (inferName && /^[\p{L}][\p{L}\p{M} .,'’()\-]{1,98}$/u.test(text)) inferredNames.add(text);
    }
    for (const root of roots) {
      if (ui.root.querySelector('#names').checked) {
        root.querySelectorAll('input,textarea,select,[contenteditable="true"]').forEach(control => {
          const label = [...(control.labels || [])].some(label => nameLabel.test(label.textContent.trim()));
          const key = [control.getAttribute('name'),control.id,control.getAttribute('autocomplete')].filter(Boolean).some(value => nameKey.test(value.toLowerCase().replace(/[^a-z]/g,'')));
          const aria = nameLabel.test(control.getAttribute('aria-label') || '');
          if (label || key || aria) cover(control, true);
        });
        root.querySelectorAll('.profile-full-name,[itemprop="givenName"],[itemprop="familyName"]').forEach(element => cover(element,true));
        root.querySelectorAll('table').forEach(table => {
          const rows = [...table.rows];
          let header = null, columns = [];
          for (const row of rows.slice(0,3)) {
            let index = 0;
            const found = [];
            [...row.cells].forEach(cell => { if (nameLabel.test(cell.innerText.trim())) for (let n = 0; n < (cell.colSpan || 1); n++) found.push(index + n); index += cell.colSpan || 1; });
            if (found.length) { header = row; columns = found; break; }
          }
          if (header) rows.slice(rows.indexOf(header)+1).forEach(row => {
            let index = 0;
            [...row.cells].forEach(cell => { const span = cell.colSpan || 1; if (columns.some(column => column >= index && column < index+span)) cover(cell,true); index += span; });
          });
        });
        root.querySelectorAll('dt,label,th,[role="rowheader"]').forEach(label => {
          if (!nameLabel.test(label.innerText.trim())) return;
          if (label.control) { cover(label.control,true); return; }
          const next = label.nextElementSibling;
          if (next && (label.tagName !== 'TH' || next.tagName === 'TD')) cover(next,true);
        });
      }
    }
    const extra = ui.root.querySelector('#extra').value.split('\n').map(value=>value.trim()).filter(Boolean);
    const phrases = [...new Set([...extra,...inferredNames])].sort((a,b)=>b.length-a.length);
    const phraseRegex = phrases.length ? new RegExp(phrases.map(escapeRegex).join('|'),'giu') : null;
    function matches(text) {
      const intervals = [];
      const add = (regex, validator = () => true) => {
        regex.lastIndex = 0;
        for (const match of text.matchAll(regex)) if (validator(match[0])) intervals.push([match.index,match.index+match[0].length]);
      };
      if (ui.root.querySelector('#emails').checked) add(emailPattern);
      if (ui.root.querySelector('#phones').checked) add(phonePattern, value => {
        const digits = value.replace(/\D/g,'');
        return digits.length >= 8 && digits.length <= 15 && !/^\d{4}-\d{2}-\d{2}(?: +\d{2})?$/.test(value) && !/^\d{2}[/.]\d{2}[/.]\d{4}$/.test(value);
      });
      if (ui.root.querySelector('#names').checked) {
        const labelled = /\b(?:Full name|First name|Last name|Patient|Doctor|Requester|Requested by|Assignee|Assigned to|Contact name|Name)\s*:\s*([\p{L}][\p{L}\p{M} .,'’()\-]{1,98})/giu;
        for (const match of text.matchAll(labelled)) { const start = match.index+match[0].indexOf(match[1]); intervals.push([start,start+match[1].trimEnd().length]); }
      }
      if (phraseRegex) add(phraseRegex);
      intervals.sort((a,b)=>a[0]-b[0]);
      const merged = [];
      intervals.forEach(interval=>{ const last=merged.at(-1); if(last && interval[0]<=last[1]) last[1]=Math.max(last[1],interval[1]); else merged.push(interval); });
      return merged;
    }
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim() || !visible(node.parentElement)) continue;
        for (const [start,end] of matches(node.textContent)) auto.push({ node, start, end });
      }
      root.querySelectorAll('input,textarea').forEach(control=>{ if (visible(control) && matches(control.value || '').length) cover(control); });
    }
    ui.status(`${auto.length} automatic covers; ${manual.length} manual covers. Review names and any missed details before capturing.`);
    render();
  }
  function clippedRect(rect, element) {
    let left = Math.max(0,rect.left), top = Math.max(0,rect.top), right = Math.min(innerWidth,rect.right), bottom = Math.min(innerHeight,rect.bottom);
    for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
      const css = getComputedStyle(parent), box = parent.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(css.overflowX)) { left = Math.max(left,box.left); right = Math.min(right,box.right); }
      if (/hidden|clip|auto|scroll/.test(css.overflowY)) { top = Math.max(top,box.top); bottom = Math.min(bottom,box.bottom); }
    }
    return { left, top, width:right-left, height:bottom-top };
  }
  function render() {
    if (closed) return;
    maskLayer.replaceChildren();
    for (const item of [...auto,...manual]) {
      let rectangles, element;
      if (item.element) {
        element = item.element;
        if (!element.isConnected || !visible(element)) continue;
        rectangles = element.getClientRects();
      } else {
        if (!item.node.isConnected || item.end > item.node.length || !visible(item.node.parentElement)) continue;
        element = item.node.parentElement;
        const range = document.createRange(); range.setStart(item.node,item.start); range.setEnd(item.node,item.end); rectangles = range.getClientRects();
      }
      for (const rect of rectangles) {
        const clipped = clippedRect(rect,element);
        if (clipped.width <= 0 || clipped.height <= 0) continue;
        const mask = document.createElement('div');
        mask.style.cssText = `position:fixed;left:${Math.floor(clipped.left)-1}px;top:${Math.floor(clipped.top)-1}px;width:${Math.ceil(clipped.width)+3}px;height:${Math.ceil(clipped.height)+3}px;background:#101a2c!important;border-radius:2px;pointer-events:none`;
        maskLayer.appendChild(mask);
      }
    }
    if (picking && hovered?.isConnected) {
      const rect = hovered.getBoundingClientRect();
      Object.assign(highlight.style,{display:'block',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
    } else highlight.style.display = 'none';
  }
  function scheduleDraw() { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); }
  const own = event => event.composedPath().includes(ui.host);
  function move(event) { if (!picking || own(event)) return; hovered = event.composedPath().find(node=>node instanceof Element); scheduleDraw(); }
  function click(event) {
    if (!picking || own(event)) return;
    const element = event.composedPath().find(node=>node instanceof Element);
    if (!element || /^(HTML|BODY)$/.test(element.tagName)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    manual.push({element}); picking = false; hovered = null; scan();
  }
  function key(event) { if (event.key === 'Escape') ui.close(); }
  function scheduleScan() { clearTimeout(scanTimer); scanTimer = setTimeout(scan,250); }
  const observer = new MutationObserver(records=>{ if(records.some(record=>!isOwn(record.target))) scheduleScan(); });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['value','class','style','hidden']});
  document.addEventListener('pointermove',move,true); document.addEventListener('click',click,true); document.addEventListener('keydown',key,true); document.addEventListener('input',scheduleScan,true);
  window.addEventListener('scroll',scheduleDraw,true); window.addEventListener('resize',scheduleDraw);
  ui.onClose(()=>{ closed=true;observer.disconnect();clearTimeout(scanTimer);clearTimeout(showTimer);cancelAnimationFrame(frame);document.removeEventListener('pointermove',move,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);document.removeEventListener('input',scheduleScan,true);window.removeEventListener('scroll',scheduleDraw,true);window.removeEventListener('resize',scheduleDraw); });
  ui.root.querySelector('#scan').addEventListener('click',scan);
  ui.root.querySelectorAll('input').forEach(control=>control.addEventListener('change',scan));
  ui.root.querySelector('#extra').addEventListener('input',scheduleScan);
  ui.root.querySelector('#pick').addEventListener('click',()=>{picking=true;ui.status('Click an element to cover it.');});
  ui.root.querySelector('#undo').addEventListener('click',()=>{manual.pop();scan();});
  ui.root.querySelector('#restore').addEventListener('click',ui.close);
  ui.root.querySelector('#hide').addEventListener('click',()=>{const panel=ui.root.querySelector('section');picking=false;hovered=null;panel.hidden=true;render();clearTimeout(showTimer);showTimer=setTimeout(()=>{panel.hidden=false;},15000);});
  scan();

})();

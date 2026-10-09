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

  const ui = toolPanel('bm-table-to-excel', 'Table to Excel', `
    <p>Copy a loaded HTML table into Excel, or download a tab-separated file.</p>
    <label for="tables">Table</label><select id="tables"></select>
    <div class="row"><button id="refresh">Refresh list</button><button id="pick">Pick a table on the page</button></div>
    <label class="check"><input id="hidden" type="checkbox">Include hidden rows</label>
    <label class="check"><input id="guard" type="checkbox" checked>Treat formula-like text as text</label>
    <label for="output">Preview (first 20 rows)</label><textarea id="output" data-output readonly rows="7"></textarea>
    <div class="row"><button id="copy" class="primary">Copy for Excel</button><button id="download">Download TSV</button></div>
    <small>Only rows already loaded in the page are available. Virtual grids and canvas tables may not expose a usable HTML table. Merged cells are expanded with blank continuation cells.</small>`);
  const select = ui.root.querySelector('#tables');
  const output = ui.root.querySelector('#output');
  const highlight = document.createElement('div');
  highlight.style.cssText = 'position:fixed;border:3px solid #008b80;background:#008b8010;pointer-events:none;display:none';
  ui.root.appendChild(highlight);
  let tables = [], current = null, picking = false, hovered = null, grid = [];
  const visible = element => { const css = getComputedStyle(element); return css.display !== 'none' && css.visibility !== 'hidden' && element.getClientRects().length > 0; };
  function tableGrid(table, includeHidden) {
    const rows = [...table.rows].filter(row => row.closest('table') === table);
    const matrix = [];
    let total = 0;
    rows.forEach((row, r) => {
      matrix[r] ||= [];
      let column = 0;
      for (const cell of [...row.cells]) {
        while (matrix[r][column] !== undefined) column++;
        const rowSpan = Math.min(cell.rowSpan || rows.slice(r).filter(other => other.parentElement === row.parentElement).length, rows.length - r);
        const colSpan = cell.colSpan || 1;
        total += rowSpan * colSpan;
        if (total > 100000) throw new Error('This table is too large (over 100,000 expanded cells). Use the application’s export instead.');
        const text = !includeHidden && !visible(cell) ? '' : cell.innerText.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
        for (let y = 0; y < rowSpan; y++) {
          matrix[r+y] ||= [];
          for (let x = 0; x < colSpan; x++) matrix[r+y][column+x] = y === 0 && x === 0 ? text : '';
        }
        column += colSpan;
      }
    });
    const width = Math.max(0, ...matrix.map(row => row.length));
    return matrix.filter((row, index) => includeHidden || visible(rows[index])).map(row => Array.from({ length: width }, (_, i) => row[i] || ''));
  }
  function safeCell(value) {
    if (!ui.root.querySelector('#guard').checked) return value;
    const trimmed = value.trimStart();
    return /^[=+@]/.test(trimmed) || (/^-/.test(trimmed) && !/^-\d+(?:\.\d+)?$/.test(trimmed)) ? "'" + value : value;
  }
  const tsvCell = value => /[\t\n\r"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
  const tsv = rows => rows.map(row => row.map(value => tsvCell(safeCell(value))).join('\t')).join('\r\n');
  function refreshPreview() {
    try {
      if (!current?.isConnected) { grid = []; output.value = ''; ui.status('Choose a table, or refresh after loading more rows.'); return; }
      grid = tableGrid(current, ui.root.querySelector('#hidden').checked);
      output.value = tsv(grid.slice(0,20));
      ui.status(`${grid.length} loaded rows × ${grid[0]?.length || 0} columns. Exports include all these rows.`);
    } catch (error) { grid = []; output.value = ''; ui.status(error.message); }
  }
  function refreshList() {
    const previous = current;
    tables = [...document.querySelectorAll('table')].filter(table => table.rows.length && visible(table));
    select.replaceChildren();
    tables.forEach((table, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const caption = table.caption?.innerText.trim() || table.getAttribute('aria-label') || table.id || table.rows[0]?.innerText.trim().slice(0,70) || 'Untitled';
      option.textContent = `${index + 1}. ${caption} (${table.rows.length} rows)`;
      select.appendChild(option);
    });
    current = tables.includes(previous) ? previous : tables[0] || null;
    select.value = String(tables.indexOf(current)); refreshPreview();
  }
  function draw() {
    if (!picking || !hovered?.isConnected) { highlight.style.display = 'none'; return; }
    const rect = hovered.getBoundingClientRect();
    Object.assign(highlight.style, { display: 'block', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
  }
  const own = event => event.composedPath().includes(ui.host);
  function move(event) { if (!picking || own(event)) return; hovered = event.composedPath().find(node => node instanceof Element)?.closest('table') || null; draw(); }
  function click(event) {
    if (!picking || own(event)) return;
    const table = event.composedPath().find(node => node instanceof Element)?.closest('table');
    if (!table) return;
    event.preventDefault(); event.stopImmediatePropagation(); picking = false;
    current = table; refreshList(); draw();
  }
  function key(event) { if (event.key === 'Escape' && picking) { picking = false; draw(); ui.status('Table picking stopped.'); } }
  document.addEventListener('pointermove', move, true); document.addEventListener('click', click, true); document.addEventListener('keydown', key, true);
  window.addEventListener('scroll', draw, true); window.addEventListener('resize', draw);
  ui.onClose(() => { document.removeEventListener('pointermove', move, true); document.removeEventListener('click', click, true); document.removeEventListener('keydown', key, true); window.removeEventListener('scroll', draw, true); window.removeEventListener('resize', draw); });
  select.addEventListener('change', () => { current = tables[Number(select.value)] || null; refreshPreview(); });
  ui.root.querySelector('#refresh').addEventListener('click', refreshList);
  ui.root.querySelector('#pick').addEventListener('click', () => { picking = true; ui.status('Click inside a table. Press Escape to cancel.'); });
  ui.root.querySelectorAll('input').forEach(control => control.addEventListener('change', refreshPreview));
  ui.root.querySelector('#copy').addEventListener('click', async () => {
    refreshPreview(); if (!grid.length) return;
    const text = tsv(grid);
    const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const html = '<table>' + grid.map(row => '<tr>' + row.map(value => '<td>' + escape(safeCell(value)).replace(/\n/g,'<br>') + '</td>').join('') + '</tr>').join('') + '</table>';
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('Plain text fallback');
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })]);
      ui.status('Table copied. Paste into Excel.');
    } catch (error) { await copyText(text, ui); }
  });
  ui.root.querySelector('#download').addEventListener('click', () => {
    refreshPreview(); if (!grid.length) return;
    const url = URL.createObjectURL(new Blob(['\ufeff' + tsv(grid)], { type: 'text/tab-separated-values;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url;
    link.download = location.hostname + '-table.tsv'; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); ui.status('TSV downloaded. Open or import it in Excel.');
  });
  refreshList();

})();

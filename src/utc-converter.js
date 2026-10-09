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
  const ui = toolPanel('bm-utc-converter', 'UTC converter', `
    <p>Convert UTC or Melbourne timestamps. Melbourne uses AEST or AEDT according to the date.</p>
    <label for="input">Timestamp</label><input id="input" placeholder="2026-10-09 07:35:28">
    <label for="zone">Input time zone (when no offset is supplied)</label><select id="zone"><option value="utc">UTC</option><option value="melbourne">Melbourne</option></select>
    <label for="ambiguity">If a Melbourne time occurs twice</label><select id="ambiguity"><option value="reject">Ask me to choose</option><option value="earlier">Earlier occurrence (AEDT)</option><option value="later">Later occurrence (AEST)</option></select>
    <div class="row"><button id="convert" class="primary">Convert</button><button id="now">Now</button></div>
    <label for="output">Result</label><textarea id="output" data-output readonly rows="5"></textarea><div class="row"><button id="copy">Copy result</button></div>
    <small>Use YYYY-MM-DD HH:mm[:ss], ISO 8601 with Z or ±HH:mm, or Unix seconds (10 digits) / milliseconds (13 digits). An explicit offset overrides the input-zone selection.</small>`);
  const input = ui.root.querySelector('#input');
  const output = ui.root.querySelector('#output');
  input.value = initial.trim();
  const wallFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  function parts(date) {
    const result = {};
    wallFormatter.formatToParts(date).forEach(part => { if (part.type !== 'literal') result[part.type] = Number(part.value); });
    return result;
  }
  function parseTimestamp(text, zone, ambiguity) {
    const value = text.trim();
    if (/^-?\d{10}$/.test(value)) return new Date(Number(value) * 1000);
    if (/^-?\d{13}$/.test(value)) return new Date(Number(value));
    const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:?\d{2})?$/i.exec(value);
    if (!match) throw new Error('Use YYYY-MM-DD HH:mm:ss, an ISO timestamp or a 10/13-digit Unix timestamp.');
    const [year, month, day, hour, minute, second] = match.slice(1,7).map((v, i) => Number(v || (i === 5 ? 0 : v)));
    const ms = Number((match[7] || '').padEnd(3, '0'));
    const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    const check = new Date(wall);
    if (year < 100 || check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new Error('That date or time is invalid.');
    const offsetText = match[8];
    if (offsetText && offsetText.toUpperCase() !== 'Z') {
      const digits = offsetText.slice(1).replace(':', '');
      const hours = Number(digits.slice(0,2)), minutes = Number(digits.slice(2));
      if (hours > 23 || minutes > 59) throw new Error('Invalid UTC offset.');
      const offset = (hours * 60 + minutes) * (offsetText[0] === '-' ? -1 : 1);
      return new Date(wall - offset * 60000);
    }
    if (offsetText || zone === 'utc') return check;
    // Derive candidate offsets from the IANA zone around the requested date.
    // This also supports historical offsets instead of hard-coding UTC+10/+11.
    const offsets = new Set();
    for (const shift of [-2, -1, 0, 1, 2]) {
      const sample = new Date(wall + shift * 86400000);
      const p = parts(sample);
      offsets.add(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(sample.getTime() / 1000) * 1000);
    }
    const candidates = [...offsets].map(offset => new Date(wall - offset)).filter(date => {
      const p = parts(date);
      return p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute && p.second === second;
    }).sort((a,b) => a - b);
    if (!candidates.length) throw new Error('That Melbourne time does not exist because the clocks moved forward.');
    if (candidates.length > 1 && ambiguity === 'reject') throw new Error('That Melbourne time occurs twice. Choose the earlier or later occurrence, then convert again.');
    return ambiguity === 'later' ? candidates.at(-1) : candidates[0];
  }
  function resultText(date) {
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid timestamp.');
    const p = parts(date);
    const pad = (n, length = 2) => String(n).padStart(length, '0');
    const offsetMinutes = Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime()/1000)*1000) / 60000);
    const label = offsetMinutes === 660 ? 'AEDT' : offsetMinutes === 600 ? 'AEST' : 'Melbourne';
    const offset = `${offsetMinutes >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(offsetMinutes)/60))}:${pad(Math.abs(offsetMinutes)%60)}`;
    return `UTC: ${date.toISOString()}\nMelbourne: ${pad(p.year,4)}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}.${pad(date.getUTCMilliseconds(),3)} ${label} (UTC${offset})\nUnix seconds: ${Math.floor(date.getTime()/1000)}\nUnix milliseconds: ${date.getTime()}`;
  }
  function convert() {
    try { output.value = resultText(parseTimestamp(input.value, ui.root.querySelector('#zone').value, ui.root.querySelector('#ambiguity').value)); ui.status('Converted.'); }
    catch (error) { output.value = ''; ui.status(error.message); }
  }
  ui.root.querySelector('#convert').addEventListener('click', convert);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') convert(); });
  ui.root.querySelector('#now').addEventListener('click', () => { input.value = new Date().toISOString(); convert(); });
  ui.root.querySelector('#copy').addEventListener('click', () => copyText(output.value, ui));
  if (input.value) convert();

})();

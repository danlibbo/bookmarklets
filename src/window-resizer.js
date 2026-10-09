(() => {
  const id = 'browser-size-picker';
  document.getElementById(id)?.remove();
  const host = document.createElement('div');
  host.id = id;
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      dialog{box-sizing:border-box;width:min(400px,calc(100vw - 40px));padding:24px;border:0;border-radius:14px;background:#fff;color:#172033;box-shadow:0 18px 70px #0005;font:14px/1.5 system-ui,sans-serif}
      dialog::backdrop{background:#0006}h2{margin:0 0 6px;font-size:20px}p{margin:0 0 18px;color:#586174}
      button,input{box-sizing:border-box;font:inherit}button{cursor:pointer;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#172033;padding:10px 12px}button:hover{background:#e8eef7}
      button:focus-visible,input:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}.presets{display:grid;gap:8px;margin-bottom:20px}.dimensions{display:flex;gap:12px}label{flex:1;min-width:0}
      input{display:block;width:100%;margin-top:5px;padding:9px;border:1px solid #cbd5e1;border-radius:7px;background:white;color:#172033}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
      .primary{background:#2563eb;border-color:#2563eb;color:white}.primary:hover{background:#1d4ed8}#error{color:#b91c1c;margin:12px 0 0}small{display:block;color:#586174;margin-top:14px}
    </style>
    <dialog aria-labelledby="title">
      <h2 id="title">Choose window size</h2><p>Open this page in a new window.</p>
      <div class="presets">
        <button type="button" data-w="1280" data-h="720">1280 × 720</button>
        <button type="button" data-w="1366" data-h="768">1366 × 768</button>
        <button type="button" data-w="1920" data-h="1080">1920 × 1080</button>
      </div>
      <form>
        <div class="dimensions">
          <label>Width<input name="width" aria-label="Width in pixels" type="number" min="100" step="1" value="1280" required></label>
          <label>Height<input name="height" aria-label="Height in pixels" type="number" min="100" step="1" value="720" required></label>
        </div>
        <small>Whole-window dimensions in CSS pixels, including the title bar and borders.</small>
        <p id="error" role="alert" hidden></p>
        <div class="actions"><button type="button" id="cancel">Cancel</button><button type="submit" class="primary">Open custom size</button></div>
      </form>
    </dialog>`;
  document.documentElement.appendChild(host);
  const dialog = root.querySelector('dialog');
  const form = root.querySelector('form');
  const error = root.querySelector('#error');
  const openSize = (width, height) => {
    const popup = window.open('about:blank', '_blank', `popup=yes,width=${width},height=${height}`);
    if (!popup) {
      error.textContent = 'Allow pop-ups for this site, then try again.';
      error.hidden = false;
      return;
    }
    popup.opener = null;
    popup.resizeTo(width, height);
    popup.location.replace(location.href);
    dialog.close();
  };
  root.querySelectorAll('[data-w]').forEach(button => button.addEventListener('click', () => openSize(Number(button.dataset.w), Number(button.dataset.h))));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.reportValidity()) openSize(Number(form.elements.width.value), Number(form.elements.height.value));
  });
  root.querySelector('#cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => host.remove());
  dialog.showModal();
})();

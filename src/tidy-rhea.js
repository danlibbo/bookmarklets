(function () {
  const HOST = 'rhea.private.aus-1.datixcloudiq.com';
  const KEY = 'dciqSidebarCollapsed';
  if (location.hostname !== HOST) {
    alert('This bookmarklet is only for ' + HOST);
    return;
  }
  if (!document.getElementById('sidebar-section')) {
    alert('Could not find #sidebar-section on this page.');
    return;
  }
  function readSavedState() {
    try { return localStorage.getItem(KEY) === '1'; } catch (error) { return false; }
  }
  function saveState(collapsed) {
    try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch (error) { /* Storage may be blocked. */ }
  }
  let style = document.getElementById('dciq-sidebar-bookmarklet-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dciq-sidebar-bookmarklet-style';
    style.textContent = [
      '#dciq-sidebar-toggle{position:fixed;top:82px;left:246px;z-index:2147483647;width:30px;height:30px;border:1px solid #8e9aa6;border-radius:4px;background:#fff;color:#222529;font:700 18px/26px Arial,sans-serif;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.25);cursor:pointer;padding:0}',
      '#dciq-sidebar-toggle:hover{background:#f1f3f5}',
      'body.dciq-sidebar-collapsed #dciq-sidebar-toggle{left:8px}',
      'body.dciq-sidebar-collapsed #sidebar-section{display:none!important;width:0!important;min-width:0!important;max-width:0!important;padding:0!important;margin:0!important;border:0!important;overflow:hidden!important}',
      'body.dciq-sidebar-collapsed .menu-col.iq-main-sidebar{width:0!important;min-width:0!important;max-width:0!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important}',
      'body.dciq-sidebar-collapsed .menu-col.iq-main-sidebar .copyright{display:none!important}',
      'body.dciq-sidebar-collapsed .dtx-main-container #datix-content>.form-wrapper{margin-left:0!important;padding-left:30px!important}'
    ].join('\n');
    document.head.appendChild(style);
  }
  let button = document.getElementById('dciq-sidebar-toggle');
  function setCollapsed(collapsed) {
    document.body.classList.toggle('dciq-sidebar-collapsed', collapsed);
    if (button) {
      button.textContent = collapsed ? '>' : '<';
      button.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    saveState(collapsed);
  }
  if (!button) {
    button = document.createElement('button');
    button.id = 'dciq-sidebar-toggle';
    button.type = 'button';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      setCollapsed(!document.body.classList.contains('dciq-sidebar-collapsed'));
    });
    document.body.appendChild(button);
    setCollapsed(readSavedState());
  } else {
    setCollapsed(!document.body.classList.contains('dciq-sidebar-collapsed'));
  }
})();

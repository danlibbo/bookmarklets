(() => {
  const toast = (title, message, colour = '#22c55e') => {
    const box = document.createElement('div');
    const detail = document.createElement('span');
    detail.textContent = message;
    detail.style.fontSize = '0.875rem';
    detail.style.fontWeight = '400';
    box.append(document.createTextNode(title), document.createElement('br'), detail);
    box.setAttribute('role', 'status');
    box.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-50px);background-color:${colour};color:white;padding:12px 24px;border-radius:8px;font-family:sans-serif;font-weight:600;z-index:2147483647;opacity:0;transition:all 0.3s ease-in-out;text-align:center;`;
    document.body.appendChild(box);
    setTimeout(() => { box.style.opacity = '1'; box.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translateX(-50%) translateY(-50px)'; }, 5000);
    setTimeout(() => box.remove(), 5300);
  };
  let container;
  let selection;
  try {
    const number = document.querySelector('.profile-title .profile-full-name')?.textContent.trim();
    const summary = document.querySelector('.summary-header .read-value')?.textContent.trim();
    const id = new URL(location.href).searchParams.get('id');
    if (!number || !summary || !id) throw new Error('Could not find the ticket number, summary or ID');
    const url = `${location.origin}/ticket?id=${encodeURIComponent(id)}`;
    const title = `${number} ${summary}`;
    container = document.createElement('div');
    container.contentEditable = 'true';
    container.style.cssText = 'position:fixed;left:-9999px;top:0';
    const link = document.createElement('a');
    link.href = url;
    link.textContent = title;
    container.appendChild(link);
    document.body.appendChild(container);
    const range = document.createRange();
    range.selectNodeContents(container);
    selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const copied = document.execCommand('copy');
    if (!copied) throw new Error('The browser refused clipboard access');
    toast(title, 'copied to clipboard!');
  } catch (error) {
    toast('Could not copy ticket hyperlink', error.message, '#ef4444');
  } finally {
    selection?.removeAllRanges();
    container?.remove();
  }
})();

(async () => {
  const candidates = [];
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    try {
      const manifest = await fetch(manifestLink.href, { credentials: 'include' }).then(r => r.json());
      for (const icon of (manifest.icons || [])) {
        const size = icon.sizes === 'any' ? 9999 : (parseInt((icon.sizes || '0').split('x')[0], 10) || 0);
        candidates.push({ href: new URL(icon.src, manifestLink.href).href, size, type: icon.type || '' });
      }
    } catch (error) {
      console.warn('[Logo Grab] manifest fetch failed', error);
    }
  }
  const selectors = [
    'link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]', 'link[rel="mask-icon"]'
  ];
  document.querySelectorAll(selectors.join(',')).forEach(link => {
    const sizes = link.getAttribute('sizes') || '';
    const isSvg = link.type === 'image/svg+xml' || link.href.toLowerCase().endsWith('.svg');
    let size = parseInt(sizes.split('x')[0], 10) || 0;
    if (sizes === 'any' || isSvg) size = 9999;
    else if (!size && link.rel.includes('apple-touch-icon')) size = 180;
    candidates.push({ href: link.href, size, type: link.type || '' });
  });
  candidates.push({ href: new URL('/favicon.ico', location.origin).href, size: 16, type: 'image/x-icon' });
  candidates.sort((a, b) => {
    const aSvg = Number(a.type.includes('svg') || a.href.toLowerCase().endsWith('.svg'));
    const bSvg = Number(b.type.includes('svg') || b.href.toLowerCase().endsWith('.svg'));
    return bSvg - aSvg || b.size - a.size;
  });
  console.log('[Logo Grab] Candidates:', candidates);
  const loadImage = (src, withCors) => new Promise((resolve, reject) => {
    const img = new Image();
    if (withCors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load failed: ' + src));
    img.src = src;
  });
  let img = null;
  let tainted = false;
  for (const candidate of candidates) {
    try {
      img = await loadImage(candidate.href, true);
      break;
    } catch (error) {
      try {
        img = await loadImage(candidate.href, false);
        tainted = true;
        break;
      } catch (fallbackError) { /* Try the next candidate. */ }
    }
  }
  if (!img) {
    alert('Logo Grab: no usable favicon found on this page.');
    return;
  }
  const filename = location.hostname.replace(/^www\./, '') + '-logo.png';
  if (tainted) {
    // Display the original image: a tainted canvas cannot be exported to PNG.
    const win = window.open('', '_blank');
    if (!win) {
      prompt('Logo Grab: allow pop-ups or copy this image URL to save it manually:', img.src);
      return;
    }
    win.opener = null;
    win.document.title = filename;
    win.document.body.style.cssText = 'margin:0;background:#222;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;font-family:sans-serif;color:#fff';
    const message = win.document.createElement('p');
    message.textContent = 'CORS prevented PNG download — right-click the original image to save it.';
    const original = win.document.createElement('img');
    original.src = img.src;
    original.alt = 'Site icon';
    original.style.cssText = 'max-width:90vw;max-height:80vh';
    win.document.body.append(message, original);
    return;
  }
  const sourceW = img.naturalWidth || 256;
  const sourceH = img.naturalHeight || 256;
  const target = Math.max(sourceW, sourceH, 256);
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) { alert('Logo Grab: canvas is unavailable.'); return; }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const scale = Math.min(target / sourceW, target / sourceH);
  const w = sourceW * scale;
  const h = sourceH * scale;
  ctx.drawImage(img, (target - w) / 2, (target - h) / 2, w, h);
  canvas.toBlob(blob => {
    if (!blob) { alert('Logo Grab: could not create a PNG.'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
})();

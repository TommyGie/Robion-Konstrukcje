// Shared ROBION announcement, compatible with the Faktury JSON and storage keys.
(() => {
  const source = 'https://app.robion.pl/baner.json';
  const fallback = new URL('baner.json', document.currentScript.src).href;
  const host = document.createElement('aside');
  host.id = 'robion-banner';
  host.setAttribute('aria-label', 'Komunikat ROBION');
  host.hidden = true;
  document.querySelector('.app-header').before(host);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const closed = () => { const ids = read('rob_baner_closedIds', []); return Array.isArray(ids) ? ids : []; };
  const valid = b => b && typeof b.id === 'string' && typeof b.active === 'boolean' && typeof b.text === 'string';
  const safeURL = (value, image = false) => {
    try { const u = new URL(value, source); return (image ? ['https:', 'http:'] : ['https:', 'http:', 'mailto:']).includes(u.protocol) ? u.href : null; } catch { return null; }
  };
  const resize = () => document.documentElement.style.setProperty('--robion-banner-height', `${host.hidden ? 0 : host.getBoundingClientRect().height}px`);
  new ResizeObserver(resize).observe(host);
  function show(b) {
    host.replaceChildren();
    host.hidden = !valid(b) || !b.active || closed().includes(b.id);
    if (host.hidden) { resize(); return; }
    host.dataset.type = ['info', 'success', 'warn', 'danger'].includes(b.type) ? b.type : 'info';
    const dot = document.createElement('span'); dot.className = 'robion-banner-dot'; dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('div'); text.className = 'robion-banner-text';
    // Text nodes prevent JSON content from becoming executable markup.
    const pattern = /https?:\/\/[^\s<>]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    let end = 0;
    for (const match of b.text.matchAll(pattern)) {
      text.append(document.createTextNode(b.text.slice(end, match.index)));
      const a = document.createElement('a'); a.textContent = match[0];
      a.href = match[0].includes('://') ? match[0] : `mailto:${match[0]}`;
      a.target = '_blank'; a.rel = 'noopener noreferrer'; text.append(a); end = match.index + match[0].length;
    }
    text.append(document.createTextNode(b.text.slice(end)));
    if (b.link && safeURL(b.link)) {
      const a = document.createElement('a'); a.href = safeURL(b.link); a.textContent = b.linkLabel || b.link;
      a.target = '_blank'; a.rel = 'noopener noreferrer'; text.append(document.createElement('br'), a);
    }
    if (b.img && safeURL(b.img, true)) {
      const img = document.createElement('img'); img.src = safeURL(b.img, true); img.alt = ''; img.addEventListener('error', () => img.remove()); text.append(img);
    }
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Zamknij komunikat ROBION');
    close.onclick = () => { write('rob_baner_closedIds', [...new Set([...closed(), b.id])]); host.hidden = true; resize(); };
    host.append(dot, text, close); resize();
  }
  let current = read('rob_baner_last', null);
  show(current);
  window.addEventListener('storage', e => { if (e.key === 'rob_baner_closedIds' || e.key === 'rob_baner_last' || e.key === null) show(current = read('rob_baner_last', null)); });
  async function fetchBanner(url) {
    const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error('Banner unavailable');
    const data = await response.json(); if (!valid(data)) throw new Error('Invalid banner'); return data;
  }
  (async () => {
    const checked = Number(read('rob_baner_lastCheck', 0));
    if (valid(current) && checked <= Date.now() && Date.now() - checked < 72 * 3600000) return;
    try {
      current = await fetchBanner(source); write('rob_baner_last', current); write('rob_baner_lastCheck', Date.now());
    } catch {
      // Offline startup uses the last known announcement, or the bundled snapshot.
      if (!valid(current)) { try { current = await fetchBanner(fallback); } catch { return; } }
    }
    show(current);
  })();
})();

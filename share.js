// The creators page: copy buttons, the size filter, a creator's own tracked link, and sharing a
// video file straight to a phone's apps (TikTok, Instagram...) through the system share sheet.
const toastEl = document.querySelector('.toast');
let toastTimer = 0;
const toast = (text) => {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
};
// ga.js defines gtag; it may be missing (blocked, or a visitor said no) and that's fine.
const track = (name, params) => {
  try { if (typeof gtag === 'function') gtag('event', name, params); } catch { /* not counted */ }
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers: a hidden text area and the old copy command.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* nothing */ }
    ta.remove();
    return ok;
  }
};

for (const btn of document.querySelectorAll('[data-copy]')) {
  btn.addEventListener('click', async () => {
    const src = document.getElementById(btn.dataset.copy);
    const ok = await copyText(src.textContent.trim());
    toast(ok ? 'Copied!' : 'Select the text and copy it by hand');
    if (ok) track('copy_text', { item: btn.dataset.copy });
  });
}

// Size filter.
const tabs = [...document.querySelectorAll('.fmt-tabs [data-fmt]')];
const groups = [...document.querySelectorAll('.vid-group')];
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    for (const t of tabs) t.setAttribute('aria-selected', String(t === tab));
    const fmt = tab.dataset.fmt;
    for (const g of groups) g.hidden = fmt !== 'all' && g.dataset.fmt !== fmt;
  });
}

// Only one preview plays at a time.
for (const video of document.querySelectorAll('.vid video')) {
  video.addEventListener('play', () => {
    for (const other of document.querySelectorAll('.vid video')) if (other !== video) other.pause();
  });
}

for (const a of document.querySelectorAll('a[download][data-dl]')) {
  a.addEventListener('click', () => track('file_download', { file_name: a.dataset.dl }));
}
for (const a of document.querySelectorAll('[data-intent]')) {
  a.addEventListener('click', () => track('share', { method: a.dataset.intent, content_type: 'site' }));
}

// Sharing the video file itself. Phones (iOS Safari, Android Chrome) can hand a file to the
// share sheet; desktops mostly can't, so the button only shows where it can work.
const canShareFiles = (() => {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [new File([''], 'x.mp4', { type: 'video/mp4' })] });
  } catch {
    return false;
  }
})();
const fetched = new Map();
for (const btn of document.querySelectorAll('[data-share-file]')) {
  if (!canShareFiles) continue;
  btn.hidden = false;
  const url = btn.dataset.shareFile;
  const name = url.split('/').pop();
  const label = btn.textContent;
  btn.addEventListener('click', async () => {
    let file = fetched.get(url);
    if (!file) {
      btn.disabled = true;
      btn.textContent = 'Getting it…';
      try {
        const blob = await (await fetch(url)).blob();
        file = new File([blob], name, { type: 'video/mp4' });
        fetched.set(url, file);
      } catch {
        toast('Could not load the video. Try Download.');
        btn.disabled = false;
        btn.textContent = label;
        return;
      }
      btn.disabled = false;
    }
    try {
      await navigator.share({ files: [file], text: 'Sloth Jam: free in your browser at slothjam.com' });
      track('share', { method: 'share_sheet', content_type: 'video', item_id: name });
      btn.textContent = label;
    } catch (err) {
      // Safari wants a fresh tap once the download has finished.
      if (err && err.name === 'NotAllowedError') {
        btn.textContent = 'Ready: tap to share';
      } else {
        btn.textContent = label;
      }
    }
  });
}

// The creator's own link. utm_ tags are read by Google Analytics, so a visit is credited to the
// creator's handle without anything else on the site knowing about it.
const handle = document.getElementById('handle');
const out = document.getElementById('link-out');
const linkFor = (raw) => {
  const h = raw.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
  return h ? `https://slothjam.com/?utm_source=${h}&utm_medium=social&utm_campaign=creator` : 'https://slothjam.com/';
};
const update = () => { out.textContent = linkFor(handle.value); };
handle.addEventListener('input', update);
update();
const shareLink = document.querySelector('[data-share-link]');
if (navigator.share) {
  shareLink.hidden = false;
  shareLink.addEventListener('click', () => {
    navigator.share({ url: out.textContent, text: 'Sloth Jam: a cozy party game the whole family can play' }).catch(() => {});
  });
}

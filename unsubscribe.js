// The unsubscribe link in the news emails (apps/server/src/news.ts) lands here with the
// grown-up's list number and its signature. One press takes them off the list.
const NEWS_API = 'https://ofkgibuwxrbmmzmbtgmt.supabase.co/functions/v1/news';

const query = new URLSearchParams(location.search);
const show = (name) => {
  for (const el of document.querySelectorAll('[data-unsub-ask]')) el.hidden = true;
  document.querySelector(`[data-unsub-${name}]`).hidden = false;
};

if (!query.get('i') || !query.get('t')) show('fail');

document.querySelector('[data-unsub]').addEventListener('click', async (event) => {
  event.currentTarget.disabled = true;
  try {
    const res = await fetch(`${NEWS_API}/unsubscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ i: query.get('i'), t: query.get('t') }),
    });
    show(res.ok ? 'done' : 'fail');
  } catch {
    show('fail');
  }
});

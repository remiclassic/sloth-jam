// The invite page (invite.html): signs a grown-up in to the account server with an emailed code,
// the same way the game does, and shows the family's invite link from GET /invite.
//
// The page keeps its own session, apart from the game's (partyPlaza.account): the game's has a
// save sync attached, and a session made here must never pull an account's save over a game on
// this device. A visitor who came through someone's link (partyPlaza.invite, kept by main.js or
// the game) and makes a new account here counts as that family's friend, as in the game.
{
  const API = 'https://ofkgibuwxrbmmzmbtgmt.supabase.co/functions/v1/accounts';
  const SESSION = 'slothjam.inviteSession';
  const INVITE_KEY = 'partyPlaza.invite';
  const INVITE_CODE = /^[A-Za-z0-9]{4,12}$/;
  const SITE = 'https://slothjam.com/';
  // The Sloth Jam Chrome extension (apps/chrome) opens this page as invite.html?ext=<its id>, and
  // gets the family's link back once it shows, for its popup. Kept for the visit, in case the page
  // reloads between the email and the code.
  const EXT_KEY = 'slothjam.inviteExtension';
  const EXT_ID = /^[a-p]{32}$/;
  const extension = (() => {
    try {
      const asked = new URLSearchParams(window.location.search).get('ext');
      if (asked && EXT_ID.test(asked)) window.sessionStorage.setItem(EXT_KEY, asked);
      const kept = window.sessionStorage.getItem(EXT_KEY);
      return kept && EXT_ID.test(kept) ? kept : null;
    } catch {
      return null;
    }
  })();

  const $ = (sel) => document.querySelector(sel);
  const steps = { email: $('[data-step="email"]'), code: $('[data-step="code"]'), link: $('[data-step="link"]') };
  const say = $('[data-say]');
  const tell = (text, wrong = false) => {
    say.textContent = text;
    say.classList.toggle('wrong', wrong);
  };
  const show = (name) => {
    for (const [key, el] of Object.entries(steps)) el.hidden = key !== name;
    tell('');
  };
  const store = {
    get() {
      try {
        const raw = JSON.parse(window.localStorage.getItem(SESSION) ?? 'null');
        return raw && typeof raw.token === 'string' && typeof raw.email === 'string' ? raw : null;
      } catch {
        return null;
      }
    },
    set(value) {
      try {
        if (value) window.localStorage.setItem(SESSION, JSON.stringify(value));
        else window.localStorage.removeItem(SESSION);
      } catch {
        // No storage: signed in until the page closes.
      }
    },
  };
  let session = store.get();
  let email = '';

  const call = async (method, path, body, token) => {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
    let data = {};
    try {
      data = await res.json();
    } catch {
      // The status says enough.
    }
    return { status: res.status, data };
  };
  const OFFLINE = 'Could not reach the server. Check the connection and try again.';

  const busy = async (form, work) => {
    const buttons = form.querySelectorAll('button');
    buttons.forEach((b) => (b.disabled = true));
    try {
      return await work();
    } catch {
      tell(OFFLINE, true);
      return null;
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  };

  const plural = (n, one, many) => (n === 1 ? one : many);

  async function showLink() {
    if (!session) return show('email');
    const res = await call('GET', '/invite', undefined, session.token).catch(() => null);
    if (!res) {
      show('email');
      return tell(OFFLINE, true);
    }
    if (res.status === 401) {
      session = null;
      store.set(null);
      return show('email');
    }
    if (res.status !== 200) {
      show('email');
      return tell('Something went wrong on our side. Please try again later.', true);
    }
    const { code, joined = 0, bought = 0 } = res.data;
    const link = `${SITE}?ref=${code}`;
    $('[data-link]').value = link;
    $('[data-joined]').textContent = joined;
    $('[data-joined-label]').textContent = plural(joined, 'friend joined', 'friends joined');
    $('[data-bought]').textContent = bought;
    $('[data-bought-label]').textContent = plural(bought, 'founder pack bought', 'founder packs bought');
    document.querySelectorAll('[data-email]').forEach((el) => (el.textContent = session.email));
    const done = { joined: joined >= 1, bought1: bought >= 1, bought3: bought >= 3, bought10: bought >= 10 };
    document.querySelectorAll('[data-rung]').forEach((li) => li.classList.toggle('done', done[li.dataset.rung] === true));
    show('link');
    sendToExtension({ code, joined, bought });
  }

  // Only the extension that opened the page, and only the link and its counts: never the email
  // or the session.
  function sendToExtension(invite) {
    if (!extension || typeof globalThis.chrome?.runtime?.sendMessage !== 'function') return;
    try {
      chrome.runtime.sendMessage(extension, { type: 'slothjam.invite', ...invite }, (answer) => {
        if (chrome.runtime.lastError || !answer?.ok) return;
        tell('Your link is in your Sloth Jam button now too. Click the sloth in the toolbar to copy it any time.');
      });
    } catch {
      // The extension is gone, or another one has that id: the page works the same without it.
    }
  }

  steps.email.addEventListener('submit', (e) => {
    e.preventDefault();
    const typed = steps.email.elements.email.value.trim();
    if (!typed) return;
    void busy(steps.email, async () => {
      const res = await call('POST', '/auth/start', { email: typed });
      if (res.status === 200) {
        email = typed;
        document.querySelectorAll('[data-email]').forEach((el) => (el.textContent = typed));
        show('code');
        steps.code.elements.code.value = '';
        steps.code.elements.code.focus();
      } else if (res.data.error === 'email') tell('That does not look like an email address.', true);
      else if (res.status === 429) tell('Too many codes asked for. Please wait an hour and try again.', true);
      else tell('Something went wrong on our side. Please try again later.', true);
    });
  });

  steps.code.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = steps.code.elements.code.value.replace(/\D/g, '');
    if (code.length !== 6) return;
    void busy(steps.code, async () => {
      let invite = null;
      try {
        invite = window.localStorage.getItem(INVITE_KEY);
      } catch {
        invite = null;
      }
      const body = { email, code, ...(invite && INVITE_CODE.test(invite) ? { invite } : {}) };
      const res = await call('POST', '/auth/verify', body);
      if (res.status !== 200) {
        tell(res.data.error === 'expired' ? 'That code has run out. Ask for a new one.' : 'That code is not right. Check the email and try again.', true);
        return;
      }
      session = { email: res.data.email, token: res.data.token };
      store.set(session);
      await showLink();
    });
  });
  steps.code.elements.code.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    if (e.target.value.length === 6) steps.code.requestSubmit();
  });
  $('[data-back]').addEventListener('click', () => show('email'));

  $('[data-copy]').addEventListener('click', async () => {
    const field = $('[data-link]');
    try {
      await navigator.clipboard.writeText(field.value);
      tell('Copied! Paste it in a message to a friend.');
    } catch {
      field.focus();
      field.select();
      tell('Select the link and copy it.');
    }
  });
  const share = $('[data-share]');
  if (typeof navigator.share === 'function') {
    share.hidden = false;
    share.addEventListener('click', () => {
      navigator
        .share({ title: 'Sloth Jam', text: 'Our family plays Sloth Jam, a free cozy party game in the browser. Join with my link and we both get a gift in the game:', url: $('[data-link]').value })
        .catch(() => {
          // Closed without sharing.
        });
    });
  }
  $('[data-link]').addEventListener('focus', (e) => e.target.select());

  $('[data-signout]').addEventListener('click', async () => {
    const token = session?.token;
    session = null;
    store.set(null);
    show('email');
    if (token) await call('POST', '/auth/signout', undefined, token).catch(() => {});
  });

  void showLink();
}

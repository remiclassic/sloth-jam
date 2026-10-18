// Remi's stats page: asks for the password, then shows what POST /dashboard of the stats
// function (apps/server/src/stats.ts) answers, again every 30 seconds. The password stays in
// this tab (sessionStorage), or on this device when "Remember" is ticked (localStorage).
// stats.html?demo draws made-up numbers, to check the layout without the password.
const STATS_API = 'https://ofkgibuwxrbmmzmbtgmt.supabase.co/functions/v1/stats';
const KEY = 'slothjam.stats';
const REFRESH_MS = 30 * 1000;
const TIERS = [['pal', 'Island Pal'], ['founder', 'Founder'], ['family', 'Family'], ['patron', 'Patron'], ['portrait', 'Portrait']];
const SVG = 'http://www.w3.org/2000/svg';

const $ = (sel) => document.querySelector(sel);
const gate = $('[data-gate]');
const dash = $('[data-dash]');
const tip = $('[data-tip]');
const demo = new URLSearchParams(location.search).has('demo');
let password = null;
let data = null;
let series = 'plays';
let timer = 0;

const store = {
  get() {
    try { return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY); } catch { return null; }
  },
  set(value, remember) {
    try { (remember ? localStorage : sessionStorage).setItem(KEY, value); } catch { /* the tab still works */ }
  },
  clear() {
    try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* nothing kept */ }
  },
};

const fmt = (n) => Number(n ?? 0).toLocaleString('en-US');
const plural = (n, word) => `${fmt(n)} ${word}${Number(n) === 1 ? '' : 's'}`;
const time = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const dayName = (iso, opts = { month: 'short', day: 'numeric' }) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', opts);
function ago(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 60 * 24) return `${Math.round(min / 60)} h ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function load() {
  if (demo) return render(demoData());
  try {
    const res = await fetch(`${STATS_API}/dashboard`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 429) {
      lock(res.status === 429 ? 'Too many wrong tries. Wait an hour.' : 'Wrong password.');
      return;
    }
    if (!res.ok) throw new Error(String(res.status));
    render(await res.json());
  } catch {
    $('[data-updated]').textContent = data ? `Couldn't refresh (shown: ${time(data.now)})` : "Couldn't reach the server";
  }
}

function lock(message) {
  clearInterval(timer);
  password = null;
  store.clear();
  dash.hidden = true;
  gate.hidden = false;
  const err = $('[data-gate-error]');
  err.textContent = message ?? '';
  err.hidden = !message;
  gate.password.value = '';
  gate.password.focus();
}

function open(pw, remember) {
  password = pw;
  if (!demo) store.set(pw, remember);
  gate.hidden = true;
  dash.hidden = false;
  load();
  clearInterval(timer);
  timer = setInterval(load, REFRESH_MS);
}

gate.addEventListener('submit', (event) => {
  event.preventDefault();
  open(gate.password.value, gate.remember.checked);
});
$('[data-signout]').addEventListener('click', () => lock());
for (const tab of document.querySelectorAll('[data-series]')) {
  tab.addEventListener('click', () => {
    series = tab.dataset.series;
    for (const t of document.querySelectorAll('[data-series]')) t.setAttribute('aria-selected', String(t === tab));
    if (data) drawDays();
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && password !== null) load();
});
// Charts are drawn to their box's width.
let resizeFrame = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => data && (drawCurve(), drawDays()));
});

function render(next) {
  data = next;
  const d = data;
  $('[data-updated]').textContent = `${demo ? 'Demo numbers · ' : ''}Updated ${time(d.now)}`;
  $('[data-live]').textContent = fmt(d.live);
  const peak = d.curve.reduce((best, p) => (p.n > best.n ? p : best), { n: 0, t: d.now });
  $('[data-peak]').textContent = `Peak in 24 h: ${fmt(peak.n)} at ${time(peak.t)}`;

  const set = (key, text) => { $(`[data-k="${key}"]`).textContent = text; };
  const sub = (key, text) => { $(`[data-k2="${key}"]`).textContent = text; };
  set('plays.today', fmt(d.plays.today));
  sub('plays', `${fmt(d.plays.week)} this week · ${fmt(d.plays.month)} in 30 days`);
  const hours = d.plays.weekMinutes / 60;
  set('playHours', hours >= 10 ? `${fmt(Math.round(hours))} h` : `${hours.toFixed(1)} h`);
  sub('median', `Typical visit ${d.plays.weekMedianMinutes} min`);
  set('accounts.total', fmt(d.accounts.total));
  sub('accounts', `+${fmt(d.accounts.today)} today · +${fmt(d.accounts.week)} this week · ${fmt(d.accounts.syncedDay)} synced in 24 h`);
  set('news.subscribed', fmt(d.news.subscribed));
  sub('news', `+${fmt(d.news.week)} this week · ${fmt(d.news.unsubscribed)} unsubscribed`);
  set('orders.total', fmt(d.orders.total));
  sub('orders', `+${fmt(d.orders.today)} today · +${fmt(d.orders.week)} this week`);
  set('claims', fmt(d.claims));
  sub('extra', `${plural(d.paintings, 'painting')} saved`);

  const most = Math.max(1, ...TIERS.map(([t]) => d.orders.tiers[t] ?? 0));
  $('[data-tiers]').replaceChildren(...TIERS.map(([tier, name]) => {
    const n = d.orders.tiers[tier] ?? 0;
    const li = document.createElement('li');
    li.innerHTML = `<span></span><span class="track"><span class="fill"></span></span><span class="n"></span>`;
    li.children[0].textContent = tier === 'portrait' ? `${name} (${20 - n} left)` : name;
    li.querySelector('.fill').style.width = `${(n / most) * 100}%`;
    li.children[2].textContent = fmt(n);
    return li;
  }));

  const recent = $('[data-recent]');
  if (d.orders.recent.length === 0) {
    recent.innerHTML = '<tr><td class="muted">No orders yet.</td><td></td></tr>';
  } else {
    recent.replaceChildren(...d.orders.recent.map((o) => {
      const tr = document.createElement('tr');
      const what = document.createElement('td');
      what.textContent = `${TIERS.find(([t]) => t === o.tier)?.[1] ?? o.tier}${o.name ? ` · ${o.name}` : ''}`;
      if (!o.sent) {
        const warn = document.createElement('span');
        warn.className = 'warn';
        warn.textContent = ' · code not sent';
        what.append(warn);
      }
      const when = document.createElement('td');
      when.textContent = ago(o.at);
      tr.append(what, when);
      return tr;
    }));
  }
  renderGa(d.ga);
  drawCurve();
  drawDays();
}

function renderGa(ga) {
  const on = Boolean(ga && !ga.error);
  $('[data-ga-on]').hidden = !on;
  $('[data-ga-off]').hidden = on;
  $('[data-ga-now]').textContent = on ? `${plural(ga.realtime, 'visitor')} on the site in the last 30 min` : '';
  if (!on) {
    $('[data-ga-off]').textContent = ga ? "Couldn't reach Google Analytics just now." : 'Not connected yet.';
    return;
  }
  const set = (key, a, b) => { $(`[data-ga="${key}"]`).textContent = a; $(`[data-ga2="${key}"]`).textContent = b; };
  for (const key of ['today', 'week', 'month']) set(key, fmt(ga[key].users), `${plural(ga[key].sessions, 'visit')} · ${plural(ga[key].views, 'page view')}`);
  set('buy', fmt(ga.buyClicks.week), `${fmt(ga.buyClicks.today)} today · 7 days`);
  const list = (name, rows, key, value) => {
    const ol = $(`[data-ga-list="${name}"]`);
    if (rows.length === 0) { ol.innerHTML = '<li class="muted">Nothing yet</li>'; return; }
    ol.replaceChildren(...rows.map((r) => {
      const li = document.createElement('li');
      const a = document.createElement('span');
      const b = document.createElement('span');
      a.textContent = r[key] || '(not set)';
      a.title = a.textContent;
      b.textContent = fmt(r[value]);
      li.append(a, b);
      return li;
    }));
  };
  list('pages', ga.pages, 'path', 'views');
  list('sources', ga.sources, 'source', 'sessions');
  list('countries', ga.countries, 'country', 'users');
}

function el(name, attrs, parent) {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
}

// A y axis that ends on a round number, with three or four lines.
function niceMax(max) {
  if (max <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(max / 4));
  for (const m of [1, 2, 2.5, 5, 10]) if (max / (m * step) <= 4) return 4 * m * step;
  return max;
}

function frame(box, height) {
  const width = Math.max(260, box.clientWidth);
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img' });
  box.replaceChildren(svg);
  return { svg, width };
}

function grid(svg, top, x0, x1, y0, y1) {
  for (let i = 0; i <= 4; i++) {
    const y = y1 - ((y1 - y0) * i) / 4;
    el('line', { class: 'gridline', x1: x0, x2: x1, y1: y, y2: y }, svg);
    el('text', { x: x0 - 6, y: y + 4, 'text-anchor': 'end' }, svg).textContent = fmt((top * i) / 4);
  }
}

function showTip(event, text) {
  tip.textContent = text;
  tip.hidden = false;
  tip.style.left = `${event.clientX}px`;
  tip.style.top = `${event.clientY}px`;
}
const hideTip = () => { tip.hidden = true; };

function drawCurve() {
  const pts = data.curve;
  const { svg, width } = frame($('[data-curve]'), 150);
  svg.setAttribute('aria-label', `Players at once over the last 24 hours, now ${data.live}`);
  const [x0, x1, y0, y1] = [34, width - 6, 8, 128];
  const top = niceMax(Math.max(...pts.map((p) => p.n)));
  grid(svg, top, x0, x1, y0, y1);
  const t0 = pts[0].t;
  const span = pts[pts.length - 1].t - t0 || 1;
  const x = (t) => x0 + ((t - t0) / span) * (x1 - x0);
  const y = (n) => y1 - (n / top) * (y1 - y0);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.n).toFixed(1)}`).join('');
  el('path', { class: 'area', d: `${line}L${x1},${y1}L${x0},${y1}Z` }, svg);
  el('path', { class: 'line', d: line }, svg);
  for (const t of [t0, t0 + span / 2, t0 + span]) {
    el('text', { x: x(t), y: 146, 'text-anchor': t === t0 ? 'start' : t === t0 + span ? 'end' : 'middle' }, svg).textContent = t === t0 + span ? 'now' : time(t);
  }
  const cross = el('line', { class: 'cross', y1: y0, y2: y1, visibility: 'hidden' }, svg);
  const marker = el('circle', { class: 'marker', r: 4, visibility: 'hidden' }, svg);
  const hit = el('rect', { class: 'hit', x: x0, y: 0, width: x1 - x0, height: y1 }, svg);
  hit.addEventListener('pointermove', (event) => {
    const rect = svg.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * width;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(((sx - x0) / (x1 - x0)) * (pts.length - 1))));
    const p = pts[i];
    for (const [k, v] of [['x1', x(p.t)], ['x2', x(p.t)]]) cross.setAttribute(k, v);
    marker.setAttribute('cx', x(p.t));
    marker.setAttribute('cy', y(p.n));
    cross.setAttribute('visibility', 'visible');
    marker.setAttribute('visibility', 'visible');
    showTip(event, `${time(p.t)} · ${plural(p.n, 'player')}`);
  });
  hit.addEventListener('pointerleave', () => {
    cross.setAttribute('visibility', 'hidden');
    marker.setAttribute('visibility', 'hidden');
    hideTip();
  });
}

function drawDays() {
  const label = { plays: 'visit', accounts: 'new account', news: 'news sign-up', orders: 'order' }[series];
  drawBars($('[data-days]'), data.days, series, label);
  // Google leaves out days with no visitors: the same 30 days as ours, zero where it has none.
  if (data.ga?.days) {
    const users = new Map(data.ga.days.map((d) => [d.day, d.users]));
    drawBars($('[data-ga-days]'), data.days.map((d) => ({ day: d.day, users: users.get(d.day) ?? 0 })), 'users', 'visitor');
  }
}

function drawBars(box, days, series, label) {
  const { svg, width } = frame(box, 200);
  svg.setAttribute('aria-label', `${label}s per day over the last 30 days`);
  const [x0, x1, y0, y1] = [34, width - 4, 8, 176];
  const top = niceMax(Math.max(...days.map((d) => d[series])));
  grid(svg, top, x0, x1, y0, y1);
  const slot = (x1 - x0) / days.length;
  const barW = Math.max(3, Math.min(22, slot - 2));
  days.forEach((d, i) => {
    const cx = x0 + slot * (i + 0.5);
    const h = (d[series] / top) * (y1 - y0);
    const hit = el('rect', { class: 'hit', x: cx - slot / 2, y: y0, width: slot, height: y1 - y0 }, svg);
    if (h > 0) {
      const r = Math.min(4, barW / 2, h);
      // Rounded at the top only, square on the baseline.
      el('path', {
        class: `bar${i === days.length - 1 ? ' today' : ''}`,
        d: `M${cx - barW / 2},${y1}V${y1 - h + r}Q${cx - barW / 2},${y1 - h} ${cx - barW / 2 + r},${y1 - h}H${cx + barW / 2 - r}Q${cx + barW / 2},${y1 - h} ${cx + barW / 2},${y1 - h + r}V${y1}Z`,
      }, svg);
    }
    hit.addEventListener('pointermove', (event) => showTip(event, `${dayName(d.day, { weekday: 'short', month: 'short', day: 'numeric' })} · ${plural(d[series], label)}${i === days.length - 1 ? ' so far' : ''}`));
    hit.addEventListener('pointerleave', hideTip);
    if (i % 7 === (days.length - 1) % 7) {
      el('text', { x: cx, y: 194, 'text-anchor': 'middle' }, svg).textContent = i === days.length - 1 ? 'today' : dayName(d.day);
    }
  });
}

function demoData() {
  const now = Date.now();
  const curve = Array.from({ length: 97 }, (_, k) => {
    const t = now - (96 - k) * 900000;
    const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    return { t, n: Math.max(0, Math.round(9 + 8 * Math.sin(((hour - 13) / 24) * Math.PI * 2) + (k % 5) - 2)) };
  });
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now - (29 - i) * 86400000);
    const grow = 1 + i / 12;
    return {
      day: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      plays: Math.round((30 + (i * 7) % 13) * grow),
      accounts: Math.round((3 + (i * 5) % 4) * grow),
      news: Math.round((1 + (i * 3) % 3) * grow),
      orders: (i * 11) % 7 === 0 ? 2 : (i * 5) % 4 === 0 ? 1 : 0,
    };
  });
  return {
    now,
    live: curve[curve.length - 1].n,
    plays: { today: 48, week: 512, month: 1880, weekMinutes: 6140, weekMedianMinutes: 9.5 },
    curve,
    accounts: { total: 214, today: 6, week: 41, month: 160, syncedDay: 37 },
    news: { subscribed: 88, unsubscribed: 4, week: 17 },
    orders: { total: 23, today: 1, week: 5, unsent: 0, tiers: { pal: 6, founder: 9, family: 5, patron: 2, portrait: 1 }, recent: [
      { tier: 'founder', at: now - 25 * 60000, name: 'The Okafor family', sent: true },
      { tier: 'pal', at: now - 3 * 3600000, name: null, sent: true },
      { tier: 'family', at: now - 26 * 3600000, name: 'Mia & Leo', sent: false },
      { tier: 'portrait', at: now - 3 * 86400000, name: 'Grandma June', sent: true },
    ] },
    claims: 15,
    paintings: 132,
    days,
    ga: {
      realtime: 7,
      today: { users: 63, sessions: 71, views: 190 },
      week: { users: 402, sessions: 470, views: 1310 },
      month: { users: 1520, sessions: 1790, views: 4900 },
      days: days.map((d) => ({ day: d.day, users: Math.round(d.plays * 0.9) })),
      pages: [{ path: '/', views: 820 }, { path: '/share.html', views: 140 }, { path: '/fr/', views: 96 }, { path: '/coloring.html', views: 80 }],
      sources: [{ source: '(direct)', sessions: 210 }, { source: 'google', sessions: 120 }, { source: 'youtube.com', sessions: 64 }, { source: 'facebook.com', sessions: 41 }],
      countries: [{ country: 'Canada', users: 160 }, { country: 'United States', users: 120 }, { country: 'France', users: 42 }],
      buyClicks: { today: 3, week: 19 },
    },
  };
}

const kept = store.get();
if (demo) open('', false);
else if (kept !== null) open(kept, false);
else gate.hidden = false;

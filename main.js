// The island backdrop shows its small blurred preview (styles.css) until every layer has
// decoded, then the layers fade in at once. The page starts with scene-wait in its HTML so no
// half-loaded layer is ever drawn; this comes first in the file so nothing below can stop it.
// Pictures already in the cache skip the fade, and a very slow connection gets whatever has
// arrived after eight seconds. Pictures further down the page wait for sceneShown, so they
// don't share the connection with it.
const scene = document.querySelector('.scene');
const sceneShown = new Promise((shown) => {
  if (!scene) { shown(); return; }
  const scenery = [...document.querySelectorAll('.backdrop img')];
  const show = () => { scene.classList.remove('scene-wait'); scene.classList.add('scene-ready'); shown(); };
  if (scenery.every((img) => img.complete)) show();
  else {
    Promise.all(scenery.map((img) => img.decode().catch(() => {}))).then(show);
    setTimeout(show, 8000);
  }
});
// An <img data-src> is a picture below the first screen: it is given its address once the
// island is in (the browser's own loading="lazy" still decides when to fetch it).
sceneShown.then(() => {
  for (const el of document.querySelectorAll('img[data-src], source[data-srcset]')) {
    if (el.dataset.srcset) el.srcset = el.dataset.srcset;
    if (el.dataset.src) el.src = el.dataset.src;
  }
});

// The hero logo builds itself once all its parts have loaded, so no letter turns up late: it
// starts hidden (hl-wait in the HTML). Clicking it plays the entrance again. With reduced
// motion it simply appears.
const heroLogo = document.querySelector('.hero-logo');
if (heroLogo) {
  const loaded = Promise.all([...heroLogo.querySelectorAll('img')].map((img) => img.decode().catch(() => {})));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) loaded.then(() => heroLogo.classList.remove('hl-wait'));
  else {
    const playLogo = () => {
      heroLogo.classList.remove('hl-wait', 'hl-play');
      void heroLogo.offsetWidth;
      heroLogo.classList.add('hl-play');
    };
    loaded.then(playLogo);
    heroLogo.addEventListener('click', playLogo);
  }
}

// The Stripe Payment Links for each founder pack. A pack's buy button stays hidden until its
// link is pasted in, and the note under the packs says they go on sale soon until any link is.
const FOUNDER_LINKS = {
  pal: 'https://buy.stripe.com/00w28seq75Mh3Eb9Fs5kk01',
  founder: 'https://buy.stripe.com/28EeVe81J8YtfmTeZM5kk00',
  family: 'https://buy.stripe.com/aFa8wQdm3eiN0rZ9Fs5kk02',
  patron: 'https://buy.stripe.com/14A8wQgyfdeJgqXdVI5kk03',
  portrait: 'https://buy.stripe.com/eVqcN6dm3fmR8Yv3h45kk04',
};

// Invite links (slothjam.com/?ref=<code>): a family's grown-up shares one, and the code is kept
// on this device. The game sends it with the sign-in that makes a new account (its
// save/account.ts reads the same key), and Stripe gets it as client_reference_id, so a pack
// bought here counts for the family that shared the link.
const INVITE_KEY = 'partyPlaza.invite';
const INVITE_CODE = /^[A-Za-z0-9]{4,12}$/;
let invite = null;
try {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref && INVITE_CODE.test(ref)) window.localStorage.setItem(INVITE_KEY, ref.toUpperCase());
  const kept = window.localStorage.getItem(INVITE_KEY);
  if (kept && INVITE_CODE.test(kept)) invite = kept;
} catch {
  // No storage: no invite.
}

let onSale = false;
for (const link of document.querySelectorAll('[data-buy]')) {
  const url = FOUNDER_LINKS[link.dataset.buy];
  if (!url) continue;
  link.href = invite ? `${url}?client_reference_id=${invite}` : url;
  link.hidden = false;
  onSale = true;
}
if (onSale) {
  document.querySelector('[data-buy-note]').hidden = false;
  document.querySelector('[data-buy-soon]').hidden = true;
}

// Founder pack prices in each currency Stripe charges in. These must match the currency prices
// set on each pack's Stripe price (tools/stripe/local-prices.mjs puts them there). They are round
// numbers picked for each place, not exchange-rate copies of the US price: Brazil and Mexico pay
// less, as on game stores. Until LOCAL_PRICES_LIVE is true, everyone sees US dollars and the note
// that checkout converts them.
const LOCAL_PRICES_LIVE = false;
const PRICES = {
  USD: { pal: 5, founder: 15, family: 30, patron: 75, portrait: 250 },
  CAD: { pal: 7, founder: 20, family: 40, patron: 99, portrait: 339 },
  EUR: { pal: 5, founder: 15, family: 29, patron: 69, portrait: 229 },
  GBP: { pal: 4, founder: 12, family: 25, patron: 59, portrait: 199 },
  AUD: { pal: 8, founder: 23, family: 45, patron: 115, portrait: 379 },
  BRL: { pal: 19, founder: 49, family: 99, patron: 249, portrait: 799 },
  MXN: { pal: 59, founder: 179, family: 349, patron: 899, portrait: 2999 },
  JPY: { pal: 700, founder: 2000, family: 4000, patron: 10000, portrait: 35000 },
  KRW: { pal: 6500, founder: 19000, family: 38000, patron: 95000, portrait: 320000 },
  TWD: { pal: 150, founder: 450, family: 900, patron: 2200, portrait: 7500 },
  HKD: { pal: 39, founder: 119, family: 229, patron: 579, portrait: 1890 },
};
// Stripe picks the checkout currency from where the buyer is. A static page can't see that, so
// the browser's time zone stands in for it, as in ga.js.
const ZONE_CURRENCY = [
  [/^America\/(Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Santarem|Noronha|Eirunepe)$/, 'BRL'],
  [/^America\/(Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ciudad_Juarez|Ojinaga|Mazatlan|Bahia_Banderas|Hermosillo|Tijuana)$/, 'MXN'],
  [/^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Regina|Halifax|St_Johns|Moncton|Glace_Bay|Goose_Bay|Whitehorse|Yellowknife|Iqaluit|Swift_Current|Dawson_Creek|Dawson|Fort_Nelson|Creston|Rankin_Inlet|Resolute|Cambridge_Bay|Inuvik|Atikokan|Blanc-Sablon|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung)$/, 'CAD'],
  [/^Europe\/(London|Belfast|Guernsey|Jersey|Isle_of_Man)$/, 'GBP'],
  [/^(Europe\/(Paris|Berlin|Madrid|Rome|Amsterdam|Brussels|Vienna|Dublin|Lisbon|Helsinki|Athens|Luxembourg|Monaco|Vatican|San_Marino|Andorra|Ljubljana|Bratislava|Tallinn|Riga|Vilnius|Malta|Zagreb|Busingen)|Atlantic\/(Canary|Madeira|Azores)|Asia\/(Nicosia|Famagusta)|Africa\/Ceuta)$/, 'EUR'],
  [/^Australia\//, 'AUD'],
  [/^Asia\/Tokyo$/, 'JPY'],
  [/^Asia\/Seoul$/, 'KRW'],
  [/^Asia\/Taipei$/, 'TWD'],
  [/^Asia\/Hong_Kong$/, 'HKD'],
];
const localCurrency = () => {
  let zone = '';
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* old browser: US dollars */ }
  const hit = ZONE_CURRENCY.find(([test]) => test.test(zone));
  return hit ? hit[1] : 'USD';
};
// Each price is written the way the page's language writes money: $15, 15 US$, 15 $ US, ¥2,000.
{
  const currency = LOCAL_PRICES_LIVE ? localCurrency() : 'USD';
  const pageLang = document.documentElement.lang || 'en';
  const format = new Intl.NumberFormat(pageLang, { style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 });
  for (const el of document.querySelectorAll('[data-price]')) {
    const amount = PRICES[currency][el.dataset.price];
    if (amount != null) el.textContent = format.format(amount);
  }
  const local = currency !== 'USD';
  for (const note of document.querySelectorAll('[data-price-note]')) note.hidden = (note.dataset.priceNote === 'local') !== local;
}

// Parallax. Scrolling slides the layers apart (data-rise) and pushes them toward the camera,
// most of it over the first screen and a slow drift after that; on a mouse the layers also lean
// away from the pointer. The picture eases toward where it should be, so it glides.
const layers = [...document.querySelectorAll('[data-depth]')].map((el) => ({
  el,
  depth: Number(el.dataset.depth),
  drift: Number(el.dataset.drift || 0),
  rise: Number(el.dataset.rise || 0),
  scenery: el.classList.contains('layer'),
}));
const still = matchMedia('(prefers-reduced-motion: reduce)');
const aim = { x: 0, y: 0, first: 0, whole: 0 };
const now = { x: 0, y: 0, first: 0, whole: 0 };
let running = false;

function frame() {
  let moving = false;
  for (const key in aim) {
    const gap = aim[key] - now[key];
    if (Math.abs(gap) > 0.0005) { now[key] += gap * 0.14; moving = true; } else now[key] = aim[key];
  }
  const screen = innerHeight;
  const lift = (now.first * 0.26 + now.whole * 0.12) * screen;
  for (const { el, depth, drift, rise, scenery } of layers) {
    const x = -now.x * depth * 56 + drift * lift * 0.22;
    const y = -now.y * depth * 30 - lift * rise;
    const zoom = scenery ? 1 + now.first * depth * 0.1 : 1 + now.first * 0.08;
    const turn = scenery ? 0 : drift * now.first * 7 + now.x * drift * 3;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${zoom.toFixed(4)}) rotate(${turn.toFixed(2)}deg)`;
  }
  running = moving;
  if (moving) requestAnimationFrame(frame);
}
function wake() {
  if (still.matches) return;
  aim.first = Math.min(scrollY / innerHeight, 1);
  aim.whole = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
  if (!running) { running = true; requestAnimationFrame(frame); }
}
addEventListener('scroll', wake, { passive: true });
addEventListener('resize', wake);
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  addEventListener('pointermove', (event) => {
    aim.x = event.clientX / innerWidth - 0.5;
    aim.y = event.clientY / innerHeight - 0.5;
    wake();
  }, { passive: true });
}
wake();

// Game clips play only while they are on screen. With reduced motion, or where the browser
// refuses to start them, they show their controls and wait for a tap.
const clips = document.querySelectorAll('video.clip');
// A clip's still frame (data-poster) is fetched only as it nears the screen, so the page's
// first load is the top of the page and not fifty pictures further down.
const showPoster = (clip) => {
  if (clip.dataset.poster) clip.poster = clip.dataset.poster;
  delete clip.dataset.poster;
};
// On screen, a clip is buffered whole, so it loops from memory instead of stalling at each
// restart. One scrolled past before it has loaded lets go of its download, so the clips in
// view are not queued behind every clip the page flew by.
const startClip = (clip) => {
  const source = clip.querySelector('source');
  if (source && !source.getAttribute('src') && source.dataset.src) {
    source.src = source.dataset.src;
    clip.load();
  }
  clip.preload = 'auto';
  clip.play().catch((err) => { if (err.name === 'NotAllowedError') clip.controls = true; });
};
const stopClip = (clip) => {
  clip.pause();
  const source = clip.querySelector('source');
  if (!source || clip.readyState >= 4 || clip.networkState !== HTMLMediaElement.NETWORK_LOADING) return;
  source.dataset.src = source.getAttribute('src');
  source.removeAttribute('src');
  clip.preload = 'none';
  clip.load();
};
if (!('IntersectionObserver' in window)) {
  for (const clip of document.querySelectorAll('video[data-poster]')) showPoster(clip);
} else {
  const near = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      showPoster(entry.target);
      near.unobserve(entry.target);
    }
  }, { rootMargin: '900px 0px' });
  sceneShown.then(() => { for (const clip of document.querySelectorAll('video[data-poster]')) near.observe(clip); });
}
if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
  for (const clip of clips) clip.controls = true;
} else {
  const watcher = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) startClip(entry.target);
      else stopClip(entry.target);
    }
  }, { threshold: 0.35 });
  for (const clip of clips) watcher.observe(clip);
}

// The home-screen tip under the hero: the steps for this phone, where we can tell which.
// iPadOS asks for the desktop site and says it is a Mac; the touch screen gives it away.
const homeTip = document.querySelector('[data-home-tip]');
if (homeTip) {
  const ua = navigator.userAgent;
  const kind = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : /Android/.test(ua) ? 'android' : 'any';
  for (const span of homeTip.querySelectorAll('[data-tip]')) span.hidden = span.dataset.tip !== kind;
}

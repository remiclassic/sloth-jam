// Google Analytics 4 for the landing page only; the game under play/ is never tracked.
// It lives in its own file because the page's Content-Security-Policy blocks inline scripts.
// Ads features stay off: no Google signals, no ad personalization, no ad cookies.
//
// Visitors in Europe (EU, EEA, UK, Switzerland) are asked first: Google's script is not even
// fetched until they accept. A static page can't see where a visitor is, so the browser's time
// zone stands in for it. Everyone else is counted unless they said no through "Cookie choices"
// in the footer, which reopens the banner for anyone.
const GA_ID = 'G-5CEFJQDNJZ';
const CHOICE_KEY = 'slothjam.analytics';
const EU_ZONES = /^(Europe\/|Atlantic\/(Azores|Canary|Madeira|Reykjavik|Faroe)|Asia\/(Nicosia|Famagusta)|Indian\/(Reunion|Mayotte)|America\/(Guadeloupe|Martinique|Cayenne|St_Barthelemy|Marigot))/;

window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }

const readChoice = () => {
  try { return localStorage.getItem(CHOICE_KEY); } catch { return null; }
};
const saveChoice = (value) => {
  try { localStorage.setItem(CHOICE_KEY, value); } catch { /* private mode: ask again next visit */ }
};
const inEurope = (() => {
  try { return EU_ZONES.test(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); } catch { return true; }
})();

let loaded = false;
const startAnalytics = () => {
  if (loaded) {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  loaded = true;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  gtag('js', new Date());
  gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  // Google's script is 170 KB: it waits until the page and its pictures have loaded and the
  // phone has a quiet moment, so it never slows the first screen. The commands above wait in
  // dataLayer and are sent when it arrives.
  const add = () => document.head.appendChild(script);
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(add, { timeout: 3000 }) : setTimeout(add, 1));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
};
// Saying no after saying yes: stop sending and remove the cookies Analytics already set.
const stopAnalytics = () => {
  if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' });
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (!/^_ga/.test(name)) continue;
    for (const domain of ['', '; domain=.slothjam.com', `; domain=.${location.hostname}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
};

// The banner's words in each language the site is built in (tools/site/i18n.mjs).
const WORDS = {
  en: {
    label: 'Cookie choices',
    text: '<b>Can we count your visit?</b> We use Google Analytics cookies to see which pages people visit on this website, with its advertising features off. The game itself never tracks anyone. <a href="privacy.html">Privacy policy</a>',
    no: 'No thanks',
    yes: 'Accept',
  },
  es: {
    label: 'Opciones de cookies',
    text: '<b>¿Podemos contar tu visita?</b> Usamos cookies de Google Analytics para ver qué páginas de este sitio visita la gente, con sus funciones publicitarias desactivadas. El juego en sí nunca rastrea a nadie. <a href="privacy.html">Política de privacidad</a>',
    no: 'No, gracias',
    yes: 'Aceptar',
  },
  zh: {
    label: 'Cookie 选项',
    text: '<b>可以统计你的访问吗？</b>我们使用 Google Analytics 的 Cookie 来了解大家访问了本网站的哪些页面，并已关闭其广告功能。游戏本身从不追踪任何人。<a href="privacy.html">隐私政策</a>',
    no: '不用了',
    yes: '同意',
  },
  fr: {
    label: 'Choix des cookies',
    text: '<b>Pouvons-nous compter votre visite ?</b> Nous utilisons les cookies de Google Analytics pour savoir quelles pages de ce site sont visitées, avec ses fonctions publicitaires désactivées. Le jeu lui-même ne suit jamais personne. <a href="privacy.html">Politique de confidentialité</a>',
    no: 'Non merci',
    yes: 'Accepter',
  },
  pt: {
    label: 'Opções de cookies',
    text: '<b>Podemos contar sua visita?</b> Usamos cookies do Google Analytics para ver quais páginas deste site as pessoas visitam, com os recursos de publicidade desligados. O jogo em si nunca rastreia ninguém. <a href="privacy.html">Política de privacidade</a>',
    no: 'Não, obrigado',
    yes: 'Aceitar',
  },
  de: {
    label: 'Cookie-Einstellungen',
    text: '<b>Dürfen wir deinen Besuch zählen?</b> Wir nutzen Cookies von Google Analytics, um zu sehen, welche Seiten dieser Website besucht werden, mit ausgeschalteten Werbefunktionen. Das Spiel selbst verfolgt niemanden. <a href="privacy.html">Datenschutzerklärung</a>',
    no: 'Nein, danke',
    yes: 'Akzeptieren',
  },
  it: {
    label: 'Scelte sui cookie',
    text: '<b>Possiamo contare la tua visita?</b> Usiamo i cookie di Google Analytics per vedere quali pagine di questo sito vengono visitate, con le funzioni pubblicitarie disattivate. Il gioco non traccia mai nessuno. <a href="privacy.html">Informativa sulla privacy</a>',
    no: 'No, grazie',
    yes: 'Accetta',
  },
  'zh-Hant': {
    label: 'Cookie 選項',
    text: '<b>可以統計你的造訪嗎？</b>我們使用 Google Analytics 的 Cookie 來了解大家造訪了本網站的哪些頁面，並已關閉其廣告功能。遊戲本身從不追蹤任何人。<a href="privacy.html">隱私權政策</a>',
    no: '不用了',
    yes: '同意',
  },
  ja: {
    label: 'Cookie の設定',
    text: '<b>訪問を記録してもいいですか？</b>このサイトのどのページが見られているかを知るために Google アナリティクスの Cookie を使っています。広告機能はオフです。ゲーム自体は誰も追跡しません。<a href="privacy.html">プライバシーポリシー</a>',
    no: '同意しない',
    yes: '同意する',
  },
  ko: {
    label: '쿠키 설정',
    text: '<b>방문을 집계해도 될까요?</b> 이 웹사이트에서 어떤 페이지를 보는지 알기 위해 Google 애널리틱스 쿠키를 사용하며, 광고 기능은 꺼 두었습니다. 게임 자체는 누구도 추적하지 않습니다. <a href="privacy.html">개인정보 처리방침</a>',
    no: '괜찮아요',
    yes: '동의',
  },
};
const pageLang = document.documentElement.lang;
const words = WORDS[pageLang] || WORDS[pageLang.split('-')[0]] || WORDS.en;

const showBanner = () => {
  if (document.querySelector('.consent')) return;
  const banner = document.createElement('section');
  banner.className = 'consent';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', words.label);
  banner.innerHTML = `
    <p>${words.text}</p>
    <div class="consent-buttons">
      <button type="button" class="btn consent-no" data-choice="denied">${words.no}</button>
      <button type="button" class="btn btn-play consent-yes" data-choice="granted">${words.yes}</button>
    </div>`;
  banner.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-choice]')?.dataset.choice;
    if (!choice) return;
    saveChoice(choice);
    if (choice === 'granted') startAnalytics();
    else stopAnalytics();
    banner.remove();
  });
  document.body.appendChild(banner);
};

const choice = readChoice();
if (choice === 'granted' || (choice !== 'denied' && !inEurope)) startAnalytics();

const whenReady = (fn) => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
};
whenReady(() => {
  if (inEurope && !choice) showBanner();
  for (const link of document.querySelectorAll('[data-cookie-choices]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showBanner();
    });
  }
});

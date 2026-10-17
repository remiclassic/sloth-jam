// Languages. The site is written in English, and tools/site/i18n.mjs builds a copy of the pages in
// each other language's folder (es/, ja/, zh-hant/...). A first visit to an English page from a
// browser set to one of those languages goes to that copy; the page's own hreflang links say which
// copies exist. Picking a language in the menu is remembered, so after that nobody is moved.
// Loaded in the head, before the page draws, so the redirect does not flash the English page.
(function () {
  var KEY = 'slothjam.lang';

  var read = function () {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  };
  var save = function (value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* private mode: the menu still works */ }
  };

  // Chinese comes in two scripts: Taiwan, Hong Kong and Macau read traditional, everyone else
  // simplified.
  var script = function (tag) {
    if (tag.split('-')[0] !== 'zh') return tag.split('-')[0];
    return /-(hant|tw|hk|mo)\b/.test(tag) ? 'zh-hant' : 'zh-hans';
  };

  var wanted = function () {
    var copies = {};
    var links = document.querySelectorAll('link[rel="alternate"][hreflang]');
    for (var i = 0; i < links.length; i++) {
      var tag = links[i].getAttribute('hreflang').toLowerCase();
      if (tag !== 'x-default') copies[script(tag)] = links[i].getAttribute('href');
    }
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var j = 0; j < list.length; j++) {
      var want = script(String(list[j]).toLowerCase());
      if (want === 'en') return null;
      if (copies[want]) return copies[want];
    }
    return null;
  };

  if (document.documentElement.lang === 'en' && !read() && !/bot|crawl|spider|slurp|preview/i.test(navigator.userAgent)) {
    var href = wanted();
    if (href) {
      // The hreflang links point at slothjam.com; keep the path so a local preview stays local.
      location.replace(new URL(href).pathname + location.search + location.hash);
      return;
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-lang]');
    if (link) save(link.getAttribute('data-lang'));
  });
})();

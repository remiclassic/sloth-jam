// The top bar's menu, on every page.
//
// How much room the links need depends on the language, so instead of trusting a screen width,
// the nav checks whether they fit. Too wide, they shrink; still too wide, they fold away behind
// the Menu button, which opens them as a panel under the bar (the media queries in styles.css are
// the starting point when this script is off). On a phone the nav's founder button can be one too
// many as well; the hero has the same button.
{
  const nav = document.querySelector('.nav');
  const menu = nav?.querySelector('.nav-links');
  const burger = nav?.querySelector('.nav-burger');
  if (nav && menu) {
    const over = () => nav.scrollWidth > nav.clientWidth;
    const setOpen = (open) => {
      nav.classList.toggle('nav-open', open);
      burger?.setAttribute('aria-expanded', String(open));
    };
    const fitNav = () => {
      nav.classList.remove('nav-compact', 'nav-crowded', 'nav-tight');
      nav.classList.add('nav-roomy');
      if (!over()) return setOpen(false);
      nav.classList.replace('nav-roomy', 'nav-compact');
      if (!over()) return setOpen(false);
      nav.classList.add('nav-crowded');
      if (over()) nav.classList.add('nav-tight');
    };
    new ResizeObserver(fitNav).observe(nav);
    document.fonts?.ready.then(fitNav);

    burger?.addEventListener('click', () => {
      const open = !nav.classList.contains('nav-open');
      setOpen(open);
      nav.querySelector('.lang-menu')?.removeAttribute('open');
      if (open) menu.querySelector('a')?.focus({ preventScroll: true });
    });
    // A pick, a tap outside or Escape closes it.
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !nav.classList.contains('nav-open')) return;
      setOpen(false);
      burger?.focus();
    });
    nav.querySelector('.lang-menu')?.addEventListener('toggle', (e) => { if (e.target.open) setOpen(false); });

    // On the home page, the link for the section on screen lights up.
    const spots = [...menu.querySelectorAll('a[href^="#"]')]
      .map((a) => [a, document.getElementById(a.hash.slice(1))])
      .filter(([, section]) => section);
    if (spots.length && 'IntersectionObserver' in window) {
      const seen = new Map();
      const light = () => {
        // The topmost section that crosses the band a little under the bar.
        let here = null;
        for (const [a, section] of spots) if (seen.get(section)) { here = a; break; }
        for (const [a] of spots) a.toggleAttribute('data-here', a === here);
      };
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) seen.set(e.target, e.isIntersecting);
        light();
      }, { rootMargin: '-30% 0px -60% 0px' });
      for (const [, section] of spots) io.observe(section);
    }
  }
}

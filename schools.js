// The schools page (schools.html, fr/schools.html, es/schools.html): checks the optional "Get
// updates" form and sends it. The words it shows come from the form's data-say-* attributes, so
// the three pages share this file.
//
// The page loads no analytics, and the form sends only what the grown-up typed, tagged "schools",
// with a note of the consent they ticked (the exact words and the time, which CASL asks us to keep).
{
  // TODO(Remi): where sign-ups go. Make a free form at https://formspree.io (the free plan takes
  // 50 a month) and paste its address here, like 'https://formspree.io/f/abcdwxyz'. The pages'
  // Content-Security-Policy already lets them reach formspree.io. While this is empty, sending
  // opens the grown-up's own email app with their details, addressed to MAIL_TO.
  const FORM_ENDPOINT = '';
  const MAIL_TO = 'hello@slothjam.com';
  // Every sign-up carries this tag, to tell school sign-ups apart from anything else.
  const LIST = 'schools';
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const form = document.querySelector('[data-updates]');
  if (form) {
    const words = form.dataset;
    const say = form.querySelector('[data-say]');
    const button = form.querySelector('button[type="submit"]');
    const done = document.querySelector('[data-updates-done]');
    const fields = [...form.querySelectorAll('input, select')].filter((el) => !el.name.startsWith('_'));
    const tell = (text, wrong = false) => {
      say.textContent = text;
      say.classList.toggle('wrong', wrong);
    };

    const problem = (el) => {
      if (el.type === 'checkbox') return el.required && !el.checked ? words.sayConsent : '';
      const value = el.value.trim();
      if (!value) return el.required ? (el.tagName === 'SELECT' ? words.sayChoose : words.sayRequired) : '';
      if (el.type === 'email' && !EMAIL.test(value)) return words.sayEmail;
      return '';
    };
    // Marks a field and writes its message under it. True when it is fine.
    const check = (el) => {
      const text = problem(el);
      el.setAttribute('aria-invalid', String(Boolean(text)));
      const note = document.getElementById(`${el.id}-error`);
      if (note) note.textContent = text;
      return !text;
    };
    // A field is checked when it is left with something in it, and again as it is fixed.
    for (const el of fields) {
      el.addEventListener('blur', () => {
        if (el.type !== 'checkbox' && el.value.trim()) check(el);
      });
      el.addEventListener(el.tagName === 'INPUT' && el.type !== 'checkbox' ? 'input' : 'change', () => {
        if (el.getAttribute('aria-invalid') === 'true') check(el);
      });
    }

    const value = (name) => form.elements[name].value.trim();
    const entry = () => ({
      list: LIST,
      name: value('name'),
      role: value('role'),
      organization: value('organization'),
      district: value('district'),
      region: value('region'),
      country: value('country'),
      email: value('email'),
      consent: 'yes',
      consent_text: form.querySelector('[data-consent-text]').textContent.replace(/\s+/g, ' ').trim(),
      consent_at: new Date().toISOString(),
      language: document.documentElement.lang,
      page: window.location.origin + window.location.pathname,
    });
    const finish = () => {
      tell('');
      form.hidden = true;
      done.querySelector('p').textContent = words.sayDone;
      done.hidden = false;
      done.focus();
    };

    // With no form service yet, the grown-up's email app sends it.
    const mailIt = (sent) => {
      const lines = [
        `List: ${sent.list}`,
        `Name: ${sent.name}`,
        `Role: ${sent.role}`,
        `School or organization: ${sent.organization}`,
        `District or board: ${sent.district}`,
        `Province/state: ${sent.region}`,
        `Country: ${sent.country}`,
        `Email: ${sent.email}`,
        `Consent: ${sent.consent_text} (${sent.consent_at})`,
        `Page: ${sent.page}`,
      ];
      const subject = `Sloth Jam for Schools: updates sign-up [${LIST}]`;
      window.location.href = `mailto:${MAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      tell(words.sayMail);
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const wrong = fields.filter((el) => !check(el));
      if (wrong.length) {
        tell(words.sayFix, true);
        wrong[0].focus();
        return;
      }
      // Only a bot fills in the hidden box: it is told all went well and nothing is sent.
      if (form.elements._gotcha.value) return finish();
      const sent = entry();
      if (!FORM_ENDPOINT) return mailIt(sent);

      button.disabled = true;
      tell(words.saySending);
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ ...sent, _subject: `Sloth Jam for Schools: updates sign-up [${LIST}]` }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        finish();
      } catch {
        tell(words.sayFailed, true);
      } finally {
        button.disabled = false;
      }
    });
  }
}

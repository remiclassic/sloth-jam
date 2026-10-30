// The VTubers and streamers page (vtubers.html): checks the sign-up form and sends it to the
// collab function (apps/server/src/collab.ts), which emails it to Remi. The words it shows come
// from the form's data-say-* attributes, as on the schools page (schools.js).
{
  const ENDPOINT = 'https://ofkgibuwxrbmmzmbtgmt.supabase.co/functions/v1/collab/apply';
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CHANNEL = /^(https?:\/\/)?[^\s/]+\.[^\s]+$/i;

  const form = document.querySelector('[data-apply]');
  if (form) {
    const words = form.dataset;
    const say = form.querySelector('[data-say]');
    const button = form.querySelector('button[type="submit"]');
    const done = document.querySelector('[data-apply-done]');
    const platforms = form.querySelector('#a-platforms');
    const boxes = [...platforms.querySelectorAll('input[type="checkbox"]')];
    // The fields checked one by one (the platform boxes are checked together).
    const fields = [...form.querySelectorAll('input, select, textarea')].filter((el) => !el.name.startsWith('_') && el.name !== 'platforms');
    const tell = (text, wrong = false) => {
      say.textContent = text;
      say.classList.toggle('wrong', wrong);
    };

    const problem = (el) => {
      if (el === platforms) return boxes.some((b) => b.checked) ? '' : words.sayPlatforms;
      if (el.type === 'checkbox') return el.required && !el.checked ? (el.name === 'stream' ? words.sayStream : words.sayAdult) : '';
      const value = el.value.trim();
      if (!value) return el.required ? words.sayRequired : '';
      if (el.maxLength > 0 && value.length > el.maxLength) return words.sayLong;
      if (el.type === 'email' && !EMAIL.test(value)) return words.sayEmail;
      if (el.name === 'channel' && !CHANNEL.test(value)) return words.sayChannel;
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
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => {
        if (el.getAttribute('aria-invalid') === 'true') check(el);
      });
    }
    for (const box of boxes) {
      box.addEventListener('change', () => {
        if (platforms.getAttribute('aria-invalid') === 'true') check(platforms);
      });
    }

    const value = (name) => form.elements[name].value.trim();
    const entry = () => ({
      name: value('name'),
      email: value('email'),
      channel: value('channel'),
      platforms: boxes.filter((b) => b.checked).map((b) => b.value),
      platformOther: value('platformOther'),
      audience: value('audience'),
      persona: value('persona'),
      message: value('message'),
      stream: form.elements.stream.checked,
      adult: form.elements.adult.checked,
      _gotcha: form.elements._gotcha.value,
    });
    const finish = () => {
      tell('');
      form.hidden = true;
      done.querySelector('p').textContent = words.sayDone;
      done.hidden = false;
      done.focus();
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const wrong = [...fields, platforms].filter((el) => !check(el));
      if (wrong.length) {
        tell(words.sayFix, true);
        (wrong[0] === platforms ? boxes[0] : wrong[0]).focus();
        return;
      }
      // Only a bot fills in the hidden box: it is told all went well and nothing is sent.
      if (form.elements._gotcha.value) return finish();

      button.disabled = true;
      tell(words.saySending);
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(entry()),
        });
        if (res.status === 429) return tell(words.saySlow, true);
        // The server checks too; a field it refuses is marked like one checked here.
        if (res.status === 400) {
          const { fields: names = [] } = await res.json().catch(() => ({}));
          const marked = names.map((n) => (n === 'platforms' ? platforms : form.elements[n])).filter(Boolean);
          for (const el of marked) check(el) && el.setAttribute('aria-invalid', 'true');
          if (marked.length) return tell(words.sayFix, true);
        }
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

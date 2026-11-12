(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Random value generators (same idea as Postman's) ---------- */
  const int = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (list) => list[int(0, list.length - 1)];

  const FIRST = ['Sara', 'Omar', 'Maya', 'Karim', 'Lina', 'Youssef', 'Nour', 'Adam', 'Hana', 'Ziad'];
  const LAST = ['Brown', 'Hassan', 'Walker', 'Nasser', 'Ward', 'Smith', 'Ibrahim', 'Clarke', 'Fahmy', 'Reed'];
  const CITIES = ['Paris', 'Cairo', 'Lisbon', 'Oslo', 'Osaka', 'Toronto', 'Nairobi', 'Madrid'];
  const COUNTRIES = ['Egypt', 'Japan', 'Norway', 'Brazil', 'Canada', 'Kenya', 'Spain', 'Chile'];
  const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const chars = (n) => Array.from({ length: n }, () => ALNUM[int(0, ALNUM.length - 1)]).join('');

  const GEN = {
    timestamp: () => String(Math.floor(Date.now() / 1000)),
    isoTimestamp: () => new Date().toISOString(),
    randomInt: () => String(int(0, 1000)),
    randomAlphaNumeric: () => ALNUM[int(0, ALNUM.length - 1)],
    randomFirstName: () => pick(FIRST),
    randomLastName: () => pick(LAST),
    randomFullName: () => `${pick(FIRST)} ${pick(LAST)}`,
    randomEmail: () => `${pick(FIRST)}.${pick(LAST)}${int(10, 99)}@example.com`.toLowerCase(),
    randomUserName: () => `${pick(FIRST)}.${pick(LAST)}`,
    randomPassword: () => chars(10),
    randomPhoneNumber: () => `${int(100, 999)}-${int(100, 999)}-${int(1000, 9999)}`,
    randomCity: () => pick(CITIES),
    randomCountry: () => pick(COUNTRIES),
  };

  // Replace every {{$name}} with a fresh value, like Postman does on Send.
  const resolve = (text) =>
    text.replace(/\{\{\$(\w+)\}\}/g, (match, name) => (GEN[name] ? GEN[name]() : match));

  /* ---------- Tiny syntax highlighter ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const TOKEN = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|(\{\{[^}\n]+\}\})|\b(const|function|return)\b/g;

  function highlight(src) {
    let out = '';
    let last = 0;
    let m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) {
        out += `<span class="tk-cmt">${esc(m[1])}</span>`;
      } else if (m[2]) {
        const inner = esc(m[2]).replace(/\{\{[^}]+\}\}/g, (x) => `<span class="tk-var">${x}</span>`);
        out += `<span class="tk-str">${inner}</span>`;
      } else if (m[3]) {
        out += `<span class="tk-var">${esc(m[3])}</span>`;
      } else {
        out += `<span class="tk-kw">${m[4]}</span>`;
      }
      last = TOKEN.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  /* ---------- Clipboard + toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 1700);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  /* ---------- Code blocks: highlight + copy button ---------- */
  $$('.code').forEach((fig) => {
    const code = $('code', fig);
    if (!code) return;
    const raw = code.textContent;
    code.dataset.raw = raw;
    code.innerHTML = highlight(raw);

    if (fig.classList.contains('code-out')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code');
    btn.addEventListener('click', async () => {
      const ok = await copyText(code.dataset.raw);
      btn.textContent = ok ? 'Copied' : 'Press Ctrl+C';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
    });
    fig.appendChild(btn);
  });

  /* ---------- Send buttons for Example 1 and 2 ---------- */
  $$('[data-send]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const source = $(btn.dataset.send);
      const out = $(btn.dataset.out);
      const resolved = resolve(source.dataset.raw);
      out.dataset.raw = resolved;
      out.innerHTML = highlight(resolved);
    });
  });

  /* ---------- Variables table ---------- */
  const samples = $$('.sample');

  function fillSamples(animate) {
    samples.forEach((cell) => {
      const make = GEN[cell.dataset.sample];
      if (!make) return;
      if (animate && !reduceMotion) {
        cell.classList.add('is-rolling');
        setTimeout(() => {
          cell.textContent = make();
          cell.classList.remove('is-rolling');
        }, 160);
      } else {
        cell.textContent = make();
      }
    });
  }
  fillSamples(false);
  $('#reroll').addEventListener('click', () => fillSamples(true));

  $$('.token').forEach((tok) => {
    tok.addEventListener('click', async () => {
      const ok = await copyText(tok.dataset.copy);
      showToast(ok ? `Copied ${tok.dataset.copy}` : 'Copy failed. Select the text and press Ctrl+C.');
    });
  });

  const filter = $('#filter');
  const rows = $$('#vars tbody tr');
  const empty = $('#empty');
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach((row) => {
      const match = !q || row.textContent.toLowerCase().includes(q);
      row.hidden = !match;
      if (match) shown += 1;
    });
    empty.hidden = shown !== 0;
  });

  /* ---------- Hero stage ---------- */
  const PICKS = {
    email: { template: '"email": "{{$randomEmail}}"', variable: 'randomEmail' },
    name: { template: '"name": "{{$randomFullName}}"', variable: 'randomFullName' },
    age: { template: '"age": {{$randomInt}}', variable: 'randomInt' },
  };

  const stageTemplate = $('#stage-template');
  const stageResult = $('#stage-result');
  const stageSend = $('#stage-send');
  const chips = $$('.chip');
  let current = 'email';
  let rolling = false;

  const wrapBody = (line) => `{\n  ${line}\n}`;

  function renderTemplate() {
    stageTemplate.innerHTML = highlight(wrapBody(PICKS[current].template));
  }

  function renderResult(line) {
    stageResult.textContent = wrapBody(line);
  }

  function lineFor(key) {
    return resolve(PICKS[key].template);
  }

  function stageSendNow() {
    if (rolling) return;
    const final = lineFor(current);
    if (reduceMotion) {
      renderResult(final);
      return;
    }
    rolling = true;
    stageResult.setAttribute('aria-busy', 'true');
    let frames = 0;
    const timer = setInterval(() => {
      frames += 1;
      if (frames >= 9) {
        clearInterval(timer);
        renderResult(final);
        stageResult.setAttribute('aria-busy', 'false');
        rolling = false;
      } else {
        renderResult(lineFor(current));
      }
    }, 45);
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      current = chip.dataset.pick;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      renderTemplate();
      stageSendNow();
    });
  });

  stageSend.addEventListener('click', stageSendNow);

  renderTemplate();
  renderResult(lineFor(current));
  if (!reduceMotion) setTimeout(stageSendNow, 550);

  /* ---------- Reuse demo ---------- */
  const sendCompare = $('#compare-send');
  const resRegister = $('#res-register');
  const resLogin = $('#res-login');
  const verdict = $('#verdict');

  sendCompare.addEventListener('click', () => {
    const mode = $('input[name="mode"]:checked').value;
    if (mode === 'twice') {
      const first = GEN.randomEmail();
      const second = GEN.randomEmail();
      resRegister.textContent = `"email": "${first}"`;
      resLogin.textContent = `"email": "${second}"`;
      verdict.dataset.state = 'different';
      verdict.textContent = 'Two different emails: Login does not use the email Register just created.';
    } else {
      const stored = GEN.randomEmail();
      resRegister.textContent = `"email": "${stored}"`;
      resLogin.textContent = `"email": "${stored}"`;
      verdict.dataset.state = 'same';
      verdict.textContent = 'Same email in both requests: they share the stored userEmail value.';
    }
  });

  /* ---------- Scroll spy for the side navigation ---------- */
  const links = $$('.rail-nav a');
  const targets = links
    .map((a) => $(a.getAttribute('href')))
    .filter(Boolean);

  function setActive(id) {
    links.forEach((a) => {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
    );
    targets.forEach((t) => io.observe(t));
  }
})();

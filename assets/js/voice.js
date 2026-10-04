// NeverSkip — page voice. Neutral is the HTML itself; other voices swap the [data-v] copy in place.
// The page is complete and neutral without this file.
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const dataEl = $('#voice-copy');
  if (!dataEl) return;
  const { voices, page, moments } = JSON.parse(dataEl.textContent);
  const VOICES = Object.keys(voices);
  const RETYPE = 'h1, h2.display';

  // Neutral copy is whatever the page shipped with; capture it before anything rewrites it.
  const targets = $$('[data-v]');
  const neutral = Object.fromEntries(targets.map((el) => [el.dataset.v, el.innerHTML.trim()]));
  const copyFor = (voice, key) => (voice !== 'neutral' && page[voice]?.[key]) || neutral[key];

  // Per-viewer memory only; storage can be unavailable, so every access is guarded.
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
  };

  let current = 'neutral';

  // ---------- Swapping copy ----------

  const plain = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html;
    return t.content.textContent.replace(/\s+/g, ' ').trim();
  };

  const runs = new WeakMap();
  const retype = (el, html) => {
    const token = {};
    runs.set(el, token);
    const from = el.textContent.replace(/\s+/g, ' ').trim();
    const to = plain(html);
    const eraseMs = Math.min(260, from.length * 8);
    const typeMs = Math.min(560, to.length * 18);
    const start = performance.now();
    el.classList.add('is-typing');
    const step = (now) => {
      if (runs.get(el) !== token) return;
      const t = now - start;
      if (t < eraseMs) {
        el.textContent = from.slice(0, Math.round(from.length * (1 - t / eraseMs)));
      } else if (t < eraseMs + typeMs) {
        el.textContent = to.slice(0, Math.max(1, Math.round(to.length * ((t - eraseMs) / typeMs))));
      } else {
        el.innerHTML = html;
        el.classList.remove('is-typing');
        runs.delete(el);
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const crossfade = (el, html, done) => {
    el.classList.add('is-swapping');
    setTimeout(() => {
      el.innerHTML = html;
      el.classList.remove('is-swapping');
      done?.();
    }, 180);
  };

  // A voice can bring its own icon set (the app swaps to IconCollar in the devoted voice).
  const icons = $$('#favicon-64, #favicon-32, #touch-icon');
  const setIcons = (voice) => icons.forEach((link) => {
    link.href = link.href.replace(/app-icon[a-z-]*?-(favicon|apple)/, `${voices[voice].icon || 'app-icon'}-$1`);
  });

  const applyVoice = (voice, { animate = true } = {}) => {
    current = voice;
    root.dataset.voice = voice;
    setIcons(voice);
    for (const el of targets) {
      const html = copyFor(voice, el.dataset.v);
      if (el.dataset.voiceShown === voice || (!el.dataset.voiceShown && voice === 'neutral')) continue;
      el.dataset.voiceShown = voice;
      if (el.innerHTML.trim() === html && !runs.has(el)) continue;
      const after = el.matches('[data-words]') ? () => window.NeverSkip?.refreshWords() : null;
      if (!animate || reduce) {
        el.innerHTML = html;
        after?.();
      } else if (el.matches(RETYPE)) {
        retype(el, html);
      } else {
        crossfade(el, html, after);
      }
    }
    // Text-only milestones show their title on the sticky stage; let it re-read them.
    setTimeout(() => window.NeverSkip?.refreshStage(), animate && !reduce ? 200 : 0);
    renderMenu();
    showPersona(voice);
  };

  // ---------- Adult gate (voices with gate: true) ----------

  const gate = $('[data-voice-gate]');
  let pending = null;

  const setVoice = (voice) => {
    if (!VOICES.includes(voice) || voice === current) { renderMenu(); return; }
    if (voices[voice].gate && store.get(`ns.consent.${voice}`) !== 'yes') {
      pending = voice;
      if (gate?.showModal) gate.showModal();
      else if (confirm(`${voices[voice].name} is a voice for adults. Switch?`)) confirmGate();
      return;
    }
    store.set('ns.voice', voice);
    applyVoice(voice);
  };

  const confirmGate = () => {
    const voice = pending;
    if (voice) store.set(`ns.consent.${voice}`, 'yes');
    pending = null;
    if (voice) { store.set('ns.voice', voice); applyVoice(voice); }
  };

  const cancelGate = () => { pending = null; renderMenu(); showPersona(current); };
  // The button choice arrives with the form's submit, which fires at once; 'close' covers Escape.
  gate?.querySelector('form')?.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'confirm') confirmGate();
    else cancelGate();
  });
  gate?.addEventListener('close', () => { if (pending) cancelGate(); });

  // ---------- Voice menu in the nav ----------

  const menuWrap = $('[data-voice-menu]');
  const toggle = $('[data-voice-toggle]');
  const menu = $('#voice-menu');
  const options = $$('[data-voice-set]');
  const currentLabel = $('[data-voice-current]');

  const renderMenu = () => {
    options.forEach((o) => o.setAttribute('aria-checked', String(o.dataset.voiceSet === current)));
    if (currentLabel) currentLabel.textContent = voices[current].name;
  };

  const openMenu = (open) => {
    if (!menu || !toggle) return;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) (options.find((o) => o.dataset.voiceSet === current) || options[0])?.focus();
  };

  toggle?.addEventListener('click', () => openMenu(menu.hidden));
  options.forEach((o, i) => {
    o.addEventListener('click', () => { openMenu(false); toggle.focus(); setVoice(o.dataset.voiceSet); });
    o.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        options[(i + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length].focus();
      }
    });
  });
  document.addEventListener('click', (e) => { if (menu && !menu.hidden && !menuWrap.contains(e.target)) openMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu && !menu.hidden) { openMenu(false); toggle.focus(); }
  });

  // ---------- Persona preview ----------

  const tabs = $$('.persona-tab[data-persona]');
  const preview = $('[data-persona-preview]');
  const desc = $('[data-persona-desc]');
  const apply = $('[data-persona-apply]');
  const momentEls = $$('[data-moment]');
  let previewing = 'neutral';

  const showPersona = (voice) => {
    previewing = voice;
    tabs.forEach((t) => {
      const on = t.dataset.persona === voice;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (preview) {
      preview.setAttribute('aria-labelledby', `persona-tab-${voice}`);
      preview.dataset.persona = voice;
    }
    if (desc) desc.textContent = voices[voice].desc;
    momentEls.forEach((el) => {
      const text = moments[voice][el.dataset.moment];
      if (el.textContent === text) return;
      if (reduce) el.textContent = text;
      else crossfade(el, text);
    });
    if (apply) {
      apply.hidden = false;
      const same = voice === current;
      apply.disabled = same;
      apply.textContent = same
        ? `You’re reading this page in the ${voices[voice].name} voice`
        : `Read this page in the ${voices[voice].name} voice`;
    }
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showPersona(t.dataset.persona));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      showPersona(next.dataset.persona);
    });
  });
  apply?.addEventListener('click', () => setVoice(previewing));

  // ---------- Start ----------

  // A link can ask for a voice (?voice=drill); otherwise use what this visitor picked before.
  const asked = new URLSearchParams(location.search).get('voice');
  const initial = VOICES.includes(asked) ? asked : store.get('ns.voice');
  root.dataset.voice = 'neutral';
  renderMenu();
  showPersona('neutral');
  if (initial && initial !== 'neutral' && VOICES.includes(initial)) {
    if (voices[initial].gate && store.get(`ns.consent.${initial}`) !== 'yes') setVoice(initial);
    else applyVoice(initial, { animate: false });
  }
})();

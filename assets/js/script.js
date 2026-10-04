// NeverSkip — variation 7 "Voices". Progressive enhancement: the page is complete without this file.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

  // Nav gets a glass background once the page moves.
  const nav = $('[data-nav]');
  const updateNav = () => nav && nav.classList.toggle('is-scrolled', scrollY > 12);

  // Reveal on scroll.
  const revealer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      revealer.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => revealer.observe(el));

  // Hero devices tilt with the pointer.
  const tilt = $('[data-tilt]');
  if (tilt && !reduce && matchMedia('(pointer: fine)').matches) {
    let frame = 0;
    addEventListener('pointermove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        tilt.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
        tilt.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
      });
    }, { passive: true });
  }

  // Feature tiles: a spotlight that follows the cursor across the grid.
  const grid = $('[data-spotlight]');
  if (grid) {
    grid.addEventListener('pointermove', (e) => {
      for (const card of grid.children) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
    });
  }

  // ---------- Timeline: sticky stage fed by the milestones ----------

  const story = $('[data-story]');
  const stage = $('[data-stage]');
  const items = story ? $$('.milestone', story) : [];
  let active = -1;
  let shownYear = 0;
  let yearFrame = 0;

  const screens = $('[data-stage-screens]');
  const auxSlot = $('[data-stage-aux] [data-stage-slot]');
  const watchSlot = $('[data-stage-watch] [data-stage-slot]');
  const yearEl = $('[data-stage-year]');
  const yearSmall = $('[data-stage-year-small]');
  const monthEl = $('[data-stage-month]');
  const cardDate = $('[data-stage-card-date]');
  const cardTitle = $('[data-stage-card-title]');
  const scrub = $('[data-scrub]');
  const ticks = $('[data-scrub-ticks]');
  const railFill = story && $('.story__rail-fill', story);
  const track = story && $('.story__track', story);

  const cloneShot = (img) => {
    const copy = img.cloneNode();
    copy.removeAttribute('loading');
    copy.removeAttribute('class');
    copy.alt = '';
    return copy;
  };

  // Each milestone remembers its main screen and, for the v2 group, its extra phone and watch.
  const scenes = items.map((item) => {
    item.style.setProperty('--m-accent', item.dataset.accent);
    const phones = $$('.milestone__shot[data-device="phone"]', item);
    const watch = $('.milestone__shot[data-device="watch"]', item);
    let screen = null;
    if (phones[0] && screens) {
      screen = cloneShot(phones[0]);
      screen.className = 'stage__screen';
      screens.appendChild(screen);
    }
    return {
      item,
      screen,
      aux: phones[1] || null,
      watch: watch || null,
      year: Number(item.dataset.year),
      month: item.dataset.month,
      accent: item.dataset.accent,
      // Read live: the page voice can rewrite these after load.
      dateEl: $('.milestone__date', item),
      titleEl: $('.milestone__title', item),
    };
  });

  if (ticks) {
    ticks.innerHTML = scenes.map((s) => `<span>${s.month} ’${String(s.year).slice(2)}</span>`).join('');
  }
  if (scrub) scrub.max = String(Math.max(0, scenes.length - 1));

  const tickYear = (target) => {
    if (!yearEl) return;
    cancelAnimationFrame(yearFrame);
    if (reduce || !shownYear) {
      shownYear = target;
      yearEl.textContent = target;
      return;
    }
    const from = shownYear;
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / 700);
      const eased = 1 - Math.pow(1 - t, 3);
      shownYear = Math.round(from + (target - from) * eased);
      yearEl.textContent = shownYear;
      if (t < 1) yearFrame = requestAnimationFrame(step);
    };
    yearFrame = requestAnimationFrame(step);
  };

  const fillSlot = (slot, img) => {
    if (!slot || !img || slot.firstChild) return;
    slot.appendChild(cloneShot(img));
  };

  const setActive = (index) => {
    if (index === active || !scenes[index]) return;
    active = index;
    const scene = scenes[index];

    scenes.forEach((s, i) => s.item.classList.toggle('is-active', i === index));

    // The phone shows the latest screen at or before this milestone.
    let shown = null;
    for (let i = index; i >= 0 && !shown; i--) shown = scenes[i].screen;
    scenes.forEach((s) => s.screen && s.screen.classList.toggle('is-active', s.screen === shown));

    if (stage) {
      const group = Boolean(scene.aux || scene.watch);
      if (group) {
        fillSlot(auxSlot, scene.aux);
        fillSlot(watchSlot, scene.watch);
      }
      stage.classList.toggle('is-group', group);
      stage.classList.toggle('has-card', !scene.screen);
      if (cardDate) cardDate.textContent = scene.dateEl?.textContent.trim() ?? '';
      if (cardTitle) cardTitle.textContent = scene.titleEl?.textContent.trim() ?? '';
    }

    if (story) story.style.setProperty('--era', scene.accent);
    tickYear(scene.year);
    if (yearSmall) yearSmall.textContent = scene.year;
    if (monthEl) monthEl.textContent = scene.month;
    if (scrub) scrub.value = String(index);
    if (ticks) [...ticks.children].forEach((t, i) => t.classList.toggle('is-active', i === index));
  };

  // The milestone nearest the middle of the viewport is the active one.
  const updateStory = () => {
    if (!scenes.length) return;
    const mid = innerHeight / 2;
    let best = 0;
    let bestDistance = Infinity;
    scenes.forEach((s, i) => {
      const r = s.item.getBoundingClientRect();
      const distance = Math.abs(r.top + r.height / 2 - mid);
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    });
    setActive(best);

    if (track && railFill) {
      const r = track.getBoundingClientRect();
      track.style.setProperty('--progress', clamp((mid - r.top) / r.height).toFixed(3));
    }
  };

  if (scrub) {
    scrub.addEventListener('input', () => {
      const index = Number(scrub.value);
      setActive(index);
      scenes[index].item.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  // ---------- Numbers: count up once visible ----------

  const counters = $$('[data-count]');
  const countUp = (el) => {
    const to = Number(el.dataset.count);
    const from = Number(el.dataset.from || 0);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const duration = 1400;
    const step = (now) => {
      const t = clamp((now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = `${Math.round(from + (to - from) * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!reduce && counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        countUp(e.target);
        counterObserver.unobserve(e.target);
      }
    }, { threshold: 0.6 });
    counters.forEach((el) => counterObserver.observe(el));
  }

  // ---------- Commit chart: bars grow in, staggered ----------

  const chart = $('[data-chart]');
  if (chart) {
    $$('.bar', chart).forEach((bar, i) => bar.style.setProperty('--i', i));
    const chartObserver = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        chart.classList.add('is-in');
        chartObserver.disconnect();
      }
    }, { threshold: 0.3 });
    chartObserver.observe(chart);
  }

  // ---------- Why rebuild: words light up as the paragraph scrolls through ----------

  const wordsBlock = $('[data-words]');
  let words = [];
  const splitWords = () => {
    if (!wordsBlock || reduce) return;
    const walker = document.createTreeWalker(wordsBlock, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { fragment.appendChild(document.createTextNode(part)); continue; }
        const span = document.createElement('span');
        span.className = 'w';
        span.textContent = part;
        fragment.appendChild(span);
      }
      node.replaceWith(fragment);
    }
    words = $$('.w', wordsBlock);
  };
  splitWords();
  const updateWords = () => {
    if (!words.length) return;
    const r = wordsBlock.getBoundingClientRect();
    const progress = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35));
    const lit = Math.round(progress * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  };

  // ---------- Appearance switch (footer) ----------
  // "system" follows the device; "light"/"dark" are remembered in this browser only. The head script
  // applies a remembered choice before first paint.

  const themeSwitch = $('[data-theme-switch]');
  if (themeSwitch) {
    const html = document.documentElement;
    const options = $$('[data-theme-set]', themeSwitch);
    const metas = $$('meta[data-theme-color]');
    const colors = Object.fromEntries(metas.map((m) => [m.dataset.themeColor, m.content]));
    const stored = () => { try { return localStorage.getItem('ns.theme') || 'system'; } catch { return 'system'; } };
    const render = (theme) => options.forEach((o) => {
      const on = o.dataset.themeSet === theme;
      o.setAttribute('aria-checked', String(on));
      o.tabIndex = on ? 0 : -1;
    });
    const apply = (theme) => {
      if (theme === 'system') delete html.dataset.theme;
      else html.dataset.theme = theme;
      try {
        if (theme === 'system') localStorage.removeItem('ns.theme');
        else localStorage.setItem('ns.theme', theme);
      } catch { /* private mode: the choice lasts for this page only */ }
      // Keep the browser's toolbar colour in step with a forced theme.
      metas.forEach((m) => { m.content = theme === 'system' ? colors[m.dataset.themeColor] : colors[theme]; });
      render(theme);
    };
    const initial = stored();
    render(initial);
    if (initial !== 'system') metas.forEach((m) => { m.content = colors[initial]; });
    options.forEach((o, i) => {
      o.addEventListener('click', () => apply(o.dataset.themeSet));
      o.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length];
        next.focus();
        apply(next.dataset.themeSet);
      });
    });
  }

  // ---------- One scroll loop ----------

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateNav();
      updateStory();
      updateWords();
    });
  };
  // voice.js calls these after it rewrites the page copy.
  window.NeverSkip = {
    refreshWords() { splitWords(); updateWords(); },
    refreshStage() { const index = active; active = -1; setActive(Math.max(0, index)); },
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();
})();

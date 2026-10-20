/* ============================================================
   Переключение темы (светлая/тёмная) и языка (ru/en)
   ============================================================ */
(function () {
  var root = document.documentElement;

  /* ---------- ТЕМА ---------- */
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }
  function currentTheme() {
    try {
      var saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'light'; /* по умолчанию светлая */
  }

  /* ---------- ЯЗЫК ---------- */
  function applyLang(lang) {
    var nodes = document.querySelectorAll('[data-en]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-ru') === null) {
        el.setAttribute('data-ru', el.innerHTML);
      }
      el.innerHTML = (lang === 'en') ? el.getAttribute('data-en') : el.getAttribute('data-ru');
    }
    root.setAttribute('lang', lang);
    /* подпись кнопки = язык, на который переключим */
    var btns = document.querySelectorAll('.lang-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].textContent = (lang === 'en') ? 'rus' : 'eng';
    }
  }
  function currentLang() {
    try {
      /* запоминаем только явный выбор посетителя (клик по eng/rus) */
      var saved = localStorage.getItem('lang-choice');
      if (saved === 'en' || saved === 'ru') return saved;
    } catch (e) {}
    return 'en'; /* по умолчанию английский */
  }

  /* ---------- СТРЕЛКА «НАВЕРХ» ---------- */
  function setupToTop() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'to-top';
    btn.setAttribute('aria-label', 'Наверх');
    btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M12 18V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M6 10l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    document.body.appendChild(btn);

    var panels = document.querySelectorAll('.feed, .doc-scroll');
    var THRESHOLD = 40;
    function atBottom(el) {
      /* учитываем только то, что действительно прокручивается */
      if (el.scrollHeight <= el.clientHeight + 1) return false;
      return el.scrollTop + el.clientHeight >= el.scrollHeight - THRESHOLD;
    }
    function update() {
      var show = atBottom(document.documentElement);
      for (var i = 0; i < panels.length && !show; i++) show = atBottom(panels[i]);
      btn.classList.toggle('is-visible', show);
    }
    for (var i = 0; i < panels.length; i++) panels[i].addEventListener('scroll', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- ТЕНЬ ПОД КУРСОРОМ ---------- */
  function setupCursorShadow() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var shadow = document.createElement('span');
    shadow.className = 'cursor-shadow';
    shadow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(shadow);

    var frame = 0, x = 0, y = 0;
    function hide() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      shadow.classList.remove('is-visible');
    }
    document.addEventListener('pointermove', function (e) {
      if (!fine.matches || reduced.matches || e.pointerType === 'touch') { hide(); return; }
      x = e.clientX; y = e.clientY;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        shadow.style.setProperty('--shadow-x', (x - 90) + 'px');
        shadow.style.setProperty('--shadow-y', (y - 75) + 'px');
        shadow.classList.add('is-visible');
      });
    }, { passive: true });
    document.addEventListener('pointerout', function (e) { if (!e.relatedTarget) hide(); });
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', function () { if (document.hidden) hide(); });
  }

  /* ---------- ЛОУДЕР (как на neundex.com) ----------
     счётчик 0% → 100% за 2 с, пауза 1 с, затем экран плавно исчезает за 1 с.
     При смене темы/языка: экран проявляется, страница перезагружается
     с новыми настройками и проигрывает тот же лоудер. */
  var COUNT_MS = 2000, HOLD_MS = 1000, FADE_MS = 1000;
  var SCROLL_KEY = 'loader-scroll';

  function panelsList() { return document.querySelectorAll('.feed, .doc-scroll'); }

  function saveScroll() {
    var pos = { path: location.pathname, win: window.scrollY, panels: [] };
    var p = panelsList();
    for (var i = 0; i < p.length; i++) pos.panels.push(p[i].scrollTop);
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(pos)); } catch (e) {}
  }
  function restoreScroll() {
    var pos = null;
    try { pos = JSON.parse(sessionStorage.getItem(SCROLL_KEY)); sessionStorage.removeItem(SCROLL_KEY); } catch (e) {}
    if (!pos || pos.path !== location.pathname) return;
    var p = panelsList();
    for (var i = 0; i < p.length; i++) p[i].scrollTop = pos.panels[i] || 0;
    window.scrollTo(0, pos.win || 0);
  }

  function makeLoader() {
    var el = document.createElement('div');
    el.className = 'preloader';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="preloader__counter">0%</div>';
    document.body.appendChild(el);
    return el;
  }

  function runLoader() {
    try { sessionStorage.removeItem('loader-force'); } catch (e) {}
    var el = makeLoader();
    var counter = el.firstChild;
    root.classList.add('loader-ready');
    restoreScroll();
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - t0) / COUNT_MS);
      counter.textContent = Math.round(p * 100) + '%';
      if (p < 1) { requestAnimationFrame(tick); return; }
      setTimeout(function () {
        el.classList.add('is-out');
        root.classList.remove('loading', 'loader-ready');
        document.dispatchEvent(new CustomEvent('loader:done'));
        setTimeout(function () { el.remove(); }, FADE_MS);
      }, HOLD_MS);
    }
    requestAnimationFrame(tick);
  }

  /* показать экран лоудера, сохранить выбор и перезагрузить страницу */
  var switching = false;
  function switchWithLoader(save) {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { save(); location.reload(); return; }
    if (switching) return;
    switching = true;
    var el = makeLoader();
    el.classList.add('is-switch', 'is-entering');
    el.getBoundingClientRect();            /* чтобы transition сработал */
    el.classList.remove('is-entering');
    setTimeout(function () {
      save();
      saveScroll();
      try { sessionStorage.setItem('loader-force', '1'); } catch (e) {}
      location.reload();
    }, 350);
  }

  /* ---------- инициализация ---------- */
  function init() {
    applyTheme(currentTheme());
    applyLang(currentLang());
    setupToTop();
    setupCursorShadow();
    if (root.classList.contains('loading')) runLoader();

    document.addEventListener('click', function (e) {
      var themeBtn = e.target.closest('.theme-btn');
      if (themeBtn) {
        var nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        switchWithLoader(function () { applyTheme(nextTheme); });
        return;
      }
      /* «подняться наверх»: на десктопе скроллится лента/doc, а не страница */
      var toTop = e.target.closest('a[href="#top"], .to-top');
      if (toTop) {
        e.preventDefault();
        var panels = document.querySelectorAll('.feed, .doc-scroll');
        for (var k = 0; k < panels.length; k++) {
          panels[k].scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      var langBtn = e.target.closest('.lang-btn');
      if (langBtn) {
        var next = root.getAttribute('lang') === 'en' ? 'ru' : 'en';
        switchWithLoader(function () {
          try { localStorage.setItem('lang-choice', next); } catch (e) {}
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

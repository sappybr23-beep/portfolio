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
    try { localStorage.setItem('lang', lang); } catch (e) {}
    /* подпись кнопки = язык, на который переключим */
    var btns = document.querySelectorAll('.lang-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].textContent = (lang === 'en') ? 'rus' : 'eng';
    }
  }
  function currentLang() {
    try {
      var saved = localStorage.getItem('lang');
      if (saved === 'en' || saved === 'ru') return saved;
    } catch (e) {}
    return 'ru'; /* по умолчанию русский */
  }

  /* ---------- инициализация ---------- */
  function init() {
    applyTheme(currentTheme());
    applyLang(currentLang());

    document.addEventListener('click', function (e) {
      var themeBtn = e.target.closest('.theme-btn');
      if (themeBtn) {
        applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        return;
      }
      var langBtn = e.target.closest('.lang-btn');
      if (langBtn) {
        applyLang(root.getAttribute('lang') === 'en' ? 'ru' : 'en');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

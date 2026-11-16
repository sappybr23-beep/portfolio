/* ============================================================
   Модалка «контакты» (как кнопка Contact на mishanaer.com):
   — открывается кнопками [data-contact] и клавишей C;
   — клик по строке копирует значение, иконка превращается в галочку;
   — закрывается крестиком, кликом по фону и Esc.
   ============================================================ */
(function () {
  var root = document.documentElement;

  var CONTACTS = [
    { key: 'email', ru: 'почта', en: 'email', value: 'sappy_br@yahoo.com',
      icon: '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
    { key: 'telegram', ru: 'телеграм', en: 'telegram', value: '@antwentythree',
      icon: '<path d="M21 4 3 11l6.5 2.5L12 20l3.5-4.5L20 19 21 4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9.5 13.5 6-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
    { key: 'phone', ru: 'телефон', en: 'phone', value: '+7 (999) 247-23-23', copy: '+79992472323',
      icon: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' }
  ];
  var CHECK = '<path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  var TEXT = {
    ru: { title: 'контакты', close: 'закрыть', copy: 'скопировать', copied: 'скопировано' },
    en: { title: 'contact', close: 'close', copy: 'copy', copied: 'copied' }
  };

  var overlay, dialog, lastFocus = null;

  function lang() { return root.getAttribute('lang') === 'ru' ? 'ru' : 'en'; }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'contact-overlay';
    overlay.hidden = true;

    var rows = CONTACTS.map(function (c) {
      return '<button type="button" class="contact-row" data-copy="' + (c.copy || c.value) + '" data-key="' + c.key + '">' +
        '<span class="contact-row__icon" aria-hidden="true">' +
          '<svg class="ci ci--main" viewBox="0 0 24 24" fill="none">' + c.icon + '</svg>' +
          '<svg class="ci ci--check" viewBox="0 0 24 24" fill="none">' + CHECK + '</svg>' +
        '</span>' +
        '<span class="contact-row__text">' +
          '<span class="contact-row__label"></span>' +
          '<span class="contact-row__value">' + c.value + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    overlay.innerHTML =
      '<div class="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title" tabindex="-1">' +
        '<div class="contact-dialog__head">' +
          '<h2 id="contact-title" class="contact-dialog__title"></h2>' +
          '<button type="button" class="contact-close"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
        '</div>' +
        '<div class="contact-list">' + rows + '</div>' +
        '<div class="contact-live" aria-live="polite"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    dialog = overlay.querySelector('.contact-dialog');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('.contact-close')) { close(); return; }
      var row = e.target.closest('.contact-row');
      if (row) copy(row);
    });
  }

  function localize() {
    var l = lang(), t = TEXT[l];
    overlay.querySelector('.contact-dialog__title').textContent = t.title;
    overlay.querySelector('.contact-close').setAttribute('aria-label', t.close);
    CONTACTS.forEach(function (c) {
      var row = overlay.querySelector('[data-key="' + c.key + '"]');
      row.querySelector('.contact-row__label').textContent = c[l];
      row.setAttribute('aria-label', t.copy + ' ' + c[l] + ': ' + c.value);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      /* если браузер не дал доступ к буферу — пробуем старый способ */
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      ta.remove();
    });
  }

  function copy(row) {
    copyText(row.getAttribute('data-copy')).then(function () {
      row.focus({ preventScroll: true });
      row.classList.add('is-copied');
      overlay.querySelector('.contact-live').textContent = TEXT[lang()].copied;
      clearTimeout(row._t);
      row._t = setTimeout(function () { row.classList.remove('is-copied'); }, 1600);
    }, function () {});
  }

  function open() {
    if (!overlay) build();
    if (!overlay.hidden) return;
    localize();
    lastFocus = document.activeElement;
    overlay.hidden = false;
    /* следующий кадр — чтобы сработал переход появления */
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    dialog.focus({ preventScroll: true });
    setExpanded(true);
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove('is-open');
    setExpanded(false);
    setTimeout(function () { overlay.hidden = true; }, 160);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function setExpanded(v) {
    var btns = document.querySelectorAll('[data-contact]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-expanded', v ? 'true' : 'false');
  }

  /* фокус не уходит за пределы модалки */
  function trapTab(e) {
    var items = dialog.querySelectorAll('button');
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function isTyping(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-contact]');
    if (btn) { e.preventDefault(); open(); }
  });

  document.addEventListener('keydown', function (e) {
    var isOpen = overlay && !overlay.hidden;
    if (isOpen && e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (isOpen && e.key === 'Tab') { trapTab(e); return; }
    /* C (и «С» в русской раскладке — та же физическая клавиша) */
    if (!isOpen && e.code === 'KeyC' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
        !e.repeat && !isTyping(e.target) && !root.classList.contains('loading')) {
      e.preventDefault();
      open();
    }
  });
})();

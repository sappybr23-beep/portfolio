/* ============================================================
   Анимации появления:
   — текст: «скрембл» — буквы перебирают случайные символы и встают на место
   — картинки: «мозаика» — крупные пиксели постепенно становятся чёткими
   Запускаются, когда блок попадает в экран. Уважают prefers-reduced-motion.
   ============================================================ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var CHARS = 'abcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщыэюя0123456789';
  var NBSP = ' ';
  var DENSITY = 0.38;      /* доля «пустых» клеток внутри мерцающей зоны */
  var WINDOW = 8;          /* сколько символов мерцает перед «фронтом» */
  var TICK = 45;           /* как часто перебираются случайные символы, мс */
  var STAGGER = 45;        /* задержка между блоками, появившимися вместе, мс */
  var IMG_DURATION = 900;
  var IMG_BLOCK = 40;      /* стартовый размер пикселя, px */

  var CONTAINERS = '.sidebar, .feed-inner, .doc-col';
  var SKIP = '.controls, .to-top, script, style, svg';

  function isRendered(el) { return el.getClientRects().length > 0; }
  function rnd() { return CHARS[(Math.random() * CHARS.length) | 0]; }
  function isKeep(ch) { return /\s/.test(ch) || ch === '-'; }

  /* ---------- ТЕКСТ ---------- */
  function blockOf(el) {
    while (el && el !== document.body) {
      var d = getComputedStyle(el).display;
      if (d !== 'inline' && d !== 'contents') return el;
      el = el.parentElement;
    }
    return el;
  }

  function collectTextGroups() {
    var groups = new Map();
    document.querySelectorAll(CONTAINERS).forEach(function (root) {
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (n.parentElement.closest(SKIP)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var n;
      while ((n = w.nextNode())) {
        var b = blockOf(n.parentElement);
        if (!groups.has(b)) groups.set(b, { el: b, nodes: [], total: 0, done: false });
        var g = groups.get(b);
        g.nodes.push({ node: n, text: n.nodeValue, start: g.total });
        g.total += n.nodeValue.length;
      }
    });
    return Array.from(groups.values());
  }

  function renderText(g, p, tick) {
    var front = p * (g.total + WINDOW);
    g.nodes.forEach(function (t) {
      if (!t.node.isConnected) return;  /* текст заменили (смена языка) — не трогаем */
      var out = '';
      for (var i = 0; i < t.text.length; i++) {
        var ch = t.text[i], idx = t.start + i;
        if (isKeep(ch) || idx < front - WINDOW) { out += ch; continue; }
        if (idx < front) {
          /* псевдослучайно, но стабильно в пределах одного «тика» */
          var r = Math.abs(Math.sin((idx + 1) * 12.9898 + tick * 78.233)) % 1;
          out += r < DENSITY ? NBSP : rnd();
        } else {
          out += NBSP;
        }
      }
      if (t.node.nodeValue !== out) t.node.nodeValue = out;
    });
  }

  function animateText(g, delay) {
    if (g.done) return;
    g.done = true;
    var dur = Math.max(450, Math.min(1100, g.total * 14));
    var t0 = performance.now() + delay;
    function frame(now) {
      var p = Math.max(0, Math.min(1, (now - t0) / dur));
      renderText(g, p, Math.floor(now / TICK));
      if (p < 1) requestAnimationFrame(frame);
      else g.nodes.forEach(function (t) { if (t.node.isConnected) t.node.nodeValue = t.text; });
    }
    requestAnimationFrame(frame);
  }

  /* ---------- КАРТИНКИ ---------- */
  function drawCover(ctx, img, w, h) {
    var ir = img.naturalWidth / img.naturalHeight, cr = w / h, sw, sh, sx, sy;
    if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
    else { sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }

  function animateImage(img) {
    if (img.dataset.revealed) return;
    img.dataset.revealed = '1';
    var r = img.getBoundingClientRect();
    if (!r.width || !r.height || !img.naturalWidth) { img.classList.remove('reveal-pending'); return; }

    var cs = getComputedStyle(img);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var canvas = document.createElement('canvas');
    canvas.className = img.className.replace('reveal-pending', '');
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    canvas.style.width = cs.width;
    canvas.style.height = r.height + 'px';
    canvas.style.borderRadius = cs.borderRadius;
    canvas.style.display = 'block';
    canvas.setAttribute('aria-hidden', 'true');

    var ctx = canvas.getContext('2d');
    var small = document.createElement('canvas');
    var sctx = small.getContext('2d');
    img.parentNode.insertBefore(canvas, img);
    img.style.display = 'none';

    var t0 = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - t0) / IMG_DURATION);
      var e = 1 - Math.pow(1 - p, 3);                 /* ease-out */
      var block = Math.max(1, Math.pow(IMG_BLOCK, 1 - e)) * dpr;
      var sw = Math.max(1, Math.ceil(canvas.width / block));
      var sh = Math.max(1, Math.ceil(canvas.height / block));
      small.width = sw; small.height = sh;
      drawCover(sctx, img, sw, sh);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = Math.min(1, p * 3);
      ctx.drawImage(small, 0, 0, sw, sh, 0, 0, canvas.width, canvas.height);
      if (p < 1) { requestAnimationFrame(frame); return; }
      img.style.display = '';
      img.classList.remove('reveal-pending');
      canvas.remove();
    }
    requestAnimationFrame(frame);
  }

  function whenLoaded(img, cb) {
    if (img.complete && img.naturalWidth) { cb(); return; }
    img.addEventListener('load', cb, { once: true });
    img.addEventListener('error', function () { img.classList.remove('reveal-pending'); }, { once: true });
  }

  /* ---------- ЗАПУСК ---------- */
  function init() {
    try {
      var groups = collectTextGroups();
      /* невидимое сейчас (скрыто через display:none) не трогаем, иначе оно останется пустым */
      groups = groups.filter(function (g) { return isRendered(g.el); });
      groups.forEach(function (g) { renderText(g, 0, 0); });   /* скрыть до появления */

      var images = Array.from(document.querySelectorAll(
        '.work-thumb img, .doc-col img, .sidebar .avatar')).filter(function (img) {
          return getComputedStyle(img).display !== 'none' && (!img.parentElement || isRendered(img.parentElement));
        });
      images.forEach(function (img) { img.classList.add('reveal-pending'); });

      var byEl = new Map(groups.map(function (g) { return [g.el, g]; }));
      var io = new IntersectionObserver(function (entries) {
        var batch = 0;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          if (en.target.tagName === 'IMG') {
            var img = en.target;
            if (img.complete && img.naturalWidth) { animateImage(img); }
            else {
              /* ещё не загружена (высота 0) — грузим и ждём, пока реально окажется в кадре */
              img.loading = 'eager';
              whenLoaded(img, function () { io.observe(img); });
            }
          } else {
            var g = byEl.get(en.target);
            if (g) animateText(g, (batch++) * STAGGER);
          }
        });
      }, { threshold: 0.12 });

      groups.forEach(function (g) { io.observe(g.el); });
      images.forEach(function (img) { io.observe(img); });
    } catch (e) {
      /* что-то пошло не так — показываем всё как есть */
      document.querySelectorAll('.reveal-pending').forEach(function (i) { i.classList.remove('reveal-pending'); });
    }
  }

  /* пока идёт лоудер — ждём его окончания, чтобы анимация была видна */
  function start() {
    if (document.documentElement.classList.contains('loading')) {
      document.addEventListener('loader:done', init, { once: true });
    } else init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

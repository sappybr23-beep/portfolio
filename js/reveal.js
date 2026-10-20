/* ============================================================
   Анимации появления:
   — текст: «скрембл» — буквы перебирают случайные символы и встают на место
   — картинки: «растворение мозаикой» — проявляются случайными прямоугольниками
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

  /* ---------- КАРТИНКИ: «растворение мозаикой» ----------
     Как на nikitakudaktin.com: картинка разбита на прямоугольники разного
     размера, которые проявляются в случайном порядке, линейно за 1 секунду. */
  var IMG_DURATION = 1000;            /* loadDuration: 1s, ease: none */
  var MOSAIC = {
    block: document.querySelector('.doc') ? 180 : 140,  /* кейсы / главная */
    scatter: 0.07,
    sizeVariation: 0.82,
    aspectVariation: 0.09
  };

  /* детерминированный хэш 0..1 */
  function hash(e) {
    var t = e | 0;
    t = Math.imul(t ^ (t >>> 16), 0x45d9f3b);
    t = Math.imul(t ^ (t >>> 16), 0x45d9f3b);
    return ((t ^ (t >>> 16)) >>> 0) / 0xffffffff;
  }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  function buildBlocks(w, h) {
    var scale = Math.max(0.4, Math.min(2, window.innerWidth / 2560));
    var size = Math.max(4, MOSAIC.block * scale);
    var blocks = [], u = 173;
    function add(x, y, bw, bh) {
      u += 1;
      var thr = hash(991 * u) + (hash(1297 * u) - 0.5) * MOSAIC.scatter * 0.32;
      blocks.push({ x: x, y: y, w: Math.min(bw, w - x), h: Math.min(bh, h - y), t: clamp01(thr) });
    }
    for (var y = 0; y < h;) {
      var rowH = Math.max(6, size * (1 + (hash(u + 31) - 0.5) * 1.6 * MOSAIC.sizeVariation));
      for (var x = 0; x < w;) {
        var bw = Math.max(6, size * (1 + (hash(43 * u) - 0.5) * 1.8 * MOSAIC.sizeVariation) *
                                 (1 + (hash(71 * u) - 0.5) * 2.4 * MOSAIC.aspectVariation));
        add(x, y, bw, rowH);
        x += bw;
      }
      y += rowH;
    }
    return blocks;
  }

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
    var W = r.width, H = r.height;

    /* готовая картинка в нужном кадрировании — один раз */
    var full = document.createElement('canvas');
    full.width = Math.round(W * dpr); full.height = Math.round(H * dpr);
    drawCover(full.getContext('2d'), img, full.width, full.height);

    var canvas = document.createElement('canvas');
    canvas.className = img.className.replace('reveal-pending', '');
    canvas.width = full.width; canvas.height = full.height;
    canvas.style.width = cs.width;
    canvas.style.height = H + 'px';
    canvas.style.borderRadius = cs.borderRadius;
    canvas.style.display = 'block';
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext('2d');

    var blocks = buildBlocks(W, H).sort(function (a, b) { return b.t - a.t; });
    var shown = 0;

    img.parentNode.insertBefore(canvas, img);
    img.style.display = 'none';

    var t0 = performance.now();
    function frame(now) {
      var p = clamp01((now - t0) / IMG_DURATION);
      var cover = 1 - p;
      /* блок виден, когда его порог выше «покрытия»; рисуем только новые */
      while (shown < blocks.length && blocks[shown].t > cover) {
        var b = blocks[shown++];
        var x0 = Math.max(0, Math.floor((b.x - 1) * dpr)), y0 = Math.max(0, Math.floor((b.y - 1) * dpr));
        var x1 = Math.min(full.width, Math.ceil((b.x + b.w + 1) * dpr)), y1 = Math.min(full.height, Math.ceil((b.y + b.h + 1) * dpr));
        if (x1 > x0 && y1 > y0) ctx.drawImage(full, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      }
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
      }, { threshold: 0 });

      groups.forEach(function (g) { io.observe(g.el); });
      images.forEach(function (img) { io.observe(img); });
    } catch (e) {
      /* что-то пошло не так — показываем всё как есть */
      document.querySelectorAll('.reveal-pending').forEach(function (i) { i.classList.remove('reveal-pending'); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

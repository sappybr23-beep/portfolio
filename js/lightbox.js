/* ============================================================
   Просмотр картинок (как на recent.design):
   клик по картинке — фон размывается, картинка «вырастает» из своего
   места в центр экрана на пружине; клик / Esc — обратно на место.
   ============================================================ */
(function () {
  var SELECTOR = '.doc-col img.media';
  function gap() { return window.innerWidth < 600 ? 16 : 24; }   /* отступ от краёв экрана, px */

  /* пружина как в framer-motion: { type: 'spring', bounce: .15, duration: .45 } */
  function springEasing(bounce, duration) {
    var w = 2 * Math.PI / duration, z = 1 - bounce;
    var wd = w * Math.sqrt(1 - z * z);
    function x(t) {
      return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
    }
    var total = duration * 1.6, steps = 48, pts = [];
    for (var i = 0; i <= steps; i++) pts.push(x(total * i / steps).toFixed(4));
    pts[steps] = '1';
    return { easing: 'linear(' + pts.join(', ') + ')', ms: Math.round(total * 1000) };
  }
  var SPRING = springEasing(0.15, 0.45);
  var EASING = SPRING.easing, DURATION = SPRING.ms;
  try {
    document.createElement('div').animate([{ opacity: 0 }, { opacity: 1 }], { easing: EASING, duration: 1 }).cancel();
  } catch (e) {
    EASING = 'cubic-bezier(.3, 1.15, .5, 1)';   /* старые браузеры без linear() */
    DURATION = 520;
  }
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var open = null;   /* { src, clone, backdrop } */

  function rectOf(el) {
    var r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  function targetRect(img) {
    var vw = window.innerWidth, vh = window.innerHeight, GAP = gap();
    var ratio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
    var w = Math.min(vw - GAP * 2, img.naturalWidth || Infinity);
    var h = w / ratio;
    if (h > vh - GAP * 2) { h = vh - GAP * 2; w = h * ratio; }
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  }
  function frame(r) {
    return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' };
  }
  function opts() {
    return { duration: reduced.matches ? 0 : DURATION, easing: EASING, fill: 'forwards' };
  }

  function show(img) {
    if (open || !img.complete || !img.naturalWidth) return;
    var from = rectOf(img), to = targetRect(img);
    var radius = getComputedStyle(img).borderRadius;

    var backdrop = document.createElement('div');
    backdrop.className = 'lightbox-backdrop';
    var clone = document.createElement('img');
    clone.className = 'lightbox-img';
    clone.src = img.currentSrc || img.src;
    clone.alt = img.alt;
    clone.style.borderRadius = radius;
    Object.assign(clone.style, frame(to));
    document.body.appendChild(backdrop);
    document.body.appendChild(clone);
    img.style.visibility = 'hidden';
    document.documentElement.classList.add('lightbox-open');

    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], opts());
    clone.animate([frame(from), frame(to)], opts());
    clone.animate([{ boxShadow: '0 0 0 rgba(0,0,0,0)' }, { boxShadow: '0 2px 5px rgba(0,0,0,.06), 0 10px 24px rgba(0,0,0,.07)' }], opts());
    open = { src: img, clone: clone, backdrop: backdrop, closing: false };
  }

  function hide() {
    if (!open || open.closing) return;
    var o = open;
    o.closing = true;
    var from = rectOf(o.clone), to = rectOf(o.src);
    o.clone.getAnimations().forEach(function (a) { a.cancel(); });
    Object.assign(o.clone.style, frame(to));
    var anim = o.clone.animate([frame(from), frame(to)], opts());
    o.backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced.matches ? 0 : 300, easing: 'cubic-bezier(.2, 0, 0, 1)', fill: 'forwards' });
    o.clone.animate([{ boxShadow: '0 2px 5px rgba(0,0,0,.06), 0 10px 24px rgba(0,0,0,.07)' }, { boxShadow: '0 0 0 rgba(0,0,0,0)' }], opts());
    anim.onfinish = function () {
      o.src.style.visibility = '';
      o.clone.remove();
      o.backdrop.remove();
      document.documentElement.classList.remove('lightbox-open');
      open = null;
    };
  }

  document.addEventListener('click', function (e) {
    if (open) { e.preventDefault(); hide(); return; }
    var img = e.target.closest && e.target.closest(SELECTOR);
    if (img) show(img);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  window.addEventListener('resize', function () {
    if (!open || open.closing) return;
    open.clone.getAnimations().forEach(function (a) { a.finish(); a.cancel(); });
    Object.assign(open.clone.style, frame(targetRect(open.src)));
  });
  /* пока картинка открыта, страница под ней не прокручивается */
  ['wheel', 'touchmove'].forEach(function (type) {
    document.addEventListener(type, function (e) { if (open) e.preventDefault(); }, { passive: false });
  });
})();

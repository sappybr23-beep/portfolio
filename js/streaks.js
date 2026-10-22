/* ============================================================
   Радужные световые шлейфы по краям экрана (как в N233 hero):
   «огненные» капли медленно плывут по большой орбите вокруг центра,
   за каждой тянется размытый хвост с расслоением цветов.
   Слой поверх сайта, но клики не перехватывает.
   ============================================================ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SCALE = 0.5;          /* рисуем в половинном разрешении — сам собой получается мягкий блюр */
  var TAIL = 26;            /* точек в хвосте */

  var canvas = document.createElement('canvas');
  canvas.className = 'streaks';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0, streaks = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeStreaks() {
    var count = window.innerWidth < 700 ? 4 : 7;
    streaks = [];
    for (var i = 0; i < count; i++) {
      streaks.push({
        angle: (i / count) * Math.PI * 2 + rand(-0.3, 0.3),
        speed: rand(0.06, 0.12) * (Math.random() < 0.25 ? -1 : 1),   /* рад/с */
        orbit: rand(0.56, 0.66),       /* доля от размера экрана */
        size: rand(18, 34),           /* радиус «головы», css px */
        tail: rand(0.35, 0.6),        /* длина хвоста, рад */
        warm: Math.random() < 0.75    /* тёплый (огонь) или холодный (сине-фиолетовый) */
      });
    }
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * SCALE);
    canvas.height = Math.round(H * SCALE);
    if (!streaks.length) makeStreaks();
  }

  function pos(s, a) {
    return { x: W / 2 + Math.cos(a) * W * s.orbit, y: H / 2 + Math.sin(a) * H * s.orbit };
  }

  function blob(x, y, r, color, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', alpha));
    g.addColorStop(1, color.replace('A', 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  var WARM = ['rgba(255,214,90,A)', 'rgba(255,140,40,A)', 'rgba(220,40,30,A)'];
  var COOL = ['rgba(150,120,255,A)', 'rgba(80,90,255,A)', 'rgba(40,30,160,A)'];
  var FRINGE_WARM = 'rgba(70,90,255,A)';    /* сине-фиолетовая кайма — «аберрация» */
  var FRINGE_COOL = 'rgba(255,120,60,A)';

  function draw(s, dark) {
    var dir = s.speed > 0 ? -1 : 1;           /* хвост тянется назад по орбите */
    var pal = s.warm ? WARM : COOL;
    var fringe = s.warm ? FRINGE_WARM : FRINGE_COOL;
    for (var i = TAIL; i >= 0; i--) {
      var t = i / TAIL;                       /* 0 — голова, 1 — конец хвоста */
      var a = s.angle + dir * s.tail * t;
      var p = pos(s, a);
      var r = s.size * (1 - t * 0.65) * (1 + t * 0.6);
      var fade = Math.pow(1 - t, 1.4);
      /* смещение каймы поперёк движения */
      var nx = Math.cos(a), ny = Math.sin(a), off = r * 0.35;
      blob(p.x + nx * off, p.y + ny * off, r * 1.1, fringe, 0.35 * fade);
      blob(p.x, p.y, r * 1.25, pal[0], 0.55 * fade);
      blob(p.x - nx * off * 0.5, p.y - ny * off * 0.5, r * 0.9, pal[1], 0.6 * fade);
      if (t < 0.35) blob(p.x, p.y, r * 0.55, dark ? pal[0] : pal[2], 0.9 * (1 - t / 0.35));
    }
    /* тёмное «ядро» как у миниатюры в оригинале (только в светлой теме) */
    if (!dark) {
      var h = pos(s, s.angle);
      blob(h.x, h.y, s.size * 0.5, 'rgba(40,10,5,A)', 0.55);
    }
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (var i = 0; i < streaks.length; i++) {
      var s = streaks[i];
      s.angle += s.speed * dt;
      draw(s, dark);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();

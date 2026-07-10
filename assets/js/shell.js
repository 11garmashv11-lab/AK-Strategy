/* =========================================================================
   Общая оболочка: язык (RU/EN), шапка с логотипом, навигация, футер,
   фоновая атмосфера и утилиты. Подключается на каждой странице.
   ========================================================================= */
(function () {
  var LANG = localStorage.getItem("ak_lang") || "ru";

  // ---- Утилиты (глобальные) ----
  window.T = function () { return LANG; };
  window.t = function (v) {
    if (v == null) return "";
    if (typeof v === "object" && (("ru" in v) || ("en" in v))) return v[LANG] != null ? v[LANG] : (v.ru || v.en);
    return v;
  };
  window.ico = function (n) { return (window.AK_ICONS && AK_ICONS[n]) || ""; };
  window.$ = function (s, r) { return (r || document).querySelector(s); };
  window.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  window.el = function (html) { var tpl = document.createElement("template"); tpl.innerHTML = String(html).trim(); return tpl.content.firstChild; };
  window.hexA = function (hex, a) {
    var c = hex.replace("#", ""); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    return "rgba(" + parseInt(c.substr(0, 2), 16) + "," + parseInt(c.substr(2, 2), 16) + "," + parseInt(c.substr(4, 2), 16) + "," + a + ")";
  };

  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOUCH = window.matchMedia && window.matchMedia("(hover: none)").matches;

  // Каскадный reveal + blur-to-sharp (blur снимается в CSS через .in)
  window.akReveal = function () {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = e.target;
        try {
          var sibs = n.parentElement ? $$(":scope > .reveal", n.parentElement) : [n];
          var idx = Math.max(0, sibs.indexOf(n));
          n.style.transitionDelay = ((idx % 8) * 70) + "ms";
        } catch (err) {}
        n.classList.add("in");
        io.unobserve(n);
      });
    }, { threshold: 0.1 });
    $$(".reveal:not(.in)").forEach(function (n) { io.observe(n); });
    setTimeout(function () { $$(".reveal:not(.in)").forEach(function (n) { n.classList.add("in"); }); }, 2600);
  };

  // Анимация чисел (data-count / data-pre / data-suf)
  window.akCountUp = function (root) {
    $$("[data-count]", root || document).forEach(function (elm) {
      if (elm.__counted) return;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { runCount(elm); io.disconnect(); } });
      }, { threshold: 0.5 });
      io.observe(elm);
    });
  };
  function runCount(elm) {
    elm.__counted = true;
    var target = parseFloat(elm.getAttribute("data-count")) || 0;
    var pre = elm.getAttribute("data-pre") || "", suf = elm.getAttribute("data-suf") || "";
    if (REDUCE) { elm.textContent = pre + target.toLocaleString("en-US") + suf; return; }
    var dur = 1200, start = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      elm.textContent = pre + Math.round(target * e).toLocaleString("en-US") + suf;
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  var LMAP = {
    home: { href: "index.html", key: "home" },
    company: { href: "company.html", key: "company" },
    journey: { href: "journey.html", key: "journey" },
    departments: { href: "departments.html", key: "departments" },
    problems: { href: "problems.html", key: "problems" },
  };

  var Shell = {
    page: "home",
    init: function (opts) {
      opts = opts || {};
      this.page = opts.page || "home";
      document.documentElement.lang = LANG;
      this.injectBackground();
      this.injectVeil();
      this.buildHeader();
      this.buildFooter();
      this.initCursor();
      this.initInteractions();
      this.bindTransitions();
    },

    injectBackground: function () {
      if ($(".bg-grid")) return;
      var frag = document.createDocumentFragment();
      ["bg-grid", "bg-aurora", "bg-noise"].forEach(function (c) {
        var d = document.createElement("div"); d.className = c; d.setAttribute("aria-hidden", "true"); frag.appendChild(d);
      });
      document.body.insertBefore(frag, document.body.firstChild);
      // Частицы — только на десктопе (на телефонах полноэкранный canvas грузит GPU и мешает зуму)
      if (!REDUCE && !TOUCH) {
        var cv = document.createElement("canvas"); cv.className = "bg-particles"; cv.setAttribute("aria-hidden", "true");
        document.body.insertBefore(cv, document.body.firstChild);
        startParticles(cv);
      }
    },

    // Прелоадер + плавные переходы между страницами (один оверлей)
    injectVeil: function () {
      if ($(".ak-veil")) return;
      var v = el(
        '<div class="ak-veil" aria-hidden="true">' +
          '<div class="ak-veil__mark"><img src="assets/img/logo-mark-white.png" alt="" /><span class="ak-veil__ring"></span></div>' +
        "</div>"
      );
      document.body.appendChild(v);
      // Возврат из bfcache — гарантированно скрыть
      window.addEventListener("pageshow", function (e) { if (e.persisted) v.classList.remove("show"); });
    },

    bindTransitions: function () {
      if (REDUCE) return;
      var v = $(".ak-veil");
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest("a[href]");
        if (!a) return;
        var href = a.getAttribute("href");
        if (!href || href[0] === "#" || a.target === "_blank" || /^(https?:|mailto:|tel:)/.test(href)) return;
        if (!/\.html($|[?#])/.test(href)) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        v.classList.add("show");
        setTimeout(function () { window.location.href = href; }, 440);
      });
    },

    // Кастомный курсор
    initCursor: function () {
      if (TOUCH || REDUCE) return;
      document.documentElement.classList.add("ak-cursor-on");
      var dot = el('<div class="ak-cursor" id="akCursor" aria-hidden="true"></div>');
      document.body.appendChild(dot);
      var x = window.innerWidth / 2, y = window.innerHeight / 2, cx = x, cy = y;
      window.addEventListener("mousemove", function (e) { x = e.clientX; y = e.clientY; }, { passive: true });
      (function loop() { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; dot.style.transform = "translate(" + cx + "px," + cy + "px)"; requestAnimationFrame(loop); })();
      var hoverSel = "a,button,.node,.hub-node,.spot,.dept-tab,.lang button,input,textarea";
      document.addEventListener("mouseover", function (e) { if (e.target.closest && e.target.closest(hoverSel)) dot.classList.add("hot"); });
      document.addEventListener("mouseout", function (e) { if (e.target.closest && e.target.closest(hoverSel)) dot.classList.remove("hot"); });
      document.addEventListener("mousedown", function () { dot.classList.add("down"); });
      document.addEventListener("mouseup", function () { dot.classList.remove("down"); });
    },

    // Magnetic-кнопки + spotlight-карточки
    initInteractions: function () {
      if (TOUCH || REDUCE) return;
      $$(".btn").forEach(function (b) {
        b.addEventListener("mousemove", function (e) {
          var r = b.getBoundingClientRect();
          b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.18 + "px," + (e.clientY - r.top - r.height / 2) * 0.28 + "px)";
        });
        b.addEventListener("mouseleave", function () { b.style.transform = ""; });
      });
      var spotSel = ".cover-nav a,.product,.prob-card,.growth-card,.j-card,.stat,.callout,.dt-agent";
      // делегирование, чтобы работало и для динамически добавленных карточек
      document.addEventListener("mousemove", function (e) {
        var c = e.target.closest && e.target.closest(spotSel);
        if (!c) return;
        if (!c.classList.contains("spot")) c.classList.add("spot");
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      }, { passive: true });
    },

    buildHeader: function () {
      var links = Object.keys(LMAP).map(function (id) {
        var m = LMAP[id];
        return '<a href="' + m.href + '" data-page="' + id + '"' + (id === Shell.page ? ' class="active"' : "") + '>' + t(AK.ui.nav[m.key]) + "</a>";
      }).join("");

      var header = el(
        '<header class="nav" id="akNav">' +
          '<a href="index.html" class="nav__logo">' +
            '<img src="assets/img/logo-mark-white.png" alt="AK" class="nav__mark-img" />' +
            '<span class="nav__name">Strategy</span>' +
          "</a>" +
          '<nav class="nav__links" id="akNavLinks">' + links + "</nav>" +
          '<div class="nav__right">' +
            '<div class="lang" id="akLang">' +
              '<button data-l="ru" class="' + (LANG === "ru" ? "on" : "") + '">RU</button>' +
              '<button data-l="en" class="' + (LANG === "en" ? "on" : "") + '">EN</button>' +
            "</div>" +
            '<button class="nav__burger" id="akBurger" aria-label="Menu"><span></span><span></span><span></span></button>' +
          "</div>" +
        "</header>"
      );
      document.body.insertBefore(header, document.body.firstChild.nextSibling);

      window.addEventListener("scroll", function () { header.classList.toggle("scrolled", window.scrollY > 20); });
      $("#akBurger").addEventListener("click", function () { $("#akNavLinks").classList.toggle("open"); });
      $$("#akNavLinks a").forEach(function (a) { a.addEventListener("click", function () { $("#akNavLinks").classList.remove("open"); }); });

      $$("#akLang button").forEach(function (b) {
        b.addEventListener("click", function () { Shell.setLang(b.getAttribute("data-l")); });
      });
    },

    buildFooter: function () {
      if ($(".footer")) return;
      var f = el(
        '<footer class="footer">' +
          '<div class="footer__inner">' +
            '<img src="assets/img/logo-primary-white.png" alt="AK Strategy" class="footer__logo" />' +
            "<p>" + t({ ru: "Инсталляция компании · подготовлено для тотального аудита и внешней консультации.", en: "Company installation · prepared for a total audit and external consultation." }) + "</p>" +
          "</div>" +
        "</footer>"
      );
      document.body.appendChild(f);
    },

    setLang: function (l) {
      if (l === LANG) return;
      LANG = l; localStorage.setItem("ak_lang", l);
      document.documentElement.lang = l;
      $$("#akLang button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-l") === l); });
      // обновляем навигацию
      $$("#akNavLinks a").forEach(function (a) {
        var id = a.getAttribute("data-page"); a.textContent = t(AK.ui.nav[LMAP[id].key]);
      });
      // обновляем футер
      var fp = $(".footer p"); if (fp) fp.textContent = t({ ru: "Инсталляция компании · подготовлено для тотального аудита и внешней консультации.", en: "Company installation · prepared for a total audit and external consultation." });
      window.dispatchEvent(new CustomEvent("aklang", { detail: { lang: l } }));
    },
  };

  // Плавающие частицы-«узлы» на фоне
  function startParticles(cv) {
    var ctx = cv.getContext("2d"), W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2), ps = [];
    function resize() {
      W = cv.clientWidth = window.innerWidth; H = cv.clientHeight = window.innerHeight;
      cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.min(34, Math.round(W * H / 56000));
      ps = []; for (var i = 0; i < n; i++) ps.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, r: Math.random() * 1.6 + 0.6 });
    }
    resize(); window.addEventListener("resize", resize);
    (function frame() {
      if (document.hidden) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        for (var j = i + 1; j < ps.length; j++) {
          var q = ps[j], dx = p.x - q.x, dy = p.y - q.y, d = dx * dx + dy * dy;
          if (d < 15000) { ctx.strokeStyle = "rgba(126,166,255," + (0.06 * (1 - d / 15000)) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
        ctx.fillStyle = "rgba(167,139,250,0.35)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(frame);
    })();
  }

  window.AKShell = Shell;
})();

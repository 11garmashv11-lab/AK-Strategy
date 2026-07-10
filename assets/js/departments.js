/* Отделы, продукты и цифры (departments.html) */
(function () {
  var activeDept = 0;

  function render() {
    $("#pEyebrow").textContent = t({ ru: "Продукты", en: "Products" });
    $("#pTitle").textContent = t({ ru: "Три продукта — одна траектория", en: "Three products — one trajectory" });
    $("#pSub").textContent = t({ ru: "Клиент проходит их последовательно: сначала чистим, затем усиливаем, затем финансируем.", en: "The client goes through them in sequence: first we clean, then boost, then finance." });
    $("#dEyebrow").textContent = t({ ru: "Под капотом", en: "Under the hood" });
    $("#dTitle").textContent = t({ ru: "Как работает каждый отдел", en: "How each department works" });
    $("#dSub").textContent = t({ ru: "Процессы по шагам и честно обозначенные сложности — без прикрас.", en: "Step-by-step processes and honestly stated difficulties — no sugar-coating." });
    $("#nEyebrow").textContent = t({ ru: "Масштаб", en: "Scale" });
    $("#nTitle").textContent = t({ ru: "Компания в цифрах", en: "The company in numbers" });
    $("#srcCenter").textContent = t({ ru: "канала", en: "channels" });

    // products
    $("#productGrid").innerHTML = AK.products.map(function (p) {
      var lines = p.lines.map(function (l) {
        return '<div class="pline"><div class="pline__name">' + t(l.name) + (t(l.note) ? "<small>" + t(l.note) + "</small>" : "") + '</div><div class="pline__price">' + p_price(l) + "</div></div>";
      }).join("");
      return '<article class="product reveal" style="--pc:' + p.color + '"><div class="product__top"><span class="product__ico">' + ico(p.icon) + '</span><div><span class="product__tag">' + t(p.tag) + '</span><h3>' + t(p.title) + "</h3></div></div>" +
        '<p class="product__sub">' + t(p.subtitle) + "</p>" + lines + '<div class="product__foot">' + t(p.footnote) + "</div></article>";
    }).join("");

    // dept tabs
    $("#deptTabs").innerHTML = AK.departments.map(function (d, i) {
      return '<button class="dept-tab' + (i === activeDept ? " active" : "") + '" data-i="' + i + '" style="--tc:' + d.color + '"><span class="ti">' + ico(d.icon) + "</span>" + t(d.name) + "</button>";
    }).join("");
    $$("#deptTabs .dept-tab").forEach(function (tb) {
      tb.addEventListener("click", function () { activeDept = +tb.getAttribute("data-i"); render(); });
    });
    renderDept(activeDept);

    // numbers
    $("#statGrid").innerHTML = AK.stats.map(function (s) {
      return '<div class="stat"><div class="stat__num" data-count="' + s.value + '" data-suf="' + (s.suffix || "") + '">0</div><div class="stat__label">' + t(s.label) + "</div></div>";
    }).join("");
    buildDonut();

    akReveal();
    akCountUp($("#statGrid"));
  }

  function p_price(l) { return l.price + '<small>' + t(l.per) + "</small>"; }

  function renderDept(i) {
    var d = AK.departments[i];
    var steps = t(d.steps).map(function (s, i) { return '<li style="--i:' + i + '"><span>' + s + "</span></li>"; }).join("");
    var probs = t(d.problems).map(function (p) { return '<div class="dept-prob"><b>⚠</b><span>' + p + "</span></div>"; }).join("");
    $("#deptBody").innerHTML =
      '<div class="dept-panel" style="--dc:' + d.color + '">' +
      '<div class="dept-panel__head"><span class="dept-ico">' + ico(d.icon) + '</span><div><h3>' + t(d.name) + '</h3><div class="h">' + t(AK.ui.head) + ": " + t(d.head) + "</div></div></div>" +
      '<div><div class="dept-sub">' + t(AK.ui.process) + '</div><ul class="dept-flow">' + steps + "</ul></div>" +
      '<div class="dept-side"><div class="dept-pointb"><div class="l">' + t(AK.ui.pointB) + '</div><p>' + t(d.pointB) + "</p></div>" +
      '<div class="dept-probs"><div class="pt">' + t(AK.ui.difficulties) + "</div>" + probs + "</div></div></div>";
  }

  function buildDonut() {
    var svg = $("#donut"), legend = $("#srcLegend");
    var ns = "http://www.w3.org/2000/svg";
    svg.innerHTML = "";
    var R = 80, C = 2 * Math.PI * R, cx = 105, cy = 105;
    var bg = document.createElementNS(ns, "circle");
    bg.setAttribute("cx", cx); bg.setAttribute("cy", cy); bg.setAttribute("r", R); bg.setAttribute("stroke", "rgba(255,255,255,0.06)");
    svg.appendChild(bg);
    var offset = 0, arcs = [];
    AK.clientSources.forEach(function (s) {
      var len = (s.value / 100) * C;
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", R);
      c.setAttribute("stroke", s.color); c.setAttribute("stroke-dasharray", C); c.setAttribute("stroke-dashoffset", C);
      c.style.transform = "rotate(" + (offset / C) * 360 + "deg)"; c.style.transformOrigin = cx + "px " + cy + "px";
      svg.appendChild(c); arcs.push({ c: c, len: len, C: C }); offset += len;
    });
    legend.innerHTML = AK.clientSources.map(function (s) {
      return '<div class="src-row"><span class="dot" style="background:' + s.color + '"></span><span class="name"><b>' + t(s.label) + "</b><span>" + t(s.note) + "</span></span><span class=\"pct\" style=\"color:" + s.color + '">' + s.value + "%</span></div>";
    }).join("");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { arcs.forEach(function (a) { a.c.setAttribute("stroke-dashoffset", a.C - a.len); }); io.disconnect(); } });
    }, { threshold: 0.3 });
    io.observe(svg);
  }

  document.addEventListener("DOMContentLoaded", function () {
    AKShell.init({ page: "departments" });
    render();
    window.addEventListener("aklang", render);
  });
})();

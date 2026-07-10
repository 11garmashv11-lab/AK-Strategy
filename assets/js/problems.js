/* Проблемы, универсалы и точки роста (problems.html) */
(function () {
  function render() {
    $("#prEyebrow").textContent = t({ ru: "Честная карта", en: "Honest map" });
    $("#prTitle").textContent = t({ ru: "Существующие проблемы", en: "Existing problems" });
    $("#prSub").textContent = t({ ru: "Собраны по отделам и по важности. Это фокус для консультации.", en: "Collected by department and severity. This is the focus for the consultation." });

    $("#calloutIco").innerHTML = ico("users");
    $("#calloutTitle").textContent = t({ ru: "Универсалы — нужна ваша обратная связь", en: "Universals — your feedback needed" });
    $("#calloutText").textContent = t(AK.universalsNote);

    var order = { high: 0, mid: 1, low: 2 };
    var sorted = AK.problems.slice().sort(function (a, b) { return order[a.severity] - order[b.severity]; });
    $("#probGrid").innerHTML = sorted.map(function (p) {
      var items = t(p.items).map(function (x) { return "<li>" + x + "</li>"; }).join("");
      return '<article class="prob-card reveal" style="--cc:' + p.color + '"><div class="prob-card__head"><h3>' + t(p.cat) + '</h3><span class="sev ' + p.severity + '">' + t(AK.ui.severity[p.severity]) + "</span></div><ul class=\"prob-list\">" + items + "</ul></article>";
    }).join("");

    $("#bridgeFrom").textContent = t({ ru: "Проблемы", en: "Problems" });
    $("#bridgeTo").textContent = t({ ru: "Точки роста", en: "Growth points" });

    $("#grEyebrow").textContent = t({ ru: "Куда расти", en: "Where to grow" });
    $("#grTitle").textContent = t(AK.ui.growthTitle);
    $("#growthGrid").innerHTML = AK.growth.map(function (g) {
      return '<article class="growth-card reveal"><div class="growth-ico">' + ico(g.icon) + "</div><h3>" + t(g.title) + "</h3><p>" + t(g.note) + "</p></article>";
    }).join("");

    akReveal();
  }

  document.addEventListener("DOMContentLoaded", function () {
    AKShell.init({ page: "problems" });
    render();
    window.addEventListener("aklang", render);
  });
})();

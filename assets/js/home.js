/* Обложка (index.html) */
(function () {
  function render() {
    $("#covLead").textContent = t(AK.company.lead);
    $("#covEnter").innerHTML = t(AK.ui.enter) + ico("arrow");
    $("#covJourney").textContent = t(AK.ui.nav.journey);

    var stats = AK.stats.slice(0, 4).map(function (s) {
      return '<div class="cover-stat"><b data-count="' + s.value + '" data-suf="' + (s.suffix || "") + '">0</b><span>' + t(s.label) + "</span></div>";
    }).join("");
    $("#covStats").innerHTML = stats;
    akCountUp($("#covStats"));

    var cards = [
      { href: "company.html", icon: "users", key: "company", d: { ru: "Зум вглубь: руководство, отделы и люди", en: "Zoom in: leadership, departments and people" } },
      { href: "journey.html", icon: "target", key: "journey", d: { ru: "От рекламы и заявки до результата", en: "From ad and request to the result" } },
      { href: "departments.html", icon: "gear", key: "departments", d: { ru: "Процессы каждого отдела по шагам", en: "Each department's process, step by step" } },
      { href: "problems.html", icon: "shield", key: "problems", d: { ru: "Честная карта проблем и точки роста", en: "An honest map of problems and growth points" } },
    ];
    $("#covNav").innerHTML = cards.map(function (c) {
      return '<a href="' + c.href + '"><div class="ci">' + ico(c.icon) + "</div><h4>" + t(AK.ui.nav[c.key]) + "</h4><p>" + t(c.d) + "</p></a>";
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    AKShell.init({ page: "home" });
    render();
    window.addEventListener("aklang", render);
  });
})();

/* =========================================================================
   ПУТЬ КЛИЕНТА — визуальный сторителлинг:
   маркетинг(рилс) → десктоп-CRM(продажа) → передача Sales→Client →
   скролл-сцена «Client — связующее звено» с оплатами и рефералами.
   ========================================================================= */
(function () {
  var byId = {}, clusterById = {};
  var HUB_TOP = 84;              // где «залипает» сцена (под шапкой)
  var hubScroll, hubStage, deptEls = [], lineEls = {}, coreEl, custEl, chipEl, refsEl, capEl, totalEl;
  var lastCap = null, lastTotal = -1, lastDept = [-1, -1, -1];

  var CRM = [
    { key: { ru: "Новая заявка", en: "New lead" }, color: "#a78bfa", leads: [{ n: { ru: "Заявка · Instagram", en: "Lead · Instagram" }, s: { ru: "только что", en: "just now" }, move: true }] },
    { key: { ru: "Контакт", en: "Contact" }, color: "#38bdf8", leads: [{ n: { ru: "Звонок / WhatsApp", en: "Call / WhatsApp" }, s: { ru: "дозвон", en: "connected" } }] },
    { key: { ru: "Консультация", en: "Consultation" }, color: "#22d3ee", leads: [{ n: { ru: "Разбор кейса", en: "Case review" }, s: { ru: "возражения", en: "objections" } }] },
    { key: { ru: "Сделка", en: "Deal" }, color: "#34d399", leads: [{ n: { ru: "Договор подписан", en: "Contract signed" }, s: { ru: "оплата ✓", en: "paid ✓" }, hot: true }] },
    { key: { ru: "→ Client dept", en: "→ Client dept" }, color: "#fbbf24", leads: [{ n: { ru: "Передан в сопровождение", en: "Handed to support" }, s: { ru: "старт работ", en: "work starts" } }] },
  ];

  // Этапы скролл-сцены (Client → технические отделы, оплаты)
  var HUB = [
    { id: "kitchen", color: "#34d399", icon: "shield", name: { ru: "Чистка", en: "Cleanup" }, pay: 500, band: [0.12, 0.34],
      cap: { t: { ru: "Этап 1 · Чистка (Kitchen)", en: "Stage 1 · Cleanup (Kitchen)" },
             d: { ru: "Client-менеджер ставит задачу отделу Kitchen — оспорить и удалить негатив сразу на трёх бюро: Experian, Equifax, TransUnion. Появляются первые удаления, скор оживает. Клиент видит результат и вносит очередную оплату своему Client-менеджеру.",
                  en: "The Client manager assigns Kitchen to dispute and remove negatives across all three bureaus: Experian, Equifax, TransUnion. First deletions land, the score wakes up. The client sees the result and makes the next payment to their Client manager." } } },
    { id: "tradelines", color: "#f472b6", icon: "rocket", name: { ru: "Буст", en: "Boost" }, pay: 400, band: [0.34, 0.56],
      cap: { t: { ru: "Этап 2 · Буст (Trade Lines)", en: "Stage 2 · Boost (Trade Lines)" },
             d: { ru: "Client передаёт клиента в Trade Lines — подключаются авторизованные линии с хорошей историей. За 30–45 дней они публикуются в бюро и подтягивают возраст и лимиты. Скор растёт, клиент оплачивает следующий этап.",
                  en: "Client hands the case to Trade Lines — authorized lines with strong history are attached. In 30–45 days they report to the bureaus, lifting age and limits. The score climbs, the client pays for the next stage." } } },
    { id: "financing", color: "#60a5fa", icon: "bank", name: { ru: "Финансирование", en: "Financing" }, pay: 700, band: [0.56, 0.78],
      cap: { t: { ru: "Этап 3 · Финансирование (Financing)", en: "Stage 3 · Financing" },
             d: { ru: "Финальный отдел собирает результат в деньги: карты, повышение лимитов и Loans. Сборка занимает 60–90 дней — «тихий период», который Client-менеджер держит на связи. Клиент получает доступ к финансированию и вносит крупнейшую оплату.",
                  en: "The final department turns the result into money: cards, higher limits and Loans. The build takes 60–90 days — a 'quiet period' the Client manager keeps warm. The client gains access to financing and makes the largest payment." } } },
  ];
  var CAP_INTRO = { t: { ru: "Client — связующее звено", en: "Client — the connecting link" },
                    d: { ru: "После продажи клиента ведёт Client department. Он стоит между клиентом и тремя техническими отделами: ставит задачи, контролирует сроки и собирает оплаты за каждый достигнутый этап. Листайте вниз — и посмотрите, как проходит работа.",
                         en: "After the sale, the Client department owns the client. It stands between the client and three technical departments: assigns tasks, controls timelines and collects payments for every completed stage. Scroll down to see how the work unfolds." } };
  var CAP_FINISH = { t: { ru: "Результат и реферальная система", en: "Result & referral system" },
                     d: { ru: "Все три отдела отработали — кредитный профиль клиента преобразился. Довольный клиент оставляет отзыв и приводит друзей и родственников: реферальная система даёт ~30% новых клиентов, и цикл запускается заново.",
                          en: "All three departments are done — the client's credit profile is transformed. A happy client leaves a review and brings friends and relatives: the referral system delivers ~30% of new clients, and the cycle starts again." } };

  function lerp(a, b, w) { return a + (b - a) * w; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function render() {
    AK.people.forEach(function (p) { byId[p.id] = p; });
    AK.clusters.forEach(function (c) { clusterById[c.id] = c; });

    $("#jEyebrow").textContent = t({ ru: "Путь клиента", en: "Client journey" });
    $("#jTitle").textContent = t({ ru: "От рекламы до результата — по шагам", en: "From ad to result — step by step" });
    $("#jSub").textContent = t({ ru: "Клиент видит рилс и оставляет заявку. Она входит в CRM, отрабатывается продажами и передаётся в клиентский отдел, который ведёт клиента через все технические этапы до финансирования и реферала.", en: "A client sees a reel and leaves a request. It enters the CRM, is worked by Sales and handed to the Client department, which guides the client through every technical stage up to financing and referral." });

    renderPhone();
    renderDesktop();
    renderHandoff();
    renderHubStage();
    renderFlow();

    akReveal();
    bindScroll();
    updateHub(hubProgress());
  }

  /* ------------------------------- ФОН -------------------------------- */
  var reelTimer = null;
  var REELS = [
    { bg: "linear-gradient(160deg,#1a1030,#0a1626 60%,#08131f)", k: "AK Strategy", s: { ru: "Поднимем твой кредитный скор", en: "We raise your credit score" } },
    { bg: "linear-gradient(160deg,#07231b,#0a1626 60%,#08131f)", k: { ru: "−негатив", en: "−negatives" }, s: { ru: "Чистим 3 бюро за недели", en: "We clean 3 bureaus in weeks" } },
    { bg: "linear-gradient(160deg,#241033,#160a26 60%,#0a0f1f)", k: { ru: "+лимиты", en: "+limits" }, s: { ru: "Карты, Loans, финансирование", en: "Cards, Loans, financing" } },
  ];
  function renderPhone() {
    var slides = REELS.map(function (r, i) {
      return '<div class="reel slide' + (i === 0 ? " on" : "") + '" style="background:' + r.bg + '">' +
        '<div class="reel__grid"></div>' +
        '<div class="reel__badge"><span class="rd"></span>' + t({ ru: "Реклама · Reels", en: "Ad · Reels" }) + "</div>" +
        '<div class="reel__center"><div class="rk">' + t(r.k) + '</div><div class="rs">' + t(r.s) + "</div></div>" +
      "</div>";
    }).join("");
    $("#phone").innerHTML =
      '<div class="phone__notch"></div>' +
      '<div class="reel-stack" id="reelStack">' + slides + "</div>" +
      '<div class="reel__side">' +
        '<div class="ri">' + ico("heart") + "</div>" +
        '<div class="ri">' + ico("users") + "</div>" +
        '<div class="ri">' + ico("arrow") + "</div>" +
      "</div>" +
      '<div class="reel__cta">' + t(AK.ui.leaveRequest) + "</div>";

    if (reelTimer) clearInterval(reelTimer);
    var slideEls = $$("#reelStack .slide"), ri = 0;
    reelTimer = setInterval(function () {
      slideEls[ri].classList.remove("on"); ri = (ri + 1) % slideEls.length; slideEls[ri].classList.add("on");
    }, 2800);

    $("#jheroCopy").innerHTML =
      '<div class="pill" style="margin-bottom:18px"><span class="pill__dot"></span>' + t({ ru: "Точка входа — маркетинг", en: "Entry point — marketing" }) + "</div>" +
      '<div class="k">' + t({ ru: "Всё начинается с рилса и таргета", en: "It all starts with a reel and targeting" }) + "</div>" +
      '<p style="color:var(--text-2);font-size:16px;max-width:520px">' + t({ ru: "Facebook и Instagram приводят 30% клиентов, ещё 30% дают рефералы, 25% — старая реклама, 15% — resale. Клиент нажимает «оставить заявку» — и она мгновенно попадает в Kommo CRM.", en: "Facebook and Instagram bring 30% of clients, another 30% come from referrals, 25% from old ads, 15% from resale. The client taps 'leave a request' — and it instantly lands in Kommo CRM." }) + "</p>";
  }

  function renderDesktop() {
    $("#crmEyebrow").textContent = t({ ru: "CRM · Отдел продаж", en: "CRM · Sales" });
    $("#crmTitle").textContent = t({ ru: "Заявка входит в CRM — работает отдел продаж", en: "The lead enters the CRM — Sales takes over" });
    $("#crmSub").textContent = t({ ru: "Каждая заявка становится карточкой в Kommo. Менеджеры ведут её по воронке до сделки и передают в клиентский отдел.", en: "Each request becomes a card in Kommo. Managers move it down the funnel to the deal and hand it to the Client department." });

    var team = [byId.anastasia, byId.alina_s, byId.damir].filter(Boolean);
    var side =
      '<div class="dt-side__title">' + ico("phone") + "<span>" + t(clusterById.sales.name) + "</span></div>" +
      team.map(function (p, i) {
        return '<div class="dt-agent' + (i === 0 ? " head" : "") + '"><span class="dt-ava" style="background:' + clusterById.sales.color + '">' + t(p.name).charAt(0) + "</span><div><b>" + t(p.name) + "</b><small>" + t(p.role) + "</small></div></div>";
      }).join("") +
      '<div class="dt-side__note">' + t({ ru: "+ универсалы Жулдыз и Айгерим ведут своих клиентов сами", en: "+ universals Zhuldyz and Aygerim run their own clients" }) + "</div>";

    var board = CRM.map(function (c) {
      var leads = c.leads.map(function (l) {
        return '<div class="crm__lead' + (l.move ? " moving" : "") + (l.hot ? " hot" : "") + '"><b>' + t(l.n) + "</b><span>" + t(l.s) + "</span></div>";
      }).join("");
      return '<div class="crm__col"><h5><span class="cd" style="background:' + c.color + '"></span>' + t(c.key) + "</h5>" + leads + "</div>";
    }).join("");

    $("#desktop").innerHTML =
      '<div class="dt-bar"><span class="dt-dot r"></span><span class="dt-dot y"></span><span class="dt-dot g"></span><div class="dt-url">app.kommo.com · AK Strategy CRM</div></div>' +
      '<div class="dt-body"><aside class="dt-side">' + side + '</aside><div class="dt-board">' + board + "</div></div>";
  }

  function renderHandoff() {
    $("#handoff").innerHTML =
      '<div class="ho-node" style="--hc:' + clusterById.sales.color + '"><div class="ho-ico">' + ico("phone") + '</div><b>' + t(clusterById.sales.name) + '</b><small>' + t({ ru: "Анастасия · сделка закрыта", en: "Anastasia · deal closed" }) + "</small></div>" +
      '<div class="ho-mid"><div class="ho-arrow"><span class="ho-pulse"></span>' + ico("arrow") + "</div><div class=\"ho-label\">" + t({ ru: "Передача клиента", en: "Client handover" }) + "</div><div class=\"ho-desc\">" + t({ ru: "Доступы, документы, досье на Google Drive, старт работ", en: "Access, documents, dossier on Google Drive, work starts" }) + "</div></div>" +
      '<div class="ho-node" style="--hc:' + clusterById.client.color + '"><div class="ho-ico">' + ico("handshake") + '</div><b>' + t(clusterById.client.name) + '</b><small>' + t({ ru: "Карина · сопровождение", en: "Karina · support" }) + "</small></div>";
  }

  /* --------------------------- СКРОЛЛ-СЦЕНА --------------------------- */
  function renderHubStage() {
    hubScroll = $("#hubScroll"); hubStage = $("#hubStage");
    $("#hubEyebrow").textContent = t({ ru: "Client department", en: "Client department" });
    $("#hubTitle").textContent = t({ ru: "Как Client ведёт клиента к результату", en: "How Client drives the client to the result" });
    $("#hubSub").textContent = t({ ru: "Прокручивайте — клиент и Client остаются на месте, а справа поочерёдно включаются технические отделы. За каждый готовый этап клиент платит Client-менеджеру.", en: "Scroll — the client and Client stay put, while technical departments switch on one by one on the right. For every finished stage the client pays the Client manager." });

    var svg =
      '<svg class="hub-svg" viewBox="0 0 1000 560" preserveAspectRatio="none">' +
        '<line class="hl main" id="lnMain" x1="200" y1="280" x2="440" y2="280"/>' +
        '<line class="hl" id="lnD0" x1="560" y1="280" x2="800" y2="120"/>' +
        '<line class="hl" id="lnD1" x1="560" y1="280" x2="800" y2="280"/>' +
        '<line class="hl" id="lnD2" x1="560" y1="280" x2="800" y2="440"/>' +
      "</svg>";

    var cust =
      '<div class="hub-node hub-cust" id="hCust" style="left:13%;top:50%">' +
        '<div class="hub-bub cust">' + ico("user") + '<span class="hub-face">🙂</span></div>' +
        '<div class="hub-nlabel">' + t({ ru: "Клиент", en: "Client (customer)" }) + "</div>" +
        '<div class="hub-nsub">' + t({ ru: "пришёл из маркетинга", en: "came from marketing" }) + "</div>" +
        '<div class="hub-refs" id="hRefs">' +
          '<span class="ref r1">' + ico("user") + "</span>" +
          '<span class="ref r2">' + ico("user") + "</span>" +
          '<span class="ref r3">' + ico("user") + "</span>" +
          '<span class="ref-tag">' + t({ ru: "рефералы", en: "referrals" }) + "</span>" +
        "</div>" +
      "</div>";

    var core =
      '<div class="hub-node hub-core" id="hCore" style="left:50%;top:50%">' +
        '<div class="hub-bub core" style="--cc:' + clusterById.client.color + '">' + ico("handshake") + "</div>" +
        '<div class="hub-nlabel">' + t(clusterById.client.name) + "</div>" +
        '<div class="hub-total" id="hTotal">$0</div>' +
      "</div>";

    var depts = HUB.map(function (s, i) {
      var tops = ["20%", "50%", "80%"];
      return '<div class="hub-node hub-dept" data-i="' + i + '" style="left:84%;top:' + tops[i] + ';--dc:' + s.color + '">' +
        '<div class="hub-bub dept">' + ico(s.icon) + '<span class="hub-check">' + ico("check") + "</span></div>" +
        '<div class="hub-nlabel">' + t(s.name) + "</div>" +
      "</div>";
    }).join("");

    var chip = '<div class="hub-chip" id="hChip"><span>+$0</span></div>';
    var cap =
      '<div class="hub-caption" id="hCap">' +
        '<div class="hub-cap__steps" id="hSteps"></div>' +
        '<div class="hub-cap__title" id="hCapT"></div>' +
        '<p class="hub-cap__text" id="hCapD"></p>' +
      "</div>";

    hubStage.innerHTML = '<div class="hub-progress"><i id="hubProgI"></i></div><div class="hub-scene">' + svg + cust + core + depts + chip + "</div>" + cap;

    coreEl = $("#hCore"); custEl = $("#hCust"); chipEl = $("#hChip"); refsEl = $("#hRefs");
    totalEl = $("#hTotal");
    deptEls = $$(".hub-dept", hubStage);
    lineEls = { main: $("#lnMain"), d: [$("#lnD0"), $("#lnD1"), $("#lnD2")] };

    // индикатор шагов
    $("#hSteps").innerHTML = HUB.map(function (s, i) { return '<span class="hub-dot" data-i="' + i + '" style="--dc:' + s.color + '"></span>'; }).join("");
  }

  function hubProgress() {
    if (!hubScroll) return 0;
    var rect = hubScroll.getBoundingClientRect();
    var sticky = hubScroll.firstElementChild;
    var denom = hubScroll.offsetHeight - sticky.offsetHeight;
    if (denom <= 0) return 0;
    return clamp((HUB_TOP - rect.top) / denom, 0, 1);
  }

  function currentCap(p) {
    if (p < HUB[0].band[0]) return { key: "intro", c: CAP_INTRO, i: -1 };
    for (var i = 0; i < HUB.length; i++) if (p < HUB[i].band[1]) return { key: HUB[i].id, c: HUB[i].cap, i: i };
    return { key: "finish", c: CAP_FINISH, i: 3 };
  }

  function updateHub(p) {
    var pi = $("#hubProgI"); if (pi) pi.style.width = (p * 100).toFixed(1) + "%";
    // отделы + линии
    var total = 0;
    HUB.forEach(function (s, i) {
      var done = p >= s.band[1];
      var active = !done && p >= s.band[0] - 0.02;
      var st = done ? 2 : (active ? 1 : 0);
      if (st !== lastDept[i]) {
        deptEls[i].classList.toggle("done", done);
        deptEls[i].classList.toggle("active", active);
        lineEls.d[i].classList.toggle("on", active || done);
        lastDept[i] = st;
      }
      if (done) total += s.pay;
    });

    // главная линия «живая», когда идёт работа
    var working = p >= HUB[0].band[0] && p < 0.82;
    lineEls.main.classList.toggle("on", working);

    // сумма оплат
    if (total !== lastTotal) {
      totalEl.textContent = "$" + total.toLocaleString("en-US");
      coreEl.classList.remove("pulse"); void coreEl.offsetWidth; if (total > lastTotal) coreEl.classList.add("pulse");
      lastTotal = total;
    }

    // летящая оплата +$
    var shown = false;
    for (var i = 0; i < HUB.length; i++) {
      var c = HUB[i].band[1];
      var w = (p - (c - 0.06)) / 0.12;
      if (w >= 0 && w <= 1) {
        chipEl.querySelector("span").textContent = "+$" + HUB[i].pay;
        chipEl.style.left = lerp(15, 48, w) + "%";
        chipEl.style.opacity = Math.sin(w * Math.PI).toFixed(3);
        shown = true; break;
      }
    }
    if (!shown) chipEl.style.opacity = "0";

    // рефералы + счастливый клиент
    var refP = clamp((p - 0.80) / 0.18, 0, 1);
    refsEl.style.setProperty("--rp", refP);
    refsEl.style.opacity = refP;
    custEl.classList.toggle("happy", p > 0.82);

    // подпись-этап
    var cur = currentCap(p);
    if (cur.key !== lastCap) {
      $("#hCapT").textContent = t(cur.c.t);
      $("#hCapD").textContent = t(cur.c.d);
      var cap = $("#hCap"); cap.classList.remove("in"); void cap.offsetWidth; cap.classList.add("in");
      $$(".hub-dot", hubStage).forEach(function (d, i) { d.classList.toggle("done", i < cur.i || (cur.key === "finish")); d.classList.toggle("now", i === cur.i && cur.key !== "finish"); });
      lastCap = cur.key;
    }
  }

  var ticking = false;
  function bindScroll() {
    hubScroll = $("#hubScroll"); hubStage = $("#hubStage");
    // (перепривязка ссылок после возможной перерисовки языка)
    coreEl = $("#hCore"); custEl = $("#hCust"); chipEl = $("#hChip"); refsEl = $("#hRefs"); totalEl = $("#hTotal");
    deptEls = $$(".hub-dept", hubStage);
    lineEls = { main: $("#lnMain"), d: [$("#lnD0"), $("#lnD1"), $("#lnD2")] };
    lastCap = null; lastTotal = -1; lastDept = [-1, -1, -1];
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { updateHub(hubProgress()); ticking = false; });
  }

  /* ------------------------------ ИТОГ -------------------------------- */
  function renderFlow() {
    $("#flowEyebrow").textContent = t({ ru: "Roadmap", en: "Roadmap" });
    $("#flowTitle").textContent = t({ ru: "Весь путь по шагам", en: "The whole journey step by step" });
    $("#jFlow").innerHTML = AK.journey.map(function (s) {
      var list = t(s.what).map(function (w) { return "<li>" + w + "</li>"; }).join("");
      var probs = t(s.problems).length ? '<div class="j-probs">' + t(s.problems).map(function (p) { return '<span class="j-prob">' + p + "</span>"; }).join("") + "</div>" : "";
      return '<div class="j-step reveal" style="--sc:' + s.color + '">' +
        '<div class="j-step__dot">' + ico(s.icon) + "</div>" +
        '<div class="j-card"><div class="j-card__head"><span class="j-num">' + t(AK.ui.step) + " " + s.num + '</span><span class="j-dept">' + t(s.dept) + "</span></div>" +
        "<h3>" + t(s.title) + "</h3>" +
        '<div class="j-owner"><b>' + t(s.owner) + "</b></div>" +
        '<div class="j-dur">⏱ ' + t(s.duration) + "</div>" +
        '<ul class="j-list">' + list + "</ul>" + probs + "</div></div>";
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    AKShell.init({ page: "journey" });
    render();
    window.addEventListener("aklang", function () { render(); });
  });
})();

/* =========================================================================
   COMPANY EXPLORER — Obsidian-подобный граф с физикой + семантический зум.
   Узлы отталкиваются (нет наложений), плавно движутся, их можно тянуть.
   Обзор: логотип + руководство + отделы. Клик по отделу → сотрудники.
   Клик по человеку → досье; «Подробнее» → детальная карточка.
   ========================================================================= */
(function () {
  var WORLD_W = 2600, WORLD_H = 1600, CX = WORLD_W / 2, CY = WORLD_H / 2;
  var ORDER = ["marketing", "sales", "client", "kitchen", "tradelines", "financing", "ops", "hr"];
  var PAD = 30; // запас вокруг пузыря под подпись

  var viewport, world, svg, dossier, modalBack, modal, crumbs, watermark, coreGlow;
  var byId = {}, clusterById = {}, deptById = {};
  var N = {};          // node objects by key
  var nodesArr = [];   // все узлы
  var linksArr = [];   // все связи
  var clusterCenters = {};
  var mode = { type: "overview", id: null };
  var cam = { s: 1, tx: 0, ty: 0 };
  var pan = { on: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 };
  var drag = null, dragMoved = false, downNode = null, downXY = null;
  var alpha = 0, raf = null;
  var selectedId = null;
  var touchMode = null, pinch = { d0: 1, s0: 1, wx: 0, wy: 0, px: 0, py: 0 }, camRAF = null;

  var R = { leader: 34, cluster: 39, head: 28, emp: 21, univ: 25 };

  function init() {
    viewport = $("#viewport"); world = $("#world"); svg = $("#links");
    dossier = $("#dossier"); modalBack = $("#modalBack"); modal = $("#modal"); crumbs = $("#crumbs");
    watermark = $("#watermark");

    AK.people.forEach(function (p) { byId[p.id] = p; });
    AK.clusters.forEach(function (c) { clusterById[c.id] = c; });
    AK.departments.forEach(function (d) { deptById[d.id] = d; });

    svg.setAttribute("width", WORLD_W); svg.setAttribute("height", WORLD_H);
    svg.setAttribute("viewBox", "0 0 " + WORLD_W + " " + WORLD_H);
    world.style.width = WORLD_W + "px"; world.style.height = WORLD_H + "px";
    watermark.style.left = CX + "px"; watermark.style.top = CY + "px";
    coreGlow = document.createElement("div"); coreGlow.className = "exp-core-glow";
    coreGlow.style.left = CX + "px"; coreGlow.style.top = CY + "px";
    world.insertBefore(coreGlow, world.firstChild);

    computeClusterCenters();
    buildNodes();
    buildLinks();
    bindControls();

    $("#zoomIn").innerHTML = ico("plus");
    $("#zoomOut").innerHTML = ico("minus");
    $("#zoomReset").innerHTML = ico("target");
    $("#expHint").textContent = t(AK.ui.zoomHint);

    var hash = (location.hash || "").replace("#", "");
    // интро: из глубины к обзору
    var f = fitParams();
    cam = { s: f.s * 2.2, tx: f.vw / 2 - CX * f.s * 2.2, ty: f.vh / 2 - CY * f.s * 2.2 };
    applyCam(false);
    setMode(hash && clusterById[hash] ? { type: "cluster", id: hash } : { type: "overview", id: null }, false);
    requestAnimationFrame(function () { setTimeout(function () { setMode(mode, true); reheat(1); }, 90); });

    window.addEventListener("resize", function () { placeCamera(false); });
    window.addEventListener("aklang", function () { relabel(); renderCrumbs(); $("#expHint").textContent = t(AK.ui.zoomHint); if (selectedId) openDossier(selectedId); });
  }

  function computeClusterCenters() {
    var Rx = 860, Ry = 520;
    ORDER.forEach(function (cid, i) {
      var ang = (-90 + (360 / ORDER.length) * i) * Math.PI / 180;
      clusterCenters[cid] = { x: CX + Math.cos(ang) * Rx, y: CY + Math.sin(ang) * Ry };
    });
  }

  function membersOf(cid) {
    var mem = AK.people.filter(function (p) { return p.cluster === cid && !p.dual && !p.leader; });
    return { head: mem.filter(function (p) { return p.head; })[0] || null, employees: mem.filter(function (p) { return !p.head; }) };
  }
  function universals() { return AK.people.filter(function (p) { return p.dual; }); }
  function focusMembers(cid) {
    var m = membersOf(cid);
    var arr = m.employees.slice();
    if (cid === "sales" || cid === "client") arr = arr.concat(universals());
    return { head: m.head, members: arr };
  }
  function clusterCount(cid) { var fm = focusMembers(cid); return (fm.head ? 1 : 0) + fm.members.length; }

  /* ------------------------------ NODES ------------------------------- */
  function mkNode(key, kind, opts) {
    var n = { key: key, kind: kind, cluster: opts.cluster, dual: !!opts.dual, personId: opts.personId || null,
      r: R[kind], x: opts.x, y: opts.y, vx: 0, vy: 0, ax: opts.x, ay: opts.y, fx: null, fy: null, active: false, el: opts.el };
    N[key] = n; nodesArr.push(n); return n;
  }

  function buildNodes() {
    // руководство
    [byId.adilet, byId.vladislav].forEach(function (p) { addPersonNode(p, "leader", 68); });
    // кластеры + люди
    ORDER.forEach(function (cid) {
      var c = clusterById[cid], cc = clusterCenters[cid];
      var cn = el(
        '<div class="node node--cluster" style="--nc:' + c.color + '">' +
          '<div class="node__bubble" style="width:78px;height:78px;background:' + c.color + '"><span class="node__ico">' + ico(c.icon) + '</span><span class="node__count">' + clusterCount(cid) + '</span></div>' +
          '<div class="node__label">' + t(c.name) + '</div>' +
          '<div class="node__role">' + t(c.short) + '</div>' +
        '</div>');
      cn.addEventListener("mousedown", function (e) { startPointer(e, N["cluster:" + cid]); });
      world.appendChild(cn);
      var node = mkNode("cluster:" + cid, "cluster", { cluster: cid, x: cc.x, y: cc.y, el: cn });
      node.onClick = function () { focusCluster(cid, true); };

      var m = membersOf(cid);
      if (m.head) addPersonNode(m.head, "head", 56);
      m.employees.forEach(function (p) { addPersonNode(p, "emp", 42); });
    });
    universals().forEach(function (p) { addPersonNode(p, "univ", 48); });
  }

  function addPersonNode(p, kind, size) {
    var col = kind === "univ"
      ? "linear-gradient(90deg," + clusterById.sales.color + " 0 50%," + clusterById.client.color + " 50% 100%)"
      : (p.leader ? "" : clusterById[p.cluster].color);
    var cls = "node node--" + kind + (p.leader ? " node--leader" : "") + (p.dual ? " node--dual" : "");
    var fs = Math.round(size * 0.4);
    var ncolor = p.dual ? clusterById.sales.color : (p.leader ? "#e2e8f0" : clusterById[p.cluster].color);
    var node = el(
      '<div class="' + cls + '" style="--nc:' + ncolor + '">' +
        '<div class="node__bubble" style="width:' + size + 'px;height:' + size + 'px;font-size:' + fs + 'px;' + (col ? "background:" + col + ";" : "") + '">' +
          (p.dual ? '<span class="node__dualtag">S + C</span>' : "") +
          '<span class="node__ini">' + t(p.name).charAt(0) + '</span>' +
        '</div>' +
        '<div class="node__label">' + t(p.name) + '</div>' +
        '<div class="node__role">' + t(p.role) + '</div>' +
      '</div>');
    node.addEventListener("mousedown", function (e) { startPointer(e, N["p:" + p.id]); });
    node.addEventListener("touchstart", function (e) { startPointer(e.touches[0], N["p:" + p.id], true); }, { passive: true });
    world.appendChild(node);
    var nn = mkNode("p:" + p.id, kind, { cluster: p.cluster, dual: p.dual, personId: p.id, x: 0, y: 0, el: node });
    nn.onClick = function () { selectPerson(p.id); };
  }

  function relabel() {
    nodesArr.forEach(function (n) {
      if (n.kind === "cluster") {
        var c = clusterById[n.cluster];
        $(".node__label", n.el).textContent = t(c.name);
        $(".node__role", n.el).textContent = t(c.short);
      } else {
        var p = byId[n.personId]; if (!p) return;
        $(".node__label", n.el).textContent = t(p.name);
        $(".node__role", n.el).textContent = t(p.role);
        $(".node__ini", n.el).textContent = t(p.name).charAt(0);
      }
    });
  }

  /* ------------------------------ LINKS ------------------------------- */
  function buildLinks() {
    var ns = "http://www.w3.org/2000/svg";
    function add(views, a, b, color) {
      var l = document.createElementNS(ns, "line");
      l.setAttribute("class", "exp-link"); l.setAttribute("stroke", color);
      svg.appendChild(l);
      linksArr.push({ views: views, a: a, b: b, el: l });
    }
    var adi = N["p:adilet"], vla = N["p:vladislav"];
    add(["overview"], adi, vla, "rgba(226,232,240,0.5)");
    ORDER.forEach(function (cid) {
      var cbub = N["cluster:" + cid], col = clusterById[cid].color;
      add(["overview"], adi, cbub, hexA(col, 0.45));
      add(["overview"], vla, cbub, hexA(col, 0.45));
      var m = membersOf(cid), head = m.head;
      var focusKey = "cluster:" + cid;
      if (head) {
        m.employees.forEach(function (p) { add([focusKey], N["p:" + head.id], N["p:" + p.id], hexA(col, 0.6)); });
        if (cid === "sales" || cid === "client") universals().forEach(function (p) { add([focusKey], N["p:" + head.id], N["p:" + p.id], hexA(col, 0.6)); });
      }
    });
  }

  /* --------------------------- ANCHORS/MODE --------------------------- */
  function setAnchors() {
    if (mode.type === "overview") {
      N["p:adilet"].ax = CX - 95; N["p:adilet"].ay = CY;
      N["p:vladislav"].ax = CX + 95; N["p:vladislav"].ay = CY;
      ORDER.forEach(function (cid) { var cc = clusterCenters[cid]; N["cluster:" + cid].ax = cc.x; N["cluster:" + cid].ay = cc.y; });
    } else {
      var cid = mode.id, cc = clusterCenters[cid];
      var fm = focusMembers(cid);
      if (fm.head) { N["p:" + fm.head.id].ax = cc.x; N["p:" + fm.head.id].ay = cc.y; }
      var n = fm.members.length;
      var rr = focusRing(cid);
      fm.members.forEach(function (p, i) {
        var a = (-90 + (360 / Math.max(n, 1)) * i) * Math.PI / 180;
        N["p:" + p.id].ax = cc.x + Math.cos(a) * rr;
        N["p:" + p.id].ay = cc.y + Math.sin(a) * rr;
      });
      if (!fm.head) { // ops — вокруг центра кластера
        fm.members.forEach(function (p, i) {
          var a = (-90 + (360 / Math.max(n, 1)) * i) * Math.PI / 180;
          N["p:" + p.id].ax = cc.x + Math.cos(a) * (rr * 0.7);
          N["p:" + p.id].ay = cc.y + Math.sin(a) * (rr * 0.7);
        });
      }
    }
  }
  function focusRing(cid) { var n = focusMembers(cid).members.length; return Math.max(150, 120 + n * 16); }

  function activeForMode() {
    var set = {};
    if (mode.type === "overview") {
      set["p:adilet"] = 1; set["p:vladislav"] = 1;
      ORDER.forEach(function (cid) { set["cluster:" + cid] = 1; });
    } else {
      var cid = mode.id, fm = focusMembers(cid);
      if (fm.head) set["p:" + fm.head.id] = 1;
      fm.members.forEach(function (p) { set["p:" + p.id] = 1; });
    }
    return set;
  }

  function setMode(m, animate) {
    mode = m;
    var active = activeForMode();
    // если активируем узлы, которых ещё не расставляли — задать стартовую позицию у якоря
    setAnchors();
    nodesArr.forEach(function (n) {
      var willActive = !!active[n.key];
      if (willActive && !n.active) {
        // появляемся из центра кластера/центра с небольшим разбросом
        var base = mode.type === "cluster" ? clusterCenters[mode.id] : { x: CX, y: CY };
        n.x = (n.ax + base.x) / 2 + (Math.random() - 0.5) * 40;
        n.y = (n.ay + base.y) / 2 + (Math.random() - 0.5) * 40;
        n.vx = n.vy = 0;
      }
      n.active = willActive;
      n.el.style.opacity = willActive ? "1" : "0";
      n.el.style.pointerEvents = willActive ? "auto" : "none";
    });
    linksArr.forEach(function (l) {
      var show = l.views.indexOf(mode.type === "overview" ? "overview" : "cluster:" + mode.id) >= 0;
      l.el.style.opacity = show ? "0.85" : "0";
    });
    watermark.style.opacity = mode.type === "overview" ? "0.07" : "0";
    if (coreGlow) { coreGlow.style.transition = "opacity 0.6s"; coreGlow.style.opacity = mode.type === "overview" ? "1" : "0"; }
    renderCrumbs();
    placeCamera(animate);
    reheat(0.9);
    if (mode.type === "cluster") {
      var head = membersOf(mode.id).head;
      if (head) openDossier(head.id); else openClusterDossier(mode.id);
    } else { closeDossier(); }
  }

  /* --------------------------- SIMULATION ----------------------------- */
  function reheat(a) { alpha = Math.max(alpha, a); if (!raf) raf = requestAnimationFrame(tick); }
  function tick() {
    var vis = nodesArr.filter(function (n) { return n.active; });
    // столкновения (без наложений)
    for (var i = 0; i < vis.length; i++) {
      for (var j = i + 1; j < vis.length; j++) {
        var a = vis[i], b = vis[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var min = a.r + b.r + PAD;
        if (dist < min) {
          var push = (min - dist) / 2;
          var nx = dx / dist, ny = dy / dist;
          if (a !== drag) { a.x -= nx * push; a.y -= ny * push; }
          if (b !== drag) { b.x += nx * push; b.y += ny * push; }
        }
      }
    }
    // пружина к якорю + интеграция
    vis.forEach(function (n) {
      if (n === drag) { n.x = n.fx; n.y = n.fy; n.vx = n.vy = 0; return; }
      n.vx += (n.ax - n.x) * 0.045;
      n.vy += (n.ay - n.y) * 0.045;
      n.vx *= 0.8; n.vy *= 0.8;
      n.x += n.vx; n.y += n.vy;
    });
    alpha *= 0.985;
    render();
    if (alpha > 0.004 || drag) raf = requestAnimationFrame(tick);
    else { raf = null; render(); }
  }

  function render() {
    nodesArr.forEach(function (n) { if (n.active) { n.el.style.left = n.x + "px"; n.el.style.top = n.y + "px"; } });
    linksArr.forEach(function (l) {
      if (l.el.style.opacity === "0") return;
      l.el.setAttribute("x1", l.a.x); l.el.setAttribute("y1", l.a.y);
      l.el.setAttribute("x2", l.b.x); l.el.setAttribute("y2", l.b.y);
    });
  }

  /* ----------------------------- CAMERA ------------------------------- */
  function fitParams() { var vw = viewport.clientWidth, vh = viewport.clientHeight; return { s: Math.min(vw / WORLD_W, vh / WORLD_H) * 0.94, vw: vw, vh: vh }; }
  function applyCam(animate) { world.classList.toggle("animate", !!animate); world.style.transform = "translate(" + cam.tx + "px," + cam.ty + "px) scale(" + cam.s + ")"; }
  function centerOn(wx, wy, s, vx, vy, animate) { cam.s = s; cam.tx = vx - wx * s; cam.ty = vy - wy * s; applyCam(animate); }
  function placeCamera(animate) {
    var f = fitParams();
    if (mode.type === "overview") { centerOn(CX, CY, f.s, f.vw / 2, f.vh / 2, animate); return; }
    var cid = mode.id, cc = clusterCenters[cid];
    var dossierW = f.vw > 820 ? 360 : 0;
    var vx = (f.vw - dossierW) / 2;
    var rr = focusRing(cid) + R.head + 90;               // радиус контента + подписи
    var availW = (f.vw - dossierW) - 60, availH = f.vh - 120;
    var s = Math.min(availW / (2 * rr), availH / (2 * rr), 1.5);
    s = Math.max(s, 0.7);
    centerOn(cc.x, cc.y, s, vx, f.vh / 2, animate);
  }
  function goOverview(animate) { setMode({ type: "overview", id: null }, animate); selectedId = null; }
  function focusCluster(cid, animate) { setMode({ type: "cluster", id: cid }, animate); }

  /* ---------------------------- CRUMBS -------------------------------- */
  function renderCrumbs() {
    var html = '<button data-go="overview">' + t(AK.ui.overview) + "</button>";
    if (mode.type === "cluster") html += '<span class="sep">/</span><span class="cur">' + t(clusterById[mode.id].name) + "</span>";
    crumbs.innerHTML = html;
    var ob = $('button[data-go="overview"]', crumbs); if (ob) ob.addEventListener("click", function () { goOverview(true); });
  }

  /* ---------------------------- DOSSIER ------------------------------- */
  function avatarColor(p) {
    if (p.dual) return "linear-gradient(90deg," + clusterById.sales.color + " 0 50%," + clusterById.client.color + " 50% 100%)";
    if (p.leader) return "linear-gradient(135deg,#f8fafc,#cbd5e1)";
    return clusterById[p.cluster].color;
  }
  function personColor(p) { return p.dual ? clusterById.sales.color : (p.leader ? "#cbd5e1" : clusterById[p.cluster].color); }

  function selectPerson(id) { openDossier(id); }

  function openDossier(id) {
    var p = byId[id]; if (!p) return;
    selectedId = id;
    nodesArr.forEach(function (n) { n.el.classList.toggle("sel", n.key === "p:" + id); });
    var col = personColor(p);
    var chipBg = hexA(col, 0.16);
    var groupLabel = p.dual ? (t(clusterById.sales.name) + " + " + t(clusterById.client.name)) : t(clusterById[p.cluster].name);

    var html =
      '<button class="dossier__close" aria-label="close">&times;</button>' +
      '<div class="dossier__avatar" style="background:' + avatarColor(p) + '">' + t(p.name).charAt(0) + '</div>' +
      '<div class="dossier__name">' + t(p.name) + '</div>' +
      '<div class="dossier__role" style="color:' + col + '">' + t(p.role) + '</div>' +
      '<div class="dossier__chip" style="background:' + chipBg + ';color:' + col + '">' + groupLabel + '</div>' +
      '<div class="dossier__desc">' + t(p.desc) + '</div>';

    if (p.head || p.leader) {
      var fm = focusMembers(p.cluster);
      var team = fm.members;
      if (p.head && team.length) {
        html += '<div class="dossier__sect">' + t(AK.ui.team) + " · " + team.length + '</div><div class="dossier__team">';
        team.forEach(function (mp) { html += teamRow(mp); });
        html += "</div>";
      }
    }
    html += '<div style="margin-top:16px"><button class="btn btn--primary" id="dossierMore" style="width:100%;justify-content:center">' + t(AK.ui.more) + "</button></div>";

    dossier.innerHTML = html;
    dossier.classList.add("open");
    $(".dossier__close", dossier).addEventListener("click", closeDossierAction);
    var more = $("#dossierMore"); if (more) more.addEventListener("click", function () { openModal(id); });
    $$(".dossier__member", dossier).forEach(function (mm) { mm.addEventListener("click", function () { focusOnPerson(mm.getAttribute("data-id")); }); });
  }
  function teamRow(mp) {
    return '<div class="dossier__member" data-id="' + mp.id + '"><span class="dm" style="background:' + (mp.dual ? "linear-gradient(90deg," + clusterById.sales.color + " 0 50%," + clusterById.client.color + " 50%)" : clusterById[mp.cluster].color) + '"></span>' + t(mp.name) + '<small>' + t(mp.role) + '</small></div>';
  }

  function openClusterDossier(cid) {
    var c = clusterById[cid], fm = focusMembers(cid);
    var html =
      '<button class="dossier__close" aria-label="close">&times;</button>' +
      '<div class="dossier__avatar" style="background:' + c.color + ';color:#06070a">' + ico(c.icon) + '</div>' +
      '<div class="dossier__name">' + t(c.name) + '</div>' +
      '<div class="dossier__role" style="color:' + c.color + '">' + t(c.short) + '</div>';
    if (fm.members.length) {
      html += '<div class="dossier__sect">' + t(AK.ui.team) + " · " + fm.members.length + '</div><div class="dossier__team">';
      fm.members.forEach(function (mp) { html += teamRow(mp); });
      html += "</div>";
    }
    var d = deptById[cid];
    if (d) html += '<div style="margin-top:16px"><button class="btn btn--primary" id="dossierMoreC" style="width:100%;justify-content:center">' + t(AK.ui.more) + "</button></div>";
    dossier.innerHTML = html; dossier.classList.add("open");
    $(".dossier__close", dossier).addEventListener("click", closeDossierAction);
    var mc = $("#dossierMoreC"); if (mc) mc.addEventListener("click", function () { openDeptModal(cid); });
    $$(".dossier__member", dossier).forEach(function (mm) { mm.addEventListener("click", function () { focusOnPerson(mm.getAttribute("data-id")); }); });
  }

  function focusOnPerson(id) { var p = byId[id]; if (!p) return; var cid = p.dual ? mode.id || "sales" : p.cluster; if (mode.type !== "cluster" || (mode.id !== cid && !p.dual)) focusCluster(p.dual ? (mode.id || "sales") : p.cluster, true); selectPerson(id); }
  function closeDossier() { dossier.classList.remove("open"); nodesArr.forEach(function (n) { n.el.classList.remove("sel"); }); selectedId = null; }
  function closeDossierAction() { if (mode.type === "cluster") goOverview(true); else closeDossier(); }

  /* ----------------------------- MODAL -------------------------------- */
  function openModal(id) {
    var p = byId[id]; if (!p) return;
    var col = personColor(p);
    var groupLabel = p.dual ? (t(clusterById.sales.name) + " + " + t(clusterById.client.name)) : t(clusterById[p.cluster].name);
    var html =
      '<button class="modal__x" aria-label="close">&times;</button>' +
      '<div class="modal__top"><div class="modal__avatar" style="background:' + avatarColor(p) + '">' + t(p.name).charAt(0) + '</div>' +
      '<div><div class="modal__name">' + t(p.name) + '</div><div class="modal__role" style="color:' + col + '">' + t(p.role) + " · " + groupLabel + '</div></div></div>' +
      '<p class="modal__desc">' + t(p.long || p.desc) + '</p>';

    if (p.focus) html += modalList(t(AK.ui.responsibility), t(p.focus), col, true);

    var d = deptById[p.cluster];
    if (p.head && d) {
      html += modalKV(t(AK.ui.pointB), t(d.pointB), col);
      html += modalList(t(AK.ui.process), t(d.steps).slice(0, 6), col, false);
      html += modalList(t(AK.ui.difficulties), t(d.problems), "#f59e0b", false, true);
    }
    if (p.dual) {
      html += modalKV(t({ ru: "Особенность роли", en: "Role note" }), t({ ru: "Двойное подчинение: Sales и Client одновременно, клиент не передаётся дальше.", en: "Dual reporting: Sales and Client at once, the client is not handed off." }), col);
    }
    modal.innerHTML = html;
    modalBack.classList.add("open");
    $(".modal__x", modal).addEventListener("click", closeModal);
  }
  function openDeptModal(cid) {
    var c = clusterById[cid], d = deptById[cid];
    var col = c.color;
    var html =
      '<button class="modal__x" aria-label="close">&times;</button>' +
      '<div class="modal__top"><div class="modal__avatar" style="background:' + col + ';color:#06070a">' + ico(c.icon) + '</div>' +
      '<div><div class="modal__name">' + t(c.name) + '</div><div class="modal__role" style="color:' + col + '">' + t(c.short) + '</div></div></div>';
    if (d) {
      html += modalKV(t(AK.ui.pointB), t(d.pointB), col);
      html += modalList(t(AK.ui.process), t(d.steps), col, false);
      html += modalList(t(AK.ui.difficulties), t(d.problems), "#f59e0b", false, true);
    }
    modal.innerHTML = html; modalBack.classList.add("open");
    $(".modal__x", modal).addEventListener("click", closeModal);
  }
  function modalKV(label, val, col) { return '<div class="modal__sect"><div class="modal__lbl" style="color:' + col + '">' + label + '</div><p class="modal__val">' + val + "</p></div>"; }
  function modalList(label, arr, col, big, warn) {
    if (!arr || !arr.length) return "";
    var items = arr.map(function (x) { return '<li' + (warn ? ' class="warn"' : "") + ">" + x + "</li>"; }).join("");
    return '<div class="modal__sect"><div class="modal__lbl" style="color:' + col + '">' + label + '</div><ul class="modal__list' + (big ? " big" : "") + '">' + items + "</ul></div>";
  }
  function closeModal() { modalBack.classList.remove("open"); }

  /* --------------------------- CONTROLS ------------------------------- */
  function startPointer(e, node, isTouch) {
    downNode = node; dragMoved = false; downXY = { x: e.clientX, y: e.clientY };
    drag = node; node.fx = node.x; node.fy = node.y;
  }
  function screenToWorld(cx, cy) { var r = viewport.getBoundingClientRect(); return { x: (cx - r.left - cam.tx) / cam.s, y: (cy - r.top - cam.ty) / cam.s }; }

  function bindControls() {
    $("#zoomIn").addEventListener("click", function () { zoomBy(1.22); });
    $("#zoomOut").addEventListener("click", function () { zoomBy(0.82); });
    $("#zoomReset").addEventListener("click", function () { goOverview(true); });

    modalBack.addEventListener("click", function (e) { if (e.target === modalBack) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (modalBack.classList.contains("open")) closeModal(); else if (mode.type === "cluster") goOverview(true); } });

    viewport.addEventListener("wheel", function (e) {
      e.preventDefault();
      var r = viewport.getBoundingClientRect();
      var px = e.clientX - r.left, py = e.clientY - r.top;
      var wx = (px - cam.tx) / cam.s, wy = (py - cam.ty) / cam.s;
      var ns = clamp(cam.s * (e.deltaY < 0 ? 1.12 : 0.89), fitParams().s * 0.85, 2.6);
      cam.s = ns; cam.tx = px - wx * ns; cam.ty = py - wy * ns; applyCam(false);
    }, { passive: false });

    viewport.addEventListener("mousedown", function (e) {
      if (e.target.closest(".node")) return;
      pan.on = true; pan.moved = false; pan.sx = e.clientX; pan.sy = e.clientY; pan.ox = cam.tx; pan.oy = cam.ty; world.classList.remove("animate");
    });
    window.addEventListener("mousemove", function (e) {
      if (drag) {
        var w = screenToWorld(e.clientX, e.clientY); drag.fx = w.x; drag.fy = w.y;
        if (Math.abs(e.clientX - downXY.x) + Math.abs(e.clientY - downXY.y) > 3) dragMoved = true;
        reheat(0.5); return;
      }
      if (!pan.on) return;
      var dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
      cam.tx = pan.ox + dx; cam.ty = pan.oy + dy; applyCam(false);
    });
    window.addEventListener("mouseup", function () {
      if (drag) { if (!dragMoved && drag.onClick) drag.onClick(); drag.fx = drag.fy = null; drag = null; reheat(0.3); }
      pan.on = false;
    });

    bindTouch();
  }

  /* --------------------------- TOUCH (pan / pinch / drag) -------------- */
  function tdist(a, b) { var dx = b.clientX - a.clientX, dy = b.clientY - a.clientY; return Math.sqrt(dx * dx + dy * dy) || 0.01; }
  function tmid(a, b) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }
  function scheduleCam() { if (camRAF) return; camRAF = requestAnimationFrame(function () { camRAF = null; applyCam(false); }); }

  function bindTouch() {
    // Старт касания на всём вьюпорте: 2 пальца → pinch, 1 палец по пустому → pan.
    // Перетаскивание узла инициируется отдельным touchstart на самом узле (drag уже задан).
    viewport.addEventListener("touchstart", function (e) {
      if (e.touches.length >= 2) {
        e.preventDefault();
        drag = null; pan.on = false; touchMode = "pinch";
        world.classList.remove("animate");
        var m = tmid(e.touches[0], e.touches[1]);
        var r = viewport.getBoundingClientRect();
        pinch.d0 = tdist(e.touches[0], e.touches[1]);
        pinch.s0 = cam.s;
        pinch.px = m.x - r.left; pinch.py = m.y - r.top;
        pinch.wx = (pinch.px - cam.tx) / cam.s;
        pinch.wy = (pinch.py - cam.ty) / cam.s;
        return;
      }
      if (drag || (e.target.closest && e.target.closest(".node"))) { touchMode = "drag"; return; }
      touchMode = "pan";
      var tt = e.touches[0];
      pan.on = true; pan.moved = false; pan.sx = tt.clientX; pan.sy = tt.clientY; pan.ox = cam.tx; pan.oy = cam.ty;
      world.classList.remove("animate");
    }, { passive: false });

    viewport.addEventListener("touchmove", function (e) {
      if (touchMode === "pinch" && e.touches.length >= 2) {
        e.preventDefault();
        var d = tdist(e.touches[0], e.touches[1]);
        var m = tmid(e.touches[0], e.touches[1]);
        var r = viewport.getBoundingClientRect();
        var ns = clamp(pinch.s0 * (d / pinch.d0), fitParams().s * 0.7, 2.8);
        var px = m.x - r.left, py = m.y - r.top;          // текущая середина — позволяет двигать во время зума
        cam.s = ns; cam.tx = px - pinch.wx * ns; cam.ty = py - pinch.wy * ns;
        scheduleCam();
        return;
      }
      if (drag) {
        e.preventDefault();
        var td = e.touches[0]; var w = screenToWorld(td.clientX, td.clientY); drag.fx = w.x; drag.fy = w.y;
        if (Math.abs(td.clientX - downXY.x) + Math.abs(td.clientY - downXY.y) > 4) dragMoved = true;
        reheat(0.5); return;
      }
      if (touchMode === "pan" && pan.on) {
        e.preventDefault();
        var tt = e.touches[0], dx = tt.clientX - pan.sx, dy = tt.clientY - pan.sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
        cam.tx = pan.ox + dx; cam.ty = pan.oy + dy; scheduleCam();
      }
    }, { passive: false });

    viewport.addEventListener("touchend", function (e) {
      if (drag && e.touches.length === 0) {
        if (!dragMoved && drag.onClick) drag.onClick();
        drag.fx = drag.fy = null; drag = null; reheat(0.3);
      }
      if (e.touches.length === 0) { pan.on = false; touchMode = null; }
      else if (e.touches.length === 1 && touchMode === "pinch") {
        var tt = e.touches[0]; touchMode = "pan";
        pan.on = true; pan.sx = tt.clientX; pan.sy = tt.clientY; pan.ox = cam.tx; pan.oy = cam.ty;
      }
    }, { passive: false });
    viewport.addEventListener("touchcancel", function () { drag = null; pan.on = false; touchMode = null; });
  }
  function zoomBy(f) {
    var vw = viewport.clientWidth / 2, vh = viewport.clientHeight / 2;
    var wx = (vw - cam.tx) / cam.s, wy = (vh - cam.ty) / cam.s;
    var ns = clamp(cam.s * f, fitParams().s * 0.85, 2.6);
    cam.s = ns; cam.tx = vw - wx * ns; cam.ty = vh - wy * ns; applyCam(true);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  document.addEventListener("DOMContentLoaded", function () { AKShell.init({ page: "company" }); init(); });
})();

/* Мальописи — логіка сайту. Дані беруться з data.js. */
(function () {
  "use strict";

  var DATA = window.MALOPYSY;
  var page = document.body.getAttribute("data-page");
  var storyIndex = parseInt(document.body.getAttribute("data-story") || "0", 10) - 1;
  var story = storyIndex >= 0 ? DATA.stories[storyIndex] : null;

  var ICONS = {
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/><path d="M10.5 7.5v6M7.5 10.5h6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
  };

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- Кольори сторінки ---------- */
  if (story) {
    var rs = document.documentElement.style;
    rs.setProperty("--base", story.colors.base);
    rs.setProperty("--header", story.colors.header);
    rs.setProperty("--tint", story.colors.tint);
    rs.setProperty("--tint2", story.colors.tint2);
  }

  /* ---------- Хедер ---------- */
  (function renderHeader() {
    var header = document.getElementById("site-header");
    if (!header) return;
    var nav = DATA.stories.map(function (s, i) {
      var cur = i === storyIndex ? ' aria-current="page"' : "";
      var parts = s.name.split(" ");
      var label = parts.length > 1 ? '<span class="long">' + esc(parts.slice(0, -1).join(" ")) + ' </span>' + esc(parts[parts.length - 1]) : esc(s.name);
      return '<a href="' + s.slug + '.html"' + cur + ' aria-label="' + esc(s.name) + '">' + label + "</a>";
    }).join("");
    header.innerHTML =
      '<div class="site-header__inner">' +
      '<a class="site-logo" href="index.html" aria-label="' + esc(DATA.siteTitle) + ' — на титульну сторінку"><img src="images/logo.png" alt="' + esc(DATA.siteTitle) + '. Картковий набір" width="958" height="331"></a>' +
      '<nav class="site-nav" aria-label="Історії">' + nav + "</nav></div>";
  })();

  /* ---------- Титулка ---------- */
  if (page === "home") {
    var lead = document.getElementById("home-lead");
    if (lead) lead.textContent = DATA.homeLead;
    var list = document.getElementById("covers");
    DATA.stories.forEach(function (s) {
      var li = el("li", { "class": "cover" });
      li.style.setProperty("--c", s.colors.base);
      li.style.setProperty("--h", s.colors.header);
      li.innerHTML =
        '<a href="' + s.slug + '.html">' +
        '<div class="cover__img"><img src="' + s.cover + '" alt="" width="1240" height="877"></div>' +
        '<span class="cover__name">' + esc(s.name) + "</span>" +
        '<p class="cover__caption">' + esc(s.caption) + "</p></a>";
      list.appendChild(li);
    });
    return;
  }

  if (page !== "story" || !story) return;

  /* =================================================================
     СТОРІНКА ІСТОРІЇ
     ================================================================= */
  var STORY_SLOTS = 8, DISCARD_SLOTS = 3;
  var TAP_MQ = window.matchMedia("(max-width: 767px)");   // режим тапання (як у CSS)
  var DRAG_THRESHOLD = 5;      // px: менший рух — це клік

  document.title = story.name + " — " + DATA.siteTitle;
  document.getElementById("story-title").textContent = story.name;
  document.getElementById("story-caption").textContent = story.caption;
  document.getElementById("instruction").innerHTML =
    '<span class="for-drag">' + esc(DATA.instruction.drag) + '</span><span class="for-tap">' + esc(DATA.instruction.tap) + "</span>";

  var board = document.getElementById("board");
  var storySlotsEl = document.getElementById("story-slots");
  var discardSlotsEl = document.getElementById("discard-slots");
  var tableEl = document.getElementById("table");
  var layer = document.getElementById("cards-layer");
  var tapBar = document.getElementById("tap-bar");

  // Слоти
  var storyBoxes = [], discardBoxes = [];
  for (var i = 0; i < STORY_SLOTS; i++) {
    var s = el("div", { "class": "slot" });
    s.innerHTML = '<span class="slot-num" aria-hidden="true">' + (i + 1) + '</span><div class="slot-box" data-zone="story" data-index="' + i + '" aria-label="Місце ' + (i + 1) + '"></div>';
    storySlotsEl.appendChild(s);
    storyBoxes.push(s.querySelector(".slot-box"));
  }
  for (i = 0; i < DISCARD_SLOTS; i++) {
    var d = el("div", { "class": "slot" });
    d.innerHTML = '<div class="slot-box" data-zone="discard" data-index="' + i + '" aria-label="Зайва картка ' + (i + 1) + '"></div>';
    discardSlotsEl.appendChild(d);
    discardBoxes.push(d.querySelector(".slot-box"));
  }
  tableEl.appendChild(el("div", { "class": "table-empty" }, "Усі картки розкладено"));

  // Картки
  var cards = story.cards.map(function (src, idx) {
    var b = el("div", { "class": "card", role: "button", tabindex: "0", "aria-label": "Картка" });
    b.innerHTML = '<img src="' + src + '" alt="" draggable="false"><button class="card-zoom" type="button" aria-label="Збільшити картку" tabindex="-1">' + ICONS.zoom + "</button>";
    layer.appendChild(b);
    return { id: idx, src: src, el: b, zone: "table", index: -1, nx: 0.5, ny: 0.5, rot: 0, z: 1, x: 0, y: 0, w: 0, h: 0 };
  });
  var tableOrder = [];   // порядок карток на «столі» в режимі телефона
  var zTop = 10;
  var mode = null;
  var geo = {};          // розміри, порахувані в layout()

  function cardAt(zone, index) {
    for (var k = 0; k < cards.length; k++) if (cards[k].zone === zone && cards[k].index === index) return cards[k];
    return null;
  }
  function shuffleArr(a) {
    for (var k = a.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var t = a[k]; a[k] = a[j]; a[j] = t; }
    return a;
  }
  function rand(min, max) { return min + Math.random() * (max - min); }

  /* ---------- Розкидати картки ---------- */
  function scatter() {
    var ids = shuffleArr(cards.map(function (c) { return c.id; }));
    tableOrder = ids.slice();
    // «Розкидані» позиції для великих екранів: сітка з випадковим зсувом
    var cols = geo.tableCols || 6, rows = Math.ceil(cards.length / cols);
    var cells = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) cells.push([c, r]);
    // зайві клітинки (якщо є) прибираємо випадково, щоб не було «дірок» в одному місці
    cells = shuffleArr(cells).slice(0, cards.length);
    ids.forEach(function (id, k) {
      var card = cards[id], cell = cells[k];
      card.zone = "table"; card.index = -1;
      var jx = cols > 1 ? rand(-0.14, 0.14) / (cols - 1) : 0;
      var jy = rows > 1 ? rand(-0.12, 0.12) / (rows - 1) : rand(-0.3, 0.3);
      card.nx = Math.min(1, Math.max(0, (cols > 1 ? cell[0] / (cols - 1) : 0.5) + jx));
      card.ny = Math.min(1, Math.max(0, (rows > 1 ? cell[1] / (rows - 1) : 0.5) + jy));
      card.rot = rand(-6, 6);
      card.z = ++zTop;
    });
  }

  /* ---------- Розміри та розкладка ---------- */
  function layout() {
    // той самий медіазапит, що й у CSS, — щоб режим і вигляд завжди збігалися
    var newMode = TAP_MQ.matches ? "tap" : "drag";
    if (newMode !== mode) { mode = newMode; clearSelection(); }
    document.body.classList.toggle("mode-tap", mode === "tap");
    document.body.classList.toggle("mode-drag", mode === "drag");

    var A = board.clientWidth;
    var g = 14, num = 16, ratio = 2 / 3;
    var sw, dw, dh, tw, th, storyCols, discardCols, tableCols, tableH, zoneGap = 32;

    var stacked = false;
    if (mode === "drag") {
      // Історія — 4 картки в ряд на всю ширину, «Зайві» і «Картки» — під нею.
      // Картки великі, щоб текст на них читався без збільшення.
      stacked = true;
      storyCols = 4; discardCols = 3; zoneGap = 0; g = 16;
      sw = Math.floor(Math.min((A - 3 * g) / 4, 440));
      var sh = sw * ratio;
      dw = Math.floor(sw * 0.72); dh = dw * ratio;
      tw = Math.round(sw * 0.92); th = tw * ratio;
      var maxCols = Math.max(2, Math.floor((A - 28) / (tw * 1.08)));
      var tRows = Math.ceil(cards.length / maxCols);
      tableCols = Math.ceil(cards.length / tRows);
      tableH = Math.round(tRows * th * 1.16 + 34);
    } else {
      storyCols = 2; discardCols = 3; tableCols = 3;
      zoneGap = 0;
      sw = Math.floor((A - g) / 2);
      dw = Math.floor((A - 2 * g) / 3); dh = dw * ratio;
      tw = Math.floor((A - 16 - 2 * 10) / 3); th = tw * ratio;
      var onTable = cards.filter(function (c) { return c.zone === "table"; }).length;
      var rowsT = Math.max(1, Math.ceil(onTable / 3));
      tableH = Math.round(rowsT * (th + 10) - 10 + 16);
    }
    geo = { sw: sw, sh: sw * ratio, dw: dw, dh: dh, tw: tw, th: th, tableCols: tableCols, tableH: tableH };
    var bs = board.style;
    bs.setProperty("--sw", sw + "px");
    bs.setProperty("--sh", (sw * ratio) + "px");
    bs.setProperty("--dw", dw + "px");
    bs.setProperty("--dh", dh + "px");
    bs.setProperty("--gap", g + "px");
    bs.setProperty("--zone-gap", zoneGap + "px");
    bs.setProperty("--story-cols", storyCols);
    bs.setProperty("--discard-cols", discardCols);
    bs.setProperty("--table-h", tableH + "px");
    board.classList.toggle("is-stacked", stacked);
    tableEl.classList.toggle("is-empty", !cards.some(function (c) { return c.zone === "table"; }));
  }

  function rectIn(elm) {
    var b = board.getBoundingClientRect(), r = elm.getBoundingClientRect();
    return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
  }

  // Порахувати, де має стояти кожна картка
  function computeTargets() {
    var t = rectIn(tableEl);
    var tapList = mode === "tap" ? tableOrder.filter(function (id) { return cards[id].zone === "table"; }) : null;
    cards.forEach(function (c) {
      if (c.zone === "story" || c.zone === "discard") {
        var box = (c.zone === "story" ? storyBoxes : discardBoxes)[c.index];
        var r = rectIn(box);
        c.x = r.x; c.y = r.y; c.w = r.w; c.h = r.h; c.r = 0;
      } else if (mode === "drag") {
        var pad = 14;
        c.w = geo.tw; c.h = geo.th;
        c.x = t.x + pad + c.nx * Math.max(0, t.w - 2 * pad - c.w);
        c.y = t.y + pad + c.ny * Math.max(0, t.h - 2 * pad - c.h);
        c.r = c.rot;
      } else {
        var k = tapList.indexOf(c.id), col = k % 3, row = Math.floor(k / 3);
        c.w = geo.tw; c.h = geo.th;
        c.x = t.x + 8 + col * (geo.tw + 10);
        c.y = t.y + 8 + row * (geo.th + 10);
        c.r = 0;
      }
    });
  }

  function paint(card) {
    var s = card.el.style;
    s.width = card.w + "px"; s.height = card.h + "px";
    s.transform = "translate(" + card.x + "px," + card.y + "px) rotate(" + (card.r || 0) + "deg)";
    s.zIndex = card.zone === "table" ? card.z : 5;
  }

  function render(animate) {
    layout();
    computeTargets();
    if (!animate) board.classList.add("no-anim");
    cards.forEach(paint);
    if (!animate) { void board.offsetWidth; board.classList.remove("no-anim"); }
    updateFreeSlots();
  }

  /* ---------- Переміщення картки ---------- */
  // Поставити картку в слот (з обміном, якщо слот зайнятий)
  function placeInSlot(card, zone, index) {
    var other = cardAt(zone, index);
    if (other === card) return;
    var from = { zone: card.zone, index: card.index, nx: card.nx, ny: card.ny, rot: card.rot };
    card.zone = zone; card.index = index;
    if (other) {
      other.zone = from.zone; other.index = from.index;
      if (from.zone === "table") {
        other.nx = from.nx; other.ny = from.ny; other.rot = from.rot; other.z = ++zTop;
        // у режимі телефона — на те саме місце в стрічці
        var oi = tableOrder.indexOf(other.id);
        if (oi > -1) tableOrder.splice(oi, 1);
        tableOrder.splice(Math.max(0, tableOrder.indexOf(card.id)), 0, other.id);
      }
    }
  }

  function placeOnTable(card, nx, ny) {
    var wasOnTable = card.zone === "table";
    card.zone = "table"; card.index = -1;
    if (nx != null) { card.nx = nx; card.ny = ny; card.rot = rand(-5, 5); }
    card.z = ++zTop;
    if (!wasOnTable) {
      var i0 = tableOrder.indexOf(card.id);
      if (i0 > -1) tableOrder.splice(i0, 1);
      tableOrder.push(card.id);
    }
  }

  function updateFreeSlots() {
    storyBoxes.concat(discardBoxes).forEach(function (b) {
      var c = cardAt(b.getAttribute("data-zone"), parseInt(b.getAttribute("data-index"), 10));
      b.classList.toggle("is-free", !c);
    });
  }

  /* ---------- Перетягування (планшет, ноутбук, десктоп) ---------- */
  var drag = null;

  function hitTest(px, py) {
    var all = storyBoxes.concat(discardBoxes);
    var best = null, bestD = Infinity;
    for (var k = 0; k < all.length; k++) {
      var r = all[k].getBoundingClientRect(), m = 10;
      if (px >= r.left - m && px <= r.right + m && py >= r.top - m && py <= r.bottom + m) {
        var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2), dd = dx * dx + dy * dy;
        if (dd < bestD) { bestD = dd; best = all[k]; }
      }
    }
    if (best) return { type: "slot", box: best };
    var t = tableEl.getBoundingClientRect();
    if (px >= t.left && px <= t.right && py >= t.top && py <= t.bottom) return { type: "table" };
    return null;
  }

  function setTarget(hit) {
    storyBoxes.concat(discardBoxes).forEach(function (b) { b.classList.toggle("is-target", !!(hit && hit.box === b)); });
    tableEl.classList.toggle("is-target", !!(hit && hit.type === "table"));
  }

  function onPointerDown(e) {
    if (mode !== "drag") return;
    if (e.button !== undefined && e.button !== 0) return;
    var card = cardById(e.currentTarget);
    if (!card) return;
    e.preventDefault();
    card.el.setPointerCapture(e.pointerId);
    var b = board.getBoundingClientRect();
    drag = {
      card: card, id: e.pointerId,
      sx: e.clientX, sy: e.clientY,
      ox: e.clientX - b.left - card.x, oy: e.clientY - b.top - card.y,
      moved: false
    };
  }
  // Автопрокручування: якщо тягнути картку до верхнього чи нижнього краю екрана
  var autoRaf = null;
  function autoScrollTick() {
    autoRaf = null;
    if (!drag || !drag.moved) return;
    var edge = 90, y = drag.lx === undefined ? null : drag.ly, v = 0;
    var topEdge = 70 + edge; // під липким хедером
    if (y < topEdge) v = -Math.ceil((topEdge - y) / 5);
    else if (y > window.innerHeight - edge) v = Math.ceil((y - (window.innerHeight - edge)) / 5);
    if (v) {
      window.scrollBy(0, Math.max(-24, Math.min(24, v)));
      moveDragged();
      autoRaf = requestAnimationFrame(autoScrollTick);
    }
  }
  function moveDragged() {
    if (!drag || !drag.moved) return;
    var c = drag.card, b = board.getBoundingClientRect();
    c.x = drag.lx - b.left - drag.ox;
    c.y = drag.ly - b.top - drag.oy;
    c.r = 0;
    var st = c.el.style;
    st.width = c.w + "px"; st.height = c.h + "px";
    st.transform = "translate(" + c.x + "px," + c.y + "px) scale(1.03)";
    setTarget(hitTest(drag.lx, drag.ly));
  }
  window.addEventListener("scroll", function () { if (drag && drag.moved) moveDragged(); }, { passive: true });

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var c = drag.card;
    drag.lx = e.clientX; drag.ly = e.clientY;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.sx) < DRAG_THRESHOLD && Math.abs(e.clientY - drag.sy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      c.el.classList.add("is-dragging");
      c.el.style.zIndex = 1000;
      // під час перетягування картка має розмір слота історії — так легше цілитися
      var nw = geo.sw, nh = geo.sh;
      drag.ox = drag.ox * (nw / c.w); drag.oy = drag.oy * (nh / c.h);
      c.w = nw; c.h = nh;
    }
    moveDragged();
    if (!autoRaf) autoRaf = requestAnimationFrame(autoScrollTick);
  }
  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    var c = d.card;
    if (!d.moved) { openZoom(c); return; }
    c.el.classList.remove("is-dragging");
    var hit = hitTest(e.clientX, e.clientY);
    setTarget(null);
    if (hit && hit.type === "slot") {
      placeInSlot(c, hit.box.getAttribute("data-zone"), parseInt(hit.box.getAttribute("data-index"), 10));
    } else if (hit && hit.type === "table") {
      var t = rectIn(tableEl), pad = 14;
      var x = c.x + (c.w - geo.tw) / 2, y = c.y + (c.h - geo.th) / 2;
      var nx = (x - t.x - pad) / Math.max(1, t.w - 2 * pad - geo.tw);
      var ny = (y - t.y - pad) / Math.max(1, t.h - 2 * pad - geo.th);
      placeOnTable(c, Math.min(1, Math.max(0, nx)), Math.min(1, Math.max(0, ny)));
    }
    // інакше картка просто повертається на місце
    render(true);
  }
  function onPointerCancel(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.card.el.classList.remove("is-dragging");
    drag = null; setTarget(null); render(true);
  }

  function cardById(elm) {
    for (var k = 0; k < cards.length; k++) if (cards[k].el === elm) return cards[k];
    return null;
  }

  /* ---------- Тапання (телефон) ---------- */
  var selected = null;

  function select(card) {
    clearSelection();
    selected = card;
    card.el.classList.add("is-selected");
    document.body.classList.add("has-selection");
    tapBar.classList.add("is-on");
    tapBar.querySelector(".tap-bar__text").textContent = card.zone === "table" ? "Оберіть місце для картки" : "Оберіть нове місце";
    tapBar.querySelector("[data-return]").hidden = card.zone === "table";
  }
  function clearSelection() {
    if (selected) selected.el.classList.remove("is-selected");
    selected = null;
    document.body.classList.remove("has-selection");
    if (tapBar) tapBar.classList.remove("is-on");
  }

  function onCardClick(e) {
    if (mode !== "tap") return;
    if (e.target.closest(".card-zoom")) return;
    var card = cardById(e.currentTarget);
    if (!card) return;
    e.stopPropagation();
    if (selected === card) { clearSelection(); return; }
    if (selected && card.zone !== "table") {
      // торкнулися картки в слоті, коли інша вибрана — міняємо місцями
      var sc = selected; clearSelection();
      placeInSlot(sc, card.zone, card.index);
      render(true);
      return;
    }
    select(card);
  }

  function onSlotClick(e) {
    if (mode !== "tap" || !selected) return;
    var box = e.currentTarget;
    var sc = selected; clearSelection();
    placeInSlot(sc, box.getAttribute("data-zone"), parseInt(box.getAttribute("data-index"), 10));
    render(true);
  }

  function onTableClick() {
    if (mode !== "tap" || !selected) return;
    if (selected.zone === "table") { clearSelection(); return; }
    var sc = selected; clearSelection();
    placeOnTable(sc);
    render(true);
  }

  /* ---------- Збільшення картки ---------- */
  var zoom = document.getElementById("zoom");
  var zoomImg = document.getElementById("zoom-img");
  var zoomWhere = document.getElementById("zoom-where");
  var zoomCard = null, lastFocus = null;

  function zoomSequence() {
    var seq = [];
    for (var k = 0; k < STORY_SLOTS; k++) { var c = cardAt("story", k); if (c) seq.push(c); }
    for (k = 0; k < DISCARD_SLOTS; k++) { c = cardAt("discard", k); if (c) seq.push(c); }
    var rest = cards.filter(function (x) { return x.zone === "table"; });
    if (mode === "tap") rest.sort(function (a, b) { return tableOrder.indexOf(a.id) - tableOrder.indexOf(b.id); });
    else rest.sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
    return seq.concat(rest);
  }
  function whereText(c) {
    if (c.zone === "story") return "Місце " + (c.index + 1) + " в історії";
    if (c.zone === "discard") return "Серед зайвих";
    return "Ще не розкладена";
  }

  function showInZoom(c, fromRect) {
    zoomCard = c;
    zoomImg.src = c.src;
    zoomWhere.textContent = whereText(c);
    if (fromRect) {
      // анімація: картка «виїжджає» зі свого місця в центр
      zoomImg.style.transition = "none";
      zoomImg.style.transform = "none";
      var go = function () {
        var to = zoomImg.getBoundingClientRect();
        if (!to.width) { zoomImg.style.transition = ""; return; }
        var sx = fromRect.width / to.width, sy = fromRect.height / to.height;
        zoomImg.style.transform = "translate(" + (fromRect.left - to.left) + "px," + (fromRect.top - to.top) + "px) scale(" + sx + "," + sy + ")";
        void zoomImg.offsetWidth;
        zoomImg.style.transition = "";
        zoomImg.style.transform = "none";
      };
      if (zoomImg.complete && zoomImg.naturalWidth) go(); else zoomImg.onload = function () { zoomImg.onload = null; go(); };
    }
  }

  function openZoom(c) {
    lastFocus = document.activeElement;
    zoom.hidden = false;
    void zoom.offsetWidth;
    zoom.classList.add("is-open");
    showInZoom(c, c.el.getBoundingClientRect());
    zoom.querySelector(".zoom__close").focus({ preventScroll: true });
  }
  function closeZoom() {
    if (zoom.hidden) return;
    zoom.classList.remove("is-open");
    setTimeout(function () { zoom.hidden = true; zoomImg.removeAttribute("src"); }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function stepZoom(dir) {
    var seq = zoomSequence();
    var k = seq.indexOf(zoomCard);
    var n = seq[(k + dir + seq.length) % seq.length];
    showInZoom(n, null);
  }

  zoom.addEventListener("click", function (e) {
    if (e.target === zoom || e.target.closest(".zoom__close")) closeZoom();
  });
  zoom.querySelector(".zoom__prev").addEventListener("click", function (e) { e.stopPropagation(); stepZoom(-1); });
  zoom.querySelector(".zoom__next").addEventListener("click", function (e) { e.stopPropagation(); stepZoom(1); });
  // свайп у збільшеному вигляді
  var swipe = null;
  zoom.addEventListener("touchstart", function (e) { if (e.touches.length === 1) swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  zoom.addEventListener("touchend", function (e) {
    if (!swipe) return;
    var t = e.changedTouches[0], dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) stepZoom(dx < 0 ? 1 : -1);
  });

  /* ---------- Перемішати ---------- */
  var dialog = document.getElementById("confirm");
  function doShuffle() {
    clearSelection();
    scatter();
    render(true);
  }
  document.getElementById("shuffle-btn").addEventListener("click", function () {
    var anyPlaced = cards.some(function (c) { return c.zone !== "table"; });
    if (!anyPlaced) { doShuffle(); return; }
    dialog.hidden = false;
    dialog.querySelector("[data-confirm]").focus();
  });
  dialog.addEventListener("click", function (e) {
    if (e.target.closest("[data-confirm]")) { dialog.hidden = true; doShuffle(); }
    else if (e.target.closest("[data-cancel]") || e.target === dialog) { dialog.hidden = true; }
  });

  /* ---------- Клавіатура ---------- */
  document.addEventListener("keydown", function (e) {
    if (!zoom.hidden) {
      if (e.key === "Escape") closeZoom();
      else if (e.key === "ArrowLeft") stepZoom(-1);
      else if (e.key === "ArrowRight") stepZoom(1);
      return;
    }
    if (!dialog.hidden && e.key === "Escape") { dialog.hidden = true; return; }
    if (e.key === "Escape") clearSelection();
  });

  /* ---------- Події ---------- */
  cards.forEach(function (c) {
    c.el.addEventListener("pointerdown", onPointerDown);
    c.el.addEventListener("pointermove", onPointerMove);
    c.el.addEventListener("pointerup", onPointerUp);
    c.el.addEventListener("pointercancel", onPointerCancel);
    c.el.addEventListener("click", onCardClick);
    c.el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    c.el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (mode === "tap") onCardClick({ currentTarget: c.el, target: c.el, stopPropagation: function () {} }); else openZoom(c); }
    });
    c.el.querySelector(".card-zoom").addEventListener("click", function (e) { e.stopPropagation(); openZoom(c); });
  });
  storyBoxes.concat(discardBoxes).forEach(function (b) { b.addEventListener("click", onSlotClick); });
  document.querySelector(".zone-table").addEventListener("click", onTableClick);
  tapBar.querySelector("[data-cancel-select]").addEventListener("click", clearSelection);
  tapBar.querySelector("[data-return]").addEventListener("click", onTableClick);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { render(false); }, 60);
  });

  /* ---------- Старт: картки «розлітаються» з центру столу ---------- */
  layout();
  scatter();
  computeTargets();
  var t0 = rectIn(tableEl);
  board.classList.add("no-anim");
  cards.forEach(function (c) {
    var s = c.el.style;
    s.width = geo.tw + "px"; s.height = geo.th + "px";
    s.transform = "translate(" + (t0.x + t0.w / 2 - geo.tw / 2) + "px," + (t0.y + t0.h / 2 - geo.th / 2) + "px) rotate(" + rand(-3, 3) + "deg)";
    s.zIndex = c.z;
  });
  void board.offsetWidth;
  board.classList.remove("no-anim");
  requestAnimationFrame(function () { requestAnimationFrame(function () { render(true); }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(true); });
})();

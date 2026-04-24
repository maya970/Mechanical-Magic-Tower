/**
 * DOM：状态栏、商店、图例、限时、语言、加权寻路面板
 */
var MotaUI = (function () {
  function showAlert(message, holdMs) {
    var alertBox = document.getElementById("alert-box");
    if (!alertBox) return;
    alertBox.innerHTML = message;
    alertBox.style.display = "block";
    setTimeout(function () {
      alertBox.style.display = "none";
    }, holdMs != null ? holdMs : 3200);
  }

  function persistHighest(gs) {
    try {
      var cur = parseInt(localStorage.getItem("highestFloor"), 10);
      if (isNaN(cur)) cur = 1;
      var next = Math.max(cur, gs.highestFloor | 0);
      localStorage.setItem("highestFloor", String(next));
      gs.highestFloor = next;
    } catch (e) {}
  }

  function failByTimeout(gs) {
    if (!gs || gs.gameOver) return;
    gs.gameOver = true;
    persistHighest(gs);
    showAlert(MotaI18n.t("time_fail", { floor: String(gs.highestFloor) }), 4200);
    setTimeout(function () {
      window.location.reload();
    }, 3800);
  }

  function updatePauseButtonText(gs) {
    var pauseBtn = document.getElementById("btn-pause");
    if (!pauseBtn) return;
    pauseBtn.textContent = gs.paused ? MotaI18n.t("pause_btn_on") : MotaI18n.t("pause_btn_run");
  }

  function updateStatus(gs) {
    var el = document.getElementById("status");
    if (!el) return;
    var algoKey =
      "algo_" +
      (gs.navAlgorithm === "flood"
        ? "flood"
        : gs.navAlgorithm === "weighted"
          ? "weighted"
          : gs.navAlgorithm === "random"
            ? "random"
            : gs.navAlgorithm === "greedy"
              ? "greedy"
              : gs.navAlgorithm === "dijkstra"
                ? "dijkstra"
                : gs.navAlgorithm === "astar"
                  ? "astar"
                  : "bfs");
    var an = MotaI18n.t(algoKey);
    var lim = MotaConfig.RUN_LIMIT_UNPAUSED_MS | 0;
    var used = gs.runTimeActiveMs | 0;
    var leftSec = Math.max(0, Math.ceil((lim - used) / 1000));
    var timerLine = "<br><span style=\"color:#fc8\">" + MotaI18n.t("st_timer", { s: String(leftSec) }) + "</span>";

    el.innerHTML =
      MotaI18n.t("st_floor", { cur: String(gs.currentFloor) }) +
      (gs.currentFloor % 10 === 0 ? MotaI18n.t("st_boss") : "") +
      "<br>" +
      MotaI18n.t("st_best") +
      ": " +
      gs.highestFloor +
      "<br><span style=\"color:#af0\">" +
      (gs.paused ? MotaI18n.t("st_paused") : MotaI18n.t("st_run")) +
      "</span>　" +
      MotaI18n.t("st_algo") +
      ": " +
      an +
      "　" +
      MotaI18n.t("st_speed") +
      "×" +
      (gs.timeScale || 1) +
      timerLine +
      "<br>" +
      MotaI18n.t("st_steps") +
      ": " +
      (gs.simStepCount | 0) +
      "<br>" +
      MotaI18n.t("st_hp") +
      ": " +
      gs.player.hp +
      "<br>" +
      MotaI18n.t("st_atk") +
      ": " +
      gs.player.atk +
      "　" +
      MotaI18n.t("st_def") +
      ": " +
      gs.player.def +
      "<br>" +
      MotaI18n.t("st_gold") +
      ": " +
      gs.player.gold +
      "<br>" +
      MotaI18n.t("st_ykey") +
      ": " +
      gs.player.keys.yellow +
      "　" +
      MotaI18n.t("st_bkey") +
      ": " +
      gs.player.keys.blue +
      "　" +
      MotaI18n.t("st_rkey") +
      ": " +
      gs.player.keys.red;
  }

  function positionLegendTooltip(clientX, clientY) {
    var tipEl = document.getElementById("legend-tooltip");
    if (!tipEl) return;
    var pad = 12;
    var w = tipEl.offsetWidth || 240;
    var h = tipEl.offsetHeight || 80;
    var x = clientX + pad;
    var y = clientY + pad;
    if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    tipEl.style.left = x + "px";
    tipEl.style.top = y + "px";
  }

  function updateLegend() {
    var el = document.getElementById("legend");
    if (!el) return;
    var ti = MotaI18n.t("legend_title");
    function row(color, leg, shortKey) {
      return (
        '<div class="leg-row"><span class="leg-swatch" style="color:' +
        color +
        '">■</span> <span class="leg-tip" data-leg="' +
        leg +
        '">' +
        MotaI18n.t(shortKey) +
        "</span></div>"
      );
    }
    el.innerHTML =
      '<div class="leg-head">' +
      ti +
      "</div>" +
      row("#8f8", "player", "leg_player") +
      row("#f8f", "monster", "leg_monster") +
      row("#ff0", "boss", "leg_boss") +
      row("#fa0", "door", "leg_door") +
      row("#8ff", "key", "leg_key") +
      row("#fd0", "gold", "leg_gold") +
      row("#0ff", "stairs", "leg_stairs") +
      row("#0cc", "conveyor", "leg_conveyor") +
      row("#c8f", "portal", "leg_portal") +
      row("#f80", "toggle", "leg_toggle") +
      row("#8f8", "shop", "leg_shop");
  }

  function syncWeightPanelVisibility() {
    var p = document.getElementById("nav-weight-panel");
    var algo = document.getElementById("nav-algo");
    if (!p || !algo) return;
    if (algo.value === "weighted") p.removeAttribute("hidden");
    else p.setAttribute("hidden", "hidden");
  }

  function refreshWeightPanelLabels() {
    var map = [
      ["nw-lb-floor", "nw_floor"],
      ["nw-lb-monster", "nw_monster"],
      ["nw-lb-boss", "nw_boss"],
      ["nw-lb-door", "nw_door"],
      ["nw-lb-gold", "nw_gold"],
      ["nw-lb-key", "nw_key"],
      ["nw-lb-stairs", "nw_stairs"],
      ["nw-lb-conveyor", "nw_conveyor"],
      ["nw-lb-portal", "nw_portal"]
    ];
    var i, el;
    for (i = 0; i < map.length; i++) {
      el = document.getElementById(map[i][0]);
      if (el) el.textContent = MotaI18n.t(map[i][1]);
    }
    var t = document.getElementById("nw-panel-title");
    if (t) t.textContent = MotaI18n.t("nw_title");
  }

  function syncWeightInputsFromGs(gs) {
    if (!gs || !gs.navWeights) return;
    var nw = gs.navWeights;
    function setv(id, v) {
      var n = document.getElementById(id);
      if (n) n.value = String(v);
    }
    setv("nw-floor", nw.floor);
    setv("nw-monster", nw.monster);
    setv("nw-boss", nw.boss);
    setv("nw-door", nw.door);
    setv("nw-gold", nw.gold);
    setv("nw-key", nw.key);
    setv("nw-stairs", nw.stairs);
    setv("nw-conveyor", nw.conveyor);
    setv("nw-portal", nw.portal);
  }

  function readWeightInput(id) {
    var n = document.getElementById(id);
    if (!n) return NaN;
    var v = parseFloat(n.value);
    return v;
  }

  function applyWeightInputsToGs(gs) {
    if (!gs) return;
    var f = readWeightInput;
    var o = {
      floor: f("nw-floor"),
      monster: f("nw-monster"),
      boss: f("nw-boss"),
      door: f("nw-door"),
      gold: f("nw-gold"),
      key: f("nw-key"),
      stairs: f("nw-stairs"),
      conveyor: f("nw-conveyor"),
      portal: f("nw-portal")
    };
    var k;
    for (k in o) {
      if (!isNaN(o[k]) && o[k] > 0) gs.navWeights[k] = o[k];
    }
    try {
      localStorage.setItem("navWeights_v1", JSON.stringify(gs.navWeights));
    } catch (e) {}
    gs.navPath = [];
  }

  function refreshAlgoOptionsText() {
    var sel = document.getElementById("nav-algo");
    if (!sel) return;
    var map = {
      bfs: "algo_bfs",
      dijkstra: "algo_dijkstra",
      astar: "algo_astar",
      flood: "algo_flood",
      greedy: "algo_greedy",
      random: "algo_random",
      weighted: "algo_weighted"
    };
    var i, o, k;
    for (i = 0; i < sel.options.length; i++) {
      o = sel.options[i];
      k = map[o.value];
      if (k) o.textContent = MotaI18n.t(k);
    }
  }

  function refreshUiLang(gs) {
    var hint = document.getElementById("hint");
    if (hint) hint.textContent = MotaI18n.t("hint_main");
    var st = document.getElementById("side-shop-title");
    if (st) st.textContent = MotaI18n.t("shop_title");
    var sn = document.getElementById("side-shop-note");
    if (sn) sn.textContent = MotaI18n.t("shop_note");
    var a = document.getElementById("cv-life-title");
    var b = document.getElementById("cv-strike-title");
    var c = document.getElementById("cv-bulwark-title");
    if (a) a.textContent = MotaI18n.t("shop_cv_life");
    if (b) b.textContent = MotaI18n.t("shop_cv_strike");
    if (c) c.textContent = MotaI18n.t("shop_cv_bulwark");
    updateLegend();
    refreshWeightPanelLabels();
    refreshAlgoOptionsText();
    var langBtn = document.getElementById("btn-lang");
    if (langBtn) {
      langBtn.textContent = MotaI18n.getLang() === "zh" ? "EN" : "中文";
      langBtn.setAttribute("title", MotaI18n.getLang() === "zh" ? "Switch to English" : "切换中文");
    }
    if (gs) {
      updatePauseButtonText(gs);
      updateStatus(gs);
    }
  }

  function bindLangToggle(gs) {
    var btn = document.getElementById("btn-lang");
    if (!btn || btn.getAttribute("data-lang-bound") === "1") return;
    btn.setAttribute("data-lang-bound", "1");
    btn.addEventListener("click", function () {
      MotaI18n.setLang(MotaI18n.getLang() === "zh" ? "en" : "zh");
      refreshUiLang(gs);
      syncWeightPanelVisibility();
    });
  }

  function bindLegendTooltip() {
    var legend = document.getElementById("legend");
    var tipEl = document.getElementById("legend-tooltip");
    if (!legend || !tipEl || legend.getAttribute("data-tip-bound") === "1") return;
    legend.setAttribute("data-tip-bound", "1");
    legend.addEventListener("mouseover", function (ev) {
      var t = ev.target.closest(".leg-tip");
      if (!t) return;
      var leg = t.getAttribute("data-leg");
      if (!leg) return;
      tipEl.textContent = MotaI18n.tip(leg);
      tipEl.removeAttribute("hidden");
      tipEl.style.display = "block";
      positionLegendTooltip(ev.clientX, ev.clientY);
    });
    legend.addEventListener("mousemove", function (ev) {
      if (tipEl.style.display === "block") positionLegendTooltip(ev.clientX, ev.clientY);
    });
    legend.addEventListener("mouseleave", function () {
      tipEl.style.display = "none";
      tipEl.setAttribute("hidden", "hidden");
    });
  }

  function bindNavWeights(gs) {
    var panel = document.getElementById("nav-weight-panel");
    if (!panel || panel.getAttribute("data-nw-bound") === "1") return;
    panel.setAttribute("data-nw-bound", "1");
    var ids = ["nw-floor", "nw-monster", "nw-boss", "nw-door", "nw-gold", "nw-key", "nw-stairs", "nw-conveyor", "nw-portal"];
    var i;
    function onch() {
      applyWeightInputsToGs(window.GameState || gs);
      updateStatus(window.GameState || gs);
    }
    for (i = 0; i < ids.length; i++) {
      var inp = document.getElementById(ids[i]);
      if (inp) {
        inp.addEventListener("change", onch);
        inp.addEventListener("input", onch);
      }
    }
  }

  function bindAutoPanel(gs) {
    var pauseBtn = document.getElementById("btn-pause");
    if (pauseBtn) {
      pauseBtn.onclick = function () {
        gs.paused = !gs.paused;
        updatePauseButtonText(gs);
        updateStatus(gs);
      };
    }
    var spd = document.getElementById("nav-speed");
    if (spd) {
      spd.value = String(gs.timeScale || 1);
      spd.onchange = function () {
        gs.timeScale = parseFloat(spd.value) || 1;
        updateStatus(gs);
      };
    }
    var algo = document.getElementById("nav-algo");
    if (algo) {
      algo.value = gs.navAlgorithm || "astar";
      algo.onchange = function () {
        gs.navAlgorithm = algo.value;
        gs.navPath = [];
        syncWeightPanelVisibility();
        updateStatus(gs);
      };
    }
    syncWeightPanelVisibility();
  }

  function refreshSideShop(gs) {
    if (!gs || typeof MotaShopPricing === "undefined") return;
    var costs = MotaShopPricing.computeAllCosts(gs);
    var cv = gs.shopCurves || { life: 0, strike: 0, bulwark: 0 };
    function setText(id, v) {
      var n = document.getElementById(id);
      if (n) n.textContent = String(v);
    }
    setText("shop-hp", costs.hp);
    setText("shop-reset", costs.reset);
    setText("shop-atk", costs.atk);
    setText("shop-yellow", costs.yellow);
    setText("shop-def", costs.def);
    setText("shop-blue", costs.blue);
    setText("shop-red", costs.red);
    setText("cv-life-n", cv.life | 0);
    setText("cv-strike-n", cv.strike | 0);
    setText("cv-bulwark-n", cv.bulwark | 0);
  }

  function bindSideShop(gs) {
    var root = document.getElementById("side-shop");
    if (!root || root.getAttribute("data-shop-bound") === "1") return;
    root.setAttribute("data-shop-bound", "1");
    root.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-shop]");
      if (!btn) return;
      var action = btn.getAttribute("data-shop");
      if (!action) return;
      var g = window.GameState || gs;
      if (!g || g.gameOver) return;
      var costs = MotaShopPricing.computeAllCosts(g);
      var cost = costs[action];
      if (cost == null) return;
      if (g.player.gold < cost) {
        showAlert(
          MotaI18n.t("gold_short") +
            cost +
            MotaI18n.t("gold_short2") +
            g.player.gold +
            MotaI18n.t("gold_short3")
        );
        return;
      }
      if (!MotaShopPricing.applyBuy(g, action)) {
        showAlert(MotaI18n.t("buy_fail"));
        return;
      }
      updateStatus(g);
      refreshSideShop(g);
    });
  }

  function bindHold(id, key, gs) {
    var el = document.getElementById(id);
    if (!el) return;
    var down = function (e) {
      e.preventDefault();
      gs.keysHeld[key] = true;
    };
    var up = function (e) {
      e.preventDefault();
      gs.keysHeld[key] = false;
    };
    el.addEventListener("touchstart", down, { passive: false });
    el.addEventListener("touchend", up);
    el.addEventListener("touchcancel", up);
    el.addEventListener("mousedown", down);
    el.addEventListener("mouseup", up);
    el.addEventListener("mouseleave", up);
  }

  function bindControls(gs) {}

  function bindExit(gs) {
    var btn = document.getElementById("exit-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (confirm(MotaI18n.t("exit_confirm"))) {
        gs.gameOver = true;
        persistHighest(gs);
        showAlert(MotaI18n.t("exit_done") + gs.highestFloor);
        setTimeout(function () {
          window.location.reload();
        }, 2000);
      }
    });
  }

  return {
    showAlert: showAlert,
    updateStatus: updateStatus,
    updateLegend: updateLegend,
    refreshUiLang: refreshUiLang,
    refreshSideShop: refreshSideShop,
    bindSideShop: bindSideShop,
    bindControls: bindControls,
    bindAutoPanel: bindAutoPanel,
    bindExit: bindExit,
    bindLangToggle: bindLangToggle,
    bindLegendTooltip: bindLegendTooltip,
    bindNavWeights: bindNavWeights,
    syncWeightPanelVisibility: syncWeightPanelVisibility,
    syncWeightInputsFromGs: syncWeightInputsFromGs,
    failByTimeout: failByTimeout,
    persistHighest: persistHighest,
    updatePauseButtonText: updatePauseButtonText,
    refreshAlgoOptionsText: refreshAlgoOptionsText,
    refreshWeightPanelLabels: refreshWeightPanelLabels
  };
})();

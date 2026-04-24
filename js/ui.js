/**
 * DOM：状态栏、商店、提示
 */
var MotaUI = (function () {
  function showAlert(message) {
    var alertBox = document.getElementById("alert-box");
    if (!alertBox) return;
    alertBox.innerHTML = message;
    alertBox.style.display = "block";
    setTimeout(function () {
      alertBox.style.display = "none";
    }, 3200);
  }

  function updateStatus(gs) {
    var el = document.getElementById("status");
    if (!el) return;
    var algoNames = {
      bfs: "BFS",
      dijkstra: "Dijkstra",
      astar: "A*",
      flood: "洪水",
      greedy: "贪心"
    };
    var an = algoNames[gs.navAlgorithm] || gs.navAlgorithm;
    el.innerHTML =
      "第 " +
      gs.currentFloor +
      " 层" +
      (gs.currentFloor % 10 === 0 ? " [BOSS]" : "") +
      "<br>最高层: " +
      gs.highestFloor +
      "<br><span style=\"color:#af0\">" +
      (gs.paused ? "已暂停" : "运行中") +
      "</span>　算法: " +
      an +
      "　倍速×" +
      (gs.timeScale || 1) +
      "<br>步计数: " +
      (gs.simStepCount | 0) +
      "<br>生命: " +
      gs.player.hp +
      "<br>攻击: " +
      gs.player.atk +
      "　防御: " +
      gs.player.def +
      "<br>金币: " +
      gs.player.gold +
      "<br>黄钥: " +
      gs.player.keys.yellow +
      "　蓝钥: " +
      gs.player.keys.blue +
      "　红钥: " +
      gs.player.keys.red;
  }

  function updateLegend() {
    var el = document.getElementById("legend");
    if (!el) return;
    el.innerHTML =
      "图例：<br>" +
      '<span style="color:#8f8">火柴人</span> 你<br>' +
      '<span style="color:#f8f">人</span> 怪　<span style="color:#ff0">B</span> BOSS<br>' +
      "门/钥/金币/楼梯 同魔塔<br>" +
      "青格=传送带 紫=传送门 橙=开关墙<br>" +
      "角色自动走；商店在右侧栏随时可买";
  }

  function bindAutoPanel(gs) {
    var pauseBtn = document.getElementById("btn-pause");
    if (pauseBtn) {
      pauseBtn.onclick = function () {
        gs.paused = !gs.paused;
        pauseBtn.textContent = gs.paused ? "继续" : "暂停";
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
        updateStatus(gs);
      };
    }
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
        showAlert("金币不足！需要 " + cost + " 金币，当前有 " + g.player.gold + " 金币。");
        return;
      }
      if (!MotaShopPricing.applyBuy(g, action)) {
        showAlert("无法完成购买。");
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
      if (confirm("确定退出冒险？")) {
        gs.gameOver = true;
        showAlert("冒险结束！你的最高楼层：" + gs.highestFloor);
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
    refreshSideShop: refreshSideShop,
    bindSideShop: bindSideShop,
    bindControls: bindControls,
    bindAutoPanel: bindAutoPanel,
    bindExit: bindExit
  };
})();

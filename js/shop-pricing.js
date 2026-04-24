/**
 * 侧栏商店：三条独立价格上涨曲线
 * 甲·生命系：HP、重置本层（指数型）
 * 乙·强袭系：ATK、黄钥匙（二次型）
 * 丙·守御系：DEF、蓝钥匙、红钥匙（线性+对数修正）
 */
var MotaShopPricing = (function () {
  var R = MotaRng;
  var C = MotaConfig;
  var STORAGE_KEY = "shopPriceCurves_v1";

  function defaultCurves() {
    return { life: 0, strike: 0, bulwark: 0 };
  }

  function loadCurves() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        return {
          life: o.life | 0,
          strike: o.strike | 0,
          bulwark: o.bulwark | 0
        };
      }
    } catch (e) {}
    var legacy = tryMigrateFromLegacy();
    if (legacy) return legacy;
    return defaultCurves();
  }

  /** 从旧 shopPurchases 粗略迁移到三条曲线 */
  function tryMigrateFromLegacy() {
    try {
      var raw = localStorage.getItem("shopPurchases");
      if (!raw) return null;
      var sp = JSON.parse(raw);
      var c = {
        life: (sp.hp | 0) + (sp.reset | 0),
        strike: (sp.atk | 0) + (sp.yellow | 0),
        bulwark: (sp.def | 0) + (sp.blue | 0) + (sp.red | 0)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
      return c;
    } catch (e2) {
      return null;
    }
  }

  function saveCurves(cv) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
    } catch (e) {}
  }

  function loadInto(gs) {
    gs.shopCurves = loadCurves();
  }

  /** 甲：指数 — base * floor * 1.1^n */
  function priceLife(gs, base) {
    var n = gs.shopCurves.life | 0;
    var fl = gs.currentFloor | 0;
    return R.floor(base * fl * Math.pow(1.1, n) * (1 + 0.04 * n));
  }

  /** 乙：二次 — base * floor * (1 + 0.12*n + 0.015*n^2) */
  function priceStrike(gs, base) {
    var n = gs.shopCurves.strike | 0;
    var fl = gs.currentFloor | 0;
    return R.floor(base * fl * (1 + 0.12 * n + 0.015 * n * n));
  }

  /** 丙：线性 + 弱对数 — base * floor * (1 + 0.16*n) * (1 + ln(1+n)*0.08) */
  function priceBulwark(gs, base) {
    var n = gs.shopCurves.bulwark | 0;
    var fl = gs.currentFloor | 0;
    var logPart = 1 + Math.log(1 + n) * 0.08;
    return R.floor(base * fl * (1 + 0.16 * n) * logPart);
  }

  function computeAllCosts(gs) {
    var B = C.SHOP_COST_BASE;
    return {
      hp: priceLife(gs, B.hp),
      reset: priceLife(gs, B.reset),
      atk: priceStrike(gs, B.atk),
      yellow: priceStrike(gs, B.yellow),
      def: priceBulwark(gs, B.def),
      blue: priceBulwark(gs, B.blue),
      red: priceBulwark(gs, B.red)
    };
  }

  function applyBuy(gs, action) {
    var cv = gs.shopCurves;
    var costs = computeAllCosts(gs);
    var cost = costs[action];
    if (cost == null || gs.player.gold < cost) return false;
    gs.player.gold -= cost;
    var pl = gs.player;
    if (action === "hp") {
      pl.hp += 200;
      cv.life++;
    } else if (action === "reset") {
      cv.life++;
      MotaMaze.generateFloor(gs);
      if (typeof MotaGridMove !== "undefined" && MotaGridMove.syncPlayerToStart) {
        MotaGridMove.syncPlayerToStart(gs);
      }
      MotaPhysics.syncPlayerSpawnFromGrid(gs);
      MotaGame.rebuildMonstersFromMaze(gs);
      gs.navPath = [];
    } else if (action === "atk") {
      pl.atk += 8;
      cv.strike++;
    } else if (action === "yellow") {
      pl.keys.yellow++;
      cv.strike++;
    } else if (action === "def") {
      pl.def += 8;
      cv.bulwark++;
    } else if (action === "blue") {
      pl.keys.blue++;
      cv.bulwark++;
    } else if (action === "red") {
      pl.keys.red++;
      cv.bulwark++;
    } else {
      gs.player.gold += cost;
      return false;
    }
    saveCurves(cv);
    return true;
  }

  return {
    loadInto: loadInto,
    computeAllCosts: computeAllCosts,
    applyBuy: applyBuy,
    saveCurves: saveCurves,
    defaultCurves: defaultCurves
  };
})();

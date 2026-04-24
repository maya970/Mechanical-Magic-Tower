/**
 * 界面语言 zh / en（图例、提示、状态部分文案）
 */
var MotaI18n = (function () {
  var STORAGE_KEY = "motaUiLang";
  var current = "zh";

  var T = {
    lang_btn_zh: { zh: "中文", en: "中文" },
    lang_btn_en: { zh: "EN", en: "EN" },
    legend_title: { zh: "图例（悬停看说明）", en: "Legend (hover for tips)" },
    leg_player: { zh: "你", en: "You" },
    leg_monster: { zh: "怪", en: "Monster" },
    leg_boss: { zh: "BOSS", en: "BOSS" },
    leg_door: { zh: "门", en: "Door" },
    leg_key: { zh: "钥匙", en: "Key" },
    leg_gold: { zh: "金币", en: "Gold" },
    leg_stairs: { zh: "楼梯", en: "Stairs" },
    leg_conveyor: { zh: "传送带", en: "Conveyor" },
    leg_portal: { zh: "传送门", en: "Portal" },
    leg_toggle: { zh: "开关墙", en: "Toggle wall" },
    leg_shop: { zh: "侧栏商店", en: "Side shop" },
    tip_player: {
      zh: "火柴人：由当前寻路算法自动控制走向楼梯；可空格暂停。",
      en: "Stick figure: moved by the selected path algorithm toward stairs; Space to pause."
    },
    tip_monster: {
      zh: "普通怪物：格上战斗，攻击需能破防；击败后掉落金币。",
      en: "Normal monster: combat on tile; your ATK must exceed its DEF; gold drops when defeated."
    },
    tip_boss: {
      zh: "BOSS：每 10 层出现，需先击败再通过门才能上楼。",
      en: "BOSS: appears every 10 floors; defeat it and pass the door before using stairs."
    },
    tip_door: {
      zh: "门：需要对应颜色的黄/蓝/红钥匙各 1 把才能通过（寻路会消耗钥匙）。",
      en: "Door: needs one matching yellow/blue/red key to pass (pathfinding consumes keys)."
    },
    tip_key: {
      zh: "钥匙：拾取后增加对应颜色钥匙数量，用于开门。",
      en: "Key: pick up to increase that color's key count for doors."
    },
    tip_gold: {
      zh: "金币：拾取后在右侧商店购买属性与钥匙；三条价格曲线独立上涨。",
      en: "Gold: spend in the side shop; three independent price curves."
    },
    tip_stairs: {
      zh: "楼梯：走到格内上楼进入下一层；BOSS 层需先击败 BOSS 并过门。",
      en: "Stairs: step on tile to go up; on BOSS floors clear the boss and door first."
    },
    tip_conveyor: {
      zh: "传送带：青格，进入后会再被推动一格（或随机方向格）。",
      en: "Conveyor (cyan): entering pushes you one more tile (or random if marked random)."
    },
    tip_portal: {
      zh: "传送门：紫格，进入后瞬移到配对的另一格。",
      en: "Portal (purple): teleports you to its linked partner tile."
    },
    tip_toggle: {
      zh: "开关墙：橙边，随模拟步数周期开闭，关闭时相当于墙。",
      en: "Toggle wall (orange edge): opens/closes on a cycle tied to sim steps."
    },
    tip_shop: {
      zh: "商店在画面右侧，随时可点；与迷宫格子无关。",
      en: "Shop is on the right; always clickable, not a maze tile."
    },
    hint_main: {
      zh: "自动寻路 · 空格暂停 · 限时：非暂停累计 1 分钟失败 · 悬停图例看说明",
      en: "Auto path · Space pause · Time limit: fail after 1 min unpaused · Hover legend for tips"
    },
    status_run: { zh: "限时", en: "Time limit" },
    status_run_left: { zh: "剩余", en: "left" },
    status_run_over: { zh: "已超时", en: "over" },
    status_paused_no_tick: { zh: "暂停不计时", en: "pause freezes timer" },
    algo_bfs: { zh: "BFS", en: "BFS" },
    algo_dijkstra: { zh: "Dijkstra", en: "Dijkstra" },
    algo_astar: { zh: "A*", en: "A*" },
    algo_flood: { zh: "洪水", en: "Flood" },
    algo_greedy: { zh: "贪心", en: "Greedy" },
    algo_random: { zh: "随机", en: "Random" },
    algo_weighted: { zh: "加权 Dijkstra", en: "Weighted Dijkstra" },
    nw_title: { zh: "边权（越大越绕开）", en: "Edge weights (higher = avoid more)" },
    nw_floor: { zh: "空地", en: "Floor" },
    nw_monster: { zh: "怪", en: "Monster" },
    nw_boss: { zh: "BOSS", en: "BOSS" },
    nw_door: { zh: "门", en: "Door" },
    nw_gold: { zh: "金币", en: "Gold" },
    nw_key: { zh: "钥匙", en: "Key" },
    nw_stairs: { zh: "楼梯", en: "Stairs" },
    nw_conveyor: { zh: "传送带", en: "Conveyor" },
    nw_portal: { zh: "传送门", en: "Portal" },
    shop_title: { zh: "商店", en: "Shop" },
    shop_note: {
      zh: "三条价格曲线各自累计；随时可点购买。",
      en: "Three price curves; tap anytime to buy."
    },
    shop_cv_life: { zh: "甲·生命系（指数）　已购", en: "Life (exp) · bought" },
    shop_cv_strike: { zh: "乙·强袭系（二次）　已购", en: "Strike (quad) · bought" },
    shop_cv_bulwark: { zh: "丙·守御系（线性+对数）　已购", en: "Bulwark (log) · bought" },
    time_fail: {
      zh: "超时失败！非暂停累计已超过 1 分钟。本局最高层：{floor}。",
      en: "Time out! Unpaused play exceeded 1 minute. Best floor this run: {floor}."
    },
    pause_btn_run: { zh: "暂停", en: "Pause" },
    pause_btn_on: { zh: "继续", en: "Resume" },
    st_floor: { zh: "第 {cur} 层", en: "Floor {cur}" },
    st_boss: { zh: " [BOSS]", en: " [BOSS]" },
    st_best: { zh: "最高层", en: "Best" },
    st_run: { zh: "运行中", en: "Running" },
    st_paused: { zh: "已暂停", en: "Paused" },
    st_algo: { zh: "算法", en: "Algo" },
    st_speed: { zh: "倍速", en: "Speed" },
    st_steps: { zh: "步计数", en: "Steps" },
    st_hp: { zh: "生命", en: "HP" },
    st_atk: { zh: "攻击", en: "ATK" },
    st_def: { zh: "防御", en: "DEF" },
    st_gold: { zh: "金币", en: "Gold" },
    st_ykey: { zh: "黄钥", en: "Y.key" },
    st_bkey: { zh: "蓝钥", en: "B.key" },
    st_rkey: { zh: "红钥", en: "R.key" },
    st_timer: { zh: "限时剩余 {s}s（暂停不计）", en: "Time left {s}s (pause freezes)" },
    exit_confirm: { zh: "确定退出冒险？", en: "Leave adventure?" },
    exit_done: { zh: "冒险结束！你的最高楼层：", en: "Ended. Best floor: " },
    gold_short: { zh: "金币不足！需要 ", en: "Not enough gold! Need " },
    gold_short2: { zh: " 金币，当前有 ", en: " gold, you have " },
    gold_short3: { zh: " 金币。", en: "." },
    buy_fail: { zh: "无法完成购买。", en: "Purchase failed." }
  };

  function loadStored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v === "en" || v === "zh") return v;
    } catch (e) {}
    return "zh";
  }

  function setLang(lang) {
    if (lang !== "en" && lang !== "zh") lang = "zh";
    current = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e2) {}
  }

  function getLang() {
    return current;
  }

  function initFromStorage() {
    current = loadStored();
  }

  function t(key, vars) {
    var row = T[key];
    if (!row) return key;
    var s = row[current] || row.zh || key;
    if (vars) {
      var k;
      for (k in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, k)) {
          s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
        }
      }
    }
    return s;
  }

  function tip(legKey) {
    var k = "tip_" + legKey;
    return t(k);
  }

  return {
    initFromStorage: initFromStorage,
    getLang: getLang,
    setLang: setLang,
    t: t,
    tip: tip
  };
})();

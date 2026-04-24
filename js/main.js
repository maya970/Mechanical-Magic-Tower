/**
 * p5 全局入口：必须在 p5.js 之后加载
 */
/* global createCanvas, resizeCanvas, width, height, floor, mouseX, mouseY, keyIsDown, keyCode, millis */

var SIM_STEP_MS = 200;

function setup() {
  try {
    window.GameState = createGameState();
    var gs = window.GameState;

    MotaI18n.initFromStorage();

    try {
      var hf = localStorage.getItem("highestFloor");
      if (hf) gs.highestFloor = parseInt(hf, 10) || 1;
      var nw = localStorage.getItem("navWeights_v1");
      if (nw) {
        var parsed = JSON.parse(nw);
        var k;
        for (k in parsed) {
          if (
            Object.prototype.hasOwnProperty.call(parsed, k) &&
            gs.navWeights &&
            typeof gs.navWeights[k] === "number" &&
            typeof parsed[k] === "number" &&
            parsed[k] > 0
          ) {
            gs.navWeights[k] = parsed[k];
          }
        }
      }
    } catch (e0) {}
    if (typeof MotaShopPricing !== "undefined") {
      MotaShopPricing.loadInto(gs);
    }

    if (typeof createCanvas !== "function") {
      throw new Error("createCanvas 不存在：p5.js 未正确加载");
    }

    var s = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.92, 640);
    createCanvas(s, s);
    var wrap = document.getElementById("main-wrap");
    var domCanvas = document.querySelector("#defaultCanvas0") || document.querySelector("canvas");
    if (wrap && domCanvas && domCanvas.parentElement !== wrap) {
      wrap.appendChild(domCanvas);
    }

    gs.cellSize = width / gs.GRID_SIZE;

    MotaUI.bindControls(gs);
    MotaUI.bindAutoPanel(gs);
    MotaUI.bindLangToggle(gs);
    MotaUI.bindLegendTooltip();
    MotaUI.bindNavWeights(gs);
    MotaUI.bindExit(gs);
    MotaUI.bindSideShop(gs);

    MotaMaze.generateFloor(gs);
    MotaGridMove.syncPlayerToStart(gs);
    MotaPhysics.syncPlayerSpawnFromGrid(gs);
    MotaGame.rebuildMonstersFromMaze(gs);
    gs.lastSimMillis = millis();
    gs.simAccumulator = 0;
    MotaUI.refreshUiLang(gs);
    MotaUI.syncWeightInputsFromGs(gs);
    MotaUI.refreshSideShop(gs);

    var err = document.getElementById("load-err");
    if (err) err.style.display = "none";
  } catch (e) {
    var msg = e && e.message ? e.message : String(e);
    var stack = e && e.stack ? e.stack : "";
    window.__BOOT_FAILED = true;
    if (typeof showBootError === "function") {
      showBootError(
        "游戏启动失败",
        msg +
          (stack
            ? "<pre style=\"text-align:left;font-size:11px;overflow:auto;max-height:35vh;\">" +
              String(stack).replace(/</g, "&lt;") +
              "</pre>"
            : "")
      );
    } else {
      alert("游戏启动失败: " + msg);
    }
  }
}

function draw() {
  if (window.__BOOT_FAILED) return;
  var gs = window.GameState;
  if (!gs || gs.gameOver) return;

  MotaGame.tickCooldowns(gs);

  var now = millis();
  if (!gs.lastSimMillis) gs.lastSimMillis = now;
  var dt = now - gs.lastSimMillis;
  gs.lastSimMillis = now;
  if (dt > 250) dt = 250;

  if (!gs.paused) {
    gs.runTimeActiveMs = (gs.runTimeActiveMs | 0) + dt;
    if (gs.runTimeActiveMs >= MotaConfig.RUN_LIMIT_UNPAUSED_MS) {
      MotaUI.failByTimeout(gs);
      return;
    }
    gs.simAccumulator += dt * (gs.timeScale || 1);
    while (gs.simAccumulator >= SIM_STEP_MS) {
      gs.simAccumulator -= SIM_STEP_MS;
      gs.simStepCount = (gs.simStepCount | 0) + 1;
      var mv = MotaNav.getNextMove(gs);
      if (mv && (mv.dx !== 0 || mv.dy !== 0)) {
        MotaGridMove.movePlayerGrid(gs, mv.dx, mv.dy);
        if (mv.dx !== 0) gs.phys.facing = mv.dx > 0 ? 1 : -1;
      }
    }
  }

  MotaGame.updateMonsterPhysics(gs, width, height);
  MotaGame.updatePlayerPhysics(gs, width, height);

  MotaRender.drawWorld(gs);
  MotaUI.updateStatus(gs);
}

function windowResized() {
  if (window.__BOOT_FAILED) return;
  var gs = window.GameState;
  if (!gs) return;
  var s = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.92, 640);
  resizeCanvas(s, s);
  gs.cellSize = width / gs.GRID_SIZE;
}

function mousePressed() {
  if (window.__BOOT_FAILED) return;
  var gs = window.GameState;
  if (!gs || gs.gameOver) return;
  var G = gs.GRID_SIZE;
  var cs = gs.cellSize;
  var mx = floor(mouseX / cs);
  var my = floor(mouseY / cs);
  if (mx >= 0 && mx < G && my >= 0 && my < G) {
    var cell = gs.maze[my][mx];
    if (cell.type === "monster" || cell.type === "boss") {
      var info = document.getElementById("monster-info");
      if (info) {
        info.innerHTML =
          (cell.type === "boss" ? "BOSS" : "怪物") +
          "信息<br>生命: " +
          cell.hp +
          "<br>攻击: " +
          cell.atk +
          "<br>防御: " +
          cell.def +
          "<br>金币: " +
          cell.gold;
        info.style.display = "block";
        setTimeout(function () {
          info.style.display = "none";
        }, 2800);
      }
    }
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

function keyPressed() {
  if (window.__BOOT_FAILED) return;
  var gs = window.GameState;
  if (!gs || gs.gameOver) return;
  if (keyCode === 32) {
    gs.paused = !gs.paused;
    MotaUI.updatePauseButtonText(gs);
    MotaUI.updateStatus(gs);
  }
}

function keyReleased() {}

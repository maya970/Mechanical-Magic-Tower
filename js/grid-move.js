/**
 * 离散网格移动（魔塔规则）+ 传送门 / 传送带后效
 */
var MotaGridMove = (function () {
  var R = MotaRng;
  var W = MotaWalls;

  function syncPlayerToStart(gs) {
    gs.playerGx = gs.startPos.x;
    gs.playerGy = gs.startPos.y;
  }

  function pickupCell(gs, x, y) {
    var c = gs.maze[y][x];
    if (c.type === "key") {
      gs.player.keys[c.color]++;
      c.type = "floor";
      MotaUI.updateStatus(gs);
    } else if (c.type === "gold") {
      gs.player.gold += c.amount;
      c.type = "floor";
      MotaUI.updateStatus(gs);
    }
  }

  function applyPortal(gs) {
    var x = gs.playerGx;
    var y = gs.playerGy;
    var c = gs.maze[y][x];
    if (c.type !== "portal" || c.portalTarget == null) return;
    var tx = c.portalTarget.x;
    var ty = c.portalTarget.y;
    if (tx >= 0 && ty >= 0 && tx < gs.GRID_SIZE && ty < gs.GRID_SIZE) {
      gs.playerGx = tx;
      gs.playerGy = ty;
    }
  }

  /**
   * 传送带：最多再滑 1 格，速度不超过 1 格/步；随机模式在四个方向中选可走的一个
   */
  function applyConveyor(gs) {
    var x = gs.playerGx;
    var y = gs.playerGy;
    var c = gs.maze[y][x];
    if (c.type !== "conveyor") return;

    var dirs = [
      [0, -1, 0],
      [1, 0, 1],
      [0, 1, 2],
      [-1, 0, 3]
    ];
    var dx = 0;
    var dy = 0;
    var di = 0;

    if (c.convRandom) {
      var opts = [];
      for (di = 0; di < 4; di++) {
        var nx = x + dirs[di][0];
        var ny = y + dirs[di][1];
        var wi = dirs[di][2];
        if (nx < 0 || ny < 0 || nx >= gs.GRID_SIZE || ny >= gs.GRID_SIZE) continue;
        if (W.edgeBlocked(gs, x, y, wi)) continue;
        if (!canEnterCell(gs, nx, ny, false)) continue;
        opts.push(di);
      }
      if (opts.length === 0) return;
      var pick = opts[R.floor(R.rnd() * opts.length)];
      dx = dirs[pick][0];
      dy = dirs[pick][1];
      di = pick;
    } else {
      dx = c.convDx || 0;
      dy = c.convDy || 0;
      if (dx === 0 && dy === 0) return;
      for (var j = 0; j < 4; j++) {
        if (dirs[j][0] === dx && dirs[j][1] === dy) {
          di = j;
          break;
        }
      }
    }

    var nx = x + dx;
    var ny = y + dy;
    var wallIdx = dirs[di][2];
    if (nx < 0 || ny < 0 || nx >= gs.GRID_SIZE || ny >= gs.GRID_SIZE) return;
    if (W.edgeBlocked(gs, x, y, wallIdx)) return;
    if (!canEnterCell(gs, nx, ny, false)) return;

    gs.playerGx = nx;
    gs.playerGy = ny;
    pickupCell(gs, nx, ny);
    applyPortal(gs);
  }

  /** 仅判断目标格是否可站立（不消耗步数上的门） */
  function canEnterCell(gs, nx, ny, forCombat) {
    var t = gs.maze[ny][nx];
    if (t.type === "stairs" && gs.currentFloor % 10 === 0) {
      if (!gs.bossDefeated) return false;
      if (gs.doorPos && gs.maze[gs.doorPos.y][gs.doorPos.x].type === "door") return false;
    }
    if (t.type === "door") {
      if (t.requiresBoss && !gs.bossDefeated) return false;
      if ((gs.player.keys[t.color] || 0) < 1) return false;
    }
    if (t.type === "monster" || t.type === "boss") {
      if (!forCombat) {
        var pl = gs.player;
        var dmg = R.max(0, pl.atk - t.def);
        if (dmg === 0) return false;
        var dmgP = R.max(0, t.atk - pl.def);
        var turns = R.ceil(t.hp / dmg);
        var totalDmg = (turns - 1) * dmgP;
        if (pl.hp <= totalDmg) return false;
      }
    }
    return true;
  }

  function ascendStairs(gs) {
    if (gs.useStairsCooldown > 0) return;
    var t = gs.maze[gs.playerGy][gs.playerGx];
    if (t.type !== "stairs") return;

    if (gs.currentFloor % 10 === 0) {
      if (!gs.bossDefeated) {
        MotaUI.showAlert(MotaI18n.t("msg_boss_stairs"));
        gs.useStairsCooldown = 45;
        return;
      }
      if (gs.doorPos && gs.maze[gs.doorPos.y][gs.doorPos.x].type === "door") {
        MotaUI.showAlert(MotaI18n.t("msg_boss_door_stairs"));
        gs.useStairsCooldown = 45;
        return;
      }
    }
    gs.currentFloor++;
    if (gs.currentFloor > gs.highestFloor) {
      gs.highestFloor = gs.currentFloor;
      try {
        localStorage.setItem("highestFloor", String(gs.highestFloor));
      } catch (e) {}
    }
    MotaMaze.generateFloor(gs);
    syncPlayerToStart(gs);
    MotaPhysics.syncPlayerSpawnFromGrid(gs);
    MotaGame.rebuildMonstersFromMaze(gs);
    gs.navPath = [];
    MotaUI.updateStatus(gs);
    MotaUI.refreshSideShop(gs);
    gs.useStairsCooldown = 50;
  }

  function movePlayerGrid(gs, dx, dy) {
    if (gs.gameOver) return false;
    var nx = gs.playerGx + dx;
    var ny = gs.playerGy + dy;
    if (nx < 0 || ny < 0 || nx >= gs.GRID_SIZE || ny >= gs.GRID_SIZE) return false;

    var dirIdx = dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
    if (W.edgeBlocked(gs, gs.playerGx, gs.playerGy, dirIdx)) return false;

    var tile = gs.maze[ny][nx];

    if (tile.type === "stairs" && gs.currentFloor % 10 === 0) {
      if (!gs.bossDefeated) return false;
      if (gs.doorPos && gs.maze[gs.doorPos.y][gs.doorPos.x].type === "door") return false;
    }

    if (tile.type === "boss") {
      MotaGame.combatWithCellMonster(gs, nx, ny);
      if (!gs.gameOver) {
        gs.playerGx = nx;
        gs.playerGy = ny;
        pickupCell(gs, nx, ny);
        applyPortal(gs);
        applyConveyor(gs);
      }
      gs.navPath = [];
      return true;
    }

    if (tile.type === "door") {
      if (tile.requiresBoss && !gs.bossDefeated) return false;
      if (gs.player.keys[tile.color] > 0) {
        gs.player.keys[tile.color]--;
        tile.type = "floor";
        MotaUI.updateStatus(gs);
        tile = gs.maze[ny][nx];
      } else {
        return false;
      }
    }

    if (tile.type === "monster") {
      MotaGame.combatWithCellMonster(gs, nx, ny);
      if (!gs.gameOver) {
        gs.playerGx = nx;
        gs.playerGy = ny;
        pickupCell(gs, nx, ny);
        applyPortal(gs);
        applyConveyor(gs);
      }
      gs.navPath = [];
      return true;
    }

    if (tile.type === "key") {
      gs.player.keys[tile.color]++;
      tile.type = "floor";
      MotaUI.updateStatus(gs);
    } else if (tile.type === "gold") {
      gs.player.gold += tile.amount;
      tile.type = "floor";
      MotaUI.updateStatus(gs);
    }

    if (tile.type === "stairs") {
      gs.playerGx = nx;
      gs.playerGy = ny;
      ascendStairs(gs);
      gs.navPath = [];
      return true;
    }

    gs.playerGx = nx;
    gs.playerGy = ny;
    pickupCell(gs, nx, ny);
    applyPortal(gs);
    applyConveyor(gs);
    gs.navPath = [];
    return true;
  }

  return {
    syncPlayerToStart: syncPlayerToStart,
    movePlayerGrid: movePlayerGrid,
    canEnterCell: canEnterCell,
    applyPortal: applyPortal,
    applyConveyor: applyConveyor,
    ascendStairs: ascendStairs
  };
})();

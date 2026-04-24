/**
 * 每帧更新：玩家物理、怪物 AI、战斗、楼梯、拾取
 */
var MotaGame = (function () {
  var R = MotaRng;
  var C = MotaConfig;
  var P = MotaPhysics;

  function playerBBox(gs) {
    var ph = gs.phys;
    return { l: ph.px - ph.hw, r: ph.px + ph.hw, t: ph.py - ph.hh, b: ph.py + ph.hh };
  }

  function monsterBBox(m) {
    return { l: m.px - m.hw, r: m.px + m.hw, t: m.py - m.hh, b: m.py + m.hh };
  }

  function aabbOverlap(a, b) {
    return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  }

  function keyDown(code) {
    if (typeof keyIsDown === "function") return keyIsDown(code);
    return false;
  }

  function rebuildMonstersFromMaze(gs) {
    var G = gs.GRID_SIZE;
    var cs = gs.cellSize;
    gs.monsters = [];
    for (var y = 0; y < G; y++) {
      for (var x = 0; x < G; x++) {
        var c = gs.maze[y][x];
        if (c.type === "monster" || c.type === "boss") {
          gs.monsters.push({
            gx: x,
            gy: y,
            px: (x + 0.5) * cs,
            py: (y + 1) * cs - 14,
            vx: R.rnd() < 0.5 ? -1.2 : 1.2,
            vy: 0,
            hw: c.type === "boss" ? 10 : 7,
            hh: c.type === "boss" ? 20 : 14,
            hp: c.hp,
            atk: c.atk,
            def: c.def,
            gold: c.gold,
            kind: c.type,
            onGround: true,
            think: 0,
            jumpCd: 0,
            animT: R.rnd() * Math.PI * 2
          });
        }
      }
    }
  }

  function tryPickupAndInteract(gs) {
    var G = gs.GRID_SIZE;
    var cs = gs.cellSize;
    var ph = gs.phys;
    var gx = R.floor(ph.px / cs);
    var gy = R.floor(ph.py / cs);
    if (gx < 0 || gy < 0 || gx >= G || gy >= G) return;
    var c = gs.maze[gy][gx];
    var cx = (gx + 0.5) * cs;
    var cy = (gy + 0.65) * cs;
    if (R.abs(ph.px - cx) < cs * 0.38 && R.abs(ph.py - cy) < cs * 0.42) {
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
  }

  function tryUseDoorNearPlayer(gs) {
    if (gs.doorInteractCooldown > 0) return;
    var G = gs.GRID_SIZE;
    var cs = gs.cellSize;
    var ph = gs.phys;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < dirs.length; i++) {
      var gx = R.floor(ph.px / cs) + dirs[i][0];
      var gy = R.floor(ph.py / cs) + dirs[i][1];
      if (gx < 0 || gy < 0 || gx >= G || gy >= G) continue;
      var t = gs.maze[gy][gx];
      if (t.type !== "door") continue;
      var cx = (gx + 0.5) * cs;
      var cy = (gy + 0.5) * cs;
      if (R.abs(ph.px - cx) > cs * 0.55 || R.abs(ph.py - cy) > cs * 0.55) continue;
      if (t.requiresBoss && !gs.bossDefeated) {
        MotaUI.showAlert("必须先击败BOSS才能开启此门！");
        gs.doorInteractCooldown = 40;
        return;
      }
      if (gs.player.keys[t.color] > 0) {
        gs.player.keys[t.color]--;
        t.type = "floor";
        MotaUI.updateStatus(gs);
        gs.doorInteractCooldown = 30;
      } else {
        MotaUI.showAlert(
          "需要" + (t.color === "yellow" ? "黄色" : t.color === "blue" ? "蓝色" : "红色") + "钥匙！"
        );
        gs.doorInteractCooldown = 40;
      }
      return;
    }
  }

  function tryStairs(gs) {
    if (gs.useStairsCooldown > 0) return;
    var cs = gs.cellSize;
    var ph = gs.phys;
    var gx = R.floor(ph.px / cs);
    var gy = R.floor(ph.py / cs);
    var t = gs.maze[gy][gx];
    if (t.type !== "stairs") return;
    var cx = (gx + 0.5) * cs;
    var cy = (gy + 0.72) * cs;
    if (R.abs(ph.px - cx) > cs * 0.42 || R.abs(ph.py - cy) > cs * 0.5) return;

    if (gs.currentFloor % 10 === 0) {
      if (!gs.bossDefeated) {
        MotaUI.showAlert("必须先击败BOSS才能上楼！");
        gs.useStairsCooldown = 45;
        return;
      }
      if (gs.doorPos && gs.maze[gs.doorPos.y][gs.doorPos.x].type === "door") {
        MotaUI.showAlert("必须先通过BOSS后的门才能上楼！");
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
    P.syncPlayerSpawnFromGrid(gs);
    rebuildMonstersFromMaze(gs);
    MotaUI.updateStatus(gs);
    gs.useStairsCooldown = 50;
  }

  function combatWithCellMonster(gs, gx, gy) {
    var t = gs.maze[gy][gx];
    if (t.type !== "monster" && t.type !== "boss") return false;
    var pl = gs.player;

    if (t.type === "boss") {
      var dmgToMon = R.max(0, pl.atk - t.def);
      var dmgToPlayer = R.max(0, t.atk - pl.def);
      if (dmgToMon === 0) {
        MotaUI.showAlert("你的攻击无法伤害BOSS！");
        return true;
      }
      var turns = R.ceil(t.hp / dmgToMon);
      var totalDmg = (turns - 1) * dmgToPlayer;
      if (pl.hp <= totalDmg) {
        gs.gameOver = true;
        MotaUI.persistHighest(gs);
        MotaUI.showAlert("你被BOSS打败了！最高楼层：" + gs.highestFloor);
        setTimeout(function () {
          window.location.reload();
        }, 2200);
        return true;
      }
      pl.hp -= totalDmg;
      pl.gold += t.gold;
      gs.bossDefeated = true;
      t.type = "floor";
      gs.monsters = gs.monsters.filter(function (m) {
        return !(m.gx === gx && m.gy === gy);
      });
      MotaUI.updateStatus(gs);
      return true;
    }

    var dmg2 = R.max(0, pl.atk - t.def);
    var dmgP = R.max(0, t.atk - pl.def);
    if (dmg2 === 0) {
      MotaUI.showAlert("你的攻击无法伤害怪物！");
      return true;
    }
    var turns2 = R.ceil(t.hp / dmg2);
    var totalDmg2 = (turns2 - 1) * dmgP;
    if (pl.hp <= totalDmg2) {
      gs.gameOver = true;
      MotaUI.persistHighest(gs);
      MotaUI.showAlert("你被怪物打败了！最高楼层：" + gs.highestFloor);
      setTimeout(function () {
        window.location.reload();
      }, 2200);
      return true;
    }
    pl.hp -= totalDmg2;
    pl.gold += t.gold;
    t.type = "floor";
    gs.monsters = gs.monsters.filter(function (m) {
      return !(m.gx === gx && m.gy === gy);
    });
    MotaUI.updateStatus(gs);
    return true;
  }

  function checkMonsterTouchCombat(gs) {
    var pb = playerBBox(gs);
    for (var i = 0; i < gs.monsters.length; i++) {
      var m = gs.monsters[i];
      var mb = monsterBBox(m);
      if (!aabbOverlap(pb, mb)) continue;
      if (gs.maze[m.gy][m.gx].type === "monster" || gs.maze[m.gy][m.gx].type === "boss") {
        combatWithCellMonster(gs, m.gx, m.gy);
      }
      return;
    }
  }

  function clampWorld(gs, canvasW, canvasH) {
    var ph = gs.phys;
    var margin = ph.hw + 2;
    ph.px = R.clamp(ph.px, margin, canvasW - margin);
    if (ph.py - ph.hh < 0) {
      ph.py = ph.hh;
      ph.vy = 0;
    }
    if (ph.py + ph.hh > canvasH) {
      ph.py = canvasH - ph.hh;
      ph.vy = 0;
      ph.onGround = true;
    }
  }

  function updatePlayerPhysics(gs, canvasW, canvasH) {
    if (gs.gameOver) return;
    var ph = gs.phys;
    var cs = gs.cellSize;
    var tx = (gs.playerGx + 0.5) * cs;
    var ty = (gs.playerGy + 0.72) * cs;
    var k = 0.22;
    ph.px += (tx - ph.px) * k;
    ph.py += (ty - ph.py) * k;
    ph.vx = (tx - ph.px) * 0.08;
    ph.vy = (ty - ph.py) * 0.08;
    ph.onGround = true;
    ph.animT += 0.12 + R.abs(ph.vx) * 0.05;
    clampWorld(gs, canvasW, canvasH);
  }

  function updateMonsterPhysics(gs, canvasW, canvasH) {
    var cs = gs.cellSize;
    for (var i = 0; i < gs.monsters.length; i++) {
      var m = gs.monsters[i];
      if (gs.maze[m.gy][m.gx].type !== "monster" && gs.maze[m.gy][m.gx].type !== "boss") continue;
      m.px = (m.gx + 0.5) * cs;
      m.py = (m.gy + 1) * cs - 14;
      m.vx = 0;
      m.vy = 0;
      m.onGround = true;
      m.animT += 0.08;
    }
  }

  function tickCooldowns(gs) {
    if (gs.useStairsCooldown > 0) gs.useStairsCooldown--;
    if (gs.shopCooldown > 0) gs.shopCooldown--;
    if (gs.doorInteractCooldown > 0) gs.doorInteractCooldown--;
  }

  return {
    rebuildMonstersFromMaze: rebuildMonstersFromMaze,
    updatePlayerPhysics: updatePlayerPhysics,
    updateMonsterPhysics: updateMonsterPhysics,
    tryStairs: tryStairs,
    tickCooldowns: tickCooldowns,
    playerBBox: playerBBox,
    monsterBBox: monsterBBox,
    combatWithCellMonster: combatWithCellMonster
  };
})();

/**
 * 迷宫与楼层生成（魔塔逻辑）
 */
var MotaMaze = (function () {
  var C = MotaConfig;
  var R = MotaRng;

  function weightedRandomKey(gs) {
    var w = C.KEY_WEIGHTS;
    var total = w.yellow + w.blue + w.red;
    var r = R.rnd() * total;
    if (r < w.yellow) return "yellow";
    if (r < w.yellow + w.blue) return "blue";
    return "red";
  }

  function isReachable(gs, sx, sy, ex, ey) {
    var G = gs.GRID_SIZE;
    var maze = gs.maze;
    var visited = [];
    for (var y = 0; y < G; y++) visited[y] = [];
    for (var j = 0; j < G; j++) for (var i = 0; i < G; i++) visited[j][i] = false;
    var queue = [[sx, sy]];
    visited[sy][sx] = true;
    while (queue.length > 0) {
      var cur = queue.shift();
      var cx = cur[0];
      var cy = cur[1];
      if (cx === ex && cy === ey) return true;
      var dirs = [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]];
      for (var d = 0; d < 4; d++) {
        var dy = dirs[d][0];
        var dx = dirs[d][1];
        var wallIdx = dirs[d][2];
        var nx = cx + dx;
        var ny = cy + dy;
        if (nx >= 0 && nx < G && ny >= 0 && ny < G && !visited[ny][nx] && !maze[cy][cx].walls[wallIdx]) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
    return false;
  }

  function validateFloor(gs) {
    var G = gs.GRID_SIZE;
    var maze = gs.maze;
    var hasStairs = false;
    var stairsX, stairsY;
    for (var y = 0; y < G; y++) {
      for (var x = 0; x < G; x++) {
        if (maze[y][x].type === "stairs") {
          hasStairs = true;
          stairsX = x;
          stairsY = y;
          break;
        }
      }
      if (hasStairs) break;
    }
    if (!hasStairs) return false;
    if (!isReachable(gs, gs.startPos.x, gs.startPos.y, stairsX, stairsY)) return false;
    if (gs.currentFloor % 10 === 0) {
      if (!gs.bossPos || maze[1][6].type !== "boss") return false;
      if (!gs.doorPos || maze[1][7].type !== "door" || !maze[1][7].requiresBoss) return false;
      if (maze[1][3].type !== "key") return false;
      if (maze[1][8].type !== "stairs") return false;
    }
    return true;
  }

  function getNearbyTiles(x, y, pathTiles, maxDist) {
    return pathTiles.filter(function (pt) {
      var dist = R.abs(pt[0] - x) + R.abs(pt[1] - y);
      return dist > 0 && dist <= maxDist;
    });
  }

  function removeFromPath(pathTiles, rx, ry) {
    return pathTiles.filter(function (pt) {
      return pt[0] !== rx || pt[1] !== ry;
    });
  }

  function getPathTiles(gs) {
    var G = gs.GRID_SIZE;
    var maze = gs.maze;
    var visited = [];
    for (var y = 0; y < G; y++) visited[y] = [];
    for (var j = 0; j < G; j++) for (var i = 0; i < G; i++) visited[j][i] = false;
    var queue = [[gs.startPos.x, gs.startPos.y]];
    var parent = {};
    visited[gs.startPos.y][gs.startPos.x] = true;

    while (queue.length > 0) {
      var cur = queue.shift();
      var cx = cur[0];
      var cy = cur[1];
      if (maze[cy][cx].type === "stairs") {
        var path = [];
        var c = { x: cx, y: cy };
        while (c) {
          path.push([c.x, c.y]);
          c = parent[c.x + "," + c.y];
        }
        path.reverse();
        return path.slice(1, -1);
      }
      var dirs = [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]];
      for (var d = 0; d < 4; d++) {
        var dy = dirs[d][0];
        var dx = dirs[d][1];
        var wallIdx = dirs[d][2];
        var nx = cx + dx;
        var ny = cy + dy;
        if (nx >= 0 && nx < G && ny >= 0 && ny < G && !visited[ny][nx] && !maze[cy][cx].walls[wallIdx]) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
          parent[nx + "," + ny] = { x: cx, y: cy };
        }
      }
    }
    return [];
  }

  function addRandomPlatforms(gs) {
    var G = gs.GRID_SIZE;
    var cs = gs.cellSize;
    for (var y = 0; y < G; y++) {
      for (var x = 0; x < G; x++) {
        var c = gs.maze[y][x];
        c.platforms = [];
        if (gs.currentFloor % 10 === 0) continue;
        if (c.type !== "floor" && c.type !== "stairs") continue;
        if (x === gs.startPos.x && y === gs.startPos.y) continue;
        if (x === gs.stairsPos.x && y === gs.stairsPos.y) continue;
        if (R.rnd() < 0.28) {
          var w = cs * (0.35 + R.rnd() * 0.35);
          var lx = (R.rnd() < 0.5 ? 0.15 : 0.5) * cs;
          var ly = cs * (0.35 + R.rnd() * 0.28);
          c.platforms.push({ lx: lx, ly: ly, lw: w, lh: 6 });
        }
      }
    }
  }

  function generateFloor(gs) {
    var G = gs.GRID_SIZE;
    gs.maze = [];
    gs.bossDefeated = false;
    gs.bossPos = null;
    gs.doorPos = null;
    var maxAttempts = 10;
    var attempts = 0;

    while (attempts < maxAttempts) {
      gs.maze = [];
      for (var y = 0; y < G; y++) {
        gs.maze[y] = [];
        for (var x = 0; x < G; x++) {
          gs.maze[y][x] = { walls: [false, false, false, false], visited: false, type: "floor", platforms: [] };
        }
      }

      function carve(x, y) {
        gs.maze[y][x].visited = true;
        var directions = R.shuffle([[0, -1], [1, 0], [0, 1], [-1, 0]]);
        for (var i = 0; i < directions.length; i++) {
          var dx = directions[i][0];
          var dy = directions[i][1];
          var nx = x + dx;
          var ny = y + dy;
          if (nx >= 0 && nx < G && ny >= 0 && ny < G && !gs.maze[ny][nx].visited) {
            if (dx === 1) {
              gs.maze[y][x].walls[1] = false;
              gs.maze[ny][nx].walls[3] = false;
            } else if (dx === -1) {
              gs.maze[y][x].walls[3] = false;
              gs.maze[ny][nx].walls[1] = false;
            } else if (dy === 1) {
              gs.maze[y][x].walls[2] = false;
              gs.maze[ny][nx].walls[0] = false;
            } else if (dy === -1) {
              gs.maze[y][x].walls[0] = false;
              gs.maze[ny][nx].walls[2] = false;
            }
            carve(nx, ny);
          }
        }
      }

      gs.startPos = { x: 1, y: 1 };
      if (gs.currentFloor % 10 === 0) {
        gs.maze[1][3].type = "key";
        gs.maze[1][3].color = weightedRandomKey(gs);

        gs.bossPos = { x: 6, y: 1 };
        var mt = C.MONSTER_TYPES[C.MONSTER_TYPES.length - 1];
        var scale = 1 + (gs.currentFloor - 1) * 0.0125;
        gs.maze[1][6].type = "boss";
        gs.maze[1][6].hp = R.floor(mt.baseHP * scale * C.BOSS_SCALE.hp);
        gs.maze[1][6].atk = R.floor(mt.baseATK * scale * C.BOSS_SCALE.atk);
        gs.maze[1][6].def = R.floor(mt.baseDEF * scale * C.BOSS_SCALE.def);
        gs.maze[1][6].gold = 50 + R.floor(R.rnd() * 50) * gs.currentFloor;

        gs.doorPos = { x: 7, y: 1 };
        gs.maze[1][7].type = "door";
        gs.maze[1][7].color = gs.maze[1][3].color;
        gs.maze[1][7].requiresBoss = true;

        gs.stairsPos = { x: 8, y: 1 };
        gs.maze[1][8].type = "stairs";
      } else {
        for (var yy = 0; yy < G; yy++) {
          for (var xx = 0; xx < G; xx++) {
            gs.maze[yy][xx].walls = [true, true, true, true];
          }
        }
        gs.stairsPos = { x: G - 2, y: G - 2 };
        gs.maze[gs.startPos.y][gs.startPos.x].walls = [false, false, false, false];
        carve(0, 0);
        var extraConnections = 4 + R.floor(R.rnd() * 4);
        for (var ei = 0; ei < extraConnections; ei++) {
          var rx = 1 + R.floor(R.rnd() * (G - 2));
          var ry = 1 + R.floor(R.rnd() * (G - 2));
          var dirs = R.shuffle([[0, -1], [1, 0], [0, 1], [-1, 0]]);
          for (var di = 0; di < dirs.length; di++) {
            var ddx = dirs[di][0];
            var ddy = dirs[di][1];
            var nnx = rx + ddx;
            var nny = ry + ddy;
            if (nnx >= 0 && nnx < G && nny >= 0 && nny < G) {
              var wallIdx = ddy === -1 ? 0 : ddy === 1 ? 2 : ddx === -1 ? 3 : 1;
              if (gs.maze[ry][rx].walls[wallIdx]) {
                gs.maze[ry][rx].walls[wallIdx] = false;
                if (ddy === -1) gs.maze[nny][nnx].walls[2] = false;
                else if (ddy === 1) gs.maze[nny][nnx].walls[0] = false;
                else if (ddx === -1) gs.maze[nny][nnx].walls[1] = false;
                else if (ddx === 1) gs.maze[nny][nnx].walls[3] = false;
                break;
              }
            }
          }
        }
        gs.maze[gs.stairsPos.y][gs.stairsPos.x] = { walls: [false, false, false, false], type: "stairs", platforms: [] };
      }

      var protectedTiles =
        gs.currentFloor % 10 === 0
          ? [[1, 1], [3, 1], [6, 1], [7, 1], [8, 1]]
          : [[1, 1], [gs.stairsPos.x, gs.stairsPos.y]];
      var allFloors = [];
      for (var fy = 0; fy < G; fy++) {
        for (var fx = 0; fx < G; fx++) {
          if (
            (gs.maze[fy][fx].type === "floor" || gs.maze[fy][fx].type === "stairs") &&
            !protectedTiles.some(function (pt) {
              return pt[0] === fx && pt[1] === fy;
            })
          ) {
            allFloors.push([fx, fy]);
          }
        }
      }

      var pathTiles = getPathTiles(gs);
      if (gs.currentFloor % 10 !== 0 && pathTiles.length < 10) {
        attempts++;
        continue;
      }

      var doorCount = gs.currentFloor % 10 === 0 ? 0 : 2 + R.floor(R.rnd() * 2);
      for (var di = 0; di < doorCount && pathTiles.length >= 6; di++) {
        var lo = 3;
        var hi = pathTiles.length - 6;
        var idx = lo + R.floor(R.rnd() * (hi - lo + 1));
        var doorCell = pathTiles.splice(idx, 1)[0];
        var ddx = doorCell[0];
        var ddy = doorCell[1];
        var color = weightedRandomKey(gs);
        gs.maze[ddy][ddx].type = "door";
        gs.maze[ddy][ddx].color = color;

        var nearby = getNearbyTiles(ddx, ddy, pathTiles, 3);
        if (nearby.length > 0) {
          var k = nearby.splice(R.floor(R.rnd() * nearby.length), 1)[0];
          gs.maze[k[1]][k[0]].type = "key";
          gs.maze[k[1]][k[0]].color = color;
          pathTiles = removeFromPath(pathTiles, k[0], k[1]);

          if (nearby.length > 0) {
            var g = nearby.splice(R.floor(R.rnd() * nearby.length), 1)[0];
            gs.maze[g[1]][g[0]].type = "gold";
            gs.maze[g[1]][g[0]].amount = 20 + R.floor(R.rnd() * 20) * gs.currentFloor;
            pathTiles = removeFromPath(pathTiles, g[0], g[1]);
          }
        }
      }

      var monsterCount =
        gs.currentFloor % 10 === 0 ? 2 + R.floor(R.rnd() * 2) : 3 + R.floor(R.rnd() * 3) + R.floor((gs.currentFloor - 1) / 10);
      var placedMonsters = [];
      for (var mi = 0; mi < monsterCount; mi++) {
        var validTiles = allFloors.filter(function (ft) {
          var mx = ft[0];
          var my = ft[1];
          return (
            gs.maze[my][mx].type === "floor" &&
            placedMonsters.every(function (pm) {
              return R.abs(mx - pm[0]) + R.abs(my - pm[1]) >= 3;
            }) &&
            !protectedTiles.some(function (pt) {
              return pt[0] === mx && pt[1] === my;
            })
          );
        });
        if (validTiles.length === 0) break;
        var midx = R.floor(R.rnd() * validTiles.length);
        var mcell = validTiles.splice(midx, 1)[0];
        var mx = mcell[0];
        var my = mcell[1];
        allFloors = allFloors.filter(function (ft) {
          return ft[0] !== mx || ft[1] !== my;
        });
        placedMonsters.push([mx, my]);

        var mti = R.floor(R.rnd() * C.MONSTER_TYPES.length);
        var mt0 = C.MONSTER_TYPES[mti];
        var sc = 1 + (gs.currentFloor - 1) * 0.0125;
        gs.maze[my][mx].type = "monster";
        gs.maze[my][mx].hp = R.floor(mt0.baseHP * sc);
        gs.maze[my][mx].atk = R.floor(mt0.baseATK * sc);
        gs.maze[my][mx].def = R.floor(mt0.baseDEF * sc);
        gs.maze[my][mx].gold = 10 + R.floor(R.rnd() * 15) * gs.currentFloor;

        var near2 = getNearbyTiles(mx, my, allFloors, 2);
        if (near2.length > 0 && R.rnd() < 0.8) {
          var ic = near2.splice(R.floor(R.rnd() * near2.length), 1)[0];
          var ix = ic[0];
          var iy = ic[1];
          if (R.rnd() < 0.7) {
            gs.maze[iy][ix].type = "gold";
            gs.maze[iy][ix].amount = 20 + R.floor(R.rnd() * 20) * gs.currentFloor;
          } else {
            gs.maze[iy][ix].type = "key";
            gs.maze[iy][ix].color = weightedRandomKey(gs);
          }
          allFloors = allFloors.filter(function (ft) {
            return ft[0] !== ix || ft[1] !== iy;
          });
        }
      }

      var extraCount = 3 + R.floor(R.rnd() * 3);
      for (var exi = 0; exi < extraCount && allFloors.length > 0; exi++) {
        var eidx = R.floor(R.rnd() * allFloors.length);
        var ec = allFloors.splice(eidx, 1)[0];
        var gx = ec[0];
        var gy = ec[1];
        if (
          protectedTiles.some(function (pt) {
            return pt[0] === gx && pt[1] === gy;
          })
        )
          continue;
        if (R.rnd() < 0.7) {
          gs.maze[gy][gx].type = "gold";
          gs.maze[gy][gx].amount = 20 + R.floor(R.rnd() * 20) * gs.currentFloor;
        } else {
          gs.maze[gy][gx].type = "key";
          gs.maze[gy][gx].color = weightedRandomKey(gs);
        }
      }

      if (validateFloor(gs)) {
        addRandomPlatforms(gs);
        addMechanics(gs);
        gs.simStepCount = 0;
        gs.useStairsCooldown = 0;
        gs.shopCooldown = 0;
        gs.doorInteractCooldown = 0;
        return;
      }
      attempts++;
    }

    gs.maze = [];
    for (var y2 = 0; y2 < G; y2++) {
      gs.maze[y2] = [];
      for (var x2 = 0; x2 < G; x2++) {
        gs.maze[y2][x2] = { walls: [false, false, false, false], visited: false, type: "floor", platforms: [] };
      }
    }
    gs.maze[1][1].type = "floor";
    if (gs.currentFloor % 10 === 0) {
      gs.maze[1][3].type = "key";
      gs.maze[1][3].color = "yellow";
      gs.bossPos = { x: 6, y: 1 };
      var mt1 = C.MONSTER_TYPES[C.MONSTER_TYPES.length - 1];
      var sc1 = 1 + (gs.currentFloor - 1) * 0.05;
      gs.maze[1][6].type = "boss";
      gs.maze[1][6].hp = R.floor(mt1.baseHP * sc1 * C.BOSS_SCALE.hp);
      gs.maze[1][6].atk = R.floor(mt1.baseATK * sc1 * C.BOSS_SCALE.atk);
      gs.maze[1][6].def = R.floor(mt1.baseDEF * sc1 * C.BOSS_SCALE.def);
      gs.maze[1][6].gold = 50 + R.floor(R.rnd() * 50) * gs.currentFloor;
      gs.doorPos = { x: 7, y: 1 };
      gs.maze[1][7].type = "door";
      gs.maze[1][7].color = "yellow";
      gs.maze[1][7].requiresBoss = true;
      gs.stairsPos = { x: 8, y: 1 };
      gs.maze[1][8].type = "stairs";
    } else {
      gs.stairsPos = { x: 8, y: 1 };
      gs.maze[1][8].type = "stairs";
    }
    addRandomPlatforms(gs);
    addMechanics(gs);
    gs.simStepCount = 0;
  }

  /** 传送带 / 传送门 / 周期门（BOSS 层跳过） */
  function addMechanics(gs) {
    gs.toggleGates = [];
    var G = gs.GRID_SIZE;
    var m = gs.maze;
    if (gs.currentFloor % 10 === 0) return;

    var path = getPathTiles(gs);
    var d4 = [
      [0, -1, 0],
      [1, 0, 1],
      [0, 1, 2],
      [-1, 0, 3]
    ];
    var i;
    var px, py, t;

    R.shuffle(path);
    var cPlaced = 0;
    for (i = 0; i < path.length && cPlaced < 2; i++) {
      px = path[i][0];
      py = path[i][1];
      if (px === gs.startPos.x && py === gs.startPos.y) continue;
      if (m[py][px].type !== "floor") continue;
      m[py][px].type = "conveyor";
      if (R.rnd() < 0.55) {
        m[py][px].convRandom = true;
      } else {
        m[py][px].convRandom = false;
        var di = R.floor(R.rnd() * 4);
        m[py][px].convDx = d4[di][0];
        m[py][px].convDy = d4[di][1];
      }
      cPlaced++;
    }

    var floorCells = [];
    for (py = 0; py < G; py++) {
      for (px = 0; px < G; px++) {
        t = m[py][px].type;
        if (t === "floor" && !(px === gs.startPos.x && py === gs.startPos.y)) floorCells.push([px, py]);
      }
    }
    if (floorCells.length >= 8 && R.rnd() < 0.75) {
      R.shuffle(floorCells);
      var a = floorCells[0];
      var b = null;
      for (i = 1; i < floorCells.length; i++) {
        if (R.abs(floorCells[i][0] - a[0]) + R.abs(floorCells[i][1] - a[1]) > 4) {
          b = floorCells[i];
          break;
        }
      }
      if (b) {
        m[a[1]][a[0]].type = "portal";
        m[a[1]][a[0]].portalTarget = { x: b[0], y: b[1] };
        m[b[1]][b[0]].type = "portal";
        m[b[1]][b[0]].portalTarget = { x: a[0], y: a[1] };
      }
    }

    var cand = [];
    for (py = 0; py < G; py++) {
      for (px = 0; px < G; px++) {
        for (var k = 0; k < 4; k++) {
          if (m[py][px].walls[k]) continue;
          var nx = px + d4[k][0];
          var ny = py + d4[k][1];
          if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
          if (m[ny][nx].walls[(k + 2) % 4]) continue;
          cand.push({ x: px, y: py, dir: k });
        }
      }
    }
    if (cand.length > 0 && R.rnd() < 0.5) {
      var g = cand[R.floor(R.rnd() * cand.length)];
      gs.toggleGates.push({ x: g.x, y: g.y, dir: g.dir, period: 24, phase: 0 });
    }
  }

  return { generateFloor: generateFloor };
})();

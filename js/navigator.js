/**
 * 寻路：BFS / Dijkstra / A* / 洪水(从楼梯反向 BFS 距离场) / 贪心
 */
var MotaNav = (function () {
  var R = MotaRng;
  var W = MotaWalls;
  var dirs = [
    [0, -1, 0],
    [1, 0, 1],
    [0, 1, 2],
    [-1, 0, 3]
  ];

  function findStairs(gs) {
    var G = gs.GRID_SIZE;
    var y, x;
    for (y = 0; y < G; y++) {
      for (x = 0; x < G; x++) {
        if (gs.maze[y][x].type === "stairs") return { x: x, y: y };
      }
    }
    return null;
  }

  function neighbors(gs, x, y) {
    var out = [];
    var di;
    for (di = 0; di < 4; di++) {
      var dx = dirs[di][0];
      var dy = dirs[di][1];
      var wi = dirs[di][2];
      var nx = x + dx;
      var ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= gs.GRID_SIZE || ny >= gs.GRID_SIZE) continue;
      if (W.edgeBlocked(gs, x, y, wi)) continue;
      if (!MotaGridMove.canEnterCell(gs, nx, ny, false)) continue;
      out.push({ nx: nx, ny: ny, dx: dx, dy: dy });
    }
    return out;
  }

  /** 从目标走回起点，得到「起点后的第一格 … 目标」 */
  function walkBack(parent, sx, sy, gx, gy) {
    var cells = [];
    var cx = gx;
    var cy = gy;
    while (cx !== sx || cy !== sy) {
      cells.push({ x: cx, y: cy });
      var pr = parent[cx + "," + cy];
      if (!pr) return null;
      cx = pr.x;
      cy = pr.y;
    }
    cells.reverse();
    return cells;
  }

  function bfsPath(gs, sx, sy, goal) {
    var G = gs.GRID_SIZE;
    var vis = [];
    var y, x;
    for (y = 0; y < G; y++) {
      vis[y] = [];
      for (x = 0; x < G; x++) vis[y][x] = false;
    }
    var q = [{ x: sx, y: sy }];
    vis[sy][sx] = true;
    var parent = {};
    var qi = 0;
    while (qi < q.length) {
      var c = q[qi++];
      if (c.x === goal.x && c.y === goal.y) {
        return walkBack(parent, sx, sy, goal.x, goal.y);
      }
      var nb = neighbors(gs, c.x, c.y);
      var i;
      for (i = 0; i < nb.length; i++) {
        var n = nb[i];
        if (vis[n.ny][n.nx]) continue;
        vis[n.ny][n.nx] = true;
        parent[n.nx + "," + n.ny] = { x: c.x, y: c.y };
        q.push({ x: n.nx, y: n.ny });
      }
    }
    return null;
  }

  function dijkstraOrAstar(gs, sx, sy, goal, useHeuristic) {
    var G = gs.GRID_SIZE;
    var dist = [];
    var y, x;
    for (y = 0; y < G; y++) {
      dist[y] = [];
      for (x = 0; x < G; x++) dist[y][x] = 1e15;
    }
    dist[sy][sx] = 0;
    var parent = {};
    var pq = [{ x: sx, y: sy, f: 0, g: 0 }];

    function h(xx, yy) {
      return R.abs(xx - goal.x) + R.abs(yy - goal.y);
    }

    function edgeCost(gs2, nx2, ny2) {
      var t = gs2.maze[ny2][nx2];
      var w = 1;
      if (t.type === "monster" || t.type === "boss") w += 0.5;
      if (t.type === "conveyor") w += 0.2;
      if (t.type === "portal") w += 0.05;
      return w;
    }

    while (pq.length > 0) {
      pq.sort(function (a, b) {
        return a.f - b.f;
      });
      var cur = pq.shift();
      if (cur.x === goal.x && cur.y === goal.y) {
        return walkBack(parent, sx, sy, goal.x, goal.y);
      }
      if (cur.g > dist[cur.y][cur.x]) continue;
      var nb = neighbors(gs, cur.x, cur.y);
      var i;
      for (i = 0; i < nb.length; i++) {
        var n = nb[i];
        var ec = edgeCost(gs, n.nx, n.ny);
        var ng = cur.g + ec;
        if (ng < dist[n.ny][n.nx]) {
          dist[n.ny][n.nx] = ng;
          parent[n.nx + "," + n.ny] = { x: cur.x, y: cur.y };
          var nf = ng + (useHeuristic ? h(n.nx, n.ny) : 0);
          pq.push({ x: n.nx, y: n.ny, f: nf, g: ng });
        }
      }
    }
    return null;
  }

  /** 从楼梯反向 BFS，无向图边与正向一致 */
  function floodDistanceField(gs) {
    var goal = findStairs(gs);
    if (!goal) return null;
    var G = gs.GRID_SIZE;
    var dist = [];
    var y, x;
    for (y = 0; y < G; y++) {
      dist[y] = [];
      for (x = 0; x < G; x++) dist[y][x] = -1;
    }
    var q = [{ x: goal.x, y: goal.y }];
    dist[goal.y][goal.x] = 0;
    var qi = 0;
    while (qi < q.length) {
      var c = q[qi++];
      var d0 = dist[c.y][c.x];
      var nb = neighbors(gs, c.x, c.y);
      var i;
      for (i = 0; i < nb.length; i++) {
        var n = nb[i];
        if (dist[n.ny][n.nx] >= 0) continue;
        dist[n.ny][n.nx] = d0 + 1;
        q.push({ x: n.nx, y: n.ny });
      }
    }
    return dist;
  }

  function floodNext(gs, distField) {
    var sx = gs.playerGx;
    var sy = gs.playerGy;
    var best = 1e9;
    var bestMove = null;
    var nb = neighbors(gs, sx, sy);
    var i;
    for (i = 0; i < nb.length; i++) {
      var n = nb[i];
      var d = distField[n.ny][n.nx];
      if (d < 0) continue;
      if (d < best) {
        best = d;
        bestMove = { dx: n.dx, dy: n.dy };
      }
    }
    return bestMove;
  }

  function pathToNextStep(gs, path) {
    if (!path || path.length === 0) return null;
    var nx = path[0].x;
    var ny = path[0].y;
    return { dx: nx - gs.playerGx, dy: ny - gs.playerGy };
  }

  function buildPathOverlay(gs, path) {
    if (!path) {
      gs.navPath = [];
      return;
    }
    var out = [{ x: gs.playerGx, y: gs.playerGy }];
    var i;
    for (i = 0; i < path.length; i++) {
      out.push({ x: path[i].x, y: path[i].y });
    }
    gs.navPath = out;
  }

  function getNextMove(gs) {
    var goal = findStairs(gs);
    if (!goal) return null;
    if (gs.playerGx === goal.x && gs.playerGy === goal.y) return null;

    var sx = gs.playerGx;
    var sy = gs.playerGy;
    var algo = gs.navAlgorithm || "bfs";
    var path = null;

    if (algo === "greedy") {
      var best = null;
      var bestH = 1e9;
      var nb0 = neighbors(gs, sx, sy);
      var j;
      for (j = 0; j < nb0.length; j++) {
        var nn = nb0[j];
        var hh = R.abs(nn.nx - goal.x) + R.abs(nn.ny - goal.y);
        if (hh < bestH) {
          bestH = hh;
          best = { dx: nn.dx, dy: nn.dy };
        }
      }
      gs.navPath = [];
      return best;
    }

    if (algo === "flood") {
      var field = floodDistanceField(gs);
      if (field) {
        var mv2 = floodNext(gs, field);
        if (mv2) {
          gs.navPath = [];
          return mv2;
        }
      }
      path = bfsPath(gs, sx, sy, goal);
    } else if (algo === "dijkstra") {
      path = dijkstraOrAstar(gs, sx, sy, goal, false);
    } else if (algo === "astar") {
      path = dijkstraOrAstar(gs, sx, sy, goal, true);
    } else {
      path = bfsPath(gs, sx, sy, goal);
    }

    buildPathOverlay(gs, path);
    return pathToNextStep(gs, path);
  }

  function invalidate(gs) {
    gs.navPath = [];
  }

  return {
    getNextMove: getNextMove,
    invalidate: invalidate,
    findStairs: findStairs
  };
})();

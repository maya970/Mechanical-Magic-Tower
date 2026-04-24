/**
 * 碰撞体收集与轴对齐解析
 */
var MotaPhysics = (function () {
  var R = MotaRng;
  var C = MotaConfig;

  function cellWorldRect(gs, gx, gy) {
    var cs = gs.cellSize;
    return { x0: gx * cs, y0: gy * cs, x1: (gx + 1) * cs, y1: (gy + 1) * cs };
  }

  function solidWallsForCell(gs, gx, gy, out) {
    var G = gs.GRID_SIZE;
    if (gx < 0 || gy < 0 || gx >= G || gy >= G) return;
    var cell = gs.maze[gy][gx];
    var Rct = cellWorldRect(gs, gx, gy);
    var t = C.WALL_THICK;
    var MW = typeof MotaWalls !== "undefined" ? MotaWalls : null;
    if (cell.walls[0] || (MW && MW.gateClosedOnEdge(gs, gx, gy, 0)))
      out.push({ x0: Rct.x0, y0: Rct.y0, x1: Rct.x1, y1: Rct.y0 + t });
    if (cell.walls[1] || (MW && MW.gateClosedOnEdge(gs, gx, gy, 1)))
      out.push({ x0: Rct.x1 - t, y0: Rct.y0, x1: Rct.x1, y1: Rct.y1 });
    if (cell.walls[2] || (MW && MW.gateClosedOnEdge(gs, gx, gy, 2)))
      out.push({ x0: Rct.x0, y1: Rct.y1 - t, x1: Rct.x1, y1: Rct.y1 });
    if (cell.walls[3] || (MW && MW.gateClosedOnEdge(gs, gx, gy, 3)))
      out.push({ x0: Rct.x0, y0: Rct.y0, x1: Rct.x0 + t, y1: Rct.y1 });
  }

  function cellWalkFloor(gs, gx, gy, out) {
    var G = gs.GRID_SIZE;
    if (gx < 0 || gy < 0 || gx >= G || gy >= G) return;
    var cell = gs.maze[gy][gx];
    var W = cellWorldRect(gs, gx, gy);
    var cs = gs.cellSize;
    var fh = 8;
    var y0 = W.y1 - fh;
    var y1 = W.y1;
    if (cell.walls[2]) {
      out.push({ x0: W.x0, y0: y0, x1: W.x1, y1: y1 });
      return;
    }
    if (gy >= G - 1) {
      out.push({ x0: W.x0, y0: y0, x1: W.x1, y1: y1 });
      return;
    }
    var hole = cs * 0.38;
    var mx = (W.x0 + W.x1) * 0.5;
    out.push({ x0: W.x0, y0: y0, x1: mx - hole * 0.5, y1: y1 });
    out.push({ x0: mx + hole * 0.5, y0: y0, x1: W.x1, y1: y1 });
  }

  function collectSolidsAround(gs, px, py, rangeCells) {
    var G = gs.GRID_SIZE;
    var cs = gs.cellSize;
    var gx = R.floor(px / cs);
    var gy = R.floor(py / cs);
    var rects = [];
    var dy, dx, cx, cy, c, W, p, i;
    for (dy = -rangeCells; dy <= rangeCells; dy++) {
      for (dx = -rangeCells; dx <= rangeCells; dx++) {
        cx = gx + dx;
        cy = gy + dy;
        solidWallsForCell(gs, cx, cy, rects);
        cellWalkFloor(gs, cx, cy, rects);
      }
    }
    for (dy = -rangeCells; dy <= rangeCells; dy++) {
      for (dx = -rangeCells; dx <= rangeCells; dx++) {
        cx = gx + dx;
        cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= G || cy >= G) continue;
        c = gs.maze[cy][cx];
        if (!c.platforms) continue;
        W = cellWorldRect(gs, cx, cy);
        for (i = 0; i < c.platforms.length; i++) {
          p = c.platforms[i];
          rects.push({
            x0: W.x0 + p.lx,
            y0: W.y0 + p.ly,
            x1: W.x0 + p.lx + p.lw,
            y1: W.y0 + p.ly + p.lh
          });
        }
      }
    }
    for (dy = -rangeCells; dy <= rangeCells; dy++) {
      for (dx = -rangeCells; dx <= rangeCells; dx++) {
        cx = gx + dx;
        cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= G || cy >= G) continue;
        c = gs.maze[cy][cx];
        if (c.type !== "door") continue;
        W = cellWorldRect(gs, cx, cy);
        rects.push({ x0: W.x0 + 9, y0: W.y0 + 9, x1: W.x1 - 9, y1: W.y1 - 9 });
      }
    }
    return rects;
  }

  function resolveAxisX(box, vx, rects) {
    var nl = box.l + vx;
    var nr = box.r + vx;
    var nt = box.t;
    var nb = box.b;
    var wi;
    for (wi = 0; wi < rects.length; wi++) {
      var w = rects[wi];
      if (nr <= w.x0 || nl >= w.x1 || nb <= w.y0 || nt >= w.y1) continue;
      if (vx > 0) nr = R.min(nr, w.x0);
      else if (vx < 0) nl = R.max(nl, w.x1);
    }
    return {
      nl: nl,
      nr: nr,
      hit: (vx > 0 && nr < box.r + vx - 1e-4) || (vx < 0 && nl > box.l + vx + 1e-4)
    };
  }

  function resolveAxisY(box, vy, rects) {
    var nl = box.l;
    var nr = box.r;
    var nt = box.t + vy;
    var nb = box.b + vy;
    var wi;
    for (wi = 0; wi < rects.length; wi++) {
      var w = rects[wi];
      if (nr <= w.x0 || nl >= w.x1 || nb <= w.y0 || nt >= w.y1) continue;
      if (vy > 0) nb = R.min(nb, w.y0);
      else if (vy < 0) nt = R.max(nt, w.y1);
    }
    return {
      nt: nt,
      nb: nb,
      landed: vy > 0 && nb < box.b + vy - 0.2,
      ceiling: vy < 0 && nt > box.t + vy + 0.2
    };
  }

  function physicsStepEntity(gs, pos, vel, hw, hh, isPlayer) {
    var rects = collectSolidsAround(gs, pos.px, pos.py, 2);
    var box = { l: pos.px - hw, r: pos.px + hw, t: pos.py - hh, b: pos.py + hh };

    var rx = resolveAxisX(box, vel.vx, rects);
    pos.px = (rx.nl + rx.nr) * 0.5;
    if (rx.hit) vel.vx = 0;

    box = { l: pos.px - hw, r: pos.px + hw, t: pos.py - hh, b: pos.py + hh };
    var ry = resolveAxisY(box, vel.vy, rects);
    pos.py = (ry.nt + ry.nb) * 0.5;
    if (vel.vy > 0 && ry.landed) {
      vel.vy = 0;
      if (isPlayer) gs.phys.landSquash = 1;
    } else if (vel.vy < 0 && ry.ceiling) {
      vel.vy = 0;
    }

    rects = collectSolidsAround(gs, pos.px, pos.py, 2);
    var groundProbe = {
      l: pos.px - hw + 0.5,
      r: pos.px + hw - 0.5,
      t: pos.py + hh - 1,
      b: pos.py + hh + 4
    };
    var onG = false;
    for (var gi = 0; gi < rects.length; gi++) {
      var g = rects[gi];
      if (groundProbe.r <= g.x0 || groundProbe.l >= g.x1 || groundProbe.b <= g.y0 || groundProbe.t >= g.y1) continue;
      onG = true;
      break;
    }
    return onG;
  }

  function syncPlayerSpawnFromGrid(gs) {
    if (typeof MotaGridMove !== "undefined" && MotaGridMove.syncPlayerToStart) {
      MotaGridMove.syncPlayerToStart(gs);
    }
    var cs = gs.cellSize;
    var ph = gs.phys;
    ph.px = (gs.playerGx + 0.5) * cs;
    ph.py = (gs.playerGy + 0.72) * cs;
    ph.vx = 0;
    ph.vy = 0;
    ph.onGround = true;
  }

  return {
    cellWorldRect: cellWorldRect,
    collectSolidsAround: collectSolidsAround,
    resolveAxisX: resolveAxisX,
    resolveAxisY: resolveAxisY,
    physicsStepEntity: physicsStepEntity,
    syncPlayerSpawnFromGrid: syncPlayerSpawnFromGrid
  };
})();

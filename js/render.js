/**
 * p5 绘制（仅在 setup 完成、draw 内调用）
 */
var MotaRender = (function () {
  var R = MotaRng;

  function drawStickFigure(cx, cy, facing, speed, onGround, squash, col, animT) {
    push();
    translate(cx, cy);
    scale(1, 1 - squash * 0.12);
    var swing = onGround
      ? sin(animT * (1.2 + abs(speed) * 0.25)) * (0.15 + abs(speed) * 0.06)
      : sin(animT * 2.2) * 0.2;
    var leg = onGround ? 0.35 + abs(speed) * 0.08 : 0.5;
    stroke(col[0], col[1], col[2]);
    strokeWeight(2.2);
    noFill();
    line(0, -12, 0, 4);
    line(0, -4, -7 * facing + swing * 8, 2 + leg * 10);
    line(0, -4, 7 * facing - swing * 8, 2 + leg * 10);
    line(0, -12, -6 * facing - swing * 5, -18 + abs(swing) * 4);
    line(0, -12, 6 * facing + swing * 5, -18 + abs(swing) * 4);
    strokeWeight(1.6);
    point(0, -20);
    pop();
  }

  function drawMonsterStick(gs, m) {
    var c = m.kind === "boss" ? [255, 80, 255] : [255, 120, 255];
    var fv = m.vx !== 0 ? R.sign(m.vx) : 1;
    drawStickFigure(m.px, m.py, fv, m.vx, m.onGround, 0, c, m.animT);
    if (m.kind === "boss") {
      push();
      fill(255, 255, 0);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(10);
      text("B", m.px, m.py - 26);
      pop();
    }
  }

  function drawWorld(gs) {
    var G = gs.GRID_SIZE;
    var cs = gs.cellSize;
    var maze = gs.maze;

    background(8, 10, 12);

    stroke(0, 200, 80);
    strokeWeight(2);
    for (var y = 0; y < G; y++) {
      for (var x = 0; x < G; x++) {
        var cx = x * cs;
        var cy = y * cs;
        var cell = maze[y][x];
        if (cell.walls[0]) line(cx, cy, cx + cs, cy);
        if (cell.walls[1]) line(cx + cs, cy, cx + cs, cy + cs);
        if (cell.walls[2]) line(cx, cy + cs, cx + cs, cy + cs);
        if (cell.walls[3]) line(cx, cy, cx, cy + cs);
      }
    }

    if (gs.toggleGates && typeof MotaWalls !== "undefined") {
      var gi;
      for (gi = 0; gi < gs.toggleGates.length; gi++) {
        var tg = gs.toggleGates[gi];
        var tx = tg.x * cs;
        var ty = tg.y * cs;
        var closed = MotaWalls.gateClosedOnEdge(gs, tg.x, tg.y, tg.dir);
        stroke(closed ? 255 : 100, closed ? 80 : 255, 40);
        strokeWeight(closed ? 5 : 3);
        if (tg.dir === 0) line(tx + cs * 0.35, ty, tx + cs * 0.65, ty);
        else if (tg.dir === 1) line(tx + cs, ty + cs * 0.35, tx + cs, ty + cs * 0.65);
        else if (tg.dir === 2) line(tx + cs * 0.35, ty + cs, tx + cs * 0.65, ty + cs);
        else line(tx, ty + cs * 0.35, tx, ty + cs * 0.65);
      }
    }

    noStroke();
    for (var y2 = 0; y2 < G; y2++) {
      for (var x2 = 0; x2 < G; x2++) {
        var cx2 = x2 * cs;
        var cy2 = y2 * cs;
        var cell2 = maze[y2][x2];
        if (cell2.platforms) {
          fill(40, 70, 50);
          for (var pi = 0; pi < cell2.platforms.length; pi++) {
            var p = cell2.platforms[pi];
            rect(cx2 + p.lx, cy2 + p.ly, p.lw, p.lh, 2);
          }
        }
        if (cell2.type === "door") {
          fill(cell2.color === "yellow" ? "#cc0" : cell2.color === "blue" ? "#228" : "#a00");
          rect(cx2 + 10, cy2 + 10, cs - 20, cs - 20, 4);
        } else if (cell2.type === "key") {
          fill(cell2.color === "yellow" ? "#ff0" : cell2.color === "blue" ? "#44f" : "#f44");
          ellipse(cx2 + cs / 2, cy2 + cs / 2, cs * 0.5);
        } else if (cell2.type === "gold") {
          fill(255, 200, 60);
          ellipse(cx2 + cs / 2, cy2 + cs / 2, cs * 0.45);
        } else if (cell2.type === "stairs") {
          fill(255, 90, 90);
          triangle(cx2 + cs * 0.2, cy2 + cs * 0.78, cx2 + cs * 0.8, cy2 + cs * 0.78, cx2 + cs / 2, cy2 + cs * 0.22);
        } else if (cell2.type === "conveyor") {
          fill(0, 60, 90, 160);
          rect(cx2 + 3, cy2 + 3, cs - 6, cs - 6, 4);
          stroke(0, 200, 255);
          strokeWeight(2);
          var mx = cx2 + cs / 2;
          var my = cy2 + cs / 2;
          if (cell2.convRandom) {
            line(mx - 6, my - 6, mx + 6, my + 6);
            line(mx - 6, my + 6, mx + 6, my - 6);
          } else {
            var cdx = cell2.convDx || 0;
            var cdy = cell2.convDy || 0;
            line(mx - cdx * 8, my - cdy * 8, mx + cdx * 8, my + cdy * 8);
          }
          noStroke();
        } else if (cell2.type === "portal") {
          fill(140, 60, 200, 180);
          quad(cx2 + cs / 2, cy2 + 6, cx2 + cs - 6, cy2 + cs / 2, cx2 + cs / 2, cy2 + cs - 6, cx2 + 6, cy2 + cs / 2);
        }
      }
    }

    if (gs.navPath && gs.navPath.length > 1) {
      stroke(255, 255, 0, 120);
      strokeWeight(2);
      var pi;
      for (pi = 0; pi < gs.navPath.length - 1; pi++) {
        var a = gs.navPath[pi];
        var b = gs.navPath[pi + 1];
        line((a.x + 0.5) * cs, (a.y + 0.5) * cs, (b.x + 0.5) * cs, (b.y + 0.5) * cs);
      }
      noStroke();
    }

    var mi;
    for (mi = 0; mi < gs.monsters.length; mi++) {
      var m = gs.monsters[mi];
      if (maze[m.gy][m.gx].type === "monster" || maze[m.gy][m.gx].type === "boss") {
        drawMonsterStick(gs, m);
      }
    }

    var ph = gs.phys;
    drawStickFigure(ph.px, ph.py, ph.facing, ph.vx, ph.onGround, ph.landSquash, [120, 255, 140], ph.animT);
  }

  return { drawWorld: drawWorld };
})();

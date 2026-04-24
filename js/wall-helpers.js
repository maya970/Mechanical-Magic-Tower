/**
 * 静态墙 + 周期开关墙（由 simStepCount 驱动）
 * wallIdx: 0=N 1=E 2=S 3=W，与迷宫 carve 一致
 */
var MotaWalls = (function () {
  var R = MotaRng;

  function gateClosedOnEdge(gs, x, y, wallIdx) {
    if (!gs.toggleGates || gs.toggleGates.length === 0) return false;
    var t = gs.simStepCount | 0;
    var i;
    for (i = 0; i < gs.toggleGates.length; i++) {
      var g = gs.toggleGates[i];
      if (g.x === x && g.y === y && g.dir === wallIdx) {
        var half = R.max(2, R.floor((g.period || 24) / 2));
        var ph = (g.phase || 0) | 0;
        var q = R.floor((t + ph) / half);
        return (q % 2) === 1;
      }
    }
    return false;
  }

  /** 从 (x,y) 沿 wallIdx 走向邻居是否被挡住 */
  function edgeBlocked(gs, x, y, wallIdx) {
    var maze = gs.maze;
    if (y < 0 || x < 0 || y >= gs.GRID_SIZE || x >= gs.GRID_SIZE) return true;
    var c = maze[y][x];
    if (c.walls[wallIdx]) return true;
    if (gateClosedOnEdge(gs, x, y, wallIdx)) return true;
    return false;
  }

  return {
    gateClosedOnEdge: gateClosedOnEdge,
    edgeBlocked: edgeBlocked
  };
})();

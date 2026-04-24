/**
 * 运行时游戏状态（单例，由 main setup 填充）
 * 机械魔塔：离散网格 + 自动寻路
 */
var GameState = null;

function createGameState() {
  return {
    GRID_SIZE: MotaConfig.GRID_SIZE,
    cellSize: 50,
    currentFloor: 1,
    highestFloor: 1,
    shopCurves: { life: 0, strike: 0, bulwark: 0 },
    gameOver: false,
    bossDefeated: false,
    doorPos: null,
    bossPos: null,
    player: {
      hp: 5000,
      atk: 30,
      def: 30,
      gold: 0,
      keys: { yellow: 0, blue: 0, red: 0 }
    },
    maze: [],
    startPos: { x: 1, y: 1 },
    stairsPos: { x: 8, y: 1 },
    playerGx: 1,
    playerGy: 1,
    phys: {
      px: 0,
      py: 0,
      vx: 0,
      vy: 0,
      hw: 7,
      hh: 15,
      onGround: true,
      coyote: 0,
      jumpBuf: 0,
      facing: 1,
      landSquash: 0,
      animT: 0
    },
    keysHeld: { left: false, right: false, up: false, down: false, jump: false },
    monsters: [],
    useStairsCooldown: 0,
    shopCooldown: 0,
    doorInteractCooldown: 0,
    toggleGates: [],
    navAlgorithm: "astar",
    navWeights: JSON.parse(JSON.stringify(MotaConfig.DEFAULT_NAV_WEIGHTS)),
    runTimeActiveMs: 0,
    paused: false,
    timeScale: 1,
    simAccumulator: 0,
    simStepCount: 0,
    lastSimMillis: 0,
    navPath: []
  };
}

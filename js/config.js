/**
 * 全局常量（须在 state / maze-gen / physics 等之前加载）
 */
var MotaConfig = {
  GRID_SIZE: 11,
  WALL_THICK: 4,
  KEY_WEIGHTS: { yellow: 4, blue: 2, red: 1 },
  MONSTER_TYPES: [
    { baseHP: 50, baseATK: 15, baseDEF: 5 },
    { baseHP: 80, baseATK: 25, baseDEF: 10 },
    { baseHP: 120, baseATK: 35, baseDEF: 15 },
    { baseHP: 160, baseATK: 45, baseDEF: 20 }
  ],
  BOSS_SCALE: { hp: 5, atk: 1.5, def: 1.5 },
  SHOP_COST_BASE: {
    hp: 20,
    atk: 40,
    def: 40,
    yellow: 8,
    blue: 15,
    red: 25,
    reset: 80
  }
};

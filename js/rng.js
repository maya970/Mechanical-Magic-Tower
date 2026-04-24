/**
 * 随机与数学工具（config 之后、p5 之前也可工作：无 p5 时用 Math.random）
 */
var MotaRng = (function () {
  function rnd() {
    if (typeof random === "function") {
      return random();
    }
    return Math.random();
  }

  return {
    rnd: rnd,
    floor: Math.floor,
    ceil: Math.ceil,
    max: Math.max,
    min: Math.min,
    abs: Math.abs
  };
})();

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

  var floor = Math.floor;
  var max = Math.max;
  var min = Math.min;

  function sign(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  }

  function clamp(v, lo, hi) {
    return max(lo, min(hi, v));
  }

  /** Fisher–Yates，就地打乱并返回同一数组 */
  function shuffle(arr) {
    if (!arr || arr.length < 2) return arr;
    var i, j, t;
    for (i = arr.length - 1; i > 0; i--) {
      j = floor(rnd() * (i + 1));
      t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  return {
    rnd: rnd,
    floor: floor,
    ceil: Math.ceil,
    max: max,
    min: min,
    abs: Math.abs,
    sign: sign,
    clamp: clamp,
    shuffle: shuffle
  };
})();

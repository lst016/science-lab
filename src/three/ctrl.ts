/** 阅读器与 3D 舞台之间共享的可变控制对象（避免每帧 React 状态）。 */
export interface StageCtrl {
  /** 翻页开始时间（performance.now，ms），0 表示没有翻页 */
  flipStart: number;
  flipDir: 1 | -1;
  /** 新装置开始立起的时间（可在未来，等叶片让开），0 表示尚未替换内容 */
  swapAt: number;
  /** 书的阅读进度 0..1，决定左右页厚度 */
  fracTarget: number;
  /** 开书动画开始时间 */
  openStart: number;
  /** 当前装置的立起程度 0..1，供外部读取 */
  rigU: number;
  /** Whether the camera should inspect the apparatus at close range. */
  closeUp: boolean;
  /** 翻页前装置的立起程度，用于折回动画的连续性 */
  fallFrom: number;
  /** 叶片当前根部角度，供外部读取 */
  heights: { tL: number; tR: number };
}

export const FLIP_MS = 1100;
export const OPEN_MS = 1500;

/* 叶片在翻页时段内的运动：前 6% 静止，随后 86% 时长内按三次缓动从一侧翻到另一侧。 */
const LEAF_DELAY = 0.06;
const LEAF_SPAN = 0.86;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 翻页开始后 ms 毫秒时叶片的进度 0..1（0=起始侧平铺，1=落到另一侧） */
export const leafProgress = (ms: number) =>
  easeInOut(Math.min(1, Math.max(0, (ms / FLIP_MS - LEAF_DELAY) / LEAF_SPAN)));

/** 叶片到达进度 p 的时刻（leafProgress 的反函数） */
const msAtLeaf = (p: number) => {
  const t = p < 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2;
  return Math.round((LEAF_DELAY + LEAF_SPAN * t) * FLIP_MS);
};

/** 叶片立直：两侧都被遮住最少，此时替换内容 */
export const SWAP_MS = msAtLeaf(0.5);
/** 叶片落定 */
export const LAND_MS = msAtLeaf(1);
/** 向后翻时叶片（含滞后的外缘）已离开左页，左页文字可以淡入 */
export const LEFT_CLEAR_MS = msAtLeaf(0.72);
/** 向前翻时叶片已离开右页，新装置可以立起 */
export const RIGHT_CLEAR_MS = msAtLeaf(0.78);

export const makeCtrl = (): StageCtrl => ({
  flipStart: 0,
  flipDir: 1,
  swapAt: 0,
  fracTarget: 0,
  openStart: performance.now(),
  rigU: 0,
  closeUp: false,
  fallFrom: 1,
  heights: { tL: 0.1, tR: 0.4 },
});

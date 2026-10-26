/** 阅读器与 3D 舞台之间共享的可变控制对象（避免每帧 React 状态）。 */
export interface StageCtrl {
  /** 翻页开始时间（performance.now，ms），0 表示没有翻页 */
  flipStart: number;
  flipDir: 1 | -1;
  /** 已完成内容替换（装置开始升起）的时间，0 表示尚未 */
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
export const SWAP_MS = 460;
export const OPEN_MS = 1500;

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

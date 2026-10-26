/** 二维光线工具：折射（斯涅尔定律）、反射、线段求交。向量为 [x, y]。 */
export type V2 = [number, number];

export const norm2 = (v: V2): V2 => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
export const rot2 = (v: V2, a: number): V2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
export const dot2 = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];

/** d：入射方向（单位），n：界面单位法线（指向 n1 一侧，即 dot(d,n)<0）。返回折射方向；全反射返回 null。 */
export function refract2(d: V2, n: V2, n1: number, n2: number): V2 | null {
  const c = -dot2(d, n);
  const r = n1 / n2;
  const k = 1 - r * r * (1 - c * c);
  if (k < 0) return null;
  const t = r * c - Math.sqrt(k);
  return [r * d[0] + t * n[0], r * d[1] + t * n[1]];
}
export function reflect2(d: V2, n: V2): V2 {
  const c = dot2(d, n);
  return [d[0] - 2 * c * n[0], d[1] - 2 * c * n[1]];
}

/** 射线 (o + t d) 与线段 a-b 的交点参数 t（t>eps）；无交点返回 -1。 */
export function hitSeg(o: V2, d: V2, a: V2, b: V2): number {
  const e: V2 = [b[0] - a[0], b[1] - a[1]];
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return -1;
  const ao: V2 = [a[0] - o[0], a[1] - o[1]];
  const t = (ao[0] * e[1] - ao[1] * e[0]) / den;
  const u = (ao[0] * d[1] - ao[1] * d[0]) / den;
  return t > 1e-6 && u >= 0 && u <= 1 ? t : -1;
}

export const RAINBOW: { color: string; n: number }[] = [
  // 玻璃（冕牌）近似折射率，红到紫；n 为相对中心值的偏移 [-1,1]
  { color: '#ff3b30', n: -1 },
  { color: '#ff9f0a', n: -0.66 },
  { color: '#ffe14a', n: -0.33 },
  { color: '#4cd964', n: 0 },
  { color: '#30c5ff', n: 0.33 },
  { color: '#3a5bff', n: 0.66 },
  { color: '#a24bff', n: 1 },
];

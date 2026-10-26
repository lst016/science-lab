import { V3 } from '../kit';
import { RigIO } from './io';
import { BOARD_TOP, Run, WIRE_Y, Wire } from './electric-wire';
import { RHEO } from './electric-resist';

/* 电路板布局：器材接线点（接线柱顶）与导线连接。
   约定：电流方向由电源 + 端出发；上排元件自右向左，所以每个器件的 in 在右（+x）、out 在左。 */

export interface Term { in: V3; out: V3 }
const pair = (p: V3, half: number, y: number): Term => ({ in: [p[0] + half, y + BOARD_TOP, p[2]], out: [p[0] - half, y + BOARD_TOP, p[2]] });

export const T = {
  lamp: (p: V3): Term => pair(p, 0.36, 0.3),
  sw: (p: V3): Term => pair(p, 0.38, 0.27),
  /** 电表：+ 柱在 in 侧 */
  meter: (p: V3): Term => pair(p, 0.6, 0.25),
  res: (p: V3): Term => pair(p, 0.42, 0.26),
  /** 电池：+ 端出（out 侧 = 右），− 端回（in 侧 = 左） */
  bat: (p: V3): Term => ({ in: [p[0] - 0.95, 0.22 + BOARD_TOP, p[2]], out: [p[0] + 0.95, 0.22 + BOARD_TOP, p[2]] }),
  /** 变阻器：D（右上）进，A（左下）出 */
  rheo: (p: V3): Term => ({ in: [p[0] + RHEO.dX, RHEO.dY + BOARD_TOP, p[2]], out: [p[0] + RHEO.aX, RHEO.aY + BOARD_TOP, p[2] + RHEO.aZ] }),
  /** 竖排（旋转 90°）元件：电流沿 −z 方向穿过 */
  up: (p: V3, half: number, y: number): Term => ({ in: [p[0], y + BOARD_TOP, p[2] + half], out: [p[0], y + BOARD_TOP, p[2] - half] }),
  /** 竖排，电流沿 +z 方向 */
  down: (p: V3, half: number, y: number): Term => ({ in: [p[0], y + BOARD_TOP, p[2] - half], out: [p[0], y + BOARD_TOP, p[2] + half] }),
};

/** 导线折点：落在导线高度上的转角 */
export const C = (x: number, z: number): V3 => [x, WIRE_Y, z];

const same = (a: V3, b: V3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** 连两点：先升至导线高度，水平走（必要时在转角处拐弯），再落到端子 */
export function link(a: V3, b: V3, h = WIRE_Y): V3[] {
  const elbow: V3[] = a[0] !== b[0] && a[2] !== b[2] ? [[b[0], h, a[2]]] : [];
  const pts: V3[] = [a, [a[0], h, a[2]], ...elbow, [b[0], h, b[2]], b];
  return pts.filter((p, i) => i === 0 || !same(p, pts[i - 1]));
}

/** 一批导线，同一电流函数 */
export function Links({ pairs, cur, color }: { pairs: [V3, V3][]; cur: (io: RigIO) => number; color?: string }) {
  return (
    <group>
      {pairs.map(([a, b], i) => <Run key={i} pts={link(a, b)} cur={cur} color={color} />)}
    </group>
  );
}

export type El = Term | V3;
const inOf = (e: El): V3 => (Array.isArray(e) ? e : e.in);
const outOf = (e: El): V3 => (Array.isArray(e) ? e : e.out);

/** 沿一串器件/转角依次相连：上一件的 out 接下一件的 in */
export function route(els: El[]): [V3, V3][] {
  const out: [V3, V3][] = [];
  for (let i = 1; i < els.length; i++) out.push([outOf(els[i - 1]), inOf(els[i])]);
  return out;
}

/** 无电荷流的导线（电压表引线：电流极小，不画流动点） */
export function Leads({ pairs, h = 0.85, color = '#3f6ea6' }: { pairs: [V3, V3][]; h?: number; color?: string }) {
  return <group>{pairs.map(([a, b], i) => <Wire key={i} pts={link(a, b, h + (i % 2) * 0.1)} color={color} r={0.026} />)}</group>;
}

/** 反向（电流自左向右穿过） */
export const rev = (t: Term): Term => ({ in: t.out, out: t.in });

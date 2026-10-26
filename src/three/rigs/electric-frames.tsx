import { ReactNode } from 'react';
import { Ball, MAT, V3 } from '../kit';
import { RigIO } from './io';
import { Battery, Switch } from './electric-parts';
import { BOARD_TOP, Board, circ } from './electric-wire';
import { C, El, Links, T, rev, route } from './electric-layout';

/* 串联/并联电路骨架：底板、电池、总开关、转角导线与电荷流。
   元件由调用方按 T.* 接线点放置，骨架只负责把它们连成回路。 */

export const ZT = -1.0, ZB = 1.3, XR = 1.9, XL = -1.9, BX = -0.55, SX = 1.35;
export const Z1 = -0.15, Z2 = -1.5, ZBP = 1.45;
export const at = (x: number, z: number): V3 => [x, BOARD_TOP, z];

export const total = (io: RigIO) => circ(io).I;
export const isOn = (io: RigIO) => circ(io).on;
export const srcV = (io: RigIO) => circ(io).U;

/** 单回路：电池 → 总开关 → 右列上行 → 上排元件（自右向左）→ 左列下行 → 电池 */
export function SeriesFrame({ top, children, cur = total, volts = srcV, sw = true, swOn = isOn, width = 4.7, right = [], left = [] }: {swOn?: (io: RigIO) => boolean;  top: El[]; right?: El[]; left?: El[]; children?: ReactNode; cur?: (io: RigIO) => number; volts?: (io: RigIO) => number; sw?: boolean; width?: number }) {
  const bat = T.bat(at(BX, ZB));
  const s = rev(T.sw(at(SX, ZB)));
  const els: El[] = [bat, ...(sw ? [s] : []), C(XR, ZB), ...right, C(XR, ZT), ...top, C(XL, ZT), ...left, C(XL, ZB), bat];
  return (
    <group>
      <Board w={width} d={3.9} p={[0, 0, 0.1]} />
      <Battery p={at(BX, ZB)} volts={volts} />
      {sw && <Switch p={at(SX, ZB)} id="main" closed={swOn} tag="开关 S" />}
      <Links pairs={route(els)} cur={cur} />
      {children}
    </group>
  );
}

/** 双支路并联：干路（电池、开关）+ 上下两条支路，分流节点处有铜接点。 */
export function ParallelFrame({ br1, br2, i, i1, i2, children, volts = srcV, sw = true, leftTrunk = [] }: { leftTrunk?: El[]; br1: El[]; br2: El[]; i: (io: RigIO) => number; i1: (io: RigIO) => number; i2: (io: RigIO) => number; children?: ReactNode; volts?: (io: RigIO) => number; sw?: boolean }) {
  const bat = T.bat(at(BX, ZBP));
  const s = rev(T.sw(at(SX, ZBP)));
  const right: El[] = [bat, ...(sw ? [s] : []), C(XR, ZBP), C(XR, Z1)];
  const left: El[] = [C(XL, Z1), ...leftTrunk, C(XL, ZBP), bat];
  return (
    <group>
      <Board w={4.7} d={4.3} p={[0, 0, -0.05]} />
      <Battery p={at(BX, ZBP)} volts={volts} />
      {sw && <Switch p={at(SX, ZBP)} id="main" closed={isOn} tag="干路开关" />}
      <Links pairs={route(right)} cur={i} />
      <Links pairs={route([C(XR, Z1), ...br1, C(XL, Z1)])} cur={i1} />
      <Links pairs={route([C(XR, Z1), C(XR, Z2), ...br2, C(XL, Z2), C(XL, Z1)])} cur={i2} />
      <Links pairs={route(left)} cur={i} />
      {[XR, XL].map((x) => <Ball key={x} p={[x, WIRE_NODE, Z1]} r={0.085} m={MAT.brass} />)}
      {children}
    </group>
  );
}
const WIRE_NODE = 0.52;

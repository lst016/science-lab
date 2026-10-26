import { Ruler } from '../kit';
import { Lamp } from './electric-parts';
import { Meter } from './electric-meter';
import { Resistor, Rheostat } from './electric-resist';
import { IoLabel } from './parts';
import { RigIO, useParam } from './io';
import { BOARD_TOP, circ, lampLevel } from './electric-wire';
import { Leads, T } from './electric-layout';
import { SeriesFrame, XR, ZB, ZT, at, total } from './electric-frames';
import { autoA } from './electric-circuits';
import { WireSample, wireTerm } from './electric-wiresample';

/* 变阻器与欧姆定律类：滑动变阻器调光、定值电阻配电流表/电压表、电阻丝比较。 */

const midZ = (ZT + ZB) / 2;

/** 练习使用滑动变阻器：灯、变阻器、电流表串联 */
export function RheostatControl() {
  const maxR = useParam('resistance', 50);
  const slider = useParam('slider', 75);
  const U = useParam('voltage', 6);
  const reff = Math.max(0.5, (maxR * slider) / 100);
  const lamp = at(1.2, ZT), rh = at(-0.55, ZT), col = at(XR, midZ);
  return (
    <SeriesFrame top={[T.lamp(lamp), T.rheo(rh)]} right={[T.up(col, 0.6, 0.25)]}>
      <Lamp p={lamp} level={(io) => lampLevel(io.s('current', 0) ** 2 * 10, 0.5)} tag="小灯泡" />
      <Rheostat p={rh} pos={(io) => io.p('slider', 75) / 100} tag={(io) => `接入 ${io.s('resistance', 0).toFixed(0)} Ω（滑片 ${io.p('slider', 75).toFixed(0)}%）`} />
      <group position={col} rotation={[0, Math.PI / 2, 0]}>
        <Meter p={[0, 0, 0]} kind="A" max={autoA(U / reff)} value={total} plusRight={false} tag="电流表" />
      </group>
      <IoLabel p={[0, 1.7, 0.7]} size={0.23} get={() => '滑片远离 A 端 → 接入线圈变长 → 电阻大 → 灯暗'} />
    </SeriesFrame>
  );
}

const MODES: Record<string, (io: RigIO, R: number, U: number) => string> = {
  'ohm-voltage': (io, R) => `R = ${R.toFixed(0)} Ω 不变；U 增大 → I 增大`,
  'ohm-resistance': (io, R, U) => `U = ${U.toFixed(1)} V 保持不变；R 增大 → I 减小`,
  'voltmeter-ammeter-resistance': (io, R, U) => {
    const I = io.s('current', 0);
    return I > 0 ? `R = U / I = ${U.toFixed(1)} / ${I.toFixed(2)} = ${(U / I).toFixed(1)} Ω` : '电路断开，无法测电阻';
  },
};

/** 欧姆定律与伏安法：电阻与电流表串联，电压表并联在电阻两端 */
export function OhmCircuit({ variant }: { variant: string }) {
  const U = useParam('voltage', 3);
  const R = useParam('resistance', 10);
  const res = at(1.05, ZT), am = at(-0.85, ZT), vm = at(1.05, 0.3);
  const tr = T.res(res), tv = T.meter(vm);
  const label = MODES[variant] ?? MODES['ohm-voltage'];
  return (
    <SeriesFrame top={[tr, T.meter(am)]}>
      <Resistor p={res} ohms={(io) => io.s('resistance', R)} heat={(io) => (io.s('power', 0) / 6)} tag="R" />
      <Meter p={am} kind="A" max={autoA(U / R)} value={total} tag="电流表" />
      <Meter p={vm} kind="V" max={U > 3 ? 15 : 3} value={(io) => (circ(io).on ? circ(io).U : 0)} tag="电压表" digits={1} />
      <Leads pairs={[[tr.in, tv.in], [tr.out, tv.out]]} />
      <IoLabel p={[0, 1.75, 0.7]} size={0.23} get={(io) => label(io, R, U)} />
    </SeriesFrame>
  );
}

/** 电阻与长度/横截面积：同一电路接入不同规格的镍铬合金丝 */
export function ResistanceWires({ byLength }: { byLength: boolean }) {
  const col = at(XR, midZ);
  const sample = wireTerm(at(0, ZT), useParam('length', 50));
  return (
    <SeriesFrame top={[sample]} right={[T.up(col, 0.6, 0.25)]}>
      <WireSample p={at(0, ZT)} byLength={byLength} />
      <group position={col} rotation={[0, Math.PI / 2, 0]}>
        <Meter p={[0, 0, 0]} kind="A" max={5} value={(io) => (circ(io).on ? 1 / Math.max(0.2, io.s('resistanceRatio', 1)) : 0)} plusRight={false} tag="相对电流" unit="I/I₀" dialText="I/I₀" />
      </group>
      <Ruler p={[0, BOARD_TOP + 0.03, ZT + 0.62]} len={3.6} ticks={100} w={0.22} />
    </SeriesFrame>
  );
}

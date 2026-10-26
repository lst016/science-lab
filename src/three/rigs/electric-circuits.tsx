import { Lamp, Switch } from './electric-parts';
import { Meter } from './electric-meter';
import { Dashed, IoLabel } from './parts';
import { RigIO, useOptIndex, useParam } from './io';
import { Run, circ, lampLevel } from './electric-wire';
import { Leads, T, link } from './electric-layout';
import { ParallelFrame, SeriesFrame, XL, XR, Z1, Z2, ZB, ZBP, ZT, at, total } from './electric-frames';

/* 串联/并联电路类实验：灯、开关、电流表、电压表的真实接线。 */

/** 两灯电阻（与模型缺省一致：未给参数时均为 10 Ω） */
export const lampR = (io: RigIO): [number, number] => [
  io.p('lamp1', io.p('branch1', io.p('resistance1', io.p('resistance', 10)))),
  io.p('lamp2', io.p('branch2', io.p('resistance2', 10))),
];
const lvl = (I: (io: RigIO) => number, R: (io: RigIO) => number, rated = 1) => (io: RigIO) => lampLevel(I(io) ** 2 * R(io), rated);
export const autoA = (v: number) => (v > 0.6 ? 3 : 0.6);
export const autoV = (v: number) => (v > 3 ? 15 : 3);

/** 观察小灯泡被短路：L1、L2 串联；bypass 时导线跨接 L1 两端 */
export function BulbShort() {
  const bypass = useOptIndex('bypass', 0) === 0;
  const l1 = at(1.0, ZT), l2 = at(-0.9, ZT);
  const t1 = T.lamp(l1), t2 = T.lamp(l2);
  const U = (io: RigIO) => circ(io).U;
  // 跨接时电流只走导线与 L2；模型与装置均按 L2 限流
  const I = (io: RigIO) => (circ(io).on ? (bypass ? U(io) / 10 : io.s('current', 0)) : 0);
  const jumper = link(t1.in, t1.out, 1.25);
  return (
    <SeriesFrame top={[t1, t2]} cur={I}>
      <Lamp p={l1} level={bypass ? () => 0 : lvl(I, () => 10)} tag={bypass ? 'L1（被短路·熄灭）' : 'L1'} />
      <Lamp p={l2} level={lvl(I, () => 10)} tag="L2" />
      {bypass ? <Run pts={jumper} cur={I} color="#d6892f" /> : <Dashed a={jumper[1]} b={jumper[2]} m={6} />}
      <IoLabel p={[0, 1.6, 0.4]} size={0.24} get={() => (bypass ? '跨接线与 L1 并联：电流改走导线，L1 无电压' : '未跨接：电流依次通过 L1、L2，不是短路')} />
      {bypass && <IoLabel p={[0, 1.3, 1.9]} size={0.22} color="#7a1a10" bg="rgba(255,226,214,0.95)" get={() => '保护提示：切勿用导线直接短接电源两极'} />}
    </SeriesFrame>
  );
}

/** 连接串联和并联电路：开关位置决定哪条支路导通 */
export function SeriesParallelSwitches() {
  const par = useOptIndex('topology', 0) === 1;
  const sel = useOptIndex('switch', 0);
  const R = (io: RigIO) => lampR(io);
  if (!par) {
    const l1 = at(0.95, ZT), l2 = at(-0.95, ZT);
    return (
      <SeriesFrame top={[T.lamp(l1), T.lamp(l2)]}>
        <Lamp p={l1} level={lvl(total, (io) => R(io)[0])} tag="L1" />
        <Lamp p={l2} level={lvl(total, (io) => R(io)[1])} tag="L2" />
        <IoLabel p={[0, 1.5, 0.3]} size={0.24} get={(io) => (circ(io).on ? '串联：一个开关控制全部灯' : '开关断开：两灯都熄灭')} />
      </SeriesFrame>
    );
  }
  const s1 = (io: RigIO) => circ(io).on && sel !== 2;
  const s2 = (io: RigIO) => circ(io).on && sel !== 1;
  const U = (io: RigIO) => circ(io).U;
  const i1 = (io: RigIO) => (s1(io) ? U(io) / R(io)[0] : 0);
  const i2 = (io: RigIO) => (s2(io) ? U(io) / R(io)[1] : 0);
  const sw1 = at(0.75, Z1), sw2 = at(0.75, Z2), lp1 = at(-0.75, Z1), lp2 = at(-0.75, Z2);
  return (
    <ParallelFrame br1={[T.sw(sw1), T.lamp(lp1)]} br2={[T.sw(sw2), T.lamp(lp2)]} i={(io) => i1(io) + i2(io)} i1={i1} i2={i2}>
      <Switch p={sw1} id="s1" closed={(io) => sel !== 2 && circ(io).on} tag="S₁" />
      <Switch p={sw2} id="s2" closed={(io) => sel !== 1 && circ(io).on} tag="S₂" />
      <Lamp p={lp1} level={lvl(i1, (io) => R(io)[0])} tag="L1" />
      <Lamp p={lp2} level={lvl(i2, (io) => R(io)[1])} tag="L2" />
      <IoLabel p={[0, 1.7, -0.7]} size={0.24} get={() => (sel === 0 ? '支路开关均闭合' : sel === 1 ? '仅支路1导通（S₂ 断开）' : '仅支路2导通（S₁ 断开）')} />
    </ParallelFrame>
  );
}

/** 用电流表测电流：电流表与灯串联，量程决定刻度与超量程提示 */
export function AmmeterMeasure() {
  const max = useOptIndex('range', 0) === 0 ? 0.6 : 3;
  const R = useParam('resistance', 12);
  const lamp = at(1.0, ZT), am = at(-0.7, ZT);
  return (
    <SeriesFrame top={[T.lamp(lamp), T.meter(am)]}>
      <Lamp p={lamp} level={lvl(total, () => R, 0.8)} tag={`负载 ${R.toFixed(0)} Ω`} />
      <Meter p={am} kind="A" max={max} value={total} tag="电流表" />
      <IoLabel p={[0, 1.6, 0.5]} size={0.23} color={'#183018'} get={(io) => (io.sb('overload', false) ? '⚠ 电流超过所选量程，应改用大量程' : '串联接入，电流从 + 柱流入')} />
    </SeriesFrame>
  );
}

/** 串联电路各处电流：首端、中间、末端三个测点 */
export function SeriesCurrent() {
  const [ra, rb] = [useParam('lamp1', 12), useParam('lamp2', 18)];
  const U = useParam('voltage', 3);
  const max = autoA(U / (ra + rb));
  const l1 = at(1.25, ZT), l2 = at(-1.25, ZT), a2 = at(0, ZT);
  const colA = at(XR, (ZT + ZB) / 2), colC = at(XL, (ZT + ZB) / 2);
  const ta = T.up(colA, 0.6, 0.25), tc = T.down(colC, 0.6, 0.25);
  return (
    <SeriesFrame top={[T.lamp(l1), T.meter(a2), T.lamp(l2)]} right={[ta]} left={[tc]}>
      <Lamp p={l1} level={lvl(total, () => ra)} tag={`L1 ${ra.toFixed(0)}Ω`} />
      <Lamp p={l2} level={lvl(total, () => rb)} tag={`L2 ${rb.toFixed(0)}Ω`} />
      <group position={colA} rotation={[0, Math.PI / 2, 0]}><Meter p={[0, 0, 0]} kind="A" max={max} value={total} plusRight={false} tag="首端" /></group>
      <Meter p={a2} kind="A" max={max} value={total} tag="中间" />
      <group position={colC} rotation={[0, Math.PI / 2, 0]}><Meter p={[0, 0, 0]} kind="A" max={max} value={total} tag="末端" /></group>
      <IoLabel p={[0, 1.6, 0.5]} size={0.23} get={(io) => `三处读数相同：I = ${total(io).toFixed(2)} A`} />
    </SeriesFrame>
  );
}

/** 并联电路干路与支路电流 */
export function ParallelCurrent() {
  const [r1, r2] = [useParam('branch1', 12), useParam('branch2', 18)];
  const U = useParam('voltage', 3);
  const Uv = (io: RigIO) => circ(io).U;
  const i1 = (io: RigIO) => (circ(io).on ? Uv(io) / r1 : 0);
  const i2 = (io: RigIO) => (circ(io).on ? Uv(io) / r2 : 0);
  const it = (io: RigIO) => i1(io) + i2(io);
  const a1 = at(0.95, Z1), l1 = at(-0.85, Z1), a2 = at(0.95, Z2), l2 = at(-0.85, Z2);
  const colT = at(XL, (Z1 + ZBP) / 2);
  return (
    <ParallelFrame br1={[T.meter(a1), T.lamp(l1)]} br2={[T.meter(a2), T.lamp(l2)]} i={it} i1={i1} i2={i2} leftTrunk={[T.down(colT, 0.6, 0.25)]}>
      <Meter p={a1} kind="A" max={autoA(U / r1)} value={i1} tag="支路1" />
      <Lamp p={l1} level={lvl(i1, () => r1)} tag={`L1 ${r1.toFixed(0)}Ω`} />
      <Meter p={a2} kind="A" max={autoA(U / r2)} value={i2} tag="支路2" />
      <Lamp p={l2} level={lvl(i2, () => r2)} tag={`L2 ${r2.toFixed(0)}Ω`} />
      <group position={colT} rotation={[0, Math.PI / 2, 0]}><Meter p={[0, 0, 0]} kind="A" max={autoA(U / r1 + U / r2)} value={it} tag="干路" /></group>
      <IoLabel p={[0.2, 1.7, 0.6]} size={0.23} get={(io) => `I = I₁ + I₂ = ${i1(io).toFixed(2)} + ${i2(io).toFixed(2)} = ${it(io).toFixed(2)} A`} />
    </ParallelFrame>
  );
}

/** 用电压表测电压：电压表并联在灯两端，量程选项决定是否超量程 */
export function VoltMeasure() {
  const max = useOptIndex('range', 0) === 0 ? 3 : 15;
  const lamp = at(0.5, ZT), vm = at(0.5, 0.2);
  const tl = T.lamp(lamp), tv = T.meter(vm);
  const lampV = (io: RigIO) => (circ(io).on ? circ(io).U : 0);
  return (
    <SeriesFrame top={[tl]}>
      <Lamp p={lamp} level={lvl(total, () => 10, 2.2)} tag="灯泡" />
      <Meter p={vm} kind="V" max={max} value={lampV} tag="电压表" digits={1} />
      <Leads pairs={[[tl.in, tv.in], [tl.out, tv.out]]} />
      <IoLabel p={[0, 1.6, 0.9]} size={0.23} get={(io) => (io.ss('circuitType', '') === '超量程' ? '⚠ 电压超过所选量程，应改用 0–15 V' : '电压表与灯泡并联；灯两端电压 ≈ 电源电压')} />
    </SeriesFrame>
  );
}

/** 串联电压规律：V₁、V₂ 分别测两灯，V 测电源两端 */
export function SeriesVoltage() {
  const [r1, r2] = [useParam('resistance1', 12), useParam('resistance2', 18)];
  const U = useParam('sourceVoltage', 6);
  const l1 = at(1.2, ZT), l2 = at(-1.2, ZT);
  const m1 = at(1.2, 0.1), m2 = at(-1.2, 0.1), m0 = at(0, 0.5);
  const t1 = T.lamp(l1), t2 = T.lamp(l2), tb = T.bat(at(-0.55, ZB));
  const v1 = (io: RigIO) => (circ(io).on ? io.s('voltage1', 0) : 0);
  const v2 = (io: RigIO) => (circ(io).on ? io.s('voltage2', 0) : 0);
  const v0 = (io: RigIO) => (circ(io).on ? circ(io).U : 0);
  return (
    <SeriesFrame top={[t1, t2]}>
      <Lamp p={l1} level={lvl(total, () => r1)} tag={`L1 ${r1.toFixed(0)}Ω`} />
      <Lamp p={l2} level={lvl(total, () => r2)} tag={`L2 ${r2.toFixed(0)}Ω`} />
      <Meter p={m1} kind="V" max={autoV(U * r1 / (r1 + r2))} value={v1} tag="V₁" digits={1} />
      <Meter p={m2} kind="V" max={autoV(U * r2 / (r1 + r2))} value={v2} tag="V₂" digits={1} />
      <Meter p={m0} kind="V" max={autoV(U)} value={v0} tag="V" digits={1} />
      <Leads pairs={[[t1.in, T.meter(m1).in], [t1.out, T.meter(m1).out], [t2.in, T.meter(m2).in], [t2.out, T.meter(m2).out]]} h={0.9} />
      <Leads pairs={[[tb.out, T.meter(m0).in], [tb.in, T.meter(m0).out]]} h={1.2} color="#7a4a8a" />
      <IoLabel p={[0, 1.8, 0.6]} size={0.23} get={(io) => `U = U₁ + U₂：${v1(io).toFixed(1)} + ${v2(io).toFixed(1)} = ${v0(io).toFixed(1)} V`} />
    </SeriesFrame>
  );
}

/** 并联电压规律：两支路灯两端电压都等于电源电压 */
export function ParallelVoltage() {
  const [r1, r2] = [useParam('resistance1', 12), useParam('resistance2', 18)];
  const U = useParam('sourceVoltage', 6);
  const Uv = (io: RigIO) => circ(io).U;
  const i1 = (io: RigIO) => (circ(io).on ? Uv(io) / r1 : 0);
  const i2 = (io: RigIO) => (circ(io).on ? Uv(io) / r2 : 0);
  const l1 = at(1.0, Z1), l2 = at(-1.0, Z2);
  const m1 = at(1.0, 0.75), m2 = at(-1.0, 0.75);
  const t1 = T.lamp(l1), t2 = T.lamp(l2);
  const v1 = (io: RigIO) => (circ(io).on ? io.s('voltage1', 0) : 0);
  const v2 = (io: RigIO) => (circ(io).on ? io.s('voltage2', 0) : 0);
  return (
    <ParallelFrame br1={[t1]} br2={[t2]} i={(io) => i1(io) + i2(io)} i1={i1} i2={i2}>
      <Lamp p={l1} level={lvl(i1, () => r1)} tag={`L1 ${r1.toFixed(0)}Ω`} />
      <Lamp p={l2} level={lvl(i2, () => r2)} tag={`L2 ${r2.toFixed(0)}Ω`} />
      <Meter p={m1} kind="V" max={autoV(U)} value={v1} tag="V₁" digits={1} />
      <Meter p={m2} kind="V" max={autoV(U)} value={v2} tag="V₂" digits={1} />
      <Leads pairs={[[t1.in, T.meter(m1).in], [t1.out, T.meter(m1).out]]} h={0.9} />
      <Leads pairs={[[t2.in, T.meter(m2).in], [t2.out, T.meter(m2).out]]} h={1.3} />
      <IoLabel p={[0, 1.7, 0.75]} size={0.23} get={(io) => `U₁ = U₂ = U 电源：${v1(io).toFixed(1)} V = ${v2(io).toFixed(1)} V`} />
    </ParallelFrame>
  );
}

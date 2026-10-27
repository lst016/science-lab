import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, Label, MAT, Rod, V3, col } from '../kit';
import type { ShRigMap } from './sh-types';
import { IoLabel, Dashed } from './parts';
import { RigIO, clamp, useOptIndex, useParam, useRig } from './io';
import { Battery, Lamp, Switch } from './electric-parts';
import { Meter } from './electric-meter';
import { Resistor } from './electric-resist';
import { Board, InkBox, Post, Wire, circ, lampLevel } from './electric-wire';
import { C, Links, T, rev, route, link } from './electric-layout';
import { BX, ParallelFrame, SX, SeriesFrame, XL, XR, Z1, Z2, ZB, ZBP, ZT, at, total } from './electric-frames';

/* 组 C：九年级第一学期电学活动装置。 */

const swOn = (io: RigIO) => io.n('toggle') % 2 === 0;
const topLabel = (get: (io: RigIO) => string) => <IoLabel p={[0, 3.3, 0]} size={0.24} get={get} />;

/* ---------- 验电器 ---------- */

const EX = 1.15, BALL_Y = 1.95, BALL_R = 0.13, HINGE_Y = 1.02, LEAF = 0.55;

function Electroscope({ x, name, angle }: { x: number; name: string; angle: (io: RigIO) => number }) {
  const l = useRef<THREE.Group>(null), r = useRef<THREE.Group>(null);
  useRig((io) => {
    const a = (io.damp(`es-${name}`, angle(io), 5) * Math.PI) / 180 / 2;
    if (l.current) l.current.rotation.z = -a;
    if (r.current) r.current.rotation.z = a;
  });
  const foil = useMemo(() => new THREE.MeshStandardMaterial({ color: col('#f0b830'), emissive: col('#6a4a00'), metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide }), []);
  return (
    <group position={[x, 0, 0]}>
      <InkBox p={[0, 0.06, 0]} s={[1.0, 0.12, 0.8]} m={MAT.darkWood} />
      <Cyl p={[0, 0.17, 0]} r={0.46} h={0.1} m={MAT.darkSteel} />
      <Cyl p={[0, 0.72, 0]} r={0.44} h={1.0} m={MAT.glass} cast={false} />
      <Cyl p={[0, 1.25, 0]} r={0.46} h={0.08} m={MAT.darkSteel} />
      <Cyl p={[0, 1.35, 0]} r={0.12} h={0.14} m={MAT.rubber} />
      <Cyl p={[0, (HINGE_Y + BALL_Y) / 2, 0]} r={0.03} h={BALL_Y - HINGE_Y} m={MAT.steel} />
      <Ball p={[0, BALL_Y, 0]} r={BALL_R} m={MAT.steel} />
      <group ref={l} position={[0, HINGE_Y, 0]}><mesh position={[0, -LEAF / 2, 0.02]} material={foil} renderOrder={3}><boxGeometry args={[0.16, LEAF, 0.01]} /></mesh></group>
      <group ref={r} position={[0, HINGE_Y, 0]}><mesh position={[0, -LEAF / 2, 0.035]} material={foil} renderOrder={3}><boxGeometry args={[0.16, LEAF, 0.01]} /></mesh></group>
      <IoLabel p={[0, 0.06, 0.78]} size={0.21} get={(io) => `验电器 ${name} · 张角 ${angle(io).toFixed(0)}°`} />
    </group>
  );
}

function ElectroscopeTest() {
  const conn = useOptIndex('connector', 2);
  const bar = useRef<THREE.Group>(null);
  useRig((io) => {
    const down = conn !== 0 && io.sb('closed', true) ? io.s('contact', 0) : 0;
    const y = io.damp('es-bar', BALL_Y + BALL_R + 0.05 + (1 - down) * 0.55, 6);
    if (bar.current) bar.current.position.y = y;
  });
  const len = EX * 2 + 0.5;
  return (
    <group>
      <Electroscope x={-EX} name="A" angle={(io) => io.s('angleA', 0)} />
      <Electroscope x={EX} name="B" angle={(io) => io.s('angleB', 0)} />
      {conn !== 0 && (
        <group ref={bar} position={[0, BALL_Y + 0.7, 0]}>
          <Cyl r={0.05} h={len} rot={[0, 0, Math.PI / 2]} m={conn === 1 ? MAT.wood : MAT.steel} />
          {conn === 2 && (
            <group>
              <Box p={[0, 0.2, 0]} s={[0.16, 0.36, 0.09]} m={MAT.darkWood} />
              <Box p={[0, 0.02, 0.06]} s={[0.18, 0.1, 0.03]} m={MAT.darkWood} />
              <Label p={[0.42, 0.42, 0]} text="木夹" size={0.2} />
            </group>
          )}
          <Label p={[-0.75, 0.24, 0]} text={conn === 1 ? '木棒' : '金属棒'} size={0.2} />
        </group>
      )}
      <Cyl p={[-1.95, 0.5, 0.95]} r={0.05} h={0.9} rot={[0, 0, 0.25]} m={MAT.glass} />
      <Label p={[-1.85, 1.15, 0.95]} text="带电体" size={0.2} />
      {topLabel((io) => (conn === 0 ? 'A 带电张开，B 不带电闭合' : conn === 1 ? '木棒连接：A、B 张角不变' : io.s('transfer', 0) > 0.5 ? '金属棒连接：A 变小，B 张开' : '金属棒连接：电荷由 A 转移到 B'))}
    </group>
  );
}

/* ---------- 简单电路 ---------- */

function SimpleBulb() {
  const ok = useOptIndex('wiring', 0) === 0;
  const bat = T.bat(at(BX, ZB)), s = rev(T.sw(at(SX, ZB))), lp = at(0, ZT), tl = T.lamp(lp);
  const pairs = route([bat, s, C(XR, ZB), C(XR, ZT), tl, C(XL, ZT), C(XL, ZB), bat]);
  const gap = pairs[4];
  const live = ok ? pairs : pairs.filter((_, i) => i !== 4);
  const lvl = (io: RigIO) => lampLevel(total(io) ** 2 * 10, 0.9);
  return (
    <group>
      <Board w={4.7} d={3.9} p={[0, 0, 0.1]} />
      <Battery p={at(BX, ZB)} volts={(io) => circ(io).U} />
      <Switch p={at(SX, ZB)} id="main" closed={swOn} tag="开关" />
      <Links pairs={live} cur={total} />
      {!ok && (
        <group>
          <Wire pts={link(gap[0], [gap[0][0] - 0.55, 0.52, ZT])} />
          <Dashed a={[gap[0][0] - 0.6, 0.52, ZT]} b={gap[1]} m={7} />
          <Label p={[-1.15, 0.95, ZT]} text="漏接导线" size={0.2} color="#9a2a1a" />
        </group>
      )}
      <Lamp p={lp} level={lvl} tag="小灯泡" />
      {topLabel((io) => (!ok ? '回路有缺口：灯泡不亮' : circ(io).on ? `闭合回路：灯亮 I = ${total(io).toFixed(2)} A` : '开关断开：灯泡熄灭'))}
    </group>
  );
}

/* ---------- 不同材料导体 ---------- */

const SAMPLE_COL = ['#c06c3e', '#b9a27e', '#8b9097'];

function Sample({ p, s }: { p: V3; s: number }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: col(SAMPLE_COL[s] ?? '#888'), metalness: 0.85, roughness: 0.3 }), [s]);
  const y = 0.32;
  return (
    <group position={p}>
      <InkBox p={[0, 0.05, 0]} s={[1.2, 0.1, 0.5]} m={MAT.darkWood} />
      <Post p={[-0.5, 0.15, 0]} />
      <Post p={[0.5, 0.15, 0]} />
      {s === 0
        ? <Wire pts={[[-0.5, y, 0], [-0.3, y + 0.18, 0], [0.3, y + 0.18, 0], [0.5, y, 0]]} />
        : <Rod a={[-0.5, y, 0]} b={[0.5, y, 0]} r={0.018} m={m} />}
      <Label p={[0.5, 0.2, 0.36]} text="M" size={0.2} />
      <Label p={[-0.5, 0.2, 0.36]} text="N" size={0.2} />
      <IoLabel p={[0, 0.8, 0]} size={0.21} get={() => ['导线直连', '康铜丝', '镍铬合金丝'][s] ?? ''} />
    </group>
  );
}

function MaterialCompare() {
  const s = useOptIndex('sample', 1);
  const lp = at(1.25, ZT), sp = at(0, ZT), am = at(-1.25, ZT);
  const ts = { in: [sp[0] + 0.5, 0.46, sp[2]] as V3, out: [sp[0] - 0.5, 0.46, sp[2]] as V3 };
  return (
    <SeriesFrame top={[T.lamp(lp), ts, T.meter(am)]} swOn={(io) => circ(io).on}>
      <Lamp p={lp} level={(io) => (circ(io).on ? io.s('lampLevel', 0) : 0)} tag="小灯泡" />
      <Sample p={sp} s={s} />
      <Meter p={am} kind="A" max={0.6} value={total} tag="电流表" />
      {topLabel((io) => `R丝 ≈ ${io.s('wireR', 0).toFixed(1)} Ω（示例），I = ${total(io).toFixed(3)} A`)}
    </SeriesFrame>
  );
}

/* ---------- 串联等效电阻 ---------- */

function SeriesEquivalent() {
  const swap = useOptIndex('mode', 0) === 1;
  const R = useParam('replacement', 10);
  const am = at(-1.2, ZT);
  const r1 = at(1.2, ZT), r2 = at(0, ZT), rr = at(0.6, ZT);
  const label = (io: RigIO) => {
    const I = total(io), I0 = io.s('referenceCurrent', 0);
    if (!circ(io).on) return '开关断开：电流为 0';
    if (!swap) return `R₁、R₂ 串联：I = ${I.toFixed(3)} A`;
    return `替换前 ${I0.toFixed(3)} A，替换后 ${I.toFixed(3)} A${io.sb('matched', false) ? ' → 等效' : ''}`;
  };
  return (
    <SeriesFrame top={swap ? [T.res(rr), T.meter(am)] : [T.res(r1), T.res(r2), T.meter(am)]}>
      {swap
        ? <Resistor p={rr} ohms={() => R} tag="R" />
        : <group><Resistor p={r1} ohms={() => 5} tag="R₁" /><Resistor p={r2} ohms={() => 15} tag="R₂" /></group>}
      <Meter p={am} kind="A" max={0.6} value={total} tag="电流表" digits={3} />
      {topLabel(label)}
    </SeriesFrame>
  );
}

/* ---------- 并联等效电阻 ---------- */

function ParallelEquivalent() {
  const swap = useOptIndex('mode', 0) === 1;
  const R = useParam('replacement', 6);
  const label = (io: RigIO) => {
    const I = total(io), I0 = io.s('referenceCurrent', 0);
    if (!circ(io).on) return '开关断开：电流为 0';
    if (!swap) return `R₁ ∥ R₂：干路 I = ${I.toFixed(2)} A，计算 R = 6 Ω`;
    return `替换前 ${I0.toFixed(2)} A，替换后 ${I.toFixed(2)} A${io.sb('matched', false) ? ' → 等效' : ''}`;
  };
  if (swap) {
    const rr = at(0.6, ZT), am = at(-1.2, ZT);
    return (
      <SeriesFrame top={[T.res(rr), T.meter(am)]}>
        <Resistor p={rr} ohms={() => R} tag="R" />
        <Meter p={am} kind="A" max={3} value={total} tag="电流表" />
        {topLabel(label)}
      </SeriesFrame>
    );
  }
  const on = (io: RigIO) => circ(io).on;
  const i1 = (io: RigIO) => (on(io) ? io.s('current1', 0) : 0);
  const i2 = (io: RigIO) => (on(io) ? io.s('current2', 0) : 0);
  const p1 = at(0.3, Z1), p2 = at(0.3, Z2);
  const colT = at(XL, (Z1 + ZBP) / 2);
  return (
    <ParallelFrame br1={[T.res(p1)]} br2={[T.res(p2)]} i={total} i1={i1} i2={i2} leftTrunk={[T.down(colT, 0.6, 0.25)]}>
      <Resistor p={p1} ohms={() => 10} tag="R₁" />
      <Resistor p={p2} ohms={() => 15} tag="R₂" />
      <group position={colT} rotation={[0, Math.PI / 2, 0]}><Meter p={[0, 0, 0]} kind="A" max={3} value={total} tag="电流表" /></group>
      {topLabel(label)}
    </ParallelFrame>
  );
}

/* ---------- 发光二极管 ---------- */

function Led({ p, forward }: { p: V3; forward: boolean }) {
  const dome = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const L = circ(io).on ? clamp(io.s('ledLevel', 0), 0, 1.5) : 0;
    if (dome.current) dome.current.emissiveIntensity = L * 2.2;
    if (halo.current) { halo.current.visible = L > 0.02; halo.current.scale.setScalar(0.6 + L * 0.8); (halo.current.material as THREE.MeshBasicMaterial).opacity = clamp(L * 0.35, 0, 0.5); }
  });
  const long = forward ? 0.36 : -0.36; // 长脚（正极）一侧
  return (
    <group position={p}>
      <InkBox p={[0, 0.08, 0]} s={[0.9, 0.16, 0.56]} m={MAT.wood} />
      <Post p={[-0.36, 0.2, 0]} />
      <Post p={[0.36, 0.2, 0]} />
      <Rod a={[long, 0.3, 0]} b={[long * 0.15, 0.62, 0]} r={0.012} m={MAT.steel} />
      <Rod a={[-long, 0.3, 0]} b={[-long * 0.15, 0.52, 0]} r={0.012} m={MAT.steel} />
      <Rod a={[-long * 0.15, 0.52, 0]} b={[-long * 0.15, 0.62, 0]} r={0.012} m={MAT.steel} />
      <Cyl p={[0, 0.66, 0]} r={0.12} h={0.04} m={MAT.red} />
      <Cyl p={[0, 0.76, 0]} r={0.13} h={0.18} cast={false} m={MAT.red} />
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.13, 18, 12]} />
        <meshStandardMaterial ref={dome} color="#e23a2a" emissive="#ff3a20" emissiveIntensity={0} transparent opacity={0.9} />
      </mesh>
      <mesh ref={halo} position={[0, 0.8, 0]} visible={false}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshBasicMaterial color="#ff5a3a" transparent opacity={0} depthWrite={false} />
      </mesh>
      <Label p={[long, 0.42, 0.42]} text="长脚" size={0.17} />
      <IoLabel p={[0, 1.2, 0]} size={0.22} get={() => (forward ? 'LED（正向）' : 'LED（反向）')} />
    </group>
  );
}

function LedCircuit() {
  const forward = useOptIndex('polarity', 0) === 0;
  const R = useParam('resistance', 100);
  const lp = at(1.25, ZT), rp = at(0, ZT), am = at(-1.25, ZT);
  const mA = (io: RigIO) => total(io) * 1000;
  return (
    <SeriesFrame top={[T.lamp(lp), T.res(rp), T.meter(am)]}>
      <Led p={lp} forward={forward} />
      <Resistor p={rp} ohms={() => R} tag="限流 R" />
      <Meter p={am} kind="A" max={30} value={mA} unit="mA" dialText="mA" digits={1} tag="电流" />
      {topLabel((io) => (!circ(io).on ? '开关断开：LED 熄灭' : !forward ? '反向连接：几乎无电流，LED 不亮' : io.sb('overload', false) ? '⚠ 电流过大：应加大限流电阻' : total(io) > 0 ? `正向导通：I = ${mA(io).toFixed(1)} mA` : '电压低于导通电压：LED 不亮'))}
    </SeriesFrame>
  );
}

/** 上海版独有活动装置（组 C），按 sceneVariant 索引。 */
export const SH_RIGS_C: ShRigMap = {
  'sh-electroscope-conductor-test': () => <ElectroscopeTest />,
  'sh-simple-bulb-circuit': () => <SimpleBulb />,
  'sh-conductor-material-comparison': () => <MaterialCompare />,
  'sh-series-equivalent-resistance': () => <SeriesEquivalent />,
  'sh-parallel-equivalent-resistance': () => <ParallelEquivalent />,
  'sh-led-circuit': () => <LedCircuit />,
};

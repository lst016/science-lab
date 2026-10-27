import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, Label, MAT, Spring, Vessel, vesselProfile, type V3 } from '../kit';
import { Cord, IBox, Liquid, Mv, Slotted, Stand } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp, lerp, useRig, type RigIO } from './io';
import type { ShRigMap } from './sh-types';

const SKIN = new THREE.MeshStandardMaterial({ color: '#e9b48f', roughness: 0.7 });
const BALLOON = new THREE.MeshPhysicalMaterial({ color: '#e0675a', transparent: true, opacity: 0.82, roughness: 0.3, clearcoat: 0.6 });
const FLASK_WATER = new THREE.MeshPhysicalMaterial({ color: '#7fc3e0', transparent: true, opacity: 0.55, roughness: 0.15, depthWrite: false });
const TUBE_GLASS = new THREE.MeshStandardMaterial({ color: '#e6f4f7', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');
/** run 动作后经过的秒数；未开始为 0。 */
const runT = (io: RigIO) => (io.n('run') > 0 ? Math.max(0, io.since('run')) : 0);
const arr = (io: RigIO, key: string): number[] | null => { const v = io.o?.state[key]; return Array.isArray(v) ? v : null; };

/** 力的箭头：默认沿 +y，len(io) 为带符号长度（负值反向）；rotZ 改变基准方向。 */
function Arrow({ p = [0, 0, 0], len, color = '#c8402f', rotZ = 0 }: { p?: V3; len: (io: RigIO) => number; color?: string; rotZ?: number }) {
  const grp = useRef<THREE.Group>(null), shaft = useRef<THREE.Mesh>(null), head = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5 }), [color]);
  useRig((io) => {
    if (!grp.current || !shaft.current || !head.current) return;
    const L = len(io), a = Math.abs(L), hl = Math.min(0.14, a * 0.5);
    grp.current.visible = a > 0.02;
    grp.current.rotation.z = rotZ + (L < 0 ? Math.PI : 0);
    shaft.current.scale.y = Math.max(1e-3, a - hl); shaft.current.position.y = (a - hl) / 2;
    head.current.scale.y = Math.max(1e-3, hl); head.current.position.y = a - hl / 2;
  });
  return <group ref={grp} position={p}>
    <mesh ref={shaft} material={mat}><cylinderGeometry args={[0.025, 0.025, 1, 10]} /></mesh>
    <mesh ref={head} material={mat}><coneGeometry args={[0.065, 1, 14]} /></mesh>
  </group>;
}

/* ---------- 用“拃”估测课桌长度 ---------- */
const SPAN_S = 0.025, DESK_X0 = -1.9, DESK_Y = 1.2;
const spanStep = (io: RigIO) => {
  const span = io.p('span', 18), desk = io.p('desk', 120), full = Math.floor(desk / span + 1e-9);
  return { span, desk, full, k: io.n('run') > 0 ? Math.min(full, Math.floor(runT(io) / 0.6)) : 0 };
};
function SpanEstimate() {
  return <group>
    <Mv p={[DESK_X0, DESK_Y, 0]} upd={(g, io) => { g.scale.x = io.p('desk', 120) * SPAN_S; }}>
      <Box p={[0.5, 0, 0]} s={[1, 0.08, 1]} m={MAT.wood} />
    </Mv>
    {[-0.4, 0.4].map((z) => <Box key={'l' + z} p={[DESK_X0 + 0.08, DESK_Y / 2, z]} s={[0.07, DESK_Y, 0.07]} m={MAT.darkWood} />)}
    <Mv upd={(g, io) => { g.position.x = DESK_X0 + io.p('desk', 120) * SPAN_S - 0.08; }}>
      {[-0.4, 0.4].map((z) => <Box key={'r' + z} p={[0, DESK_Y / 2, z]} s={[0.07, DESK_Y, 0.07]} m={MAT.darkWood} />)}
    </Mv>
    {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
      <Mv key={i} upd={(g, io) => { const s = spanStep(io); g.visible = i <= s.k; g.position.set(DESK_X0 + i * s.span * SPAN_S, DESK_Y + 0.05, 0.38); }}>
        <Box s={[0.03, 0.02, 0.14]} m={MAT.red} cast={false} />
      </Mv>
    ))}
    <Mv upd={(g, io) => { const s = spanStep(io); g.position.set(DESK_X0 + Math.min(s.k, s.full) * s.span * SPAN_S, DESK_Y + 0.05, 0.25); g.scale.x = s.span * SPAN_S; }}>
      <Box p={[0.5, 0.1, -0.16]} s={[0.5, 0.16, 0.34]} m={SKIN} />
      <Box p={[0.14, 0.05, 0]} s={[0.28, 0.09, 0.11]} m={SKIN} />
      <Box p={[0.78, 0.05, 0]} s={[0.44, 0.09, 0.11]} m={SKIN} />
    </Mv>
    <Label p={[DESK_X0 + 0.55, 0.65, 0.6]} text="课桌" size={0.22} />
    <Label p={[DESK_X0 + 0.5, DESK_Y + 0.5, 0.3]} text="1 拃" size={0.2} />
    <IoLabel p={[0, 3.2, 0]} size={0.26} get={(io) => { const s = spanStep(io); return io.n('run') > 0 ? '已量 ' + s.k + ' 拃 · 共约 ' + f(s.desk / s.span) + ' 拃' : '1 拃 = ' + f(s.span) + ' cm · 桌长 ' + f(s.desk, 0) + ' cm'; }} />
  </group>;
}

/* ---------- 拉动物块观察匀速直线运动（俯视记录点） ---------- */
const TR_X0 = -1.8, TR_K = 0.04, TR_Z = 0.12, TR_Y = 0.24;
const tracePos = (io: RigIO, i: number): [number, number] => {
  const xs = arr(io, 'xs'), ys = arr(io, 'ys');
  return [TR_X0 + (xs?.[i] ?? 0) * TR_K, -(ys?.[i] ?? 0) * TR_Z];
};
const traceF = (io: RigIO) => (io.n('run') > 0 ? clamp(runT(io) / Math.max(0.2, io.p('interval', 0.5)), 0, 8) : 0);
const blockPos = (io: RigIO): [number, number] => {
  const fr = traceF(io), i = Math.min(7, Math.floor(fr)), u = fr - i;
  const a = tracePos(io, i), b = tracePos(io, i + 1);
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
};
function UniformTrace() {
  return <group>
    <Box p={[0, 0.1, 0]} s={[4.6, 0.2, 1.6]} m={MAT.wood} />
    <Box p={[0, 0.21, 0]} s={[4.2, 0.02, 1.2]} m={MAT.white} />
    <Box p={[-0.1, 0.225, 0]} s={[4.0, 0.01, 0.02]} m={MAT.black} cast={false} />
    {Array.from({ length: 9 }, (_, i) => i).map((i) => (
      <Mv key={i} upd={(g, io) => { const [x, z] = tracePos(io, i); g.position.set(x, TR_Y, z); g.visible = io.n('run') > 0 && traceF(io) >= i; }}>
        <Ball r={0.035} m={MAT.red} />
      </Mv>
    ))}
    {[[0, 'A'], [4, 'E'], [8, 'I']].map(([i, t]) => (
      <Mv key={t} upd={(g, io) => { const [x] = tracePos(io, i as number); g.position.set(x, 0.3, 0.42); }}>
        <Label text={t as string} size={0.2} />
      </Mv>
    ))}
    <Mv upd={(g, io) => { const [x, z] = blockPos(io); g.position.set(x, 0.22, z); }}>
      <IBox p={[0, 0.12, 0]} s={[0.3, 0.22, 0.3]} m={MAT.blue} />
      <Ball p={[0, 0.25, 0]} r={0.04} m={MAT.red} />
    </Mv>
    <Cord ends={(io) => { const [x, z] = blockPos(io); const motor = io.idx('pull', 0) === 1; return [[x + 0.15, 0.32, z], motor ? [1.95, 0.4, 0] : [x + 0.8, 0.36, z]]; }} />
    <Mv upd={(g, io) => { const [x, z] = blockPos(io); g.visible = io.idx('pull', 0) !== 1; g.position.set(x + 0.9, 0.36, z); }}>
      <Box s={[0.22, 0.14, 0.3]} m={SKIN} />
      <Box p={[0.1, 0.12, 0]} s={[0.3, 0.12, 0.34]} m={SKIN} />
    </Mv>
    <Mv upd={(g, io) => { g.visible = io.idx('pull', 0) === 1; }}>
      <IBox p={[2.12, 0.42, 0]} s={[0.34, 0.36, 0.42]} m={MAT.darkSteel} />
      <Cyl p={[1.92, 0.4, 0]} r={0.06} h={0.14} rot={[Math.PI / 2, 0, 0]} m={MAT.brass} />
      <Label p={[2.05, 0.85, 0]} text="电动机" size={0.2} />
    </Mv>
    <Label p={[1.3, 0.32, -0.42]} text="参考线" size={0.2} />
    <IoLabel p={[0, 3.2, 0]} size={0.26} get={(io) => '记录间隔 ' + f(io.p('interval', 0.5)) + ' s · 已记 ' + (io.n('run') > 0 ? Math.floor(traceF(io)) + 1 : 0) + ' 点'} />
  </group>;
}

/* ---------- 电动机提升钩码测速度 ---------- */
const ML_O = 0.7, ML_D = 0.3, ML_START = 0.6, ML_MAX = 2.3, ML_U = ML_D / 10;
const liftTop = (io: RigIO) => (io.n('run') > 0 ? Math.min(ML_MAX, ML_START + io.s('speed', 8) * ML_U * runT(io)) : ML_START);
function MotorLift() {
  return <group>
    <Stand p={[-1.2, 0, 0]} h={3.0} reach={1.3} />
    <IBox p={[-0.05, 2.78, 0]} s={[0.42, 0.36, 0.36]} m={MAT.blue} />
    <Cyl p={[0, 2.5, 0]} r={0.1} h={0.3} rot={[Math.PI / 2, 0, 0]} m={MAT.brass} />
    <Cord ends={(io) => [[0.1, 2.5, 0], [0.1, liftTop(io) + 0.02, 0]]} />
    <Mv upd={(g, io) => { g.position.set(0.1, liftTop(io), 0); }}>
      <mesh position={[0, -0.04, 0]} material={MAT.steel}><torusGeometry args={[0.04, 0.012, 8, 16]} /></mesh>
      <Cyl p={[0, -0.11, 0]} r={0.012} h={0.1} m={MAT.steel} />
      {[0, 1, 2, 3].map((i) => (
        <Mv key={i} upd={(g, io) => { g.visible = i < clamp(Math.round(io.p('mass', 100) / 50), 1, 4); }}>
          <Slotted p={[0, -0.24 - i * 0.09, 0]} r={0.16} h={0.085} />
        </Mv>
      ))}
    </Mv>
    <IBox p={[0.45, 1.5, -0.1]} s={[0.16, 2.0, 0.03]} m={MAT.card} />
    {['O', 'A', 'B', 'C', 'D', 'E'].map((t, i) => <group key={t}>
      <Box p={[0.45, ML_O + i * ML_D, -0.07]} s={[0.2, 0.02, 0.02]} m={MAT.red} cast={false} />
      <Label p={[0.66, ML_O + i * ML_D, 0]} text={t} size={0.17} />
    </group>)}
    <Label p={[0.6, 3.05, 0]} text="电动机" size={0.2} />
    <Label p={[0.95, 0.45, 0]} text="刻度尺" size={0.2} />
    <Label p={[-0.45, 0.25, 0.35]} text="钩码" size={0.2} />
    <IoLabel p={[0, 3.4, 0]} size={0.24} get={(io) => {
      const v = io.s('speed', 8), top = liftTop(io);
      if (io.n('run') === 0) return 'v ≈ ' + f(v / 100, 3) + ' m/s · 钩码 ' + f(io.p('mass', 100), 0) + ' g';
      const tO = (ML_O - ML_START) / (v * ML_U), el = clamp(runT(io) - tO, 0, 50 / v), s = clamp((top - ML_O) / ML_U, 0, 50);
      return '秒表 ' + f(el, 2) + ' s · s = ' + f(s, 0) + ' cm';
    }} />
  </group>;
}

/* ---------- 装水气球挂在弹簧下 ---------- */
const WB_TOP = 2.96, WB_L0 = 0.6, WB_X = 0.4, WB_BOARD = 0.34, WB_R = 0.06;
const balloon = (io: RigIO) => {
  const V = io.p('water', 250), k = io.p('k', 40), x = (V / 1000) * 9.8 / k * 100;
  const r = Math.cbrt((3 * V) / (4 * Math.PI)) * WB_R, h = io.damp('hang', io.n('run') > 0 ? 1 : 0, 3);
  const len = WB_L0 + x * 0.03 * h, hook = WB_TOP - len;
  const y = lerp(WB_BOARD + r * 0.85, hook - 0.05 - r * 1.2, h);
  return { len, hook, r, y, h };
};
function WaterBalloon() {
  return <group>
    <Stand p={[-1.7, 0, 0]} h={3.0} reach={2.4} />
    <IBox p={[WB_X + 0.4, WB_BOARD - 0.04, 0]} s={[1.3, 0.08, 0.9]} m={MAT.wood} />
    <Box p={[WB_X + 0.4, (WB_BOARD - 0.08) / 2, 0]} s={[0.9, WB_BOARD - 0.08, 0.6]} m={MAT.darkWood} />
    <group position={[-0.5, WB_TOP, 0]}>
      <group scale={[1, WB_L0, 1]}><Spring len={1} r={0.09} coils={12} wire={0.014} /></group>
      <mesh position={[0, -WB_L0 - 0.04, 0]} material={MAT.steel}><torusGeometry args={[0.04, 0.012, 8, 16]} /></mesh>
    </group>
    <Mv p={[WB_X, WB_TOP, 0]} upd={(g, io) => { g.scale.y = balloon(io).len; }}>
      <Spring len={1} r={0.09} coils={12} wire={0.014} />
    </Mv>
    <Mv upd={(g, io) => { g.position.set(WB_X, balloon(io).hook - 0.04, 0); }}>
      <mesh material={MAT.steel}><torusGeometry args={[0.04, 0.012, 8, 16]} /></mesh>
    </Mv>
    <Mv upd={(g, io) => { const b = balloon(io); const sx = lerp(1.1, 0.9, b.h), sy = lerp(0.85, 1.2, b.h); g.position.set(WB_X, b.y, 0); g.scale.set(b.r * sx, b.r * sy, b.r * sx); }}>
      <mesh material={BALLOON} castShadow><sphereGeometry args={[1, 28, 20]} /></mesh>
      <Cyl p={[0, 1.08, 0]} r={0.12} rt={0.06} h={0.22} m={MAT.red} />
    </Mv>
    <Label p={[-0.5, 2.05, 0.3]} text="对照弹簧" size={0.2} />
    <Label p={[1.35, 1.25, 0.3]} text="装水气球" size={0.2} />
    <Label p={[1.45, 0.45, 0.45]} text="木板" size={0.2} />
    <IoLabel p={[0, 3.35, 0]} size={0.24} get={(io) => 'G = ' + f(io.s('weight', 2.45), 2) + ' N · 伸长 ' + f(io.s('stretch', 0)) + ' cm'} />
  </group>;
}

/* ---------- 用手压锥形瓶观察微小形变 ---------- */
const FK_R = 0.7, FK_H = 1.4;
function FlaskWater() {
  const geo = useMemo(() => {
    const r = FK_R * 0.95, h = FK_H * 0.98;
    const pts = vesselProfile('flask', r, h).slice(0, 5).map(([x, y]) => new THREE.Vector2(x, y));
    pts.push(new THREE.Vector2(0, h));
    return new THREE.LatheGeometry(pts, 32).translate(0, 0.02, 0);
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={FLASK_WATER} renderOrder={1} />;
}
const press = (io: RigIO) => io.damp('press', io.sb('pressed', false) ? 1 : 0, 5);
function FlaskPress() {
  const handY = 0.35, rAt = FK_R * (1 - 0.66 * ((handY - 0.04 * FK_H) / (0.74 * FK_H)));
  return <group>
    <Mv upd={(g, io) => { const pr = press(io); g.scale.set(1 - 0.03 * pr, 1 + 0.01 * pr, 1 - 0.03 * pr); }}>
      <Vessel kind="flask" r={FK_R} h={FK_H} />
      <FlaskWater />
    </Mv>
    <Cyl p={[0, FK_H + 0.04, 0]} r={0.26} rt={0.28} h={0.2} m={MAT.rubber} />
    <mesh position={[0, FK_H + 0.8, 0]} material={TUBE_GLASS} renderOrder={2}><cylinderGeometry args={[0.05, 0.05, 1.5, 16, 1, true]} /></mesh>
    <Liquid p={[0, FK_H - 0.1, 0]} w={0.03} round level={(io) => 0.35 + io.damp('rise', io.sb('pressed', false) ? clamp(Math.sqrt(io.s('riseMax', 30)) * 0.25, 0.05, 1.15) : 0, 4)} />
    <Cyl p={[0, FK_H + 0.25, 0]} r={0.06} h={0.02} m={MAT.red} cast={false} />
    {[-1, 1].map((s) => <group key={s}>
      <Mv upd={(g, io) => { g.position.set(s * (rAt + 0.12 + 0.1 * (1 - press(io))), handY, 0); }}>
        <Box s={[0.2, 0.34, 0.42]} m={SKIN} />
      </Mv>
      <Arrow p={[s * (rAt + 0.75), handY + 0.3, 0]} rotZ={s * Math.PI / 2} len={(io) => press(io) * 0.4} />
    </group>)}
    <Label p={[-1.2, 0.3, 0.7]} text="锥形瓶" size={0.22} />
    <Label p={[0.65, FK_H + 0.08, 0]} text="橡皮塞" size={0.2} />
    <Label p={[0.6, FK_H + 1.3, 0]} text="细玻璃管" size={0.2} />
    <IoLabel p={[0, 3.35, 0]} size={0.24} get={(io) => '压力 ' + f(io.s('force', 0), 0) + ' N · 水面升 ' + f(io.s('rise', 0)) + ' mm'} />
  </group>;
}

/* ---------- 用手指压缩弹簧 ---------- */
const PS_BASE = 0.3, PS_L0 = 1.0, PS_U = 0.22;
const psLen = (io: RigIO) => PS_L0 - io.damp('c', io.s('compress', 0), 5) * PS_U;
function PressSpring() {
  return <group>
    <IBox p={[0, PS_BASE / 2, 0]} s={[1.6, PS_BASE, 1.0]} m={MAT.darkWood} />
    <Mv upd={(g, io) => { const L = psLen(io); g.position.y = PS_BASE + L; g.scale.y = L; }}>
      <Spring len={1} r={0.25} coils={10} wire={0.03} />
    </Mv>
    <Mv upd={(g, io) => { g.position.y = PS_BASE + psLen(io) + 0.03; }}>
      <Cyl r={0.3} h={0.06} m={MAT.steel} />
    </Mv>
    <Mv upd={(g, io) => { g.position.y = PS_BASE + psLen(io) + 0.06 + io.damp('lift', io.sb('pressing', false) ? 0 : 0.35, 5); }}>
      <Ball p={[0, 0.1, 0]} r={0.1} m={SKIN} />
      <Cyl p={[0, 0.45, 0]} r={0.1} h={0.7} m={SKIN} />
      <Box p={[0.15, 1.0, 0]} s={[0.6, 0.45, 0.4]} m={SKIN} />
    </Mv>
    <Mv upd={(g, io) => { g.position.set(0.6, PS_BASE + psLen(io) + 0.06, 0); }}>
      <Arrow len={(io) => clamp(io.s('elastic', 0) / 10, 0, 1) * 0.9} />
    </Mv>
    <IBox p={[-0.6, PS_BASE + PS_L0 / 2, -0.1]} s={[0.1, PS_L0, 0.04]} m={MAT.card} />
    <Box p={[-0.6, PS_BASE + PS_L0, -0.07]} s={[0.16, 0.02, 0.02]} m={MAT.red} cast={false} />
    <Label p={[-0.95, PS_BASE + PS_L0, 0]} text="原长" size={0.18} />
    <Label p={[0.8, 0.55, 0.4]} text="弹簧" size={0.2} />
    <Label p={[-0.6, 2.4, 0]} text="手指" size={0.2} />
    <IoLabel p={[0, 3.35, 0]} size={0.24} get={(io) => 'x = ' + f(io.s('compress', 0), 2) + ' cm · F弹 = ' + f(io.s('elastic', 0), 2) + ' N'} />
  </group>;
}

/* ---------- 重垂线 ---------- */
const PL_H: V3 = [-1.4, 0.25, 0], PL_HOOK = [0.6, 1.68], PL_LEN = 1.0;
const plHook = (io: RigIO): V3 => { const a = (io.p('tilt', 20) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [PL_H[0] + PL_HOOK[0] * c - PL_HOOK[1] * s, PL_H[1] + PL_HOOK[0] * s + PL_HOOK[1] * c, 0]; };
const plBob = (io: RigIO): V3 => {
  const t = runT(io), phi = io.n('run') > 0 ? 0.35 * Math.exp(-0.8 * t) * Math.cos(3 * t) : 0.35;
  const h = plHook(io);
  return [h[0] + PL_LEN * Math.sin(phi), h[1] - PL_LEN * Math.cos(phi), 0];
};
const plEnd = (io: RigIO): V3 => { const a = (io.p('tilt', 20) * Math.PI) / 180; return [PL_H[0] + 2.75 * Math.cos(a), PL_H[1] + 2.75 * Math.sin(a), 0]; };
function PlumbLine() {
  return <group>
    <IBox p={[0, 0.1, 0]} s={[3.8, 0.2, 1.2]} m={MAT.darkWood} />
    <Cyl p={PL_H} r={0.06} h={0.9} rot={[Math.PI / 2, 0, 0]} m={MAT.steel} />
    <Mv p={PL_H} upd={(g, io) => { g.rotation.z = (io.p('tilt', 20) * Math.PI) / 180; }}>
      <IBox p={[1.4, 0.04, 0]} s={[2.8, 0.08, 0.8]} m={MAT.wood} />
      <Cyl p={[1.0, 0.88, 0]} r={0.04} h={1.6} m={MAT.steel} />
      <Box p={[0.8, PL_HOOK[1], 0]} s={[0.45, 0.05, 0.05]} m={MAT.steel} />
      <Label p={[2.2, 0.3, 0.45]} text="斜面" size={0.2} />
    </Mv>
    <Cord ends={(io) => { const e = plEnd(io); return [[e[0], 0.2, 0], [e[0], Math.max(0.22, e[1] - 0.04), 0]]; }} r={0.03} color="#5c6168" />
    <Cord ends={(io) => [plHook(io), plBob(io)]} r={0.012} color="#2b2622" />
    <Mv upd={(g, io) => { const b = plBob(io); g.position.set(b[0], b[1], b[2]); }}>
      <Cyl p={[0, -0.11, 0]} r={0.01} rt={0.12} h={0.22} m={MAT.brass} />
      <Label p={[-0.5, 0.35, 0.2]} text="重垂线" size={0.2} />
    </Mv>
    <Label p={[1.3, 0.35, 0.7]} text="水平底座" size={0.2} />
    <IoLabel p={[0, 3.35, 0]} size={0.24} get={(io) => '倾角 ' + f(io.p('tilt', 20), 0) + '° · 绳⊥水平面 · 与斜面 ' + f(90 - io.p('tilt', 20), 0) + '°'} />
  </group>;
}

/* ---------- 力传感器研究二力平衡 ---------- */
const sOff = (io: RigIO) => { const d = io.s('dir', 0); return d === 0 ? 0 : d > 0 ? clamp(runT(io) * 0.12, 0, 0.4) : -clamp(runT(io) * 0.12, 0, 0.4); };
const sWeightH = (io: RigIO) => 0.1 + (io.p('mass', 200) / 500) * 0.5;
const sArrow = (io: RigIO) => 0.25 + clamp(io.s('G', 1.96) / 4.9, 0, 1) * 0.4;
function SensorBalance() {
  return <group>
    <Stand p={[-1.3, 0, 0]} h={3.2} reach={1.3} />
    <IBox p={[-0.1, 2.95, 0]} s={[0.4, 0.4, 0.4]} m={MAT.blue} />
    <Cyl p={[-0.1, 2.62, 0]} r={0.1} h={0.3} rot={[Math.PI / 2, 0, 0]} m={MAT.brass} />
    <Cord ends={(io) => [[0, 2.62, 0], [0, 1.95 + sOff(io), 0]]} />
    <Mv upd={(g, io) => { g.position.y = sOff(io); }}>
      <mesh position={[0, 1.9, 0]} material={MAT.steel}><torusGeometry args={[0.05, 0.012, 8, 16]} /></mesh>
      <IBox p={[0, 1.7, 0]} s={[0.22, 0.3, 0.18]} m={MAT.blue} />
      <Cyl p={[0, 1.47, 0]} r={0.012} h={0.16} m={MAT.steel} />
      <Mv p={[0, 1.38, 0]} upd={(g, io) => { g.scale.y = sWeightH(io); }}>
        <Cyl p={[0, -0.5, 0]} r={0.15} h={1} m={MAT.brass} />
      </Mv>
      <Mv upd={(g, io) => { g.position.set(0.32, 1.38 - sWeightH(io) / 2, 0); }}>
        <Arrow len={sArrow} color="#c8402f" />
        <Arrow len={(io) => -sArrow(io)} color="#3f6ea6" />
      </Mv>
      <Label p={[-0.6, 1.7, 0]} text="力传感器" size={0.2} />
      <Label p={[-0.45, 1.05, 0.2]} text="钩码" size={0.2} />
    </Mv>
    <Cord ends={(io) => [[0.11, 1.7 + sOff(io), 0], [1.15, 0.5, 0]]} r={0.012} color="#24252a" />
    <IBox p={[1.55, 0.3, 0]} s={[0.8, 0.5, 0.3]} m={MAT.black} />
    <IoLabel p={[1.55, 0.32, 0.18]} size={0.2} color="#7cf2a8" get={(io) => f(io.s('F', 1.96), 2) + ' N'} />
    <Label p={[1.55, 0.8, 0]} text="数据显示" size={0.2} />
    <Label p={[0.55, 2.95, 0]} text="电动机" size={0.2} />
    <IoLabel p={[0.6, 3.45, 0]} size={0.24} get={(io) => 'F = ' + f(io.s('F', 1.96), 2) + ' N ↑ · G = ' + f(io.s('G', 1.96), 2) + ' N ↓ · 合力 0'} />
  </group>;
}

/** 上海版独有活动装置（组 A1），按 sceneVariant 索引。 */
export const SH_RIGS_A1: ShRigMap = {
  'sh-span-estimate': () => <SpanEstimate />,
  'sh-uniform-motion-trace': () => <UniformTrace />,
  'sh-motor-lift-speed': () => <MotorLift />,
  'sh-water-balloon-spring': () => <WaterBalloon />,
  'sh-flask-micro-deformation': () => <FlaskPress />,
  'sh-press-spring': () => <PressSpring />,
  'sh-plumb-line': () => <PlumbLine />,
  'sh-sensor-two-force-balance': () => <SensorBalance />,
};

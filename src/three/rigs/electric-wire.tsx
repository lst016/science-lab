import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, MAT, Tube, V3, col } from '../kit';
import { RigIO, clamp, useRig } from './io';

/* 电学共用：导线、电荷流动画、电路状态读取。
   板面坐标：x 向右，z 向前（朝读者），y 向上；元件放在 y=BOARD_TOP 的木板上。 */

export const BOARD_TOP = 0.14;
export const WIRE_Y = 0.52;
export const INK_LINE = '#2a2620';

export interface Circ {
  /** 回路是否接通（模型 closed 且未被动作拨断） */
  on: boolean;
  U: number;
  I: number;
}

/** 读模型的 closed/current；toggle 动作按奇偶再断一次（模型只在部分分支处理 toggle）。 */
export function circ(io: RigIO): Circ {
  const on = io.sb('closed', true) && io.n('toggle') % 2 === 0;
  return { on, U: io.s('voltage', io.p('voltage', io.p('sourceVoltage', 3))), I: on ? io.s('current', 0) : 0 };
}

/** 灯亮度（0..1.3），功率 W */
export const lampLevel = (P: number, rated = 0.6) => clamp(Math.sqrt(Math.max(0, P) / rated), 0, 1.3);

/** 绝缘导线：沿折线的细管，两端落到端子。 */
export function Wire({ pts, color = '#c8402f', r = 0.034 }: { pts: V3[]; color?: string; r?: number }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: col(color), roughness: 0.55 }), [color]);
  return <Tube pts={pts} r={r} m={m} />;
}

/** 接线柱 */
export function Post({ p, color = 'brass' }: { p: V3; color?: 'brass' | 'red' | 'black' }) {
  const m = color === 'red' ? MAT.red : color === 'black' ? MAT.black : MAT.brass;
  return (
    <group position={p}>
      <mesh castShadow material={m}><cylinderGeometry args={[0.07, 0.08, 0.1, 14]} /></mesh>
      <mesh position={[0, 0.07, 0]} castShadow material={MAT.steel}><cylinderGeometry args={[0.045, 0.045, 0.06, 10]} /></mesh>
    </group>
  );
}

/** 带细墨线描边的盒子 */
export function InkBox({ p, s, m = MAT.white, rot }: { p: V3; s: V3; m?: THREE.Material; rot?: V3 }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...s)), [s[0], s[1], s[2]]);
  return (
    <group position={p} rotation={rot}>
      <Box s={s} m={m} />
      <lineSegments geometry={edges}><lineBasicMaterial color={INK_LINE} transparent opacity={0.5} /></lineSegments>
    </group>
  );
}

/** 电路底板 */
export function Board({ w = 4.7, d = 3.6, p = [0, 0, 0] as V3 }: { w?: number; d?: number; p?: V3 }) {
  return (
    <group position={p}>
      <InkBox p={[0, BOARD_TOP / 2, 0]} s={[w, BOARD_TOP, d]} m={MAT.wood} />
      <Box p={[0, BOARD_TOP + 0.004, 0]} s={[w - 0.2, 0.008, d - 0.2]} m={MAT.card} cast={false} />
    </group>
  );
}

/** 折线路径上的取点 */
function pathTable(pts: V3[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  }
  return { cum, len: cum[cum.length - 1] };
}
function pointAt(pts: V3[], cum: number[], s: number, out: THREE.Vector3) {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  const f = clamp((s - cum[i - 1]) / seg, 0, 1);
  out.set(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f, pts[i - 1][2] + (pts[i][2] - pts[i - 1][2]) * f);
}

/**
 * 沿路径流动的电荷点。cur(io) 为该段电流（A，沿 pts 方向为正）：
 * 电流越大点越密、越快；为 0（断路）时不显示；暂停时因 io.t 冻结而静止。
 */
export function Flow({ pts, cur, n = 12, color = '#ffb52e', r = 0.05, lift = 0 }: { pts: V3[]; cur: (io: RigIO) => number; n?: number; color?: string; r?: number; lift?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const st = useRef({ ph: 0, t: 0 });
  const tbl = useMemo(() => pathTable(pts), [JSON.stringify(pts)]);
  const geo = useMemo(() => new THREE.SphereGeometry(r, 8, 6), [r]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: col(color) }), [color]);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), o: new THREE.Object3D() }), []);
  useRig((io) => {
    const m = ref.current;
    if (!m) return;
    const i = cur(io);
    const dt = Math.max(0, Math.min(0.1, io.t - st.current.t));
    st.current.t = io.t;
    const a = Math.abs(i);
    if (a < 1e-3) { m.count = 0; return; }
    const speed = (0.28 + 0.5 * Math.min(1, Math.sqrt(a))) * Math.sign(i);
    st.current.ph += speed * dt;
    const gap = tbl.len / n;
    m.count = Math.max(2, Math.round(n * clamp(0.35 + a * 0.8, 0.35, 1)));
    for (let k = 0; k < m.count; k++) {
      const s = ((((k * gap + st.current.ph) % tbl.len) + tbl.len) % tbl.len);
      pointAt(pts, tbl.cum, s, tmp.v);
      tmp.o.position.set(tmp.v.x, tmp.v.y + lift, tmp.v.z);
      tmp.o.updateMatrix();
      m.setMatrixAt(k, tmp.o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />;
}

/** 一段导线 + 其电荷流 */
export function Run({ pts, cur, color, n }: { pts: V3[]; cur: (io: RigIO) => number; color?: string; n?: number }) {
  return (
    <group>
      <Wire pts={pts} color={color} />
      <Flow pts={pts} cur={cur} n={n ?? Math.max(5, Math.round(pathTable(pts).len * 3.2))} lift={0.02} />
    </group>
  );
}

/** 各器材接线点离中心的 x 半宽 */
export const HALF = { lamp: 0.36, sw: 0.38, meter: 0.6, bat: 0.95, res: 0.5 };
/** 导线高度上的点 */
export const P = (x: number, z: number, y = WIRE_Y): V3 => [x, y, z];

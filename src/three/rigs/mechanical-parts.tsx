import { ReactNode, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, MAT, Spring, V3, Vessel, liquidMat } from '../kit';
import { RigIO, clamp, useRig } from './io';

/* 力学装置共用小部件。约定：1 个场景单位 ≈ 数厘米到十几厘米，视觉比例由各装置自行换算；
   所有随参数/时间变化的几何都通过 Mv / Cord 在 useRig 中直接改变换，不触发 React 更新。 */

export const INK = new THREE.LineBasicMaterial({ color: '#2b2622' });
export const WATER = liquidMat('#7fc3e0', 0.6);
export const SALT = liquidMat('#a9d6e8', 0.66);
export const MERCURY = new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.12, metalness: 0.95 });
export const CLAY = new THREE.MeshStandardMaterial({ color: '#c8693f', roughness: 0.85 });

const edgeCache = new Map<string, THREE.BufferGeometry>();
/** 细墨线轮廓框（盒形） */
export function Ink({ s, p = [0, 0, 0], rot }: { s: V3; p?: V3; rot?: V3 }) {
  const key = s.join('|');
  let g = edgeCache.get(key);
  if (!g) { g = new THREE.EdgesGeometry(new THREE.BoxGeometry(...s)); edgeCache.set(key, g); }
  return <lineSegments geometry={g} material={INK} position={p} rotation={rot} />;
}

/** 带墨线的盒子 */
export function IBox({ p = [0, 0, 0], s, m = MAT.white, rot, ink = true }: { p?: V3; s: V3; m?: THREE.Material; rot?: V3; ink?: boolean }) {
  return (
    <group position={p} rotation={rot}>
      <Box s={s} m={m} />
      {ink && <Ink s={s} />}
    </group>
  );
}

/** 每帧由 upd(group, io) 直接改变换的分组。upd 必须是 io 的纯函数。 */
export function Mv({ p, rot, upd, children }: { p?: V3; rot?: V3; upd: (g: THREE.Group, io: RigIO) => void; children?: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useRig((io) => { if (ref.current) upd(ref.current, io); });
  return <group ref={ref} position={p} rotation={rot}>{children}</group>;
}

/** 两端由 ends(io) 给出的细绳（拉伸的圆柱） */
export function Cord({ ends, r = 0.018, color = '#7a6340' }: { ends: (io: RigIO) => [V3, V3]; r?: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);
  useRig((io) => {
    const m = ref.current;
    if (!m) return;
    const [a, b] = ends(io);
    tmp.a.set(a[0], a[1], a[2]);
    tmp.d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = Math.max(1e-4, tmp.d.length());
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    m.quaternion.setFromUnitVectors(tmp.up, tmp.d.multiplyScalar(1 / len));
    m.scale.set(1, len, 1);
  });
  return (
    <mesh ref={ref} castShadow>
      <cylinderGeometry args={[r, r, 1, 6]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/* ---------- 液体（底部为原点的单位体，按高度缩放） ---------- */
const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 32).translate(0, 0.5, 0);
/** level(io) 返回液柱高度（场景单位）。round 时 w 为半径。 */
export function Liquid({ p = [0, 0, 0], w, d, round = false, mat = WATER, level }: { p?: V3; w: number; d?: number; round?: boolean; mat?: THREE.Material; level: (io: RigIO) => number }) {
  return (
    <Mv p={p} upd={(g, io) => {
      const h = Math.max(1e-3, level(io));
      g.scale.set(w, h, round ? w : d ?? w);
      g.visible = h > 2e-3;
    }}>
      <mesh geometry={round ? unitCyl : unitBox} material={mat} renderOrder={1} />
    </Mv>
  );
}

/** 透明玻璃水槽（无顶），自带细墨线与底板 */
export function GlassBox({ p = [0, 0, 0], w, d, h }: { p?: V3; w: number; d: number; h: number }) {
  return (
    <group position={p}>
      <Box p={[0, 0.02, 0]} s={[w, 0.04, d]} m={MAT.glass} cast={false} />
      <group position={[0, h / 2, 0]}>
        <Box s={[w, h, d]} m={MAT.glass} cast={false} />
        <Ink s={[w, h, d]} />
      </group>
    </group>
  );
}

/** 沿 y 方向的横向刻度线：n+1 条，每 major 条一条长线 */
export function Ticks({ p = [0, 0, 0], n, dy, len = 0.12, major = 5, flip = false }: { p?: V3; n: number; dy: number; len?: number; major?: number; flip?: boolean }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) {
      const l = i % major === 0 ? len : len * 0.55;
      pts.push(0, i * dy, 0, flip ? -l : l, i * dy, 0);
    }
    pts.push(0, 0, 0, 0, n * dy, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [n, dy, len, major, flip]);
  return <lineSegments geometry={geo} material={INK} position={p} />;
}

/** 量筒：玻璃壳 + 刻度；液面由 Liquid 另绘。h 为内高，刻度共 10 格。 */
export function GradCyl({ p = [0, 0, 0], r = 0.4, h = 2.2, children }: { p?: V3; r?: number; h?: number; children?: ReactNode }) {
  return (
    <group position={p}>
      <Vessel kind="cylinder" r={r} h={h} />
      <Ticks p={[r * 0.97, 0.12, r * 0.25]} n={10} dy={(h - 0.2) / 10} len={r * 0.45} major={5} flip />
      {children}
    </group>
  );
}

/* ---------- 弹簧测力计（竖直；绕 z 旋转 ±π/2 变水平，钩端朝 ∓x） ---------- */
const texCache = new Map<string, THREE.CanvasTexture>();
function gaugeTex(maxN: number, ratio: number): THREE.CanvasTexture {
  const key = `${maxN}|${ratio}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const H = 640, W = Math.round(H * ratio);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#2b2622'; g.fillStyle = '#2b2622'; g.lineWidth = 3;
  g.font = `${Math.round(W * 0.2)}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
  const sub = 5, major = 5;
  for (let i = 0; i <= major * sub; i++) {
    const y = (0.14 + 0.74 * (i / (major * sub))) * H;
    const big = i % sub === 0;
    g.beginPath(); g.moveTo(W * 0.04, y); g.lineTo(W * (big ? 0.34 : 0.22), y); g.stroke();
    if (big) { const v = (maxN * i) / (major * sub); g.fillText(String(+v.toFixed(2)), W * 0.38, y); }
  }
  g.fillText('N', W * 0.04, H * 0.07);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

/** get(io) 返回读数占量程的比例（0..1，可略超）。children 挂在钩子下端。 */
export function Gauge({ p = [0, 0, 0], rot, len = 1.5, maxN = 5, get, children }: { p?: V3; rot?: V3; len?: number; maxN?: number; get: (io: RigIO) => number; children?: ReactNode }) {
  const travel = 0.74 * len, y0 = -0.14 * len;
  const w = 0.4;
  const tex = useMemo(() => gaugeTex(maxN, w / len), [maxN, len]);
  const rodTop = y0 + 0.05, rodBot = -len - 0.42;
  return (
    <group position={p} rotation={rot}>
      <IBox p={[0, -len / 2, -0.07]} s={[w, len, 0.04]} m={MAT.plastic} />
      <Box p={[0, 0.03, -0.03]} s={[w + 0.04, 0.06, 0.12]} m={MAT.darkSteel} />
      <Box p={[0, -len - 0.02, -0.03]} s={[w + 0.04, 0.06, 0.12]} m={MAT.darkSteel} />
      <mesh position={[0, 0.17, 0]} castShadow material={MAT.steel}><torusGeometry args={[0.08, 0.016, 8, 20]} /></mesh>
      <mesh position={[0, -len / 2, 0.04]}>
        <planeGeometry args={[w, len]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
      <Mv p={[0.1, -0.06, 0]} upd={(g, io) => { g.scale.y = Math.max(0.05, -y0 - 0.06 + clamp(get(io), 0, 1.08) * travel); }}>
        <Spring len={1} r={0.075} coils={13} wire={0.012} />
      </Mv>
      <Mv upd={(g, io) => { g.position.y = -clamp(get(io), 0, 1.08) * travel; }}>
        <Box p={[-0.05, y0, 0.06]} s={[0.2, 0.026, 0.018]} m={MAT.red} cast={false} />
        <Box p={[0.1, (rodTop + rodBot) / 2, 0]} s={[0.035, rodTop - rodBot, 0.035]} m={MAT.steel} />
        <mesh position={[0.1, -len - 0.5, 0]} castShadow material={MAT.steel}><torusGeometry args={[0.07, 0.015, 8, 20]} /></mesh>
        <group position={[0.1, -len - 0.57, 0]}>{children}</group>
      </Mv>
    </group>
  );
}

/** 钩码/物块下端的挂钩：小环 + 杆（原点在物体顶面） */
export function Hanger({ h = 0.14 }: { h?: number }) {
  return (
    <group>
      <Cyl p={[0, h / 2, 0]} r={0.012} h={h} m={MAT.steel} />
      <mesh position={[0, h + 0.05, 0]} material={MAT.steel}><torusGeometry args={[0.05, 0.012, 8, 16]} /></mesh>
    </group>
  );
}

/** 开槽钩码（原点在底面） */
export function Slotted({ p = [0, 0, 0], r = 0.2, h = 0.13, m = MAT.brass }: { p?: V3; r?: number; h?: number; m?: THREE.Material }) {
  return (
    <group position={p}>
      <Cyl p={[0, h / 2, 0]} r={r} h={h} m={m} />
      <Box p={[0, h / 2, r * 0.8]} s={[0.04, h * 0.9, r * 0.5]} m={MAT.black} cast={false} />
    </group>
  );
}

/** 铁架台：底座 + 立杆 + 水平横臂。返回的挂点在 p + [dir*reach, h, 0]。 */
export function Stand({ p = [0, 0, 0], h = 3.4, reach = 1.1, dir = 1 }: { p?: V3; h?: number; reach?: number; dir?: 1 | -1 }) {
  return (
    <group position={p}>
      <IBox p={[0, 0.07, 0]} s={[1.0, 0.14, 0.7]} m={MAT.darkSteel} />
      <Cyl p={[0, h / 2, 0]} r={0.045} h={h} m={MAT.steel} />
      <Box p={[dir * reach / 2, h, 0]} s={[reach, 0.07, 0.07]} m={MAT.steel} />
      <Box p={[0, h, 0]} s={[0.16, 0.14, 0.14]} m={MAT.darkSteel} />
    </group>
  );
}

/** 滑轮：rot(io) 给出转角（弧度）。轴沿 z。 */
export function Wheel({ p = [0, 0, 0], r = 0.4, spin }: { p?: V3; r?: number; spin?: (io: RigIO) => number }) {
  return (
    <group position={p}>
      <mesh castShadow material={MAT.steel}><torusGeometry args={[r, 0.04, 10, 36]} /></mesh>
      <Mv upd={(g, io) => { g.rotation.z = spin ? spin(io) : 0; }}>
        <Cyl r={r * 0.97} h={0.08} rot={[Math.PI / 2, 0, 0]} m={MAT.darkSteel} />
        {[0, 1, 2].map((i) => <Box key={i} p={[0, 0, 0.05]} s={[r * 1.8, 0.05, 0.02]} rot={[0, 0, (i * Math.PI) / 3]} m={MAT.brass} cast={false} />)}
      </Mv>
      <Ball r={0.07} m={MAT.brass} />
    </group>
  );
}

/** 小车：车身 + 4 轮，原点在轮底中心，长 L 沿 x */
export function Cart({ L = 0.9, W = 0.5, color = MAT.blue, children }: { L?: number; W?: number; color?: THREE.Material; children?: ReactNode }) {
  return (
    <group>
      <IBox p={[0, 0.2, 0]} s={[L, 0.14, W]} m={color} />
      {[-1, 1].map((a) => [-1, 1].map((b) => (
        <Cyl key={`${a}${b}`} p={[a * L * 0.33, 0.1, b * (W / 2 + 0.01)]} r={0.1} h={0.06} rot={[Math.PI / 2, 0, 0]} m={MAT.rubber} />
      )))}
      {children}
    </group>
  );
}

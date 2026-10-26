import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, MAT, V3 } from '../kit';
import { RigIO, useRig } from './io';

/* 光学器材共用部件：光线（直接按帧写变换）、透镜、蜡烛、光具座、光屏。
   光路都画在 z=0 的竖直平面内（x 向右、y 向上），光轴高 AX。 */

export const AX = 1.35;
export const INK = '#2b2620';
export const RAY = '#e8392b';
const inkMat = new THREE.MeshBasicMaterial({ color: INK });
const UP = new THREE.Vector3(0, 1, 0);
const DIR = new THREE.Vector3();

type BeamColor = string | ((io: RigIO) => string);

/** 折线光线：get 每帧给出最多 segs+1 个点；dash>0 时每段切成虚线；pulse 在按下「开始」后让亮点沿光线跑一遍。 */
export function Beam({ get, segs = 2, color = RAY, r = 0.02, opacity = 1, dash = 0, pulse = false, show }: { get: (io: RigIO) => V3[]; segs?: number; color?: BeamColor; r?: number; opacity?: number; dash?: number; pulse?: boolean; show?: (io: RigIO) => boolean }) {
  const per = dash > 0 ? dash : 1;
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const ball = useRef<THREE.Mesh>(null);
  const last = useRef('');
  const geo = useMemo(() => new THREE.CylinderGeometry(r, r, 1, 6), [r]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: typeof color === 'string' ? color : RAY, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }), [opacity]);
  useRig((io) => {
    const pts = get(io);
    const vis = show ? show(io) : true;
    const c = typeof color === 'function' ? color(io) : color;
    if (c !== last.current) { last.current = c; mat.color.set(c); }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < per; j++) {
        const m = meshes.current[i * per + j];
        if (!m) continue;
        const a = pts[i];
        const b = pts[i + 1];
        if (!vis || !a || !b) { m.visible = false; continue; }
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const len = Math.hypot(dx, dy, dz);
        if (len < 1e-4) { m.visible = false; continue; }
        const t0 = per > 1 ? j / per : 0;
        const t1 = per > 1 ? (j + 0.55) / per : 1;
        m.visible = true;
        m.position.set(a[0] + dx * (t0 + t1) / 2, a[1] + dy * (t0 + t1) / 2, a[2] + dz * (t0 + t1) / 2);
        m.quaternion.setFromUnitVectors(UP, DIR.set(dx / len, dy / len, dz / len));
        m.scale.set(1, len * (t1 - t0), 1);
      }
    }
    const bm = ball.current;
    if (bm) {
      const f = io.since('run') / 1.6;
      let total = 0;
      for (let i = 0; i + 1 < pts.length; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]);
      bm.visible = vis && f >= 0 && f <= 1 && total > 0;
      if (bm.visible) {
        let rest = f * total;
        for (let i = 0; i + 1 < pts.length; i++) {
          const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]);
          if (rest <= l || i + 2 >= pts.length) {
            const w = l > 0 ? Math.min(1, rest / l) : 0;
            bm.position.set(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * w, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * w, pts[i][2] + (pts[i + 1][2] - pts[i][2]) * w);
            break;
          }
          rest -= l;
        }
      }
    }
  });
  return (
    <group>
      {Array.from({ length: segs * per }).map((_, i) => (
        <mesh key={i} ref={(m) => { meshes.current[i] = m; }} geometry={geo} material={mat} frustumCulled={false} />
      ))}
      {pulse && (
        <mesh ref={ball} frustumCulled={false} renderOrder={5}>
          <sphereGeometry args={[r * 3.2, 12, 10]} />
          <meshBasicMaterial color="#fff3c8" />
        </mesh>
      )}
    </group>
  );
}

/** 细墨线轮廓（盒形） */
export function Outline({ p = [0, 0, 0], s, rot }: { p?: V3; s: V3; rot?: V3 }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...s)), [s[0], s[1], s[2]]);
  return (
    <lineSegments geometry={geo} position={p} rotation={rot}>
      <lineBasicMaterial color={INK} transparent opacity={0.8} />
    </lineSegments>
  );
}

/** 薄透镜：轴沿 x。bulge 由 getBulge 每帧驱动（焦距越短越鼓），concave 为凹透镜。 */
export function Lens3D({ p = [0, AX, 0], R = 0.85, concave = false, getBulge }: { p?: V3; R?: number; concave?: boolean; getBulge?: (io: RigIO) => number }) {
  const grp = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const top: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const r = (i / 12) * R;
      const q = 1 - (r / R) ** 2;
      top.push(new THREE.Vector2(r, concave ? 0.1 - 0.075 * q : 0.015 + 0.17 * q));
    }
    const bottom = top.slice().reverse().map((v) => new THREE.Vector2(v.x, -v.y));
    return new THREE.LatheGeometry([...top, ...bottom], 40);
  }, [R, concave]);
  useRig((io) => { if (grp.current && getBulge) grp.current.scale.set(1, getBulge(io), 1); });
  return (
    <group position={p}>
      <group rotation={[0, 0, -Math.PI / 2]}>
        <group ref={grp}>
          <mesh geometry={geo} material={MAT.glass} renderOrder={3} />
        </group>
      </group>
      <mesh rotation={[0, Math.PI / 2, 0]} material={inkMat}><torusGeometry args={[R, 0.014, 6, 48]} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} material={MAT.brass}><torusGeometry args={[R + 0.045, 0.03, 8, 48]} /></mesh>
      <Cyl p={[0, -(R + 0.04) - (AX - 0.3 - R - 0.04) / 2, 0]} r={0.035} h={AX - 0.3 - R - 0.04} m={MAT.steel} />
      <Box p={[0, -(AX - 0.3), 0]} s={[0.34, 0.14, 0.5]} m={MAT.darkSteel} />
    </group>
  );
}

/** 蜡烛/物体：单位高度 1，缩放 s（uniform），flip 为倒立；lit 点亮火焰；glow 为火焰亮度。 */
export function CandleFig({ s = 0.5, flip = false, lit = true, ghost = false }: { s?: number; flip?: boolean; lit?: boolean; ghost?: boolean }) {
  const flame = useRef<THREE.Mesh>(null);
  useRig((io) => { if (flame.current) flame.current.scale.set(1 + 0.08 * Math.sin(io.t * 11), 1 + 0.12 * Math.sin(io.t * 7 + 1), 1); });
  const wax = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1ede3', roughness: 0.7, transparent: ghost, opacity: ghost ? 0.4 : 1 }), [ghost]);
  const fl = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: ghost ? 0.45 : 0.92 }), [ghost]);
  return (
    <group scale={[s, flip ? -s : s, s]}>
      <mesh position={[0, 0.34, 0]} material={wax} castShadow><cylinderGeometry args={[0.09, 0.09, 0.68, 14]} /></mesh>
      <mesh position={[0, 0.7, 0]} material={inkMat}><cylinderGeometry args={[0.008, 0.008, 0.08, 4]} /></mesh>
      {lit && <mesh ref={flame} position={[0, 0.84, 0]} material={fl}><coneGeometry args={[0.07, 0.3, 12]} /></mesh>}
      {lit && <Ball p={[0, 0.76, 0]} r={0.045} m={new THREE.MeshBasicMaterial({ color: '#fff1b8' })} />}
    </group>
  );
}

/** 光具座上的滑块 + 立杆（杆顶到光轴高度） */
export function Carrier({ x, top = AX - 0.12, w = 0.34 }: { x: number; top?: number; w?: number }) {
  return (
    <group position={[x, 0, 0]}>
      <Box p={[0, 0.3, 0]} s={[w, 0.14, 0.5]} m={MAT.darkSteel} />
      <Cyl p={[0, 0.3 + (top - 0.3) / 2, 0]} r={0.03} h={top - 0.3} m={MAT.steel} />
    </group>
  );
}

/** 光具座：木底座 + 钢轨 + 刻度（k 个场景单位对应 1 cm，原点在 x0） */
export function Bench({ x0 = 0, k = 0.045, from = -2.4, to = 2.4 }: { x0?: number; k?: number; from?: number; to?: number }) {
  const ticks = useMemo(() => {
    const pts: number[] = [];
    const lo = Math.ceil((from - x0) / (5 * k)), hi = Math.floor((to - x0) / (5 * k));
    for (let i = lo; i <= hi; i++) {
      const x = x0 + i * 5 * k;
      pts.push(x, 0.23, 0.26, x, 0.23, i % 2 === 0 ? 0.37 : 0.32);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [x0, k, from, to]);
  const len = to - from + 0.2;
  return (
    <group>
      <Box p={[(from + to) / 2, 0.1, 0]} s={[len, 0.12, 0.72]} m={MAT.wood} />
      <Box p={[(from + to) / 2, 0.2, 0]} s={[len - 0.1, 0.07, 0.6]} m={MAT.steel} />
      <lineSegments geometry={ticks}><lineBasicMaterial color={INK} /></lineSegments>
    </group>
  );
}

/** 光屏：白板，正面（朝 -x）放像（children 放在板前 0.02 处）；位置由上层通过 gref 每帧改写。 */
export function ScreenBoard({ gref, x = 0, w = 1.5, h = 1.9, children }: { gref?: React.RefObject<THREE.Group | null>; x?: number; w?: number; h?: number; children?: React.ReactNode }) {
  return (
    <group ref={gref} position={[x, AX, 0]}>
      <Box p={[0.03, 0, 0]} s={[0.05, h, w]} m={MAT.white} />
      <Outline p={[0.03, 0, 0]} s={[0.05, h, w]} />
      <Cyl p={[0.03, -h / 2 - (AX - 0.3 - h / 2) / 2, 0]} r={0.035} h={AX - 0.3 - h / 2} m={MAT.steel} />
      <Box p={[0.03, -(AX - 0.3), 0]} s={[0.34, 0.14, 0.5]} m={MAT.darkSteel} />
      <group position={[-0.02, 0, 0]}>{children}</group>
    </group>
  );
}

/** 激光笔：枪口在原点，机身沿 -x 延伸；上层设 position / rotation.z 让它指向光线。 */
export function LaserGun({ gref }: { gref: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={gref}>
      <Cyl p={[-0.4, 0, 0]} r={0.075} h={0.8} rot={[0, 0, Math.PI / 2]} m={MAT.darkSteel} />
      <Cyl p={[-0.02, 0, 0]} r={0.085} h={0.06} rot={[0, 0, Math.PI / 2]} m={MAT.brass} />
      <Ball r={0.045} m={new THREE.MeshBasicMaterial({ color: RAY })} />
    </group>
  );
}

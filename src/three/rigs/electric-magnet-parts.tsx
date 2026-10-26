import { useRef } from 'react';
import * as THREE from 'three';
import { Cyl, Label, MAT, V3 } from '../kit';
import { InkBox } from './electric-wire';
import { useRig } from './io';

/* 磁学器材：条形磁体、C 形（蹄形）磁体、小磁针。N 极红、S 极蓝灰，带字母。 */

const N_MAT = new THREE.MeshStandardMaterial({ color: '#c9402f', roughness: 0.45, metalness: 0.2 });
const S_MAT = new THREE.MeshStandardMaterial({ color: '#4a6fa5', roughness: 0.45, metalness: 0.2 });

/** 条形磁体：N 极在 +x 端（flip 则互换）。 */
export function BarMagnet({ p, len = 2.2, w = 0.4, h = 0.3, flip = false, rot }: { p: V3; len?: number; w?: number; h?: number; flip?: boolean; rot?: V3 }) {
  const a = flip ? S_MAT : N_MAT, b = flip ? N_MAT : S_MAT;
  return (
    <group position={p} rotation={rot}>
      <InkBox p={[len / 4, 0, 0]} s={[len / 2, h, w]} m={a} />
      <InkBox p={[-len / 4, 0, 0]} s={[len / 2, h, w]} m={b} />
      <Label p={[len / 4, h / 2 + 0.2, 0]} text={flip ? 'S' : 'N'} size={0.26} />
      <Label p={[-len / 4, h / 2 + 0.2, 0]} text={flip ? 'N' : 'S'} size={0.26} />
    </group>
  );
}

/** C 形磁体：开口朝 +z，上下两个磁极块之间是水平磁场（竖直方向）。upN：上极为 N。
    磁极块在 z∈[-0.7,0.7]，轭在 z=-1.0 处。 */
export function CMagnet({ p, upN, gap = 1.2 }: { p: V3; upN: boolean; gap?: number }) {
  const up = upN ? N_MAT : S_MAT, dn = upN ? S_MAT : N_MAT;
  return (
    <group position={p}>
      <InkBox p={[0, gap / 2 + 0.2, 0]} s={[1.9, 0.4, 1.5]} m={up} />
      <InkBox p={[0, -gap / 2 - 0.2, 0]} s={[1.9, 0.4, 1.5]} m={dn} />
      <InkBox p={[0, 0, -0.95]} s={[1.9, gap + 0.8, 0.3]} m={MAT.steel} />
      <Label p={[0.6, gap / 2 + 0.55, 0.55]} text={upN ? 'N' : 'S'} size={0.28} />
      <Label p={[0.6, -gap / 2 - 0.55, 0.55]} text={upN ? 'S' : 'N'} size={0.28} />
    </group>
  );
}

/** 小磁针：N 极红。heading(io) 给出绕 y 轴的角度（弧度，0 指向 +x，逆时针从上看为正）；阻尼过渡并带小幅摆动。 */
export function Compass({ p, heading, id, size = 1 }: { p: V3; heading: (io: import('./io').RigIO) => number; id: string; size?: number }) {
  const g = useRef<THREE.Group>(null);
  useRig((io) => {
    const a = io.damp(`cmp-${id}`, heading(io), 6);
    if (g.current) g.current.rotation.y = a;
  });
  return (
    <group position={p} scale={size}>
      <Cyl p={[0, 0.03, 0]} r={0.26} h={0.06} m={MAT.white} />
      <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.235, 0.26, 28]} /><meshStandardMaterial color="#8c8470" /></mesh>
      <Cyl p={[0, 0.07, 0]} r={0.02} h={0.1} m={MAT.steel} />
      <group ref={g} position={[0, 0.11, 0]}>
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.04, 0.2, 8]} /><meshStandardMaterial color="#d63a2a" /></mesh>
        <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.04, 0.2, 8]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
      </group>
    </group>
  );
}

/** 在两点之间画一段带箭头的细线（静态示意用） */
export function Arrow3({ a, b, color = '#d6892f' }: { a: V3; b: V3; color?: string }) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return (
    <group position={a} quaternion={q}>
      <mesh position={[0, (len - 0.14) / 2, 0]}><cylinderGeometry args={[0.018, 0.018, len - 0.14, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={[0, len - 0.07, 0]}><coneGeometry args={[0.055, 0.14, 10]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

/** 两点磁荷模型：N 荷在 +x 端（sgn=-1 则互换），返回 (x,z) 处磁场 (bx,bz)；用于小磁针与磁感线。 */
export function poleField(x: number, z: number, L: number, sgn = 1): [number, number] {
  let bx = 0, bz = 0;
  for (const [px, q] of [[L / 2, sgn], [-L / 2, -sgn]] as const) {
    const dx = x - px, dz = z, r = Math.max(0.12, Math.hypot(dx, dz));
    bx += (q * dx) / r ** 3; bz += (q * dz) / r ** 3;
  }
  return [bx, bz];
}
/** 场方向 → Compass 的 heading（局部 +x 经 rotation.y=a 指向 (cos a, -sin a)） */
export const headingOf = (b: [number, number]) => Math.atan2(-b[1], b[0]);

/** 可驱动的箭头：沿本地 +z，长度 len；用 gref 在 useRig 里设置位置、rotation.y、scale、visible。 */
export function DynArrow({ gref, color = '#d6892f', len = 0.5 }: { gref: React.RefObject<THREE.Group | null>; color?: string; len?: number }) {
  return (
    <group ref={gref} visible={false}>
      <mesh position={[0, 0, (len - 0.14) / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, len - 0.14, 8]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={[0, 0, len - 0.07]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.075, 0.14, 12]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

/** 水平（沿 x）的支柱+轴座：用于线圈轴端 */
export function Post3({ p, h }: { p: V3; h: number }) {
  return (
    <group position={p}>
      <InkBox p={[0, 0.05, 0]} s={[0.5, 0.1, 0.5]} m={MAT.darkWood} />
      <Cyl p={[0, h / 2, 0]} r={0.04} h={h} m={MAT.steel} />
    </group>
  );
}

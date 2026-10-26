import { useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, Label, MAT, V3 } from '../kit';
import { IoLabel } from './parts';
import { InkBox } from './electric-wire';
import { clamp, smooth, useOptIndex, useRig } from './io';

/* 电荷间相互作用：丝绸摩擦过的玻璃棒悬挂在支架上；手持（夹持）另一根带电棒由前方靠近其一端。
   悬挂棒绕竖直轴偏转：同种电荷远离，异种电荷靠近，偏转幅度随电荷量增大。 */

const ZP = -0.8;        // 悬挂棒所在 z
const Y = 2.35;         // 两根棒的高度
const ROD = 1.6;        // 棒长
const TIP0 = 1.2, TIP1 = 0.4; // 夹持棒尖端离悬挂点的 z 距离（起 → 终）
const MARKS = 6;

/** 一个小十字/短横：+（红）或 −（蓝）。沿局部 x 轴排布在棒表面。 */
function Marks({ sign, along = 1 }: { sign: 1 | -1; along?: number }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useRig((io) => {
    const q = io.p('charge', 50) / 100;
    refs.current.forEach((g, i) => { if (g) g.visible = q > 0.02 && (i + 1) / MARKS <= q + 0.17; });
  });
  const c = sign > 0 ? '#d93a2b' : '#2a63b8';
  return (
    <group>
      {Array.from({ length: MARKS }, (_, i) => {
        const x = along * (-ROD / 2 + 0.25 + (i * (ROD - 0.5)) / (MARKS - 1));
        return (
          <group key={i} ref={(g) => { refs.current[i] = g; }} position={[x, 0.075, 0]}>
            <mesh><boxGeometry args={[0.12, 0.012, 0.03]} /><meshBasicMaterial color={c} /></mesh>
            {sign > 0 && <mesh><boxGeometry args={[0.03, 0.012, 0.12]} /><meshBasicMaterial color={c} /></mesh>}
          </group>
        );
      })}
    </group>
  );
}

function RodBody({ glass }: { glass: boolean }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.07, 0.07, ROD, 20]} />
      {glass ? <meshPhysicalMaterial color="#cfe9ee" transparent opacity={0.6} roughness={0.08} transmission={0.4} /> : <meshStandardMaterial color="#2c2724" roughness={0.6} />}
    </mesh>
  );
}

/** 受力箭头：沿 ±z，长度随电荷量与接近程度变化 */
function Arrow({ id, color = '#d6892f' }: { id: string; color?: string }) {
  const g = useRef<THREE.Group>(null);
  useRig((io) => {
    if (!g.current) return;
    const k = clamp((io.t - 2.4) / 1.2, 0, 1), q = io.p('charge', 50) / 100;
    g.current.visible = k > 0 && q > 0.02;
    g.current.scale.setScalar(0.45 + 0.9 * q);
    void id;
  });
  return (
    <group ref={g} visible={false}>
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.4, 8]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={[0, 0, 0.47]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.07, 0.16, 12]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function Stand({ p, h, arm }: { p: V3; h: number; arm?: V3 }) {
  return (
    <group position={p}>
      <InkBox p={[0, 0.05, 0]} s={[0.9, 0.1, 0.9]} m={MAT.darkWood} />
      <Cyl p={[0, h / 2, 0]} r={0.045} h={h} m={MAT.steel} />
      {arm && <Cyl p={[arm[0] / 2, h, arm[2] / 2]} r={0.035} h={Math.hypot(arm[0], arm[2])} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />}
    </group>
  );
}

export function ChargeInteraction() {
  const attract = useOptIndex('pair', 0) === 1;
  const hung = useRef<THREE.Group>(null), held = useRef<THREE.Group>(null);
  const arrHung = useRef<THREE.Group>(null), arrHeld = useRef<THREE.Group>(null);
  useRig((io) => {
    const ap = smooth(io.t / 2.4);
    const q = io.p('charge', 50) / 100;
    const sign = attract ? -1 : 1;
    const target = sign * 0.34 * q * smooth((io.t - 1.6) / 1.6);
    const th = io.damp('charge-th', target, 3) + 0.02 * Math.sin(io.t * 2.4) * ap * q;
    if (hung.current) hung.current.rotation.y = th;
    const tipZ = ZP + TIP0 + (TIP1 - TIP0) * ap;
    if (held.current) held.current.position.z = tipZ + ROD / 2;
    // 箭头：悬挂棒右端受力，夹持棒尖端受反作用力
    const endZ = ZP - Math.sin(th) * (ROD / 2);
    if (arrHung.current) { arrHung.current.position.set(ROD / 2 * Math.cos(th), Y, endZ); arrHung.current.rotation.y = attract ? 0 : Math.PI; }
    if (arrHeld.current) { arrHeld.current.position.set(ROD / 2, Y, tipZ); arrHeld.current.rotation.y = attract ? Math.PI : 0; }
  });
  return (
    <group>
      <Stand p={[-1.6, 0, ZP]} h={3.2} arm={[1.6, 0, 0]} />
      <mesh position={[0, 2.8, ZP]}><cylinderGeometry args={[0.006, 0.006, 0.9, 5]} /><meshBasicMaterial color="#555" /></mesh>
      <group ref={hung} position={[0, Y, ZP]}>
        <RodBody glass />
        <Marks sign={1} />
        <IoLabel p={[-0.3, 0.55, 0]} size={0.2} get={() => '悬挂的玻璃棒（带正电）'} />
      </group>
      <Stand p={[1.45, 0, 1.55]} h={Y} arm={[-0.65, 0, 0]} />
      <group ref={held} position={[0.8, Y, ZP + TIP0 + ROD / 2]} rotation={[0, Math.PI / 2, 0]}>
        <RodBody glass={!attract} />
        <Marks sign={attract ? -1 : 1} />
        <Cyl p={[-ROD / 2 + 0.25, 0, 0]} r={0.09} h={0.5} rot={[0, 0, Math.PI / 2]} m={MAT.white} />
      </group>
      <group ref={arrHung}><Arrow id="a2" /></group>
      <group ref={arrHeld}><Arrow id="b2" /></group>
      <IoLabel p={[0.8, Y + 0.65, 1.0]} size={0.2} get={() => (attract ? '橡胶棒（毛皮摩擦，带负电）' : '玻璃棒（带正电）')} />
      <IoLabel p={[0, 3.75, 0.2]} size={0.24} get={() => (attract ? '异种电荷相互吸引' : '同种电荷相互排斥')} />
      <Box p={[-1.5, 0.04, 1.5]} s={[0.8, 0.08, 0.55]} m={MAT.card} />
      <Label p={[-1.5, 0.3, 1.5]} text={attract ? '毛皮' : '丝绸'} size={0.2} />
    </group>
  );
}

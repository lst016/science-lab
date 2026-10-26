import { useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, MAT, Tube, V3 } from '../kit';
import { CMagnet, DynArrow, Post3 } from './electric-magnet-parts';
import { IoLabel } from './parts';
import { Flow, InkBox } from './electric-wire';
import { clamp, useOptIndex, useRig } from './io';

/* 通电导体/线圈在磁场中受力：C 形磁体上下两极，磁场竖直（N 在上则向下）。 */

export const Y0 = 1.3;
const copper = new THREE.MeshStandardMaterial({ color: '#c8873a', metalness: 0.8, roughness: 0.35 });
const wireM = new THREE.MeshStandardMaterial({ color: '#c8402f', roughness: 0.55 });

/** 磁体底座：垫起下极与轭 */
export function MagnetBase() {
  return (
    <group>
      <Box p={[0, 0.15, 0]} s={[1.3, 0.3, 1.1]} m={MAT.darkWood} />
      <Box p={[0, 0.15, -0.95]} s={[1.9, 0.3, 0.3]} m={MAT.darkWood} />
    </group>
  );
}

function Commutator({ split }: { split: boolean }) {
  return (
    <group position={[1.0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      {split
        ? [0, 1].map((i) => (
          <mesh key={i} material={copper}>
            <cylinderGeometry args={[0.13, 0.13, 0.28, 18, 1, false, i * Math.PI + 0.12, Math.PI - 0.24]} />
          </mesh>
        ))
        : [-0.08, 0.08].map((y) => <mesh key={y} position={[0, y, 0]} material={copper}><cylinderGeometry args={[0.13, 0.13, 0.1, 20]} /></mesh>)}
    </group>
  );
}

/** 线圈电动机：转矩 ∝ I·B·sinφ；有换向器时每过平衡位置电流反向，转矩方向不变。 */
export function CoilMotor() {
  const upN = useOptIndex('fieldDirection', 0) === 0;
  const comm = useOptIndex('commutator', 1) === 1;
  const coil = useRef<THREE.Group>(null);
  const fa = useRef<THREE.Group>(null), fb = useRef<THREE.Group>(null);
  const st = useRef({ phi: 0, w: 0, t: -1 });
  useRig((io) => {
    const s = st.current;
    const a0 = (io.p('angle', 90) * Math.PI) / 180;
    if (io.t < s.t - 1e-6) { s.phi = a0; s.w = 0; }
    const dt = clamp(io.t - s.t, 0, 0.05);
    s.t = io.t;
    const go = io.since('run') >= 0 || io.t > 0.8;
    const I = io.p('current', 1);
    const d = io.s('rotation', 1) * (I < 0 ? -1 : 1) || 1;
    const K = 6 * Math.abs(I) * (io.p('field', 70) / 70);
    if (!go) { s.phi = a0; s.w = 0; } else {
      const sn = Math.sin(s.phi);
      const g = comm ? Math.abs(sn) : sn;
      s.w += (d * K * g - 1.2 * s.w) * dt;
      s.phi += s.w * dt;
    }
    if (coil.current) coil.current.rotation.x = s.phi;
    const sinP = Math.sin(s.phi), cosP = Math.cos(s.phi);
    const fz = -d * (comm ? Math.sign(sinP) || 1 : 1);
    for (const [ref, k] of [[fa.current, 1], [fb.current, -1]] as const) {
      if (!ref) continue;
      ref.visible = go && K > 0.01;
      ref.position.set(0, Y0 - k * 0.5 * sinP, k * 0.5 * cosP);
      ref.rotation.y = fz * k > 0 ? 0 : Math.PI;
      ref.scale.setScalar(0.6 + Math.min(1, K / 6) * 0.8);
    }
  });
  const loops = [0, 1, 2].map((k) => [[-0.6, (k - 1) * 0.045, -0.5], [0.6, (k - 1) * 0.045, -0.5], [0.6, (k - 1) * 0.045, 0.5], [-0.6, (k - 1) * 0.045, 0.5]] as V3[]);
  return (
    <group>
      <MagnetBase />
      <CMagnet p={[0, Y0, 0]} upN={upN} />
      <Post3 p={[-1.5, 0, 0]} h={Y0} /><Post3 p={[1.5, 0, 0]} h={Y0} />
      <group ref={coil} position={[0, Y0, 0]}>
        <Cyl p={[0, 0, 0]} r={0.03} h={3.0} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />
        {loops.map((pts, i) => <Tube key={i} pts={pts} r={0.022} m={copper} closed />)}
        <Commutator split={comm} />
      </group>
      {[0.2, -0.2].map((y) => <InkBox key={y} p={[1.0, Y0 + y * 1.1, 0]} s={[0.12, 0.1, 0.16]} m={MAT.black} />)}
      <Tube pts={[[1.0, Y0 + 0.25, 0], [1.7, Y0 + 0.25, 0], [1.7, 0.35, 1.4]]} r={0.025} m={wireM} cast={false} />
      <Tube pts={[[1.0, Y0 - 0.25, 0], [1.3, Y0 - 0.25, 0], [1.3, 0.3, 1.4]]} r={0.025} m={wireM} cast={false} />
      <InkBox p={[1.5, 0.15, 1.5]} s={[1.0, 0.3, 0.5]} m={MAT.darkSteel} />
      <IoLabel p={[1.5, 0.7, 1.5]} size={0.2} get={(io) => `电源 ${io.p('current', 1) < 0 ? '（反接）' : ''} ${Math.abs(io.p('current', 1)).toFixed(1)} A`} />
      <group><DynArrow gref={fa} /></group>
      <group><DynArrow gref={fb} /></group>
      <IoLabel p={[0, 2.95, 0.4]} size={0.22} get={() => (comm ? '换向器：每半周改变线圈电流方向，转矩方向不变 → 连续转动' : '无换向：转过平衡位置后转矩反向，线圈摆动后停下')} />
    </group>
  );
}

/** 通电导体棒在磁场中受力滚动：F = IL×B */
export function WireForce() {
  const upN = useOptIndex('fieldDirection', 0) === 0;
  const dirRev = useOptIndex('currentDirection', 0) === 1;
  const rod = useRef<THREE.Group>(null), roll = useRef<THREE.Mesh>(null), arr = useRef<THREE.Group>(null);
  const st = useRef({ z: 0, t: -1 });
  useRig((io) => {
    const s = st.current;
    if (io.t < s.t - 1e-6) s.z = 0;
    const dt = clamp(io.t - s.t, 0, 0.05);
    s.t = io.t;
    const go = io.since('run') >= 0 || io.t > 0.8;
    const rot = io.s('rotation', 1) || 1;
    const I = io.p('current', 1);
    if (go) s.z = clamp(s.z - rot * (0.25 + 0.35 * I) * dt, -0.68, 0.68);
    if (rod.current) rod.current.position.z = s.z;
    if (roll.current) roll.current.rotation.x = -s.z / 0.07;
    if (arr.current) {
      arr.current.visible = go && Math.abs(s.z) < 0.67;
      arr.current.position.set(0.3, Y0 + 0.2, s.z);
      arr.current.rotation.y = -rot > 0 ? 0 : Math.PI;
      arr.current.scale.setScalar(0.6 + 0.4 * I);
    }
  });
  const rails = [-0.7, 0.7];
  const sg = dirRev ? -1 : 1;
  return (
    <group>
      <MagnetBase />
      <CMagnet p={[0, Y0, 0]} upN={upN} />
      {rails.map((x) => (
        <group key={x}>
          <Tube pts={[[x, Y0 - 0.07, -0.8], [x, Y0 - 0.07, 1.9]]} r={0.025} m={MAT.steel} />
          <Cyl p={[x, (Y0 - 0.1) / 2, 1.9]} r={0.03} h={Y0 - 0.1} m={MAT.steel} />
          <Tube pts={[[x, Y0 - 0.07, 1.9], [x, 0.3, 1.9]]} r={0.025} m={wireM} cast={false} />
        </group>
      ))}
      <group ref={rod} position={[0, Y0 - 0.0, 0]}>
        <mesh ref={roll} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 1.7, 18]} />
          <meshStandardMaterial color="#b9bec6" metalness={0.9} roughness={0.3} />
        </mesh>
        <Flow pts={sg > 0 ? [[-0.75, 0.12, 0], [0.75, 0.12, 0]] : [[0.75, 0.12, 0], [-0.75, 0.12, 0]]} cur={(io) => io.p('current', 1)} n={7} r={0.045} />
      </group>
      <group><DynArrow gref={arr} /></group>
      <InkBox p={[0, 0.15, 2.1]} s={[1.0, 0.3, 0.5]} m={MAT.darkSteel} />
      <IoLabel p={[0, 0.7, 2.1]} size={0.2} get={(io) => `电源 · I = ${io.p('current', 1).toFixed(1)} A（${dirRev ? '←' : '→'}）`} />
      <IoLabel p={[0, 2.95, 0.4]} size={0.22} get={() => `磁场 ${upN ? '竖直向下（N 在上）' : '竖直向上（S 在上）'} · 电流 ${dirRev ? '向左' : '向右'} → 棒受力沿轨道`} />
    </group>
  );
}

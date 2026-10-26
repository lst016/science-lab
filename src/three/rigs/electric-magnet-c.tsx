import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, MAT, Tube, V3 } from '../kit';
import { CMagnet, DynArrow, Post3 } from './electric-magnet-parts';
import { MagnetBase, Y0 } from './electric-magnet-b';
import { Lamp } from './electric-parts';
import { IoLabel } from './parts';
import { Flow, InkBox } from './electric-wire';
import { RigIO, clamp, useOptIndex, useRig } from './io';

/* 电磁感应：导体棒切割磁感线 → 灵敏电流计；手摇发电机：线圈转动 → 灯与反向并联 LED。 */

const wireM = new THREE.MeshStandardMaterial({ color: '#c8402f', roughness: 0.55 });
const copper = new THREE.MeshStandardMaterial({ color: '#c8873a', metalness: 0.8, roughness: 0.35 });
const GX = 1.95; // 电流计位置

/** 灵敏电流计：零点在中间，指针左右偏。val(io) 为有符号电流 */
function Galvo({ val }: { val: (io: RigIO) => number }) {
  const needle = useRef<THREE.Group>(null);
  useRig((io) => {
    const a = io.damp('galvo', clamp(val(io) / 2, -1, 1) * 1.0, 10);
    if (needle.current) needle.current.rotation.y = -a;
  });
  return (
    <group position={[GX, 0, 0]}>
      <InkBox p={[0, 0.2, 0]} s={[0.7, 0.4, 1.0]} m={MAT.black} />
      <mesh position={[0, 0.405, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.34, 36]} /><meshBasicMaterial color="#f4efe0" /></mesh>
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => {
        const a = k * 0.33;
        return <Box key={k} p={[Math.sin(a) * 0.3, 0.412, 0.25 - Math.cos(a) * 0.3]} s={[0.012, 0.004, k === 0 ? 0.1 : 0.06]} m={MAT.black} rot={[0, -a, 0]} cast={false} />;
      })}
      <group ref={needle} position={[0, 0.42, 0.25]}>
        <Box p={[0, 0, -0.2]} s={[0.014, 0.01, 0.4]} m={MAT.red} cast={false} />
        <Cyl p={[0, 0, 0]} r={0.03} h={0.02} m={MAT.steel} />
      </group>
      {[-1, 1].map((s) => <Cyl key={s} p={[0, 0.46, 0.35 * s]} r={0.06} h={0.12} m={s > 0 ? MAT.red : MAT.black} />)}
      <IoLabel p={[0, 0.95, 0]} size={0.2} get={(io) => `灵敏电流计 ${val(io) > 0.01 ? '→偏右' : val(io) < -0.01 ? '←偏左' : '指零'}`} />
    </group>
  );
}

/** 棒沿 x 在竖直磁场中滑动；运动方向、速度、磁场方向决定电流计偏转。 */
export function Induction() {
  const upN = useOptIndex('field', 0) === 0;
  const motion = useOptIndex('motion', 0); // 0 左 1 右 2 静止
  const dir = motion === 0 ? -1 : motion === 1 ? 1 : 0;
  const rod = useRef<THREE.Group>(null), arr = useRef<THREE.Group>(null);
  const val = (io: RigIO) => {
    const d = io.ss('currentDirection', '');
    return (d.includes('反') ? -1 : d.includes('正') ? 1 : 0) * io.s('inducedCurrent', 0);
  };
  useRig((io) => {
    const v = io.p('speed', 1);
    const u = (v * 0.7 * io.t) % 2.0;
    const x = dir === 0 ? 0 : dir > 0 ? -1 + u : 1 - u;
    if (rod.current) rod.current.position.x = x;
    if (arr.current) {
      arr.current.visible = dir !== 0 && v > 0.01;
      arr.current.position.set(x, Y0 + 0.3, 0.75);
      arr.current.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      arr.current.scale.setScalar(0.5 + 0.4 * v);
    }
  });
  const zs = [-0.5, 0.5];
  const leadA = useMemo<V3[]>(() => [[1.5, Y0 - 0.07, 0.5], [1.5, 0.45, 0.5], [GX, 0.46, 0.35]], []);
  const leadB = useMemo<V3[]>(() => [[GX, 0.46, -0.35], [1.5, 0.45, -0.5], [1.5, Y0 - 0.07, -0.5]], []);
  return (
    <group>
      <MagnetBase />
      <CMagnet p={[0, Y0, 0]} upN={upN} />
      {zs.map((z) => (
        <group key={z}>
          <Tube pts={[[-1.5, Y0 - 0.07, z], [1.5, Y0 - 0.07, z]]} r={0.025} m={MAT.steel} />
          <Post3 p={[-1.5, 0, z]} h={Y0 - 0.1} />
        </group>
      ))}
      <Tube pts={leadA} r={0.025} m={wireM} cast={false} />
      <Tube pts={leadB} r={0.025} m={wireM} cast={false} />
      <Flow pts={leadA} cur={val} n={6} r={0.04} /><Flow pts={leadB} cur={val} n={6} r={0.04} />
      <group ref={rod} position={[0, Y0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 1.3, 16]} /><meshStandardMaterial color="#b9bec6" metalness={0.9} roughness={0.3} /></mesh>
        <Flow pts={[[0, 0.1, -0.55], [0, 0.1, 0.55]]} cur={val} n={5} r={0.04} />
      </group>
      <DynArrow gref={arr} color="#2f7d4f" />
      <Galvo val={val} />
      <IoLabel p={[0, 2.95, 0.4]} size={0.22} get={(io) => (dir === 0 ? '导体静止：不切割磁感线，电流计指零' : `导体${dir < 0 ? '向左' : '向右'}切割磁感线，v = ${io.p('speed', 1).toFixed(1)} m/s：速度越大偏转越大`)} />
    </group>
  );
}

/** 手摇发电机：摇柄带动线圈转动（慢放 ×0.35 示意），灯随输出亮，反向并联 LED 交替发光。 */
export function HandCrank() {
  const coil = useRef<THREE.Group>(null);
  const led = useRef<[THREE.MeshStandardMaterial | null, THREE.MeshStandardMaterial | null]>([null, null]);
  const st = useRef({ phi: 0, t: -1 });
  const lampLevel = (io: RigIO) => clamp(io.s('strength', 1) * 0.55 * (io.p('load', 1) > 0 ? 1 : 0.4), 0, 1.2);
  useRig((io) => {
    const s = st.current;
    if (io.t < s.t - 1e-6) s.phi = 0;
    const dt = clamp(io.t - s.t, 0, 0.05);
    s.t = io.t;
    s.phi += ((io.p('speed', 120) * Math.PI * 2) / 60) * 0.35 * dt;
    if (coil.current) coil.current.rotation.x = s.phi;
    const e = Math.sin(s.phi) * clamp(io.s('strength', 1) / 1.2, 0, 1);
    for (let i = 0; i < 2; i++) {
      const m = led.current[i];
      if (m) m.emissiveIntensity = Math.max(0, i === 0 ? e : -e) * 3;
    }
  });
  const loops = [0, 1, 2].map((k) => [[-0.6, (k - 1) * 0.045, -0.5], [0.6, (k - 1) * 0.045, -0.5], [0.6, (k - 1) * 0.045, 0.5], [-0.6, (k - 1) * 0.045, 0.5]] as V3[]);
  return (
    <group>
      <MagnetBase />
      <CMagnet p={[0, Y0, 0]} upN />
      <Post3 p={[-1.5, 0, 0]} h={Y0} /><Post3 p={[1.5, 0, 0]} h={Y0} />
      <group ref={coil} position={[0, Y0, 0]}>
        <Cyl r={0.03} h={3.4} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />
        {loops.map((pts, i) => <Tube key={i} pts={pts} r={0.022} m={copper} closed />)}
        {[0.95, 1.12].map((x) => <Cyl key={x} p={[x, 0, 0]} r={0.12} h={0.08} rot={[0, 0, Math.PI / 2]} m={MAT.brass} />)}
        <Box p={[-1.7, 0.3, 0]} s={[0.08, 0.6, 0.1]} m={MAT.red} />
        <Cyl p={[-1.8, 0.6, 0]} r={0.09} h={0.3} rot={[0, 0, Math.PI / 2]} m={MAT.darkWood} />
      </group>
      {[0.2, -0.2].map((y, i) => <InkBox key={i} p={[1.04, Y0 + y * 1.1, 0]} s={[0.12, 0.1, 0.16]} m={MAT.black} />)}
      <Tube pts={[[1.04, Y0 + 0.25, 0], [1.7, Y0 + 0.25, 0.3], [1.5, 0.45, 1.2]]} r={0.025} m={wireM} cast={false} />
      <Tube pts={[[1.04, Y0 - 0.25, 0], [1.3, Y0 - 0.25, 0.3], [1.0, 0.25, 1.3]]} r={0.025} m={wireM} cast={false} />
      <InkBox p={[0.4, 0.04, 1.4]} s={[3.0, 0.08, 0.9]} m={MAT.wood} />
      <Lamp p={[1.3, 0.08, 1.4]} level={lampLevel} tag="小灯泡" />
      {[0, 1].map((i) => (
        <group key={i} position={[-0.5 - i * 0.6, 0.08, 1.4]}>
          <Cyl p={[0, 0.06, 0]} r={0.11} h={0.12} m={MAT.black} />
          <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.12, 14, 10]} /><meshStandardMaterial ref={(m) => { led.current[i] = m; }} color={i === 0 ? '#e0554a' : '#4fbf6a'} emissive={i === 0 ? '#ff4030' : '#40ff70'} emissiveIntensity={0} transparent opacity={0.9} /></mesh>
        </group>
      ))}
      <IoLabel p={[-0.8, 0.85, 1.4]} size={0.18} get={() => '反向并联 LED（交替亮）'} />
      <IoLabel p={[0, 2.95, 0.4]} size={0.22} get={(io) => `转速 ${io.p('speed', 120).toFixed(0)} r/min（画面慢放）· 输出 ${(io.s('strength', 1) * 100).toFixed(0)}%${io.p('load', 1) === 0 ? ' · 无负载' : ''}`} />
    </group>
  );
}

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, MAT, V3, DUMMY, col } from '../kit';
import { IoLabel } from './parts';
import { RigIO, clamp, useRig } from './io';
import { InkBox, Post } from './electric-wire';

/* 定值电阻与滑动变阻器。 */

const BANDS = ['#7a4a24', '#2a2620', '#c8402f', '#d9a43a', '#4c8a55', '#3f6ea6'];

/** 色环电阻：热度 heat(io) 0..1 让瓷体泛红；两端接线点 x=±0.5。 */
export function Resistor({ p, ohms, heat, tag }: { p: V3; ohms: (io: RigIO) => number; heat?: (io: RigIO) => number; tag?: string }) {
  const body = useRef<THREE.MeshStandardMaterial>(null);
  useRig((io) => {
    if (body.current) {
      const h = heat ? clamp(heat(io), 0, 1) : 0;
      body.current.color.set('#e2d2ae').lerp(col('#e0613a'), h);
      body.current.emissive.set('#ff6a2a'); body.current.emissiveIntensity = h * 0.8;
    }
  });
  return (
    <group position={p}>
      <InkBox p={[0, 0.05, 0]} s={[1.0, 0.1, 0.4]} m={MAT.darkWood} />
      <Post p={[-0.42, 0.15, 0]} />
      <Post p={[0.42, 0.15, 0]} />
      <Cyl p={[0, 0.29, 0]} r={0.025} h={0.84} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />
      <mesh position={[0, 0.29, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.5, 20]} />
        <meshStandardMaterial ref={body} color="#e2d2ae" roughness={0.6} />
      </mesh>
      {[-0.14, -0.06, 0.02, 0.14].map((x, i) => (
        <mesh key={x} position={[x, 0.29, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.145, 0.145, 0.04, 20]} /><meshStandardMaterial color={BANDS[(i * 2 + 1) % BANDS.length]} roughness={0.6} /></mesh>
      ))}
      <IoLabel p={[0, 0.78, 0]} size={0.22} get={(io) => `${tag ?? 'R'} = ${ohms(io).toFixed(0)} Ω`} />
    </group>
  );
}

const TURNS = 26;

/**
 * 滑动变阻器：瓷筒绕电阻丝，上方金属杆与滑片。
 * 接线：右上 D（x=+1.0,y=.92）进、左下 A（x=-1.0,z=+.34）出；A 到滑片之间的线圈为有效段（亮铜色）。
 */
export const RHEO = { dX: 1.0, dY: 0.92, aX: -1.0, aY: 0.26, aZ: 0.34 };

export function Rheostat({ p, pos, tag }: { p: V3; pos: (io: RigIO) => number; tag?: (io: RigIO) => string }) {
  const coil = useRef<THREE.InstancedMesh>(null);
  const slide = useRef<THREE.Group>(null);
  const last = useRef(-1);
  const geo = useMemo(() => new THREE.TorusGeometry(0.19, 0.022, 6, 18), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.8 }), []);
  const on = useMemo(() => col('#e08a4a'), []);
  const off = useMemo(() => col('#6e5a48'), []);
  useRig((io) => {
    const f = io.damp('rheo-pos', clamp(pos(io), 0, 1), 12);
    if (slide.current) slide.current.position.x = -0.82 + f * 1.64;
    const m = coil.current;
    if (!m) return;
    const key = Math.round(f * 1000);
    if (key === last.current) return;
    last.current = key;
    for (let i = 0; i < TURNS; i++) {
      DUMMY.position.set(-0.82 + (i / (TURNS - 1)) * 1.64, 0.4, 0);
      DUMMY.rotation.set(0, Math.PI / 2, 0);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
      m.setColorAt(i, (i / (TURNS - 1)) <= f + 1e-3 ? on : off);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <group position={p}>
      <InkBox p={[0, 0.09, 0]} s={[2.3, 0.1, 0.8]} m={MAT.darkWood} />
      <Cyl p={[0, 0.4, 0]} r={0.17} h={1.7} rot={[0, 0, Math.PI / 2]} m={MAT.white} />
      <instancedMesh ref={coil} args={[geo, mat, TURNS]} castShadow />
      {[-1, 1].map((s) => <Box key={s} p={[s * 1.0, 0.5, 0]} s={[0.12, 0.8, 0.5]} m={MAT.darkSteel} />)}
      <Cyl p={[0, 0.8, 0]} r={0.03} h={2.0} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />
      <Post p={[RHEO.aX, 0.16, RHEO.aZ]} />
      <Post p={[1.0, 0.16, RHEO.aZ]} />
      <Post p={[-1.0, 0.86, 0]} />
      <Post p={[RHEO.dX, 0.86, 0]} />
      <group ref={slide} position={[0, 0, 0]}>
        <Box p={[0, 0.8, 0]} s={[0.18, 0.12, 0.2]} m={MAT.red} />
        <Cyl p={[0, 0.62, 0]} r={0.02} h={0.34} m={MAT.brass} />
        <Box p={[0, 0.9, 0]} s={[0.06, 0.1, 0.1]} m={MAT.black} />
      </group>
      <IoLabel p={[0, 1.38, 0]} size={0.22} get={(io) => tag?.(io) ?? `滑片 ${(pos(io) * 100).toFixed(0)}%`} />
    </group>
  );
}

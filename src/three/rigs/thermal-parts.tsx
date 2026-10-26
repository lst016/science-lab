import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, Label, MAT, Vessel, type V3, liquidMat } from '../kit';
import { clamp, mapRange, useRig, type RigIO } from './io';

const water = liquidMat('#72c5df', 0.66);
const warmWater = liquidMat('#e9a85f', 0.62);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 32).translate(0, 0.5, 0);

/** Model driven liquid volume, with its bottom fixed at p. */
export function Liquid({ p = [0, 0, 0], radius, depth, get, material = water }: { p?: V3; radius: number; depth: number; get: (io: RigIO) => number; material?: THREE.Material }) {
  const body = useRef<THREE.Mesh>(null);
  useRig((io) => {
    if (!body.current) return;
    const h = clamp(get(io), 0, 1) * depth;
    body.current.scale.set(radius, Math.max(0.001, h), radius);
    body.current.visible = h > 0.002;
  });
  return <mesh ref={body} position={p} geometry={unitCyl} material={material} renderOrder={1} />;
}

export function Beaker({ p = [0, 0, 0], r = 0.62, h = 1.55, level = 0.58, color = '#72c5df' }: { p?: V3; r?: number; h?: number; level?: number; color?: string }) {
  const mat = useMemo(() => liquidMat(color, 0.66), [color]);
  return <group position={p}><Vessel kind="beaker" r={r} h={h} /><Liquid p={[0, 0.05, 0]} radius={r * 0.91} depth={h * 0.82} get={() => level} material={mat} /></group>;
}

/** Thermometer with a dynamic red column and readable scale marks. */
export function Thermometer({ p = [0, 0, 0], h = 1.8, min = 0, max = 100, get, tilt = 0 }: { p?: V3; h?: number; min?: number; max?: number; get: (io: RigIO) => number; tilt?: number }) {
  const column = useRef<THREE.Mesh>(null);
  const bulb = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const f = clamp((get(io) - min) / (max - min), 0, 1);
    const len = 0.12 + f * (h - 0.38);
    if (column.current) { column.current.scale.y = len; column.current.position.y = 0.09 + len / 2; }
    if (bulb.current) bulb.current.position.y = 0.09;
  });
  return <group position={p} rotation={[0, 0, tilt]}>
    <Cyl p={[0, h / 2, 0]} r={0.055} h={h} m={MAT.glass} cast={false} />
    <mesh ref={column} position={[0, 0.16, 0.04]}><cylinderGeometry args={[0.022, 0.022, 1, 10]} /><meshBasicMaterial color="#d83b31" /></mesh>
    <mesh ref={bulb} position={[0, 0.09, 0.04]}><sphereGeometry args={[0.075, 16, 12]} /><meshBasicMaterial color="#d83b31" /></mesh>
    {Array.from({ length: 6 }, (_, i) => <Box key={i} p={[0.1, 0.18 + i * (h - 0.36) / 5, 0.04]} s={[i % 2 ? 0.09 : 0.14, 0.018, 0.025]} m={MAT.darkSteel} cast={false} />)}
  </group>;
}

export function Hotplate({ p = [0, 0, 0], on = true }: { p?: V3; on?: boolean }) {
  return <group position={p}>
    <Cyl p={[0, 0.13, 0]} r={0.48} h={0.24} m={MAT.darkSteel} />
    <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.34, 0.34, 0.035, 32]} /><meshStandardMaterial color={on ? '#d56c42' : '#61666b'} emissive={on ? '#8e2415' : '#000000'} emissiveIntensity={on ? 0.45 : 0} /></mesh>
    <Box p={[0.42, 0.16, 0]} s={[0.2, 0.16, 0.18]} m={MAT.black} />
  </group>;
}

export function Stand({ p = [0, 0, 0], h = 2.8, arm = 0.7 }: { p?: V3; h?: number; arm?: number }) {
  return <group position={p}><Box p={[0, 0.08, 0]} s={[0.9, 0.16, 0.62]} m={MAT.darkSteel} /><Cyl p={[0, h / 2, 0]} r={0.035} h={h} m={MAT.steel} /><Box p={[arm / 2, h - 0.12, 0]} s={[arm, 0.06, 0.06]} m={MAT.steel} /><Cyl p={[arm, h - 0.25, 0]} r={0.045} h={0.3} m={MAT.darkSteel} /></group>;
}

/** Small bubbles rise only when the model says the liquid is boiling. */
export function Bubbles({ p = [0, 0, 0], count = 10, active, spread = 0.38 }: { p?: V3; count?: number; active: (io: RigIO) => boolean; spread?: number }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const phases = useMemo(() => Array.from({ length: count }, (_, i) => (i * 0.6180339887) % 1), [count]);
  useRig((io) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const on = active(io);
      const ph = (io.t * (0.18 + (i % 4) * 0.035) + phases[i]) % 1;
      m.visible = on;
      m.position.set(Math.sin(i * 2.4) * spread * 0.55, 0.08 + ph * 1.05, Math.cos(i * 1.7) * spread * 0.55);
      m.scale.setScalar(0.65 + ph * 0.5);
    });
  });
  return <group position={p}>{Array.from({ length: count }, (_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} visible={false} material={MAT.glass}><sphereGeometry args={[0.045, 12, 10]} /></mesh>)}</group>;
}

export function Caption({ text, p = [0, 0.18, 1.55] }: { text: string; p?: V3 }) {
  return <Label text={text} p={p} size={0.22} />;
}

export { mapRange, clamp, warmWater };

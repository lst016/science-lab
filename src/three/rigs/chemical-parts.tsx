import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { useRig } from './io';

const COLORS: Record<string, string> = {
  clear: '#b9e5e8', colorless: '#b9e5e8', pink: '#e86c9c', red: '#d84e45', blue: '#438ac2',
  'blue-cloudy': '#438ac2', 'blue-fading': '#73a9c2', black: '#25252b', cloudy: '#b8b9aa',
  'pale-cloudy': '#d5d1b2', 'milky-white': '#eee9d8', milky: '#eee9d8', purple: '#9560ad', 'pale-yellow': '#e1d795',
  brown: '#a66b42', 'copper-red': '#b85b3d', white: '#e9e6dc', 'wet-white': '#ded8c9',
  'plant-acid-red': '#cb514e', gray: '#777873', none: '#b9e5e8',
};
export const chemColor = (name: string, fallback = '#b9e5e8') => COLORS[name] ?? fallback;

export function Flame({ p = [0, 0, 0], stateKey = 'flame', kind = 'fire' }: { p?: V3; stateKey?: string; kind?: 'fire'|'candle'|'sulfur'|'sparks'|'glow' }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff9a43', transparent: true, opacity: 0.86 }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useRig((io) => {
    if (!ref.current) return;
    const safeHydrogenBurning = stateKey === 'safeHydrogenBurning' && io.sb('pure', false) && io.ss('phase', '').includes('燃烧');
    const on = safeHydrogenBurning || (stateKey === 'heating' ? io.sb('heating', false) : io.sb(stateKey, false));
    const code = io.ss('flameColor', 'orange');
    const flameColor: Record<string, string> = { orange: '#ff9a43', 'blue-violet': '#6352c8', 'pale-blue': '#7caee5', extinguished: '#888782', 'red-hot': '#ef593c', none: '#ff9a43' };
    ref.current.visible = on;
    ref.current.scale.y = on ? 0.8 + Math.sin(io.t * 8) * 0.1 : 0.001;
    if (kind === 'sparks') ref.current.scale.set(0.5, on ? 0.16 : 0.001, 0.5);
    mat.color.set(flameColor[code] ?? (kind === 'sulfur' ? '#6352c8' : '#ff9a43'));
    if (kind === 'sparks') mat.color.set('#fff19a');
  });
  return <mesh ref={ref} position={p} visible={false} material={mat}><coneGeometry args={kind === 'candle' ? [0.075, 0.22, 14] : kind === 'sparks' ? [0.18, 0.11, 6] : [0.13, 0.42, 14]} /></mesh>;
}

export function Ember({ p, keyName = 'glowingSplint' }: { p: V3; keyName?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useRig((io) => { if (!ref.current) return; ref.current.visible = io.sb(keyName, false); const bright = io.ss('glow', '') === 'bright'; (ref.current.material as THREE.MeshBasicMaterial).color.set(bright ? '#fff2a0' : '#e88542'); });
  return <mesh ref={ref} position={p} visible={false}><sphereGeometry args={[0.065, 12, 10]} /><meshBasicMaterial color="#e88542" /></mesh>;
}

export function Candle({ p, stateKey = 'flame' }: { p: V3; stateKey?: string }) {
  return <group position={p}><Cyl p={[0, 0.24, 0]} r={0.11} h={0.48} m={MAT.white} /><Flame p={[0, 0.56, 0]} kind="candle" stateKey={stateKey} /></group>;
}

export function DynamicThermo({ p, h = 1.6, fallback = 20 }: { p: V3; h?: number; fallback?: number }) {
  const mercury = useRef<THREE.Mesh>(null);
  useRig((io) => {
    if (!mercury.current) return;
    const t = io.s('temperature', io.s('temperatureChange', fallback));
    const f = Math.max(0.08, Math.min(0.95, t / 100));
    mercury.current.scale.y = f * h;
    mercury.current.position.y = 0.13 + mercury.current.scale.y / 2;
  });
  return <group position={p}><Cyl p={[0, h / 2, 0]} r={0.045} h={h} m={MAT.glass} cast={false} /><Ball p={[0, 0.07, 0]} r={0.085} m={MAT.red} /><mesh ref={mercury} position={[0, 0.2, 0]}><cylinderGeometry args={[0.022, 0.022, 1, 10]} /><meshStandardMaterial color="#d23a2a" /></mesh></group>;
}

/** A vessel liquid whose fill, color and suspended solid follow the frozen simulator state. */
export function ReactiveVessel({ kind = 'beaker', p = [0, 0, 0], r = 0.54, h = 1.35, level = 0.36, liquid = 'clear', solid = false, mode = 'reactive' }: { kind?: 'beaker'|'tube'|'flask'|'jar'|'cylinder'|'round'; p?: V3; r?: number; h?: number; level?: number; liquid?: string; solid?: boolean; mode?: 'reactive'|'static' }) {
  const fluid = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b9e5e8', transparent: true, opacity: 0.78, roughness: 0.16, clearcoat: 0.6, depthWrite: false }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const solidRef = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const stateColor = mode === 'reactive' ? io.ss('liquidColor', liquid) : liquid;
    const waterState = io.exp.parameters.some((q) => q.key === 'water') ? io.s('water', -1) : -1;
    const waterMass = io.s('waterMass', -1);
    const amountState = io.s('waterVolume', io.s('volume', waterState));
    const amountParam = io.exp.family === 'acid-base' ? undefined : io.exp.parameters.find((q) => ['waterVolume', 'volume', 'water', 'amount', 'acid'].includes(q.key));
    const parameterLevel = amountParam ? (io.p(amountParam.key, amountParam.default) - amountParam.min) / Math.max(1, amountParam.max - amountParam.min) : -1;
    const normalizedAmount = mode === 'static' ? level : amountState >= 0 ? amountState / (amountState > 30 ? 100 : 10) : waterMass >= 0 ? waterMass / 100 : parameterLevel >= 0 ? parameterLevel : level;
    const fill = io.s('liquidLevel', io.s('level', normalizedAmount));
    const visible = stateColor !== 'none';
    if (fluid.current) {
      fluid.current.visible = visible;
      const liquidHeight = Math.max(0.025, Math.min(1, fill)) * h * 0.68;
      fluid.current.scale.y = liquidHeight;
      fluid.current.position.y = 0.04 + liquidHeight / 2;
      mat.color.set(chemColor(stateColor));
      mat.opacity = stateColor === 'clear' ? 0.36 : 0.8;
    }
    if (solidRef.current) {
      const pc = mode === 'reactive' ? io.ss('precipitateColor', 'none') : 'none';
      const powder = mode === 'reactive' ? io.s('undissolved', solid ? 0.45 : 0) : (solid ? 0.45 : 0);
      solidRef.current.visible = solid && (pc !== 'none' || powder > 0.02);
      const solidColor = pc !== 'none' ? pc : mode === 'reactive' ? io.ss('solidColor', 'white') : 'white';
      (solidRef.current.material as THREE.MeshStandardMaterial).color.set(chemColor(solidColor, '#438ac2'));
      solidRef.current.scale.y = 0.08 + Math.max(powder, io.s('precipitate', 0)) * 0.42;
    }
  });
  return <group position={p}>
    <Vessel kind={kind} r={r} h={h} level={0} />
    <mesh ref={fluid} position={[0, 0.035, 0]} material={mat} renderOrder={1}><cylinderGeometry args={[r * 0.91, r * 0.91, 1, 28]} /></mesh>
    {solid && <mesh ref={solidRef} position={[0, 0.08, 0]}><cylinderGeometry args={[r * 0.82, r * 0.82, 0.22, 24]} /><meshStandardMaterial color="#438ac2" roughness={0.72} /></mesh>}
  </group>;
}

/** Animated gas bubbles; movement uses frozen rig time and stays inside the stated vessel. */
export function GasBubbles({ p = [0, 0, 0], count = 12, color = '#e7fbff', spread = 0.28, height = 1 }: { p?: V3; count?: number; color?: string; spread?: number; height?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const bubbleMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.55, roughness: 0.08 }), [color]);
  useEffect(() => () => bubbleMaterial.dispose(), [bubbleMaterial]);
  useRig((io) => {
    const active = io.s('bubbles', 0) > 0 || io.s('gasVolume', 0) > 0;
    const rate = Math.max(0.25, io.s('bubbles', 0.35));
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = active;
      const phase = (io.t * (0.5 + rate) + i / count) % 1;
      m.position.set(Math.sin(i * 17.3) * spread * 0.7, 0.1 + phase * height, Math.cos(i * 11.7) * spread * 0.55);
      const s = 0.45 + phase * 0.9; m.scale.setScalar(s);
    });
  });
  return <group position={p}>{Array.from({ length: count }, (_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} visible={false}>
    <sphereGeometry args={[0.035, 10, 8]} /><primitive object={bubbleMaterial} attach="material" />
  </mesh>)}</group>;
}

export function Stand({ p = [-1.35, 0, -0.7], h = 2.9 }: { p?: V3; h?: number }) {
  return <group position={p}><Box p={[0, 0.08, 0]} s={[0.75, 0.16, 0.62]} m={MAT.darkSteel} /><Cyl p={[-0.13, h / 2, 0]} r={0.035} h={h} m={MAT.steel} /><Box p={[0.15, h * 0.68, 0]} s={[0.55, 0.07, 0.12]} m={MAT.darkSteel} /><Cyl p={[0.15, h * 0.68 - 0.1, 0]} r={0.04} h={0.35} m={MAT.steel} /></group>;
}

export function DrainCollection() {
  return <group><ReactiveVessel kind="beaker" p={[0.25, 0, 0.2]} r={0.52} h={1.05} level={0.52} liquid="#a8d9e8" mode="static" /><Vessel kind="jar" p={[1.4, 1.2, -0.1]} r={0.4} h={1.25} level={0.22} liquid="#b9e5e8" rot={[Math.PI, 0, 0]} /><Tube pts={[[0.05, 1.0, 0.2], [0.3, 1.22, 0.1], [0.95, 1.22, 0], [1.12, 1.15, -0.1]]} r={0.035} m={MAT.glass} /></group>;
}

export function DroppingSetup({ color = 'clear' }: { color?: string }) {
  return <group><Vessel kind="tube" p={[-0.7, 0.1, 0.15]} r={0.3} h={1.15} level={0.3} liquid={chemColor(color)} /><Cyl p={[-0.7, 1.36, 0.15]} r={0.045} h={0.44} m={MAT.rubber} /><Ball p={[-0.7, 1.61, 0.15]} r={0.1} m={MAT.rubber} /><Tube pts={[[-0.7, 1.16, 0.15], [-0.7, 0.96, 0.15]]} r={0.018} m={MAT.glass} /></group>;
}

export function MetalSamples({ p = [0, 0, 0], copper = false }: { p?: V3; copper?: boolean }) {
  return <group position={p}><Cyl p={[-0.35, 0.17, 0]} r={0.06} h={0.62} m={MAT.steel} rot={[0, 0, Math.PI / 2]} /><Cyl p={[0.35, 0.17, 0]} r={0.06} h={0.62} m={copper ? MAT.copper : MAT.brass} rot={[0, 0, Math.PI / 2]} /><Box p={[0, 0.04, 0]} s={[1.35, 0.08, 0.48]} m={MAT.wood} /></group>;
}

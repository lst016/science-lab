import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { Box, Cyl, Label, MAT, Rod, Vessel } from '../kit';
import { useRig } from './io';
import { IoLabel } from './parts';

/** 教材中特定器材和观察对象不可用通用反应装置替代。 */
export function SulfuricDehydrationRig({ exp }: { exp: Experiment }) {
  const patches = useRef<(THREE.Mesh | null)[]>([]);
  const marker = useRef<THREE.Group>(null);
  useRig((io) => {
    const selected = io.idx('material');
    patches.current.forEach((mesh, i) => { if (mesh) mesh.visible = io.sb('charred', false) && i === selected; });
    if (marker.current) marker.current.position.x = [-1.05, 0, 1.05][selected] ?? -1.05;
  });
  return <group>
    <Label text={exp.title} p={[0, 3.1, 0.4]} size={0.22} />
    <Label text="浓硫酸接触后的变化（示意）" p={[0, 2.72, 0.4]} size={0.18} />
    <Box p={[0, 0.1, 0]} s={[3.5, 0.18, 1.3]} m={MAT.white} />
    {[-1.05, 0, 1.05].map((x, i) => <group key={x} position={[x, 0.22, 0]}>
      <Box p={[0, 0.06, 0]} s={i === 1 ? [0.18, 0.12, 0.8] : [0.7, 0.08, 0.7]} m={i === 1 ? MAT.wood : MAT.card} />
      <mesh ref={(m) => { patches.current[i] = m; }} position={[0, 0.13, 0]} visible={false}><boxGeometry args={i === 1 ? [0.2, 0.03, 0.35] : [0.35, 0.03, 0.35]} /><meshStandardMaterial color="#27231e" roughness={0.95} /></mesh>
      <Label text={['纸','小木棍','布'][i]} p={[0, 0.35, 0.65]} size={0.17} />
    </group>)}
    <group ref={marker} position={[-1.05, 0, 0]}><Rod a={[0.42, 2.15, 0]} b={[0.05, 0.45, 0]} r={0.025} m={MAT.glass} /><Cyl p={[0.46, 2.2, 0]} r={0.09} h={0.25} m={MAT.rubber} /></group>
    <IoLabel get={(io) => io.sb('charred', false) ? '接触部位炭化变黑' : '选择材料后加入浓硫酸'} p={[0, 1.85, 0.45]} size={0.18} />
  </group>;
}

export function CopperConcentrationRig({ exp }: { exp: Experiment }) {
  const liquids = useRef<(THREE.Mesh | null)[]>([]);
  const indicator = useRef<THREE.Group>(null);
  useRig((io) => {
    const active = io.ss('phase', '') === '比较蓝色深浅';
    liquids.current.forEach((mesh, i) => { if (mesh) (mesh.material as THREE.MeshBasicMaterial).color.set(active ? ['#a5dae9', '#4fa5d0', '#1267ae'][i] : '#e5f0ef'); });
    if (indicator.current) indicator.current.position.x = [-1.1, 0, 1.1][io.idx('copperMass')] ?? -1.1;
  });
  return <group>
    <Label text={exp.title} p={[0, 3.1, 0.4]} size={0.22} />
    <Label text="等量水 · 不同硫酸铜用量" p={[0, 2.72, 0.4]} size={0.18} />
    {[-1.1, 0, 1.1].map((x, i) => <group key={x} position={[x, 0, 0]}>
      <Vessel kind="beaker" r={0.44} h={1.22} level={0} />
      <mesh ref={(m) => { liquids.current[i] = m; }} position={[0, 0.32, 0]}><cylinderGeometry args={[0.36, 0.36, 0.56, 24]} /><meshBasicMaterial color="#e5f0ef" transparent opacity={0.95} depthWrite={false} /></mesh>
      <Label text={['0.1 g','0.5 g','2 g'][i]} p={[0, 0.15, 0.7]} size={0.17} />
    </group>)}
    <group ref={indicator} position={[-1.1, 0, 0]}><Label text="↓" p={[0, 1.58, 0.45]} size={0.24} /></group>
    <IoLabel get={(io) => io.ss('phase', '') === '比较蓝色深浅' ? '比较三杯蓝色深浅' : '加入硫酸铜并溶解'} p={[0, 2, 0.45]} size={0.18} />
  </group>;
}

export function MetalActivityRig({ exp }: { exp: Experiment }) {
  const wire = useRef<THREE.Mesh>(null);
  const deposit = useRef<THREE.Mesh>(null);
  const liquid = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const pair = io.idx('pair'); const added = io.n('add') > 0 || io.n('run') > 0;
    const reacted = io.sb('reacted', false);
    if (wire.current) { wire.current.position.y = added ? 0.75 : 1.65; (wire.current.material as THREE.MeshStandardMaterial).color.set(pair === 0 ? '#b7bcc1' : '#b86c44'); }
    if (deposit.current) { deposit.current.visible = reacted; (deposit.current.material as THREE.MeshStandardMaterial).color.set(pair === 0 ? '#a75138' : '#d4d4cd'); }
    if (liquid.current) (liquid.current.material as THREE.MeshBasicMaterial).color.set(io.ss('liquidColor', 'clear') === 'blue' ? '#398fc4' : '#e0efec');
  });
  return <group>
    <Label text={exp.title} p={[0, 3.1, 0.4]} size={0.22} />
    <Vessel kind="tube" p={[0, 0, 0]} r={0.42} h={1.65} level={0.45} liquid="#e5f1f0" />
    <mesh ref={liquid} position={[0, 0.39, 0]}><cylinderGeometry args={[0.35, 0.35, 0.65, 24]} /><meshBasicMaterial color="#398fc4" transparent opacity={0.9} depthWrite={false} /></mesh>
    <mesh ref={wire} position={[0, 1.65, 0]}><cylinderGeometry args={[0.035, 0.035, 1.1, 12]} /><meshStandardMaterial color="#b7bcc1" metalness={0.7} /></mesh>
    <mesh ref={deposit} position={[0, 0.48, 0]} visible={false}><sphereGeometry args={[0.15, 8, 6]} /><meshStandardMaterial color="#a75138" roughness={0.8} /></mesh>
    <IoLabel get={(io) => io.ss('pair', io.opt('pair'))} p={[1.25, 1.35, 0.5]} size={0.16} />
    <IoLabel get={(io) => io.sb('reacted', false) ? '金属表面出现置换产物' : io.n('add') ? '该组合无置换现象' : '放入金属后观察'} p={[1.25, 1.0, 0.5]} size={0.16} />
  </group>;
}

export function WaterEthanolRig() {
  const lower = useRef<THREE.Mesh>(null);
  const upper = useRef<THREE.Mesh>(null);
  const mixed = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const combined = io.sb('miscible', false) && io.s('layers', 1) === 1;
    if (lower.current) lower.current.visible = !combined;
    if (upper.current) upper.current.visible = !combined && io.n('add') > 0;
    if (mixed.current) mixed.current.visible = combined;
  });
  return <group scale={1.55} position={[0, -0.2, 0]}>
    <Vessel kind="tube" p={[0, 0, 0]} r={0.48} h={1.8} level={0} />
    <mesh ref={lower} position={[0, 0.35, 0]}><cylinderGeometry args={[0.4, 0.4, 0.58, 24]} /><meshBasicMaterial color="#db6a76" transparent opacity={0.9} depthWrite={false} /></mesh>
    <mesh ref={upper} position={[0, 0.9, 0]}><cylinderGeometry args={[0.4, 0.4, 0.5, 24]} /><meshBasicMaterial color="#edf5f0" transparent opacity={0.8} depthWrite={false} /></mesh>
    <mesh ref={mixed} position={[0, 0.63, 0]} visible={false}><cylinderGeometry args={[0.4, 0.4, 1.08, 24]} /><meshBasicMaterial color="#e79ca0" transparent opacity={0.9} depthWrite={false} /></mesh>
  </group>;
}

export function AcidAppearanceRig({ exp }: { exp: Experiment }) {
  const cap = useRef<THREE.Group>(null);
  useRig((io) => { if (cap.current) cap.current.position.x = io.n('run') > 0 ? 0.9 : 0; });
  return <group>
    <Label text={exp.title} p={[0, 3, 0.4]} size={0.2} />
    <Vessel kind="jar" p={[0, 0, 0]} r={0.6} h={1.65} level={0.5} liquid="#e6f1ec" />
    <group ref={cap} position={[0, 1.68, 0]}><Cyl r={0.34} h={0.17} m={MAT.rubber} /></group>
    <AcidMist />
    <IoLabel get={(io) => io.opt('acid') + (io.sb('whiteMist', false) ? '：瓶口白雾' : io.n('run') > 0 ? '：已开瓶' : '：未开瓶')} p={[1.2, 1.2, 0.4]} size={0.17} />
  </group>;
}

function AcidMist() {
  const clouds = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => {
    const mist = io.sb('whiteMist', false);
    clouds.current.forEach((m, i) => { if (!m) return; m.visible = mist; if (mist) { const t = (io.t * 0.3 + i / 6) % 1; m.position.set((i % 2 ? 1 : -1) * 0.1 * t, 1.75 + t * 0.65, 0); m.scale.setScalar(0.5 + t); } });
  });
  return <group>{Array.from({length:6},(_,i)=><mesh key={i} ref={(m)=>{clouds.current[i]=m;}} visible={false}><sphereGeometry args={[0.19,10,8]} /><meshBasicMaterial color="#b9c7ca" transparent opacity={0.72} depthWrite={false} /></mesh>)}</group>;
}

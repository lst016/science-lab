import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { Box, Cyl, Label, MAT, Vessel } from '../kit';
import { Beaker, clamp } from './thermal-parts';
import { useRig, type RigIO } from './io';

function GasDiffusion() {
  const points = useMemo(() => Array.from({ length: 54 }, (_, i) => {
    const a = i * 2.39996;
    const u = ((i * 37) % 53) / 53;
    return { a, radius: 0.12 + 0.36 * Math.sqrt(u), y: ((i * 17) % 51) / 51, blue: i % 2 === 0, phase: i * 0.73 };
  }), []);
  const red = useRef<THREE.InstancedMesh>(null); const blue = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const sphere = useMemo(() => new THREE.SphereGeometry(0.055, 10, 8), []);
  const redMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b54f3a', roughness: 0.48 }), []);
  const blueMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7ab7ca', roughness: 0.48 }), []);
  useRig((io) => {
    const mix = clamp(io.s('spread', io.p('time', 20) / 60), 0, 1);
    const temp = io.p('temperature', 25);
    const speed = 0.16 + temp * 0.004;
    const rs: THREE.InstancedMesh | null = red.current, bs: THREE.InstancedMesh | null = blue.current;
    if (!rs || !bs) return;
    let ri = 0, bi = 0;
    points.forEach((pt) => {
      const bottomY = 0.22 + pt.y * 1.12;
      const y = pt.blue ? 1.75 + pt.y * 0.95 - mix * 1.35 : bottomY + mix * 2.35;
      const rad = pt.radius * (0.55 + mix * 0.45);
      dummy.position.set(Math.cos(pt.a + io.t * speed) * rad, y + Math.sin(io.t * speed + pt.phase) * 0.04, Math.sin(pt.a + io.t * speed) * rad);
      dummy.scale.setScalar(0.72 + 0.3 * (0.5 + 0.5 * Math.sin(io.t + pt.phase)));
      dummy.updateMatrix();
      if (pt.blue) { bs.setMatrixAt(bi++, dummy.matrix); } else { rs.setMatrixAt(ri++, dummy.matrix); }
    });
    rs.count = ri; bs.count = bi; rs.instanceMatrix.needsUpdate = true; bs.instanceMatrix.needsUpdate = true;
  });
  return <group>
    <Vessel kind="jar" p={[0, 0.12, 0]} r={0.76} h={1.38} />
    <Vessel kind="jar" p={[0, 1.62, 0]} r={0.76} h={1.38} />
    <Box p={[1.18, 1.5, 0]} s={[0.48, 0.06, 1.2]} m={MAT.glass} />
    <instancedMesh ref={red} args={[sphere, redMat, 27]} frustumCulled={false} />
    <instancedMesh ref={blue} args={[sphere, blueMat, 27]} frustumCulled={false} />
    <Label text="上层玻璃瓶" p={[0, 3.25, 0]} size={0.21} />
    <Label text="下层有色气体" p={[0, 0.25, 0.85]} size={0.2} />
    <Label text="抽去隔板后逐渐混合（示意）" p={[0, 3.55, 0]} size={0.19} />
  </group>;
}

function InkDiffusion() {
  const dots = useRef<Array<THREE.Mesh | null>>([]);
  const phases = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ a: i * 2.39996, r: ((i * 13) % 17) / 17, y: ((i * 7) % 11) / 11 })), []);
  const spread = (io: RigIO) => {
    const dt = io.p('time', 15), temp = io.p('temperature', 40);
    return clamp((dt / 60) * (1 + (temp - 20) / 100), 0.08, 1);
  };
  useRig((io) => {
    const f = spread(io);
    dots.current.forEach((m, i) => {
      if (!m) return;
      const q = phases[i]; const radius = 0.04 + f * 0.36 * q.r;
      const side = i < 9 ? -1.08 : 1.08;
      m.position.set(side + Math.cos(q.a + io.t * 0.15) * radius, 0.48 + q.y * 0.58, Math.sin(q.a + io.t * 0.15) * radius);
      m.scale.setScalar(0.7 + f * 0.65);
    });
  });
  return <group>
    <Beaker p={[-1.08, 0.15, 0]} r={0.63} h={1.45} level={0.68} color="#9ecfe2" />
    <Beaker p={[1.08, 0.15, 0]} r={0.63} h={1.45} level={0.68} color="#edb96a" />
    <Cyl p={[-1.08, 1.24, 0]} r={0.08} h={0.24} m={MAT.red} />
    <Cyl p={[1.08, 1.24, 0]} r={0.08} h={0.24} m={MAT.red} />
    {phases.map((_, i) => <mesh key={i} ref={(m) => { dots.current[i] = m; }}><sphereGeometry args={[0.04, 12, 10]} /><meshStandardMaterial color="#973a36" transparent opacity={0.75} /></mesh>)}
    <Label text="冷水" p={[-1.08, 1.8, 0.3]} size={0.22} />
    <Label text="热水" p={[1.08, 1.8, 0.3]} size={0.22} />
    <Label text="同量墨水滴入，热水中扩散通常较快" p={[0, 2.3, 0.2]} size={0.2} />
  </group>;
}

function LeadColumns() {
  const joint = useRef<THREE.Group>(null); const load = useRef<THREE.Group>(null);
  useRig((io) => {
    const contact = clamp(io.p('contact', 85), 0, 100);
    const gap = (100 - contact) * 0.003;
    if (joint.current) joint.current.position.y = 1.48 + gap;
    if (load.current) load.current.scale.setScalar(0.7 + clamp(io.p('load', 20) / 200, 0, 1) * 0.6);
  });
  return <group>
    <Cyl p={[-0.18, 0.8, 0]} r={0.19} h={1.35} m={MAT.darkSteel} />
    <group ref={joint} position={[0, 1.48, 0]}>
      <Cyl p={[0, 0.35, 0]} r={0.19} h={0.7} m={MAT.steel} />
      <Cyl p={[0, 0.72, 0]} r={0.2} h={0.035} m={MAT.brass} />
      <mesh position={[0, 0.72, 0]} material={MAT.brass}><torusGeometry args={[0.2, 0.018, 8, 28]} /></mesh>
    </group>
    <Cyl p={[-0.18, 0.08, 0]} r={0.3} h={0.16} m={MAT.darkSteel} />
    <group ref={load} position={[-0.18, 0, 0]}>
      {[0, 1, 2].map((i) => <Cyl key={i} p={[0, -0.18 - i * 0.18, 0]} r={0.22 - i * 0.025} h={0.14} m={MAT.brass} />)}
      <Cyl p={[0, -0.55, 0]} r={0.035} h={0.32} m={MAT.steel} />
      <mesh position={[0, -0.72, 0]} material={MAT.steel}><torusGeometry args={[0.11, 0.025, 8, 20]} /></mesh>
    </group>
    <Box p={[0, 0.08, 0]} s={[1.3, 0.16, 0.9]} m={MAT.darkSteel} />
    <Label text="磨平端面紧密接触" p={[0.7, 2.1, 0]} size={0.2} />
    <Label text="载荷作用于接合铅柱" p={[0.7, 1.75, 0]} size={0.19} />
  </group>;
}

export function ParticleRig({ exp }: { exp: Experiment }) {
  switch (exp.sceneVariant) {
    case 'gas-diffusion': return <GasDiffusion />;
    case 'ink-diffusion-temperature': return <InkDiffusion />;
    case 'lead-columns-attraction': return <LeadColumns />;
    default: return null;
  }
}

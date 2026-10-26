import { useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, MAT, Tube, Vessel } from '../kit';
import { IoLabel, Rings, Swarm } from './parts';
import { InkBox } from './electric-wire';
import { clamp, useRig } from './io';

/* 真空罩中的手机：罩内空气可抽走，外部发射塔的电磁波仍能穿过罩到达手机。 */

function Phone() {
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => {
    const sig = clamp(io.s('signal', io.p('signal', 70)) / 100, 0, 1);
    const pulse = 0.65 + 0.35 * Math.sin(io.t * 6);
    if (screen.current) { screen.current.emissive.set(sig > 0.04 ? '#35d07f' : '#223'); screen.current.emissiveIntensity = sig > 0.04 ? (0.5 + 0.8 * sig) * pulse : 0.15; }
    bars.current.forEach((b, i) => { if (b) (b.material as THREE.MeshBasicMaterial).color.set(sig * 4 > i + 0.2 ? '#ffffff' : '#3a4a44'); });
  });
  return (
    <group position={[0, 0.65, 0]} rotation={[-0.22, 0, 0]}>
      <InkBox p={[0, 0, 0]} s={[0.62, 1.1, 0.07]} m={MAT.black} />
      <mesh position={[0, 0, 0.037]}><planeGeometry args={[0.54, 0.96]} /><meshStandardMaterial ref={screen} color="#10241a" emissive="#35d07f" emissiveIntensity={0.5} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(m) => { bars.current[i] = m; }} position={[-0.12 + i * 0.075, 0.33 + i * 0.03, 0.04]}>
          <planeGeometry args={[0.045, 0.06 + i * 0.06]} /><meshBasicMaterial color="#fff" />
        </mesh>
      ))}
    </group>
  );
}

function Tower({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <InkBox p={[0, 0.1, 0]} s={[0.6, 0.2, 0.6]} m={MAT.darkWood} />
      <Cyl p={[0, 0.8, 0]} r={0.05} h={1.4} m={MAT.steel} />
      {[0.7, 1.0, 1.3].map((y, i) => <Box key={y} p={[0, y, 0]} s={[0.5 - i * 0.12, 0.03, 0.03]} m={MAT.steel} />)}
      <mesh position={[0, 1.55, 0]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#d6892f" emissive="#d6892f" emissiveIntensity={0.8} /></mesh>
    </group>
  );
}

export function PhoneVacuum() {
  return (
    <group>
      <Cyl p={[0, 0.07, 0]} r={1.35} h={0.14} m={MAT.darkSteel} />
      <Vessel kind="bell" r={1.1} h={2.2} p={[0, 0.14, 0]} />
      <Phone />
      <Swarm box={[1.7, 1.8, 1.7]} p={[0, 0.3, 0]} n={140} r={0.03} seed={5} count={(io) => (io.p('air', 100) / 100) * 140} jitter={(io) => 0.3 + io.p('air', 100) / 200} />
      <Tower x={-2.0} />
      <Rings p={[-2.0, 1.55, 0]} rot={[-Math.PI / 2, 0, 0]} amp={(io) => io.p('signal', 70) / 100} count={4} speed={0.35} maxR={3.0} color="#d6892f" />
      <InkBox p={[1.9, 0.2, 0.7]} s={[0.8, 0.4, 0.6]} m={MAT.darkSteel} />
      <Tube pts={[[1.2, 0.2, 0.05], [1.5, 0.2, 0.4], [1.55, 0.3, 0.7]]} r={0.04} m={MAT.black} cast={false} />
      <IoLabel p={[1.9, 0.8, 0.7]} size={0.2} get={(io) => `抽气泵 · 罩内空气 ${io.p('air', 100).toFixed(0)}%`} />
      <IoLabel p={[-2.0, 2.0, 0]} size={0.2} get={(io) => `外部呼叫信号 ${io.p('signal', 70).toFixed(0)}%`} />
      <IoLabel p={[0, 2.85, 0.3]} size={0.22} get={(io) => (io.p('signal', 70) < 1 ? '无外部信号：手机无显示' : io.p('air', 100) < 5 ? '罩内近真空，手机仍收到信号：电磁波不需要介质' : '电磁波穿过玻璃罩与空气到达手机')} />
    </group>
  );
}

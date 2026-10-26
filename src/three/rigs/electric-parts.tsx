import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, MAT, V3, col } from '../kit';
import { IoLabel } from './parts';
import { RigIO, clamp, useRig } from './io';
import { InkBox, Post } from './electric-wire';

/* 电学器材：电池组、灯座与灯泡、闸刀开关。
   所有器材沿 x 方向摆放，两端接线点在 x=±HALF 处（y=WIRE_Y 附近）。 */

let glowTex: THREE.CanvasTexture | null = null;
function glow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,236,170,1)');
  gr.addColorStop(0.35, 'rgba(255,205,110,0.55)');
  gr.addColorStop(1, 'rgba(255,190,80,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** 电池组：+ 端在右（+x），− 端在左；前侧小条显示电压占比。 */
export function Battery({ p, volts, maxV = 12, label = true }: { p: V3; volts: (io: RigIO) => number; maxV?: number; label?: boolean }) {
  const bar = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const f = clamp(volts(io) / maxV, 0.03, 1);
    if (bar.current) { bar.current.scale.x = f; bar.current.position.x = -0.55 + f * 0.55; }
  });
  return (
    <group position={p}>
      <InkBox p={[0, 0.2, 0]} s={[1.7, 0.32, 0.62]} m={MAT.darkSteel} />
      {[-0.4, 0.4].map((x) => <Cyl key={x} p={[x, 0.43, 0]} r={0.2} h={0.78} rot={[0, 0, Math.PI / 2]} m={MAT.green} />)}
      <Cyl p={[0, 0.43, 0]} r={0.205} h={0.05} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />
      <mesh position={[0, 0.2, 0.32]}><boxGeometry args={[1.1, 0.07, 0.01]} /><meshStandardMaterial color="#1b1c20" /></mesh>
      <mesh ref={bar} position={[0, 0.2, 0.327]}><boxGeometry args={[1.1, 0.05, 0.012]} /><meshBasicMaterial color="#f2b134" /></mesh>
      <Post p={[0.95, 0.12, 0]} color="red" />
      <Post p={[-0.95, 0.12, 0]} color="black" />
      {label && <IoLabel p={[0, 0.98, 0]} size={0.26} get={(io) => `电源 ${volts(io).toFixed(1)} V`} />}
    </group>
  );
}

/** 灯座+灯泡。level(io) 为亮度 0..1.3；超过 1 表示过亮。 */
export function Lamp({ p, level, tag, rated }: { p: V3; level: (io: RigIO) => number; tag?: string | ((io: RigIO) => string); rated?: string | ((io: RigIO) => string) }) {
  const fil = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.Sprite>(null);
  const glass = useRef<THREE.Mesh>(null);
  const warm = useMemo(() => col('#ffd37a'), []);
  useRig((io) => {
    const L = clamp(level(io), 0, 1.3);
    if (fil.current) { fil.current.emissive.copy(warm); fil.current.emissiveIntensity = L * 2.4; fil.current.color.set(L > 0.05 ? '#ffe9b0' : '#6b5a45'); }
    if (halo.current) { const m = halo.current.material as THREE.SpriteMaterial; m.opacity = clamp(L * 0.85, 0, 1); halo.current.scale.setScalar(0.5 + L * 1.1); halo.current.visible = L > 0.03; }
    if (glass.current) glass.current.scale.setScalar(1 + Math.max(0, L - 1) * 0.04);
  });
  return (
    <group position={p}>
      <InkBox p={[0, 0.08, 0]} s={[0.9, 0.16, 0.56]} m={MAT.wood} />
      <Cyl p={[0, 0.26, 0]} r={0.17} h={0.2} m={MAT.brass} />
      <Post p={[-0.36, 0.2, 0]} />
      <Post p={[0.36, 0.2, 0]} />
      <mesh ref={glass} position={[0, 0.62, 0]} material={MAT.glass} renderOrder={2}><sphereGeometry args={[0.3, 24, 18]} /></mesh>
      <Cyl p={[0, 0.42, 0]} r={0.09} h={0.12} m={MAT.glass} cast={false} />
      <mesh position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.1, 0.016, 6, 18, Math.PI * 1.5]} /><meshStandardMaterial ref={fil} color="#6b5a45" roughness={0.4} /></mesh>
      <Box p={[-0.05, 0.5, 0]} s={[0.012, 0.16, 0.012]} m={MAT.steel} cast={false} />
      <Box p={[0.05, 0.5, 0]} s={[0.012, 0.16, 0.012]} m={MAT.steel} cast={false} />
      <sprite ref={halo} position={[0, 0.62, 0]} renderOrder={5}>
        <spriteMaterial map={glow()} transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} opacity={0} />
      </sprite>
      {tag && <IoLabel p={[0, 1.12, 0]} size={0.22} get={(io) => (typeof tag === 'string' ? tag : tag(io))} />}
      {rated && <IoLabel p={[0, 0.04, 0.5]} size={0.17} get={(io) => (typeof rated === 'string' ? rated : rated(io))} bg="rgba(255,250,235,0.9)" color="#3a2e20" />}
    </group>
  );
}

/** 闸刀开关：closed 时刀片压入夹口，断开时绕铰链抬起，两者之间阻尼过渡。 */
export function Switch({ p, id, closed, tag }: { p: V3; id: string; closed: (io: RigIO) => boolean; tag?: string }) {
  const blade = useRef<THREE.Group>(null);
  useRig((io) => {
    const a = io.damp(`sw-${id}`, closed(io) ? 0 : 1.15, 14);
    if (blade.current) blade.current.rotation.z = a;
  });
  return (
    <group position={p}>
      <InkBox p={[0, 0.05, 0]} s={[1.0, 0.1, 0.46]} m={MAT.darkWood} />
      <Post p={[-0.38, 0.15, 0]} />
      <Box p={[0.38, 0.2, 0]} s={[0.1, 0.18, 0.2]} m={MAT.brass} />
      <Box p={[0.38, 0.25, 0.1]} s={[0.1, 0.12, 0.02]} m={MAT.brass} cast={false} />
      <group ref={blade} position={[-0.38, 0.26, 0]}>
        <Box p={[0.38, 0, 0]} s={[0.76, 0.03, 0.14]} m={MAT.steel} />
        <Box p={[0.72, 0.14, 0]} s={[0.1, 0.28, 0.12]} m={MAT.red} />
      </group>
      {tag && <IoLabel p={[0, 0.7, 0]} size={0.2} get={() => tag} />}
    </group>
  );
}

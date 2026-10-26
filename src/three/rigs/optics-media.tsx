import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, Label, MAT, V3, liquidMat } from '../kit';
import { IoLabel } from './parts';
import { RigIO, clamp, useOptIndex, useRig } from './io';
import { refract2 } from './ray2d';
import { AX, Beam, INK, LaserGun, Outline } from './optics-parts';

const rad = (d: number) => (d * Math.PI) / 180;
let protTex: THREE.CanvasTexture | null = null;
function protractorTexture(): THREE.CanvasTexture {
  if (protTex) return protTex;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const m = 256, R = 246;
  g.fillStyle = 'rgba(214,238,244,0.28)';
  g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.stroke();
  g.font = '600 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let a = -180; a < 180; a += 5) {
    const len = a % 30 === 0 ? 30 : a % 10 === 0 ? 20 : 11;
    const s = Math.sin(rad(a)), co = Math.cos(rad(a));
    g.lineWidth = a % 10 === 0 ? 2 : 1;
    g.beginPath(); g.moveTo(m + s * R, m - co * R); g.lineTo(m + s * (R - len), m - co * (R - len)); g.stroke();
    if (a % 30 === 0 && Math.abs(a) !== 180) g.fillText(String(Math.min(Math.abs(a), 180 - Math.abs(a)) === 0 ? 0 : Math.abs(a) <= 90 ? Math.abs(a) : 180 - Math.abs(a)), m + s * (R - 46), m - co * (R - 46));
  }
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(m, m - R); g.lineTo(m, m + R); g.stroke();
  protTex = new THREE.CanvasTexture(c);
  protTex.colorSpace = THREE.SRGBColorSpace;
  return protTex;
}

/** 量角器：画在 xy 平面，0° 在竖直法线方向；half 只画上半圆。 */
export function Protractor({ p, R = 1.1, half = false }: { p: V3; R?: number; half?: boolean }) {
  const tex = useMemo(protractorTexture, []);
  return (
    <mesh position={p} renderOrder={4}>
      <circleGeometry args={[R, 64, half ? 0 : 0, half ? Math.PI : Math.PI * 2]} />
      <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ---------- straight：激光穿过水槽 / 玻璃砖 ---------- */
export function Straight() {
  const med = useOptIndex('medium', 0);
  const gun = useRef<THREE.Group>(null);
  const info = (io: RigIO) => {
    const a = clamp(io.s('angle', io.p('angle', 25)), 0, 80);
    const n = io.s('refractiveIndex', med === 1 ? 1.5 : 1.33);
    const r = Math.asin(clamp(Math.sin(rad(a)) / n, -1, 1));
    return { a: rad(a), r, n };
  };
  const EY = AX + 0.55;
  useRig((io) => {
    const { a } = info(io);
    if (gun.current) { gun.current.position.set(-0.6 - 1.6 * Math.cos(a), EY + 1.6 * Math.sin(a), 0); gun.current.rotation.z = -a; }
  });
  const path = (io: RigIO): V3[] => {
    const { a, r } = info(io);
    const ey = EY - 1.2 * Math.tan(r);
    const exitY = Math.max(0.5, ey);
    const t = Math.sin(a) > 1e-3 ? Math.min(1.7, (exitY - 0.45) / Math.sin(a)) : 1.7;
    return [[-0.6 - 1.6 * Math.cos(a), EY + 1.6 * Math.sin(a), 0], [-0.6, EY, 0], [0.6, exitY, 0], [0.6 + t * Math.cos(a), exitY - t * Math.sin(a), 0]];
  };
  const normal = (x0: number, x1: number, at: (io: RigIO) => number) => (io: RigIO): V3[] => [[x0, at(io), 0], [x1, at(io), 0]];
  return (
    <group>
      <Box p={[0, 0.2, 0]} s={[3.6, 0.2, 1.3]} m={MAT.wood} />
      {med === 0 ? (
        <>
          <Box p={[0, 1.35, 0]} s={[1.28, 2.0, 0.96]} m={MAT.glass} cast={false} />
          <mesh position={[0, 1.15, 0]} material={liquidMat('#8fd0e4', 0.55)}><boxGeometry args={[1.2, 1.6, 0.88]} /></mesh>
          <Outline p={[0, 1.35, 0]} s={[1.28, 2.0, 0.96]} />
        </>
      ) : (
        <>
          <mesh position={[0, 1.35, 0]}><boxGeometry args={[1.2, 2.0, 0.9]} /><meshPhysicalMaterial color="#bfe4d6" transparent opacity={0.5} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
          <Outline p={[0, 1.35, 0]} s={[1.2, 2.0, 0.9]} />
        </>
      )}
      <LaserGun gref={gun} />
      <Beam segs={3} r={0.02} pulse get={path} color={(io) => (io.since('run') >= 0 && io.since('run') < 1.6 ? '#ff5a3a' : '#e8392b')} />
      <Beam segs={1} dash={8} r={0.011} color="#555" opacity={0.7} get={normal(-1.4, 0.2, () => EY)} />
      <Beam segs={1} dash={8} r={0.011} color="#555" opacity={0.7} get={(io) => { const y = path(io)[2][1]; return [[0.0, y, 0], [1.4, y, 0]]; }} />
      <Label p={[0, 0.7, 0.8]} text={med === 0 ? '水槽（水）' : '玻璃砖'} size={0.24} />
      <IoLabel p={[0, 3.3, 0]} size={0.26} get={(io) => { const { a, r } = info(io); return `入射角 ${(a * 180 / Math.PI).toFixed(0)}° → 介质内折射角 ${(r * 180 / Math.PI).toFixed(1)}°，介质内光线沿直线`; }} />
    </group>
  );
}

/* ---------- refraction：空气→水界面，量角器 + 法线 ---------- */
export function Refraction() {
  const gun = useRef<THREE.Group>(null);
  const water = useRef<THREE.Mesh>(null);
  const solve = (io: RigIO) => {
    const i = rad(clamp(io.s('angle', io.p('angle', 40)), 0, 85));
    const n2 = io.p('index', 1.33);
    const t = refract2([Math.sin(i), -Math.cos(i)], [0, 1], 1, n2);
    return { i, n2, t: t ?? [Math.sin(i), -Math.cos(i)] };
  };
  useRig((io) => {
    const { i, n2 } = solve(io);
    if (gun.current) { gun.current.position.set(-Math.sin(i) * 1.9, AX + Math.cos(i) * 1.9, 0); gun.current.rotation.z = i - Math.PI / 2; }
    if (water.current) (water.current.material as THREE.MeshPhysicalMaterial).color.set('#cfeaf2').lerp(new THREE.Color('#5b9ec4'), clamp((n2 - 1) / 0.6, 0, 1));
  });
  const inc = (io: RigIO): V3[] => { const { i } = solve(io); return [[-Math.sin(i) * 1.9, AX + Math.cos(i) * 1.9, 0], [0, AX, 0], [0, AX, 0]]; };
  const refr = (io: RigIO): V3[] => {
    const { t } = solve(io);
    const len = Math.min(1.6, t[1] < -1e-3 ? (AX - 0.45) / -t[1] : 1.6);
    return [[0, AX, 0], [t[0] * len, AX + t[1] * len, 0]];
  };
  return (
    <group>
      <Box p={[0, 0.2, 0]} s={[4.0, 0.2, 1.3]} m={MAT.wood} />
      <Box p={[0, (AX + 0.3) / 2, 0]} s={[3.7, AX - 0.3, 0.98]} m={MAT.glass} cast={false} />
      <mesh ref={water} position={[0, (AX + 0.3) / 2 - 0.02, 0]} material={liquidMat('#8fd0e4', 0.6)}><boxGeometry args={[3.62, AX - 0.34, 0.9]} /></mesh>
      <Outline p={[0, (AX + 0.3) / 2, 0]} s={[3.7, AX - 0.3, 0.98]} />
      <Protractor p={[0, AX, 0.5]} />
      <Beam segs={1} dash={18} r={0.011} color="#444" opacity={0.8} get={() => [[0, AX - 1.0, 0.02], [0, AX + 2.0, 0.02]]} />
      <LaserGun gref={gun} />
      <Beam segs={2} r={0.02} pulse get={(io) => { const p = inc(io); return [p[0], p[1]]; }} color={(io) => (io.since('run') >= 0 && io.since('run') < 1.6 ? '#ff5a3a' : '#e8392b')} />
      <Beam segs={1} r={0.02} get={refr} color="#e8392b" />
      <Beam segs={1} r={0.012} opacity={0.35} get={(io) => { const { i } = solve(io); return [[0, AX, 0], [Math.sin(i) * 1.5, AX + Math.cos(i) * 1.5, 0]]; }} color="#e8392b" />
      <Label p={[-1.5, AX + 0.25, 0.5]} text="空气" size={0.22} />
      <Label p={[-1.5, AX - 0.3, 0.5]} text="水 / 玻璃" size={0.22} />
      <IoLabel p={[0, 3.3, 0]} size={0.26} get={(io) => {
        const { i, t, n2 } = solve(io);
        const r = Math.atan2(Math.abs(t[0]), -t[1]) * 180 / Math.PI;
        return `入射角 ${(i * 180 / Math.PI).toFixed(0)}° → 折射角 ${r.toFixed(1)}°（n₂=${n2.toFixed(2)}）${i < 0.01 ? '，垂直入射方向不变' : ''}`;
      }} />
    </group>
  );
}

/* ---------- reflection：平面镜 + 量角器 + 可折转光屏 ---------- */
export function Reflection() {
  const gun = useRef<THREE.Group>(null);
  const half = useRef<THREE.Group>(null);
  const il = useRef<THREE.Group>(null);
  const rl = useRef<THREE.Group>(null);
  const ang = (io: RigIO) => rad(clamp(io.s('angle', io.p('angle', 35)), 0, 85));
  const mirror = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dfe6ea', metalness: 1, roughness: 0.06 }), []);
  useRig((io) => {
    const i = ang(io);
    if (gun.current) { gun.current.position.set(-Math.sin(i) * 1.8, AX + Math.cos(i) * 1.8, 0); gun.current.rotation.z = i - Math.PI / 2; }
    if (half.current) half.current.rotation.y = rad(io.p('screenFold', 0));
    if (il.current) il.current.position.set(-Math.sin(i) * 0.7 - 0.12, AX + Math.cos(i) * 0.7 + 0.1, 0.06);
    if (rl.current) rl.current.position.set(Math.sin(i) * 0.7 + 0.12, AX + Math.cos(i) * 0.7 + 0.1, 0.06);
  });
  const inc = (io: RigIO): V3[] => { const i = ang(io); return [[-Math.sin(i) * 1.8, AX + Math.cos(i) * 1.8, 0], [0, AX, 0]]; };
  const out = (io: RigIO): V3[] => { const i = ang(io); return [[0, AX, 0], [Math.sin(i) * 1.8, AX + Math.cos(i) * 1.8, 0]]; };
  const folded = (io: RigIO) => io.p('screenFold', 0) >= 3;
  return (
    <group>
      <Cyl p={[0, (AX - 0.12) / 2 + 0.05, 0]} r={0.28} h={AX - 0.12} m={MAT.darkSteel} />
      <Box p={[0, AX - 0.06, 0]} s={[3.0, 0.12, 0.9]} m={mirror} />
      <Outline p={[0, AX - 0.06, 0]} s={[3.0, 0.12, 0.9]} />
      <group position={[0, AX, -0.06]}>
        <Box p={[-0.7, 1.0, 0]} s={[1.4, 2.0, 0.04]} m={MAT.white} />
        <group ref={half}><Box p={[0.7, 1.0, 0]} s={[1.4, 2.0, 0.04]} m={MAT.card} /></group>
        <Cyl p={[0, 1.0, 0.0]} r={0.012} h={2.0} m={MAT.steel} />
      </group>
      <Protractor p={[0, AX, 0.05]} R={1.3} half />
      <Beam segs={1} dash={16} r={0.011} color="#444" opacity={0.85} get={() => [[0, AX, 0.03], [0, AX + 2.0, 0.03]]} />
      <LaserGun gref={gun} />
      <Beam segs={1} r={0.02} pulse get={inc} color={(io) => (io.since('run') >= 0 && io.since('run') < 1.6 ? '#ff5a3a' : '#e8392b')} />
      <Beam segs={1} r={0.02} get={out} color="#e8392b" show={(io) => !folded(io)} />
      <Beam segs={1} r={0.014} get={out} color="#a8a49a" opacity={0.5} show={folded} />
      <group ref={il}><Label text="i" size={0.22} /></group>
      <group ref={rl}><Label text="r" size={0.22} /></group>
      <Label p={[0, AX + 2.2, 0]} text="法线" size={0.2} />
      <IoLabel p={[0, 3.3, 0]} size={0.26} get={(io) => {
        const a = (ang(io) * 180 / Math.PI).toFixed(0);
        return folded(io) ? `右半屏折转 ${io.p('screenFold', 0).toFixed(0)}°：屏上看不到反射光，三线不共面` : `入射角 i = ${a}° = 反射角 r = ${io.s('reflectionAngle', Number(a)).toFixed(0)}°，三线在同一平面`;
      }} />
    </group>
  );
}

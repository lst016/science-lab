import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel } from '../kit';
import { Beaker, Bubbles, Hotplate, Liquid, Thermometer, clamp, mapRange } from './thermal-parts';
import { IoLabel } from './parts';
import { useRig } from './io';

function PressureDial({ p, get, min = 20, max = 110 }: { p: [number, number, number]; get: (io: Parameters<React.ComponentProps<typeof Thermometer>['get']>[0]) => number; min?: number; max?: number }) {
  const needle = useRef<THREE.Mesh>(null);
  useRig((io) => { if (needle.current) needle.current.rotation.z = mapRange(get(io), min, max, -1.15, 1.15); });
  return <group position={p}><Cyl r={0.27} h={0.1} rot={[Math.PI / 2, 0, 0]} m={MAT.white} /><mesh ref={needle} position={[0, 0, 0.07]}><boxGeometry args={[0.025, 0.2, 0.018]} /><meshStandardMaterial color="#c8402f" /></mesh></group>;
}

function Reboil() {
  return <group>
    <group position={[0, 2.5, 0]} rotation={[Math.PI, 0, 0]}>
      <Vessel kind="round" r={0.73} h={1.55} level={0.62} liquid="#83cadd" liquidOpacity={0.6} />
      <Cyl p={[0, 1.6, 0]} r={0.24} h={0.16} m={MAT.rubber} />
    </group>
    <Cyl p={[0, 0.55, 0]} r={1.0} h={0.12} m={MAT.blue} />
    <PressureDial p={[1.3, 1.55, 0.2]} get={(io) => io.p('pressure', 60)} min={20} max={101} />
    <Label text="冷水冷却瓶底" p={[0, 0.35, 1.25]} size={0.22} />
    <Bubbles p={[0, 1.4, 0]} active={(io) => io.sb('boiling', io.p('cooling', 60) > 20)} count={12} />
    <Label text="蒸气凝结 → 压强下降" p={[0, 3.35, 0]} size={0.22} />
  </group>;
}

function HomemadeThermometer() {
  const level = useRef<THREE.Mesh>(null);
  useRig((io) => {
    if (!level.current) return;
    const rise = io.s('columnHeight', (io.p('bathTemperature', 40) - 20) * 4 / Math.max(0.1, io.p('tubeDiameter', 2) ** 2));
    const h = mapRange(rise, -200, 120, 0.18, 1.35);
    level.current.scale.y = h; level.current.position.y = 1.37 + h / 2;
  });
  return <group>
    <Beaker p={[-1.25, 0.15, 0]} r={0.58} h={1.1} level={0.72} color="#e9a85f" />
    <Vessel kind="round" p={[0.35, 0.25, 0]} r={0.52} h={0.9} level={0.8} liquid="#e45d54" liquidOpacity={0.76} />
    <Cyl p={[0.35, 1.16, 0]} r={0.055} h={1.75} m={MAT.glass} cast={false} />
    <mesh ref={level} position={[0.35, 2, 0.035]}><cylinderGeometry args={[0.025, 0.025, 1, 12]} /><meshBasicMaterial color="#ce3730" /></mesh>
    {Array.from({ length: 7 }, (_, i) => <Box key={i} p={[0.46, 1.35 + i * 0.22, 0.04]} s={[0.12, 0.018, 0.02]} m={MAT.darkSteel} cast={false} />)}
    <Label text="冷热水浴" p={[-1.25, 1.48, 0]} size={0.2} />
    <Label text="有色液柱随温度升降" p={[0.75, 2.95, 0]} size={0.2} />
  </group>;
}

function ThermometerInWater() {
  const instrument = useRef<THREE.Group>(null);
  useRig((io) => { if (instrument.current) instrument.current.position.y = mapRange(io.p('depth', 80), 0, 100, -0.08, 0.7); });
  return <group>
    <Beaker p={[-0.65, 0.12, 0]} r={0.85} h={1.55} level={0.58} />
    <group ref={instrument} position={[0, 0.45, 0]}><Thermometer p={[0.05, 0, 0.25]} h={2.1} get={(io) => io.s('temperature', io.p('temperature', 35))} /></group>
    <Label text="玻璃泡浸入水中" p={[0.05, 2.8, 0.25]} size={0.2} />
    <Label text="温度读数" p={[0.05, 3.12, 0.25]} size={0.18} />
  </group>;
}

function Melting() {
  const solid = useRef<THREE.Mesh>(null);
  useRig((io) => {
    if (!solid.current) return;
    const f = clamp(io.s('meltFraction', io.p('time', 0) / 300), 0, 1);
    const material = solid.current.material as THREE.MeshStandardMaterial;
    solid.current.scale.y = Math.max(0.025, 0.28 * (1 - f));
    const wax = io.opt('material').includes('石蜡');
    solid.current.scale.x = wax ? 0.88 : 1;
    solid.current.scale.z = wax ? 0.88 : 1;
    material.color.set(wax ? '#ead39a' : '#f1d68c');
    solid.current.position.y = 0.11 + solid.current.scale.y / 2;
  });
  return <group>
    <Beaker p={[-0.55, 0.12, 0]} r={0.86} h={1.55} level={0.72} />
    <Vessel kind="tube" p={[-0.55, 0.23, 0]} r={0.25} h={1.45} />
    <mesh ref={solid} position={[-0.55, 0.25, 0]}><cylinderGeometry args={[0.19, 0.2, 0.28, 18]} /><meshStandardMaterial color="#f1d68c" roughness={0.52} /></mesh>
    <Thermometer p={[0.3, 0.45, 0.2]} h={1.85} min={20} max={80} get={(io) => io.s('temperature', 20)} />
    <Hotplate p={[-0.55, 0, 0]} />
    <Label text="水浴：海波平台 / 石蜡渐熔" p={[0, 3.1, 0.2]} size={0.2} />
  </group>;
}

function Boiling() {
  return <group>
    <Hotplate p={[-0.3, 0, 0]} />
    <Beaker p={[-0.3, 0.22, 0]} r={0.82} h={1.65} level={0.7} />
    <Thermometer p={[0.55, 0.42, 0.18]} h={2.05} min={20} max={110} get={(io) => io.s('temperature', 20)} />
    <Bubbles p={[-0.3, 0.45, 0]} active={(io) => io.sb('boiling', false) || io.s('temperature', 20) >= io.s('boilingPoint', 100)} count={16} />
    <Label text="加热升温 → 沸腾平台" p={[0, 3.25, 0.2]} size={0.2} />
  </group>;
}

function EvaporationCooling() {
  const fan = useRef<THREE.Group>(null); const cotton = useRef<THREE.Group>(null);
  useRig((io) => {
    const alcohol = io.p('alcohol', 80);
    if (fan.current) fan.current.rotation.y = Math.sin(io.t * 5) * 0.18 * io.p('airflow', 2);
    if (cotton.current) { cotton.current.visible = alcohol > 0; cotton.current.scale.setScalar(0.65 + alcohol / 100 * 0.45); }
  });
  return <group>
    <Thermometer p={[-0.25, 0.25, 0]} h={2.3} min={10} max={30} get={(io) => io.s('temperature', 19)} />
    <group ref={cotton} position={[-0.25, 0.45, 0]}><Ball r={0.17} m={MAT.white} /><Ball p={[0, 0.08, 0.07]} r={0.13} m={MAT.card} /></group>
    <group ref={fan} position={[1, 1.1, 0.35]}>
      <Cyl p={[0, 0, 0]} r={0.07} h={0.2} rot={[Math.PI / 2, 0, 0]} m={MAT.steel} />
      {[0, 1, 2, 3].map((i) => <Box key={i} p={[0, 0.38, 0]} s={[0.13, 0.72, 0.06]} rot={[0, 0, i * Math.PI / 2]} m={MAT.plastic} />)}
    </group>
    <Label text="酒精棉球" p={[-0.25, 0.25, 0.5]} size={0.2} />
    <Label text="气流加快蒸发吸热" p={[1, 2.05, 0.2]} size={0.2} />
  </group>;
}

function Kitchen() {
  const vapour = useRef<THREE.Group>(null); const droplets = useRef<THREE.Group>(null);
  useRig((io) => {
    const topic = io.opt('topic');
    if (vapour.current) vapour.current.visible = topic.includes('蒸发');
    if (droplets.current) droplets.current.visible = topic.includes('凝结');
  });
  return <group>
    <Beaker p={[-1.15, 0.15, 0]} r={0.62} h={1.35} level={0.55} />
    <Vessel kind="bell" p={[0.75, 0.25, 0]} r={0.65} h={1.65} />
    <Liquid p={[0.75, 0.3, 0]} radius={0.57} depth={0.8} get={() => 0.45} />
    <Thermometer p={[-0.2, 0.4, 0.25]} h={2.0} min={0} max={100} get={(io) => io.s('temperature', io.p('temperature', 25))} />
    <Hotplate p={[-1.15, 0, 0]} />
    <group ref={vapour} position={[-1.15, 1.55, 0]}>{[-0.3, 0, 0.3].map((x) => <Ball key={x} p={[x, 0.22 + Math.abs(x) * 0.2, 0]} r={0.075} m={MAT.glass} />)}</group>
    <group ref={droplets} position={[0.75, 2.15, 0.58]}>{[-0.28, 0, 0.28].map((x) => <Ball key={x} p={[x, -0.12 + Math.abs(x) * 0.15, 0]} r={0.055} m={MAT.blue} />)}</group>
    <Label text="蒸发：表面与气流" p={[-1.1, 2.85, 0]} size={0.2} />
    <Label text="沸腾 / 冷凝观察罩" p={[0.8, 2.85, 0]} size={0.2} />
    <Bubbles p={[-1.15, 0.5, 0]} active={(io) => io.opt('topic').includes('沸腾')} count={8} />
  </group>;
}

function SpecificHeat() {
  const oil = (io: Parameters<React.ComponentProps<typeof Thermometer>['get']>[0]) => 20 + io.p('power', 50) * io.p('time', 120) / (io.p('mass', 200) / 1000 * 2000);
  const water = (io: Parameters<React.ComponentProps<typeof Thermometer>['get']>[0]) => 20 + io.p('power', 50) * io.p('time', 120) / (io.p('mass', 200) / 1000 * 4200);
  return <group>
    {[-1.05, 1.05].map((x, i) => <group key={x}>
      <Hotplate p={[x, 0, 0]} />
      <Beaker p={[x, 0.22, 0]} r={0.58} h={1.35} level={0.62} color={i ? '#dfaa58' : '#72c5df'} />
      <Thermometer p={[x + 0.53, 0.38, 0.18]} h={1.75} min={20} max={70} get={i ? oil : water} />
      <Label text={i ? '食用油' : '水'} p={[x, 1.95, 0.45]} size={0.22} />
    </group>)}
    <Label text="等质量 · 同功率 · 同时加热" p={[0, 3.25, 0.3]} size={0.21} />
    <IoLabel get={(io) => `模型所选液体：${io.ss('liquid', io.opt('liquid') || '水')}`} p={[0, 2.9, 0.3]} size={0.19} />
  </group>;
}

function Compression() {
  const piston = useRef<THREE.Mesh>(null);
  useRig((io) => { if (piston.current) piston.current.position.y = 2.7 - io.p('compression', 5) * 0.13; });
  return <group>
    <Vessel kind="cylinder" p={[-0.65, 0.35, 0]} r={0.55} h={2.25} />
    <Cyl p={[-0.65, 0.5, 0]} r={0.48} h={0.28} m={MAT.blue} />
    <mesh ref={piston} position={[-0.65, 2.1, 0]}><cylinderGeometry args={[0.48, 0.48, 0.16, 28]} /><meshStandardMaterial color="#9da5ac" metalness={0.7} roughness={0.3} /></mesh>
    <Cyl p={[-0.65, 2.65, 0]} r={0.07} h={0.85} m={MAT.steel} />
    <PressureDial p={[0.75, 1.15, 0.3]} get={(io) => io.p('pressure', 101)} min={90} max={110} />
    <Thermometer p={[0.75, 0.2, -0.3]} h={1.45} min={20} max={40} get={(io) => io.s('temperature', 30)} />
    <Label text="压缩做功 → 气体内能增加" p={[0.35, 2.2, 0.2]} size={0.21} />
    <Label text="活塞行程随压缩量变化" p={[0.35, 1.8, 0.2]} size={0.18} />
  </group>;
}

function SteamWork() {
  const plug = useRef<THREE.Group>(null);
  useRig((io) => { if (plug.current) plug.current.position.y = 2.2 + clamp(io.s('pistonMotion', io.p('heating', 3) * io.p('water', 4)), 0, 50) * 0.018; });
  return <group>
    <Vessel kind="tube" p={[-0.3, 0.25, 0]} r={0.43} h={1.95} />
    <Cyl p={[-0.3, 0.33, 0]} r={0.38} h={0.2} m={MAT.blue} />
    <Hotplate p={[-0.3, 0, 0]} />
    <group ref={plug} position={[-0.3, 2.2, 0]}><Cyl p={[0, 0, 0]} r={0.32} h={0.18} m={MAT.rubber} /><Cyl p={[0, 0.42, 0]} r={0.045} h={0.7} m={MAT.steel} /></group>
    <Label text="水蒸气推动松置橡胶塞" p={[0.75, 2.75, 0]} size={0.21} />
  </group>;
}

function Joule({ currentMode }: { currentMode: boolean }) {
  const left = useRef<THREE.Mesh>(null); const right = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const t = io.p('time', 30), R = io.p('resistance', 10), I = io.p('current', 0.4);
    const q1 = I * I * (currentMode ? R : R * 0.65) * t;
    const q2 = I * I * (currentMode ? R * 0.4 : R * 1.35) * t;
    if (left.current) { const h = 0.18 + clamp(q1 / 25000, 0, 0.5); left.current.scale.y = h; left.current.position.y = 0.45 + h / 2; }
    if (right.current) { const h = 0.18 + clamp(q2 / 25000, 0, 0.5); right.current.scale.y = h; right.current.position.y = 0.45 + h / 2; }
  });
  return <group>
    {[-0.9, 0.9].map((x, i) => <group key={x}>
      <Box p={[x, 1.05, 0]} s={[0.8, 1.75, 0.65]} m={MAT.glass} cast={false} />
      <Cyl p={[x, 0.25, 0]} r={0.18} h={0.5} m={MAT.blue} />
      <Cyl p={[x, 1.5, 0]} r={0.045} h={0.72} m={MAT.darkSteel} />
      <Cyl p={[x, 1.5, 0]} r={0.26} h={0.045} m={MAT.copper} />
      <Cyl p={[x, 2.35, 0]} r={0.28} h={0.08} m={MAT.glass} />
      <Cyl p={[x - 0.16, 0.8, 0.38]} r={0.032} h={0.7} m={MAT.glass} cast={false} />
      <Cyl p={[x + 0.16, 0.8, 0.38]} r={0.032} h={0.7} m={MAT.glass} cast={false} />
      <Cyl p={[x, 0.47, 0.38]} r={0.032} h={0.32} rot={[0, 0, Math.PI / 2]} m={MAT.glass} cast={false} />
      <mesh ref={i ? right : left} position={[x - 0.16, 0.55, 0.38]}><cylinderGeometry args={[0.018, 0.018, 1, 8]} /><meshStandardMaterial color="#4f9cbb" /></mesh>
    </group>)}
    <Box p={[0, 2.65, 0]} s={[2.55, 0.1, 0.8]} m={MAT.steel} />
    <Cyl p={[0, 2.48, 0.52]} r={0.22} h={0.16} m={MAT.black} />
    <Tube pts={[[-0.12, 2.48, 0.54], [-0.42, 2.24, 0.52], [-0.9, 2.1, 0.48], [-0.9, 1.88, 0.38]]} r={0.025} m={MAT.copper} />
    <Tube pts={[[0.12, 2.48, 0.54], [0.42, 2.24, 0.52], [0.9, 2.1, 0.48], [0.9, 1.88, 0.38]]} r={0.025} m={MAT.copper} />
    <Tube pts={[[-0.9, 0.25, 0.42], [-0.55, 0.14, 0.48], [0, 0.14, 0.5], [0.55, 0.14, 0.48], [0.9, 0.25, 0.42]]} r={0.022} m={MAT.copper} />
    <Label text={currentMode ? '电流不同：同电阻丝' : '电阻不同：串联同电流'} p={[0, 3.25, 0.3]} size={0.2} />
    <Label text="通电电阻丝 · U形压强液柱" p={[0, 0.2, 1.25]} size={0.19} />
  </group>;
}

export function HeatRig({ exp }: { exp: Experiment }) {
  switch (exp.sceneVariant) {
    case 'reboil': return <Reboil />;
    case 'homemade-liquid-thermometer': return <HomemadeThermometer />;
    case 'thermometer': return <ThermometerInWater />;
    case 'melting': return <Melting />;
    case 'boiling': return <Boiling />;
    case 'evaporation-cooling': return <EvaporationCooling />;
    case 'kitchen-phase-change-project': return <Kitchen />;
    case 'specific-heat-comparison': return <SpecificHeat />;
    case 'compression-and-expansion': return <Compression />;
    case 'steam-work': return <SteamWork />;
    case 'joule-resistance': return <Joule currentMode={false} />;
    case 'joule-current': return <Joule currentMode />;
    default: return null;
  }
}

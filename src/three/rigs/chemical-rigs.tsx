import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { useRig } from './io';
import { IoLabel } from './parts';
import { Candle, chemColor, DrainCollection, DroppingSetup, DynamicThermo, Ember, Flame, GasBubbles, MetalSamples, ReactiveVessel, Stand } from './chemical-parts';

function Heading({ exp, note }: { exp: Experiment; note?: string }) {
  return <group><Label text={exp.title.slice(0, 15)} p={[0, 3.45, 0.55]} size={0.24} /><Label text={note ?? exp.equipment.slice(0, 2).join(' · ')} p={[0, 3.1, 0.55]} size={0.19} color="#6b553c" /></group>;
}

function GasRig({ exp }: { exp: Experiment }) {
  const v = exp.sceneVariant;
  const collects = /collection|preparation|apparatus-design|supply-device|peroxide|permanganate/.test(v);
  const co2 = /co2|carbonate|marble|soda-acid/.test(v);
  if (v === 'permanganate-water-collection') return <PermanganateRig exp={exp} />;
  if (v === 'peroxide-catalyst') return <PeroxideRig exp={exp} />;
  if (v === 'co2-extinguishes-candles') return <CO2Candles exp={exp} />;
  if (v === 'co2-apparatus-design' || v === 'co2-preparation-properties-practical' || v === 'carbonate-acid-limewater') return <CO2PrepRig exp={exp} />;
  if (v === 'marble-acid-open-tube' || v === 'carbonate-powder-acid') return <OpenTubeGasRig exp={exp} />;
  if (v === 'co2-bottle-pressure') return <CO2BottleRig exp={exp} />;
  return <group>
    <Heading exp={exp} note={collects ? '发生 · 导气 · 收集' : '气体性质与检验'} />
    {collects ? <><Stand p={[-1.4, 0, -0.5]} h={2.65} /><ReactiveVessel kind="flask" p={[-1.15, 0.18, -0.25]} r={0.47} h={1.24} liquid="clear" /><Tube pts={[[-1.15, 1.3, -0.25], [-0.8, 1.72, -0.25], [0.25, 1.72, -0.25], [0.75, 1.0, -0.25]]} r={0.045} m={MAT.glass} /><DrainCollection /><GasBubbles p={[-1.15, 0.42, -0.25]} count={10} height={0.65} />{/permanganate|heating|oxygen-preparation/.test(v) && <><AlcoholLamp p={[-1.15, 0, 0.5]} flame={0} /><Flame p={[-1.15, 0.75, 0.5]} stateKey="heating" /></>}</> : <><ReactiveVessel kind="jar" p={[-0.8, 0, 0]} r={0.56} h={1.7} level={0.2} liquid="clear" mode="static" /><ReactiveVessel kind="beaker" p={[1.0, 0, 0]} r={0.48} h={1.2} liquid={co2 ? 'milky-white' : 'clear'} solid={co2} /><Tube pts={[[-0.25, 0.9, 0], [0.2, 1.15, 0], [0.55, 0.8, 0]]} r={0.035} m={MAT.glass} /><GasBubbles p={[0.68, 0.32, 0]} count={9} height={0.55} /></>}
    {/splint|glowing/.test(v) && <><Rod a={[-0.8, 1.25, 0.45]} b={[-0.8, 1.85, 0.45]} r={0.035} m={MAT.wood} /><Ember p={[-0.8, 1.88, 0.45]} /></>}
  </group>;
}

function OpenTubeGasRig({ exp }: { exp: Experiment }) {
  return <group><Heading exp={exp} note="敞口试管 · 滴加稀酸 · 观察气泡" /><Stand p={[-0.75, 0, -0.25]} h={2.3} /><ReactiveVessel kind="tube" p={[-0.45, 0.1, 0]} r={0.32} h={1.35} level={0.32} liquid="clear" solid /><Cyl p={[0.7, 1.25, 0]} r={0.05} h={0.42} m={MAT.rubber} /><Tube pts={[[0.7, 1.05, 0], [0.7, 0.83, 0]]} r={0.02} m={MAT.glass} /><Ball p={[0.7, 1.52, 0]} r={0.12} m={MAT.rubber} /><GasBubbles p={[-0.45, 0.35, 0]} count={9} height={0.75} /><Label text="不收集 · 观察反应产气" p={[0.35, 2.0, 0.35]} size={0.2} /></group>;
}

function CO2BottleRig({ exp }: { exp: Experiment }) {
  const bottle = useRef<THREE.Group>(null);
  useRig((io) => { if (bottle.current) bottle.current.scale.x = 1 - io.s('bottleDeformation', 0) * 0.23; });
  return <group><Heading exp={exp} note="振荡 · CO₂溶于水 · 软瓶凹陷" /><group ref={bottle} position={[-0.6, 0.55, 0]}><Vessel kind="jar" p={[0, 0, 0]} r={0.55} h={1.4} level={0.28} liquid="#b9e5e8" /><Cyl p={[0, 1.42, 0]} r={0.13} h={0.12} m={MAT.rubber} /></group><Tube pts={[[0.05, 1.7, 0], [0.7, 1.7, 0], [1.0, 1.1, 0]]} r={0.035} m={MAT.glass} /><Label text="形变按模型作定性示意" p={[0.25, 2.1, 0.35]} size={0.19} /></group>;
}

function CO2PrepRig({ exp }: { exp: Experiment }) {
  return <group><Heading exp={exp} note="碳酸盐与稀酸 · 常温制 CO₂" /><Stand p={[-1.3, 0, -0.35]} h={2.55} /><ReactiveVessel kind="flask" p={[-1.0, 0.05, 0]} r={0.48} h={1.32} liquid="clear" mode="static" /><Cyl p={[-1.0, 1.42, 0]} r={0.11} h={0.18} m={MAT.rubber} /><Tube pts={[[-1.0, 1.5, 0], [-0.54, 1.68, 0], [0.38, 1.68, 0], [0.88, 1.05, 0]]} r={0.045} m={MAT.glass} /><Vessel kind="jar" p={[0.92, 0, 0]} r={0.42} h={1.45} level={0.06} liquid="#d7e9ee" /><ReactiveVessel p={[1.72, 0, 0.18]} r={0.32} h={0.86} liquid="clear" mode="static" /><Tube pts={[[1.2, 0.82, 0], [1.48, 0.82, 0.08]]} r={0.035} m={MAT.glass} /><GasBubbles p={[-1.0, 0.32, 0]} count={10} height={0.7} /><Label text="不加热 · 向上排空气" p={[0, 2.2, 0.4]} size={0.2} /></group>;
}

function PermanganateRig({ exp }: { exp: Experiment }) {
  return <group><Heading exp={exp} note="高锰酸钾试管加热 · 排水集气" /><Stand p={[-1.45, 0, -0.45]} h={2.7} /><Vessel kind="tube" p={[-0.95, 0.95, 0]} r={0.28} h={1.05} level={0} rot={[0, 0, -0.22]} /><Ball p={[-1.07, 0.45, 0]} r={0.12} m={MAT.brass} /><Cyl p={[-0.82, 1.62, 0]} r={0.04} h={0.35} m={MAT.rubber} rot={[0, 0, -0.22]} /><Tube pts={[[-0.68, 1.55, 0], [-0.35, 1.8, 0], [0.4, 1.8, 0], [0.8, 1.1, 0]]} r={0.04} m={MAT.glass} /><Vessel kind="beaker" p={[0.1, 0, 0.15]} r={0.68} h={0.9} level={0.65} liquid="#a8d9e8" /><Vessel kind="jar" p={[0.9, 0.35, 0.15]} r={0.38} h={1.25} level={0.5} liquid="#a8d9e8" rot={[Math.PI, 0, 0]} /><AlcoholLamp p={[-0.95, 0, 0.5]} flame={0} /><Flame p={[-0.95, 0.72, 0.5]} stateKey="heating" /><GasBubbles p={[-0.95, 1.02, 0]} count={8} height={0.5} /></group>;
}

function PeroxideRig({ exp }: { exp: Experiment }) {
  return <group><Heading exp={exp} note="过氧化氢 · 二氧化锰催化 · 集气" /><Stand p={[-1.35, 0, -0.4]} h={2.7} /><ReactiveVessel kind="flask" p={[-0.9, 0.05, 0]} r={0.48} h={1.3} level={0.3} liquid="clear" mode="static" /><Ball p={[-0.9, 0.22, 0]} r={0.12} m={MAT.black} /><Cyl p={[-0.9, 1.42, 0]} r={0.12} h={0.2} m={MAT.rubber} /><Tube pts={[[-0.9, 1.5, 0], [-0.48, 1.75, 0], [0.35, 1.75, 0], [0.8, 1.05, 0]]} r={0.045} m={MAT.glass} /><Vessel kind="jar" p={[0.9, 0.05, 0]} r={0.43} h={1.4} level={0.25} liquid="#a8d9e8" /><GasBubbles p={[-0.9, 0.3, 0]} count={11} height={0.8} /><Label text="常温催化，不加热" p={[0, 2.3, 0.4]} size={0.2} /></group>;
}

function CO2Candles({ exp }: { exp: Experiment }) {
  return <group><Heading exp={exp} note="CO₂沿杯壁倾倒 · 低处先熄" /><Vessel kind="beaker" p={[0, 0, -0.25]} r={0.82} h={1.85} level={0.02} /><Candle p={[-0.45, 0, 0.1]} stateKey="lowerCandle" /><Candle p={[0.45, 0.48, 0.1]} stateKey="upperCandle" /><Vessel kind="jar" p={[1.2, 0, 0.1]} r={0.35} h={1.1} level={0.1} liquid="#d6eaf0" /><Tube pts={[[1.2, 1.05, 0.1], [0.75, 1.35, 0.1], [0.45, 1.1, 0.1]]} r={0.035} m={MAT.glass} /><IoLabel get={(io) => io.sb('lowerCandle', false) ? '低处火焰燃烧' : io.sb('upperCandle', false) ? '低处先熄' : '两处火焰均熄灭'} p={[0, 2.25, 0.4]} size={0.2} /></group>;
}

function ReactionRig({ exp }: { exp: Experiment }) {
  const v = exp.sceneVariant;
  const heating = /heating|reduces|combustion-mass/.test(v);
  const displacement = /metal-displacement|rust|metals-oxygen|metal-properties/.test(v);
  if (v === 'hydrogen-combustion-water') return <group><Heading exp={exp} note="先验纯 · 确认后才点燃" /><Vessel kind="jar" p={[-0.8, 0, 0]} r={0.5} h={1.55} level={0.08} liquid="#d6eaf0" /><Cyl p={[0.7, 0.15, 0]} r={0.09} h={0.4} m={MAT.darkSteel} /><Flame stateKey="safeHydrogenBurning" p={[0.7, 0.48, 0]} /><Vessel kind="bell" p={[0.7, 0.3, 0]} r={0.42} h={1.0} /><IoLabel get={(io) => io.sb('pure', false) ? io.ss('phase', '').includes('燃烧') ? '氢气已验纯并点燃' : '已验纯，等待点燃' : '未验纯，不点燃'} p={[0, 2.2, 0.4]} size={0.2} /></group>;
  return <group><Heading exp={exp} note={heating ? '沉淀 · 受热变化' : displacement ? '金属 · 置换与性质' : '反应物 · 生成物'} />
    {displacement ? <><MetalSamples p={[-0.35, 0, 0]} copper /><ReactiveVessel kind="beaker" p={[0.65, 0, 0]} r={0.56} h={1.35} liquid="blue-fading" solid /><Label text="金属样品" p={[0, 0.54, 0.5]} size={0.2} /></> : <><Stand p={[-1.2, 0, -0.3]} h={2.8} /><ReactiveVessel kind="tube" p={[-0.65, 0.12, 0]} r={0.29} h={1.6} level={0.42} liquid="blue-cloudy" solid /><ReactiveVessel kind="beaker" p={[0.95, 0, 0]} r={0.52} h={1.3} level={0.4} liquid="clear" mode="static" /><Cyl p={[-0.2, 1.15, 0]} r={0.045} h={0.55} m={MAT.rubber} /><Ball p={[-0.2, 1.45, 0]} r={0.11} m={MAT.rubber} /><Tube pts={[[-0.2, 0.92, 0], [-0.2, 0.45, 0]]} r={0.018} m={MAT.glass} />
    {heating && <><AlcoholLamp p={[-0.65, 0, 0.5]} flame={0} /><Flame p={[-0.65, 0.72, 0.5]} stateKey="heating" /><DynamicThermo p={[1.85, 0, 0]} h={1.6} fallback={20} /></>}
    {v.includes('mass-conservation') && <><Vessel kind="jar" p={[1.35, 0, 0]} r={0.42} h={1.5} level={0.1} /><Box p={[1.35, 1.45, 0]} s={[0.6, 0.08, 0.6]} m={MAT.rubber} /></>}
    </>}
  </group>;
}

function SeparationRig({ exp }: { exp: Experiment }) {
  const v = exp.sceneVariant;
  if (v === 'glassware-cleaning') return <WashRig exp={exp} />;
  if (v.includes('filtration') || v.includes('purification') || v.includes('filter-design')) return <FilterRig exp={exp} />;
  if (v.includes('distillation')) return <DistillationRig exp={exp} />;
  return <group><Heading exp={exp} note="沉降 · 吸附 · 溶解" /><ReactiveVessel p={[-0.8, 0, 0]} r={0.56} h={1.45} liquid="cloudy" mode={v.includes('alum') ? 'reactive' : 'static'} /><ReactiveVessel p={[0.85, 0, 0]} r={0.56} h={1.45} liquid="clear" mode="static" /><Cyl p={[0.85, 0.24, 0]} r={0.35} h={0.08} m={MAT.black} /><Ball p={[0.85, 0.42, 0]} r={0.12} m={MAT.card} /><Label text={v.includes('charcoal') ? '活性炭吸附色素' : '静置沉降与澄清'} p={[0, 2.0, 0.4]} size={0.2} /></group>;
}

function FilterRig({ exp }: { exp: Experiment }) {
  return <group><Heading exp={exp} note="倾倒混合物 · 滤渣留在滤纸" /><ReactiveVessel p={[-1.25, 0, 0.2]} r={0.46} h={1.18} liquid="cloudy" mode="static" /><Tube pts={[[-0.78, 1.0, 0.2], [-0.48, 1.28, 0.1], [0, 1.55, 0]]} r={0.025} m={MAT.glass} /><Cyl p={[0, 1.12, 0]} r={0.55} h={0.7} rt={0.08} m={MAT.glass} /><ConeFilter /><FilterResidue /><FilterDrops /><ReactiveVessel kind="flask" p={[0.1, 0, 0.2]} r={0.44} h={1.08} liquid="clear" /><Label text="滤液" p={[0.2, 0.35, 0.5]} size={0.19} /></group>;
}

function FilterResidue() {
  const ref = useRef<THREE.Mesh>(null);
  useRig((io) => { if (ref.current) { const retained = io.s('solidRetained', io.s('filtration', 0) / 100); ref.current.visible = retained > 0.03; ref.current.scale.setScalar(Math.max(0.15, Math.min(1, retained))); } });
  return <mesh ref={ref} position={[0, 1.55, 0]} visible={false}><sphereGeometry args={[0.19, 12, 10]} /><meshStandardMaterial color="#85795f" /></mesh>;
}

function FilterDrops() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => refs.current.forEach((m, i) => { if (m) { const progress = io.s('filtration', 0); const active = progress > 0 || io.ss('phase', '').includes('过滤'); const phase = (io.t * 0.9 + i / 4) % 1; m.visible = active; m.position.set(0.03 + i * 0.025, 0.95 - phase * 0.55, 0.03); } }));
  return <group>{[0,1,2].map((i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} visible={false}><sphereGeometry args={[0.035, 8, 8]} /><meshPhysicalMaterial color="#a9dce5" transparent opacity={0.7} /></mesh>)}</group>;
}

function WashRig({ exp }: { exp: Experiment }) {
  return <group><Heading exp={exp} note="试管刷洗 · 冲净 · 倒置沥干" /><Box p={[0, 0.12, 0]} s={[2.5, 0.24, 0.9]} m={MAT.white} /><Vessel kind="tube" p={[-0.6, 0.25, 0]} r={0.28} h={1.35} level={0.32} liquid="#a98a61" /><Cyl p={[-0.6, 0.85, 0]} r={0.035} h={1.45} m={MAT.steel} /><Cyl p={[-0.6, 1.55, 0]} r={0.11} h={0.22} m={MAT.white} /><Cyl p={[0.7, 0.8, 0]} r={0.035} h={1.2} m={MAT.darkSteel} /><Rod a={[0.7, 0.25, 0]} b={[0.7, 1.2, 0]} r={0.025} m={MAT.white} /><Label text="试管架" p={[0.7, 1.8, 0.35]} size={0.2} /></group>;
}

function DistillationRig({ exp }: { exp: Experiment }) {
  return <group><Heading exp={exp} note="蒸馏烧瓶 · 冷凝管 · 接收馏液" /><Stand p={[-1.15, 0, -0.3]} h={2.5} /><ReactiveVessel kind="round" p={[-1.15, 0.1, 0]} r={0.46} h={1.7} level={0.2} /><Tube pts={[[-1.15, 1.5, 0], [-0.8, 1.9, 0], [0.85, 1.65, 0.15], [1.25, 0.75, 0.15]]} r={0.11} m={MAT.glass} /><ReactiveVessel kind="flask" p={[1.35, 0, 0.15]} r={0.35} h={0.95} liquid="clear" /><AlcoholLamp p={[-1.15, 0, 0.55]} flame={0} /><Flame p={[-1.15, 0.78, 0.55]} stateKey="heating" /><GasBubbles p={[-1.15, 0.45, 0]} height={0.85} /><Label text="冷凝管" p={[0, 2.1, 0.25]} size={0.2} /></group>;
}

function ConeFilter() {
  return <mesh position={[0, 1.42, 0]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.53, 0.64, 4, 1, true]} /><meshPhysicalMaterial color="#fff5dc" side={THREE.DoubleSide} transparent opacity={0.78} /></mesh>;
}

function IndicatorRig({ exp }: { exp: Experiment }) {
  const acidic = /acid|neutralization|litmus/.test(exp.sceneVariant);
  if (exp.sceneVariant.includes('soil-ph-plant')) return <group><Heading exp={exp} note="土壤样品 · pH · 植物生长" /><Box p={[0, 0.36, 0]} s={[1.15, 0.7, 0.82]} m={MAT.darkWood} /><Cyl p={[0, 0.77, 0]} r={0.5} h={0.18} m={MAT.wood} /><Cyl p={[0, 0.92, 0]} r={0.42} h={0.18} m={MAT.darkWood} /><Rod a={[0, 1.0, 0]} b={[0, 2.05, 0]} r={0.035} m={MAT.green} /><Rod a={[0, 1.52, 0]} b={[-0.44, 1.82, 0]} r={0.025} m={MAT.green} /><Rod a={[0, 1.6, 0]} b={[0.42, 1.94, 0]} r={0.025} m={MAT.green} /><Ball p={[-0.48, 1.83, 0]} r={0.19} m={MAT.green} /><Ball p={[0.46, 1.95, 0]} r={0.2} m={MAT.green} /><Tube pts={[[0.8, 2.0, 0], [0.92, 1.25, 0], [0.82, 0.86, 0]]} r={0.045} m={MAT.steel} /><ReactiveVessel kind="beaker" p={[1.45, 0, 0.15]} r={0.35} h={0.95} liquid="clear" /><Label text="样品与植物适应性观察" p={[0.4, 2.6, 0.4]} size={0.19} /></group>;
  return <group><Heading exp={exp} note="滴加指示剂 · 观察颜色" /><DroppingSetup color="clear" /><ReactiveVessel p={[1.0, 0, 0]} r={0.55} h={1.42} liquid="clear" solid={exp.sceneVariant.includes('base-properties')} /><Cyl p={[-0.85, 1.58, 0]} r={0.05} h={0.38} m={MAT.rubber} /><Tube pts={[[-0.85, 1.38, 0], [-0.85, 1.06, 0]]} r={0.02} m={MAT.glass} /><Ball p={[-0.85, 1.8, 0]} r={0.12} m={MAT.rubber} /><IoLabel get={(io) => {
    const indicator = io.ss('indicator', exp.sceneVariant.includes('phenolphthalein') ? '酚酞' : '石蕊');
    const color = io.ss('liquidColor', 'colorless');
    const acid = io.sb('acidic', false); const base = io.sb('basic', false);
    if (indicator.includes('石蕊')) return acid || color === 'red' ? '石蕊：酸性变红' : base || color === 'blue' ? '石蕊：碱性变蓝' : '石蕊：中性紫色';
    if (indicator.includes('酚酞')) return base || color === 'pink' ? '酚酞：碱性变红' : '酚酞：酸性或中性无色';
    return `指示剂：${color === 'pink' || color === 'red' ? '变色' : '观察颜色'}`;
  }} p={[0.3, 2.25, 0.4]} size={0.2} /></group>;
}

function HeatRig({ exp }: { exp: Experiment }) {
  const v = exp.sceneVariant;
  return <group><Heading exp={exp} note="温度 · 加热条件" /><Stand p={[-0.9, 0, -0.25]} h={2.55} /><ReactiveVessel kind={v.includes('water-bath') ? 'beaker' : 'tube'} p={[-0.55, 0.15, 0]} r={v.includes('water-bath') ? 0.48 : 0.28} h={1.45} level={0.36} liquid="clear" solid={v.includes('dissolution') || v.includes('quicklime')} /><AlcoholLamp p={[-0.55, 0, 0.55]} flame={0} /><Flame p={[-0.55, 0.78, 0.55]} stateKey="heating" /><DynamicThermo p={[1.1, 0, 0]} h={1.8} fallback={20} /><Vessel kind="beaker" p={[1.75, 0, 0]} r={0.4} h={0.95} level={0.35} liquid="#a9dce5" /><Label text={v.includes('wax') ? '水浴加热石蜡' : '观察温度与物态'} p={[0, 2.4, 0.45]} size={0.2} /></group>;
}

function ParticleRig({ exp }: { exp: Experiment }) {
  const points = Array.from({ length: 18 }, (_, i) => [((i * 37) % 100) / 50 - 1, 0.5 + ((i * 19) % 100) / 70, ((i * 13) % 100) / 80 - 0.6] as V3);
  return <group><Heading exp={exp} note="粒子运动示意" /><ReactiveVessel kind="beaker" p={[0, 0, 0]} r={0.8} h={1.7} level={0.62} liquid="clear" /><ParticleCloud points={points} /><Label text="粒子运动为示意" p={[0, 2.4, 0.4]} size={0.2} /></group>;
}

function ParticleCloud({ points }: { points: V3[] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => refs.current.forEach((m, i) => { if (m) { const active = io.s('diffusion', 0) > 0 || io.n('stir') > 0; m.position.x = points[i][0] + Math.sin(io.t * (0.8 + i % 4) + i) * 0.12; m.position.y = points[i][1] + Math.cos(io.t * (0.7 + i % 3) + i) * 0.08; m.visible = active || i < 7; } }));
  return <group>{points.map((p, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={p}><sphereGeometry args={[0.055, 12, 10]} /><meshStandardMaterial color={i % 3 ? '#d3538d' : '#8b65b0'} /></mesh>)}</group>;
}

function ElectricityRig({ exp }: { exp: Experiment }) {
  const lamp = useRef<THREE.Mesh>(null);
  useRig((io) => { if (lamp.current) { const on = io.sb('current', false) || io.sb('active', false) || io.s('hydrogenVolume', 0) > 0; (lamp.current.material as THREE.MeshBasicMaterial).color.set(on ? '#f7c84b' : '#595752'); } });
  return <group><Heading exp={exp} note="电源 · 电极 · 气体体积" /><ReactiveVessel kind="beaker" p={[-0.5, 0, 0]} r={0.68} h={1.5} level={0.58} liquid="clear" /><Cyl p={[-0.73, 1.15, 0]} r={0.04} h={0.9} m={MAT.darkSteel} /><Cyl p={[-0.27, 1.15, 0]} r={0.04} h={0.9} m={MAT.darkSteel} /><Vessel kind="tube" p={[-0.73, 1.0, 0]} r={0.16} h={1.15} level={0.4} /><Vessel kind="tube" p={[-0.27, 1.0, 0]} r={0.16} h={1.15} level={0.2} /><ElectrolysisGasVolumes /><Label text="H₂ : O₂ = 2 : 1" p={[-0.5, 3.15, 0.35]} size={0.19} /><Box p={[1.25, 0.4, 0]} s={[0.72, 0.52, 0.35]} m={MAT.darkSteel} /><Ball p={[1.25, 1.04, 0]} r={0.18} m={MAT.brass} /><mesh ref={lamp} position={[1.25, 1.04, 0.16]}><sphereGeometry args={[0.11, 16, 12]} /><meshBasicMaterial color="#595752" /></mesh><Rod a={[-0.73, 1.6, 0]} b={[0.9, 1.1, 0]} r={0.025} m={MAT.copper} /><Rod a={[-0.27, 1.6, 0]} b={[1.1, 1.1, 0]} r={0.025} m={MAT.copper} /><GasBubbles p={[-0.5, 0.28, 0]} height={1.05} /></group>;
}

function ElectrolysisGasVolumes() {
  const h2 = useRef<THREE.Mesh>(null); const o2 = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const h = io.s('hydrogenVolume', 0); const o = io.s('oxygenVolume', 0);
    for (const [m, value] of [[h2.current, h], [o2.current, o]] as const) if (m) {
      m.visible = value > 0;
      m.scale.y = Math.max(0.001, value * 0.22);
      m.position.y = 2.0 + m.scale.y / 2;
    }
  });
  return <group><mesh ref={h2} position={[-0.73, 2, 0]} visible={false}><cylinderGeometry args={[0.105, 0.105, 1, 20]} /><meshBasicMaterial color="#b8edf2" transparent opacity={0.52} /></mesh><mesh ref={o2} position={[-0.27, 2, 0]} visible={false}><cylinderGeometry args={[0.105, 0.105, 1, 20]} /><meshBasicMaterial color="#b8edf2" transparent opacity={0.52} /></mesh></group>;
}

function MeasurementRig({ exp }: { exp: Experiment }) {
  const v = exp.sceneVariant;
  if (v.includes('mass')) return <MassBalance exp={exp} />;
  if (v === 'solid-reagent-transfer') return <TransferDevice exp={exp} />;
  return <group><Heading exp={exp} note={v.includes('sensor') ? '传感器 · 采集 · 显示' : v.includes('ph') ? '试纸 · 比色 · pH示意' : '量取 · 读数'} />
    {v.includes('sensor') ? <><Box p={[0, 0.72, 0]} s={[1.25, 1.2, 0.54]} m={MAT.darkSteel} /><Box p={[0, 0.85, 0.29]} s={[0.82, 0.54, 0.035]} m={MAT.black} /><IoLabel get={(io) => `${io.ss('pollutant', 'O₂')} ${io.s('reading', io.s('oxygen', 21)).toFixed(0)}`} p={[0, 0.9, 0.34]} size={0.22} color="#8fe6a0" bg="rgba(22,38,27,0.95)" /><Tube pts={[[0.6, 0.8, 0.1], [1.2, 0.8, 0.1], [1.35, 1.4, 0.1]]} r={0.035} m={MAT.copper} /><Vessel kind="beaker" p={[1.25, 0, 0]} r={0.36} h={0.9} level={0.3} /></> : v.includes('ph') ? <><ReactiveVessel kind="beaker" p={[-0.55, 0, 0]} r={0.42} h={1.2} liquid="clear" mode="static" /><Box p={[0.45, 0.72, 0]} s={[0.1, 1.3, 0.035]} m={MAT.white} /><PHPatch p={[0.47, 0.65, 0.06]} /><Label text="pH 试纸" p={[1.0, 1.7, 0.2]} size={0.2} /><IoLabel get={(io) => typeof io.o?.state.pH === 'number' ? `pH ${io.s('pH', 7).toFixed(1)}` : '待测 · 比色读数'} p={[1.0, 1.35, 0.2]} size={0.18} /></> : <><ReactiveVessel kind="cylinder" p={[-0.45, 0, 0]} r={0.3} h={1.7} level={0.58} liquid="clear" /><Cyl p={[0.55, 0.75, 0]} r={0.04} h={1.25} m={MAT.steel} /><Ball p={[0.55, 1.43, 0]} r={0.12} m={MAT.rubber} /><Box p={[1.1, 0.04, 0]} s={[0.55, 0.08, 0.52]} m={MAT.white} /></>}
  </group>;
}

function PHPatch({ p }: { p: V3 }) {
  const ref = useRef<THREE.Mesh>(null);
  useRig((io) => { if (!ref.current) return; const ph = io.s('pH', 7); const category = io.ss('acidity', ''); const c = typeof io.o?.state.pH === 'number' ? (ph < 7 ? '#db5550' : ph > 7 ? '#5d80d0' : '#67a66c') : category === '酸性' ? '#db5550' : category === '碱性' ? '#5d80d0' : '#b9e5e8'; (ref.current.material as THREE.MeshStandardMaterial).color.set(c); });
  return <mesh ref={ref} position={p}><boxGeometry args={[0.1, 0.2, 0.05]} /><meshStandardMaterial color="#b9e5e8" /></mesh>;
}

function MassBalance({ exp }: { exp: Experiment }) {
  const lid = useRef<THREE.Mesh>(null);
  useRig((io) => { if (lid.current) lid.current.visible = io.sb('closed', true); });
  return <group><Heading exp={exp} note="反应前后称量 · 明确系统边界" /><Box p={[0, 1.5, 0]} s={[0.13, 1.55, 0.13]} m={MAT.brass} /><Box p={[0, 2.32, 0]} s={[1.85, 0.1, 0.12]} m={MAT.brass} /><Rod a={[-0.82, 1.4, 0]} b={[-0.82, 0.72, 0]} r={0.018} m={MAT.steel} /><Rod a={[0.82, 1.4, 0]} b={[0.82, 0.72, 0]} r={0.018} m={MAT.steel} /><Box p={[-0.82, 0.68, 0]} s={[0.65, 0.08, 0.48]} m={MAT.brass} /><Box p={[0.82, 0.68, 0]} s={[0.65, 0.08, 0.48]} m={MAT.brass} /><ReactiveVessel kind="flask" p={[-0.82, 0.75, 0]} r={0.23} h={0.7} level={0.25} liquid="clear" mode="static" /><Vessel kind="jar" p={[0.82, 0.75, 0]} r={0.25} h={0.7} level={0.25} /><mesh ref={lid} position={[0.82, 1.45, 0]}><boxGeometry args={[0.52, 0.07, 0.52]} /><meshStandardMaterial color="#444448" /></mesh><IoLabel get={(io) => `前 ${io.s('massBefore', io.p('mass', 10)).toFixed(1)} g · 后 ${io.s('massAfter', io.p('mass', 10)).toFixed(1)} g`} p={[0, 2.75, 0.25]} size={0.18} /></group>;
}

function TransferDevice({ exp }: { exp: Experiment }) {
  const tube = useRef<THREE.Group>(null);
  const block = useRef<THREE.Mesh>(null); const powder = useRef<THREE.Mesh>(null);
  useRig((io) => { if (tube.current) tube.current.rotation.z = -io.p('tilt', 15) * Math.PI / 180; const isPowder = io.ss('material', '大理石').includes('粉'); const moved = io.n('add') > 0; if (block.current) { block.current.visible = !isPowder; block.current.position.x = moved ? -0.15 : 0.9; } if (powder.current) { powder.current.visible = isPowder; powder.current.position.x = moved ? -0.15 : 0.9; } });
  return <group><Heading exp={exp} note="镊子取块状 · 药匙取粉末" /><group ref={tube} position={[-0.15, 0.85, 0]}><Vessel kind="tube" p={[0, -0.75, 0]} r={0.25} h={1.25} level={0.08} liquid="#b9e5e8" /></group><Rod a={[-1.2, 1.8, 0]} b={[-0.4, 1.1, 0]} r={0.025} m={MAT.steel} /><Box p={[0.9, 0.12, 0]} s={[1.0, 0.15, 0.55]} m={MAT.white} /><Cyl p={[0.75, 0.72, 0]} r={0.045} h={1.15} m={MAT.steel} /><Box p={[0.75, 1.3, 0]} s={[0.33, 0.06, 0.12]} m={MAT.steel} /><mesh ref={block} position={[0.9, 0.28, 0]}><dodecahedronGeometry args={[0.12, 0]} /><meshStandardMaterial color="#74736e" /></mesh><mesh ref={powder} position={[0.9, 0.22, 0]}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#c9c8bf" /></mesh><Label text="药匙 / 试管" p={[0.5, 2.0, 0.4]} size={0.2} /></group>;
}

function SolutionRig({ exp }: { exp: Experiment }) {
  const v = exp.sceneVariant;
  if (v.includes('mixing')) return <MixtureRig exp={exp} />;
  return <group><Heading exp={exp} note={v.includes('solvent') ? '溶剂 · 溶解 · 未溶固体' : '溶质 · 温度 · 溶解'} /><ReactiveVessel p={[-0.9, 0, 0]} r={0.52} h={1.4} liquid="clear" solid mode="static" /><ReactiveVessel p={[0.75, 0, 0]} r={0.52} h={1.4} liquid="clear" solid /><UndissolvedParticles p={[0.75, 0.08, 0]} /><CrystalDisplay p={[0.75, 0.06, 0]} />{v.includes('salinity') || v.includes('prepare-') ? <><Box p={[1.45, 0.12, 0]} s={[0.72, 0.24, 0.6]} m={MAT.brass} /><ReactiveVessel kind="cylinder" p={[1.45, 0.25, 0]} r={0.2} h={1.1} level={0.6} liquid="clear" /><IoLabel get={(io) => { const c = io.s('concentration', io.p('concentration', 0)); return c > 0 ? `质量分数 ${c <= 1 ? (c * 100).toFixed(1) : c.toFixed(1)}%` : `称量 ${io.s('soluteMass', 0).toFixed(1)} g`; }} p={[1.15, 1.85, 0.35]} size={0.19} /></> : <DynamicThermo p={[1.55, 0, 0]} h={1.45} fallback={20} />}</group>;
}

function MixtureRig({ exp }: { exp: Experiment }) {
  const upper = useRef<THREE.Mesh>(null);
  const topMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e8cb72', transparent: true, opacity: 0.62, depthWrite: false }), []);
  useEffect(() => () => topMat.dispose(), [topMat]);
  useRig((io) => { if (upper.current) upper.current.visible = io.sb('miscible', false) === false && io.s('layers', 1) > 1; });
  return <group><Heading exp={exp} note="互溶形成均一液体 · 油水静置分层" /><ReactiveVessel p={[0, 0, 0]} r={0.65} h={1.55} liquid="clear" mode="static" /><mesh ref={upper} position={[0, 0.76, 0]} material={topMat}><cylinderGeometry args={[0.59, 0.59, 0.34, 28]} /></mesh><Vessel kind="beaker" p={[-1.2, 0, 0.2]} r={0.36} h={1.0} level={0.42} liquid="#a8dce5" /><Vessel kind="beaker" p={[1.2, 0, 0.2]} r={0.36} h={1.0} level={0.42} liquid="#e8cb72" /><Label text="静置后观察液体是否分层" p={[0, 2.1, 0.35]} size={0.18} /></group>;
}

function UndissolvedParticles({ p }: { p: V3 }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => { const left = io.s('undissolved', 0); refs.current.forEach((m, i) => { if (!m) return; m.visible = left > i * 0.1; m.scale.setScalar(left > 0 ? Math.min(1, 0.35 + left * 0.12) : 0.001); }); });
  return <group position={p}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={[(i % 3 - 1) * 0.18, 0.06 + Math.floor(i / 3) * 0.045, ((i * 7) % 3 - 1) * 0.12]} visible={false}><dodecahedronGeometry args={[0.09, 0]} /><meshStandardMaterial color="#eee7d4" roughness={0.7} /></mesh>)}</group>;
}

function CrystalDisplay({ p }: { p: V3 }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => { const n = Math.max(io.s('crystals', 0), io.ss('phase', '').includes('结晶') ? 0.8 : 0); refs.current.forEach((m, i) => { if (m) m.visible = n > i / 7; }); });
  return <group position={p}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={[(i % 4 - 1.5) * 0.18, 0.11, ((i * 5) % 3 - 1) * 0.14]} visible={false} rotation={[0.3 * i, 0.2, 0]}><octahedronGeometry args={[0.1, 0]} /><meshStandardMaterial color="#dfdfeb" roughness={0.3} metalness={0.12} /></mesh>)}</group>;
}

function CombustionRig({ exp }: { exp: Experiment }) {
  const v = exp.sceneVariant;
  const sulfur = v.includes('sulfur'); const iron = v.includes('iron');
  if (v === 'candle-products-smoke') return <group><Heading exp={exp} note="蜡烛燃烧 · 水与二氧化碳检验" /><Candle p={[-0.75, 0, 0]} /><Vessel kind="bell" p={[-0.75, 0.48, 0]} r={0.55} h={1.4} /><ReactiveVessel p={[0.9, 0, 0]} r={0.45} h={1.1} liquid="clear" /><Label text="烧杯水珠 / 石灰水检验" p={[0.2, 1.8, 0.4]} size={0.2} /><IoLabel get={(io) => io.ss('phase', '点燃前')} p={[-0.5, 2.15, 0.35]} size={0.18} /></group>;
  return <group><Heading exp={exp} note="燃烧条件 · 产物观察" /><Vessel kind="jar" p={[-0.7, 0, 0]} r={0.58} h={1.75} level={0.06} liquid="#d6eaf0" />{iron ? <><Rod a={[-0.7, 1.2, 0]} b={[-0.7, 0.86, 0]} r={0.04} m={MAT.steel} /><Flame kind="sparks" stateKey="sparks" p={[-0.7, 1.3, 0]} /><Ball p={[-0.7, 0.2, 0]} r={0.16} m={MAT.black} /></> : <><Rod a={[-0.7, 1.2, 0]} b={[-0.7, 0.86, 0]} r={0.04} m={MAT.darkSteel} /><Flame p={[-0.7, 1.3, 0]} kind={sulfur ? 'sulfur' : 'fire'} /></>}<ReactiveVessel kind="beaker" p={[0.9, 0, 0]} r={0.52} h={1.2} liquid={sulfur ? 'pale-cloudy' : 'clear'} /><Tube pts={[[-0.7, 1.15, 0], [0, 1.55, 0], [0.65, 1.0, 0]]} r={0.035} m={MAT.glass} /><GasBubbles p={[0.8, 0.3, 0]} height={0.55} /><Label text={sulfur ? '空气淡蓝 · 氧气蓝紫' : iron ? '铁丝火星 · 黑色产物' : '燃烧需要氧气与着火点'} p={[0, 2.25, 0.4]} size={0.19} /></group>;
}

export function ChemicalRig({ exp }: { exp: Experiment }): ReactElement | null {
  if (!exp.bookId.startsWith('chemistry-')) return null;
  const v = exp.sceneVariant;
  let scene: ReactElement;
  if (v === 'water-electrolysis' || v === 'water-composition-change-practical') scene = <ElectricityRig exp={exp} />;
  else if (exp.family === 'chemical-gas') scene = <GasRig exp={exp} />;
  else if (exp.family === 'acid-base') scene = <IndicatorRig exp={exp} />;
  else if (exp.family === 'heat') scene = <HeatRig exp={exp} />;
  else if (exp.family === 'combustion') scene = <CombustionRig exp={exp} />;
  else if (exp.family === 'particle') scene = <ParticleRig exp={exp} />;
  else if (exp.family === 'electricity') scene = <ElectricityRig exp={exp} />;
  else if (exp.family === 'measurement') scene = <MeasurementRig exp={exp} />;
  else if (exp.family === 'solution') scene = <SolutionRig exp={exp} />;
  else if (exp.family === 'separation') scene = <SeparationRig exp={exp} />;
  else if (exp.family === 'chemical-reaction') scene = <ReactionRig exp={exp} />;
  else scene = <ReactionRig exp={exp} />;
  return <group position={[0, 0.08, 0]} scale={0.88}>{scene}</group>;
}

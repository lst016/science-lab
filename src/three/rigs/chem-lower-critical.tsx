import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { Flame, Stand } from './chemical-parts';
import { clamp, smooth, useOptIndex, useRig } from './io';
import { IoLabel } from './parts';

/** 实验10-7：同一低压回路比较试液导电，不是水的电解装置。 */
export function ConductivityCircuitRig({ exp }: { exp: Experiment }) {
  const bulb = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const arm = useRef<THREE.Group>(null);
  useRig((io) => {
    const closed = io.sb('closed', true);
    const on = io.sb('bulbOn', false);
    if (bulb.current) (bulb.current.material as THREE.MeshBasicMaterial).color.set(on ? '#ffd252' : '#aaa99d');
    if (glow.current) glow.current.visible = on;
    if (arm.current) arm.current.rotation.z = closed ? 0 : 0.48;
  });
  return <group>
    <Label text={exp.title} p={[0, 3.18, 0.35]} size={0.21} />
    <Box p={[-1.63, 0.32, 0]} s={[0.82, 0.52, 0.58]} m={MAT.darkSteel} />
    <Label text="低压电源" p={[-1.63, 0.35, 0.34]} size={0.16} color="#f6f3e8" />
    <Cyl p={[-1.9, 0.64, 0]} r={0.055} h={0.12} m={MAT.brass} /><Cyl p={[-1.36, 0.64, 0]} r={0.055} h={0.12} m={MAT.brass} />
    <Label text="+" p={[-1.9, 0.84, 0]} size={0.18} /><Label text="−" p={[-1.36, 0.84, 0]} size={0.18} />
    <Box p={[-1.38, 1.52, 0]} s={[0.83, 0.12, 0.4]} m={MAT.white} />
    <Cyl p={[-1.65, 1.61, 0]} r={0.055} h={0.1} m={MAT.brass} /><Cyl p={[-1.1, 1.61, 0]} r={0.055} h={0.1} m={MAT.brass} />
    <group ref={arm} position={[-1.65, 1.66, 0]}><Rod a={[0, 0, 0]} b={[0.55, 0, 0]} r={0.035} m={MAT.darkSteel} /></group>
    <Label text="开关" p={[-1.4, 1.95, 0.15]} size={0.16} />
    <Cyl p={[-0.24, 1.5, 0]} r={0.16} h={0.25} m={MAT.brass} />
    <mesh ref={bulb} position={[-0.24, 1.8, 0]}><sphereGeometry args={[0.23, 24, 16]} /><meshBasicMaterial color="#aaa99d" /></mesh>
    <mesh ref={glow} position={[-0.24, 1.8, -0.03]} visible={false}><sphereGeometry args={[0.34, 24, 16]} /><meshBasicMaterial color="#ffda63" transparent opacity={0.28} depthWrite={false} /></mesh>
    <Label text="小灯泡" p={[-0.24, 2.22, 0.1]} size={0.16} />
    <Vessel kind="beaker" p={[1.0, 0.03, 0]} r={0.65} h={1.36} level={0.55} liquid="#cce9ec" />
    <Rod a={[0.76, 1.62, 0]} b={[0.76, 0.42, 0]} r={0.045} m={MAT.darkSteel} />
    <Rod a={[1.24, 1.62, 0]} b={[1.24, 0.42, 0]} r={0.045} m={MAT.darkSteel} />
    <Tube pts={[[-1.9, 0.69, 0], [-2.02, 1.1, 0], [-1.65, 1.1, 0], [-1.65, 1.62, 0]]} r={0.025} m={MAT.copper} />
    <Tube pts={[[-1.1, 1.62, 0], [-0.65, 1.62, 0], [-0.4, 1.5, 0]]} r={0.025} m={MAT.copper} />
    <Tube pts={[[-0.08, 1.5, 0], [0.37, 1.5, 0], [0.76, 1.64, 0]]} r={0.025} m={MAT.copper} />
    <Tube pts={[[1.24, 1.64, 0], [1.72, 1.64, 0], [1.75, 0.03, 0], [-1.36, 0.03, 0], [-1.36, 0.69, 0]]} r={0.025} m={MAT.copper} />
    <IoLabel get={(io) => io.opt('liquid')} p={[1.0, 0.33, 0.73]} size={0.17} />
    <IoLabel get={(io) => !io.sb('closed', true) ? '开关断开' : io.sb('bulbOn', false) ? '灯亮：试液导电' : '灯不明显发光'} p={[0, 2.62, 0.25]} size={0.18} />
  </group>;
}

/** 三支对照试管并列；点击加入后放入铁钉，观察代表一周后的结果。 */
export function IronRustComparisonRig({ exp }: { exp: Experiment }) {
  const nails = useRef<(THREE.Group | null)[]>([]);
  const rust = useRef<THREE.Group>(null);
  const selector = useRef<THREE.Group>(null);
  useRig((io) => {
    const added = io.n('add') > 0 || io.n('run') > 0;
    const checked = added && io.n('observe') > 0;
    nails.current.forEach((m) => { if (m) m.position.y = io.damp('rust-nails', added ? 0.53 : 1.95, 4); });
    if (rust.current) rust.current.visible = checked;
    if (selector.current) selector.current.position.x = [-1.15, 0, 1.15][io.idx('condition')] ?? -1.15;
  });
  return <group>
    <Label text={exp.title} p={[0, 3.18, 0.3]} size={0.21} />
    <Box p={[0, 0.08, 0]} s={[3.8, 0.16, 0.75]} m={MAT.wood} />
    {[-1.15, 0, 1.15].map((x, i) => <group key={x} position={[x, 0.14, 0]}>
      <Vessel kind="tube" p={[0, 0, 0]} r={0.34} h={1.65} level={i === 0 ? 0 : 0.47} liquid="#c6e4eb" />
      {i === 0 && <><Cyl p={[0, 1.18, 0]} r={0.25} h={0.12} m={MAT.white} /><Cyl p={[0, 1.38, 0]} r={0.23} h={0.16} m={MAT.white} /><Cyl p={[0, 1.67, 0]} r={0.26} h={0.18} m={MAT.rubber} /><Label text="干燥剂" p={[0.5, 1.35, 0.4]} size={0.14} /></>}
      {i === 1 && <><mesh position={[0, 0.78, 0]}><cylinderGeometry args={[0.30, 0.30, 0.13, 24]} /><meshBasicMaterial color="#e3c478" transparent opacity={0.9} /></mesh><Cyl p={[0, 1.67, 0]} r={0.26} h={0.18} m={MAT.rubber} /><Label text="油封" p={[0.4, 0.84, 0.2]} size={0.14} /></>}
      <group ref={(m) => { nails.current[i] = m; }} position={[0, 1.95, 0.04]}>
        <Cyl p={[0, 0.02, 0]} r={0.045} h={0.85} m={MAT.darkSteel} rot={[0, 0, 0.08]} /><Cyl p={[0.03, 0.46, 0]} r={0.11} h={0.05} m={MAT.darkSteel} />
        {i === 2 && <group ref={rust} visible={false}>
          {[[-0.02,-0.19,0.055],[0.03,0.02,0.06],[-0.02,0.19,0.06]].map(([a,b,c],j)=><mesh key={j} position={[a,b,c]}><sphereGeometry args={[0.085,8,6]} /><meshStandardMaterial color="#a65430" roughness={1} /></mesh>)}
        </group>}
      </group>
      <Label text={['干燥空气','煮沸水 · 油封','水和空气'][i]} p={[0, -0.2, 0.5]} size={0.15} />
    </group>)}
    <group ref={selector} position={[-1.15, 0, 0]}><Label text="▼" p={[0, 2.35, 0.25]} size={0.17} /></group>
    <IoLabel get={(io) => io.n('add') === 0 && io.n('run') === 0 ? '选择条件，加入铁钉' : io.n('observe') === 0 ? '放置约一周后观察' : '水与空气共存时出现铁锈'} p={[0, 2.66, 0.3]} size={0.17} />
  </group>;
}

/** 实验活动7：三个操作阶段使用各自的器材，并读取实验开始/余热状态。 */
export function CrudeSaltPurificationRig({ exp }: { exp: Experiment }) {
  const stage = useOptIndex('stage');
  return <group>
    <Label text={exp.title} p={[0, 3.23, 0.3]} size={0.21} />
    {stage === 0 ? <DissolveSalt /> : stage === 1 ? <FilterSalt /> : <EvaporateSalt />}
  </group>;
}

function DissolveSalt() {
  const scoop = useRef<THREE.Group>(null);
  const grains = useRef<THREE.Group>(null);
  const stir = useRef<THREE.Group>(null);
  const liquid = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const added = io.n('add') > 0 || io.n('run') > 0;
    const stirring = added && io.n('stir') > 0;
    const t = io.since('add'); const p = t < 0 ? 0 : smooth(clamp(t / 1.7, 0, 1));
    if (scoop.current) { scoop.current.position.x = -1.1 + 0.9 * p; scoop.current.rotation.z = -0.55 * p; }
    if (grains.current) grains.current.visible = added;
    if (stir.current) stir.current.rotation.z = stirring ? Math.sin(io.t * 3) * 0.17 : -0.2;
    if (liquid.current) (liquid.current.material as THREE.MeshBasicMaterial).color.set(added ? '#ccbca2' : '#d7edef');
  });
  return <group>
    <Box p={[-1.3, 0.09, 0]} s={[1.0, 0.15, 0.75]} m={MAT.wood} />
    <Box p={[-1.3, 0.21, 0]} s={[0.72, 0.08, 0.52]} m={MAT.white} />
    <group ref={scoop} position={[-1.1, 1.4, 0]}><Rod a={[-0.45, 0.2, 0]} b={[0.05, -0.05, 0]} r={0.025} m={MAT.steel} /><Cyl p={[0.06, -0.08, 0]} r={0.12} h={0.04} m={MAT.steel} /><Cyl p={[0.06, -0.04, 0]} r={0.08} h={0.06} m={MAT.white} /></group>
    <Vessel kind="beaker" p={[0.55, 0.02, 0]} r={0.62} h={1.48} level={0} />
    <mesh ref={liquid} position={[0.55, 0.37, 0]}><cylinderGeometry args={[0.54,0.54,0.7,28]} /><meshBasicMaterial color="#d7edef" transparent opacity={0.85} depthWrite={false} /></mesh>
    <group ref={grains} position={[0.55, 0.15, 0]} visible={false}>{[[-0.24,0.02,0.06],[0.02,0.04,0.14],[0.23,0.01,-0.06]].map((p,i)=><mesh key={i} position={p as V3}><dodecahedronGeometry args={[0.1,0]} /><meshStandardMaterial color="#81755c" /></mesh>)}</group>
    <group ref={stir} position={[0.73, 0.46, 0]}><Rod a={[0,0,0]} b={[0.25,1.58,0]} r={0.025} m={MAT.glass} /></group>
    <Label text="粗盐 5.0 g" p={[-1.3, 0.5, 0.45]} size={0.17} /><Label text="水 10 mL" p={[0.55, 0.25, 0.72]} size={0.16} />
    <IoLabel get={(io) => io.n('add') === 0 ? '加入粗盐' : io.n('stir') === 0 ? '边加边搅拌' : '粗盐溶解，杂质使水浑浊'} p={[0, 2.4, 0.3]} size={0.17} />
  </group>;
}

function FilterSalt() {
  const source = useRef<THREE.Group>(null); const drops = useRef<(THREE.Mesh | null)[]>([]); const residue = useRef<THREE.Mesh>(null); const filtrate = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const active = io.n('add') > 0 || io.n('run') > 0;
    if (source.current) source.current.rotation.z = io.damp('pour-salt', active ? -0.55 : 0, 3);
    drops.current.forEach((d,i) => { if (!d) return; const t=(io.t*.8+i/4)%1; d.visible=active; d.position.set(.4,1.05-t*.55,.05); });
    if (residue.current) residue.current.visible = active;
    if (filtrate.current) filtrate.current.visible = active;
  });
  return <group>
    <Stand p={[-0.2,0,-0.45]} h={2.65} />
    <group ref={source} position={[-1.2, 1.12, 0]}><Vessel kind="beaker" r={0.42} h={0.9} level={0.55} liquid="#c7bda7" /></group>
    <Rod a={[-0.78,1.5,0]} b={[0.06,1.35,0]} r={0.025} m={MAT.glass} />
    <Cyl p={[0.4,1.32,0]} r={0.07} rt={0.48} h={0.65} m={MAT.glass} />
    <mesh position={[0.4,1.35,0]} rotation={[Math.PI,0,0]}><coneGeometry args={[0.43,0.58,4,1,true]} /><meshStandardMaterial color="#f5efe1" side={THREE.DoubleSide} transparent opacity={0.85} /></mesh>
    <mesh ref={residue} position={[0.4,1.55,0.03]} visible={false}><sphereGeometry args={[0.13,8,6]} /><meshStandardMaterial color="#82765c" /></mesh>
    <Vessel kind="beaker" p={[0.4,0.02,0]} r={0.44} h={0.95} level={0} />
    <mesh ref={filtrate} position={[0.4,0.13,0]} visible={false}><cylinderGeometry args={[0.38,0.38,0.2,24]} /><meshBasicMaterial color="#d0e9ec" transparent opacity={0.8} /></mesh>
    {[0,1,2].map(i=><mesh key={i} ref={m=>{drops.current[i]=m;}} visible={false}><sphereGeometry args={[0.045,8,8]} /><meshBasicMaterial color="#a5d7e2" /></mesh>)}
    <Label text="滤渣" p={[0.96,1.56,0.3]} size={0.16} /><Label text="澄清滤液" p={[1.2,0.34,0.3]} size={0.16} />
    <IoLabel get={(io) => io.n('add') > 0 || io.n('run') > 0 ? '沿玻璃棒引流，杂质留在滤纸上' : '放好滤纸与承接烧杯'} p={[0,2.55,0.3]} size={0.17} />
  </group>;
}

function EvaporateSalt() {
  const crystals = useRef<THREE.Group>(null); const rod = useRef<THREE.Group>(null); const steam = useRef<(THREE.Mesh | null)[]>([]);
  const openedAt = useRef<number | null>(null);
  useRig((io) => {
    if (openedAt.current === null) openedAt.current = io.t;
    const active = io.n('add') > 0 || io.n('run') > 0;
    const heated = io.sb('heating', false) && active;
    const elapsed = Math.min(Math.max(0, io.since('add')), Math.max(0, io.t - openedAt.current));
    const residue = active && (io.opt('evaporation').includes('余热') || (elapsed >= 4 && io.s('crystals', 0) > 0));
    if (crystals.current) crystals.current.visible = residue;
    if (rod.current) rod.current.rotation.z = active && io.n('stir') > 0 ? Math.sin(io.t*3)*.18 : -.15;
    steam.current.forEach((m,i)=>{ if (!m) return; const t=(io.t*.4+i/5)%1; m.visible=heated; m.position.set(-.2+i*.1,1.65+t*.48,.08); m.scale.setScalar(.55+t); });
  });
  return <group>
    <Box p={[0,0.08,0]} s={[1.8,.16,1.1]} m={MAT.darkSteel} />
    <Rod a={[-.7,.18,-.32]} b={[-.7,1.15,-.32]} r={.04} m={MAT.steel} /><Rod a={[.7,.18,-.32]} b={[.7,1.15,-.32]} r={.04} m={MAT.steel} />
    <Cyl p={[0,1.14,0]} r={.74} h={.09} m={MAT.darkSteel} />
    <mesh position={[0,1.26,0]}><cylinderGeometry args={[.65,.46,.2,28,1,true]} /><meshStandardMaterial color="#e6e1d7" side={THREE.DoubleSide} roughness={.7} /></mesh>
    <mesh position={[0,1.28,0]}><cylinderGeometry args={[.44,.44,.04,28]} /><meshBasicMaterial color="#d7ecec" transparent opacity={.7} /></mesh>
    <group ref={crystals} visible={false} position={[0,1.33,0]}>{[[-.3,0,.05],[-.1,0,-.12],[.12,0,.13],[.31,0,-.06],[0,0,.2]].map((p,i)=><mesh key={i} position={p as V3}><boxGeometry args={[.12,.08,.12]} /><meshStandardMaterial color="#f6f4ec" roughness={.8} /></mesh>)}</group>
    <group ref={rod} position={[0,1.29,0]}><Rod a={[0,0,0]} b={[.4,1.05,0]} r={.025} m={MAT.glass} /></group>
    <AlcoholLamp p={[0,.16,.12]} flame={0} /><Flame p={[0,.86,.12]} stateKey="heating" />
    {[0,1,2].map(i=><mesh key={i} ref={m=>{steam.current[i]=m;}} visible={false}><sphereGeometry args={[.08,8,6]} /><meshBasicMaterial color="#e0e3dc" transparent opacity={.6} /></mesh>)}
    <Label text="蒸发皿 · 玻璃棒" p={[1.35,1.4,.3]} size={.16} />
    <IoLabel get={(io) => !(io.n('add') || io.n('run')) ? '倒入滤液，开始加热' : io.sb('heating', false) ? '加热并搅拌，出现较多固体后停火' : '利用余热蒸干，保留晶体'} p={[0,2.52,.3]} size={.17} />
  </group>;
}

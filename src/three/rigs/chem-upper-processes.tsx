import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { Beads, Flame, GasBubbles } from './chemical-parts';
import { clamp, smooth, useRig } from './io';
import { IoLabel } from './parts';

const ALUM_SETTLED = new THREE.Color('#dbe8d9');
const INK_FADED = new THREE.Color('#f3d5d1');

/** 实验1-6：倒废液、刷洗、冲净与倒扣沥水。 */
export function GlasswareWashRig({ exp }: { exp: Experiment }) {
  const tube=useRef<THREE.Group>(null),brush=useRef<THREE.Group>(null),water=useRef<THREE.Group>(null),film=useRef<THREE.Mesh>(null),soil=useRef<THREE.Mesh>(null),drops=useRef<(THREE.Mesh|null)[]>([]);
  useRig((io)=>{
    const step=io.idx('step'), started=io.n('add')>0||io.n('run')>0, cleanliness=io.s('cleanliness',io.p('cleaning',0));
    if(tube.current){tube.current.rotation.z=io.damp('washing-orientation',step===3?Math.PI:step===0&&started?-.8:0,4);tube.current.position.y=step===3?1.7:.3;}
    if(brush.current){brush.current.visible=step===1;brush.current.position.y=1.25+(started?Math.sin(io.t*4)*.25:0);}
    if(water.current)water.current.visible=step===2;
    if(film.current)film.current.visible=step>=2&&cleanliness>=90;
    if(soil.current){soil.current.visible=cleanliness<90; (soil.current.material as THREE.MeshBasicMaterial).opacity=.2+.5*(1-cleanliness/100);}
    drops.current.forEach((m,i)=>{if(!m)return; m.visible=started&&step===2&&cleanliness<90;const t=(io.t*.7+i/4)%1;m.position.y=1.55-t*.7;});
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.21} />
    <Box p={[0,.08,0]} s={[3.4,.16,.8]} m={MAT.wood} />
    <group ref={tube} position={[-.55,.3,0]}>
      <Vessel kind="tube" r={.36} h={1.5} />
      <mesh ref={soil} position={[0,.24,0]}><cylinderGeometry args={[.3,.3,.38,24]} /><meshBasicMaterial color="#a18063" transparent opacity={.65} depthWrite={false} /></mesh>
      <mesh ref={film} position={[0,.75,0]} visible={false}><cylinderGeometry args={[.32,.32,1.3,24,1,true]} /><meshBasicMaterial color="#addbe5" transparent opacity={.35} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
    <group ref={brush} position={[-.55,1.25,0]}><Rod a={[0,-.5,0]} b={[0,1.0,0]} r={.028} m={MAT.steel} /><Cyl p={[0,-.48,0]} r={.16} h={.45} m={MAT.white} /></group>
    <group ref={water} position={[.65,1.52,0]} visible={false}><Vessel kind="beaker" r={.35} h={.8} level={.55} liquid="#c1e6ec" rot={[0,0,.35]} /></group>
    {[0,1,2].map(i=><mesh key={i} ref={m=>{drops.current[i]=m;}} position={[.1,1.2,0]} visible={false}><sphereGeometry args={[.06,10,8]} /><meshBasicMaterial color="#acdce6" /></mesh>)}
    <Vessel kind="beaker" p={[.8,0,0]} r={.45} h={.9} level={.2} liquid="#b8b49f" /><Label text="废液收集" p={[.8,.35,.5]} size={.15} />
    <Box p={[1.65,.14,0]} s={[.6,.2,.55]} m={MAT.darkWood} /><Cyl p={[1.65,.72,0]} r={.035} h={1.1} m={MAT.steel} /><Label text="试管架" p={[1.65,1.55,.3]} size={.15} />
    <IoLabel get={(io)=>{const names=['倾倒废液','用试管刷轻轻刷洗','冲净并观察内壁水膜','倒扣在试管架上沥干'];return names[io.idx('step')]??names[0];}} p={[0,2.62,.3]} size={.17} />
  </group>;
}

/** 实验4-1：明矾处理样品与未经明矾处理的浑水对照。 */
export function AlumSettlingRig({ exp }: { exp: Experiment }) {
  const liquid=useRef<THREE.Mesh>(null),solid=useRef<THREE.Group>(null),spoon=useRef<THREE.Group>(null),rod=useRef<THREE.Group>(null);
  const entry=useRef({step:-1,time:0});
  useRig((io)=>{
    const step=io.idx('step'),started=io.n('add')>0||io.n('run')>0, treatment=io.opt('treatment').includes('明矾');
    if(entry.current.step!==step)entry.current={step,time:io.t};
    const settling=started&&treatment&&step>=3?smooth(clamp((io.t-entry.current.time)/5,0,1)):0;
    if(liquid.current){const c=(liquid.current.material as THREE.MeshBasicMaterial).color;c.set('#a99978').lerp(ALUM_SETTLED,settling*.8);}
    if(solid.current){solid.current.visible=started&&treatment&&step>=1;solid.current.position.y=.5-settling*.27;}
    if(spoon.current){spoon.current.visible=step===1;spoon.current.rotation.z=started?-.55:0;}
    if(rod.current){rod.current.visible=step===2;rod.current.rotation.z=started?Math.sin(io.t*3)*.18:-.15;}
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.21} />
    <Box p={[0,.08,0]} s={[3.5,.16,1]} m={MAT.wood} />
    <Vessel kind="beaker" p={[-.88,.16,0]} r={.65} h={1.45} /><Vessel kind="beaker" p={[.88,.16,0]} r={.65} h={1.45} />
    <mesh position={[-.88,.64,0]}><cylinderGeometry args={[.55,.55,.9,28]} /><meshBasicMaterial color="#a99978" transparent opacity={.9} depthWrite={false} /></mesh>
    <mesh ref={liquid} position={[.88,.64,0]}><cylinderGeometry args={[.55,.55,.9,28]} /><meshBasicMaterial color="#a99978" transparent opacity={.9} depthWrite={false} /></mesh>
    <group ref={solid} position={[.88,.5,.02]} visible={false}>{[[-.25,0,.05],[0,.12,.1],[.25,.03,0],[-.05,-.08,.1]].map((p,i)=><mesh key={i} position={p as V3}><dodecahedronGeometry args={[.09,0]} /><meshStandardMaterial color="#8b8062" /></mesh>)}</group>
    <group ref={spoon} position={[.9,1.95,0]} visible={false}><Rod a={[-.6,.2,0]} b={[0,0,0]} r={.025} m={MAT.steel} /><Cyl r={.12} h={.06} m={MAT.white} /></group>
    <group ref={rod} position={[.95,.65,0]} visible={false}><Rod a={[0,0,0]} b={[.2,1.45,0]} r={.025} m={MAT.glass} /></group>
    <Label text="未加明矾" p={[-.88,.18,.77]} size={.15} /><Label text="处理样品" p={[.88,.18,.77]} size={.15} />
    <IoLabel get={(io)=>{const names=['等量浑水对照','加入明矾粉末','搅拌使明矾溶解','静置比较沉降'];return names[io.idx('step')]??names[0];}} p={[0,2.62,.3]} size={.17} />
  </group>;
}

/** 实验6-1：原始红墨水与加木炭后的样品并列。 */
export function CharcoalAdsorptionRig({ exp }: { exp: Experiment }) {
  const liquid=useRef<THREE.Mesh>(null),flakes=useRef<THREE.Group>(null),flask=useRef<THREE.Group>(null);
  const entry=useRef({step:-1,time:0});
  useRig((io)=>{
    const step=io.idx('step'),started=io.n('add')>0||io.n('run')>0,amount=io.p('carbon',3),adsorption=io.s('adsorption',0);
    if(entry.current.step!==step)entry.current={step,time:io.t};
    const p=started&&step>=2?smooth(clamp((io.t-entry.current.time)/5,0,1)):0;
    if(liquid.current)(liquid.current.material as THREE.MeshBasicMaterial).color.set('#e85d71').lerp(INK_FADED,p*Math.min(1,adsorption));
    if(flakes.current)flakes.current.visible=started&&step>=1&&amount>0;
    if(flask.current)flask.current.rotation.z=started&&step===2?Math.sin(io.t*4)*.08:0;
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.21} />
    <Vessel kind="flask" p={[-.85,.08,0]} r={.6} h={1.5} />
    <mesh position={[-.85,.37,0]}><cylinderGeometry args={[.44,.44,.5,28]} /><meshBasicMaterial color="#e85d71" transparent opacity={.9} depthWrite={false} /></mesh>
    <group ref={flask} position={[.85,.08,0]}>
      <Vessel kind="flask" r={.6} h={1.5} />
      <mesh ref={liquid} position={[0,.29,0]}><cylinderGeometry args={[.44,.44,.5,28]} /><meshBasicMaterial color="#e85d71" transparent opacity={.9} depthWrite={false} /></mesh>
      <group ref={flakes} position={[0,.16,.05]} visible={false}>{[[-.18,0,0],[0,.04,.03],[.18,0,0]].map((p,i)=><mesh key={i} position={p as V3}><dodecahedronGeometry args={[.11,0]} /><meshStandardMaterial color="#252525" /></mesh>)}</group>
    </group>
    <Label text="红墨水对照" p={[-.85,.22,.7]} size={.15} /><Label text="木炭处理" p={[.85,.22,.7]} size={.15} />
    <IoLabel get={(io)=>{const names=['观察原液','加入木炭','轻轻振荡','比较吸附后的颜色'];return names[io.idx('step')]??names[0];}} p={[0,2.6,.3]} size={.17} />
  </group>;
}

const WATER_BEADS: V3[] = Array.from({length:14},(_,i)=>{
  const a=i*2*Math.PI/14; return [Math.cos(a)*.42,.4+(i%3)*.2,Math.sin(a)*.42] as V3;
});

/** 实验4-4：排空气、验纯、点燃，再用干燥烧杯观察水珠。 */
export function HydrogenWaterRig({ exp }: { exp: Experiment }) {
  const cover=useRef<THREE.Group>(null),sample=useRef<THREE.Group>(null);
  useRig((io)=>{
    const step=io.idx('step'),started=io.n('add')>0||io.n('run')>0,lit=io.sb('flame',false);
    if(sample.current)sample.current.visible=started&&step===2;
    if(cover.current){cover.current.position.x=io.damp('hydrogen-cover-x',started&&step>=4&&lit?.85:1.75,4);cover.current.position.y=io.damp('hydrogen-cover-y',started&&step>=4&&lit?1.48:.48,4);}
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.21} />
    <Vessel kind="flask" p={[-1.15,.08,0]} r={.48} h={1.4} level={.35} liquid="#d1e9e8" />
    <Cyl p={[-1.15,1.53,0]} r={.14} h={.2} m={MAT.rubber} />
    <Tube pts={[[-1.15,1.6,0],[-.65,1.85,0],[.3,1.85,0],[.85,1.3,0],[.85,.8,0]]} r={.04} m={MAT.glass} />
    <Cyl p={[.85,.75,0]} r={.07} h={.35} m={MAT.darkSteel} />
    <Flame p={[.85,.94,0]} kind="candle" color="#7db4ee" scale={.85} lit={(io)=>io.sb('flame',false)} />
    <group ref={cover} position={[1.75,.48,0]}>
      <group rotation={[Math.PI,0,0]}><Vessel kind="beaker" r={.49} h={1.05} /><Beads spots={WATER_BEADS} r={.045} amount={(io)=>io.s('waterDrops',0)} /></group>
    </group>
    <group ref={sample} position={[.15,.35,.3]} visible={false}><Vessel kind="tube" r={.23} h={.85} rot={[0,0,-.35]} /><Label text="验纯" p={[0,1.0,.1]} size={.15} /></group>
    <Label text="氢气供给（示意）" p={[-1.15,.28,.55]} size={.15} />
    <IoLabel get={(io)=>{const step=io.idx('step'); if(step>=3&&!io.sb('pure',false))return '未确认纯净，不点燃';const names=['连接装置','先排出空气','检验氢气纯度','纯净后点燃','罩干燥烧杯观察水珠'];return names[step]??names[0];}} p={[0,2.65,.3]} size={.17} />
  </group>;
}

/** 质量守恒：开放系统逸气与密闭气球保留气体的称量对照。 */
export function MassConservationComparisonRig({ exp }: { exp: Experiment }) {
  const flask=useRef<THREE.Group>(null),inner=useRef<THREE.Group>(null),balloon=useRef<THREE.Group>(null),bulb=useRef<THREE.Mesh>(null);
  useRig((io)=>{
    const step=io.idx('step'),started=io.n('add')>0||io.n('run')>0,reacted=started&&step>=1,closed=io.sb('closed',false);
    if(flask.current)flask.current.rotation.z=io.damp('mix-bottle',reacted&&step===1?-.22:0,3);
    if(inner.current)inner.current.rotation.z=io.damp('mix-acid',reacted?-.65:0,3);
    if(balloon.current)balloon.current.visible=closed;
    if(bulb.current){const v=io.damp('balloon-inflate',closed&&reacted?1:.3,2);bulb.current.scale.set(v,v,v);}
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.21} />
    <Box p={[0,.14,0]} s={[2.6,.28,1.15]} m={MAT.darkSteel} />
    <Box p={[0,.32,0]} s={[1.9,.08,.85]} m={MAT.white} />
    <Box p={[0,.15,.59]} s={[1.35,.16,.035]} m={MAT.black} />
    <IoLabel get={(io)=>io.idx('step')<2?'先记录称量结果':io.s('massTrend',0)<0?'所称质量减少':'反应前后相等'} p={[0,.16,.63]} size={.16} color="#e5eadf" />
    <group ref={flask} position={[0,.37,0]}>
      <Vessel kind="beaker" r={.67} h={1.35} level={.25} liquid="#e1efed" />
      <Cyl p={[0,.13,0]} r={.3} h={.13} m={MAT.white} />
      <group ref={inner} position={[.18,.28,0]}><Vessel kind="tube" r={.18} h={.86} level={.45} liquid="#d5eff1" /></group>
      <GasBubbles p={[0,.2,0]} height={.65} when={(io)=>io.s('bubbles',0)>0} />
      <group ref={balloon} position={[0,1.44,0]} visible={false}><Cyl r={.17} h={.16} m={MAT.rubber} /><mesh ref={bulb} position={[0,.42,0]}><sphereGeometry args={[.38,16,12]} /><meshStandardMaterial color="#b8665b" roughness={.8} /></mesh></group>
    </group>
    <Label text="Na₂CO₃ + 稀盐酸" p={[1.25,1.05,.35]} size={.15} />
    <IoLabel get={(io)=>`${io.sb('closed',false)?'密闭：气体留在系统':'开放：气体可逸出'} · ${io.opt('step')}`} p={[0,2.65,.3]} size={.16} />
  </group>;
}

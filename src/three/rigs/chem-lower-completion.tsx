/** 教材下册：分步骤操作的独立实验台。所有阶段由控件选择，结果只在相应步骤出现。 */
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { Flame, GasBubbles, Pile, Smoke } from './chemical-parts';
import { useRig, type RigIO } from './io';
import { IoLabel } from './parts';

const W = '#e8f2f2';
function When({ condition, children }: { condition: (io: RigIO) => boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useRig(io => { if (ref.current) ref.current.visible = condition(io); });
  return <group ref={ref} visible={false}>{children}</group>;
}
function Fluid({ p, r, h, color, visible = () => true }: { p: V3; r: number; h: number; color: (io: RigIO) => string; visible?: (io: RigIO) => boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useRig(io => { if (!ref.current) return; ref.current.visible = visible(io); (ref.current.material as THREE.MeshBasicMaterial).color.set(color(io)); });
  return <mesh ref={ref} position={p} visible={false} renderOrder={1}><cylinderGeometry args={[r, r, h, 24]} /><meshBasicMaterial color={W} transparent opacity={0.9} depthWrite={false} /></mesh>;
}
function Dropper({ p, active }: { p: V3; active: (io: RigIO) => boolean }) {
  return <group position={p}><Cyl p={[0, .36, 0]} r={.045} h={.34} m={MAT.glass} /><Ball p={[0, .57, 0]} r={.1} m={MAT.rubber} /><Droplets active={active} /></group>;
}
function Droplets({ active }: { active: (io: RigIO) => boolean }) {
  const drop = useRef<THREE.Mesh>(null);
  const wasActive = useRef(false); const startedAt = useRef(0);
  useRig(io => { if (!drop.current) return; const on=active(io); if (on && !wasActive.current) startedAt.current=io.t; wasActive.current=on; const elapsed=io.t-startedAt.current; drop.current.visible=on && elapsed<2; drop.current.position.y=.13-(elapsed*.7 % .55); });
  return <mesh ref={drop} visible={false}><sphereGeometry args={[.04, 10, 8]} /><meshBasicMaterial color="#70b9df" /></mesh>;
}
function Stirrer({ p, active }: { p: V3; active: (io: RigIO) => boolean }) {
  const ref = useRef<THREE.Group>(null);
  useRig(io => { if (ref.current) ref.current.rotation.z = active(io) ? Math.sin(io.t * 4) * .13 : -.18; });
  return <group ref={ref} position={p}><Rod a={[0,0,0]} b={[0,1.6,0]} r={.025} m={MAT.glass} /></group>;
}
function PouringCylinder({ p, active, color = '#d5e8e6' }: { p: V3; active: (io: RigIO) => boolean; color?: string }) {
  const ref = useRef<THREE.Group>(null); const wasActive=useRef(false); const startedAt=useRef(0);
  useRig(io => { const on=active(io); if(on&&!wasActive.current) startedAt.current=io.t; wasActive.current=on; const pouring=on && io.t-startedAt.current<2.2; if (ref.current) ref.current.rotation.z = io.damp('cylinder-tilt', pouring ? -.85 : 0, 4); });
  return <group ref={ref} position={p}><Vessel kind="cylinder" r={.22} h={1.2} level={.56} liquid={color} />
    {[.3,.5,.7,.9].map(y => <Rod key={y} a={[.22,y,.01]} b={[.31,y,.01]} r={.009} m={MAT.darkSteel} />)}
    <PourStream active={active} />
  </group>;
}
function PourStream({active}:{active:(io:RigIO)=>boolean}) {
  const ref=useRef<THREE.Mesh>(null); const wasActive=useRef(false); const startedAt=useRef(0);
  useRig(io=>{const on=active(io);if(on&&!wasActive.current)startedAt.current=io.t;wasActive.current=on;if(ref.current)ref.current.visible=on&&io.t-startedAt.current<2.2;});
  return <mesh ref={ref} visible={false} position={[-.33,.93,0]} rotation={[0,0,-.4]}><cylinderGeometry args={[.025,.025,.56,8]}/><meshBasicMaterial color="#86c7e7" transparent opacity={.8}/></mesh>;
}
function Balance({ p = [-1.55,0,0] }: { p?: V3 }) {
  return <group position={p}><Box p={[0,.08,0]} s={[1.1,.16,.66]} m={MAT.wood} /><Cyl p={[0,.65,0]} r={.06} h={1.15} m={MAT.brass} /><Box p={[0,1.2,0]} s={[1.5,.08,.14]} m={MAT.brass} />
    {[-.6,.6].map(x => <group key={x}><Rod a={[x,1.15,0]} b={[x,.72,0]} r={.013} m={MAT.steel} /><Cyl p={[x,.7,0]} r={.32} h={.06} m={MAT.steel} /></group>)}
  </group>;
}
function SaltPile({ p, visible }: { p: V3; visible: (io: RigIO)=>boolean }) {
  return <When condition={visible}><Pile p={p} r={.2} h={.09} color="#f2eee4" amount={1} /></When>;
}
function StageLabel({ exp, label }: { exp: Experiment; label: (io: RigIO) => string }) {
  return <><Label text={exp.title} p={[0,3.22,.3]} size={.2} /><IoLabel get={label} p={[0,2.75,.35]} size={.17} /></>;
}

/** 实验活动 6：教材固定示例，称 3 g 盐、量 47 mL 水，随后取 25 g 母液加 25 g 水。 */
export function SalinePreparationRig({ exp }: { exp: Experiment }) {
  const spoon = useRef<THREE.Group>(null);
  const beaker = useRef<THREE.Group>(null);
  useRig(io => {
    const s=io.idx('step');
    if (spoon.current) { spoon.current.position.x=io.damp('spoon-x',s===1?-.82:-1.6,4); spoon.current.rotation.z=io.damp('spoon-angle',s===1?-.38:0,4); }
    if (beaker.current) beaker.current.rotation.z=io.damp('beaker-pour',s===4?-.62:0,4);
  });
  return <group>
    <StageLabel exp={exp} label={io=>io.opt('step') || '计算'} />
    <When condition={io=>io.idx('step')<=1}><Balance /><SaltPile p={[-.95,.78,0]} visible={io=>io.idx('step')===1} />
      <group ref={spoon} position={[-1.6,1.55,0]}><Rod a={[0,0,0]} b={[.72,.32,0]} r={.025} m={MAT.steel} /><Cyl p={[.05,.02,0]} r={.12} h={.035} m={MAT.steel} /></group>
      <Label text="3 g NaCl" p={[-.95,1.4,.45]} size={.18} /><Label text="水 47 g" p={[-1.7,.2,.8]} size={.17} />
    </When>
    <When condition={io=>io.idx('step')>=2 && io.idx('step')<=5}>
      <group ref={beaker} position={[-.8,0,0]}><Vessel kind="beaker" r={.52} h={1.3} />
        <Fluid p={[0,.34,0]} r={.45} h={.58} visible={io=>io.idx('step')>=3} color={()=>W} />
        <SaltPile p={[0,.07,0]} visible={io=>io.idx('step')===2} />
      </group>
      <When condition={io=>io.idx('step')===3}><Stirrer p={[-.8,.4,0]} active={()=>true}/></When>
      <PouringCylinder p={[1.0,0,0]} active={io=>io.idx('step')===2 || io.idx('step')===5}/>
      <IoLabel get={io=>io.idx('step')===2?'量水 47 mL':io.idx('step')===3?'搅拌溶解成 6%':io.idx('step')===4?'量取母液 25 g ≈ 24.0 mL':'加水 25 mL，搅拌成 3%'} p={[.1,.18,.8]} size={.17} />
    </When>
    <When condition={io=>io.idx('step')===6}>
      {[-.85,.85].map((x,i)=><group key={x} position={[x,0,0]}><Vessel kind="jar" r={.43} h={1.45} level={i ? .7 : .36} liquid={W}/><Cyl p={[0,1.49,0]} r={.28} h={.13} m={MAT.rubber}/><Box p={[0,.75,.4]} s={[.55,.4,.03]} m={MAT.white}/><Label text={i?'NaCl 3%':'NaCl 6%'} p={[0,.78,.45]} size={.16}/><Label text={i?'50 g':'剩余 25 g'} p={[0,.17,.5]} size={.15}/></group>)}
    </When>
  </group>;
}

/** 实验 9-8：两组教材配比；两个溶液均无色，不能凭蓝色深浅判断浓度。 */
export function SalineComparisonRig({ exp }: { exp: Experiment }) {
  return <group><StageLabel exp={exp} label={io=>io.opt('step') || '计算'} />
    {[-.95,.95].map((x,i)=><group key={x} position={[x,0,0]}>
      <Vessel kind="beaker" r={.5} h={1.35} />
      <Fluid p={[0,.34,0]} r={.43} h={.58} visible={io=>io.idx('step')>=2} color={()=>W}/>
      <SaltPile p={[0,.08,0]} visible={io=>io.idx('step')>=1 && io.idx('step')<3} />
      <When condition={io=>io.idx('step')===3}><Stirrer p={[0,.3,0]} active={()=>true}/></When>
      <Label text={i?'20 g NaCl + 80 g 水':'10 g NaCl + 90 g 水'} p={[0,.22,.72]} size={.145}/>
      <When condition={io=>io.idx('step')>=4}><Label text={i?'20%':'10%'} p={[0,1.72,.4]} size={.22}/></When>
    </group>)}
    <When condition={io=>io.idx('step')===1}><Balance p={[0,0,-1]} /></When>
    <When condition={io=>io.idx('step')===2}><PouringCylinder p={[0,0,-.65]} active={()=>true}/></When>
  </group>;
}

/** 活动8：按教材分组的点滴板、铁锈、沉淀/溶解、中和/蒸发和氢氧化钙对照。 */
export function AcidBasePracticalRig({ exp }: { exp: Experiment }) {
  const topic=(io:RigIO)=>io.opt('stage');
  const progress=(io:RigIO)=>io.idx('process');
  const isIndicator=(io:RigIO)=>topic(io).includes('指示剂');
  const isRust=(io:RigIO)=>topic(io).includes('氧化物') || topic(io).includes('铁锈');
  const isNeutral=(io:RigIO)=>topic(io).includes('中和');
  const isPrecip=(io:RigIO)=>topic(io).includes('沉淀');
  const isLime=(io:RigIO)=>topic(io).includes('氢氧化钙');
  const tube=useRef<THREE.Group>(null); const phase=useRef(''); const phaseStarted=useRef(0);
  useRig(io=>{
    const key=topic(io)+':'+progress(io); if(key!==phase.current){phase.current=key;phaseStarted.current=io.t;}
    const elapsed=io.t-phaseStarted.current; const pouring=isNeutral(io)&&progress(io)===3&&elapsed<2.2;
    if(tube.current){tube.current.position.x=io.damp('neutral-tube-x',pouring?.35:-.85,3.2);tube.current.rotation.z=io.damp('neutral-tube-angle',pouring?-.72:0,3.2);}
  });
  const evaporating=(io:RigIO)=>isNeutral(io)&&progress(io)===3&&io.t-phaseStarted.current>=2.2;
  const crystals=(io:RigIO)=>evaporating(io)&&io.t-phaseStarted.current>=5;
  return <group><StageLabel exp={exp} label={io=>`${topic(io)} · ${io.opt('process') || '准备'}`} />
    <When condition={isIndicator}>
      <Box p={[0,.12,0]} s={[3.1,.22,1.2]} m={MAT.white} />
      {[-1.05,-.35,.35,1.05].map((x,i)=><group key={x} position={[x,.24,0]}><Cyl r={.25} h={.06} m={MAT.card} />
        <Fluid p={[0,.05,0]} r={.21} h={.05} color={io=>progress(io)===0?W:['#db5a5e','#557fce','#e8f2ef','#e88aaa'][i]} />
        <Label text={['酸+石蕊','碱+石蕊','酸+酚酞','碱+酚酞'][i]} p={[0,.18,.55]} size={.12} />
      </group>)}
      <Dropper p={[0,1.65,0]} active={io=>isIndicator(io)&&progress(io)===1}/>
      <IoLabel get={io=>progress(io)===0?'先准备酸、碱和指示剂':'对照酸碱条件下的颜色'} p={[0,1.3,.5]} size={.16}/>
    </When>
    <When condition={isRust}>
      {[-.75,.75].map((x,i)=><group key={x} position={[x,0,0]}>
        <Vessel kind="tube" r={.34} h={1.5}/><Fluid p={[0,.32,0]} r={.28} h={.54} color={io=>progress(io)>0?'#e4c789':W}/>
        <Rod a={[0,.2,0]} b={[0,1.25,0]} r={.055} m={MAT.steel}/>
        <When condition={io=>progress(io)===0}><Cyl p={[0,.58,0]} r={.09} h={.55} m={MAT.darkWood}/></When>
        {i===1 && <GasBubbles p={[0,.28,0]} count={5} height={.55} when={io=>isRust(io)&&progress(io)>=3}/>}
        <Label text={i?'继续浸泡':'除锈后取出'} p={[0,.18,.55]} size={.14}/>
      </group>)}
      <Dropper p={[-.75,1.7,0]} active={io=>isRust(io)&&progress(io)===1}/>
      <IoLabel get={io=>progress(io)===0?'两支生锈铁钉':progress(io)===1?'加稀盐酸，铁锈溶解':progress(io)===2?'一支除锈后取出':'另一支继续反应后取出'} p={[0,2.0,.35]} size={.16}/>
    </When>
    <When condition={isNeutral}>
      <group ref={tube} position={[-.85,0,0]}><Vessel kind="tube" r={.4} h={1.55}/>
      <Fluid p={[0,.37,0]} r={.33} h={.65} visible={io=>!crystals(io)} color={io=>progress(io)===1?'#ec86ae':W}/>
      <Dropper p={[0,1.72,0]} active={io=>isNeutral(io)&&(progress(io)===1||progress(io)===2)}/></group>
      <When condition={io=>isNeutral(io)&&progress(io)>=3}>
        <Cyl p={[.75,.76,0]} r={.56} h={.15} m={MAT.white}/><Cyl p={[.75,.82,0]} r={.44} h={.06} m={MAT.card}/>
        <AlcoholLamp p={[.75,0,0]} flame={0}/><Flame p={[.75,.65,0]} lit={evaporating}/>
        <Fluid p={[.75,.89,0]} r={.36} h={.04} visible={io=>evaporating(io)&&!crystals(io)} color={()=>W}/>
        <Smoke p={[.75,.9,0]} amount={io=>evaporating(io)&&!crystals(io)?.6:0} rise={.5} size={.05}/>
        <When condition={crystals}><Pile p={[.75,.9,0]} r={.2} h={.06} color="#f1eee7" /></When>
      </When>
      <IoLabel get={io=>['NaOH溶液','滴酚酞显红','滴盐酸至恰好无色',(io.t-phaseStarted.current<2.2?'转移无色液至蒸发皿':io.t-phaseStarted.current<5?'加热蒸发水分':'蒸干后观察固体')][progress(io)] || ''} p={[0,2.08,.38]} size={.16}/>
    </When>
    <When condition={isPrecip}>
      <Vessel kind="tube" r={.45} h={1.6}/>
      <Fluid p={[0,.38,0]} r={.38} h={.66} color={io=>progress(io)>=2?'#83c6db':'#5fa7d4'}/>
      <When condition={io=>isPrecip(io)&&progress(io)===1}><Pile p={[0,.12,0]} r={.27} h={.14} color="#377ab9" /></When>
      <Dropper p={[0,1.78,0]} active={io=>isPrecip(io)&&(progress(io)===1||progress(io)===2)}/>
      <IoLabel get={io=>['试管中硫酸铜溶液','滴 NaOH，生成蓝色沉淀','滴稀盐酸，沉淀逐渐溶解','观察溶液，不再有蓝色固体'][progress(io)] || ''} p={[1.25,1.0,.45]} size={.15}/>
    </When>
    <When condition={isLime}>
      {[-.75,.75].map((x,i)=><group key={x} position={[x,0,0]}><Vessel kind="tube" r={.34} h={1.5}/>
        <Fluid p={[0,.34,0]} r={.27} h={.58} color={io=>progress(io)===0?W:i===1&&progress(io)>=2?W:'#ed98b5'}/>
        <When condition={io=>progress(io)<=1 || i===0}><Pile p={[0,.1,0]} r={.2} h={.1} color="#ede9df" /></When>
        <IoLabel get={io=>progress(io)>=2?(i?'再加 1 mL 稀盐酸':'再加 1 mL 水'):'相同量氢氧化钙粉末'} p={[0,.15,.58]} size={.14}/>
      </group>)}
      <IoLabel get={io=>progress(io)===0?'两支试管加入等量氢氧化钙粉末':progress(io)===1?'各加 1 mL 水、振荡，再滴 2 滴酚酞：溶液变红':'加水一管仍红、有固体；加稀盐酸一管红色消失、固体溶解'} p={[0,2.05,.4]} size={.16}/>
    </When>
  </group>;
}

/** 活动5：颜色、刻画和导电；铜片受热；五种金属与酸；铁铜银置换对照。 */
export function MetalPracticalRig({ exp }: { exp: Experiment }) {
  const test=(io:RigIO)=>io.opt('test');
  const selected=(io:RigIO)=>io.n('add')>0 || io.n('run')>0 || io.idx('process')>0;
  const physical=(io:RigIO)=>test(io).includes('物理');
  const heated=(io:RigIO)=>test(io).includes('加热');
  const acid=(io:RigIO)=>test(io).includes('酸');
  const displacement=(io:RigIO)=>test(io).includes('置换');
  const copper = useRef<THREE.Mesh>(null);
  useRig(io=>{ if (copper.current) (copper.current.material as THREE.MeshStandardMaterial).color.set(heated(io)&&selected(io)?'#282727':'#bf714a'); });
  return <group><StageLabel exp={exp} label={io=>test(io) || '物理性质'}/>
    <When condition={physical}>
      <Box p={[0,.08,0]} s={[3.2,.15,1]} m={MAT.wood}/>
      {[-1.2,-.4,.4,1.2].map((x,i)=><group key={x} position={[x,.23,0]}><Box s={[.55,.12,.58]} m={[MAT.steel,MAT.steel,MAT.darkSteel,MAT.copper][i]}/><Label text={['镁','铝','铁','铜'][i]} p={[0,.2,.48]} size={.15}/></group>)}
      <When condition={selected}><Rod a={[-.4,.55,0]} b={[.4,.2,0]} r={.035} m={MAT.brass}/><Label text="刻画比较硬度" p={[0,1.2,.4]} size={.17}/><Box p={[-.6,1.65,-.35]} s={[.6,.28,.3]} m={MAT.darkSteel}/><Tube pts={[[-.3,1.65,-.3],[0,1.65,-.3],[.45,1.65,-.3]]} r={.025} m={MAT.copper}/><Ball p={[.55,1.68,-.3]} r={.13} m={MAT.brass}/><Label text="导电灯亮" p={[.58,2,.05]} size={.14}/></When>
    </When>
    <When condition={heated}>
      <AlcoholLamp p={[0,0,0]} flame={0}/><Flame p={[0,.7,0]} lit={io=>heated(io)&&selected(io)}/>
      <Rod a={[.75,1.8,0]} b={[.2,1.1,0]} r={.04} m={MAT.steel}/>
      <mesh ref={copper} position={[0,1.02,0]}><boxGeometry args={[.75,.08,.5]}/><meshStandardMaterial color="#bf714a" roughness={.7}/></mesh>
      <IoLabel get={io=>selected(io)?'铜片受热后表面生成黑色氧化铜':'铜片未加热'} p={[0,2.0,.4]} size={.17}/>
    </When>
    <When condition={acid}>
      {[-1.4,-.7,0,.7,1.4].map((x,i)=><group key={x} position={[x,0,0]}>
        <Vessel kind="tube" r={.25} h={1.22}/><Fluid p={[0,.29,0]} r={.19} h={.5} visible={selected} color={()=>W}/>
        <Cyl p={[0,.17,0]} r={.065} h={.2} m={i===4?MAT.copper:MAT.steel}/>
        <GasBubbles p={[0,.19,0]} count={5} height={.52} when={io=>acid(io)&&selected(io)&&i<4}/>
        <Label text={['镁','铝','锌','铁','铜'][i]} p={[0,.15,.46]} size={.15}/>
      </group>)}
      <IoLabel get={io=>selected(io)?'镁、铝、锌、铁可产生氢气；铜不反应':'选择稀酸并加入五支试管'} p={[0,1.8,.4]} size={.15}/>
    </When>
    <When condition={displacement}>
      {[-1.1,0,1.1].map((x,i)=><group key={x} position={[x,0,0]}><Vessel kind="tube" r={.34} h={1.4}/>
        <Fluid p={[0,.34,0]} r={.27} h={.58} color={io=>i===0 ? (selected(io)?'#9fcfa6':'#5ca9d4') : i===1 ? (selected(io)?'#5ca9d4':W) : W}/>
        <Rod a={[0,.2,0]} b={[0,1.25,0]} r={.05} m={i===0?MAT.steel:MAT.copper}/>
        {i<2&&<When condition={selected}><Pile p={[.02,.32,.03]} r={.12} h={.18} color={['#b85b3d','#e6e8ea'][i]}/></When>}
        <Label text={['铁 + 硫酸铜','铜 + 硝酸银','铜 + 稀盐酸（对照）'][i]} p={[0,.16,.55]} size={.12}/>
      </group>)}
      <IoLabel get={io=>selected(io)?'铁置换出铜；铜置换出银；铜与稀酸无气泡 → 铁 > 铜 > 银':'设计三组：放入金属，观察表面与溶液'} p={[0,1.95,.4]} size={.15}/>
    </When>
  </group>;
}

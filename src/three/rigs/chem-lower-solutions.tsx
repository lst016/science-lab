/** 化学下册：溶解性、饱和和 pH 比色的教材场景。 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Box, Cyl, Label, MAT, Rod, Vessel, type V3 } from '../kit';
import { Flame, Pile } from './chemical-parts';
import { clamp, useRig, type RigIO } from './io';
import { IoLabel } from './parts';

function When({test,children}:{test:(io:RigIO)=>boolean; children:ReactNode}) {
  const ref=useRef<THREE.Group>(null); useRig(io=>{if(ref.current)ref.current.visible=test(io);});
  return <group ref={ref} visible={false}>{children}</group>;
}
function Liquid({p,r,h,color,visible=()=>true,height}:{p:V3;r:number;h:number;color:(io:RigIO)=>string;visible?:(io:RigIO)=>boolean;height?:(io:RigIO)=>number}) {
  const ref=useRef<THREE.Mesh>(null); useRig(io=>{if(!ref.current)return;ref.current.visible=visible(io);(ref.current.material as THREE.MeshBasicMaterial).color.set(color(io));const current=height?height(io):h;ref.current.scale.y=current/h;ref.current.position.y=p[1]-h/2+current/2;});
  return <mesh ref={ref} position={p} visible={false} renderOrder={1}><cylinderGeometry args={[r,r,h,24]}/><meshBasicMaterial color="#e6f1f1" transparent opacity={.9} depthWrite={false}/></mesh>;
}
function Title({exp,note}:{exp:Experiment;note:(io:RigIO)=>string}) {
  return <><Label text={exp.title.slice(0,18)} p={[0,3.25,.3]} size={.2}/><IoLabel get={note} p={[0,2.9,.35]} size={.16}/></>;
}
function TargetArrow() {
  const ref=useRef<THREE.Group>(null);
  useRig(io=>{if(!ref.current)return;const index=io.idx('solute')*2+io.idx('solvent');ref.current.position.x=[-1.5,-.5,.5,1.5][index]??-1.5;});
  return <group ref={ref} position={[-1.5,0,0]}><Label text="↓" p={[0,2.04,.35]} size={.2}/></group>;
}
function SolventTube({x,i}:{x:number;i:number}) {
  const ref=useRef<THREE.Group>(null); const lastCount=useRef(0);const started=useRef(0);
  useRig(io=>{const count=io.n('stir'); if(count>0&&count!==lastCount.current)started.current=io.t;lastCount.current=count;const t=io.t-started.current;if(ref.current)ref.current.rotation.z=count>0&&t<2?Math.sin(t*13)*.15:0;});
  const begun=(io:RigIO)=>io.n('add')>0||io.n('run')>0;
  const colors=['#dfd3a4','#9460a7','#a855a4','#e6f1f1'];
  return <group position={[x,0,0]}><group ref={ref}>
    <Vessel kind="tube" r={.27} h={1.35}/>
    <Liquid p={[0,.31,0]} r={.22} h={.53} color={()=>colors[i]} visible={begun}/>
    <When test={io=>!begun(io)||i===0||i===3}><Pile p={[0,.09,0]} r={.11} h={.1} color={i<2?'#696862':'#643e6e'}/></When>
  </group><Label text={['碘 + 水','碘 + 汽油','高锰酸钾 + 水','高锰酸钾 + 汽油'][i]} p={[0,.13,.5]} size={.125}/></group>;
}
/** 实验9-2：四管同时对照；选项只高亮，点击加入演示四组，振荡触发短暂摇动。 */
export function SolventComparisonRig({exp}:{exp:Experiment}) {
  return <group><Title exp={exp} note={io=>io.n('add')||io.n('run')?'四组加入溶剂，点击振荡':'每支试管预装一小粒溶质'}/>
    {[-1.5,-.5,.5,1.5].map((x,i)=><SolventTube key={x} x={x} i={i}/>)}<TargetArrow />
    <Label text="各加 5 mL 水或汽油" p={[0,2.38,.35]} size={.15}/>
  </group>;
}

function CrystalCloud({visible}:{visible:(io:RigIO)=>boolean}) {
  const refs=useRef<(THREE.Mesh|null)[]>([]);
  useRig(io=>refs.current.forEach((m,i)=>{if(m){const amount=io.s('crystals',io.s('undissolved',0));m.visible=visible(io)&&amount>i*.15;}}));
  return <group>{Array.from({length:8},(_,i)=><mesh key={i} ref={m=>{refs.current[i]=m;}} visible={false} position={[(i%4-1.5)*.15,.12,(Math.floor(i/4)-.5)*.2]} rotation={[i*.2,i*.4,0]}><octahedronGeometry args={[.09,0]}/><meshBasicMaterial color="#f6f3e9"/></mesh>)}</group>;
}
function SpoonTransfer({condition,y=1.7}:{condition:(io:RigIO)=>boolean;y?:number}) {
  const ref=useRef<THREE.Group>(null),was=useRef(false),start=useRef(0),lastStep=useRef(-1);
  useRig(io=>{const active=condition(io),step=io.idx('step');if(active&&(!was.current||step!==lastStep.current))start.current=io.t;was.current=active;lastStep.current=step;const t=io.t-start.current;const inward=active&&t<2.3;if(ref.current){ref.current.position.x=io.damp('spoon-x',inward?-.15:-1.35,3);ref.current.rotation.z=io.damp('spoon-turn',inward?-.45:0,3);}});
  return <group ref={ref} position={[-1.35,y,0]}><Rod a={[0,0,0]} b={[-.65,.3,0]} r={.025} m={MAT.steel}/><Cyl p={[0,.02,0]} r={.13} h={.04} m={MAT.steel}/><Pile p={[0,.06,0]} r={.09} h={.06} color="#f3efe5"/></group>;
}
function AddWater({test}:{test:(io:RigIO)=>boolean}) {
  const ref=useRef<THREE.Group>(null),was=useRef(false),start=useRef(0);
  useRig(io=>{const on=test(io);if(on&&!was.current)start.current=io.t;was.current=on;const flowing=on&&io.t-start.current<2.2;if(ref.current)ref.current.rotation.z=io.damp('water-angle',flowing?-.75:0,3);});
  return <group ref={ref} position={[1.2,.35,0]}><Vessel kind="cylinder" r={.25} h={1.35} level={.55} liquid="#cee9f0"/><Label text="量筒" p={[.05,.35,.3]} size={.14}/></group>;
}
/** 按教材步骤显示余量；数值由模型状态给出，不由几何猜测。 */
export function SolubilityStepsRig({exp}:{exp:Experiment}) {
  const isKNO3=exp.sceneVariant==='potassium-nitrate-solubility';
  const phase=(io:RigIO)=>io.idx('step');
  const added=(io:RigIO)=>phase(io)>0;
  const heat=(io:RigIO)=>isKNO3&&io.sb('heating',false);
  return <group><Title exp={exp} note={io=>io.opt('step')||'准备10 mL水'}/>
    {isKNO3&&<group>
      <Rod a={[-.62,.05,0]} b={[-.62,.88,0]} r={.025} m={MAT.darkSteel}/><Rod a={[.62,.05,0]} b={[.62,.88,0]} r={.025} m={MAT.darkSteel}/><Rod a={[0,.05,-.5]} b={[0,.88,-.5]} r={.025} m={MAT.darkSteel}/>
      <group>{Array.from({length:7},(_,i)=><Rod key={'x'+i} a={[-.68,.87,-.5+i/6]} b={[.68,.87,-.5+i/6]} r={.009} m={MAT.darkSteel}/>)}{Array.from({length:7},(_,i)=><Rod key={'z'+i} a={[-.68+i*1.36/6,.87,-.5]} b={[-.68+i*1.36/6,.87,.5]} r={.009} m={MAT.darkSteel}/>)}</group>
      <AlcoholLamp p={[0,0,.62]} flame={0}/><Flame p={[0,.71,.62]} lit={heat}/>
    </group>}
    <Vessel kind="beaker" p={[0,isKNO3?.9:0,0]} r={.54} h={1.38}/>
    <Liquid p={[0,isKNO3?1.19:.29,0]} r={.46} h={.45} color={()=>'#e7f1ed'} height={io=>isKNO3?.45:io.s('waterMass',10)>=20?.9:.45}/>
    <When test={io=>added(io)&&io.s('undissolved',0)>.01&&io.s('crystals',0)<=.01}><group position={[0,isKNO3?.97:.08,0]}><Pile r={.29} h={.13} color="#f0eee6" amount={io=>clamp(io.s('undissolved',0)/2,.15,1)}/></group></When>
    {isKNO3&&<When test={io=>io.s('crystals',0)>.01}><group position={[0,.97,0]}><CrystalCloud visible={()=>true}/></group></When>}
    <SpoonTransfer y={isKNO3?2.52:1.7} condition={io=>phase(io)===1||phase(io)===2||(isKNO3&&phase(io)===4)}/>
    {!isKNO3&&<AddWater test={io=>phase(io)===3}/>}
    <Rod a={[.15,isKNO3?1.4:0.5,.05]} b={[.45,isKNO3?2.9:2,0]} r={.025} m={MAT.glass}/>
    <IoLabel get={io=>{const x=io.s('undissolved',0);return io.s('crystals',0)>.01?'冷却析出晶体':x>.01?'有未溶固体':added(io)?'搅拌后观察溶解':'10 mL 水';}} p={[0,.12,.75]} size={.16}/>
  </group>;
}

const PH_COLORS=['#c44342','#d35240','#e47a40','#e89d42','#dfb948','#d0ca55','#a4be59','#70af65','#5eaba1','#568eb7','#586db0','#775ca5','#8c5399','#994f8b','#9e4c80'];
function PhCard() {
  return <group position={[.8,.16,-.1]}><Box s={[1.75,.08,.75]} m={MAT.white}/>
    {PH_COLORS.map((color,i)=><group key={color+i} position={[(i-7)*.105,.065,0]}><mesh><boxGeometry args={[.095,.03,.38]}/><meshBasicMaterial color={color}/></mesh><Label text={String(i)} p={[0,.07,.3]} size={.075}/></group>)}
    <Label text="标准比色卡（示意）" p={[0,.11,-.4]} size={.11}/>
  </group>;
}
function PHSpot() {
  const ref=useRef<THREE.Mesh>(null);
  useRig(io=>{if(!ref.current)return;const stage=io.idx('step');const reported=io.o?.state.pH;const hasSetting=io.exp.parameters.some(q=>q.key==='pH');const ph=typeof reported==='number'?reported:hasSetting?io.p('pH',7):undefined;const acid=io.ss('acidity','待测');ref.current.visible=stage>=2&&(typeof ph==='number'||acid==='酸性'||acid==='碱性');const color=typeof ph==='number'?PH_COLORS[Math.round(clamp(ph,0,14))]:acid==='酸性'?'#e47a40':'#586db0';(ref.current.material as THREE.MeshBasicMaterial).color.set(color);});
  return <mesh ref={ref} position={[-.18,.24,.03]} visible={false}><boxGeometry args={[.22,.025,.22]}/><meshBasicMaterial color="#d3c765"/></mesh>;
}
function SamplingRod() {
  const ref=useRef<THREE.Group>(null);
  useRig(io=>{const step=io.idx('step');if(!ref.current)return;ref.current.position.x=io.damp('ph-rod-x',step===1?-1.2:step>=2?-.18:-.7,4);ref.current.position.y=io.damp('ph-rod-y',step===1?.8:step===2?.4:1.3,4);ref.current.rotation.z=io.damp('ph-rod-r',step===1?.12:step===2?.5:-.5,4);});
  return <group ref={ref} position={[-.7,1.3,0]}><Rod a={[0,0,0]} b={[0,1,0]} r={.027} m={MAT.glass}/></group>;
}
function PHMarker() {
  const ref=useRef<THREE.Group>(null);
  useRig(io=>{if(!ref.current)return;const ph=io.o?.state.pH;ref.current.visible=io.idx('step')>=3&&typeof ph==='number';if(typeof ph==='number')ref.current.position.x=.8+(Math.round(clamp(ph,0,14))-7)*.105;});
  return <group ref={ref} visible={false} position={[.8,0,0]}><Label text="↑" p={[0,.38,.36]} size={.18}/></group>;
}
/** 干净玻璃棒点样，试纸显示后与标准卡比较；未知样品不伪造精确pH。 */
export function PHMeasurementRig({exp}:{exp:Experiment}) {
  return <group><Title exp={exp} note={io=>io.opt('step')||'准备试纸'}/>
    <Vessel kind="beaker" p={[-1.2,0,0]} r={.36} h={1} level={.5} liquid="#e0eeee"/>
    <Label text="待测液" p={[-1.2,.18,.5]} size={.15}/>
    <Box p={[-.2,.1,0]} s={[.72,.16,.62]} m={MAT.white}/><Box p={[-.18,.2,0]} s={[.42,.04,.25]} m={MAT.card}/><PHSpot/>
    <SamplingRod/><PhCard/><PHMarker/>
    <IoLabel get={io=>io.idx('step')<2?'用玻璃棒蘸取并点到试纸':typeof io.o?.state.pH==='number'?`示例 pH ${io.s('pH',7).toFixed(0)}（比色近似）`:io.ss('acidity','待测')==='待测'?'未知样品：需实际比色':'仅呈酸碱性，需比色得具体pH'} p={[0,1.8,.4]} size={.15}/>
  </group>;
}

/** 教材表9-1：0至100℃每10℃的数据，单位 g / 100 g 水。 */
const SOLUBILITY_DATA: Record<string,number[]>={
  '氯化钠':[35.7,35.8,36.0,36.3,36.6,37.0,37.3,37.8,38.4,39.0,39.8],
  '氯化钾':[27.6,31.0,34.0,37.0,40.0,42.6,45.5,48.3,51.1,54.0,56.7],
  '氯化铵':[29.4,33.3,37.2,41.4,45.8,50.4,55.2,60.2,65.6,71.3,77.3],
  '硝酸钾':[13.3,20.9,31.6,45.8,63.9,85.5,110,138,169,202,246],
};
const CURVE_COLORS:Record<string,string>={'氯化钠':'#a35227','氯化钾':'#24669e','氯化铵':'#288243','硝酸钾':'#bd343e'};
const curveX=(temp:number)=>-1.42+temp/100*2.84;
const curveY=(value:number)=>.35+value/260*1.98;
function interpolate(values:number[],temperature:number){const t=clamp(temperature,0,100)/10, i=Math.min(9,Math.floor(t));return values[i]+(values[i+1]-values[i])*(t-i);}
function Curve({name}:{name:string}) {
  const material=useMemo(()=>new THREE.MeshBasicMaterial({color:CURVE_COLORS[name],transparent:true,opacity:.9,depthWrite:false}),[name]);
  useEffect(()=>()=>material.dispose(),[material]);
  useRig(io=>{const selected=io.opt('solute')||'氯化钠';material.opacity=selected===name?1:.2;});
  const data=SOLUBILITY_DATA[name];
  return <group>{data.slice(1).map((value,i)=><Rod key={i} a={[curveX(i*10),curveY(data[i]),.12]} b={[curveX((i+1)*10),curveY(value),.12]} r={.013} m={material} cast={false}/>)}
    {data.map((value,i)=><Ball key={'p'+i} p={[curveX(i*10),curveY(value),.12]} r={.025} m={material}/>)}
  </group>;
}
function CurveMarker() {
  const ref=useRef<THREE.Mesh>(null);
  useRig(io=>{if(!ref.current)return;const name=io.opt('solute')||'氯化钠', temp=io.p('temperature',20),values=SOLUBILITY_DATA[name]??SOLUBILITY_DATA['氯化钠'];ref.current.position.set(curveX(temp),curveY(interpolate(values,temp)),.15);(ref.current.material as THREE.MeshBasicMaterial).color.set(CURVE_COLORS[name]??CURVE_COLORS['氯化钠']);});
  return <mesh ref={ref}><sphereGeometry args={[.07,12,8]}/><meshBasicMaterial color="#a7633f"/></mesh>;
}
/** 真实教材表9-1参考点和连接线；非表中温度只表示线性插值估读。 */
export function SolubilityCurveRig({exp}:{exp:Experiment}) {
  return <group><Title exp={exp} note={io=>`${io.opt('solute')||'氯化钠'} · ${io.p('temperature',20).toFixed(0)} ℃`}/>
    <Box p={[0,1.36,-.12]} s={[3.3,2.3,.08]} m={MAT.white}/>
    {[0,50,100,150,200,250].map(v=><group key={v}><Rod a={[-1.42,curveY(v),0]} b={[1.42,curveY(v),0]} r={.006} m={MAT.steel}/><Label text={String(v)} p={[-1.6,curveY(v),.16]} size={.1}/></group>)}
    {[0,20,40,60,80,100].map(t=><group key={t}><Rod a={[curveX(t),.35,0]} b={[curveX(t),2.33,0]} r={.006} m={MAT.steel}/><Label text={String(t)} p={[curveX(t),.23,.16]} size={.1}/></group>)}
    {Object.keys(SOLUBILITY_DATA).map(name=><Curve key={name} name={name}/>)}<CurveMarker/>
    <Label text="温度 / ℃" p={[0,.02,.15]} size={.12}/><Label text="溶解度 / g·100g水⁻¹" p={[-1,2.55,.15]} size={.11}/>
    <IoLabel get={io=>`${io.opt('solute')||'氯化钠'}：${io.s('solubility',interpolate(SOLUBILITY_DATA['氯化钠'],20)).toFixed(1)} g / 100 g 水`} p={[.65,2.55,.18]} size={.13}/>
  </group>;
}

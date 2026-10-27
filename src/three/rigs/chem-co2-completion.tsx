import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Cyl, Label, MAT, Rod, Tube, Vessel } from '../kit';
import { Candle, Flame, GasBubbles, Liquid, Pile, Stand } from './chemical-parts';
import { useRig, type RigIO } from './io';
import { IoLabel } from './parts';

function When({ show, children }: { show:(io:RigIO)=>boolean; children:ReactNode }) {
  const ref=useRef<THREE.Group>(null);
  useRig(io=>{if(ref.current)ref.current.visible=show(io);});
  return <group ref={ref} visible={false}>{children}</group>;
}
function Sample() {
  const ref=useRef<THREE.Mesh>(null);
  useRig(io=>{if(ref.current)(ref.current.material as THREE.MeshBasicMaterial).color.set(io.ss('liquidColor','purple')==='red'?'#dc625e':'#8e70ad');});
  return <mesh ref={ref} position={[0,.34,0]}><cylinderGeometry args={[.22,.22,.57,24]}/><meshBasicMaterial color="#8e70ad" transparent opacity={.9} depthWrite={false}/></mesh>;
}
/** 教材实验活动3：先制取收集，再选择蜡烛、石蕊加热和石灰水检验。 */
export function CO2PropertiesRig({exp}:{exp:Experiment}) {
  const ready=(io:RigIO)=>io.sb('gasReady',false);
  const is=(label:string)=>(io:RigIO)=>ready(io)&&io.opt('test').includes(label);
  return <group>
    <Label text={exp.title} p={[0,3.25,.4]} size={.20}/>
    <When show={io=>!ready(io)}>
      <Stand p={[-1.5,0,-.3]} h={2.45}/>
      <Vessel kind="tube" p={[-1,0,0]} r={.32} h={1.32} level={.35} liquid="#d8eded"/>
      <Pile p={[-1,.16,0]} r={.18} h={.16} color="#e6e3d9"/>
      <Cyl p={[-1,1.34,0]} r={.2} h={.17} m={MAT.rubber}/>
      <Tube pts={[[-1,1.42,0],[-.6,1.67,0],[.3,1.67,0],[.85,1.05,0],[.85,.18,0]]} r={.035} m={MAT.glass}/>
      <Vessel kind="jar" p={[.85,0,0]} r={.45} h={1.35}/>
      <GasBubbles p={[-1,.2,0]} count={8} height={.65}/>
      <Label text="石灰石 + 稀盐酸" p={[-1,.1,.6]} size={.13}/><Label text="向上排空气收集" p={[.85,.1,.65]} size={.13}/>
      <IoLabel get={io=>io.n('add')?'正在产生CO₂，点击收集气体':'先加入稀盐酸'} p={[0,2.15,.3]} size={.17}/>
    </When>
    <When show={is('蜡烛')}>
      <Vessel kind="beaker" p={[-.55,0,0]} r={.75} h={1.6}/>
      <Candle p={[-.55,.03,0]} lit={()=>false}/>
      <Vessel kind="jar" p={[1.1,.55,0]} r={.4} h={1.25} rot={[0,0,-.9]}/>
      <Label text="倾倒CO₂ · 烛焰熄灭" p={[0,2.15,.4]} size={.18}/>
    </When>
    <When show={is('石蕊')}>
      {[-.65,.65].map((x,i)=><group key={x} position={[x,0,0]}><Vessel kind="tube" r={.28} h={1.4}/>{i===0?<mesh position={[0,.34,0]}><cylinderGeometry args={[.22,.22,.57,24]}/><meshBasicMaterial color="#8e70ad" transparent opacity={.9} depthWrite={false}/></mesh>:<Sample/>}<Label text={i?'通CO₂':'静置对照'} p={[0,.1,.52]} size={.14}/></group>)}
      <When show={io=>is('石蕊')(io)&&io.opt('litmusHeat').includes('加热后')}><AlcoholLamp p={[.65,0,.55]} flame={0}/><Flame p={[.65,.7,.55]} lit={()=>true}/></When>
      <IoLabel get={io=>io.sb('litmusRestored',false)?'加热后恢复紫色':'通CO₂后变红'} p={[0,1.9,.4]} size={.16}/>
    </When>
    <When show={is('石灰水')}>
      <Vessel kind="tube" r={.35} h={1.45}/><Liquid p={[0,.12,0]} r={.29} level={.65} color="milky-white"/>
      <Tube pts={[[.8,1.8,0],[.35,1.8,0],[.1,.5,0]]} r={.035} m={MAT.glass}/><GasBubbles p={[.1,.2,0]} count={6} height={.55} when={()=>true}/>
      <Label text="CO₂使石灰水变浑浊" p={[0,2.15,.35]} size={.17}/>
    </When>
    <When show={is('水中')}><Vessel kind="jar" r={.46} h={1.4} level={.45} liquid="#bce1e7"/><Label text="CO₂部分溶于水（选做）" p={[0,1.9,.35]} size={.17}/></When>
    <When show={ready}><Vessel kind="jar" p={[1.5,0,-.35]} r={.33} h={1.05}/><Label text="已收集CO₂" p={[1.5,.12,.2]} size={.13}/></When>
  </group>;
}

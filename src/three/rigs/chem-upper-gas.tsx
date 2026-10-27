import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel } from '../kit';
import { Ember, Flame, GasBubbles, Liquid, Stand } from './chemical-parts';
import { useRig } from './io';
import { IoLabel } from './parts';

/** 实验2-5：试管口棉花、排空气、排水集气、检验、先撤管再停火。 */
export function PermanganateOxygenRig({ exp }: { exp: Experiment }) {
  const inlet = useRef<THREE.Group>(null);
  const withdrawn = useRef<THREE.Group>(null);
  const jarGas = useRef<THREE.Mesh>(null);
  const splint = useRef<THREE.Group>(null);
  useRig((io) => {
    const step = io.idx('step');
    const hasStarted = io.n('add') > 0 || io.n('run') > 0;
    const collecting = io.sb('gasReady', false);
    if (inlet.current) inlet.current.visible = step < 4;
    if (withdrawn.current) withdrawn.current.visible = step >= 4;
    if (jarGas.current) jarGas.current.visible = collecting;
    if (splint.current) splint.current.visible = step === 3 && collecting && hasStarted;
  });
  return <group>
    <Label text={exp.title} p={[0,3.18,.3]} size={.21} />
    <Stand p={[-1.8,0,-.3]} h={2.65} />
    <group position={[-1.15,1.48,0]} rotation={[0,0,-1.69]}>
      <Vessel kind="tube" p={[0,-.72,0]} r={.28} h={1.44} />
      <group position={[0,-.48,0]}>
        {[[-.1,0,.05],[.08,.05,.04],[0,.13,-.03]].map((p,i)=><mesh key={i} position={p as [number,number,number]}><dodecahedronGeometry args={[.12,0]} /><meshStandardMaterial color="#513b5b" /></mesh>)}
      </group>
      <mesh position={[0,.50,0]}><sphereGeometry args={[.19,12,8]} /><meshStandardMaterial color="#f2efe6" roughness={1} /></mesh>
      <Cyl p={[0,.73,0]} r={.23} h={.2} m={MAT.rubber} />
    </group>
    <Tube pts={[[-.44,1.39,0],[-.15,1.57,0],[.36,1.57,0],[.58,1.15,0]]} r={.04} m={MAT.glass} />
    <group ref={inlet}><Tube pts={[[.58,1.15,0],[.58,.38,0],[.98,.32,0],[.98,.52,0]]} r={.04} m={MAT.glass} /></group>
    <group ref={withdrawn} visible={false}><Tube pts={[[.58,1.15,0],[.58,.91,0],[.2,.96,0]]} r={.04} m={MAT.glass} /></group>
    <Vessel kind="beaker" p={[.95,0,.05]} r={.83} h={.72} level={.62} liquid="#bce2ea" />
    <Vessel kind="jar" p={[1.05,1.7,.05]} r={.4} h={1.3} level={0} rot={[Math.PI,0,0]} />
    <mesh ref={jarGas} position={[1.05,1.46,.05]} visible={false}><cylinderGeometry args={[.34,.34,.45,24]} /><meshBasicMaterial color="#e3f6f5" transparent opacity={.75} depthWrite={false} /></mesh>
    <AlcoholLamp p={[-1.55,.08,.18]} flame={0} /><Flame p={[-1.55,.8,.18]} stateKey="heating" />
    <GasBubbles p={[.8,.12,.05]} count={7} height={.55} when={(io)=>io.s('bubbles',0)>0 && io.idx('step')<4} />
    <group ref={splint} visible={false}><Rod a={[1.05,1.45,.25]} b={[1.05,2.18,.25]} r={.032} m={MAT.wood} /><Ember p={[1.05,1.44,.25]} when={(io)=>io.sb('gasReady',false)&&io.idx('step')===3} bright={(io)=>io.sb('gasReady',false)} /><Flame p={[1.05,1.43,.25]} scale={.5} lit={(io)=>io.sb('gasReady',false)&&io.idx('step')===3} /></group>
    <Label text="棉花" p={[-.42,1.97,.3]} size={.16} /><Label text="排水集气" p={[1.05,.3,.92]} size={.16} />
    <IoLabel get={(io)=>{const names=['检查气密 · 装药与棉花','加热 · 先排尽空气','排水收集氧气','带火星木条检验','先将导管移出水面','再熄灭酒精灯']; return names[io.idx('step')]??names[0];}} p={[0,2.63,.3]} size={.17} />
  </group>;
}

/** 探究2：同等量H₂O₂的未加/加MnO₂对照与再次加入。 */
export function PeroxideCatalystRig({ exp }: { exp: Experiment }) {
  const catalyst = useRef<THREE.Group>(null);
  const leftStick = useRef<THREE.Group>(null);
  const rightStick = useRef<THREE.Group>(null);
  const pipette = useRef<THREE.Group>(null);
  const drop = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const step=io.idx('step'), started=io.n('add')>0||io.n('run')>0, hasLiquid=io.p('amount',5)>0;
    if(catalyst.current) catalyst.current.visible=started&&step>=2;
    if(leftStick.current) leftStick.current.visible=started&&hasLiquid&&step===1;
    if(rightStick.current) rightStick.current.visible=started&&hasLiquid&&io.s('bubbles',0)>0&&(step===3||step===5);
    if(pipette.current) pipette.current.visible=started&&step===4;
    if(drop.current){const t=(io.t*.7)%1;drop.current.visible=started&&hasLiquid&&step===4&&io.n('add')>=2;drop.current.position.y=2.4-t*.65;}
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.21} />
    <Box p={[0,.08,0]} s={[2.7,.16,.8]} m={MAT.wood} />
    <Vessel kind="tube" p={[-.75,.16,0]} r={.4} h={1.55} />
    <Liquid p={[-.75,.18,0]} r={.34} level={(io)=>(io.n('add')>0||io.n('run')>0)?Math.min(1,io.p('amount',5)/10)*1.1:0} color="clear" />
    <Vessel kind="tube" p={[.75,.16,0]} r={.4} h={1.55} />
    <Liquid p={[.75,.18,0]} r={.34} level={(io)=>(io.n('add')>0||io.n('run')>0)&&io.idx('step')>=2?Math.min(1,io.p('amount',5)/10)*1.1:0} color="clear" />
    <group ref={catalyst} position={[.75,.32,0]} visible={false}>{[[-.16,0,.05],[0,.02,0],[.16,0,.04]].map((p,i)=><mesh key={i} position={p as [number,number,number]}><dodecahedronGeometry args={[.12,0]} /><meshStandardMaterial color="#2b2c2b" /></mesh>)}</group>
    <GasBubbles p={[-.75,.25,0]} count={3} height={.58} rate={()=>.25} when={(io)=>(io.n('add')>0||io.n('run')>0)&&io.p('amount',5)>0} />
    <GasBubbles p={[.75,.25,0]} count={10} height={.6} when={(io)=>(io.n('add')>0||io.n('run')>0)&&io.p('amount',5)>0&&io.idx('step')>=2&&io.s('bubbles',0)>0} />
    <group ref={leftStick} visible={false}><Rod a={[-.75,1.45,.12]} b={[-.75,2.15,.12]} r={.03} m={MAT.wood} /><Ember p={[-.75,1.45,.12]} when={()=>true} /></group>
    <group ref={rightStick} visible={false}><Rod a={[.75,1.45,.12]} b={[.75,2.15,.12]} r={.03} m={MAT.wood} /><Ember p={[.75,1.45,.12]} when={()=>true} bright={()=>true} /><Flame p={[.75,1.45,.12]} scale={.5} lit={()=>true} /></group>
    <group ref={pipette} position={[.75,2.45,0]} visible={false}><Cyl r={.05} h={.42} m={MAT.glass} /><Ball p={[0,.26,0]} r={.10} m={MAT.rubber} /></group>
    <mesh ref={drop} position={[.75,2.2,0]} visible={false}><sphereGeometry args={[.055,10,8]} /><meshBasicMaterial color="#b5e6ee" /></mesh>
    <Label text="不加催化剂" p={[-.75,.04,.6]} size={.15} /><Label text="加入二氧化锰" p={[.75,.04,.6]} size={.15} />
    <IoLabel get={(io)=>{const names=['加入过氧化氢','未加催化剂时检验','加入二氧化锰','带火星木条复燃','现象停止后再加过氧化氢','重复检验'];return names[io.idx('step')]??names[0];}} p={[0,2.7,.3]} size={.17} />
  </group>;
}

/** 水电解器双管，电极气体及两支燃着的检验木条分开显示。 */
export function WaterElectrolysisRig({ exp }: { exp: Experiment }) {
  const hGas=useRef<THREE.Mesh>(null), oGas=useRef<THREE.Mesh>(null), switchArm=useRef<THREE.Group>(null), hStick=useRef<THREE.Group>(null), oStick=useRef<THREE.Group>(null);
  useRig((io)=>{
    const h=io.s('hydrogenVolume',0), o=io.s('oxygenVolume',0), step=io.idx('step'), on=io.sb('closed',false);
    for(const [mesh,vol,max,height] of [[hGas.current,h,2,.7],[oGas.current,o,1,.35]] as const){if(!mesh)continue;const f=Math.min(1,Math.max(0,vol/max));mesh.visible=f>0;mesh.scale.y=Math.max(.001,f*height);mesh.position.y=1.97-(f*height)/2;}
    if(switchArm.current)switchArm.current.rotation.z=on?0:.48;
    if(hStick.current)hStick.current.visible=step===3&&h>0&&!on;
    if(oStick.current)oStick.current.visible=step===4&&o>0&&!on;
  });
  const hWater=(io: import('./io').RigIO)=>1.5-Math.min(1,Math.max(0,io.s('hydrogenVolume',0)/2))*.7;
  const oWater=(io: import('./io').RigIO)=>1.5-Math.min(1,Math.max(0,io.s('oxygenVolume',0)))*.35;
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.21} />
    <Box p={[0,.08,0]} s={[2.3,.16,.9]} m={MAT.darkSteel} />
    <Vessel kind="tube" p={[-.55,.34,0]} r={.32} h={1.65} /><Liquid p={[-.55,.36,0]} r={.27} level={hWater} color="clear" />
    <Vessel kind="tube" p={[.55,.34,0]} r={.32} h={1.65} /><Liquid p={[.55,.36,0]} r={.27} level={oWater} color="clear" />
    <mesh ref={hGas} position={[-.55,1.97,0]} visible={false}><cylinderGeometry args={[.26,.26,1,24]} /><meshBasicMaterial color="#e9f8f6" transparent opacity={.85} depthWrite={false} /></mesh>
    <mesh ref={oGas} position={[.55,1.97,0]} visible={false}><cylinderGeometry args={[.26,.26,1,24]} /><meshBasicMaterial color="#e9f8f6" transparent opacity={.85} depthWrite={false} /></mesh>
    <Tube pts={[[-.55,.39,0],[-.55,.2,0],[.55,.2,0],[.55,.39,0]]} r={.16} m={MAT.glass} />
    <Rod a={[-.55,.12,.12]} b={[-.55,.55,.12]} r={.04} m={MAT.darkSteel} /><Rod a={[.55,.12,.12]} b={[.55,.55,.12]} r={.04} m={MAT.darkSteel} />
    <Cyl p={[-.55,2.03,0]} r={.14} h={.15} m={MAT.glass} /><Cyl p={[.55,2.03,0]} r={.14} h={.15} m={MAT.glass} />
    <Rod a={[-.78,2.05,0]} b={[-.32,2.05,0]} r={.028} m={MAT.brass} /><Rod a={[.32,2.05,0]} b={[.78,2.05,0]} r={.028} m={MAT.brass} />
    <GasBubbles p={[-.55,.39,0]} count={8} height={1.4} when={(io)=>io.sb('closed',false)&&io.s('bubbles',0)>0} />
    <GasBubbles p={[.55,.39,0]} count={4} height={1.4} when={(io)=>io.sb('closed',false)&&io.s('bubbles',0)>0} />
    <Box p={[1.65,.38,0]} s={[.75,.5,.5]} m={MAT.darkSteel} /><Label text="直流电源" p={[1.65,.4,.3]} size={.14} color="#f5f2e8" />
    <Tube pts={[[-.55,.12,.12],[-1,.12,.12],[-1,.05,.12],[1.4,.05,.12],[1.4,.38,.12]]} r={.025} m={MAT.copper} />
    <Tube pts={[[.55,.12,.12],[.95,.12,.12],[.95,.75,.12],[1.25,.75,.12]]} r={.025} m={MAT.copper} />
    <group ref={switchArm} position={[1.25,.75,.12]}><Rod a={[0,0,0]} b={[.3,0,0]} r={.027} m={MAT.darkSteel} /></group><Rod a={[1.55,.75,.12]} b={[1.65,.62,.12]} r={.025} m={MAT.copper} />
    <group ref={hStick} visible={false}><Rod a={[-.55,2.2,.1]} b={[-1,2.68,.1]} r={.03} m={MAT.wood} /><Flame p={[-.55,2.12,.1]} kind="candle" color="#77b5ef" scale={.85} lit={(io)=>io.s('hydrogenVolume',0)>0&&io.idx('step')===3&&!io.sb('closed',false)} /></group>
    <group ref={oStick} visible={false}><Rod a={[.55,2.2,.1]} b={[1,2.68,.1]} r={.03} m={MAT.wood} /><Flame p={[.55,2.12,.1]} kind="candle" scale={1.1} lit={(io)=>io.s('oxygenVolume',0)>0&&io.idx('step')===4&&!io.sb('closed',false)} /></group>
    <Label text="负极 H₂" p={[-.55,.28,.55]} size={.16} /><Label text="正极 O₂" p={[.55,.28,.55]} size={.16} />
    <IoLabel get={(io)=>{const h=io.s('hydrogenVolume',0),o=io.s('oxygenVolume',0);return h>0&&o>0?'收集量示意 H₂ : O₂ ≈ 2 : 1':'未收集到气体';}} p={[0,2.67,.3]} size={.17} />
  </group>;
}

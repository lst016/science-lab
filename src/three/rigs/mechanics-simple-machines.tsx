import { Ball, Box, Cyl, MAT, Label } from '../kit';
import { Cord, Gauge, IBox, Mv, Slotted, Wheel } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp } from './io';

export function Lever() {
  return <group>
    <IBox p={[0,.18,0]} s={[1.1,.22,.8]} m={MAT.darkSteel}/>
    <Cyl p={[0,.82,0]} r={.12} h={1.2} m={MAT.brass}/>
    <Mv upd={(g,io)=>{const l=io.p('leftForce',2)*io.p('leftArm',15),r=io.p('rightForce',3)*io.p('rightArm',10);g.rotation.z=clamp((l-r)/Math.max(80,l+r)*.9,-.28,.28);}}>
      <Box p={[0,1.4,0]} s={[3.8,.1,.35]} m={MAT.wood}/>
      {Array.from({length:7},(_,i)=><Box key={i} p={[-1.8+i*.6,1.47,0]} s={[.018,.11,.37]} m={MAT.black} cast={false}/>)}
      <Mv upd={(g,io)=>{g.position.x=-clamp(io.p('leftArm',15)/30,0,1)*1.8;g.scale.setScalar(clamp(io.p('leftForce',2)/2,.55,1.5));}}><Cord ends={()=>[[0,1.35,0],[0,.82,0]]}/><Slotted p={[0,.4,0]} r={.18} h={.36}/></Mv>
      <Mv upd={(g,io)=>{g.position.x=clamp(io.p('rightArm',10)/30,0,1)*1.8;g.scale.setScalar(clamp(io.p('rightForce',3)/3,.55,1.5));}}><Cord ends={()=>[[0,1.35,0],[0,.82,0]]}/><Slotted p={[0,.4,0]} r={.18} h={.36}/></Mv>
    </Mv>
    <IoLabel p={[0,2.55,.45]} get={io=>`F₁l₁=${(io.p('leftForce',2)*io.p('leftArm',15)).toFixed(0)} · F₂l₂=${(io.p('rightForce',3)*io.p('rightArm',10)).toFixed(0)} N·cm`}/>
    <Label p={[0,.45,.55]} text="支点"/>
  </group>;
}

export function Steelyard() {
  return <group>
    <IBox p={[0,.15,0]} s={[1.1,.2,.75]} m={MAT.darkSteel}/>
    <Cyl p={[0,.72,0]} r={.12} h={1.1} m={MAT.brass}/>
    <Mv upd={(g,io)=>{g.rotation.z=clamp((io.p('mass',300)-300)/1800,-.2,.2);}}>
      <Box p={[.65,1.25,0]} s={[2.7,.09,.18]} m={MAT.wood}/>
      {Array.from({length:9},(_,i)=><Box key={i} p={[-.6+i*.3,1.31,0]} s={[.015,.09,.2]} m={MAT.black} cast={false}/>)}
      <Mv upd={(g,io)=>{g.position.x=clamp(io.p('arm',20)/40,0,1)*2.35;}}><Slotted p={[0,1.06,0]} r={.2} h={.26}/></Mv>
      <Cord ends={()=>[[-.67,1.2,0],[-.67,.65,0]]}/>
      <IBox p={[-.67,.5,0]} s={[.52,.16,.45]} m={MAT.brass}/>
    </Mv>
    <IoLabel p={[0,2.2,.4]} get={io=>`待称 ${io.p('mass',300).toFixed(0)} g · 秤砣力臂 ${io.p('arm',20).toFixed(0)} cm`}/>
    <Label p={[-.7,.85,.4]} text="秤盘"/><Label p={[1.4,1.65,.35]} text="秤砣"/>
  </group>;
}

export function PulleyTypes() {
  return <group>
    {/* 定滑轮：绳端下拉，重物侧上升，重力与拉力相同。 */}
    <Box p={[-1,3.6,0]} s={[1.5,.12,.6]} m={MAT.darkSteel}/>
    <Wheel p={[-1,2.95,0]} r={.45}/>
    <Cord ends={()=>[[-1.45,2.95,0],[-1.45,1,0]]}/><Cord ends={()=>[[-.55,2.95,0],[-.55,1.1,0]]}/>
    <Mv upd={(g,io)=>{const h=clamp(io.p('height',.2)*1.3,0,.65);g.position.y=1.05+h;const focus=(io.opt('pulleyType')||'定滑轮').includes('定')?1.12:.88;g.scale.setScalar(clamp(io.p('load',4)/4,.7,1.4)*focus);}}><Slotted p={[-1.45,0,0]} r={.22} h={.35}/></Mv>
    <Mv upd={(g,io)=>{const h=clamp(io.p('height',.2)*1.3,0,.65);g.position.y=1.05-h;const focus=(io.opt('pulleyType')||'定滑轮').includes('动')?1.12:.88;g.scale.setScalar(clamp(io.p('load',4)/4,.7,1.4)*focus);}}><Slotted p={[-.55,0,0]} r={.18} h={.3}/></Mv>
    {/* 动滑轮：活动轮由两股绳支承，提升高度为绳端行程一半。 */}
    <Box p={[1,3.6,0]} s={[1.5,.12,.6]} m={MAT.darkSteel}/>
    <Wheel p={[1,1.25,0]} r={.45}/>
    <Cord ends={io=>[[.55,3.6,0],[.55,clamp(1.4+io.p('height',.2),1.4,1.9),0]]}/>
    <Cord ends={io=>[[1.45,3.6,0],[1.45,clamp(1.4+io.p('height',.2),1.4,1.9),0]]}/>
    <Mv upd={(g,io)=>{g.position.y=1.45+clamp(io.p('height',.2),0,.5);g.scale.setScalar(clamp(io.p('load',4)/4,.7,1.4));}}><Slotted p={[1,0,0]} r={.24} h={.34}/></Mv>
    <IoLabel p={[0,4.05,.35]} get={io=>`${io.opt('pulleyType')||'定滑轮'} · G=${io.p('load',4).toFixed(1)} N · h=${io.p('height',.2).toFixed(2)} m`}/>
    <Label p={[-1,2.1,.45]} text="定滑轮"/><Label p={[1,2.1,.45]} text="动滑轮"/>
  </group>;
}

export function PulleyWork({ efficiency=false }: {efficiency?:boolean}) {
  const strands=efficiency?3:2;
  return <group>
    <Box p={[0,3.65,0]} s={[2.4,.14,.7]} m={MAT.darkSteel}/>
    <Wheel p={[-.55,3.12,0]} r={.4}/><Wheel p={[.35,1.28,0]} r={.4}/>
    {Array.from({length:strands},(_,i)=>{const x=-.55+i*.45;return <Cord key={i} ends={()=>[[x,3.08,0],[x,1.3,0]]}/>;})}
    <Mv upd={(g,io)=>{const lift=clamp(io.p('height',.2)*1.4,0,.65);g.position.y=1.35+lift;g.scale.setScalar(clamp(io.p('load',5)/5,.7,1.4));}}>
      <Ball p={[.35,0,0]} r={.09} m={MAT.brass}/><Slotted p={[.35,-.38,0]} r={.25} h={.4}/>
    </Mv>
    <Mv upd={(g,io)=>{const lift=clamp(io.p('height',.2)*1.4,0,.65);g.position.y=1.3-lift*strands;}}><Slotted p={[1.45,0,0]} r={.2} h={.3}/></Mv>
    <Cord ends={io=>[[.95,3.08,0],[.95,1.3-clamp(io.p('height',.2)*1.4,0,.65)*strands,0]]}/>
    <Gauge p={[1.95,3.35,0]} len={1.55} maxN={12} get={io=>{const eta=efficiency?io.p('efficiency',75)/100:1-io.p('loss',10)/100;return clamp(io.p('load',5)/(strands*Math.max(.1,eta)),0,12)/12;}}/>
    <IoLabel p={[0,4.12,.4]} get={io=>{const load=io.p('load',5),h=io.p('height',.2),loss=efficiency?100-io.p('efficiency',75):io.p('loss',10);const eta=efficiency?io.p('efficiency',75)/100:1-loss/100;return efficiency?`η=${(eta*100).toFixed(0)}% · G=${load.toFixed(1)} N · W有用=${(load*h).toFixed(2)} J`:`W有用=${(load*h).toFixed(2)} J · 额外功 ${loss.toFixed(0)}%`;}}/>
    <Label p={[0,.55,.55]} text={efficiency?'滑轮组提升与测力':'动滑轮省力，绳端路程更长'}/>
  </group>;
}

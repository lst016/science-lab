import { Ball, Box, Cyl, MAT, Label, Spring } from '../kit';
import { Cart, Cord, Gauge, IBox, Mv, Slotted } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp, evTime } from './io';

export function SpringScaleScene({ gravity=false }: { gravity?: boolean }) {
  const max=gravity?10:5;
  return <group>
    <Box p={[-1.1,3.4,0]} s={[2.1,.12,.4]} m={MAT.darkSteel}/>
    <Gauge p={[-1.1,3.35,0]} len={2.1} maxN={max} get={io=>gravity?clamp(io.p('mass',.2)*io.p('gravity',9.8),0,max)/max:clamp(io.p('force',2),0,max)/max}>
      {gravity?<Slotted r={.22} h={.28}/>:<IBox s={[.4,.35,.35]} m={MAT.blue}/>}
    </Gauge>
    {!gravity&&<><Cyl p={[1,3.35,0]} r={.045} h={2.05} m={MAT.darkSteel}/><Mv p={[1,3.2,0]} upd={(g,io)=>{const extension=io.p('force',2)/Math.max(1,io.p('stiffness',50));g.scale.y=clamp(1+extension*4,.7,1.9);}}><Spring len={.72} r={.12} coils={12}/><Slotted p={[0,-.88,0]} r={.2} h={.26}/></Mv></>}
    <Label p={[-1.1,3.72,.25]} text={gravity?'重力测量':'弹簧测力计'}/>
    <IoLabel p={[1.1,2.8,.35]} get={io=>gravity?`G=mg ${(io.s('force',io.p('mass',.2)*io.p('gravity',9.8))).toFixed(2)} N`:`F=${io.p('force',2).toFixed(1)} N · k=${io.p('stiffness',50).toFixed(0)} N/m`}/>
  </group>;
}

export function TwoForceScene({ collinear=false }: { collinear?: boolean }) {
  return <group>
    <Box p={[0,.12,0]} s={[4.4,.2,1.4]} m={MAT.darkWood}/>
    <Mv upd={(g,io)=>{if(collinear){const same=(io.opt('direction')||'同向').includes('同向');const net=same?io.p('force1',2)+io.p('force2',1):io.p('force1',2)-io.p('force2',1);g.position.x=clamp(net*.04,-.55,.55);g.rotation.z=clamp(net*.025,-.25,.25);}else{const diff=io.p('leftForce',2)-io.p('rightForce',2);g.position.x=clamp(diff*.035,-.45,.45);g.rotation.z=clamp(io.p('twist',0)*.025,-.3,.3);}}}>
      <IBox p={[0,.72,0]} s={[.8,.5,.6]} m={MAT.blue}/>
    </Mv>
    <Cord ends={io=>[[-2.05,.74,0],[-.4,.74,0]]} color="#c8402f"/>
    <Cord ends={io=>[[.4,.74,0],[2.05,.74,0]]} color="#386ca4"/>
    <Cyl p={[-2.12,.72,0]} r={.16} h={.16} rot={[Math.PI/2,0,0]} m={MAT.brass}/>
    <Cyl p={[2.12,.72,0]} r={.16} h={.16} rot={[Math.PI/2,0,0]} m={MAT.brass}/>
    <IoLabel p={[0,1.7,.3]} get={io=>collinear?`${io.opt('direction')||'同向'} · F合=${(io.s('force',io.p('force1',2)+io.p('force2',1))).toFixed(1)} N`:`左 ${io.p('leftForce',2).toFixed(1)} N · 右 ${io.p('rightForce',2).toFixed(1)} N`}/>
    <Label p={[0,.4,.6]} text={collinear?'共线力合成':'二力平衡小车'}/>
  </group>;
}

export function FrictionForce() {
  return <group>
    <IBox p={[0,.14,0]} s={[4.4,.2,1.35]} m={MAT.wood}/>
    <Gauge p={[1.8,.72,0]} rot={[0,0,Math.PI/2]} len={1.35} maxN={10} get={io=>clamp(io.s('friction',io.p('roughness',.3)*io.p('normalForce',4)),0,10)/10}/>
    <Cord ends={()=>[[0,.55,0],[1.28,.55,0]]}/>
    <Mv upd={(g,io)=>{const run=io.n('run')>0?clamp(io.s('friction',0)*.025,0,.6):0;g.position.x=-.4+run;}}><IBox p={[0,.48,0]} s={[.75,.48,.65]} m={MAT.card}/></Mv>
    <IoLabel p={[0,1.55,.35]} get={io=>`f=μN ${(io.s('friction',0)).toFixed(2)} N · μ=${io.p('roughness',.3).toFixed(2)}`}/>
  </group>;
}

export function DoorLever() {
  return <group>
    <Box p={[-1.35,.16,0]} s={[.14,.28,2.7]} m={MAT.darkSteel}/>
    <Mv upd={(g,io)=>{const f=io.p('force',15),arm=io.p('position',70)/90;const torque=f*arm;g.rotation.y=clamp((torque/450)*.65,-.7,.7);}}>
      <IBox p={[.65,1.5,0]} s={[2,.12,2.5]} m={MAT.wood}/>
      <Box p={[1.58,1.5,0]} s={[.09,.22,.12]} m={MAT.brass}/>
    </Mv>
    <IoLabel p={[.2,2.7,.7]} get={io=>`力臂 ${io.p('position',70).toFixed(0)} cm · τ≈${(io.p('force',15)*io.p('position',70)).toFixed(0)} N·cm`}/>
    <Label p={[-1.35,2,.4]} text="铰链"/>
  </group>;
}

export function MagnetBall() {
  return <group>
    <IBox p={[-1.1,.45,0]} s={[.2,.85,.28]} m={MAT.red}/>
    <Box p={[-1.1,.96,0]} s={[.28,.18,.35]} m={MAT.darkSteel}/>
    <IBox p={[.5,.45,0]} s={[.95,.1,.7]} m={MAT.wood}/>
    <Mv upd={(g,io)=>{const dx=clamp(io.p('magnetX',0)/20,-.35,.35);const dz=clamp(io.p('magnetZ',0)/20,-.3,.3);const pull=clamp(io.p('strength',60)/100,.15,.85);g.position.set(.5-dx,.55+pull*.08,dz);}}>
      <Ball r={.19} m={MAT.steel}/>
    </Mv>
    <IoLabel p={[0,1.65,.35]} get={io=>`磁体强度 ${io.p('strength',60).toFixed(0)}% · 间距受控`}/>
    <Label p={[-1.1,1.5,.4]} text="磁铁"/><Label p={[.5,1.15,.35]} text="钢球"/>
  </group>;
}

export function ReactionCarts() {
  return <group>
    <Box p={[0,.12,0]} s={[4.5,.18,1.3]} m={MAT.darkSteel}/>
    <Mv upd={(g,io)=>{const gap=clamp(io.p('magnetGap',5)/10,.2,.8);const speed=io.p('push',15)/30;const e=io.n('run')?clamp(evTime(io,'run',0)*speed,0,.9):0;g.position.x=-gap-e;}}><Cart color={MAT.blue}><Box p={[0,.42,0]} s={[.35,.18,.3]} m={MAT.red}/></Cart></Mv>
    <Mv upd={(g,io)=>{const gap=clamp(io.p('magnetGap',5)/10,.2,.8);const speed=io.p('push',15)/30;const e=io.n('run')?clamp(evTime(io,'run',0)*speed,0,.9):0;g.position.x=gap+e;}}><Cart color={MAT.green}><Box p={[0,.42,0]} s={[.35,.18,.3]} m={MAT.red}/></Cart></Mv>
    <IoLabel p={[0,1.55,.35]} get={io=>`相互作用力 ±${io.p('push',15).toFixed(0)} N`}/>
    <Label p={[-.8,1.1,.45]} text="小车 A"/><Label p={[.8,1.1,.45]} text="小车 B"/>
  </group>;
}

export function FunnelBall() {
  return <group>
    <Cyl p={[0,1.15,0]} r={.58} rt={.12} h={.92} m={MAT.plastic}/>
    <Cyl p={[0,1.73,0]} r={.1} h={.65} m={MAT.plastic}/>
    <Mv upd={(g,io)=>{const lift=clamp((io.p('airflow',7)-3)*.055,0,.32);g.position.y=1.67+lift;g.position.x=clamp(io.p('ballGap',.5)*.08,-.16,.16);}}><Ball r={.21} m={MAT.white}/></Mv>
    <IoLabel p={[0,2.35,.35]} get={io=>`气流 ${io.p('airflow',7).toFixed(1)} m/s · 球受托浮`}/>
    <Label p={[.95,1.2,0]} text="倒置漏斗"/>
  </group>;
}

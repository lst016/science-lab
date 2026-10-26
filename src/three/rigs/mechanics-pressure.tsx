import { Ball, Box, Cyl, MAT, Label, Tube } from '../kit';
import { GlassBox, IBox, Liquid, Mv, WATER, MERCURY } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp } from './io';

export function SpongeTable() {
  return <group>
    <Box p={[0,.18,0]} s={[4.1,.3,1.5]} m={MAT.darkWood}/>
    <IBox p={[0,.28,0]} s={[2.9,.16,1.2]} m={MAT.green}/>
    <Mv upd={(g,io)=>{const F=io.p('force',8),A=io.p('area',20);g.position.y=.38;g.scale.y=clamp(F/A*.12,.045,.19);}}>
      <Box p={[0,.25,0]} s={[.62,.65,.62]} m={MAT.wood}/>
      <Box p={[0,.64,0]} s={[.9,.12,.9]} m={MAT.darkWood}/>
      {[[-.34,0], [.34,0], [0,-.34],[0,.34]].map(([x,z],i)=><Cyl key={i} p={[x,.25,z]} r={.055} h={.5} m={MAT.brass}/>) }
    </Mv>
    <IoLabel p={[0,1.8,.5]} get={io=>`F=${io.p('force',8).toFixed(1)} N · S=${io.p('area',20).toFixed(0)} cm² · p=${io.s('pressure',0).toFixed(0)} Pa`}/>
    <Label p={[0,.55,.7]} text="海绵凹陷为定性示意"/>
  </group>;
}

export function LiquidProbe() {
  return <group>
    <GlassBox p={[-1.2,.1,0]} w={2.35} d={1.4} h={2.25}/>
    <Liquid p={[-1.2,.13,0]} w={2.25} d={1.3} level={()=>1.65}/>
    <Mv upd={(g,io)=>{g.position.set(-1.15,clamp(1.78-io.p('depth',.25)*2.2,.32,1.7),.1);g.rotation.y=io.p('orientation',0)*Math.PI/180;}}>
      <Ball r={.16} m={MAT.darkSteel}/><Cyl p={[0,0,.2]} r={.1} h={.35} rot={[Math.PI/2,0,0]} m={MAT.steel}/>
    </Mv>
    {/* 两支水柱表示压强计的液面差，差高随 ρgh 变化 */}
    <Cyl p={[1.25,1.15,.15]} r={.12} h={2.2} m={MAT.glass}/>
    <Mv upd={(g,io)=>{g.position.y=.38;g.scale.y=clamp(.4+io.p('density',1000)*9.8*io.p('depth',.25)/8000,.4,1.45);}}>
      <Cyl p={[1.25,.4,.15]} r={.08} h={1} m={WATER}/>
    </Mv>
    <Cyl p={[1.65,1.15,.15]} r={.12} h={2.2} m={MAT.glass}/>
    <Cyl p={[1.65,.78,.15]} r={.08} h={.8} m={WATER}/>
    <Tube pts={[[1.25,.35,.15],[1.25,.15,.15],[1.45,.1,.15],[1.65,.15,.15],[1.65,.38,.15]]} r={.035} m={MAT.glass}/>
    <IoLabel p={[.2,2.65,.5]} get={io=>`h=${io.p('depth',.25).toFixed(2)} m · ρ=${io.p('density',1000).toFixed(0)} kg/m³ · p=${io.s('pressure',0).toFixed(0)} Pa`}/>
  </group>;
}

export function Torricelli() {
  return <group>
    <Cyl p={[-.55,.35,0]} r={.75} h={.5} m={MERCURY}/>
    <Mv upd={(g,io)=>{const a=clamp(io.p('tilt',0),0,35)*Math.PI/180;g.position.set(.15,2.2,0);g.rotation.z=a;}}>
      <Cyl p={[0,.8,0]} r={.13} h={2.8} m={MAT.glass}/>
      <Mv upd={(g,io)=>{const h=clamp(io.p('pressure',101.3)/101.3*1.65,.9,1.8);g.position.y=-.05+(h-1.65)/2;g.scale.y=h/1.65;}}><Cyl p={[0,-.05,0]} r={.09} h={1.65} m={MERCURY}/></Mv>
      <Box p={[0,1.64,0]} s={[.19,.04,.19]} m={MAT.black}/>
    </Mv>
    <Box p={[1.2,1.35,0]} s={[.035,2.15,.035]} m={MAT.darkWood}/>
    {[0,1,2,3,4].map(i=><Box key={i} p={[1.3,.38+i*.48,0]} s={[.22,.025,.04]} m={MAT.red}/>) }
    <IoLabel p={[0,3.55,.4]} get={io=>`p=${io.p('pressure',101.3).toFixed(1)} kPa · 汞柱高度示意 ${clamp(io.p('pressure',101.3)/101.3*1.6,.9,1.8).toFixed(2)} m`}/>
    <Label p={[-.55,.85,.55]} text="示意液槽"/><Label p={[.9,2.9,.4]} text="竖直高度标尺"/>
  </group>;
}

export function HomemadeBarometer() {
  return <group>
    <GlassBox p={[-.75,.1,0]} w={1.5} d={1.15} h={1.65}/>
    <Liquid p={[-.75,.14,0]} w={1.4} d={1.05} level={()=>.55}/>
    <Cyl p={[-.75,1.9,0]} r={.13} h={2.25} m={MAT.glass}/>
    <Mv upd={(g,io)=>{const d=clamp((io.p('pressure',101)-101)*.022*io.p('seal',90)/100,-.32,.32);g.position.y=1.35+d;}}>
      <Cyl p={[-.75,0,0]} r={.08} h={1.2} m={WATER}/>
    </Mv>
    <IoLabel p={[.8,2.95,.4]} get={io=>`气压 ${io.p('pressure',101).toFixed(1)} kPa · 密封 ${io.p('seal',90).toFixed(0)}%`}/>
    <Label p={[-.75,1.1,.55]} text="密封水瓶"/>
  </group>;
}

export function PistonPump() {
  return <group>
    <Cyl p={[-.6,1.3,0]} r={.46} h={2.2} m={MAT.glass}/>
    <Mv upd={(g,io)=>{const stroke=clamp(io.p('stroke',5),1,10)/10*io.p('seal',90)/100;const cyc=io.n('run')?Math.sin(io.t*3)*.5+.5:.25;g.position.y=.48+stroke*cyc;}}>
      <Cyl p={[-.6,0,0]} r={.4} h={.14} m={MAT.rubber}/>
      <Cyl p={[-.6,.45,0]} r={.045} h={.8} m={MAT.steel}/>
      <Box p={[-.6,.88,0]} s={[.55,.08,.12]} m={MAT.brass}/>
    </Mv>
    <Tube pts={[[-.6,.2,0],[-1.3,.2,0],[-1.7,.2,0],[-1.7,.08,0]]} r={.07} m={MAT.glass}/>
    <Tube pts={[[-.2,2.25,0],[.55,2.25,0],[.95,2.25,0],[.95,2.45,0]]} r={.07} m={MAT.glass}/>
    <Cyl p={[-1.7,.35,0]} r={.32} h={.7} m={MAT.glass}/><Cyl p={[-1.7,.1,0]} r={.27} h={.3} m={WATER}/>
    <Ball p={[-1.35,.21,0]} r={.09} m={MAT.red}/><Ball p={[.1,2.25,0]} r={.09} m={MAT.blue}/>
    <IoLabel p={[.6,3.1,.4]} get={io=>`行程 ${io.p('stroke',5).toFixed(1)} cm · 密封 ${io.p('seal',90).toFixed(0)}% · 单向阀`}/>
  </group>;
}

export function AirflowPaper() {
  return <group>
    {[ -1,1 ].map(side=><Mv key={side} upd={(g,io)=>{const gap=clamp(io.p('gap',4)/10,.12,.8);const bend=clamp(io.p('airflow',7)/15,.03,.24);g.position.x=side*(gap/2+bend);g.rotation.z=-side*bend*.65;}}>
      <Box p={[0,1.25,0]} s={[.055,2.15,.05]} m={MAT.card}/>
    </Mv>)}
    <Box p={[0,.12,0]} s={[2.4,.18,.9]} m={MAT.wood}/>
    <Mv upd={(g,io)=>{g.scale.setScalar(clamp(io.p('airflow',7)/7,.1,1));}}><Ball p={[0,1.25,.25]} r={.055} m={MAT.blue}/></Mv>
    <IoLabel p={[0,2.75,.35]} get={io=>`纸间距 ${io.p('gap',4).toFixed(1)} cm · 吹气 ${io.p('airflow',7).toFixed(0)} m/s`}/>
    <Label p={[0,.55,.5]} text="气流使纸片靠拢（定性示意）"/>
  </group>;
}

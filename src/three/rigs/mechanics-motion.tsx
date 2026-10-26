import { Ball, Box, MAT, Label } from '../kit';
import { Cart, IBox, Mv } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp, evTime, useRig } from './io';

export function RampSpeed() {
  return <group>
    <Mv upd={(g, io) => { const a=clamp(io.p('incline',6),2,18)*Math.PI/180; g.rotation.z=-a; }}>
      <IBox p={[0,0.42,0]} s={[3.5,0.14,0.8]} m={MAT.wood}/>
      <Mv upd={(g,io)=>{const run=io.n('run')>0?clamp(evTime(io,'run',0)/Math.max(.2,io.p('time',2)),0,1):0;g.position.x=-1.35+run*2.65*clamp(io.p('distance',1)/2,.1,1);g.position.y=.56;}}><Cart/></Mv>
      <Box p={[1.65,.62,0]} s={[.12,.4,.9]} m={MAT.darkWood}/>
    </Mv>
    <Box p={[0,.1,0]} s={[4.3,.18,1.35]} m={MAT.darkSteel}/>
    <IoLabel p={[0,1.7,.4]} get={io=>`倾角 ${io.p('incline',6).toFixed(0)}° · 平均速度 ${(io.s('velocity',0)||io.p('distance',1)/Math.max(.01,io.p('time',2))).toFixed(2)} m/s`}/>
    <Label p={[-1.5,1.1,.55]} text="斜面小车"/>
  </group>;
}

export function FrictionCart() {
  return <group>
    <IBox p={[0,.12,0]} s={[4.4,.2,1.5]} m={MAT.wood}/>
    {[0,1,2,3,4,5,6,7].map(i=><Box key={i} p={[-1.7+i*.48,.23,0]} s={[.4,.025,1.25]} m={i%2?MAT.card:MAT.rubber} cast={false}/>)}
    <IBox p={[-1.25,.4,0]} s={[1.1,.18,.62]} m={MAT.blue}/>
    <Mv upd={(g,io)=>{const moving=io.n('run')>0;const dist=clamp(io.s('velocity',0)*.34,0,1.35);g.position.x=-1.15+(moving?dist:0);}}><Cart/></Mv>
    <IoLabel p={[0,1.3,.5]} get={io=>`粗糙程度 ${io.p('roughness',.25).toFixed(2)} · 释放高度 ${io.p('height',.15).toFixed(2)} m`}/>
    <Label p={[1.35,.55,.45]} text="粗糙水平板"/>
  </group>;
}

export function KineticEnergy() {
  return <group>
    <Box p={[-1.2,.15,0]} s={[1.2,.3,1.1]} m={MAT.darkSteel}/>
    <Box p={[-.15,.95,0]} s={[1.65,.11,.62]} rot={[0,0,-.32]} m={MAT.darkWood}/>
    <Mv upd={(g,io)=>{const h=clamp(io.p('height',.2),.05,.4);g.position.set(-1.1,.4+h*3,0);g.scale.setScalar(clamp(.85+io.p('mass',.1),.9,1.2));}}><Ball r={.18} m={MAT.brass}/></Mv>
    <IBox p={[.15,.34,0]} s={[2.7,.1,1.25]} m={MAT.darkWood}/>
    <Mv upd={(g,io)=>{const d=io.n('run')?clamp(io.s('velocity',0)*.24,0,1.2):0;g.position.x=.9+d;}}><IBox p={[0,.25,0]} s={[.55,.4,.7]} m={MAT.red}/></Mv>
    <IoLabel p={[0,1.8,.4]} get={io=>`m=${io.p('mass',.1).toFixed(2)} kg · h=${io.p('height',.2).toFixed(2)} m · Eₖ≈${io.s('kineticEnergy',0).toFixed(2)} J`}/>
    <Label p={[-1.25,1.8,.3]} text="钢球斜槽"/>
  </group>;
}

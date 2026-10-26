import { Ball, Box, Cyl, MAT, Label } from '../kit';
import * as THREE from 'three';
import { Cart, Gauge, GlassBox, IBox, Liquid, Mv, WATER } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp, type RigIO } from './io';

function Tank({ p=[-.5,.1,0], level=1.7, color=WATER }: {p?:[number,number,number];level?:number;color?:THREE.Material}) {
  return <><GlassBox p={p} w={2.5} d={1.5} h={2.2}/><Liquid p={[p[0],p[1]+.04,p[2]]} w={2.4} d={1.4} level={()=>level} mat={color}/></>;
}

export function BuoyancyGauge({ overflow=false, variables=false }: {overflow?:boolean;variables?:boolean}) {
  const sub=(io:RigIO)=>{
    return clamp(io.s('submerged', io.p('submersion',100))/100,0,1);
  };
  const force=(io:RigIO)=>clamp(io.s('tension',3),0,5)/5;
  return <group>
    <Tank p={[-.7,.1,0]} level={1.55}/>
    <Box p={[.35,3.9,0]} s={[1.45,.1,.55]} m={MAT.darkSteel}/>
    <Cyl p={[.35,1.95,0]} r={.045} h={3.7} m={MAT.steel}/>
    <Gauge p={[.35,3.85,0]} len={1.3} maxN={5} get={force}>
      <Mv upd={(g,io)=>{const v=io.s('objectVolume',io.p('volume',100));const side=.5*clamp(Math.cbrt(v/50),.55,1.35);const target=1.65+side/2-sub(io)*side;g.position.y=target-(3.85-1.3-.57)+force(io)*.74*1.3;}}>
        <Mv upd={(b,io)=>{const v=io.s('objectVolume',io.p('volume',io.p('displacedVolume',60)));b.scale.setScalar(clamp(Math.cbrt(v/50),.55,1.35));}}><Box s={[.5,.5,.5]} m={MAT.brass}/></Mv>
      </Mv>
    </Gauge>
    {overflow&&<><Cyl p={[1.85,1.25,.2]} r={.35} h={1.5} m={MAT.glass}/><Mv upd={(g,io)=>{g.scale.y=clamp(io.s('displacedVolume',io.s('volume',60))/100,.2,.8);}}><Cyl p={[1.85,.5,.2]} r={.29} h={1} m={WATER}/></Mv><Label p={[1.85,2.1,.4]} text="接溢流水"/></>}
    <IoLabel p={[-.9,3.55,.45]} get={io=>`${variables?`排开 ${io.p('displacedVolume',50).toFixed(0)} cm³`:`浸入 ${Math.round(sub(io)*100)}%`} · F浮 ${io.s('buoyancy',0).toFixed(2)} N · T ${io.s('tension',0).toFixed(2)} N`}/>
    <Label p={[-.65,2.55,.5]} text={overflow?'溢水杯':'水槽与物块'}/>
  </group>;
}

export function EggWaterSalt() {
  return <group>
    <Tank p={[0,.1,0]} level={2}/>
    <Mv upd={(g,io)=>{const den=io.p('density',1100),egg=io.p('eggDensity',1050);const floats=egg<den;g.position.set(0,floats?1.05: .38,0);g.rotation.z=floats?-.04:0;}}>
      <Ball r={.3} m={MAT.card}/><Ball p={[.12,.05,.22]} r={.045} m={MAT.darkWood}/>
    </Mv>
    <IoLabel p={[0,3.25,.4]} get={io=>`ρ液 ${io.p('density',1100).toFixed(0)} · ρ蛋 ${io.p('eggDensity',1050).toFixed(0)} kg/m³ · ${io.ss('phase','漂浮')}`}/>
    <Label p={[1.25,1.8,.45]} text="清水 / 盐水"/>
  </group>;
}

export function ClayBoat() {
  return <group>
    <Tank p={[0,.1,0]} level={1.65}/>
    <Mv upd={(g,io)=>{const cap=io.p('hullDepth',2)*50;const ratio=clamp(io.p('load',100)/Math.max(1,cap),0,1.3);g.position.y=1.9-ratio*.95;g.rotation.z=ratio>1?-.14:0;}}>
      <Box p={[0,0,0]} s={[1.1,.14,.7]} m={MAT.red}/>
      <Box p={[-.48,.18,0]} s={[.14,.35,.7]} m={MAT.red}/><Box p={[.48,.18,0]} s={[.14,.35,.7]} m={MAT.red}/>
      <Box p={[0,.18,-.28]} s={[1.1,.35,.14]} m={MAT.red}/><Box p={[0,.18,.28]} s={[1.1,.35,.14]} m={MAT.red}/>
      <IBox p={[0,.36,0]} s={[.45,.22,.36]} m={MAT.brass}/>
    </Mv>
    <IoLabel p={[0,3.25,.4]} get={io=>`载荷 ${io.p('load',100).toFixed(0)} g · 吃水 ${io.p('hullDepth',2).toFixed(1)} cm`}/>
    <Label p={[1.2,2,.4]} text="橡皮泥船"/>
  </group>;
}

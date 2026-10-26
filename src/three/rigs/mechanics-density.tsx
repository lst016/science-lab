import { Ball, Box, Cyl, MAT, Label } from '../kit';
import { GradCyl, IBox, Liquid, Mv, Slotted, WATER } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp } from './io';
import * as THREE from 'three';

export function BalanceScene() {
  return <group>
    <IBox p={[0,.22,0]} s={[1.3,.24,.8]} m={MAT.darkSteel}/>
    <Cyl p={[0,1.14,0]} r={.12} h={1.75} m={MAT.brass}/>
    <Mv upd={(g,io)=>{const delta=io.p('mass',56)-(io.p('weights',50)+io.p('rider',6));g.rotation.z=clamp(delta/90,-.25,.25);}}>
      <Box p={[0,1.9,0]} s={[3.7,.09,.2]} m={MAT.wood}/>
      <Box p={[-1.2,1.58,0]} s={[.9,.06,.65]} m={MAT.steel}/>
      <Box p={[1.2,1.58,0]} s={[.9,.06,.65]} m={MAT.steel}/>
      <IBox p={[-1.2,1.85,0]} s={[.4,.35,.35]} m={MAT.blue}/>
      <Mv upd={(g,io)=>{g.position.x=.35+clamp(io.p('rider',6)/10,0,1)*1.25;}}><Slotted p={[0,1.95,0]} r={.09} h={.12}/></Mv>
      <Mv upd={(g,io)=>{g.position.x=1.2;g.scale.setScalar(clamp(io.p('weights',50)/60,.45,1.4));}}><Slotted p={[0,1.9,0]} r={.2} h={.22}/></Mv>
    </Mv>
    <IoLabel p={[0,2.65,.4]} get={io=>`${io.sb('balanced',false)?'平衡':'调节中'} · m=${io.p('mass',56).toFixed(1)} g`}/>
    <Label p={[-1.2,2.15,.35]} text="待测物"/><Label p={[1.2,2.15,.35]} text="砝码"/>
  </group>;
}

export function MassVolume() {
  return <group>
    <Mv upd={(g,io)=>{const name=io.opt('material');const mat=name.includes('铁')?MAT.darkSteel:name.includes('铝')?MAT.blue:MAT.wood;g.scale.y=clamp((name.includes('铁')?7.8:name.includes('铝')?2.7:.6)/3,.35,1.8);g.traverse(o=>{if(o instanceof THREE.Mesh)o.material=mat;});}}><IBox p={[-1.1,.42,0]} s={[1.05,.72,.85]} m={MAT.blue}/></Mv>
    <IBox p={[1.1,.42,0]} s={[1.05,.72,.85]} m={MAT.darkSteel}/>
    <Mv upd={(g,io)=>{const v=clamp(io.p('volume',20),5,60)/20;g.scale.set(.55*v,1,.55*v);}}><Box p={[-1.1,.8,0]} s={[.9,.09,.7]} m={MAT.brass}/></Mv>
    <IoLabel p={[0,1.65,.4]} get={io=>{const rho=io.opt('material').includes('铁')?7.8:io.opt('material').includes('铝')?2.7:.6;return `${io.opt('material')||'样品'} · V=${io.p('volume',20).toFixed(0)} cm³ · m≈${(rho*io.p('volume',20)).toFixed(0)} g`;}}/>
    <Label p={[-1.1,1.1,.45]} text="材料样品"/><Label p={[1.1,1.1,.45]} text="天平托盘"/>
  </group>;
}

export function LiquidDensity() {
  return <group>
    <GradCyl p={[-1.1,.1,0]} r={.42} h={2.1}>
      <Liquid p={[0,.13,0]} w={.36} round level={io=>clamp(io.p('volume',40)/80*1.8,.05,1.8)}/>
    </GradCyl>
    <IBox p={[1.1,.42,0]} s={[1.1,.75,.9]} m={MAT.darkSteel}/>
    <Mv upd={(g,io)=>{const mass=io.p('density',1.08)*io.p('volume',40);g.scale.y=clamp(mass/43,.5,1.8);}}><Box p={[1.1,.85,0]} s={[.9,.08,.7]} m={MAT.brass}/><IBox p={[1.1,1.1,0]} s={[.48,.35,.45]} m={MAT.blue}/></Mv>
    <IoLabel p={[0,2.55,.4]} get={io=>`ρ=${io.p('density',1.08).toFixed(2)} g/cm³ · V=${io.p('volume',40).toFixed(0)} mL`}/>
    <Label p={[-1.1,2.15,.45]} text="量筒取液"/><Label p={[1.1,1.25,.45]} text="电子天平"/>
  </group>;
}

export function Displacement() {
  return <group>
    <GradCyl p={[-.8,.1,0]} r={.52} h={2.2}>
      <Liquid p={[0,.12,0]} w={.48} round level={io=>clamp(.75+io.p('volume',20)/100,.35,1.35)}/>
    </GradCyl>
    <Mv upd={(g,io)=>{g.position.y=clamp(.9+io.p('volume',20)/65,.95,1.65);g.scale.setScalar(clamp(io.p('mass',54)/54,.65,1.35));}}>
      <Box s={[.42,.5,.42]} m={MAT.darkSteel}/><Ball p={[0,.28,0]} r={.12} m={MAT.brass}/>
    </Mv>
    <Cyl p={[1.2,.55,0]} r={.4} h={1.0} m={MAT.darkSteel}/>
    <IoLabel p={[.1,2.7,.4]} get={io=>`V石=${io.s('volume',io.p('volume',20)).toFixed(0)} cm³ · m=${io.p('mass',54).toFixed(0)} g`}/>
    <Label p={[1.2,1.35,.4]} text="天平称质量"/>
  </group>;
}

export function Hydrometer() {
  return <group>
    <GradCyl p={[0,.1,0]} r={.72} h={2.5}>
      <Liquid p={[0,.12,0]} w={.66} round level={()=>2.2}/>
    </GradCyl>
    <Mv upd={(g,io)=>{const rho=clamp(io.p('density',1000),700,1300);const sub=clamp(1.05*1000/rho,.72,1.5);g.position.y=2.3-sub*.75;g.rotation.z=clamp((io.p('weight',4)-4)*.02,-.08,.08);}}>
      <Cyl p={[0,.5,0]} r={.065} h={1.2} m={MAT.white}/><Ball p={[0,-.2,0]} r={.23} m={MAT.brass}/>
      {[0,1,2,3,4].map(i=><Box key={i} p={[.065,.9-i*.13,0]} s={[.09,.018,.02]} m={MAT.red}/>) }
    </Mv>
    <IoLabel p={[0,3.35,.4]} get={io=>`液体密度 ${io.p('density',1000).toFixed(0)} kg/m³ · 浸入深度随密度变`}/>
    <Label p={[1,1.2,.45]} text="密度计"/>
  </group>;
}

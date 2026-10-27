import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Label, MAT, Rod, Vessel } from '../kit';
import { Ember, Flame } from './chemical-parts';
import { IoLabel } from './parts';
import { useRig, type RigIO } from './io';

const lit = (io:RigIO) => io.n('ignite') % 2 === 1;

/** 实验1-2 和 2-1：燃着木条、带火星木条分别比较气体。 */
export function UpperSplintRig({exp}:{exp:Experiment}) {
  const wood = useRef<THREE.Group>(null);
  const glowing = exp.sceneVariant === 'glowing-splint-oxygen';
  useRig((io)=>{ if (wood.current) wood.current.position.y=io.damp('splintIntoJar',lit(io)?1.12:2.05,3); });
  return <group>
    <Label text={exp.title} p={[0,3.45,.35]} size={.2} />
    <Vessel kind="jar" p={[0,0,0]} r={.68} h={2.0} />
    <group ref={wood} position={[0,2.05,.06]}>
      <Rod a={[0,.02,0]} b={[0,1.22,0]} r={.042} m={MAT.wood} />
      <Ember p={[0,.02,0]} when={(io)=>lit(io) && glowing} bright={(io)=>io.sb('glowingSplint',false)} size={.07} />
      <Flame p={[0,0,0]} kind="candle" scale={1.3} lit={(io)=>{
        if (!lit(io)) return false;
        if (glowing) return io.sb('glowingSplint',false) && io.since('ignite') > 1;
        // 点燃木条移入CO₂前仍燃烧，进入后熄灭；氧气中继续燃烧。
        return io.since('ignite') < .8 || io.sb('flame',false);
      }} />
    </group>
    <IoLabel get={(io)=>`瓶内：${io.opt('gas') || '氧气'}`} p={[0,.02,1.05]} size={.15} />
  </group>;
}

/** 实验2-2：木炭在空气中红热，在氧气中发明亮白光。 */
export function UpperCarbonBurningRig({exp}:{exp:Experiment}) {
  const jar = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.Group>(null);
  const holder = useRef<THREE.Group>(null);
  const carbon = useRef<THREE.Mesh>(null);
  useRig((io)=>{
    const oxygen = io.opt('gas').includes('氧气');
    if(jar.current) jar.current.visible=oxygen;
    if(lamp.current) lamp.current.visible=!oxygen;
    if(holder.current) holder.current.position.y=io.damp('carbonIntoJar',lit(io)?(oxygen?-.35:-.6):0,3);
    if(carbon.current) (carbon.current.material as THREE.MeshBasicMaterial).color.set(!lit(io)?'#2b2928':oxygen?'#fff2c9':'#d8442b');
  });
  return <group>
    <Label text={exp.title} p={[0,3.4,.35]} size={.2} />
    <group ref={jar}><Vessel kind="jar" p={[0,0,0]} r={.7} h={2.0} /></group>
    <group ref={lamp} visible={false}><AlcoholLamp p={[0,0,.2]} flame={0} /><Flame p={[0,.72,.2]} lit={(io)=>lit(io)&&io.opt('gas')==='空气'} /></group>
    <group ref={holder}>
      <Rod a={[-.08,2.8,0]} b={[-.03,1.72,0]} r={.025} m={MAT.darkSteel} />
      <Rod a={[.09,2.8,0]} b={[.03,1.72,0]} r={.025} m={MAT.darkSteel} />
      <mesh ref={carbon} position={[0,1.58,0]}><dodecahedronGeometry args={[.2,0]} /><meshBasicMaterial color="#2b2928" /></mesh>
      <Ember p={[0,1.65,.03]} size={.13} when={(io)=>io.sb('glowingCarbon',false)} bright={(io)=>io.opt('gas').includes('氧气')} />
    </group>
    <IoLabel get={(io)=>!lit(io)?'先加热木炭':io.opt('gas').includes('氧气')?'氧气中燃烧更旺，发白光':'空气中红热'} p={[0,.02,1.05]} size={.15} />
  </group>;
}

/** 实验2-3：同一硫样在空气淡蓝、氧气蓝紫色火焰。 */
export function UpperSulfurBurningRig({exp}:{exp:Experiment}) {
  const jar = useRef<THREE.Group>(null);
  const spoon = useRef<THREE.Group>(null);
  useRig((io)=>{
    const oxygen = io.opt('gas').includes('氧气');
    if(jar.current) jar.current.visible=oxygen;
    if(spoon.current) spoon.current.position.y=io.damp('sulfurIntoJar',oxygen && lit(io)?-.35:0,3);
  });
  return <group>
    <Label text={exp.title} p={[0,3.4,.35]} size={.2} />
    <group ref={jar}><Vessel kind="jar" p={[0,0,0]} r={.7} h={2.0} /></group>
    <group ref={spoon}>
      <Rod a={[0,2.75,0]} b={[0,1.45,0]} r={.025} m={MAT.darkSteel} />
      <mesh position={[0,1.43,0]} scale={[1,.35,1]}><sphereGeometry args={[.24,12,8]} /><meshStandardMaterial color="#d2be55" /></mesh>
      <Flame p={[0,1.48,0]} kind="sulfur" lit={(io)=>io.sb('flame',false)} scale={(io)=>io.opt('gas').includes('氧气')?1.2:.7} />
    </group>
    <IoLabel get={(io)=>!lit(io)?'选择气体并点燃':io.opt('gas').includes('氧气')?'氧气中：蓝紫色火焰':'空气中：微弱淡蓝色火焰'} p={[0,.02,1.05]} size={.15} />
  </group>;
}

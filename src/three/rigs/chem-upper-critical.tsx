import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel } from '../kit';
import { Ember, Flame, GasBubbles, Liquid, Pile, Smoke, Sparks, Stand } from './chemical-parts';
import { IoLabel } from './parts';
import { useRig, type RigIO } from './io';

const begun = (io: RigIO) => io.n('ignite') > 0 || io.n('add') > 0 || io.n('run') > 0;

/** 教材图 2-4：瓶外点燃红磷、密闭燃烧、冷却后松夹，冷却水吸入瓶内。 */
export function UpperPhosphorusAirRig({ exp }: {exp: Experiment}) {
  const spoon = useRef<THREE.Group>(null);
  const stopper = useRef<THREE.Group>(null);
  const clamp = useRef<THREE.Group>(null);
  const leak = useRef<THREE.Group>(null);
  useRig((io) => {
    const stage = io.idx('stage'); const active = begun(io); const inserted = active && stage >= 2;
    if (spoon.current) spoon.current.position.x = io.damp('spoonX', inserted ? -.72 : -1.55, 3);
    if (stopper.current) { stopper.current.position.x = io.damp('stopperX', inserted ? -.72 : -1.55, 3); stopper.current.position.y = io.damp('stopperY', inserted ? 2.24 : 2.85, 3); }
    if (clamp.current) clamp.current.rotation.z = active && stage >= 4 ? -.55 : 0;
    if (leak.current) leak.current.visible = active && stage >= 2 && !io.sb('sealed', true);
  });
  return <group>
    <Label text={exp.title} p={[0, 3.45, .4]} size={.2} />
    <Vessel kind="jar" p={[-.72, 0, 0]} r={.55} h={2.0} />
    <Liquid p={[-.72,.03,0]} r={.45} level={(io) => .16 + io.damp('rise', io.s('waterRise', 0)*1.35, 2)} color="clear" opacity={.65} />
    {Array.from({length:6},(_,i)=><group key={i}><Box p={[-.2,.26+i*.29,.02]} s={[.17,.018,.025]} m={MAT.darkSteel} /></group>)}
    <Vessel kind="beaker" p={[1.18,0,.02]} r={.58} h={1.35} level={.67} liquid="#b9dfe8" />
    <Tube pts={[[-.72,2.26,.05],[-.72,2.67,.05],[1.18,2.67,.05],[1.18,.28,.05]]} r={.045} m={MAT.rubber} />
    <group ref={clamp} position={[.24,2.67,.05]}><Box s={[.35,.1,.1]} m={MAT.brass} /><Cyl p={[0,.12,0]} r={.035} h={.24} m={MAT.steel} /></group>
    <group ref={stopper} position={[-1.55,2.85,.05]}><Cyl r={.31} h={.16} m={MAT.rubber} /></group>
    <group ref={leak} position={[-.4,2.25,.1]} visible={false}><Label text="漏气" size={.14} p={[.12,.12,.1]} color="#a34436" /></group>
    <group ref={spoon} position={[-1.55,0,.05]}>
      <Rod a={[0,2.6,0]} b={[0,.95,0]} r={.025} m={MAT.darkSteel} />
      <Cyl p={[0,.95,0]} r={.14} h={.05} m={MAT.darkSteel} />
      <Pile p={[0,1.0,0]} r={.1} h={.07} color="#9c5238" amount={(io) => io.idx('stage') < 3 ? 1 : .3} />
      <Flame p={[0,1.05,0]} lit={(io)=>begun(io) && [1,2].includes(io.idx('stage')) && io.sb('flame', false)} />
      <Smoke p={[0,1.28,0]} amount={(io)=>begun(io) && io.idx('stage') === 2 && io.sb('flame', false) ? 1 : 0} color="#c7d0cc" rise={.7} opacity={.72} />
    </group>
    <AlcoholLamp p={[-1.55,0,.5]} flame={0} />
    <Flame p={[-1.55,.72,.5]} lit={(io)=>begun(io) && io.idx('stage') === 1} />
    <IoLabel get={(io)=> !begun(io) ? '先夹紧乳胶管并检查装置气密性' : !io.sb('sealed',true) ? '装置漏气，不能用进水量测定氧含量' : io.idx('stage') === 1 ? '瓶外点燃红磷' : io.idx('stage') === 2 ? '立即伸入瓶内并塞紧' : io.idx('stage') === 3 ? '红磷熄灭后冷却至室温' : io.idx('stage') >= 4 ? `打开弹簧夹：进水约 ${(io.s('waterRise',0)*100).toFixed(0)}%` : '检查初始水位'} p={[0,.02,1.1]} size={.14} />
  </group>;
}

function IronHelix({p=[0,0,0]}:{p?:[number,number,number]}) {
  const wire = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {const points = Array.from({length:80},(_,i)=>{const a=i*Math.PI*2/10;return new THREE.Vector3(Math.cos(a)*.095,-i*.012,Math.sin(a)*.095);});return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),120,.027,8,false);},[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useRig((io)=>{if(wire.current) (wire.current.material as THREE.MeshBasicMaterial).color.set(io.opt('gas') === '空气' && io.n('ignite')%2 === 1 ? '#e65532' : '#7d8585');});
  return <mesh ref={wire} position={p} geometry={geometry}><meshBasicMaterial color="#7d8585" /></mesh>;
}

/** 教材图 2-13：空气中铁丝红热；纯氧中铁丝燃烧、火星及黑色固体。 */
export function UpperIronOxygenRig({ exp }: {exp: Experiment}) {
  const air = useRef<THREE.Group>(null);
  const oxygen = useRef<THREE.Group>(null);
  const wire = useRef<THREE.Group>(null);
  useRig((io)=>{
    const inOxygen = io.opt('gas').includes('氧气');
    if (air.current) air.current.visible = !inOxygen;
    if (oxygen.current) oxygen.current.visible = inOxygen;
    if (wire.current) wire.current.position.y = io.damp('ironWireY', io.n('ignite') > 0 ? 0 : .6, 3);
  });
  return <group>
    <Label text={exp.title} p={[0,3.3,.4]} size={.2} />
    <group ref={air} visible={false}>
      <IronHelix p={[0,1.9,.05]} />
      <AlcoholLamp p={[0,0,.2]} flame={0} />
      <Flame p={[0,.72,.2]} lit={(io)=>io.opt('gas')==='空气' && io.n('ignite')%2===1} />
      <Ember p={[0,1.25,.05]} when={(io)=>io.opt('gas')==='空气' && io.n('ignite')%2===1} size={.08} />
      <Label text="空气中：红热，不出现剧烈燃烧" p={[0,.02,1.1]} size={.14} />
    </group>
    <group ref={oxygen}>
      <Vessel kind="jar" p={[0,0,0]} r={.72} h={2.15} />
      <Liquid p={[0,.03,0]} r={.61} level={(io)=>io.opt('protection').includes('少量水')?.14:0} color="clear" opacity={.65} />
      <group ref={wire}>
        <Rod a={[0,2.65,0]} b={[0,2.03,0]} r={.035} m={MAT.steel} />
        <IronHelix p={[0,2.03,0]} />
        <Rod a={[0,1.06,0]} b={[.08,.88,0]} r={.02} m={MAT.wood} />
        <Sparks p={[0,1.15,0]} when={(io)=>io.sb('sparks',false)} />
        <Flame p={[0,1.05,0]} lit={(io)=>io.sb('sparks',false)} />
      </group>
      <Pile p={[0,.2,0]} r={.28} h={.12} color="#24262a" amount={(io)=>io.sb('blackSolid',false) && (!io.sb('flame',false) || io.since('ignite') > 1.2) ? 1 : 0} />
      <IoLabel get={(io)=>io.opt('protection').includes('少量水') ? '瓶底少量水：防止炸裂' : '未放防护水，瓶底有炸裂风险'} p={[0,.15,.9]} size={.16} />
    </group>
    <IoLabel get={(io)=>io.opt('gas') === '空气' ? '加热观察铁丝红热' : io.sb('sparks',false) ? '纯氧中剧烈燃烧，火星四射' : io.sb('blackSolid',false) ? '生成黑色四氧化三铁' : '点燃火柴后将铁丝伸入氧气'} p={[0,.02,1.1]} size={.14} />
  </group>;
}

/** 教材图 6-9：近水平试管高温还原，先撤导管再停火、冷却并倒出。 */
export function UpperCarbonReductionRig({ exp }: {exp: Experiment}) {
  const outlet = useRef<THREE.Group>(null);
  const reactor = useRef<THREE.Group>(null);
  const mixture = useRef<THREE.Group>(null);
  const paper = useRef<THREE.Group>(null);
  useRig((io)=>{
    const active = begun(io); const stage = io.idx('stage');
    if (outlet.current) {outlet.current.position.y = io.damp('liftOutlet', active && stage >= 2 ? .58 : 0, 3); outlet.current.visible = !(active && stage >= 4);}
    if (reactor.current) reactor.current.rotation.z = io.damp('pourTube', active && stage >= 4 ? -.65 : 0, 3);
    if (mixture.current) mixture.current.visible = !(active && stage >= 4);
    if (paper.current) paper.current.visible = active && stage >= 4;
  });
  return <group>
    <Label text={exp.title} p={[0,3.35,.4]} size={.2} />
    <Stand p={[-.6,0,-.45]} h={2.55} />
    <group ref={reactor} position={[-1.25,1.55,0]}>
      <Vessel kind="tube" p={[0,0,0]} r={.26} h={1.45} rot={[0,0,-Math.PI/2]} />
      <group ref={mixture}><Pile p={[.36,0,.06]} r={.22} h={.1} color={(io)=>io.ss('solidColor','black')} /><Pile p={[.68,0,.06]} r={.22} h={.1} color={(io)=>io.ss('solidColor','black')} /></group>
      <Cyl p={[1.48,0,0]} r={.09} h={.2} m={MAT.rubber} rot={[0,0,Math.PI/2]} />
    </group>
    <group ref={outlet}><Tube pts={[[.32,1.55,0],[.95,1.55,0],[1.25,1.55,0],[1.25,.52,0]]} r={.035} m={MAT.glass} /></group>
    <Vessel kind="tube" p={[1.25,0,0]} r={.32} h={1.15} />
    <Liquid p={[1.25,.04,0]} r={.26} level={.65} color={(io)=>io.ss('limewater','clear') === 'milky' ? 'milky-white' : 'clear'} />
    <GasBubbles p={[1.25,.08,.03]} count={7} spread={.12} height={.5} when={(io)=>io.s('bubbles',0)>0 && io.idx('stage')<2} />
    <AlcoholLamp p={[-.9,0,.45]} flame={0} />
    <Flame p={[-.9,.72,.45]} lit={(io)=>io.sb('heating',false)} />
    <group ref={paper} visible={false}><Box p={[-.1,.05,.8]} s={[1.3,.04,.7]} m={MAT.white} /><Pile p={[-.1,.1,.8]} r={.27} h={.07} color={(io)=>io.ss('solidColor','black')} /></group>
    <IoLabel get={(io)=>!begun(io) ? '混匀木炭粉和氧化铜，连接导管' : io.idx('stage') === 1 ? '高温还原；石灰水变浑浊' : io.idx('stage') === 2 ? '先撤导管，再停止加热' : io.idx('stage') === 3 ? '停止加热，待试管冷却' : io.idx('stage') >= 4 ? io.sb('reacted',false) ? '冷却后倒出，观察红色铜' : '未生成铜，倒出混合物'  : '准备混合物'} p={[0,.02,1.1]} size={.14} />
  </group>;
}

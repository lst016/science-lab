import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel } from '../kit';
import { Candle, GasBubbles, Liquid } from './chemical-parts';
import { IoLabel } from './parts';
import { clamp, smooth, useRig, type RigIO } from './io';

const begun = (io: RigIO) => io.n('add') > 0 || io.n('run') > 0;

/** 教材图7-6：倒扣杯、空杯和碳酸钠+盐酸的三支蜡烛对照。 */
function CandleComparison() {
  const cover = useRef<THREE.Group>(null);
  const acidBottle = useRef<THREE.Group>(null);
  const drop = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const active = begun(io); const stage = io.idx('stage');
    if (cover.current) cover.current.position.y = io.damp('coverHeight', active && stage >= 1 ? 1.62 : 2.3, 3);
    if (acidBottle.current) acidBottle.current.visible = active && stage === 3;
    if (drop.current) {
      drop.current.visible = active && stage === 3;
      if (drop.current.visible) drop.current.position.y = 1.9 - (io.t * .65 % 1.2);
    }
  });
  return <group>
    {/* I 倒扣烧杯 */}
    <Candle p={[-1.35,0,0]} lit={(io)=>begun(io) && io.sb('coverFlame',false)} />
    <group ref={cover} position={[-1.35,2.3,0]}><Vessel kind="beaker" r={.44} h={1.5} rot={[Math.PI,0,0]} /></group>
    {/* II 空烧杯中的蜡烛；空气可以从杯口进入。 */}
    <Vessel kind="beaker" p={[0,0,0]} r={.46} h={1.52} />
    <Candle p={[0,0,0]} lit={(io)=>begun(io) && io.sb('controlFlame',true)} />
    {/* III 碳酸钠和酸产生CO₂。 */}
    <Vessel kind="beaker" p={[1.35,0,0]} r={.46} h={1.52} />
    <Candle p={[1.35,.15,0]} lit={(io)=>begun(io) && io.sb('co2Flame',true)} />
    <Liquid p={[1.35,.035,0]} r={.38} level={(io)=>begun(io) && io.idx('stage') >= 3 ? .2 : 0} color="clear" opacity={.65} />
    <GasBubbles p={[1.35,.08,.15]} spread={.28} height={.35} count={9} when={(io)=>begun(io) && io.idx('stage') === 3} />
    <group ref={acidBottle} visible={false} position={[1.85,2,.12]} rotation={[0,0,.9]}><Vessel kind="jar" r={.19} h={.65} level={.35} liquid="#b9e5e8" /><Cyl p={[0,.68,0]} r={.07} h={.16} m={MAT.rubber} /></group>
    <mesh ref={drop} visible={false} position={[1.42,1.9,.15]}><sphereGeometry args={[.045,10,8]} /><meshBasicMaterial color="#83cbd9" /></mesh>
    <Label text="Ⅰ 倒扣" p={[-1.35,.05,.75]} size={.16} />
    <Label text="Ⅱ 空杯" p={[0,.05,.75]} size={.16} />
    <Label text="Ⅲ 加酸产 CO₂" p={[1.35,.05,.75]} size={.16} />
  </group>;
}

/** 教材图7-7：锥形瓶内分别盛碳酸钠溶液与酸，倒置混合，气体由软管喷出。 */
function ExtinguisherDesign() {
  const flask = useRef<THREE.Group>(null);
  const balls = useRef<(THREE.Mesh | null)[]>([]);
  const stageStart = useRef<number | null>(null);
  const elapsed = useRef(0);
  useRig((io)=>{
    const active = begun(io) && io.idx('stage') >= 4;
    if (!active) {stageStart.current = null; elapsed.current = 0;}
    else { if (stageStart.current === null) stageStart.current = io.t; elapsed.current = Math.max(0,io.t-stageStart.current); }
    const u = smooth(clamp(elapsed.current / 2,0,1));
    if (flask.current) flask.current.rotation.z = Math.PI * u;
    balls.current.forEach((m,i)=>{if(!m)return;const spraying=active&&elapsed.current >= 2;m.visible=spraying;if(spraying){const f=(io.t*.65+i/10)%1;m.position.set(.13-f*1.25,.73 + .07*Math.sin(f*5+i),.08);m.scale.setScalar(.6+f*.7);}});
  });
  return <group>
    <group ref={flask} position={[.6,1.35,0]}>
      <group position={[0,-.65,0]}>
        <Vessel kind="flask" r={.53} h={1.32} />
        <Liquid p={[0,.05,0]} r={.36} level={.32} color="clear" opacity={.65} />
        <Vessel kind="tube" p={[.04,.2,.1]} r={.12} h={.58} rot={[0,0,-.24]} />
        <Liquid p={[.04,.22,.1]} r={.08} level={(io)=>elapsed.current < 1.2 ? .2 : 0} color="clear" opacity={.8} rot={[0,0,-.24]} />
        <Cyl p={[0,1.35,0]} r={.15} h={.15} m={MAT.rubber} />
        <Tube pts={[[.16,1.15,0],[.48,1.15,0],[.56,.85,0],[.75,.74,0]]} r={.045} m={MAT.rubber} />
        <GasBubbles p={[0,.16,0]} spread={.25} height={.45} count={8} when={(io)=>begun(io) && io.idx('stage')>=4 && elapsed.current>=1.2} />
      </group>
    </group>
    <Candle p={[-1.25,0,0]} lit={(io)=>begun(io) && io.idx('stage')>=4 && elapsed.current < 3} />
    {Array.from({length:10},(_,i)=><mesh key={i} ref={(m)=>{balls.current[i]=m;}} visible={false}><sphereGeometry args={[.09,8,8]} /><meshBasicMaterial color="#b5cacb" transparent opacity={.7} /></mesh>)}
    <Label text="酸 + 碳酸钠溶液" p={[.65,.03,.7]} size={.16} />
    <Label text="倒置混合 → 产气喷出" p={[0,2.65,.4]} size={.16} />
  </group>;
}

export function UpperFireExtinguisherRig({ exp }: { exp: Experiment }) {
  const experiment = useRef<THREE.Group>(null);
  const design = useRef<THREE.Group>(null);
  useRig((io)=>{const isDesign=begun(io) && io.idx('stage')>=4;if(experiment.current)experiment.current.visible=!isDesign;if(design.current)design.current.visible=isDesign;});
  return <group>
    <Label text={exp.title} p={[0,3.2,.35]} size={.2} />
    <group ref={experiment}><CandleComparison /></group>
    <group ref={design} visible={false}><ExtinguisherDesign /></group>
    <IoLabel get={(io)=>!begun(io) ? '点击加入，开始三支蜡烛对照' : io.idx('stage')===0 ? '三支蜡烛均燃烧' : io.idx('stage')===1 ? 'Ⅰ 被倒扣杯隔绝空气而熄灭' : io.idx('stage')===2 ? 'Ⅱ 空杯对照仍可获得空气' : io.idx('stage')===3 ? 'Ⅲ 加入试剂生成 CO₂ 后熄灭' : '简易灭火器：倒置混合，CO₂ 喷出'} p={[0,.02,1.1]} size={.14} />
  </group>;
}

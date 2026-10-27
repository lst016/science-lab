import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { Ember, Flame, GasBubbles, Sparks, Stand } from './chemical-parts';
import { IoLabel } from './parts';
import { useRig } from './io';

/** 实验活动1：固体加热制氧、排水收集，再分别检验木条、木炭和铁丝。 */
export function OxygenPracticalRig({ exp }: { exp: Experiment }) {
  const pipe = useRef<THREE.Group>(null);
  const generation = useRef<THREE.Group>(null);
  const withdrawn = useRef<THREE.Group>(null);
  const collectingJar = useRef<THREE.Group>(null);
  const testingJar = useRef<THREE.Group>(null);
  const wood = useRef<THREE.Group>(null);
  const carbon = useRef<THREE.Group>(null);
  const iron = useRef<THREE.Group>(null);
  const gas = useRef<THREE.Mesh>(null);
  const testLiquid = useRef<THREE.Mesh>(null);
  const ironProduct = useRef<THREE.Group>(null);
  const coil: V3[] = Array.from({ length: 65 }, (_, i) => {
    const angle = i * Math.PI / 8;
    return [1.1 + .12 * Math.cos(angle), .58 + i * .013, .12 * Math.sin(angle)];
  });
  useRig(io => {
    const step = io.idx('step'), testing = step === 3, ready = io.sb('gasReady', false);
    if (generation.current) generation.current.visible = !testing;
    if (pipe.current) pipe.current.visible = step < 4;
    if (withdrawn.current) withdrawn.current.visible = step >= 4;
    if (collectingJar.current) collectingJar.current.visible = !testing;
    if (testingJar.current) testingJar.current.visible = testing;
    if (wood.current) wood.current.visible = testing && io.opt('test').includes('木条');
    if (carbon.current) carbon.current.visible = testing && io.opt('test').includes('木炭');
    if (iron.current) iron.current.visible = testing && io.opt('test').includes('铁丝');
    if (gas.current) gas.current.visible = ready;
    if (testLiquid.current) {
      testLiquid.current.visible = testing && (io.opt('test').includes('铁丝') || io.sb('limewaterTest',false));
      (testLiquid.current.material as THREE.MeshBasicMaterial).color.set(io.sb('limewaterTest',false) ? '#f1eee5' : '#bde2ef');
    }
    if (ironProduct.current) ironProduct.current.visible = io.sb('blackSolid',false);
  });
  return <group>
    <Label text={exp.title} p={[0, 3.35, .3]} size={.2} />
    <group ref={generation}>
    <Stand p={[-1.9, 0, -.35]} h={2.6} />
    <group position={[-1.2, 1.6, 0]} rotation={[0, 0, -1.69]}>
      <Vessel kind="tube" p={[0, -.72, 0]} r={.24} h={1.44} />
      <mesh position={[0,-.48,0]}><dodecahedronGeometry args={[.16,0]}/><meshStandardMaterial color="#513b5b"/></mesh>
      <Ball p={[0, .5, 0]} r={.16} m={MAT.white} />
      <Cyl p={[0, .72, 0]} r={.2} h={.15} m={MAT.rubber} />
    </group>
    <Tube pts={[[-.48, 1.51, 0], [-.1, 1.8, 0], [.45, 1.8, 0], [.45, .96, 0]]} r={.035} m={MAT.glass} />
    <group ref={pipe}><Tube pts={[[.45, .96, 0], [.45, .25, 0], [1.1, .25, 0], [1.1, .5, 0]]} r={.035} m={MAT.glass} /></group>
    <group ref={withdrawn} visible={false}><Tube pts={[[.45, .96, 0], [.45, .84, 0], [.1, .84, 0]]} r={.035} m={MAT.glass} /></group>
    <AlcoholLamp p={[-1.65, 0, .1]} flame={0} /><Flame p={[-1.65, .72, .1]} stateKey="heating" />
    <group ref={collectingJar}>
      <Vessel kind="beaker" p={[1.05, 0, 0]} r={.77} h={.68} level={.62} liquid="#c2e2ed" />
      <Vessel kind="jar" p={[1.1, 1.67, 0]} r={.36} h={1.25} rot={[Math.PI, 0, 0]} />
      <mesh ref={gas} position={[1.1, 1.3, 0]} visible={false}><cylinderGeometry args={[.3, .3, .55, 20]} /><meshBasicMaterial color="#d7eeed" transparent opacity={.7} depthWrite={false} /></mesh>
      <GasBubbles p={[.84, .15, .1]} count={7} height={.45} when={io=>io.sb('heating',false) && io.idx('step')<3} />
    </group>
    </group>
    <group ref={testingJar} visible={false} position={[-1.1,0,0]}>
      <Vessel kind="jar" p={[1.1, 0, 0]} r={.5} h={1.75} />
      <mesh ref={testLiquid} position={[1.1,.09,0]} visible={false}><cylinderGeometry args={[.44,.44,.14,20]}/><meshBasicMaterial color="#bde2ef" transparent opacity={.8}/></mesh>
      <group ref={wood} visible={false}><Rod a={[1.1, .78, 0]} b={[1.1, 2.2, 0]} r={.035} m={MAT.wood} /><Ember p={[1.1,.8,0]} when={io=>io.sb('gasReady',false)} bright={io=>io.sb('glowingSplint',false)} /><Flame p={[1.1,.8,0]} scale={.8} lit={io=>io.sb('glowingSplint',false)} /></group>
      <group ref={carbon} visible={false}><Rod a={[1.1, 2.35, 0]} b={[1.1, .95, 0]} r={.025} m={MAT.steel} /><Ball p={[1.1,.95,0]} r={.16} m={MAT.black} /><Ember p={[1.1,1,0]} when={io=>io.sb('carbonBurning',false)} bright={io=>io.sb('carbonBurning',false)} size={.18} /></group>
      <group ref={iron} visible={false}><Tube pts={coil} r={.023} m={MAT.steel} /><Rod a={[1.1,1.42,0]} b={[1.1,2.3,0]} r={.025} m={MAT.steel}/><Sparks p={[1.1,.8,0]} when={io=>io.sb('sparks',false)}/><group ref={ironProduct} visible={false}><Ball p={[1.1,.2,0]} r={.1} m={MAT.black}/></group><IoLabel get={io=>io.sb('blackSolid',false)?'黑色生成物：Fe₃O₄':'瓶底预放少量水'} p={[1.1,.15,.65]} size={.13}/></group>
    </group>
    <IoLabel get={io=>io.ss('phase','检查装置')} p={[0,2.82,.35]} size={.17} />
    <Label text="先撤导管，再停止加热" p={[-.9,.02,.7]} size={.14}/>
  </group>;
}

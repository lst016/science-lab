import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { Flame, GasBubbles, Liquid, Pile, Sparks, Stand } from './chemical-parts';
import { IoLabel } from './parts';
import { clamp, useRig, type RigIO } from './io';

// 这些画面只在明确开始后推进；所有状态来自页面控件与模拟器，而非自动假定发生了反应。
const started = (io: RigIO) => io.n('run') > 0 || io.n('add') > 0;
const distillationHeat = (io: RigIO) => started(io) && io.opt('heating') === '加热';

/** 教材图 4-14：圆底烧瓶、酒精灯、弯管、浸入冷水烧杯的接收试管。 */
export function UpperDistillationRig({ exp }: { exp: Experiment }) {
  const initial = useRef<THREE.Group>(null);
  const product = useRef<THREE.Group>(null);
  const drop = useRef<THREE.Mesh>(null);
  const initialAmount = useRef(0);
  const productAmount = useRef(0);
  const lastTime = useRef(0);
  useRig((io) => {
    const elapsed = Math.max(0, Math.min(.1, io.t - lastTime.current));
    lastTime.current = io.t;
    const collect = started(io) && io.idx('stage') >= 2;
    if (!started(io)) { initialAmount.current = 0; productAmount.current = 0; }
    else {
      if (distillationHeat(io)) {
        if (io.idx('stage') === 1) initialAmount.current = Math.min(.24, initialAmount.current + elapsed * .08);
        if (io.idx('stage') >= 2) productAmount.current = Math.min(.45, productAmount.current + elapsed * .12);
      }
      // 初馏液取出后倒入废液，不并入蒸馏水。
      if (collect) initialAmount.current = Math.max(0, initialAmount.current - elapsed * .12);
    }
    if (initial.current) initial.current.rotation.z = io.damp('wasteTilt', collect ? -1.05 : 0, 3);
    if (initial.current) initial.current.position.x = io.damp('wasteTube', collect ? 1.98 : 1.03, 4);
    if (product.current) product.current.position.x = io.damp('productTube', collect ? 1.03 : 1.98, 4);
    if (drop.current) {
      const on = distillationHeat(io) && io.idx('stage') > 0;
      drop.current.visible = on;
      if (on) drop.current.position.y = 1.25 - ((io.t * .85) % .68);
    }
  });
  return <group>
    <Label text={exp.title} p={[0, 3.25, 0.3]} size={0.21} />
    <Stand p={[-1.55, 0, -0.36]} h={2.65} />
    <Vessel kind="round" p={[-1.1, 0.58, 0]} r={0.48} h={1.4} level={0.45} liquid="#c2e2ed" />
    <Box p={[-1.1, 0.58, 0]} s={[1.1, .035, .9]} m={MAT.steel} />
    {/* 瓷片/沸石在水里，提供防暴沸结构。 */}
    {[-.22, 0, .22].map((x, i) => <Ball key={i} p={[-1.1 + x, 0.68, .05]} r={.065} m={MAT.white} />)}
    <Cyl p={[-1.1, 2.05, 0]} r={.1} h={.16} m={MAT.rubber} />
    <Tube pts={[[-1.1, 2.13, 0], [-1.1, 2.38, 0], [1.03, 2.38, 0], [1.03, 1.32, 0]]} r={.037} m={MAT.glass} />
    <AlcoholLamp p={[-1.1, 0, .44]} flame={0} />
    <Flame p={[-1.1, .69, .44]} lit={distillationHeat} />
    <GasBubbles p={[-1.1, .69, 0]} count={8} spread={.2} height={.44} when={distillationHeat} />
    {/* 冷却水浴包围接收试管；切换操作阶段更换试管。 */}
    <Vessel kind="beaker" p={[1.03, 0, 0]} r={.58} h={1.35} level={.62} liquid="#c6e8eb" liquidOpacity={.35} />
    <group ref={initial} position={[1.03, 0, .1]}>
      <Vessel kind="tube" p={[0, .13, 0]} r={.22} h={1.12} />
      <Liquid p={[0, .17, 0]} r={.17} level={() => initialAmount.current} color="clear" />
      <IoLabel get={(io) => started(io) && io.idx('stage') >= 2 ? '初馏液：弃去' : '初馏液'} p={[0, .1, .5]} size={.16} />
    </group>
    <group ref={product} position={[1.98, 0, .1]}>
      <Vessel kind="tube" p={[0, .13, 0]} r={.22} h={1.12} />
      <Liquid p={[0, .17, 0]} r={.17} level={() => productAmount.current} color="clear" />
      <Label text="蒸馏水" p={[0, .1, .5]} size={.16} />
    </group>
    <mesh ref={drop} position={[1.03, 1.1, .1]} visible={false}><sphereGeometry args={[.045, 10, 8]} /><meshBasicMaterial color="#84cbe0" transparent opacity={.85} /></mesh>
    <Label text="冷水浴" p={[1.03, 1.52, .48]} size={.16} />
    <IoLabel get={(io) => !started(io) ? '先加入水和沸石，连接装置' : !distillationHeat(io) ? '停止加热' : io.idx('stage') === 0 ? '加热并观察汽化' : io.idx('stage') === 1 ? '先弃去初馏液' : '更换试管，收集蒸馏水'} p={[0, .02, 1.1]} size={.14} />
  </group>;
}

function CeramicGauze({ p = [0,0,0] }: {p?: V3}) {
  return <group position={p}>
    <Box p={[0, .03, 0]} s={[1.05, .04, .7]} m={MAT.darkSteel} />
    <Cyl p={[0, .07, 0]} r={.3} h={.04} m={MAT.card} />
    {[-.4,-.2,0,.2,.4].map((x) => <Box key={x} p={[x,.064,0]} s={[.012,.012,.67]} m={MAT.steel} />)}
    {[-.26,-.13,0,.13,.26].map((z) => <Box key={z} p={[0,.066,z]} s={[1.0,.012,.012]} m={MAT.steel} />)}
  </group>;
}

/** 教材图 5-4：陶土网承接镁带，燃烧前后在天平上比较质量。 */
export function UpperMagnesiumRig({ exp }: { exp: Experiment }) {
  const balance = useRef<THREE.Group>(null);
  const burn = useRef<THREE.Group>(null);
  const strip = useRef<THREE.Group>(null);
  const ash = useRef<THREE.Group>(null);
  useRig((io) => {
    const stage = io.idx('stage'); const active = started(io);
    if (balance.current) balance.current.visible = !active || stage !== 1;
    if (burn.current) burn.current.visible = active && stage === 1;
    if (strip.current) strip.current.visible = !active || stage === 0;
    if (ash.current) ash.current.visible = active && stage === 2;
  });
  return <group>
    <Label text={exp.title} p={[0, 3.2, .3]} size={.2} />
    <group ref={balance}>
      <Box p={[0, .12, 0]} s={[2.9, .22, .9]} m={MAT.darkSteel} />
      <Cyl p={[0, .75, 0]} r={.12} h={1.2} m={MAT.brass} />
      <Box p={[0, 1.34, 0]} s={[2.75, .09, .12]} m={MAT.brass} />
      {[-1, 1].map((x) => <group key={x}><Rod a={[x,1.34,0]} b={[x,.69,0]} r={.018} m={MAT.steel} /><Cyl p={[x,.65,0]} r={.59} h={.06} m={MAT.steel} /></group>)}
      <CeramicGauze p={[-1, .69, 0]} />
      <group ref={strip}><Rod a={[-1.45,.85,0]} b={[-.55,.85,0]} r={.045} m={MAT.steel} /></group>
      <group ref={ash}><Pile p={[-1,.78,0]} r={.33} h={.11} color="#f4f1dc" /></group>
      <Cyl p={[1,.73,0]} r={.2} h={.16} m={MAT.darkSteel} />
    </group>
    <group ref={burn} visible={false}>
      <CeramicGauze p={[0,.15,0]} />
      <Rod a={[.1,2.25,.1]} b={[.02,1.33,.1]} r={.045} m={MAT.steel} />
      <Rod a={[.12,2.25,.1]} b={[.55,2.7,.1]} r={.025} m={MAT.darkSteel} />
      <Rod a={[.06,2.25,.1]} b={[.4,2.74,.1]} r={.025} m={MAT.darkSteel} />
      <Flame p={[.02,1.1,.1]} color="#fff7d4" lit={(io) => started(io) && io.idx('stage') === 1} scale={1.25} />
      <Sparks p={[.02,1.4,.1]} when={(io) => started(io) && io.idx('stage') === 1} />
      <Pile p={[0,.25,0]} r={.3} h={.1} color="#f5f2e6" amount={(io) => started(io) && io.idx('stage') === 1 ? .75 : 0} />
    </group>
    <IoLabel get={(io) => !started(io) || io.idx('stage') === 0 ? '镁带与陶土网一起称量' : io.idx('stage') === 1 ? '镁带在陶土网上方燃烧' : io.opt('system').includes('氧气') ? '计入参与的氧气，总质量守恒' : '固体质量增加：镁结合了空气中的氧'} p={[0,.02,1.1]} size={.14} />
  </group>;
}

function AnimatedDrops({ from, dir, when, color = '#86c9df' }: {from:V3; dir:V3; when:(io:RigIO)=>boolean; color?:string}) {
  const dots = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => dots.current.forEach((m,i) => { if (!m) return; const on = when(io); m.visible = on; if (on) { const t = (io.t * .7 + i / 5) % 1; m.position.set(from[0] + dir[0]*t, from[1] + dir[1]*t, from[2] + dir[2]*t); m.scale.setScalar(.6 + .4*(1-t)); } }));
  return <group>{Array.from({length:5},(_,i)=><mesh key={i} ref={(m)=>{dots.current[i]=m;}} visible={false}><sphereGeometry args={[.045,8,8]} /><meshBasicMaterial color={color} transparent opacity={.8} /></mesh>)}</group>;
}

function PaperFlower({ p, color }: {p:V3; color:(io:RigIO)=>string}) {
  const petals = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => { const c = color(io); petals.current.forEach((petal) => { if (petal) (petal.material as THREE.MeshBasicMaterial).color.set(c); }); });
  return <group position={p}>
    <Rod a={[0,.05,0]} b={[0,.87,0]} r={.022} m={MAT.wood} />
    {Array.from({length:6},(_,i) => <mesh key={i} ref={(m) => {petals.current[i]=m;}} position={[Math.cos(i*Math.PI/3)*.18,.92+Math.sin(i*Math.PI/3)*.18,.05]}><sphereGeometry args={[.145,10,8]} /><meshBasicMaterial color="#9560ad" /></mesh>)}
    <Ball p={[0,.92,.14]} r={.07} m={MAT.card} />
    <Box p={[0,.03,0]} s={[.4,.06,.4]} m={MAT.wood} />
  </group>;
}

/** 教材图 6-12：喷水、干燥 CO₂、喷水+CO₂三组；取第三朵吹干。 */
export function UpperLitmusRig({ exp }: { exp: Experiment }) {
  const dryer = useRef<THREE.Group>(null);
  const spray = useRef<THREE.Group>(null);
  const jars = useRef<(THREE.Group | null)[]>([]);
  useRig((io) => {
    const active = started(io); const i = io.idx('paper');
    if (dryer.current) dryer.current.visible = active && i >= 4;
    if (spray.current) { spray.current.visible = active && (i === 1 || i === 3); spray.current.position.x = i === 3 ? .7 : -1.25; }
    jars.current.forEach((g, j) => { if (g) g.visible = active && ((j === 1 && i === 2) || (j === 2 && i === 3)); });
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.4]} size={.2} />
    {[-1.2,0,1.2].map((x,i) => <group key={i}>
      <PaperFlower p={[x,0,0]} color={(io) => i === 2 && started(io) && io.idx('paper') === 3 ? '#d74152' : '#9462b5'} />
      <group ref={(g) => {jars.current[i] = g;}} visible={false}><Vessel kind="jar" p={[x,0,-.02]} r={.48} h={1.45} /></group>
      <Label text={['喷水','干燥 + CO₂','喷水 + CO₂'][i]} p={[x,.06,.65]} size={.15} />
    </group>)}
    <group ref={spray} visible={false} position={[-1.25,1.5,.15]}><Box p={[0,0,0]} s={[.22,.38,.18]} m={MAT.white} /><Cyl p={[0,.25,0]} r={.05} h={.16} m={MAT.blue} /><Tube pts={[[.05,.33,0],[.27,.33,0]]} r={.02} m={MAT.blue} /></group>
    <AnimatedDrops from={[-.98,1.83,.15]} dir={[.05,-.65,0]} when={(io)=>started(io) && io.idx('paper') === 1} />
    <AnimatedDrops from={[.97,1.83,.15]} dir={[.1,-.65,0]} when={(io)=>started(io) && io.idx('paper') === 3} />
    <AnimatedDrops from={[1.39,1.3,.15]} dir={[-.42,.08,0]} when={(io)=>started(io) && io.idx('paper') >= 4} color="#c8d9d6" />
    <group ref={dryer} visible={false} position={[1.85,1.3,.15]}><Box p={[0,0,0]} s={[.5,.22,.3]} m={MAT.white} /><Rod a={[.14,-.1,0]} b={[.19,-.48,0]} r={.065} m={MAT.white} /><Tube pts={[[-.3,0,0],[-.46,0,0]]} r={.03} m={MAT.steel} /></group>
    <IoLabel get={(io) => !started(io) ? '选择纸花处理并点击加入' : io.idx('paper') === 4 ? '第三朵吹干后恢复紫色' : io.idx('paper') === 3 ? '水和 CO₂ 共同作用：第三朵变红' : '只喷水或只通 CO₂，纸花保持紫色'} p={[0,.02,1.1]} size={.14} />
  </group>;
}

/** 教材图 3-4：小烧杯A（酚酞）、B（浓氨水）、样液对照与大烧杯罩。 */
export function UpperAmmoniaRig({ exp }: { exp: Experiment }) {
  const cover = useRef<THREE.Group>(null);
  const pipette = useRef<THREE.Group>(null);
  const particles = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => {
    const active = started(io); const stage = io.idx('stage');
    if (cover.current) cover.current.visible = active && stage >= 2 && io.opt('cover') === '是';
    if (pipette.current) pipette.current.visible = active && stage === 1;
    const diffusion = active && stage >= 3 && io.opt('cover') === '是';
    particles.current.forEach((m, i) => { if (!m) return; m.visible = diffusion; if (diffusion) { const phase = (io.t * .18 + i / 9) % 1; m.position.set(-.55 + phase * 1.1, .55 + Math.sin(phase * Math.PI) * .7 + (i % 3) * .08, .12); }});
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.2} />
    <Vessel kind="beaker" p={[.6,0,0]} r={.42} h={1.0} />
    <Liquid p={[.6,.05,0]} r={.35} level={.47} color={(io) => started(io) && io.idx('stage') >= 3 && io.opt('cover') === '是' ? 'pink' : 'clear'} />
    <Vessel kind="beaker" p={[-.6,0,0]} r={.42} h={1.0} />
    <Liquid p={[-.6,.05,0]} r={.35} level={(io) => started(io) && io.idx('stage') >= 2 ? .38 : 0} color="clear" />
    <Label text="B 浓氨水" p={[-.6,.05,.62]} size={.16} /><Label text="A 酚酞液" p={[.6,.05,.62]} size={.16} />
    <group ref={cover} visible={false}><Vessel kind="beaker" p={[0, 2.08, -.1]} r={1.28} h={2.05} rot={[Math.PI, 0, 0]} /></group>
    <Vessel kind="tube" p={[1.75,0,.05]} r={.23} h={1.13} />
    <Liquid p={[1.75,.04,.05]} r={.18} level={(io) => started(io) && io.idx('stage') >= 1 ? .38 : 0} color={(io) => started(io) && io.idx('stage') >= 1 ? 'pink' : 'clear'} />
    <Label text="样液对照" p={[1.75,.05,.62]} size={.16} />
    <group ref={pipette} visible={false} position={[1.75,1.4,.08]}><Cyl p={[0,.25,0]} r={.055} h={.4} m={MAT.rubber} /><Rod a={[0,.05,0]} b={[0,-.22,0]} r={.018} m={MAT.glass} /><Ball p={[0,-.28,0]} r={.035} m={MAT.blue} /></group>
    {Array.from({length:9},(_,i)=><mesh key={i} ref={(m)=>{particles.current[i]=m;}} visible={false}><sphereGeometry args={[.045,8,8]} /><meshBasicMaterial color="#87bbd8" /></mesh>)}
    <IoLabel get={(io) => !started(io) ? '先配制酚酞溶液' : io.idx('stage') === 0 ? 'A：水与酚酞溶液，保持无色' : io.idx('stage') === 1 ? '取样后滴氨水：样液变红' : io.idx('stage') === 2 ? io.opt('cover') === '是' ? 'A、B 共同罩在大烧杯中' : '未罩盖，作为对照' : io.opt('cover') === '是' ? '静置后氨扩散，A 变红' : '未罩盖时扩散到 A 的氨减少'} p={[0,.02,1.1]} size={.14} />
  </group>;
}

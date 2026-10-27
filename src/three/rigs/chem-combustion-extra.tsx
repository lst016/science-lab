import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { Beads, Flame, GasBubbles, Liquid, Pile, Smoke } from './chemical-parts';
import { IoLabel } from './parts';
import { useRig, type RigIO } from './io';

/** 实验 7-39：热水中的铜片白磷、红磷与水中白磷，对比燃烧条件。 */
export function PhosphorusConditionsRig({exp}:{exp:Experiment}) {
  return <group>
    <Label text={exp.title} p={[0,3.1,.3]} size={.2} />
    <Vessel kind="beaker" p={[0,0,0]} r={.78} h={1.3} />
    <Liquid p={[0,.03,0]} r={.74} level={.95} color="clear" />
    <Box p={[0,1.36,0]} s={[1.75,.04,.74]} m={MAT.copper} />
    <Pile p={[-.45,1.38,0]} r={.1} h={.07} color="pale-yellow" />
    <Pile p={[.45,1.38,0]} r={.1} h={.07} color="#9c2b25" />
    <Pile p={[.1,.04,.42]} r={.1} h={.07} color="pale-yellow" />
    <Flame p={[-.45,1.4,0]} lit={(io)=>io.sb('copperWhiteBurning',false)} scale={1.1} />
    <Smoke p={[-.45,1.55,0]} amount={(io)=>io.sb('copperWhiteBurning',false)?1:0} rise={.9} spread={.12} size={.08} opacity={.5} />
    <Flame p={[.1,.07,.42]} lit={(io)=>io.sb('underwaterWhiteBurning',false)} scale={.7} color="#ffe28a" />
    <Tube pts={[[1.35,2.0,.5],[.1,2.0,.5],[.1,.2,.5]] as V3[]} r={.035} m={MAT.glass} />
    <GasBubbles p={[.1,.22,.5]} height={.85} spread={.08} count={8} when={(io)=>io.sb('oxygen',false) && io.n('ignite') % 2 === 1} />
    <Label text="白磷" p={[-.45,1.82,.3]} size={.14} />
    <Label text="红磷" p={[.45,1.82,.3]} size={.14} />
    <Label text="水中白磷" p={[-.62,.42,.85]} size={.14} />
    <Label text="氧气" p={[1.35,2.2,.5]} size={.14} />
    <IoLabel get={(io)=>io.opt('temperature').includes('是')?'热水约80℃：白磷达到着火点（红磷着火点更高）':'水温低：未达到着火点'} p={[0,-.12,1.0]} size={.15} />
  </group>;
}

/** 实验活动 7-41：木块、煤块在灯焰上加热；无氧时罩上烧杯隔绝空气。 */
export function WoodCoalIgnitionRig({exp}:{exp:Experiment}) {
  const cover = useRef<THREE.Group>(null);
  const wood = useRef<THREE.Group>(null);
  const coal = useRef<THREE.Group>(null);
  const lampOn = (io:RigIO) => io.n('ignite') % 2 === 1;
  useRig((io)=>{
    const coalSample = io.opt('material').includes('煤');
    if (wood.current) wood.current.visible = !coalSample;
    if (coal.current) coal.current.visible = coalSample;
    const oxygen = io.opt('oxygen').includes('有');
    if (cover.current) cover.current.position.set(io.damp('coverX', oxygen ? 1.75 : 0, 4), 1.55, 0);
  });
  return <group>
    <Label text={exp.title} p={[0,3.1,.3]} size={.2} />
    <AlcoholLamp p={[0,0,0]} flame={0} />
    <Flame p={[0,.78,0]} lit={(io)=>lampOn(io)} scale={1.1} />
    <Rod a={[-.14,2.5,0]} b={[-.1,1.12,0]} r={.025} m={MAT.darkSteel} />
    <Rod a={[.14,2.5,0]} b={[.1,1.12,0]} r={.025} m={MAT.darkSteel} />
    <group ref={wood}><Box p={[0,1.2,0]} s={[.34,.22,.28]} m={MAT.wood} /></group>
    <group ref={coal} visible={false}><mesh position={[0,1.22,0]}><dodecahedronGeometry args={[.19,0]} /><meshStandardMaterial color="#2a2a2d" roughness={.7} /></mesh></group>
    <Flame p={[0,1.3,0]} lit={(io)=>io.sb('flame',false)} scale={1.2} />
    <group ref={cover} position={[1.75,1.55,0]}>
      <group rotation={[Math.PI,0,0]}><Vessel kind="beaker" r={.6} h={1.5} /></group>
    </group>
    <IoLabel get={(io)=>{
      const sample = io.opt('material') || '木块';
      if (!io.sb('flame',false)) return lampOn(io) ? (io.opt('oxygen').includes('有') ? `${sample}加热中，尚未燃烧` : `${sample}在罩内缺氧，不燃烧`) : `${sample}：先点燃酒精灯加热`;
      return `${sample}达到着火点并有氧气：燃烧`;
    }} p={[0,-.12,1.0]} size={.15} />
  </group>;
}

const METAL_COLOR: Record<string,string> = { '镁':'#d7dadc', '铝':'#c4c9cd', '铁':'#6a6d72', '铜':'#c06c3e' };

/** 实验 8-2：镁、铝、铁、铜在灯焰上加热，比较与氧气反应的难易。 */
export function MetalsOxygenRig({exp}:{exp:Experiment}) {
  const strip = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  useRig((io)=>{
    const metal = io.opt('metal') || '镁';
    const heating = io.sb('heating',false);
    const age = heating ? Math.min(1, Math.max(0, io.since('add')) / 3) : 0;
    const m = strip.current;
    if (m) {
      const mat = m.material as THREE.MeshStandardMaterial;
      const target = new THREE.Color(METAL_COLOR[metal] ?? '#b9bec4');
      if (heating && metal === '铜') target.lerp(new THREE.Color('#1c1b1d'), age);
      else if (heating && metal === '铁') target.lerp(new THREE.Color('#44464b'), age * .5);
      else if (heating && metal === '铝') target.lerp(new THREE.Color('#e7e9ea'), age * .4);
      mat.color.copy(target);
      m.visible = !(heating && metal === '镁' && age > .7);
      m.scale.set(1, 1, metal === '铁' ? .35 : 1);
    }
    const bright = heating && metal === '镁' && io.sb('flame',false);
    if (glow.current) {
      glow.current.visible = bright;
      glow.current.scale.setScalar(1 + Math.sin(io.t * 18) * .1);
    }
  });
  return <group>
    <Label text={exp.title} p={[0,3.1,.3]} size={.2} />
    <AlcoholLamp p={[0,0,0]} flame={0} />
    <Flame p={[0,.78,0]} lit={(io)=>io.sb('heating',false)} scale={1.1} />
    <Rod a={[1.2,2.3,.02]} b={[.22,1.18,.02]} r={.028} m={MAT.darkSteel} />
    <Rod a={[1.2,2.3,-.02]} b={[.22,1.12,-.02]} r={.028} m={MAT.darkSteel} />
    <mesh ref={strip} position={[0,1.16,0]}><boxGeometry args={[.9,.04,.2]} /><meshStandardMaterial color="#d7dadc" metalness={.7} roughness={.35} /></mesh>
    <mesh ref={glow} position={[0,1.28,0]} visible={false}><sphereGeometry args={[.3,14,12]} /><meshBasicMaterial color="#fffdf0" transparent opacity={.85} /></mesh>
    <Flame p={[0,1.2,0]} lit={(io)=>io.sb('flame',false)} scale={1.3} color="#fffbe6" />
    <Pile p={[.85,.04,.55]} r={.2} h={.08} color={(io)=>io.sb('heating',false)?(io.opt('metal')==='铜'?'black':io.opt('metal')==='铁'?'gray':'white'):'none'} amount={(io)=>io.sb('heating',false)&&io.since('add')>2?1:0} />
    <IoLabel get={(io)=>{
      const metal = io.opt('metal') || '镁';
      if (!io.sb('heating',false)) return `${metal}：选好金属后点击加入，开始加热`;
      return metal === '镁' ? '镁：剧烈燃烧，耀眼白光，生成白色MgO' : metal === '铜' ? '铜：表面逐渐变黑（CuO），不燃烧' : metal === '铝' ? '铝：表面有氧化膜，普通铝片不剧烈燃烧' : '铁：空气中加热只氧化，无剧烈燃烧';
    }} p={[0,-.12,1.0]} size={.15} />
    <Label text="氧化产物" p={[.85,.4,.55]} size={.13} />
  </group>;
}

/** 实验 8-1：黄铜与铜、硬铝与铝相互刻划，比较硬度。 */
export function AlloyScratchRig({exp}:{exp:Experiment}) {
  const hard = useRef<THREE.Group>(null);
  const mark = useRef<THREE.Mesh>(null);
  const plateA = useRef<THREE.Mesh>(null);
  const plateB = useRef<THREE.Mesh>(null);
  useRig((io)=>{
    const al = io.opt('pair').includes('铝');
    const a = plateA.current?.material as THREE.MeshStandardMaterial | undefined;
    const b = plateB.current?.material as THREE.MeshStandardMaterial | undefined;
    a?.color.set(al ? '#b9bec2' : '#d4aa4c');
    b?.color.set(al ? '#dcdfe1' : '#b85b3d');
    const go = io.damp('scratch', io.sb('scratched',false) ? 1 : 0, 1.4);
    if (hard.current) hard.current.position.set(-.5 + go * 1.0, .2, .3);
    if (mark.current) { mark.current.visible = go > .02; mark.current.scale.x = Math.max(.001, go); mark.current.position.x = -.5 + go * .5; }
  });
  return <group>
    <Label text={exp.title} p={[0,2.5,.3]} size={.2} />
    <mesh ref={plateA} position={[-1.3,.04,-.5]}><boxGeometry args={[1.0,.06,.7]} /><meshStandardMaterial color="#d4aa4c" metalness={.7} roughness={.35} /></mesh>
    <mesh ref={plateB} position={[0,.04,.3]}><boxGeometry args={[1.5,.06,.7]} /><meshStandardMaterial color="#b85b3d" metalness={.7} roughness={.35} /></mesh>
    <mesh ref={mark} position={[-.5,.08,.3]} visible={false}><boxGeometry args={[1,.012,.035]} /><meshBasicMaterial color="#3b2d25" /></mesh>
    <group ref={hard} position={[-.5,.2,.3]}>
      <Box p={[0,.08,0]} s={[.28,.2,.26]} m={MAT.steel} />
      <mesh position={[0,-.04,0]} rotation={[Math.PI,0,0]}><coneGeometry args={[.07,.14,4]} /><meshStandardMaterial color="#d4aa4c" metalness={.7} roughness={.3} /></mesh>
    </group>
    <IoLabel get={(io)=>{
      const al = io.opt('pair').includes('铝');
      return io.sb('scratched',false) ? `${al?'硬铝':'黄铜'}刻划${al?'铝片':'铜片'}：纯金属上划痕更明显` : `${al?'硬铝与铝':'黄铜与铜'}：先观察颜色，再点击开始刻划`;
    }} p={[0,-.2,1.0]} size={.15} />
    <Label text={'合金片（硬）'} p={[-1.3,.55,-.5]} size={.13} />
    <Label text={'纯金属片'} p={[.7,.55,.65]} size={.13} />
  </group>;
}

const METHANE_BEADS: V3[] = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.4;
  return i < 6 ? [Math.cos(a) * .3 * (.4 + (i % 3) * .3), .05, Math.sin(a) * .3 * (.4 + (i % 3) * .3)] as V3 : [Math.cos(a) * .46, .15 + (i % 5) * .14, Math.sin(a) * .46] as V3;
});

/** 实验 7-45：甲烷在导管口燃烧，干燥烧杯或石灰水烧杯检验产物。 */
export function MethaneProductsRig({exp}:{exp:Experiment}) {
  const cover = useRef<THREE.Group>(null);
  const film = useRef<THREE.Mesh>(null);
  const filmMat = useRef<THREE.MeshBasicMaterial>(null);
  useRig((io)=>{
    const lit = io.sb('flame',false);
    const lime = io.opt('stage').includes('二氧化碳');
    if (cover.current) cover.current.position.set(io.damp('methaneCoverX', lit ? 0 : 1.5, 4), io.damp('methaneCoverY', lit ? 1.65 : 1.12, 4), 0);
    if (film.current && filmMat.current) {
      film.current.visible = lime;
      filmMat.current.opacity = lime ? .1 + .62 * io.damp('methaneFog', lit ? 1 : 0, 1) : 0;
    }
  });
  return <group>
    <Label text={exp.title} p={[0,3.2,.3]} size={.2} />
    <Cyl p={[-.9,.35,0]} r={.18} h={.7} m={MAT.darkSteel} />
    <Label text="甲烷" p={[-.9,.95,.3]} size={.14} />
    <Tube pts={[[-.9,.7,0],[-.9,.9,0],[0,.9,0],[0,1.1,0]] as V3[]} r={.04} m={MAT.glass} />
    <Cyl p={[0,1.0,0]} r={.07} h={.3} m={MAT.darkSteel} />
    <Flame p={[0,1.15,0]} kind="candle" color="#7db4ee" scale={.85} lit={(io)=>io.sb('flame',false)} />
    <group ref={cover} position={[1.5,1.12,0]}>
      <group rotation={[Math.PI,0,0]}>
        <Vessel kind="beaker" r={.5} h={1.1} />
        <mesh ref={film} position={[0,.5,0]} visible={false}><cylinderGeometry args={[.47,.47,.96,24,1,true]} /><meshBasicMaterial ref={filmMat} color="#f2f0e6" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <Beads spots={METHANE_BEADS} amount={(io)=>io.opt('stage').includes('二氧化碳') ? 0 : io.damp('methaneBeads', io.s('waterDrops',0), .8)} />
      </group>
    </group>
    <IoLabel get={(io)=>io.opt('stage').includes('二氧化碳') ? '内壁涂石灰水：浑浊 → CO₂' : '干燥烧杯：内壁水珠 → H₂O'} p={[1.5,.3,.75]} size={.16} />
    <IoLabel get={(io)=>io.sb('flame',false) ? '甲烷燃烧，罩上烧杯观察' : '点燃前先验纯，再点燃'} p={[0,2.9,.3]} size={.16} />
  </group>;
}

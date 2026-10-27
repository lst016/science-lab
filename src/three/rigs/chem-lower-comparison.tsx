/** 下册对照类：金属与酸（含氢气木条检验）、两种酸的相似性质、两种碱与 CO₂。 */
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { Flame, GasBubbles, Liquid, Pile } from './chemical-parts';
import { clamp, useOptIndex, useRig, type RigIO } from './io';
import { IoLabel } from './parts';

const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1)).getHexString();
const CLEAR = '#cfe8ea', GREEN = '#b7dcb0', YELLOW = '#d9b44a';
const RATE: Record<string, number> = { 镁: .9, 铝: .6, 锌: .55, 铁: .25, 铜: 0 };

function Show({ when, children }: { when: (io: RigIO) => boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useRig(io => { if (ref.current) ref.current.visible = when(io); });
  return <group ref={ref} visible={false}>{children}</group>;
}

/** 试管里的金属样品（镁条 / 锌粒 / 铁钉 / 铜片 / 铝片），x 为试管中心。 */
function MetalPiece({ metal, x }: { metal: string; x: number }) {
  if (metal === '镁') return <Box p={[x, .22, 0]} s={[.05, .36, .02]} m={MAT.steel} rot={[0, 0, .15]} />;
  if (metal === '铝') return <Box p={[x, .15, 0]} s={[.2, .22, .02]} m={MAT.steel} rot={[0, 0, -.12]} />;
  if (metal === '锌') return <Pile p={[x, .06, 0]} r={.12} h={.1} color="#8b8f94" />;
  if (metal === '铁') return <Rod a={[x - .08, .08, 0]} b={[x + .06, .45, 0]} r={.025} m={MAT.darkSteel} />;
  return <Box p={[x, .15, 0]} s={[.2, .22, .02]} m={MAT.copper} rot={[0, 0, .1]} />;
}

/** 一支盛酸试管：液体在 acidAt 秒后升起，气泡强度由 rate 给出。 */
function AcidTube({ x, metal, rate, shown, color }: { x: number; metal: string; rate: (io: RigIO) => number; shown: (io: RigIO) => number; color: (io: RigIO) => string }) {
  return <group>
    <Vessel kind="tube" p={[x, 0, 0]} r={.25} h={1.2} />
    <MetalPiece metal={metal} x={x} />
    <Liquid p={[x, .03, 0]} r={.23} level={io => .55 * shown(io)} color={color} opacity={.55} />
    <GasBubbles p={[x, .2, 0]} count={6} height={.6} spread={.1} when={io => rate(io) > 0} rate={io => .3 + rate(io)} />
    <Label text={metal} p={[x, -.17, .38]} size={.15} />
  </group>;
}

/** 实验 8-3：镁、锌、铁、铜分别与稀盐酸 / 稀硫酸反应，并用燃着的木条检验气体。 */
export function MetalsAcidHydrogenRig({ exp }: { exp: Experiment }) {
  const metals = ['镁', '锌', '铁', '铜'];
  const xs = [-1.5, -.5, .5, 1.5];
  const splint = useRef<THREE.Group>(null);
  const idx = (io: RigIO) => clamp(io.idx('metal', 0), 0, 3);
  const added = (io: RigIO) => io.n('add') > 0;
  const level = (io: RigIO) => added(io) ? clamp(io.since('add') / 1.2, 0, 1) : 0;
  useRig(io => {
    const g = splint.current;
    if (!g) return;
    const test = io.n('collect') > 0 && added(io);
    const tx = test ? xs[idx(io)] : 2.1, ty = test ? 1.5 : 1.9;
    g.position.set(io.damp('splintX', tx, 5), io.damp('splintY', ty, 5), .05);
    g.rotation.z = io.damp('splintRot', test ? 0 : -.5, 5);
  });
  return <group>
    <Label text={exp.title} p={[0, 3.1, .3]} size={.2} />
    <Box p={[0, -.05, 0]} s={[4.0, .08, .9]} m={MAT.wood} />
    {metals.map((m, i) => <AcidTube key={m} x={xs[i]} metal={m} shown={level}
      rate={io => added(io) ? io.s('bubbles' + ['Mg', 'Zn', 'Fe', 'Cu'][i], 0) : 0}
      color={io => m === '铁' && level(io) >= 1 ? mix(CLEAR, GREEN, clamp((io.since('add') - 1.2) / 3, 0, 1)) : CLEAR} />)}
    {/* 当前选中的金属 */}
    {xs.map((x, i) => <SelectMark key={x} x={x} i={i} idx={idx} />)}
    {/* 燃着的木条：待命时在右侧，检验时移到所选试管口 */}
    <group ref={splint} position={[2.1, 1.9, .05]}>
      <Rod a={[0, 0, 0]} b={[0, .8, 0]} r={.022} m={MAT.wood} />
      <Flame p={[0, -.02, 0]} lit={() => true} kind="candle" scale={.75} color={io => io.sb('gasBurns', false) && io.n('collect') > 0 ? '#7caee5' : '#ff9a43'} />
    </group>
    <IoLabel get={io => `${io.opt('acid') || '稀酸'}：先放金属，再加入 5 mL 稀酸`} p={[0, 2.65, .3]} size={.16} />
    <IoLabel get={io => {
      if (!added(io)) return '点击加入试剂：把稀酸加入四支试管';
      const m = metals[idx(io)];
      if (io.n('collect') > 0) return io.sb('gasBurns', false) ? `木条放在${m}试管口：气体被点燃（淡蓝色火焰）→ 氢气，可燃` : `${m}无气体：管口木条仍正常燃烧`;
      return `气泡：镁 > 锌 > 铁，铜无气泡；点击“收集气体”用燃着的木条检验${m}试管`;
    }} p={[0, -.4, 1.0]} size={.15} />
    <IoLabel get={io => io.ss('formula', '')} p={[0, -.75, 1.0]} size={.15} />
  </group>;
}

function SelectMark({ x, i, idx }: { x: number; i: number; idx: (io: RigIO) => number }) {
  const ref = useRef<THREE.Mesh>(null);
  useRig(io => { if (ref.current) ref.current.visible = idx(io) === i; });
  return <mesh ref={ref} position={[x, 1.4, 0]} rotation={[Math.PI, 0, 0]} visible={false}><coneGeometry args={[.1, .2, 4]} /><meshBasicMaterial color="#d98a1f" /></mesh>;
}

function Well({ p, color, show }: { p: V3; color: (io: RigIO) => string; show: (io: RigIO) => boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useRig(io => { const m = ref.current; if (!m) return; m.visible = show(io); (m.material as THREE.MeshBasicMaterial).color.set(color(io)); });
  return <group position={p}>
    <Cyl r={.26} h={.04} m={MAT.white} />
    <mesh ref={ref} position={[0, .045, 0]} visible={false}><cylinderGeometry args={[.2, .2, .03, 20]} /><meshBasicMaterial color={CLEAR} /></mesh>
  </group>;
}

/** 点滴板：行 = 溶液，列 = 指示剂。颜色来自模型状态；加入后石蕊先出现再显色。 */
function DotPlate({ rows, cols, colorOf, started }: { rows: string[]; cols: string[]; colorOf: (io: RigIO, r: number, c: number) => string; started: (io: RigIO) => boolean }) {
  return <group>
    <Box p={[0, .0, 0]} s={[2.6, .06, 1.7]} m={MAT.white} />
    {rows.map((r, ri) => <Label key={r} text={r} p={[-1.55, .35, (ri - .5) * .85]} size={.15} />)}
    {cols.map((c, ci) => <Label key={c} text={c} p={[(ci - .5) * 1.1, .35, -.85]} size={.15} />)}
    {rows.map((_, ri) => cols.map((__, ci) => <Well key={ri + '-' + ci} p={[(ci - .5) * 1.1, .03, (ri - .5) * .85]} show={started} color={io => colorOf(io, ri, ci)} />))}
  </group>;
}
const INDICATOR_COLOR: Record<string, string> = { red: '#d84e45', blue: '#438ac2', pink: '#e86c9c', purple: '#9560ad', colorless: '#e9f3f3' };
const dyed = (io: RigIO, key: string) => { const t = io.since('add'); return t < 0 ? '#e9f3f3' : mix('#e9f3f3', INDICATOR_COLOR[io.ss(key, 'colorless')] ?? '#e9f3f3', (t - .4) / .8); };

/** 实验 10-6：稀盐酸、稀硫酸的指示剂对照 / 生锈铁钉分组 / 金属反应回忆。 */
export function AcidComparisonRig({ exp }: { exp: Experiment }) {
  const mode = useOptIndex('test', 0);
  const added = (io: RigIO) => io.n('add') > 0;
  const prog = (io: RigIO) => added(io) ? clamp(io.since('add') / 4, 0, 1) : 0;
  const acids = ['稀盐酸', '稀硫酸'];
  return <group>
    <Label text={exp.title} p={[0, 3.1, .3]} size={.2} />
    {mode === 0 && <group>
      <group position={[0, .1, 0]}>
        <DotPlate rows={acids} cols={['紫色石蕊', '无色酚酞']} started={added}
          colorOf={(io, r, c) => dyed(io, c === 0 ? (r === 0 ? 'litmusHCl' : 'litmusH2SO4') : (r === 0 ? 'phenolphthaleinHCl' : 'phenolphthaleinH2SO4'))} />
      </group>
      <IoLabel get={io => added(io) ? '两种酸都使石蕊变红、酚酞保持无色' : '点击加入：在点滴板上分别滴加两种酸和指示剂'} p={[0, 1.5, .5]} size={.16} />
    </group>}
    {mode === 1 && <group>
      {acids.map((a, i) => {
        const x = i ? 1 : -1;
        return <group key={a}>
          <Vessel kind="tube" p={[x, 0, 0]} r={.3} h={1.3} />
          <Liquid p={[x, .03, 0]} r={.27} level={() => .8} color={io => mix(CLEAR, YELLOW, clamp((prog(io) - .2) / .8, 0, 1))} opacity={.6} />
          <NailInTube x={x} prog={prog} />
          <GasBubbles p={[x, .15, 0]} count={6} height={.7} spread={.1} when={io => io.sb('soakedLong', false)} rate={() => .5} />
          <Label text={a} p={[x, -.2, .45]} size={.15} />
        </group>;
      })}
      <IoLabel get={io => io.sb('soakedLong', false) ? '继续浸泡：铁锈除尽后铁也反应冒气泡 → 除锈不能久泡' : added(io) ? '铁锈溶解，溶液变黄（Fe³⁺），钉变光亮；两种酸现象相似' : '生锈铁钉分别放入稀盐酸和稀硫酸，点击加入'} p={[0, 1.75, .4]} size={.15} />
    </group>}
    {mode === 2 && <group>
      {[0, 1].map(ai => ['镁', '锌', '铁'].map((m, mi) => {
        const x = -1.95 + ai * 2.4 + mi * .72;
        return <group key={ai + m} scale={.78} position={[x, 0, 0]}>
          <Vessel kind="tube" p={[0, 0, 0]} r={.22} h={1.1} />
          <MetalPiece metal={m} x={0} />
          <Liquid p={[0, .03, 0]} r={.2} level={io => added(io) ? .5 : 0} color={io => m === '铁' && prog(io) > .6 ? mix(CLEAR, GREEN, .8) : CLEAR} opacity={.55} />
          <GasBubbles p={[0, .2, 0]} count={5} height={.5} spread={.08} when={io => io.sb('metalBubbles', false)} rate={() => .3 + RATE[m]} />
          <Label text={m} p={[0, -.18, .35]} size={.14} />
        </group>;
      }))}
      <Label text="稀盐酸" p={[-1.23, 1.05, .3]} size={.16} />
      <Label text="稀硫酸" p={[1.17, 1.05, .3]} size={.16} />
      <IoLabel get={io => added(io) ? '镁、锌、铁与两种酸都放出 H₂（置换反应）；铁盐溶液浅绿色' : '回忆第八单元：加入稀酸，比较镁、锌、铁'} p={[0, 1.75, .4]} size={.15} />
    </group>}
    <IoLabel get={io => mode === 1 && added(io) ? 'Fe₂O₃ + 6HCl → 2FeCl₃ + 3H₂O；Fe₂O₃ + 3H₂SO₄ → Fe₂(SO₄)₃ + 3H₂O' : ''} p={[0, -.5, 1.0]} size={.14} />
  </group>;
}

/** 铁钉：表面铁锈随 prog 溶解，颜色由褐红变为光亮。 */
function NailInTube({ x, prog }: { x: number; prog: (io: RigIO) => number }) {
  const ref = useRef<THREE.Mesh>(null);
  useRig(io => { if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).color.set(mix('#9c4a2a', '#b4b7bc', clamp(prog(io) * 1.3, 0, 1))); });
  return <mesh ref={ref} position={[x, .55, 0]} rotation={[0, 0, .12]}><cylinderGeometry args={[.05, .05, .9, 10]} /><meshStandardMaterial color="#9c4a2a" roughness={.9} /></mesh>;
}

/** 探究 10-8：氢氧化钠、氢氧化钙溶液与指示剂；二氧化碳通入两种碱溶液。 */
export function BaseComparisonRig({ exp }: { exp: Experiment }) {
  const mode = useOptIndex('test', 0);
  const added = (io: RigIO) => io.n('add') > 0;
  const bases = ['氢氧化钠', '氢氧化钙'];
  const milky = (io: RigIO) => added(io) ? clamp((io.since('add') - 1) / 2.5, 0, 1) : 0;
  return <group>
    <Label text={exp.title} p={[0, 3.1, .3]} size={.2} />
    {mode === 0 && <group>
      <group position={[0, .1, 0]}>
        <DotPlate rows={bases} cols={['紫色石蕊', '无色酚酞']} started={added}
          colorOf={(io, r, c) => dyed(io, c === 0 ? (r === 0 ? 'litmusNaOH' : 'litmusCaOH') : (r === 0 ? 'phenolphthaleinNaOH' : 'phenolphthaleinCaOH'))} />
      </group>
      <IoLabel get={io => added(io) ? '两种碱溶液都使石蕊变蓝、酚酞变红' : '点击加入：分别向两种碱溶液滴加指示剂'} p={[0, 1.5, .5]} size={.16} />
    </group>}
    {mode === 1 && <group>
      <Vessel kind="flask" p={[-1.7, 0, 0]} r={.5} h={1.0} level={.3} liquid={CLEAR} />
      <Label text="CO₂" p={[-1.7, 1.25, .2]} size={.16} />
      <Tube pts={[[-1.7, 1.0, 0], [-1.7, 1.7, 0], [.6, 1.7, 0]] as V3[]} r={.035} m={MAT.glass} />
      {bases.map((b, i) => {
        const x = i ? 1.6 : .6;
        return <group key={b}>
          <Tube pts={[[x, 1.7, 0], [x, .35, 0]] as V3[]} r={.035} m={MAT.glass} />
          <Vessel kind="tube" p={[x, 0, 0]} r={.38} h={1.4} />
          <Liquid p={[x, .03, 0]} r={.35} level={() => .75} color={io => i ? mix(CLEAR, '#eee9d8', milky(io)) : CLEAR} opacity={.6} />
          <GasBubbles p={[x, .3, 0]} count={6} height={.6} spread={.12} when={added} rate={() => .4} />
          <Label text={b + '溶液'} p={[x, -.2, .55]} size={.15} />
        </group>;
      })}
      <Tube pts={[[.6, 1.7, 0], [1.6, 1.7, 0]] as V3[]} r={.035} m={MAT.glass} />
      <IoLabel get={io => added(io) ? '石灰水变浑浊（CaCO₃↓）；NaOH 无明显现象，但反应生成 Na₂CO₃' : '点击加入：分别通入少量 CO₂'} p={[0, 2.35, .4]} size={.15} />
      <IoLabel get={io => `当前读数：${io.opt('base')}溶液`} p={[0, -.5, 1.0]} size={.15} />
    </group>}
  </group>;
}

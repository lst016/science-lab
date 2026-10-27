/** 上册装置设计类：CO₂ 制取装置、净水器、简易供氧器。设计页只表达气路/水路和结构，不产生真实气体。 */
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { AlcoholLamp, Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { Flame, GasBubbles, Liquid, Pile } from './chemical-parts';
import { clamp, useOptIndex, useRig, type RigIO } from './io';
import { IoLabel } from './parts';

function Show({ when, children }: { when: (io: RigIO) => boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useRig(io => { if (ref.current) ref.current.visible = when(io); });
  return <group ref={ref} visible={false}>{children}</group>;
}

/** 沿折线移动的示意气流点；when 为假时隐藏。 */
function PathDots({ pts, when, color = '#6f9cc0', n = 7, speed = .22 }: { pts: V3[]; when: (io: RigIO) => boolean; color?: string; n?: number; speed?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1], q[2] - pts[i][2]));
  const total = lens.reduce((a, b) => a + b, 0);
  useRig(io => {
    const on = when(io);
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = on;
      let d = (((io.t * speed + i / n) % 1) * total), k = 0;
      while (k < lens.length - 1 && d > lens[k]) { d -= lens[k]; k++; }
      const f = clamp(d / (lens[k] || 1), 0, 1), a = pts[k], b = pts[k + 1];
      m.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    });
  });
  return <group>{Array.from({ length: n }, (_, i) => <mesh key={i} ref={m => { refs.current[i] = m; }} visible={false}><sphereGeometry args={[.06, 10, 8]} /><meshBasicMaterial color={color} /></mesh>)}</group>;
}

/** 底面在 p、半径 r 的半透明圆柱；get 返回 0..1 的充满比例。from=top 表示贴着顶端向下伸长。 */
function Column({ p, r, h, get, color, opacity = .55, from = 'bottom' }: { p: V3; r: number; h: number; get: (io: RigIO) => number; color: string; opacity?: number; from?: 'bottom' | 'top' }) {
  const ref = useRef<THREE.Group>(null);
  useRig(io => {
    const g = ref.current;
    if (!g) return;
    const f = clamp(get(io), 0, 1);
    g.visible = f > .01;
    g.scale.set(r, Math.max(.001, f * h), r);
    g.position.set(p[0], p[1] + (from === 'top' ? h - f * h : 0), p[2]);
  });
  return <group ref={ref} position={p} visible={false}><mesh position={[0, .5, 0]} renderOrder={1}><cylinderGeometry args={[1, 1, 1, 24]} /><meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} /></mesh></group>;
}

const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1)).getHexString();

/** 实验 6-38：按收集方法与是否加热切换实际装置几何，并指出错误方案。 */
export function Co2ApparatusDesignRig({ exp }: { exp: Experiment }) {
  const water = (io: RigIO) => io.opt('collection').includes('排水');
  const heated = (io: RigIO) => io.opt('heating') === '加热';
  const airPts: V3[] = [[-1.5, 2.1, 0], [-1.5, 2.5, 0], [1.5, 2.5, 0], [1.5, .2, 0]];
  const waterPts: V3[] = [[-1.5, 2.1, 0], [-1.5, 2.5, 0], [.25, 2.5, 0], [.25, .2, 0], [1.4, .2, 0], [1.4, .8, 0]];
  return <group>
    <Label text={exp.title} p={[0, 3.1, .3]} size={.2} />
    {/* 发生装置：锥形瓶 + 单孔塞 + 导管，置于铁圈上 */}
    <Rod a={[-2.05, 0, -.2]} b={[-2.05, 1.55, -.2]} r={.035} m={MAT.steel} />
    <Rod a={[-2.05, .78, -.2]} b={[-1.5, .78, 0]} r={.03} m={MAT.darkSteel} />
    <Box p={[-1.5, .78, 0]} s={[1.0, .035, .85]} m={MAT.darkSteel} />
    <Vessel kind="flask" p={[-1.5, .8, 0]} r={.6} h={1.15} level={.3} liquid="#cfe8ea" />
    <Pile p={[-1.5, .86, 0]} r={.3} h={.1} color="#e6e3d9" />
    <Cyl p={[-1.5, 1.95, 0]} r={.14} h={.18} m={MAT.rubber} />
    <Tube pts={[[-1.5, 1.95, 0], ...airPts.slice(0, 2)] as V3[]} r={.035} m={MAT.glass} />
    <Show when={io => !water(io)}>
      <Tube pts={airPts.slice(1)} r={.035} m={MAT.glass} />
      <Vessel kind="jar" p={[1.5, 0, 0]} r={.5} h={1.35} />
      <Column p={[1.5, .03, 0]} r={.46} h={1.28} get={io => io.s('schematicFill', 0)} color="#8fb0c8" />
      <Label text="向上排空气法（瓶口向上，导管伸到瓶底）" p={[1.35, -.22, .8]} size={.14} />
    </Show>
    <Show when={water}>
      <Tube pts={waterPts.slice(1)} r={.035} m={MAT.glass} />
      <Vessel kind="beaker" p={[1.4, 0, 0]} r={.85} h={.55} level={.7} liquid="#8fd0e4" />
      <group position={[1.4, 1.5, 0]} rotation={[Math.PI, 0, 0]}>
        <Vessel kind="jar" r={.45} h={1.2}>
          <Column p={[0, 0, 0]} r={.41} h={1.1} get={io => 1 - io.s('schematicFill', 0)} color="#8fd0e4" opacity={.4} from="top" />
        </Vessel>
      </group>
      <Label text="排水法（倒置集气瓶）" p={[1.4, -.22, .9]} size={.14} />
    </Show>
    {/* 加热：只有选择加热时才出现酒精灯 */}
    <Show when={heated}>
      <AlcoholLamp p={[-1.5, 0, 0]} flame={0} />
      <Flame p={[-1.5, .7, 0]} lit={io => io.sb('connected', false)} scale={.9} />
    </Show>
    <PathDots pts={airPts} when={io => io.sb('connected', false) && !water(io)} />
    <PathDots pts={waterPts} when={io => io.sb('connected', false) && water(io)} />
    <Label text="石灰石 + 稀盐酸" p={[-1.5, .5, .75]} size={.14} />
    <IoLabel get={io => io.sb('connected', false) ? '示意气流（不产生真实气体）' : '先选择收集方法和是否加热，再点击连接装置'} p={[0, 2.85, .3]} size={.15} />
    <IoLabel get={io => io.sb('connected', false) && io.sb('schemeCorrect', false) ? '✓ 方案合理：常温发生 + 向上排空气' : ''} p={[0, -.55, 1.0]} size={.17} color="#1f6b2c" />
    <IoLabel get={io => io.sb('connected', false) && !io.sb('schemeCorrect', false) ? '✗ ' + io.ss('wrongReasons', '') : ''} p={[0, -.55, 1.0]} size={.17} color="#a3261d" />
  </group>;
}

/** 跨学科实践 3：分层滤料（砂石 / 活性炭 / 滤纸），含过滤前后对比杯。 */
export function WaterFilterDesignRig({ exp }: { exp: Experiment }) {
  const layered = useOptIndex('filter', 0) === 1;
  const B = .9;
  const prog = (io: RigIO) => io.sb('filtered', false) ? clamp(io.since('add') / 4, 0, 1) : 0;
  const outColor = (io: RigIO) => prog(io) > 0 ? mix('#d1c9a8', io.ss('outputColor', 'cloudy') === 'clear' ? '#dff2f3' : '#d5d1b2', prog(io)) : '#d1c9a8';
  const src = useRef<THREE.Group>(null);
  useRig(io => { if (src.current) src.current.rotation.z = io.damp('filterPour', prog(io) > 0 && prog(io) < 1 ? -.7 : 0, 5); });
  return <group>
    <Label text={exp.title} p={[0, 3.2, .3]} size={.2} />
    {/* 水样放在支架托盘上，倾倒入过滤瓶 */}
    <Cyl p={[-1.2, 1.05, 0]} r={.08} h={2.1} m={MAT.steel} />
    <Box p={[-1.2, 2.13, 0]} s={[.9, .05, .9]} m={MAT.darkSteel} />
    <group ref={src} position={[-1.2, 2.16, 0]}>
      <Vessel kind="beaker" r={.5} h={.7} />
      <Liquid p={[0, .03, 0]} r={.47} level={io => .45 * (1 - .6 * prog(io))} color="#d1c9a8" opacity={.85} />
    </group>
    <Label text="浑浊水样" p={[-1.2, 2.95, .4]} size={.14} />
    {/* 过滤瓶：自上而下 砂石 → 活性炭 → 滤纸 */}
    <Rod a={[1.0, 0, -.3]} b={[1.0, 2.2, -.3]} r={.035} m={MAT.steel} />
    <Rod a={[1.0, 1.55, -.3]} b={[.2, 1.55, 0]} r={.03} m={MAT.darkSteel} />
    <Vessel kind="cylinder" p={[0, B, 0]} r={.52} h={1.3} />
    <Tube pts={[[0, B, 0], [0, .72, 0]] as V3[]} r={.04} m={MAT.glass} />
    <mesh position={[0, B + .12, 0]}><cylinderGeometry args={[.5, .5, .03, 24]} /><meshStandardMaterial color="#f4f2ea" roughness={.9} /></mesh>
    {layered && <>
      <mesh position={[0, B + .36, 0]}><cylinderGeometry args={[.5, .5, .4, 24]} /><meshStandardMaterial color="#2b2b2e" roughness={.95} /></mesh>
      <mesh position={[0, B + .76, 0]}><cylinderGeometry args={[.5, .5, .4, 24]} /><meshStandardMaterial color="#cdb88a" roughness={1} /></mesh>
      {[[-.25, .0, .15], [.15, -.01, -.2], [.3, .0, .2], [-.05, .0, 0]].map((q, i) => <mesh key={i} position={[q[0], B + .98 + q[1], q[2]]}><dodecahedronGeometry args={[.07, 0]} /><meshStandardMaterial color="#8d8a82" roughness={.95} /></mesh>)}
      <Label text="砂石" p={[-.95, B + .76, .35]} size={.14} />
      <Label text="活性炭" p={[-.95, B + .36, .35]} size={.14} />
    </>}
    <Label text="滤纸" p={[-.95, B + .12, .35]} size={.14} />
    <Liquid p={[0, layered ? B + .98 : B + .15, 0]} r={.45} level={io => (layered ? .3 : .8) * (1 - .55 * prog(io))} color="#d1c9a8" opacity={.7} />
    {/* 接水杯：过滤后 */}
    <Vessel kind="beaker" r={.55} h={.7} />
    <Liquid p={[0, .03, 0]} r={.52} level={io => .45 * prog(io)} color={outColor} opacity={.8} />
    <GasBubbles p={[0, B, 0]} count={3} height={-.4} spread={.03} color="#cfe3e6" when={io => prog(io) > 0 && prog(io) < 1} rate={() => .4} />
    {/* 前后对比 */}
    <Vessel kind="tube" p={[1.55, 0, 0]} r={.28} h={1.1} level={.5} liquid="#d1c9a8" liquidOpacity={.85} />
    <Vessel kind="tube" p={[2.1, 0, 0]} r={.28} h={1.1} />
    <Liquid p={[2.1, .03, 0]} r={.26} level={io => prog(io) >= 1 ? .5 : 0} color={outColor} opacity={.8} />
    <Label text="过滤前" p={[1.55, 1.3, .3]} size={.14} />
    <Label text="过滤后" p={[2.1, 1.3, .3]} size={.14} />
    <IoLabel get={io => io.sb('filtered', false) ? (layered ? '砂石截留大颗粒，活性炭吸附色素异味，滤纸截留细小固体' : '仅滤纸：截留部分悬浮物，颜色气味基本不变') : layered ? '分层滤料：自上而下为砂石、活性炭、滤纸' : '仅滤纸：点击加入让水样通过'} p={[0, -.2, 1.0]} size={.15} />
    <IoLabel get={() => '外观变清 ≠ 可直接饮用'} p={[0, -.5, 1.0]} size={.16} color="#a3261d" />
  </group>;
}

/** 跨学科实践 4：按方案 / 装配 / 测试显示反应仓 → 加湿仓 → 模型气袋的结构与气路；只是结构模型。 */
export function OxygenSupplyDesignRig({ exp }: { exp: Experiment }) {
  const stage = (io: RigIO) => io.s('stageIndex', 0);
  const bag = useRef<THREE.Mesh>(null);
  useRig(io => { if (bag.current) { const f = io.damp('bagFill', io.s('modelBagFill', 0), 2.2); bag.current.scale.set(.42 + f * .45, .3 + f * .42, .22 + f * .2); } });
  const path1: V3[] = [[-1.5, 1.3, 0], [-1.5, 1.75, 0], [-.15, 1.75, 0], [-.15, .3, 0]];
  const path2: V3[] = [[.15, 1.3, 0], [.15, 1.75, 0], [1.2, 1.75, 0], [1.2, .8, 0]];
  return <group>
    <Label text={exp.title} p={[0, 3.1, .3]} size={.2} />
    <Label text="结构模型：不制氧，不供人呼吸" p={[0, 2.8, .3]} size={.17} color="#a3261d" />
    {/* 反应仓 */}
    <Vessel kind="flask" p={[-1.5, 0, 0]} r={.55} h={1.1} level={.3} liquid="#cfe8ea" />
    <Pile p={[-1.5, .06, 0]} r={.2} h={.08} color="#2d2d30" />
    <Cyl p={[-1.5, 1.2, 0]} r={.13} h={.15} m={MAT.rubber} />
    <Label text="① 反应仓" p={[-1.5, -.25, .7]} size={.15} />
    <Label text="过氧化氢（示意）+ 催化剂" p={[-1.5, -.5, .7]} size={.12} />
    {/* 加湿仓 */}
    <Vessel kind="jar" p={[0, 0, 0]} r={.5} h={1.2} level={.5} liquid="#8fd0e4" />
    <Cyl p={[0, 1.22, 0]} r={.46} h={.1} m={MAT.rubber} />
    <Label text="② 过滤加湿仓" p={[0, -.25, .7]} size={.15} />
    <Label text="水：看气泡、润湿气体" p={[0, -.5, .7]} size={.12} />
    {/* 模型气袋 */}
    <mesh ref={bag} position={[1.2, .5, 0]} scale={[.42, .3, .22]}><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color="#e8eef2" transparent opacity={.85} roughness={.5} /></mesh>
    <Label text="③ 模型气袋" p={[1.2, -.25, .7]} size={.15} />
    <Label text="（模型，不装真实氧气）" p={[1.2, -.5, .7]} size={.12} />
    {/* 装配后才有导管与调节阀 */}
    <Show when={io => stage(io) >= 1}>
      <Tube pts={path1} r={.035} m={MAT.glass} />
      <Tube pts={path2} r={.035} m={MAT.glass} />
      <Box p={[-.8, 1.75, 0]} s={[.2, .2, .2]} m={MAT.brass} />
      <Label text="调节阀" p={[-.8, 2.05, .2]} size={.13} />
      <Label text="长进" p={[-.15, 1.0, .3]} size={.12} />
      <Label text="短出" p={[.15, 1.45, .3]} size={.12} />
    </Show>
    <Show when={io => stage(io) === 0}>
      <Label text="设计需求：便携 · 操作简单 · 安全可靠 · 成本较低" p={[0, 2.35, .3]} size={.15} />
    </Show>
    <PathDots pts={path1} when={io => io.sb('pathChecked', false)} />
    <PathDots pts={path2} when={io => io.sb('pathChecked', false)} />
    <GasBubbles p={[-.15, .3, 0]} count={6} height={.7} spread={.12} when={io => io.sb('pathChecked', false)} rate={() => .6} />
    <IoLabel get={io => stage(io) === 0 ? '方案：选定三个部分（尚未连接）' : stage(io) === 1 ? '装配：连接导管，加湿仓“长进短出”' : io.sb('pathChecked', false) ? '测试：示意气流经加湿仓冒泡，进入模型气袋' : '测试：点击“检查气路”'} p={[0, 2.55, .3]} size={.15} />
  </group>;
}

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { clamp, smooth, useRig, type RigIO } from './io';

const COLORS: Record<string, string> = {
  clear: '#b9e5e8', colorless: '#b9e5e8', pink: '#e86c9c', red: '#d84e45', blue: '#438ac2',
  'blue-cloudy': '#438ac2', 'blue-fading': '#73a9c2', 'blue-precipitate': '#4f93cf', black: '#25252b', cloudy: '#b8b9aa',
  'pale-cloudy': '#d5d1b2', 'milky-white': '#eee9d8', milky: '#eee9d8', purple: '#9560ad', 'pale-yellow': '#e1d795',
  brown: '#a66b42', 'copper-red': '#b85b3d', white: '#e9e6dc', 'wet-white': '#ded8c9', 'white-or-blue': '#9fc2dd',
  'plant-acid-red': '#cb514e', gray: '#777873', none: '#b9e5e8', orange: '#e8a24a', yellow: '#e6cf62',
};
export const chemColor = (name: string, fallback = '#b9e5e8') => COLORS[name] ?? (name.startsWith('#') ? name : fallback);

/** 酒精灯是否点燃：优先读模型 heating；没有该字段的加热类活动，以水浴/水温高于室温作为加热依据。 */
export const heatingOn = (io: RigIO) => io.sb('heating', io.o?.state.heating === undefined && io.s('temperature', 0) > 25);

const FLAME_COLOR: Record<string, string> = { orange: '#ff9a43', 'blue-violet': '#6352c8', 'pale-blue': '#7caee5', extinguished: '#888782', 'red-hot': '#ef593c', none: '#ff9a43' };

/** 火焰锥体：p 为火焰底部，随 scale 向上伸缩；lit 可覆盖「是否燃烧」的判定。 */
export function Flame({ p = [0, 0, 0], stateKey = 'flame', kind = 'fire', lit, scale = 1, color }: { p?: V3; stateKey?: string; kind?: 'fire' | 'candle' | 'sulfur' | 'glow'; lit?: (io: RigIO) => boolean; scale?: number | ((io: RigIO) => number); color?: string | ((io: RigIO) => string) }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff9a43', transparent: true, opacity: 0.86 }), []);
  const geo = useMemo(() => {
    const [r, h] = kind === 'candle' ? [0.075, 0.22] : [0.13, 0.42];
    const g = new THREE.ConeGeometry(r, h, 14);
    g.translate(0, h / 2, 0);
    return g;
  }, [kind]);
  useEffect(() => () => { mat.dispose(); geo.dispose(); }, [mat, geo]);
  useRig((io) => {
    const m = ref.current;
    if (!m) return;
    const hydrogen = stateKey === 'safeHydrogenBurning' && io.sb('pure', false) && io.ss('phase', '').includes('燃烧');
    const on = lit ? lit(io) : hydrogen || (stateKey === 'heating' ? heatingOn(io) : io.sb(stateKey, false));
    m.visible = on;
    const flick = 0.9 + Math.sin(io.t * 9 + p[0] * 7) * 0.1;
    const sc = typeof scale === 'number' ? scale : scale(io);
    m.scale.set(sc, on ? sc * flick : 0.001, sc);
    const code = io.ss('flameColor', 'orange');
    const forced = typeof color === 'function' ? color(io) : color;
    mat.color.set(forced ?? (stateKey === 'flame' ? FLAME_COLOR[code] ?? (kind === 'sulfur' ? '#6352c8' : '#ff9a43') : '#ff9a43'));
  });
  return <mesh ref={ref} position={p} visible={false} material={mat} geometry={geo} />;
}

/** 铁丝燃烧的火星：几个小亮点沿抛物线向四周飞散。 */
export function Sparks({ p = [0, 0, 0], when }: { p?: V3; when: (io: RigIO) => boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => {
    const on = when(io);
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = on;
      if (!on) return;
      const phase = (io.t * 1.3 + i / 10) % 1;
      const a = i * 2.399;
      const sp = 0.25 + (i % 4) * 0.1;
      m.position.set(Math.cos(a) * sp * phase * 1.6, phase * 0.5 - phase * phase * 0.7 * (0.5 + (i % 3) * 0.3), Math.sin(a) * sp * phase * 0.9);
      m.scale.setScalar(1 - phase * 0.6);
    });
  });
  return <group position={p}>{Array.from({ length: 10 }, (_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} visible={false}><sphereGeometry args={[0.035, 6, 6]} /><meshBasicMaterial color={i % 2 ? '#fff19a' : '#ffb347'} /></mesh>)}</group>;
}

/** 红热/带火星的亮点（木炭、带火星木条）。keyName 控制是否显示；bright 时更亮。 */
export function Ember({ p, when, bright, size = 0.065 }: { p: V3; when: (io: RigIO) => boolean; bright?: (io: RigIO) => boolean; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useRig((io) => {
    if (!ref.current) return;
    ref.current.visible = when(io);
    (ref.current.material as THREE.MeshBasicMaterial).color.set(bright?.(io) ? '#fff2a0' : '#e8552a');
    ref.current.scale.setScalar(1 + Math.sin(io.t * 7) * 0.08);
  });
  return <mesh ref={ref} position={p} visible={false}><sphereGeometry args={[size, 12, 10]} /><meshBasicMaterial color="#e8552a" /></mesh>;
}

/** 蜡烛：p 为底座中心；height 为蜡柱高度，火焰底部在烛芯顶端。 */
export function Candle({ p, stateKey = 'flame', height = 0.48, lit }: { p: V3; stateKey?: string; height?: number; lit?: (io: RigIO) => boolean }) {
  return <group position={p}><Cyl p={[0, height / 2, 0]} r={0.11} h={height} m={MAT.white} /><Rod a={[0, height, 0]} b={[0, height + 0.07, 0]} r={0.012} m={MAT.black} /><Flame p={[0, height + 0.06, 0]} kind="candle" stateKey={stateKey} lit={lit} /></group>;
}

/** 点火的火柴：按下 ignite 后靠近 to（火柴头位置）停留，再撤离。 */
export function Match({ to, from, id = 'ignite', dur = 2.6 }: { to: V3; from?: V3; id?: string; dur?: number }) {
  const g = useRef<THREE.Group>(null);
  const start: V3 = from ?? [to[0] + 0.9, to[1] + 0.5, to[2] + 0.2];
  useRig((io) => {
    const m = g.current;
    if (!m) return;
    const s = io.since(id);
    const u = s / dur;
    const show = s >= 0 && u < 1;
    m.visible = show;
    if (!show) return;
    const k = u < 0.3 ? smooth(u / 0.3) : u < 0.7 ? 1 : 1 - smooth((u - 0.7) / 0.3);
    m.position.set(start[0] + (to[0] - start[0]) * k, start[1] + (to[1] - start[1]) * k, start[2] + (to[2] - start[2]) * k);
  });
  return <group ref={g} visible={false}>
    <Rod a={[0, 0, 0]} b={[0.34, -0.6, 0]} r={0.016} m={MAT.wood} cast={false} />
    <Ball p={[0, 0, 0]} r={0.04} m={MAT.red} />
    <mesh position={[0, 0.1, 0]}><coneGeometry args={[0.05, 0.16, 10]} /><meshBasicMaterial color="#ffb347" transparent opacity={0.88} /></mesh>
  </group>;
}

/** 上升的烟雾/蒸气团。amount 0..1 控制显隐与浓度。 */
export function Smoke({ p = [0, 0, 0], amount, color = '#f4f1ea', n = 7, rise = 0.9, spread = 0.1, size = 0.085, opacity = 0.5 }: { p?: V3; amount: (io: RigIO) => number; color?: string; n?: number; rise?: number; spread?: number; size?: number; opacity?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }), [color, opacity]);
  useEffect(() => () => mat.dispose(), [mat]);
  useRig((io) => {
    const a = amount(io);
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = a * n > i + 0.01;
      if (!m.visible) return;
      const ph = (io.t * 0.35 + i / n) % 1;
      m.position.set(Math.sin(i * 5.1 + ph * 3) * spread * (0.4 + ph), ph * rise, Math.cos(i * 3.7 + ph * 2) * spread * 0.6);
      m.scale.setScalar(0.5 + ph * 1.4);
    });
  });
  return <group position={p}>{Array.from({ length: n }, (_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} visible={false} material={mat}><sphereGeometry args={[size, 10, 8]} /></mesh>)}</group>;
}

/** 玻璃内壁上的水珠：spots 为珠位，amount 0..1 决定出现的比例。 */
export function Beads({ p = [0, 0, 0], spots, amount, r = 0.032 }: { p?: V3; spots: V3[]; amount: (io: RigIO) => number; r?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => {
    const a = amount(io);
    refs.current.forEach((m, i) => {
      if (!m) return;
      const on = a * spots.length > i + 0.01;
      m.visible = on;
      if (on) m.scale.setScalar(0.7 + ((i * 7) % 5) * 0.15);
    });
  });
  return <group position={p}>{spots.map((s, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={s} visible={false}><sphereGeometry args={[r, 8, 8]} /><meshPhysicalMaterial color="#d8f3fa" transparent opacity={0.85} roughness={0.05} /></mesh>)}</group>;
}

/** 温度计：h 为玻管长度；value 可按需改写显示温度，min/max 为刻度范围。 */
export function DynamicThermo({ p, h = 1.6, fallback = 20, min = 0, max = 100, value }: { p: V3; h?: number; fallback?: number; min?: number; max?: number; value?: (io: RigIO) => number }) {
  const mercury = useRef<THREE.Mesh>(null);
  useRig((io) => {
    if (!mercury.current) return;
    const t = value ? value(io) : io.s('temperature', io.s('temperatureChange', fallback));
    const f = clamp((t - min) / (max - min), 0.08, 0.95);
    mercury.current.scale.y = f * h;
    mercury.current.position.y = 0.13 + mercury.current.scale.y / 2;
  });
  return <group position={p}><Cyl p={[0, h / 2, 0]} r={0.045} h={h} m={MAT.glass} cast={false} /><Ball p={[0, 0.07, 0]} r={0.085} m={MAT.red} /><mesh ref={mercury} position={[0, 0.2, 0]}><cylinderGeometry args={[0.022, 0.022, 1, 10]} /><meshStandardMaterial color="#d23a2a" /></mesh></group>;
}

/** 玻璃器皿中的液体：液位和颜色由 io 决定。level 以世界高度计，p 为液体底部中心。 */
export function Liquid({ p = [0, 0, 0], r, level, color = 'clear', opacity, rot }: { p?: V3; r: number; level: number | ((io: RigIO) => number); color?: string | ((io: RigIO) => string); opacity?: number; rot?: V3 }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b9e5e8', transparent: true, opacity: 0.78, roughness: 0.16, clearcoat: 0.6, depthWrite: false }), []);
  const geo = useMemo(() => { const g = new THREE.CylinderGeometry(1, 1, 1, 28); g.translate(0, 0.5, 0); return g; }, []);
  useEffect(() => () => { mat.dispose(); geo.dispose(); }, [mat, geo]);
  useRig((io) => {
    const m = ref.current;
    if (!m) return;
    const l = typeof level === 'number' ? level : level(io);
    const c = typeof color === 'string' ? color : color(io);
    m.visible = l > 0.004 && c !== 'none';
    m.scale.set(r, Math.max(0.001, l), r);
    mat.color.set(chemColor(c));
    mat.opacity = opacity ?? (c === 'clear' || c === 'colorless' ? 0.36 : 0.8);
  });
  return <mesh ref={ref} position={p} rotation={rot} material={mat} geometry={geo} renderOrder={1} visible={false} scale={[r, 0.001, r]} />;
}

/** 固体/粉末堆（半球压扁）。amount 0..1 缩放；color 可随 io 变化。 */
export function Pile({ p = [0, 0, 0], r = 0.2, h = 0.12, color = '#e9e6dc', amount = 1, rough = true }: { p?: V3; r?: number; h?: number; color?: string | ((io: RigIO) => string); amount?: number | ((io: RigIO) => number); rough?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e6dc', roughness: rough ? 0.9 : 0.4 }), [rough]);
  useEffect(() => () => mat.dispose(), [mat]);
  useRig((io) => {
    const m = ref.current;
    if (!m) return;
    const a = typeof amount === 'number' ? amount : amount(io);
    m.visible = a > 0.02;
    const k = clamp(a, 0, 1.4);
    m.scale.set(Math.max(0.05, k), Math.max(0.05, k) * (h / r), Math.max(0.05, k));
    mat.color.set(typeof color === 'string' ? chemColor(color, color) : chemColor(color(io), '#e9e6dc'));
  });
  return <mesh ref={ref} position={p} material={mat} scale={[1, h / r, 1]}><sphereGeometry args={[r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>;
}

/** 一个液体容器：液面和颜色读模型（沉淀、液体色），水量可由 level 固定。 */
export function ReactiveVessel({ kind = 'beaker', p = [0, 0, 0], r = 0.54, h = 1.35, level = 0.36, liquid = 'clear', solid = false, mode = 'reactive', fixed = false }: { kind?: 'beaker' | 'tube' | 'flask' | 'jar' | 'cylinder' | 'round'; p?: V3; r?: number; h?: number; level?: number; liquid?: string; solid?: boolean; mode?: 'reactive' | 'static'; fixed?: boolean }) {
  const fluid = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b9e5e8', transparent: true, opacity: 0.78, roughness: 0.16, clearcoat: 0.6, depthWrite: false }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const solidRef = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const stateColor = mode === 'reactive' ? io.ss('liquidColor', liquid) : liquid;
    const waterState = io.exp.parameters.some((q) => q.key === 'water') ? io.s('water', -1) : -1;
    const waterMass = io.s('waterMass', -1);
    const amountState = io.s('waterVolume', io.s('volume', waterState));
    const amountParam = io.exp.family === 'acid-base' ? undefined : io.exp.parameters.find((q) => ['waterVolume', 'volume', 'water', 'amount', 'acid'].includes(q.key));
    const parameterLevel = amountParam ? (io.p(amountParam.key, amountParam.default) - amountParam.min) / Math.max(1, amountParam.max - amountParam.min) : -1;
    const normalizedAmount = mode === 'static' || fixed ? level : amountState >= 0 ? amountState / (amountState > 30 ? 100 : 10) : waterMass >= 0 ? waterMass / 100 : parameterLevel >= 0 ? parameterLevel : level;
    const fill = mode === 'static' || fixed ? level : io.s('liquidLevel', io.s('level', normalizedAmount));
    const visible = stateColor !== 'none';
    if (fluid.current) {
      fluid.current.visible = visible;
      const liquidHeight = Math.max(0.025, Math.min(1, fill)) * h * 0.68;
      fluid.current.scale.y = liquidHeight;
      fluid.current.position.y = 0.04 + liquidHeight / 2;
      mat.color.set(chemColor(stateColor));
      mat.opacity = stateColor === 'clear' ? 0.36 : 0.8;
    }
    if (solidRef.current) {
      const pc = mode === 'reactive' ? io.ss('precipitateColor', 'none') : 'none';
      const powder = mode === 'reactive' ? io.s('undissolved', 0) : (solid ? 0.45 : 0);
      solidRef.current.visible = solid && (pc !== 'none' || powder > 0.02);
      const solidColor = pc !== 'none' ? pc : mode === 'reactive' ? io.ss('solidColor', 'white') : 'white';
      (solidRef.current.material as THREE.MeshStandardMaterial).color.set(chemColor(solidColor, '#438ac2'));
      solidRef.current.scale.y = 0.08 + Math.max(powder, io.s('precipitate', 0)) * 0.42;
    }
  });
  return <group position={p}>
    <Vessel kind={kind} r={r} h={h} level={0} />
    <mesh ref={fluid} position={[0, 0.035, 0]} material={mat} renderOrder={1}><cylinderGeometry args={[r * 0.91, r * 0.91, 1, 28]} /></mesh>
    {solid && <mesh ref={solidRef} position={[0, 0.08, 0]}><cylinderGeometry args={[r * 0.82, r * 0.82, 0.22, 24]} /><meshStandardMaterial color="#438ac2" roughness={0.72} /></mesh>}
  </group>;
}

/** 气泡：when 可覆盖「是否冒泡」的判定；rate 为上升速度系数。 */
export function GasBubbles({ p = [0, 0, 0], count = 12, color = '#e7fbff', spread = 0.28, height = 1, when, rate }: { p?: V3; count?: number; color?: string; spread?: number; height?: number; when?: (io: RigIO) => boolean; rate?: (io: RigIO) => number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const bubbleMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.55, roughness: 0.08 }), [color]);
  useEffect(() => () => bubbleMaterial.dispose(), [bubbleMaterial]);
  useRig((io) => {
    const active = when ? when(io) : io.s('bubbles', 0) > 0 || io.s('gasVolume', 0) > 0;
    const speed = rate ? rate(io) : Math.max(0.25, io.s('bubbles', 0.35));
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = active;
      const phase = (io.t * (0.5 + speed) + i / count) % 1;
      m.position.set(Math.sin(i * 17.3) * spread * 0.7, 0.1 + phase * height, Math.cos(i * 11.7) * spread * 0.55);
      const s = 0.45 + phase * 0.9; m.scale.setScalar(s);
    });
  });
  return <group position={p}>{Array.from({ length: count }, (_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} visible={false}>
    <sphereGeometry args={[0.035, 10, 8]} /><primitive object={bubbleMaterial} attach="material" />
  </mesh>)}</group>;
}

export function Stand({ p = [-1.35, 0, -0.7], h = 2.9 }: { p?: V3; h?: number }) {
  return <group position={p}><Box p={[0, 0.08, 0]} s={[0.75, 0.16, 0.62]} m={MAT.darkSteel} /><Cyl p={[-0.13, h / 2, 0]} r={0.035} h={h} m={MAT.steel} /><Box p={[0.15, h * 0.68, 0]} s={[0.55, 0.07, 0.12]} m={MAT.darkSteel} /><Cyl p={[0.15, h * 0.68 - 0.1, 0]} r={0.04} h={0.35} m={MAT.steel} /></group>;
}

/** 胶头滴管：p 为管尖。active 返回 0..1 滴落频率；color 为液滴颜色。 */
export function Dropper({ p = [0, 0, 0], len = 0.75, active, color = '#b9e5e8', fall = 0.5 }: { p?: V3; len?: number; active: (io: RigIO) => number; color?: string | ((io: RigIO) => string); fall?: number }) {
  const drop = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b9e5e8', transparent: true, opacity: 0.9, roughness: 0.05 }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useRig((io) => {
    const m = drop.current;
    if (!m) return;
    const a = active(io);
    m.visible = a > 0.01;
    mat.color.set(chemColor(typeof color === 'string' ? color : color(io), '#b9e5e8'));
    if (a > 0.01) {
      const ph = (io.t * (0.7 + a)) % 1;
      m.position.y = -0.04 - ph * ph * fall;
      m.scale.setScalar(0.6 + 0.4 * (1 - ph));
    }
  });
  return <group position={p}>
    <Cyl p={[0, len / 2, 0]} r={0.03} rt={0.034} h={len} m={MAT.glass} cast={false} />
    <Cyl p={[0, len + 0.12, 0]} r={0.05} h={0.2} m={MAT.rubber} />
    <Ball p={[0, len + 0.3, 0]} r={0.1} m={MAT.rubber} />
    <mesh ref={drop} position={[0, -0.05, 0]} material={mat} visible={false}><sphereGeometry args={[0.04, 10, 8]} /></mesh>
  </group>;
}

export function DrainCollection() {
  return <group><ReactiveVessel kind="beaker" p={[0.25, 0, 0.2]} r={0.52} h={1.05} level={0.52} liquid="#a8d9e8" mode="static" /><Vessel kind="jar" p={[1.4, 1.2, -0.1]} r={0.4} h={1.25} level={0.22} liquid="#b9e5e8" rot={[Math.PI, 0, 0]} /><Tube pts={[[0.05, 1.0, 0.2], [0.3, 1.22, 0.1], [0.95, 1.22, 0], [1.12, 1.15, -0.1]]} r={0.035} m={MAT.glass} /></group>;
}

export function DroppingSetup({ color = 'clear' }: { color?: string }) {
  return <group><Vessel kind="tube" p={[-0.7, 0.1, 0.15]} r={0.3} h={1.15} level={0.3} liquid={chemColor(color)} /><Cyl p={[-0.7, 1.36, 0.15]} r={0.045} h={0.44} m={MAT.rubber} /><Ball p={[-0.7, 1.61, 0.15]} r={0.1} m={MAT.rubber} /><Tube pts={[[-0.7, 1.16, 0.15], [-0.7, 0.96, 0.15]]} r={0.018} m={MAT.glass} /></group>;
}

export function MetalSamples({ p = [0, 0, 0], copper = false }: { p?: V3; copper?: boolean }) {
  return <group position={p}><Cyl p={[-0.35, 0.17, 0]} r={0.06} h={0.62} m={MAT.steel} rot={[0, 0, Math.PI / 2]} /><Cyl p={[0.35, 0.17, 0]} r={0.06} h={0.62} m={copper ? MAT.copper : MAT.brass} rot={[0, 0, Math.PI / 2]} /><Box p={[0, 0.04, 0]} s={[1.35, 0.08, 0.48]} m={MAT.wood} /></group>;
}

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, Label, MAT, Rod, Tube, Vessel, liquidMat, type V3 } from '../kit';
import { fmt } from '../../sim/core';
import { Flame, GasBubbles, Liquid, Match, Pile, Smoke, Dropper } from './chemical-parts';
import { Mv } from './mechanical-parts';
import { IoLabel, Poly } from './parts';
import { clamp, mapRange, smooth, useOptIndex, useRig, type RigIO } from './io';
import type { ShRigMap } from './sh-types';

/** 读取模型 state 中的数组（温度、氧气浓度曲线）。 */
const arr = (io: RigIO, key: string): number[] => {
  const v = io.o?.state[key];
  return Array.isArray(v) ? v : [];
};
/** 动作按下后的短暂动画包络：0 → 1 → 0。 */
const pulse = (io: RigIO, id: string, dur = 1.6) => {
  const s = io.since(id);
  return s >= 0 && s < dur ? Math.sin((s / dur) * Math.PI) : 0;
};
/** 操作用的滴管/试剂：动作前一直显示，动作完成后收起。 */
const before = (io: RigIO, id: string, dur: number) => io.n(id) === 0 || (io.since(id) >= 0 && io.since(id) < dur);

const DROP = liquidMat('#d6eef5', 0.72);
const WATER_DROP = liquidMat('#9fd0e6', 0.8);
const PAPER_WET = new THREE.MeshStandardMaterial({ color: '#c3d3dc', roughness: 0.95 });
const PAPER = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.95 });
const MG = new THREE.MeshStandardMaterial({ color: '#d4d6d8', roughness: 0.35, metalness: 0.7 });
const SCREEN = new THREE.MeshStandardMaterial({ color: '#1d2a2c', roughness: 0.5 });
const AXIS = new THREE.MeshBasicMaterial({ color: '#d9e6e2' });

/** 颜色随 io 变化的试纸条。 */
function Strip({ p, s, rot, color }: { p: V3; s: V3; rot?: V3; color: (io: RigIO) => string }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a78c2', roughness: 0.9 }), []);
  useRig((io) => { mat.color.set(color(io)); });
  return <mesh position={p} rotation={rot} material={mat}><boxGeometry args={s} /></mesh>;
}

/** 屏幕上的曲线：values 为等间隔采样点，只画到 upto（0..1）为止。 */
function Curve({ x0, x1, y0, y1, lo, hi, values, upto, color, visible }: { x0: number; x1: number; y0: number; y1: number; lo: number; hi: number; values: (io: RigIO) => number[]; upto: (io: RigIO) => number; color: string; visible?: (io: RigIO) => boolean }) {
  const n = 60;
  return <Poly n={n} r={0.016} color={color} visible={visible} fill={(pts, io) => {
    const v = values(io);
    const last = Math.max(0, Math.min(n, Math.floor(clamp(upto(io), 0, 1) * n)));
    for (let i = 0; i <= n; i++) {
      const j = Math.min(i, last);
      const val = v.length ? v[Math.min(v.length - 1, Math.round((j / n) * (v.length - 1)))] : lo;
      pts[i * 3] = x0 + ((x1 - x0) * j) / n;
      pts[i * 3 + 1] = mapRange(val, lo, hi, y0, y1);
      pts[i * 3 + 2] = -0.24;
    }
  }} />;
}

/** 数据采集器 + 显示屏（坐标轴在屏幕前表面）。 */
function Screen({ x = 1.45, title }: { x?: number; title: string }) {
  return <group>
    <Box p={[x, 0.45, -0.32]} s={[0.12, 0.9, 0.1]} m={MAT.darkSteel} />
    <Box p={[x, 0.03, -0.32]} s={[0.7, 0.06, 0.4]} m={MAT.darkSteel} />
    <Box p={[x, 1.6, -0.32]} s={[1.85, 1.3, 0.08]} m={SCREEN} />
    <mesh position={[x, 1.05, -0.26]} material={AXIS}><boxGeometry args={[1.62, 0.012, 0.01]} /></mesh>
    <mesh position={[x - 0.8, 1.6, -0.26]} material={AXIS}><boxGeometry args={[0.012, 1.1, 0.01]} /></mesh>
    <Label text={title} p={[x, 2.42, -0.3]} size={0.2} />
  </group>;
}

/* ---------- p23 从溶液中提取溶质（铜片上蒸发） ---------- */
const SPOTS: V3[] = Array.from({ length: 12 }, (_, i) => {
  const a = i * 2.399, r = 0.04 + (i % 3) * 0.04;
  return [Math.cos(a) * r, 0.015, Math.sin(a) * r];
});
function Crystals({ p, stateKey, needle = false }: { p: V3; stateKey: string; needle?: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useRig((io) => {
    const a = io.sb('placed', false) ? io.s(stateKey, 0) : 0;
    refs.current.forEach((m, i) => { if (m) m.visible = a > 0.002 && clamp(a * 2.2, 0.1, 1) * SPOTS.length > i; });
  });
  return <group position={p}>{SPOTS.map((s, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={s} rotation={[0, i * 0.9, 0]} visible={false} material={MAT.white}>
    {needle ? <boxGeometry args={[0.014, 0.014, 0.1]} /> : <boxGeometry args={[0.04, 0.04, 0.04]} />}
  </mesh>)}</group>;
}
function Drop({ p }: { p: V3 }) {
  return <Mv p={p} upd={(g, io) => {
    const on = io.sb('placed', false);
    g.visible = on;
    const w = io.damp('drop' + p[0], on ? io.s('water', 1) : 1, 4);
    g.scale.set(0.55 + 0.45 * w, 0.12 + 0.88 * w, 0.55 + 0.45 * w);
  }}><mesh material={DROP} scale={[1, 0.4, 1]}><sphereGeometry args={[0.16, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh></Mv>;
}
function EvaporatePlate() {
  const plateY = 1.345;
  return <group>
    <Vessel kind="beaker" p={[0, 0, 0]} r={0.72} h={1.3} level={0.8} liquid="#cfe7ef" liquidOpacity={0.5} />
    <GasBubbles p={[0, 0.05, 0.1]} spread={0.8} height={0.85} count={12} when={(io) => io.s('steam', 0) > 0.7} rate={() => 0.6} />
    <Smoke p={[0, 1.33, 0.6]} amount={(io) => io.s('steam', 0)} n={6} rise={0.7} spread={0.15} />
    <Box p={[0, plateY, 0]} s={[1.75, 0.035, 0.9]} m={MAT.copper} />
    <Drop p={[-0.45, plateY + 0.02, 0.1]} />
    <Drop p={[0.45, plateY + 0.02, 0.1]} />
    <Crystals p={[-0.45, plateY + 0.02, 0.1]} stateKey="naclCrystal" />
    <Crystals p={[0.45, plateY + 0.02, 0.1]} stateKey="kno3Crystal" needle />
    <Mv upd={(g, io) => { g.visible = before(io, 'add', 2.4); }}>
      <Dropper p={[-0.45, 1.68, 0.1]} len={0.55} active={(io) => pulse(io, 'add', 2.4)} />
      <Dropper p={[0.45, 1.68, 0.1]} len={0.55} active={(io) => pulse(io, 'add', 2.4)} />
    </Mv>
    <group position={[1.6, 1.95, 0.35]} rotation={[-0.9, 0, 0.35]}>
      <mesh material={MAT.black}><torusGeometry args={[0.26, 0.03, 10, 32]} /></mesh>
      <Cyl r={0.25} h={0.012} rot={[Math.PI / 2, 0, 0]} m={MAT.glass} cast={false} />
      <Rod a={[0.26, 0, 0]} b={[0.68, 0, 0]} r={0.035} m={MAT.wood} />
    </group>
    <Label text="放大镜" p={[1.65, 2.45, 0.35]} size={0.2} />
    <Label text="铜片" p={[-1.18, 1.5, 0.3]} size={0.2} />
    <Label text="沸水" p={[0, 0.45, 0.85]} size={0.2} />
    <Label text="NaCl 溶液" p={[-0.5, 1.12, 0.7]} size={0.18} />
    <Label text="KNO₃ 溶液" p={[0.5, 1.12, 0.7]} size={0.18} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => !io.sb('placed', false) ? '先滴加两种饱和溶液'
      : `蒸发${fmt(io.s('evap', 0) * 100, 0)}%｜NaCl${io.s('naclCrystal', 0) > 0.002 ? '有' : '无'}晶体｜KNO₃${io.s('kno3Crystal', 0) > 0.002 ? '有' : '无'}晶体`} />
  </group>;
}

/* ---------- p58 水对酸、碱、盐的影响 ---------- */
const TX = [-1.2, 0, 1.2];
function WaterEffect() {
  const wetLevel = (io: RigIO) => io.damp('wetLvl', io.sb('wet', false) ? 0.42 : 0, 3);
  return <group>
    <Box p={[0, 0.05, 0]} s={[3.5, 0.1, 0.75]} m={MAT.wood} />
    <Box p={[0, 0.75, -0.34]} s={[3.5, 1.3, 0.06]} m={MAT.wood} />
    {TX.map((x) => <Vessel key={x} kind="tube" p={[x, 0.1, 0]} r={0.2} h={1.5} />)}
    {/* ① 柠檬酸晶体 + 蓝色石蕊试纸 */}
    <Pile p={[TX[0], 0.13, 0]} r={0.14} h={0.07} color="white" />
    <Strip p={[TX[0] + 0.04, 0.55, 0]} s={[0.07, 0.75, 0.012]} color={(io) => '#' + new THREE.Color('#4a78c2').lerp(new THREE.Color('#d24a4a'), io.damp('litmus', io.sb('litmusRed', false) ? 1 : 0, 3)).getHexString()} />
    <Mv upd={(g, io) => { g.visible = pulse(io, 'add', 2) > 0; }}>
      <Rod a={[TX[0] + 0.06, 0.8, 0.02]} b={[TX[0] + 0.45, 2.2, 0.1]} r={0.022} m={MAT.glass} />
    </Mv>
    {/* ② 柠檬酸晶体 + 镁带，加蒸馏水 */}
    <Pile p={[TX[1], 0.13, 0]} r={0.14} h={0.07} amount={(io) => 1 - 0.8 * io.damp('dis2', io.sb('wet', false) ? 1 : 0, 2)} color="white" />
    <Box p={[TX[1] + 0.03, 0.4, 0]} s={[0.05, 0.5, 0.012]} m={MG} />
    <Liquid p={[TX[1], 0.12, 0]} r={0.17} level={wetLevel} color="clear" />
    <GasBubbles p={[TX[1] + 0.03, 0.12, 0]} spread={0.12} height={0.4} count={9} when={(io) => io.s('mgBubbles', 0) > 0} rate={(io) => io.s('mgBubbles', 0)} />
    {/* ③ 氢氧化钡 + 胆矾，加蒸馏水后静置 */}
    <Pile p={[TX[2] - 0.05, 0.13, 0]} r={0.12} h={0.07} color="white" amount={(io) => 1 - io.damp('dis3', io.s('precipitate', 0), 2)} />
    <Pile p={[TX[2] + 0.06, 0.15, 0]} r={0.1} h={0.06} color="#8fbfe6" amount={(io) => 1 - io.damp('dis3b', io.s('precipitate', 0), 2)} />
    <Pile p={[TX[2], 0.12, 0]} r={0.16} h={0.1} color="#4f93cf" amount={(io) => io.damp('ppt', io.s('precipitate', 0), 2)} />
    <Pile p={[TX[2] + 0.04, 0.17, 0.03]} r={0.09} h={0.05} color="white" amount={(io) => io.damp('ppt2', io.s('precipitate', 0), 2)} />
    <Liquid p={[TX[2], 0.12, 0]} r={0.17} level={wetLevel} color="#d3e9f1" opacity={0.45} />
    <Mv upd={(g, io) => { g.visible = before(io, 'add', 2.4); }}>
      <Dropper p={[TX[1], 1.8, 0]} len={0.5} active={(io) => pulse(io, 'add', 2.4)} />
      <Dropper p={[TX[2], 1.8, 0]} len={0.5} active={(io) => pulse(io, 'add', 2.4)} />
    </Mv>
    {/* 读数关注的试管：红色套环 */}
    <Mv p={[0, 1.0, 0]} upd={(g, io) => { g.position.x = io.damp('mark', TX[clamp(io.idx('tube'), 0, 2)], 6); }}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={MAT.red}><torusGeometry args={[0.25, 0.025, 8, 28]} /></mesh>
    </Mv>
    <Label text="石蕊试纸" p={[TX[0], 0.28, 0.58]} size={0.2} />
    <Label text="镁带" p={[TX[1], 0.28, 0.58]} size={0.2} />
    <Label text="氢氧化钡+胆矾" p={[TX[2], 0.28, 0.58]} size={0.19} />
    <IoLabel p={[0, 3.35, 0]} size={0.22} get={(io) => !io.sb('wet', false) ? '干燥状态：都无明显变化' : io.sb('shaken', false) ? '加水振荡：变红 / 冒泡 / 沉淀' : '加水后：变红 / 冒泡 / 沉淀'} />
  </group>;
}

/* ---------- p68 铵态氮肥与碱性物质 ---------- */
const MORTAR = [[0, 0], [0.42, 0], [0.62, 0.5], [0.55, 0.5], [0.3, 0.12], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x, y));
function Ammonium() {
  const method = useOptIndex('method');
  const mortarGeo = useMemo(() => new THREE.LatheGeometry(MORTAR, 32), []);
  const ammonia = (io: RigIO) => io.damp('nh3', io.s('ammonia', 0), 1.5);
  if (method === 0) return <group>
    <mesh position={[-0.5, 0, 0]} geometry={mortarGeo} material={MAT.white} castShadow />
    <Pile p={[-0.5, 0.12, 0]} r={0.38} h={0.16} color={(io) => io.sb('added', false) && io.idx('base') === 0 ? '#ece8dc' : 'white'} />
    <Mv p={[-0.5, 0.2, 0]} upd={(g, io) => { const k = pulse(io, 'add', 3); g.rotation.y = k > 0 ? io.t * 7 : 0; }}>
      <Rod a={[0.12, 0, 0]} b={[0.42, 1.05, 0]} r={0.05} m={MAT.white} />
    </Mv>
    <Smoke p={[-0.5, 0.55, 0]} amount={ammonia} color="#dfeaf5" n={7} rise={1.1} spread={0.2} size={0.1} opacity={0.4} />
    <Vessel kind="jar" p={[1.0, 0, -0.1]} r={0.3} h={0.75} level={0.55} liquid="#efece4" liquidOpacity={0.95} />
    <Vessel kind="jar" p={[1.85, 0, -0.1]} r={0.3} h={0.75} level={0.55} liquid="#f5f5f2" liquidOpacity={0.95} />
    <Label text="研钵" p={[-0.5, 0.25, 0.85]} size={0.2} />
    <Label text="熟石灰" p={[1.0, 1.05, -0.1]} size={0.2} />
    <IoLabel p={[1.85, 1.05, -0.1]} size={0.2} get={(io) => io.opt('salt') || '铵盐'} />
    <Label text="扇闻气味" p={[-1.55, 1.5, 0]} size={0.2} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => !io.sb('added', false) ? '研磨前：无明显气味' : io.sb('reacted', false) ? '研磨后：有刺激性氨味' : '对照：无明显氨味'} />
  </group>;
  return <group>
    <Box p={[-1.45, 0.06, -0.2]} s={[0.8, 0.12, 0.6]} m={MAT.darkSteel} />
    <Cyl p={[-1.6, 1.3, -0.2]} r={0.035} h={2.5} m={MAT.steel} />
    <Rod a={[-1.6, 1.95, -0.2]} b={[-0.42, 1.95, 0]} r={0.03} m={MAT.darkSteel} />
    <Box p={[-0.3, 1.95, 0]} s={[0.3, 0.1, 0.3]} m={MAT.darkSteel} />
    <Vessel kind="tube" p={[-0.3, 0.95, 0]} r={0.16} h={1.35} />
    <Liquid p={[-0.3, 0.97, 0]} r={0.14} level={0.32} color="clear" />
    <GasBubbles p={[-0.3, 0.97, 0]} spread={0.1} height={0.3} count={6} when={(io) => io.sb('heating', false)} rate={() => 0.4} />
    <Vessel kind="flask" p={[-0.3, 0, 0]} r={0.34} h={0.5} level={0.45} liquid="#d9e8f0" liquidOpacity={0.5} />
    <Cyl p={[-0.3, 0.58, 0]} r={0.07} h={0.2} m={MAT.brass} />
    <Flame p={[-0.3, 0.68, 0]} lit={(io) => io.sb('heating', false)} scale={0.7} />
    <Smoke p={[-0.3, 2.3, 0]} amount={ammonia} color="#dfeaf5" n={6} rise={0.7} spread={0.12} opacity={0.35} />
    <Strip p={[0.05, 2.55, 0]} s={[0.4, 0.07, 0.012]} rot={[0, 0, -0.35]} color={(io) => '#' + new THREE.Color('#d0545a').lerp(new THREE.Color('#3f6ec4'), io.damp('litmus', io.sb('litmusBlue', false) ? 1 : 0, 2)).getHexString()} />
    <Mv upd={(g, io) => { g.visible = pulse(io, 'add', 2.4) > 0; }}>
      <Dropper p={[-0.3, 2.45, 0]} len={0.45} active={(io) => pulse(io, 'add', 2.4)} />
    </Mv>
    <Vessel kind="jar" p={[1.15, 0, -0.1]} r={0.3} h={0.75} level={0.6} liquid="#cfe6ee" liquidOpacity={0.6} />
    <Vessel kind="jar" p={[1.95, 0, -0.1]} r={0.3} h={0.75} level={0.6} liquid="#d9eef0" liquidOpacity={0.6} />
    <Label text="NaOH 溶液" p={[1.15, 1.05, -0.1]} size={0.19} />
    <IoLabel p={[1.95, 1.05, -0.1]} size={0.19} get={(io) => (io.opt('salt') || '铵盐') + '溶液'} />
    <Label text="湿润红色石蕊试纸" p={[0.95, 2.75, 0]} size={0.19} />
    <Label text="酒精灯" p={[-0.3, 0.2, 0.6]} size={0.19} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => !io.sb('added', false) ? '红色石蕊试纸放在试管口' : io.sb('litmusBlue', false) ? '微热后试纸变蓝：放出 NH₃' : '对照：试纸不变色'} />
  </group>;
}

/* ---------- p87 碳酸氢钠与稀盐酸反应的热量变化 ---------- */
const PLAY = 4; // 曲线按 4 倍速播放：1 s 实际时间 = 4 s 实验时间
const elapsed = (io: RigIO) => (io.sb('ran', false) && io.since('run') >= 0 ? Math.min(120, io.since('run') * PLAY) : 0);
const tempAt = (io: RigIO) => {
  const c = arr(io, 'curve');
  return c.length ? c[Math.min(c.length - 1, Math.round(elapsed(io) / 2))] : io.s('T0', 20);
};
function Bicarbonate() {
  return <group>
    <Vessel kind="flask" p={[-1.3, 0, 0]} r={0.62} h={1.35} />
    <Liquid p={[-1.3, 0.035, 0]} r={0.52} level={(io) => io.damp('acid', io.sb('ran', false) ? 0.3 : 0, 3)} color="clear" />
    <Pile p={[-1.3, 0.04, 0]} r={0.3} h={0.08} color="white" amount={(io) => 1 - 0.8 * smooth(elapsed(io) / 30)} />
    <GasBubbles p={[-1.3, 0.05, 0]} spread={0.45} height={0.3} count={14} when={(io) => io.sb('ran', false) && elapsed(io) > 2 && elapsed(io) < 45} rate={() => 0.9} />
    <Cyl p={[-1.3, 1.4, 0]} r={0.22} h={0.14} m={MAT.rubber} />
    <Rod a={[-1.25, 1.95, 0]} b={[-1.25, 0.14, 0]} r={0.025} m={MAT.darkSteel} />
    <Cyl p={[-1.25, 2.0, 0]} r={0.06} h={0.18} m={MAT.blue} />
    <Tube pts={[[-1.25, 2.08, 0], [-0.95, 2.35, 0], [-0.55, 1.7, 0.1], [-0.3, 0.5, 0.2], [-0.15, 0.2, 0.2]]} r={0.018} m={MAT.black} />
    <Box p={[0.15, 0.15, 0.2]} s={[0.6, 0.3, 0.42]} m={MAT.blue} />
    <Tube pts={[[0.45, 0.2, 0.2], [0.65, 0.3, 0], [0.8, 0.35, -0.28]]} r={0.018} m={MAT.black} />
    {/* 倒入盐酸的小烧杯 */}
    <Mv p={[-0.5, 0, 0.45]} upd={(g, io) => {
      const s = io.since('run');
      const k = s >= 0 && s < 2.5 ? Math.sin((s / 2.5) * Math.PI) : 0;
      g.position.set(-0.5 - 0.35 * k, 1.5 * k, 0.45 - 0.35 * k);
      g.rotation.z = 1.7 * k;
    }}>
      <Vessel kind="beaker" r={0.2} h={0.5} level={0.6} liquid="#cfe8ef" liquidOpacity={0.5} />
    </Mv>
    <Screen title="温度—时间图" />
    <Curve x0={0.65} x1={2.25} y0={1.08} y1={2.12} lo={0} hi={1} color="#ffb347"
      visible={(io) => io.sb('ran', false)}
      values={(io) => { const T0 = io.s('T0', 20); return arr(io, 'curve').map((t) => (t - (T0 - 10)) / 11); }}
      upto={(io) => elapsed(io) / 120} />
    <Label text="锥形瓶" p={[-1.3, 0.25, 0.85]} size={0.2} />
    <Label text="温度传感器" p={[-0.55, 2.55, 0]} size={0.2} />
    <Label text="数据采集器" p={[0.25, 0.55, 0.2]} size={0.19} />
    <Label text="4% 盐酸" p={[-0.6, 0.08, 0.95]} size={0.18} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => `T = ${fmt(tempAt(io), 1)} °C · t = ${fmt(elapsed(io), 0)} s`} />
  </group>;
}

/* ---------- p91 常见液体燃料的燃烧 ---------- */
function Lamp({ x, liquid }: { x: number; liquid: string }) {
  return <group position={[x, 0, 0]}>
    <Vessel kind="flask" r={0.52} h={0.85} level={0.5} liquid={liquid} liquidOpacity={0.6} />
    <Cyl p={[0, 0.92, 0]} r={0.1} h={0.18} m={MAT.brass} />
    <Rod a={[0, 1.01, 0]} b={[0, 1.1, 0]} r={0.03} m={MAT.white} />
  </group>;
}
function LiquidFuels() {
  const supply = useOptIndex('supply');
  const lit = (io: RigIO) => io.sb('lit', false);
  return <group>
    <Lamp x={-0.9} liquid="#e3eef4" />
    <Lamp x={0.9} liquid="#e7d79b" />
    <Flame p={[-0.9, 1.08, 0]} lit={lit} scale={1.2} color="#7caee5" />
    <Flame p={[0.9, 1.08, 0]} lit={lit} scale={(io) => (io.sb('atomized', false) ? 1.3 : 1.7)} color={(io) => (io.sb('atomized', false) ? '#6f9fe0' : '#ffb347')} />
    <Smoke p={[0.9, 1.7, 0]} amount={(io) => io.s('soot', 0)} color="#2b2b2d" n={9} rise={0.95} spread={0.14} size={0.09} opacity={0.6} />
    <Match to={[-0.9, 1.15, 0.05]} />
    <Match to={[0.9, 1.15, 0.05]} from={[1.8, 1.7, 0.25]} />
    {supply === 1 && <group>
      <Rod a={[1.95, 1.12, 0]} b={[1.12, 1.12, 0]} r={0.03} m={MAT.steel} />
      <Cyl p={[1.1, 1.12, 0]} r={0.05} rt={0.02} h={0.12} rot={[0, 0, Math.PI / 2]} m={MAT.brass} />
      <Label text="雾化（示意）" p={[1.75, 1.42, 0]} size={0.18} />
    </group>}
    <Label text="酒精" p={[-0.9, 0.15, 0.82]} size={0.22} />
    <Label text="煤油" p={[0.9, 0.15, 0.82]} size={0.22} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => !lit(io) ? '等体积酒精、煤油，待点燃' : io.sb('atomized', false) ? '酒精淡蓝；煤油雾化后黑烟少' : '酒精淡蓝无烟；煤油黄焰冒黑烟'} />
  </group>;
}

/* ---------- p100 探究铁生锈的条件（氧气传感器） ---------- */
const GRAY = new THREE.Color('#55565a'), RUST = new THREE.Color('#9b4a26'), TMP = new THREE.Color();
function RustJar({ x, wet, tag }: { x: number; wet: boolean; tag: string }) {
  return <group>
    <Mv p={[x, 0, 0]} upd={(g, io) => { g.rotation.z = pulse(io, 'stir', 1.2) * 0.12 * Math.sin(io.t * 24); }}>
      <Vessel kind="jar" r={0.42} h={1.15} />
      <Cyl p={[0, 0.05, 0]} r={0.36} h={0.012} m={wet ? PAPER_WET : PAPER} />
      {wet && [[-0.22, 0.2], [0.24, -0.12], [0.05, 0.27]].map(([dx, dz], i) => <mesh key={i} position={[dx, 0.065, dz]} material={WATER_DROP} scale={[1, 0.4, 1]}><sphereGeometry args={[0.04, 10, 8]} /></mesh>)}
      <Pile p={[0, 0.06, 0]} r={0.25} h={0.08} amount={(io) => (io.sb('started', false) ? 1 : 0)}
        color={(io) => '#' + TMP.copy(GRAY).lerp(RUST, wet ? clamp(io.s('rust', 0), 0, 1) * 0.85 : 0).getHexString()} />
      <Cyl p={[0, 1.2, 0]} r={0.31} h={0.14} m={MAT.rubber} />
      <Rod a={[0, 1.5, 0]} b={[0, 0.55, 0]} r={0.03} m={MAT.darkSteel} />
      <Cyl p={[0, 1.58, 0]} r={0.07} h={0.2} m={MAT.blue} />
    </Mv>
    <Tube pts={[[x, 1.68, 0], [x + 0.25, 2.1, -0.1], [-0.1, 1.5, -0.25], [0.05, 0.3, -0.15]]} r={0.016} m={MAT.black} />
    <Label text={tag} p={[x, 0.22, 0.72]} size={0.18} />
  </group>;
}
function IronRust() {
  const upto = (io: RigIO) => io.p('time', 300) / 600;
  const toUnit = (v: number) => (v - 14) / 8;
  return <group>
    <RustJar x={-1.75} wet tag="① 湿滤纸" />
    <RustJar x={-0.65} wet={false} tag="② 干滤纸" />
    <Box p={[0.3, 0.15, -0.1]} s={[0.55, 0.3, 0.4]} m={MAT.blue} />
    <Screen title="氧气浓度—时间" />
    <Curve x0={0.65} x1={2.25} y0={1.08} y1={2.12} lo={0} hi={1} color="#e5533d" values={(io) => arr(io, 'curveWet').map(toUnit)} upto={upto} />
    <Curve x0={0.65} x1={2.25} y0={1.08} y1={2.12} lo={0} hi={1} color="#5aa8e6" values={(io) => arr(io, 'curveDry').map(toUnit)} upto={upto} />
    <Label text="① 有水" p={[1.85, 1.8, -0.24]} size={0.16} color="#f08a78" />
    <Label text="② 无水" p={[1.85, 1.64, -0.24]} size={0.16} color="#8cc6f0" />
    <Label text="氧气传感器" p={[-1.2, 2.4, 0]} size={0.2} />
    <Label text="数据采集器" p={[0.3, 0.5, 0.35]} size={0.18} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => `t=${fmt(io.p('time', 300), 0)} s ① ${fmt(io.s('o2Wet', 21), 1)}% ② ${fmt(io.s('o2Dry', 21), 1)}%（示例）`} />
  </group>;
}

/** 上海版独有活动装置（组 E），按 sceneVariant 索引。 */
export const SH_RIGS_E: ShRigMap = {
  'sh-evaporate-on-copper-plate': () => <EvaporatePlate />,
  'sh-water-effect-on-acid-base-salt': () => <WaterEffect />,
  'sh-ammonium-fertilizer-base': () => <Ammonium />,
  'sh-bicarbonate-acid-endothermic': () => <Bicarbonate />,
  'sh-alcohol-kerosene-burning': () => <LiquidFuels />,
  'sh-iron-rust-oxygen-sensor': () => <IronRust />,
};

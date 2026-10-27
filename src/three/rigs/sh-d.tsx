import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import type { ShRigMap } from './sh-types';
import { Flame, GasBubbles, Liquid, Pile, Smoke } from './chemical-parts';
import { Mv } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp, lerp, smooth, useOptIndex, useRig, type RigIO } from './io';

/* ---------- 组 D 小部件 ---------- */

const PAPER = new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 0.95 });
const GRAPHITE = new THREE.MeshStandardMaterial({ color: '#3d3f45', roughness: 0.35, metalness: 0.55 });
const GREY = new THREE.MeshStandardMaterial({ color: '#8d8a83', roughness: 0.9 });
const MG = new THREE.MeshStandardMaterial({ color: '#d9dde2', roughness: 0.2, metalness: 0.9 });

/** 自带材质（每个实例一份），供每帧改颜色或透明度。 */
function useMat(make: () => THREE.Material) {
  const m = useMemo(make, []);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/** 电子天平：p 为底座中心；w/d 为机身尺寸；显示屏读 get(io)。 */
function Balance({ p, w = 1.6, d = 1.2, pan = 'round', get }: { p: V3; w?: number; d?: number; pan?: 'round' | 'square'; get: (io: RigIO) => string }) {
  return <group position={p}>
    <Box p={[0, 0.15, 0]} s={[w, 0.3, d]} m={MAT.plastic} />
    <Box p={[0, 0.17, d / 2 + 0.05]} s={[w * 0.9, 0.22, 0.12]} m={MAT.darkSteel} />
    <Box p={[-w * 0.18, 0.2, d / 2 + 0.115]} s={[w * 0.36, 0.12, 0.01]} m={MAT.black} />
    <Cyl p={[w * 0.25, 0.2, d / 2 + 0.12]} r={0.035} h={0.03} rot={[Math.PI / 2, 0, 0]} m={MAT.blue} />
    <Cyl p={[w * 0.36, 0.2, d / 2 + 0.12]} r={0.035} h={0.03} rot={[Math.PI / 2, 0, 0]} m={MAT.red} />
    {pan === 'round' ? <Cyl p={[0, 0.33, -0.05]} r={Math.min(w, d) * 0.36} h={0.035} m={MAT.steel} /> : <Box p={[0, 0.33, -0.05]} s={[w * 0.86, 0.035, d * 0.8]} m={MAT.steel} />}
    <IoLabel get={get} p={[-w * 0.18, 0.2, d / 2 + 0.16]} size={0.11} color="#7cf2a8" bg="#0d1a12" />
  </group>;
}

/** 简易酒精灯：灯芯顶端在 y≈0.78；lit 决定火焰。 */
function Lamp({ p, lit, scale = 1 }: { p: V3; lit: (io: RigIO) => boolean; scale?: number }) {
  return <group position={p} scale={scale}>
    <Vessel kind="flask" r={0.34} h={0.5} liquid="#d9e8f0" level={0.45} liquidOpacity={0.5} />
    <Cyl p={[0, 0.58, 0]} r={0.07} h={0.2} m={MAT.brass} />
    <Cyl p={[0, 0.72, 0]} r={0.025} h={0.1} m={MAT.white} />
    <Flame p={[0, 0.76, 0]} lit={lit} />
  </group>;
}

/* ---------- 1 泡腾片 ---------- */
function EffervescentTablet() {
  const tablet = (io: RigIO) => io.idx('sample') === 0;
  return <group>
    <Vessel kind="beaker" p={[-0.2, 0, 0]} r={0.62} h={1.5} />
    <Liquid p={[-0.2, 0.035, 0]} r={0.57} level={0.5} color="clear" />
    <GasBubbles p={[-0.2, 0.05, 0]} spread={0.5} height={0.45} count={18} when={(io) => io.s('bubbles', 0) > 0.04} rate={(io) => 0.4 + io.s('bubbles', 0)} />
    {/* 泡腾片：投入前放在表面皿上，投入后沉在杯底并逐渐变小 */}
    <Mv upd={(g, io) => {
      const inn = io.sb('tabletIn', false);
      g.visible = tablet(io) && io.s('tabletLeft', 1) > 0.03;
      const k = io.damp('tabletDrop', inn ? 1 : 0, 4);
      g.position.set(lerp(1.55, -0.1, k), lerp(0.13, 0.08, k) + Math.sin(k * Math.PI) * 1.4, lerp(0.35, 0.05, k));
      const s = 0.25 + 0.75 * io.s('tabletLeft', 1); g.scale.set(s, 1, s);
    }}><Cyl r={0.17} h={0.06} m={MAT.white} /></Mv>
    <Cyl p={[1.55, 0.04, 0.35]} r={0.32} rt={0.36} h={0.05} m={MAT.glass} />
    {/* 杯口上方的干燥玻璃片 */}
    <Box p={[-0.2, 1.72, 0]} s={[1.6, 0.035, 1.0]} m={MAT.glass} rot={[0.08, 0, 0]} cast={false} />
    <Rod a={[-1.0, 1.72, 0]} b={[-1.55, 1.95, 0]} r={0.03} m={MAT.wood} />
    <Label text="干燥玻璃片" p={[-1.5, 2.2, 0]} size={0.2} />
    <Label text="水" p={[-1.15, 0.45, 0.55]} size={0.2} />
    <Label text="泡腾片" p={[1.55, 0.55, 0.35]} size={0.2} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => !tablet(io) ? '对照：只有水，无气泡' : io.s('bubbles', 0) > 0.04 ? '大量气泡 · 玻璃片无大量冷凝水' : io.sb('tabletIn', false) ? '已基本溶解' : '待投入泡腾片'} />
  </group>;
}

/* ---------- 2 镁带剪断与燃烧 ---------- */
function MagnesiumRibbon() {
  const glow = useMat(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
  const L = (io: RigIO) => io.p('length', 3) * 0.12;
  return <group>
    {/* 步骤 1：桌面上打磨、剪断 */}
    <Mv upd={(g, io) => { g.visible = io.idx('step') === 0; g.scale.setScalar(1.6); g.position.set(0, 0, -0.6); }}>
      <Box p={[0, 0.02, 0.6]} s={[1.6, 0.03, 0.6]} m={MAT.card} />
      <Mv upd={(g, io) => { const cut = io.sb('cut', false) && io.idx('step') === 0; const l = L(io); g.position.x = cut ? -0.12 : 0; g.scale.x = l / 2; }}><Box p={[-1, 0.05, 0.6]} s={[2, 0.02, 0.1]} m={MG} /></Mv>
      <Mv upd={(g, io) => { const cut = io.sb('cut', false) && io.idx('step') === 0; const l = L(io); g.position.x = cut ? 0.12 : 0; g.scale.x = l / 2; }}><Box p={[1, 0.05, 0.6]} s={[2, 0.02, 0.1]} m={MG} /></Mv>
      <Mv upd={(g, io) => { const cut = io.sb('cut', false) && io.idx('step') === 0; g.position.set(cut ? 0.45 : 0.15, 0.08, cut ? 1.0 : 0.6); g.rotation.y = cut ? 0.6 : 0; }}>
        <Rod a={[-0.05, 0, -0.18]} b={[0.55, 0, 0.12]} r={0.022} m={MAT.steel} />
        <Rod a={[-0.05, 0.02, 0.18]} b={[0.55, 0.02, -0.12]} r={0.022} m={MAT.steel} />
        <Cyl p={[0.68, 0, 0.18]} r={0.11} h={0.03} m={MAT.red} /><Cyl p={[0.68, 0.02, -0.18]} r={0.11} h={0.03} m={MAT.red} />
      </Mv>
      <Box p={[-1.15, 0.02, 0.3]} s={[0.5, 0.02, 0.4]} m={MAT.card} />
      <Label text="镁带" p={[0, 0.3, 0.6]} size={0.14} />
      <Label text="剪刀" p={[0.55, 0.3, 1.35]} size={0.14} />
      <Label text="砂纸" p={[-1.15, 0.25, 0.3]} size={0.14} />
    </Mv>
    {/* 步骤 2：酒精灯点燃，移到陶土网上方燃烧 */}
    <Mv upd={(g, io) => { g.visible = io.idx('step') === 1; }}>
      <Lamp p={[-1.45, 0, 0]} lit={(io) => io.idx('step') === 1} />
      {/* 三脚架 + 陶土网 */}
      {[0, 1, 2].map((i) => { const a = i * 2.094 + 0.5; return <Rod key={i} a={[0.85 + Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]} b={[0.85 + Math.cos(a) * 0.4, 0.78, Math.sin(a) * 0.4]} r={0.025} m={MAT.darkSteel} />; })}
      <Box p={[0.85, 0.8, 0]} s={[1.1, 0.03, 1.1]} m={GREY} />
      <Pile p={[0.85, 0.815, 0]} r={0.28} h={0.07} color="white" amount={(io) => io.s('burnt', 0) * 0.9} />
      <Smoke p={[0.85, 1.3, 0]} amount={(io) => (io.sb('burning', false) ? 1 : 0)} rise={1.2} spread={0.15} />
      <Mv upd={(g, io) => {
        const l = L(io), done = io.n('add') > 0;
        const k = io.damp('mgMove', done ? 1 : 0, 3);
        g.position.set(lerp(-1.45 + 0.05, 0.85 - l / 2, k), lerp(1.15, 1.3, k), 0);
      }}>
        {/* 原点为镁带左端（燃烧端）；坩埚钳在右端 */}
        <Mv upd={(g, io) => { const l = L(io), b = io.s('burnt', 0); g.position.x = l * b; g.scale.x = Math.max(0.02, l * (1 - b)); g.visible = b < 0.99; }}><Box p={[0.5, 0, 0]} s={[1, 0.012, 0.08]} m={MG} /></Mv>
        <Mv upd={(g, io) => { const l = L(io); g.position.x = l; }}>
          <Rod a={[0, 0, 0.03]} b={[0.95, 0.4, 0.07]} r={0.02} m={MAT.steel} />
          <Rod a={[0, 0, -0.03]} b={[0.95, 0.4, -0.07]} r={0.02} m={MAT.steel} />
        </Mv>
        <Mv upd={(g, io) => { const on = io.sb('burning', false); g.visible = on; const l = L(io); g.position.x = l * io.s('burnt', 0); g.scale.setScalar(1 + Math.sin(io.t * 23) * 0.12); }}>
          <Ball r={0.07} m={MAT.white} />
          <mesh material={glow}><sphereGeometry args={[0.24, 16, 12]} /></mesh>
        </Mv>
      </Mv>
      <Label text="酒精灯" p={[-1.45, 0.3, 0.65]} size={0.2} />
      <Label text="陶土网" p={[0.85, 0.5, 0.8]} size={0.2} />
      <Label text="坩埚钳" p={[1.75, 2.0, 0]} size={0.2} />
    </Mv>
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => io.idx('step') === 0 ? (io.sb('cut', false) ? '剪成两段：形状变，无新物质' : '打磨光亮的镁带') : io.sb('burning', false) ? '耀眼白光，生成白色粉末' : io.s('burnt', 0) > 0.98 ? '残留白色粉末：新物质' : '夹住镁带在外焰上点燃'} />
  </group>;
}

/* ---------- 3 电子天平称量粗盐 ---------- */
function BalanceWeighing() {
  return <group>
    <Balance p={[-0.55, 0, 0]} w={1.7} d={1.3} get={(io) => io.sb('displayOn', true) ? (io.sb('active', false) && io.idx('stage') === 0 && io.since('run') >= 0 && io.since('run') < 1.5 ? '8.8.8.8' : io.s('display', 0).toFixed(1) + ' g') : '    '} />
    <Mv upd={(g, io) => { g.visible = io.sb('paperOn', false); }}>
      <Box p={[-0.55, 0.36, -0.05]} s={[0.65, 0.008, 0.65]} m={PAPER} rot={[0, 0.4, 0]} />
      <Pile p={[-0.55, 0.365, -0.05]} r={0.2} h={0.08} color="#e8e4da" amount={(io) => io.s('saltOnPaper', 0) / Math.max(0.5, io.s('target', 5)) * 0.9} />
    </Mv>
    {/* 药匙：加样阶段在称量纸上方轻敲 */}
    <Mv upd={(g, io) => {
      const on = io.idx('stage') === 2 && io.n('run') > 0 && io.s('saltOnPaper', 0) < io.s('target', 5) - 1e-6;
      g.visible = on;
      g.position.set(-0.2, 0.8 + (on ? Math.abs(Math.sin(io.t * 9)) * 0.04 : 0), -0.05);
    }}>
      <Rod a={[0, 0, 0]} b={[0.85, 0.3, 0]} r={0.02} m={MAT.steel} />
      <Cyl p={[-0.05, -0.01, 0]} r={0.08} rt={0.09} h={0.03} m={MAT.steel} />
    </Mv>
    {/* 倒出阶段：称量纸被拿起倒入烧杯 */}
    <Mv upd={(g, io) => {
      const pour = io.idx('stage') === 3 && io.n('run') > 0;
      const k = pour ? smooth(clamp(io.since('run') / 0.8, 0, 1)) * (io.s('saltOnPaper', 0) > 0.01 ? 1 : 0) : 0;
      g.visible = k > 0.01;
      g.position.set(lerp(-0.55, 0.95, k), lerp(0.36, 1.25, k), lerp(0, 0.35, k));
      g.rotation.z = -0.9 * k;
    }}>
      <Box s={[0.6, 0.008, 0.45]} m={PAPER} />
    </Mv>
    <Vessel kind="beaker" p={[1.25, 0, 0.35]} r={0.42} h={0.9} />
    <Pile p={[1.25, 0.03, 0.35]} r={0.3} h={0.1} color="#e8e4da" amount={(io) => io.s('saltInBeaker', 0) / Math.max(0.5, io.s('target', 5))} />
    <Vessel kind="jar" p={[1.9, 0, -0.9]} r={0.28} h={0.6} />
    <Pile p={[1.9, 0.03, -0.9]} r={0.24} h={0.14} color="#e8e4da" />
    <Label text="电子天平" p={[-1.75, 0.55, 0.55]} size={0.2} />
    <Label text="烧杯" p={[1.25, 0.2, 1.0]} size={0.2} />
    <Label text="粗盐" p={[1.9, 0.9, -0.9]} size={0.18} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => ['① 开机自检', '② 放称量纸 → 去皮', '③ 加粗盐至目标', '④ 倒入烧杯，关机'][io.idx('stage')] + (io.sb('displayOn', true) ? '  示数 ' + io.s('display', 0).toFixed(1) + ' g' : '')} />
  </group>;
}

/* ---------- 4 酒精灯火焰 ---------- */
const WICK = 1.05;
const ZONES = [{ name: '外焰', r: 0.24, h: 0.95, c: '#ffb347', o: 0.42 }, { name: '内焰', r: 0.16, h: 0.66, c: '#ff8a3a', o: 0.55 }, { name: '焰心', r: 0.085, h: 0.3, c: '#5a78d8', o: 0.7 }];
const PROBE_Y = 0.18;
function LampFlame() {
  const mats = useMemo(() => ZONES.map((z) => new THREE.MeshBasicMaterial({ color: z.c, transparent: true, opacity: z.o, depthWrite: false })), []);
  const geos = useMemo(() => ZONES.map((z) => { const g = new THREE.ConeGeometry(z.r, z.h, 20); g.translate(0, z.h / 2, 0); return g; }), []);
  const chars = useMemo(() => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: '#c49a62', roughness: 0.85 })), []);
  useEffect(() => () => { mats.forEach((m) => m.dispose()); geos.forEach((g) => g.dispose()); chars.forEach((m) => m.dispose()); }, [mats, geos, chars]);
  const flame = useRef<THREE.Group>(null);
  const wood = new THREE.Color('#c49a62'), black = new THREE.Color('#1d1a17');
  useRig((io) => {
    const on = io.sb('flame', false);
    if (flame.current) { flame.current.visible = on; flame.current.scale.y = 1 + Math.sin(io.t * 8) * 0.04; }
    const zone = io.idx('zone');
    mats.forEach((m, i) => { m.opacity = ZONES[i].o * (i === zone ? 1.35 : 0.8); });
    [io.s('charOuter', 0), io.s('charInner', 0), io.s('charCore', 0)].forEach((k, i) => chars[i].color.copy(wood).lerp(black, k));
  });
  // 火柴梗在 PROBE_Y 高度处与三层火焰相交的半径
  const rAt = (i: number) => ZONES[i].r * Math.max(0, 1 - PROBE_Y / ZONES[i].h);
  const seg = (a: number, b: number, m: THREE.Material, key: string) => <Box key={key} p={[(a + b) / 2, WICK + PROBE_Y, 0]} s={[Math.abs(b - a), 0.035, 0.035]} m={m} />;
  const r0 = rAt(0), r1 = rAt(1), r2 = rAt(2);
  return <group>
    <group scale={1.5} position={[-0.3, 0, 0]}>
      <Vessel kind="flask" r={0.42} h={0.55} liquid="#d9e8f0" level={0.42} liquidOpacity={0.5} />
      <Cyl p={[0, 0.6, 0]} r={0.08} h={0.12} m={MAT.brass} />
      <Cyl p={[0, 0.67, 0]} r={0.03} h={0.06} m={MAT.white} />
    </group>
    {/* 火焰：三层同轴锥 */}
    <group ref={flame} position={[-0.3, WICK, 0]} visible={false}>
      {ZONES.map((z, i) => <mesh key={z.name} geometry={geos[i]} material={mats[i]} renderOrder={3 + i} />)}
    </group>
    {/* 火柴梗横插（外焰两侧最黑） */}
    <Mv p={[-0.3, 0, 0]} upd={(g, io) => { g.visible = io.idx('probe') === 1 && io.sb('flame', false); }}>
      {seg(-0.75, -r0, MAT.wood, 'a')}{seg(r0, 0.75, MAT.wood, 'b')}
      {seg(-r0, -r1, chars[0], 'o1')}{seg(r1, r0, chars[0], 'o2')}
      {seg(-r1, -r2, chars[1], 'i1')}{seg(r2, r1, chars[1], 'i2')}
      {seg(-r2, r2, chars[2], 'c')}
      <Rod a={[0.75, WICK + PROBE_Y, 0]} b={[1.05, WICK + PROBE_Y - 0.1, 0]} r={0.02} m={MAT.wood} />
    </Mv>
    {/* 灯帽：熄灭时盖在灯上，点燃时放在桌面 */}
    <Mv upd={(g, io) => { const cap = io.sb('capOn', true); const k = io.damp('cap', cap ? 1 : 0, 5); g.position.set(lerp(-1.75, -0.3, k), lerp(0, 0.82, k) + Math.sin(k * Math.PI) * 0.6, lerp(0.5, 0, k)); }}>
      <Cyl p={[0, 0.2, 0]} r={0.17} rt={0.13} h={0.4} m={MAT.glass} />
      <Ball p={[0, 0.42, 0]} r={0.06} m={MAT.glass} />
    </Mv>
    {/* 部位标签与引线 */}
    <Mv upd={(g, io) => { g.visible = io.sb('flame', false); }}>
      {[{ y: WICK + 0.8, x: 0.02 }, { y: WICK + 0.48, x: 0.06 }, { y: WICK + 0.13, x: 0.03 }].map((q, i) => <group key={i}>
        <Rod a={[-0.3 + q.x, q.y, 0]} b={[1.1, q.y, 0]} r={0.008} m={MAT.black} cast={false} />
        <IoLabel p={[1.5, q.y, 0]} size={0.22} color={['#a33a1b', '#b2621c', '#2e4fae'][i]} get={(io) => (io.idx('zone') === i ? '▶ ' : '') + ZONES[i].name} />
      </group>)}
    </Mv>
    <Label text="酒精灯" p={[0.75, 0.3, 0.75]} size={0.2} />
    <IoLabel p={[0.9, WICK + 0.02, 0.35]} size={0.17} color="#3a2e20" get={(io) => io.idx('probe') === 1 && io.sb('flame', false) ? '火柴梗' : ' '} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => !io.sb('flame', false) ? '灯帽盖着（熄灭）' : ZONES[io.idx('zone')].name + '：温度' + ['最高', '较高', '最低'][io.idx('zone')] + (io.s('charOuter', 0) > 0.5 ? ' · 外焰处最先炭化' : '')} />
  </group>;
}

/* ---------- 5 石墨导电 ---------- */
function GraphiteCircuit() {
  const led = useMat(() => new THREE.MeshStandardMaterial({ color: '#e84a3a', emissive: '#ff2a1a', emissiveIntensity: 0, transparent: true, opacity: 0.9 }));
  const halo = useMat(() => new THREE.MeshBasicMaterial({ color: '#ff6a4a', transparent: true, opacity: 0, depthWrite: false }));
  useRig((io) => {
    const b = io.sb('bulbOn', false) ? io.s('brightness', 0) : 0;
    (led as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + b * 2.2;
    (halo as THREE.MeshBasicMaterial).opacity = b * 0.5;
  });
  const X = 1.45, Z = 0.75, G = 0.12;
  // 线段：[x1,z1,x2,z2]，石墨线宽随参数变化
  const segs: [number, number, number, number, boolean][] = [
    [-X, -G, -X, -Z, false], [-X, -Z, -0.18, -Z, false], [0.18, -Z, X, -Z, false], [X, -Z, X, -G, false],
    [-X, G, -X, Z, false], [-X, Z, X, Z, false], [X, Z, X, G, false], [-0.18, -Z, 0.18, -Z, true],
  ];
  return <group>
    <Box p={[0, 0.01, 0]} s={[3.9, 0.02, 2.2]} m={PAPER} />
    {segs.map(([x1, z1, x2, z2, erasable], i) => {
      const horiz = z1 === z2, len = Math.abs(horiz ? x2 - x1 : z2 - z1) + 0.01;
      return <Mv key={i} p={[(x1 + x2) / 2, 0.025, (z1 + z2) / 2]} upd={(g, io) => {
        const w = io.p('width', 1) * 0.11; g.scale.set(horiz ? 1 : w, 1, horiz ? w : 1);
        g.visible = !(erasable && io.idx('line') === 1);
        const m = g.children[0] as THREE.Mesh | undefined; if (m) (m.material as THREE.MeshStandardMaterial).opacity = 1;
      }}><Box s={[horiz ? len : 1, 0.006, horiz ? 1 : len]} m={GRAPHITE} cast={false} /></Mv>;
    })}
    {/* 橡皮：擦断时出现在断口旁 */}
    <Mv upd={(g, io) => { g.visible = io.idx('line') === 1; }}><Box p={[0, 0.07, -1.0]} s={[0.4, 0.12, 0.22]} m={MAT.red} /></Mv>
    {/* 发光二极管（左开口），胶带固定 */}
    <group position={[-X, 0, 0]}>
      <Rod a={[0, 0.03, -G]} b={[0, 0.25, -0.04]} r={0.012} m={MAT.steel} />
      <Rod a={[0, 0.03, G]} b={[0, 0.25, 0.04]} r={0.012} m={MAT.steel} />
      <Cyl p={[0, 0.3, 0]} r={0.08} h={0.12} m={led} />
      <mesh position={[0, 0.36, 0]} material={led}><sphereGeometry args={[0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, 0.33, 0]} material={halo}><sphereGeometry args={[0.2, 16, 12]} /></mesh>
      <Box p={[0, 0.03, 0]} s={[0.25, 0.008, 0.42]} m={MAT.glass} cast={false} />
    </group>
    {/* 9 V 电池（右开口）：断开时移开 */}
    <Mv upd={(g, io) => { const k = io.damp('battery', io.sb('closed', true) ? 0 : 1, 5); g.position.set(X + 0.38 + k * 0.4, 0.17 + k * 0.45, 0); }}>
      <Box s={[0.55, 0.3, 0.5]} m={MAT.blue} />
      <Box p={[0.12, 0.155, 0]} s={[0.25, 0.01, 0.5]} m={MAT.black} />
      <Cyl p={[-0.31, -0.08, -G]} r={0.05} h={0.08} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />
      <Cyl p={[-0.31, -0.08, G]} r={0.06} h={0.08} rot={[0, 0, Math.PI / 2]} seg={6} m={MAT.steel} />
    </Mv>
    {/* 铅笔 */}
    <group position={[0.4, 0.06, 1.0]} rotation={[0, 0.15, 0]}>
      <Cyl r={0.05} h={1.3} rot={[0, 0, Math.PI / 2]} seg={6} m={MAT.green} />
      <Cyl p={[0.75, 0, 0]} r={0.05} rt={0.008} h={0.2} rot={[0, 0, -Math.PI / 2]} m={MAT.wood} />
    </group>
    <Label text="发光二极管" p={[-X + 0.1, 1.0, 0]} size={0.2} />
    <Label text="9 V 电池" p={[X + 0.38, 0.75, 0]} size={0.2} />
    <IoLabel p={[0, 0.2, 0.05]} size={0.18} color="#3a2e20" get={(io) => io.opt('pencil').slice(0, 2).trim() + ' 铅笔线'} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => io.idx('line') === 1 ? '石墨线擦断：二极管不亮' : !io.sb('closed', true) ? '电池已移开：不亮' : io.sb('bulbOn', false) ? '二极管发光：石墨导电' : '二极管几乎不亮'} />
  </group>;
}

/* ---------- 6 物质组成与结构模型历程 ---------- */
const HIST = [{ who: '道尔顿', y: '1803' }, { who: '汤姆孙', y: '1904' }, { who: '卢瑟福', y: '1911' }, { who: '玻尔', y: '1913' }];
function Orbit({ r, tilt = [0, 0, 0] }: { r: number; tilt?: V3 }) {
  return <mesh rotation={tilt}><torusGeometry args={[r, 0.008, 6, 64]} /><meshBasicMaterial color="#7a7f88" /></mesh>;
}
function AtomModels() {
  const m = useOptIndex('model');
  const pos = useMat(() => new THREE.MeshStandardMaterial({ color: '#e7837a', transparent: true, opacity: 0.38, roughness: 0.4, depthWrite: false }));
  const spin = (g: THREE.Group, io: RigIO) => { g.rotation.y = io.sb('rotating', false) ? io.t * 0.6 : 0.3; };
  const electron = (key: string | number, p: V3) => <Ball key={key} p={p} r={0.06} m={MAT.blue} />;
  const orbitE = (r: number, n: number, speed: number, tilt: V3, ph = 0) => <group rotation={tilt}><Mv upd={(g, io) => { g.rotation.y = (io.sb('rotating', false) ? io.t * speed : 0) + ph; }}>{Array.from({ length: n }, (_, i) => electron(i, [Math.cos(i * 2 * Math.PI / n) * r, 0, Math.sin(i * 2 * Math.PI / n) * r]))}</Mv></group>;
  return <group>
    <Mv p={[0, 1.85, 0]} upd={spin}>
      {m === 0 && <Ball r={0.8} m={MAT.darkSteel} />}
      {m === 1 && <>
        <mesh material={pos}><sphereGeometry args={[0.85, 32, 24]} /></mesh>
        {[[0.3, 0.35, 0.2], [-0.35, 0.2, 0.3], [0.1, -0.4, 0.35], [-0.2, -0.25, -0.4], [0.45, -0.05, -0.3], [-0.45, 0.45, -0.1]].map((q, i) => electron(i, q as V3))}
      </>}
      {m === 2 && <>
        <Ball r={0.07} m={MAT.red} />
        <Orbit r={0.75} tilt={[Math.PI / 2, 0, 0]} /><Orbit r={0.65} tilt={[0.6, 0.4, 0]} /><Orbit r={0.82} tilt={[-0.5, 0.9, 0]} />
        {orbitE(0.75, 2, 1.4, [0, 0, 0])}{orbitE(0.65, 2, 1.1, [Math.PI / 2 - 0.6, 0.4, 0], 1)}{orbitE(0.82, 2, 0.9, [Math.PI / 2 + 0.5, 0.9, 0], 2)}
      </>}
      {m === 3 && <>
        <Ball r={0.1} m={MAT.red} />
        <Orbit r={0.4} tilt={[Math.PI / 2, 0, 0]} /><Orbit r={0.82} tilt={[Math.PI / 2, 0, 0]} />
        {orbitE(0.4, 2, 1.5, [0, 0, 0])}{orbitE(0.82, 4, 0.8, [0, 0, 0], 0.4)}
      </>}
    </Mv>
    {/* 时间轴底座 */}
    <Box p={[0, 0.03, 0.55]} s={[4.4, 0.04, 0.14]} m={MAT.darkWood} />
    {HIST.map((h, i) => {
      const x = -1.65 + i * 1.1;
      return <group key={h.who}>
        <Mv p={[x, 0, 0.55]} upd={(g, io) => { const s = io.idx('model') === i ? 1.35 : 1; g.scale.set(s, s, s); }}>
          <Cyl p={[0, 0.09, 0]} r={0.16} h={0.1} m={io_sel(i, m)} />
        </Mv>
        <Label text={h.who} p={[x, 0.5, 0.75]} size={0.2} />
        <Label text={h.y} p={[x, 0.27, 0.95]} size={0.16} />
      </group>;
    })}
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => io.idx('view') === 1 && io.idx('model') >= 2 ? '核 : 原子半径 ≈ 1 : 10⁵（核已放大）' : HIST[io.idx('model')].who + '模型（' + HIST[io.idx('model')].y + '）'} />
  </group>;
}
const io_sel = (i: number, m: number) => (i === m ? MAT.red : i < m ? MAT.brass : MAT.plastic);

/* ---------- 7 硫酸铜与氢氧化钠反应前后质量 ---------- */
// 悬浮絮状沉淀颗粒：确定性伪随机分布（x/z 在半径 0.26 内，fy 为液柱内相对高度）
const FLOCS = Array.from({ length: 24 }, (_, i) => {
  const rnd = (s: number) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
  const a = rnd(1) * Math.PI * 2, rr = Math.sqrt(rnd(2)) * 0.26;
  return { x: Math.cos(a) * rr, z: Math.sin(a) * rr, fy: rnd(3), r: 0.035 + rnd(4) * 0.015, ph: rnd(5) * Math.PI * 2, sp: 0.02 + rnd(6) * 0.02 };
});
function MassConservation() {
  const hA = (io: RigIO) => io.p('cuso4', 5) / 10 * 0.62, hB = (io: RigIO) => io.p('naoh', 5) / 10 * 0.62;
  const k = (io: RigIO) => Math.sin(Math.PI * clamp(io.s('pour', 0), 0, 1));
  const toHex = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1)).getHexString();
  const levelB = (io: RigIO) => hB(io) + hA(io) * clamp(io.s('pour', 0), 0, 1);
  // Lambert 不经过 InkScene 的纸面混色和描边；设为透明并提高 renderOrder，画在半透明液体之后，蓝色沉淀才不被冲淡
  const floc = useMat(() => new THREE.MeshLambertMaterial({ color: '#1f63cc', transparent: true, opacity: 0.95 }));
  const settled = useMat(() => new THREE.MeshLambertMaterial({ color: '#1c56b4', transparent: true, opacity: 0.95 }));
  const flocs = useRef<THREE.Group>(null);
  const pile = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const a = io.damp('pptSettle', io.s('precipitate', 0), 1.5);
    if (pile.current) { pile.current.visible = a > 0.02; pile.current.scale.set(0.29, 0.13 * clamp(a, 0.05, 1), 0.29); }
    const g = flocs.current;
    if (!g) return;
    const ppt = clamp(io.s('precipitate', 0), 0, 1), l = levelB(io), n = Math.round(ppt * FLOCS.length);
    g.visible = ppt > 0.01 && l > 0.1;
    g.children.forEach((c, i) => {
      const q = FLOCS[i];
      c.visible = i < n;
      if (!c.visible) return;
      // 缓慢下沉，沉到底后回到液面附近；水平方向轻微漂动
      const f = ((q.fy - io.t * q.sp) % 1 + 1) % 1;
      c.position.set(q.x + Math.sin(io.t * 0.7 + q.ph) * 0.02, 0.06 + f * (l - 0.1), q.z + Math.cos(io.t * 0.6 + q.ph) * 0.02);
    });
  });
  return <group>
    <Balance p={[0, 0, 0]} w={2.8} d={1.5} pan="square" get={(io) => io.s('display', 0).toFixed(2) + ' g'} />
    {/* 烧杯 A（硫酸铜）：倒入时被拿起倾倒，倒完放回 */}
    <Mv upd={(g, io) => { const q = k(io); g.position.set(lerp(-0.65, -0.31, q), lerp(0.35, 1.83, q), 0); g.rotation.z = -1.85 * q; }}>
      <Vessel kind="beaker" r={0.36} h={0.85} />
      <Liquid p={[0, 0.03, 0]} r={0.33} level={(io) => hA(io) * (1 - clamp(io.s('pour', 0), 0, 1))} color="blue" />
    </Mv>
    {/* 液流 */}
    <Mv upd={(g, io) => { const u = io.s('pour', 0); g.visible = u > 0.3 && u < 0.85; }}>
      <Cyl p={[0.48, 1.0, 0]} r={0.035} h={0.6} m={MAT.blue} />
    </Mv>
    {/* 烧杯 B（氢氧化钠）：生成蓝色沉淀 */}
    <Vessel kind="beaker" p={[0.65, 0.35, 0]} r={0.36} h={0.85} />
    {/* 悬浊液略带浅蓝；剩余 Cu²⁺ 越多越蓝 */}
    <Liquid p={[0.65, 0.38, 0]} r={0.33} level={levelB} color={(io) => io.s('pour', 0) > 0.02 ? toHex('#d2e8f4', '#7fb6e4', Math.max(io.s('blueness', 0), io.s('precipitate', 0) * 0.3)) : 'clear'} />
    {/* 沉在杯底的絮状沉淀：半球 */}
    <mesh ref={pile} position={[0.65, 0.39, 0]} material={settled} visible={false} renderOrder={6}><sphereGeometry args={[1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    <group ref={flocs} position={[0.65, 0.38, 0]} visible={false}>
      {FLOCS.map((q, i) => <mesh key={i} material={floc} visible={false} renderOrder={6}><sphereGeometry args={[q.r * 1.4, 10, 8]} /></mesh>)}
    </group>
    <Label text="硫酸铜溶液" p={[-1.5, 1.35, 0]} size={0.2} />
    <Label text="NaOH 溶液" p={[1.6, 1.35, 0]} size={0.2} />
    <Label text="电子天平" p={[0.75, 0.2, 0.95]} size={0.18} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => (io.s('pour', 0) <= 0 ? '反应前' : io.s('pour', 0) < 1 ? '混合中' : '反应后（生成蓝色絮状沉淀）') + ' 总质量 ' + io.s('display', 0).toFixed(2) + ' g（示例）'} />
  </group>;
}

/* ---------- 8 二氧化碳储存 / 转化模拟装置 ---------- */
function Co2Capture() {
  const gasMat = useMat(() => new THREE.MeshBasicMaterial({ color: '#c9d3da', transparent: true, opacity: 0.35, depthWrite: false }));
  const bal = useMat(() => new THREE.MeshStandardMaterial({ color: '#e36a6a', roughness: 0.4, transparent: true, opacity: 0.88 }));
  const lvl = (io: RigIO) => 0.25 + io.p('liquid', 100) / 100 * 0.6;
  const SX = -1.65, SY = 1.0, SL = 1.1;
  return <group>
    {/* 注射器（水平，针口朝右） */}
    <Cyl p={[SX, SY, 0]} r={0.16} h={SL} rot={[0, 0, Math.PI / 2]} m={MAT.glass} cast={false} />
    <Cyl p={[SX + SL / 2 + 0.07, SY, 0]} r={0.04} h={0.14} rot={[0, 0, Math.PI / 2]} m={MAT.glass} />
    <Mv upd={(g, io) => { const f = clamp(io.s('syringe', 1), 0, 1) * clamp(io.p('gas', 200) / 500, 0.15, 1); g.position.set(SX + SL / 2 - f * SL / 2, SY, 0); g.scale.set(Math.max(0.01, f), 1, 1); }}>
      <mesh material={gasMat} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.15, 0.15, SL, 20]} /></mesh>
    </Mv>
    <Mv upd={(g, io) => { const f = clamp(io.s('syringe', 1), 0, 1) * clamp(io.p('gas', 200) / 500, 0.15, 1); g.position.set(SX + SL / 2 - f * SL, SY, 0); }}>
      <Cyl r={0.15} h={0.05} rot={[0, 0, Math.PI / 2]} m={MAT.rubber} />
      <Rod a={[0, 0, 0]} b={[-0.75, 0, 0]} r={0.03} m={MAT.plastic} />
      <Cyl p={[-0.75, 0, 0]} r={0.14} h={0.04} rot={[0, 0, Math.PI / 2]} m={MAT.plastic} />
    </Mv>
    {/* 导气管：注射器 → 吸收瓶底部 */}
    <Tube pts={[[SX + SL / 2 + 0.14, SY, 0], [-0.75, SY, 0], [-0.55, 1.75, 0], [-0.1, 1.75, 0], [-0.1, 0.18, 0]]} r={0.03} m={MAT.glass} />
    {/* 吸收瓶 */}
    <Vessel kind="jar" p={[0, 0, 0]} r={0.5} h={1.3} />
    <Cyl p={[0, 1.35, 0]} r={0.37} rt={0.4} h={0.14} m={MAT.rubber} />
    <Liquid p={[0, 0.03, 0]} r={0.46} level={lvl} color={(io) => io.idx('method') === 1 ? '#' + new THREE.Color('#bfe2e8').lerp(new THREE.Color('#efeadb'), io.s('turbidity', 0)).getHexString() : 'clear'} opacity={0.62} />
    <GasBubbles p={[-0.1, 0.12, 0]} spread={0.12} height={0.6} count={10} when={(io) => io.s('bubbles', 0) > 0} rate={() => 1} />
    {/* 出气管 → 气球（收集未被吸收的 CO₂） */}
    <Tube pts={[[0.15, 1.3, 0], [0.15, 1.6, 0], [0.6, 1.6, 0], [1.25, 1.55, 0]]} r={0.03} m={MAT.glass} />
    <Mv upd={(g, io) => { const r = 0.1 + 0.42 * Math.cbrt(clamp(io.s('residual', 0) / 500, 0, 1)); g.position.set(1.3 + r, 1.55, 0); g.scale.set(r, r * 1.15, r); }}>
      <mesh material={bal}><sphereGeometry args={[1, 24, 18]} /></mesh>
    </Mv>
    <Label text="注射器 CO₂" p={[SX, 1.5, 0]} size={0.2} />
    <IoLabel p={[0.95, 0.3, 0.55]} size={0.18} color="#3a2e20" get={(io) => io.opt('method').replace(/（.*$/, '')} />
    <Label text="气球" p={[1.75, 2.3, 0]} size={0.2} />
    <IoLabel p={[0, 3.3, 0]} size={0.22} get={(io) => '吸收 ' + Math.round(io.s('absorbed', 0)) + ' mL · 剩余 ' + Math.round(io.s('residual', 0)) + ' mL'} />
  </group>;
}

/** 上海版独有活动装置（组 D），按 sceneVariant 索引。 */
export const SH_RIGS_D: ShRigMap = {
  'sh-effervescent-tablet-gas': () => <EffervescentTablet />,
  'sh-magnesium-cut-burn': () => <MagnesiumRibbon />,
  'sh-electronic-balance-weighing': () => <BalanceWeighing />,
  'sh-alcohol-lamp-flame': () => <LampFlame />,
  'sh-graphite-pencil-conductivity': () => <GraphiteCircuit />,
  'sh-composition-history-models': () => <AtomModels />,
  'sh-copper-sulfate-naoh-mass': () => <MassConservation />,
  'sh-co2-capture-model': () => <Co2Capture />,
};

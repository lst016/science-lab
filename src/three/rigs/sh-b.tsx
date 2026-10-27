import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AlcoholLamp, Ball, Box, Cyl, Label, MAT, Rod, Tube, Vessel, type V3 } from '../kit';
import { clamp, mapRange, useOptIndex, useRig, type RigIO } from './io';
import { CLAY, IBox, Liquid, Mv, WATER } from './mechanical-parts';
import { IoLabel, Poly, Rings } from './parts';
import { DynamicThermo, Flame, GasBubbles, Pile, Smoke } from './chemical-parts';
import { ALPHA_COPPER, ALPHA_WOOD, SCREEN_CM, lensFocal, rodTemp } from '../../sim/sh-b';
import type { ShRigMap } from './sh-types';

// 固定材质在模块级创建一次，避免重渲染时重复分配。
const PHONE_SCREEN_MAT = new THREE.MeshBasicMaterial({ color: '#1d3b2c' });
const LIQUID_IODINE_MAT = new THREE.MeshStandardMaterial({ color: '#6b1f1f', roughness: 0.2 });
const IODINE_CRYSTAL_MAT = new THREE.MeshStandardMaterial({ color: '#2d1d33', metalness: 0.5, roughness: 0.3 });
const VASELINE_MAT = new THREE.MeshStandardMaterial({ color: '#f2e4a8', roughness: 0.3 });

const SKIN = new THREE.MeshStandardMaterial({ color: '#e9b894', roughness: 0.7 });
const RUBBER_FILM = new THREE.MeshStandardMaterial({ color: '#d9a35b', roughness: 0.6, side: THREE.DoubleSide });
const FOAM = new THREE.MeshStandardMaterial({ color: '#fbfbf6', roughness: 0.9 });
const STRAW = new THREE.MeshStandardMaterial({ color: '#7fb9d8', roughness: 0.4 });
const STRAW_HI = new THREE.MeshStandardMaterial({ color: '#e7b43c', roughness: 0.4 });
const fmt0 = (v: number) => Math.round(v).toString();
const fmt1 = (v: number) => (Math.round(v * 10) / 10).toString();

/* ---------- 1. 敲击橡皮膜 ---------- */
function DrumMembrane() {
  const beads = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ x: Math.cos(i * 2.4) * (0.15 + (i % 3) * 0.14), z: Math.sin(i * 2.4) * (0.15 + (i % 3) * 0.14), f: 9 + i * 1.3, ph: i * 0.9 })), []);
  const top = 1.32;
  return <group position={[-0.2, 0, 0]}>
    <Cyl p={[0, 0.65, 0]} r={0.68} rt={0.74} h={1.3} m={MAT.plastic} />
    <Cyl p={[0, top - 0.05, 0]} r={0.77} h={0.08} m={MAT.rubber} />
    <Mv upd={(g, io) => { const a = io.s('amp', 0); g.position.y = top + a * 0.05 * Math.sin(io.t * 55); }}>
      <Cyl r={0.76} h={0.02} m={RUBBER_FILM} />
    </Mv>
    <Mv upd={(g, io) => { g.visible = io.idx('beads', 1) === 1; }}>
      {beads.map((b, i) => <Mv key={i} upd={(g, io) => { const j = io.s('jump', 0); g.position.set(b.x, top + 0.05 + j * 0.75 * Math.abs(Math.sin(io.t * b.f + b.ph)), b.z); }}>
        <Ball r={0.045} m={FOAM} />
      </Mv>)}
    </Mv>
    <Mv p={[0.25, 0, 0.1]} upd={(g, io) => { const s = io.since('run'); const tap = s >= 0 && s < 0.35 ? Math.sin((s / 0.35) * Math.PI) : 0; g.position.y = top + 0.5 - tap * 0.42; }}>
      <Cyl p={[0, 0.35, 0]} r={0.075} h={0.7} m={SKIN} />
      <Ball p={[0, 0, 0]} r={0.075} m={SKIN} />
      <Box p={[0.05, 0.9, 0]} s={[0.5, 0.45, 0.3]} m={SKIN} />
    </Mv>
    <Rings p={[0, top + 0.1, 0]} rot={[-Math.PI / 2, 0, 0]} amp={(io) => io.s('amp', 0)} maxR={1.6} speed={0.9} />
    <Label text="橡皮膜" p={[-1.35, top + 0.05, 0]} size={0.22} />
    <Label text="泡沫颗粒" p={[1.35, top + 0.35, 0]} size={0.22} />
    <Label text="杯子" p={[1.05, 0.6, 0.3]} size={0.22} />
    <IoLabel p={[0.2, 3.3, 0]} size={0.24} get={(io) => io.n('run') === 0 ? '点“开始实验”敲击橡皮膜' : io.s('amp', 0) > 0.04 ? '膜振动 → 发声' + (io.idx('beads', 1) ? '，颗粒弹跳' : '') : '振动停止，声音消失'} />
  </group>;
}

/* ---------- 2. 简单乐器 ---------- */
const PAN = [20, 17, 14, 11, 8];
function PanPipe() {
  const k = 0.11, top = 2.75;
  return <group>
    {PAN.map((L, i) => <Cyl key={L} p={[-2.0 + i * 0.22, top - (L * k) / 2, 0]} r={0.09} h={L * k} m={STRAW} />)}
    <Box p={[-1.56, top - 0.35, 0.1]} s={[1.15, 0.1, 0.05]} m={MAT.card} />
    <Box p={[-1.56, 0.06, -0.35]} s={[1.0, 0.12, 0.5]} m={MAT.darkSteel} />
    <Cyl p={[-1.56, (top - 0.35) / 2, -0.3]} r={0.035} h={top - 0.35} m={MAT.steel} />
    <Box p={[-1.56, top - 0.35, -0.1]} s={[0.08, 0.08, 0.4]} m={MAT.steel} />
    <Box p={[0.1, 0.06, -0.35]} s={[0.6, 0.12, 0.5]} m={MAT.darkSteel} />
    <Cyl p={[0.1, (top - 0.5) / 2, -0.3]} r={0.035} h={top - 0.5} m={MAT.steel} />
    <Box p={[0.1, top - 0.5, -0.17]} s={[0.08, 0.08, 0.3]} m={MAT.steel} />
    <Mv p={[0.1, 0, 0]} upd={(g, io) => { const L = io.p('length', 10) * k; const s = g.children[0]; s.scale.y = L; s.position.y = top - L / 2; const plug = g.children[1]; plug.position.y = top - L - 0.03; }}>
      <mesh material={STRAW_HI}><cylinderGeometry args={[0.13, 0.13, 1, 20, 1, true]} /></mesh>
      <Cyl r={0.13} h={0.06} m={CLAY} />
    </Mv>
    <Mv p={[0.1, top + 0.12, 0]} upd={(g, io) => { const l = io.s('loud', 0); g.scale.setScalar(0.6 + l * 0.6 + 0.08 * Math.sin(io.t * 20)); g.visible = l > 0.05; }}>
      <Ball r={0.07} m={MAT.glass} />
    </Mv>
    <Rings p={[0.1, top + 0.15, 0]} rot={[0, 0, 0]} amp={(io) => io.s('loud', 0)} maxR={1.3} speed={1.2} />
    <Label text="一组吸管" p={[-1.56, 3.05, 0]} size={0.22} />
    <Label text="被吹的吸管" p={[0.1, 3.05, 0]} size={0.22} />
    <Mv upd={(g, io) => { g.position.y = top - io.p('length', 10) * k - 0.05; }}><Label text="橡皮泥封口" p={[0.75, 0, 0.2]} size={0.2} /></Mv>
  </group>;
}
function BandBox() {
  const k = 0.13, x0 = -1.5, y = 1.0;
  return <group>
    <IBox p={[0.1, 0.4, 0]} s={[3.4, 0.8, 1.1]} m={MAT.wood} />
    <Cyl p={[0.1, 0.81, 0]} r={0.3} h={0.02} m={MAT.black} />
    <Box p={[x0, 0.9, 0]} s={[0.08, 0.2, 0.9]} m={MAT.darkWood} />
    <Mv upd={(g, io) => { g.position.x = x0 + io.p('length', 10) * k; }}><Box p={[0, 0.9, 0]} s={[0.08, 0.2, 0.9]} m={MAT.brass} /></Mv>
    {[-0.25, 0, 0.25].map((z, j) => <Poly key={z} n={24} r={0.018} color={j === 1 ? '#c8402f' : '#b0533a'} fill={(pts, io) => {
      const L = io.p('length', 10) * k;
      const a = j === 1 ? io.s('loud', 0) * 0.06 * Math.sin(io.t * 48) : 0;
      for (let i = 0; i <= 24; i++) { const u = i / 24; pts[i * 3] = x0 + u * L; pts[i * 3 + 1] = y + a * Math.sin(Math.PI * u); pts[i * 3 + 2] = z; }
    }} />)}
    {[-0.25, 0, 0.25].map((z) => <Mv key={z} upd={(g, io) => { const L = io.p('length', 10) * k; g.position.x = x0 + L; g.scale.x = Math.max(0.05, 1.85 - L); }}><Box p={[0.5, y - 0.08, z]} s={[1, 0.02, 0.025]} m={MAT.rubber} /></Mv>)}
    <Label text="橡皮筋" p={[-0.6, 1.4, 0]} size={0.22} />
    <Label text="可移动琴码" p={[1.2, 1.45, 0]} size={0.22} />
    <Label text="木盒" p={[0.1, 0.4, 0.75]} size={0.22} />
  </group>;
}
function SimpleInstrument() {
  const kind = useOptIndex('kind', 0);
  return <group>
    {kind === 0 ? <PanPipe /> : <BandBox />}
    <group position={[1.75, 0, 1.25]}>
      <Box p={[0, 0.06, 0]} s={[0.55, 0.06, 1]} m={MAT.black} rot={[0, 0.3, 0]} />
      <Box p={[0, 0.095, 0]} s={[0.48, 0.01, 0.88]} m={PHONE_SCREEN_MAT} rot={[0, 0.3, 0]} />
    </group>
    <Label text="手机测频率" p={[1.75, 0.55, 1.25]} size={0.2} />
    <IoLabel p={[0, 3.35, 0]} size={0.24} get={(io) => '频率约 ' + fmt0(io.s('frequency', 0)) + ' Hz' + (io.s('loud', 0) > 0.05 ? '（发声中）' : '')} />
  </group>;
}

/* ---------- 3. 水透镜模拟眼睛 ---------- */
const LX = 0.9, KCM = 0.05, AXIS = 1.4, SCR_X = LX + SCREEN_CM * KCM;
function Post({ x, h = AXIS - 0.25 }: { x: number; h?: number }) {
  return <group position={[x, 0, 0]}><Box p={[0, 0.28, 0]} s={[0.3, 0.12, 0.42]} m={MAT.darkSteel} /><Cyl p={[0, 0.34 + h / 2 - 0.1, 0]} r={0.035} h={h - 0.2} m={MAT.steel} /></group>;
}
function WaterLens() {
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd76a' }), []);
  const img = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d58a1c', transparent: true, opacity: 1 }), []);
  const halo = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f2c45a', transparent: true, opacity: 0.4, depthWrite: false }), []);
  const objX = (io: RigIO) => LX - io.p('object', 40) * KCM;
  const imgH = (io: RigIO) => -0.28 * clamp(io.s('magnification', 0.5), 0, 1.6);
  const hitX = (io: RigIO) => Math.min(SCR_X, LX + clamp(io.s('imageDistance', 15), 0, 200) * KCM);
  useRig((io) => {
    const lit = io.sb('lit', false);
    glow.color.set(lit ? '#ffd76a' : '#8d8577');
    const b = io.s('blur', 0);
    img.opacity = lit ? clamp(1 - b * 2.2, 0, 1) : 0;
    halo.opacity = lit ? clamp(0.15 + b * 0.5, 0, 0.55) : 0;
  });
  return <group>
    <Box p={[0, 0.15, 0]} s={[4.7, 0.16, 0.5]} m={MAT.wood} />
    <Box p={[0, 0.215, 0]} s={[4.6, 0.03, 0.14]} m={MAT.steel} />
    {Array.from({ length: 13 }, (_, i) => <Box key={i} p={[LX - 60 * KCM + i * 5 * KCM, 0.235, 0.2]} s={[0.012, 0.01, i % 2 ? 0.06 : 0.1]} m={MAT.black} cast={false} />)}
    <Mv upd={(g, io) => { g.position.x = objX(io); }}>
      <Post x={0} />
      <group position={[0, AXIS, 0]} rotation={[0, 0.5, 0]}>
        <Box p={[-0.12, 0, 0]} s={[0.22, 0.75, 0.6]} m={MAT.black} />
        <mesh position={[0.005, 0.07, 0]} material={glow}><boxGeometry args={[0.02, 0.42, 0.07]} /></mesh>
        <mesh position={[0.005, 0.25, 0.1]} material={glow}><boxGeometry args={[0.02, 0.07, 0.2]} /></mesh>
        <mesh position={[0.005, 0.1, 0.07]} material={glow}><boxGeometry args={[0.02, 0.06, 0.14]} /></mesh>
      </group>
    </Mv>
    <Post x={LX} />
    <group position={[LX, AXIS, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]} material={MAT.darkSteel}><torusGeometry args={[0.5, 0.035, 8, 32]} /></mesh>
      <Mv upd={(g, io) => { const f = lensFocal(io.p('volume', 6)); g.scale.set(clamp(2.4 / f, 0.12, 0.4), 1, 1); }}>
        <mesh material={WATER}><sphereGeometry args={[0.49, 28, 20]} /></mesh>
      </Mv>
    </group>
    <group position={[LX, AXIS + 0.5, 0]}>
      <Tube pts={[[0, 0, 0], [0, 0.35, 0], [-0.25, 0.6, 0], [-0.55, 0.62, 0]]} r={0.025} m={MAT.rubber} />
      <group position={[-0.65, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <Cyl p={[0, 0.04, 0]} r={0.025} h={0.12} m={MAT.plastic} />
        <Cyl p={[0, 0.55, 0]} r={0.11} h={0.9} m={MAT.glass} cast={false} />
        <Liquid p={[0, 0.1, 0]} w={0.095} round level={(io) => 0.85 - io.p('volume', 6) * 0.07} />
        <Mv upd={(g, io) => { g.position.y = 0.1 + 0.85 - io.p('volume', 6) * 0.07 + 0.03; }}>
          <Cyl p={[0, 0, 0]} r={0.1} h={0.05} m={MAT.rubber} />
          <Cyl p={[0, 0.4, 0]} r={0.025} h={0.8} m={MAT.plastic} />
          <Cyl p={[0, 0.8, 0]} r={0.12} h={0.04} m={MAT.plastic} />
        </Mv>
      </group>
    </group>
    <Post x={SCR_X} />
    <group position={[SCR_X, AXIS, 0]} rotation={[0, 0.6, 0]}>
      <Box s={[0.03, 1.15, 1.15]} m={MAT.white} />
      <Mv upd={(g, io) => { const m = clamp(io.s('magnification', 0.5), 0, 1.6); g.scale.set(1, m * 1.4 + 0.05, m * 1.4 + 0.05); }}>
        <mesh position={[-0.02, -0.07, 0]} material={img}><boxGeometry args={[0.01, 0.42, 0.07]} /></mesh>
        <mesh position={[-0.02, -0.25, -0.1]} material={img}><boxGeometry args={[0.01, 0.07, 0.2]} /></mesh>
        <mesh position={[-0.02, -0.1, -0.07]} material={img}><boxGeometry args={[0.01, 0.06, 0.14]} /></mesh>
      </Mv>
      <Mv upd={(g, io) => { const s = 0.15 + io.s('blur', 0) * 0.5; g.scale.set(1, s, s); }}>
        <mesh position={[-0.025, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={halo}><circleGeometry args={[1, 32]} /></mesh>
      </Mv>
    </group>
    {[0.22, -0.05].map((dy) => <Poly key={dy} n={2} r={0.012} color="#f0a020" visible={(io) => io.sb('lit', false)} fill={(pts, io) => {
      const ox = objX(io), oy = AXIS + 0.3;
      const ly = AXIS + dy;
      const v = io.s('imageDistance', 15) * KCM, ix = LX + v, iy = AXIS + imgH(io);
      const ex = hitX(io), t = (ex - LX) / Math.max(0.01, ix - LX);
      pts[0] = ox; pts[1] = oy; pts[2] = 0; pts[3] = LX; pts[4] = ly; pts[5] = 0; pts[6] = ex; pts[7] = ly + (iy - ly) * t; pts[8] = 0;
    }} />)}
    <Mv upd={(g, io) => { g.position.x = objX(io); }}><Label text="发光物" p={[0, 2.05, 0]} size={0.22} /></Mv>
    <Label text="水透镜" p={[LX, AXIS + 0.68, 0.2]} size={0.22} />
    <Label text="注射器" p={[-0.25, 2.95, 0]} size={0.22} />
    <Label text="光屏（视网膜）" p={[SCR_X + 0.15, 2.25, 0]} size={0.21} />
    <IoLabel p={[0, 3.35, 0]} size={0.24} get={(io) => !io.sb('lit', false) ? '点“开始实验”打开发光物' : 'f≈' + fmt1(io.s('focal', 10)) + ' cm，像距 ' + fmt1(io.s('imageDistance', 15)) + ' cm' + (io.s('blur', 0) < 0.08 ? '，清晰' : '，模糊')} />
  </group>;
}

/* ---------- 4. 手感冷热 ---------- */
function Hand({ side }: { side: -1 | 1 }) {
  return <group>
    <Box p={[0, 0.2, 0]} s={[0.36, 0.42, 0.14]} m={SKIN} />
    {[-0.12, -0.04, 0.04, 0.12].map((x) => <Cyl key={x} p={[x, -0.08, 0]} r={0.035} h={0.2} m={SKIN} />)}
    <Cyl p={[side * 0.2, 0.18, 0]} r={0.035} h={0.18} rot={[0, 0, side * 0.7]} m={SKIN} />
    <Rod a={[0, 0.38, 0]} b={[side * 0.25, 1.25, -1.0]} r={0.07} m={SKIN} />
  </group>;
}
function HandTemperature() {
  const basin = (x: number, color: string, label: string) => <group position={[x, 0, 0]}>
    <Vessel kind="beaker" r={0.62} h={0.7} level={0.75} liquid={color} liquidOpacity={0.6} />
    <Label text={label} p={[0, 0.25, 0.85]} size={0.22} />
  </group>;
  const handPos = (io: RigIO, from: number, to: number) => { const pr = io.s('handsInWarm', 0); return [from + (to - from) * pr, 0.42 + Math.sin(Math.PI * pr) * 0.9]; };
  return <group>
    {basin(-1.6, '#f08a5a', '热水')}
    {basin(0, '#d9c27a', '温水')}
    {basin(1.6, '#7fb7e6', '冷水')}
    <Smoke p={[-1.6, 0.7, -0.2]} amount={() => 0.7} n={5} rise={0.7} spread={0.25} size={0.1} opacity={0.25} />
    <DynamicThermo p={[0.38, 0.1, -0.3]} h={1.3} min={0} max={60} value={(io) => io.p('warm', 30)} />
    <Mv upd={(g, io) => { const [x, y] = handPos(io, -1.6, -0.2); g.position.set(x, y, 0.05); }}><Hand side={-1} /></Mv>
    <Mv upd={(g, io) => { const [x, y] = handPos(io, 1.6, 0.2); g.position.set(x, y, 0.05); }}><Hand side={1} /></Mv>
    <Label text="温度计" p={[0.75, 1.45, -0.3]} size={0.2} />
    <IoLabel p={[0, 3.3, 0]} size={0.24} get={(io) => {
      if (io.s('handsInWarm', 0) <= 0.5) return '左手在热水，右手在冷水';
      const w = (d: number) => (d > 1 ? '热' : d < -1 ? '凉' : '差不多');
      return '同在 ' + fmt0(io.p('warm', 30)) + ' ℃：左手觉得' + w(io.s('leftFeel', 0)) + '，右手觉得' + w(io.s('rightFeel', 0));
    }} />
  </group>;
}

/* ---------- 5. 注射器减压沸腾 ---------- */
function Dial({ p, get }: { p: V3; get: (io: RigIO) => number }) {
  const needle = useRef<THREE.Mesh>(null);
  useRig((io) => { if (needle.current) needle.current.rotation.z = mapRange(get(io), 0, 110, 1.3, -1.3); });
  return <group position={p}>
    <Cyl r={0.36} h={0.1} rot={[Math.PI / 2, 0, 0]} m={MAT.white} />
    <mesh position={[0, 0, 0.055]} rotation={[0, 0, 0]}><ringGeometry args={[0.3, 0.34, 32, 1, -0.27, 3.68]} /><meshBasicMaterial color="#2b2622" /></mesh>
    <mesh ref={needle} position={[0, 0, 0.07]}><boxGeometry args={[0.03, 0.5, 0.02]} /><meshStandardMaterial color="#c8402f" /></mesh>
  </group>;
}
function SyringeBoil() {
  const base = 0.55, top = 2.25, water = 1.2, k = 0.09;
  return <group position={[-0.1, 0, 0]}>
    <Box p={[0, 0.06, 0]} s={[0.9, 0.12, 0.7]} m={MAT.darkWood} />
    <mesh position={[0, 0.2, 0]} scale={[1, 0.6, 1]} material={CLAY}><sphereGeometry args={[0.16, 16, 12]} /></mesh>
    <Cyl p={[0, base - 0.12, 0]} r={0.05} rt={0.09} h={0.22} m={MAT.glass} cast={false} />
    <Cyl p={[0, (base + top) / 2, 0]} r={0.33} h={top - base} m={MAT.glass} cast={false} />
    <Cyl p={[0, top, 0]} r={0.42} h={0.04} m={MAT.plastic} />
    <Liquid p={[0, base + 0.02, 0]} w={0.3} round level={() => water - base} />
    <GasBubbles p={[0, base + 0.02, 0]} count={18} spread={0.32} height={water - base - 0.08} when={(io) => io.sb('boiling', false)} rate={() => 1.4} />
    <Mv upd={(g, io) => { g.position.y = water + 0.06 + io.s('pulled', 0) * k; }}>
      <Cyl r={0.31} h={0.1} m={MAT.rubber} />
      <Cyl p={[0, 0.65, 0]} r={0.04} h={1.2} m={MAT.plastic} />
      <Cyl p={[0, 1.27, 0]} r={0.24} h={0.04} m={MAT.plastic} />
    </Mv>
    <Mv upd={(g, io) => { g.visible = io.sb('boiling', false); g.position.y = water + 0.04; }}>
      <Smoke amount={(io) => (io.sb('boiling', false) ? 0.8 : 0)} n={5} rise={0.5} spread={0.12} size={0.06} opacity={0.3} />
    </Mv>
    <Dial p={[1.45, 1.6, 0.1]} get={(io) => io.s('pressure', 101)} />
    <Label text="压强 / kPa" p={[1.45, 2.15, 0.1]} size={0.2} />
    <group position={[-1.6, 0, 0]}>
      <Vessel kind="beaker" r={0.5} h={0.95} level={0.65} liquid="#9fd3e8" liquidOpacity={0.6} />
      <DynamicThermo p={[0.18, 0.1, 0]} h={1.4} min={0} max={100} value={(io) => io.p('water', 80)} />
      <Smoke p={[0, 0.9, 0]} amount={() => 0.6} n={4} rise={0.6} spread={0.2} size={0.08} opacity={0.22} />
      <Label text="热水" p={[0, 0.3, 0.7]} size={0.22} />
    </group>
    <Label text="橡皮泥堵口" p={[0.95, 0.25, 0.3]} size={0.21} />
    <Label text="向外拉活塞" p={[1.0, 2.75, 0]} size={0.21} />
    <IoLabel p={[0, 3.5, 0]} size={0.24} get={(io) => 'p≈' + fmt0(io.s('pressure', 101)) + ' kPa，沸点≈' + fmt0(io.s('boilingPoint', 100)) + ' ℃' + (io.sb('boiling', false) ? '，沸腾' : '')} />
  </group>;
}

/* ---------- 6. 碘的升华 ---------- */
function IodineTube({ y0 }: { y0: number }) {
  const vapor = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8b3fa8', transparent: true, opacity: 0, depthWrite: false }), []);
  useRig((io) => { vapor.opacity = io.s('vapor', 0) * 0.55; });
  const crystals = useMemo(() => Array.from({ length: 9 }, (_, i) => [Math.cos(i * 2.1) * 0.22, 1.35 + (i % 3) * 0.15, Math.sin(i * 2.1) * 0.22] as V3), []);
  return <group position={[0, y0, 0]}>
    <Vessel kind="tube" r={0.27} h={1.85} />
    <Cyl p={[0, 1.95, 0]} r={0.27} rt={0.31} h={0.22} m={MAT.rubber} />
    <mesh position={[0, 0.95, 0]} material={vapor}><cylinderGeometry args={[0.24, 0.24, 1.7, 20]} /></mesh>
    <Pile p={[0, 0.06, 0]} r={0.2} h={0.14} color="#3a2440" amount={(io) => io.s('solidLeft', 1)} />
    <Mv upd={(g, io) => { g.visible = io.sb('melted', false); }}><Cyl p={[0, 0.08, 0]} r={0.19} h={0.04} m={LIQUID_IODINE_MAT} /></Mv>
    {crystals.map((p, i) => <Mv key={i} upd={(g, io) => { const d = io.s('deposit', 0); g.visible = d > i / 12; }}><Box p={p} s={[0.06, 0.04, 0.03]} rot={[i, i * 0.7, 0]} m={IODINE_CRYSTAL_MAT} /></Mv>)}
  </group>;
}
function IodineSublimation() {
  const lamp = useOptIndex('heater', 0) === 1;
  return <group>
    {lamp ? <group>
      <group position={[-1.15, 0, -0.3]}>
        <Box p={[0, 0.08, 0]} s={[0.9, 0.16, 0.7]} m={MAT.darkSteel} />
        <Cyl p={[-0.2, 1.6, 0]} r={0.045} h={3.1} m={MAT.steel} />
        <Box p={[0.55, 2.2, 0.15]} s={[1.5, 0.07, 0.07]} rot={[0, -0.35, 0]} m={MAT.steel} />
      </group>
      <IodineTube y0={1.0} />
      <AlcoholLamp p={[0, 0, 0]} flame={0} />
      <Flame p={[0, 0.68, 0]} lit={(io) => io.sb('heating', false)} />
      <Label text="酒精灯" p={[0.85, 0.35, 0.3]} size={0.22} />
    </group> : <group>
      <Box p={[0, 0.12, 0]} s={[1.6, 0.24, 1.2]} m={MAT.darkSteel} />
      <Mv upd={(g, io) => { const m = g.children[0] as THREE.Mesh; (m.material as THREE.MeshBasicMaterial).color.set(io.sb('heating', false) ? '#e8573a' : '#55575c'); }}>
        <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.55, 28]} /><meshBasicMaterial color="#55575c" /></mesh>
      </Mv>
      <Vessel kind="beaker" p={[0, 0.25, 0]} r={0.75} h={0.95} level={0.62} liquid="#9fd3e8" liquidOpacity={0.4} />
      <IodineTube y0={0.42} />
      <DynamicThermo p={[-0.45, 0.35, -0.3]} h={1.6} min={0} max={120} value={(io) => Math.min(io.s('temperature', 20), 95)} />
      <Smoke p={[0, 1.4, 0]} amount={(io) => (io.sb('heating', false) ? 0.7 : 0)} n={5} rise={0.6} spread={0.4} size={0.09} opacity={0.2} />
      <Label text="热水浴" p={[-1.25, 1.1, 0.4]} size={0.22} />
      <Label text="加热器" p={[1.05, 0.15, 0.6]} size={0.2} />
    </group>}
    <Label text="塞子" p={[0.65, lamp ? 3.05 : 2.5, 0]} size={0.21} />
    <Label text="固态碘" p={[0.65, lamp ? 1.08 : 0.5, 0.35]} size={0.21} />
    <IoLabel p={[0, 3.4, 0]} size={0.24} get={(io) => io.n('run') === 0 ? '点“开始实验”微微加热' : io.sb('melted', false) ? '超过熔点，出现液态碘' : io.sb('heating', false) ? '紫色碘蒸气：升华' : io.s('deposit', 0) > 0.05 ? '冷壁出现碘晶体：凝华' : '停止加热'} />
  </group>;
}

/* ---------- 7. 木棒和铜棒导热 ---------- */
// 棒身用 Lambert 材质：不经过纸墨去饱和，铜/木颜色和受热变红才看得出来。
const OX = -1.45, RY = 1.25, RK = 0.11, SEG = 14, RL = 30;
function HeatRod({ z, alpha, base, label }: { z: number; alpha: number; base: string; label: string }) {
  const mats = useMemo(() => Array.from({ length: SEG }, () => new THREE.MeshLambertMaterial({ color: base })), [base, alpha]);
  const c0 = useMemo(() => new THREE.Color(base), [base]);
  const hot = useMemo(() => new THREE.Color('#ff4a1c'), []);
  useRig((io) => {
    const t = io.s('simTime', 0), ts = io.p('source', 200);
    mats.forEach((m, i) => { const T = rodTemp(((i + 0.5) / SEG) * RL / 100, t, alpha, ts); m.color.copy(c0).lerp(hot, clamp((T - 20) / 250, 0, 0.85)); });
  });
  const seg = (RL * RK) / SEG;
  const drop = alpha > 1e-5 ? 'copperDrop' : 'woodDrop';
  const tKey = alpha > 1e-5 ? 'tCopper' : 'tWood';
  return <group position={[0, RY, z]}>
    {mats.map((m, i) => <mesh key={i} position={[OX + (i + 0.5) * seg, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m} castShadow><cylinderGeometry args={[0.07, 0.07, seg, 14]} /></mesh>)}
    <Mv upd={(g, io) => {
      const x = OX + io.p('distance', 10) * RK;
      let fall = 0;
      if (io.sb(drop, false)) fall = clamp(((io.s('simTime', 0) - io.s(tKey, 0)) / 5) * 1.6, 0, 1);
      g.position.set(x, -fall * (RY - 0.32), 0);
      g.rotation.z = fall >= 1 ? Math.PI / 2 : fall * 0.6;
    }}>
      <Ball p={[0, -0.07, 0]} r={0.05} m={VASELINE_MAT} />
      <Cyl p={[0, -0.32, 0]} r={0.018} h={0.5} m={MAT.wood} />
    </Mv>
    <Label text={label} p={[OX + RL * RK + 0.1, 0.25, 0]} size={0.22} />
  </group>;
}
function WoodCopper() {
  return <group>
    <Box p={[-1.6, 0.06, 0]} s={[1.1, 0.12, 1.4]} m={MAT.darkSteel} />
    <Cyl p={[-1.45, RY / 2, 0]} r={0.05} h={RY} m={MAT.steel} />
    <Box p={[-1.8, RY, 0]} s={[0.85, 0.08, 1.15]} m={MAT.steel} />
    <HeatRod z={0.4} alpha={ALPHA_COPPER} base="#c8642a" label="铜棒" />
    <HeatRod z={-0.4} alpha={ALPHA_WOOD} base="#9b7046" label="木棒" />
    <AlcoholLamp p={[-2.05, 0, 0]} flame={0} />
    <Flame p={[-2.05, 0.68, 0]} lit={(io) => io.sb('heating', false)} scale={1.1} />
    <Label text="A 端" p={[-2.3, RY + 0.3, 0.3]} size={0.21} />
    <Label text="O" p={[-1.45, RY + 0.35, 0.6]} size={0.22} />
    <Mv upd={(g, io) => { g.position.x = OX + io.p('distance', 10) * RK; }}><Label text="牙签" p={[0.45, RY - 0.3, 0.75]} size={0.2} /></Mv>
    <IoLabel p={[0, 3.3, 0]} size={0.24} get={(io) => io.n('run') === 0 ? '点“开始实验”加热 A 端' : '铜棒处 ' + fmt0(io.s('copperTemp', 20)) + ' ℃，木棒处 ' + fmt0(io.s('woodTemp', 20)) + ' ℃'} />
  </group>;
}

/* ---------- 8. 草地与水泥地表面温度 ---------- */
const GRASS = new THREE.MeshStandardMaterial({ color: '#4f9a45', roughness: 0.9 });
const BLADE = new THREE.MeshStandardMaterial({ color: '#3f8a3a', roughness: 0.9 });
const CONCRETE = new THREE.MeshStandardMaterial({ color: '#a7a49c', roughness: 0.95 });
function HeatIsland() {
  const blades = useMemo(() => Array.from({ length: 40 }, (_, i) => [((i * 37) % 17) / 17 * 1.6 - 0.8, ((i * 53) % 19) / 19 * 1.8 - 0.9] as [number, number]), []);
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd23f' }), []);
  useRig((io) => { sunMat.color.set(io.idx('weather', 0) === 0 ? '#ffd23f' : '#d9cf9a'); });
  return <group>
    <group position={[-1.15, 0, 0]}>
      <Box p={[0, 0.08, 0]} s={[1.9, 0.16, 2.2]} m={GRASS} />
      {blades.map(([x, z], i) => <mesh key={i} position={[x, 0.24, z]} material={BLADE}><coneGeometry args={[0.03, 0.18, 4]} /></mesh>)}
      <DynamicThermo p={[0.25, 0.16, 0.5]} h={1.6} min={20} max={70} value={(io) => io.s('grass', 30)} />
      <Label text="草地" p={[-0.4, 0.45, 1.05]} size={0.24} />
    </group>
    <group position={[1.15, 0, 0]}>
      <IBox p={[0, 0.08, 0]} s={[1.9, 0.16, 2.2]} m={CONCRETE} />
      <DynamicThermo p={[-0.25, 0.16, 0.5]} h={1.6} min={20} max={70} value={(io) => io.s('concrete', 30)} />
      <Rings p={[0, 0.25, 0]} rot={[-Math.PI / 2, 0, 0]} amp={(io) => clamp((io.s('concreteFinal', 30) - io.s('air', 30)) / 30, 0, 1) * 0.6} maxR={0.9} speed={0.6} color="#e0763a" />
      <Label text="水泥地" p={[0.4, 0.45, 1.05]} size={0.24} />
      <Mv upd={(g, io) => { g.visible = io.idx('source', 0) === 1; }}>
        <group position={[0.55, 0.16, -0.55]}>
          <Box p={[0, 0.035, 0]} s={[0.85, 0.07, 0.55]} m={MAT.darkSteel} />
          <IBox p={[0, 0.42, 0]} s={[0.75, 0.7, 0.45]} m={MAT.white} />
          <Cyl p={[0, 0.42, 0.23]} r={0.22} h={0.03} rot={[Math.PI / 2, 0, 0]} m={MAT.darkSteel} />
          <Smoke p={[0, 0.35, 0.3]} amount={() => 0.8} n={5} rise={0.8} spread={0.15} size={0.07} color="#f2a070" opacity={0.25} />
          <Label text="空调外机" p={[0, 0.95, 0]} size={0.2} />
        </group>
      </Mv>
    </group>
    <Mv upd={(g, io) => { const u = clamp((io.p('hour', 14) - 6) / 12, 0, 1); g.position.set(-0.9 + 1.8 * u, 1.9 + 0.45 * Math.sin(Math.PI * u), -0.65); }}>
      <mesh material={sunMat}><sphereGeometry args={[0.24, 20, 14]} /></mesh>
      <Mv upd={(g, io) => { g.visible = io.idx('weather', 0) === 1; }}>
        {[[-0.2, 0, 0.3], [0.1, 0.06, 0.32], [0.32, -0.03, 0.28]].map((p, i) => <Ball key={i} p={p as V3} r={0.2} m={MAT.white} />)}
      </Mv>
    </Mv>
    <IoLabel p={[0, 3.35, 0]} size={0.24} get={(io) => io.n('run') === 0 ? '点“开始实验”测量地表温度' : '草地 ' + fmt1(io.s('grass', 30)) + ' ℃，水泥地 ' + fmt1(io.s('concrete', 30)) + ' ℃'} />
  </group>;
}

/** 上海版独有活动装置（组 B），按 sceneVariant 索引。 */
export const SH_RIGS_B: ShRigMap = {
  'sh-drum-membrane-foam': () => <DrumMembrane />,
  'sh-simple-instrument': () => <SimpleInstrument />,
  'sh-water-lens-eye': () => <WaterLens />,
  'sh-hand-temperature-sense': () => <HandTemperature />,
  'sh-syringe-low-pressure-boiling': () => <SyringeBoil />,
  'sh-iodine-sublimation': () => <IodineSublimation />,
  'sh-wood-copper-conduction': () => <WoodCopper />,
  'sh-heat-island-surface-temperature': () => <HeatIsland />,
};

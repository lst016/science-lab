import { useMemo } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, Label, MAT, Tube, liquidMat as liquidMatLocal } from '../kit';
import { Cord, GlassBox, IBox, Liquid, Mv, Slotted, Ticks, WATER } from './mechanical-parts';
import { IoLabel } from './parts';
import { clamp, mapRange, type RigIO } from './io';
import type { ShRigMap } from './sh-types';

// 固定材质在模块级创建一次，避免重渲染时重复分配。
const SKIN_MAT = new THREE.MeshStandardMaterial({ color: '#e7b49a', roughness: 0.8 });
const ERASER_MAT = new THREE.MeshStandardMaterial({ color: '#e98aa0', roughness: 0.9 });
const CARD_MAT = new THREE.MeshStandardMaterial({ color: '#d9c88d', roughness: 0.6 });

const SAND = new THREE.MeshStandardMaterial({ color: '#d9bd84', roughness: 1 });
const PIT = new THREE.MeshStandardMaterial({ color: '#a98a55', roughness: 1 });
const ARROW = new THREE.MeshStandardMaterial({ color: '#c8402f', roughness: 0.5 });
const ARROW_B = new THREE.MeshStandardMaterial({ color: '#3f6ea6', roughness: 0.5 });
const TUBE_W = liquidMatLocal('#4f9fc8', 0.75);
const BOTTLE = new THREE.MeshPhysicalMaterial({ color: '#9fd0e6', transparent: true, opacity: 0.55, roughness: 0.15, depthWrite: false });
const BALL_W = new THREE.MeshStandardMaterial({ color: '#f6f1e4', roughness: 0.4 });

/** 沿 +y 的箭头（原点在箭尾），长度用 scale.y 控制时请包在 Mv 里。 */
function Arrow({ m = ARROW, r = 0.035 }: { m?: THREE.Material; r?: number }) {
  return <group>
    <Cyl p={[0, 0.4, 0]} r={r} h={0.8} m={m} seg={10} />
    <mesh position={[0, 0.9, 0]} material={m}><coneGeometry args={[r * 2.6, 0.2, 12]} /></mesh>
  </group>;
}

/** 半球壳：开口朝 -x（side=1）或 +x（side=-1） */
function Hemi({ r, side }: { r: number; side: 1 | -1 }) {
  return <mesh rotation={[0, 0, side === 1 ? -Math.PI / 2 : Math.PI / 2]} material={MAT.brass} castShadow>
    <sphereGeometry args={[r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
  </mesh>;
}

/* ---------- 马德堡半球 ---------- */
function Magdeburg() {
  const R = 0.62, Y = 1.55;
  return <group>
    <IBox p={[0, 0.06, 0]} s={[3.6, 0.12, 1.0]} m={MAT.wood} />
    {[1, -1].map(side => <Mv key={side} upd={(g, io) => { g.position.set(side * (0.01 + io.damp('gap', io.s('gap', 0), 6) * 0.45), Y, 0); }}>
      <Hemi r={R} side={side as 1 | -1} />
      <mesh rotation={[0, Math.PI / 2, 0]} material={MAT.darkSteel}><torusGeometry args={[R, 0.045, 8, 32]} /></mesh>
      <Cyl p={[side * (R + 0.12), 0, 0]} r={0.05} h={0.24} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />
      <mesh position={[side * (R + 0.36), 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.steel}><torusGeometry args={[0.16, 0.035, 8, 24]} /></mesh>
      {side === 1 && <group position={[0.25, R - 0.02, 0]}><Cyl p={[0, 0.1, 0]} r={0.06} h={0.2} m={MAT.darkSteel} /><Box p={[0, 0.24, 0]} s={[0.2, 0.05, 0.06]} m={MAT.red} /></group>}
      <Mv p={[side * (R + 0.55), 0, 0]} rot={[0, 0, -side * Math.PI / 2]} upd={(g, io) => { const k = io.damp('pull', io.s('pullK', 0), 6); g.scale.set(1, Math.max(0.01, k * mapRange(io.p('pull', 300), 0, 800, 0.2, 1.05)), 1); g.visible = k > 0.02; }}>
        <Arrow />
      </Mv>
    </Mv>)}
    {/* 大气压力：从四周指向球心，长度随内外压差 */}
    {[0, 1, 2, 3, 4, 5, 6, 7].filter(i => i !== 2).map(i => { const a = Math.PI / 8 + i * Math.PI / 4; const x = Math.cos(a), y = Math.sin(a);
      return <Mv key={i} p={[x * (R + 0.5), Y + y * (R + 0.5), 0.15]} rot={[0, 0, Math.atan2(-y, -x) - Math.PI / 2]} upd={(g, io) => { g.scale.setScalar(0.22 + clamp(io.s('dp', 80) / 101.3, 0, 1) * 0.26); g.visible = io.s('gap', 0) < 0.3; }}>
        <Arrow m={ARROW_B} r={0.04} />
      </Mv>; })}
    <Label p={[0.25, Y + R + 0.48, 0.2]} text="抽气阀" size={0.22} />
    <Label p={[-1.15, Y - 0.42, 0.4]} text="拉环" size={0.22} />
    <Mv upd={(g, io) => { g.visible = io.s('pullK', 0) > 0.05; }}><Label p={[1.75, Y + 0.3, 0.4]} text="拉力" size={0.22} color="#a8321f" /></Mv>
    <Label p={[-1.35, Y + 1.0, 0.4]} text="大气压力" size={0.22} color="#2f5888" />
    <IoLabel p={[0, 3.3, 0.3]} size={0.24} get={io => io.sb('separated', false) ? `拉力 ${io.p('pull', 300).toFixed(0)} N > ${io.s('need', 0).toFixed(0)} N 拉开` : `需每侧 ${io.s('need', 0).toFixed(0)} N 才能拉开`} />
  </group>;
}

/* ---------- 倒插水槽的玻璃管 ---------- */
function InvertedTube() {
  const X = -0.3, SURF = 0.62, BOT = 0.28;
  // 显示高度按比例压缩，12 m 时管顶约 y=2.67，与顶部状态文字（y=3.35）留出间距。
  const top = (io: RigIO) => SURF + mapRange(io.p('length', 0.5), 0.2, 12, 0.9, 2.05);
  return <group>
    <GlassBox p={[X, 0.04, 0]} w={2.6} d={1.2} h={0.75} />
    <Liquid p={[X, 0.07, 0]} w={2.5} d={1.1} level={() => SURF - 0.07} />
    {/* 玻璃管：底端浸在水中，顶端封闭 */}
    <Mv p={[0, 0, 0]} upd={(g, io) => { const t = top(io); g.position.set(X, (t + BOT) / 2, 0); g.scale.set(1, t - BOT, 1); }}>
      <Cyl r={0.16} h={1} m={MAT.glass} seg={20} />
    </Mv>
    <Mv upd={(g, io) => { g.position.set(X, top(io) + 0.02, 0); }}><Cyl r={0.165} h={0.04} m={MAT.glass} /></Mv>
    {/* 管中水柱：从管底到 SURF + frac·(顶−SURF) */}
    <Mv upd={(g, io) => { const t = top(io); const f = io.damp('frac', io.s('frac', 1), 3); const y1 = SURF + f * (t - SURF); g.position.set(X, BOT, 0); g.scale.set(0.14, Math.max(0.01, y1 - BOT), 0.14); }}>
      <mesh material={TUBE_W} renderOrder={1}><cylinderGeometry args={[1, 1, 1, 20]} /></mesh>
    </Mv>
    <Mv upd={(g, io) => { const t = top(io); const f = io.damp('frac2', io.s('frac', 1), 3); g.visible = f < 0.97; g.position.set(X + 0.55, (SURF + f * (t - SURF) + t) / 2, 0.2); }}>
      <Label text="真空" size={0.22} color="#a8321f" />
    </Mv>
    {/* 手指堵住管口：松手后移开 */}
    <Mv upd={(g, io) => { const k = io.damp('finger', io.sb('released', false) ? 1 : 0, 4); g.position.set(X + k * 0.5, BOT - 0.07, 0.05 + k * 0.3); g.visible = k < 0.9; }}>
      <Box s={[0.34, 0.1, 0.3]} m={SKIN_MAT} />
    </Mv>
    {/* 竖直标尺：从水面量起 */}
    <Box p={[0.75, 1.62, 0]} s={[0.05, 2.0, 0.05]} m={MAT.darkWood} />
    <Ticks p={[0.78, SURF, 0]} n={10} dy={0.2} len={0.14} />
    <Label p={[1.25, 0.7, 0.2]} text="水面" size={0.2} />
    <Label p={[X - 1.35, 1.05, 0.3]} text="水槽" size={0.22} />
    <Label p={[X - 0.7, 2.0, 0.3]} text="玻璃管" size={0.22} />
    <IoLabel p={[0, 3.35, 0.3]} size={0.24} get={io => `管长 ${io.p('length', 0.5).toFixed(1)} m · 水柱 ${io.s('column', 0.5).toFixed(2)} m`} />
    <Label p={[1.55, 2.55, 0.3]} text="高度按比例压缩" size={0.18} color="#6a5a48" />
  </group>;
}

/* ---------- 粗细不同的水平管 ---------- */
function Venturi() {
  const PY = 0.55, RA = 0.17, SC = 2.3 / 40;
  const tubes: [number, string, string][] = [[-1.0, 'ha', 'a'], [0.25, 'hb', 'b'], [1.4, 'hc', 'c']];
  const dots = Array.from({ length: 9 }, (_, i) => i);
  return <group>
    {/* 蓄水容器 */}
    <GlassBox p={[-1.95, 0.04, 0]} w={0.75} d={0.8} h={PY + 2.45} />
    <Liquid p={[-1.95, 0.07, 0]} w={0.68} d={0.72} level={io => PY - 0.03 + io.p('head', 25) * SC} />
    {/* 水平管三段 */}
    <Cyl p={[-1.0, PY, 0]} r={RA} h={1.3} rot={[0, 0, Math.PI / 2]} m={MAT.glass} />
    <Cyl p={[-1.0, PY, 0]} r={RA * 0.85} h={1.3} rot={[0, 0, Math.PI / 2]} m={WATER} />
    {[[0.25, 'b'], [1.4, 'c']].map(([x, w]) => <Mv key={w as string} p={[x as number, PY, 0]} upd={(g, io) => { const r = io.p('ratio', 0.5); const a = w === 'b' ? (1 + r) / 2 : r; const s = Math.sqrt(a); g.scale.set(1, s, s); }}>
      <Cyl r={RA} h={1.2} rot={[0, 0, Math.PI / 2]} m={MAT.glass} />
      <Cyl r={RA * 0.85} h={1.2} rot={[0, 0, Math.PI / 2]} m={WATER} />
    </Mv>)}
    {/* 出口与阀门 */}
    <Cyl p={[2.15, PY, 0]} r={RA * Math.sqrt(0.3)} h={0.3} rot={[0, 0, Math.PI / 2]} m={MAT.glass} />
    <Mv p={[2.12, PY + 0.14, 0]} upd={(g, io) => { g.rotation.y = io.damp('valve', io.sb('open', false) ? Math.PI / 2 : 0, 6); }}>
      <Box s={[0.05, 0.05, 0.3]} m={MAT.red} />
    </Mv>
    <Mv upd={(g, io) => { g.visible = io.sb('open', false); }}>
      <Tube pts={[[2.3, PY, 0], [2.38, PY - 0.2, 0], [2.4, 0.08, 0]]} r={0.035} m={WATER} />
    </Mv>
    {/* 竖直细管及液柱 */}
    {tubes.map(([x, key, name]) => <group key={key}>
      <Cyl p={[x, PY + 1.2, 0]} r={0.065} h={2.3} m={MAT.glass} seg={14} />
      <Liquid p={[x, PY, 0]} w={0.045} round mat={TUBE_W} level={io => Math.max(0.02, io.damp(key, io.s(key, io.p('head', 25)), 2.5) * SC)} />
      <Label p={[x + 0.18, PY + 2.45, 0.1]} text={name} size={0.24} />
    </group>)}
    {/* 流动示意点：速度与截面成反比 */}
    {dots.map(i => { const seg = Math.floor(i / 3); const x0 = [-1.6, -0.3, 0.85][seg];
      return <Mv key={i} upd={(g, io) => { const v = io.s(['va', 'vb', 'vc'][seg], 0); g.visible = io.sb('open', false); const ph = ((i % 3) / 3 + io.t * v * 0.6) % 1; g.position.set(x0 + ph * 1.1, PY, 0.02); }}>
        <Ball r={0.035} m={MAT.blue} />
      </Mv>; })}
    <Label p={[-1.95, PY + 2.7, 0.2]} text="蓄水容器" size={0.22} />
    <Label p={[0.25, 0.12, 0.45]} text="粗细不同的水平管" size={0.2} />
    <IoLabel p={[0.2, 3.45, 0.2]} size={0.22} get={io => `a ${io.s('ha', 0).toFixed(1)} · b ${io.s('hb', 0).toFixed(1)} · c ${io.s('hc', 0).toFixed(1)} cm`} />
  </group>;
}

/* ---------- 无底瓶中的乒乓球 ---------- */
function BottomlessBottle() {
  const X = -0.6, NECK = 0.2, SH = 0.92, BODY = 0.55, TOP = 2.75, MOUTH = 0.52;
  const geo = useMemo(() => new THREE.LatheGeometry([[0.135, MOUTH], [0.135, 0.7], [0.2, 0.74], [BODY, SH], [BODY, TOP]].map(([x, y]) => new THREE.Vector2(x, y)), 32), []);
  const ballR = 0.21, seatY = 0.88;
  const surf = (io: RigIO) => SH + io.damp('lvl', io.s('level', 0), 3) * 0.12;
  return <group>
    {/* 接水盆与支架 */}
    <GlassBox p={[X, 0.02, 0]} w={1.3} d={1.0} h={0.32} />
    <Mv upd={(g, io) => { g.visible = io.sb('leaking', false); g.scale.y = io.damp('basin', io.sb('leaking', false) ? 1 : 0, 0.5); }}><Box p={[X, 0.1, 0]} s={[1.2, 0.12, 0.9]} m={WATER} /></Mv>
    <IBox p={[0.55, 0.06, 0]} s={[0.5, 0.12, 0.5]} m={MAT.darkSteel} />
    <Cyl p={[0.55, 1.15, 0]} r={0.04} h={2.2} />
    <Box p={[0.05, 1.8, 0]} s={[1.0, 0.06, 0.06]} m={MAT.steel} />
    <mesh position={[X, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.steel}><torusGeometry args={[BODY + 0.04, 0.03, 8, 30]} /></mesh>
    <mesh geometry={geo} position={[X, 0, 0]} material={MAT.glass} renderOrder={2} />
    {/* 瓶中的水：瓶身段 + 肩部（瓶颈只在拧上瓶盖后有水） */}
    <Mv upd={(g, io) => { const y = surf(io); g.position.set(X, SH, 0); g.scale.set(1, Math.max(0.001, y - SH), 1); g.visible = y > SH + 0.01; }}>
      <mesh material={WATER} renderOrder={1}><cylinderGeometry args={[BODY - 0.03, BODY - 0.03, 1, 28]} /></mesh>
    </Mv>
    <Mv upd={(g, io) => { g.visible = io.s('level', 0) > 0.2; }}>
      <Cyl p={[X, 0.83, 0]} r={0.2} rt={BODY - 0.03} h={0.18} m={WATER} />
    </Mv>
    <Mv upd={(g, io) => { g.visible = io.sb('capped', false) && io.s('level', 0) > 0.5; }}>
      <Cyl p={[X, 0.62, 0]} r={0.12} h={0.2} m={WATER} />
    </Mv>
    {/* 瓶盖 */}
    <Mv upd={(g, io) => { g.visible = io.sb('capped', false); }}>
      <Cyl p={[X, MOUTH - 0.06, 0]} r={0.16} h={0.14} m={MAT.blue} />
    </Mv>
    {/* 漏水滴 */}
    {[0, 1, 2].map(i => <Mv key={i} upd={(g, io) => { const on = io.sb('leaking', false); g.visible = on; const ph = (io.t * 1.4 + i / 3) % 1; g.position.set(X, MOUTH - 0.05 - ph * 0.25, 0); }}>
      <Ball r={0.035} m={WATER} />
    </Mv>)}
    {/* 乒乓球 */}
    <Mv upd={(g, io) => { const up = io.sb('floatUp', false); const target = up ? surf(io) - ballR * 0.35 : seatY; g.position.set(X, io.damp('ball', target, up ? 1.5 : 6), 0); }}>
      <Ball r={ballR} m={BALL_W} />
      <Label p={[0.72, 0.05, 0.3]} text="乒乓球" size={0.22} />
    </Mv>
    <Label p={[X - 1.0, 2.2, 0.3]} text="无底瓶" size={0.22} />
    <Mv upd={(g, io) => { g.visible = io.sb('capped', false); }}><Label p={[X - 0.65, 0.3, 0.6]} text="瓶盖" size={0.2} /></Mv>
    <Mv upd={(g, io) => { g.visible = !io.sb('capped', false); }}><Label p={[X - 0.85, 0.35, 0.6]} text="漏水" size={0.2} color="#2f5888" /></Mv>
    <IoLabel p={[0, 3.3, 0.3]} size={0.24} get={io => io.sb('floatUp', false) ? '下方有水 → 有浮力 → 上浮' : io.sb('capped', false) ? '拧上瓶盖，球下方将充满水' : '下方无水 → 无浮力 → 不上浮'} />
  </group>;
}

/* ---------- 浮沉子 ---------- */
function Diver() {
  const X = -0.55, R = 0.6, WTOP = 2.45;
  const geo = useMemo(() => new THREE.LatheGeometry([[0, 0.08], [R, 0.08], [R, 2.6], [0.3, 2.85], [0.2, 2.95], [0.2, 3.1]].map(([x, y]) => new THREE.Vector2(x, y)), 32), []);
  return <group>
    <Mv upd={(g, io) => { const k = io.damp('sq', io.sb('squeezing', false) ? 1 : 0, 8); g.scale.set(1 - 0.05 * k, 1, 1 - 0.05 * k); g.position.x = X * 0.05 * k; }}>
      <mesh geometry={geo} position={[X, 0, 0]} material={MAT.glass} renderOrder={2} />
      <Cyl p={[X, 0.08 + (WTOP - 0.08) / 2, 0]} r={R - 0.03} h={WTOP - 0.08} m={WATER} />
      <Cyl p={[X, 3.16, 0]} r={0.23} h={0.14} m={MAT.blue} />
    </Mv>
    {/* 手：挤压时向瓶身靠拢 */}
    {[-1, 1].map(s => <Mv key={s} upd={(g, io) => { const k = io.damp('hand' + s, io.sb('squeezing', false) ? 1 : 0, 8); g.position.set(X + s * (R + 0.28 - k * 0.12), 1.3, 0); }}>
      <Box s={[0.22, 0.7, 0.5]} m={SKIN_MAT} />
    </Mv>)}
    {/* 浮沉子：开口朝下的小瓶，内有水和空气 */}
    <Mv upd={(g, io) => { const y = io.damp('diverY', io.sb('sink', false) ? 0.35 : 2.0, 1.2); g.position.set(X, y, 0); }}>
      <Cyl p={[0, 0.25, 0]} r={0.14} h={0.5} m={MAT.glass} />
      <Cyl p={[0, 0.52, 0]} r={0.14} h={0.04} m={MAT.glass} />
      <Mv upd={(g, io) => { const w = clamp(io.s('waterIn', 0.33), 0, 1); g.scale.set(1, Math.max(0.01, w * 0.5), 1); }}>
        <mesh position={[0, 0.5, 0]} material={WATER}><cylinderGeometry args={[0.12, 0.12, 1, 16]} /></mesh>
      </Mv>
    </Mv>
    {/* 浮力与重力对比条 */}
    <Box p={[1.35, 0.06, 0]} s={[1.4, 0.12, 0.6]} m={MAT.wood} />
    {[[1.0, 'fb', ARROW_B, '浮力'], [1.7, 'weight', ARROW, '重力']].map(([x, k, m, name]) => <group key={k as string}>
      <Mv p={[x as number, 0.12, 0]} upd={(g, io) => { g.scale.y = Math.max(0.01, io.damp('bar' + k, io.s(k as string, 0.08), 6) / 0.12 * 2.3); }}>
        <Box p={[0, 0.5, 0]} s={[0.32, 1, 0.32]} m={m as THREE.Material} />
      </Mv>
      <Label p={[x as number, -0.0 + 0.32, 0.4]} text={name as string} size={0.2} color="#fff" bg="rgba(40,30,20,.55)" />
    </group>)}
    <Label p={[X + 0.95, 2.35, 0.4]} text="浮沉子" size={0.22} />
    <IoLabel p={[0, 3.45, 0.3]} size={0.22} get={io => `空气 ${io.s('vair', 5).toFixed(2)} cm³ · ${io.sb('sink', false) ? '下沉' : '上浮'}`} />
  </group>;
}

/* ---------- 小帆船 ---------- */
function Sailboat() {
  // 船体从 x−0.5 到 x+0.77；dist 0→2 m 映射到 x −1.3→1.3，船头距水池右壁（2.25）留约 0.18 边距。
  const boatX = (io: RigIO, key: string) => -1.3 + clamp(io.damp(key, io.s('dist', 0), 3), 0, 2) * 1.3;
  return <group>
    <IBox p={[0, 0.1, 0]} s={[4.7, 0.2, 2.2]} m={MAT.darkWood} />
    <Box p={[0, 0.27, 0]} s={[4.5, 0.14, 2.0]} m={WATER} cast={false} />
    {/* 风扇 */}
    <group position={[-2.1, 0.7, 0]}>
      <Cyl p={[0, -0.25, 0]} r={0.04} h={0.5} m={MAT.darkSteel} />
      <mesh rotation={[0, Math.PI / 2, 0]} material={MAT.steel}><torusGeometry args={[0.3, 0.025, 6, 24]} /></mesh>
      <Mv upd={(g, io) => { g.rotation.x = io.n('run') > 0 ? io.t * io.p('wind', 3) * 4 : 0; }}>
        {[0, 1, 2].map(i => <Box key={i} s={[0.03, 0.5, 0.1]} rot={[i * Math.PI / 3, 0, 0]} m={MAT.blue} />)}
      </Mv>
    </group>
    <Mv upd={(g, io) => { g.position.set(boatX(io, 'dist'), 0.36, 0); g.rotation.x = io.damp('heel', io.s('heel', 0), 2.5); }}>
      <BoatHull />
    </Mv>
    <Label p={[-2.05, 1.25, 0.3]} text="风扇" size={0.2} />
    <Mv upd={(g, io) => { g.position.x = boatX(io, 'distL'); }}><Label p={[0.5, 0.95, 0.6]} text="瓶身浮筒" size={0.2} /></Mv>
    {/* 标签贴在水池前沿外侧，低于船体，航行时不被遮住 */}
    <Label p={[1.85, 0.1, 1.3]} text="水池" size={0.2} />
    <IoLabel p={[0.2, 3.35, 0.3]} size={0.22} get={io => io.sb('capsize', false) ? '单瓶船倾覆' : `倾角 ${(io.s('heel', 0) * 57.3).toFixed(1)}° · 航行 ${io.s('dist', 0).toFixed(2)} m`} />
  </group>;
}
function BoatHull() {
  const bottle = (z: number, key: string) => <group key={key} position={[0, 0, z]}>
    <Cyl r={0.17} h={1.0} rot={[0, 0, Math.PI / 2]} m={BOTTLE} />
    <Cyl p={[0.6, 0, 0]} r={0.17} rt={0.07} h={0.2} rot={[0, 0, -Math.PI / 2]} m={MAT.plastic} />
    <Cyl p={[0.73, 0, 0]} r={0.075} h={0.08} rot={[0, 0, Math.PI / 2]} m={MAT.blue} />
  </group>;
  return <group>
    {/* 单瓶时隐藏两侧浮筒与甲板 */}
    {bottle(0, 'c')}
    <Mv upd={(g, io) => { g.visible = !io.sb('single', false) && io.idx('hull', 0) === 0; }}>
      {bottle(0.55, 'l')}{bottle(-0.55, 'r')}
      <Box p={[-0.1, 0.19, 0]} s={[0.5, 0.03, 1.3]} m={MAT.card} />
    </Mv>
    <Mv upd={(g, io) => { const h = io.p('sail', 20) / 100; g.scale.y = h / 0.2; }}>
      <Cyl p={[0, 0.85, 0]} r={0.025} h={1.3} m={MAT.wood} />
      <Box p={[-0.06, 0.85, 0]} s={[0.015, 1.0, 0.7]} m={MAT.white} />
    </Mv>
  </group>;
}

/* ---------- 用硬棒撬课本 ---------- */
function PryBook() {
  const S = 0.11, LOAD = 0.95, TY = 0.12, ER = 0.3;
  const fx = (io: RigIO) => LOAD - io.p('l2', 4) * S;
  const ang = (io: RigIO) => io.damp('ang', io.s('angle', 0), 5) * Math.asin(clamp((ER - 0.03) / Math.max(0.5, io.s('l1', 25) * S), 0, 0.5));
  return <group>
    <IBox p={[0, TY / 2, 0]} s={[4.8, TY, 1.6]} m={MAT.wood} />
    {/* 橡皮（支点） */}
    <Mv upd={(g, io) => { g.position.set(fx(io), TY + ER / 2, 0); }}>
      <Box s={[0.32, ER, 0.5]} m={ERASER_MAT} />
      <Label p={[0, -0.02, 0.55]} text="支点 O" size={0.2} />
    </Mv>
    {/* 硬棒：绕支点转动 */}
    <Mv upd={(g, io) => { g.position.set(fx(io), TY + ER + 0.02, 0); g.rotation.z = ang(io); }}>
      <Mv upd={(g, io) => { const len = (io.idx('tool', 0) === 1 ? 17 : 30) * S; const l2 = io.p('l2', 4) * S + 0.1; g.position.x = l2 - len / 2; g.scale.x = len; }}>
        <Box s={[1, 0.035, 0.22]} m={CARD_MAT} />
      </Mv>
      {/* 动力 F1（在左端向下）：箭头长度按 ln(1+F1) 压缩并封顶，大力时不伸出书页，大小关系仍单调 */}
      <Mv upd={(g, io) => { const len = (io.idx('tool', 0) === 1 ? 17 : 30) * S; const l2 = io.p('l2', 4) * S + 0.1; const a = Math.min(1.5, 0.25 + 0.6 * Math.log1p(Math.max(0, io.s('F1', 0.5)))); g.position.set(l2 - len + 0.08, 0.06 + a, 0); g.scale.y = a; g.visible = io.sb('active', false); }}>
        <group rotation={[0, 0, Math.PI]}><Arrow /></group>
      </Mv>
    </Mv>
    {/* 课本：左边被撬起，绕右侧底边转动 */}
    <Mv upd={(g, io) => { const lift = Math.sin(ang(io)) * io.p('l2', 4) * S * 1.05; g.position.set(2.45, TY + ER + 0.04, 0); g.rotation.z = -Math.atan2(lift, 1.6); }}>
      <group position={[-0.8, 0.14, 0]}>
        <IBox s={[1.6, 0.28, 1.2]} m={MAT.blue} />
        <Box p={[0.02, 0, 0]} s={[1.56, 0.24, 1.21]} m={MAT.white} />
      </group>
    </Mv>
    <Label p={[1.65, 0.98, 0.5]} text="课本" size={0.22} />
    <Label p={[-1.6, 0.85, 0.5]} text="动力 F1" size={0.2} color="#a8321f" />
    <Label p={[0.2, 0.92, 0.5]} text="阻力 F2" size={0.2} color="#2f5888" />
    <IoLabel p={[0, 3.2, 0.3]} size={0.24} get={io => `F1·l1 = F2·l2 → F1 = ${io.s('F1', 0).toFixed(2)} N`} />
  </group>;
}

/* ---------- 重物落入沙中 ---------- */
function SandDrop() {
  const SANDTOP = 0.62, X = -0.2;
  const rad = (io: RigIO) => 0.16 * Math.cbrt(io.p('mass', 0.2) / 0.2);
  return <group>
    <IBox p={[X, 0.08, 0]} s={[2.6, 0.16, 1.4]} m={MAT.darkWood} />
    <Box p={[X, 0.38, 0]} s={[2.4, 0.48, 1.2]} m={SAND} />
    {/* 沙坑 */}
    <Mv upd={(g, io) => { const d = io.sb('landed', false) ? io.s('depth', 0) * 0.06 : 0; const r = rad(io) * 1.35; g.position.set(X, SANDTOP + 0.005, 0); g.scale.set(r, 1, r); g.visible = d > 0; }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={PIT}><circleGeometry args={[1, 24]} /></mesh>
    </Mv>
    {/* 重物 */}
    <Mv upd={(g, io) => { const r = rad(io); const y0 = SANDTOP + io.p('height', 0.5) * 2.4 + r; const yLand = SANDTOP + r; const f = io.s('fall', 0); let y = y0 + (yLand - y0) * f; if (io.sb('landed', false)) y = yLand - io.damp('sink', io.s('depth', 0) * 0.06, 8); g.position.set(X, y, 0); g.scale.setScalar(r / 0.16); }}>
      <Cyl r={0.16} h={0.32} m={MAT.darkSteel} />
      <Cyl p={[0, 0.2, 0]} r={0.03} h={0.08} m={MAT.steel} />
    </Mv>
    {/* 高度标尺 */}
    <Box p={[1.55, 1.85, 0]} s={[0.06, 2.5, 0.06]} m={MAT.darkWood} />
    <Ticks p={[1.59, SANDTOP, 0]} n={10} dy={0.24} len={0.14} />
    <Mv upd={(g, io) => { g.position.set(1.55, SANDTOP + io.p('height', 0.5) * 2.4 + 0.16, 0); }}><Box s={[0.3, 0.03, 0.12]} m={ARROW} /></Mv>
    <Label p={[1.95, 0.75, 0.2]} text="0 m" size={0.2} />
    <Label p={[1.95, 3.0, 0.2]} text="1 m" size={0.2} />
    <Label p={[X - 0.9, 0.38, 0.75]} text="沙盘" size={0.22} />
    <IoLabel p={[0, 3.4, 0.3]} size={0.23} get={io => `Ep = mgh = ${(io.p('mass', 0.2) * 9.8 * io.p('height', 0.5)).toFixed(2)} J` + (io.sb('landed', false) ? ` · 陷入 ${io.s('depth', 0).toFixed(1)} cm` : '')} />
  </group>;
}

/* ---------- 斜拉桥主桥模型 ---------- */
function Bridge() {
  const DY = 1.0, TX = 1.4, S = 0.01;
  const sag = (io: RigIO) => io.damp('sag', io.s('sag', 0), 4);
  const deckY = (io: RigIO, x: number) => DY - sag(io) * (1 - Math.abs(x) / TX) * (io.sb('broken', false) ? 1.0 : 0.6);
  const towerTop = (io: RigIO) => DY + io.p('tower', 100) * S * 1.2;
  return <group>
    {/* 两侧桥墩 */}
    {[-1, 1].map(s => <IBox key={s} p={[s * 1.95, DY / 2, 0]} s={[0.7, DY, 0.8]} m={MAT.white} />)}
    {/* 边跨桥面 */}
    {[-1, 1].map(s => <Box key={s} p={[s * 1.85, DY + 0.02, 0]} s={[0.9, 0.04, 0.55]} m={MAT.card} />)}
    {/* 主跨两半：各绕桥塔脚转动 */}
    {[-1, 1].map(s => <Mv key={s} upd={(g, io) => { g.position.set(s * TX, DY + 0.02, 0); g.rotation.z = s * Math.atan2(DY - deckY(io, 0), TX); }}>
      <Box p={[-s * TX / 2, 0, 0]} s={[TX, 0.04, 0.55]} m={MAT.card} />
    </Mv>)}
    {/* 桥塔（卡纸折成的门形） */}
    {[-1, 1].map(s => <Mv key={s} upd={(g, io) => { const h = towerTop(io) - DY; g.position.set(s * TX, DY, 0); g.scale.y = h; }}>
      {[-0.22, 0.22].map(z => <Box key={z} p={[0, 0.5, z]} s={[0.08, 1, 0.06]} m={MAT.white} />)}
      <Box p={[0, 1, 0]} s={[0.08, 0.05, 0.5]} m={MAT.white} />
    </Mv>)}
    {/* 斜拉索：主跨侧与边跨侧 */}
    {[-1, 1].flatMap(s => [-0.22, 0.22].flatMap(z => [
      <Cord key={`m${s}${z}`} r={0.012} color="#2b2622" ends={io => { const xa = s * (TX - io.p('anchor', 140) * S); return [[s * TX, towerTop(io), z], [xa, deckY(io, xa) + 0.02, z]]; }} />,
      <Cord key={`b${s}${z}`} r={0.012} color="#2b2622" ends={io => [[s * TX, towerTop(io), z], [s * (TX + io.p('anchor', 140) * S * 0.6), DY + 0.04, z]]} />,
    ]))}
    {/* 钩码叠放在桥面中心 */}
    {Array.from({ length: 10 }, (_, i) => <Mv key={i} upd={(g, io) => { g.visible = io.sb('loaded', false) && i < io.s('hooks', 0); g.position.set(0, deckY(io, 0) + 0.04 + i * 0.1, 0); }}>
      <Slotted r={0.13} h={0.09} />
    </Mv>)}
    <Label p={[-TX - 0.45, 2.45, 0.3]} text="桥塔" size={0.22} />
    <Label p={[-0.75, 2.05, 0.3]} text="斜拉索" size={0.22} />
    <Label p={[0.8, 0.72, 0.45]} text="主梁 280 mm" size={0.2} />
    <Mv upd={(g, io) => { g.visible = io.sb('loaded', false); }}><Label p={[0.42, 1.55, 0.3]} text="钩码" size={0.2} /></Mv>
    <IoLabel p={[0, 3.35, 0.3]} size={0.23} get={io => io.sb('broken', false) ? `拉力 ${io.s('tension', 0).toFixed(1)} N 超限，桥面塌陷` : `每根拉索拉力 ${io.s('tension', 0).toFixed(2)} N`} />
  </group>;
}

/** 上海版独有活动装置（组 A2），按 sceneVariant 索引。 */
export const SH_RIGS_A2: ShRigMap = {
  'sh-magdeburg-hemispheres': () => <Magdeburg />,
  'sh-inverted-water-tube': () => <InvertedTube />,
  'sh-venturi-tube': () => <Venturi />,
  'sh-pingpong-bottomless-bottle': () => <BottomlessBottle />,
  'sh-cartesian-diver': () => <Diver />,
  'sh-sailboat-model': () => <Sailboat />,
  'sh-pry-book-lever': () => <PryBook />,
  'sh-sand-drop-potential-energy': () => <SandDrop />,
  'sh-cable-stayed-bridge': () => <Bridge />,
};

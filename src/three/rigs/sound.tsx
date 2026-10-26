import { useRef } from 'react';
import * as THREE from 'three';
import type { Experiment } from '../../data/types';
import { Ball, Box, Cyl, DynLine, Label, MAT, Vessel } from '../kit';
import { Fork, IoLabel, Rings, Scope, Speaker, Swarm } from './parts';
import { clamp, evTime, useOptIndex, useRig } from './io';

/* 说明：声音的真实频率（几十到上千 Hz）肉眼看不到，
   场景中的振动用「慢放」的视觉频率表示，波形图的周期数与真实频率成比例。 */

const slow = (f: number) => 1.5 + clamp(f, 40, 800) / 160; // 慢放视觉频率 Hz

function RubberBand() {
  const ampRef = useRef(0);
  const freq = useRef(150);
  const clock = useRef(0);
  useRig((io) => {
    clock.current = io.t;
    const pluck = io.p('pluck', 8);
    const tension = io.p('tension', 60);
    freq.current = io.s('frequency', 120 + 20 * (tension / 10));
    const e = evTime(io, 'run');
    ampRef.current = e > 0 ? (pluck / 20) * Math.exp(-e / 2.2) : 0;
  });
  const L = 1.8;
  return (
    <group>
      {/* 木盒（开口朝上）：前后左右四壁 */}
      <Box p={[0, 0.06, 0]} s={[2.6, 0.12, 1.5]} m={MAT.wood} />
      <Box p={[0, 0.4, 0.7]} s={[2.6, 0.6, 0.1]} m={MAT.wood} />
      <Box p={[0, 0.4, -0.7]} s={[2.6, 0.6, 0.1]} m={MAT.wood} />
      <Box p={[-1.25, 0.4, 0]} s={[0.1, 0.6, 1.5]} m={MAT.wood} />
      <Box p={[1.25, 0.4, 0]} s={[0.1, 0.6, 1.5]} m={MAT.wood} />
      <Box p={[0, 0.34, 0]} s={[2.3, 0.02, 1.2]} m={MAT.darkWood} cast={false} />
      <Cyl p={[-L / 2, 0.72, 0]} r={0.05} h={0.2} m={MAT.brass} />
      <Cyl p={[L / 2, 0.72, 0]} r={0.05} h={0.2} m={MAT.brass} />
      <DynLine n={48} r={0.022} color="#d44a3a" fill={(pts, n) => {
        const a = ampRef.current;
        const ph = clock.current;
        for (let i = 0; i <= n; i++) {
          const x = i / n;
          pts[i * 3] = -L / 2 + x * L;
          pts[i * 3 + 1] = 0.76 + a * 0.4 * Math.sin(Math.PI * x) * Math.sin(ph * 2 * Math.PI * slow(freq.current));
          pts[i * 3 + 2] = 0;
        }
      }} />
      <Rings p={[0, 0.85, 0.9]} rot={[0, 0, 0]} amp={() => ampRef.current} maxR={1.6} speed={0.7} />
      <Scope p={[0, 1.55, -2.1]} w={2.6} h={1.1} wave={(x, io) => Math.sin(x * Math.PI * 2 * (freq.current / 80) + io.t * 4) * clamp(ampRef.current * 1.4, 0, 1)} />
      <IoLabel p={[0, 0.2, 1.6]} get={() => `频率约 ${freq.current.toFixed(0)} Hz（拉得越紧越高）`} />
    </group>
  );
}

function VacuumBell() {
  const hammer = useRef<THREE.Mesh>(null);
  const needle = useRef<THREE.Mesh>(null);
  const ampRef = useRef(0);
  const clock = useRef<THREE.Group>(null);
  useRig((io) => {
    const air = io.p('air', 100) / 100;
    const amp = io.p('amplitude', 65) / 100;
    ampRef.current = amp * Math.pow(air, 1.4);
    if (hammer.current) hammer.current.rotation.z = Math.sin(io.t * 22) * 0.35;
    if (clock.current) clock.current.rotation.z = Math.sin(io.t * 22) * 0.01 * amp;
    if (needle.current) needle.current.rotation.z = 2.1 - air * 4.2;
  });
  return (
    <group>
      <Cyl p={[-0.5, 0.1, 0]} r={1.15} h={0.2} m={MAT.darkSteel} />
      <group position={[-0.5, 0.2, 0]}>
        <group ref={clock} position={[0, 0.45, 0]}>
          <Cyl p={[0, 0, 0]} r={0.4} h={0.2} rot={[Math.PI / 2, 0, 0]} m={MAT.red} />
          <Cyl p={[0, 0, 0.11]} r={0.32} h={0.02} rot={[Math.PI / 2, 0, 0]} m={MAT.white} />
          <Ball p={[-0.26, 0.38, 0]} r={0.12} m={MAT.brass} />
          <Ball p={[0.26, 0.38, 0]} r={0.12} m={MAT.brass} />
          <mesh ref={hammer} position={[0, 0.5, 0]} material={MAT.steel}><boxGeometry args={[0.04, 0.34, 0.04]} /></mesh>
        </group>
        <Vessel kind="bell" r={0.95} h={2.1} />
        <Swarm box={[1.5, 1.6, 1.5]} p={[0, 0.2, 0]} n={90} count={(io) => 90 * io.p('air', 100) / 100} jitter={(io) => 0.6 * io.p('air', 100) / 100 + 0.1} />
      </group>
      <Rings p={[-0.5, 0.9, 1.0]} rot={[0, 0, 0]} amp={() => ampRef.current} maxR={1.8} speed={0.6} />
      {/* 抽气管与抽气机 */}
      <Cyl p={[1.5, 0.45, 0.2]} r={0.5} h={0.9} m={MAT.green} />
      <Cyl p={[1.5, 1.1, 0.2]} r={0.08} h={0.7} m={MAT.steel} />
      <Box p={[1.5, 1.5, 0.2]} s={[0.7, 0.07, 0.1]} m={MAT.darkSteel} />
      <mesh position={[0.5, 0.18, 0.2]} rotation={[0, 0, Math.PI / 2]} castShadow material={MAT.rubber}>
        <cylinderGeometry args={[0.05, 0.05, 1.7, 8]} />
      </mesh>
      {/* 气压表 */}
      <group position={[1.5, 1.95, -0.6]}>
        <Cyl p={[0, 0, 0]} r={0.42} h={0.1} rot={[Math.PI / 2, 0, 0]} m={MAT.white} />
        <mesh ref={needle} position={[0, 0, 0.07]}><boxGeometry args={[0.03, 0.34, 0.02]} /><meshStandardMaterial color="#c8402f" /></mesh>
      </group>
      <IoLabel p={[1.5, 2.55, -0.6]} get={(io) => `罩内空气 ${Math.round(io.p('air', 100))}%`} />
      <Label p={[-0.5, 2.55, 0]} text="闹钟（罩内）" />
    </group>
  );
}

function TableSound() {
  const ampRef = useRef(0);
  const tap = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const force = io.p('force', 5) / 10;
    const e = evTime(io, 'run');
    const cycle = e % 1.6;
    ampRef.current = force * Math.max(0, 1 - cycle / 1.2);
    if (tap.current) tap.current.position.y = 0.72 + (cycle < 0.3 ? 0.35 * (1 - Math.abs(cycle - 0.15) / 0.15) : 0);
  });
  const d = 1; // 视觉距离
  return (
    <group>
      <Box p={[0, 0.55, 0]} s={[4.4, 0.16, 1.5]} m={MAT.wood} />
      {[-1.9, 1.9].map((x) => [-0.55, 0.55].map((z) => <Box key={`${x}${z}`} p={[x, 0.2, z]} s={[0.14, 0.62, 0.14]} m={MAT.darkWood} />))}
      <mesh ref={tap} position={[-1.6, 0.55, 0]} castShadow material={MAT.steel}><sphereGeometry args={[0.1, 12, 10]} /></mesh>
      <Rings p={[-1.6, 0.66, 0]} rot={[-Math.PI / 2, 0, 0]} amp={() => ampRef.current} maxR={1.2} speed={0.9} count={4} color="#b0733a" />
      <Rings p={[-1.6, 0.66, 0]} rot={[0, Math.PI / 2, 0]} amp={() => ampRef.current * 0.5} maxR={1.2} speed={0.9} count={3} />
      {/* 耳朵贴桌面 */}
      <group position={[1.6, 0.74, 0]}>
        <Ball p={[0, 0.1, 0]} r={0.28} m={MAT.card} />
        <Ball p={[0, 0.1, 0.24]} r={0.12} m={MAT.red} />
      </group>
      <Label p={[-1.6, 1.3, 0]} text="指节敲桌" />
      <Label p={[1.6, 1.3, 0]} text="耳朵贴桌面听" />
      <IoLabel p={[0, 1.8, 0.6]} get={(io) => `距离 ${io.p('distance', d).toFixed(1)} m，固体传声`} />
    </group>
  );
}

function RulerPitch() {
  const ampRef = useRef(0);
  const freq = useRef(100);
  const ruler = useRef<THREE.Group>(null);
  useRig((io) => {
    const over = io.p('overhang', 12);
    const pluck = io.p('pluck', 5);
    freq.current = clamp(io.s('frequency', 8000 / Math.max(1, over * over)), 40, 800);
    const e = evTime(io, 'run');
    const a = (pluck / 10) * Math.exp(-e / 1.8);
    ampRef.current = a;
    if (ruler.current) ruler.current.rotation.z = a * 0.35 * Math.sin(io.t * 2 * Math.PI * slow(freq.current));
  });
  const over = useOptIndex('overhang', 12);
  const len = 0.12 * over;
  return (
    <group>
      <Box p={[-0.6, 0.4, 0]} s={[2.6, 0.8, 1.2]} m={MAT.wood} />
      <Box p={[-1.0, 0.86, 0]} s={[1.3, 0.12, 0.7]} m={MAT.darkSteel} /> {/* 按住钢尺的重物 */}
      <group ref={ruler} position={[0.1, 0.88, 0]}>
        <Box p={[len / 2, 0, 0]} s={[len + 1.3, 0.03, 0.5]} m={MAT.steel} cast />
      </group>
      <Rings p={[1.2, 1.1, 0]} rot={[0, Math.PI / 2, 0]} amp={() => ampRef.current * 0.9} maxR={1.4} speed={0.8} />
      <Scope p={[0.4, 1.9, -2.0]} w={2.8} h={1.1} wave={(x, io) => Math.sin(x * Math.PI * 2 * (freq.current / 60) + io.t * 3) * clamp(ampRef.current, 0, 1)} />
      <Label p={[1.4, 0.2, 1.3]} text={`伸出 ${over.toFixed(0)} cm`} />
    </group>
  );
}

function TuningBall() {
  const ampRef = useRef(0);
  const ball = useRef<THREE.Group>(null);
  const bar = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const a0 = io.p('amplitude', 35) / 100;
    const e = evTime(io, 'run');
    const a = a0 * Math.exp(-e / 3.5);
    ampRef.current = a;
    if (ball.current) ball.current.rotation.z = -a * 0.9 * Math.abs(Math.sin(io.t * 18)) * 1.0;
    const dist = io.p('distance', 1);
    const loud = (a * a) / (dist * dist);
    if (bar.current) bar.current.scale.y = 0.05 + clamp(loud * 6, 0, 1.2);
  });
  return (
    <group>
      <Box p={[-0.5, 0.12, 0.2]} s={[1.1, 0.24, 0.6]} m={MAT.wood} />
      <Box p={[-0.5, 0.5, 0.2]} s={[0.7, 0.5, 0.45]} m={MAT.darkWood} />{/* 共鸣箱 */}
      <Fork p={[-0.5, 0.75, 0.2]} ampRef={ampRef} big />
      {/* 悬挂乒乓球 */}
      <Cyl p={[0.9, 1.3, -0.4]} r={0.04} h={2.6} m={MAT.steel} />
      <Box p={[0.9, 0.08, -0.4]} s={[0.8, 0.16, 0.6]} m={MAT.darkSteel} />
      <Box p={[0.35, 2.55, -0.4]} s={[1.2, 0.05, 0.05]} m={MAT.steel} />
      <group position={[0.0, 2.55, 0.2]} ref={ball}>
        <Cyl p={[0, -0.85, 0]} r={0.008} h={1.7} m={MAT.white} />
        <Ball p={[0, -1.7, 0]} r={0.2} m={MAT.white} />
      </group>
      {/* 响度示意：离音源一定距离的声级条 */}
      <group position={[1.9, 0, 1.5]}>
        <Box p={[0, 0.03, 0]} s={[0.5, 0.06, 0.5]} m={MAT.darkSteel} />
        <mesh ref={bar} position={[0, 0.06, 0]} scale={[1, 0.4, 1]}>
          <boxGeometry args={[0.3, 1, 0.3]} />
          <meshStandardMaterial color="#6fae6a" />
        </mesh>
      </group>
      <IoLabel p={[1.9, 1.7, 1.5]} get={(io) => `响度示意（距离 ${io.p('distance', 1).toFixed(1)}）`} />
      <Rings p={[-0.5, 1.2, 0.2]} rot={[0, 0, 0]} amp={() => ampRef.current} maxR={1.6} speed={0.7} />
    </group>
  );
}

/** 一个周期内的归一化谐波叠加：返回 -1..1 */
function harmonic(kind: number, phase: number): number {
  const s = Math.sin;
  if (kind === 0) return s(phase); // 音叉：近似纯音
  if (kind === 1) { // 小提琴：丰富的谐波（锯齿状）
    return (s(phase) + 0.5 * s(2 * phase) + 0.33 * s(3 * phase) + 0.25 * s(4 * phase) + 0.2 * s(5 * phase)) / 1.55;
  }
  return (s(phase) + 0.18 * s(3 * phase) + 0.08 * s(5 * phase)) / 1.1; // 长笛：奇次谐波较弱
}

function Timbre() {
  const kind = useOptIndex('instrument', 0);
  const f = useRef(262);
  const k = useRef(0);
  const ampRef = useRef(0.7);
  useRig((io) => {
    f.current = io.p('frequency', 262);
    k.current = io.idx('instrument', 0);
    const e = evTime(io, 'run');
    ampRef.current = 0.9 * Math.exp(-(e % 6) / 6) + 0.1;
  });
  return (
    <group>
      <Scope p={[0, 1.6, -2.0]} w={3.6} h={1.5} wave={(x, io) => harmonic(k.current, x * Math.PI * 2 * (f.current / 110) + io.t * 4) * 0.8} />
      <group position={[0, 0, 0.6]}>
        {kind === 0 && (
          <group>
            <Box p={[0, 0.4, 0]} s={[1.0, 0.8, 0.6]} m={MAT.darkWood} />
            <Fork p={[0, 0.8, 0]} ampRef={ampRef} big />
          </group>
        )}
        {kind === 1 && (
          <group rotation={[-1.1, 0, 0.5]} position={[0, 0.5, 0]}>
            <Cyl p={[0, 0, 0]} r={0.55} h={0.3} m={MAT.red} />
            <Cyl p={[0, 0.7, 0]} r={0.38} h={0.3} m={MAT.red} />
            <Box p={[0, 1.6, 0.0]} s={[0.12, 1.5, 0.1]} m={MAT.darkWood} />
            {[-0.04, 0.04].map((x) => <Box key={x} p={[x, 0.5, 0.17]} s={[0.012, 2.2, 0.012]} m={MAT.steel} />)}
            <Box p={[0.45, 0.4, 0.2]} s={[0.04, 1.8, 0.06]} m={MAT.darkWood} rot={[0, 0, 0.3]} />
          </group>
        )}
        {kind >= 2 && (
          <group position={[0, 0.5, 0]} rotation={[0, 0, -0.3]}>
            <Cyl p={[0, 0, 0]} r={0.1} h={3} rot={[0, 0, Math.PI / 2]} m={MAT.steel} />
            {[-1, -0.55, -0.1, 0.35, 0.8].map((x) => <Ball key={x} p={[x, 0.1, 0]} r={0.045} m={MAT.black} />)}
          </group>
        )}
      </group>
      <Label p={[0, 2.8, -0.3]} text={['音叉：近似纯音', '小提琴：谐波丰富', '长笛：谐波较弱'][kind] ?? '乐器'} />
    </group>
  );
}

function SpeakerCandle() {
  const flame = useRef<THREE.Mesh>(null);
  const ampRef = useRef(0);
  useRig((io) => {
    const amp = io.p('amplitude', 50) / 100;
    const f = io.p('frequency', 12);
    ampRef.current = amp;
    const e = evTime(io, 'run', 0.2);
    const on = e > 0 ? 1 : 0;
    if (flame.current) {
      const sway = on * amp * 0.8 * Math.sin(io.t * f * 0.9);
      flame.current.rotation.z = -sway;
      flame.current.scale.set(1, 1 - Math.abs(sway) * 0.15 + 0.1 * Math.sin(io.t * 14) * 0.2, 1);
      flame.current.position.x = sway * 0.3;
    }
  });
  return (
    <group>
      <Speaker p={[-1.2, 0, 0]} rot={[0, Math.PI / 2, 0]} ampRef={ampRef} />
      <Cyl p={[0.9, 0.5, 0]} r={0.12} h={1.0} m={MAT.white} />
      <Cyl p={[0.9, 1.03, 0]} r={0.008} h={0.1} m={MAT.black} />
      <mesh ref={flame} position={[0.9, 1.25, 0]}>
        <coneGeometry args={[0.1, 0.4, 12]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.9} />
      </mesh>
      <Rings p={[-0.3, 0.75, 0]} rot={[0, Math.PI / 2, 0]} amp={() => ampRef.current} maxR={1.6} speed={0.5} />
      <Label p={[0.9, 1.8, 0]} text="烛焰随声波摆动" />
    </group>
  );
}

function Noise() {
  const sig = useRef(1);
  const amp = useRef(0.6);
  const seed = useRef(0);
  useRig((io) => {
    sig.current = io.p('signal', 0);
    amp.current = io.p('amplitude', 0.6);
    seed.current = Math.floor(io.t * 8);
  });
  const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  return (
    <group>
      <Scope p={[0, 1.55, -1.9]} w={3.6} h={1.5} color="#f0b36a" wave={(x, io) => {
        const periodic = Math.sin(x * Math.PI * 2 * 4 + io.t * 5);
        const noisy = (hash(Math.floor(x * 90) + seed.current * 31) - 0.5) * 2;
        return (sig.current >= 0.5 ? noisy : periodic) * amp.current;
      }} />
      <Speaker p={[0, 0, 0.7]} ampRef={amp} />
      <Rings p={[0, 0.85, 1.4]} rot={[0, 0, 0]} amp={() => amp.current} maxR={1.6} />
      <IoLabel p={[0, 2.6, 0.2]} get={() => (sig.current >= 0.5 ? '噪声：波形杂乱、无周期' : '乐音：波形有规律周期')} />
    </group>
  );
}

function Frequency() {
  const f = useRef(256);
  const a = useRef(0.5);
  useRig((io) => {
    f.current = io.p('frequency', 256);
    a.current = io.p('amplitude', 0.5);
  });
  return (
    <group>
      <Scope p={[0, 1.6, -1.9]} w={3.8} h={1.6} wave={(x, io) => a.current * Math.sin(x * Math.PI * 2 * (f.current / 100) + io.t * 3)} />
      <Box p={[-1.3, 0.25, 0.6]} s={[1.3, 0.5, 0.9]} m={MAT.darkSteel} />
      <Cyl p={[-1.6, 0.52, 0.6]} r={0.18} h={0.06} m={MAT.black} />
      <Cyl p={[-1.0, 0.52, 0.6]} r={0.12} h={0.06} m={MAT.red} />
      <Speaker p={[1.2, 0, 0.7]} rot={[0, -0.5, 0]} ampRef={a} size={0.9} />
      <Rings p={[0.7, 0.75, 1.4]} rot={[0, -0.5, 0]} amp={() => a.current} speed={0.4 + 0} maxR={1.5} />
      <IoLabel p={[0, 2.8, 0]} get={() => `${f.current.toFixed(0)} Hz：频率越高，音调越高`} />
    </group>
  );
}

function Soundproof() {
  const lining = useOptIndex('lining', 0);
  const att = useRef(0);
  const ampRef = useRef(0.8);
  useRig((io) => {
    const th = io.p('thickness', 2);
    const li = io.idx('lining', 0);
    const absorb = [0.1, 0.45, 0.7, 0.55][li] ?? 0.1;
    att.current = clamp(1 - (0.2 + absorb * (th / 5) * 1.0), 0.04, 1);
    ampRef.current = 0.8;
  });
  const colors = ['#d8c8a0', '#e8dcc0', '#9aa6b0', '#c8805c'];
  const lm = new THREE.MeshStandardMaterial({ color: colors[lining] ?? '#d8c8a0', roughness: 1 });
  return (
    <group>
      {/* 纸箱房间（前壁去掉，看内部） */}
      <Box p={[-0.8, 0.05, 0]} s={[2.4, 0.1, 2.0]} m={MAT.card} />
      <Box p={[-0.8, 0.9, -1.0]} s={[2.4, 1.7, 0.1]} m={MAT.card} />
      <Box p={[-2.0, 0.9, 0]} s={[0.1, 1.7, 2.0]} m={MAT.card} />
      <Box p={[0.4, 0.9, 0]} s={[0.1, 1.7, 2.0]} m={MAT.card} />
      <Box p={[-0.8, 1.8, 0]} s={[2.4, 0.06, 2.0]} m={MAT.card} cast={false} />
      <Box p={[-0.8, 0.9, -0.88]} s={[2.2, 1.5, 0.12]} m={lm} />
      <Box p={[-1.88, 0.9, 0]} s={[0.12, 1.5, 1.8]} m={lm} />
      <Box p={[0.28, 0.9, 0]} s={[0.12, 1.5, 1.8]} m={lm} />
      <Speaker p={[-0.8, 0.1, -0.1]} ampRef={ampRef} size={0.6} />
      <Rings p={[-0.8, 0.8, 0.5]} rot={[0, 0, 0]} amp={() => ampRef.current} maxR={0.9} speed={0.6} count={3} />
      <Rings p={[1.2, 0.8, 0.5]} rot={[0, Math.PI / 2, 0]} amp={() => ampRef.current * att.current} maxR={1.3} speed={0.6} count={3} />
      {/* 房间外的声级计 */}
      <group position={[1.9, 0, 0.6]}>
        <Box p={[0, 0.4, 0]} s={[0.5, 0.8, 0.3]} m={MAT.black} />
        <mesh position={[0, 0.06, 0.16]} scale={[1, 0.1 + att.current * 1.2, 1]}>
          <boxGeometry args={[0.14, 0.5, 0.02]} />
          <meshBasicMaterial color="#6fae6a" />
        </mesh>
      </group>
      <IoLabel p={[1.9, 1.3, 0.6]} get={(io) => `室外声级 ${Math.round(att.current * 100)}%（${io.opt('lining')}）`} />
      <Label p={[-0.8, 2.3, 0]} text="房间模型" />
    </group>
  );
}

export function SoundRig({ exp }: { exp: Experiment }) {
  switch (exp.sceneVariant) {
    case 'rubber-band-vibration': return <RubberBand />;
    case 'vacuum-bell': return <VacuumBell />;
    case 'table-sound': return <TableSound />;
    case 'ruler-pitch': return <RulerPitch />;
    case 'tuning-ball': return <TuningBall />;
    case 'timbre': return <Timbre />;
    case 'speaker-candle': return <SpeakerCandle />;
    case 'noise': return <Noise />;
    case 'frequency': return <Frequency />;
    case 'soundproof-room-project': return <Soundproof />;
    default: return null;
  }
}

import { useMemo } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, Label, MAT, Ruler } from '../kit';
import { IoLabel } from './parts';
import { Cord, IBox, Mv } from './mechanical-parts';
import { clamp, evTime } from './io';

/* 刻度尺：kit.Ruler 长 4.4、20 格，零刻线在 -len/2 + 12/1024*len。 */
const RL = 4.4;
const cmX = (c: number) => -RL / 2 + (12 + (clamp(c, 0, 20) / 20) * 1000) / 1024 * RL;

export function RulerScene() {
  return (
    <group>
      <Ruler p={[0, 0.05, 0.5]} len={RL} ticks={20} w={0.44} />
      {/* 被测铅笔：两块小垫块托起，悬在刻度边旁，故视线偏斜会产生视差 */}
      <Box p={[-1.9, 0.07, 0.1]} s={[0.2, 0.14, 0.3]} m={MAT.darkWood} />
      <Box p={[1.9, 0.07, 0.1]} s={[0.2, 0.14, 0.3]} m={MAT.darkWood} />
      <Mv upd={(g, io) => { const L = io.p('length', 12) * (cmX(20) - cmX(0)) / 20; g.position.set(cmX(0) + L / 2, 0.28, 0.12); g.scale.x = Math.max(0.05, L); }}>
        <mesh castShadow material={MAT.plastic}><boxGeometry args={[1, 0.13, 0.13]} /></mesh>
        <mesh position={[0.5, 0, 0]} material={MAT.black}><boxGeometry args={[0.001, 0.14, 0.14]} /></mesh>
      </Mv>
      <Mv upd={(g, io) => { const L = io.p('length', 12) * (cmX(20) - cmX(0)) / 20; g.position.set(cmX(0) + L, 0.28, 0.12); }}>
        <mesh rotation={[0, 0, -Math.PI / 2]} castShadow material={MAT.card}><coneGeometry args={[0.065, 0.2, 6]} /></mesh>
        <Cord ends={() => [[0, 0, 0], [0, -0.23, 0.0]]} r={0.008} color="#2b2622" />
      </Mv>
      <Mv upd={(g) => g.position.set(cmX(0), 0.28, 0.12)}>
        <Box p={[-0.1, 0, 0]} s={[0.2, 0.13, 0.13]} m={MAT.red} />
        <Cord ends={() => [[0.08, 0, 0], [0.08, -0.23, 0]]} r={0.008} color="#2b2622" />
      </Mv>
      {/* 眼睛与视线：落点读数取自模型 state.length */}
      <Mv upd={(g, io) => {
        const a = (io.p('viewAngle', 0) * Math.PI) / 180;
        const hit = cmX(io.s('length', io.p('length', 12)));
        g.position.set(hit - 2.3 * Math.tan(a), 2.3, 0.45);
        g.rotation.z = a;
      }}>
        <Ball r={0.2} m={MAT.white} />
        <Ball p={[0, -0.16, 0.08]} r={0.09} m={MAT.black} />
      </Mv>
      <Cord color="#c8402f" r={0.012} ends={(io) => {
        const a = (io.p('viewAngle', 0) * Math.PI) / 180;
        const hit = cmX(io.s('length', io.p('length', 12)));
        return [[hit - 2.3 * Math.tan(a), 2.1, 0.45], [hit, 0.08, 0.45]];
      }} />
      <Mv upd={(g, io) => g.position.set(cmX(io.s('length', io.p('length', 12))), 0.1, 0.45)}>
        <mesh rotation={[0, 0, Math.PI]} material={MAT.red}><coneGeometry args={[0.07, 0.16, 8]} /></mesh>
      </Mv>
      <Label p={[cmX(0), 0.62, 0.12]} text="零刻线对齐" size={0.2} />
      <IoLabel p={[0, 1.2, 0.5]} size={0.26} get={(io) => `读数 ${io.s('length', io.p('length', 12)).toFixed(1)} cm（真实 ${io.p('length', 12).toFixed(1)} cm，视线偏 ${io.p('viewAngle', 0).toFixed(0)}°）`} />
    </group>
  );
}

/* 秒表：表盘 60 s 一圈，摆做周期运动，按「开始」后计时 period×cycles 秒。 */
function useDial() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f6f1e4'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#2b2622'; g.fillStyle = '#2b2622'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '34px sans-serif';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      g.lineWidth = big ? 5 : 2;
      g.beginPath();
      g.moveTo(256 + Math.sin(a) * (big ? 190 : 205), 256 - Math.cos(a) * (big ? 190 : 205));
      g.lineTo(256 + Math.sin(a) * 226, 256 - Math.cos(a) * 226);
      g.stroke();
      if (big) g.fillText(String(i), 256 + Math.sin(a) * 160, 256 - Math.cos(a) * 160);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

const swingLen = (T: number) => clamp(0.4 + 0.65 * T * T, 0.45, 3.0);

export function StopwatchScene() {
  const dial = useDial();
  const elapsed = (io: Parameters<typeof evTime>[0]) => {
    const total = io.s('time', io.p('period', 0.8) * io.p('cycles', 10));
    return clamp(evTime(io, 'run', 1.2), 0, total);
  };
  return (
    <group>
      {/* 秒表 */}
      <group position={[-1.2, 1.0, 0.2]}>
        <Cyl r={0.88} h={0.22} rot={[Math.PI / 2, 0, 0]} m={MAT.steel} />
        <Cyl p={[0, 0, 0.115]} r={0.78} h={0.02} rot={[Math.PI / 2, 0, 0]} m={MAT.white} />
        <mesh position={[0, 0, 0.128]}><circleGeometry args={[0.76, 48]} /><meshBasicMaterial map={dial} /></mesh>
        <Cyl p={[0, 0.98, 0]} r={0.1} h={0.2} m={MAT.darkSteel} />
        <Cyl p={[0.68, 0.68, 0]} r={0.06} h={0.14} rot={[0, 0, -Math.PI / 4]} m={MAT.darkSteel} />
        <Mv p={[0, 0, 0.15]} upd={(g, io) => { g.rotation.z = -(elapsed(io) % 60) / 60 * Math.PI * 2; }}>
          <Box p={[0, 0.3, 0]} s={[0.025, 0.7, 0.01]} m={MAT.red} cast={false} />
          <Box p={[0, -0.1, 0]} s={[0.025, 0.2, 0.01]} m={MAT.red} cast={false} />
        </Mv>
        <Ball p={[0, 0, 0.16]} r={0.05} m={MAT.black} />
        <Box p={[0, -0.95, 0]} s={[0.6, 0.2, 0.4]} m={MAT.darkWood} />
      </group>
      {/* 摆：周期事件 */}
      <group position={[1.1, 0, -0.3]}>
        <IBox p={[0, 0.07, 0]} s={[1.1, 0.14, 0.7]} m={MAT.darkSteel} />
        <Cyl p={[-0.4, 1.9, 0]} r={0.045} h={3.8} m={MAT.steel} />
        <Box p={[-0.1, 3.8, 0]} s={[0.7, 0.07, 0.07]} m={MAT.steel} />
        <Mv p={[0.2, 3.8, 0]} upd={(g, io) => {
          const T = Math.max(0.1, io.p('period', 0.8));
          g.rotation.z = 0.3 * Math.sin((2 * Math.PI * io.t) / T);
          g.scale.y = swingLen(T);
        }}>
          <Cyl p={[0, -0.5, 0]} r={0.012} h={1} m={MAT.white} />
        </Mv>
        <Mv p={[0.2, 3.8, 0]} upd={(g, io) => {
          const T = Math.max(0.1, io.p('period', 0.8));
          g.rotation.z = 0.3 * Math.sin((2 * Math.PI * io.t) / T);
        }}>
          <Mv upd={(h, io) => { h.position.y = -swingLen(Math.max(0.1, io.p('period', 0.8))); }}>
            <Ball r={0.2} m={MAT.brass} />
          </Mv>
        </Mv>
      </group>
      <IoLabel p={[-1.2, 2.45, 0.2]} size={0.26} get={(io) => `${elapsed(io).toFixed(1)} s / 共 ${io.s('time', io.p('period', 0.8) * io.p('cycles', 10)).toFixed(1)} s`} />
      <IoLabel p={[1.1, 4.3, -0.3]} size={0.26} get={(io) => `T = ${io.p('period', 0.8).toFixed(1)} s × ${Math.round(io.p('cycles', 10))} 次`} />
    </group>
  );
}

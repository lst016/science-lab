import { useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Label, MAT, V3 } from '../kit';
import { IoLabel } from './parts';
import { RigIO, clamp, useRig } from './io';
import { AX, Beam, Bench, CandleFig, Carrier, Lens3D, Outline, RAY, ScreenBoard } from './optics-parts';

/** 从 io.o.state 读取薄透镜成像结果（imageDistance 带符号；虚像为负；焦点处 imageAtInfinity）。 */
export interface LensG { f: number; u: number; v: number; m: number; virtual: boolean; inf: boolean }
export function readLens(io: RigIO, concave = false): LensG {
  const f = Math.max(0.5, io.s('focalLength', io.p('focalLength', 10)));
  const u = Math.max(0.5, io.s('objectDistance', io.p('objectDistance', 2 * f)));
  const inf = io.sb('imageAtInfinity', false);
  const virtual = io.sb('virtual', concave || u < f);
  const sg = 1 / f - 1 / u;
  const v0 = concave ? -1 / (1 / f + 1 / u) : inf ? 0 : 1 / (Math.abs(sg) < 1e-6 ? 1e-6 : sg);
  const v = io.s('imageDistance', v0);
  const m = inf ? 0 : io.s('magnification', -v / u);
  return { f, u, v, m, virtual, inf };
}

export interface BenchCfg { k: number; lx: number; ho: number; slide?: boolean; camera?: boolean }
const X_END = 2.45;
const CAP = 1.2;

interface Solved { g: LensG; ox: number; uS: number; fS: number; vS: number; yI: number; xI: number; h3: number }
function solve(io: RigIO, c: BenchCfg): Solved {
  const g = readLens(io);
  const uS = c.camera ? 1.7 : Math.min(g.u * c.k, c.lx + 2.45);
  const fS = g.f * c.k;
  const vS = clamp(g.v * c.k, -400, 400);
  const yI = g.inf ? 0 : (-c.ho * vS) / uS;
  const h3raw = Math.abs(fS - uS) > 1e-3 ? (c.ho * fS) / (fS - uS) : 99;
  return { g, ox: c.lx - uS, uS, fS, vS, yI, xI: c.lx + vS, h3: Math.abs(h3raw) > 0.8 ? -0.55 : h3raw };
}

/** 透镜后的出射线终点：真实像 → 汇聚后继续；虚像 → 反向发散；焦点 → 与过光心光线平行。 */
function post(s: Solved, c: BenchCfg, hy: number): V3 {
  let dx: number, dy: number;
  if (s.g.inf) { dx = s.uS; dy = -c.ho; } else if (s.vS > 0) { dx = s.vS; dy = s.yI - hy; } else { dx = -s.vS; dy = hy - s.yI; }
  const slope = dy / Math.max(1e-3, dx);
  let t = X_END - c.lx;
  if (Math.abs(hy + slope * t) > CAP && Math.abs(slope) > 1e-6) t = Math.max(0, ((slope > 0 ? CAP : -CAP) - hy) / slope);
  return [c.lx + t, AX + hy + slope * t, 0];
}

function rayGet(c: BenchCfg, which: 0 | 1 | 2) {
  return (io: RigIO): V3[] => {
    const s = solve(io, c);
    const hy = which === 0 ? c.ho : which === 1 ? 0 : s.h3;
    return [[s.ox, AX + c.ho, 0], [c.lx, AX + hy, 0], post(s, c, hy)];
  };
}
function backGet(c: BenchCfg, which: 0 | 1 | 2) {
  return (io: RigIO): V3[] => {
    const s = solve(io, c);
    const hy = which === 0 ? c.ho : which === 1 ? 0 : s.h3;
    const tail = post(s, c, hy);
    const slope = (tail[1] - AX - hy) / Math.max(1e-3, tail[0] - c.lx);
    const back = Math.min(c.lx + 2.4, Math.max(0, c.lx - s.xI));
    return [[c.lx, AX + hy, 0], [c.lx - back, AX + hy - slope * back, 0]];
  };
}
const rayColor = (io: RigIO) => (io.sb('imageAtInfinity', false) ? '#e8c72b' : io.sb('virtual', false) ? '#ee8a2c' : RAY);

export function LensBench({ cfg }: { cfg: BenchCfg }) {
  const { k, lx, ho } = cfg;
  const objG = useRef<THREE.Group>(null);
  const virtG = useRef<THREE.Group>(null);
  const scrG = useRef<THREE.Group>(null);
  const imgG = useRef<THREE.Group>(null);
  const spot = useRef<THREE.Mesh>(null);
  const spotMat = useRef<THREE.MeshBasicMaterial>(null);
  const tube = useRef<THREE.Mesh>(null);
  const marks = useRef<(THREE.Group | null)[]>([]);
  useRig((io) => {
    const s = solve(io, cfg);
    const { g } = s;
    if (objG.current) objG.current.position.x = s.ox;
    const realX = lx + s.vS;
    const real = !g.virtual && !g.inf && s.vS > 0;
    const fits = realX <= 2.15;
    const sharp = cfg.camera ? real && Math.abs(io.p('tubeDistance', 12) - g.v) < 0.8 : real && fits;
    const xs = cfg.camera ? lx + io.p('tubeDistance', 12) * k : real ? clamp(realX, lx + 0.35, 2.15) : Math.min(2.15, lx + 1.8);
    if (scrG.current) scrG.current.position.x = xs;
    if (tube.current) { tube.current.position.x = (lx + xs) / 2; tube.current.scale.y = Math.max(0.1, xs - lx); }
    const h = clamp(Math.abs(s.yI), 0.05, 0.85);
    if (imgG.current) { imgG.current.visible = sharp; imgG.current.scale.setScalar(h); }
    if (spot.current && spotMat.current) {
      spot.current.visible = !sharp;
      spot.current.scale.setScalar(g.inf ? 1.4 : real ? clamp(0.5 + Math.abs(io.p('tubeDistance', g.v) - g.v) * 0.25, 0.4, 1.4) : 0.9);
      spotMat.current.opacity = g.inf ? 0.16 : 0.3;
    }
    const vv = g.virtual && !g.inf;
    if (virtG.current) {
      virtG.current.visible = vv;
      virtG.current.position.x = Math.max(-2.4, lx + s.vS);
      virtG.current.scale.setScalar(h);
    }
    const pos = [lx - s.fS, lx + s.fS, lx - 2 * s.fS, lx + 2 * s.fS];
    pos.forEach((x, i) => { const m = marks.current[i]; if (m) { m.visible = x > -2.45 && x < 2.45; m.position.x = x; } });
  });
  const dash = [0, 1, 2] as const;
  return (
    <group>
      <Bench x0={lx} k={k} />
      <Lens3D p={[lx, AX, 0]} getBulge={(io) => clamp(11 / io.p('focalLength', 10), 0.55, 1.5)} />
      {cfg.camera && (
        <mesh ref={tube} rotation={[0, 0, Math.PI / 2]} position={[lx, AX, 0]}>
          <cylinderGeometry args={[0.98, 0.98, 1, 32, 1, true]} />
          <meshStandardMaterial color="#e5d3ae" side={THREE.DoubleSide} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      <group ref={objG}>
        <Carrier x={0} />
        <group position={[0, AX, 0]}>
          {cfg.slide ? (
            <>
              <Box p={[0, 0, 0]} s={[0.05, 0.95, 0.75]} m={MAT.glass} cast={false} />
              <Outline s={[0.06, 0.95, 0.75]} />
              <group position={[0.04, -0.4, 0]}><CandleFig s={0.8} /></group>
              <Box p={[-0.5, 0, 0]} s={[0.4, 0.8, 0.5]} m={MAT.darkSteel} />
              <mesh position={[-0.29, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[0.22, 20]} /><meshBasicMaterial color="#fff2c0" /></mesh>
            </>
          ) : (
            <CandleFig s={ho} />
          )}
        </group>
      </group>
      <group ref={virtG} position={[0, AX, 0]} visible={false}><CandleFig ghost s={1} /></group>
      <ScreenBoard gref={scrG}>
        <group ref={imgG}><CandleFig flip s={1} /></group>
        <mesh ref={spot} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.5, 24]} />
          <meshBasicMaterial ref={spotMat} color="#ffd27a" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </ScreenBoard>
      {['F', 'F', '2F', '2F'].map((t, i) => (
        <group key={i} ref={(m) => { marks.current[i] = m; }} position={[lx, AX, 0.02]}>
          <Ball p={[0, 0, 0]} r={0.045} m={MAT.black} />
          <Label p={[0, -0.2, 0]} text={t} size={0.2} />
        </group>
      ))}
      {dash.map((w) => (
        <Beam key={w} get={rayGet(cfg, w)} segs={2} color={rayColor} r={0.018} pulse={w === 0} />
      ))}
      {dash.map((w) => (
        <Beam key={`b${w}`} get={backGet(cfg, w)} segs={1} dash={9} color="#ee8a2c" r={0.012} opacity={0.7} show={(io) => io.sb('virtual', false) && !io.sb('imageAtInfinity', false)} />
      ))}
      <IoLabel p={[0, 3.2, 0]} size={0.26} get={(io) => {
        const g = readLens(io);
        if (g.inf) return `物距 ${g.u.toFixed(1)} cm = 焦距：出射平行，无有限像距`;
        return `物距 ${g.u.toFixed(1)} cm · 像距 ${g.v.toFixed(1)} cm · 放大率 ${g.m.toFixed(2)}×`;
      }} />
      <IoLabel p={[0, 2.9, 0]} size={0.24} bg="rgba(255,248,230,0.95)" color="#3a2e20" get={(io) => {
        const g = readLens(io);
        if (g.inf) return '光屏上只有一团光斑，看不到清晰的像';
        if (g.virtual) return `正立${Math.abs(g.m) > 1 ? '放大' : '缩小'}虚像（光屏接不到，需从透镜右侧向左看）`;
        return `倒立${Math.abs(g.m) > 1 ? '放大' : Math.abs(Math.abs(g.m) - 1) < 0.03 ? '等大' : '缩小'}实像${lx + g.v * k > 2.15 ? '（像在屏外较远处）' : ''}`;
      }} />
    </group>
  );
}

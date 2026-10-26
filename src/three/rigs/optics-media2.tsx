import { useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Label, MAT, V3 } from '../kit';
import { IoLabel } from './parts';
import { RigIO, useRig } from './io';
import { AX, Beam, Bench, CandleFig, Outline } from './optics-parts';
import { Prism, WaterMirror, WaterStream } from './optics-media3';

export { Prism, WaterMirror, WaterStream };

const Y0 = 0.26; // 光具座面高度

function Eye({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Ball r={0.17} m={MAT.white} />
      <Ball p={[0.13, 0, 0]} r={0.07} m={MAT.black} />
      <Label p={[0, 0.38, 0]} text="眼睛" size={0.2} />
    </group>
  );
}

/* ---------- mirror-image：玻璃板前的蜡烛与等大虚像 ---------- */
export function MirrorImage() {
  const K = 0.075;
  const objG = useRef<THREE.Group>(null);
  const imgG = useRef<THREE.Group>(null);
  const scr = useRef<THREE.Group>(null);
  const calc = (io: RigIO) => {
    const u = io.p('distance', 15);
    const h = io.p('objectHeight', 5);
    return { u, v: io.s('imageDistance', u), dS: u * K, s: h * 0.12 };
  };
  const EYES: V3[] = [[-2.35, 2.3, 0], [-2.35, 3.0, 0]];
  const hit = (io: RigIO, e: V3): V3 => {
    const { dS, s } = calc(io);
    return [0, e[1] + (Y0 + s - e[1]) * (2.35 / (2.35 + dS)), 0];
  };
  useRig((io) => {
    const { dS, s } = calc(io);
    if (objG.current) { objG.current.position.x = -dS; objG.current.scale.setScalar(s); }
    if (imgG.current) { imgG.current.position.x = dS; imgG.current.scale.setScalar(s); }
    if (scr.current) { scr.current.visible = io.n('run') % 2 === 1; scr.current.position.x = dS; }
  });
  return (
    <group>
      <Bench x0={0} k={K} from={-2.4} to={2.4} />
      <Box p={[0, Y0 + 1.2, 0]} s={[0.05, 2.4, 1.5]} m={MAT.glass} cast={false} />
      <Outline p={[0, Y0 + 1.2, 0]} s={[0.06, 2.4, 1.5]} />
      <Box p={[0, Y0 + 0.05, 0]} s={[0.4, 0.1, 1.5]} m={MAT.darkWood} />
      <group ref={objG} position={[0, Y0, 0]}><CandleFig s={1} /></group>
      <group ref={imgG} position={[0, Y0, 0]}><CandleFig s={1} ghost /></group>
      <group ref={scr} visible={false} position={[0, Y0 + 0.6, 0]}>
        <Box p={[0.03, 0.4, 0]} s={[0.04, 1.4, 1.0]} m={MAT.white} />
        <Label p={[0.2, 1.3, 0]} text="光屏：接不到像" size={0.2} />
      </group>
      <Eye p={[-2.35, 2.3, 0]} />
      {EYES.map((e, k) => (
        <group key={k}>
          <Beam segs={2} r={0.015} pulse={k === 0} color="#e8392b"
            get={(io) => { const { dS, s } = calc(io); return [[-dS, Y0 + s, 0], hit(io, e), e]; }} />
          <Beam segs={1} dash={10} r={0.011} opacity={0.7} color="#ee8a2c"
            get={(io) => { const { dS, s } = calc(io); return [hit(io, e), [dS, Y0 + s, 0]]; }} />
        </group>
      ))}
      <Beam segs={1} r={0.012} color="#3f6ea6" get={(io) => { const { dS } = calc(io); return [[-dS, 0.34, 0.7], [0, 0.34, 0.7]]; }} />
      <Beam segs={1} r={0.012} color="#3f6ea6" get={(io) => { const { dS } = calc(io); return [[0, 0.34, 0.7], [dS, 0.34, 0.7]]; }} />
      <Label p={[-1.1, 0.62, 0.75]} text="物距 u" size={0.2} />
      <Label p={[1.1, 0.62, 0.75]} text="像距 v" size={0.2} />
      <Label p={[0, Y0 + 2.6, 0]} text="玻璃板" size={0.2} />
      <IoLabel p={[0, 3.6, 0]} size={0.26} get={(io) => { const { u, v } = calc(io); return `物距 ${u.toFixed(0)} cm，像距 ${v.toFixed(0)} cm：像与物等大、正立，是虚像`; }} />
    </group>
  );
}

/* ---------- pinhole-camera：小孔成倒立实像 ---------- */
export function Pinhole() {
  const objG = useRef<THREE.Group>(null);
  const imgG = useRef<THREE.Group>(null);
  const ghost = useRef<(THREE.Group | null)[]>([]);
  const top = useRef<THREE.Mesh>(null);
  const bot = useRef<THREE.Mesh>(null);
  const FILM = 1.5, HOLE = 0.2, SO = 0.5;
  const calc = (io: RigIO) => {
    const u = io.p('objectDistance', 80);
    const ap = io.p('aperture', 1);
    const dS = 0.9 + ((u - 20) / 180) * 1.0;
    const g = 0.05 + ap * 0.035;
    return { u, ap, dS, g, si: (SO * (FILM - HOLE)) / dS };
  };
  useRig((io) => {
    const { dS, g, si, ap } = calc(io);
    if (objG.current) objG.current.position.x = HOLE - dS;
    if (imgG.current) imgG.current.scale.setScalar(si);
    const b = 0.03 * (ap - 0.5);
    ghost.current.forEach((m, i) => { if (m) { m.visible = b > 0.02; m.scale.setScalar(si); m.position.y = (i === 0 ? 1 : -1) * b; } });
    if (top.current) { top.current.position.y = AX + g / 2 + (0.9 - g / 2) / 2; top.current.scale.y = 0.9 - g / 2; }
    if (bot.current) { bot.current.position.y = AX - g / 2 - (0.9 - g / 2) / 2; bot.current.scale.y = 0.9 - g / 2; }
  });
  const ray = (edge: -1 | 0 | 1) => (io: RigIO): V3[] => {
    const { dS, g } = calc(io);
    const ty = AX + SO;
    const hy = AX + edge * (g / 2 - 0.012);
    const slope = (hy - ty) / dS;
    return [[HOLE - dS, ty, 0], [HOLE, hy, 0], [FILM, hy + slope * (FILM - HOLE), 0]];
  };
  return (
    <group>
      <Bench x0={HOLE} k={0.012} from={-2.4} to={2.0} />
      <group ref={objG} position={[0, AX, 0]}><CandleFig s={SO} /></group>
      <mesh ref={top} position={[HOLE, AX + 0.5, 0]} material={MAT.black}><boxGeometry args={[0.06, 1, 1.2]} /></mesh>
      <mesh ref={bot} position={[HOLE, AX - 0.5, 0]} material={MAT.black}><boxGeometry args={[0.06, 1, 1.2]} /></mesh>
      <Box p={[(HOLE + FILM) / 2, AX + 0.9, 0]} s={[FILM - HOLE, 0.04, 1.2]} m={MAT.glass} cast={false} />
      <Box p={[(HOLE + FILM) / 2, AX - 0.9, 0]} s={[FILM - HOLE, 0.04, 1.2]} m={MAT.darkSteel} />
      <Box p={[(HOLE + FILM) / 2, AX, 0.6]} s={[FILM - HOLE, 1.8, 0.03]} m={MAT.glass} cast={false} />
      <Box p={[(HOLE + FILM) / 2, AX, -0.6]} s={[FILM - HOLE, 1.8, 0.03]} m={MAT.darkSteel} />
      <Outline p={[(HOLE + FILM) / 2, AX, 0]} s={[FILM - HOLE, 1.8, 1.2]} />
      <group position={[FILM, AX, 0]}>
        <Box p={[0.02, 0, 0]} s={[0.03, 1.7, 1.1]} m={MAT.white} />
        <group position={[-0.03, 0, 0.0]}>
          <group ref={imgG}><CandleFig s={1} flip /></group>
          {[0, 1].map((i) => <group key={i} ref={(m) => { ghost.current[i] = m; }}><CandleFig s={1} flip ghost /></group>)}
        </group>
      </group>
      <Beam segs={2} r={0.018} pulse color="#e8392b" get={ray(0)} />
      <Beam segs={2} r={0.011} opacity={0.6} color="#e8892b" get={ray(1)} />
      <Beam segs={2} r={0.011} opacity={0.6} color="#e8892b" get={ray(-1)} />
      <Label p={[HOLE, AX + 1.2, 0]} text="小孔" size={0.22} />
      <Label p={[FILM, AX + 1.2, 0]} text="半透明薄膜" size={0.22} />
      <IoLabel p={[0, 3.3, 0]} size={0.26} get={(io) => { const { u, ap } = calc(io); return `物距 ${u.toFixed(0)} cm · 孔径 ${ap.toFixed(1)} mm：倒立实像${ap > 2.5 ? '，孔太大像变模糊' : ap < 1 ? '，像清晰但较暗' : ''}`; }} />
    </group>
  );
}

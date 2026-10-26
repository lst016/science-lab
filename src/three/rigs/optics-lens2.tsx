import { useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Label, MAT, V3 } from '../kit';
import { IoLabel } from './parts';
import { RigIO, clamp, useOptIndex, useRig } from './io';
import { AX, Beam, Bench, Lens3D, ScreenBoard } from './optics-parts';

const X_END = 2.45;
const CAP = 1.2;
const SUN_DIM = new THREE.Color('#9a9a8c');
const SUN_HOT = new THREE.Color('#ffc928');

/** 延长一条射线到 x=X_END，超出显示范围时在边界截断 */
function extend(x: number, y: number, slope: number): V3 {
  let t = Math.max(0, X_END - x);
  if (Math.abs(y - AX + slope * t) > CAP && Math.abs(slope) > 1e-6) t = Math.max(0, ((slope > 0 ? CAP : -CAP) - (y - AX)) / slope);
  return [x + t, y + slope * t, 0];
}

const HS = [-0.7, -0.35, 0, 0.35, 0.7];

/** 平行光 + 单个透镜：converge-diverge（凸/凹）与 sun-focal-length（阳光 + 移动白纸屏找焦点） */
export function ParallelRig({ variant }: { variant: 'converge-diverge' | 'sun-focal-length' }) {
  const lt = useOptIndex('lensType', 0);
  const sun = variant === 'sun-focal-length';
  const concave = !sun && lt === 1;
  const k = sun ? 0.07 : 0.09;
  const lx = sun ? -0.9 : -0.6;
  const fOf = (io: RigIO) => (concave ? -1 : 1) * io.p('focalLength', 10) * k;
  const scr = useRef<THREE.Group>(null);
  const spot = useRef<THREE.Mesh>(null);
  const spotMat = useRef<THREE.MeshBasicMaterial>(null);
  const focus = useRef<THREE.Group>(null);
  const info = useRef({ d: 0, fCm: 10, r: 0 });
  // 屏位置（相对透镜，场景单位）：阳光实验里在焦点附近来回找最清晰处，按「开始实验」后收敛到焦点
  const screenD = (io: RigIO) => {
    const fS = Math.abs(fOf(io));
    if (!sun) return 2.2 - lx;
    const s = io.since('run');
    return fS + (s < 0 ? 0.55 : 0.55 * Math.exp(-s / 1.4) * Math.cos(s * 3.2));
  };
  useRig((io) => {
    const fS = fOf(io);
    const d = screenD(io);
    if (scr.current) scr.current.position.x = lx + d;
    if (focus.current) { focus.current.position.x = lx + fS; }
    const r = clamp(Math.abs(0.7 * (1 - d / fS)), 0.03, 0.95);
    info.current = { d: d / k, fCm: io.p('focalLength', 10), r };
    if (spot.current && spotMat.current) {
      spot.current.scale.setScalar(r);
      const cloud = sun ? io.p('cloud', 80) / 100 : 0.9;
      const bright = concave ? 0.35 : clamp(0.14 / r, 0.3, 1);
      spotMat.current.opacity = clamp(cloud * bright * 1.1, 0.12, 0.98);
      spotMat.current.color.set(r < 0.12 && !concave ? '#fff3b0' : '#ffd88a');
    }
  });
  const rayColor = (io: RigIO) => (sun ? SUN_DIM.clone().lerp(SUN_HOT, io.p('cloud', 80) / 100).getStyle() : concave ? '#4a86b0' : '#e8392b');
  return (
    <group>
      <Bench x0={lx} k={k} />
      <Lens3D p={[lx, AX, 0]} concave={concave} getBulge={(io) => clamp(11 / io.p('focalLength', 10), 0.55, 1.5)} />
      {sun ? (
        <group position={[-2.3, 2.75, 0]}>
          <Ball r={0.2} m={new THREE.MeshBasicMaterial({ color: '#ffc928' })} />
          <Label p={[0, -0.38, 0]} text="阳光（平行光）" size={0.22} />
        </group>
      ) : (
        <group position={[-2.38, AX, 0]}>
          <Box p={[0, 0, 0]} s={[0.3, 1.8, 0.6]} m={MAT.darkSteel} />
          <Label p={[0, 1.1, 0]} text="平行光束" size={0.22} />
        </group>
      )}
      {HS.map((h) => (
        <Beam key={h} segs={2} r={0.017} color={rayColor} pulse={h === 0.35}
          get={(io) => { const fS = fOf(io); return [[-2.25, AX + h, 0], [lx, AX + h, 0], extend(lx, AX + h, -h / fS)]; }} />
      ))}
      {HS.map((h) => (
        <Beam key={`v${h}`} segs={1} dash={8} r={0.011} opacity={0.7} color="#4a86b0"
          show={() => concave} get={(io) => [[lx, AX + h, 0], [lx + fOf(io), AX, 0]]} />
      ))}
      <group ref={focus} position={[lx, AX, 0.02]}>
        <Ball r={0.06} m={MAT.black} />
        <Label p={[0, 0.22, 0]} text={concave ? '虚焦点 F' : '焦点 F'} size={0.2} />
      </group>
      <ScreenBoard gref={scr} w={1.5}>
        <mesh ref={spot} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial ref={spotMat} color="#ffd88a" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      </ScreenBoard>
      <IoLabel p={[0, 3.1, 0]} size={0.26} get={(io) => {
        const fCm = io.p('focalLength', 10);
        if (sun) return `屏距透镜 ${(screenD(io) / k).toFixed(1)} cm · 焦距 ${fCm.toFixed(0)} cm · 光斑最小最亮时即焦点`;
        return `${concave ? '凹透镜：光束发散，反向延长线交于虚焦点' : '凸透镜：光束会聚于焦点'}（|f| = ${fCm.toFixed(0)} cm）`;
      }} />
    </group>
  );
}

/** 两块凸透镜（用光线传递公式追踪）：two-magnifiers、refracting-telescope-project */
export function TwoLensRig({ variant }: { variant: 'two-magnifiers' | 'refracting-telescope-project' }) {
  const tele = variant === 'refracting-telescope-project';
  const k = tele ? 0.04 : 0.05;
  const x1 = tele ? -2.0 : -1.9;
  const THETA = -0.07; // 远处目标上一点射来的光线斜率（离轴）
  const par = (io: RigIO) => tele
    ? { fo: io.p('objectiveFocal', 30), fe: io.p('eyepieceFocal', 5), d: io.p('separation', 35) }
    : { fo: io.p('focalLength', 10), fe: io.p('focalLength', 10), d: io.p('separation', 20) };
  const l2 = useRef<THREE.Group>(null);
  const tube = useRef<THREE.Mesh>(null);
  const eye = useRef<THREE.Group>(null);
  useRig((io) => {
    const { d } = par(io);
    const x2 = x1 + d * k;
    if (l2.current) l2.current.position.x = x2;
    if (tube.current) { tube.current.position.x = (x1 + x2) / 2; tube.current.scale.y = Math.max(0.1, x2 - x1); }
    if (eye.current) eye.current.position.x = Math.min(2.3, x2 + 0.75);
  });
  const trace = (h: number, slope: number) => (io: RigIO): V3[] => {
    const { fo, fe, d } = par(io);
    const dS = d * k, f1 = fo * k, f2 = fe * k;
    const x2 = x1 + dS;
    const t1 = slope - h / f1;
    const y2 = h + t1 * dS;
    const start: V3 = [x1 - 0.7, AX + h - slope * 0.7, 0];
    const mid: V3 = [x1, AX + h, 0];
    const at2: V3 = [x2, AX + y2, 0];
    if (Math.abs(y2) > 0.85) return [start, mid, at2, at2];
    const t2 = t1 - y2 / f2;
    return [start, mid, at2, extend(x2, AX + y2, t2)];
  };
  const off = [-0.6, 0, 0.6];
  const on = [-0.6, 0.6];
  return (
    <group>
      <Bench x0={x1} k={k} />
      <Lens3D p={[x1, AX, 0]} getBulge={(io) => clamp(11 / par(io).fo, 0.55, 1.5)} />
      <group ref={l2}><Lens3D p={[0, AX, 0]} R={tele ? 0.6 : 0.85} getBulge={(io) => clamp(11 / par(io).fe, 0.55, 1.5)} /></group>
      <mesh ref={tube} rotation={[0, 0, Math.PI / 2]} position={[x1, AX, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 1, 32, 1, true]} />
        <meshStandardMaterial color="#e5d3ae" side={THREE.DoubleSide} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <group ref={eye} position={[2.0, AX, 0]}>
        <Ball r={0.17} m={MAT.white} />
        <Ball p={[-0.13, 0, 0]} r={0.07} m={MAT.black} />
        <Label p={[0, 0.4, 0]} text="眼睛" size={0.2} />
      </group>
      <group position={[-2.4, 2.65, 0]}><Ball r={0.1} m={new THREE.MeshBasicMaterial({ color: '#ffc928' })} /><Label p={[0.1, 0.28, 0]} text="远处目标" size={0.2} /></group>
      {off.map((h) => <Beam key={`o${h}`} segs={3} r={0.016} color="#e8392b" get={trace(h, THETA)} pulse={h === 0} />)}
      {on.map((h) => <Beam key={`a${h}`} segs={3} r={0.016} color="#3f6ea6" get={trace(h, 0)} />)}
      <IoLabel p={[0, 3.2, 0]} size={0.26} get={(io) => {
        const { fo, fe, d } = par(io);
        const ideal = tele ? fo + fe : 2 * fo;
        return tele
          ? `镜间距 ${d.toFixed(0)} cm（理想 ${ideal.toFixed(0)} cm）· 角放大率 M≈${(fo / fe).toFixed(1)}`
          : `镜间距 ${d.toFixed(0)} cm（f=${fo.toFixed(0)} cm，约 ${ideal.toFixed(0)} cm 时光线近平行）`
      }} />
      <IoLabel p={[0, 2.9, 0]} size={0.24} bg="rgba(255,248,230,0.95)" color="#3a2e20" get={(io) => {
        const { fo, fe, d } = par(io);
        const ideal = tele ? fo + fe : 2 * fo;
        return Math.abs(d - ideal) < Math.max(1.5, ideal * 0.06) ? '出射光近似平行：眼睛放松，像清晰' : d < ideal ? '镜间距偏小：出射光发散，需要调节' : '镜间距偏大：出射光会聚，像模糊';
      }} />
    </group>
  );
}

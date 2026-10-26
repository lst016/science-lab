import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, MAT, Tube, V3 } from '../kit';
import { Arrow3, BarMagnet, Compass, headingOf, poleField } from './electric-magnet-parts';
import { IoLabel } from './parts';
import { Flow } from './electric-wire';
import { RigIO, clamp, useOptIndex, useParam, useRig } from './io';

/* 磁场类：小磁针感知方向、条形磁体磁场分布（磁针阵列/铁屑/磁感线）、通电螺线管。 */

const L = 2.0;           // 两极磁荷间距
const EARTH: [number, number] = [0, -0.05]; // 地磁：指向 −z 方向的很弱背景场

/** 小磁针放在条形磁体前方一条线上，沿线移动；各处 N 极都顺着磁场方向。 */
export function CompassField() {
  const pos = useParam('position', 0);
  const flip = useOptIndex('pole', 0) === 1;
  const sgn = flip ? -1 : 1;
  const x = clamp(pos, -5, 5) * 0.4, z = 1.15;
  const b = poleField(x, z, L, sgn);
  const a = headingOf(b);
  const tip: V3 = [x + Math.cos(a) * 0.8, 0.35, z - Math.sin(a) * 0.8];
  return (
    <group>
      <Box p={[0, 0.03, 0.5]} s={[4.6, 0.06, 3.4]} m={MAT.card} cast={false} />
      <BarMagnet p={[0, 0.2, 0]} len={L * 1.1} flip={flip} />
      {[-1.6, -0.8, 0.8, 1.6].map((px) => <Compass key={px} p={[px, 0.06, -1.0]} size={0.7} id={`ref${px}`} heading={() => headingOf(poleField(px, -1.0, L, sgn))} />)}
      <Compass p={[x, 0.06, z]} size={1.5} id="main" heading={() => headingOf(poleField(x, z, L, sgn))} />
      <Arrow3 a={[x, 0.35, z]} b={tip} />
      <IoLabel p={[x, 1.1, z + 0.2]} size={0.22} get={(io) => `距磁体中心 ${io.p('position', 0).toFixed(1)} cm：N 极所指 = 磁场方向`} />
      <IoLabel p={[0, 1.8, -0.4]} size={0.2} get={() => '后排固定小磁针：同位置磁场方向相同'} />
    </group>
  );
}

/** 从 N 极附近出发积分得到磁感线（xz 平面），遇到 S 极或出界停止。 */
function traceLines(count: number): V3[][] {
  const out: V3[][] = [];
  for (const side of [1, -1]) {
    for (let k = 0; k < count; k++) {
      const phi = ((k + 0.5) / count) * Math.PI * 0.95 + 0.05;
      let x = L / 2 + 0.16 * Math.cos(phi), z = side * 0.16 * Math.sin(phi);
      const pts: V3[] = [[x, 0.38, z]];
      for (let i = 0; i < 500; i++) {
        const [bx, bz] = poleField(x, z, L);
        const m = Math.hypot(bx, bz) || 1;
        x += (bx / m) * 0.06; z += (bz / m) * 0.06;
        pts.push([x, 0.38, z]);
        if (Math.hypot(x + L / 2, z) < 0.18 || Math.abs(x) > 3.1 || Math.abs(z) > 2.3) break;
      }
      if (pts.length > 4) out.push(pts);
    }
  }
  return out;
}

const FILINGS = 520;
/** 玻璃板上的铁屑：按磁场方向取向，磁体越强显示越多。 */
function Filings() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.16, 0.012, 0.018), []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    let k = 0;
    while (k < FILINGS) {
      const x = (rnd() - 0.5) * 5.6, z = (rnd() - 0.5) * 4.2;
      if (Math.abs(x) < 1.15 && Math.abs(z) < 0.22) continue;
      const [bx, bz] = poleField(x, z, L);
      o.position.set(x, 0.345, z);
      o.rotation.set(0, headingOf([bx, bz]), 0);
      o.updateMatrix();
      m.setMatrixAt(k++, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  useRig((io) => { if (ref.current) ref.current.count = Math.round(FILINGS * clamp((io.p('magnetStrength', 70) - 10) / 90, 0.08, 1)); });
  return <instancedMesh ref={ref} args={[geo, undefined, FILINGS]} frustumCulled={false}><meshStandardMaterial color="#2a2620" /></instancedMesh>;
}

export function FieldLinesBar() {
  const n = Math.round(useParam('needleCount', 12));
  const lines = useMemo(() => traceLines(Math.max(2, Math.round(n / 3))), [n]);
  const ring = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + 0.3;
    return [Math.cos(a) * 2.15, Math.sin(a) * 1.55] as [number, number];
  }), [n]);
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3158a8' }), []);
  return (
    <group>
      <Box p={[0, 0.33, 0]} s={[5.8, 0.02, 4.4]} m={MAT.glass} cast={false} />
      <Box p={[0, 0.15, 0]} s={[5.8, 0.3, 4.4]} m={MAT.wood} />
      <BarMagnet p={[0, 0.38, 0]} len={L * 1.1} />
      {lines.map((pts, i) => <Tube key={i} pts={pts} r={0.012} m={m} cast={false} />)}
      <Filings />
      {ring.map(([x, z], i) => <Compass key={`${n}-${i}`} p={[x, 0.36, z]} size={0.55} id={`n${i}`} heading={() => headingOf(poleField(x, z, L))} />)}
      <IoLabel p={[0, 1.3, 1.9]} size={0.22} get={(io) => `${io.p('needleCount', 12).toFixed(0)} 枚小磁针 · 磁感线：N 极 → S 极`} />
    </group>
  );
}

/** 通电螺线管：线圈绕向固定，电流顺绕向则 +x 端为 N（右手螺旋定则）。 */
export function SolenoidField() {
  const turns = Math.round(useParam('turns', 100));
  const rev = useOptIndex('direction', 0) === 1;
  const loops = clamp(Math.round(turns / 10), 2, 20), R = 0.5, LEN = 2.4, Y = 0.85;
  const pts = useMemo(() => {
    const out: V3[] = [];
    const n = loops * 16;
    for (let i = 0; i <= n; i++) {
      const f = i / n, a = f * loops * Math.PI * 2;
      out.push([-LEN / 2 + f * LEN, Y + R * Math.cos(a), R * Math.sin(a)]);
    }
    return out;
  }, [loops]);
  const sg = (io: RigIO) => (rev ? -1 : 1) * Math.abs(io.p('current', 1));
  const heading = (x: number, z: number) => (io: RigIO) => {
    const cur = sg(io);
    const k = (Math.abs(cur) * turns) / 100;
    const b = poleField(x, z, LEN, Math.sign(cur) || 1);
    return headingOf([EARTH[0] + k * b[0], EARTH[1] + k * b[1]]);
  };
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9783a', metalness: 0.8, roughness: 0.35 }), []);
  const spots: [number, number][] = [[-1.9, 0], [1.9, 0], [0, 1.2], [0, -1.2]];
  return (
    <group>
      <Box p={[0, 0.03, 0]} s={[5, 0.06, 3.6]} m={MAT.card} cast={false} />
      {[-0.9, 0.9].map((x) => <Box key={x} p={[x, 0.2, 0]} s={[0.12, 0.4, 0.9]} m={MAT.darkWood} />)}
      <Tube pts={pts} r={0.03} m={m} />
      <Flow pts={pts} cur={(io) => sg(io)} n={Math.min(60, loops * 4)} r={0.04} />
      {spots.map(([x, z]) => <Compass key={`${x}${z}`} p={[x, 0.06, z]} size={0.9} id={`s${x}${z}`} heading={heading(x, z)} />)}
      <IoLabel p={[1.45, Y + 0.95, 0]} size={0.3} color="#7a1a10" get={(io) => (sg(io) === 0 ? '·' : sg(io) > 0 ? 'N' : 'S')} />
      <IoLabel p={[-1.45, Y + 0.95, 0]} size={0.3} color="#1b3a7a" get={(io) => (sg(io) === 0 ? '·' : sg(io) > 0 ? 'S' : 'N')} />
      <IoLabel p={[0, 2.1, 0.4]} size={0.22} get={(io) => `${turns} 匝 · I = ${Math.abs(io.p('current', 1)).toFixed(1)} A · ${rev ? '电流反向，磁极互换' : '右手握管，四指沿电流，拇指指 N'}`} />
    </group>
  );
}

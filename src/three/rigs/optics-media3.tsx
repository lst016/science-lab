import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, Cyl, Label, MAT, Tube, Vessel, type V3 } from '../kit';
import { Beam } from './optics-parts';
import { IoLabel } from './parts';
import { useParam, useRig, type RigIO } from './io';
import { hitSeg, norm2, refract2, reflect2, rot2, RAINBOW, type V2 } from './ray2d';

const CENTER: V2 = [0, 1.55];
const local: V2[] = [[-0.8, -0.65], [0.8, -0.65], [0, 0.85]];
const corners = (angle: number): V2[] => local.map(p => {
  const q = rot2(p, angle * Math.PI / 180);
  return [q[0] + CENTER[0], q[1] + CENTER[1]];
});

/** Trace both actual prism interfaces. The spread parameter exaggerates dispersion. */
function prismRay(io: RigIO, colorIndex: number): V3[] {
  const vertices = corners(io.p('angle', 0));
  const index = 1.51 + colorIndex * 0.012 * io.p('spread', 1.5);
  let origin: V2 = [-2.35, 1.55], direction: V2 = [1, 0], inside = false;
  const path: V3[] = [[...origin, 0]];
  for (let step = 0; step < 5; step++) {
    let nearest = Infinity, edge = -1;
    for (let i = 0; i < 3; i++) {
      const t = hitSeg(origin, direction, vertices[i], vertices[(i + 1) % 3]);
      if (t > 1e-5 && t < nearest) { nearest = t; edge = i; }
    }
    if (edge < 0) break;
    const hit: V2 = [origin[0] + nearest * direction[0], origin[1] + nearest * direction[1]];
    path.push([...hit, 0]);
    const a = vertices[edge], b = vertices[(edge + 1) % 3];
    let normal = norm2([-(b[1] - a[1]), b[0] - a[0]]);
    if (normal[0] * direction[0] + normal[1] * direction[1] > 0) normal = [-normal[0], -normal[1]];
    const next = refract2(direction, normal, inside ? index : 1, inside ? 1 : index);
    if (next) { direction = next; inside = !inside; }
    else direction = reflect2(direction, normal);
    origin = [hit[0] + direction[0] * 1e-4, hit[1] + direction[1] * 1e-4];
    if (!inside) break;
  }
  let distance = direction[0] > 0.05 ? (2.2 - origin[0]) / direction[0] : 1.8;
  if (direction[1] < 0) distance = Math.min(distance, Math.max(0, (origin[1] - 0.3) / -direction[1]));
  path.push([origin[0] + direction[0] * distance, origin[1] + direction[1] * distance, 0]);
  return path;
}

export function Prism() {
  const angle = useParam('angle', 0);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(...local[0]); shape.lineTo(...local[1]); shape.lineTo(...local[2]); shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: false });
  }, []);
  return <group>
    <Box p={[-2.2, 1.55, 0]} s={[0.4, 0.4, 0.5]} m={MAT.darkSteel} />
    <Cyl p={[-2.2, 0.6, 0]} r={0.055} h={1.2} m={MAT.steel} />
    <mesh geometry={geometry} position={[0, CENTER[1], -0.4]} rotation-z={angle * Math.PI / 180} material={MAT.glass} />
    <Box p={[0, 0.2, 0]} s={[1.7, 0.18, 1.3]} m={MAT.darkWood} />
    <Box p={[2.24, 1.5, 0]} s={[0.05, 2.6, 1.5]} m={MAT.white} />
    <Beam segs={1} color="#ffffff" r={0.025} pulse get={io => prismRay(io, 0).slice(0, 2)} />
    {RAINBOW.map(c => <Beam key={c.color} segs={6} color={c.color} r={0.014} pulse get={io => prismRay(io, c.n).slice(1)} />)}
    <Label text="白光" p={[-1.8, 2.05, 0]} size={0.22} />
    <Label text="三棱镜" p={[0, 2.65, 0]} size={0.24} />
    <IoLabel p={[0, 3.2, 0]} size={0.21} get={io => `转角 ${io.p('angle', 0).toFixed(0)}° · 色散放大 ${io.p('spread', 1.5).toFixed(1)} 倍`} />
    <Label text="光路按折射定律；颜色间距放大显示" p={[0, 0.35, 1]} size={0.17} />
  </group>;
}

export function WaterMirror() {
  const mirror = useRef<THREE.Mesh>(null);
  const level = useParam('waterDepth', 4);
  const surface = 0.8 + level * 0.075;
  const point = (io: RigIO, c: number): V3[] => {
    const angle = io.p('incidence', 40) * Math.PI / 180;
    const refracted = Math.asin(Math.sin(angle) / (1.333 + c * 0.004));
    const depth = io.p('waterDepth', 4) * 0.075;
    const y = 0.8 + depth;
    const x = depth * Math.tan(refracted);
    // The outgoing color band is a qualitative teaching diagram, not a calibrated spectrum.
    return [[-1.4 * Math.sin(angle), y + 1.4 * Math.cos(angle), 0], [0, y, 0], [x, 0.8, 0], [2 * x, y, 0], [1.9, 2.35 + c * 0.18, 0]];
  };
  useRig(io => { if (mirror.current) mirror.current.position.x = io.p('waterDepth', 4) * 0.075 * Math.tan(Math.asin(Math.sin(io.p('incidence', 40) * Math.PI / 180) / 1.333)); });
  return <group>
    <Vessel kind="beaker" p={[0, 0, 0]} r={1.25} h={1.7} level={surface / 1.7} liquid="#9cd5de" />
    <mesh ref={mirror} position={[0.15, 0.8, 0]} material={MAT.steel}><boxGeometry args={[0.8, 0.04, 0.8]} /></mesh>
    <Box p={[1.95, 2.25, 0]} s={[0.06, 1.9, 1.2]} m={MAT.white} />
    <Beam segs={1} color="#ffffff" r={0.025} get={io => point(io, 0).slice(0, 2)} />
    {RAINBOW.map(c => <Beam key={c.color} segs={3} color={c.color} r={0.012} pulse get={io => point(io, c.n).slice(1)} />)}
    <Label text="水下镜面" p={[-0.9, 0.65, 0.7]} size={0.19} />
    <Label text="白纸屏" p={[1.9, 3.35, 0]} size={0.21} />
    <IoLabel p={[0, 3.75, 0]} size={0.2} get={io => `入射角 ${io.p('incidence', 40)}° · 水深 ${io.p('waterDepth', 4)} cm`} />
    <Label text="折射—镜面反射—出射；色带位置为示意" p={[0, 0.25, 1.2]} size={0.17} />
  </group>;
}

const stream = (flow: number, u: number): V3 => [-0.6 + 2.5 * u, 1.7 - 1.3 * u * u / Math.max(0.5, flow), 0];
function WaterDrop({ offset }: { offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useRig(io => {
    if (!ref.current) return;
    const p = stream(io.p('flow', 1), (io.t * io.p('flow', 1) * 0.6 + offset) % 1);
    ref.current.position.set(...p); ref.current.visible = p[1] > 0.2;
  });
  return <mesh ref={ref}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color="#e2f9ff" /></mesh>;
}
export function WaterStream() {
  const flow = useParam('flow', 1), attenuation = useParam('attenuation', 20);
  const water = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#71c8df', transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false }), []);
  const pts = Array.from({ length: 19 }, (_, i) => stream(flow, i / 18)).filter(p => p[1] > 0.15);
  return <group>
    <Vessel kind="jar" p={[-1.3, 0, 0]} r={0.65} h={2.45} level={0.78} liquid="#a5dce5" />
    <Tube pts={[[-1.3, 1.7, 0], [-0.6, 1.7, 0]]} r={0.09} m={water} />
    <Tube pts={pts} r={0.11} m={water} />
    <Box p={[-2.1, 1.7, 0]} s={[0.48, 0.25, 0.3]} m={MAT.darkSteel} />
    <Box p={[1.4, 0.16, 0]} s={[1.2, 0.06, 1.2]} m={MAT.white} />
    <Beam segs={22} color="#ff3b30" opacity={1 - attenuation / 100} r={0.018} pulse get={io => {
      if (!io.sb('totalInternalReflection', false)) return [[-2, 1.7, 0], [-0.6, 1.7, 0], [1.9, 1.7, 0]];
      return [[-2, 1.7, 0], ...Array.from({ length: 20 }, (_, i) => {
        const p = stream(io.p('flow', 1), i / 19); p[2] = (i % 2 ? 1 : -1) * 0.07; return p;
      }).filter(p => p[1] > 0.2)];
    }} />
    {Array.from({ length: 8 }, (_, i) => <WaterDrop key={i} offset={i / 8} />)}
    <IoLabel p={[0, 3.2, 0]} size={0.22} get={io => io.sb('totalInternalReflection', false) ? '满足全反射条件：光随水流转弯' : '未满足全反射条件：光从水流逸出'} />
    <Label text="水流曲线与反射次数为教学示意" p={[0, 0.4, 1]} size={0.18} />
  </group>;
}

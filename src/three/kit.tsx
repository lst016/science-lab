import { ReactNode, forwardRef, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { observe, rt } from '../state/runtime';
import type { Observation } from '../sim/core';

/* ---------- 共享材质 ---------- */
const mk = <T extends THREE.Material>(m: T) => m;
export const MAT = {
  glass: mk(new THREE.MeshPhysicalMaterial({ color: '#d4eef2', transparent: true, opacity: 0.26, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide, depthWrite: false })),
  steel: mk(new THREE.MeshStandardMaterial({ color: '#b9bec4', roughness: 0.32, metalness: 0.85 })),
  darkSteel: mk(new THREE.MeshStandardMaterial({ color: '#5c6168', roughness: 0.45, metalness: 0.8 })),
  brass: mk(new THREE.MeshStandardMaterial({ color: '#c79a45', roughness: 0.35, metalness: 0.8 })),
  copper: mk(new THREE.MeshStandardMaterial({ color: '#c06c3e', roughness: 0.35, metalness: 0.85 })),
  wood: mk(new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.78 })),
  darkWood: mk(new THREE.MeshStandardMaterial({ color: '#7d5530', roughness: 0.8 })),
  rubber: mk(new THREE.MeshStandardMaterial({ color: '#3a3a3d', roughness: 0.9 })),
  white: mk(new THREE.MeshStandardMaterial({ color: '#f1ede3', roughness: 0.7 })),
  card: mk(new THREE.MeshStandardMaterial({ color: '#e5d3ae', roughness: 0.95 })),
  red: mk(new THREE.MeshStandardMaterial({ color: '#c8402f', roughness: 0.55 })),
  blue: mk(new THREE.MeshStandardMaterial({ color: '#3f6ea6', roughness: 0.55 })),
  green: mk(new THREE.MeshStandardMaterial({ color: '#4c8a55', roughness: 0.55 })),
  black: mk(new THREE.MeshStandardMaterial({ color: '#24252a', roughness: 0.6 })),
  plastic: mk(new THREE.MeshStandardMaterial({ color: '#e8e2d2', roughness: 0.5 })),
};

export const liquidMat = (color: string, opacity = 0.78) =>
  new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.15, clearcoat: 0.6, depthWrite: false });

export const col = (c: string) => new THREE.Color(c);

/* ---------- 纸雕底座 ---------- */
const slabCache = new Map<string, THREE.BufferGeometry>();
function roundedSlab(w: number, d: number, h: number, r: number) {
  const key = `${w}|${d}|${h}|${r}`;
  const hit = slabCache.get(key);
  if (hit) return hit;
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.015, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  slabCache.set(key, g);
  return g;
}
export function Stage({ w = 4.9, d = 5.8, color = '#efe3c6' }: { w?: number; d?: number; color?: string }) {
  const geo = useMemo(() => roundedSlab(w, d, 0.07, 0.35), [w, d]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

/* ---------- 基础形状 ---------- */
export type V3 = [number, number, number];

export function Box({ p = [0, 0, 0], s, m = MAT.white, rot, cast = true }: { p?: V3; s: V3; m?: THREE.Material; rot?: V3; cast?: boolean }) {
  return (
    <mesh position={p} rotation={rot} castShadow={cast} receiveShadow material={m}>
      <boxGeometry args={s} />
    </mesh>
  );
}
export function Cyl({ p = [0, 0, 0], r, h, rt, m = MAT.steel, rot, seg = 28, cast = true }: { p?: V3; r: number; h: number; rt?: number; m?: THREE.Material; rot?: V3; seg?: number; cast?: boolean }) {
  return (
    <mesh position={p} rotation={rot} castShadow={cast} receiveShadow material={m}>
      <cylinderGeometry args={[rt ?? r, r, h, seg]} />
    </mesh>
  );
}
export function Ball({ p = [0, 0, 0], r, m = MAT.steel }: { p?: V3; r: number; m?: THREE.Material }) {
  return (
    <mesh position={p} castShadow receiveShadow material={m}>
      <sphereGeometry args={[r, 24, 18]} />
    </mesh>
  );
}

/** 两点之间的细圆柱（导线、杆、绳） */
export function Rod({ a, b, r = 0.03, m = MAT.steel, cast = true }: { a: V3; b: V3; r?: number; m?: THREE.Material; cast?: boolean }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: q, len };
  }, [a[0], a[1], a[2], b[0], b[1], b[2]]);
  return (
    <mesh position={pos} quaternion={quat} castShadow={cast} material={m}>
      <cylinderGeometry args={[r, r, len, 10]} />
    </mesh>
  );
}

/** 折线管（导线/导气管）：沿点序列的 Tube */
export function Tube({ pts, r = 0.04, m = MAT.copper, cast = true, closed = false }: { pts: V3[]; r?: number; m?: THREE.Material; cast?: boolean; closed?: boolean }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.02);
    return new THREE.TubeGeometry(curve, Math.max(12, pts.length * 14), r, 8, closed);
  }, [JSON.stringify(pts), r, closed]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} castShadow={cast} material={m} />;
}

/* ---------- 玻璃仪器 ---------- */
function lathe(points: [number, number][], seg = 32) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}
export type VesselKind = 'beaker' | 'tube' | 'flask' | 'cylinder' | 'jar' | 'round' | 'bell';

export function vesselProfile(kind: VesselKind, r: number, h: number): [number, number][] {
  switch (kind) {
    case 'tube':
      return [[0, 0], [r * 0.7, 0.02 * h], [r, r * 0.8], [r, h], [r * 1.12, h + 0.02]];
    case 'flask': // 锥形瓶
      return [[0, 0], [r, 0.01], [r * 1.0, 0.03 * h], [r * 0.34, h * 0.78], [r * 0.34, h], [r * 0.4, h + 0.02]];
    case 'round': // 圆底烧瓶
      return [[0, 0], [r * 0.5, 0.05 * r], [r * 0.9, r * 0.4], [r, r], [r * 0.9, r * 1.6], [r * 0.45, r * 1.95], [r * 0.3, r * 2.2], [r * 0.3, h], [r * 0.36, h + 0.02]];
    case 'jar': // 集气瓶
      return [[0, 0], [r, 0.01], [r, h * 0.82], [r * 0.7, h * 0.9], [r * 0.7, h], [r * 0.78, h + 0.02]];
    case 'bell': // 钟罩
      return [[0, h], [r * 0.55, h * 0.98], [r * 0.9, h * 0.85], [r, h * 0.5], [r, 0.02], [r * 1.12, 0]];
    case 'cylinder':
      return [[0, 0], [r * 1.5, 0], [r * 1.5, 0.04], [r * 0.6, 0.09], [r, 0.12], [r, h], [r * 1.1, h + 0.015]];
    case 'beaker':
    default:
      return [[0, 0], [r * 0.95, 0], [r, 0.02], [r, h], [r * 1.06, h + 0.02]];
  }
}

/** 玻璃器皿（只画壳），可选内部液体：level 0..1（相对内高），liquidRef 可由上层每帧修改 scale.y。 */
export const Vessel = forwardRef<THREE.Mesh, { kind?: VesselKind; r?: number; h?: number; p?: V3; level?: number; liquid?: string; liquidOpacity?: number; children?: ReactNode; rot?: V3 }>(function Vessel(
  { kind = 'beaker', r = 0.6, h = 1.4, p = [0, 0, 0], level = 0, liquid = '#8fd0e4', liquidOpacity = 0.78, children, rot },
  liquidRef,
) {
  const geo = useMemo(() => lathe(vesselProfile(kind, r, h)), [kind, r, h]);
  const liqGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 28);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const lm = useMemo(() => liquidMat(liquid, liquidOpacity), [liquid, liquidOpacity]);
  const innerR = kind === 'flask' ? r * 0.96 : kind === 'round' ? r * 0.9 : kind === 'cylinder' ? r * 0.96 : r * 0.96;
  const liqH = (kind === 'flask' ? h * 0.7 : kind === 'round' ? r * 1.8 : h * 0.97);
  const lr = kind === 'flask' || kind === 'round' ? innerR * 0.9 : innerR;
  return (
    <group position={p} rotation={rot}>
      <mesh geometry={geo} material={MAT.glass} renderOrder={2} />
      {level > 0 && (
        <mesh ref={liquidRef} geometry={liqGeo} material={lm} position={[0, 0.03, 0]} scale={[lr, Math.max(0.0001, level * liqH), lr]} renderOrder={1} />
      )}
      {children}
    </group>
  );
});

/* ---------- 带实时刷新的帧回调 ---------- */
export function useObs(cb: (o: Observation, dt: number, t: number) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useFrame((_, dt) => {
    const o = observe();
    if (o) ref.current(o, dt, rt.time);
  });
}

/* ---------- 文字标签（Sprite） ---------- */
const labelCache = new Map<string, THREE.CanvasTexture>();
export function labelTexture(text: string, color: string, bg: string) {
  const key = `${text}|${color}|${bg}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const fs = 44;
  g.font = `600 ${fs}px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + 36;
  c.width = w;
  c.height = fs + 26;
  g.font = `600 ${fs}px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif`;
  g.fillStyle = bg;
  const rr = 18;
  g.beginPath();
  g.roundRect(2, 2, w - 4, c.height - 4, rr);
  g.fill();
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.fillText(text, 18, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  labelCache.set(key, t);
  return t;
}
export function Label({ text, p = [0, 0, 0], size = 0.28, color = '#3a2e20', bg = 'rgba(255,250,235,0.9)' }: { text: string; p?: V3; size?: number; color?: string; bg?: string }) {
  const tex = useMemo(() => labelTexture(text, color, bg), [text, color, bg]);
  const img = tex.image as HTMLCanvasElement;
  const aspect = img.width / img.height;
  return (
    <sprite position={p} scale={[size * aspect, size, 1]} renderOrder={10}>
      <spriteMaterial map={tex} transparent depthTest={false} />
    </sprite>
  );
}

/** 随观察值刷新的标签：只在文字变化时重绘贴图 */
export function LiveLabel({ get, p = [0, 0, 0], size = 0.3, color = '#183018', bg = 'rgba(245,252,236,0.95)' }: { get: (o: Observation) => string; p?: V3; size?: number; color?: string; bg?: string }) {
  const sprite = useRef<THREE.Sprite>(null);
  const last = useRef('');
  useObs((o) => {
    const text = get(o);
    if (text === last.current || !sprite.current) return;
    last.current = text;
    const tex = labelTexture(text, color, bg);
    const mat = sprite.current.material as THREE.SpriteMaterial;
    mat.map = tex;
    mat.needsUpdate = true;
    const img = tex.image as HTMLCanvasElement;
    sprite.current.scale.set(size * (img.width / img.height), size, 1);
  });
  return (
    <sprite ref={sprite} position={p} scale={[size * 3, size, 1]} renderOrder={10}>
      <spriteMaterial transparent depthTest={false} />
    </sprite>
  );
}

/* ---------- 通用器械 ---------- */
/** 铁架台：底座 + 立杆 */
export function StandBase({ p = [-1.6, 0, -1.5], h = 4 }: { p?: V3; h?: number }) {
  return (
    <group position={p}>
      <Box p={[0, 0.08, 0]} s={[1.3, 0.16, 0.9]} m={MAT.darkSteel} />
      <Cyl p={[-0.2, h / 2 + 0.08, 0]} r={0.05} h={h} m={MAT.steel} />
    </group>
  );
}

export function Thermo({ p = [0, 0, 0], h = 1.8, value = 0, min = 0, max = 100, tilt = 0 }: { p?: V3; h?: number; value?: number; min?: number; max?: number; tilt?: number }) {
  const col = useRef<THREE.Mesh>(null);
  const f = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return (
    <group position={p} rotation={[0, 0, tilt]}>
      <Cyl p={[0, h / 2, 0]} r={0.045} h={h} m={MAT.glass} cast={false} />
      <Ball p={[0, 0.07, 0]} r={0.085} m={MAT.red} />
      <mesh ref={col} position={[0, 0.07, 0]} scale={[1, 0.1 + f * (h - 0.4), 1]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 1, 10]} />
        <meshStandardMaterial color="#d23a2a" />
      </mesh>
      <mesh position={[0, 0.07 + (0.1 + f * (h - 0.4)) / 2, 0]} scale={[1, 0.1 + f * (h - 0.4), 1]} visible={false} />
    </group>
  );
}

/** 酒精灯，flame 0..1 */
export function AlcoholLamp({ p = [0, 0, 0], flame = 1, flameRef }: { p?: V3; flame?: number; flameRef?: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group position={p}>
      <Vessel kind="flask" r={0.34} h={0.5} liquid="#d9e8f0" level={0.45} liquidOpacity={0.5} />
      <Cyl p={[0, 0.58, 0]} r={0.07} h={0.2} m={MAT.brass} />
      {flame > 0.01 && (
        <mesh ref={flameRef} position={[0, 0.78 + 0.16 * flame, 0]} scale={[1, flame, 1]}>
          <coneGeometry args={[0.1, 0.4, 14]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

/** 螺旋弹簧（沿 y 方向，从 0 到 len） */
export function Spring({ len, r = 0.12, coils = 14, wire = 0.02, m = MAT.steel }: { len: number; r?: number; coils?: number; wire?: number; m?: THREE.Material }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = coils * 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * coils * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, -t, Math.sin(a) * r));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 6, false);
  }, [r, coils, wire]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} scale={[1, len, 1]} material={m} castShadow />;
}

/** 刻度尺（沿 x 轴铺在纸面） */
export function Ruler({ p = [0, 0, 0], len = 4, ticks = 20, w = 0.4 }: { p?: V3; len?: number; ticks?: number; w?: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f2d98b'; g.fillRect(0, 0, 1024, 128);
    g.fillStyle = '#4a3a1a'; g.strokeStyle = '#4a3a1a'; g.lineWidth = 2;
    g.font = '24px sans-serif'; g.textAlign = 'center';
    for (let i = 0; i <= ticks; i++) {
      const x = 12 + (i / ticks) * 1000;
      const major = i % 5 === 0;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, major ? 52 : 34); g.stroke();
      if (major) g.fillText(String(i / 1), x, 84);
      if (i < ticks) for (let k = 1; k < 5; k++) { const xx = x + (k / 5) * (1000 / ticks); g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, 20); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [ticks]);
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[len, w, 0.04]} />
      <meshStandardMaterial map={tex} roughness={0.6} />
    </mesh>
  );
}

/** 气泡/粒子池：N 个小球，由上层每帧写矩阵 */
export function useInstanced(n: number, r = 0.04, color = '#ffffff', opacity = 0.7) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(r, 10, 8), [r]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.2 }), [color, opacity]);
  const el = <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />;
  return { ref, el };
}

export const DUMMY = new THREE.Object3D();

/* ---------- 动态折线管：每帧由回调写入路径点（波形、弦、光线、导线） ---------- */
export const DynLine = forwardRef<THREE.Mesh, { n?: number; r?: number; color?: string; opacity?: number; emissive?: boolean; radial?: number; fill: (pts: Float32Array, n: number) => void; cast?: boolean }>(function DynLine(
  { n = 48, r = 0.03, color = '#c8402f', opacity = 1, emissive = false, radial = 5, fill, cast = false },
  _ref,
) {
  const mesh = useRef<THREE.Mesh>(null);
  const fillRef = useRef(fill);
  fillRef.current = fill;
  const { geo, path } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const vc = (n + 1) * radial;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vc * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < radial; k++) {
        const a = i * radial + k;
        const b = i * radial + ((k + 1) % radial);
        const c = (i + 1) * radial + k;
        const d = (i + 1) * radial + ((k + 1) % radial);
        idx.push(a, c, b, b, c, d);
      }
    }
    g.setIndex(idx);
    return { geo: g, path: new Float32Array((n + 1) * 3) };
  }, [n, radial]);
  useEffect(() => () => geo.dispose(), [geo]);
  const tmp = useMemo(() => ({ t: new THREE.Vector3(), u: new THREE.Vector3(), v: new THREE.Vector3(), ref: new THREE.Vector3() }), []);
  useFrame(() => {
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    fillRef.current(path, n);
    const { t, u, v, ref } = tmp;
    for (let i = 0; i <= n; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(n, i + 1);
      t.set(path[i1 * 3] - path[i0 * 3], path[i1 * 3 + 1] - path[i0 * 3 + 1], path[i1 * 3 + 2] - path[i0 * 3 + 2]);
      if (t.lengthSq() < 1e-12) t.set(1, 0, 0);
      t.normalize();
      ref.set(0, 0, 1);
      if (Math.abs(t.z) > 0.9) ref.set(0, 1, 0);
      u.crossVectors(t, ref).normalize();
      v.crossVectors(t, u).normalize();
      for (let k = 0; k < radial; k++) {
        const a = (k / radial) * Math.PI * 2;
        const ca = Math.cos(a) * r;
        const sa = Math.sin(a) * r;
        pos.setXYZ(i * radial + k, path[i * 3] + u.x * ca + v.x * sa, path[i * 3 + 1] + u.y * ca + v.y * sa, path[i * 3 + 2] + u.z * ca + v.z * sa);
      }
    }
    pos.needsUpdate = true;
    geo.computeBoundingSphere();
  });
  return (
    <mesh ref={mesh} geometry={geo} frustumCulled={false} castShadow={cast}>
      {emissive ? <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} /> : <meshStandardMaterial color={color} roughness={0.5} transparent={opacity < 1} opacity={opacity} />}
    </mesh>
  );
});

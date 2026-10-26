import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Ball, Box, Cyl, DynLine, DUMMY, MAT, V3, labelTexture } from '../kit';
import { RigIO, clamp, useRig } from './io';

/** 示波器屏幕：竖立的黑色面板，上面画一条随时间滚动的波形。 */
export function Scope({ p = [0, 1.3, -2.2], w = 3.2, h = 1.7, wave, color = '#7cf2a8', label }: { p?: V3; w?: number; h?: number; wave: (x01: number, io: RigIO) => number; color?: string; label?: boolean }) {
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 8; i++) { const x = -w / 2 + (i / 8) * w; pts.push(x, -h / 2, 0, x, h / 2, 0); }
    for (let j = 0; j <= 4; j++) { const y = -h / 2 + (j / 4) * h; pts.push(-w / 2, y, 0, w / 2, y, 0); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [w, h]);
  const ioRef = useRef<RigIO | null>(null);
  useRig((io) => { ioRef.current = io; });
  return (
    <group position={p} rotation={[-0.18, 0, 0]}>
      <Box p={[0, 0, -0.06]} s={[w + 0.3, h + 0.3, 0.12]} m={MAT.black} />
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#0c2216" />
      </mesh>
      <lineSegments geometry={grid} position={[0, 0, 0.004]}>
        <lineBasicMaterial color="#2c6a46" />
      </lineSegments>
      <group position={[0, 0, 0.012]}>
        <DynLine n={120} r={0.022} color={color} emissive radial={4} fill={(pts, n) => {
          const io = ioRef.current;
          for (let i = 0; i <= n; i++) {
            const x01 = i / n;
            const y = io ? clamp(wave(x01, io), -1, 1) * (h / 2 - 0.1) : 0;
            pts[i * 3] = -w / 2 + x01 * w; pts[i * 3 + 1] = y; pts[i * 3 + 2] = 0;
          }
        }} />
      </group>
      {label && <Box p={[0, -h / 2 - 0.28, 0.02]} s={[0.5, 0.1, 0.1]} m={MAT.darkSteel} />}
    </group>
  );
}

/** 向外扩散的声波环（半透明圆环），强度由 amp(io) 给出。 */
export function Rings({ p = [0, 0.8, 0], rot = [0, Math.PI / 2, 0], amp, count = 4, speed = 0.5, maxR = 2.2, color = '#4a86b0' }: { p?: V3; rot?: V3; amp: (io: RigIO) => number; count?: number; speed?: number; maxR?: number; color?: string }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useRig((io) => {
    const a = clamp(amp(io), 0, 1);
    for (let k = 0; k < count; k++) {
      const m = refs.current[k];
      const mat = mats.current[k];
      if (!m || !mat) continue;
      const ph = (((io.t * speed + k / count) % 1) + 1) % 1;
      const r = 0.2 + ph * maxR;
      m.scale.set(r, r, 1);
      mat.opacity = a * (1 - ph) * 0.8;
      m.visible = a > 0.01;
    }
  });
  return (
    <group position={p} rotation={rot}>
      {Array.from({ length: count }).map((_, k) => (
        <mesh key={k} ref={(m) => { refs.current[k] = m; }}>
          <ringGeometry args={[0.93, 1, 40]} />
          <meshBasicMaterial ref={(m) => { mats.current[k] = m; }} color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 空气分子/粒子云：在盒形区域里随机游走。count 为可见个数，jitter 控制活跃度。 */
export function Swarm({ box, n = 80, r = 0.035, color = '#7aa6c8', count, jitter, seed = 1, p = [0, 0, 0] }: { box: V3; n?: number; r?: number; color?: string; count: (io: RigIO) => number; jitter: (io: RigIO) => number; seed?: number; p?: V3 }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const base = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Array.from({ length: n }, () => ({ x: rnd(), y: rnd(), z: rnd(), a: rnd() * 6.28, b: rnd() * 6.28, c: rnd() * 6.28, f: 0.6 + rnd() * 1.2 }));
  }, [n, seed]);
  const geo = useMemo(() => new THREE.SphereGeometry(r, 8, 6), [r]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.4 }), [color]);
  useRig((io) => {
    const m = ref.current;
    if (!m) return;
    const c = Math.round(clamp(count(io), 0, n));
    const j = jitter(io);
    m.count = c;
    for (let i = 0; i < c; i++) {
      const b = base[i];
      const ph = io.t * b.f * (0.5 + j);
      DUMMY.position.set(
        (b.x - 0.5) * box[0] + Math.sin(ph + b.a) * 0.12 * (0.3 + j) * box[0] * 0.3,
        b.y * box[1] + Math.sin(ph * 1.3 + b.b) * 0.1 * (0.3 + j) * box[1] * 0.3,
        (b.z - 0.5) * box[2] + Math.cos(ph * 0.9 + b.c) * 0.12 * (0.3 + j) * box[2] * 0.3,
      );
      DUMMY.scale.setScalar(1);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={p}>
      <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} castShadow={false} />
    </group>
  );
}

/** 音叉：两臂 + 柄，可绕 x 轴不动，臂横向摆动用 amp 缩放。 */
export function Fork({ p = [0, 0, 0], ampRef, big = false }: { p?: V3; ampRef: React.MutableRefObject<number>; big?: boolean }) {
  const l = useRef<THREE.Mesh>(null);
  const r = useRef<THREE.Mesh>(null);
  useRig((io) => {
    const a = ampRef.current * Math.sin(io.t * 40);
    if (l.current) l.current.position.x = -0.12 + a * 0.05;
    if (r.current) r.current.position.x = 0.12 - a * 0.05;
  });
  const s = big ? 1.3 : 1;
  return (
    <group position={p} scale={s}>
      <Cyl p={[0, 0.25, 0]} r={0.035} h={0.5} m={MAT.steel} />
      <Box p={[0, 0.52, 0]} s={[0.3, 0.05, 0.06]} m={MAT.steel} />
      <mesh ref={l} position={[-0.12, 1.1, 0]} castShadow material={MAT.steel}><boxGeometry args={[0.06, 1.1, 0.06]} /></mesh>
      <mesh ref={r} position={[0.12, 1.1, 0]} castShadow material={MAT.steel}><boxGeometry args={[0.06, 1.1, 0.06]} /></mesh>
    </group>
  );
}

/** 扬声器：木箱 + 纸盆，纸盆随 amp 前后抖动。 */
export function Speaker({ p = [0, 0, 0], rot, ampRef, size = 1 }: { p?: V3; rot?: V3; ampRef: React.MutableRefObject<number>; size?: number }) {
  const cone = useRef<THREE.Mesh>(null);
  useRig((io) => {
    if (cone.current) cone.current.position.z = 0.34 * size + ampRef.current * 0.05 * Math.sin(io.t * 30);
  });
  return (
    <group position={p} rotation={rot} scale={size}>
      <Box p={[0, 0.7, 0]} s={[1.2, 1.4, 0.7]} m={MAT.darkWood} />
      <mesh ref={cone} position={[0, 0.72, 0.34]} rotation={[Math.PI / 2, 0, 0]} castShadow material={MAT.black}>
        <cylinderGeometry args={[0.1, 0.42, 0.14, 24]} />
      </mesh>
      <Ball p={[0, 0.72, 0.4]} r={0.08} m={MAT.darkSteel} />
      <Cyl p={[0, 1.18, 0.34]} r={0.1} h={0.04} rot={[Math.PI / 2, 0, 0]} m={MAT.black} />
    </group>
  );
}

/** 由 io 驱动的文字标签：文字变化时才重绘贴图。 */
export function IoLabel({ get, p = [0, 0, 0], size = 0.3, color = '#183018', bg = 'rgba(245,252,236,0.95)' }: { get: (io: RigIO) => string; p?: V3; size?: number; color?: string; bg?: string }) {
  const sprite = useRef<THREE.Sprite>(null);
  const last = useRef('');
  useRig((io) => {
    const text = get(io);
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

/** 折线光线/导线：n 段，fill 每帧写入 (n+1) 个点（x,y,z 连续排列）。 */
export function Poly({ n = 1, r = 0.025, color = '#e23a2a', opacity = 1, fill, visible }: { n?: number; r?: number; color?: string; opacity?: number; fill: (pts: Float32Array, io: RigIO) => void; visible?: (io: RigIO) => boolean }) {
  const ioRef = useRef<RigIO | null>(null);
  const grp = useRef<THREE.Group>(null);
  useRig((io) => {
    ioRef.current = io;
    if (grp.current && visible) grp.current.visible = visible(io);
  });
  const tmp = useMemo(() => new Float32Array((n + 1) * 3), [n]);
  return (
    <group ref={grp}>
      <DynLine n={n} r={r} color={color} opacity={opacity} emissive radial={4} fill={(pts, nn) => {
        const io = ioRef.current;
        if (io) fill(tmp, io);
        for (let i = 0; i < (nn + 1) * 3; i++) pts[i] = tmp[i];
      }} />
    </group>
  );
}

/** 单段光线 a→b（由回调给出）。 */
export function Ray({ get, ...rest }: { get: (io: RigIO) => [V3, V3]; r?: number; color?: string; opacity?: number; visible?: (io: RigIO) => boolean }) {
  return <Poly n={1} {...rest} fill={(pts, io) => { const [a, b] = get(io); pts[0] = a[0]; pts[1] = a[1]; pts[2] = a[2]; pts[3] = b[0]; pts[4] = b[1]; pts[5] = b[2]; }} />;
}

/** 虚线（法线、虚像连线）：固定端点，m 个短段。 */
export function Dashed({ a, b, m = 10, color = '#555', r = 0.014 }: { a: V3; b: V3; m?: number; color?: string; r?: number }) {
  const segs = useMemo(() => {
    const out: [V3, V3][] = [];
    for (let i = 0; i < m; i++) {
      const t0 = i / m;
      const t1 = (i + 0.55) / m;
      out.push([
        [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[2] + (b[2] - a[2]) * t0],
        [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, a[2] + (b[2] - a[2]) * t1],
      ]);
    }
    return out;
  }, [a[0], a[1], a[2], b[0], b[1], b[2], m]);
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={i} position={[(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2, (s[0][2] + s[1][2]) / 2]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(s[1][0] - s[0][0], s[1][1] - s[0][1], s[1][2] - s[0][2]).normalize())}>
          <cylinderGeometry args={[r, r, Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1], s[1][2] - s[0][2]), 5]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

/** 激光笔/光源：沿 +z 方向发光的小盒子，rotY 指向。 */
export function LaserBox({ p, rotY = 0, color = '#c8402f' }: { p: V3; rotY?: number; color?: string }) {
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <Box p={[0, 0.16, 0]} s={[0.42, 0.32, 0.8]} m={MAT.darkSteel} />
      <Cyl p={[0, 0.16, 0.42]} r={0.08} h={0.12} rot={[Math.PI / 2, 0, 0]} m={MAT.black} />
      <Ball p={[0, 0.16, 0.5]} r={0.05} m={new THREE.MeshBasicMaterial({ color })} />
    </group>
  );
}

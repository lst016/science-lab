import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Box, MAT, V3 } from '../kit';
import { IoLabel } from './parts';
import { RigIO, clamp, useRig } from './io';
import { InkBox, Post } from './electric-wire';

/* 指针式电流表/电压表：表盘贴图按量程画刻度，指针随读数转动，超量程时顶格抖动并变红。 */

const SWEEP = 2.0; // 指针总摆角（弧度）
const dialCache = new Map<string, THREE.CanvasTexture>();

function dial(kind: 'A' | 'V', max: number, text?: string) {
  const key = `${kind}${max}${text ?? ''}`;
  const hit = dialCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4efe0';
  g.fillRect(0, 0, 512, 512);
  const cx = 256, cy = 392;
  g.strokeStyle = '#2a2620'; g.fillStyle = '#2a2620';
  g.lineWidth = 3;
  g.beginPath(); g.arc(cx, cy, 214, -Math.PI / 2 - SWEEP / 2, -Math.PI / 2 + SWEEP / 2); g.stroke();
  const steps = 20;
  g.font = '600 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 - SWEEP / 2 + (i / steps) * SWEEP;
    const major = i % 5 === 0;
    const r1 = major ? 176 : 194;
    g.lineWidth = major ? 4 : 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * 214, cy + Math.sin(a) * 214); g.stroke();
    if (major) g.fillText(((i / steps) * max).toFixed(max < 1 ? 1 : 0), cx + Math.cos(a) * 146, cy + Math.sin(a) * 146);
  }
  g.font = '700 64px sans-serif';
  g.fillText(text ?? kind, cx, 205);
  g.font = '500 26px sans-serif';
  g.fillText(text ? `满偏 ${max}` : `量程 ${max}${kind}`, cx, 440);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  dialCache.set(key, t);
  return t;
}

/** 表的两个接线柱在 x=±0.6（+ 在 plusRight 一侧）。value 为被测值，max 为量程。 */
export function Meter({ p, kind, max, value, plusRight = true, tag, digits = 2, unit, dialText }: { p: V3; kind: 'A' | 'V'; max: number; value: (io: RigIO) => number; plusRight?: boolean; tag?: string; digits?: number; unit?: string; dialText?: string }) {
  const needle = useRef<THREE.Group>(null);
  const face = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => dial(kind, max, dialText), [kind, max, dialText]);
  const s = plusRight ? 1 : -1;
  useRig((io) => {
    const v = Math.abs(value(io));
    const over = v > max;
    const f = over ? 1.04 + 0.015 * Math.sin(io.t * 40) : v / max;
    const a = io.damp(`mt-${p[0]}-${p[2]}-${kind}`, clamp(f, 0, 1.06), 12);
    if (needle.current) needle.current.rotation.y = -(a - 0.5) * SWEEP;
    if (face.current) face.current.color.set(over ? '#ffb3a8' : '#ffffff');
  });
  return (
    <group position={p}>
      <InkBox p={[0, 0.25, 0]} s={[1.0, 0.5, 0.8]} m={MAT.black} />
      <mesh position={[0, 0.505, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.37, 40]} />
        <meshBasicMaterial ref={face} map={tex} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.37, 0.4, 40]} /><meshStandardMaterial color="#c9b98c" roughness={0.4} metalness={0.5} /></mesh>
      <group ref={needle} position={[0, 0.52, 0.184]}>
        <Box p={[0, 0, -0.14]} s={[0.014, 0.01, 0.3]} m={MAT.red} cast={false} />
        <mesh position={[0, 0, 0]} material={MAT.steel}><cylinderGeometry args={[0.03, 0.03, 0.02, 12]} /></mesh>
      </group>
      <Post p={[-0.6 * s, 0.14, 0]} color="black" />
      <Post p={[0.6 * s, 0.14, 0]} color="red" />
      <IoLabel p={[0, 0.98, 0]} size={0.24} get={(io) => `${tag ? tag + ' ' : ''}${Math.abs(value(io)).toFixed(digits)} ${unit ?? kind}`} />
    </group>
  );
}

/** 当前量程是否被超过 */
export const overRange = (v: number, max: number) => Math.abs(v) > max;

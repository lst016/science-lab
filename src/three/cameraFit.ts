import * as THREE from 'three';

/** 取景窗口：各边从画面边缘向内留出的 NDC 距离（0 = 贴边，2 = 整个画面） */
export interface FitMargins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface FitView {
  /** 观察点（相机沿 el/az 方向后退 dist 后注视此点） */
  target: THREE.Vector3;
  dist: number;
  el: number;
  az: number;
}

export function viewDir(el: number, az: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
}

const MIN_DIST = 4;
const MAX_DIST = 160;

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function place(probe: THREE.PerspectiveCamera, target: THREE.Vector3, dir: THREE.Vector3, dist: number): void {
  probe.position.copy(target).addScaledVector(dir, dist);
  probe.lookAt(target);
  probe.updateMatrixWorld();
}

function projectBounds(probe: THREE.PerspectiveCamera, points: THREE.Vector3[], v: THREE.Vector3): Bounds {
  const b: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const p of points) {
    v.copy(p).project(probe);
    if (v.x < b.minX) b.minX = v.x;
    if (v.x > b.maxX) b.maxX = v.x;
    if (v.y < b.minY) b.minY = v.y;
    if (v.y > b.maxY) b.maxY = v.y;
  }
  return b;
}

/** 观察点固定时，让全部点落进取景窗口的最小距离（二分） */
function solveDist(
  probe: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  dir: THREE.Vector3,
  points: THREE.Vector3[],
  m: FitMargins,
  v: THREE.Vector3,
): number {
  let lo = MIN_DIST;
  let hi = MAX_DIST;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    place(probe, target, dir, mid);
    const b = projectBounds(probe, points, v);
    const ok = b.minX >= -1 + m.left && b.maxX <= 1 - m.right && b.minY >= -1 + m.bottom && b.maxY <= 1 - m.top;
    if (ok) hi = mid; else lo = mid;
  }
  return hi;
}

/**
 * 迭代居中拟合：先求能容纳投影包围范围的距离，再把包围盒中心平移到取景窗口中心，
 * 平移后重新求距离。透视下包围盒中心与观察点不是线性关系，所以重复几轮收敛。
 * 相机始终沿固定方向后退，平移不改变视角。
 */
export function fitView(
  fov: number,
  aspect: number,
  points: THREE.Vector3[],
  seed: THREE.Vector3,
  el: number,
  az: number,
  m: FitMargins,
): FitView {
  const probe = new THREE.PerspectiveCamera(fov, aspect, 0.5, 400);
  const dir = viewDir(el, az);
  const v = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const target = seed.clone();
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const wx = (m.left - m.right) / 2;
  const wy = (m.bottom - m.top) / 2;

  let dist = solveDist(probe, target, dir, points, m, v);
  for (let i = 0; i < 6; i++) {
    place(probe, target, dir, dist);
    const b = projectBounds(probe, points, v);
    const dx = (b.minX + b.maxX) / 2 - wx;
    const dy = (b.minY + b.maxY) / 2 - wy;
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) break;
    right.setFromMatrixColumn(probe.matrixWorld, 0);
    up.setFromMatrixColumn(probe.matrixWorld, 1);
    // 内容在画面里偏右（dx>0）→ 观察点向右移，内容左移回中心
    target.addScaledVector(right, dx * dist * tanHalf * aspect).addScaledVector(up, dy * dist * tanHalf);
    dist = solveDist(probe, target, dir, points, m, v);
  }
  return { target, dist, el, az };
}

/**
 * 在若干俯仰角里选放大倍数最大（距离最小）者；差距在 tolerance 内时取更高的俯仰角，
 * 因为越俯视，书页文字压缩越少。
 */
export function fitBestElevation(
  fov: number,
  aspect: number,
  points: THREE.Vector3[],
  seed: THREE.Vector3,
  elevations: number[],
  az: number,
  m: FitMargins,
  tolerance = 0.03,
): FitView {
  const views = elevations.map((el) => fitView(fov, aspect, points, seed, el, az, m));
  const best = Math.min(...views.map((r) => r.dist));
  const near = views.filter((r) => r.dist <= best * (1 + tolerance));
  return near.reduce((a, r) => (r.el > a.el ? r : a));
}

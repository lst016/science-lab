import * as THREE from 'three';

export const PAGE_W = 6;
export const PAGE_H = 7.4;
const N = 22; // 沿宽度分段

// 中缝：紧贴装订线的窄折痕 + 向外缓缓抬起的宽弧，页面柔软自然下弯
const dipAt = (d: number, t: number) => {
  const k = Math.min(0.24, t * 0.62);
  return k * (0.62 * Math.exp(-Math.pow(d / 1.7, 1.45)) + 0.38 * Math.exp(-Math.pow(d / 0.42, 1.2)));
};

/** 一摞书页（单侧）：顶面带书脊下陷曲线，侧面是页缘。分组 0=顶面，1=侧面。 */
export function createPageBlock(side: 1 | -1 = 1): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const topV = (N + 1) * 2;
  const skirtV = (N + 1) * 2 * 2; // 前后各一
  const outerV = 4;
  const total = topV + skirtV + outerV;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  const idx: number[] = [];
  // 顶面
  for (let i = 0; i < N; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    if (side === 1) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, b, c, d);
  }
  g.addGroup(0, idx.length, 0);
  const sideStart = idx.length;
  // 前后裙边
  for (let k = 0; k < 2; k++) {
    const base = topV + k * (N + 1) * 2;
    for (let i = 0; i < N; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      if (side === 1) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, b, c, d);
    }
  }
  const ob = topV + skirtV;
  if (side === 1) idx.push(ob, ob + 1, ob + 2, ob + 2, ob + 1, ob + 3); else idx.push(ob, ob + 2, ob + 1, ob + 1, ob + 2, ob + 3);
  g.addGroup(sideStart, idx.length - sideStart, 1);
  g.setIndex(idx);
  return g;
}

/** side=+1 右侧页（x>0），-1 左侧页；t 为厚度 */
export function updatePageBlock(g: THREE.BufferGeometry, t: number, side: 1 | -1) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const hz = PAGE_H / 2;
  let v = 0;
  const topY = (d: number) => Math.max(0.01, t - dipAt(d, t));
  // 顶面 (z-, z+)
  for (let i = 0; i <= N; i++) {
    const d = (i / N) * PAGE_W;
    const y = topY(d);
    const u = side === 1 ? d / PAGE_W : 1 - d / PAGE_W;
    pos.setXYZ(v, side * d, y, -hz); uv.setXY(v, u, 1); v++;
    pos.setXYZ(v, side * d, y, hz); uv.setXY(v, u, 0); v++;
  }
  // 前后裙边 (顶 → 底)
  for (const z of [-hz, hz]) {
    for (let i = 0; i <= N; i++) {
      const d = (i / N) * PAGE_W;
      const y = topY(d);
      pos.setXYZ(v, side * d, y, z); uv.setXY(v, d / PAGE_W, y * 14); v++;
      pos.setXYZ(v, side * d, 0, z); uv.setXY(v, d / PAGE_W, 0); v++;
    }
  }
  const yo = topY(PAGE_W);
  pos.setXYZ(v, side * PAGE_W, yo, -hz); uv.setXY(v, 0, yo * 14); v++;
  pos.setXYZ(v, side * PAGE_W, 0, -hz); uv.setXY(v, 0, 0); v++;
  pos.setXYZ(v, side * PAGE_W, yo, hz); uv.setXY(v, 1, yo * 14); v++;
  pos.setXYZ(v, side * PAGE_W, 0, hz); uv.setXY(v, 1, 0); v++;
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.computeBoundingBox();
}

/** 在书页上的高度（用于放置装置/DOM） */
export const pageTopAt = (t: number, d: number) => Math.max(0.01, t - dipAt(d, t));

export function createLeaf(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const n = (N + 1) * 2;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const uv = new Float32Array(n * 2);
  let k = 0;
  for (let i = 0; i <= N; i++) {
    uv[k++] = i / N; uv[k++] = 1;
    uv[k++] = i / N; uv[k++] = 0;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  g.setIndex(idx);
  return g;
}

/** θ：叶片根部角度（0=平铺右侧，π=平铺左侧）；lag：外缘滞后方向（+1 向左翻，-1 向右翻） */
export function updateLeaf(g: THREE.BufferGeometry, theta: number, lag: 1 | -1, bend = 0.75) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const hz = PAGE_H / 2;
  const ds = PAGE_W / N;
  let x = 0, y = 0;
  const s = Math.sin(theta);
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    pos.setXYZ(i * 2, x, y, -hz);
    pos.setXYZ(i * 2 + 1, x, y, hz);
    const phi = theta - lag * bend * s * f * (0.4 + 0.6 * f);
    x += Math.cos(phi) * ds;
    y += Math.sin(phi) * ds;
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}

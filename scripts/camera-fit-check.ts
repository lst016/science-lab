import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitBestElevation, fitView, viewDir, type FitView, type FitMargins } from '../src/three/cameraFit';

const cases = [
  { w: 1280, h: 720, spread: true },
  { w: 1440, h: 900, spread: true },
  { w: 826, h: 806, spread: true },
  { w: 360, h: 374, spread: false },
  { w: 390, h: 405, spread: false },
  { w: 430, h: 447, spread: false },
  { w: 405, h: 328, spread: false },
];
let passed = 0;
function check(view: FitView, points: THREE.Vector3[], w: number, h: number, m: FitMargins) {
  const camera = new THREE.PerspectiveCamera(28, w / h, .5, 400);
  camera.position.copy(view.target).addScaledVector(viewDir(view.el, view.az), view.dist);
  camera.lookAt(view.target); camera.updateMatrixWorld();
  const xy = points.map(p => p.clone().project(camera));
  const eps = 1e-5;
  for (const p of xy) {
    assert(p.x >= -1 + m.left - eps && p.x <= 1 - m.right + eps, 'horizontal clipping');
    assert(p.y >= -1 + m.bottom - eps && p.y <= 1 - m.top + eps, 'vertical clipping');
    assert(p.z > -1 && p.z < 1, 'point outside depth range');
  }
  const xspan = Math.max(...xy.map(p => p.x)) - Math.min(...xy.map(p => p.x));
  const yspan = Math.max(...xy.map(p => p.y)) - Math.min(...xy.map(p => p.y));
  assert(Math.max(xspan / (2 - m.left - m.right), yspan / (2 - m.top - m.bottom)) > .95, 'unnecessary empty space');
  passed++;
}
for (const { w, h, spread } of cases) {
  const m = { left: .035, right: .035, top: spread ? .05 : .03, bottom: ((spread ? 96 : 8) / h) * 2 + .02 };
  const points: THREE.Vector3[] = [];
  for (const x of [spread ? -6.2 : -.3, 6.2]) for (const [y, z] of [[-.1, 3.9], [.5, -3.9], [0, 3.9], [0, -3.9]]) points.push(new THREE.Vector3(x, y, z));
  points.push(new THREE.Vector3(.7, 4.2, -1), new THREE.Vector3(5.3, 4.2, -1));
  const angles = (spread ? [40, 44, 48, 52, 56] : [52, 58, 64, 70]).map(d => d * Math.PI / 180);
  const view = fitBestElevation(28, w / h, points, new THREE.Vector3(spread ? 0 : 3, .8, 0), angles, 0, m, .015);
  check(view, points, w, h, m);
  const detail: THREE.Vector3[] = [];
  for (const x of [.5, 5.5]) for (const y of [0, 4.2]) for (const z of [-1.6, 1.6]) detail.push(new THREE.Vector3(x, y, z));
  const cm = { ...m, left: .06, right: .06, top: .08 };
  check(fitView(28, w / h, detail, new THREE.Vector3(3, 1.65, 0), .75, -.17, cm), detail, w, h, cm);
}
console.log(`Camera framing: ${passed} checks passed across ${cases.length} stage sizes (no clipping, >95% use of one available dimension).`);

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Experiment } from '../data/types';
import { rt } from '../state/runtime';
import { FLIP_MS, OPEN_MS, SWAP_MS, StageCtrl } from './ctrl';
import { PAGE_H, PAGE_W, createLeaf, createPageBlock, pageTopAt, updateLeaf, updatePageBlock } from './bookGeometry';
import { coverTexture, edgeTexture, folioTexture, leatherTexture, paperTexture } from './textures';
import { solveHomography, toMatrix3d } from './homography';
import { RigRouter } from './rigs';

export type StageMode = 'spread' | 'stack';

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 指针倾斜（窗口级，避免被左页 DOM 遮挡） */
const tilt = { x: 0, y: 0, cx: 0, cy: 0 };

interface SceneProps {
  ctrl: StageCtrl;
  exp: Experiment;
  indexLabel: string;
  cover: { color: string; title: string; sub: string };
  mode: StageMode;
  leftEl: React.RefObject<HTMLDivElement | null>;
  layoutSize: { w: number; h: number };
  bottomPad: number;
}

function Scene({ ctrl, exp, indexLabel, cover, mode, leftEl, layoutSize, bottomPad }: SceneProps) {
  const { camera, gl, size, invalidate } = useThree();
  const cam = camera as THREE.PerspectiveCamera;

  /* ---------- 材质与几何（一次创建） ---------- */
  const res = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    const paperR = paperTexture('right', 3);
    const paperL = paperTexture('left', 5);
    const edge = edgeTexture();
    const leather = leatherTexture('#8e5a2b');
    for (const t of [paperR, paperL, edge, leather]) t.anisotropy = Math.min(8, maxAniso);
    return {
      paperR,
      paperL,
      edge,
      leather,
      blockL: createPageBlock(-1),
      blockR: createPageBlock(),
      leaf: createLeaf(),
      matPaperR: new THREE.MeshStandardMaterial({ map: paperR, roughness: 0.92, metalness: 0, side: THREE.DoubleSide }),
      matPaperL: new THREE.MeshStandardMaterial({ map: paperL, roughness: 0.92, metalness: 0, side: THREE.DoubleSide }),
      matEdge: new THREE.MeshStandardMaterial({ map: edge, roughness: 1, side: THREE.DoubleSide }),
      matLeaf: new THREE.MeshStandardMaterial({ map: paperR, roughness: 0.9, side: THREE.DoubleSide }),
      matLeather: new THREE.MeshStandardMaterial({ map: leather, roughness: 0.78, metalness: 0.02 }),
      matEndpaper: new THREE.MeshStandardMaterial({ color: '#e7d6ae', roughness: 0.95 }),
    };
  }, [gl]);

  const coverTex = useMemo(() => coverTexture(cover.color, cover.title, cover.sub), [cover.color, cover.title, cover.sub]);
  const lidMats = useMemo(
    () => [
      res.matLeather,
      res.matLeather,
      new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.7 }),
      res.matEndpaper,
      res.matLeather,
      res.matLeather,
    ],
    [res, coverTex],
  );
  const folioTex = useMemo(
    () => folioTexture([
      { text: indexLabel, x: 440, y: 596, size: 22, align: 'right' },
      { text: exp.chapter.length > 14 ? exp.chapter.slice(0, 14) + '…' : exp.chapter, x: 70, y: 596, size: 20 },
    ], 'right'),
    [exp.id, indexLabel, exp.chapter],
  );
  useEffect(() => () => folioTex.dispose(), [folioTex]);

  /* ---------- 对象引用 ---------- */
  const lid = useRef<THREE.Group>(null);
  const leafMesh = useRef<THREE.Mesh>(null);
  const rigGroup = useRef<THREE.Group>(null);
  const boardL = useRef<THREE.Mesh>(null);
  const folio = useRef<THREE.Mesh>(null);
  const fracCur = useRef(0);
  const D = useRef(30);
  const lastFit = useRef('');
  const fitRef = useRef<{ dist: number; target: THREE.Vector3 } | null>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const lastMatrix = useRef('');
  const settled = useRef(false);

  useEffect(() => {
    rt.invalidate = invalidate;
    invalidate();
    return () => {
      rt.invalidate = () => {};
    };
  }, [invalidate]);

  // 指针倾斜
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      tilt.x = (e.clientX / window.innerWidth) * 2 - 1;
      tilt.y = (e.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [invalidate]);

  const rigTop = 4.2;

  /* ---------- 相机拟合 ---------- */
  const fit = (el: number, az: number) => {
    const target = mode === 'spread' ? new THREE.Vector3(0, 0.4, 0.15) : new THREE.Vector3(PAGE_W / 2, 0.9, 0.1);
    const pts: THREE.Vector3[] = [];
    const bw = PAGE_W + 0.2;
    const bh = PAGE_H / 2 + 0.2;
    const xs = mode === 'spread' ? [-bw, bw] : [-0.6, bw];
    for (const x of xs) for (const z of [-bh, bh]) pts.push(new THREE.Vector3(x, 0, z));
    pts.push(new THREE.Vector3(PAGE_W / 2 - 2.3, rigTop, -1.8), new THREE.Vector3(PAGE_W / 2 + 2.3, rigTop, -1.8));
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const ml = 0.04;
    const mt = mode === 'spread' ? 0.1 : 0.04;
    const mb = (bottomPad / size.height) * 2 + 0.02;
    let lo = 4;
    let hi = 120;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      cam.position.copy(target).addScaledVector(dir, mid);
      cam.lookAt(target);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      let ok = true;
      for (const p of pts) {
        tmp.copy(p).project(cam);
        if (tmp.x < -1 + ml || tmp.x > 1 - ml || tmp.y > 1 - mt || tmp.y < -1 + mb) { ok = false; break; }
      }
      if (ok) hi = mid; else lo = mid;
    }
    return { dist: hi, target };
  };

  const EL = (mode === 'spread' ? 56 : 58) * (Math.PI / 180);

  useFrame((state, dt) => {
    const now = performance.now();
    let animating = false;

    /* 相机拟合（尺寸/模式变化时） */
    const key = `${size.width}x${size.height}|${mode}|${bottomPad}`;
    if (lastFit.current !== key || !fitRef.current) {
      lastFit.current = key;
      fitRef.current = fit(EL, 0);
      D.current = fitRef.current.dist;
    }
    const fitInfo = fitRef.current;

    /* 开书动画 */
    const openP = clamp01((now - ctrl.openStart - 150) / (OPEN_MS - 150));
    const opening = openP < 1;
    const zoom = 1 + (opening ? (1 - easeInOut(openP)) * 0.28 : 0);
    if (opening) animating = true;

    /* 翻页 */
    let flipP = -1;
    if (ctrl.flipStart > 0) {
      const t = now - ctrl.flipStart;
      if (t < FLIP_MS) { flipP = t / FLIP_MS; animating = true; } else ctrl.flipStart = 0;
    }

    /* 页厚 */
    const frac = fracCur.current;
    const diff = ctrl.fracTarget - frac;
    if (Math.abs(diff) > 0.0005) {
      fracCur.current += diff * Math.min(1, dt * 5);
      animating = true;
    } else fracCur.current = ctrl.fracTarget;
    const tL = 0.07 + 0.4 * fracCur.current;
    const tR = 0.07 + 0.4 * (1 - fracCur.current);
    ctrl.heights.tL = tL;
    ctrl.heights.tR = tR;
    updatePageBlock(res.blockL, tL, -1);
    updatePageBlock(res.blockR, tR, 1);

    /* 封面（开书） */
    if (lid.current) {
      const th = Math.PI * easeInOut(openP);
      lid.current.visible = openP < 1;
      lid.current.rotation.z = th;
      lid.current.position.y = THREE.MathUtils.lerp(tR + 0.002, 0.0, easeInOut(openP));
      lid.current.position.x = 0;
    }

    /* 翻页叶片 */
    if (leafMesh.current) {
      if (flipP >= 0) {
        const p = easeInOut(clamp01((flipP - 0.06) / 0.86));
        const dir = ctrl.flipDir;
        const theta = dir > 0 ? Math.PI * p : Math.PI * (1 - p);
        updateLeaf(res.leaf, theta, dir > 0 ? 1 : -1);
        leafMesh.current.visible = true;
        leafMesh.current.position.set(0, THREE.MathUtils.lerp(tR, tL, theta / Math.PI) + 0.012, 0);
      } else leafMesh.current.visible = false;
    }

    /* 装置立起 / 折回 */
    let u: number;
    if (opening && openP < 0.8) {
      u = 0;
    } else if (flipP >= 0 && ctrl.swapAt === 0) {
      u = ctrl.fallFrom * (1 - easeInOut(clamp01((now - ctrl.flipStart) / 300)));
    } else if (ctrl.swapAt > 0) {
      const r = clamp01((now - ctrl.swapAt) / 650);
      u = easeOutBack(r);
      if (r < 1) animating = true;
    } else {
      // 开书后首次立起
      const base = ctrl.openStart + OPEN_MS * 0.8;
      const r = clamp01((now - base) / 650);
      u = easeOutBack(r);
      if (r < 1) animating = true;
    }
    ctrl.rigU = Math.max(0, u);
    if (rigGroup.current) {
      const uu = Math.max(0.0001, u);
      rigGroup.current.visible = u > 0.002;
      rigGroup.current.position.set(PAGE_W / 2 + 0.02, tR, 0);
      rigGroup.current.scale.set(1, uu, 1);
    }
    if (folio.current) {
      folio.current.position.set(PAGE_W / 2, tR + 0.006, 0);
    }

    /* 相机 + 指针倾斜 */
    tilt.cx += (tilt.x - tilt.cx) * Math.min(1, dt * 4);
    tilt.cy += (tilt.y - tilt.cy) * Math.min(1, dt * 4);
    if (Math.abs(tilt.x - tilt.cx) + Math.abs(tilt.y - tilt.cy) > 0.002) animating = true;
    const az = tilt.cx * 0.07;
    const el = EL + (mode === 'spread' ? -tilt.cy * 0.045 : -tilt.cy * 0.03);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    cam.position.copy(fitInfo.target).addScaledVector(dir, D.current * zoom);
    cam.lookAt(fitInfo.target);
    cam.updateMatrixWorld();

    /* 左页 DOM 单应变换 */
    const el2 = leftEl.current;
    if (el2 && mode === 'spread') {
      const y = ctrl.heights.tL - 0.04;
      const corners = [
        new THREE.Vector3(-PAGE_W, y, -PAGE_H / 2),
        new THREE.Vector3(-0.05, y, -PAGE_H / 2),
        new THREE.Vector3(-0.05, y, PAGE_H / 2),
        new THREE.Vector3(-PAGE_W, y, PAGE_H / 2),
      ];
      const dst = corners.map((c) => {
        tmp.copy(c).project(cam);
        return [((tmp.x + 1) / 2) * size.width, ((1 - tmp.y) / 2) * size.height];
      });
      const { w, h } = layoutSize;
      const hm = solveHomography([[0, 0], [w, 0], [w, h], [0, h]], dst);
      const m = toMatrix3d(hm);
      if (m !== lastMatrix.current) {
        lastMatrix.current = m;
        el2.style.transform = m;
      }
      if (el2.dataset.ready !== '1') el2.dataset.ready = '1';
    }

    if (animating || rt.playing || !settled.current) {
      settled.current = !animating && !rt.playing;
      invalidate();
    }
  });

  const boardW = PAGE_W + 0.16;
  const boardH = PAGE_H + 0.26;

  return (
    <>
      <hemisphereLight args={['#fff6e2', '#7d8a6c', 0.85]} />
      <directionalLight
        position={[-5, 13, 8]}
        intensity={2.3}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={5}
      />
      <directionalLight position={[8, 6, -4]} intensity={0.35} color="#dfe8ff" />

      {/* 桌面阴影接收 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.16, 0]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <shadowMaterial opacity={0.28} />
      </mesh>

      {/* 封面底板与书脊 */}
      <mesh ref={boardL} position={[-boardW / 2 + 0.02, -0.07, 0]} receiveShadow castShadow>
        <boxGeometry args={[boardW, 0.14, boardH]} />
        <primitive object={res.matLeather} attach="material" />
      </mesh>
      <mesh position={[boardW / 2 - 0.02, -0.07, 0]} receiveShadow castShadow>
        <boxGeometry args={[boardW, 0.14, boardH]} />
        <primitive object={res.matLeather} attach="material" />
      </mesh>
      <mesh position={[0, -0.09, 0]} receiveShadow>
        <boxGeometry args={[0.36, 0.14, boardH]} />
        <meshStandardMaterial color="#6f4320" roughness={0.8} />
      </mesh>

      {/* 左右书页 */}
      <mesh geometry={res.blockL} receiveShadow castShadow material={[res.matPaperL, res.matEdge]} />
      <mesh geometry={res.blockR} receiveShadow castShadow material={[res.matPaperR, res.matEdge]} />

      {/* 右页印刷页脚 */}
      <mesh ref={folio} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshBasicMaterial map={folioTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* 开书的封面 */}
      <group ref={lid} position={[0, 0.4, 0]}>
        <mesh position={[boardW / 2 - 0.02, 0.07, 0]} material={lidMats} castShadow>
          <boxGeometry args={[boardW, 0.14, boardH]} />
        </mesh>
      </group>

      {/* 翻页叶片 */}
      <mesh ref={leafMesh} geometry={res.leaf} material={res.matLeaf} castShadow receiveShadow visible={false} />

      {/* 实验装置（站在右页） */}
      <group ref={rigGroup}>
        <RigRouter exp={exp} />
      </group>
    </>
  );
}

export interface BookStageProps {
  ctrl: StageCtrl;
  exp: Experiment;
  indexLabel: string;
  cover: { color: string; title: string; sub: string };
  mode: StageMode;
  leftEl: React.RefObject<HTMLDivElement | null>;
  layoutSize: { w: number; h: number };
  bottomPad: number;
  lowPower: boolean;
}

export function BookStage(props: BookStageProps) {
  const { lowPower, ...rest } = props;
  return (
    <Canvas
      className="stage-canvas"
      frameloop="demand"
      shadows="soft"
      dpr={lowPower ? 1 : [1, 1.75]}
      camera={{ fov: 28, near: 0.5, far: 200, position: [0, 20, 14] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <Scene {...rest} />
    </Canvas>
  );
}

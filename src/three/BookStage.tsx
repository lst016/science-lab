import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Experiment } from '../data/types';
import { rt } from '../state/runtime';
import { FLIP_MS, LAND_MS, OPEN_MS, StageCtrl, leafProgress } from './ctrl';
import { PAGE_H, PAGE_W, createLeaf, createPageBlock, pageTopAt, updateLeaf, updatePageBlock } from './bookGeometry';
import { coverTexture, deskTexture, edgeTexture, folioTexture, leatherTexture, matTexture, paperTexture } from './textures';
import { solveHomography, toMatrix3d } from './homography';
import { RigRouter } from './rigs';
import { InkScene } from './InkScene';
import { FitMargins, FitView, fitBestElevation, fitView, viewDir } from './cameraFit';

export type StageMode = 'spread' | 'stack';

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 芥末黄薄封皮 */
const MUSTARD = '#d6a420';
const MAT_W = 21;
const MAT_D = 12;

/** 圆角桌垫（顶面 y=0，向下 0.04 厚；UV 为世界坐标，贴图按 2 单位一格平铺） */
function createDeskMat(): THREE.ExtrudeGeometry {
  const w = MAT_W / 2;
  const d = MAT_D / 2;
  const r = 0.7;
  const sh = new THREE.Shape();
  sh.moveTo(-w + r, -d);
  sh.lineTo(w - r, -d);
  sh.quadraticCurveTo(w, -d, w, -d + r);
  sh.lineTo(w, d - r);
  sh.quadraticCurveTo(w, d, w - r, d);
  sh.lineTo(-w + r, d);
  sh.quadraticCurveTo(-w, d, -w, d - r);
  sh.lineTo(-w, -d + r);
  sh.quadraticCurveTo(-w, -d, -w + r, -d);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); // 挤出方向 +z → +y
  g.translate(0, -0.04, 0);
  return g;
}

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
  const inspection = useRef(0);

  /* ---------- 材质与几何（一次创建） ---------- */
  const res = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    const paperR = paperTexture('right', 3);
    const paperL = paperTexture('left', 5);
    const edge = edgeTexture();
    const leather = leatherTexture(MUSTARD);
    const desk = deskTexture();
    desk.repeat.set(10, 10);
    const mat = matTexture();
    mat.repeat.set(0.5, 0.5);
    for (const t of [paperR, paperL, edge, leather, desk, mat]) t.anisotropy = Math.min(8, maxAniso);
    return {
      paperR,
      paperL,
      edge,
      leather,
      blockL: createPageBlock(-1),
      blockR: createPageBlock(),
      leaf: createLeaf(),
      matPaperR: new THREE.MeshStandardMaterial({ map: paperR, roughness: 0.96, metalness: 0, side: THREE.DoubleSide }),
      matPaperL: new THREE.MeshStandardMaterial({ map: paperL, roughness: 0.96, metalness: 0, side: THREE.DoubleSide }),
      matEdge: new THREE.MeshStandardMaterial({ map: edge, roughness: 1, side: THREE.DoubleSide }),
      matLeaf: new THREE.MeshStandardMaterial({ map: paperR, roughness: 0.9, side: THREE.DoubleSide }),
      matLeather: new THREE.MeshStandardMaterial({ map: leather, roughness: 0.82, metalness: 0 }),
      matEndpaper: new THREE.MeshStandardMaterial({ color: '#f1eee4', roughness: 0.95 }),
      matDesk: new THREE.MeshStandardMaterial({ map: desk, roughness: 0.9, metalness: 0 }),
      matDeskMat: new THREE.MeshStandardMaterial({ map: mat, roughness: 1, metalness: 0 }),
      deskMatGeo: createDeskMat(),
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
      { text: indexLabel, x: 440, y: 596, size: 16, align: 'right' },
      { text: `图 ${indexLabel.split('/')[0].trim()} · ${exp.title.slice(0, 23)}`, x: 62, y: 470, size: 15 },
      { text: '调整左页参数，观察现象怎样变化。', x: 62, y: 501, size: 15 },
      { text: exp.chapter.length > 14 ? exp.chapter.slice(0, 14) + '…' : exp.chapter, x: 62, y: 596, size: 13 },
    ], 'right'),
    [exp.id, indexLabel, exp.chapter],
  );
  useEffect(() => () => folioTex.dispose(), [folioTex]);

  /* ---------- 对象引用 ---------- */
  const lid = useRef<THREE.Group>(null);
  const leafMesh = useRef<THREE.Mesh>(null);
  const rigGroup = useRef<THREE.Group>(null);
  const boardL = useRef<THREE.Mesh>(null);
  const pagesL = useRef<THREE.Mesh>(null);
  const folio = useRef<THREE.Mesh>(null);
  const fracCur = useRef(0);
  const lastFit = useRef('');
  const fitRef = useRef<{ book: FitView; close: FitView } | null>(null);
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
  // 把全书（含装置顶部）的投影包围范围迭代居中到“可用区域”（扣掉底部工具栏），
  // 不依赖固定 target 或额外 zoom。俯仰角在候选里选放大倍数最大者。
  const fitAll = (): { book: FitView; close: FitView } => {
    const aspect = size.width / Math.max(1, size.height);
    const bw = PAGE_W + 0.2;
    const bh = PAGE_H / 2 + 0.2;
    const x0 = mode === 'spread' ? -bw : -0.3; // stack 只取右叶
    const pts: THREE.Vector3[] = [];
    for (const x of [x0, bw]) {
      pts.push(new THREE.Vector3(x, -0.1, bh), new THREE.Vector3(x, 0.5, -bh), new THREE.Vector3(x, 0, bh), new THREE.Vector3(x, 0, -bh));
    }
    pts.push(new THREE.Vector3(PAGE_W / 2 - 2.3, rigTop, -1), new THREE.Vector3(PAGE_W / 2 + 2.3, rigTop, -1));
    const margins: FitMargins = {
      left: 0.035,
      right: 0.035,
      top: mode === 'spread' ? 0.05 : 0.03,
      bottom: (bottomPad / Math.max(1, size.height)) * 2 + 0.02,
    };
    const els = (mode === 'spread' ? [40, 44, 48, 52, 56] : [52, 58, 64, 70]).map((d) => d * (Math.PI / 180));
    const seed = mode === 'spread' ? new THREE.Vector3(0, 0.8, 0) : new THREE.Vector3(PAGE_W / 2, 0.9, 0);
    const book = fitBestElevation(cam.fov, aspect, pts, seed, els, 0, margins, 0.015);

    // 近看：装置的包围盒，固定斜俯视方向
    const cx = PAGE_W / 2;
    const box: THREE.Vector3[] = [];
    for (const x of [cx - 2.5, cx + 2.5]) for (const y of [0, 4.2]) for (const z of [-1.6, 1.6]) box.push(new THREE.Vector3(x, y, z));
    const close = fitView(cam.fov, aspect, box, new THREE.Vector3(cx, 1.65, 0), 0.75, -0.17, { ...margins, left: 0.06, right: 0.06, top: 0.08 });
    return { book, close };
  };

  useFrame((state, dt) => {
    const now = performance.now();
    let animating = false;

    /* 相机拟合（尺寸/模式变化时） */
    const key = `${size.width}x${size.height}|${mode}|${bottomPad}`;
    if (lastFit.current !== key || !fitRef.current) {
      lastFit.current = key;
      fitRef.current = fitAll();
    }
    const fitInfo = fitRef.current;
    if (boardL.current) boardL.current.visible = mode === 'spread';
    if (pagesL.current) pagesL.current.visible = mode === 'spread';

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
      // 落定后立即隐藏，由下面的书页与左页 DOM 接替，避免与之重叠
      if (flipP >= 0 && now - ctrl.flipStart < LAND_MS) {
        const p = leafProgress(now - ctrl.flipStart);
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
    } else if (flipP >= 0 && (ctrl.swapAt === 0 || now < ctrl.swapAt)) {
      // 折回，并保持折叠直到叶片让开右页
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
    const { book, close } = fitInfo;
    const az = book.az + (mode === 'spread' ? tilt.cx * 0.035 : 0);
    const el = book.el + (mode === 'spread' ? -tilt.cy * 0.025 : 0);
    cam.position.copy(book.target).addScaledVector(viewDir(el, az, tmp), book.dist * zoom);
    const focus = ctrl.closeUp ? 1 : 0;
    inspection.current = THREE.MathUtils.damp(inspection.current, focus, 4.5, dt);
    if (Math.abs(inspection.current - focus) > 0.001) animating = true;
    const target = book.target.clone();
    const closePos = close.target.clone().addScaledVector(viewDir(close.el, close.az, tmp), close.dist);
    cam.position.lerp(closePos, inspection.current);
    target.lerp(close.target, inspection.current);
    cam.lookAt(target);
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

  const boardW = PAGE_W + 0.2;
  const boardH = PAGE_H + 0.32;
  const BT = 0.09; // 封皮厚度

  return (
    <>
      <hemisphereLight args={['#f3f5ff', '#a3a89a', 1.3]} />
      {/* 侧上方自然日光：自左后方斜照，影子落向右前，边缘柔和 */}
      <directionalLight
        position={[-8, 12, -3]}
        intensity={1.75}
        color="#fff2dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={44}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={8}
      />
      <directionalLight position={[7, 6, 8]} intensity={0.55} color="#e6edff" />

      {/* 木纹桌面 + 灰绿桌垫（接收投影） */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.16, 0]} receiveShadow material={res.matDesk}>
        <planeGeometry args={[120, 80]} />
      </mesh>
      <mesh geometry={res.deskMatGeo} material={res.matDeskMat} position={[0, -BT, -0.3]} receiveShadow />

      {/* 封面底板与书脊 */}
      <mesh ref={boardL} position={[-boardW / 2 + 0.02, -BT / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[boardW, BT, boardH]} />
        <primitive object={res.matLeather} attach="material" />
      </mesh>
      <mesh position={[boardW / 2 - 0.02, -BT / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[boardW, BT, boardH]} />
        <primitive object={res.matLeather} attach="material" />
      </mesh>
      <mesh position={[0, -BT / 2 - 0.005, 0]} receiveShadow>
        <boxGeometry args={[0.4, BT, boardH]} />
        <meshStandardMaterial color="#c4931a" roughness={0.85} />
      </mesh>

      {/* 左右书页 */}
      <mesh ref={pagesL} geometry={res.blockL} receiveShadow castShadow material={[res.matPaperL, res.matEdge]} />
      <mesh geometry={res.blockR} receiveShadow castShadow material={[res.matPaperR, res.matEdge]} />

      {/* 右页印刷页脚 */}
      <mesh ref={folio} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshBasicMaterial map={folioTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* 开书的封面 */}
      <group ref={lid} position={[0, 0.4, 0]}>
        <mesh position={[boardW / 2 - 0.02, BT / 2, 0]} material={lidMats} castShadow>
          <boxGeometry args={[boardW, BT, boardH]} />
        </mesh>
      </group>

      {/* 翻页叶片：双面材质背面朝上时会被自身阴影染灰，翻页时装置已折叠，无需接收阴影 */}
      <mesh ref={leafMesh} geometry={res.leaf} material={res.matLeaf} castShadow visible={false} />

      {/* 实验装置（站在右页） */}
      <group ref={rigGroup}>
        <RigRouter exp={exp} />
      </group>

      {/* 手绘器材 */}
      <InkScene />
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
        gl.toneMapping = THREE.NeutralToneMapping; // 保住白纸而不泛灰
        gl.toneMappingExposure = 1;
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <Scene {...rest} />
    </Canvas>
  );
}

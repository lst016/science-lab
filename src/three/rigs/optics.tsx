import type { ReactElement } from 'react';
import type { Experiment } from '../../data/types';
import { LensBench } from './optics-lens';
import { ParallelRig, TwoLensRig } from './optics-lens2';
import { Reflection, Refraction, Straight } from './optics-media';
import { MirrorImage, Pinhole, Prism, WaterMirror, WaterStream } from './optics-media2';

/* 光路统一画在 z=0 的竖直平面内（x 向右、y 向上），像一块立着的演示板。
   长度比例是示意：厘米参数按各变体固定系数缩放到 ±2.5 的场景内。 */

export function OpticsRig({ exp }: { exp: Experiment }): ReactElement | null {
  switch (exp.sceneVariant) {
    case 'straight': return <Straight />;
    case 'pinhole-camera': return <Pinhole />;
    case 'reflection': return <Reflection />;
    case 'mirror-image': return <MirrorImage />;
    case 'refraction': return <Refraction />;
    case 'prism': return <Prism />;
    case 'water-mirror-dispersion': return <WaterMirror />;
    case 'water-stream-guiding-light': return <WaterStream />;
    default: return null;
  }
}

export function LensRig({ exp }: { exp: Experiment }): ReactElement | null {
  switch (exp.sceneVariant) {
    case 'lens-bench': return <LensBench cfg={{ k: 0.042, lx: -0.3, ho: 0.5 }} />;
    case 'projector': return <LensBench cfg={{ k: 0.075, lx: -0.4, ho: 0.45, slide: true }} />;
    case 'pinhole-paper-camera': return <LensBench cfg={{ k: 0.09, lx: -0.4, ho: 0.6, camera: true }} />;
    case 'converge-diverge': return <ParallelRig variant="converge-diverge" />;
    case 'sun-focal-length': return <ParallelRig variant="sun-focal-length" />;
    case 'two-magnifiers': return <TwoLensRig variant="two-magnifiers" />;
    case 'refracting-telescope-project': return <TwoLensRig variant="refracting-telescope-project" />;
    default: return null;
  }
}

import type { Experiment } from '../../data/types';
import { HeatRig } from './thermal-heat-rigs';
import { ParticleRig } from './thermal-particle-rigs';

/** 物理热学与分子扩散器材；总路由由 rigs/index.tsx 注册。 */
export function ThermalRig({ exp }: { exp: Experiment }) {
  if (!exp.bookId.startsWith('physics-')) return null;
  if (exp.family === 'heat') return <HeatRig exp={exp} />;
  if (exp.family === 'particle') return <ParticleRig exp={exp} />;
  return null;
}

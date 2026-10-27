import type { Observation, SimCtx } from './core';
import { SH_VARIANT_BY_NAME } from '../data/sh-variants';

/**
 * 上海版专属模型的统一输出。化学书条目自动带上审查记录（modelLimits/modelReviewed），
 * 与人教版化学模型的验收口径一致。
 */
export function shOut(c: SimCtx, phenomenon: string, state: Observation['state'], readings: Observation['readings'] = [], fidelity: Observation['fidelity'] = 'qualitative', warnings: string[] = []): Observation {
  const base: Observation['state'] = { phase: '观察', progress: 0, active: false };
  if (c.exp.bookId.startsWith('chemistry-')) {
    const limits = SH_VARIANT_BY_NAME.get(c.exp.sceneVariant)?.limits;
    Object.assign(base, { modelLimits: limits ?? '未审查的变体', modelReviewed: !!limits });
  }
  return { phenomenon, readings, warnings, fidelity, state: { ...base, ...state } };
}

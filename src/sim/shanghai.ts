import type { Observation, SimCtx } from './core';
import { simulateShA1 } from './sh-a1';
import { simulateShA2 } from './sh-a2';
import { simulateShB } from './sh-b';
import { simulateShC } from './sh-c';
import { simulateShD } from './sh-d';
import { simulateShE } from './sh-e';

const GROUPS = [simulateShA1, simulateShA2, simulateShB, simulateShC, simulateShD, simulateShE];

/** 上海版独有变体（sh-*）的模型分发；其他变体返回 null，交给人教版模型。 */
export function simulateShanghai(c: SimCtx): Observation | null {
  if (!c.exp.sceneVariant.startsWith('sh-')) return null;
  for (const run of GROUPS) {
    const o = run(c);
    if (o) return o;
  }
  return null;
}

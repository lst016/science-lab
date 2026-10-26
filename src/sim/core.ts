import type { Experiment } from '../data/types';

/** 动作状态：每个动作 id 触发过几次、最近一次触发的时间。 */
export interface ActionState {
  id: string | null;
  t: number;
  counts: Record<string, number>;
}

export interface Reading {
  label: string;
  value: string;
}

/** 纯函数模拟的输出：读数、现象文字、告警，以及供场景绘制的状态。 */
export interface Observation {
  readings: Reading[];
  phenomenon: string;
  warnings: string[];
  /** 家族专属的场景状态；由对应 rig 读取，不是 UI 数据。 */
  state: Record<string, number | string | boolean | number[]>;
  /** 本模型的精度档位，在 UI 如实标注。 */
  fidelity: 'quantitative' | 'qualitative' | 'schematic';
}

export const emptyAction = (): ActionState => ({ id: null, t: 0, counts: {} });

export interface SimCtx {
  exp: Experiment;
  time: number;
  action: ActionState;
  /** 归一化的 sceneVariant + 标题 + 器材，用于变体匹配。 */
  text: string;
  has: (...needles: string[]) => boolean;
  /** 读取参数：按别名依次匹配 key（精确→包含），找不到用 fallback。 */
  p: (aliases: string | string[], fallback: number) => number;
  count: (id: string) => number;
  since: (id: string) => number;
}

export function buildCtx(
  exp: Experiment,
  params: Record<string, number>,
  time: number,
  action: ActionState,
): SimCtx {
  const text = `${exp.sceneVariant} ${exp.title} ${exp.equipment.join(' ')}`.toLowerCase();
  const keys = Object.keys(params);
  const clampTo = (key: string, v: number) => {
    const def = exp.parameters.find((q) => q.key === key);
    if (!Number.isFinite(v)) return undefined;
    if (!def) return v;
    return Math.min(def.max, Math.max(def.min, v));
  };
  return {
    exp,
    time,
    action,
    text,
    has: (...needles) => needles.some((n) => text.includes(n.toLowerCase())),
    p: (aliases, fallback) => {
      const list = Array.isArray(aliases) ? aliases : [aliases];
      for (const a of list) {
        if (a in params) {
          const value = clampTo(a, params[a]);
          if (value !== undefined) return value;
        }
      }
      for (const a of list) {
        const al = a.toLowerCase();
        const k = keys.find((x) => x.toLowerCase().includes(al));
        if (k) {
          const value = clampTo(k, params[k]);
          if (value !== undefined) return value;
        }
      }
      return fallback;
    },
    count: (id) => action.counts[id] ?? 0,
    since: (id) => ((action.counts[id] ?? 0) > 0 && action.id === id ? Math.max(0, time - action.t) : 0),
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
export const fmt = (v: number, digits = 2) => {
  if (!Number.isFinite(v)) return '—';
  const s = v.toFixed(digits);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};
export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

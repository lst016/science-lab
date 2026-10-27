import { useSyncExternalStore } from 'react';
import type { Experiment } from '../data/types';
import { ActionState, Observation, emptyAction } from '../sim/core';
import { simulate } from '../sim/registry';

/**
 * 实验运行时状态（非 React 状态）。场景每帧直接读取 rt，
 * DOM 读数通过订阅以较低频率刷新，避免每帧 setState。
 */
interface Runtime {
  exp: Experiment | null;
  params: Record<string, number>;
  time: number;
  playing: boolean;
  action: ActionState;
  /** 参数/动作/实验变化时递增，用于缓存失效 */
  rev: number;
  cacheKey: string;
  cache: Observation | null;
  /** 场景层注册：请求再渲染一帧 */
  invalidate: () => void;
}

export const rt: Runtime = {
  exp: null,
  params: {},
  time: 0,
  playing: true,
  action: emptyAction(),
  rev: 0,
  cacheKey: '',
  cache: null,
  invalidate: () => {},
};

const listeners = new Set<() => void>();
let uiRev = 0;
const emit = () => {
  uiRev++;
  listeners.forEach((l) => l());
};

export function defaultParams(exp: Experiment): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of exp.parameters) out[p.key] = p.default;
  return out;
}

export function loadExperiment(exp: Experiment) {
  rt.exp = exp;
  rt.params = defaultParams(exp);
  rt.time = 0;
  rt.playing = true;
  rt.action = emptyAction();
  rt.rev++;
  rt.cache = null;
  emit();
  rt.invalidate();
}

export function setParam(key: string, value: number) {
  if (rt.params[key] !== value && (rt.exp?.sceneVariant === 'sh-flask-micro-deformation' || rt.exp?.sceneVariant === 'sh-press-spring')) {
    rt.action = emptyAction();
  }
  rt.params = { ...rt.params, [key]: value };
  rt.rev++;
  emit();
  rt.invalidate();
}

export function setPlaying(v: boolean) {
  rt.playing = v;
  emit();
  rt.invalidate();
}

export function resetExperiment() {
  if (!rt.exp) return;
  rt.params = defaultParams(rt.exp);
  rt.time = 0;
  rt.action = emptyAction();
  rt.playing = true;
  rt.rev++;
  emit();
  rt.invalidate();
}

export function triggerAction(id: string) {
  const counts = { ...rt.action.counts, [id]: (rt.action.counts[id] ?? 0) + 1 };
  rt.action = { id, t: rt.time, counts };
  // 触发动作时若处于暂停，自动恢复运行，让用户看到结果
  rt.playing = true;
  rt.rev++;
  emit();
  rt.invalidate();
}

/** 当前观察结果；同一 rev 且同一时间戳只计算一次。 */
export function observe(): Observation | null {
  const exp = rt.exp;
  if (!exp) return null;
  const key = `${exp.id}|${rt.rev}|${rt.time.toFixed(4)}`;
  if (rt.cacheKey !== key || !rt.cache) {
    rt.cache = simulate(exp, rt.params, rt.time, rt.action);
    rt.cacheKey = key;
  }
  return rt.cache;
}

/** DOM 侧订阅（读数面板等） */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useRuntimeRev(): number {
  return useSyncExternalStore(subscribe, () => uiRev, () => 0);
}

/** 由 Ticker 调用；返回是否需要继续渲染 */
export function tick(dtSec: number) {
  if (!rt.playing) return;
  rt.time += Math.min(dtSec, 0.1);
  if (rt.time > 36000) rt.time = 0;
  rt.invalidate();
}

/** 低频通知 DOM（播放时读数变化） */
export function emitTimeUpdate() {
  emit();
}

export function useParams(): Record<string, number> {
  return useSyncExternalStore(subscribe, () => rt.params, () => rt.params);
}
export function useActionState(): ActionState {
  return useSyncExternalStore(subscribe, () => rt.action, () => rt.action);
}
export function usePlaying(): boolean {
  return useSyncExternalStore(subscribe, () => rt.playing, () => true);
}

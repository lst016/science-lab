import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Experiment } from '../../data/types';
import type { Observation } from '../../sim/core';
import { observe, rt, useParams } from '../../state/runtime';

/**
 * Rig 读取运行时的统一入口。装置只读 io，不直接碰全局，
 * 这样数值来自「参数 + 动作 + 时间 + 模型状态」，且每帧不触发 React 更新。
 */
export interface RigIO {
  exp: Experiment;
  /** 实验时间（秒）。暂停时冻结；重置时归零。 */
  t: number;
  /** 当前参数值（已按数据范围夹取）；缺失时返回 fallback。 */
  p: (key: string, fallback: number) => number;
  /** 选择器参数选中的选项序号 */
  idx: (key: string, fallback?: number) => number;
  /** 选择器参数当前选项的文字 */
  opt: (key: string) => string;
  /** 模型输出（可能为 null：尚无实验） */
  o: Observation | null;
  /** 模型状态中的数值 */
  s: (key: string, fallback: number) => number;
  /** 模型状态中的文本 */
  ss: (key: string, fallback: string) => string;
  /** 模型状态中的布尔 */
  sb: (key: string, fallback: boolean) => boolean;
  /** 动作触发次数 */
  n: (id: string) => number;
  /** 距该动作最近一次触发的秒数；从未触发返回 -1 */
  since: (id: string) => number;
  /** 目标值阻尼过渡；同一 key 在多帧间保持状态 */
  damp: (key: string, target: number, rate?: number) => number;
}

interface Mark {
  count: number;
  t: number;
}

export function clampParam(exp: Experiment, key: string, v: number): number {
  const def = exp.parameters.find((q) => q.key === key);
  if (!def || !Number.isFinite(v)) return v;
  return Math.min(def.max, Math.max(def.min, v));
}

/** 每帧回调：拿到最新 io。需要时自动请求下一帧（阻尼未收敛）。 */
export function useRig(cb: (io: RigIO, dt: number) => void) {
  const invalidate = useThree((s) => s.invalidate);
  const marks = useRef<Record<string, Mark>>({});
  const damped = useRef<Record<string, number>>({});
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const lastExp = useRef('');

  useFrame((_, dt) => {
    const exp = rt.exp;
    if (!exp) return;
    if (lastExp.current !== exp.id) {
      lastExp.current = exp.id;
      marks.current = {};
      damped.current = {};
    }
    const o = observe();
    const counts = rt.action.counts;
    for (const id of Object.keys(counts)) {
      const m = marks.current[id];
      if (counts[id] > 0 && (!m || m.count !== counts[id])) {
        marks.current[id] = { count: counts[id], t: rt.action.id === id ? rt.action.t : rt.time };
      }
    }
    for (const id of Object.keys(marks.current)) if (!(counts[id] > 0)) delete marks.current[id];
    let moving = false;
    const step = Math.min(dt, 0.05);
    const io: RigIO = {
      exp,
      t: rt.time,
      p: (key, fb) => (key in rt.params ? clampParam(exp, key, rt.params[key]) : fb),
      idx: (key, fb = 0) => Math.round(key in rt.params ? rt.params[key] : fb),
      opt: (key) => {
        const def = exp.parameters.find((q) => q.key === key);
        const v = Math.round(key in rt.params ? rt.params[key] : def?.default ?? 0);
        return def?.options?.find((x) => x.value === v)?.label ?? '';
      },
      o,
      s: (key, fb) => {
        const v = o?.state[key];
        return typeof v === 'number' && Number.isFinite(v) ? v : fb;
      },
      ss: (key, fb) => {
        const v = o?.state[key];
        return typeof v === 'string' ? v : fb;
      },
      sb: (key, fb) => {
        const v = o?.state[key];
        return typeof v === 'boolean' ? v : fb;
      },
      n: (id) => counts[id] ?? 0,
      since: (id) => (marks.current[id] ? Math.max(0, rt.time - marks.current[id].t) : -1),
      damp: (key, target, rate = 10) => {
        const cur = key in damped.current ? damped.current[key] : target;
        const diff = target - cur;
        const next = Math.abs(diff) < 1e-4 * (1 + Math.abs(target)) ? target : cur + diff * (1 - Math.exp(-rate * step));
        damped.current[key] = next;
        if (next !== target) moving = true;
        return next;
      },
    };
    cbRef.current(io, dt);
    if (moving) invalidate();
  });
}

/** 需要随参数改变 React 结构（如选器材种类）时使用；滑块拖动会重渲染该组件。 */
export function useOptIndex(key: string, fallback = 0): number {
  const params = useParams();
  return Math.round(key in params ? params[key] : fallback);
}

export function useParam(key: string, fallback: number): number {
  const params = useParams();
  return key in params ? params[key] : fallback;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
/** 把值从 [a,b] 线性映射到 [c,d]（夹取） */
export const mapRange = (v: number, a: number, b: number, c: number, d: number) => c + (d - c) * clamp((v - a) / (b - a || 1), 0, 1);

/** 动作驱动的事件时间：动作按下后的秒数；尚未按下时，在 delay 秒后自动演示一次。 */
export function evTime(io: RigIO, id: string, delay = 0.6): number {
  const s = io.since(id);
  return s >= 0 ? s : Math.max(0, io.t - delay);
}

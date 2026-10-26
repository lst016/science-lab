import type { Experiment } from '../data/types';
import { ActionState, Observation, buildCtx } from './core';
import { simulatePhysics } from './physics';
import { simulateChemistry } from './chemistry';
import { MODELED_SCENE_VARIANTS } from './coverage';
export { getSimulationCoverage } from './coverage';

export function simulate(exp: Experiment, params: Record<string, number>, time: number, action: ActionState): Observation {
  const ctx = buildCtx(exp, params, time, action);
  const observation = exp.bookId.startsWith('chemistry-') ? simulateChemistry(ctx) : simulatePhysics(ctx);
  // 所有电路变体共用实际开关状态，避免提前返回的分支忽略断开动作。
  // 静电相互作用不属于导线回路，不套用电路开关。
  if (exp.family === 'electricity' && exp.sceneVariant !== 'charge-interaction' && (action.counts.toggle ?? 0) % 2 === 1) {
    Object.assign(observation.state, { closed: false, active: false, current: 0, power: 0, bulbOn: false, phase: '开关断开' });
    for (const key of ['current1', 'current2', 'voltage1', 'voltage2']) {
      if (key in observation.state) observation.state[key] = 0;
    }
    for (const key of ['bulb1On', 'bulb2On']) {
      if (key in observation.state) observation.state[key] = false;
    }
    observation.readings = observation.readings.map(reading => {
      if (/^(电流|总电流|支路[12]电流|电流示意|电路电流)$/.test(reading.label)) return { ...reading, value: '0 A' };
      if (reading.label === '功率') return { ...reading, value: '0 W' };
      if (/^(电阻[12]电压|支路[12]电压)$/.test(reading.label)) return { ...reading, value: '0 V' };
      return reading;
    });
    observation.phenomenon = '开关断开，回路不导通；电流与用电器功率为零，灯泡熄灭。电源电压仍可存在。';
    // 断开时不存在仪表过流，不保留由闭合状态产生的量程告警。
    if ('overload' in observation.state) observation.state.overload = false;
    observation.warnings = observation.warnings.filter(warning => !warning.includes('电流超过'));
  }
  if (!MODELED_SCENE_VARIANTS.has(exp.sceneVariant)) {
    observation.warnings.push(`sceneVariant “${exp.sceneVariant}”尚无专属模型；当前输出仅为${exp.family}类别示意，请勿按定量结果解读。`);
    observation.fidelity = 'schematic';
  }
  return observation;
}

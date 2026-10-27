import type { Observation, SimCtx } from './core';
import { clamp, fmt, smooth } from './core';
import { shOut } from './sh-common';

/* 组 C：九年级第一学期电学活动。电路按“闭合”计算，toggle 奇数次由 registry 统一断开。 */

const LAMP_R = 10; // 示例灯丝电阻（Ω）
const LED_VF = 2.0, LED_R = 10, LED_RATED = 0.02, LED_MAX = 0.03; // 示例 LED 参数
const RHO = [0, 5.0e-7, 1.1e-6]; // 直连、康铜、镍铬（Ω·m）
const SAMPLE_L = 1, SAMPLE_S = 0.1e-6; // 示例：1 m、0.1 mm²
const amp = (i: number) => `${fmt(i, 3)} A`;

/** 上海版独有活动模型（组 C）；不属于本组的变体返回 null。 */
export function simulateShC(c: SimCtx): Observation | null {
  switch (c.exp.sceneVariant) {
    case 'sh-electroscope-conductor-test': {
      const conn = Math.round(c.p('connector', 2));
      const q0 = c.p('charge', 80);
      const contact = conn === 0 ? 0 : smooth((c.time - 0.4) / 1.2);
      const k = conn === 2 ? smooth((c.time - 1.6) / 0.8) : 0;
      const qA = q0 * (1 - 0.5 * k), qB = q0 * 0.5 * k;
      const angle = (q: number) => 50 * clamp(q / 100, 0, 1);
      const name = ['不连接', '木棒', '金属棒'][conn] ?? '金属棒';
      // “闭合 / 断开”在此表示放上 / 抬离连接棒；抬离后已转移的电荷留在两验电器上。
      const lifted = conn !== 0 && c.count('toggle') % 2 === 1;
      const phenomenon = lifted ? `${name}已抬离两金属球；已转移的电荷保留，A、B 张角分别约 ${fmt(angle(qA), 0)}°、${fmt(angle(qB), 0)}°。` : conn === 0
        ? `A 带电，箔片张开约 ${fmt(angle(qA), 0)}°；B 不带电，箔片闭合。`
        : contact < 1
          ? `正在把${name}搭到 A、B 两个金属球上。`
          : conn === 1
            ? `木棒连接后 A 张角保持约 ${fmt(angle(qA), 0)}°，B 仍闭合：木棒不容易导电，是绝缘体。`
            : k < 1
              ? '金属棒接触两球，电荷正由 A 经金属棒转移到 B。'
              : `金属棒连接后 A 张角变小、B 由闭合变为张开（都约 ${fmt(angle(qA), 0)}°）：金属棒容易导电，是导体。`;
      return shOut(c, phenomenon, {
        phase: conn === 0 ? '对照' : k > 0 && k < 1 ? '电荷转移' : '连接', progress: conn === 0 ? 0 : (contact + (conn === 2 ? k : contact)) / 2, active: contact > 0,
        closed: !lifted, connector: conn, contact: lifted ? 0 : contact, chargeA: qA, chargeB: qB, angleA: angle(qA), angleB: angle(qB), transfer: k,
      }, [
        { label: '连接物', value: name },
        { label: 'A 箔片张角', value: `${fmt(angle(qA), 0)}°` },
        { label: 'B 箔片张角', value: `${fmt(angle(qB), 0)}°` },
        { label: 'A、B 电荷（相对 A 初始）', value: `${fmt((qA / q0) * 100, 0)}% / ${fmt((qB / q0) * 100, 0)}%` },
      ], 'qualitative', ['张角为示意值，只表示大小变化趋势。']);
    }
    case 'sh-simple-bulb-circuit': {
      const ok = Math.round(c.p('wiring', 0)) === 0;
      const U = c.p('voltage', 3);
      const I = ok ? U / LAMP_R : 0, P = I * I * LAMP_R;
      return shOut(c, ok ? `电源、开关、灯泡和导线组成闭合回路，灯泡发光（电流 ${amp(I)}）；断开开关灯即熄灭。` : '漏接一根导线，回路不闭合：即使开关闭合，灯泡也不亮。', {
        phase: ok ? '通路' : '断路', progress: ok ? 1 : 0, active: ok,
        closed: ok, voltage: U, current: I, power: P, bulbOn: ok, resistance: LAMP_R, wiringOk: ok,
      }, [
        { label: '电源电压', value: `${fmt(U, 1)} V` },
        { label: '电流', value: amp(I) },
        { label: '功率', value: `${fmt(P, 2)} W` },
      ], 'quantitative', ['灯丝电阻按 10 Ω 定值示例。']);
    }
    case 'sh-conductor-material-comparison': {
      const s = Math.round(clamp(c.p('sample', 1), 0, 2));
      const U = c.p('voltage', 3);
      const Rw = (RHO[s] * SAMPLE_L) / SAMPLE_S;
      const I = U / (LAMP_R + Rw), I0 = U / LAMP_R, P = I * I * LAMP_R;
      const name = ['导线直连', '康铜丝', '镍铬合金丝'][s];
      const phenomenon = s === 0
        ? `M、N 直接相连，电流 ${amp(I)}，灯泡最亮。`
        : `接入${name}后电流降为 ${amp(I)}，灯泡变暗；${s === 2 ? '与同样长短粗细的康铜丝相比，电流更小' : '换接同样长短粗细的镍铬合金丝，电流会更小'}，说明不同材料导电能力不同。`;
      return shOut(c, phenomenon, {
        phase: name, progress: I / I0, active: true,
        closed: true, voltage: U, current: I, power: P, bulbOn: true, sample: s, wireR: Rw, lampLevel: clamp(Math.sqrt(P / 0.9), 0, 1.3),
      }, [
        { label: 'M、N 间', value: name },
        { label: '金属丝电阻（示例）', value: `${fmt(Rw, 1)} Ω` },
        { label: '电流', value: amp(I) },
        { label: '功率', value: `${fmt(P, 2)} W` },
      ], 'quantitative', ['示例：金属丝长 1 m、横截面积 0.1 mm²，灯丝 10 Ω。']);
    }
    case 'sh-series-equivalent-resistance': {
      const swap = Math.round(c.p('mode', 0)) === 1;
      const R = c.p('replacement', 10), U = c.p('voltage', 3);
      const R0 = 5 + 15, I0 = U / R0;
      const Rt = swap ? R : R0, I = U / Rt;
      const same = Math.abs(Rt - R0) < 1e-9;
      const phenomenon = !swap
        ? `5 Ω 与 15 Ω 串联，电流表示数 ${amp(I)}。`
        : same
          ? `用 20 Ω 替换后电流仍为 ${amp(I)}，与替换前相同：R = R₁ + R₂。`
          : `用 ${fmt(R, 0)} Ω 替换后电流为 ${amp(I)}，比替换前${I > I0 ? '大' : '小'}，应换${I > I0 ? '更大' : '更小'}的电阻。`;
      return shOut(c, phenomenon, {
        phase: swap ? '替换' : '串联', progress: swap ? clamp(I0 / I, 0, 2) : 1, active: true,
        closed: true, voltage: U, current: I, power: U * I, bulbOn: false, totalR: Rt, referenceCurrent: I0, matched: !swap || same, swap,
        voltage1: swap ? 0 : I * 5, voltage2: swap ? 0 : I * 15,
      }, [
        { label: '接入电阻', value: swap ? `R = ${fmt(R, 0)} Ω` : '5 Ω + 15 Ω' },
        { label: '电流', value: amp(I) },
        { label: '替换前电流', value: amp(I0) },
        { label: '比较', value: !swap ? '—' : same ? '相等（等效）' : I > I0 ? '偏大' : '偏小' },
      ], 'quantitative');
    }
    case 'sh-parallel-equivalent-resistance': {
      const swap = Math.round(c.p('mode', 0)) === 1;
      const R = c.p('replacement', 6), U = c.p('voltage', 3);
      const R1 = 10, R2 = 15, Req = (R1 * R2) / (R1 + R2);
      const i1 = swap ? 0 : U / R1, i2 = swap ? 0 : U / R2;
      const I0 = U / R1 + U / R2, I = swap ? U / R : I0;
      const same = Math.abs(I - I0) < 1e-9;
      const phenomenon = !swap
        ? `10 Ω 与 15 Ω 并联，干路电流 ${amp(I)}（支路 ${amp(i1)} + ${amp(i2)}）。`
        : same
          ? `用 ${fmt(Req, 0)} Ω 替换后电流仍为 ${amp(I)}：1/R = 1/R₁ + 1/R₂ 得到验证。`
          : `用 ${fmt(R, 0)} Ω 替换后电流为 ${amp(I)}，与替换前 ${amp(I0)} 不同，R 不是等效电阻。`;
      return shOut(c, phenomenon, {
        phase: swap ? '替换' : '并联', progress: 1, active: true,
        closed: true, voltage: U, current: I, current1: i1, current2: i2, power: U * I, bulbOn: false, equivalentR: Req, referenceCurrent: I0, matched: !swap || same, swap,
      }, [
        { label: '计算的等效电阻', value: `${fmt(Req, 1)} Ω` },
        { label: '总电流', value: amp(I) },
        { label: '支路1电流', value: amp(i1) },
        { label: '支路2电流', value: amp(i2) },
        { label: '替换前电流', value: amp(I0) },
      ], 'quantitative');
    }
    case 'sh-led-circuit': {
      const fwd = Math.round(c.p('polarity', 0)) === 0;
      const R = c.p('resistance', 100), U = c.p('voltage', 3);
      const I = fwd && U > LED_VF ? (U - LED_VF) / (R + LED_R) : 0;
      const Vled = I > 0 ? LED_VF + I * LED_R : fwd ? U : -U;
      const over = I > LED_MAX;
      const phenomenon = !fwd
        ? 'LED 反向连接，几乎没有电流，不发光：发光二极管具有单向导电性。'
        : I === 0
          ? `电源电压 ${fmt(U, 1)} V 低于导通电压，LED 不发光。`
          : over
            ? `电流 ${fmt(I * 1000, 0)} mA 超过允许值，LED 很亮但可能烧坏，应串联更大的限流电阻。`
            : `LED 正向导通发光，电流 ${fmt(I * 1000, 1)} mA。`;
      const warnings = ['LED 参数为示例：导通电压约 2.0 V，额定 20 mA。'];
      if (over) warnings.push(`电流超过 LED 允许值（示例 ${LED_MAX * 1000} mA），可能烧坏。`);
      return shOut(c, phenomenon, {
        phase: I > 0 ? '导通' : '截止', progress: clamp(I / LED_RATED, 0, 1.5), active: I > 0,
        closed: true, voltage: U, current: I, power: U * I, bulbOn: I > 0, ledLevel: clamp(I / LED_RATED, 0, 1.5), forward: fwd, overload: over, ledVoltage: Vled,
      }, [
        { label: '电流', value: `${fmt(I * 1000, 1)} mA` },
        { label: 'LED 两端电压', value: `${fmt(Vled, 2)} V` },
        { label: '接法', value: fwd ? '正向' : '反向' },
      ], 'quantitative', warnings);
    }
    default: return null;
  }
}

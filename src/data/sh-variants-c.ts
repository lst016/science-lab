import type { ShVariantGroup } from './sh-variant-types';
import { choose, parameter } from './content-helpers';

/* 组 C：上海版九年级第一学期电学活动（验电器、简单电路、材料导电、等效电阻、LED）。 */
export const shVariantsC: ShVariantGroup = {
  'physics-sh-9-1/electroscope-conductor-test': {
    variant: 'sh-electroscope-conductor-test',
    parameters: [
      choose('connector', '连接 A、B 的物体', ['不连接（对照）', '木棒', '金属棒（用木夹夹持）'], 2),
      parameter('charge', 'A 初始带电量', 20, 100, 80, '%', 10),
    ],
    formula: '木棒：qA、qB 不变；金属棒：两个相同验电器平分电荷 qA = qB = q₀/2；张角随电荷量增大',
    limits: '张角与电荷量按单调关系示意，不是定量标定；不计漏电与空气电离。“闭合 / 断开”动作表示把连接棒放上 / 抬离两金属球：抬离后已转移的电荷保留。',
  },
  'physics-sh-9-1/simple-bulb-circuit': {
    variant: 'sh-simple-bulb-circuit',
    parameters: [
      choose('wiring', '导线连接', ['电源、开关、灯泡连成闭合回路', '漏接一根导线'], 0),
      parameter('voltage', '干电池电压', 1.5, 4.5, 3, 'V', 1.5),
    ],
    formula: '回路闭合时 I = U / R灯，P = I²R灯；任一处断开 I = 0',
    limits: '灯丝电阻按 10 Ω 定值示例（真实灯丝随温度变化）；电池视为理想电源。',
  },
  'physics-sh-9-1/conductor-material-comparison': {
    variant: 'sh-conductor-material-comparison',
    parameters: [
      choose('sample', 'M、N 之间接入', ['导线直接相连', '康铜丝', '镍铬合金丝'], 1),
      parameter('voltage', '电源电压', 1.5, 4.5, 3, 'V', 1.5),
    ],
    formula: 'R丝 = ρL/S，I = U / (R灯 + R丝)；ρ康铜 ≈ 5.0×10⁻⁷ Ω·m，ρ镍铬 ≈ 1.1×10⁻⁶ Ω·m',
    limits: '示例：两根金属丝长 1 m、横截面积 0.1 mm²；灯丝电阻按 10 Ω 定值；电源、电流表和导线视为理想。',
  },
  'physics-sh-9-1/series-equivalent-resistance': {
    variant: 'sh-series-equivalent-resistance',
    parameters: [
      choose('mode', '接入 M、N 之间', ['R₁ = 5 Ω 与 R₂ = 15 Ω 串联', '用一个电阻 R 替换'], 0),
      parameter('replacement', '替换电阻 R', 5, 30, 10, 'Ω', 5),
      parameter('voltage', '电源电压', 1.5, 6, 3, 'V', 1.5),
    ],
    formula: 'I = U / (R₁ + R₂)；替换后 I′ = U / R，I′ = I 时 R = R₁ + R₂ = 20 Ω',
    limits: '电源电压恒定、内阻不计；电流表和导线视为理想。',
  },
  'physics-sh-9-1/parallel-equivalent-resistance': {
    variant: 'sh-parallel-equivalent-resistance',
    parameters: [
      choose('mode', '接入电路', ['R₁ = 10 Ω 与 R₂ = 15 Ω 并联', '用电阻 R 替换'], 0),
      parameter('replacement', '替换电阻 R', 2, 20, 6, 'Ω', 1),
      parameter('voltage', '电源电压', 1.5, 6, 3, 'V', 1.5),
    ],
    formula: 'I = U/R₁ + U/R₂；1/R = 1/R₁ + 1/R₂，R = 6 Ω 时替换前后电流相等',
    limits: '电源电压恒定、内阻不计；电流表和导线视为理想。',
  },
  'physics-sh-9-1/led-circuit': {
    variant: 'sh-led-circuit',
    parameters: [
      choose('polarity', 'LED 接法', ['长脚接电源正极一侧', '长脚接电源负极一侧'], 0),
      parameter('resistance', '串联限流电阻', 0, 300, 100, 'Ω', 10),
      parameter('voltage', '电源电压', 1.5, 4.5, 3, 'V', 1.5),
    ],
    formula: '正向且 U > U导通：I = (U − U导通) / (R + r)；反向或 U < U导通：I ≈ 0',
    limits: '示例 LED 参数：红光，导通电压约 2.0 V，额定电流约 20 mA，允许最大约 30 mA，等效内阻 r 取 10 Ω；伏安特性按折线近似，不计反向漏电。',
  },
};

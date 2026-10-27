import type { ShVariantGroup } from './sh-variant-types';
import { choose, parameter } from './content-helpers';

const B = 'chemistry-sh-8';

export const shVariantsD: ShVariantGroup = {
  [`${B}/effervescent-tablet-gas`]: {
    variant: 'sh-effervescent-tablet-gas',
    parameters: [choose('sample', '烧杯中', ['投入泡腾片', '对照：只有水'], 0), parameter('temp', '水温', 10, 40, 20, '°C', 5)],
    formula: '泡腾片 + 水 → 大量气泡（新气体）；玻璃片无大量冷凝水 ⇒ 气泡不是水蒸气 ⇒ 化学变化',
    limits: '定性模型：只表示“有气泡、玻璃片无大量冷凝水”的证据关系；产气快慢随水温的变化是示意趋势，未给出气体成分与体积数据。对照组只有水，不产气。',
  },
  [`${B}/magnesium-cut-burn`]: {
    variant: 'sh-magnesium-cut-burn',
    parameters: [choose('step', '操作', ['打磨后用剪刀剪断', '坩埚钳夹住点燃'], 0), parameter('length', '镁带长度', 2, 6, 3, 'cm', 0.5)],
    formula: '剪断：形状改变，无新物质（物理变化）；燃烧：2Mg + O₂ → 2MgO（白色粉末，化学变化）',
    limits: '定性模型：“加入 / 滴加”按钮表示执行所选操作。燃烧时间按镁带长度示意，未计白烟逸散；不给出产物实测质量。强光示意仅用于提示：须由教师操作，学生佩戴护目镜，不长时间直视。',
  },
  [`${B}/electronic-balance-weighing`]: {
    variant: 'sh-electronic-balance-weighing',
    parameters: [choose('stage', '步骤', ['开机自检', '放称量纸并去皮', '加粗盐至目标质量', '倒入烧杯并关机'], 0), parameter('target', '目标质量', 1, 10, 5, 'g', 0.5), parameter('paper', '称量纸质量（示例）', 0.3, 1.0, 0.5, 'g', 0.1)],
    formula: '示数 = 秤盘上总质量 − 去皮质量；分度值 0.1 g，加样接近目标时轻敲手腕补足，不超过目标',
    limits: '称量纸质量为示例值，不是实测；示数按 0.1 g 分度取整。“开始实验”表示执行当前步骤（开机 / 去皮 / 加样 / 倒出），“记录观察”只读取示数。',
  },
  [`${B}/alcohol-lamp-flame`]: {
    variant: 'sh-alcohol-lamp-flame',
    parameters: [choose('zone', '观察部位', ['外焰', '内焰', '焰心'], 0), choose('probe', '火柴梗', ['不放入', '横插入火焰约 1 s'], 1)],
    formula: '火焰分外焰、内焰、焰心；温度：外焰 > 内焰 > 焰心（相对比较）⇒ 加热用外焰',
    limits: '定性模型：只给相对温度高低，不给温度数值；火柴梗炭化程度按外焰最重、焰心最轻示意。“点燃 / 熄灭”按奇偶切换，熄灭表示用灯帽盖灭。',
  },
  [`${B}/graphite-pencil-conductivity`]: {
    variant: 'sh-graphite-pencil-conductivity',
    parameters: [choose('line', '石墨线', ['两条线完整连通', '用橡皮擦断一条'], 0), choose('pencil', '铅笔', ['6B（软、石墨多）', 'HB（较硬）'], 0), parameter('width', '线宽', 0.3, 1.5, 1, 'cm', 0.1)],
    formula: '回路连通 → 有电流 → 二极管发光；石墨线电阻 R ∝ 长度 /（线宽 × 涂层厚度），I ≈ (U − U_LED) / R',
    limits: '示意模型：9 V 电池、二极管导通电压约 2 V；石墨线电阻和电流为示例数量级，6B 比 HB 电阻小只作趋势。“闭合 / 断开”奇数次表示移开电池。',
  },
  [`${B}/composition-history-models`]: {
    variant: 'sh-composition-history-models',
    parameters: [choose('model', '模型', ['道尔顿：实心球（1803）', '汤姆孙：“葡萄干布丁”（1904）', '卢瑟福：核式结构（1911）', '玻尔：分层轨道（1913）'], 0), choose('view', '比例', ['结构示意（核放大）', '提示真实比例'], 0)],
    formula: '实心不可分 → 正电球嵌电子 → 原子核集中质量、体积极小 → 电子在一定轨道上运动；原子半径 ≈ 10⁵ × 原子核半径',
    limits: '年份取常用说法；模型为教学表征，不是真实原子图像。核与原子尺度比约 1∶10⁵（数量级），示意图为可见而放大原子核，选“提示真实比例”时给出说明。“开始实验”让模型转动展示。',
  },
  [`${B}/copper-sulfate-naoh-mass`]: {
    variant: 'sh-copper-sulfate-naoh-mass',
    parameters: [parameter('cuso4', '2% 硫酸铜溶液', 2, 10, 5, 'mL', 1), parameter('naoh', '10% 氢氧化钠溶液', 2, 10, 5, 'mL', 1)],
    formula: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄；m(反应前总) = m(反应后总)',
    limits: '溶液密度取近似值（2% CuSO₄ ≈ 1.02 g/mL，10% NaOH ≈ 1.11 g/mL）；两只烧杯共 100.0 g 为示例，天平示数不是实测记录。Cu(OH)₂ 质量按限量试剂完全反应的理论值计算。无气体逸出，敞口烧杯总质量不变。',
  },
  [`${B}/co2-capture-model`]: {
    variant: 'sh-co2-capture-model',
    parameters: [choose('method', '吸收方案', ['水（溶解储存）', '石灰水（生成 CaCO₃）', '10% NaOH 溶液（生成 Na₂CO₃）'], 2), parameter('gas', '通入 CO₂', 50, 500, 200, 'mL', 50), parameter('liquid', '吸收液体积', 20, 100, 100, 'mL', 10)],
    formula: '水：约 0.88 体积 CO₂/体积水（20 ℃）；Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O；2NaOH + CO₂ → Na₂CO₃ + H₂O；剩余气体 = 通入 − 吸收',
    limits: '按 20 ℃、1 atm、气体充分接触的理想上限计算，气体摩尔体积取 24.0 L/mol；石灰水按 Ca(OH)₂ 溶解度约 0.165 g/100 mL，不计继续通入后 CaCO₃ 转为 Ca(HCO₃)₂ 变澄清；NaOH 溶液密度取 1.11 g/mL。真实装置吸收率低于此上限。',
  },
};

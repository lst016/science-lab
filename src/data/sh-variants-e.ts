import type { ShVariantGroup } from './sh-variant-types';
import { choose, parameter } from './content-helpers';

export const shVariantsE: ShVariantGroup = {
  'chemistry-sh-9/evaporate-on-copper-plate': {
    variant: 'sh-evaporate-on-copper-plate',
    parameters: [parameter('minutes', '放置时间', 0, 10, 4, 'min', 0.5), parameter('plateTemp', '铜片温度（示例）', 20, 95, 80, '°C', 5)],
    formula: '析出质量 = 原溶质质量 − S(T) × 剩余水量 / 100 g；KNO₃ 的 S(T) 随温度增大很多，NaCl 几乎不变',
    limits: '液滴按 20 °C 饱和溶液、每 100 g 水计算；溶解度取常见溶解度表近似值（NaCl 0–30 °C 用教材表 7.3）。铜片温度是示例值，教材只说铜片放在盛沸水的烧杯口；蒸发比例随时间和温度线性增长，速率为示例假设，不是实测。未计液滴升温过程、过饱和与结晶速率。',
  },
  'chemistry-sh-9/water-effect-on-acid-base-salt': {
    variant: 'sh-water-effect-on-acid-base-salt',
    parameters: [choose('tube', '关注试管', ['石蕊试纸＋柠檬酸', '镁带＋柠檬酸', '氢氧化钡＋胆矾'], 0)],
    formula: '加水后离解出离子：H⁺ 使蓝色石蕊变红；Mg + 2H⁺ → Mg²⁺ + H₂↑；Ba(OH)₂ + CuSO₄ → BaSO₄↓ + Cu(OH)₂↓',
    limits: '定性模型：“加入”表示沾柠檬酸溶液或滴加蒸馏水，“振荡”使反应更充分；三支试管同时操作，选择器只决定读数关注哪一支。按教材预期简化为加水前不反应（含结晶水的固体混合研磨时也可能缓慢反应，模型未计）。沉淀量、气泡多少只表示有无和相对程度。',
  },
  'chemistry-sh-9/ammonium-fertilizer-base': {
    variant: 'sh-ammonium-fertilizer-base',
    parameters: [
      choose('salt', '铵态氮肥', ['氯化铵', '硫酸铵'], 0),
      choose('method', '操作', ['与熟石灰研磨', '与 NaOH 溶液微热'], 0),
      choose('base', '加入物质', ['碱（熟石灰 / NaOH）', '不加碱（对照）'], 0),
    ],
    formula: '2NH₄Cl + Ca(OH)₂ → CaCl₂ + 2NH₃↑ + 2H₂O；(NH₄)₂SO₄ + Ca(OH)₂ → CaSO₄ + 2NH₃↑ + 2H₂O；NH₄Cl + NaOH →(△) NaCl + NH₃↑ + H₂O',
    limits: '定性模型：只判断是否放出氨气、湿润红色石蕊试纸是否变蓝。“不加碱”对照组是为比较而加的设计，教材未列；未计氨气浓度、加热温度和研磨时间。“收集”只表示检验/闻气味，不改变反应。',
  },
  'chemistry-sh-9/bicarbonate-acid-endothermic': {
    variant: 'sh-bicarbonate-acid-endothermic',
    parameters: [
      parameter('mass', '碳酸氢钠质量', 0.5, 4, 2, 'g', 0.5),
      parameter('acid', '4% 盐酸体积', 10, 50, 30, 'mL', 5),
      parameter('room', '起始温度', 10, 30, 20, '°C', 1),
    ],
    formula: 'NaHCO₃ + HCl → NaCl + H₂O + CO₂↑，ΔH ≈ +31 kJ/mol；ΔT ≈ n(限量) × 31 kJ/mol ÷ (m溶液 × 4.0 J/(g·°C))',
    limits: 'ΔH 由标准生成焓估算（NaHCO₃ 固体、CO₂ 逸出）；4% 盐酸密度取 1.02 g/mL、比热取 4.0 J/(g·°C)，忽略锥形瓶和传感器吸热。“2 药匙”的质量因药匙而异，用质量参数代替（默认 2 g 为示例）。反应快慢（约 6 s）和回温（约 900 s）时间常数是示例假设，曲线是模型计算，不是教材实测数据。',
  },
  'chemistry-sh-9/alcohol-kerosene-burning': {
    variant: 'sh-alcohol-kerosene-burning',
    parameters: [
      choose('fuel', '关注燃料', ['酒精', '煤油'], 0),
      choose('supply', '煤油燃烧方式', ['灯芯直接燃烧', '雾化后与空气混合（拓展）'], 0),
    ],
    formula: 'C₂H₅OH + 3O₂ →(点燃) 2CO₂ + 3H₂O；含碳量高的燃料与氧气混合不足时燃烧不充分，产生炭黑（黑烟）',
    limits: '定性模型：火焰颜色、黑烟多少只表示相对差异。煤油是多种烃的混合物，含碳量以 C₁₂H₂₆ 作示例代表计算；“雾化”选项对应教材拓展思考，是示意，不代表实验室可直接这样操作。',
  },
  'chemistry-sh-9/iron-rust-oxygen-sensor': {
    variant: 'sh-iron-rust-oxygen-sensor',
    parameters: [
      parameter('time', '采集时间', 0, 600, 300, 's', 10),
      choose('paper', '关注容器', ['① 湿滤纸（有水）', '② 干燥滤纸（无水）'], 0),
    ],
    formula: '4Fe + 3O₂ + 2xH₂O → 2Fe₂O₃·xH₂O（需氧气和水；炭粉加快锈蚀），容器内 O₂ 浓度随时间下降',
    limits: '定性模型：两条氧气浓度曲线是示例形状（起点约 21%），用于对比“有水下降明显、无水几乎不变”，不是教材图 9.21 的数值。“加入”表示放入铁粉和炭粉开始采集，“振荡”表示摇匀，摇匀后示例反应更快；未计温度、湿度和容器体积差异。',
  },
};

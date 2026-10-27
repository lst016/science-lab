import type { ShVariantGroup } from './sh-variant-types';
import { choose, parameter } from './content-helpers';

export const shVariantsB: ShVariantGroup = {
  'physics-sh-8-1/drum-membrane-foam': {
    variant: 'sh-drum-membrane-foam',
    parameters: [choose('beads', '膜上放置', ['不放颗粒', '放泡沫颗粒'], 1), parameter('force', '敲击力度', 1, 5, 3, '档', 1)],
    formula: '敲击 → 橡皮膜振动 → 发声；振幅 ∝ 敲击力度，并随时间衰减；颗粒弹跳高度随振幅增大',
    limits: '定性模型：振幅为相对值，衰减时间取示例值；不计膜张力、杯腔共鸣和颗粒间碰撞。',
    equipment: ['杯子', '橡皮薄膜', '泡沫塑料颗粒'],
  },
  'physics-sh-8-1/simple-instrument': {
    variant: 'sh-simple-instrument',
    parameters: [choose('kind', '乐器', ['吸管排箫（空气柱）', '橡皮筋琴（弦）'], 0), parameter('length', '发声部分长度', 5, 20, 10, 'cm', 1), parameter('tension', '橡皮筋拉力', 2, 10, 5, 'N', 1)],
    formula: '一端封闭的吸管：f = v / (4L)，v = 343 m/s；橡皮筋：f = (1/2L)·√(F/μ)',
    limits: '吸管不计管口修正，橡皮筋线密度 μ 取示例值 0.5 g/m；频率为理想模型估算，实际乐器会因材料和管径偏离。',
    equipment: ['吸管（一端封住）', '剪刀', '橡皮筋', '小木盒', '手机频率测量软件'],
  },
  'physics-sh-8-1/water-lens-eye': {
    variant: 'sh-water-lens-eye',
    parameters: [parameter('volume', '水袋水量', 2, 10, 6, 'mL', 1), parameter('object', '发光物到透镜距离', 20, 60, 40, 'cm', 1)],
    formula: '1/u + 1/v = 1/f；水量越多水袋越凸、焦距 f 越小（示例：f = 16 − 0.9V cm）；光屏固定在 15 cm 处模拟视网膜',
    limits: '薄透镜模型；水量与焦距的对应关系是示例线性关系，不是教材数据；模糊程度用像距与屏距之差近似。',
  },
  'physics-sh-8-2/hand-temperature-sense': {
    variant: 'sh-hand-temperature-sense',
    parameters: [parameter('cold', '冷水温度', 5, 20, 10, '℃', 1), parameter('warm', '温水温度', 25, 35, 30, '℃', 1), parameter('hot', '热水温度', 38, 50, 45, '℃', 1)],
    formula: '手的冷热感觉 ≈ 水温 − 手已适应的温度；同一盆温水，两手感觉相反',
    limits: '定性模型：用“温差”近似皮肤感觉，不计皮肤适应速度和个体差异；水温为可调示例值。',
  },
  'physics-sh-8-2/syringe-low-pressure-boiling': {
    variant: 'sh-syringe-low-pressure-boiling',
    parameters: [parameter('water', '水温', 60, 90, 80, '℃', 1), parameter('pull', '活塞外拉体积', 0, 10, 6, 'mL', 1)],
    formula: '等温：p = p₀·V₀ /(V₀ + ΔV)；沸点由水的饱和蒸气压（Antoine 公式）求得；水温 ≥ 沸点 时沸腾',
    limits: '注射器内原有空气 V₀ 取示例 1 mL；忽略水蒸气积累、拉动过程中水的降温和漏气。',
  },
  'physics-sh-8-2/iodine-sublimation': {
    variant: 'sh-iodine-sublimation',
    parameters: [choose('heater', '加热方式', ['热水浴微热', '酒精灯直接加热'], 0)],
    formula: '碘熔点约 113.7 ℃；热水浴温度 < 熔点，碘由固态直接变为紫色碘蒸气（升华）；停止加热后在冷壁上凝华',
    limits: '定性模型：管内温度按指数趋近热源温度，时间常数和酒精灯热源温度为示例值；不计碘蒸气压的定量变化。',
    equipment: ['大试管', '固态碘', '塞子', '烧杯热水', '酒精灯'],
  },
  'physics-sh-9-1/wood-copper-conduction': {
    variant: 'sh-wood-copper-conduction',
    parameters: [parameter('distance', '牙签到 O 处距离', 5, 20, 10, 'cm', 1), parameter('source', 'O 处温度', 100, 300, 200, '℃', 10)],
    formula: '半无限长棒一维导热：T(x,t) = T₀ + (Tₛ − T₀)·erfc(x / 2√(αt))；α铜 ≈ 1.1×10⁻⁴ m²/s，α木 ≈ 1×10⁻⁷ m²/s',
    limits: '不计棒表面散热和支架温度变化；O 处温度和凡士林熔化温度（50 ℃）为示例值；动画按 5 倍速播放。',
  },
  'physics-sh-9-1/heat-island-surface-temperature': {
    variant: 'sh-heat-island-surface-temperature',
    parameters: [parameter('hour', '测量时刻', 8, 18, 14, '时', 1), choose('weather', '天气', ['晴', '多云'], 0), choose('source', '人工热源', ['无', '空调外机排热'], 0)],
    formula: '地表温度 ≈ 气温 + (1 − 反照率)·S / 散热系数；草地蒸腾散热强，升温少',
    limits: '示意性能量平衡模型：日照、气温、反照率、散热系数和空调排热量均为示例值，不是教材或实测数据；实际应以小组测量记录为准。',
  },
};

import type { ShVariantGroup } from './sh-variant-types';
import { choose, parameter } from './content-helpers';

export const shVariantsA1: ShVariantGroup = {
  'physics-sh-8-1/span-estimate': {
    variant: 'sh-span-estimate',
    parameters: [parameter('span', '1 拃的长度', 14, 22, 18, 'cm', 0.5), parameter('desk', '课桌长度', 60, 140, 120, 'cm', 5)],
    formula: '拃数 n = 课桌长度 L ÷ 1 拃的长度 l',
    limits: '1 拃长度与课桌长度均为示例值，不是教材数据；手掌逐拃移动时无重叠、无间隙，不计手指张开程度的变化。',
  },
  'physics-sh-8-1/uniform-motion-trace': {
    variant: 'sh-uniform-motion-trace',
    parameters: [choose('pull', '牵引方式', ['手拉细线', '电动机牵引'], 0), parameter('interval', '记录间隔', 0.2, 1, 0.5, 's', 0.1)],
    formula: '相等时间 Δt 内路程 Δs 近似相等且轨迹为直线 → 近似匀速直线运动',
    limits: '标记点位置为示意性示例：手拉时前几段加速并偏离参考线、后段近似匀速；电动机牵引时从起点起即接近匀速。物块稳定速度取示例值 0.1 m/s。',
  },
  'physics-sh-8-1/motor-lift-speed': {
    variant: 'sh-motor-lift-speed',
    parameters: [parameter('voltage', '电动机电压', 1.5, 6, 3, 'V', 0.5), parameter('mass', '钩码质量', 50, 200, 100, 'g', 50)],
    formula: 'v = s / t；每段 s = 10 cm',
    limits: '电动机稳定运行后钩码匀速上升；上升速度与电压、钩码质量的关系是示例性线性近似（不是教材数据），不计启动阶段与细线伸长。',
  },
  'physics-sh-8-1/water-balloon-spring': {
    variant: 'sh-water-balloon-spring',
    parameters: [parameter('water', '气球内水量', 100, 400, 250, 'mL', 50), parameter('k', '弹簧劲度系数', 20, 80, 40, 'N/m', 5)],
    formula: 'G = mg（m = ρ水V）；弹簧伸长 x = G / k',
    limits: '不计气球皮与弹簧自身质量，g 取 9.8 N/kg；气球形变只做示意（悬挂后被拉长），劲度系数为示例值。',
  },
  'physics-sh-8-1/flask-micro-deformation': {
    variant: 'sh-flask-micro-deformation',
    parameters: [parameter('press', '手压力', 5, 50, 20, 'N', 5), parameter('tubeR', '细管内半径', 0.5, 3, 1, 'mm', 0.5)],
    formula: '瓶容积减小 ΔV = C·F；细管水面上升 h = ΔV / (πr²)',
    limits: '水体积不变；瓶的“柔度” C 取示例值 5 mm³/N，形变按弹性线性处理，松手后完全恢复；不计温度变化与橡皮塞的形变。',
  },
  'physics-sh-8-1/press-spring': {
    variant: 'sh-press-spring',
    parameters: [parameter('force', '手指压力', 0.5, 10, 4, 'N', 0.5), parameter('k', '弹簧劲度系数', 100, 500, 200, 'N/m', 50)],
    formula: '弹力 F弹 = kx；压缩量 x = F / k（不超过弹性限度）',
    limits: '弹簧在弹性限度内服从胡克定律；可压缩量上限取示例值 3 cm（簧圈并紧），超过后弹簧不再按比例形变。',
  },
  'physics-sh-8-1/plumb-line': {
    variant: 'sh-plumb-line',
    parameters: [parameter('tilt', '斜面倾角', 0, 45, 20, '°', 5)],
    formula: '重垂线方向 ∥ 重力方向（竖直向下）：与水平面夹角恒为 90°，与斜面夹角为 90° − θ',
    limits: '只演示方向关系；释放后的摆动按阻尼振动示意，不计空气流动和绳的质量。',
  },
  'physics-sh-8-1/sensor-two-force-balance': {
    variant: 'sh-sensor-two-force-balance',
    parameters: [parameter('mass', '钩码质量', 50, 500, 200, 'g', 50), choose('motion', '钩码运动状态', ['静止', '匀速上升', '匀速下降'], 0)],
    formula: '二力平衡：F = G = mg，方向相反、作用在同一直线上，合力为零',
    limits: '只考虑静止和匀速阶段；不计启动、停止时的加速过程，不计细绳和传感器质量，g 取 9.8 N/kg。',
  },
};

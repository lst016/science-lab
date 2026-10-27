import type { ShVariantGroup } from './sh-variant-types';
import { choose, parameter } from './content-helpers';

const B = 'physics-sh-8-2';

export const shVariantsA2: ShVariantGroup = {
  [`${B}/magdeburg-hemispheres`]: {
    variant: 'sh-magdeburg-hemispheres',
    parameters: [parameter('radius', '半球半径', 3, 10, 5, 'cm', 0.5), parameter('inner', '球内残余气压', 0, 100, 20, 'kPa', 1), parameter('pull', '每侧拉力', 0, 800, 300, 'N', 10)],
    formula: 'F拉开 = (p0 − p内)·πr²，p0 取 101.3 kPa',
    limits: '把接合面看作半径 r 的圆，按标准大气压计算；不计半球自重、橡胶圈粘连和抽气不均。拉力为可调示例。',
  },
  [`${B}/inverted-water-tube`]: {
    variant: 'sh-inverted-water-tube',
    parameters: [parameter('length', '玻璃管露出水面长度', 0.2, 12, 0.5, 'm', 0.1), parameter('pressure', '大气压', 90, 104, 101.3, 'kPa', 0.1)],
    formula: 'h最大 = p0 /(ρ水 g) ≈ 10.3 m；L ≤ h最大 时水柱不下降',
    limits: '不计水的饱和蒸气压、温度和管壁附着；管长超过 10 m 只作思想实验（教材只用较短的管）。装置高度按比例压缩显示。',
  },
  [`${B}/venturi-tube`]: {
    variant: 'sh-venturi-tube',
    parameters: [parameter('head', '蓄水容器水深', 5, 40, 25, 'cm', 1), parameter('ratio', 'c 处与 a 处截面积之比', 0.4, 0.9, 0.5, '', 0.05)],
    formula: 'Q = A·v 不变；h_i = H − v_i²/(2g)，出口 v出 = √(2gH)',
    limits: '理想流体伯努利模型：不计黏滞损失，蓄水容器水深保持不变；出口截面固定为 a 处的 0.3 倍（示例）。',
  },
  [`${B}/pingpong-bottomless-bottle`]: {
    variant: 'sh-pingpong-bottomless-bottle',
    parameters: [choose('cap', '瓶口状态', ['未拧瓶盖（漏水）', '拧上瓶盖'], 0), parameter('depth', '注水深度', 2, 15, 8, 'cm', 1)],
    formula: 'F浮 = F下 − F上；下方无水时 F下 = 0，球被压在瓶口',
    limits: '乒乓球按直径 4 cm、质量 2.7 g，瓶口半径 1.1 cm；漏水时按球下表面无水计算，水深为示例值。',
  },
  [`${B}/cartesian-diver`]: {
    variant: 'sh-cartesian-diver',
    parameters: [parameter('air', '浮沉子内空气体积', 5, 8, 5.4, 'cm³', 0.1), parameter('squeeze', '挤压时瓶内增压', 0, 30, 15, 'kPa', 1)],
    formula: 'V气 = V0·p0/(p0+Δp)；ρ水 g(V玻璃+V气) 与 m瓶 g 比较',
    limits: '小玻璃瓶按 8 g、玻璃体积 3.2 cm³（示例），气体等温压缩；不计水深带来的附加压强。',
  },
  [`${B}/sailboat-model`]: {
    variant: 'sh-sailboat-model',
    parameters: [choose('hull', '船体布置', ['三瓶并排（两侧浮筒）', '单瓶（对照）'], 0), parameter('sail', '帆高', 10, 40, 20, 'cm', 1), parameter('wind', '风速', 1, 6, 3, 'm/s', 0.5)],
    formula: 'F风 = ½ρ空CdA v²；倾角 θ ≈ F风·h帆 / K，K = ρ水g·I水线 − mg·BG',
    limits: '定性比较模型：船重、重心高度、阻力系数和航速均为示例估计；只比较稳定性与航行距离的趋势。',
  },
  [`${B}/pry-book-lever`]: {
    variant: 'sh-pry-book-lever',
    parameters: [choose('tool', '硬棒', ['30 cm 直尺', '17 cm 铅笔'], 0), parameter('l2', '橡皮到课本边的距离', 2, 10, 4, 'cm', 0.5), parameter('book', '课本重', 2, 8, 4, 'N', 0.5)],
    formula: 'F1·l1 = F2·l2；撬起一边时 F2 ≈ G/2',
    limits: '课本看作均匀长方体，绕对边转动；硬棒插入课本下 1 cm，不计硬棒自重与弯曲。',
  },
  [`${B}/sand-drop-potential-energy`]: {
    variant: 'sh-sand-drop-potential-energy',
    parameters: [parameter('height', '下落高度', 0.1, 1, 0.5, 'm', 0.05), parameter('mass', '重物质量', 0.1, 1, 0.2, 'kg', 0.05)],
    formula: 'Ep = mgh；mg(h+d) = F阻·d → d = mgh/(F阻 − mg)',
    limits: '沙对重物的平均阻力取 120 N（示例），与形状无关；只用于比较陷入深度的趋势。',
  },
  [`${B}/cable-stayed-bridge`]: {
    variant: 'sh-cable-stayed-bridge',
    parameters: [parameter('tower', '桥塔高出桥面', 40, 200, 100, 'mm', 5), parameter('anchor', '拉索到桥塔的水平距离', 60, 140, 140, 'mm', 5), parameter('hooks', '钩码个数（每个 50 g）', 0, 10, 4, '个', 1)],
    formula: 'T·sinθ·a = (G/2)·L，L = 140 mm（半跨），sinθ = H/√(H²+a²)',
    limits: '把半跨主梁看作以桥塔为支点的杠杆；拉索与胶带的承载上限取 12 N（示例），不计卡纸自重和扭转。',
  },
};

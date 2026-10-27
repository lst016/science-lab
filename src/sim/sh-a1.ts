import type { Observation, SimCtx } from './core';
import { clamp, fmt } from './core';
import { shOut } from './sh-common';

const G_N = 9.8;
const MARKS = 'ABCDEFGHI';
/** 物块各段相对稳定速度的比例（示例）：手拉起步加速、后段近似匀速；电动机牵引从起点即近似匀速。 */
const HAND_STEP = [0.35, 0.62, 0.85, 1.08, 1.0, 1.02, 0.98, 1.01];
const HAND_SIDE = [0, 1.2, 1.8, 1.0, 0.3, 0.2, 0.25, 0.2, 0.2];
const MOTOR_STEP = [0.97, 1, 1, 1.01, 1, 0.99, 1, 1];

/** 上海版独有活动模型（组 A1）；不属于本组的变体返回 null。 */
export function simulateShA1(c: SimCtx): Observation | null {
  switch (c.exp.sceneVariant) {
    case 'sh-span-estimate': {
      const span = c.p('span', 18), desk = c.p('desk', 120), run = c.count('run') > 0;
      const n = desk / span, full = Math.floor(n + 1e-9);
      return shOut(c,
        run ? `课桌长约 ${fmt(n, 1)} 拃（${full} 拃多一点）。拃长不同的同学量同一张桌子，拃数也不同。` : '张开大拇指和中指作为“1 拃”，点击开始，沿课桌边逐拃估测。',
        { phase: run ? '估测完成' : '准备', progress: run ? 1 : 0, active: run, span, desk, spans: n, full },
        [{ label: '1 拃长度（示例）', value: `${fmt(span, 1)} cm` }, { label: '估测结果', value: run ? `约 ${fmt(n, 1)} 拃` : '—' }],
        'quantitative', run ? ['拃长与桌长为示例值；用手估测便捷但因人而异。'] : []);
    }
    case 'sh-uniform-motion-trace': {
      const motor = Math.round(c.p('pull', 0)) === 1, dt = c.p('interval', 0.5), run = c.count('run') > 0;
      const v = 10; // cm/s，示例
      const steps = motor ? MOTOR_STEP : HAND_STEP;
      const xs = [0]; for (const f of steps) xs.push(xs[xs.length - 1] + v * dt * f);
      const ys = motor ? xs.map(() => 0.05) : HAND_SIDE.slice();
      const gaps = steps.map(f => v * dt * f);
      const early = gaps.slice(0, 4), late = gaps.slice(4);
      const mean = late.reduce((a, b) => a + b, 0) / late.length;
      const spread = Math.max(...late.map(g => Math.abs(g - mean))) / mean * 100;
      return shOut(c,
        !run ? '点击开始：拉动物块沿参考线运动，每隔相同时间记录一次标记点位置。'
          : motor ? `电动机牵引时，从 A 起各段间距都约 ${fmt(mean, 1)} cm，轨迹贴着参考线，最接近匀速直线运动。`
          : `手拉起步时轨迹偏离参考线、间距由 ${fmt(early[0], 1)} cm 增大；从 E 到 I 间距近似相等（约 ${fmt(mean, 1)} cm），这段最接近匀速直线运动。`,
        { phase: run ? '已记录 A–I' : '准备', progress: run ? 1 : 0, active: run, motor: motor ? 1 : 0, interval: dt, xs, ys, recorded: run ? MARKS.length : 0 },
        [{ label: 'A→E 各段间距', value: run ? early.map(g => fmt(g, 1)).join(' / ') + ' cm' : '—' }, { label: 'E→I 各段间距', value: run ? late.map(g => fmt(g, 1)).join(' / ') + ' cm' : '—' }, { label: 'E→I 间距偏差', value: run ? `±${fmt(spread, 1)}%` : '—' }],
        'qualitative', ['标记点位置为示意性示例，不是教材测量数据。']);
    }
    case 'sh-motor-lift-speed': {
      const U = c.p('voltage', 3), m = c.p('mass', 100), run = c.count('run') > 0;
      const v = clamp(4 * (U - 0.8) * (1 - (m - 50) / 600), 0.5, 30); // cm/s，示例近似
      const seg = 10 / v;
      const times = [0, 1, 2, 3, 4, 5].map(i => i * seg);
      return shOut(c,
        run ? `钩码每上升 10 cm 用时约 ${fmt(seg, 2)} s，各段时间相等，v = s/t ≈ ${fmt(v / 100, 3)} m/s，钩码近似匀速上升。` : '点击开始：电动机带动钩码平稳上升，经过标记线 O 时开始计时。',
        { phase: run ? '钩码上升' : '准备', progress: run ? 1 : 0, active: run, speed: v, segTime: seg, times },
        [{ label: '每段路程 s', value: '10 cm' }, { label: '每段时间 t', value: run ? `${fmt(seg, 2)} s` : '—' }, { label: '速度 v', value: run ? `${fmt(v / 100, 3)} m/s` : '—' }, { label: 'O→E 总时间', value: run ? `${fmt(times[5], 2)} s` : '—' }],
        'quantitative', ['电动机转速与电压、负载的关系为示例近似；v = s/t 为真实关系。']);
    }
    case 'sh-water-balloon-spring': {
      const V = c.p('water', 250), k = c.p('k', 40), hung = c.count('run') > 0;
      const mass = V / 1000, G = mass * G_N, x = G / k * 100;
      const r = Math.cbrt((3 * V) / (4 * Math.PI));
      return shOut(c,
        hung ? `挂上气球后弹簧伸长约 ${fmt(x, 1)} cm，同时气球被弹簧向上拉，形状变得细长：施力物体也受到力，力的作用是相互的。` : '装水气球放在木板上，两根相同弹簧都处于原长。点击开始，把气球挂到右边弹簧下。',
        { phase: hung ? '已悬挂' : '悬挂前', progress: hung ? 1 : 0, active: hung, hung, weight: G, stretch: hung ? x : 0, radius: r },
        [{ label: '气球重力 G', value: `${fmt(G, 2)} N` }, { label: '弹簧伸长 x', value: hung ? `${fmt(x, 1)} cm` : '0 cm' }, { label: '对照弹簧伸长', value: '0 cm' }],
        'quantitative', ['劲度系数为示例值；气球形变只做示意。']);
    }
    case 'sh-flask-micro-deformation': {
      const F = c.p('press', 20), r = c.p('tubeR', 1), n = c.count('run'), pressed = n % 2 === 1;
      const dV = 5 * F, hMax = dV / (Math.PI * r * r);
      const h = pressed ? hMax : 0;
      return shOut(c,
        pressed ? `压瓶底时细管水面上升约 ${fmt(hMax, 1)} mm：瓶内水体积不变，水面上升说明锥形瓶发生了微小形变。`
          : n > 0 ? '松手后细管水面回到原来位置，锥形瓶恢复原状。' : '锥形瓶装满水，塞上穿细玻璃管的橡皮塞。点击开始用手压瓶底，再点一次松手。',
        { phase: pressed ? '压瓶底' : n > 0 ? '已松手' : '准备', progress: pressed ? 1 : 0, active: pressed, pressed, rise: h, riseMax: hMax, force: pressed ? F : 0 },
        [{ label: '手压力', value: pressed ? `${fmt(F, 0)} N` : '0 N' }, { label: '瓶容积减小 ΔV（示例）', value: `${fmt(pressed ? dV : 0, 0)} mm³` }, { label: '细管水面上升', value: `${fmt(h, 1)} mm` }],
        'qualitative', ['瓶的柔度 C 为示例值，只用来说明“细管越细，同样形变下水面升得越高”。']);
    }
    case 'sh-press-spring': {
      const F = c.p('force', 4), k = c.p('k', 200), n = c.count('run'), pressing = n % 2 === 1;
      const xLim = 3, xRaw = F / k * 100, over = xRaw > xLim;
      const x = pressing ? Math.min(xRaw, xLim) : 0;
      const Fe = pressing ? (over ? F : k * x / 100) : 0;
      return shOut(c,
        !pressing ? (n > 0 ? '手指离开，弹簧恢复原长，弹力消失。' : '点击开始用手指压弹簧，再点一次松开；改变压力比较弹簧形变。')
          : over ? `弹簧已被压到簧圈并紧（${fmt(xLim, 1)} cm），不再按比例缩短：超过了弹性限度。`
          : `弹簧被压缩 ${fmt(x, 2)} cm，对手指的弹力约 ${fmt(Fe, 1)} N。压力越大，形变越大，弹力也越大。`,
        { phase: pressing ? '压缩' : '原长', progress: pressing ? 1 : 0, active: pressing, pressing, compress: x, compressMax: xLim, elastic: Fe, over: pressing && over },
        [{ label: '压缩量 x', value: `${fmt(x, 2)} cm` }, { label: '弹力 F弹 = kx', value: `${fmt(Fe, 2)} N` }, { label: '劲度系数 k', value: `${fmt(k, 0)} N/m` }],
        'quantitative', pressing && over ? ['已超过示例弹性限度（3 cm），胡克定律不再适用。'] : []);
    }
    case 'sh-plumb-line': {
      const tilt = c.p('tilt', 20), run = c.count('run') > 0;
      return shOut(c,
        run ? `斜面倾角 ${fmt(tilt, 0)}° 时，重垂线静止后仍与水平面垂直（与斜面成 ${fmt(90 - tilt, 0)}°）：重力方向竖直向下。` : '点击开始释放重物，待重垂线静止后观察绳子方向；再改变斜面倾角比较。',
        { phase: run ? '重垂线静止' : '准备', progress: run ? 1 : 0, active: run, released: run, tilt, angleH: 90, angleIncline: 90 - tilt },
        [{ label: '斜面倾角 θ', value: `${fmt(tilt, 0)}°` }, { label: '绳与水平面夹角', value: run ? '90°' : '—' }, { label: '绳与斜面夹角', value: run ? `${fmt(90 - tilt, 0)}°` : '—' }],
        'quantitative');
    }
    case 'sh-sensor-two-force-balance': {
      const m = c.p('mass', 200), mode = Math.round(c.p('motion', 0)), run = c.count('run') > 0;
      const G = m / 1000 * G_N, F = G;
      const dir = run ? (mode === 1 ? 1 : mode === 2 ? -1 : 0) : 0;
      const state = ['静止', '匀速上升', '匀速下降'][dir === 0 ? 0 : mode] ?? '静止';
      return shOut(c,
        run ? `钩码${state}：拉力 F = ${fmt(F, 2)} N 竖直向上，重力 G = ${fmt(G, 2)} N 竖直向下，大小相等、方向相反、在同一直线上，合力为零。` : '钩码挂在力传感器下保持静止。选择运动状态后点击开始，由电动机带动钩码。',
        { phase: state, progress: run ? 1 : 0, active: dir !== 0, F, G, dir, mode },
        [{ label: '拉力 F', value: `${fmt(F, 2)} N` }, { label: '重力 G', value: `${fmt(G, 2)} N` }, { label: '合力', value: '0 N' }, { label: '运动状态', value: state }],
        'quantitative');
    }
    default: return null;
  }
}

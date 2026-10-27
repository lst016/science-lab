import type { Observation, SimCtx } from './core';
import { clamp, fmt, smooth } from './core';
import { shOut } from './sh-common';

const G = 9.8, RHO = 1000, P0 = 101.3;

/** 开始实验后的推进量：0 → 1（dur 秒）；之后做了别的动作则视为已完成。 */
function ran(c: SimCtx, dur: number, id = 'run') {
  if (c.count(id) <= 0) return 0;
  return c.action.id === id ? smooth(c.since(id) / dur) : 1;
}

/** 上海版独有活动模型（组 A2）；不属于本组的变体返回 null。 */
export function simulateShA2(c: SimCtx): Observation | null {
  switch (c.exp.sceneVariant) {
    case 'sh-magdeburg-hemispheres': {
      const r = c.p('radius', 5) / 100, pin = c.p('inner', 20), pull = c.p('pull', 300);
      const dp = Math.max(0, P0 - pin);
      const need = dp * 1000 * Math.PI * r * r;
      const k = ran(c, 1.5), pulling = c.count('run') > 0;
      const apart = pulling && pull > need;
      const text = !pulling ? `抽气后球内剩 ${fmt(pin, 0)} kPa，内外压差 ${fmt(dp, 1)} kPa。点击开始，两边同学用力拉。`
        : apart ? `每侧 ${fmt(pull, 0)} N 超过所需 ${fmt(need, 0)} N，半球被拉开。抽气更充分或球更大时就拉不开了。`
        : `每侧 ${fmt(pull, 0)} N 小于大气压的压力 ${fmt(need, 0)} N，半球拉不开：大气压强很大。`;
      return shOut(c, text, { phase: pulling ? (apart ? '拉开' : '拉不开') : '抽气后', progress: k, active: pulling, separated: apart, gap: apart ? k : 0, pullK: pulling ? k : 0, need, dp }, [
        { label: '所需拉力', value: `${fmt(need, 0)} N` }, { label: '内外压差', value: `${fmt(dp, 1)} kPa` }, { label: '每侧拉力', value: `${fmt(pull, 0)} N` }], 'quantitative', ['拉力为可调示例值，按标准大气压计算。']);
    }
    case 'sh-inverted-water-tube': {
      const L = c.p('length', 0.5), p0 = c.p('pressure', P0);
      const hmax = p0 * 1000 / (RHO * G);
      const k = ran(c, 1.6), released = c.count('run') > 0;
      const full = L <= hmax;
      const col = released ? Math.min(L, L + (hmax - L) * k) : L;
      const frac = clamp(col / L, 0, 1);
      const text = !released ? `管中注满水、手指堵住管口倒插在水槽里。点击开始，松开手指。`
        : full ? `松开手指后水柱不下降：大气压最多能托住约 ${fmt(hmax, 1)} m 水柱，${fmt(L, 1)} m 的管远未达到。`
        : `管长 ${fmt(L, 1)} m 超过 ${fmt(hmax, 1)} m，水柱下降到约 ${fmt(hmax, 1)} m 后停住，上方出现真空。`;
      return shOut(c, text, { phase: released ? (full ? '水柱不降' : '水柱下降') : '堵住管口', progress: k, active: released, released, frac, column: col, hmax }, [
        { label: '可托住水柱', value: `${fmt(hmax, 2)} m` }, { label: '管中水柱', value: `${fmt(col, 2)} m` }], 'quantitative', L > 1.5 ? ['长度超过 1.5 m 的管为思想实验示例，教材只用较短玻璃管。'] : []);
    }
    case 'sh-venturi-tube': {
      const H = c.p('head', 25), ratio = c.p('ratio', 0.5), nozzle = 0.3;
      const open = c.count('run') % 2 === 1;
      const k = c.count('run') > 0 && c.action.id === 'run' ? smooth(c.since('run') / 1.2) : 1;
      const areas = [1, (1 + ratio) / 2, ratio];
      const vout = Math.sqrt(2 * G * H / 100);
      const vel = areas.map(a => open ? vout * nozzle / a : 0);
      const lv = vel.map(v => clamp(H - v * v / (2 * G) * 100, 0, H));
      const h = lv.map(x => open ? H + (x - H) * k : H);
      const text = !open ? `出口关闭，水不流动，a、b、c 三根竖直细管液面一样高（${fmt(H, 0)} cm）。点击开始放水。`
        : `水流动时 a 处粗、流速 ${fmt(vel[0], 2)} m/s，液面 ${fmt(h[0], 1)} cm；c 处细、流速 ${fmt(vel[2], 2)} m/s，液面只有 ${fmt(h[2], 1)} cm：流速大处压强小。`;
      return shOut(c, text, { phase: open ? '流动' : '静止', progress: open ? k : 0, active: open, open, ha: h[0], hb: h[1], hc: h[2], va: vel[0], vb: vel[1], vc: vel[2], head: H, ratio }, [
        { label: 'a/b/c 液面', value: `${fmt(h[0], 1)} / ${fmt(h[1], 1)} / ${fmt(h[2], 1)} cm` }, { label: 'c 处流速', value: `${fmt(vel[2], 2)} m/s` }], 'quantitative');
    }
    case 'sh-pingpong-bottomless-bottle': {
      const capped = Math.round(c.p('cap', 0)) === 1, depth = c.p('depth', 8);
      const k = ran(c, 2.5), pouring = c.count('run') > 0;
      const level = depth * k;
      const R = 0.02, mouth = 0.011, m = 0.0027;
      const Ffull = RHO * G * (4 / 3) * Math.PI * R ** 3;
      const down = RHO * G * (level / 100) * Math.PI * mouth * mouth;
      const floatUp = pouring && capped && level > 1.5;
      const buoy = capped ? Ffull * clamp(level / 4, 0, 1) : 0;
      const text = !pouring ? (capped ? '瓶盖已拧上，乒乓球在瓶口。点击开始注水。' : '瓶口朝下、未拧瓶盖，乒乓球堵在瓶口。点击开始注水。')
        : capped ? (floatUp ? `拧上瓶盖后球下方也充满水，浮力约 ${fmt(buoy, 3)} N 大于重力 0.026 N，乒乓球上浮。` : '水正在灌满瓶口下部……')
        : `水从瓶口缝隙漏出，球下方没有水向上的压力，不受浮力；上方的水还把它压在瓶口（约 ${fmt(down, 3)} N），球不上浮。`;
      return shOut(c, text, { phase: floatUp ? '上浮' : '停在瓶口', progress: k, active: pouring, capped, level, floatUp, leaking: pouring && !capped }, [
        { label: '水深', value: `${fmt(level, 1)} cm` }, { label: '浮力', value: `${fmt(buoy, 3)} N` }, { label: '乒乓球重力', value: `${fmt(m * G, 3)} N` }], 'quantitative');
    }
    case 'sh-cartesian-diver': {
      const V0 = c.p('air', 5.4), dpSet = c.p('squeeze', 15);
      const squeezing = c.count('run') % 2 === 1;
      const dp = squeezing ? dpSet : 0;
      const Vair = V0 * P0 / (P0 + dp);
      const mg = 0.008 * G, Vg = 3.2;
      const Fb = RHO * G * (Vg + Vair) * 1e-6;
      const sink = Fb < mg;
      const crit = P0 * (V0 / (8 - Vg) - 1);
      const text = `${squeezing ? `挤压瓶子（增压 ${fmt(dp, 0)} kPa）` : '松开瓶子'}：浮沉子内空气 ${fmt(Vair, 2)} cm³，浮力 ${fmt(Fb, 3)} N ${sink ? '小于' : '大于'}重力 ${fmt(mg, 3)} N，浮沉子${sink ? '进水变重而下沉' : '上浮'}。`;
      return shOut(c, text, { phase: sink ? '下沉' : '上浮', progress: squeezing ? 1 : 0, active: squeezing, squeezing, sink, vair: Vair, fb: Fb, weight: mg, waterIn: clamp((8 - Vair) / 8, 0, 1) }, [
        { label: '空气体积', value: `${fmt(Vair, 2)} cm³` }, { label: '浮力/重力', value: `${fmt(Fb, 3)} / ${fmt(mg, 3)} N` }, { label: '下沉所需增压', value: `${fmt(crit, 1)} kPa` }], 'quantitative', ['小玻璃瓶质量与体积为示例值。']);
    }
    case 'sh-sailboat-model': {
      const single = Math.round(c.p('hull', 0)) === 1, hs = c.p('sail', 20) / 100, wind = c.p('wind', 3);
      const area = hs * 0.15, F = 0.5 * 1.2 * 1.2 * area * wind * wind;
      const m = single ? 0.08 : 0.15;
      const Iwl = 0.2 * 0.05 ** 3 / 12;
      const BG = 0.02 + hs * 0.25;
      const K = RHO * G * (single ? Iwl : 3 * Iwl + 2 * 0.2 * 0.05 * 0.15 ** 2) - m * G * BG;
      const M = F * (0.04 + hs / 2);
      const capsize = K <= 0 || M / K > 0.7;
      const heel = capsize ? 1.45 : Math.min(0.7, M / K);
      const k = ran(c, 6), sailing = c.count('run') > 0;
      const speed = capsize ? 0 : 0.12 * wind * Math.sqrt(area / 0.03);
      const dist = sailing ? Math.min(2, (capsize ? 0.1 : speed * 6) * k) : 0;
      const text = !sailing ? (single ? '单瓶小船已放入水中，帆装好后等待吹风。' : '三个瓶子并排做成的小帆船浮在水面上。点击开始吹风。')
        : capsize ? '单瓶船水线面太窄，帆和桅杆又抬高了重心，一吹风就翻倒。' : `小帆船稳定航行，倾角约 ${fmt(heel * 180 / Math.PI, 1)}°，已行驶 ${fmt(dist, 2)} m。`;
      return shOut(c, text, { phase: sailing ? (capsize ? '倾覆' : '航行') : '漂浮', progress: k, active: sailing, single, heel: sailing ? heel * k : 0, dist, capsize: sailing && capsize, sailH: hs, wind }, [
        { label: '风力（估算）', value: `${fmt(F, 2)} N` }, { label: '倾角', value: capsize ? '倾覆' : `${fmt(heel * 180 / Math.PI, 1)}°` }, { label: '航行距离', value: `${fmt(dist, 2)} m` }], 'qualitative', ['船重、重心高度和航速是示例估计，只比较趋势。']);
    }
    case 'sh-pry-book-lever': {
      const pencil = Math.round(c.p('tool', 0)) === 1, len = pencil ? 17 : 30;
      const l2 = c.p('l2', 4), Gb = c.p('book', 4);
      const l1 = Math.max(1, len - 1 - l2);
      const F2 = Gb / 2, F1 = F2 * l2 / l1;
      const k = ran(c, 1.2), pressing = c.count('run') > 0;
      const text = !pressing ? `${pencil ? '铅笔' : '直尺'}一端插在课本下，橡皮作支点。点击开始，按下另一端。`
        : `硬棒绕橡皮（支点 O）转动，把课本一边撬起。动力臂 ${fmt(l1, 1)} cm、阻力臂 ${fmt(l2, 1)} cm，只需约 ${fmt(F1, 2)} N。`;
      return shOut(c, text, { phase: pressing ? '撬起' : '准备', progress: k, active: pressing, angle: pressing ? k : 0, l1, l2, F1, F2, len }, [
        { label: '动力 F1', value: `${fmt(F1, 2)} N` }, { label: '阻力 F2', value: `${fmt(F2, 1)} N` }, { label: 'l1 : l2', value: `${fmt(l1, 1)} : ${fmt(l2, 1)}` }], 'quantitative');
    }
    case 'sh-sand-drop-potential-energy': {
      const h = c.p('height', 0.5), m = c.p('mass', 0.2), Fr = 120;
      const E = m * G * h, d = E / (Fr - m * G);
      const tf = Math.sqrt(2 * h / G);
      const dur = 0.6 + tf * 3;
      const k = c.count('run') > 0 ? (c.action.id === 'run' ? clamp(c.since('run') / dur, 0, 1) : 1) : 0;
      const fall = k * k;
      const landed = k >= 1;
      const text = c.count('run') <= 0 ? `${fmt(m, 2)} kg 重物举高 ${fmt(h, 2)} m，重力势能 ${fmt(E, 2)} J。点击开始释放。`
        : landed ? `重物陷入沙中约 ${fmt(d * 100, 1)} cm。质量越大、位置越高，陷得越深，重力势能越大。` : '重物下落中……';
      return shOut(c, text, { phase: landed ? '陷入沙中' : c.count('run') > 0 ? '下落' : '举高', progress: k, active: c.count('run') > 0, fall, landed, depth: d * 100, height: h, mass: m }, [
        { label: '重力势能', value: `${fmt(E, 2)} J` }, { label: '陷入深度', value: landed ? `${fmt(d * 100, 1)} cm` : '—' }], 'quantitative', ['沙的平均阻力 120 N 为示例值。']);
    }
    case 'sh-cable-stayed-bridge': {
      const H = c.p('tower', 100), a = c.p('anchor', 140), n = Math.round(c.p('hooks', 4)), L = 140, Tmax = 12;
      const loaded = c.count('run') > 0;
      const k = ran(c, 1);
      const W = loaded ? n * 0.05 * G : 0;
      const sin = H / Math.hypot(H, a);
      const T = (W / 2) * L / (a * sin);
      const broken = T > Tmax;
      const text = !loaded ? `主梁跨度 280 mm，桥塔高出桥面 ${fmt(H, 0)} mm。点击开始，把 ${n} 个钩码放在桥面中心。`
        : broken ? `拉索拉力约 ${fmt(T, 1)} N 超过上限 ${Tmax} N，桥面中部塌下。可加高桥塔或让拉索靠近跨中。`
        : `${n} 个钩码（${fmt(W, 2)} N）放在桥面中心，每根拉索拉力约 ${fmt(T, 1)} N，模型稳定。`;
      return shOut(c, text, { phase: broken ? '断裂' : loaded ? '承载' : '空载', progress: k, active: loaded, loaded, broken, tension: T, sag: broken ? k : clamp(T / Tmax, 0, 1) * 0.25 * k, hooks: n, tower: H, anchor: a }, [
        { label: '桥面荷载', value: `${fmt(W, 2)} N` }, { label: '拉索拉力', value: `${fmt(T, 2)} N` }, { label: '塔高/锚距', value: `${fmt(H, 0)} / ${fmt(a, 0)} mm` }], 'quantitative', ['拉索承载上限 12 N 为示例值。']);
    }
    default: return null;
  }
}

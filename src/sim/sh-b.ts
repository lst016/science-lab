import type { Observation, SimCtx } from './core';
import { clamp, fmt, smooth } from './core';
import { shOut } from './sh-common';

/** 动作 id 触发后经过的秒数；当前动作不是它时视为已过去很久（fallback 秒）。 */
const ranFor = (c: SimCtx, id = 'run', fallback = 30) => (c.count(id) === 0 ? 0 : c.action.id === id ? c.since(id) : fallback);

/** 余误差函数（Abramowitz–Stegun 7.1.26，误差 < 1.5e-7） */
export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
  return x >= 0 ? y : 2 - y;
}

export const ALPHA_COPPER = 1.11e-4;
export const ALPHA_WOOD = 1.0e-7;
/** 半无限长棒一端保持 ts 时，距端 x(m) 处 t(s) 后的温度 */
export function rodTemp(x: number, t: number, alpha: number, ts: number, t0 = 20): number {
  if (t <= 0) return t0;
  return t0 + (ts - t0) * erfc(x / (2 * Math.sqrt(alpha * t)));
}
/** 距端 x 处升到 tm 所需时间（s） */
function timeToReach(x: number, alpha: number, ts: number, tm: number, t0 = 20): number {
  const target = (tm - t0) / (ts - t0);
  let lo = 0, hi = 6;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (erfc(mid) > target) lo = mid; else hi = mid; }
  const z = (lo + hi) / 2;
  return (x / (2 * z)) ** 2 / alpha;
}

/** 水的沸点（℃）：Antoine 公式，p 单位 kPa，适用 1–100 ℃附近 */
export function boilingPointAt(pKPa: number): number {
  const mmHg = Math.max(1, pKPa * 7.50062);
  return 1730.63 / (8.07131 - Math.log10(mmHg)) - 233.426;
}

export const lensFocal = (volume: number) => 16 - 0.9 * volume;
export const SCREEN_CM = 15;

/** 上海版独有活动模型（组 B）；不属于本组的变体返回 null。 */
export function simulateShB(c: SimCtx): Observation | null {
  switch (c.exp.sceneVariant) {
    case 'sh-drum-membrane-foam': {
      const beads = c.p('beads', 1) >= 0.5;
      const force = c.p('force', 3);
      const hits = c.count('run');
      const t = ranFor(c);
      const amp = hits ? (force / 5) * Math.exp(-t / 1.6) : 0;
      const sounding = amp > 0.04;
      const phenomenon = !hits ? '橡皮膜已绷紧在杯口上，点“开始实验”用手指敲击橡皮膜。'
        : sounding ? (beads ? `听到“嘭嘭”声，同时泡沫颗粒被橡皮膜弹起${force >= 4 ? '，敲得越重颗粒跳得越高' : ''}：膜在振动。` : '听到“嘭嘭”声，但膜的振动幅度小、肉眼不易看清；放上泡沫颗粒可把振动显示出来。')
        : '膜停止振动，声音随之消失，颗粒落回膜面。';
      return shOut(c, phenomenon, { phase: !hits ? '准备' : sounding ? '发声' : '停止', progress: clamp(amp, 0, 1), active: sounding, amp: clamp(amp, 0, 1), beads, jump: beads ? amp : 0, hits }, [
        { label: '敲击力度', value: `${fmt(force, 0)} 档` },
        { label: '膜振幅（相对）', value: fmt(amp, 2) },
        { label: '颗粒', value: beads ? (sounding ? '弹跳' : '静止') : '未放' },
      ], 'qualitative');
    }
    case 'sh-simple-instrument': {
      const kind = Math.round(c.p('kind', 0));
      const lenCm = c.p('length', 10);
      const L = lenCm / 100;
      const F = c.p('tension', 5);
      const mu = 5e-4;
      const f = kind === 0 ? 343 / (4 * L) : (1 / (2 * L)) * Math.sqrt(F / mu);
      const played = c.count('run');
      const t = ranFor(c);
      const loud = !played ? 0 : kind === 0 ? (t < 2.5 ? 1 : Math.exp(-(t - 2.5) / 0.3)) : Math.exp(-t / 1.5);
      const sounding = loud > 0.05;
      const how = kind === 0 ? '吹吸管口，管内空气柱振动' : '拨动橡皮筋，弦振动';
      const rule = kind === 0 ? '空气柱越短，频率越高，音调越高' : '弦越短、拉得越紧，频率越高，音调越高';
      const phenomenon = !played ? `${how}发声。当前长度 ${fmt(lenCm, 0)} cm，估算频率约 ${fmt(f, 0)} Hz；点“开始实验”发声。`
        : sounding ? `${how}，发出约 ${fmt(f, 0)} Hz 的声音。${rule}。` : `声音停止。${rule}；改变长度${kind ? '或拉力' : ''}再试一次并记录频率。`;
      const readings = [
        { label: '频率', value: `${fmt(f, 0)} Hz` },
        { label: kind === 0 ? '空气柱长度' : '弦长', value: `${fmt(lenCm, 0)} cm` },
      ];
      if (kind === 1) readings.push({ label: '拉力', value: `${fmt(F, 0)} N` });
      return shOut(c, phenomenon, { phase: sounding ? '发声' : played ? '停止' : '准备', progress: clamp(loud, 0, 1), active: sounding, kind, frequency: f, loud: clamp(loud, 0, 1), length: lenCm }, readings, 'quantitative', kind === 1 ? ['橡皮筋线密度 μ = 0.5 g/m 是示例值。'] : ['未计管口修正，实测频率会略低。']);
    }
    case 'sh-water-lens-eye': {
      const V = c.p('volume', 6);
      const u = c.p('object', 40);
      const f = lensFocal(V);
      const v = u > f + 0.2 ? (u * f) / (u - f) : 200;
      const lit = c.count('run') > 0;
      const blur = clamp(Math.abs(v - SCREEN_CM) / SCREEN_CM, 0, 2);
      const sharp = blur < 0.08;
      const fix = v > SCREEN_CM ? '像成在光屏后方，应注水使水袋更凸、焦距变小' : '像成在光屏前方，应抽水使水袋变平、焦距变大';
      const phenomenon = !lit ? '发光物、水透镜、光屏已放在光具座上；点“开始实验”打开发光物。'
        : sharp ? `光屏上得到倒立、缩小的清晰实像。焦距约 ${fmt(f, 1)} cm，与眼睛看清 ${fmt(u, 0)} cm 处物体时晶状体的调节相当。`
        : `光屏上的像模糊：${fix}，模拟睫状肌调节晶状体。`;
      return shOut(c, phenomenon, { phase: !lit ? '准备' : sharp ? '清晰' : '模糊', progress: lit ? clamp(1 - blur, 0, 1) : 0, active: lit, lit, focal: f, imageDistance: clamp(v, 0, 200), blur, magnification: clamp(v / u, 0, 10), objectDistance: u, volume: V }, [
        { label: '焦距 f', value: `${fmt(f, 1)} cm` },
        { label: '像距 v', value: `${fmt(v, 1)} cm` },
        { label: '光屏距离', value: `${SCREEN_CM} cm` },
      ], 'quantitative', ['水量与焦距的对应为示例关系。']);
    }
    case 'sh-hand-temperature-sense': {
      const cold = c.p('cold', 10), warm = c.p('warm', 30), hot = c.p('hot', 45);
      const n = c.count('run');
      const inWarm = n % 2 === 1;
      const move = n === 0 ? 0 : c.action.id === 'run' ? smooth(c.since('run') / 1.2) : 1;
      const prog = inWarm ? move : 1 - move;
      const leftFeel = prog > 0.5 ? warm - hot : hot - 33;
      const rightFeel = prog > 0.5 ? warm - cold : cold - 33;
      const word = (d: number) => (d > 4 ? '热' : d > 1 ? '温热' : d < -4 ? '冷' : d < -1 ? '凉' : '差不多');
      const phenomenon = prog > 0.5
        ? `两手都在 ${fmt(warm, 0)} ℃ 的同一盆温水中：原在热水中的左手觉得${word(leftFeel)}，原在冷水中的右手觉得${word(rightFeel)}。凭感觉判断冷热并不可靠，需要用温度计测量。`
        : `左手浸在 ${fmt(hot, 0)} ℃ 热水中，右手浸在 ${fmt(cold, 0)} ℃ 冷水中，让手适应一会儿；点“开始实验”把两手一起放入温水。`;
      return shOut(c, phenomenon, { phase: prog > 0.5 ? '同入温水' : '分别浸泡', progress: prog, active: prog > 0.5, handsInWarm: prog, leftFeel, rightFeel, warm, cold, hot }, [
        { label: '温水实际温度', value: `${fmt(warm, 0)} ℃` },
        { label: '左手感觉', value: prog > 0.5 ? word(leftFeel) : '热' },
        { label: '右手感觉', value: prog > 0.5 ? word(rightFeel) : '冷' },
      ], 'qualitative');
    }
    case 'sh-syringe-low-pressure-boiling': {
      const Tw = c.p('water', 80);
      const pull = c.p('pull', 6);
      const V0 = 1, p0 = 101.3;
      const pulled = c.count('run') % 2 === 1;
      const move = c.count('run') === 0 ? 0 : c.action.id === 'run' ? smooth(c.since('run') / 1.2) : 1;
      const prog = pulled ? move : 1 - move;
      const dV = pull * prog;
      const p = (p0 * V0) / (V0 + dV);
      const Tb = boilingPointAt(p);
      const boiling = Tw >= Tb;
      const phenomenon = prog < 0.02 ? `注射器中吸入 ${fmt(Tw, 0)} ℃ 的水，注射口已堵住，水面上方约 1 个标准大气压，沸点约 100 ℃，水不沸腾。点“开始实验”向外拉活塞。`
        : boiling ? `向外拉活塞，水面上方压强降到约 ${fmt(p, 0)} kPa，沸点降到约 ${fmt(Tb, 0)} ℃，低于水温 ${fmt(Tw, 0)} ℃，水重新沸腾、产生大量气泡。`
        : `拉出活塞后压强约 ${fmt(p, 0)} kPa，沸点约 ${fmt(Tb, 0)} ℃，仍高于水温，水没有沸腾；再多拉一些或用更热的水。`;
      return shOut(c, phenomenon, { phase: boiling ? '沸腾' : prog > 0.02 ? '减压' : '准备', progress: prog, active: boiling, boiling, pressure: p, boilingPoint: Tb, temperature: Tw, pulled: dV, pullMax: pull }, [
        { label: '水面上方压强', value: `${fmt(p, 1)} kPa` },
        { label: '此压强下沸点', value: `${fmt(Tb, 1)} ℃` },
        { label: '水温', value: `${fmt(Tw, 0)} ℃` },
      ], 'quantitative', ['注射器内原有空气 1 mL 为示例值。']);
    }
    case 'sh-iodine-sublimation': {
      const lamp = Math.round(c.p('heater', 0)) === 1;
      const n = c.count('run');
      const heating = n % 2 === 1;
      const Tsrc = lamp ? 180 : 95, tau = lamp ? 6 : 8;
      const dt = n === 0 ? 0 : c.action.id === 'run' ? c.since('run') : 120;
      const heatT = heating ? dt : 120;
      const Thot = 20 + (Tsrc - 20) * (1 - Math.exp(-heatT / tau));
      const T = n === 0 ? 20 : heating ? Thot : 20 + (Thot - 20) * Math.exp(-dt / 20);
      const vaporMax = smooth((Thot - 30) / 40);
      const vapor = n === 0 ? 0 : heating ? smooth((T - 30) / 40) : vaporMax * Math.exp(-dt / 10);
      const deposit = n >= 2 && !heating ? vaporMax * (1 - Math.exp(-dt / 10)) : 0;
      const melted = heating && T > 113.7;
      const phenomenon = n === 0 ? `大试管底部有少量紫黑色固态碘，塞紧塞子。点“开始实验”${lamp ? '用酒精灯加热' : '把试管放入热水中微热'}。`
        : heating ? (vapor < 0.08 ? '开始受热，碘的温度在升高。' : melted ? `管内出现浓紫色碘蒸气；但酒精灯使碘温度超过熔点 113.7 ℃，管底出现液态碘，不能确定碘是升华还是先熔化后汽化——所以要用热水浴。` : `管内出现紫色碘蒸气，管底没有液态碘：碘从固态直接变为气态（升华）。`)
        : deposit > 0.05 ? '停止加热后紫色逐渐变淡，试管上部冷壁出现紫黑色碘晶体：气态碘直接变为固态（凝华）。' : '停止加热，碘蒸气开始变淡。';
      return shOut(c, phenomenon, { phase: n === 0 ? '准备' : heating ? (melted ? '熔化' : '升华') : '凝华', progress: clamp(vapor, 0, 1), active: heating, heating, temperature: T, vapor: clamp(vapor, 0, 1), deposit: clamp(deposit, 0, 1), melted, solidLeft: clamp(1 - 0.6 * Math.max(vapor, vaporMax * (n >= 2 ? 1 : 0)), 0.2, 1) }, [
        { label: '碘的温度（示例）', value: `${fmt(T, 0)} ℃` },
        { label: '碘熔点', value: '113.7 ℃' },
        { label: '管底液态碘', value: melted ? '有' : '无' },
      ], 'qualitative', ['升温快慢和酒精灯加热温度为示例值。']);
    }
    case 'sh-wood-copper-conduction': {
      const dist = c.p('distance', 10);
      const Ts = c.p('source', 200);
      const x = dist / 100, Tm = 50, speed = 5;
      const running = c.count('run') > 0;
      const tsim = running ? ranFor(c, 'run', 120) * speed : 0;
      const tCu = timeToReach(x, ALPHA_COPPER, Ts, Tm);
      const tWood = Math.min(1e7, timeToReach(x, ALPHA_WOOD, Ts, Tm));
      const TCu = rodTemp(x, tsim, ALPHA_COPPER, Ts), TWood = rodTemp(x, tsim, ALPHA_WOOD, Ts);
      const cuDrop = running && tsim >= tCu, woodDrop = running && tsim >= tWood;
      const phenomenon = !running ? `木棒和铜棒装在金属支架 O 处，距 O ${fmt(dist, 0)} cm 处各用凡士林粘一根牙签；点“开始实验”用酒精灯加热支架 A 端。`
        : cuDrop ? `加热约 ${fmt(tCu, 0)} s 后铜棒上的凡士林熔化、牙签落下，而木棒上的牙签仍牢牢粘着（此处木棒只有约 ${fmt(TWood, 0)} ℃）：铜的导热性比木材强。`
        : `正在加热，热量沿棒传递：铜棒牙签处约 ${fmt(TCu, 0)} ℃，木棒牙签处约 ${fmt(TWood, 0)} ℃。`;
      return shOut(c, phenomenon, { phase: !running ? '准备' : cuDrop ? '铜棒牙签落下' : '加热', progress: clamp(tsim / Math.max(1, tCu), 0, 1), active: running, heating: running, simTime: tsim, tCopper: tCu, tWood, copperTemp: TCu, woodTemp: TWood, copperDrop: cuDrop, woodDrop, distance: dist, source: Ts }, [
        { label: '加热时间（5 倍速）', value: `${fmt(tsim, 0)} s` },
        { label: '铜棒牙签处', value: `${fmt(TCu, 0)} ℃` },
        { label: '木棒牙签处', value: `${fmt(TWood, 0)} ℃` },
      ], 'quantitative', ['O 处温度和凡士林熔化温度 50 ℃ 为示例值；未计表面散热。']);
    }
    case 'sh-heat-island-surface-temperature': {
      const h = c.p('hour', 14);
      const sunny = Math.round(c.p('weather', 0)) === 0;
      const ac = Math.round(c.p('source', 0)) === 1;
      const S = (sunny ? 900 : 350) * Math.max(0, Math.sin((Math.PI * (h - 6)) / 12));
      const Ta = 31 + 3 * Math.sin((Math.PI * (h - 9)) / 12);
      const Tc = Ta + (0.7 * S) / 22 + (ac ? 3 : 0);
      const Tg = Ta + (0.77 * S) / 90;
      const measuring = c.count('run') > 0;
      const prog = measuring ? (c.action.id === 'run' ? smooth(c.since('run') / 2.5) : 1) : 0;
      const showC = Ta + (Tc - Ta) * prog, showG = Ta + (Tg - Ta) * prog;
      const phenomenon = !measuring ? `${fmt(h, 0)} 时，${sunny ? '晴天' : '多云'}。把温度传感器分别贴近草地和水泥地表面，点“开始实验”测量。`
        : prog < 0.98 ? '传感器示数正在变化，等示数稳定后读数。'
        : `水泥地表面约 ${fmt(Tc, 1)} ℃，草地表面约 ${fmt(Tg, 1)} ℃，相差约 ${fmt(Tc - Tg, 1)} ℃${ac ? '；旁边空调外机排出的废热使水泥地附近更热' : ''}。草地蒸腾散热、吸热升温少，水泥地吸收日照升温多，这是城市“热岛效应”的原因之一。`;
      return shOut(c, phenomenon, { phase: !measuring ? '准备' : prog < 0.98 ? '测量中' : '读数', progress: prog, active: measuring, sun: S / 900, hour: h, air: Ta, concrete: showC, grass: showG, concreteFinal: Tc, grassFinal: Tg, ac }, [
        { label: '草地表面 t₁', value: measuring ? `${fmt(showG, 1)} ℃` : '—' },
        { label: '水泥地表面 t₂', value: measuring ? `${fmt(showC, 1)} ℃` : '—' },
        { label: '气温（示例）', value: `${fmt(Ta, 1)} ℃` },
      ], 'qualitative', ['温度为示例模型估算，不是实测数据；以小组实测记录为准。']);
    }
    default: return null;
  }
}

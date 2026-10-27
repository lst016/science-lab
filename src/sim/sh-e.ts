import type { Observation, SimCtx } from './core';
import { clamp, fmt } from './core';
import { shOut } from './sh-common';

/** 溶解度表（g / 100 g 水）。NaCl 0–30 °C 取教材表 7.3，其余为常见溶解度表近似值。 */
const NACL: [number, number][] = [[0, 35.7], [10, 35.8], [20, 35.9], [30, 36.1], [40, 36.6], [50, 37], [60, 37.3], [70, 37.8], [80, 38.4], [90, 39], [100, 39.8]];
const KNO3: [number, number][] = [[0, 13.3], [10, 20.9], [20, 31.6], [30, 45.8], [40, 63.9], [50, 85.5], [60, 110], [70, 138], [80, 169], [90, 202], [100, 246]];
const solubility = (tab: [number, number][], t: number) => {
  const x = clamp(t, 0, 100);
  const i = Math.min(tab.length - 2, Math.floor(x / 10));
  const [x0, y0] = tab[i], [x1, y1] = tab[i + 1];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
};

const AMMONIA_EQ: Record<string, string> = {
  '0-0': '2NH₄Cl + Ca(OH)₂ → CaCl₂ + 2NH₃↑ + 2H₂O',
  '1-0': '(NH₄)₂SO₄ + Ca(OH)₂ → CaSO₄ + 2NH₃↑ + 2H₂O',
  '0-1': 'NH₄Cl + NaOH →(△) NaCl + NH₃↑ + H₂O',
  '1-1': '(NH₄)₂SO₄ + 2NaOH →(△) Na₂SO₄ + 2NH₃↑ + 2H₂O',
};

/** 铁生锈示例曲线：起点 21%，有水时明显下降，无水几乎不变（形状示意，非实测）。 */
const rustO2 = (wet: boolean, t: number, k: number) => 21 - (wet ? 5.5 * (1 - Math.exp((-k * t) / 180)) : 0.2 * (1 - Math.exp((-k * t) / 600)));

/** 上海版独有活动模型（组 E）；不属于本组的变体返回 null。 */
export function simulateShE(c: SimCtx): Observation | null {
  switch (c.exp.sceneVariant) {
    case 'sh-evaporate-on-copper-plate': {
      const T = c.p('plateTemp', 80), minutes = c.p('minutes', 4), placed = c.count('add') > 0;
      // 液滴视作 20 °C 饱和溶液（每 100 g 水）；蒸发速率为示例假设。
      const evap = placed ? clamp(((0.075 * (T - 10)) / 70) * minutes, 0, 0.95) : 0;
      const water = 1 - evap;
      const sN = solubility(NACL, T), sK = solubility(KNO3, T);
      const n0 = solubility(NACL, 20), k0 = solubility(KNO3, 20);
      const nOut = placed ? Math.max(0, n0 - sN * water) : 0;
      const kOut = placed ? Math.max(0, k0 - sK * water) : 0;
      const nacl = nOut > 0.05 ? (T > 40 ? 'NaCl 液滴边缘析出白色小晶体' : 'NaCl 液滴有少量晶体析出') : 'NaCl 液滴仍澄清';
      const kno3 = kOut > 0.05 ? 'KNO₃ 液滴也析出晶体（水几乎蒸干）' : `KNO₃ 液滴无晶体（${fmt(T, 0)} °C 时溶解度增大到约 ${fmt(sK, 0)} g）`;
      const text = placed ? `${nacl}；${kno3}。` : '烧杯中盛沸水，铜片放在杯口；点“加入”在铜片上分别滴 2 滴 NaCl、KNO₃ 饱和溶液。';
      return shOut(c, text, {
        phase: placed ? (evap > 0 ? '蒸发' : '滴加') : '准备', progress: evap, active: placed,
        placed, evap, water, naclCrystal: nOut / n0, kno3Crystal: kOut / k0, steam: clamp((T - 40) / 55, 0, 1), temperature: T,
      }, [
        { label: '铜片温度（示例）', value: `${fmt(T, 0)} °C` },
        { label: '已蒸发的水', value: `${fmt(evap * 100, 0)}%` },
        { label: 'S(NaCl) / S(KNO₃)', value: `${fmt(sN, 1)} g / ${fmt(sK, 0)} g` },
        { label: '析出 NaCl / KNO₃（每 100 g 水）', value: `${fmt(nOut, 1)} g / ${fmt(kOut, 1)} g` },
      ], 'qualitative', placed ? ['蒸发速率和铜片温度为示例假设，析出质量是按溶解度表的估算。'] : []);
    }
    case 'sh-water-effect-on-acid-base-salt': {
      const tube = Math.round(c.p('tube', 0)), wet = c.count('add') > 0, shaken = c.count('stir') > 0;
      const k = wet ? (shaken ? 1 : 0.6) : 0;
      const texts = [
        wet ? '沾上柠檬酸溶液的蓝色石蕊试纸变红；干燥试纸接触柠檬酸晶体时不变色。' : '干燥的蓝色石蕊试纸放在柠檬酸晶体中，不变色。',
        wet ? `加水后镁带表面${shaken ? '持续' : ''}产生气泡（H₂）；不加水时镁带与柠檬酸晶体无明显变化。` : '镁带与干燥的柠檬酸晶体接触，没有气泡。',
        wet ? `加水${shaken ? '振荡' : ''}后生成蓝色沉淀 Cu(OH)₂ 和白色沉淀 BaSO₄；干燥混合时无明显变化。` : '氢氧化钡固体与胆矾粉末干燥混合，无明显变化。',
      ];
      return shOut(c, texts[tube] ?? texts[0], {
        phase: wet ? (shaken ? '振荡后' : '加水后') : '干燥', progress: k, active: wet,
        wet, shaken, litmusRed: wet, mgBubbles: k, precipitate: k, tube,
      }, [
        { label: '水', value: wet ? '已加入' : '未加' },
        { label: '试纸 / 镁带 / 沉淀', value: wet ? '红 / 冒泡 / 蓝白沉淀' : '蓝 / 无气泡 / 无' },
      ], 'qualitative');
    }
    case 'sh-ammonium-fertilizer-base': {
      const salt = Math.round(c.p('salt', 0)), method = Math.round(c.p('method', 0)), base = Math.round(c.p('base', 0));
      const added = c.count('add') > 0, reacted = added && base === 0;
      const name = salt === 1 ? '硫酸铵' : '氯化铵';
      const litmusBlue = method === 1 && reacted;
      const text = !added
        ? (method === 0 ? `研钵中放入${name}；点“加入”${base === 0 ? '加入熟石灰并研磨' : '只研磨（对照：不加碱）'}。` : `试管中盛${name}溶液；点“加入”${base === 0 ? '滴加 NaOH 溶液并微热' : '只微热（对照：不加碱）'}。`)
        : reacted
          ? (method === 0 ? `${name}与熟石灰研磨后闻到刺激性氨味。` : '微热后湿润的红色石蕊试纸变蓝，说明放出氨气（碱性气体）。')
          : (method === 0 ? `${name}单独研磨，没有明显氨味。` : '不加碱只微热，试纸基本不变色。');
      return shOut(c, text, {
        phase: added ? (reacted ? '放出氨气' : '对照') : '准备', progress: reacted ? 1 : 0, active: added,
        added, reacted, ammonia: reacted ? 1 : 0, litmusBlue, heating: added && method === 1, method, salt,
      }, [
        { label: '氨味', value: reacted ? '有刺激性气味' : '无明显气味' },
        { label: '湿润红色石蕊试纸', value: method === 1 ? (litmusBlue ? '变蓝' : '红色') : '本步不用' },
        { label: '反应', value: reacted ? AMMONIA_EQ[`${salt}-${method}`] : '未发生' },
      ], 'qualitative');
    }
    case 'sh-bicarbonate-acid-endothermic': {
      const mass = c.p('mass', 2), acid = c.p('acid', 30), T0 = c.p('room', 20), ran = c.count('run') > 0;
      const nB = mass / 84.01, nA = (acid * 1.02 * 0.04) / 36.46, n = Math.min(nB, nA);
      const heatCap = acid * 1.02 * 4.0 + mass * 1.0;
      const dT = ran ? (n * 31.4e3) / heatCap : 0;
      // 每 2 s 一点，0–120 s；反应时间常数 6 s、回温 900 s 为示例假设。
      const curve = Array.from({ length: 61 }, (_, i) => T0 - dT * (1 - Math.exp(-(2 * i) / 6)) * Math.exp(-(2 * i) / 900));
      const tMin = Math.min(...curve);
      const limiting = nB < nA ? '碳酸氢钠' : '盐酸';
      const text = ran
        ? `加入盐酸后产生大量气泡，温度迅速下降约 ${fmt(T0 - tMin, 1)} °C，之后缓慢回升：该反应吸收热量。`
        : '锥形瓶中放好碳酸氢钠并插入温度传感器；点“开始实验”加入 4% 盐酸。';
      return shOut(c, text, {
        phase: ran ? '反应' : '准备', progress: ran ? 1 : 0, active: ran,
        ran, curve, T0, tMin, dT, temperature: ran ? tMin : T0, bubbles: ran ? 1 : 0,
      }, [
        { label: '起始温度', value: `${fmt(T0, 1)} °C` },
        { label: '最低温度（模型）', value: `${fmt(tMin, 1)} °C` },
        { label: '限量反应物', value: limiting },
        { label: 'CO₂ 物质的量', value: ran ? `${fmt(n * 1000, 1)} mmol` : '0' },
      ], 'quantitative', ran ? ['曲线由能量守恒估算；时间常数为示例假设，不是教材实测数据。'] : []);
    }
    case 'sh-alcohol-kerosene-burning': {
      const lit = c.count('ignite') % 2 === 1, fuel = Math.round(c.p('fuel', 0)), atomized = Math.round(c.p('supply', 0)) === 1;
      const soot = lit ? (atomized ? 0.12 : 0.9) : 0;
      const text = !lit
        ? '两只酒精灯分别装入等体积酒精和煤油（不超过容积的 2/3）；点“点燃”。'
        : fuel === 0
          ? '酒精燃烧火焰呈淡蓝色，基本无烟：燃烧较充分。'
          : atomized
            ? '煤油雾化后与空气充分混合，火焰发蓝、黑烟明显减少（拓展示意）。'
            : '煤油燃烧火焰明亮、呈黄色，冒出浓黑烟：含碳量高，燃烧不充分，生成炭黑。';
      return shOut(c, text, {
        phase: lit ? '燃烧' : '未点燃', progress: lit ? 1 : 0, active: lit,
        lit, flame: lit, fuel, atomized, soot,
      }, [
        { label: '关注燃料', value: fuel === 0 ? '酒精 C₂H₅OH' : '煤油（以 C₁₂H₂₆ 示例）' },
        { label: '含碳质量分数', value: fuel === 0 ? '52.1%' : '约 84.6%（示例）' },
        { label: '黑烟', value: !lit ? '—' : fuel === 0 ? '几乎没有' : atomized ? '少' : '浓' },
      ], 'qualitative');
    }
    case 'sh-iron-rust-oxygen-sensor': {
      const time = c.p('time', 300), focus = Math.round(c.p('paper', 0));
      const started = c.count('add') > 0, mixed = c.count('stir') > 0, k = mixed ? 1 : 0.6;
      const o2 = (wet: boolean, t: number) => (started ? rustO2(wet, t, k) : 21);
      const curveWet = Array.from({ length: 61 }, (_, i) => o2(true, i * 10));
      const curveDry = Array.from({ length: 61 }, (_, i) => o2(false, i * 10));
      const wet = o2(true, time), dry = o2(false, time);
      const text = !started
        ? '两个容器中分别放湿滤纸和干燥滤纸；点“加入”放入 5.0 g 铁粉和 0.1 g 炭粉，插入氧气传感器。'
        : focus === 0
          ? `容器①（有水）中氧气浓度降到 ${fmt(wet, 1)}%，铁粉表面出现红褐色锈迹${mixed ? '' : '（未摇匀时较慢）'}。`
          : `容器②（无水）中氧气浓度约 ${fmt(dry, 1)}%，几乎不变，铁粉没有明显锈迹。`;
      return shOut(c, text, {
        phase: started ? '采集' : '准备', progress: clamp(time / 600, 0, 1), active: started,
        started, mixed, time, o2Wet: wet, o2Dry: dry, rust: (21 - wet) / 5.5, curveWet, curveDry, focus,
      }, [
        { label: '采集时间', value: `${fmt(time, 0)} s` },
        { label: '① 有水 O₂（示例）', value: `${fmt(wet, 1)}%` },
        { label: '② 无水 O₂（示例）', value: `${fmt(dry, 1)}%` },
      ], 'qualitative', started ? ['氧气浓度曲线为示例形状，不是教材图 9.21 的数值。'] : []);
    }
    default: return null;
  }
}

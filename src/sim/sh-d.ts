import type { Observation, SimCtx } from './core';
import { clamp, fmt, smooth } from './core';
import { shOut } from './sh-common';

/** 某动作触发后的秒数；之后若按了只读动作（观察/记录/收集），按实验总时间继续推进，不回到起点。 */
const el = (c: SimCtx, id: string) => (c.count(id) === 0 ? 0 : c.action.id === id ? c.since(id) : c.time);

/** 上海版独有活动模型（组 D）；不属于本组的变体返回 null。 */
export function simulateShD(c: SimCtx): Observation | null {
  switch (c.exp.sceneVariant) {
    case 'sh-effervescent-tablet-gas': {
      const tablet = c.p('sample', 0) === 0, temp = c.p('temp', 20);
      const added = c.count('add') > 0 && tablet;
      // 示意时间尺度：20 ℃ 约 12 s，水温每升高 10 ℃ 速率约加倍（趋势示意）。
      const tau = 12 * Math.pow(2, (20 - temp) / 10);
      const t = el(c, 'add');
      const left = added ? Math.exp(-t / tau) : 1;
      const bubbles = added ? clamp(left * 1.2, 0, 1) : 0;
      const text = !tablet
        ? (c.count('add') > 0 ? '对照组：烧杯中只有水，没有产生气泡，玻璃片上也没有大量冷凝水。' : '对照组：烧杯中只有约 1/3 容积的水，按“加入试剂”也不投入泡腾片。')
        : !added ? '烧杯中盛约 1/3 容积的水，干燥玻璃片放在杯口上方。按“加入试剂”投入一小片泡腾片。'
        : left > 0.08 ? '泡腾片在水中迅速产生大量气泡并逐渐变小；杯口的干燥玻璃片上没有出现大量冷凝水。'
        : '泡腾片已基本溶解，气泡减少。气泡不是水蒸气（玻璃片上无大量冷凝水），而是新生成的气体——化学变化。';
      return shOut(c, text, { phase: added ? (left > 0.08 ? '产气' : '基本溶解') : '待加入', progress: 1 - left, active: added && left > 0.08, tabletLeft: left, tabletIn: added, bubbles, plateFog: 0.05, temperature: temp },
        [{ label: '烧杯中', value: tablet ? '泡腾片 + 水' : '只有水' }, { label: '气泡', value: bubbles > 0.5 ? '大量' : bubbles > 0.05 ? '减少' : '无' }, { label: '玻璃片', value: '无大量冷凝水' }], 'qualitative');
    }
    case 'sh-magnesium-cut-burn': {
      const step = c.p('step', 0), len = c.p('length', 3), done = c.count('add') > 0;
      const t = el(c, 'add');
      const burnTime = 1.2 * len; // 示意燃烧时长
      if (step === 0) {
        return shOut(c, done ? '镁带被剪成两段，仍是银白色、有金属光泽，只是形状改变，没有新物质生成——物理变化。' : '镁带已用砂纸打磨光亮，呈银白色、有金属光泽。按“加入 / 滴加”执行剪断。',
          { phase: done ? '已剪断' : '打磨后', progress: done ? 1 : 0, active: false, cut: done, pieces: done ? 2 : 1, burning: false, flame: false, burnt: 0, length: len },
          [{ label: '操作', value: '剪断' }, { label: '外观', value: '银白色、金属光泽' }, { label: '新物质', value: '无' }], 'qualitative');
      }
      const burnt = done ? clamp(t / burnTime, 0, 1) : 0, burning = done && burnt < 1;
      const text = !done ? '用坩埚钳夹住一小段镁带，靠近酒精灯外焰。按“加入 / 滴加”点燃（教师操作，佩戴护目镜）。'
        : burning ? '镁带剧烈燃烧，发出耀眼白光，放出热量，冒白烟；残留物落到陶土网上。不要长时间直视强光。'
        : '镁带燃尽，陶土网上留下白色粉末，与银白色镁带不同，是新物质——化学变化。';
      return shOut(c, text, { phase: !done ? '待点燃' : burning ? '燃烧' : '燃尽', progress: burnt, active: burning, cut: true, pieces: 1, burning, flame: burning, burnt, length: len },
        [{ label: '操作', value: '点燃' }, { label: '已燃烧', value: fmt(burnt * 100, 0) + '%' }, { label: '残留物', value: burnt > 0.05 ? '白色粉末' : '—' }], 'qualitative');
    }
    case 'sh-electronic-balance-weighing': {
      const stage = c.p('stage', 0), target = c.p('target', 5), paper = c.p('paper', 0.5), ran = c.count('run') > 0;
      const t = el(c, 'run');
      const floor1 = (x: number) => Math.floor(x * 10 + 1e-6) / 10;
      let display = 0, on = true, paperOn = stage >= 1 && stage <= 2, salt = 0, inBeaker = 0, text = '';
      if (stage === 0) {
        on = ran; display = 0;
        text = !ran ? '电子天平已水平放在桌面上，尚未开机。按“开始实验”打开电源。' : t < 1.5 ? '电子天平正在自检……' : '自检结束，显示“0.0”。';
      } else if (stage === 1) {
        display = ran ? 0 : floor1(paper);
        text = ran ? '按“去皮”键后，放着称量纸的天平示数归零为 0.0 g。' : '称量纸放在秤盘上，示数为称量纸的质量（示例值）。按“开始实验”去皮。';
      } else if (stage === 2) {
        // 先用药匙较快加到接近目标，再轻敲手腕少量补足，不超过目标。
        const u = ran ? t : 0;
        salt = u < 2.5 ? target * 0.92 * smooth(u / 2.5) : Math.min(target, target * 0.92 + target * 0.08 * clamp((u - 2.5) / 2, 0, 1));
        display = floor1(salt);
        text = !ran ? '已去皮，示数 0.0 g。按“开始实验”用药匙向称量纸中央添加研磨后的粗盐。'
          : display < target * 0.92 ? '用药匙添加粗盐，示数增大……' : display < target ? '接近目标，轻敲持药匙的手腕，让少量粗盐落下补足。' : '示数稳定为 ' + fmt(target, 1) + ' g，称量完成；药匙上剩余粗盐放入回收容器。';
      } else {
        const u = ran ? clamp(t / 2, 0, 1) : 0;
        salt = target * (1 - u); inBeaker = target * u; paperOn = !ran; on = !ran || t < 2.5;
        display = ran ? 0 : floor1(target);
        text = !ran ? '称量纸上有 ' + fmt(target, 1) + ' g 粗盐。按“开始实验”双手平握称量纸倒入烧杯。' : u < 1 ? '双手平握称量纸，把粗盐缓缓倒入烧杯，并轻弹称量纸。' : '粗盐已全部倒入烧杯，关闭电子天平电源。';
      }
      return shOut(c, text, { phase: ['开机', '去皮', '加样', '倒出'][stage] ?? '开机', progress: ran ? 1 : 0, active: ran, displayOn: on, display, paperOn, saltOnPaper: salt, saltInBeaker: inBeaker, target },
        [{ label: '示数', value: on ? fmt(display, 1) + ' g' : '关机' }, { label: '目标', value: fmt(target, 1) + ' g' }, { label: '称量纸（示例）', value: fmt(paper, 1) + ' g' }], 'quantitative',
        stage === 1 && !ran ? ['称量纸质量为示例值，不是实测。'] : []);
    }
    case 'sh-alcohol-lamp-flame': {
      const lit = c.count('ignite') % 2 === 1, zone = c.p('zone', 0), probe = c.p('probe', 1) === 1;
      const t = lit ? el(c, 'ignite') : 0;
      const k = probe && lit ? clamp((t - 0.5) / 1.2, 0, 1) : 0;
      const name = ['外焰', '内焰', '焰心'][zone] ?? '外焰', rank = ['最高', '较高', '最低'][zone] ?? '最高';
      const text = !lit ? (c.count('ignite') > 0 ? '已用灯帽盖灭酒精灯；盖灭后要再提起灯帽，然后重新盖好。' : '酒精灯盖着灯帽。按“点燃 / 熄灭”用电子点火枪点燃。')
        : t < 0.8 ? '酒精灯已点燃，等待火焰平稳。'
        : name + '：温度在三部分中' + rank + '。' + (probe ? (k > 0.5 ? '横插的火柴梗在外焰处最先炭化变黑，焰心处几乎不变——加热应使用外焰。' : '火柴梗横插入火焰中……') : '火焰分为外焰、内焰、焰心三部分。');
      return shOut(c, text, { phase: lit ? '燃烧' : '熄灭', progress: lit ? 1 : 0, active: lit, flame: lit, capOn: !lit, zone, relTemp: lit ? [3, 2, 1][zone] ?? 3 : 0, probe, charOuter: k, charInner: k * 0.45, charCore: k * 0.1 },
        [{ label: '观察部位', value: name }, { label: '相对温度', value: lit ? rank : '未点燃' }, { label: '火柴梗', value: !probe ? '未放入' : k > 0.5 ? '外焰处最黑' : lit ? '加热中' : '未变化' }], 'qualitative');
    }
    case 'sh-graphite-pencil-conductivity': {
      const intact = c.p('line', 0) === 0, soft = c.p('pencil', 0) === 0, w = c.p('width', 1);
      // 示例：两条线总长约 30 cm；6B 方块电阻取 0.3 kΩ，HB 取其 3 倍，仅表示趋势。
      const rs = soft ? 300 : 900, R = rs * 30 / w, U = 9, Uf = 2;
      const I = intact ? (U - Uf) / R : 0, bright = clamp(I / 0.002, 0, 1);
      const on = intact && I > 5e-5;
      const text = !intact ? '一条石墨线被橡皮擦断，回路断开，二极管不发光。'
        : on ? '电池两极接触两条石墨线，二极管' + (bright > 0.5 ? '明显发光' : '微弱发光') + '，说明石墨能导电。' + (soft ? '' : 'HB 铅笔线电阻更大，亮度较弱。')
        : '石墨线电阻太大，二极管几乎不亮。';
      return shOut(c, text, { phase: intact ? '回路连通' : '石墨线擦断', progress: on ? 1 : 0, active: on, closed: true, intact, current: I, power: I * U, bulbOn: on, brightness: on ? bright : 0, resistance: R, width: w },
        [{ label: '电流示意', value: fmt(I * 1000, 2) + ' mA' }, { label: '石墨线电阻（示例）', value: intact ? fmt(R / 1000, 1) + ' kΩ' : '断开' }, { label: '二极管', value: on ? '发光' : '不亮' }], 'qualitative',
        ['石墨线电阻与电流为示例数量级，不是实测。']);
    }
    case 'sh-composition-history-models': {
      const m = c.p('model', 0), real = c.p('view', 0) === 1, ran = c.count('run') > 0;
      const info = [
        ['道尔顿', '原子是坚实、不可再分的实心球；同种原子质量、性质相同。'],
        ['汤姆孙', '发现电子后提出：原子是均匀分布正电荷的球体，电子像葡萄干一样嵌在其中。'],
        ['卢瑟福', 'α 粒子散射实验后提出：原子中心有带正电的原子核，集中了几乎全部质量，电子在核外绕核运动。'],
        ['玻尔', '电子在核外一定的轨道（能层）上运动，不同轨道能量不同。'],
      ][m] ?? ['道尔顿', ''];
      const text = info[0] + '模型：' + info[1] + (real && m >= 2 ? ' 真实比例中原子核半径只有原子半径的约十万分之一，图中已放大原子核。' : '') + (ran ? '' : ' 按“开始实验”转动模型展示。');
      return shOut(c, text, { phase: info[0], progress: (m + 1) / 4, active: ran, model: m, rotating: ran, realScale: real, nucleusRatio: m >= 2 ? 1e5 : 0, electrons: m === 0 ? 0 : 6 },
        [{ label: '模型', value: info[0] }, { label: '历程', value: (m + 1) + ' / 4' }, { label: '核 : 原子半径', value: m >= 2 ? '约 1 : 10⁵' : '无原子核' }], 'qualitative');
    }
    case 'sh-copper-sulfate-naoh-mass': {
      const v1 = c.p('cuso4', 5), v2 = c.p('naoh', 5), ran = c.count('run') > 0;
      const pour = ran ? smooth(el(c, 'run') / 2.5) : 0;
      const m1 = v1 * 1.02, m2 = v2 * 1.11;
      const nCu = (m1 * 0.02) / 159.6, nOH = (m2 * 0.10) / 40.0;
      const xiMax = Math.min(nCu, nOH / 2), xi = xiMax * pour;
      const prec = xi * 97.56, total = 100 + m1 + m2;
      const cuLeft = nCu - xi;
      const excess = nCu > nOH / 2 + 1e-9 ? '硫酸铜过量' : nCu < nOH / 2 - 1e-9 ? '氢氧化钠过量' : '恰好完全反应';
      const text = !ran ? '两只烧杯（硫酸铜溶液、氢氧化钠溶液）一起放在电子天平上，记录反应前总质量。按“开始实验”把硫酸铜溶液倒入氢氧化钠溶液中。'
        : pour < 1 ? '倒入时立即生成蓝色絮状沉淀（氢氧化铜），天平示数保持不变。'
        : '反应结束：生成蓝色沉淀，' + excess + '；两只烧杯仍在天平上，总质量与反应前相同。';
      return shOut(c, text, { phase: !ran ? '反应前' : pour < 1 ? '混合' : '反应后', progress: pour, active: ran && pour < 1, pour, precipitate: clamp(prec / 0.12, 0, 1), blueness: clamp(cuLeft / Math.max(nCu, 1e-9), 0, 1), display: total, totalBefore: total, precipitateMass: prec },
        [{ label: '反应前总质量（示例）', value: fmt(total, 2) + ' g' }, { label: '当前总质量', value: fmt(total, 2) + ' g' }, { label: '质量变化', value: '0.00 g' }, { label: '生成 Cu(OH)₂（理论）', value: fmt(prec, 3) + ' g' }, { label: '过量试剂', value: excess }], 'quantitative',
        ['烧杯质量（共 100.0 g）为示例，天平示数不是实测记录。']);
    }
    case 'sh-co2-capture-model': {
      const method = c.p('method', 2), vg = c.p('gas', 200), vl = c.p('liquid', 100), ran = c.count('add') > 0;
      const cap = vl * (method === 0 ? 0.88 : method === 1 ? (0.00165 / 74.1) * 24000 : (1.11 * 0.10 / 40 / 2) * 24000);
      const passed = ran ? vg * clamp(el(c, 'add') / 4, 0, 1) : 0;
      const absorbed = Math.min(passed, cap), residual = passed - absorbed, sat = clamp(absorbed / cap, 0, 1);
      const caco3 = method === 1 ? (absorbed / 24000) * 100.09 : 0;
      const name = ['水', '石灰水', '10% NaOH 溶液'][method] ?? '10% NaOH 溶液';
      const text = !ran ? '注射器中有 ' + fmt(vg, 0) + ' mL CO₂，吸收瓶中有 ' + fmt(vl, 0) + ' mL ' + name + '。按“加入试剂”推动注射器，通入 CO₂。'
        : (method === 1 ? (absorbed > 0 ? '澄清石灰水变浑浊，生成碳酸钙沉淀，CO₂ 转化为固体储存。' : '')
          : method === 0 ? 'CO₂ 部分溶于水，' : 'NaOH 溶液吸收 CO₂ 生成碳酸钠，无明显现象，') +
          (residual > 0.5 ? '吸收液已' + (sat >= 1 ? '饱和' : '接近饱和') + '，出口气球收集到 ' + fmt(residual, 0) + ' mL 未被吸收的 CO₂。' : '出口气球几乎没有收集到气体，CO₂ 被吸收。');
      return shOut(c, text, { phase: !ran ? '待通入' : passed < vg ? '通入' : '结束', progress: passed / vg, active: ran && passed < vg, method, passed, absorbed, residual, saturation: sat, turbidity: method === 1 ? sat : 0, bubbles: ran && passed < vg ? 0.6 : 0, syringe: 1 - passed / vg },
        [{ label: '已通入', value: fmt(passed, 0) + ' mL' }, { label: '吸收（理想上限）', value: fmt(absorbed, 0) + ' mL' }, { label: '剩余气体', value: fmt(residual, 0) + ' mL' }, { label: '吸收液饱和度', value: fmt(sat * 100, 0) + '%' }, ...(method === 1 ? [{ label: '生成 CaCO₃（理论）', value: fmt(caco3, 3) + ' g' }] : [])], 'quantitative',
        ['按理想充分吸收的上限计算，真实装置吸收率更低。']);
    }
    default: return null;
  }
}

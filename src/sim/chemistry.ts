import type { SimCtx, Observation } from './core';
import { clamp, fmt } from './core';

type State = Observation['state'];
const opts = (c: SimCtx, key: string, fallback = '') => {
  const parameter = c.exp.parameters.find(p => p.key === key);
  return parameter?.options?.find(o => o.value === Math.round(c.p(key, parameter.default)))?.label ?? fallback;
};
const val = (c: SimCtx, key: string, fallback: number) => c.p(key, fallback);
const num = (label: string, value: number, unit = '') => ({ label, value: `${fmt(value)}${unit}` });
const hit = (c: SimCtx, ...ids: string[]) => ids.some(id => (c.action.counts[id] ?? 0) > 0);
const ignited = (c: SimCtx) => (c.action.counts.ignite ?? 0) % 2 === 1;
// 选择器、滑条是操作条件/目标量；观察、记录和收集不会代替加入或开始。
const started = (c: SimCtx) => hit(c, 'add', 'run');

/** 按变体记录简化条件；每项教材活动都须有审查记录，不能靠family登记充数。 */
export const CHEMISTRY_MODEL_LIMITS: Record<string, string> = Object.fromEntries([
  [['water-boiling-condensation', 'wax-water-bath'], '按给定温度作物态示意；不计算真实加热速率，石蜡采用55–70℃示例熔化区间。'],
  [['copper-hydroxide-precipitate', 'copper-hydroxide-heating', 'sodium-carbonate-limewater', 'copper-sulfate-precipitates'], '比较试剂和沉淀颜色；未给浓度和摩尔量，不计算沉淀质量、过量试剂或反应速率。'],
  [['marble-acid-open-tube', 'carbonate-powder-acid', 'carbonate-acid-limewater', 'co2-preparation-properties-practical'], '定性制气和检验；不计算产率，石灰水限量CO₂条件，未模拟长期通入过量CO₂后沉淀再溶解。'],
  [['oxygen-carbon-dioxide-splint', 'glowing-splint-oxygen'], '木条先点燃或形成火星再比较气体；不拟合实际燃烧速率。'],
  [['solid-reagent-transfer', 'glassware-cleaning', 'alloy-hardness-scratch', 'acid-appearance'], '规范操作与材料外观示意；合金刻划只示意划痕深浅关系，不提供真实仪器误差、硬度数值或气味测量。'],
  [['limewater-phenolphthalein', 'indicators-acid-base'], '指示剂颜色为典型稀溶液的定性示意；酚酞强碱性褪色和时间依赖未精确建模。'],
  [['candle-products-smoke', 'methane-products'], '区分水、二氧化碳和白烟；阶段和动作只表示观察流程，不计算产物量。甲烷装置一次只演示水或二氧化碳检验中的一种。'],
  [['phosphorus-air-volume'], '红磷足量、反应完全并冷却时才以进水体积分数近似氧含量；漏气不可定量。'],
  [['oxygen-sensor', 'air-quality-sensor-station', 'ph-paper-measurement', 'household-ph-measurement', 'soil-ph-plant-growth'], '读数是输入的示例或待测值，不是实时采集；植物生长和未知生活样品pH不可由类型精确预测。'],
  [['carbon-burning-oxygen', 'sulfur-burning', 'iron-sparks-oxygen', 'wood-coal-ignition', 'combustion-conditions-phosphorus'], '燃烧条件及主要现象示意；火星和热度不代表可操作的真实实验参数。白磷对比只用一个燃烧开关，木块与煤块一次演示一种。'],
  [['permanganate-water-collection', 'peroxide-catalyst', 'oxygen-preparation-practical'], '产气、催化和排空气定性示意；未计算温度阈值、氧气纯度和真实速率；过氧化氢无催化剂也可缓慢分解。'],
  [['dye-diffusion-water', 'ammonia-diffusion-phenolphthalein'], '扩散时间和粒子动画为示意；未罩住也可能发生少量扩散，不能推断真实扩散速率或pH。'],
  [['alum-flocculation-settling', 'gravity-filtration', 'water-distillation', 'water-quality-filter-design', 'charcoal-adsorption-dye', 'crude-salt-purification'], '分离过程与外观作定性示意；不保证去除全部污染物或达到饮用标准。'],
  [['hydrogen-combustion-water'], '只在确认纯净且选择燃烧并开始操作后显示水生成；不模拟气体爆炸和真实产率。'],
  [['water-electrolysis', 'water-composition-change-practical'], '已加适用电解质、低压直流条件下展示负极H₂与正极O₂约2:1；不将纯水说成绝对不导电。'],
  [['mass-conservation-experiment', 'mass-conservation-open-closed', 'magnesium-combustion-mass'], '明确称量边界，未给实际样品质量时只报告相等/增加/减少，不虚构天平数值。'],
  [['co2-apparatus-design', 'oxygen-supply-device-design'], '仅为装置设计，不直接产气；测试流程不证明可供人体呼吸。'],
  [['carbon-reduces-copper-oxide'], '高温条件下比较黑色CuO与红色铜及CO₂；不计算产率或副反应。'],
  [['co2-extinguishes-candles', 'soda-acid-co2-extinguisher'], '用动作阶段表现低处先熄与隔绝空气，不把阶段映射成真实气体流速。'],
  [['co2-bottle-pressure', 'co2-water-litmus'], 'CO₂溶解及酸性定性示意；纸花按教材吹风机吹干阶段恢复紫色，不计算精确压强、分解速率或pH。'],
  [['quicklime-water-exothermic', 'dissolution-temperature-change', 'sulfuric-acid-dilution', 'sodium-hydroxide-dissolution'], '只判断放热/吸热；温度动画若采用示例变化会明确标注，不作为实测热量。'],
  [['metals-oxygen-comparison', 'metals-acid-hydrogen', 'metal-displacement-copper-sulfate', 'iron-rust-conditions', 'metal-properties-practical'], '比较金属种类与实验条件；与氧气反应的加热时间为示意（镁剧烈燃烧、铜渐变黑、铝有氧化膜、铁丝在空气中仅氧化）；锈蚀的观察阶段不对应真实秒数，综合实验无金属选择时明确采用铁示例。'],
  [['sugar-dissolution-water', 'sodium-chloride-solubility', 'potassium-nitrate-solubility'], '明确采用20℃/给定温度、10g水的演示设定；参考溶解度插值，不代表教材器材实际用水量或动力学。'],
  [['calcium-hydroxide-solubility'], '固定0.5g氢氧化钙、20℃，水体积按1g/mL示例换算；只展示微溶与剩余固体。'],
  [['solubility-temperature-curve'], '以教材表格显示0–100℃参考曲线；非整十温度使用相邻表值线性插值，不替代实测数据。'],
  [['iodine-permanganate-solvent', 'water-ethanol-oil-mixing'], '颜色和互溶性为定性比较；水中碘仅微溶、非绝对不溶，油水搅拌后仍可重新分层。'],
  [['salinity-concentration-comparison', 'prepare-sodium-chloride-solution', 'prepare-saline-by-mass'], '配液采用质量守恒；比较活动未给总质量时以100g示例。20℃超过NaCl溶解限量时提示残留固体。'],
  [['acid-indicator-materials', 'acid-properties-comparison', 'acid-base-properties-practical'], '区分指示剂和普通纸/木/布；不凭材料名称假设天然指示剂，综合性质采用明确的教材试剂例子。'],
  [['neutralization-phenolphthalein'], '为演示设定0.01mol/L NaOH 5mL与0.01mol/L HCl，计入25℃水自电离；不是教材给出的实测浓度或终点。'],
  [['acid-solution-conductivity'], '只显示相对导电与灯亮；缺少电压和电极参数，不输出真实安培值。'],
  [['base-properties-comparison'], '比较指示剂和少量CO₂与碱的反应；未模拟CO₂过量时石灰水沉淀再溶解及碳酸氢盐生成。'],
  [['sulfuric-acid-dehydration'], '浓硫酸接触材料后的局部炭化为定性示意；不模拟真实腐蚀深度、热量或所需时间。'],
  [['copper-sulfate-concentration-comparison'], '等量20mL水中加入0.1/0.5/2g无水硫酸铜；颜色深浅为简化显示比例，不是吸光度或实测浓度。'],
  [['metal-activity-displacement'], '铝须除去表面氧化膜才便于观察；只比较三组置换、颜色及表面产物，不计算真实速率与产量。'],
].flatMap(([variants, note]) => (variants as string[]).map(variant => [variant, note as string])));

function res(c: SimCtx, phenomenon: string, state: State, readings: Observation['readings'] = [], fidelity: Observation['fidelity'] = 'qualitative', warnings: string[] = []): Observation {
  const active = state.active ?? (state.flame === true || state.heating === true || (typeof state.bubbles === 'number' && state.bubbles > 0));
  const limits = CHEMISTRY_MODEL_LIMITS[c.exp.sceneVariant];
  return { phenomenon, readings, fidelity, warnings, state: { phase: '观察', progress: started(c) || ignited(c) ? .65 : 0, active, modelLimits: limits ?? '未审查的变体', modelReviewed: !!limits, ...state } };
}

export function simulateChemistry(c: SimCtx): Observation {
  const v = c.exp.sceneVariant, begun = started(c), burning = ignited(c);
  const base: State = { liquidColor: 'clear', precipitateColor: 'none', gas: 'none', bubbles: 0, flame: false, dissolved: 0, undissolved: 0 };

  if (v === 'oxygen-preparation-practical') {
    const n = Math.round(val(c,'step',0)), step = opts(c,'step','安装装药'), test = opts(c,'test','木条复燃');
    const heating = begun && n >= 1 && n < 5;
    const collected = begun && n >= 2 && hit(c,'collect');
    const testing = collected && n === 3;
    const splint = testing && test.includes('木条'), carbon = testing && test.includes('木炭'), iron = testing && test.includes('铁丝');
    const limewaterTest = carbon && val(c,'productTest',0) === 1;
    const text = !begun ? '检查加热试管、棉花、导管和排水收集装置，点击加入装药。'
      : n === 0 ? '安装装药，试管口略向下倾斜，管口放少量棉花。'
      : n === 1 ? heating ? '加热高锰酸钾，先排尽装置内空气。' : '未加热，不持续产生氧气。'
      : n === 2 ? !heating ? '停止加热，不继续收集；需要重新加热后点击收集。' : collected ? '排水收集氧气后盖好玻璃片。' : '排尽空气后点击收集，用排水法收集氧气。'
      : n === 3 ? !collected ? '尚未收集氧气，不能进行性质检验。' : splint ? '带火星木条在氧气中复燃。' : iron ? '铁丝在氧气中火星四射，形成黑色四氧化三铁；瓶底预放少量水。' : limewaterTest ? '木炭燃烧生成二氧化碳，加入澄清石灰水后变浑浊。' : '红热木炭在氧气中发出明亮白光。'
      : n === 4 ? '先将导管移出水面，防止停止加热后水倒吸。' : '导管撤离后停止加热，已收集气体仍保留。';
    return res(c,text,{...base,step,test,phase:step,heating,gasReady:collected,gasVolume:collected?1:0,gas:heating||collected?'O₂':'none',bubbles:heating&&n<=2?.6:0,glowingSplint:splint,carbonBurning:carbon&&!limewaterTest,sparks:iron,blackSolid:iron,flame:splint||(carbon&&!limewaterTest),liquidColor:limewaterTest?'milky-white':'clear',limewaterTest,formula:iron?'3Fe + 2O₂ → Fe₃O₄':carbon?'C + O₂ → CO₂':'2KMnO₄ —加热→ K₂MnO₄ + MnO₂ + O₂↑'});
  }

  if (v === 'permanganate-water-collection') {
    const n=Math.round(val(c,'step',0)), step=opts(c,'step','安装装药'), heat=begun&&n>=1&&n<5, ready=begun&&n>=2;
    return res(c,!begun?'装入高锰酸钾并检查装置气密性，点击加入/开始。':n===0?'在试管口放棉花并连接排水收集装置。':n===1?'加热并先排出装置内空气。':n===2?'气泡连续均匀冒出后，用排水法收集氧气。':n===3?'用带火星木条检验已收集的氧气。':n===4?'先把导管撤出水槽，保持加热。':'撤出导管后停止加热；已收集氧气保留。',{...base,step,phase:step,heating:heat,bubbles:heat?.7:0,gas:heat?'O₂':'none',gasReady:ready,glowingSplint:ready&&n===3,gasVolume:ready?1:0,formula:'2KMnO₄ —加热→ K₂MnO₄ + MnO₂ + O₂↑'},[],'qualitative',['动作阶段是教学演示，不表示气体纯度的实测。']);
  }
  if (v === 'peroxide-catalyst') {
    const n=Math.round(val(c,'step',0)),step=opts(c,'step','加入过氧化氢'),amount=val(c,'amount',5),repeated=(c.action.counts.add??0)>=2,available=begun&&amount>0&&(n<4||repeated),catalyst=n>=2;
    const bubbles=available?(catalyst?.7:.12):0;
    return res(c,!begun||amount<=0?'先加入过氧化氢溶液；用量为零时不产生气体。':n<2?'未加二氧化锰的过氧化氢仍可缓慢分解。':n<4?'加入二氧化锰后分解加快，产生氧气；带火星木条可复燃。':!repeated?'反应停止后，再点击加入过氧化氢，观察催化剂继续起作用。':'再次加入过氧化氢后又有氧气产生，催化剂继续起作用。',{...base,step,phase:step,amount,catalyst,bubbles,gas:available?'O₂':'none',gasReady:available&&n>=1,glowingSplint:available&&(n===1||n===3||n===5),formula:'2H₂O₂ —MnO₂→ 2H₂O + O₂↑'},[],'qualitative',['气泡速度为定性示意；无催化剂时过氧化氢也能缓慢分解。']);
  }
  if (v === 'water-electrolysis' || v === 'water-composition-change-practical') {
    const n=Math.round(val(c,'step',0)),step=opts(c,'step','准备装置'), electrolyte=v==='water-composition-change-practical'?'少量电解质溶液':opts(c,'electrolyte','少量电解质溶液'),conductive=electrolyte.includes('电解质');
    const producing=begun&&conductive&&(n===1||n===2), collected=begun&&conductive&&n>=2, testing=collected&&n>=3;
    return res(c,!begun?'准备电解器和低压直流电源，点击加入/开始。':!conductive?'纯水导电性极弱，本示意不显示明显气泡。':n===0?'在电解器中加入适用的电解质溶液。':producing?'接通直流电，负极产生氢气、正极产生氧气，体积约2:1。':n===3?'切断电源，分别用燃着木条检验负极收集的氢气。':'切断电源，用带火星木条检验正极收集的氧气。',{...base,step,phase:step,active:producing,closed:producing,conductive,electrolyte,bubbles:producing?.7:0,gas:producing?'H₂ + O₂':collected?'H₂ / O₂（已收集）':'none',hydrogenVolume:collected?2:0,oxygenVolume:collected?1:0,cathodeGas:'H₂',anodeGas:'O₂',testHydrogen:testing&&n===3,testOxygen:testing&&n===4,formula:'2H₂O —通电→ 2H₂↑ + O₂↑'},[],'qualitative',['气体比例为理想示意；分开检验，不能点燃混合气体。']);
  }

  if (v === 'co2-preparation-properties-practical') {
    const test=opts(c,'test','石灰水'),produced=begun,collected=produced&&hit(c,'collect'),litmus=test.includes('石蕊'),lime=test.includes('石灰水'),candle=test.includes('蜡烛'),heated=collected&&litmus&&opts(c,'litmusHeat').includes('加热后');
    return res(c,!produced?'先加入稀盐酸，与石灰石反应产生二氧化碳。':!collected?'产气后先用向上排空气法收集，再选择性质检验。':litmus?heated?'停止通气并加热，碳酸分解，石蕊逐渐恢复紫色。':'通入CO₂后石蕊溶液变红，静置对照仍为紫色。':lime?'向石灰水通入CO₂，石灰水变浑浊。':candle?'向烧杯倾倒CO₂，蜡烛熄灭。':'CO₂能部分溶于水（教材选做）。',{...base,test,phase:!produced?'待加入':!collected?'收集前':litmus?heated?'加热后恢复紫色':'通CO₂后变红':'性质检验',gas:produced?'CO₂':'none',gasReady:collected,bubbles:produced&&!collected?.5:0,gasVolume:collected?1:0,litmusHeated:heated,litmusRestored:heated,carbonicAcidDecomposed:heated,gasFlowingToLitmus:collected&&litmus&&!heated,heating:heated,liquidColor:litmus?collected&&!heated?'red':'purple':lime&&collected?'milky-white':'clear',precipitateColor:lime&&collected?'white':'none',precipitate:lime&&collected?1:0,flame:candle&&!collected,formula:'CaCO₃ + 2HCl → CaCl₂ + CO₂↑ + H₂O'});
  }

  if (v === 'hydrogen-combustion-water') {
    const n=Math.round(val(c,'step',0)),step=opts(c,'step','连接装置'),pure=opts(c,'purity')==='已确认纯净'&&n>=2,lit=begun&&pure&&n>=3,water=lit&&n>=4;
    return res(c,!begun?'连接装置并排空气，点击加入以开始演示。':n===0?'检查发生装置和气体出口。':n===1?'先排出装置中的空气。':n===2?pure?'确认氢气纯净后才能点燃。':'尚未确认纯度，不能点燃氢气。':!pure?'未确认纯度，不显示点燃。':n===3?'纯净氢气燃烧。':'将干燥烧杯罩在火焰上方，观察内壁水珠。',{...base,step,phase:step,pure,flame:lit,waterDrops:water?1:0,gas:lit?'H₂O':'none',formula:'2H₂ + O₂ → 2H₂O'},[],'qualitative',['仅作虚拟或教师演示；氢气未验纯不得点燃。']);
  }
  if (v === 'mass-conservation-open-closed' || v === 'mass-conservation-experiment') {
    const step=opts(c,'step','反应前称量'),n=Math.round(val(c,'step',0)),boundary=opts(c,v==='mass-conservation-open-closed'?'container':'system'),closed=/封闭|密闭/.test(boundary),reacted=begun&&n>=1,after=begun&&n>=2;
    return res(c,!begun?'选择装置并称量反应前的总质量。':n===0?'记录反应前的称量范围。':n===1?closed?'使反应物接触，产生的气体保留在密闭装置内。':'使反应物接触，产生的二氧化碳逸出开放装置。':closed?'密闭装置反应前后总质量相等。':'开放装置中气体逸出，装置所称质量减少；把逸出气体计入后总质量仍守恒。',{...base,step,phase:step,closed,systemBoundary:boundary,massConserved:true,massChange:after&&!closed?'decrease':'unchanged',massTrend:after&&!closed?-1:0,gas:reacted?'CO₂':'none',bubbles:reacted?.4:0,formula:'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑'},[{label:'称量质量变化',value:!after?'尚未完成反应后称量':closed?'相等':'减少（CO₂逸出）'}]);
  }
  if (v === 'alum-flocculation-settling') {
    const n=Math.round(val(c,'step',0)),step=opts(c,'step','原水对照'),floc=begun&&n>=1&&opts(c,'treatment').includes('明矾'),settled=begun&&n>=3;
    return res(c,!begun||n===0?'观察两份等量浑浊原水。':n===1?floc?'向一份原水加入明矾，另一份作为对照。':'本组只静置，未加入明矾。':n===2?'用玻璃棒搅拌，准备静置比较。':floc?'静置后明矾促进悬浮物聚集沉降，上层液体变澄清。':'静置后较大颗粒沉降，细颗粒仍可能悬浮。',{...base,step,phase:step,floc,settling:settled?(floc?1:.3):0,liquidColor:settled&&floc?'pale-cloudy':'cloudy'});
  }
  if (v === 'charcoal-adsorption-dye') {
    const n=Math.round(val(c,'step',0)),step=opts(c,'step','观察红墨水'),carbon=val(c,'carbon',3),adsorption=begun&&n>=3?clamp(carbon/10,0,1):0;
    return res(c,!begun||n===0?'观察红墨水的原始颜色。':carbon<=0?'木炭用量为零，不显示吸附变化。':n===1?'向红墨水中加入木炭。':n===2?'轻轻振荡，使木炭接触色素。':'木炭吸附部分红墨水色素，静置比较后颜色变浅。',{...base,step,phase:step,carbon,adsorption,liquidColor:adsorption>.8?'clear':adsorption>0?'pink':'red'});
  }

  if (v === 'sodium-chloride-solubility' || v === 'potassium-nitrate-solubility') {
    const potassium=v==='potassium-nitrate-solubility', n=Math.round(val(c,'step',0)), step=opts(c,'step');
    const amount=potassium?[0,3,6,6,9,9][n]??0:[0,2,4,4][n]??0, water=!potassium&&n>=3?20:10, temperature=potassium&&n>=3&&n<5?60:20;
    const solubility=potassium?(temperature===60?110:31.6):36, capacity=solubility*water/100, dissolved=Math.min(amount,capacity), remaining=Math.max(0,amount-dissolved), crystals=potassium&&n===5?remaining:0, undissolved=crystals?0:remaining;
    return res(c,n===0?'准备10 mL水。':potassium&&n===5?'冷却后溶解度下降，硝酸钾晶体析出。':undissolved>.001?'在此演示温度与水量下有未溶固体。':!potassium&&n===3?'加入10 mL水并搅拌后，原有剩余食盐可继续溶解。':potassium&&n===3?'加热使硝酸钾溶解度增大，剩余固体溶解。':'加入固体后搅拌，观察是否完全溶解。', {...base,step,phase:step,amount,waterMass:water,waterVolume:water,temperature,solubility,dissolved,undissolved,crystals,heating:potassium&&n>=3&&n<5,saturated:amount>=capacity,liquidColor:'clear'},[num('水量',water,' mL'),num('已溶',dissolved,' g'),num(crystals?'析出晶体':'未溶固体',crystals||undissolved,' g')],'quantitative',['以教材用量和20℃、60℃溶解度表近似演示；水按1 g/mL计算，晶体质量为理想估算。']);
  }
  if (v === 'solubility-temperature-curve') {
    const material=opts(c,'solute','氯化钠'),temperature=clamp(val(c,'temperature',20),0,100), series:Record<string,number[]>={'氯化钠':[35.7,35.8,36,36.3,36.6,37,37.3,37.8,38.4,39,39.8],'氯化钾':[27.6,31,34,37,40,42.6,45.5,48.3,51.1,54,56.7],'氯化铵':[29.4,33.3,37.2,41.4,45.8,50.4,55.2,60.2,65.6,71.3,77.3],'硝酸钾':[13.3,20.9,31.6,45.8,63.9,85.5,110,138,169,202,246]};
    const values=series[material]??series['氯化钠'], pos=temperature/10, i=Math.min(9,Math.floor(pos)), solubility=values[i]+(values[i+1]-values[i])*(pos-i);
    return res(c,`${material}在${fmt(temperature)}℃的溶解度${temperature%10===0?'来自教材表9-1':'按相邻教材表值线性插值估读'}，约${fmt(solubility)} g/100 g水。`, {...base,material,temperature,solubility,curveTemperatures:[0,10,20,30,40,50,60,70,80,90,100],curveSolubilities:values,phase:'参考曲线'},[num('参考溶解度',solubility,' g/100 g水')],'qualitative');
  }
  if (v === 'ph-paper-measurement' || v === 'household-ph-measurement') {
    const n=Math.round(val(c,'step',0)), step=opts(c,'step','准备试纸'), sample=opts(c,'sample'), ph=val(c,'pH',7), known=v==='ph-paper-measurement', acidity=known?(ph<7?'酸性':ph>7?'碱性':'中性'):sample.includes('食醋')?'酸性':sample.includes('肥皂水')?'碱性':'待测', spotted=n>=2, read=n>=3;
    const detail=!spotted?'试纸尚未点样。':!read?'已用玻璃棒点样，准备与标准比色卡比较。':known?`比色示例pH约为${fmt(ph)}，呈${acidity}。`:acidity==='待测'?'样品的pH必须实际测量，不能凭名称虚构数值。':`${sample}通常呈${acidity}；具体pH需实际比色。`;
    return res(c,detail,{...base,step,sample,phase:step,acidity:spotted?acidity:'待测',...(known&&spotted?{pH:ph}:{}),paperWetted:spotted},known&&read?[num('示例pH',ph)]:[],'schematic');
  }

  if (v === 'prepare-saline-by-mass') {
    const step = opts(c, 'step', '计算');
    const n = Math.round(val(c, 'step', 0));
    const messages = ['计算：配制50 g、6%食盐水需氯化钠3 g和水47 g；再取25 g母液加25 g水，配成50 g、3%溶液。','称取3 g氯化钠。','量取47 mL水（示例按水密度1 g/mL）。','将氯化钠溶于水并搅拌，得到50 g、6%溶液。','取25 g、6%母液；按教材给定密度1.04 g/mL约量取24 mL。','加入25 g水并搅拌，得到50 g、3%溶液。','分别装瓶并标注6%和3%。'];
    return res(c, messages[n] ?? messages[0], {...base, step, phase: step, soluteMass:3, waterMass:47, solutionMass:50, concentration:n>=5?.03:.06, stockMass:25, addedWater:25, dilutedMass:50, dilutedConcentration:.03, dissolved:n>=3?3:0},[num('首次食盐',3,' g'),num('首次水',47,' g'),...(n>=4?[num('母液',25,' g'),num('稀释用水',25,' g'),num('稀释后质量分数',3,'%')]:[])],'quantitative',['采用教材固定示例；量筒读数有测量误差。']);
  }
  if (v === 'prepare-sodium-chloride-solution') {
    const step=opts(c,'step','计算'), n=Math.round(val(c,'step',0));
    return res(c, ['计算两组食盐溶液：10 g盐加90 g水为10%；20 g盐加80 g水为20%。','分别称取10 g和20 g氯化钠。','分别量取90 mL和80 mL水，示例按水密度1 g/mL。','将固体分别加入水中并搅拌溶解。','两杯食盐水都是无色透明的；根据配比计算质量分数，而不能凭颜色判断。'][n]??'比较两组配比。', {...base,step,phase:step,soluteMass1:10,waterMass1:90,concentration1:.1,soluteMass2:20,waterMass2:80,concentration2:.2},[num('第一杯',10,'%'),num('第二杯',20,'%')],'quantitative');
  }
  if (v === 'magnesium-combustion-mass') {
    const stage=opts(c,'stage','反应前称量'), boundary=opts(c,'system','只称镁条'), includeOxygen=boundary.includes('氧气'), index=Math.round(val(c,'stage',0));
    const burning=begun&&index===1, after=begun&&index===2;
    return res(c,!begun?'先称量镁条和陶土网，点击开始并选择阶段。':index===0?'记录反应前的镁条和陶土网质量。':burning?'镁条在陶土网上燃烧生成白色氧化镁，冷却后再称量。':includeOxygen?'计入参与的氧气，反应前后总质量守恒。':'只称收集的固体，因结合氧气，质量增加。', {...base,stage,phase:!begun?'待开始':stage,heating:burning,flame:burning,solidColor:after?'white':'gray',massTrend:after&&!includeOxygen?1:0,massChange:after&&!includeOxygen?'increase':'unchanged',massConserved:true,oxygenIncluded:includeOxygen,formula:'2Mg + O₂ → 2MgO'});
  }
  if (v === 'ammonia-diffusion-phenolphthalein') {
    const stage=opts(c,'stage','配制酚酞'), n=Math.round(val(c,'stage',0)), cover=opts(c,'cover','是')==='是';
    const control=begun&&n>=1, diffusion=begun&&cover&&n>=3 ? clamp(c.time/60,0,1) : 0;
    return res(c,!begun?'先配制酚酞溶液并点击开始。':n===0?'在蒸馏水中加入酚酞，溶液仍无色。':n===1?'取少量样液，滴加浓氨水作为对照，酚酞变红。':n===2?cover?'浓氨水杯与酚酞杯罩在大烧杯内，准备观察扩散。':'未罩大烧杯，氨容易逸散。':cover?'静置后氨扩散至酚酞溶液，溶液逐渐变红。':'未罩住时氨容易逸散，扩散效果较弱。', {...base,stage,phase:!begun?'待开始':stage,controlPink:control,covered:cover&&n>=2,diffusion,liquidColor:diffusion>0?'pink':'colorless',active:begun&&n>=2,particleCount:40,particleSpeed:begun&&n>=2?1:0},[],'schematic');
  }
  if (v === 'acid-base-properties-practical') {
    const topic=opts(c,'stage','指示剂'), process=opts(c,'process','准备'), n=Math.round(val(c,'process',0));
    const precip=topic.includes('沉淀'), neutral=topic.includes('中和'), rust=topic.includes('金属氧化物'), lime=topic.includes('氢氧化钙');
    const description = precip ? ['试管中先装硫酸铜溶液。','滴加氢氧化钠溶液，生成蓝色氢氧化铜沉淀。','向沉淀滴加稀盐酸，蓝色固体溶解。','观察沉淀溶解后的溶液。'][n] : neutral ? ['准备氢氧化钠溶液。','滴加酚酞，碱性溶液变红。','滴加稀盐酸至溶液恰好无色。','将无色液体转入蒸发皿，加热蒸发并观察固体。'][n] : rust ? ['准备生锈铁钉对照。','加入稀盐酸，铁锈逐渐溶解。','取出一支铁钉，另一支继续浸泡。','比较继续浸泡后的铁钉和溶液。'][n] : lime ? ['准备等量氢氧化钙。','分别加水和酚酞进行对照。','继续加酸，观察红色消失和固体溶解。','比较两组现象。'][n] : ['准备酸、碱和指示剂。','滴入指示剂，对照颜色。','比较酸和碱的显色。','记录指示剂的颜色变化。'][n];
    const hasPrecip=precip&&n===1;
    return res(c,description??'选择实验阶段。',{...base,stage:topic,process,phase:process,precipitate:hasPrecip?1:0,precipitateColor:hasPrecip?'blue':'none',liquidColor:precip?(hasPrecip?'blue-cloudy':'blue'):neutral&&n===1?'pink':rust&&n>0?'brown':'clear',neutralized:neutral&&n>=2,heating:neutral&&n===3,crystals:neutral&&n===3?1:0},[],'qualitative');
  }
  if (v === 'metal-properties-practical') {
    const test=opts(c,'test','物理性质'), heat=test.includes('加热'), acid=test.includes('酸'), displace=test.includes('置换');
    const text=!begun?'选择性质后点击加入或开始。':heat?'用坩埚钳夹取铜片在灯焰上加热，表面生成黑色氧化铜。':acid?'五支试管分别放镁、铝、锌、铁、铜，各加稀盐酸（或稀硫酸）：镁、铝、锌、铁产生氢气，铜不反应。':displace?'一种可行设计（三组）：铁放入硫酸铜溶液析出红色铜；铜放入硝酸银溶液析出银白色银、溶液渐变蓝；铜放入稀盐酸无气泡。据此得铁 > 铜 > 银。':'观察镁、铝、铁、铜的颜色光泽；相互刻画比较铜与铝、铜与黄铜的硬度；接入电池和小灯泡检验导电性。';
    return res(c,text,{...base,test,phase:!begun?'待操作':test,heating:begun&&heat,solidColor:begun&&heat?'black':'copper-red',active:begun,...(acid?{gas:begun?'H₂':'none',bubblesMg:begun?.9:0,bubblesAl:begun?.6:0,bubblesZn:begun?.5:0,bubblesFe:begun?.25:0,bubblesCu:0}:{}),...(displace&&begun?{ironInCopperSulfate:'铁表面析出红色铜，溶液由蓝变浅绿',copperInSilverNitrate:'铜表面析出银白色银，溶液渐变蓝',copperInAcid:'无明显现象',activityOrder:'铁 > 铜 > 银',formula:'Fe + CuSO₄ → FeSO₄ + Cu；Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag'}:{}),...(!heat&&!acid&&!displace?{conductive:begun,hardnessCompared:begun}:{})},[],'qualitative',displace?['三组设计是教材开放任务的一种参考方案，不是唯一方案。']:[]);
  }
  if (v === 'soda-acid-co2-extinguisher') {
    const stage=opts(c,'stage','准备'), n=Math.round(val(c,'stage',0)), active=begun;
    return res(c,!active?'先点燃三支蜡烛，选择操作阶段并点击加入。':n===0?'三支蜡烛处于燃烧状态。':n===1?'倒扣烧杯的一支蜡烛因氧气不足而逐渐熄灭。':n===2?'空烧杯对照中的蜡烛继续燃烧。':n===3?'碳酸钠溶液与稀盐酸反应生成二氧化碳，烧杯中的蜡烛熄灭。':'结合产气与灭火现象设计简易灭火器，装置和喷射过程为虚拟示意。', {...base,stage,phase:!active?'准备':stage,gas:active&&n>=3?'CO₂':'none',bubbles:active&&n>=3?.5:0,flame:active&&n<1,coverFlame:active&&n<1,controlFlame:active,co2Flame:active&&n<3,formula:'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑'});
  }

  if (v === 'sulfuric-acid-dehydration') {
    const material = opts(c, 'material', '纸'), charred = begun;
    return res(c, charred ? `浓硫酸接触${material}后，接触部位因脱水作用逐渐变黑炭化；不是指示剂显色。` : `尚未使${material}接触浓硫酸；点击加入后观察局部炭化示意。`, { ...base, material, charred, reacted: charred, active: charred, solidColor: charred ? 'black' : material.includes('木') ? 'brown' : 'white', phase: charred ? '接触部位炭化' : '未接触' }, [], 'qualitative', ['浓硫酸具有强腐蚀性，炭化仅作虚拟或教师演示。']);
  }
  if (v === 'copper-sulfate-concentration-comparison') {
    const selected = opts(c, 'copperMass', '0.1 g'), mass = Number.parseFloat(selected), colorIntensity = begun ? clamp(mass / 2, 0, 1) : 0;
    return res(c, !begun ? '各杯先装等量水；点击加入后观察硫酸铜溶解显蓝色。' : '等量20mL水中，无水硫酸铜用量为0.1g、0.5g或2g；溶液均为蓝色，用量越多颜色通常越深。颜色比例只作定性示意。', { ...base, copperMass: mass, soluteMass: begun ? mass : 0, waterVolume: 20, dissolved: begun ? mass : 0, colorIntensity, liquidColor: begun ? 'blue' : 'clear', solidColor: 'white', phase: begun ? '比较蓝色深浅' : '仅水' }, [num('计划硫酸铜用量', mass, ' g'), num('各杯水体积', 20, ' mL')], 'qualitative');
  }
  if (v === 'metal-activity-displacement') {
    const pair = opts(c, 'pair', '铝 / 硫酸铜'), aluminum = pair.startsWith('铝'), silverSalt = pair.includes('硝酸银'), reacted = begun && (aluminum || silverSalt);
    const initialBlue = pair.includes('硫酸铜'), liquidColor = !begun ? initialBlue ? 'blue' : 'clear' : reacted ? aluminum ? 'clear' : 'blue' : 'clear';
    const deposit = reacted ? aluminum ? 'copper-red' : 'silver' : 'none';
    const formula = aluminum ? '2Al + 3CuSO₄ → Al₂(SO₄)₃ + 3Cu' : silverSalt ? 'Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag' : 'Cu + Al₂(SO₄)₃：不反应';
    return res(c, !begun ? `${pair}尚未接触，未产生置换产物。` : aluminum ? '除去表面氧化膜的铝丝可置换出红色铜，硫酸铜溶液的蓝色逐渐变浅。' : silverSalt ? '铜丝表面析出银白色银，原无色硝酸银溶液逐渐变蓝。' : '铜不能置换硫酸铝中的铝，溶液保持无色，无明显置换现象。', { ...base, pair, reacted, active: reacted, liquidColor, solidColor: deposit !== 'none' ? deposit : aluminum ? 'gray' : 'copper-red', precipitateColor: deposit, precipitate: reacted ? 1 : 0, formula, phase: !begun ? '未加入金属' : reacted ? '置换反应' : '不反应' }, [], 'qualitative', aluminum ? ['假定铝丝表面已按教材要求去除氧化膜；颜色表示反应趋势，不保证反应完全。'] : []);
  }

  if (v === 'water-boiling-condensation' || v === 'wax-water-bath') {
    const temperature = val(c, 'temperature', 25), cold = opts(c, 'coldSurface').includes('靠近');
    if (v === 'wax-water-bath') {
      const melt = begun ? clamp((temperature - 55) / 15, 0, 1) : 0;
      return res(c, begun ? '石蜡为混合物，没有单一固定熔点；水浴温度升高时逐渐熔化。本动画采用55–70℃示例区间。' : '石蜡和水浴尚未开始接触演示；点击开始后比较温度与熔化程度。', { ...base, temperature, heating: begun, meltFraction: melt, solidColor: 'white', phase: !begun ? '待水浴' : melt === 0 ? '固态' : melt < 1 ? '熔化区间' : '液态' });
    }
    const boil = begun && temperature >= 100, vapor = begun ? clamp((temperature - 20) / 80, .03, 1) : 0, condensation = cold ? vapor : 0;
    return res(c, !begun ? '点击开始观察汽化与冷凝。' : boil ? '常压约100℃时水沸腾；水蒸气遇冷玻璃片可液化成水珠。' : '水在未沸腾时也会蒸发；水蒸气遇冷表面可凝结，不能把蒸发与沸腾等同。', { ...base, temperature, boiling: boil, bubbles: boil ? .6 : 0, heating: begun, vapor, condensation, waterDrops: condensation, phase: !begun ? '待开始' : boil ? '沸腾与冷凝' : '蒸发与冷凝' });
  }

  if (v === 'copper-hydroxide-precipitate' || v === 'copper-hydroxide-heating' || v === 'sodium-carbonate-limewater' || v === 'copper-sulfate-precipitates') {
    const amount = val(c, 'amount', 1), formed = begun && amount > 0, heated = formed && v === 'copper-hydroxide-heating' && opts(c, 'heating').includes('加热后');
    const reagent = opts(c, 'reagent', '氢氧化钠'), barium = v === 'copper-sulfate-precipitates' && reagent.includes('氯化钡'), carbonate = v === 'sodium-carbonate-limewater';
    const color = heated ? 'black' : barium || carbonate ? 'white' : 'blue';
    const initialBlue = v === 'copper-sulfate-precipitates';
    const formula = carbonate ? 'Na₂CO₃ + Ca(OH)₂ → CaCO₃↓ + 2NaOH' : barium ? 'CuSO₄ + BaCl₂ → BaSO₄↓ + CuCl₂' : heated ? 'Cu(OH)₂ —加热→ CuO + H₂O' : 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄';
    const phenomenon = !formed ? '两种试剂尚未混合，未生成沉淀；设置加入量后点击加入。' : heated ? '先生成蓝色氢氧化铜，再受热分解成黑色氧化铜。' : carbonate ? '碳酸钠与石灰水反应生成白色碳酸钙沉淀。' : barium ? '硫酸铜与氯化钡反应生成白色硫酸钡沉淀；含铜离子的上层溶液仍有颜色。' : '硫酸铜与氢氧化钠反应生成蓝色氢氧化铜沉淀。';
    return res(c, phenomenon, { ...base, amount, reagent, formula, precipitate: formed ? 1 : 0, precipitateColor: formed ? color : 'none', solidColor: formed ? color : 'none', liquidColor: !formed ? initialBlue ? 'blue' : 'clear' : barium ? 'blue' : heated ? 'clear' : carbonate ? 'milky-white' : 'blue-cloudy', heating: heated, phase: !formed ? '待加入' : heated ? '加热分解' : '生成沉淀' });
  }

  if (['marble-acid-open-tube', 'carbonate-powder-acid', 'carbonate-acid-limewater', 'co2-preparation-properties-practical', 'co2-apparatus-design', 'soda-acid-co2-extinguisher'].includes(v)) {
    const material = opts(c, 'material', v === 'carbonate-acid-limewater' || v === 'soda-acid-co2-extinguisher' ? '碳酸钠' : '大理石');
    const amount = val(c, 'amount', val(c, 'volume', val(c, 'acid', 1))), test = opts(c, 'test', v === 'carbonate-acid-limewater' ? '石灰水' : ''), collection = opts(c, 'collection', '向上排空气');
    const design = v === 'co2-apparatus-design', cover = v === 'soda-acid-co2-extinguisher' && !opts(c, 'extinguish').includes('CO₂');
    const gasOn = begun && amount > 0 && !design && !cover, lime = gasOn && test.includes('石灰水'), litmusTest = test.includes('石蕊'), litmusHeated = gasOn && litmusTest && opts(c, 'litmusHeat') === '加热后', candle = test.includes('蜡烛') || v === 'soda-acid-co2-extinguisher';
    const formula = material.includes('碳酸氢钠') ? 'NaHCO₃ + HCl → NaCl + H₂O + CO₂↑' : material.includes('碳酸钠') ? 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑' : 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑';
    const warns = design && collection.includes('排水') ? ['CO₂能溶于水并与水反应，通常选择向上排空气法，不宜用排水法大量收集。'] : [];
    const heated = opts(c, 'heating').includes('加热') && !opts(c, 'heating').includes('不加热');
    if (design && heated) warns.push('碳酸盐与稀盐酸在常温即可反应，制取CO₂通常不需加热。');
    const waterWay = collection.includes('排水'), schemeOk = !waterWay && !heated, trial = design && begun && hit(c, 'collect');
    const text = design ? !begun ? `装置设计：${collection}，${heated ? '选择了加热' : '常温不加热'}；点击“连接装置”检查气路。该页面不直接产气。` : `${schemeOk ? '方案合理：固液常温发生，向上排空气法收集CO₂（密度比空气大）。' : [waterWay ? 'CO₂能溶于水并与水反应，排水法收集量少且不纯。' : '', heated ? '石灰石与稀盐酸常温即可反应，不需要加热。' : ''].filter(Boolean).join('')}${trial ? '（示意收集：只检查气路，不产生真实气体。）' : ''}` : cover ? (begun ? '覆盖燃烧物隔绝空气，火焰逐渐熄灭；此对照不生成CO₂。' : '点击加入/开始覆盖对照，观察隔绝空气。') : !gasOn ? '尚未加入稀盐酸，或加入量为零；不产气。' : litmusTest ? litmusHeated ? '先通入CO₂使紫色石蕊变红，再停止通气并加热：碳酸分解、CO₂逸出，颜色逐渐恢复紫色；本选择表示加热后的状态。' : 'CO₂通入紫色石蕊溶液，与水生成碳酸，溶液变红。' : lime ? '生成CO₂并通入澄清石灰水，产生白色CaCO₃沉淀。' : candle ? '生成CO₂覆盖火焰，通常使蜡烛熄灭。' : test.includes('水中') ? 'CO₂部分溶于水并生成碳酸；溶解不等于发生液体中可见气泡反应。' : '碳酸盐与稀盐酸反应生成CO₂，试管中出现气泡。';
    return res(c, text, { ...base, material, amount, formula, collection, test, indicator: litmusTest ? '石蕊' : '', litmusHeated, litmusRestored: litmusHeated, carbonicAcidDecomposed: litmusHeated, gasFlowingToLitmus: gasOn && litmusTest && !litmusHeated, heating: litmusHeated, requestedHeating: heated, ...(design ? { collectionMethod: collection, waterDisplacement: waterWay, schemeCorrect: schemeOk, connected: begun, schematicFill: trial ? (waterWay ? .45 : 1) : 0, schematicOnly: true, wrongReasons: [waterWay ? '排水法收集CO₂不宜' : '', heated ? '常温反应不需加热' : ''].filter(Boolean).join('；') } : {}), gas: gasOn ? 'CO₂' : 'none', bubbles: gasOn ? .5 : 0, gasVolume: gasOn ? 1 : 0, liquidColor: litmusTest ? gasOn && !litmusHeated ? 'red' : 'purple' : lime ? 'milky-white' : 'clear', precipitateColor: lime ? 'white' : 'none', precipitate: lime ? 1 : 0, cloudiness: lime ? 1 : 0, limewater: lime ? 'milky' : 'clear', flame: candle && !begun, phase: design ? '装置设计' : !begun ? '待加入' : cover ? '覆盖灭火' : gasOn ? litmusTest ? litmusHeated ? '加热后恢复紫色' : '通CO₂后变红' : '产气与检验' : '加入量为零' }, [], design ? 'schematic' : 'qualitative', warns);
  }

  if (v === 'oxygen-carbon-dioxide-splint' || v === 'glowing-splint-oxygen') {
    const oxygen = opts(c, 'gas', '氧气').includes('氧气'), glowTest = v === 'glowing-splint-oxygen';
    const flame = burning && oxygen;
    return res(c, !burning ? '先点击点燃，使木条燃着或形成火星，再比较所选气体。' : oxygen ? glowTest ? '带火星木条在氧气中复燃。' : '燃着木条在氧气中燃烧更旺。' : glowTest ? '空气中没有纯氧中的明显复燃现象，木条仅保留暗火星示意。' : '燃着木条放入CO₂后熄灭。', { ...base, gas: opts(c, 'gas'), flame, flameColor: flame ? 'orange' : 'extinguished', glowingSplint: flame, glow: !burning ? 'none' : oxygen ? 'bright' : glowTest ? 'dim' : 'none', phase: !burning ? '待点燃' : oxygen ? '燃烧增强' : '气体对照' });
  }

  if (['permanganate-water-collection', 'peroxide-catalyst', 'oxygen-preparation-practical', 'oxygen-supply-device-design'].includes(v)) {
    if (v === 'oxygen-supply-device-design') {
      const phase = opts(c, 'design', '方案'), stage = Math.round(val(c, 'design', 0)), assembled = stage >= 1, tested = begun && stage >= 2;
      return res(c, stage === 0 ? '方案阶段：明确便携、安全、稳定的需求，选定反应仓、过滤加湿仓与模型气袋三部分；尚未连接。' : stage === 1 ? '装配阶段：按反应仓 → 导管 → 过滤加湿仓（长进短出）→ 出气口 → 模型气袋连接，检查进出方向。' : tested ? '测试阶段：用示意气流检查气路——依次通过加湿仓冒泡，进入模型气袋；只检查路径，不产生氧气，不可供人呼吸。' : '测试阶段：点击“检查气路”，观察示意气流经过各部分。', { ...base, phase, stage: phase, stageIndex: stage, assembled, connected: assembled, pathChecked: tested, modelBagFill: tested ? .7 : 0, modelOnly: true, safeForBreathing: false }, [], 'schematic', ['这是结构模型：不制取氧气，不连接人体，不可用于医疗。']);
    }
    const peroxide = v === 'peroxide-catalyst', amount = val(c, 'amount', 1), catalyst = !peroxide || opts(c, 'catalyst').includes('已加入');
    const heat = !peroxide && opts(c, 'heating').includes('加热'), produced = begun && amount > 0 && (peroxide || heat);
    const bubbles = produced ? peroxide && !catalyst ? .04 : .6 : 0;
    const collecting = !opts(c, 'collection', '收集气体').includes('排出空气'), collected = produced && collecting && hit(c, 'collect');
    const test = opts(c, 'test', '木条复燃');
    const formula = peroxide ? '2H₂O₂ —MnO₂催化/缓慢自行分解→ 2H₂O + O₂↑' : '2KMnO₄ —加热→ K₂MnO₄ + MnO₂ + O₂↑';
    return res(c, !begun || amount <= 0 ? '尚未加入反应物，或溶液量为零，不产气。' : !produced ? '停止加热时，高锰酸钾不持续产生氧气。' : peroxide ? catalyst ? '加入MnO₂后过氧化氢分解明显加快；催化剂改变速率，不改变产物。' : '未加MnO₂时过氧化氢仍可缓慢分解，气泡较少；不能说完全不反应。' : collected ? `已收集氧气，可作${test}检验。` : collecting ? '加热产生氧气；点击收集后再进行性质检验。' : '开始排出装置内的空气；此时不能把收集气体当作纯氧。', { ...base, amount, catalyst, heating: begun && heat, gas: produced ? 'O₂' : 'none', bubbles, collected, gasVolume: collected ? 1 : 0, gasReady: collected, collection: opts(c, 'collection', '收集气体'), formula, glowingSplint: collected && test.includes('木条'), flame: collected && test.includes('木炭'), sparks: collected && test.includes('铁丝'), phase: !begun ? '待加入' : !produced ? '停止产气' : !collecting ? '排空气' : collected ? '已收集' : '产气' }, [], 'qualitative');
  }

  if (v === 'phosphorus-air-volume') {
    const sealed=opts(c,'sealed').includes('气密'), cooled=opts(c,'cooled').includes('已冷却'), oxygen=val(c,'oxygen',21), attempted=hit(c,'ignite'), stage=opts(c,'stage','准备'), n=Math.round(val(c,'stage',0));
    const flame=burning&&(n===1||n===2), complete=attempted&&n>=3&&cooled, rise=sealed&&complete&&n>=4?oxygen/100:0;
    return res(c,!attempted?'选择瓶外点燃阶段，点击点燃。':n===1?'在瓶外点燃红磷。':n===2?'立即将燃烧匙伸入集气瓶并塞紧，红磷燃烧产生白烟。':n===3?!cooled?'等待装置冷却至室温。':'红磷燃烧结束，装置已冷却。':n>=4&&!sealed?'装置漏气，无法由进水量定量估算氧含量。':n>=4&&!cooled?'尚未冷却，不能据此准确估计氧气体积分数。':n>=4?'打开弹簧夹，水进入瓶内；红磷足量且装置气密时进水约占原空气体积五分之一。':'检查装置与气密性。', {...base,stage,oxygen,sealed,cooled,flame,smoke:flame?'white':'none',gas:attempted?'air-residual':'air',waterRise:rise,reactionComplete:complete,clipOpen:n>=4,phase:stage},rise?[num('进水占原空气体积',rise*100,'%')]:[],'qualitative',['冷却与反应完全是教学阶段设定；漏气时不能据此计算氧气体积分数。']);
  }

  if (v === 'candle-products-smoke') {
    const requested = opts(c, 'stage', '点燃前'), lit = burning && requested !== '刚熄灭', smoke = hit(c, 'ignite') && !lit, test = opts(c, 'test', '干燥烧杯'), lime = test.includes('石灰水');
    return res(c, lit ? lime ? '燃烧产物使石灰水变浑浊，检验CO₂。' : '干燥烧杯内壁出现水珠，检验水。' : smoke ? '刚熄灭时出现白烟，主要是石蜡蒸气冷凝形成的微小颗粒。' : '尚未点燃蜡烛，没有燃烧产物。', { ...base, flame: lit, smoke: smoke ? 'white-vapor' : 'none', waterDrops: lit && !lime ? 1 : 0, liquidColor: lit && lime ? 'milky-white' : 'clear', precipitateColor: lit && lime ? 'white' : 'none', detectedProduct: lit ? lime ? 'CO₂' : 'H₂O' : 'none', test, gas: lit ? 'CO₂ + H₂O' : 'none', phase: lit ? '燃烧中' : smoke ? '刚熄灭' : '点燃前', requestedStage: requested });
  }

  if (v === 'combustion-conditions-phosphorus') {
    const hot = opts(c, 'temperature').includes('是');
    const oxygen = opts(c, 'oxygen').includes('有');
    const copperWhiteBurning = burning && hot;
    const underwaterWhiteBurning = copperWhiteBurning && oxygen;
    const text = !burning ? '开始演示，比较铜片上的白磷、红磷与水中白磷。'
      : !hot ? '水温未达到白磷着火点，三份样品均不燃烧；通入氧气也不能代替温度条件。'
      : oxygen ? '铜片上的白磷接触空气而燃烧；向热水中的白磷通氧后，它也能燃烧。此温度下红磷不燃烧。'
      : '铜片上的白磷接触空气而燃烧；热水中的白磷未接触氧气，不燃烧。此温度下红磷不燃烧。';
    return res(c, text, { ...base, phase: !burning ? '待演示' : !hot ? '未达着火点' : oxygen ? '向水中通氧' : '热水与空气对照', flame: copperWhiteBurning, copperWhiteBurning, underwaterWhiteBurning, redPhosphorusBurning: false, oxygen, hot, gas: 'none', flameColor: 'orange', formula: '燃烧需要可燃物、达到着火点并接触氧气' });
  }

  if (['sulfur-burning', 'iron-sparks-oxygen', 'carbon-burning-oxygen', 'hydrogen-combustion-water', 'methane-products', 'wood-coal-ignition'].includes(v)) {
    const gas = opts(c, 'gas', '空气'), oxygenGas = gas.includes('氧气'), hydrogen = v === 'hydrogen-combustion-water', pure = opts(c, 'purity').includes('已确认纯净');
    const wood = v === 'wood-coal-ignition', phosphorus = v === 'combustion-conditions-phosphorus', iron = v === 'iron-sparks-oxygen';
    const oxygen = wood || phosphorus ? opts(c, 'oxygen').includes('有') : hydrogen ? true : gas.includes('空气') || oxygenGas;
    const hot = !phosphorus || opts(c, 'temperature').includes('是');
    const lit = hydrogen ? begun && pure && gas.includes('燃烧') : burning && oxygen && hot && (!iron || oxygenGas);
    const productExists = hydrogen ? lit : hit(c, 'ignite') && oxygen && hot && (!iron || oxygenGas);
    const color = hydrogen || v === 'methane-products' ? 'pale-blue' : v === 'sulfur-burning' ? oxygenGas ? 'blue-violet' : 'pale-blue' : 'orange';
    const formula = hydrogen ? '2H₂ + O₂ → 2H₂O' : v === 'methane-products' ? 'CH₄ + 2O₂ → CO₂ + 2H₂O' : iron ? '3Fe + 2O₂ → Fe₃O₄' : v === 'sulfur-burning' ? 'S + O₂ → SO₂' : v === 'carbon-burning-oxygen' ? 'C + O₂ → CO₂' : '燃烧条件示意';
    const gasProduct = hydrogen ? 'H₂O' : v === 'sulfur-burning' ? 'SO₂' : v === 'methane-products' ? 'CO₂ + H₂O' : v === 'carbon-burning-oxygen' ? 'CO₂' : 'none';
    let text = !lit ? '当前未点燃或不满足燃烧条件。' : hydrogen ? '确认纯净的氢气燃烧，干燥烧杯内壁出现水珠。' : iron ? '细铁丝在氧气中剧烈燃烧、火星四射，生成黑色Fe₃O₄。' : v === 'sulfur-burning' ? `硫在${oxygenGas ? '氧气' : '空气'}中燃烧，火焰呈${oxygenGas ? '蓝紫色' : '淡蓝色'}。` : v === 'carbon-burning-oxygen' ? `木炭在${oxygenGas ? '氧气中燃烧更旺，发白光' : '空气中红热燃烧'}；充分燃烧生成CO₂。` : v === 'methane-products' ? opts(c, 'stage').includes('二氧化碳') ? '甲烷燃烧产物使石灰水变浑浊，检验CO₂。' : '甲烷燃烧产物在干燥烧杯内壁凝结成水珠。' : phosphorus ? '白磷在达到着火点并接触氧气时燃烧；此温度条件下红磷未必达到着火点。' : `${opts(c, 'material', '木块')}达到着火点并得到氧气供应时可燃烧。`;
    if (hydrogen && !pure) text = '未检验纯度，不得点燃氢气；先确认纯净，再选择燃烧并点击加入/开始演示。';
    if (iron && !oxygenGas && burning) text = '在本实验的空气条件下铁丝不出现氧气中的剧烈燃烧和火星四射；不能把空气等同纯氧。';
    const methaneLime = v === 'methane-products' && opts(c, 'stage').includes('二氧化碳');
    const warnings = iron && !opts(c, 'protection').includes('少量水') ? ['集气瓶底预放少量水或细沙，防止高温生成物炸裂瓶底。'] : [];
    return res(c, text, { ...base, phase: lit ? '燃烧' : productExists ? '已熄灭/保留产物' : '待点燃', flame: lit, flameColor: color, gas: lit ? gasProduct : 'none', formula, oxygen, pure, purity: opts(c, 'purity'), sparks: lit && iron, solidColor: productExists && iron ? 'black' : iron ? 'gray' : 'none', blackSolid: productExists && iron, waterDrops: lit && (hydrogen || v === 'methane-products' && !methaneLime) ? 1 : 0, liquidColor: lit && methaneLime ? 'milky-white' : 'clear', precipitateColor: lit && methaneLime ? 'white' : 'none', protection: opts(c, 'protection'), material: opts(c, 'material'), glowingCarbon: lit && v === 'carbon-burning-oxygen' }, [], 'qualitative', warnings);
  }

  if (v === 'water-electrolysis' || v === 'water-composition-change-practical') {
    const combined = v === 'water-composition-change-practical', analyzing = combined && opts(c, 'stage').includes('分析');
    const on = combined || opts(c, 'power').includes('接通'), electrolyte = combined ? '已加适用电解质示例' : opts(c, 'electrolyte', '水'), conductive = combined || electrolyte.includes('电解质'), producing = begun && on && conductive && !analyzing;
    const collected = begun && (producing || analyzing), relative = collected ? 1 : 0;
    return res(c, !begun ? '点击加入/开始电解演示；选择电源与适用导电介质后观察。' : !on ? '电源断开，不持续产生电解气体。' : !conductive ? '纯水导电性极弱，本演示不显示明显气泡；并非绝对不导电。' : analyzing ? '检验收集气体：负极H₂可燃，正极O₂使带火星木条复燃；水由氢、氧元素组成。' : '通直流电后负极产生H₂、正极产生O₂，相同条件下体积约2:1。', { ...base, active: producing, closed: begun && on && conductive, gas: producing ? 'H₂ + O₂' : analyzing && begun ? 'H₂ / O₂（已收集）' : 'none', bubbles: producing ? .7 : 0, hydrogenVolume: relative * 2, oxygenVolume: relative, electrolyte, conductive, cathodeGas: 'H₂', anodeGas: 'O₂', phase: !begun ? '待开始' : producing ? '电解产气' : analyzing ? '产物分析' : '停止产气', formula: '2H₂O —通电→ 2H₂↑ + O₂↑' }, [], 'qualitative');
  }

  if (v === 'dye-diffusion-water' || v === 'ammonia-diffusion-phenolphthalein') {
    const ammonia = v.includes('ammonia'), cover = opts(c, 'cover', '是') === '是', stirred = opts(c, 'stir') === '搅拌' || hit(c, 'stir');
    const diffusion = begun ? clamp(c.time / 60 * (stirred ? 2 : 1), 0, 1) : 0, changed = ammonia && cover && diffusion > 0;
    return res(c, !begun ? '点击开始，把扩散物质与观察液置于实验条件中。' : ammonia ? cover ? '氨扩散并溶于酚酞溶液，形成碱性环境使酚酞变红。' : '未罩住时氨易逸散，颜色变化不明显；不能据此说分子停止运动或绝无扩散。' : '品红逐渐扩散；搅拌还引入宏观混合，不能把全部混合速度解释成分子扩散。', { ...base, active: begun, liquidColor: ammonia ? changed ? 'pink' : 'colorless' : diffusion > 0 ? 'pink' : 'clear', diffusion, covered: cover, stirred, particleCount: 40, particleSpeed: begun ? 1 : 0, phase: !begun ? '待开始' : '扩散示意' }, [], 'schematic');
  }

  if (['mass-conservation-experiment', 'mass-conservation-open-closed', 'magnesium-combustion-mass'].includes(v)) {
    const magnesium = v === 'magnesium-combustion-mass', boundary = opts(c, v === 'mass-conservation-open-closed' ? 'container' : 'system'), closed = /封闭|密闭/.test(boundary), includeOxygen = magnesium && boundary.includes('氧气');
    return res(c, !begun ? '先记录称量范围和反应前状态，再点击开始进行反应比较。' : magnesium ? includeOxygen ? '把镁和参与反应的氧气全部计入，反应前后总质量守恒。' : '只称固体时，镁结合空气中的氧生成MgO，完整收集的固体质量增加；氧并非凭空出现。' : closed ? '碳酸钠与盐酸反应，气体保留在封闭系统内，总质量守恒。' : 'CO₂逸出称量范围，装置所称质量减少；把逸出气体计入时总质量仍守恒。', { ...base, closed: closed || includeOxygen, systemBoundary: boundary, oxygenIncluded: includeOxygen, massConserved: true, massChange: !begun ? 'unchanged' : magnesium ? includeOxygen ? 'unchanged' : 'increase' : closed ? 'unchanged' : 'decrease', massTrend: !begun ? 0 : magnesium ? includeOxygen ? 0 : 1 : closed ? 0 : -1, gas: begun && !magnesium ? 'CO₂' : 'none', bubbles: begun && !magnesium ? .4 : 0, formula: magnesium ? '2Mg + O₂ → 2MgO' : 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑', phase: begun ? '反应后称量比较' : '反应前' }, [{ label: '称量质量变化', value: !begun ? '尚未反应' : magnesium ? includeOxygen ? '相等' : '增加（计入结合的氧）' : closed ? '相等' : '减少（CO₂逸出）' }]);
  }

  if (v === 'co2-extinguishes-candles') {
    const co2 = opts(c, 'pour').includes('二氧化碳'), poured = begun && co2, later = hit(c, 'collect'), lower = !poured, upper = !poured || !later;
    return res(c, !begun ? '两支蜡烛已点燃，点击加入演示倾倒气体。' : !co2 ? '倒入空气，蜡烛仍燃烧。' : later ? '继续收集/倾倒CO₂后，两支蜡烛均熄灭。' : 'CO₂沿杯壁下沉，低处蜡烛先熄灭；继续收集/倾倒后高处也熄灭。', { ...base, gas: poured ? 'CO₂' : 'air', flame: lower || upper, lowerCandle: lower, upperCandle: upper, gasLayer: !poured ? 0 : later ? 1 : .45, phase: !poured ? '燃烧对照' : later ? '全部熄灭' : '低处先熄灭' });
  }
  if (v === 'co2-bottle-pressure') {
    const water = val(c, 'water', 30), deformation = begun && water > 0 && hit(c, 'collect', 'stir') ? clamp(water / 100, 0, 1) : 0;
    return res(c, !begun || water <= 0 ? '尚未加水或水量为零，瓶体不发生本实验的溶解形变。' : !deformation ? '已加水，点击收集/振荡演示密闭振荡后的变化。' : '密闭振荡使部分CO₂溶于水，瓶内压强降低，软瓶向内凹陷。', { ...base, gas: 'CO₂', water, waterVolume: begun ? water : 0, pressureDrop: deformation, bottleDeformation: deformation });
  }
  if (v === 'carbon-reduces-copper-oxide') {
    const stage=opts(c,'stage','混合装置'), n=Math.round(val(c,'stage',0)), heatEnabled=opts(c,'heating')==='加热', reacted=begun&&(n>=3||heatEnabled&&n>=1), heating=begun&&heatEnabled&&n>=1&&n<=2;
    return res(c,!begun?'先混合碳粉与氧化铜，连接导管后点击加入。':!heatEnabled&&n<3?'未开启加热，不显示还原产物。':n===0?'混合木炭粉与氧化铜并连接石灰水装置。':n===1?'高温下碳还原黑色氧化铜，生成红色铜和二氧化碳；石灰水变浑浊。':n===2?'先从石灰水中撤出导管，再停止加热，防止液体倒吸。':n===3?'停止加热并冷却，已生成的铜和石灰水浑浊仍保留。':'冷却后倒出固体，观察红色铜。', {...base,stage,heating,reacted,solidColor:reacted?'copper-red':'black',precipitateColor:reacted?'copper-red':'none',gas:heating?'CO₂':'none',bubbles:heating&&n<2?.5:0,limewater:reacted?'milky':'clear',formula:'2CuO + C —高温→ 2Cu + CO₂↑',phase:stage});
  }

  if (['metals-oxygen-comparison', 'metals-acid-hydrogen', 'metal-displacement-copper-sulfate', 'iron-rust-conditions', 'metal-properties-practical'].includes(v)) {
    const metal = opts(c, 'metal', '铁'), test = opts(c, 'test', '物理性质'), combined = v === 'metal-properties-practical';
    const acidTest = v === 'metals-acid-hydrogen' || combined && test.includes('酸'), displacement = v === 'metal-displacement-copper-sulfate' || combined && test.includes('置换'), reactsAcid = /镁|铝|锌|铁/.test(metal), displace = begun && displacement && metal === '铁';
    const acid = opts(c, 'acid', '稀盐酸'), sulfate = acid.includes('硫酸');
    const acidReaction = begun && acidTest && reactsAcid, gas = acidReaction ? 'H₂' : 'none';
    if (v === 'iron-rust-conditions') {
      const condition = opts(c, 'condition'), water = condition.includes('水'), oxygen = condition.includes('同时'), observedLater = begun && hit(c, 'observe');
      const rust = observedLater && water && oxygen;
      return res(c, !begun ? '先设置干燥、隔绝空气或同时接触水与空气的对照，再加入铁钉。' : !observedLater ? '已放置铁钉；锈蚀需要时间，点击观察表示查看一段时间后的对照，非瞬间生锈。' : rust ? '在有水和氧气的条件下，经过一段时间可形成红棕色铁锈。' : '缺少水或氧气，铁锈蚀受到抑制。', { ...base, metal, waterPresent: water, oxygenPresent: oxygen, rust: rust ? 1 : 0, solidColor: rust ? 'brown' : 'gray', condition, phase: !begun ? '设置条件' : observedLater ? '一段时间后' : '待持续观察' });
    }
    if (v === 'metals-oxygen-comparison') {
      const magnesium = metal === '镁', copper = metal === '铜', aluminum = metal === '铝';
      return res(c, !begun ? '点击加入/开始，演示教师对金属加热后的比较。' : magnesium ? '镁在空气中加热可剧烈燃烧，发出耀眼白光，生成白色MgO。' : copper ? '铜片在空气中加热，表面逐渐生成黑色CuO，不表现为镁的白光燃烧。' : aluminum ? '铝表面有致密氧化膜；膜影响进一步反应，不把普通铝片一概显示成火星燃烧。' : '铁丝在空气中加热不出现纯氧中的剧烈燃烧；不能忽略氧浓度和样品形态。', { ...base, metal, heating: begun, flame: begun && magnesium, flameColor: magnesium ? 'white' : 'none', solidColor: begun ? magnesium || aluminum ? 'white' : copper ? 'black' : 'gray' : copper ? 'copper-red' : 'gray', formula: magnesium ? '2Mg + O₂ → 2MgO' : copper ? '2Cu + O₂ → 2CuO' : aluminum ? '4Al + 3O₂ → 2Al₂O₃' : '铁在空气中加热的表面氧化示意', phase: begun ? '加热比较' : '待开始' });
    }
    const chlorideEquations: Record<string, string> = { '镁': 'Mg + 2HCl → MgCl₂ + H₂↑', '锌': 'Zn + 2HCl → ZnCl₂ + H₂↑', '铁': 'Fe + 2HCl → FeCl₂ + H₂↑', '铝': '2Al + 6HCl → 2AlCl₃ + 3H₂↑' };
    const sulfateEquations: Record<string, string> = { '镁': 'Mg + H₂SO₄ → MgSO₄ + H₂↑', '锌': 'Zn + H₂SO₄ → ZnSO₄ + H₂↑', '铁': 'Fe + H₂SO₄ → FeSO₄ + H₂↑', '铝': '2Al + 3H₂SO₄ → Al₂(SO₄)₃ + 3H₂↑' };
    const formula = displace ? 'Fe + CuSO₄ → FeSO₄ + Cu' : acidReaction ? (sulfate ? sulfateEquations : chlorideEquations)[metal] : '尚未发生反应';
    const splint = acidReaction && hit(c, 'collect'), group = v === 'metals-acid-hydrogen' && begun;
    const text = !begun ? '尚未使金属与试剂接触，不生成气体或置换产物。' : acidTest && hit(c, 'collect') ? reactsAcid ? `燃着的木条放在${metal}试管口，气体被点燃（淡蓝色火焰，可伴有轻微爆鸣），说明生成可燃性气体H₂。` : '铜没有产生气体，管口木条仍正常燃烧，不会被点燃气体。' : acidTest ? reactsAcid ? `${metal}可与${acid}反应产生H₂；铁盐溶液呈浅绿色，镁盐和锌盐溶液无色。` : `铜与${acid}通常不反应，不产生H₂。` : displacement ? metal === '铁' ? '铁表面析出红色铜，蓝色硫酸铜溶液逐渐变浅绿色。' : '铜放入硫酸铜溶液无明显置换反应，溶液仍呈蓝色。' : '观察金属的光泽、颜色和导电等物理性质；本综合示例采用铁，不推断其他金属反应。';
    return res(c, text, { ...base, metal, acid, gas, bubbles: acidReaction ? .4 : 0, splintTest: splint, gasBurns: splint, selectedMetal: metal, bubblesMg: group ? .9 : 0, bubblesZn: group ? .55 : 0, bubblesFe: group ? .25 : 0, bubblesCu: 0, liquidColor: displacement ? displace ? 'pale-green' : 'blue' : acidReaction && metal === '铁' ? 'pale-green' : 'clear', precipitateColor: displace ? 'copper-red' : 'none', solidColor: displace ? 'copper-red' : metal === '铜' ? 'copper-red' : 'gray', formula, test, phase: begun ? '性质观察' : '待加入' }, [], 'qualitative', combined ? ['该综合活动没有金属选择控件，化学反应状态明确使用铁示例。'] : []);
  }

  if (['sugar-dissolution-water', 'sodium-chloride-solubility', 'potassium-nitrate-solubility', 'calcium-hydroxide-solubility', 'solubility-temperature-curve'].includes(v)) {
    const curve = v === 'solubility-temperature-curve', calcium = v === 'calcium-hydroxide-solubility';
    const temperature = val(c, 'temperature', 20), material = curve ? opts(c, 'solute', '氯化钠') : calcium ? '氢氧化钙' : v === 'sugar-dissolution-water' ? '蔗糖' : v === 'sodium-chloride-solubility' ? '氯化钠' : '硝酸钾';
    const series: Record<string, number[]> = { '氯化钠': [35.7, 36, 36.6, 37.3, 38.4, 39.8], '硝酸钾': [13.3, 31.6, 63.9, 110, 169, 246], '氯化钾': [27.6, 34.2, 40.1, 45.8, 51.3, 56.7] };
    const points = series[material], pos = clamp(temperature / 20, 0, 5), index = Math.min(4, Math.floor(pos));
    const solubility = points ? points[index] + (points[index + 1] - points[index]) * (pos - index) : calcium ? .17 : 204;
    if (curve) return res(c, `${material}的0–100℃参考溶解度曲线；当前显示20℃参考值，曲线数据为教材常见近似值。`, { ...base, material, temperature: 20, solubility, curveTemperatures: [0, 20, 40, 60, 80, 100], curveSolubilities: points, phase: '参考曲线' }, [num('20℃参考溶解度', solubility, ' g/100 g水')], 'qualitative');
    const amount = calcium ? .5 : val(c, v === 'sugar-dissolution-water' ? 'sugar' : v === 'sodium-chloride-solubility' ? 'salt' : 'solute', 0), water = calcium ? val(c, 'water', 30) : 10;
    const added = begun ? amount : 0, capacity = solubility * water / 100, dissolved = Math.min(added, capacity), undissolved = Math.max(0, added - dissolved);
    return res(c, !begun ? '先设置溶质/水量，点击加入后观察溶解与残留固体。' : water === 0 ? '未加水，固体不能在水中溶解。' : undissolved > .0001 ? '在本演示设定下达到饱和，仍有未溶固体；改变温度或用水量可改变限量。' : '在本演示设定下固体可完全溶解，形成均一溶液。', { ...base, material, temperature, solubility, amount, waterMass: water, waterVolume: water, dissolved, undissolved, liquidLevel: water === 0 ? 0 : clamp(water / (calcium ? 100 : 20), .1, .8), solidColor: 'white', saturated: begun && water > 0 && added >= capacity, phase: !begun ? '待加入' : undissolved > 0 ? '有固体剩余' : '形成溶液' }, [num('演示水质量', water, ' g'), num('已溶质量', dissolved, ' g'), num('未溶质量', undissolved, ' g')], 'quantitative', [calcium ? '演示设定：20℃、0.5g氢氧化钙；水按1g/mL换算。' : '演示设定：固定10g水；水量不是教材给出的实际操作量。']);
  }

  if (v === 'iodine-permanganate-solvent') {
    const solute = opts(c, 'solute'), solvent = opts(c, 'solvent'), iodine = solute === '碘', gasoline = solvent === '汽油';
    const dissolves = iodine ? gasoline : !gasoline, slightly = iodine && !gasoline;
    return res(c, !begun ? '选择溶质和溶剂，点击加入再比较。' : slightly ? '碘在水中微溶，水层呈很浅的黄棕色，并可有碘固体剩余。' : dissolves ? iodine ? '碘较易溶于汽油，溶液呈紫红/紫色示意。' : '高锰酸钾溶于水形成紫色溶液。' : '高锰酸钾难溶于汽油，大部分固体保留。', { ...base, solute, solvent, dissolved: begun ? dissolves ? 1 : slightly ? .05 : 0 : 0, undissolved: begun && !dissolves ? 1 : 0, liquidColor: !begun ? 'clear' : slightly ? 'pale-yellow' : dissolves ? 'purple' : 'clear', solidColor: iodine ? 'gray' : 'purple', phase: !begun ? '待加入' : dissolves ? '形成溶液' : '少量/难溶' }, [], 'qualitative', ['溶解与剩余颗粒仅作示意，并非实测质量。']);
  }
  if (v === 'water-ethanol-oil-mixing') {
    const liquid = opts(c, 'liquid', '乙醇'), mixed = begun && hit(c, 'stir');
    return res(c, !begun ? '管中先装滴有红墨水的水；点击加入，沿管壁缓慢加入乙醇。' : !mixed ? '未振荡时两液可暂见界面；这不是乙醇与水不互溶。点击搅拌/振荡观察。' : '振荡后乙醇与水互溶，形成颜色均一的液体；静置后不会像油水那样重新分层。', { ...base, liquid, miscible: mixed, layers: begun && !mixed ? 2 : 1, liquidColor: mixed ? 'pink' : 'red', ethanolAdded: begun, stirred: mixed, phase: !begun ? '仅红水' : mixed ? '均一液体' : '乙醇在上/待振荡' });
  }

  if (['salinity-concentration-comparison', 'prepare-sodium-chloride-solution', 'prepare-saline-by-mass'].includes(v)) {
    const mass = val(c, 'solutionMass', 100), percent = val(c, 'concentration', 5), solute = mass * percent / 100, water = mass - solute, capacity = water * .36, dissolved = begun ? Math.min(solute, capacity) : 0, undissolved = begun ? Math.max(0, solute - capacity) : 0, actual = water + dissolved > 0 ? dissolved / (water + dissolved) : 0;
    return res(c, `目标配比：NaCl ${fmt(solute)}g、水 ${fmt(water)}g。${!begun ? '尚未混合，先计算再开始。' : undissolved > 0 ? '20℃示例下已超过饱和限量，有固体剩余；实际溶液质量分数低于目标配比。' : '全部溶解后质量分数等于目标值。'}`, { ...base, soluteMass: solute, waterMass: water, solutionMass: mass, concentration: begun ? actual : percent / 100, targetConcentration: percent / 100, dissolved, undissolved, liquidColor: 'clear', solidColor: 'white', phase: !begun ? '计算配比' : undissolved > 0 ? '饱和并有残留' : '完成配液' }, [num('需称NaCl', solute, ' g'), num('需取水', water, ' g'), num('目标质量分数', percent, '%'), ...(begun ? [num('实际液相质量分数示例', actual * 100, '%')] : [])], 'quantitative', ['饱和限量使用20℃NaCl约36g/100g水；无总质量控件的比较活动采用100g总配料示例。']);
  }

  if (['dissolution-temperature-change', 'sulfuric-acid-dilution', 'sodium-hydroxide-dissolution', 'quicklime-water-exothermic'].includes(v)) {
    const solute = opts(c, 'solute', '氯化钠'), stage = opts(c, 'stage'), order = opts(c, 'order'), safe = order.includes('酸入水'), water = val(c, 'water', 1);
    const dissolving = v === 'sodium-hydroxide-dissolution' ? begun && stage !== '固体观察' : begun && water > 0;
    const direction = !dissolving ? 0 : v === 'dissolution-temperature-change' ? solute === '硝酸铵' ? -1 : solute === '氢氧化钠' ? 1 : 0 : 1;
    const rise = v === 'quicklime-water-exothermic' ? val(c, 'temperature', 10) : direction * 8, temperature = 20 + (direction ? rise : 0);
    const text = !begun ? '先记录初始状态，点击开始后比较温度变化。' : v === 'sulfuric-acid-dilution' ? safe ? '将酸缓慢加入水并不断搅拌；稀释放出大量热。' : '水入浓硫酸同样会放热，并可局部骤沸、飞溅；必须改为酸入水，不能误说错误顺序不放热。' : v === 'quicklime-water-exothermic' ? water > 0 ? 'CaO与水反应生成Ca(OH)₂并放热；显示的是用户设置的示意温升。' : '水量为零时没有CaO与水的放热反应。' : v === 'sodium-hydroxide-dissolution' ? stage === '固体观察' ? '白色NaOH固体，未加水不显示溶解热。' : 'NaOH溶于水放热；溶解不等同于在空气中吸湿潮解。' : direction < 0 ? '硝酸铵溶解吸热，温度降低。' : direction > 0 ? 'NaOH溶解放热，温度升高。' : 'NaCl溶解时温度变化较小。';
    return res(c, text, { ...base, solute, stage, order, safeOrder: safe, heatRelease: dissolving && direction > 0 ? 1 : 0, temperatureChange: direction ? rise : 0, temperature, waterVolume: begun ? water : 0, dissolved: dissolving ? 1 : 0, solidColor: 'white', undissolved: v === 'sodium-hydroxide-dissolution' && !dissolving ? 1 : 0, phase: !begun ? '待开始' : !dissolving ? '固体/无水' : direction > 0 ? '放热' : direction < 0 ? '吸热' : '温度基本不变', formula: v === 'quicklime-water-exothermic' ? 'CaO + H₂O → Ca(OH)₂' : '溶解/稀释热效应' }, [num('示意温度', temperature, ' ℃')], 'qualitative', v === 'sulfuric-acid-dilution' && begun && !safe ? ['危险顺序只作虚拟对照，不应在真实实验中执行。'] : ['温度动画是20℃初温的示例，缺少用量与比热条件，不能当作实测温升。']);
  }

  if (v === 'neutralization-phenolphthalein') {
    const acidVolume = begun ? val(c, 'acid', 0) : 0, baseVolume = 5, concentration = .01;
    const excessOH = concentration * (baseVolume - acidVolume) / (baseVolume + acidVolume), oh = (excessOH + Math.sqrt(excessOH ** 2 + 4e-14)) / 2, ph = 14 + Math.log10(oh), color = ph > 8.2 ? 'pink' : 'colorless';
    return res(c, !begun ? '初始NaOH溶液已含酚酞，呈粉红色；设置盐酸加入体积后点击加入。' : Math.abs(acidVolume - baseVolume) < 1e-9 ? '在明确给出的演示浓度与体积下，5mL盐酸恰与5mL碱液中和，溶液近中性、酚酞无色。' : acidVolume < baseVolume ? '盐酸消耗OH⁻，碱仍过量，酚酞仍可呈粉红色；不能把每一滴酸都当成中和终点。' : '盐酸已过量，溶液呈酸性，酚酞保持无色；褪色本身不证明恰好中性。', { ...base, acidVolume, baseVolume, acidConcentration: concentration, baseConcentration: concentration, pH: ph, liquidColor: color, indicator: '酚酞', acidic: ph < 7 - 1e-5, basic: ph > 7 + 1e-5, neutralized: Math.abs(acidVolume - baseVolume) < 1e-9, titrationProgress: clamp(acidVolume / baseVolume, 0, 1), phase: !begun ? '待滴加' : acidVolume < baseVolume ? '碱过量' : acidVolume === baseVolume ? '演示当量点' : '酸过量', formula: 'HCl + NaOH → NaCl + H₂O' }, [num('已加入稀盐酸', acidVolume, ' mL'), num('演示pH', ph)], 'quantitative', ['明确演示设定：0.01mol/L NaOH 5mL，滴加0.01mol/L HCl，25℃；并非教材实测配方。']);
  }

  if (v === 'co2-water-litmus') {
    const paper = opts(c, 'paper'), previouslyWet = paper.includes('喷水'), co2 = paper.includes('通CO₂'), dried = /再吹干|再干燥/.test(paper), restored = begun && previouslyWet && co2 && dried, red = begun && previouslyWet && co2 && !dried;
    return res(c, !begun ? '先准备纸花对照，点击加入/开始比较。' : restored ? '喷过水并通CO₂的纸花先变红，取出后用吹风机小心吹干；碳酸分解、CO₂逸出，纸花恢复紫色。' : red ? '水与CO₂共同作用生成碳酸，使紫色石蕊纸花变红。' : '缺少水或CO₂，石蕊保持紫色；喷水本身不使它变红。', { ...base, paper, wet: previouslyWet && !dried, previouslyWet, dried: begun && dried, restored, carbonicAcidDecomposed: restored, carbonDioxideReleased: restored, gas: begun && co2 ? 'CO₂' : 'none', acidic: red, liquidColor: red ? 'red' : 'purple', phase: !begun ? '待比较' : restored ? '吹干后恢复紫色' : red ? '通CO₂后变红' : paper, formula: restored ? 'H₂CO₃ → CO₂↑ + H₂O' : 'CO₂ + H₂O ⇌ H₂CO₃' });
  }

  if (v === 'base-properties-comparison' && opts(c, 'test').includes('二氧化碳')) {
    const solution = opts(c, 'base', '氢氧化钠'), calcium = solution.includes('氢氧化钙'), precipitate = begun && calcium;
    return res(c, !begun ? '先选择碱溶液，点击加入演示通入CO₂。' : calcium ? '少量CO₂通入澄清石灰水，生成白色CaCO₃沉淀，溶液变浑浊。' : 'CO₂可与NaOH反应生成Na₂CO₃和水，通常无明显可见现象；无明显现象不等于未反应。', { ...base, solution, base: solution, reacted: begun, gas: begun ? 'CO₂' : 'none', bubbles: begun ? .3 : 0, liquidColor: precipitate ? 'milky-white' : 'clear', precipitateColor: precipitate ? 'white' : 'none', precipitate: precipitate ? 1 : 0, cloudiness: precipitate ? 1 : 0, naohTube: 'clear', caohTube: begun ? 'milky-white' : 'clear', bothBasesCompared: begun, formula: calcium ? 'CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O' : 'CO₂ + 2NaOH → Na₂CO₃ + H₂O', phase: !begun ? '待通CO₂' : precipitate ? '白色沉淀' : '反应无明显现象' }, [], 'qualitative', ['以少量CO₂和碱有余量为条件；未模拟过量CO₂导致CaCO₃再溶解或碳酸氢盐生成。']);
  }
  if (v === 'indicators-acid-base' || v === 'limewater-phenolphthalein' || v === 'base-properties-comparison') {
    const lime = v === 'limewater-phenolphthalein', baseCompare = v === 'base-properties-comparison', solution = opts(c, 'solution', lime ? '石灰水' : opts(c, 'base', '氢氧化钠'));
    const indicator = opts(c, 'indicator', lime ? '酚酞' : '石蕊'), acidic = /醋|酸/.test(solution), ph = val(c, 'pH', 12), basic = lime ? ph > 7 : /肥皂|氢氧化|碱/.test(solution), dose = val(c, 'amount', 1), hasIndicator = begun && dose > 0;
    const copper = baseCompare && opts(c, 'test').includes('硫酸铜'), litmus = indicator === '石蕊';
    const color = !hasIndicator ? 'clear' : copper ? 'blue-cloudy' : litmus ? acidic ? 'red' : basic ? 'blue' : 'purple' : (lime ? ph > 8.2 : basic) ? 'pink' : 'colorless';
    return res(c, !hasIndicator ? '尚未加入试剂或滴数为零，不显示指示剂显色/沉淀。' : copper ? '碱与硫酸铜反应，生成蓝色Cu(OH)₂沉淀。' : `${solution}呈${lime ? ph < 7 ? '酸性' : ph > 7 ? '碱性' : '中性' : acidic ? '酸性' : basic ? '碱性' : '中性'}；${indicator}${color === 'red' ? '变红' : color === 'blue' ? '变蓝' : color === 'pink' ? '变粉红' : color === 'purple' ? '呈紫色' : '无色'}。`, { ...base, solution, base: opts(c, 'base'), indicator, acidic, basic, ...(lime ? { pH: ph } : {}), amount: dose, liquidColor: color, precipitateColor: hasIndicator && copper ? 'blue' : 'none', precipitate: hasIndicator && copper ? 1 : 0, phase: !hasIndicator ? '待加入' : copper ? '蓝色沉淀' : '指示剂显色', ...(baseCompare ? { litmusNaOH: hasIndicator ? 'blue' : 'purple', litmusCaOH: hasIndicator ? 'blue' : 'purple', phenolphthaleinNaOH: hasIndicator ? 'pink' : 'colorless', phenolphthaleinCaOH: hasIndicator ? 'pink' : 'colorless' } : {}) });
  }

  if (v === 'acid-indicator-materials' || v === 'acid-properties-comparison' || v === 'acid-base-properties-practical') {
    const material = opts(c, 'material', '纸'), acid = opts(c, 'acid', '稀盐酸'), topic = opts(c, 'stage', opts(c, 'test', '指示剂')), compare = v === 'acid-properties-comparison', recall = compare && topic.includes('金属'), soaked = compare && begun && hit(c, 'observe'), rust = topic.includes('金属氧化物') || topic.includes('铁锈'), precip = topic.includes('沉淀'), neutral = topic.includes('中和');
    const text = !begun ? '选择对照材料或主题，点击加入试剂后观察。' : recall ? '回忆第八单元：镁、锌、铁分别与稀盐酸、稀硫酸反应都放出H₂，生成相应的氯化物或硫酸盐（单质 + 化合物 → 新单质 + 新化合物，属于置换反应）；铁盐溶液呈浅绿色。' : compare && rust ? soaked ? '继续浸泡：铁锈除尽后，铁本身也会与酸反应冒出气泡，所以除锈时不能把铁制品长时间浸在酸中。' : '生锈铁钉放入稀盐酸和稀硫酸：铁锈（Fe₂O₃）溶解，溶液变为黄色（含Fe³⁺），钉表面变光亮；两种酸现象相似，生成物都是铁盐和水。' : compare ? '稀盐酸、稀硫酸都使紫色石蕊变红，使无色酚酞保持无色，两种酸的指示剂现象相似。' : v === 'acid-indicator-materials' ? `${acid}使紫色石蕊变红；普通${material}不是天然指示剂，未指定成分和浓度时不预设其变红或炭化。` : rust ? '以铁锈Fe₂O₃与稀盐酸为例，铁锈逐渐溶解，形成黄色/黄棕色Fe³⁺盐溶液；不是铁金属与酸产氢。' : precip ? '以NaOH与CuSO₄为例，混合后生成蓝色Cu(OH)₂沉淀。' : neutral ? '酸碱中和生成盐和水；本综合实验未指定当量，不能报告确定pH或凭空判定终点。' : '稀酸使石蕊变红；酚酞在稀酸中无色。对照碱液使石蕊变蓝、酚酞变红。';
    return res(c, text, { ...base, material, materialChanged: false, acid, indicator: '石蕊', liquidColor: !begun ? 'clear' : recall ? 'clear' : rust ? 'brown' : precip ? 'blue-cloudy' : neutral ? 'clear' : 'red', acidic: begun && !precip && !neutral, precipitateColor: begun && precip ? 'blue' : 'none', precipitate: begun && precip ? 1 : 0, rust: begun && rust ? 0 : 1, neutralized: false, ...(compare ? { litmusHCl: begun ? 'red' : 'purple', litmusH2SO4: begun ? 'red' : 'purple', phenolphthaleinHCl: 'colorless', phenolphthaleinH2SO4: 'colorless', rustDissolved: begun && rust, solutionYellow: begun && rust, nailBright: begun && rust, soakedLong: soaked && rust, metalBubbles: begun && recall, metalTrial: recall ? '镁、锌、铁 × 稀盐酸、稀硫酸' : '' } : {}), phase: !begun ? '待加入' : rust ? '铁锈溶解' : topic, formula: rust ? 'Fe₂O₃ + 6HCl → 2FeCl₃ + 3H₂O' : precip ? 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄' : neutral ? 'HCl + NaOH → NaCl + H₂O' : '指示剂性质' }, [], 'qualitative');
  }

  if (v === 'acid-solution-conductivity') {
    const liquid = opts(c, 'liquid'), conductive = /稀盐酸|稀硫酸/.test(liquid), closed = (c.action.counts.toggle ?? 0) % 2 === 0, on = conductive && closed;
    return res(c, !closed ? '开关断开，无电流通过灯泡。' : conductive ? `${liquid}含可自由移动的离子，灯泡可发光；亮度仅作相对示意。` : `${liquid}导电性很弱，本装置中灯泡不明显发光；不能据此说绝对没有离子或电流。`, { ...base, liquid, conductive, closed, current: on ? 1 : 0, relativeCurrent: on ? 1 : 0, bulbBrightness: on ? 1 : 0, bulbOn: on, active: on, phase: on ? '导电' : closed ? '弱导电对照' : '断开' }, [], 'qualitative', ['current仅供场景亮灭的归一化标志，非安培；没有电压/电极参数，不计算真实电流。']);
  }

  if (['alum-flocculation-settling', 'gravity-filtration', 'water-distillation', 'water-quality-filter-design', 'charcoal-adsorption-dye', 'crude-salt-purification', 'glassware-cleaning'].includes(v)) {
    if (v === 'glassware-cleaning') { const cleaning = val(c, 'cleaning', 0); return res(c, cleaning > 90 ? '内壁水膜均匀、不聚成水滴，表示清洁程度较高。' : '继续刷洗并冲净，观察内壁水膜是否均匀。', { ...base, cleanliness: cleaning, waterFilm: cleaning / 100, residue: 1 - cleaning / 100, phase: '清洗示意' }); }
    if (v === 'gravity-filtration') { const progress = begun ? val(c, 'filtering', 0) : 0; return res(c, progress > 0 ? '滤纸截留不溶固体，滤液仍可含溶解物；过滤不是消毒。' : '尚未过滤，点击加入并调节过滤进度。', { ...base, filtration: progress, solidRetained: progress / 100, liquidColor: progress > 80 ? 'clear' : 'cloudy', phase: progress > 0 ? '过滤中' : '待过滤' }); }
    if (v === 'water-distillation') { const heat = begun && opts(c, 'heating') === '加热', stage=opts(c,'stage','装置准备'), n=Math.round(val(c,'stage',0)); return res(c,!heat?'连接玻璃导管，将接收试管放入冷水浴；未加热时不持续产生馏出液。':n===0?'加热后水汽化，蒸气经导管进入冷水浴中的接收试管。':n===1?'先弃去初馏液，再更换接收试管。':'收集冷凝后的蒸馏水，不挥发杂质留在烧瓶中。', { ...base, stage, heating: heat, vapor: heat?1:0, distillate: heat&&n>=2?1:0, firstDistillate:heat&&n===1, phase:heat?stage:'停止' }); }
    if (v === 'alum-flocculation-settling') { const floc = begun && opts(c, 'treatment').includes('明矾'); return res(c, !begun ? '待处理的天然水仍浑浊；点击加入/开始设置处理。' : floc ? '明矾处理形成絮状物，促进悬浮物沉降；不是把水中所有物质变成沉淀。' : '静置使较大颗粒沉降，细小颗粒仍可悬浮。', { ...base, floc, liquidColor: floc ? 'pale-cloudy' : 'cloudy', settling: begun ? floc ? 1 : .3 : 0, phase: begun ? '沉降示意' : '待处理' }); }
    if (v === 'charcoal-adsorption-dye') { const carbon = val(c, 'carbon', 3), adsorption = begun ? clamp(carbon / 10, 0, 1) : 0; return res(c, adsorption > 0 ? '木炭吸附部分红墨水色素，颜色变浅；不是生成新的黄色物质。' : '尚未加木炭或用量为零，红墨水颜色基本不变。', { ...base, carbon, adsorption, liquidColor: adsorption > .8 ? 'clear' : adsorption > 0 ? 'pink' : 'red', phase: adsorption > 0 ? '吸附' : '未吸附' }); }
    if (v === 'water-quality-filter-design') { const filter = opts(c, 'filter'), layers = filter.includes('砂石') ? 3 : 1; return res(c, !begun ? '先选择滤层方案，点击加入让水样通过。' : layers === 3 ? '水样依次通过砂石、活性炭和滤纸：砂石截留较大颗粒，活性炭吸附部分色素异味，滤纸截留细小固体；外观变清不等于可以饮用。' : '只用滤纸能截留部分悬浮固体，颜色和气味基本不变；外观改善有限，不等于可以饮用。', { ...base, filter, layers, layerList: layers === 3 ? '砂石 → 活性炭 → 滤纸' : '滤纸', inputColor: 'cloudy', outputColor: begun ? layers === 3 ? 'clear' : 'pale-cloudy' : 'cloudy', filtered: begun, colorReduced: begun && layers === 3, solidRetained: begun ? 1 : 0, liquidColor: begun ? layers === 3 ? 'clear' : 'pale-cloudy' : 'cloudy', drinkable: false, phase: begun ? '过滤示意' : '设计滤层' }); }
    const stage = opts(c, 'stage', '溶解'), filtering = begun && stage === '过滤', evaporating = begun && stage === '蒸发', residualHeat=opts(c,'evaporation','加热')==='余热';
    return res(c, !begun ? '选择溶解、过滤或蒸发阶段，再点击加入/开始演示。' : filtering ? '滤纸截留难溶杂质，NaCl溶液通过。' : evaporating ? residualHeat?'出现较多固体时停止加热，利用余热蒸干。':'加热蒸发水分并搅拌，观察氯化钠结晶。' : '粗盐中的NaCl溶解，难溶杂质仍留在液体中。', { ...base, phase: begun ? stage : '待开始', liquidColor: filtering || evaporating ? 'clear' : 'cloudy', solidRetained: filtering ? 1 : 0, crystals: evaporating ? 1 : 0, heating: evaporating&&!residualHeat, residualHeat:evaporating&&residualHeat, distillate: 0 });
  }

  if (v === 'solid-reagent-transfer') {
    const material = opts(c, 'material'), tilt = val(c, 'tilt', 90);
    return res(c, !begun ? tilt < 75 ? '先横放试管，接近离竖直90°；不把固体从直立管口直接落下。' : '选择块状或粉末，先横放试管再点击开始取用；记录按钮不转移药品。' : material.includes('粉') ? '已放入阶段：粉末应在横放时送至管底，再缓慢竖起；当前角度变化不撤销已经取用的药品。' : '已放入阶段：块状应在横放时置于管口，再缓慢竖起滑入；当前角度变化不撤销已经取用的药品。', { ...base, material, tilt, safeTransfer: tilt >= 75, safetyAssessment: '仅表示当前姿态是否适合放入，不回推开始动作时角度', transferred: begun, solidColor: material.includes('粉') ? 'white' : 'gray', phase: begun ? '已取用' : '待取用' });
  }
  if (v === 'alloy-hardness-scratch') {
    const pair = opts(c, 'pair');
    return res(c, begun ? `${pair}相互刻划比较；本样品中合金通常比相应纯金属更硬，不能泛化为所有合金性质。` : '先观察颜色和光泽，点击开始进行刻划比较。', { ...base, material: pair, scratched: begun, phase: begun ? '刻划比较' : '外观观察' });
  }
  if (v === 'acid-appearance') {
    const acid = opts(c, 'acid', '浓盐酸'), hydrochloric = acid.includes('盐酸'), whiteMist = begun && hydrochloric;
    return res(c, !begun ? '先观察浓盐酸、浓硫酸的标签和外观；点击开始演示开瓶。' : hydrochloric ? '浓盐酸开瓶后，挥发的HCl与空气中的水蒸气形成盐酸小液滴，可见白雾；白雾不是燃烧产生的烟。' : '浓硫酸为无色黏稠液体，不出现浓盐酸开瓶时的白雾；不得直接嗅闻或接触。', { ...base, acid, bottleOpen: begun, whiteMist, mist: whiteMist ? 'white' : 'none', smoke: 'none', volatile: hydrochloric, appearance: hydrochloric ? '无色液体' : '无色黏稠液体', odor: '不直接嗅闻', phase: !begun ? '未开瓶' : whiteMist ? '开瓶白雾' : '开瓶无白雾' });
  }

  if (v === 'oxygen-sensor' || v === 'air-quality-sensor-station') {
    const oxygen = val(c, 'oxygen', 21), reading = v === 'oxygen-sensor' ? oxygen : val(c, 'reading', 20), pollutant = v === 'oxygen-sensor' ? 'O₂' : opts(c, 'pollutant');
    return res(c, begun ? `${pollutant}示例读数${fmt(reading)}${v === 'oxygen-sensor' ? '%' : '（示意值）'}；不是实时环境数据。` : '点击开始读取设定的传感器示例；未启动时不宣称已经测量。', { ...base, reading, oxygen, pollutant, measured: begun, phase: begun ? '示例测量' : '待测量' }, begun ? [num('示例读数', reading, v === 'oxygen-sensor' ? '%' : ' 示意值')] : [], 'schematic');
  }
  if (v === 'household-ph-measurement') {
    const sample = opts(c, 'sample'), acidity = !begun ? '待测' : sample.includes('食醋') ? '酸性' : sample.includes('肥皂水') ? '碱性' : '待测';
    return res(c, begun ? `${sample}${acidity === '待测' ? '无法仅凭名称判断pH，需实际比色' : `通常呈${acidity}，具体pH须实际比色`}；不预设精确数值。` : '选择样品，点击开始测量。', { ...base, sample, acidity, phase: begun ? '定性比色示例' : '待测量' }, [], 'schematic');
  }
  if (v === 'ph-paper-measurement' || v === 'soil-ph-plant-growth') {
    const ph = val(c, 'pH', 7), stage = opts(c, 'stage', 'pH测量'), kind = ph < 7 ? '酸性' : ph > 7 ? '碱性' : '中性';
    return res(c, !begun ? '点击开始，用比色法读取设定的示例pH。' : stage.includes('种植') ? `当前土壤示例pH=${fmt(ph)}；植物生长需持续观察，不能仅凭pH预测株高。` : stage.includes('方案') ? '改良方案需结合植物种类、土壤性质和持续记录，不能由单次pH读数自动确定施肥量。' : `比色得到示例pH=${fmt(ph)}，呈${kind}；实际试纸读数精度有限。`, { ...base, ...(begun ? { pH: ph } : {}), acidity: begun ? kind : '待测', phase: begun ? stage : '待测量' }, begun ? [num('示例pH', ph)] : [], 'schematic');
  }

  return res(c, `${c.exp.title}：此变体尚未实现经审查的独立化学模型。`, { ...base, phase: '尚未覆盖', modelReviewed: false }, [], 'schematic', ['未实现独立模型，不能把family占位作为完成。']);
}

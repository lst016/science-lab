import assert from 'node:assert/strict';
import { books } from '../src/data/books';
import { simulate } from '../src/sim/registry';
import { emptyAction, type Observation } from '../src/sim/core';
import { CHEMISTRY_MODEL_LIMITS } from '../src/sim/chemistry';

const all = books.flatMap(b=>b.experiments);
let passed=0; const failures:string[]=[];
function test(name:string, fn:()=>void){ try{fn();passed++;console.log(`PASS ${name}`)}catch(err){failures.push(`${name}: ${err instanceof Error?err.message:String(err)}`);console.log(`FAIL ${name}: ${err instanceof Error?err.message:String(err)}`)} }
function observe(variant:string, values:Record<string,number>={}, counts:Record<string,number>={}):Observation {
 const exp=all.find(e=>e.sceneVariant===variant);assert(exp,`缺实验${variant}`);
 const params=Object.fromEntries(exp.parameters.map(p=>[p.key,p.default]));
 return simulate(exp,{...params,...values},0,{...emptyAction(),counts});
}
function num(o:Observation,key:string){const x=o.state[key];assert.equal(typeof x,'number',`state.${key}应为数值`);return x as number;}
function near(actual:number,expected:number,tol=1e-6){assert(Math.abs(actual-expected)<=tol,`${actual} != ${expected}`)}
function reading(o:Observation, label:RegExp){const r=o.readings.find(r=>label.test(r.label));assert(r,`缺读数${label}`);const n=Number(r.value.match(/[-+]?\d+(?:\.\d+)?/)?.[0]);assert(Number.isFinite(n));return n;}

test('反射角等于入射角',()=>near(num(observe('reflection',{angle:35}),'reflectionAngle'),35));
test('平行光经凸透镜会聚到实焦点且不伪造有限物距',()=>{for(const focalLength of [5,10,25]){const o=observe('converge-diverge',{lensType:0,focalLength});near(num(o,'focalLength'),focalLength);near(num(o,'focusDistance'),focalLength);assert.equal(o.state.focusType,'real');assert.equal(o.state.virtual,false);assert.equal(o.state.objectAtInfinity,true);assert(!('objectDistance' in o.state));assert(!('magnification' in o.state));assert(!o.readings.some(r=>/物距|放大率|像距/.test(r.label)));assert(o.phenomenon.includes('会聚'));}});
test('平行光经凹透镜发散且虚焦距为负',()=>{for(const focalLength of [5,10,25]){const o=observe('converge-diverge',{lensType:1,focalLength});near(num(o,'focalLength'),-focalLength);near(num(o,'focusDistance'),-focalLength);near(num(o,'focalLengthMagnitude'),focalLength);assert.equal(o.state.focusType,'virtual');assert.equal(o.state.virtual,true);assert.equal(o.state.parallelInput,true);assert(!('objectDistance' in o.state));assert(!('magnification' in o.state));assert(o.phenomenon.includes('反向延长线'));assert(o.readings.some(r=>r.value==='入射侧虚焦点'));}});
test('凸透镜二倍焦距等大倒像',()=>{const o=observe('lens-bench',{objectDistance:20,focalLength:10});near(num(o,'imageDistance'),20);near(num(o,'magnification'),-1);assert.equal(o.state.virtual,false)});
test('凸透镜焦内正立虚像',()=>{const o=observe('lens-bench',{objectDistance:5,focalLength:10});near(num(o,'imageDistance'),-10);near(num(o,'magnification'),2);assert.equal(o.state.virtual,true)});
test('纸筒凸透镜照相机镜屏距离须调焦',()=>{const a=observe('pinhole-paper-camera',{objectDistance:150,tubeDistance:5}),b=observe('pinhole-paper-camera',{objectDistance:150,tubeDistance:25});near(num(a,'focalLength'),10);near(num(a,'imageDistance'),150/14);near(num(a,'imageDistance'),num(b,'imageDistance'));assert.notEqual(a.state.defocus,b.state.defocus);assert(num(a,'magnification')<0)});
test('焦点处不伪造有限实像',()=>{const o=observe('lens-bench',{objectDistance:10,focalLength:10});assert.equal(o.state.imageAtInfinity,true);assert(o.readings.some(r=>/无有限|无穷|∞/.test(r.value)));});
test('阿基米德原理cm³到m³换算',()=>near(num(observe('archimedes',{volume:60,density:1000}),'buoyancy'),0.588));
test('悬挂物块测力计有一致的非零读数',()=>{const o=observe('archimedes',{volume:60,density:1000});near(num(o,'weight'),2.94);near(num(o,'tension'),2.352);near(num(o,'submerged'),60)});
test('提高液体密度增加浮力',()=>near(num(observe('archimedes',{volume:60,density:1300}),'buoyancy'),0.7644));
test('杠杆等力矩平衡',()=>assert.equal(observe('lever',{leftForce:2,leftArm:15,rightForce:3,rightArm:10}).state.balanced,true));
test('欧姆定律闭路电流',()=>near(num(observe('ohm-voltage',{voltage:3,resistance:10}),'current'),0.3));
test('断开开关电流为0',()=>near(num(observe('ohm-voltage',{voltage:3,resistance:10},{toggle:1}),'current'),0));
test('同种材料密度不随体积改变',()=>{const a=observe('mass-volume',{material:0,volume:10}),b=observe('mass-volume',{material:0,volume:20});near(num(a,'density'),num(b,'density'));near(num(b,'mass'),2*num(a,'mass'));});
test('液体密度参数与差量法质量一致',()=>{const o=observe('liquid-density',{density:1.08,volume:40});near(num(o,'density'),1.08);near(num(o,'mass'),43.2)});
test('弹簧刚度N/m换算为cm',()=>{const o=observe('spring-scale',{force:4,stiffness:100});near(num(o,'extension'),4)});
test('重力等于质量乘g',()=>near(num(observe('gravity-mass',{mass:0.2,gravity:9.8}),'force'),1.96));
test('固体压强cm²换算',()=>near(num(observe('sponge-table',{force:20,area:10}),'pressure'),20000));
test('串联电阻都参与计算',()=>near(num(observe('series-current-law',{voltage:3,lamp1:12,lamp2:18}),'current'),0.1));
test('并联电流按两支路求和',()=>near(num(observe('parallel-current-law',{voltage:3,branch1:10,branch2:20}),'current'),0.45));
test('无跨接不是短路',()=>{const e=all.find(e=>e.sceneVariant==='bulb-short-circuit')!;const p=e.parameters.find(p=>p.key==='bypass')!;const no=p.options!.find(o=>o.label==='无跨接')!;assert.notEqual(observe(e.sceneVariant,{bypass:no.value}).state.shortCircuit,true)});
test('Cu(OH)₂受热由蓝变黑',()=>{const a=observe('copper-hydroxide-heating',{heating:0,amount:3},{add:1}),b=observe('copper-hydroxide-heating',{heating:1,amount:3},{add:1});assert(/blue|蓝/i.test(String(a.state.precipitateColor)));assert(/black|黑/i.test(String(b.state.precipitateColor)))});
test('酚酞在酸和中性溶液无色',()=>{for(const o of [observe('indicators-acid-base',{solution:0,indicator:1},{add:1}),observe('limewater-phenolphthalein',{pH:7,amount:2},{add:1})])assert(/clear|colorless|无色|transparent/i.test(String(o.state.liquidColor)),`颜色${o.state.liquidColor}`)});

test('仅短接串联L1时L2仍限流',()=>{const before=observe('bulb-short-circuit',{bypass:1,voltage:3}),after=observe('bulb-short-circuit',{bypass:0,voltage:3});near(num(before,'current'),.15);near(num(after,'current'),.3);assert.equal(after.state.bulb1On,false);assert.equal(after.state.bulb2On,true);near(num(after,'resistance'),10)});
test('提前返回的各电路分支也服从断开开关',()=>{for(const v of ['series-voltage-law','parallel-voltage-law','resistance-length','resistance-area','rheostat-control','bulb-short-circuit','series-parallel-switches','fuse-wire']){const o=observe(v,{}, {toggle:1});assert.equal(o.state.closed,false,v);near(num(o,'current'),0);near(num(o,'power'),0);assert.equal(o.state.bulbOn,false);}});
test('并联断开时两个支路电流同时为零',()=>{const o=observe('parallel-current-law',{}, {toggle:1});near(num(o,'current1'),0);near(num(o,'current2'),0);assert.equal(o.readings.find(r=>r.label==='支路1电流')?.value,'0 A')});
test('导体长度与截面积同时参与相对电阻',()=>{for(const v of ['resistance-length','resistance-area'])near(num(observe(v,{length:100,area:2}),'resistanceRatio'),1)});
test('木条在氧气燃旺而在CO2熄灭',()=>{assert.equal(observe('oxygen-carbon-dioxide-splint',{gas:0},{ignite:1}).state.flame,true);assert.equal(observe('oxygen-carbon-dioxide-splint',{gas:1},{ignite:1}).state.flame,false)});
test('确认纯净且点燃的氢气显示燃烧与水生成',()=>{const a=observe('hydrogen-combustion-water',{step:3,purity:0},{add:1}),b=observe('hydrogen-combustion-water',{step:3,purity:1},{add:1});assert.equal(a.state.flame,false);assert.equal(b.state.flame,true);assert.equal(b.state.gas,'H₂O')});
test('观察动作不点燃且第二次点燃动作能熄灭',()=>{assert.equal(observe('sulfur-burning',{}, {observe:1}).state.flame,false);assert.equal(observe('sulfur-burning',{}, {ignite:1}).state.flame,true);assert.equal(observe('sulfur-burning',{}, {ignite:2}).state.flame,false)});
test('金属酸反应方程按样品变化',()=>{for(const [metal,symbol]of [[0,'Mg'],[1,'Zn'],[2,'Fe']] as const){const o=observe('metals-acid-hydrogen',{metal},{add:1});assert(String(o.state.formula).startsWith(symbol+' +'));assert.equal(o.state.gas,'H₂')}assert.equal(observe('metals-acid-hydrogen',{metal:3},{add:1}).state.gas,'none')});
test('未罩住的酚酞仍无色',()=>assert.equal(observe('ammonia-diffusion-phenolphthalein',{cover:0}).state.liquidColor,'colorless'));
test('小孔变大亮度示意应增加',()=>assert(num(observe('pinhole-camera',{aperture:2}),'imageBrightness')>num(observe('pinhole-camera',{aperture:1}),'imageBrightness')));
test('气体扩散对象与教材二氧化氮一致',()=>assert(observe('gas-diffusion').phenomenon.includes('二氧化氮')));

test('带火星木条氧气复燃状态兼容火焰装置',()=>{const air=observe('glowing-splint-oxygen',{gas:0},{ignite:1}),oxygen=observe('glowing-splint-oxygen',{gas:1},{ignite:1});assert.equal(air.state.flame,false);assert.equal(oxygen.state.flame,true);assert.equal(oxygen.state.glowingSplint,true)});
test('红磷模型名称与教材一致并响应熄灭',()=>{const lit=observe('phosphorus-air-volume',{stage:2}, {ignite:1}),off=observe('phosphorus-air-volume',{stage:2}, {ignite:2});assert(lit.phenomenon.includes('红磷'));assert(!lit.phenomenon.includes('白磷'));assert.equal(lit.state.flame,true);assert.equal(off.state.flame,false)});

// 化学的行为验收明确区分“设置加入量”和“已经加入”。
test('默认药量不提前生成沉淀，观察或搅拌不能代替加入',()=>{for(const v of ['copper-hydroxide-precipitate','copper-hydroxide-heating','sodium-carbonate-limewater','copper-sulfate-precipitates']){for(const counts of [{},{observe:1},{stir:1}] as Record<string,number>[])assert.equal(observe(v,{},counts).state.precipitateColor,'none',v);assert.notEqual(observe(v,{}, {add:1}).state.precipitateColor,'none',v)}});
test('零药量不能被加入动作变成沉淀或气体',()=>{for(const [v,key] of [['copper-hydroxide-precipitate','amount'],['copper-hydroxide-heating','amount'],['sodium-carbonate-limewater','amount'],['marble-acid-open-tube','amount'],['carbonate-powder-acid','volume'],['carbonate-acid-limewater','acid'],['peroxide-catalyst','amount']]){const o=observe(v,{[key]:0},{add:1});assert.equal(o.state.precipitateColor,'none',v);assert.equal(o.state.gas,'none',v);near(num(o,'bubbles'),0)}});
test('过氧化氢先对照再加催化剂，并可再次加液',()=>{const slow=observe('peroxide-catalyst',{step:1},{add:1}),fast=observe('peroxide-catalyst',{step:2},{add:1}),stopped=observe('peroxide-catalyst',{step:4},{add:1}),again=observe('peroxide-catalyst',{step:4},{add:2});assert(num(slow,'bubbles')>0);assert(num(fast,'bubbles')>num(slow,'bubbles'));near(num(stopped,'bubbles'),0);assert(num(again,'bubbles')>0)});
test('高锰酸钾先排空气收集，撤导管后熄火并保留氧气',()=>{const purge=observe('permanganate-water-collection',{step:1},{add:1}),collected=observe('permanganate-water-collection',{step:2},{add:1}),withdraw=observe('permanganate-water-collection',{step:4},{add:1}),done=observe('permanganate-water-collection',{step:5},{add:1});assert.equal(purge.state.gasReady,false);assert.equal(collected.state.gasReady,true);assert.equal(withdraw.state.heating,true);assert.equal(done.state.heating,false);assert.equal(done.state.gasReady,true)});
test('碳酸钠与碳酸氢钠各用正确盐酸反应式',()=>{const a=observe('carbonate-acid-limewater',{material:0},{add:1}),b=observe('carbonate-acid-limewater',{material:1},{add:1});assert(String(a.state.formula).startsWith('Na₂CO₃ + 2HCl'));assert(String(b.state.formula).startsWith('NaHCO₃ + HCl'));assert.equal(a.state.gas,'CO₂');assert.equal(b.state.gas,'CO₂')});
test('铁丝在空气中不伪造纯氧火星现象',()=>{const a=observe('iron-sparks-oxygen',{gas:0},{ignite:1}),b=observe('iron-sparks-oxygen',{gas:1},{ignite:1});assert.equal(a.state.sparks,false);assert.equal(a.state.flame,false);assert.equal(b.state.sparks,true);assert.equal(b.state.blackSolid,true)});
test('红磷漏气仍可燃烧但不能读出氧含量',()=>{const o=observe('phosphorus-air-volume',{sealed:0,stage:2},{ignite:1});assert.equal(o.state.flame,true);near(num(o,'waterRise'),0);near(num(observe('phosphorus-air-volume',{sealed:1,cooled:1,stage:2},{ignite:1}),'waterRise'),0);near(num(observe('phosphorus-air-volume',{sealed:1,cooled:1,stage:4},{ignite:2}),'waterRise'),.21)});
test('蜡烛检验区分水珠与石灰水',()=>{const water=observe('candle-products-smoke',{test:0},{ignite:1}),co2=observe('candle-products-smoke',{test:1},{ignite:1});assert.equal(water.state.detectedProduct,'H₂O');near(num(water,'waterDrops'),1);assert.equal(co2.state.detectedProduct,'CO₂');assert.equal(co2.state.precipitateColor,'white');assert.equal(observe('candle-products-smoke',{}, {ignite:2}).state.flame,false)});
test('电解水先通电收集，断电后分开检验两极气体',()=>{const pure=observe('water-electrolysis',{step:2,electrolyte:0},{add:1}),on=observe('water-electrolysis',{step:2,electrolyte:1},{add:1}),hydrogen=observe('water-electrolysis',{step:3,electrolyte:1},{add:1}),oxygen=observe('water-electrolysis',{step:4,electrolyte:1},{add:1});near(num(pure,'bubbles'),0);assert(num(on,'oxygenVolume')>0);near(num(on,'hydrogenVolume'),2*num(on,'oxygenVolume'));assert.equal(hydrogen.state.closed,false);assert.equal(hydrogen.state.testHydrogen,true);assert.equal(oxygen.state.testOxygen,true);near(num(oxygen,'hydrogenVolume'),2)});
test('水未沸腾也可蒸发，常压100℃才显示沸腾气泡',()=>{const warm=observe('water-boiling-condensation',{temperature:60},{run:1}),boil=observe('water-boiling-condensation',{temperature:100},{run:1});near(num(warm,'bubbles'),0);assert(num(warm,'vapor')>0);assert(num(warm,'waterDrops')>0);assert(num(boil,'bubbles')>0);assert.equal(boil.state.boiling,true)});
test('浓硫酸对纸木布均先接触后炭化',()=>{for(const material of [0,1,2]){assert.equal(observe('sulfuric-acid-dehydration',{material}).state.charred,false);assert.equal(observe('sulfuric-acid-dehydration',{material},{observe:1}).state.charred,false);const o=observe('sulfuric-acid-dehydration',{material},{add:1});assert.equal(o.state.charred,true);assert.equal(o.state.solidColor,'black')}});
test('硫酸铜用量按标签映射且蓝色随实际质量变深',()=>{const values=[0,1,2].map(copperMass=>observe('copper-sulfate-concentration-comparison',{copperMass},{add:1}));near(num(values[0],'copperMass'),.1);near(num(values[1],'copperMass'),.5);near(num(values[2],'copperMass'),2);assert(num(values[0],'colorIntensity')<num(values[1],'colorIntensity'));assert(num(values[1],'colorIntensity')<num(values[2],'colorIntensity'));assert.equal(observe('copper-sulfate-concentration-comparison').state.liquidColor,'clear')});
test('三组金属活动性置换含不反应对照',()=>{const a=observe('metal-activity-displacement',{pair:0},{add:1}),b=observe('metal-activity-displacement',{pair:1},{add:1}),c=observe('metal-activity-displacement',{pair:2},{add:1});assert.equal(a.state.reacted,true);assert.equal(a.state.precipitateColor,'copper-red');assert(String(a.state.formula).startsWith('2Al + 3CuSO₄'));assert.equal(b.state.reacted,true);assert.equal(b.state.precipitateColor,'silver');assert.equal(b.state.liquidColor,'blue');assert.equal(c.state.reacted,false);assert.equal(c.state.liquidColor,'clear');assert.equal(observe('metal-activity-displacement').state.reacted,false)});
test('乙醇先加入后振荡，初始红水不会凭空出现乙醇层',()=>{const initial=observe('water-ethanol-oil-mixing'),layered=observe('water-ethanol-oil-mixing',{}, {add:1}),mixed=observe('water-ethanol-oil-mixing',{}, {add:1,stir:1});assert.equal(initial.state.liquidColor,'red');near(num(initial,'layers'),1);assert.equal(initial.state.ethanolAdded,false);near(num(layered,'layers'),2);assert.equal(layered.state.miscible,false);near(num(mixed,'layers'),1);assert.equal(mixed.state.miscible,true)});
test('肥皂水为碱性，滴加后石蕊蓝酚酞粉红',()=>{const litmus=observe('indicators-acid-base',{solution:1,indicator:0},{add:1}),phenol=observe('indicators-acid-base',{solution:1,indicator:1},{add:1});assert.equal(litmus.state.basic,true);assert.equal(litmus.state.liquidColor,'blue');assert.equal(phenol.state.liquidColor,'pink');assert.equal(observe('limewater-phenolphthalein',{amount:0,pH:12},{add:1}).state.liquidColor,'clear')});
test('石蕊纸花四组对照只在水和CO2共存时变红',()=>{for(const paper of [0,1,2,3])assert.equal(observe('co2-water-litmus',{paper},{add:1}).state.liquidColor,paper===3?'red':'purple')});
test('中和当量点由明确示例配比决定且过量酸不伪称中性',()=>{const before=observe('neutralization-phenolphthalein',{acid:10}),base=observe('neutralization-phenolphthalein',{acid:4},{add:1}),equal=observe('neutralization-phenolphthalein',{acid:5},{add:1}),acid=observe('neutralization-phenolphthalein',{acid:10},{add:1});near(num(before,'acidVolume'),0);assert(num(base,'pH')>7);assert.equal(base.state.liquidColor,'pink');near(num(equal,'pH'),7);assert.equal(equal.state.liquidColor,'colorless');assert(num(acid,'pH')<7);assert.equal(acid.state.neutralized,false);assert(acid.warnings.some(w=>w.includes('演示设定')))});
test('教材用量下加水可溶解剩余食盐，硝酸钾冷却析晶',()=>{const salt=observe('sodium-chloride-solubility',{step:2}),water=observe('sodium-chloride-solubility',{step:3});assert(num(salt,'undissolved')>0);near(num(water,'undissolved'),0);const cool=observe('potassium-nitrate-solubility',{step:5});assert(num(cool,'crystals')>0);near(num(cool,'dissolved')+num(cool,'crystals'),9);near(num(observe('calcium-hydroxide-solubility',{water:0},{add:1}),'dissolved'),0)});
test('硫酸铜两种沉淀颜色不同且钡盐上清仍有铜离子',()=>{const a=observe('copper-sulfate-precipitates',{reagent:0},{add:1}),b=observe('copper-sulfate-precipitates',{reagent:1},{add:1});assert.equal(a.state.precipitateColor,'blue');assert.equal(b.state.precipitateColor,'white');assert.equal(b.state.liquidColor,'blue')});
test('浓硫酸两种混合顺序都放热，水入酸另报危险',()=>{for(const order of [0,1]){const o=observe('sulfuric-acid-dilution',{order},{run:1});assert(num(o,'temperatureChange')>0);assert.equal(o.state.safeOrder,order===1)}assert(observe('sulfuric-acid-dilution',{order:0},{run:1}).warnings.some(w=>w.includes('危险')))});
test('零水量不发生生石灰放热，NaOH固态观察不显示溶解热',()=>{near(num(observe('quicklime-water-exothermic',{water:0},{run:1}),'temperatureChange'),0);near(num(observe('sodium-hydroxide-dissolution',{stage:0},{run:1}),'temperatureChange'),0);assert(num(observe('sodium-hydroxide-dissolution',{stage:1},{run:1}),'temperatureChange')>0)});
test('铁锈蚀需水和空气并经过观察阶段',()=>{for(const condition of [0,1,2]){const initial=observe('iron-rust-conditions',{condition},{add:1});near(num(initial,'rust'),0);const later=observe('iron-rust-conditions',{condition},{add:1,observe:1});near(num(later,'rust'),condition===2?1:0);if(condition===1)assert.equal(later.state.oxygenPresent,false)}});
test('质量守恒不捏造样品质量且开放产气装置所称质量减少',()=>{const open=observe('mass-conservation-open-closed',{container:0,step:2},{run:1}),closed=observe('mass-conservation-open-closed',{container:1,step:2},{run:1});assert.equal(open.state.massChange,'decrease');assert.equal(closed.state.massChange,'unchanged');assert.equal(open.state.massConserved,true);assert(!('massBefore' in open.state));assert(!('massAfter' in open.state));assert.equal(observe('magnesium-combustion-mass',{system:0,stage:2},{run:1}).state.massChange,'increase')});
test('固体横放取用后缓慢竖起不会撤销已放入状态',()=>{for(const material of [0,1]){assert.equal(observe('solid-reagent-transfer',{tilt:90,material}).state.safeTransfer,true);assert.equal(observe('solid-reagent-transfer',{tilt:0,material}).state.safeTransfer,false);assert.equal(observe('solid-reagent-transfer',{tilt:0,material},{run:1}).state.transferred,true)}});
test('CO2低处先熄与继续倾倒阶段有区别',()=>{const start=observe('co2-extinguishes-candles'),low=observe('co2-extinguishes-candles',{}, {add:1}),both=observe('co2-extinguishes-candles',{}, {add:1,collect:1});assert.equal(start.state.lowerCandle,true);assert.equal(low.state.lowerCandle,false);assert.equal(low.state.upperCandle,true);assert.equal(both.state.upperCandle,false)});

test('制氧综合实验先排空气再收集，三类检验分开且撤管后停火',()=>{
 assert.equal(observe('oxygen-preparation-practical',{step:1},{add:1}).state.gasReady,false);
 assert.equal(observe('oxygen-preparation-practical',{step:3},{collect:1}).state.gasReady,false);
 for(const test of [0,1,2]) {
  const result=observe('oxygen-preparation-practical',{step:3,test},{add:1,collect:1});
  assert.equal(result.state.glowingSplint,test===0);
  assert.equal(result.state.carbonBurning,test===1);
  assert.equal(result.state.sparks,test===2);
 }
 assert.equal(observe('oxygen-preparation-practical',{step:3,test:1,productTest:1},{add:1,collect:1}).state.liquidColor,'milky-white');
 assert.equal(observe('oxygen-preparation-practical',{step:4},{add:1,collect:1}).state.heating,true);
 const done=observe('oxygen-preparation-practical',{step:5},{add:1,collect:1});
 assert.equal(done.state.heating,false); assert.equal(done.state.gasReady,true);
});
test('白磷三组独立比较，水中停氧不熄灭铜片上的白磷',()=>{
 for(const oxygen of [0,1]) {
  const hot=observe('combustion-conditions-phosphorus',{oxygen,temperature:1},{ignite:1});
  assert.equal(hot.state.copperWhiteBurning,true);
  assert.equal(hot.state.underwaterWhiteBurning,oxygen===1);
  assert.equal(hot.state.redPhosphorusBurning,false);
  const cold=observe('combustion-conditions-phosphorus',{oxygen,temperature:0},{ignite:1});
  assert.equal(cold.state.copperWhiteBurning,false); assert.equal(cold.state.underwaterWhiteBurning,false);
 }
 const off=observe('combustion-conditions-phosphorus',{oxygen:1,temperature:1},{ignite:2});
 assert.equal(off.state.copperWhiteBurning,false); assert.equal(off.state.underwaterWhiteBurning,false);
});
test('蒸馏先开始加热，初馏液与最终收集分开且停热不持续产液',()=>{
 const idle=observe('water-distillation',{stage:2});
 assert.equal(idle.state.heating,false); near(num(idle,'distillate'),0);
 const first=observe('water-distillation',{stage:1},{add:1});
 assert.equal(first.state.firstDistillate,true); near(num(first,'distillate'),0);
 near(num(observe('water-distillation',{stage:2},{add:1}),'distillate'),1);
 const stopped=observe('water-distillation',{stage:2,heating:0},{add:1});
 assert.equal(stopped.state.heating,false); near(num(stopped,'distillate'),0);
});
test('酸碱综合先生成沉淀再加酸溶解，不能在准备阶段显示沉淀',()=>{
 const initial=observe('acid-base-properties-practical',{stage:3,process:0});
 const formed=observe('acid-base-properties-practical',{stage:3,process:1});
 const dissolved=observe('acid-base-properties-practical',{stage:3,process:2});
 near(num(initial,'precipitate'),0); assert.equal(formed.state.precipitateColor,'blue');
 near(num(dissolved,'precipitate'),0); assert.equal(dissolved.state.precipitateColor,'none');
});
test('简易灭火器覆盖组熄灭时空杯对照继续燃烧，产气组只在加入酸后熄灭',()=>{
 const cover=observe('soda-acid-co2-extinguisher',{stage:1},{add:1});
 assert.equal(cover.state.coverFlame,false); assert.equal(cover.state.controlFlame,true);
 assert.equal(cover.state.co2Flame,true); assert.equal(cover.state.gas,'none');
 const co2=observe('soda-acid-co2-extinguisher',{stage:3},{add:1});
 assert.equal(co2.state.co2Flame,false); assert.equal(co2.state.controlFlame,true); assert.equal(co2.state.gas,'CO₂');
});
test('食盐水稀释保持溶质质量，配液与稀释后的浓度分别为6%和3%',()=>{
 const stock=observe('prepare-saline-by-mass',{step:3});
 const diluted=observe('prepare-saline-by-mass',{step:5});
 near(num(stock,'soluteMass'),num(diluted,'soluteMass'));
 near(num(stock,'concentration'),.06); near(num(diluted,'concentration'),.03);
 near(num(diluted,'stockMass')*.06,num(diluted,'dilutedMass')*.03);
});

// 人教版化学80项为独立审查基线；上海版条目复用其sceneVariant，下面单独核对。
const chemistry = all.filter(e=>e.bookId.startsWith('chemistry-')&&!e.bookId.includes('-sh-'));
test('上海版复用条目均有已登记模型，化学复用条目有审查记录',()=>{
 for(const exp of all.filter(e=>e.bookId.includes('-sh-')&&e.implementationStatus!=='rig-pending')){
  const o=simulate(exp,Object.fromEntries(exp.parameters.map(p=>[p.key,p.default])),10,emptyAction());
  assert(!o.warnings.some(w=>w.includes('尚无专属模型')),exp.id+'复用了未登记的变体');
  if(exp.bookId.startsWith('chemistry-'))assert(CHEMISTRY_MODEL_LIMITS[exp.sceneVariant],exp.id+'缺化学审查记录');
 }
});
let chemistryMatrixCases = 0;
test('化学80项均有独立审查记录，观察/记录/收集不触发首次反应',()=>{
 assert.equal(chemistry.length,80);
 for(const exp of chemistry){
  assert(CHEMISTRY_MODEL_LIMITS[exp.sceneVariant],exp.id+'缺简化记录');
  const params=Object.fromEntries(exp.parameters.map(p=>[p.key,p.default]));
  const idle=simulate(exp,params,10,emptyAction());
  assert.equal(idle.state.modelReviewed,true,exp.id+'未覆盖');
  for(const action of ['observe','record','collect']){
   const o=simulate(exp,params,10,{id:action,t:10,counts:{[action]:1}});
   assert.deepEqual(o.state,idle.state,exp.id+'/'+action+'不应代替加入或开始');
  }
 }
});
test('化学80项的全部参数选项/单变量边界与动作组合输出有限',()=>{
 for(const exp of chemistry){
  const defaults=Object.fromEntries(exp.parameters.map(p=>[p.key,p.default]));
  const variants=[defaults,...exp.parameters.flatMap(p=>(p.options?.map(o=>o.value)??[p.min,p.max]).map(value=>({...defaults,[p.key]:value})))];
  const primary=exp.actions[0]?.id??'run';
  for(const params of variants)for(const counts of [{},{[primary]:1},{[primary]:2},{[primary]:1,observe:1,stir:1,collect:1}])for(const time of [0,10]){
   const o=simulate(exp,params,time,{id:primary,t:0,counts});chemistryMatrixCases++;
   assert(o.phenomenon.trim(),exp.id);assert.equal(o.state.modelReviewed,true,exp.id);
   for(const [key,value]of Object.entries(o.state)){if(typeof value==='number')assert(Number.isFinite(value),exp.id+'/'+key);if(Array.isArray(value))assert(value.every(Number.isFinite),exp.id+'/'+key)}
  }
 }
});
if(process.argv.includes('--chemistry-report'))console.log(JSON.stringify({chemistryAudit:chemistry.map(e=>({id:e.id,title:e.title,variant:e.sceneVariant,limits:CHEMISTRY_MODEL_LIMITS[e.sceneVariant]}))},null,2));

test('浓盐酸开瓶形成白雾而浓硫酸无白雾，白雾不写成烟',()=>{
 const initial=observe('acid-appearance',{acid:0}),observed=observe('acid-appearance',{acid:0},{observe:1}),hcl=observe('acid-appearance',{acid:0},{run:1}),sulfuric=observe('acid-appearance',{acid:1},{run:1});
 assert.equal(initial.state.bottleOpen,false);assert.equal(initial.state.whiteMist,false);assert.equal(observed.state.whiteMist,false);
 assert.equal(hcl.state.whiteMist,true);assert.equal(hcl.state.mist,'white');assert.equal(hcl.state.smoke,'none');assert(hcl.phenomenon.includes('小液滴'));assert.equal(sulfuric.state.whiteMist,false);
});
test('CO2综合实验石蕊通气变红，停止通气加热后恢复紫色',()=>{
 const e=all.find(e=>e.sceneVariant==='co2-preparation-properties-practical')!;const option=e.parameters.find(p=>p.key==='test')!.options!.find(o=>o.label==='紫色石蕊')!;assert(option,'数据应接入紫色石蕊');
 const initial=observe(e.sceneVariant,{test:option.value,litmusHeat:1}),red=observe(e.sceneVariant,{test:option.value,litmusHeat:0},{add:1,collect:1}),purple=observe(e.sceneVariant,{test:option.value,litmusHeat:1},{add:1,collect:1});
 assert.equal(initial.state.liquidColor,'purple');assert.equal(initial.state.litmusRestored,false);assert.equal(red.state.liquidColor,'red');assert.equal(red.state.gasFlowingToLitmus,true);
 assert.equal(purple.state.liquidColor,'purple');assert.equal(purple.state.litmusRestored,true);assert.equal(purple.state.carbonicAcidDecomposed,true);assert.equal(purple.state.gasFlowingToLitmus,false);assert(purple.phenomenon.includes('停止通气'));
});
test('碱通CO2区分石灰水白色沉淀和NaOH无明显现象',()=>{
 const test=all.find(e=>e.sceneVariant==='base-properties-comparison')!.parameters.find(p=>p.key==='test')!.options!.find(o=>o.label==='二氧化碳')!.value;
 const calcium=observe('base-properties-comparison',{base:1,test},{add:1}),sodium=observe('base-properties-comparison',{base:0,test},{add:1}),idle=observe('base-properties-comparison',{base:1,test});
 assert.equal(calcium.state.precipitateColor,'white');assert(String(calcium.state.formula).includes('CaCO₃↓'));assert.equal(sodium.state.precipitateColor,'none');assert.equal(sodium.state.reacted,true);assert.equal(sodium.state.liquidColor,'clear');assert(String(sodium.state.formula).includes('2NaOH'));assert(sodium.phenomenon.includes('无明显'));assert.equal(idle.state.reacted,false);
});
test('镁锌铁与两种稀酸生成对应盐，铜均不产氢',()=>{
 const sulfate=['Mg + H₂SO₄ → MgSO₄ + H₂↑','Zn + H₂SO₄ → ZnSO₄ + H₂↑','Fe + H₂SO₄ → FeSO₄ + H₂↑'];
 for(const acid of [0,1])for(const metal of [0,1,2,3]){
  const idle=observe('metals-acid-hydrogen',{acid,metal}),o=observe('metals-acid-hydrogen',{acid,metal},{add:1});assert.equal(idle.state.gas,'none');
  assert.equal(o.state.gas,metal===3?'none':'H₂');if(metal===3)near(num(o,'bubbles'),0);else if(acid===1)assert.equal(o.state.formula,sulfate[metal]);else assert(String(o.state.formula).includes('2HCl'));
 }
});
test('喷水通CO2纸花取出吹干后碳酸分解并恢复紫色',()=>{
 const e=all.find(e=>e.sceneVariant==='co2-water-litmus')!,paper=e.parameters.find(p=>p.key==='paper')!.options!.find(o=>o.label==='喷水后通CO₂再吹干')!;assert(paper,'数据应提供教材吹干阶段');
 const wet=observe(e.sceneVariant,{paper:3},{add:1}),dry=observe(e.sceneVariant,{paper:paper.value},{add:1});assert.equal(wet.state.liquidColor,'red');assert.equal(dry.state.liquidColor,'purple');assert.equal(dry.state.restored,true);assert.equal(dry.state.wet,false);assert.equal(dry.state.carbonDioxideReleased,true);assert.equal(dry.state.formula,'H₂CO₃ → CO₂↑ + H₂O');assert(dry.phenomenon.includes('吹风机'));assert.equal(observe(e.sceneVariant,{paper:paper.value}).state.restored,false);
});

// 所有实际条目都应能在UI允许的默认/最小/最大输入下产生有限状态。
for(const exp of all){
 for(const mode of ['default','min','max'] as const){
  const params=Object.fromEntries(exp.parameters.map(p=>[p.key,p[mode]]));
  try{const o=simulate(exp,params,10,emptyAction());assert(o.phenomenon.trim());for(const [key,value]of Object.entries(o.state)){if(typeof value==='number')assert(Number.isFinite(value),`${key}非有限`);if(Array.isArray(value))assert(value.every(Number.isFinite));}}
  catch(err){failures.push(`${exp.id}/${mode}: ${String(err)}`)}
 }
}
console.log(JSON.stringify({acceptancePassed:passed,acceptanceFailed:failures.length,experiments:all.length,boundaryCases:all.length*3,chemistryActivities:chemistry.length,chemistryMatrixCases,failures},null,2));
process.exitCode=failures.length?1:0;

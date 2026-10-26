import assert from 'node:assert/strict';
import { books } from '../src/data/books';
import { simulate } from '../src/sim/registry';
import { emptyAction, type Observation } from '../src/sim/core';

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
test('木条在氧气燃旺而在CO2熄灭',()=>{assert.equal(observe('oxygen-carbon-dioxide-splint',{gas:0}).state.flame,true);assert.equal(observe('oxygen-carbon-dioxide-splint',{gas:1}).state.flame,false)});
test('确认纯净且点燃的氢气显示燃烧与水生成',()=>{const a=observe('hydrogen-combustion-water',{gas:1,purity:0}),b=observe('hydrogen-combustion-water',{gas:1,purity:1});assert.equal(a.state.flame,false);assert.equal(b.state.flame,true);assert.equal(b.state.gas,'H₂O')});
test('观察动作不点燃且第二次点燃动作能熄灭',()=>{assert.equal(observe('sulfur-burning',{}, {observe:1}).state.flame,false);assert.equal(observe('sulfur-burning',{}, {ignite:1}).state.flame,true);assert.equal(observe('sulfur-burning',{}, {ignite:2}).state.flame,false)});
test('金属酸反应方程按样品变化',()=>{for(const [metal,symbol]of [[0,'Mg'],[1,'Zn'],[2,'Fe']] as const){const o=observe('metals-acid-hydrogen',{metal},{add:1});assert(String(o.state.formula).startsWith(symbol+' +'));assert.equal(o.state.gas,'H₂')}assert.equal(observe('metals-acid-hydrogen',{metal:3},{add:1}).state.gas,'none')});
test('未罩住的酚酞仍无色',()=>assert.equal(observe('ammonia-diffusion-phenolphthalein',{cover:0}).state.liquidColor,'colorless'));
test('小孔变大亮度示意应增加',()=>assert(num(observe('pinhole-camera',{aperture:2}),'imageBrightness')>num(observe('pinhole-camera',{aperture:1}),'imageBrightness')));
test('气体扩散对象与教材二氧化氮一致',()=>assert(observe('gas-diffusion').phenomenon.includes('二氧化氮')));

test('带火星木条氧气复燃状态兼容火焰装置',()=>{const air=observe('glowing-splint-oxygen',{gas:0}),oxygen=observe('glowing-splint-oxygen',{gas:1});assert.equal(air.state.flame,false);assert.equal(oxygen.state.flame,true);assert.equal(oxygen.state.glowingSplint,true)});
test('红磷模型名称与教材一致并响应熄灭',()=>{const lit=observe('phosphorus-air-volume',{}, {ignite:1}),off=observe('phosphorus-air-volume',{}, {ignite:2});assert(lit.phenomenon.includes('红磷'));assert(!lit.phenomenon.includes('白磷'));assert.equal(lit.state.flame,true);assert.equal(off.state.flame,false)});

// 所有实际条目都应能在UI允许的默认/最小/最大输入下产生有限状态。
for(const exp of all){
 for(const mode of ['default','min','max'] as const){
  const params=Object.fromEntries(exp.parameters.map(p=>[p.key,p[mode]]));
  try{const o=simulate(exp,params,10,emptyAction());assert(o.phenomenon.trim());for(const [key,value]of Object.entries(o.state)){if(typeof value==='number')assert(Number.isFinite(value),`${key}非有限`);if(Array.isArray(value))assert(value.every(Number.isFinite));}}
  catch(err){failures.push(`${exp.id}/${mode}: ${String(err)}`)}
 }
}
console.log(JSON.stringify({acceptancePassed:passed,acceptanceFailed:failures.length,experiments:all.length,boundaryCases:all.length*3,failures},null,2));
process.exitCode=failures.length?1:0;

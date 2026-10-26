import { books } from '../src/data/books';
import { simulate } from '../src/sim/registry';
import { emptyAction } from '../src/sim/core';
import fs from 'node:fs';
const unchanged:{id:string,title:string,variant:string,key:string,label:string}[]=[];
let checked=0;
for(const e of books.flatMap(b=>b.experiments)){
 const p=Object.fromEntries(e.parameters.map(x=>[x.key,x.default]));
 for(const x of e.parameters){
  if(x.min===x.max)continue;
  checked++;
  const a=simulate(e,{...p,[x.key]:x.min},5,{...emptyAction(),counts:{run:1,add:1,ignite:1}});
  const b=simulate(e,{...p,[x.key]:x.max},5,{...emptyAction(),counts:{run:1,add:1,ignite:1}});
  if(JSON.stringify(a)===JSON.stringify(b))unchanged.push({id:e.id,title:e.title,variant:e.sceneVariant,key:x.key,label:x.label});
 }
}
const result={parametersChecked:checked,unchangedCount:unchanged.length,unchanged,note:'这里只检查纯模型输出。未改变输出的参数也可能直接驱动3D器材位置，需对照场景代码人工确认，不能直接算作失败。'};
console.log(JSON.stringify(result,null,2));
if(process.argv.includes('--report')){fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/parameter-audit.json',JSON.stringify(result,null,2))}

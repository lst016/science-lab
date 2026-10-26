import type { Book } from './types';
import { physics8a } from './physics8a';
import { physics8b } from './physics8b';
import { physics9 } from './physics9';
import { chemistry9a } from './chemistry9a';
import { chemistry9b } from './chemistry9b';
const sortByPage = <T extends {pdfPage:number}>(items:T[]) => [...items].sort((a,b)=>a.pdfPage-b.pdfPage);
export const books: Book[] = [
 {id:'physics-8-1',title:'物理 · 八年级上册',shortTitle:'八年级物理',subject:'physics',grade:'八年级',volume:'上册',color:'#657f65',description:'从测量和声光现象出发，在纸页上观察运动、温度与成像。',sourceFile:'../教材PDF/补充版本/六三制/物理/人教版/0486_物理 人教版 八年级 上册 2022版.pdf',sourceId:'0486',pdfPageCount:170,editionNote:'人教版；来源标注2022版（课程标准标签），具体印次见原书。',coverageNote:'已核实原有实验/演示，并纳入明确的想想做做与跨学科实践制作活动。',experiments:sortByPage(physics8a)},
 {id:'physics-8-2',title:'物理 · 八年级下册',shortTitle:'八年级物理',subject:'physics',grade:'八年级',volume:'下册',color:'#b68050',description:'把力、压强、浮力与简单机械变成可比较、可测量的立体实验。',sourceFile:'../教材PDF/补充版本/六三制/物理/人教版/0487_物理 人教版 八年级 下册 2022版.pdf',sourceId:'0487',pdfPageCount:131,editionNote:'人教版；来源标注2022版（课程标准标签），具体印次见原书。',coverageNote:'已核实原有实验/演示，并纳入明确的想想做做与跨学科实践制作活动。',experiments:sortByPage(physics8b)},
 {id:'physics-9',title:'物理 · 九年级全一册',shortTitle:'九年级物理',subject:'physics',grade:'九年级',volume:'全一册',color:'#697b94',description:'用热学、电路与电磁装置，追踪能量的转化。',sourceFile:'../教材PDF/补充版本/六三制/物理/人教版/0485_物理 人教版 九年级 全一册 2022版.pdf',sourceId:'0485',pdfPageCount:218,editionNote:'人教版；来源标注2022版（课程标准标签），具体印次见原书。',coverageNote:'已核实34个教材实验/演示活动；并补入明确的课内制作与实践活动。',experiments:sortByPage(physics9)},
 {id:'chemistry-9-1',title:'化学 · 九年级上册',shortTitle:'九年级化学',subject:'chemistry',grade:'九年级',volume:'上册',color:'#9a7558',description:'观察气体、分子、水和燃烧，认识物质的组成与变化。',sourceFile:'../教材PDF/补充版本/六三制/化学/人教版/0181_化学 人教版 九年级 上册 2024版.pdf',sourceId:'0181',pdfPageCount:199,editionNote:'人教版；来源标注2024版，具体印次见原书。',coverageNote:'已汇总教材实验与实践活动条目。',experiments:sortByPage(chemistry9a)},
 {id:'chemistry-9-2',title:'化学 · 九年级下册',shortTitle:'九年级化学',subject:'chemistry',grade:'九年级',volume:'下册',color:'#76668b',description:'比较金属、溶液与酸碱反应，用实验理解材料与生活。',sourceFile:'../教材PDF/补充版本/六三制/化学/人教版/0186_化学 人教版 九年级 下册 2024版.pdf',sourceId:'0186',pdfPageCount:127,editionNote:'人教版；来源标注2024版，具体印次见原书。',coverageNote:'已汇总教材实验与实践活动条目。',experiments:sortByPage(chemistry9b)},
];
export const experiments = books.flatMap(book=>book.experiments);
export const getBookById = (id:string) => books.find(book=>book.id===id);
export const getExperimentsByBookId = (id:string) => getBookById(id)?.experiments ?? [];

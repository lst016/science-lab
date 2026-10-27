import type { Book } from './types';
import { physics8a } from './physics8a';
import { physics8b } from './physics8b';
import { physics9 } from './physics9';
import { chemistry9a } from './chemistry9a';
import { chemistry9b } from './chemistry9b';
import { shPhysics8a } from './shPhysics8a';
import { shPhysics8b } from './shPhysics8b';
import { shPhysics9a } from './shPhysics9a';
import { shChemistry8 } from './shChemistry8';
import { shChemistry9 } from './shChemistry9';
const sortByPage = <T extends {pdfPage:number}>(items:T[]) => [...items].sort((a,b)=>a.pdfPage-b.pdfPage);
export const books: Book[] = [
 {edition:'pep',id:'physics-8-1',title:'物理 · 八年级上册',shortTitle:'八年级物理',subject:'physics',grade:'八年级',volume:'上册',color:'#657f65',description:'从测量和声光现象出发，在纸页上观察运动、温度与成像。',sourceFile:'../教材PDF/补充版本/六三制/物理/人教版/0486_物理 人教版 八年级 上册 2022版.pdf',sourceId:'0486',pdfPageCount:170,editionNote:'人教版；来源标注2022版（课程标准标签），具体印次见原书。',coverageNote:'已核实原有实验/演示，并纳入明确的想想做做与跨学科实践制作活动。',experiments:sortByPage(physics8a)},
 {edition:'pep',id:'physics-8-2',title:'物理 · 八年级下册',shortTitle:'八年级物理',subject:'physics',grade:'八年级',volume:'下册',color:'#b68050',description:'把力、压强、浮力与简单机械变成可比较、可测量的立体实验。',sourceFile:'../教材PDF/补充版本/六三制/物理/人教版/0487_物理 人教版 八年级 下册 2022版.pdf',sourceId:'0487',pdfPageCount:131,editionNote:'人教版；来源标注2022版（课程标准标签），具体印次见原书。',coverageNote:'已核实原有实验/演示，并纳入明确的想想做做与跨学科实践制作活动。',experiments:sortByPage(physics8b)},
 {edition:'pep',id:'physics-9',title:'物理 · 九年级全一册',shortTitle:'九年级物理',subject:'physics',grade:'九年级',volume:'全一册',color:'#697b94',description:'用热学、电路与电磁装置，追踪能量的转化。',sourceFile:'../教材PDF/补充版本/六三制/物理/人教版/0485_物理 人教版 九年级 全一册 2022版.pdf',sourceId:'0485',pdfPageCount:218,editionNote:'人教版；来源标注2022版（课程标准标签），具体印次见原书。',coverageNote:'已核实34个教材实验/演示活动；并补入明确的课内制作与实践活动。',experiments:sortByPage(physics9)},
 {edition:'pep',id:'chemistry-9-1',title:'化学 · 九年级上册',shortTitle:'九年级化学',subject:'chemistry',grade:'九年级',volume:'上册',color:'#9a7558',description:'观察气体、分子、水和燃烧，认识物质的组成与变化。',sourceFile:'../教材PDF/补充版本/六三制/化学/人教版/0181_化学 人教版 九年级 上册 2024版.pdf',sourceId:'0181',pdfPageCount:199,editionNote:'人教版；来源标注2024版，具体印次见原书。',coverageNote:'已汇总教材实验与实践活动条目。',experiments:sortByPage(chemistry9a)},
 {edition:'pep',id:'chemistry-9-2',title:'化学 · 九年级下册',shortTitle:'九年级化学',subject:'chemistry',grade:'九年级',volume:'下册',color:'#76668b',description:'比较金属、溶液与酸碱反应，用实验理解材料与生活。',sourceFile:'../教材PDF/补充版本/六三制/化学/人教版/0186_化学 人教版 九年级 下册 2024版.pdf',sourceId:'0186',pdfPageCount:127,editionNote:'人教版；来源标注2024版，具体印次见原书。',coverageNote:'已汇总教材实验与实践活动条目。',experiments:sortByPage(chemistry9b)},
 {edition:'shanghai',id:'physics-sh-8-1',title:'物理 · 八年级上册',shortTitle:'八年级物理',subject:'physics',grade:'八年级',volume:'上册',color:'#5f7f73',description:'从测量出发，经过运动、声与光，走到力与运动。',sourceFile:'../教材PDF/补充版本/五四制/物理/沪科技版/0500_物理 沪科技版 八年级 上册 2022版.pdf',sourceId:'0500',pdfPageCount:157,editionNote:'上海科学技术出版社（五·四学制）；2024年8月第1版，2025年8月第2次印刷。',coverageNote:'收录"学生实验""自主活动"与跨学科实践中的实验类条目。',experiments:sortByPage(shPhysics8a)},
 {edition:'shanghai',id:'physics-sh-8-2',title:'物理 · 八年级下册',shortTitle:'八年级物理',subject:'physics',grade:'八年级',volume:'下册',color:'#4f6d8a',description:'密度与压强、浮力、简单机械，再到物态变化。',sourceFile:'../教材PDF/补充版本/五四制/物理/沪科技版/0501_物理 沪科技版 八年级 下册 2022版.pdf',sourceId:'0501',pdfPageCount:137,editionNote:'上海科学技术出版社（五·四学制）；2024年8月第1版，2025年8月第2次印刷。',coverageNote:'收录"学生实验""自主活动"与跨学科实践中的实验类条目。',experiments:sortByPage(shPhysics8b)},
 {edition:'shanghai',id:'physics-sh-9-1',title:'物理 · 九年级上册',shortTitle:'九年级物理',subject:'physics',grade:'九年级',volume:'上册',color:'#a5803a',description:'内能、静电与电流、欧姆定律和电功率。',sourceFile:'../教材PDF/补充版本/五四制/物理/沪科技版/0499_物理 沪科技版 九年级 上册 2022版.pdf',sourceId:'0499',pdfPageCount:129,editionNote:'上海科学技术出版社（五·四学制）；2024年8月第1版，2025年8月第2次印刷。九年级下册未在已采集来源中找到，暂缺。',coverageNote:'收录"学生实验""自主活动"与跨学科实践中的实验类条目。',experiments:sortByPage(shPhysics9a)},
 {edition:'shanghai',id:'chemistry-sh-8',title:'化学 · 八年级全一册',shortTitle:'八年级化学',subject:'chemistry',grade:'八年级',volume:'全一册',color:'#9c5442',description:'走进实验室，认识空气、氧气、二氧化碳、水与碳单质。',sourceFile:'../教材PDF/补充版本/五四制/化学/沪科技版/0613_化学 沪科技版 八年级 全一册 2022版.pdf',sourceId:'0613',pdfPageCount:186,editionNote:'上海科学技术出版社（五·四学制）；2024年8月第1版，2025年8月第2次印刷。',coverageNote:'收录"实验探究"栏目与跨学科实践中的动手实验。',experiments:sortByPage(shChemistry8)},
 {edition:'shanghai',id:'chemistry-sh-9',title:'化学 · 九年级全一册',shortTitle:'九年级化学',subject:'chemistry',grade:'九年级',volume:'全一册',color:'#356f6a',description:'溶液、酸碱盐、燃料与金属，在变化中认识物质。',sourceFile:'../教材PDF/补充版本/五四制/化学/沪科技版/0612_化学 沪科技版 九年级 全一册 2022版.pdf',sourceId:'0612',pdfPageCount:154,editionNote:'上海科学技术出版社（五·四学制）；2024年8月第1版，2025年8月第2次印刷。',coverageNote:'收录"实验探究"栏目与跨学科实践中的动手实验。',experiments:sortByPage(shChemistry9)},
];
export const experiments = books.flatMap(book=>book.experiments);
export const getBookById = (id:string) => books.find(book=>book.id===id);
export const getExperimentsByBookId = (id:string) => getBookById(id)?.experiments ?? [];
export const booksOf = (edition:Book['edition']) => books.filter(book=>book.edition===edition);

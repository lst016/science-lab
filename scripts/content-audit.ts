import { books } from '../src/data/books';
import { SCENE_FAMILIES } from '../src/data/types';
import fs from 'node:fs';

const failures: string[] = [];
const warnings: string[] = [];
const ids = new Set<string>();
const expected = ['physics-8-1','physics-8-2','physics-9','chemistry-9-1','chemistry-9-2'];
const assert = (ok: unknown, message: string) => { if (!ok) failures.push(message); };
assert(books.length === 5, '书目应为5册');
for (const id of expected) assert(books.some(b => b.id === id), `缺少教材 ${id}`);
const counts: Record<string, number> = {};
const families: Record<string, number> = {};
for (const book of books) {
  assert(book.experiments.length > 0, `${book.id}实验为空`);
  assert(book.pdfPageCount > 0 && Number.isInteger(book.pdfPageCount), `${book.id}PDF页数无效`);
  counts[book.id] = book.experiments.length;
  for (const e of book.experiments) {
    assert(!ids.has(e.id), `重复实验ID ${e.id}`); ids.add(e.id);
    assert(e.bookId === book.id, `${e.id}所属书不一致`);
    assert(SCENE_FAMILIES.includes(e.family), `${e.id}未知场景族 ${e.family}`);
    assert(Number.isInteger(e.pdfPage) && e.pdfPage >= 1 && e.pdfPage <= book.pdfPageCount, `${e.id}来源页越界`);
    for (const key of ['chapter','title','sceneVariant','objective','conclusion'] as const) assert(typeof e[key] === 'string' && e[key].trim().length > 0, `${e.id}缺少${key}`);
    assert(e.equipment.length > 0 && e.equipment.every(x => x.trim()), `${e.id}缺器材`);
    assert(e.steps.length >= 2 && e.steps.every(x => x.trim().length > 3), `${e.id}步骤不完整`);
    assert(!!e.model.description && !!e.model.formula && !!e.model.limits, `${e.id}模型说明不完整`);
    if (!e.sourceVerified) warnings.push(`${e.id}来源未核实`);
    const keys = new Set<string>();
    for (const p of e.parameters) {
      assert(!keys.has(p.key), `${e.id}重复参数${p.key}`); keys.add(p.key);
      assert([p.min,p.max,p.step,p.default].every(Number.isFinite), `${e.id}/${p.key}参数非有限数`);
      assert(p.min <= p.default && p.default <= p.max && p.step > 0, `${e.id}/${p.key}滑条范围或默认值无效`);
      assert(!!p.label, `${e.id}/${p.key}缺少可读标签`);
      for (const o of p.options ?? []) assert(o.value >= p.min && o.value <= p.max && !!o.label, `${e.id}/${p.key}选项越界`);
    }
    assert(new Set(e.actions.map(a => a.id)).size === e.actions.length, `${e.id}动作ID重复`);
    families[e.family] = (families[e.family] ?? 0) + 1;
  }
}
const report = { books: books.length, experiments: ids.size, counts, families, failures, warnings };
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--report')) {
  fs.mkdirSync('artifacts', {recursive: true});
  fs.writeFileSync('artifacts/content-audit.json', JSON.stringify(report, null, 2));
}
process.exitCode = failures.length ? 1 : 0;

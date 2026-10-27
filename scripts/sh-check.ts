/**
 * 上海版专属装置验收：`tsx scripts/sh-check.ts [组名]`，不带组名检查全部组。
 * 检查定义与数据条目对应、模型输出有限、观察/记录/收集不改变模型状态、装置已登记。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { books } from '../src/data/books';
import { SH_VARIANT_GROUPS } from '../src/data/sh-variants';
import { simulate } from '../src/sim/registry';
import { simulateShanghai } from '../src/sim/shanghai';
import { buildCtx, emptyAction, type ActionState } from '../src/sim/core';

const only = process.argv[2];
const all = books.flatMap(b => b.experiments);
const rigText = Object.keys(SH_VARIANT_GROUPS).map(g => fs.readFileSync(`src/three/rigs/sh-${g}.tsx`, 'utf8')).join('\n');
const failures: string[] = [], notes: string[] = [];
const names = new Set<string>();
let cases = 0, checked = 0;

for (const [group, defs] of Object.entries(SH_VARIANT_GROUPS)) {
  for (const [key, def] of Object.entries(defs)) {
    try {
      assert.match(def.variant, /^sh-[a-z0-9-]+$/, `${key}: variant 须为 sh-<slug>`);
      assert(!names.has(def.variant), `${key}: variant ${def.variant} 重复`); names.add(def.variant);
      if (only && group !== only) continue;
      const [bookId] = key.split('/');
      const exp = all.find(e => e.bookId === bookId && e.sceneVariant === def.variant);
      assert(exp, `${key}: 数据文件中没有对应的 pending 条目（检查 bookId/slug）`);
      assert.equal(exp.implementationStatus, 'content-ready', `${key}: 未变为 content-ready`);
      assert(def.formula.trim() && def.limits.trim(), `${key}: formula/limits 不能为空`);
      assert(rigText.includes(`'${def.variant}'`), `${key}: SH_RIGS_* 中没有 '${def.variant}' 装置`);
      const defaults = Object.fromEntries(exp.parameters.map(p => [p.key, p.default]));
      const variants = [defaults, ...exp.parameters.flatMap(p => (p.options?.map(o => o.value) ?? [p.min, p.max]).map(v => ({ ...defaults, [p.key]: v })))];
      const ids = exp.actions.map(a => a.id), primary = ids[0];
      const countsList: Record<string, number>[] = [{}, { [primary]: 1 }, { [primary]: 2 }, Object.fromEntries(ids.map(id => [id, 1])), Object.fromEntries(ids.map(id => [id, 3]))];
      const run = (params: Record<string, number>, time: number, counts: Record<string, number>, id: string | null = primary) => {
        const action: ActionState = { ...emptyAction(), id: Object.keys(counts).length ? id : null, t: 0, counts };
        assert(simulateShanghai(buildCtx(exp, params, time, action)), `${key}: simulateSh* 未返回该变体`);
        return simulate(exp, params, time, action);
      };
      const states = new Set<string>();
      for (const params of variants) for (const counts of countsList) for (const time of [0, 2, 10]) {
        const o = run(params, time, counts); cases++;
        assert(o.phenomenon.trim(), `${key}: phenomenon 为空`);
        assert(!o.warnings.some(w => w.includes('尚无专属模型')), `${key}: 变体未登记`);
        for (const r of o.readings) assert(r.label && r.value && !r.value.includes('NaN') && !r.value.includes('Infinity'), `${key}: 读数无效 ${JSON.stringify(r)}`);
        for (const [k, v] of Object.entries(o.state)) {
          if (typeof v === 'number') assert(Number.isFinite(v), `${key}: state.${k} 非有限`);
          if (Array.isArray(v)) assert(v.every(Number.isFinite), `${key}: state.${k} 含非有限值`);
        }
        if (bookId.startsWith('chemistry-')) assert.equal(o.state.modelReviewed, true, `${key}: 化学条目缺审查记录`);
        states.add(JSON.stringify(o.state));
      }
      // 观察、记录、收集只读取现象，不能代替加入、点燃或开始。
      for (const params of variants) {
        const idle = run(params, 10, {});
        for (const id of ['observe', 'record', 'collect']) assert.deepEqual(run(params, 10, { [id]: 1 }, id).state, idle.state, `${key}: ${id} 动作改变了模型状态`);
      }
      if (states.size < 2) notes.push(`${key}: 参数与动作都不改变模型状态（静态模型）`);
      checked++;
    } catch (err) { failures.push(err instanceof Error ? err.message : String(err)); }
  }
}
const pending = books.filter(b => b.edition === 'shanghai').flatMap(b => b.experiments).filter(e => e.implementationStatus === 'rig-pending').map(e => `${e.id} ${e.sceneVariant}`);
console.log(JSON.stringify({ group: only ?? 'all', checked, cases, failures, notes, pendingRemaining: pending.length, ...(only ? {} : { pending }) }, null, 2));
process.exitCode = failures.length ? 1 : 0;

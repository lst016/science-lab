import type { Experiment, SceneFamily } from './types';
import { physics8a } from './physics8a';
import { physics8b } from './physics8b';
import { physics9 } from './physics9';
import { chemistry9a } from './chemistry9a';
import { chemistry9b } from './chemistry9b';
import { actionsFor } from './content-helpers';
import { SH_VARIANTS } from './sh-variants';

/** 人教版已建好装置与模型的实验，按 sceneVariant 索引，供上海版复用。 */
const templates = new Map<string, Experiment>();
for (const e of [...physics8a, ...physics8b, ...physics9, ...chemistry9a, ...chemistry9b]) if (!templates.has(e.sceneVariant)) templates.set(e.sceneVariant, e);
export const hasTemplate = (variant: string) => templates.has(variant);

interface ShanghaiBase { page: number; chapter: string; title: string; type: Experiment['sourceType']; steps: string[]; conclusion: string; equipment?: string[]; safety?: string }
/** 与人教版某个已建实验装置相同：继承其场景族、参数、动作和模型。 */
export interface ShanghaiReuse extends ShanghaiBase { variant: string }
/** 上海版独有活动：在 sh-variants-*.ts 中登记了专属装置时为 content-ready，否则 3D 场景显示待建提示。 */
export interface ShanghaiPending extends ShanghaiBase { pending: SceneFamily; slug: string }

export function shanghaiBook(bookId: string) {
  let count = 0;
  return (spec: ShanghaiReuse | ShanghaiPending): Experiment => {
    const id = `${bookId}-${String(++count).padStart(2, '0')}`;
    const common = { id, bookId, pdfPage: spec.page, chapter: spec.chapter, title: spec.title, sourceType: spec.type, steps: spec.steps, conclusion: spec.conclusion, sourceVerified: true, objective: `通过${spec.title.replace(/^探究|^研究|^观察/, '')}，用比较或测量证据理解相应规律。`, ...(spec.safety ? { safety: spec.safety } : {}) };
    if ('variant' in spec) {
      const t = templates.get(spec.variant);
      if (!t) throw new Error(`${id}：sceneVariant「${spec.variant}」不存在于人教版数据`);
      return { ...t, ...common, family: t.family, sceneVariant: t.sceneVariant, equipment: spec.equipment ?? t.equipment, safety: spec.safety ?? t.safety, parameters: t.parameters, actions: t.actions, reusedFrom: t.id, implementationStatus: 'content-ready', model: { description: `教材活动的教学模型：${spec.conclusion}`, formula: t.model.formula, limits: `${t.model.limits} 装置与模型沿用人教版同类实验「${t.title}」。` } };
    }
    const def = SH_VARIANTS[`${bookId}/${spec.slug}`];
    if (def) return { ...common, family: spec.pending, sceneVariant: def.variant, equipment: def.equipment ?? spec.equipment ?? ['见教材原图'], parameters: def.parameters, actions: actionsFor(spec.pending), implementationStatus: 'content-ready', model: { description: `教材活动的教学模型：${spec.conclusion}`, formula: def.formula, limits: `${def.limits} 上海版独有活动的专属装置与模型；模拟读数不是实际测量记录。` } };
    return { ...common, family: spec.pending, sceneVariant: `sh-pending-${spec.slug}`, equipment: spec.equipment ?? ['见教材原图'], parameters: [], actions: [{ id: 'run', label: '开始实验' }, { id: 'record', label: '记录观察' }], implementationStatus: 'rig-pending', model: { description: `教材活动：${spec.conclusion}`, formula: '—', limits: '上海版独有活动，专属 3D 装置与定量模型待建；当前仅提供教材步骤与结论。' } };
  };
}

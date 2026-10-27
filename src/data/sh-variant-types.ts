import type { ExperimentParameter } from './types';

/** 上海版独有活动的专属装置定义；键为 `<bookId>/<slug>`（slug 与数据文件中 pending 条目一致）。 */
export interface ShVariantDef {
  /** 新的 sceneVariant，统一为 `sh-<slug>`，全书唯一。 */
  variant: string;
  parameters: ExperimentParameter[];
  /** 模型公式或关系式；定性活动写关键关系，如“压瓶 → 细管液面上升”。 */
  formula: string;
  /** 模型简化条件；化学条目必填（作为化学审查记录）。 */
  limits: string;
  /** 需要替换教材条目器材时填写；不填沿用数据文件。 */
  equipment?: string[];
}
export type ShVariantGroup = Record<string, ShVariantDef>;

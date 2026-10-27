import type { ShVariantGroup } from './sh-variant-types';
import { shVariantsA1 } from './sh-variants-a1';
import { shVariantsA2 } from './sh-variants-a2';
import { shVariantsB } from './sh-variants-b';
import { shVariantsC } from './sh-variants-c';
import { shVariantsD } from './sh-variants-d';
import { shVariantsE } from './sh-variants-e';
export type { ShVariantDef, ShVariantGroup } from './sh-variant-types';

/** 各组分文件维护，避免并行编辑冲突；这里只做合并。 */
export const SH_VARIANT_GROUPS: Record<string, ShVariantGroup> = { a1: shVariantsA1, a2: shVariantsA2, b: shVariantsB, c: shVariantsC, d: shVariantsD, e: shVariantsE };
export const SH_VARIANTS: ShVariantGroup = Object.assign({}, ...Object.values(SH_VARIANT_GROUPS));
/** sceneVariant → 定义 */
export const SH_VARIANT_BY_NAME = new Map(Object.entries(SH_VARIANTS).map(([key, def]) => [def.variant, { key, ...def }]));

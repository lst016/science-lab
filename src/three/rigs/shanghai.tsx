import type { ShRigMap } from './sh-types';
import { SH_RIGS_A1 } from './sh-a1';
import { SH_RIGS_A2 } from './sh-a2';
import { SH_RIGS_B } from './sh-b';
import { SH_RIGS_C } from './sh-c';
import { SH_RIGS_D } from './sh-d';
import { SH_RIGS_E } from './sh-e';

/** 上海版独有活动装置，按 sceneVariant 索引。 */
export const SH_RIGS: ShRigMap = { ...SH_RIGS_A1, ...SH_RIGS_A2, ...SH_RIGS_B, ...SH_RIGS_C, ...SH_RIGS_D, ...SH_RIGS_E };

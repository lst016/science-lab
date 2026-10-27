import type { ReactElement } from 'react';
import type { Experiment } from '../../data/types';

export type ShRigMap = Record<string, (props: { exp: Experiment }) => ReactElement>;

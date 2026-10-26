import type { ReactElement } from 'react';
import type { Experiment } from '../../data/types';
import { Label } from '../kit';
import { SoundRig } from './sound';
import { ElectricRig, MagnetismRig } from './electric-rigs';
import { ChemicalRig } from './chemical-rigs';
import { ThermalRig } from './thermal-rigs';
import { MechanicsRig } from './mechanics';
import { LensRig, OpticsRig } from './optics';

/** 每个 family 一个装置路由；返回 null 表示该 sceneVariant 尚无专属装置。 */
const ROUTES: Partial<Record<Experiment['family'], (exp: Experiment) => ReactElement | null>> = {
  sound: (exp) => <SoundRig exp={exp} />,
  electricity: (exp) => <ElectricRig exp={exp} />,
  magnetism: (exp) => <MagnetismRig exp={exp} />,
  heat: (exp) => <ThermalRig exp={exp} />,
  particle: (exp) => <ThermalRig exp={exp} />,
  measurement: (exp) => <MechanicsRig exp={exp} />,
  motion: (exp) => <MechanicsRig exp={exp} />,
  force: (exp) => <MechanicsRig exp={exp} />,
  density: (exp) => <MechanicsRig exp={exp} />,
  pressure: (exp) => <MechanicsRig exp={exp} />,
  buoyancy: (exp) => <MechanicsRig exp={exp} />,
  mechanics: (exp) => <MechanicsRig exp={exp} />,
  optics: (exp) => <OpticsRig exp={exp} />,
  lens: (exp) => <LensRig exp={exp} />,
};

export function RigRouter({ exp }: { exp: Experiment }) {
  const route = ROUTES[exp.family];
  const content = exp.bookId.startsWith('chemistry-')
    ? <ChemicalRig exp={exp} />
    : route ? route(exp) : null;
  return (
    <group key={exp.id} name="experiment-rig">
      <group position={[0, 0.07, 0]}>
        {content ?? <Label text={`「${exp.sceneVariant}」暂无专属 3D 装置`} p={[0, 1, 0]} />}
      </group>
    </group>
  );
}

import type { ReactElement } from 'react';
import type { Experiment } from '../../data/types';
import { AmmeterMeasure, BulbShort, ParallelCurrent, ParallelVoltage, SeriesCurrent, SeriesParallelSwitches, SeriesVoltage, VoltMeasure } from './electric-circuits';
import { OhmCircuit, ResistanceWires, RheostatControl } from './electric-circuits2';
import { ChargeInteraction } from './electric-charge';
import { BulbPower, FuseWire } from './electric-fuse';
import { CompassField, FieldLinesBar, SolenoidField } from './electric-magnet-a';
import { CoilMotor, WireForce } from './electric-magnet-b';
import { HandCrank, Induction } from './electric-magnet-c';
import { PhoneVacuum } from './electric-magnet-d';

/* 电学：电路板上的真实回路（导线、开关、仪表、电荷流）与静电实验。
   磁学：磁体、小磁针、线圈、导体棒与电磁波。变体与 src/data/physics9.ts 对应。 */

export function ElectricRig({ exp }: { exp: Experiment }): ReactElement | null {
  const v = exp.sceneVariant;
  switch (v) {
    case 'charge-interaction': return <ChargeInteraction />;
    case 'bulb-short-circuit': return <BulbShort />;
    case 'series-parallel-switches': return <SeriesParallelSwitches />;
    case 'ammeter-measurement': return <AmmeterMeasure />;
    case 'series-current-law': return <SeriesCurrent />;
    case 'parallel-current-law': return <ParallelCurrent />;
    case 'voltmeter-measurement': return <VoltMeasure />;
    case 'series-voltage-law': return <SeriesVoltage />;
    case 'parallel-voltage-law': return <ParallelVoltage />;
    case 'resistance-length': return <ResistanceWires byLength />;
    case 'resistance-area': return <ResistanceWires byLength={false} />;
    case 'rheostat-control': return <RheostatControl />;
    case 'ohm-voltage':
    case 'ohm-resistance':
    case 'voltmeter-ammeter-resistance': return <OhmCircuit variant={v} />;
    case 'bulb-power-voltage': return <BulbPower />;
    case 'fuse-wire': return <FuseWire />;
    default: return null;
  }
}

export function MagnetismRig({ exp }: { exp: Experiment }): ReactElement | null {
  switch (exp.sceneVariant) {
    case 'intro-motor':
    case 'coil-motor-principle': return <CoilMotor />;
    case 'compass-field-direction': return <CompassField />;
    case 'field-lines-bar-magnet': return <FieldLinesBar />;
    case 'solenoid-field': return <SolenoidField />;
    case 'current-wire-force': return <WireForce />;
    case 'electromagnetic-induction': return <Induction />;
    case 'hand-crank-generator': return <HandCrank />;
    case 'phone-vacuum': return <PhoneVacuum />;
    default: return null;
  }
}

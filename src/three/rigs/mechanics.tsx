import type { ReactElement } from 'react';
import type { Experiment } from '../../data/types';
import { RulerScene, StopwatchScene } from './mechanics-measure';
import { RampSpeed, FrictionCart, KineticEnergy } from './mechanics-motion';
import { SpringScaleScene, TwoForceScene, FrictionForce, DoorLever, MagnetBall, ReactionCarts, FunnelBall } from './mechanics-force';
import { BalanceScene, MassVolume, LiquidDensity, Displacement, Hydrometer } from './mechanics-density';
import { SpongeTable, LiquidProbe, Torricelli, HomemadeBarometer, PistonPump, AirflowPaper } from './mechanics-pressure';
import { BuoyancyGauge, EggWaterSalt, ClayBoat } from './mechanics-buoyancy';
import { Lever, Steelyard, PulleyTypes, PulleyWork } from './mechanics-simple-machines';

/** 教学力学场景按 sceneVariant 选择具体装置；未知变体保持空场景，不伪装成另一套器材。 */
export function MechanicsRig({ exp }: { exp: Experiment }): ReactElement | null {
  switch (exp.sceneVariant) {
    case 'ruler': return <RulerScene />;
    case 'stopwatch': return <StopwatchScene />;
    case 'ramp-speed': return <RampSpeed />;
    case 'friction-cart': return <FrictionCart />;
    case 'kinetic-energy': return <KineticEnergy />;
    case 'funnel-pingpong': return <FunnelBall />;
    case 'spring-scale': return <SpringScaleScene />;
    case 'gravity-mass': return <SpringScaleScene gravity />;
    case 'two-force-balance': return <TwoForceScene />;
    case 'collinear-forces': return <TwoForceScene collinear />;
    case 'sliding-friction': return <FrictionForce />;
    case 'door-lever-arm': return <DoorLever />;
    case 'magnet-ball': return <MagnetBall />;
    case 'action-reaction-carts': return <ReactionCarts />;
    case 'balance': return <BalanceScene />;
    case 'mass-volume': return <MassVolume />;
    case 'liquid-density': return <LiquidDensity />;
    case 'displacement': return <Displacement />;
    case 'mini-hydrometer-project': return <Hydrometer />;
    case 'sponge-table': return <SpongeTable />;
    case 'liquid-probe': return <LiquidProbe />;
    case 'torricelli': return <Torricelli />;
    case 'homemade-barometer': return <HomemadeBarometer />;
    case 'piston-pump-project': return <PistonPump />;
    case 'airflow-paper': return <AirflowPaper />;
    case 'weighing': return <BuoyancyGauge />;
    case 'variables': return <BuoyancyGauge variables />;
    case 'archimedes': return <BuoyancyGauge overflow />;
    case 'egg-water-salt': return <EggWaterSalt />;
    case 'clay-boat': return <ClayBoat />;
    case 'lever': return <Lever />;
    case 'steelyard-project': return <Steelyard />;
    case 'pulley-types': return <PulleyTypes />;
    case 'pulley-work': return <PulleyWork />;
    case 'pulley-efficiency': return <PulleyWork efficiency />;
    default: return null;
  }
}

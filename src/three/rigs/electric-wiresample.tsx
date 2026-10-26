import { Box, MAT, V3 } from '../kit';
import { IoLabel } from './parts';
import { useParam } from './io';
import { BOARD_TOP, InkBox } from './electric-wire';
import type { Term } from './electric-layout';

/* 电阻丝样品：长度、横截面积按参数画出；左夹固定在 x0，右夹随长度移动。 */

export const WIRE_Y_ABS = BOARD_TOP + 0.3;
const SPAN = 3.6; // 100 cm 对应的世界长度
export const wireRadius = (area: number) => 0.014 + 0.03 * Math.sqrt(Math.max(0.05, area) / 2);

export function wireTerm(p: V3, length: number): Term {
  const x0 = p[0] - SPAN / 2;
  return { in: [x0 + (length / 100) * SPAN, WIRE_Y_ABS, p[2]], out: [x0, WIRE_Y_ABS, p[2]] };
}

function Clamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, BOARD_TOP, z]}>
      <InkBox p={[0, 0.17, 0]} s={[0.16, 0.34, 0.3]} m={MAT.brass} />
      <Box p={[0, 0.02, 0]} s={[0.3, 0.04, 0.4]} m={MAT.darkWood} />
    </group>
  );
}

export function WireSample({ p, byLength }: { p: V3; byLength: boolean }) {
  const L = useParam('length', 50);
  const S = useParam('area', 1);
  const t = wireTerm(p, L);
  const lw = t.in[0] - t.out[0];
  const r = wireRadius(S);
  const x0 = t.out[0];
  const refL = (50 / 100) * SPAN;
  const zr = p[2] + 0.28;
  return (
    <group>
      <Clamp x={t.out[0]} z={p[2]} />
      <Clamp x={t.in[0]} z={p[2]} />
      <mesh position={[x0 + lw / 2, WIRE_Y_ABS, p[2]]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, lw, 14]} />
        <meshStandardMaterial color="#8b9097" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[x0 + refL / 2, WIRE_Y_ABS - 0.12, zr]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[wireRadius(1), wireRadius(1), refL, 10]} />
        <meshStandardMaterial color="#aab0b8" transparent opacity={0.35} />
      </mesh>
      <IoLabel p={[x0 + refL / 2, 0.62, zr + 0.2]} size={0.17} get={() => '对照丝 50 cm · 1.0 mm²'} />
      <IoLabel p={[x0 + lw / 2, 0.98, p[2]]} size={0.24} get={(io) => `L = ${io.p('length', 50).toFixed(0)} cm，S = ${io.p('area', 1).toFixed(1)} mm²，R/R₀ = ${io.s('resistanceRatio', 1).toFixed(2)}`} />
      <IoLabel p={[0, 1.5, p[2] + 0.2]} size={0.22} get={() => (byLength ? '材料、粗细相同：越长电阻越大' : '材料、长度相同：越粗电阻越小')} />
    </group>
  );
}

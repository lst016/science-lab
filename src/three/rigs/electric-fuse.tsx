import { useRef } from 'react';
import * as THREE from 'three';
import { MAT, V3 } from '../kit';
import { Meter } from './electric-meter';
import { Lamp } from './electric-parts';
import { IoLabel } from './parts';
import { InkBox, Post, BOARD_TOP, circ } from './electric-wire';
import { Leads, T, Term } from './electric-layout';
import { SeriesFrame, XR, ZT, ZB, at, total } from './electric-frames';
import { autoA, autoV } from './electric-circuits';
import { RigIO, clamp, useParam, useRig } from './io';

/* 保险丝熔断：电源、开关、合金丝座、铜丝座、电流表串联成一个回路。
   合金丝的发热程度按 (I/阈值)² 示意；超过阈值后模型 fuseBlown，丝断开并出现火花与烟。 */

const HALF = 0.62; // 丝座半跨
const WY = 0.3;    // 丝的高度（座上）
const fuseTerm = (p: V3): Term => ({ in: [p[0] + HALF, BOARD_TOP + WY, p[2]], out: [p[0] - HALF, BOARD_TOP + WY, p[2]] });
const swOn = (io: RigIO) => io.n('toggle') % 2 === 0;
const curOf = (io: RigIO) => (swOn(io) ? io.s('current', 0) : 0);

function Mount({ p, tag }: { p: V3; tag: string }) {
  return (
    <group position={p}>
      <InkBox p={[0, 0.06, 0]} s={[1.5, 0.12, 0.5]} m={MAT.white} />
      <Post p={[-HALF, 0.17, 0]} />
      <Post p={[HALF, 0.17, 0]} />
      <IoLabel p={[0, 0.95, 0]} size={0.22} get={() => tag} />
    </group>
  );
}

/** 铜丝：同一电流下几乎不发热，始终完整。 */
function CopperWire({ p }: { p: V3 }) {
  return (
    <group position={[p[0], BOARD_TOP + WY, p[2]]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, HALF * 2, 12]} />
        <meshStandardMaterial color="#c97a45" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  );
}

const SPARKS = 7;

/** 合金丝：两段细丝；熔断时各自回缩，端部出现熔珠，火花和烟随事件时间飞散。 */
function AlloyWire({ p }: { p: V3 }) {
  const L = useRef<THREE.Group>(null), R = useRef<THREE.Group>(null);
  const lm = useRef<THREE.MeshStandardMaterial>(null), rm = useRef<THREE.MeshStandardMaterial>(null);
  const bead = useRef<(THREE.Mesh | null)[]>([null, null]);
  const sparks = useRef<(THREE.Mesh | null)[]>([]);
  const smoke = useRef<THREE.Mesh>(null);
  const at0 = useRef(-1);
  useRig((io) => {
    const blown = io.sb('fuseBlown', false) && swOn(io);
    const I = io.p('current', 1), rate = io.p('alloy', 1.5);
    const heat = io.damp('fuse-heat', blown ? 0 : swOn(io) ? clamp((I / rate) ** 2, 0, 1) : 0, blown ? 3 : 4);
    const g = io.damp('fuse-gap', blown ? 1 : 0, 9);
    if (blown && at0.current < 0) at0.current = io.t;
    if (!blown) at0.current = -1;
    const age = at0.current < 0 ? -1 : io.t - at0.current;
    for (const [grp, mat] of [[L.current, lm.current], [R.current, rm.current]] as const) {
      if (grp) grp.scale.x = 1 - 0.58 * g;
      if (mat) { mat.emissive.setRGB(1, 0.35 + 0.3 * heat, 0.1); mat.emissiveIntensity = heat * 3.2; }
    }
    bead.current.forEach((b, i) => {
      if (!b) return;
      b.visible = g > 0.2;
      b.position.x = (i === 0 ? -HALF : HALF) + (i === 0 ? 1 : -1) * HALF * (1 - 0.58 * g);
      b.scale.setScalar(g);
    });
    sparks.current.forEach((s, i) => {
      if (!s) return;
      const a = age - i * 0.03;
      s.visible = age >= 0 && a > 0 && a < 0.9;
      if (!s.visible) return;
      const ang = (i / SPARKS) * Math.PI * 2;
      s.position.set(Math.cos(ang) * a * 0.9, 0.05 + a * 1.1 - 2.2 * a * a, Math.sin(ang) * a * 0.5);
      s.scale.setScalar(1 - a / 0.9);
    });
    if (smoke.current) {
      const a = age < 0 ? 0 : Math.min(age, 2.5);
      smoke.current.visible = age >= 0 && age < 2.5;
      smoke.current.position.y = 0.2 + a * 0.35;
      smoke.current.scale.setScalar(0.6 + a * 0.9);
      (smoke.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - a / 2.5);
    }
  });
  const half = (ref: React.RefObject<THREE.Group | null>, mat: React.RefObject<THREE.MeshStandardMaterial | null>, x: number, dir: number) => (
    <group ref={ref} position={[x, 0, 0]}>
      <mesh position={[dir * HALF / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, HALF, 10]} />
        <meshStandardMaterial ref={mat} color="#8d9298" metalness={0.85} roughness={0.35} />
      </mesh>
    </group>
  );
  return (
    <group position={[p[0], BOARD_TOP + WY, p[2]]}>
      {half(L, lm, -HALF, 1)}
      {half(R, rm, HALF, -1)}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => { bead.current[i] = m; }} visible={false}>
          <sphereGeometry args={[0.05, 10, 8]} /><meshStandardMaterial color="#ffb347" emissive="#ff7a1a" emissiveIntensity={2} />
        </mesh>
      ))}
      {Array.from({ length: SPARKS }, (_, i) => (
        <mesh key={i} ref={(m) => { sparks.current[i] = m; }} visible={false}>
          <sphereGeometry args={[0.03, 6, 5]} /><meshBasicMaterial color="#ffd45a" />
        </mesh>
      ))}
      <mesh ref={smoke} visible={false}><sphereGeometry args={[0.2, 12, 10]} /><meshBasicMaterial color="#6e6a66" transparent opacity={0.3} depthWrite={false} /></mesh>
    </group>
  );
}

export function FuseWire() {
  const alloy = at(0.85, ZT), copper = at(-0.85, ZT), col = at(XR, (ZT + ZB) / 2);
  return (
    <SeriesFrame top={[fuseTerm(alloy), fuseTerm(copper)]} right={[T.up(col, 0.6, 0.25)]} cur={curOf} swOn={swOn} sw>
      <Mount p={alloy} tag="合金丝（保险丝）" />
      <Mount p={copper} tag="铜丝（对照）" />
      <AlloyWire p={alloy} />
      <CopperWire p={copper} />
      <group position={col} rotation={[0, Math.PI / 2, 0]}>
        <Meter p={[0, 0, 0]} kind="A" max={5} value={curOf} plusRight={false} tag="电流表" />
      </group>
      <IoLabel p={[0, 1.7, 0.7]} size={0.23} get={(io) => (io.sb('fuseBlown', false)
        ? `I = ${io.p('current', 1).toFixed(1)} A > 阈值 ${io.p('alloy', 1.5).toFixed(1)} A：合金丝熔断，电路断开`
        : `I = ${io.p('current', 1).toFixed(1)} A ≤ 阈值 ${io.p('alloy', 1.5).toFixed(1)} A：合金丝导通，铜丝不熔`)} />
    </SeriesFrame>
  );
}

/** 灯泡功率随电压：灯、电流表串联，电压表并联在灯两端。 */
export function BulbPower() {
  const U0 = useParam('voltage', 2.5), R0 = useParam('resistance', 8);
  const lamp = at(1.05, ZT), am = at(-0.85, ZT), vm = at(1.05, 0.3);
  const tl = T.lamp(lamp), tv = T.meter(vm);
  const RATED_V = 2.5;
  const level = (io: RigIO) => {
    const R = io.p('resistance', 8), pr = (RATED_V * RATED_V) / R;
    return circ(io).on ? clamp(Math.pow(io.s('power', 0) / pr, 0.6) * 0.95, 0, 1.3) : 0;
  };
  return (
    <SeriesFrame top={[tl, T.meter(am)]}>
      <Lamp p={lamp} level={level} tag="小灯泡" rated={`额定 ${RATED_V} V`} />
      <Meter p={am} kind="A" max={autoA(U0 / R0)} value={total} tag="电流表" />
      <Meter p={vm} kind="V" max={autoV(U0)} value={(io) => (circ(io).on ? circ(io).U : 0)} tag="电压表" digits={1} />
      <Leads pairs={[[tl.in, tv.in], [tl.out, tv.out]]} />
      <IoLabel p={[0, 1.8, 0.7]} size={0.23} get={(io) => {
        const U = circ(io).U, I = circ(io).I;
        const st = U < RATED_V - 0.2 ? '低于额定：偏暗' : U > RATED_V + 0.2 ? '高于额定：过亮，易烧坏' : '接近额定：正常发光';
        return circ(io).on ? `P = UI = ${U.toFixed(1)} × ${I.toFixed(2)} = ${(U * I).toFixed(2)} W　${st}` : '开关断开';
      }} />
    </SeriesFrame>
  );
}

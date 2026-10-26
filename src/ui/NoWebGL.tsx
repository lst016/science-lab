import type { Experiment } from '../data/types';
import { useEffect, useState } from 'react';
import { observe, subscribe } from '../state/runtime';
import type { Observation } from '../sim/core';

/** WebGL 不可用时的真实退化：右页显示器材与实时读数，左页的参数、动作与播放/重置仍可使用。 */
export function NoWebGL({ exp, reason }: { exp: Experiment; reason: string }) {
  const [obs, setObs] = useState<Observation | null>(() => observe());
  useEffect(() => subscribe(() => setObs(observe())), [exp.id]);
  return (
    <div className="nogl-page" role="region" aria-label="无 3D 的文字退化视图">
      <h3>3D 装置暂不可用</h3>
      <p className="why">{reason}。已退化为文字与读数视图：参数、动作、播放和重置仍然有效，读数来自同一个教学模型，但看不到立体装置。</p>
      <h4>器材</h4>
      <ul className="chips">{exp.equipment.map((q) => (<li key={q}>{q}</li>))}</ul>
      {obs && (
        <>
          <h4>当前现象</h4>
          <p>{obs.phenomenon}</p>
          <dl className="nogl-read">{obs.readings.map((r) => (<div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>))}</dl>
        </>
      )}
    </div>
  );
}

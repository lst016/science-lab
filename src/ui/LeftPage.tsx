import { useEffect, useMemo, useState } from 'react';
import type { Experiment, ExperimentParameter } from '../data/types';
import { emitTimeUpdate, observe, rt, setParam, subscribe, triggerAction, useActionState, useParams } from '../state/runtime';
import type { Observation } from '../sim/core';
import { CHEMISTRY_MODEL_LIMITS } from '../sim/chemistry';

const FIDELITY: Record<Observation['fidelity'], string> = {
  quantitative: '定量教学模型：读数由公式计算',
  qualitative: '定性现象模型：只表达条件与现象，不是精确速率',
  schematic: '教学示意：不是真实尺度或精确轨迹',
};

function fmtVal(v: number, p: ExperimentParameter) {
  const dec = p.step >= 1 ? 0 : Math.min(3, Math.max(0, Math.ceil(-Math.log10(p.step))));
  return `${v.toFixed(dec)}${p.unit ? ` ${p.unit}` : ''}`;
}

function ParamControl({ p, value }: { p: ExperimentParameter; value: number }) {
  const id = `param-${p.key}`;
  if (p.options && p.options.length) {
    return (
      <div className="ctl ctl-opt" role="radiogroup" aria-label={p.label}>
        <span className="ctl-label">{p.label}</span>
        <div className="seg">
          {p.options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={Math.round(value) === o.value}
              className={Math.round(value) === o.value ? 'on' : ''}
              onClick={() => setParam(p.key, o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  const frac = p.max > p.min ? ((value - p.min) / (p.max - p.min)) * 100 : 0;
  return (
    <div className="ctl">
      <label className="ctl-label" htmlFor={id}>{p.label}</label>
      <output htmlFor={id} className="ctl-val">{fmtVal(value, p)}</output>
      <input
        id={id}
        type="range"
        min={p.min}
        max={p.max}
        step={p.step}
        value={value}
        style={{ ['--f' as string]: `${frac}%` }}
        onChange={(e) => setParam(p.key, Number(e.target.value))}
      />
      <span className="ctl-range">{fmtVal(p.min, p)} – {fmtVal(p.max, p)}</span>
    </div>
  );
}

function Controls({ exp }: { exp: Experiment }) {
  const params = useParams();
  const action = useActionState();
  return (
    <section className="controls" aria-label="实验参数与动作">
      {exp.parameters.map((p) => (
        <ParamControl key={p.key} p={p} value={params[p.key] ?? p.default} />
      ))}
      {exp.actions.length > 0 && (
        <div className="actions">
          {exp.actions.map((a) => (
            <button key={a.id} type="button" className="act" onClick={() => triggerAction(a.id)}>
              {a.label}
              {(action.counts[a.id] ?? 0) > 0 && <em>×{action.counts[a.id]}</em>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Readouts({ exp }: { exp: Experiment }) {
  const [obs, setObs] = useState<Observation | null>(() => observe());
  useEffect(() => {
    let last = '';
    const update = () => {
      const o = observe();
      if (!o) return;
      const sig = o.readings.map((r) => r.value).join('|') + o.phenomenon + o.warnings.join('');
      if (sig !== last) {
        last = sig;
        setObs(o);
      }
    };
    update();
    const unsub = subscribe(update);
    return unsub;
  }, [exp.id]);
  if (!obs) return null;
  return (
    <section className="readout" aria-live="polite" aria-label="实验现象与读数">
      <h3>实验现象</h3>
      <p className="phen">{obs.phenomenon}</p>
      {obs.readings.length > 0 && (
        <dl>
          {obs.readings.map((r) => (
            <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
          ))}
        </dl>
      )}
      {obs.warnings.map((w) => (<p className="warn" key={w}>⚠ {w}</p>))}
      <p className="fid">{FIDELITY[obs.fidelity]}。{exp.model.limits}</p>
    </section>
  );
}

type Tab = 'do' | 'book' | 'model';

export function LeftPage({ exp, indexLabel }: { exp: Experiment; indexLabel: string }) {
  const [tab, setTab] = useState<Tab>('do');
  useEffect(() => setTab('do'), [exp.id]);
  const page = exp.printedPage ? `教材第 ${exp.printedPage} 页（PDF 第 ${exp.pdfPage} 页）` : `教材 PDF 第 ${exp.pdfPage} 页`;
  const tabs: [Tab, string][] = useMemo(() => [['do', '步骤与操作'], ['book', '器材与结论'], ['model', '模型说明']], []);
  return (
    <article className="pl" aria-label={`实验：${exp.title}`}>
      <header className="pl-head">
        <div className="kicker">
          <span>{exp.chapter}</span>
          <span className="tag">{exp.sourceLabel ?? exp.sourceType}</span>
          <span className="idx">{indexLabel}</span>
        </div>
        <h2>{exp.title}</h2>
      </header>
      {exp.safety && <p className="safety"><b>安全提示</b>{exp.safety}</p>}
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} type="button">{l}</button>
        ))}
      </div>
      <div className="pl-body" role="tabpanel">
        {tab === 'do' && (
          <>
            <ol className="steps">{exp.steps.map((s, i) => (<li key={i}><span>{i + 1}</span>{s}</li>))}</ol>
            <div className="formula" title="模型公式">{exp.model.formula}</div>
            <Controls exp={exp} />
            <Readouts exp={exp} />
          </>
        )}
        {tab === 'book' && (
          <>
            <h3 className="sub">实验目的</h3>
            <p className="concl">{exp.objective}</p>
            <h3 className="sub">所需器材</h3>
            <ul className="chips">{exp.equipment.map((q) => (<li key={q}>{q}</li>))}</ul>
            <h3 className="sub">教材结论</h3>
            <p className="concl">{exp.conclusion}</p>
          </>
        )}
        {tab === 'model' && (
          <>
            <h3 className="sub">模型说明</h3>
            <p>{exp.model.description}</p>
            <h3 className="sub">公式 / 关系</h3>
            <p className="formula-inline">{exp.model.formula}</p>
            <h3 className="sub">适用限制</h3>
            <p>{exp.model.limits}</p>
            {exp.bookId.startsWith('chemistry-') && <p>{CHEMISTRY_MODEL_LIMITS[exp.sceneVariant] ?? '此实验的独立模型仍待核查。'}</p>}
            <p className="note">界面上的读数是教学模型的输出，不是实际测量记录；化学现象用条件—现象的状态描述，不给出反应速率。</p>
          </>
        )}
      </div>
      <footer className="pl-foot">来源：{page} · {exp.sourceType}</footer>
    </article>
  );
}

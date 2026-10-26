import { usePlaying } from '../state/runtime';

const I = {
  lib: <path d="M5 4h3v16H5zM10 4h3v16h-3zM15.2 5.4l2.8-.8 3.2 14.8-2.8.8z" />,
  toc: <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  prev: <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  next: <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  play: <path d="M8 5v14l11-7z" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />,
  reset: <path d="M5 12a7 7 0 1 0 2.2-5.1M5 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
};
const Icon = ({ k }: { k: keyof typeof I }) => (<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="currentColor">{I[k]}</svg>);

export function Toolbar(props: {
  index: number; total: number; onLibrary: () => void; onToc: () => void; onPrev: () => void; onNext: () => void;
  onTogglePlay: () => void; onReset: () => void; tocOpen: boolean;
}) {
  const playing = usePlaying();
  const { index, total } = props;
  return (
    <nav className="toolbar" aria-label="阅读工具栏">
      <button type="button" onClick={props.onLibrary} title="回到书库"><Icon k="lib" /><span>书库</span></button>
      <button type="button" onClick={props.onToc} aria-expanded={props.tocOpen} title="实验目录（可搜索）"><Icon k="toc" /><span>目录</span></button>
      <i className="sep" />
      <button type="button" onClick={props.onPrev} disabled={index <= 0} aria-label="上一个实验" title="上一页（←）"><Icon k="prev" /></button>
      <span className="pager" aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      <button type="button" onClick={props.onNext} disabled={index >= total - 1} aria-label="下一个实验" title="下一页（→）"><Icon k="next" /></button>
      <i className="sep" />
      <button type="button" onClick={props.onTogglePlay} aria-pressed={playing} title="播放 / 暂停（空格）"><Icon k={playing ? 'pause' : 'play'} /><span>{playing ? '暂停' : '播放'}</span></button>
      <button type="button" onClick={props.onReset} title="重置所有参数与时间"><Icon k="reset" /><span>重置</span></button>
    </nav>
  );
}

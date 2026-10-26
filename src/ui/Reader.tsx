import { Component, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { coverOf, experimentsOf, getBook } from '../app/catalog';
import type { Experiment } from '../data/types';
import { navigate, readProgress, saveProgress } from '../state/route';
import { emitTimeUpdate, loadExperiment, resetExperiment, rt, setPlaying, tick } from '../state/runtime';
import { BookStage, StageMode } from '../three/BookStage';
import { FLIP_MS, SWAP_MS, makeCtrl } from '../three/ctrl';
import { LeftPage } from './LeftPage';
import { Toc } from './Toc';
import { Toolbar } from './Toolbar';
import { NoWebGL } from './NoWebGL';

// Keep the paper's DOM close to its projected pixel size: a 600px layout was
// shrinking Chinese body text below 11px on a 1280px-wide laptop display.
const SPREAD_LAYOUT = { w: 460, h: 580 };

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

class StageBoundary extends Component<{ children: ReactNode; onError: (e: unknown) => void; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { this.props.onError(e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

export function Reader({ bookId, expId }: { bookId: string; expId?: string }) {
  const book = getBook(bookId);
  const exps = useMemo(() => experimentsOf(bookId), [bookId]);

  // 规范化 URL：缺失/无效 expId → 最近进度或第一条
  useEffect(() => {
    if (!book) { navigate({ name: 'library' }, { replace: true }); return; }
    if (exps.length === 0) return;
    if (!expId || !exps.some((e) => e.id === expId)) {
      const saved = readProgress()[bookId];
      const id = saved && exps.some((e) => e.id === saved) ? saved : exps[0].id;
      navigate({ name: 'book', bookId, expId: id }, { replace: true });
    }
  }, [book, bookId, expId, exps]);

  if (!book) return null;
  const idx = exps.findIndex((e) => e.id === expId);
  if (exps.length === 0) return <EmptyBook bookId={bookId} />;
  if (idx < 0) return <div className="reader desk" />;
  return <ReaderInner key={bookId} bookId={bookId} exps={exps} target={exps[idx]} />;
}

function EmptyBook({ bookId }: { bookId: string }) {
  const book = getBook(bookId)!;
  return (
    <div className="reader desk empty-book">
      <div className="empty-card">
        <h2>{book.title}</h2>
        <p>这一册的实验内容仍在逐页盘点中，目前没有可打开的实验条目。</p>
        <p className="note">{book.coverageNote}</p>
        <button type="button" onClick={() => navigate({ name: 'library' })}>回到书库</button>
      </div>
    </div>
  );
}

function ReaderInner({ bookId, exps, target }: { bookId: string; exps: Experiment[]; target: Experiment }) {
  const book = getBook(bookId)!;
  const cs = coverOf(book);
  const vp = useViewport();
  const mode: StageMode = vp.w >= 1100 && vp.w / vp.h >= 1.35 ? 'spread' : 'stack';
  const [glOk] = useState(webglAvailable);
  const [glError, setGlError] = useState<string | null>(null);
  const useGL = glOk && !glError;

  const ctrl = useRef(makeCtrl());
  const [shown, setShown] = useState<Experiment>(target);
  const [fading, setFading] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const leftEl = useRef<HTMLDivElement>(null);
  const tocBtnFocus = useRef<HTMLElement | null>(null);

  const total = exps.length;
  const indexOf = (e: Experiment) => exps.indexOf(e);
  const shownIndex = indexOf(shown);
  const targetIndex = indexOf(target);
  const fracOf = (i: number) => (total > 1 ? i / (total - 1) : 0);

  /* ---------- 翻页状态机 ---------- */
  const pending = useRef<Experiment>(target);
  const shownRef = useRef<Experiment>(shown);
  const swapTimer = useRef<number | undefined>(undefined);
  const endTimer = useRef<number | undefined>(undefined);
  const flipping = useRef(false);
  const swapped = useRef(false);

  const doSwap = useCallback(() => {
    const next = pending.current;
    shownRef.current = next;
    setShown(next);
    loadExperiment(next);
    swapped.current = true;
    ctrl.current.swapAt = performance.now();
    ctrl.current.fracTarget = fracOf(exps.indexOf(next));
    setFading(false);
    rt.invalidate();
  }, [exps]);

  const startFlip = useCallback((next: Experiment) => {
    const cur = shownRef.current;
    const dir: 1 | -1 = exps.indexOf(next) > exps.indexOf(cur) ? 1 : -1;
    const c = ctrl.current;
    flipping.current = true;
    swapped.current = false;
    c.flipStart = performance.now();
    c.flipDir = dir;
    c.fallFrom = c.rigU;
    c.swapAt = 0;
    c.fracTarget = fracOf(exps.indexOf(next));
    pending.current = next;
    setFading(true);
    window.clearTimeout(swapTimer.current);
    window.clearTimeout(endTimer.current);
    swapTimer.current = window.setTimeout(doSwap, SWAP_MS);
    endTimer.current = window.setTimeout(() => {
      flipping.current = false;
      if (pending.current !== shownRef.current) startFlip(pending.current);
    }, FLIP_MS);
    rt.invalidate();
  }, [exps, doSwap]);

  // 首次载入
  useEffect(() => {
    loadExperiment(target);
    ctrl.current.fracTarget = fracOf(exps.indexOf(target));
    return () => {
      window.clearTimeout(swapTimer.current);
      window.clearTimeout(endTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL 目标变化 → 翻页
  useEffect(() => {
    saveProgress(bookId, target.id);
    pending.current = target;
    if (target === shownRef.current && !flipping.current) return;
    if (flipping.current) {
      // 翻页中：交换时机前直接换目标，之后在结束时补一次
      if (!swapped.current) {
        ctrl.current.fracTarget = fracOf(exps.indexOf(target));
      }
      return;
    }
    startFlip(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  /* ---------- 时间推进（独立于渲染层，WebGL 失败也可用） ---------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastEmit = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (rt.playing && !document.hidden) {
        tick(dt);
        if (now - lastEmit > 130) { lastEmit = now; emitTimeUpdate(); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------- 导航 ---------- */
  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= total) return;
    navigate({ name: 'book', bookId, expId: exps[i].id });
  }, [bookId, exps, total]);
  const prev = () => goTo(targetIndex - 1);
  const next = () => goTo(targetIndex + 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (tocOpen) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(targetIndex - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(targetIndex + 1); }
      else if (e.key === ' ' && (tag === 'BODY' || tag === 'CANVAS')) { e.preventDefault(); setPlaying(!rt.playing); }
      else if (e.key.toLowerCase() === 'l') { setTocOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, targetIndex, tocOpen]);

  const openToc = () => { tocBtnFocus.current = document.activeElement as HTMLElement; setTocOpen(true); };
  const closeToc = () => { setTocOpen(false); window.setTimeout(() => tocBtnFocus.current?.focus?.(), 0); };

  const indexLabel = `${String(shownIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const bottomPad = mode === 'spread' ? 96 : 8;
  const lowPower = vp.w < 700;

  const cover = useMemo(() => ({ color: cs.color, title: book.subject === 'physics' ? '物理' : '化学', sub: `${book.grade}${book.volume}` }), [cs.color, book]);

  return (
    <div className={`reader desk mode-${mode}${useGL ? '' : ' nogl'}`} style={{ ['--bookc' as string]: cs.color }}>
      <div className="book-label" aria-hidden>{book.title}</div>
      <div className="stage">
        {useGL ? (
          <StageBoundary onError={(e) => setGlError(String((e as Error)?.message ?? e))} fallback={<NoWebGL exp={shown} reason="渲染器在运行时出错" />}>
            <BookStage
              ctrl={ctrl.current}
              exp={shown}
              indexLabel={indexLabel}
              cover={cover}
              mode={mode}
              leftEl={leftEl}
              layoutSize={SPREAD_LAYOUT}
              bottomPad={bottomPad}
              lowPower={lowPower}
            />
          </StageBoundary>
        ) : (
          <NoWebGL exp={shown} reason={glOk ? `渲染器出错：${glError}` : '此浏览器或设备无法创建 WebGL 上下文'} />
        )}
      </div>
      <div
        ref={leftEl}
        className={`left-host${fading ? ' fading' : ''}`}
        style={mode === 'spread' && useGL ? { width: SPREAD_LAYOUT.w, height: SPREAD_LAYOUT.h } : undefined}
        data-mode={mode}
      >
        <LeftPage key={shown.id} exp={shown} indexLabel={indexLabel} />
      </div>
      <Toolbar
        index={targetIndex}
        total={total}
        tocOpen={tocOpen}
        onLibrary={() => navigate({ name: 'library' })}
        onToc={openToc}
        onPrev={prev}
        onNext={next}
        onTogglePlay={() => setPlaying(!rt.playing)}
        onReset={resetExperiment}
      />
      {tocOpen && (
        <Toc
          book={book}
          exps={exps}
          currentId={target.id}
          onClose={closeToc}
          onPick={(id) => { navigate({ name: 'book', bookId, expId: id }); closeToc(); }}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { books, coverOf, experimentsOf, getExperiment } from '../app/catalog';
import type { Edition } from '../data/types';
import { navigate, readProgress } from '../state/route';
import type { Book } from '../data/types';

const EDITIONS: { id: Edition; label: string; note: string; hero: string }[] = [
  { id: 'pep', label: '人教版', note: '六三制', hero: '人教版初中物理与化学 · 互动实验馆' },
  { id: 'shanghai', label: '上海版', note: '沪科技版 · 五四制', hero: '上海版（沪科技版五四制）初中物理与化学 · 互动实验馆' },
];
import { CoverArt } from './CoverArt';
import { Beaker, BookStack, Cradle, Flask, Molecule, Prism, TubeRack } from './Props';

function BookItem({ book, picked, leaving, resume, onPick }: { book: Book; picked: boolean; leaving: boolean; resume?: string; onPick: (b: Book, el: HTMLElement) => void }) {
  const cs = coverOf(book);
  const ref = useRef<HTMLAnchorElement>(null);
  const label = `${book.subject === 'physics' ? '物理' : '化学'} ${book.grade}${book.volume}`;
  const total = experimentsOf(book.id).length;
  return (
    <div className={`book-slot${picked ? ' picked' : ''}`}>
      <a
        ref={ref}
        className="book"
        href={`#/book/${book.id}`}
        aria-label={`打开《${label}》，共 ${total} 个实验活动`}
        style={{ ['--c' as string]: cs.color, ['--c-dark' as string]: cs.dark }}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          if (!leaving && ref.current) onPick(book, ref.current);
        }}
      >
        <div className="shadow" />
        {resume && <span className="bookmark" aria-hidden />}
        <div className="book-3d">
          <div className="face pages-edge" />
          <div className="face top-face" />
          <div className="face spine"><span>{label}</span></div>
          <div className="face front">
            <div className="cover-in">
              <div className="kicker">初中理化实验室</div>
              <div className="subject">{book.subject === 'physics' ? '物理' : '化学'}</div>
              <div className="vol">{book.grade}{book.volume}</div>
              <CoverArt art={cs.art} />
              <div className="foot">{book.edition === 'shanghai' ? '上海版' : '人教版'} · 互动实验</div>
            </div>
          </div>
        </div>
      </a>
      <div className="book-caption">
        <b>{cs.caption}</b>
        <small>{cs.tagline} · {total} 个实验</small>
        {resume && <span className="resume">继续：{resume}</span>}
      </div>
    </div>
  );
}

export function Library({ edition }: { edition: Edition }) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [progress] = useState(readProgress);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const rows = useMemo(() => {
    const shelf = books.filter((b) => b.edition === edition);
    return [shelf.filter((b) => b.subject === 'physics'), shelf.filter((b) => b.subject === 'chemistry')];
  }, [edition]);
  const current = EDITIONS.find((x) => x.id === edition) ?? EDITIONS[0];

  const pick = (book: Book, el: HTMLElement) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPickedId(book.id);
    setLeaving(true);
    if (!reduce) {
      const r = el.getBoundingClientRect();
      const s = Math.min(2.2, (window.innerHeight * 0.7) / r.height);
      const dx = window.innerWidth / 2 - (r.left + r.width / 2);
      const dy = window.innerHeight / 2 - (r.top + r.height / 2);
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    }
    timer.current = window.setTimeout(() => navigate({ name: 'book', bookId: book.id }), reduce ? 0 : 560);
  };

  const resumeTitle = (b: Book) => {
    const id = progress[b.id];
    const ex = id ? getExperiment(id) : undefined;
    return ex ? ex.title.slice(0, 12) + (ex.title.length > 12 ? '…' : '') : undefined;
  };

  return (
    <main className={`lib${leaving ? ' leaving' : ''}`}>
      <header className="lib-top">
        <div className="brand">
          <svg viewBox="0 0 32 32" aria-hidden><path d="M3 7c5-2 9-1 13 2v17c-4-3-8-4-13-2z M29 7c-5-2-9-1-13 2v17c4-3 8-4 13-2z" fill="none" stroke="#2b2118" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          理化实验室
        </div>
        <div className="lib-note">带着问题，翻开实验。</div>
      </header>
      <section className="lib-hero">
        <h1>从书页走进实验室</h1>
        <p>{current.hero}</p>
        <div className="rule" />
        <nav className="edition-tabs" aria-label="教材版本">
          {EDITIONS.map((x) => (
            <a key={x.id} href={x.id === 'shanghai' ? '#/shanghai' : '#/'} className={x.id === edition ? 'on' : undefined} aria-current={x.id === edition ? 'page' : undefined}>
              <b>{x.label}</b><small>{x.note}</small>
            </a>
          ))}
        </nav>
      </section>
      <section className="shelves" aria-label="教材书架">
        {rows.map((row, ri) => (
          <div className="shelf-row" key={ri}>
            {ri === 0 && <div className="props" aria-hidden><div style={{ position: 'absolute', left: 20, bottom: 58, width: 110 }}><Cradle /></div><div style={{ position: 'absolute', right: 24, bottom: 58, width: 90 }}><BookStack /></div></div>}
            {ri === 1 && <div className="props" aria-hidden><div style={{ position: 'absolute', left: 88, bottom: 58, width: 110 }}><TubeRack /></div><div style={{ position: 'absolute', left: 20, bottom: 58, width: 60 }}><Flask /></div><div style={{ position: 'absolute', right: 24, bottom: 58, width: 56 }}><Beaker /></div><div style={{ position: 'absolute', right: 96, bottom: 58, width: 56 }}><Molecule /></div></div>}
            {row.map((b) => (
              <BookItem key={b.id} book={b} picked={pickedId === b.id} leaving={leaving} resume={resumeTitle(b)} onPick={pick} />
            ))}
          </div>
        ))}
      </section>
      <ol className="lib-steps" aria-label="使用方法">
        <li><i>01</i><b>选一册书</b><span>物理在上层，化学在下层</span></li>
        <li><i>02</i><b>翻开实验</b><span>书页翻动，装置从纸面立起</span></li>
        <li><i>03</i><b>调参数，看现象</b><span>读数来自教学模型，并标明限制</span></li>
      </ol>
      <div className="lib-veil" />
    </main>
  );
}

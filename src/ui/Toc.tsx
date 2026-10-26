import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book, Experiment } from '../data/types';
import { chapterGroups, coverOf } from '../app/catalog';

export function Toc({ book, exps, currentId, onPick, onClose }: { book: Book; exps: Experiment[]; currentId: string; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const curRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { curRef.current?.scrollIntoView({ block: 'center' }); }, []);
  const groups = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const list = kw
      ? exps.filter((e) => `${e.title} ${e.chapter} ${e.sourceType} ${e.equipment.join(' ')} ${e.family} ${e.objective}`.toLowerCase().includes(kw))
      : exps;
    // 保持在完整目录中的序号
    return chapterGroups(list).map((g) => ({ chapter: g.chapter, items: g.items.map((it) => ({ exp: it.exp, index: exps.indexOf(it.exp) })) }));
  }, [q, exps]);
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  const cs = coverOf(book);
  return (
    <div className="toc-wrap" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <div className="toc-scrim" onClick={onClose} />
      <aside className="toc" role="dialog" aria-label="实验目录" style={{ ['--c' as string]: cs.color }}>
        <header>
          <div><b>{book.title}</b><small>{exps.length} 个实验活动</small></div>
          <button type="button" className="x" onClick={onClose} aria-label="关闭目录">×</button>
        </header>
        <div className="toc-search">
          <input ref={input} type="search" value={q} placeholder="搜索章节、实验名、器材…" onChange={(e) => setQ(e.target.value)} aria-label="搜索实验" />
          {q && <span>{count} 项</span>}
        </div>
        <div className="toc-list">
          {groups.length === 0 && <p className="empty">没有匹配的实验。试试“透镜”“浮力”“气体”。</p>}
          {groups.map((g) => (
            <section key={g.chapter}>
              <h4>{g.chapter}</h4>
              <ul>
                {g.items.map(({ exp, index }) => (
                  <li key={exp.id}>
                    <button type="button" ref={exp.id === currentId ? curRef : undefined} className={exp.id === currentId ? 'cur' : ''} onClick={() => onPick(exp.id)}>
                      <em>{String(index + 1).padStart(2, '0')}</em>
                      <span>{exp.title}</span>
                      <small>{exp.sourceType}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}

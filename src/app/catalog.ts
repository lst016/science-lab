import { books as rawBooks } from '../data/books';
import type { Book, Experiment } from '../data/types';

export const books: Book[] = rawBooks;

const byBook = new Map<string, Experiment[]>();
const byId = new Map<string, Experiment>();
for (const b of books) {
  byBook.set(b.id, b.experiments);
  for (const e of b.experiments) byId.set(e.id, e);
}

export const allExperiments: Experiment[] = books.flatMap((b) => b.experiments);

export const getBook = (id: string): Book | undefined => books.find((b) => b.id === id);
export const experimentsOf = (bookId: string): Experiment[] => byBook.get(bookId) ?? [];
export const getExperiment = (id: string): Experiment | undefined => byId.get(id);

/** 每本书的封面视觉（色彩、小标语），与数据解耦，仅用于界面。 */
export interface CoverStyle {
  color: string;
  dark: string;
  tagline: string;
  caption: string;
  art: 'prism' | 'circuit' | 'orbit' | 'molecule' | 'flask';
}

const COVERS: Record<string, CoverStyle> = {
  'physics-8-1': { color: '#6f8452', dark: '#4c5e37', caption: '声、光与运动', tagline: '从现象走向规律', art: 'prism' },
  'physics-8-2': { color: '#52708c', dark: '#374f68', caption: '力与压强', tagline: '探索看不见的力量', art: 'circuit' },
  'physics-9': { color: '#b98b2f', dark: '#8a6620', caption: '热、电、磁与能量', tagline: '从生活走向未来', art: 'orbit' },
  'chemistry-9-1': { color: '#a64a3b', dark: '#7b3226', caption: '物质的构成与变化', tagline: '从微观认识世界', art: 'molecule' },
  'chemistry-9-2': { color: '#2f6e70', dark: '#1f4e50', caption: '物质的化学反应', tagline: '在变化中创造新物质', art: 'flask' },
};

export function coverOf(book: Book): CoverStyle {
  return (
    COVERS[book.id] ?? {
      color: book.color || '#6f8452',
      dark: '#3d4a2c',
      caption: book.shortTitle || book.title,
      tagline: '',
      art: book.subject === 'physics' ? 'prism' : 'molecule',
    }
  );
}

export function chapterGroups(exps: Experiment[]): { chapter: string; items: { exp: Experiment; index: number }[] }[] {
  const out: { chapter: string; items: { exp: Experiment; index: number }[] }[] = [];
  exps.forEach((exp, index) => {
    let g = out[out.length - 1];
    if (!g || g.chapter !== exp.chapter) {
      g = { chapter: exp.chapter, items: [] };
      out.push(g);
    }
    g.items.push({ exp, index });
  });
  return out;
}

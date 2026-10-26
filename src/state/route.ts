import { useSyncExternalStore } from 'react';

/**
 * Hash 路由：
 *   #/                         书库
 *   #/book/<bookId>            打开某册（恢复上次实验，否则第一条）
 *   #/book/<bookId>/<expId>    定位到具体实验
 */
export type Route =
  | { name: 'library' }
  | { name: 'book'; bookId: string; expId?: string };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  let parts: string[];
  try {
    parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { name: 'library' };
  }
  if (parts[0] === 'book' && parts[1]) {
    return { name: 'book', bookId: parts[1], expId: parts[2] };
  }
  return { name: 'library' };
}

export function formatHash(route: Route): string {
  if (route.name === 'library') return '#/';
  const base = `#/book/${encodeURIComponent(route.bookId)}`;
  return route.expId ? `${base}/${encodeURIComponent(route.expId)}` : base;
}

let current = typeof window === 'undefined' ? '' : window.location.hash;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = window.location.hash;
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => current, () => '');
  return parseHash(hash);
}

export function navigate(route: Route, opts: { replace?: boolean } = {}) {
  const hash = formatHash(route);
  if (window.location.hash === hash) return;
  if (opts.replace) {
    window.history.replaceState(null, '', hash);
    current = window.location.hash;
    listeners.forEach((l) => l());
  } else {
    window.location.hash = hash;
  }
}

/* ---------- 每本书的最近进度（localStorage） ---------- */

const KEY = 'lihua3d.progress.v1';

export type Progress = Record<string, string>;

export function readProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? (obj as Progress) : {};
  } catch {
    return {};
  }
}

export function saveProgress(bookId: string, expId: string) {
  try {
    const p = readProgress();
    if (p[bookId] === expId) return;
    p[bookId] = expId;
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 隐私模式等：忽略，进度仅保存在 URL */
  }
}

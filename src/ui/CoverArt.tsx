import type { CoverStyle } from '../app/catalog';

const line = { fill: 'none', stroke: '#f6ecd4', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** 原创矢量封面插图（线描），只表达主题，不对应具体实验。 */
export function CoverArt({ art }: { art: CoverStyle['art'] }) {
  switch (art) {
    case 'prism':
      return (
        <svg viewBox="0 0 200 130" aria-hidden>
          <path d="M70 100 L100 36 L130 100 Z" {...line} fill="rgba(246,236,212,.12)" />
          <path d="M8 78 L88 68" {...line} strokeWidth={2.2} />
          <path d="M112 62 L194 38" stroke="#e9736a" strokeWidth="3" opacity=".9" />
          <path d="M112 66 L194 50" stroke="#f0b14c" strokeWidth="3" opacity=".9" />
          <path d="M112 70 L194 62" stroke="#e8d95c" strokeWidth="3" opacity=".9" />
          <path d="M112 74 L194 74" stroke="#76c08a" strokeWidth="3" opacity=".9" />
          <path d="M112 78 L194 86" stroke="#6aa6d8" strokeWidth="3" opacity=".9" />
          <path d="M112 82 L194 98" stroke="#8a79c8" strokeWidth="3" opacity=".9" />
          <path d="M14 112 q8 -12 16 0 t16 0 t16 0 t16 0" {...line} opacity=".7" />
        </svg>
      );
    case 'circuit':
      return (
        <svg viewBox="0 0 200 130" aria-hidden>
          <path d="M40 112 H160 V46 H128 M72 46 H40 V112" {...line} opacity=".75" />
          <path d="M92 112 v-8 M92 100 v-16 M104 106 v-4 M104 100 v-18" {...line} />
          <circle cx="100" cy="42" r="18" {...line} fill="rgba(255,226,140,.28)" />
          <path d="M92 52 h16 M94 58 h12 M95 46 q-5-10 5-12 q10 2 5 12" {...line} />
          <path d="M100 8 v8 M70 18 l6 6 M130 18 l-6 6 M58 40 h8 M134 40 h8" stroke="#ffe08c" strokeWidth="2" strokeLinecap="round" />
          <rect x="146" y="74" width="12" height="22" rx="2" {...line} opacity=".8" />
        </svg>
      );
    case 'orbit':
      return (
        <svg viewBox="0 0 200 130" aria-hidden>
          <ellipse cx="104" cy="68" rx="86" ry="34" transform="rotate(-14 104 68)" {...line} opacity=".55" />
          <ellipse cx="104" cy="68" rx="58" ry="22" transform="rotate(-14 104 68)" {...line} opacity=".7" />
          <circle cx="104" cy="68" r="17" fill="#f6ecd4" opacity=".9" />
          <circle cx="156" cy="42" r="6" fill="#f6ecd4" opacity=".85" />
          <circle cx="52" cy="92" r="5" fill="#f6ecd4" opacity=".8" />
          <path d="M30 20 l10 -2 -4 10 10 -2 -16 22 3 -14 -9 2 z" fill="#fff3c4" opacity=".85" />
        </svg>
      );
    case 'molecule':
      return (
        <svg viewBox="0 0 200 130" aria-hidden>
          <path d="M38 78 L66 52 L98 62 L116 34" {...line} opacity=".8" />
          <path d="M66 52 L60 24" {...line} opacity=".8" />
          <circle cx="38" cy="78" r="9" fill="#f6ecd4" opacity=".9" />
          <circle cx="66" cy="52" r="12" fill="#f6ecd4" opacity=".95" />
          <circle cx="98" cy="62" r="8" fill="#f6ecd4" opacity=".85" />
          <circle cx="116" cy="34" r="9" fill="#f6ecd4" opacity=".9" />
          <circle cx="60" cy="24" r="7" fill="#f6ecd4" opacity=".8" />
          <path d="M138 20 h14 M142 20 v26 l-18 52 q-2 8 6 8 h36 q8 0 6 -8 l-18 -52 v-26" {...line} fill="rgba(246,236,212,.12)" />
          <path d="M128 92 q12 -6 24 0 t24 0" stroke="#bfe7d2" strokeWidth="2.4" fill="none" opacity=".8" />
        </svg>
      );
    case 'flask':
      return (
        <svg viewBox="0 0 200 130" aria-hidden>
          <path d="M60 14 h22 M66 14 v28 q-30 18 -30 52 q0 24 30 24 h0 q30 0 30 -24 q0 -34 -30 -52 v-28" transform="translate(6 0)" {...line} fill="rgba(246,236,212,.1)" />
          <path d="M48 86 q30 -10 60 0" stroke="#bfe7d2" strokeWidth="2.4" fill="none" opacity=".85" />
          <path d="M132 40 h46 v76 h-46 z M132 62 h10 M132 82 h10 M132 100 h10" {...line} />
          <path d="M136 92 h38 v22 h-38 z" fill="#bfe7d2" opacity=".35" />
          <path d="M112 26 l8 -5 8 5 v9 l-8 5 -8 -5 z" {...line} opacity=".55" />
        </svg>
      );
  }
}

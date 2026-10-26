/** 书架上的原创矢量小物件（纯装饰，aria-hidden）。 */
export const Beaker = () => (
  <svg viewBox="0 0 70 90" aria-hidden>
    <path d="M12 8 h46 M16 8 v62 q0 10 10 10 h18 q10 0 10 -10 v-62" fill="rgba(255,255,255,.35)" stroke="#8aa2a6" strokeWidth="2" />
    <path d="M17 44 h36 v26 q0 8 -9 8 h-18 q-9 0 -9 -8z" fill="#8fd0c0" opacity=".75" />
    <path d="M17 24 h8 M17 36 h8 M17 52 h8" stroke="#8aa2a6" strokeWidth="1.4" />
  </svg>
);
export const Flask = () => (
  <svg viewBox="0 0 70 90" aria-hidden>
    <path d="M28 6 h14 M30 6 v26 l-20 40 q-4 10 6 10 h38 q10 0 6 -10 l-20 -40 v-26" fill="rgba(255,255,255,.35)" stroke="#8aa2a6" strokeWidth="2" strokeLinejoin="round" />
    <path d="M17 62 l-4 8 q-2 6 4 6 h36 q6 0 4 -6 l-4 -8 q-17 -6 -36 0z" fill="#e9a49a" opacity=".8" />
  </svg>
);
export const TubeRack = () => (
  <svg viewBox="0 0 120 90" aria-hidden>
    <rect x="6" y="48" width="108" height="8" rx="2" fill="#a97a47" />
    <rect x="10" y="74" width="100" height="8" rx="2" fill="#a97a47" />
    <rect x="12" y="48" width="6" height="34" fill="#8e6436" /><rect x="102" y="48" width="6" height="34" fill="#8e6436" />
    {[22, 40, 58, 76, 94].map((x, i) => (
      <g key={x}>
        <rect x={x - 7} y="8" width="14" height="68" rx="7" fill="rgba(255,255,255,.4)" stroke="#8aa2a6" strokeWidth="1.6" />
        <rect x={x - 5.5} y={[50, 38, 56, 44, 52][i]} width="11" height={76 - [50, 38, 56, 44, 52][i] - 4} rx="5" fill={['#8fd0c0', '#f0c06a', '#c78ad0', '#e9a49a', '#8fb7e8'][i]} opacity=".85" />
      </g>
    ))}
  </svg>
);
export const Prism = () => (
  <svg viewBox="0 0 90 80" aria-hidden>
    <path d="M8 66 L45 8 L82 66 Z" fill="rgba(210,235,240,.5)" stroke="#8aa2a6" strokeWidth="2" strokeLinejoin="round" />
    <path d="M45 8 L82 66 L66 66 Z" fill="rgba(255,255,255,.35)" />
    <rect x="2" y="66" width="86" height="8" rx="2" fill="#a97a47" />
  </svg>
);
export const Cradle = () => (
  <svg viewBox="0 0 110 80" aria-hidden>
    <path d="M6 70 h98 M14 70 v-56 h82 v56" fill="none" stroke="#9aa0a6" strokeWidth="3" />
    {[30, 44, 58, 72, 86].map((x, i) => (
      <g key={x}>
        <path d={`M${x} 14 L${i === 0 ? x - 10 : x} 52`} stroke="#b7bcc2" strokeWidth="1.2" />
        <circle cx={i === 0 ? x - 11 : x} cy={i === 0 ? 56 : 58} r="6.5" fill="#d7dade" stroke="#8d939a" />
      </g>
    ))}
  </svg>
);
export const BookStack = () => (
  <svg viewBox="0 0 100 60" aria-hidden>
    <rect x="4" y="38" width="92" height="16" rx="2" fill="#7a5a8e" /><rect x="10" y="22" width="80" height="16" rx="2" fill="#c0a05a" /><rect x="16" y="8" width="70" height="14" rx="2" fill="#5e7f9a" />
    <path d="M8 46 h84 M14 30 h72 M20 15 h60" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" />
  </svg>
);
export const Molecule = () => (
  <svg viewBox="0 0 70 60" aria-hidden>
    <path d="M14 42 L34 30 L54 40 M34 30 L34 10" stroke="#8a7a68" strokeWidth="3" />
    <circle cx="14" cy="42" r="8" fill="#c95b4a" /><circle cx="34" cy="30" r="9" fill="#3a3a3a" /><circle cx="54" cy="40" r="7" fill="#e8e0d0" stroke="#aaa" /><circle cx="34" cy="10" r="7" fill="#e8e0d0" stroke="#aaa" />
  </svg>
);

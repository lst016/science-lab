import * as THREE from 'three';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finish(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 奶油纸面：细纤维噪点 + 书脊侧阴影。side: 'left' 阴影在右边缘，'right' 在左边缘 */
export function paperTexture(side: 'left' | 'right', seed = 1): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = canvas(w, h);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbf4e1';
  g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = `rgba(${150 + r() * 40},${120 + r() * 40},${70 + r() * 30},${r() * 0.05})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(150,120,80,${0.02 + r() * 0.03})`;
    g.lineWidth = 0.6;
    g.beginPath();
    const x = r() * w;
    const y = r() * h;
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 26, y + (r() - 0.5) * 26);
    g.stroke();
  }
  // 书脊处下陷阴影
  const gx = side === 'right' ? 0 : w;
  const grad = g.createLinearGradient(gx, 0, side === 'right' ? w * 0.24 : w * 0.76, 0);
  grad.addColorStop(0, 'rgba(110,80,40,0.34)');
  grad.addColorStop(0.35, 'rgba(110,80,40,0.1)');
  grad.addColorStop(1, 'rgba(110,80,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // 外缘轻微泛黄
  const ox = side === 'right' ? w : 0;
  const og = g.createLinearGradient(ox, 0, side === 'right' ? w * 0.9 : w * 0.1, 0);
  og.addColorStop(0, 'rgba(180,140,80,0.14)');
  og.addColorStop(1, 'rgba(180,140,80,0)');
  g.fillStyle = og;
  g.fillRect(0, 0, w, h);
  return finish(c);
}

/** 书页切口：细横线 */
export function edgeTexture(): THREE.CanvasTexture {
  const c = canvas(8, 128);
  const g = c.getContext('2d')!;
  g.fillStyle = '#efe4c8';
  g.fillRect(0, 0, 8, 128);
  for (let y = 0; y < 128; y += 3) {
    g.fillStyle = y % 6 === 0 ? 'rgba(120,90,50,0.35)' : 'rgba(120,90,50,0.16)';
    g.fillRect(0, y, 8, 1);
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** 皮革/布面 */
export function leatherTexture(base = '#8e5a2b'): THREE.CanvasTexture {
  const c = canvas(256, 256);
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 9000; i++) {
    const l = r() > 0.5;
    g.fillStyle = l ? `rgba(255,220,170,${r() * 0.07})` : `rgba(30,10,0,${r() * 0.1})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** 在书页上写印刷页脚等小字 */
export function folioTexture(lines: { text: string; x: number; y: number; size: number; align?: CanvasTextAlign; color?: string }[], side: 'left' | 'right'): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = canvas(w, h);
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, w, h);
  for (const l of lines) {
    g.font = `${l.size}px "Songti SC","STSong","Noto Serif CJK SC",serif`;
    g.fillStyle = l.color ?? 'rgba(90,70,48,0.7)';
    g.textAlign = l.align ?? 'left';
    g.fillText(l.text, l.x, l.y);
  }
  // 印刷边框线
  g.strokeStyle = 'rgba(120,90,50,0.16)';
  g.lineWidth = 1.2;
  const m = 26;
  g.strokeRect(side === 'right' ? m + 20 : m, m, w - m * 2 - 20, h - m * 2);
  return finish(c);
}

/** 封面贴图（书盖外侧）：纯色皮革 + 标题 */
export function coverTexture(color: string, title: string, sub: string): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = canvas(w, h);
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  const r = rng(11);
  for (let i = 0; i < 12000; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.06})` : `rgba(0,0,0,${r() * 0.1})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  g.strokeStyle = 'rgba(246,236,212,0.55)';
  g.lineWidth = 3;
  g.strokeRect(34, 34, w - 68, h - 68);
  g.lineWidth = 1;
  g.strokeRect(44, 44, w - 88, h - 88);
  g.fillStyle = '#f6ecd4';
  g.textAlign = 'center';
  g.font = '700 118px "Songti SC","STSong","Noto Serif CJK SC",serif';
  g.fillText(title, w / 2, 250);
  g.font = '40px "Songti SC","STSong","Noto Serif CJK SC",serif';
  g.fillText(sub, w / 2, 320);
  g.font = '24px "Songti SC","STSong","Noto Serif CJK SC",serif';
  g.globalAlpha = 0.75;
  g.fillText('初中理化实验书 · 互动实验', w / 2, 560);
  return finish(c);
}

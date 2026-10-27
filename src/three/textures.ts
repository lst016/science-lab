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

/** 白色柔软纸面：极淡纤维噪点 + 中缝内凹阴影 + 外缘轻微卷边光。side: 'left' 阴影在右边缘，'right' 在左边缘 */
export function paperTexture(side: 'left' | 'right', seed = 1): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = canvas(w, h);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fdfcf8';
  g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 3200; i++) {
    const v = 150 + r() * 70;
    g.fillStyle = `rgba(${v},${v - 4},${v - 14},${r() * 0.035})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(150,145,130,${0.015 + r() * 0.02})`;
    g.lineWidth = 0.6;
    g.beginPath();
    const x = r() * w;
    const y = r() * h;
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 26, y + (r() - 0.5) * 26);
    g.stroke();
  }
  // 中缝：窄而深的折线暗部 + 宽而淡的页面下弯渐变
  const gx = side === 'right' ? 0 : w;
  const dir = side === 'right' ? 1 : -1;
  const grad = g.createLinearGradient(gx, 0, gx + dir * w * 0.3, 0);
  grad.addColorStop(0, 'rgba(70,66,58,0.38)');
  grad.addColorStop(0.06, 'rgba(70,66,58,0.2)');
  grad.addColorStop(0.3, 'rgba(70,66,58,0.07)');
  grad.addColorStop(1, 'rgba(70,66,58,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // 外缘极轻的暖灰，让白页不过曝
  const ox = side === 'right' ? w : 0;
  const og = g.createLinearGradient(ox, 0, ox - dir * w * 0.06, 0);
  og.addColorStop(0, 'rgba(120,115,100,0.1)');
  og.addColorStop(1, 'rgba(120,115,100,0)');
  g.fillStyle = og;
  g.fillRect(0, 0, w, h);
  return finish(c);
}

/** 书页切口：细而淡的叠页横线 */
export function edgeTexture(): THREE.CanvasTexture {
  const c = canvas(8, 128);
  const g = c.getContext('2d')!;
  g.fillStyle = '#f6f4ee';
  g.fillRect(0, 0, 8, 128);
  for (let y = 0; y < 128; y += 3) {
    g.fillStyle = y % 6 === 0 ? 'rgba(110,105,92,0.3)' : 'rgba(110,105,92,0.14)';
    g.fillRect(0, y, 8, 1);
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** 芥末黄布面封皮：细布纹 */
export function leatherTexture(base = '#d6a420'): THREE.CanvasTexture {
  const c = canvas(256, 256);
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 6000; i++) {
    const l = r() > 0.5;
    g.fillStyle = l ? `rgba(255,236,170,${r() * 0.06})` : `rgba(70,40,0,${r() * 0.07})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  g.lineWidth = 1;
  for (let y = 0; y < 256; y += 3) {
    g.fillStyle = `rgba(90,60,0,${0.02 + r() * 0.025})`;
    g.fillRect(0, y, 256, 1);
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** 桌面：浅色木纹（横向长纹） */
export function deskTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = canvas(w, h);
  const g = c.getContext('2d')!;
  g.fillStyle = '#dedacb';
  g.fillRect(0, 0, w, h);
  const r = rng(23);
  for (let i = 0; i < 420; i++) {
    const y = r() * h;
    const len = 120 + r() * 520;
    const x = r() * w;
    const dark = r() > 0.45;
    g.strokeStyle = dark ? `rgba(120,112,92,${0.04 + r() * 0.08})` : `rgba(255,255,248,${0.08 + r() * 0.1})`;
    g.lineWidth = 0.6 + r() * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y + (r() - 0.5) * 3);
    g.stroke();
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

/** 灰绿桌垫：细毡面 */
export function matTexture(): THREE.CanvasTexture {
  const c = canvas(256, 256);
  const g = c.getContext('2d')!;
  g.fillStyle = '#8f9d96';
  g.fillRect(0, 0, 256, 256);
  const r = rng(31);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.07})` : `rgba(30,45,40,${r() * 0.08})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 10);
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
    g.fillStyle = l.color ?? 'rgba(80,76,68,0.7)';
    g.textAlign = l.align ?? 'left';
    g.fillText(l.text, l.x, l.y);
  }
  // 印刷边框线
  g.strokeStyle = 'rgba(110,105,92,0.14)';
  g.lineWidth = 1.2;
  const m = 26;
  // Keep the paper unframed, as in a printed science book.
  return finish(c);
}

/** 封面贴图（书盖外侧）：芥末黄布面 + 烫印标题 */
export function coverTexture(color: string, title: string, sub: string): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = canvas(w, h);
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  const r = rng(11);
  for (let i = 0; i < 8000; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.05})` : `rgba(0,0,0,${r() * 0.07})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  g.strokeStyle = 'rgba(253,248,226,0.6)';
  g.lineWidth = 2;
  g.strokeRect(34, 34, w - 68, h - 68);
  g.fillStyle = '#fdf8e2';
  g.textAlign = 'center';
  g.font = '700 118px "Songti SC","STSong","Noto Serif CJK SC",serif';
  g.fillText(title, w / 2, 250);
  g.font = '40px "Songti SC","STSong","Noto Serif CJK SC",serif';
  g.fillText(sub, w / 2, 320);
  g.font = '24px "Songti SC","STSong","Noto Serif CJK SC",serif';
  g.globalAlpha = 0.75;
  g.fillText('初中理化实验室 · 互动实验', w / 2, 560);
  return finish(c);
}

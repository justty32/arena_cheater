import { ARENA_RADIUS, type ArenaEffect } from './model';
import { FORESHORTENING, project, type Projection } from './projection';
type Context = CanvasRenderingContext2D;
const bolt = (ctx: Context, x: number, y: number, size: number): void => {
  ctx.beginPath(); ctx.moveTo(x + size * .2, y - size); ctx.lineTo(x - size * .3, y); ctx.lineTo(x + size * .2, y - size * .12); ctx.lineTo(x - size * .2, y + size); ctx.stroke();
};

export function drawAreaCard(ctx: Context, kind: 'lightning-rain' | 'divine-wrath'): void {
  ctx.save(); ctx.lineCap = 'round';
  if (kind === 'lightning-rain') {
    ctx.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) bolt(ctx, i * 20, i === 0 ? 3 : -2, i === 0 ? 24 : 17);
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 29, 30, 7, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -10, 18, Math.PI, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 24, -10 + Math.sin(a) * 24); ctx.lineTo(Math.cos(a) * 30, -10 + Math.sin(a) * 30); ctx.stroke(); }
    ctx.lineWidth = 4; bolt(ctx, 0, 6, 24);
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 32, 33, 8, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function clipArena(ctx: Context, p: Projection): void {
  ctx.beginPath(); ctx.ellipse(p.cx, p.cy, ARENA_RADIUS * p.scale, ARENA_RADIUS * p.scale * FORESHORTENING, 0, 0, Math.PI * 2); ctx.clip();
}

export function drawAreaPreview(ctx: Context, p: Projection, point: {x:number;y:number}, radius: number, color: string, legal: boolean, count: number): void {
  const at = project(point.x, point.y, p);
  ctx.save(); clipArena(ctx, p);
  ctx.strokeStyle = legal && count ? color : '#d2b9a2'; ctx.lineWidth = 2;
  ctx.fillStyle = legal && count ? `${color}25` : '#d2b9a20b';
  if (!legal || !count) ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.ellipse(at.x, at.y, radius * p.scale, radius * p.scale * FORESHORTENING, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.strokeStyle = legal && count ? color : '#e1b6a8'; ctx.lineWidth = 1.5;
  if (legal) { ctx.beginPath(); ctx.moveTo(at.x - 5, at.y); ctx.lineTo(at.x + 5, at.y); ctx.moveTo(at.x, at.y - 5); ctx.lineTo(at.x, at.y + 5); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(at.x - 5, at.y - 5); ctx.lineTo(at.x + 5, at.y + 5); ctx.moveTo(at.x + 5, at.y - 5); ctx.lineTo(at.x - 5, at.y + 5); ctx.stroke(); }
  ctx.restore();
}

/** Read simulation time only: paused casts remain at the first visible strike. */
export function drawAreaEffect(ctx: Context, p: Projection, effect: ArenaEffect, time: number): void {
  const age = time - effect.at;
  if (age < 0 || age > 1.2 || effect.areaRadius === undefined) return;
  const at = project(effect.x, effect.y, p), radius = effect.areaRadius * p.scale;
  const strong = effect.cardId === 'divine-wrath';
  ctx.save(); clipArena(ctx, p); ctx.globalAlpha = Math.max(0, 1 - age / 1.2);
  ctx.strokeStyle = effect.color; ctx.fillStyle = `${effect.color}20`; ctx.lineWidth = strong ? 2.5 : 1.5;
  ctx.beginPath(); ctx.ellipse(at.x, at.y, radius, radius * FORESHORTENING, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const progress = Math.min(1, age / .8);
  ctx.globalAlpha *= .65; ctx.beginPath(); ctx.ellipse(at.x, at.y, radius * (.45 + progress * .55), radius * FORESHORTENING * (.45 + progress * .55), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = Math.max(0, 1 - age / .65); ctx.lineWidth = strong ? 2.5 : 1.5;
  for (let i = 0; i < (strong ? 5 : 3); i++) {
    const angle = i * 2.4, spread = radius * (i === 0 ? 0 : .55);
    bolt(ctx, at.x + Math.cos(angle) * spread, at.y + Math.sin(angle) * spread * FORESHORTENING - p.scale * .5, p.scale * (strong ? .8 : .6));
  }
  ctx.restore();
}

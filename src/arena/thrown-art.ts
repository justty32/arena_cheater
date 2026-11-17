/** One-use projectiles have their own silhouette and never enter a fighter's hand slots. */
export function drawThrowable(ctx: CanvasRenderingContext2D, kind: 'stone' | 'pot'): void {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineWidth = 1.7;
  if (kind === 'stone') {
    ctx.fillStyle = '#969eaa'; ctx.strokeStyle = '#303844';
    ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(-10, -6); ctx.lineTo(0, -12); ctx.lineTo(11, -5); ctx.lineTo(13, 5); ctx.lineTo(4, 11); ctx.lineTo(-7, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#cad1d5'; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(0, -12); ctx.lineTo(6, -3); ctx.lineTo(-4, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#667481'; ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(4, 11); ctx.moveTo(-4, 1); ctx.lineTo(-7, 10); ctx.stroke();
  } else {
    ctx.strokeStyle = '#deac76'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(-11, -3, 6, 8, -.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(11, -3, 6, 8, .2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#bd7c4e'; ctx.strokeStyle = '#593c30'; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(-6, -9); ctx.bezierCurveTo(-20, -1, -13, 14, -5, 16); ctx.lineTo(5, 16); ctx.bezierCurveTo(13, 14, 20, -1, 6, -9); ctx.lineTo(6, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0bf82'; ctx.fillRect(-8, -18, 16, 4);
    ctx.strokeStyle = '#edd09d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, -1); ctx.quadraticCurveTo(0, 4, 11, -1); ctx.stroke();
    ctx.strokeStyle = '#754c39'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(3, 5); ctx.lineTo(-1, 8); ctx.lineTo(2, 11); ctx.lineTo(-2, 15); ctx.stroke();
  }
  ctx.restore();
}

export function drawThrowImpact(ctx: CanvasRenderingContext2D, kind: 'stone' | 'pot', age: number, scale: number): void {
  ctx.save();
  ctx.globalAlpha *= Math.max(0, 1 - age / 1.2);
  ctx.strokeStyle = kind === 'pot' ? '#e0ad78' : '#b4becb';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 0, (6 + age * 19) * scale, (3 + age * 8) * scale, 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4;
    const distance = (5 + age * (18 + i * 2)) * scale;
    const lift = Math.sin(Math.min(1, age / .7) * Math.PI) * (6 + i) * scale;
    ctx.save(); ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance * .45 - lift); ctx.rotate(angle + age * 2);
    ctx.fillStyle = kind === 'pot' ? (i % 2 ? '#e0ad78' : '#aa6845') : '#b4becb';
    if (kind === 'pot') {
      ctx.beginPath(); ctx.moveTo(-3 * scale, -3 * scale); ctx.lineTo(4 * scale, -scale); ctx.lineTo(scale, 4 * scale); ctx.closePath(); ctx.fill();
    } else { ctx.beginPath(); ctx.arc(0, 0, (1 + i % 2) * scale, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
}

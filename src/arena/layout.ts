import { CARDS } from './model';
import type { Card, Fighter } from './model';

export function arenaLayout(fighters: Fighter[]): string {
  return `<div class="arena-app">
    <header class="arena-header">
      <a class="arena-brand" href="./" aria-label="詐賭競技場首頁"><span class="brand-mark">♜</span><span><small>THE CROOKED ARENA</small><strong>詐賭競技場</strong></span></a>
      <div class="arena-motto">勝負在場上，<em>規則在你手中。</em></div>
      <span class="prototype-label"><i></i> 可玩原型</span>
    </header>
    <main class="arena-workspace">
      <section class="arena-stage" aria-label="競技場">
        <div class="arena-stage-top"><div class="arena-title"><span class="live-dot"></span><span data-status>入場就緒</span><span class="arena-divider">/</span><span data-round>第 01 場</span></div><div class="arena-stats"><span>存活 <b data-alive>7</b><small>/ 7</small></span><time data-testid="arena-time">00:00</time></div></div>
        <div class="arena-canvas-wrap"><canvas data-testid="arena-canvas" aria-label="45 度俯視競技場；點選鬥士查看，選卡後點選目標施放" role="img"></canvas><div class="arena-floor-label"><span>八門鬥場</span><small>THE OCTAGON GATES</small></div><div class="arena-result" data-result hidden><span>戰鬥落幕</span><h2 data-result-title></h2><p data-result-copy></p><button data-result-reset>再開一場 ↗</button></div></div>
        <div class="arena-controls"><div class="battle-actions"><button class="arena-primary" data-testid="arena-start">開始混戰</button><button class="arena-reset" data-testid="arena-reset" title="重新開一場">↻ 重開</button></div><div class="arena-speeds" aria-label="戰鬥速度">${[0.25, 0.5, 1, 2, 3].map((n) => `<button data-speed="${n}" aria-pressed="${n === 1}" aria-label="${n} 倍速">${n}×</button>`).join('')}</div></div>
      </section>
      <aside class="arena-sidebar" aria-label="鬥士與戰報">
        <section class="arena-panel contenders"><div class="panel-heading"><h2>場上鬥士</h2><span>選擇你的贏家</span></div><div class="fighter-list">${fighters.map((f, i) => `<button class="fighter-row" data-fighter="${f.id}" aria-pressed="false" style="--fighter-color:${f.color}"><span class="fighter-number">0${i + 1}</span><span class="fighter-info"><span class="fighter-name">${f.name}<i data-row-badge></i></span><span class="fighter-mini-bar"><i data-row-hp></i></span></span><small data-row-status></small></button>`).join('')}</div></section>
        <section class="arena-panel fighter-detail"><div class="detail-heading"><h2 data-detail-name></h2><span data-detail-pose data-testid="arena-pose"></span></div><div class="detail-resource"><span>生命</span><strong data-detail-hp></strong></div><div class="detail-bar health"><i data-detail-health-bar></i></div><div class="detail-resource"><span>體力</span><strong data-detail-stamina></strong></div><div class="detail-bar stamina"><i data-detail-stamina-bar></i></div><div class="detail-equipment"><span>手持裝備</span><strong data-detail-weapon data-testid="arena-equipment"></strong></div><div class="equipment-counts"><span>剩餘箭數 <b data-testid="arena-ammo">—</b></span><span>木棍可命中 <b data-testid="arena-durability">—</b></span></div><small class="detail-defense" data-detail-defense></small><small class="detail-buffs" data-detail-buffs></small><button class="support-button" data-support>支持這位鬥士</button></section>
        <section class="arena-panel battle-log"><div class="panel-heading"><h2>場邊耳語</h2><span>戰鬥紀錄</span></div><ol data-log></ol></section>
      </aside>
      <section class="arena-hand" aria-label="作弊卡牌">
        <div class="hand-heading"><div><span class="section-eyebrow">YOUR SLEIGHT OF HAND</span><h2 data-card-prompt>選擇一張牌，左右這場勝負</h2></div><div class="player-resources"><div class="mana-resource"><span>◈ 巫師魔力</span><strong><b data-testid="arena-mana">0</b><small>/ 100</small></strong><div class="mana-meter"><i data-mana-fill></i></div></div><div class="gold-resource"><span>◉ 金錢</span><strong data-testid="arena-gold">0</strong></div></div></div>
        <div class="arena-cards">${CARDS.map((card, i) => `<button class="arena-card" data-card="${card.id}" aria-pressed="false" style="--card-color:${card.color}" aria-label="${card.name}，${card.cost}${card.currency === 'mana' ? '魔力' : '金錢'}，${card.description}"><span class="card-top"><kbd>${i + 1}</kbd><span class="card-cost ${card.currency}">${card.currency === 'mana' ? '◈' : '◉'} ${card.cost}</span></span><canvas class="card-art" data-card-art="${card.id}" width="180" height="94" aria-hidden="true"></canvas><span class="card-name">${card.name}</span><span class="card-subtitle">${card.subtitle}</span><span class="card-description">${card.description}</span></button>`).join('')}</div>
        <div class="hand-footer"><p data-testid="arena-feedback" role="status" aria-live="polite"></p><button data-cancel hidden>取消選牌 <kbd>ESC</kbd></button><span class="hand-tip">拖曳施放 · 或選卡後點擊目標</span></div>
      </section>
    </main>
    <footer class="arena-footer"><span>沒有人喜歡作弊，除了贏的那個。</span><a href="?prototype=classic">舊版棋盤原型 ↗</a></footer>
    <div class="card-drag-label" data-drag-label hidden></div>
  </div>`;
}

export function drawCardArt(canvas: HTMLCanvasElement, card: Card): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.translate(w / 2, h / 2);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 47);
  glow.addColorStop(0, `${card.color}40`); glow.addColorStop(1, `${card.color}00`);
  ctx.fillStyle = glow; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = `${card.color}50`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 31, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 38, -0.3, 2.5); ctx.stroke();
  ctx.strokeStyle = card.color; ctx.fillStyle = card.color; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const line = (points: number[][]) => { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  if (card.id === 'sword') {
    ctx.rotate(0.55); ctx.beginPath(); ctx.moveTo(-5, 15); ctx.lineTo(-5, -20); ctx.lineTo(0, -32); ctx.lineTo(5, -20); ctx.lineTo(5, 15); ctx.closePath(); ctx.fill();
    line([[-14, 17], [14, 17]]); line([[0, 17], [0, 30]]);
  } else if (card.id === 'shield') {
    ctx.beginPath(); ctx.moveTo(-22, -20); ctx.quadraticCurveTo(0, -10, 22, -20); ctx.lineTo(19, 4); ctx.quadraticCurveTo(12, 22, 0, 28); ctx.quadraticCurveTo(-12, 22, -19, 4); ctx.closePath(); ctx.stroke();
    line([[0, -12], [0, 17]]); line([[-11, 0], [11, 0]]);
  } else if (card.id === 'bow') {
    ctx.rotate(-0.35);
    ctx.beginPath(); ctx.moveTo(-13, -31); ctx.quadraticCurveTo(35, 0, -13, 31); ctx.stroke();
    ctx.lineWidth = 1.5; line([[-13, -31], [-19, 0], [-13, 31]]);
    ctx.lineWidth = 2; line([[-28, 0], [32, 0]]); line([[25, -5], [32, 0], [25, 5]]);
    line([[-25, -4], [-20, 0], [-25, 4]]);
  } else if (card.id === 'club') {
    ctx.rotate(0.6); ctx.beginPath(); ctx.roundRect(-9, -30, 18, 37, 6); ctx.fill(); line([[0, 6], [0, 31]]);
    ctx.strokeStyle = '#33281f'; line([[-3, -24], [-3, -7]]);
  } else if (card.id === 'fury') {
    line([[-20, 18], [-23, 3], [-16, -4], [-14, -20], [-6, -23], [-2, -7], [4, -25], [12, -22], [12, -6], [19, -15], [25, -9], [18, 17], [6, 26], [-12, 25], [-20, 18]]);
  } else if (card.id === 'haste') {
    line([[10, -28], [-14, 1], [3, 1], [-10, 28], [23, -7], [6, -7], [10, -28]]);
    line([[-28, -9], [-15, -9]]); line([[-30, 5], [-21, 5]]);
  } else if (card.id === 'weakness') {
    ctx.beginPath(); ctx.ellipse(0, -2, 23, 17, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -2, 8, 0, Math.PI * 2); ctx.stroke(); line([[-17, 27], [18, -28]]);
  } else {
    line([[-25, 22], [25, 22]]); line([[-17, -19], [-2, -5], [17, -18]]); line([[-2, -5], [-10, 10], [10, 10], [18, 19]]);
    ctx.beginPath(); ctx.arc(-23, -25, 6, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 5; i++) { const a = i * 1.9; ctx.fillRect(Math.cos(a) * 45, Math.sin(a) * 31, 2, 2); }
}

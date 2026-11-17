import { drawAreaCard } from './area-art';
import { drawThrowable } from './thrown-art';
import type { Card, Fighter, StoneColor, StoneCost } from './model';

export function arenaLayout(fighters: Fighter[]): string {
  return `<div class="arena-app">
    <header class="arena-header">
      <a class="arena-brand" href="./" aria-label="詐賭競技場首頁"><span class="brand-mark">♜</span><span><small>THE CROOKED ARENA</small><strong>詐賭競技場</strong></span></a>
      <div class="arena-motto">勝負在場上，<em>規則在你手中。</em></div>
      <span class="prototype-label"><i></i> 可玩原型</span>
    </header>
    <main class="arena-workspace">
      <section class="arena-stage" aria-label="競技場">
        <div class="arena-stage-top"><div class="arena-title"><span class="live-dot"></span><span data-status>入場就緒</span><span class="arena-divider">/</span><span data-round>第 01 場</span></div><div class="support-hud" data-testid="arena-support-hud" data-fighter-id="" data-state="unset"><div class="support-readout"><span data-testid="arena-support-state">支持</span><strong data-testid="arena-support-name"></strong><span data-testid="arena-support-hp"></span><button class="support-change" data-support-change data-testid="arena-support-change" aria-label="更換支持的鬥士" hidden>更換</button></div><div class="support-health" data-support-health role="progressbar" aria-label="支持者生命" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><i></i></div><span class="support-announcement" data-support-announcement role="status" aria-live="polite"></span></div><div class="arena-stats"><span>存活 <b data-alive>7</b><small>/ 7</small></span><time data-testid="arena-time">00:00</time></div></div>
        <div class="arena-canvas-wrap"><canvas data-testid="arena-canvas" aria-label="45 度俯視競技場；點選鬥士查看，選卡後點選目標施放" role="img"></canvas><div class="arena-floor-label"><span>八門鬥場</span><small>THE OCTAGON GATES</small></div><div class="arena-result" data-result hidden><span>戰鬥落幕</span><h2 data-result-title></h2><p data-result-copy></p><button data-result-reset>再開一場 ↗</button></div></div>
        <div class="arena-controls"><div class="battle-actions"><button class="arena-primary" data-testid="arena-start">開始混戰</button><button class="arena-reset" data-testid="arena-reset" title="重新開一場">↻ 重開</button></div><div class="arena-speeds" aria-label="戰鬥速度">${[0.25, 0.5, 1, 2, 3].map((n) => `<button data-speed="${n}" aria-pressed="${n === 1}" aria-label="${n} 倍速">${n}×</button>`).join('')}</div></div>
      </section>
      <aside class="arena-sidebar" aria-label="鬥士與戰報">
        <details class="arena-panel contenders" data-mobile-panel="fighters" open><summary data-testid="arena-fighters-toggle">鬥士名單 · 點選查看</summary><div class="panel-heading"><h2>場上鬥士</h2><span>查看後可支持</span></div><div class="fighter-list">${fighters.map((f, i) => `<button class="fighter-row" data-fighter="${f.id}" aria-pressed="false" style="--fighter-color:${f.color}"><span class="fighter-number">0${i + 1}</span><span class="fighter-info"><span class="fighter-name">${f.name}<i data-row-badge></i></span><span class="fighter-mini-bar"><i data-row-hp></i></span></span><small data-row-status></small></button>`).join('')}</div></details>
        <details class="arena-panel fighter-detail" data-mobile-panel="detail" open><summary data-testid="arena-detail-toggle">鬥士詳情 <span data-detail-summary></span></summary><div class="detail-heading"><h2 data-detail-name></h2><span data-detail-pose data-testid="arena-pose"></span></div><button class="support-button" data-support>支持這位鬥士</button><p class="detail-trait" data-testid="arena-trait" hidden></p><div class="detail-resource"><span>生命</span><strong data-detail-hp></strong></div><div class="detail-bar health"><i data-detail-health-bar></i></div><div class="detail-resource"><span>體力</span><strong data-detail-stamina></strong></div><div class="detail-bar stamina"><i data-detail-stamina-bar></i></div><div class="detail-equipment"><span>手持裝備</span><strong data-detail-weapon data-testid="arena-equipment"></strong></div><div class="equipment-counts"><span>剩餘箭數 <b data-testid="arena-ammo">—</b></span><span>木棍可命中 <b data-testid="arena-durability">—</b></span></div><small class="detail-defense" data-detail-defense></small><small class="detail-buffs" data-detail-buffs></small></details>
        <details class="arena-panel battle-log" data-mobile-panel="log" open><summary data-testid="arena-log-toggle">戰報</summary><div class="panel-heading"><h2>場邊耳語</h2><span>戰鬥紀錄</span></div><ol data-log></ol></details>
      </aside>
      <section class="arena-hand" aria-label="作弊卡牌">
        <div class="hand-heading"><div><span class="section-eyebrow">YOUR SLEIGHT OF HAND</span><h2 data-card-prompt>三張手牌，改寫勝負</h2></div><div class="hand-heading-actions"><button data-cancel hidden>取消 <kbd>ESC</kbd></button><span class="hand-count" data-hand-count></span></div></div>
        <p class="recent-throw" data-testid="arena-recent-throw" hidden><span>最近投送</span><span data-throw-result></span></p>
        <div class="hand-table">
          <section class="stone-pouch" aria-label="魔法石袋"><div class="stone-heading"><h3>魔法石袋</h3><span data-stone-total></span></div><div class="stone-summary" data-stone-summary data-testid="arena-stone-summary"></div><details class="stone-payment" data-mobile-panel="payment" open><summary data-testid="arena-payment-toggle"><span data-payment-toggle-label>改選支付石</span><small data-payment-brief>選牌後可改選</small></summary><div class="stone-actions"><span data-stone-mode>持有魔法石</span><button data-testid="arena-payment-auto" hidden>自動選石</button></div><div class="stone-tray" data-testid="arena-stones" aria-label="持有魔法石"></div><p class="stone-help" data-stone-help>費用中的數字可用任意顏色支付。</p><p class="payment-preview" data-testid="arena-payment"></p></details></section>
          <div class="hand-play"><div class="arena-cards" data-hand-list></div><div class="card-detail" data-testid="arena-card-detail"><details class="card-effect" data-mobile-panel="effect" open><summary data-testid="arena-effect-toggle">完整效果與操作說明</summary><p data-selected-description>選牌後點擊鬥士施法，或點擊場地投送武器。</p></details><p class="throw-instruction" data-testid="arena-throw-range" hidden></p><p class="area-instruction" data-testid="arena-area-preview" data-target-count="0" data-valid="false" hidden></p></div></div>
          <details class="hand-exchange" data-mobile-panel="exchange" open><summary data-testid="arena-exchange-toggle">棄牌換石</summary><span class="section-eyebrow">A CHANGE OF FORTUNE</span><h3>換個手氣</h3><p>放棄一張手牌，重抽部分魔法石。</p><button data-testid="arena-redraw">棄牌換石</button><div data-redraw-controls hidden><p data-testid="arena-redraw-preview"></p><button data-testid="arena-redraw-confirm">確認換石</button></div><small data-redraw-help>先選一張要放棄的手牌。</small></details>
        </div>
        <div class="hand-footer"><p data-testid="arena-feedback" role="status" aria-live="polite"></p><span class="hand-tip">1–3 選牌 · 滑鼠拖曳或點選施放</span></div>
        <details class="hand-guide"><summary>怎麼動手腳？</summary><p>觸控先點牌，再點場內目標；滑鼠也可拖牌施放。起手三張牌、三顆魔法石。成功出牌後補兩顆石頭與一張牌；你支持的鬥士每次擊殺，再獲得三顆魔法石。彩色費用必須用同色石頭，數字費用可用任意顏色。選牌時會預選支付用石；點石頭可取消或改選，點目標才實際花費。</p></details>
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
  if (card.id === 'lightning-rain' || card.id === 'divine-wrath') {
    drawAreaCard(ctx, card.id);
  } else if (card.id === 'stone' || card.id === 'pot') {
    ctx.save(); ctx.scale(1.65, 1.65); drawThrowable(ctx, card.id); ctx.restore();
  } else if (card.id === 'sword') {
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
  } else if (card.id === 'bloodlust') {
    line([[-20, 18], [-23, 3], [-16, -4], [-14, -20], [-6, -23], [-2, -7], [4, -25], [12, -22], [12, -6], [19, -15], [25, -9], [18, 17], [6, 26], [-12, 25], [-20, 18]]);
  } else if (card.id === 'lightning') {
    line([[10, -28], [-14, 1], [3, 1], [-10, 28], [23, -7], [6, -7], [10, -28]]);
    line([[-28, -9], [-15, -9]]); line([[-30, 5], [-21, 5]]);
  } else if (card.id === 'growth') {
    line([[0, 29], [0, -20]]);
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-32, 6, -30, -24, -8, -12); ctx.quadraticCurveTo(0, -7, 0, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.bezierCurveTo(30, -4, 29, -34, 9, -23); ctx.quadraticCurveTo(0, -18, 0, -3); ctx.stroke();
    line([[-11, 29], [11, 29]]);
  } else {
    line([[-25, 22], [25, 22]]); line([[-17, -19], [-2, -5], [17, -18]]); line([[-2, -5], [-10, 10], [10, 10], [18, 19]]);
    ctx.beginPath(); ctx.arc(-23, -25, 6, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 5; i++) { const a = i * 1.9; ctx.fillRect(Math.cos(a) * 45, Math.sin(a) * 31, 2, 2); }
}


export const STONE_COLORS: StoneColor[] = ['yellow', 'blue', 'green', 'black', 'red'];
export const STONE_NAMES: Record<StoneColor, string> = { yellow: '黃', blue: '藍', green: '綠', black: '黑', red: '紅' };

export function costText(cost: StoneCost): string {
  return [cost.generic ? `任意色 ${cost.generic}` : '', ...STONE_COLORS.filter((color) => cost.colored[color]).map((color) => `${STONE_NAMES[color]} ${cost.colored[color]}`)].filter(Boolean).join(' ＋ ') || '免費';
}

export function handCardMarkup(card: Card, handId: number, index: number): string {
  const cost = `${card.cost.generic ? `<span class="cost-generic" title="任意顏色">${card.cost.generic}</span>` : ''}${STONE_COLORS.filter((color) => card.cost.colored[color]).map((color) => `<span class="cost-stone" data-color="${color}">${STONE_NAMES[color]}${card.cost.colored[color]! > 1 ? `×${card.cost.colored[color]}` : ''}</span>`).join('')}`;
  return `<button class="arena-card" data-testid="arena-hand-card" data-hand-card="${handId}" data-card="${card.id}" aria-pressed="false" style="--card-color:${card.color}" aria-label="${card.name}，費用 ${costText(card.cost)}，${card.description}"><span class="card-top"><kbd>${index + 1}</kbd><span class="card-cost">${cost}</span></span><canvas class="card-art" width="180" height="94" aria-hidden="true"></canvas><span class="card-name">${card.name}</span><span class="card-subtitle">${card.target === 'area' ? `範圍直徑 ${card.areaRadius * 2}m` : card.throwRange ? `一次投擲 · ${card.throwRange}m` : card.target === 'fighter' ? '指定鬥士' : '投向場地'}</span><span class="card-description">${card.description}</span><span class="card-affordability" data-affordability></span></button>`;
}

import { BATTLE_SPEEDS } from '../game/model';
import { CHEAT_COST, CHEAT_HEAL, CHEAT_STAMINA } from '../game/rules';
import { icon } from './icons';

export function mountLayout(root: HTMLElement): void {
  root.innerHTML = `
    <header class="site-header">
      <a class="brand" href="./" aria-label="競技場首頁"><span class="brand-mark">${icon('swords')}</span><span>ARENA<span class="brand-accent"> CHEATER</span></span></a>
      <span class="header-caption">奇幻競技場 · 戰鬥原型</span>
      <span class="version"><i></i> 原型 0.1</span>
    </header>
    <main class="app-shell">
      <div class="page-heading"><div><div class="eyebrow">THE ARENA / 競技場</div><h1>勝負，未必在棋盤上。</h1><p>觀察戰局，等待機會，悄悄改寫結果。</p></div><div class="arena-seal">${icon('eye')}<span>你在場邊<br><strong>翠綠旗的幕後推手</strong></span></div></div>
      <div class="arena-layout">
        <aside class="setup-panel">
          <section class="panel mode-panel"><div class="section-heading"><span class="section-index">01</span><h2>對戰模式</h2></div>
            <div class="mode-options" role="group" aria-label="對戰模式"><button class="mode-button" data-mode="duel" aria-pressed="true"><span class="mode-symbol">Ⅱ</span><span><strong>雙方對戰</strong><small>兩支小隊 · 6 名鬥士</small></span></button><button class="mode-button" data-mode="melee" aria-pressed="false"><span class="mode-symbol">Ⅳ</span><span><strong>四方混戰</strong><small>四支小隊 · 12 名鬥士</small></span></button></div>
            <p class="muted tiny mode-note">切換模式會重新佈陣。</p>
          </section>
          <section class="panel factions-panel"><div class="section-heading"><span class="section-index">02</span><h2>參戰陣營</h2></div><div id="team-list" class="team-list"></div><div class="rule-note">最後留在場上的陣營獲勝。</div></section>
          <section class="field-guide"><div class="eyebrow">觀戰筆記</div><p>鬥士會自行移動與出招。<br>點選棋子，查看他的狀態。</p><div class="resource-key"><span><i class="hp-dot"></i>生命</span><span><i class="mana-dot"></i>魔力</span><span><i class="stamina-dot"></i>耐力</span></div><p class="tiny muted">耐力快速恢復，魔力緩慢恢復。生命需要治療。</p></section>
        </aside>
        <section class="battle-panel" aria-label="競技場戰鬥">
          <div class="battle-topbar"><div class="battle-state"><i id="status-light"></i><span id="battle-status" data-testid="battle-status" role="status">等待開戰</span></div><div class="battle-clock"><span>戰鬥時間</span><strong id="battle-time" data-testid="battle-time">00:00</strong></div></div>
          <div class="battle-controls"><button id="start-button" class="primary-button" data-testid="start-button">${icon('play')}<span>開始戰鬥</span></button><button id="reset-button" class="icon-button" data-testid="reset-button" aria-label="重置戰鬥" title="重置戰鬥">${icon('reset')}</button><div class="speed-control" role="group" aria-label="戰鬥速度"><span>倍速</span>${BATTLE_SPEEDS.map((speed) => `<button data-speed="${speed}" aria-label="${speed} 倍速" aria-pressed="${speed === 1}">${speed}×</button>`).join('')}</div></div>
          <div class="board-frame"><div class="board-coordinates top" aria-hidden="true">${'ABCDEFGH'.split('').map((letter) => `<span>${letter}</span>`).join('')}</div><div class="board-coordinates side" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<span>${8 - i}</span>`).join('')}</div><div id="board" class="board" data-testid="board" role="group" aria-label="8 乘 8 戰鬥棋盤"><div class="board-tiles" aria-hidden="true">${Array.from({ length: 64 }, (_, i) => `<div class="tile board-cell ${(Math.floor(i / 8) + i % 8) % 2 ? 'dark' : 'light'}"></div>`).join('')}</div><div class="board-engraving" aria-hidden="true">${icon('swords')}</div><div id="pieces" class="pieces"></div><svg id="battle-effects" class="battle-effects" viewBox="0 0 800 800" aria-hidden="true"></svg><div id="battle-result" class="battle-result" hidden><div>${icon('crown')}<span class="eyebrow">戰鬥結束</span><strong id="result-title"></strong><small id="result-summary"></small></div></div></div><div class="board-bottom-label"><span>競技場 · 08 × 08</span><span>自動戰鬥</span></div></div>
          <div class="effect-guide" aria-label="戰鬥特效圖例"><span><i></i>箭矢</span><span><i class="fire-key"></i>火球</span><span><i class="bolt-key"></i>魔力彈</span><span>虛線＝攻擊目標</span></div>
          <p class="board-hint">${icon('eye')} 你的隊伍是翠綠旗。選中受傷的友軍，就能從場邊送上「一點幫助」。</p>
        </section>
        <aside class="tactics-panel">
          <section class="panel unit-panel"><div class="section-heading"><span class="section-index">03</span><h2>鬥士狀態</h2><span id="unit-coordinate" class="coordinate-badge"></span></div><div class="unit-heading"><div id="unit-portrait" class="unit-portrait"></div><div><span id="unit-team" class="eyebrow"></span><h3 id="unit-name"></h3><span id="unit-action" class="muted tiny"></span><span id="unit-target" class="unit-target"></span></div></div><div id="unit-resources">${[['hp', '生命'], ['mana', '魔力'], ['stamina', '耐力']].map(([key, label]) => `<div class="resource-row ${key}"><div><span>${label}</span><strong id="${key}-value" data-testid="${key === 'hp' ? 'selected-hp' : key + '-value'}"></strong></div><div class="resource-track"><span id="${key}-bar"></span></div></div>`).join('')}</div><div class="unit-stats"><span>攻擊 <strong id="unit-attack"></strong></span><span>護甲 <strong id="unit-armor"></strong></span><span>射程 <strong id="unit-range"></strong></span></div></section>
          <section class="panel cheat-panel"><div class="cheat-heading"><div class="section-heading"><span class="section-index">04</span><h2>場邊小動作</h2></div><span class="proposal-tag">試玩提案</span></div><div class="cheat-description"><span class="potion-emblem">${icon('potion')}</span><div><h3>偷渡藥劑</h3><p>生命 +${CHEAT_HEAL} · 耐力 +${CHEAT_STAMINA}</p></div></div><div class="influence-label"><span>場邊影響力</span><strong id="influence-value" data-testid="influence-value">100 / 100</strong></div><div class="resource-track influence-track"><span id="influence-bar"></span></div><button id="cheat-button" class="cheat-button" data-testid="cheat-button" disabled>${icon('potion')}<span>暗中遞送</span><small>${CHEAT_COST}</small></button><p id="cheat-hint" class="cheat-hint">開戰後，選擇受傷的翠綠旗友軍。</p><div id="cheat-feedback" class="sr-only" role="status"></div></section>
          <section class="panel log-panel"><div class="section-heading"><span class="section-index">05</span><h2>戰場紀事</h2><span class="live-label">即時</span></div><ol id="battle-log" class="battle-log" aria-label="最近戰鬥事件"><li class="log-empty">旗幟已升起，等待第一聲兵刃交鋒。</li></ol></section>
        </aside>
      </div>
      <footer class="page-footer"><span>ARENA CHEATER <i>／</i> 戰鬥實驗場</span><span>原型規則 · 數值可調</span></footer>
    </main>`;
}

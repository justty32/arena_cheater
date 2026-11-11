# arena_cheater

奇幻自動戰鬥網頁原型。七名獸人鬥士在圓形競技場混戰，玩家從場邊施法、投送武器，幫助支持的鬥士獲勝。場景採 45° 俯視 Canvas 2D，角色以程式繪製的骨骼部件與紙娃娃裝備呈現。

## 開始試玩

直接開啟 [GitHub Pages 線上試玩](https://justty32.github.io/arena_cheater/)，不需安裝。

## 本機執行

使用 Node.js 22.12.0 以上，在專案根目錄執行：

```sh
npm ci
npm run dev
```

開啟終端顯示的網址，預設為 `http://localhost:5173`。開戰前選鬥士並按「支持這位鬥士」，再按「開始混戰」。選卡後點選鬥士施法、點選地面投送裝備，也可直接拖曳卡牌到場上。任何鬥士都能搶走落地裝備。戰鬥可暫停、重開及切換 0.25×／0.5×／1×／2×／3× 倍速。暫停時仍可施法與投送，有效出牌會扣費；時間、資源恢復與飛行保持停止，按繼續後才推進。

快速切片包含怪力、興奮、虛弱、絆足咒，以及直劍、木棍、圓盾投送。木棍耐久、完整招架、其餘法術武器及陷阱尚待擴充；野獸與地形依原稿延後。操作、數值與限制見 [戰鬥原型](docs/combat-prototype.md)。

原本的 8 × 8 雙方／四方戰鬥仍可從頁尾「舊版棋盤原型」或網址加上 `?prototype=classic` 開啟，規則見 [經典原型](docs/classic-prototype.md)。

## 開發與驗證

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run build` 包含型別檢查，產物位於 `dist/`；`npm run preview` 可預覽建置結果。瀏覽器測試安裝與環境條件見 [開發環境](wf/workflows/dev-env.md)，檢查範圍見 [驗證](wf/workflows/testing.md)。

推送至 `main` 後，[部署工作流](.github/workflows/pages.yml) 會先執行核心測試、建置及瀏覽器測試，通過後自動更新 GitHub Pages。部署狀態見 [GitHub Actions](https://github.com/justty32/arena_cheater/actions/workflows/pages.yml)；設定與手動重跑方式見 [開發環境](wf/workflows/dev-env.md#github-pages)。

## 專案文件

- [PROJECT.md](PROJECT.md)：原始需求、已確認方向與尚未定案的內容。
- [戰鬥原型](docs/combat-prototype.md)：目前玩法、試玩數值與邏輯／畫面邊界。
- [AGENTS.md](AGENTS.md)：AI agent 入口。
- [wf/INDEX.md](wf/INDEX.md)：專案與工作流導航。
- [規劃入口](wf/workflows/planning/README.md)：需求原文、玩法與視覺規格、分期計畫。

工作流採 kernel＋dev，收在 `wf/`；來源與適配記錄見 [導入說明](wf/import.md)。Repository：[justty32/arena_cheater](https://github.com/justty32/arena_cheater)。

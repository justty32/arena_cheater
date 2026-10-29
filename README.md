# arena_cheater

奇幻類自走棋網頁原型。棋子在 8 × 8 競技場自動交戰，玩家從場邊選擇時機、偷渡藥劑支援自己的隊伍。

## 開始試玩

使用 Node.js 22.12.0 以上，在專案根目錄執行：

```sh
npm ci
npm run dev
```

開啟終端顯示的網址，預設為 `http://localhost:5173`。選雙方對戰或四方混戰，開始後可暫停、切換 1×／2×／3× 倍速；點選角色可查看動作和目標，觀察箭矢、火球與命中結果。選中翠綠旗的受傷角色，再使用偷渡藥劑。重置會建立一場新對戰。

這一版用來試戰鬥節奏與場邊介入。角色、數值與藥劑機制是試玩設定，裁判偵測、招募、裝備、養成與連線尚未實作；完整規則見 [戰鬥原型](docs/combat-prototype.md)。

## 開發與驗證

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run build` 包含型別檢查，產物位於 `dist/`；`npm run preview` 可預覽建置結果。瀏覽器測試安裝與環境條件見 [開發環境](wf/workflows/dev-env.md)，檢查範圍見 [驗證](wf/workflows/testing.md)。

## 專案文件

- [PROJECT.md](PROJECT.md)：原始需求、已確認方向與尚未定案的內容。
- [戰鬥原型](docs/combat-prototype.md)：目前玩法、試玩數值與邏輯／畫面邊界。
- [AGENTS.md](AGENTS.md)：AI agent 入口。
- [wf/INDEX.md](wf/INDEX.md)：專案與工作流導航。
- [規劃入口](wf/workflows/planning.md)：下一階段候選工作。

工作流採 kernel＋dev，收在 `wf/`；來源與適配記錄見 [導入說明](wf/import.md)。Repository：[justty32/arena_cheater](https://github.com/justty32/arena_cheater)。

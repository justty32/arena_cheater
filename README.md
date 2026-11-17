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

開啟終端顯示的網址，預設為 `http://localhost:5173`。開戰前選鬥士並按「支持這位鬥士」，再按「開始混戰」。選卡後點選鬥士施法、點選地面投送裝備，也可直接拖曳卡牌到場上。任何鬥士都能搶走落地裝備。戰鬥可暫停、重開及切換 0.25×／0.5×／1×／2×／3× 倍速。暫停時仍可施法與投送，有效出牌會扣費；時間、冷卻與飛行保持停止，按繼續後才推進。

場地上方固定顯示支持者的姓名、生命與陣亡狀態，查看其他鬥士時仍可追蹤支持者。

V2 改為起手三牌三石，成功出牌補兩石一牌；支持者擊殺補三石。十一種卡為石頭、陶罐、直劍、木棍、圓盾、長弓、閃電劍、閃電雨、神怒、殺紅眼、野性成長，有限牌庫十一種各兩張、共二十二張，抽乾洗棄牌。可選一牌與至少一石換石，棄 N 石得 N+1 石並補一牌，冷卻三遊戲秒；暫停凍結冷卻。牌庫組成與換石補牌／冷卻為可調預設。選卡自動預選支付石頭，可直接在石盤改選以保留稀缺色，或按「自動選石」重設；點目標才付款。付款與失敗提示改善已落地：改正選石後提示同步更新，無效出牌會說明原因且不消耗。

第三切片閃電雨與神怒已落地並通過工程驗證：點地預覽範圍，支持者也會受傷。第二切片加入固定席位、有限射程的石頭／陶罐投擲，裝備飛行可命中鬥士；狼擊殺獲限時狂熱、鹿速度最快，第二切片已通過工程驗證。弓附三箭，木棍兩次有效命中後折斷並能擊飛；雙手裝備與盾互斥，圓盾消耗體力格擋或招架。其餘 V2 卡牌、巫師與陷阱仍待擴充，野獸與地形依原稿延後。操作、數值與限制見 [戰鬥原型](docs/combat-prototype.md)。V2 手牌魔法石第一切片已落地並通過工程驗證。目前以本機版本為準，線上試玩在後續發布後更新。

原本的 8 × 8 雙方／四方戰鬥仍可從頁尾「舊版棋盤原型」或網址加上 `?prototype=classic` 開啟，規則見 [經典原型](docs/classic-prototype.md)。

窄螢幕布局已落地：三張手牌與五色石頭摘要保留在主要操作區；付款改選、完整效果、換石、鬥士名單／詳情與戰報可點標題展開，桌面維持展開顯示。已檢視的 390×844、320×740 畫面可同屏看見場地、三張牌與五色摘要；一般出牌流程可直接操作，進階選石、名單與換石需展開並可能局部捲動。

手牌標題下新增「最近投送」，可看最新一次投擲的飛行、命中實際傷害、互撞及拾取者，不必翻完整戰報；本批已落地並通過工程驗證。

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

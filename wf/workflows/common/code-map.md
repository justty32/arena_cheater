# code-map — 程式碼導航 index（哪個檔負責什麼）

[common/README](README.md)｜[INDEX](../../INDEX.md)

碰原始碼前先查這張表，只讀相關領域列出的檔；動完再照維護鏈把表更新回去。寫碼慣例本身在 [conventions](conventions.md)。

目前預設為 Canvas 2D 七人圓場原型，另保留 `?prototype=classic` 經典棋盤；玩法及實作假設見 [戰鬥原型](../../../docs/combat-prototype.md)。

## 領域表

<!-- wf-nav -->
| 領域 | 檔案 | 職責 | 測試在哪 |
|------|------|------|---------|
| 入口與新圓場 | [main.ts](../../../src/main.ts)、[arena 導航](../../../src/arena/README.md) | 模式載入；新圓場狀態、戰鬥、卡牌、投送、Canvas 骨骼與 UI | [核心測試](../../../tests/simulation/README.md)、[瀏覽器測試](../../../tests/e2e/README.md) |
| 狀態與規則 | [model.ts](../../../src/game/model.ts)、[rules.ts](../../../src/game/rules.ts) | 型別、編隊、數值、seed、事件 | [核心測試](../../../tests/simulation/README.md) |
| 戰鬥模擬 | [engine.ts](../../../src/game/engine.ts)、[combat.ts](../../../src/game/combat.ts)、[attacks.ts](../../../src/game/attacks.ts)、[pathfinding.ts](../../../src/game/pathfinding.ts) | 生命週期、步進、作弊、出招、投射物／傷害、尋路及視線 | [核心測試](../../../tests/simulation/README.md) |
| 經典介面與演出 | [classic.ts](../../../src/classic.ts)、[介面導航](../../../src/ui/README.md) | 舊棋盤輸入、幀更新、佈局、狀態、圖示及樣式 | [瀏覽器測試](../../../tests/e2e/README.md) |
| 環境與建置 | [package.json](../../../package.json)、[vite.config.ts](../../../vite.config.ts)、[playwright.config.ts](../../../playwright.config.ts) | scripts、型別／建置與測試設定 | [testing](../testing.md) |
| 網站部署 | [pages.yml](../../../.github/workflows/pages.yml) | main 驗證、靜態產物與 GitHub Pages 發布 | [GitHub Pages](../dev-env.md#github-pages) |
| 工作流工具 | [tools/](../../tools/) | 文件檢查與資料檔操作；非遊戲引擎 | 來源工具原樣導入 |

表中的 `src/game/` 狀態與戰鬥模組屬經典模式。新圓場內部分工見 arena 導航；經典樣式載入順序見介面導航。測試分類見 [測試導航](../../../tests/README.md)。網頁入口為根目錄 `index.html`，型別設定為 `tsconfig.json`。

## 真相層優先序

下列順序用於描述「目前實作的事實」，不取代使用者需求；實作與已確認需求衝突時應修正實作或釐清需求，不得自行改寫需求。需求與提案的邊界以 [PROJECT](../../../PROJECT.md) 為基準。

```text
code/tests > schema/examples/fixtures > code map > docs > generated
```

- 上層與下層衝突時，**以上層為準並修正下層**。
- generated（產生出來的檔、html）永遠不是唯一真相。
- 原始來源與摘要衝突時，以**原始來源**為準。
- code map 是**導航不是規格**；行為以 code/tests 為準。

## 維護鏈：程式碼 > code map > 文檔

**優先級**（衝突或時間不夠時，依序保持一致）：程式碼 > code map > 文檔。
**code map 與程式碼衝突時以程式碼為準，立刻改 code map。**

1. **修改前**：先讀本表找到相關領域，只讀清單裡的檔——不讀無關領域的檔。
2. **修改後**：新增／刪除了原始碼檔案，或某檔職責顯著改變，必須同步更新本表。
3. 原始碼裡**不加**「對應 code map」的註釋（維護成本過高）；反向查找直接 grep 本檔。
4. 迭代期間本表可暫時落後，**commit 前必須對齊**（見 [feature-dev](../feature-dev/README.md)）。

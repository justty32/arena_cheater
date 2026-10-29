# conventions — 專案慣例

[common/README](README.md)｜[code-map](code-map.md)

原型採 TypeScript＋Vite，戰鬥與介面分離；玩法及邊界見 [戰鬥原型](../../../docs/combat-prototype.md)。

| 項目 | 規矩 |
|------|------|
| 文件 | 繁體中文；已確認、提案與已實作分開寫；來源原文保留 |
| 佈局 | 工作流收在 `wf/`；根目錄只放產品入口與必要適配檔 |
| 檔案 | UTF-8、LF；檔名優先 kebab-case，既有入口名稱保留 |
| 規模 | 有實際內容才建目錄，按領域拆分；門檻依 [STRUCTURE](../../STRUCTURE.md) |
| 參考 | 來源 repo 唯讀；不繼承其權限、版本或團隊配置 |
| 介面變更 | 先以 `rg` 找引用，修改後同步消費端、測試與文件 |
| 相依 | 以 package.json 與 lockfile 鎖定版本；新增相依需記錄用途 |
| 規格 | 實作與已確認需求衝突時先釐清，不能以實作覆寫使用者原意 |

`src/game/` 為不依賴 DOM 的模擬層，`src/main.ts` 與 `src/ui/` 處理輸入和演出。遊戲時間、seed 與作弊指令由模擬層控制；介面不得另算傷害或資源恢復。行為變更同步核心測試及必要瀏覽器驗證。

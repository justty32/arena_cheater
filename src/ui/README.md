# 介面與演出

[main.ts](../main.ts) 負責輸入與幀更新；本目錄依模擬狀態呈現畫面，不另算傷害或資源恢復。

| 入口 | 職責 |
|------|------|
| [layout.ts](layout.ts) | 建立固定 DOM 與控制項 |
| [board.ts](board.ts) | 棋子位置、選取、動作與資源條 |
| [render.ts](render.ts) | 面板、陣營、戰報與結算 |
| [effects.ts](effects.ts) | 協調三個演出圖層；細節見 [effects/](effects/README.md) |
| [presentation.ts](presentation.ts) | 角色位置內插、動作及目標標示 |
| [icons.ts](icons.ts) | 共用 SVG 圖示 |

樣式由 `main.ts` 依序載入 [base.css](base.css)、[board.css](board.css)、[effects.css](effects.css)。`base.css` 是全站與面板樣式入口，職責及內部順序見 [styles/](styles/README.md)；棋盤與戰鬥特效樣式各自維護，保留既有層疊順序。

行為驗證見 [瀏覽器測試](../../tests/e2e/README.md)，執行方式見 [testing](../../wf/workflows/testing.md)。

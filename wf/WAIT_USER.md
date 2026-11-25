# WAIT_USER — 等待使用者（只列 open）

[INDEX](INDEX.md)｜我的進度另記 [SESSION-LOG](SESSION-LOG.md)

需要**使用者親自**做 / 驗證 / 決定的事：實機測試、外部服務登入、環境變數、權限、付費、需帳號的下載、去開另一個 agent。agent 做到結構性驗證的極限，跨不過的那關記這裡。

條目格式：`- [工作流] 請使用者做什麼 → 做完我接著做什麼`，做完即刪。等別的 session / agent 不記這裡（判別表見 [WORKFLOWS](WORKFLOWS.md)）。

> 膨脹就拆：堆多了就開 `wait-user/` 按類別拆檔，本檔只留一張 `| 類別 | open | 清單 |` 導航表，每列連到 `wait-user/<類別>.md`（照 [STRUCTURE](STRUCTURE.md)）。

## 待使用者項

- [game] 請試玩捕獸夾（`079c602`）：好不好玩、被夾住後停追與反擊看不看得出來、地上夾子圖示（390 寬幾乎看不見）要不要改大或換畫法 → 我照你的回饋派 design 或 dev 做小修。
- [game] V3 四題與之後的機制／數值細項都暫定照 main 推薦（見 [decisions](workflows/decisions.md) 2026-11-25；細項清單在 design 的 [pending-defaults](org/design/assets/pending-defaults.md)）。請在遊戲策劃回來後，請他確認 → 有改的話派 design 改數值表。
- [game] 給遊戲策劃的三個發現（數據在 design 的 [pending-defaults](org/design/assets/pending-defaults.md) PD08～PD10）：(1) 300 秒時限，時限到了用 hp 比例裁決；(2) 照原文數值，熊在混戰裡贏 98%；(3) 作弊經濟：卡色是主因，用現有換石就能大幅改善（37%→5.6%），沒改數值。請策劃回來後看過 → 照他的決定派 design 調整。
- [org] push：上次推到 `2021caf`，之後的 commit 都還沒推 → 你說「推」，我交 integration 推，並引用你的原話。
- [org] 共用 Node 鎖跟 mecha-srpg 搶不過（flock 沒有公平性）：要換成公平排隊的鎖，還是由你安排兩邊的時段？ → 照你的決定派人改工具，或寫成規矩。

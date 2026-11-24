# WAIT_USER — 等待使用者（只列 open）

[INDEX](INDEX.md)｜我的進度另記 [SESSION-LOG](SESSION-LOG.md)

需要**使用者親自**做 / 驗證 / 決定的事：實機測試、外部服務登入、環境變數、權限、付費、需帳號的下載、去開另一個 agent。agent 做到結構性驗證的極限，跨不過的那關記這裡。

條目格式：`- [工作流] 請使用者做什麼 → 做完我接著做什麼`，做完即刪。等別的 session / agent 不記這裡（判別表見 [WORKFLOWS](WORKFLOWS.md)）。

> 膨脹就拆：堆多了就開 `wait-user/` 按類別拆檔，本檔只留一張 `| 類別 | open | 清單 |` 導航表，每列連到 `wait-user/<類別>.md`（照 [STRUCTURE](STRUCTURE.md)）。

## 待使用者項

- [game] 請試玩捕獸夾（`079c602`）：好不好玩、被夾住後停追與反擊看不看得出來、地上夾子圖示（390 寬幾乎看不見）要不要改大或換畫法 → 我照你的回饋派 design 或 dev 做小修。
- [game] V3 數值遷移的方向題（不急，架構整理期間可慢慢想；design 盤點在 `/tmp/aos/arena_cheater/design/numbers-audit.md`，之後搬進 design 資產庫）：
  1. 批次：A 先抽現值單一來源再整套換 V3（推薦，已照此開工第一階段）／B 只先改鬥士表／C 只改狼象特性。
  2. 武器傷害：來源表的數字是「總傷害」，還是「拳傷＋武器加成／倍率」？例如熊拳 2 拿直劍是傷 1，合理嗎？狼象加值在倍率前還是後？
  3. 背擊維持 1.2 倍，或照原文 2 倍？倒地 3 秒含不含起身？
  4. 豪豬、蛇遷移時先套標準模板、特性留白，可以嗎？
  → 回答後 design 出 V3 遷移切片的 spec；換尺寸、比例時先開 art。
- [org] 告訴我 eca-aos 什麼時候有空 → 我寄一封短信附 [aos-feedback](notes/investigations/aos-feedback.md) 連結。

# SESSION-LOG — 進度（只列 open）

[INDEX](INDEX.md)｜等使用者的另記 [WAIT_USER](WAIT_USER.md)

**寫入時機**：
1. **開始**多步驟工作前先寫一行 open（不是做完才寫）；硬中斷時本檔才有「進行中」。
2. **每次 commit 後**更新或刪除該行。
3. 條目格式：`- [工作流] 一句 open 狀態 → 下一步 / 連結`；完成即刪，歷史交給 git log，決策落到 [workflows/decisions.md](workflows/decisions.md)。

> 膨脹就拆：過大就開 `session_logs/` 按工作流拆檔＋index（照 [STRUCTURE](STRUCTURE.md)）；記成日誌時照 [STRUCTURE 日誌寫法](STRUCTURE.md#日誌寫法)。

## 最新進度

體系與規矩見 [org](org/README.md)；main 只協調，aos 會用 new_mail 叫醒，不用輪詢。

- [org] **今天 16:55 push 一次**：使用者原話「push這塊就等今天下午四點五十五分，你push一次。」→ main 用背景計時器等到 16:55，再交 integration push（信裡附原話）。push 前工作區要乾淨，進行中的批次先提交或先擱著。
- [org] 2026-11-24 13:30 使用者同意「你說的都可以做」：metadata 拆出不打包（dev 先評估）、空閒改進（qa 截圖穩定化、review 純搬移比對工具、kb 舊路徑掃描）。eca-aos 有空，aos-feedback 已寄出。
- [org] **2026-11-24 整理**（使用者：「先把程式架構、專案架構整理一下，然後來整理一下數值」）→ 架構整理完才動數值。
- [dev] 架構整理 0～6 加快照縮小全部完成：拆測試、resources、model→shared、sim/items/scene/ui、數值集中到 `src/arena/data/arena-balance.json`（198 列，design 管值、dev 管 schema）、刪舊資源 CSS、完整快照縮成從舊快照投影的資源硬期望。每批都過 review，動到 UI 的批次另有 qa E2E 全綠。後續候選：metadata 拆出不打包（gzip +10.6 kB）。dev-items 試行回顧：暫不加 scene 席，等有獨立場景切片時再試雙席。
- [design] 數值：現值單一來源已建立（盤點與核對在 design audits/）。V3 遷移的方向題在 [WAIT_USER](WAIT_USER.md)，答了才開切片。
- [game] 捕獸夾完成（`079c602`），試玩等使用者；小修候選在 [follow-ups](org/design/assets/follow-ups.md)。未排程：V3 遷移（換尺寸時先開 art）、種子、狼象特性。
- [org] eca-aos：六題已答（[aos-feedback](notes/investigations/aos-feedback.md)）；意見累積在同檔，使用者說有空才寄。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

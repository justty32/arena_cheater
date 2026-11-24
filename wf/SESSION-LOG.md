# SESSION-LOG — 進度（只列 open）

[INDEX](INDEX.md)｜等使用者的另記 [WAIT_USER](WAIT_USER.md)

**寫入時機**：
1. **開始**多步驟工作前先寫一行 open（不是做完才寫）；硬中斷時本檔才有「進行中」。
2. **每次 commit 後**更新或刪除該行。
3. 條目格式：`- [工作流] 一句 open 狀態 → 下一步 / 連結`；完成即刪，歷史交給 git log，決策落到 [workflows/decisions.md](workflows/decisions.md)。

> 膨脹就拆：過大就開 `session_logs/` 按工作流拆檔＋index（照 [STRUCTURE](STRUCTURE.md)）；記成日誌時照 [STRUCTURE 日誌寫法](STRUCTURE.md#日誌寫法)。

## 最新進度

體系與規矩見 [org](org/README.md)；main 只協調，aos 會用 new_mail 叫醒，不用輪詢。

- [org] **2026-11-24 整理**（使用者：「先把程式架構、專案架構整理一下，然後來整理一下數值」）→ 架構整理完才動數值。
- [dev] 架構計畫核准 0～5（6 選做）：0 基準、1 拆超標測試（dev-items 首次試行）、2 解 damage→cards、3 model 拆 shared/、4a/b/c 搬目錄、5 數值集中（只搬原值；JSON 單一來源待 dev 評估）。每批 dev → review →（4、5 加 qa title_project）→ integration。E2E 基準 25/25 @ `193affd`。
- [kb] 結構整理第一批 DONE（INDEX、封存索引、tidy、超標基準）→ 交 integration 文件批次。定義共用等 aos 範本。
- [design] 數值盤點完成，方向暫採 A（先抽現值）；V3 方向題在 [WAIT_USER](WAIT_USER.md)。盤點搬進 design 資產庫中。
- [game] 捕獸夾完成（`079c602`），試玩等使用者；小修候選在 [follow-ups](org/design/assets/follow-ups.md)。未排程：V3 遷移（換尺寸時先開 art）、種子、狼象特性。
- [org] dev 模組責任制（[ownership](org/dev/assets/ownership.md)）：dev-items 在第 1 步試行，記錄移交、返工、等鎖、review 缺陷、整合時間；試完再決定加 scene。
- [org] eca-aos：六題已答（[aos-feedback](notes/investigations/aos-feedback.md)）；意見累積在同檔，使用者說有空才寄。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

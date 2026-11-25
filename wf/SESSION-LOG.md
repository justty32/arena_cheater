# SESSION-LOG — 進度（只列 open）

[INDEX](INDEX.md)｜等使用者的另記 [WAIT_USER](WAIT_USER.md)

**寫入時機**：
1. **開始**多步驟工作前先寫一行 open（不是做完才寫）；硬中斷時本檔才有「進行中」。
2. **每次 commit 後**更新或刪除該行。
3. 條目格式：`- [工作流] 一句 open 狀態 → 下一步 / 連結`；完成即刪，歷史交給 git log，決策落到 [workflows/decisions.md](workflows/decisions.md)。

> 膨脹就拆：過大就開 `session_logs/` 按工作流拆檔＋index（照 [STRUCTURE](STRUCTURE.md)）；記成日誌時照 [STRUCTURE 日誌寫法](STRUCTURE.md#日誌寫法)。

## 最新進度

體系與規矩見 [org](org/README.md)；main 只協調，aos 用 new_mail 叫醒。**定時做事用 aos `clock_register`（已加進 main 的工具），絕不用 Claude Code 背景 Bash sleep**：會擋住 new_mail（2026-11-24 已回報 eca-aos，原因待查）。

- [org] **2026-11-24 push 完成**：使用者「現在推吧」→ 57 commit 推到 origin（`4d53fd5`→`2021caf`），CI 和 Pages 都成功。之後的 commit（`8940627` review_move_check 工具、`4959f5b` metadata 分檔等）還沒推，要推得再問使用者。
- [dev] 架構整理 0～6 加快照縮小，全部完成並已 push。
- [dev] metadata 分檔已提交 `4959f5b`（未 push）。qa 固定幀截圖以「未達穩定」結案（15 張 10 同），tests/e2e 改動已撤回。
- [org] aos templates 三分的路徑更新已提交 `81ba8df`（未 push），已回 eca-aos DONE；備份檔已刪。
- [review] review_move_check 唯讀工具：kb 初審擋下 re-export 誤判，修好後複審通過，已提交 `8940627`（未 push）。
- [org] eca-aos：累積的意見已寄出，記在 [aos-feedback](notes/investigations/aos-feedback.md)，該檔有未提交的改動。他們已修好下屬 board_set StackMissing（`033671bc0`）。背景 sleep 擋 new_mail 和過期通知，等今天 templates 三分切換後才查（main 會被重啟）。
- [design] **2026-11-25 V3 第一切片**：四題暫定照 main 推薦（[decisions](workflows/decisions.md)）。design 寫 spec＋防禦/恢復提案與戰局比較 → 11:30 給使用者拍板（clock `v3-checkpoint`）→ design 改數值表、dev 改公式 → review → qa（截圖會變，先說明差異再存新基準）→ integration。碰撞尺寸/art 不在今天。16:30 收尾（clock `wrap-up`），16:45 問 push。
- [org] 空閒改進：qa 拆 improvements.md、review 拆 checklist 的超標區塊（文件批次）；design 那塊等 V3 後。
- [game] 捕獸夾試玩等使用者。未排程：V3 遷移（換尺寸時先開 art）、種子、狼和象的特性。dev-items 試行回顧：暫不加 scene 席。
- [kb] 新增 3 個超標區塊（qa/improvements、design/README、review-checklist），等那幾個部門下次空閒改進時處理。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

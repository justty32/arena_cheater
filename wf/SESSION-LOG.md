# SESSION-LOG — 進度（只列 open）

[INDEX](INDEX.md)｜等使用者的另記 [WAIT_USER](WAIT_USER.md)

**寫入時機**：
1. **開始**多步驟工作前先寫一行 open（不是做完才寫）；硬中斷時本檔才有「進行中」。
2. **每次 commit 後**更新或刪除該行。
3. 條目格式：`- [工作流] 一句 open 狀態 → 下一步 / 連結`；完成即刪，歷史交給 git log，決策落到 [workflows/decisions.md](workflows/decisions.md)。

> 膨脹就拆：過大就開 `session_logs/` 按工作流拆檔＋index（照 [STRUCTURE](STRUCTURE.md)）；記成日誌時照 [STRUCTURE 日誌寫法](STRUCTURE.md#日誌寫法)。

## 最新進度

體系與規矩見 [org](org/README.md)；main 只協調，aos 用 new_mail 叫醒。**定時做事用 aos `clock_register`（已加進 main 的工具），絕不用 Claude Code 背景 Bash sleep**：會擋住 new_mail（2026-11-24 已回報 eca-aos，原因待查）。

- [org] **push**：上次推到 `2021caf`（2026-11-24）。之後未推：`8940627`、`4959f5b`、`81ba8df`、`46935cf`、`7d9b7bb`、`ab16431`、`22b5368`、`03b15e1`、`4661564`、`6895952`、`bc227ce` 等，要推得再問使用者（16:45 clock `wrap-up` 提醒）。
- [game] **V3 第一切片完成（2026-11-25，暫定）**：實作 `03b15e1`，驗收證據 `4661564`＋`6895952`，產品文件 `bc227ce`。依據 [decisions](workflows/decisions.md) 2026-11-25（使用者授權機制／數值照 main 推薦）。給策劃的發現在 design pending-defaults PD08～PD10（熊 98%、作弊難啟動），見 [WAIT_USER](WAIT_USER.md)。後續候選：qa 三項未驗（逐寬 100/100、全滅平局 UI、自然擊飛完整 3 秒）；碰撞直徑 1 m 要先開 art。
- [org] 共用 Node 鎖：mecha-srpg 長測試組常佔 10～15 分鐘；2026-11-25 已和 mecha main 協調，它改小批並留空檔。再常卡就請使用者協調。
- [org] eca-aos：意見記在 [aos-feedback](notes/investigations/aos-feedback.md)；背景 sleep 擋 new_mail 的原因待他們查。
- [game] 捕獸夾試玩等使用者。未排程：種子、惠惠、未實作武器／法術。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

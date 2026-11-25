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
- [game] **V3 第一切片完成（2026-11-25，暫定）**：實作 `03b15e1`，驗收證據 `4661564`＋`6895952`，產品文件 `bc227ce`。依據 [decisions](workflows/decisions.md) 2026-11-25（使用者授權機制／數值照 main 推薦）。給策劃的發現在 design pending-defaults PD08～PD10（熊 98%、作弊難啟動），見 [WAIT_USER](WAIT_USER.md)。qa 三項後續 E2E 已補（42/42，review 通過），E2E 基準改用 `wf/org/qa/assets/baselines/e2e-v3-f3c62ac.json`（存基準要用不帶 baseline 的成功結果）。後續候選：碰撞直徑 1 m 要先開 art。
- [design] **PD10 作弊難啟動拆解完成**（結論 `wf/org/design/assets/audits/pd10-2026-11-25/conclusions.md`，證據 `wf/org/dev/assets/pd10-2026-11-25/`，raw 32 MB 在 /tmp）：主因是窄政策（只出三種直接法術）；同 seed 配對兩版完全相同，V3 沒讓經濟退化；任何牌都出時 63% 窗口能出牌。剩下的是卡色（新版 60 局曾卡色、52 局到尾端仍卡、6 局零成功）。design 建議下一輪先測既有換石策略，不先加資源；只分析，沒改數值。交 integration 提交中。
- [org] **Claude 帳號切換**：使用者要 mine_arena 改用 `~/.claude-alt`（eca-aos 2026-11-25 轉達）。kb 在 `wf/aos/defs/daemon/.env` 加 `CLAUDE_CONFIG_DIR`（gitignored，不提交）；下次 daemon 起來才生效。生效後 main 是全新對話，`~/.claude` 底下的 Claude Code 記憶看不到，**只靠本檔、WAIT_USER、decisions.md 接續**；aos history 的 compact 摘要可能是舊的，不要依賴。main 的工具已加 `clock_register`、`goal`（在 stack 的 tools.json，換帳號不受影響）。
- [org] 共用 Node 鎖：mecha-srpg 長測試組常佔 10～15 分鐘；2026-11-25 已和 mecha main 協調，它改小批並留空檔。再常卡就請使用者協調。
- [org] eca-aos：意見記在 [aos-feedback](notes/investigations/aos-feedback.md)；背景 sleep 擋 new_mail 的原因待他們查。
- [game] 捕獸夾試玩等使用者。未排程：種子、惠惠、未實作武器／法術。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

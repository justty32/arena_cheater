# SESSION-LOG — 進度（只列 open）

[INDEX](INDEX.md)｜等使用者的另記 [WAIT_USER](WAIT_USER.md)

**寫入時機**：
1. **開始**多步驟工作前先寫一行 open（不是做完才寫）；硬中斷時本檔才有「進行中」。
2. **每次 commit 後**更新或刪除該行。
3. 條目格式：`- [工作流] 一句 open 狀態 → 下一步 / 連結`；完成即刪，歷史交給 git log，決策落到 [workflows/decisions.md](workflows/decisions.md)。

> 膨脹就拆：過大就開 `session_logs/` 按工作流拆檔＋index（照 [STRUCTURE](STRUCTURE.md)）；記成日誌時照 [STRUCTURE 日誌寫法](STRUCTURE.md#日誌寫法)。

## 最新進度

體系與規矩見 [org](org/README.md)；main 只協調，aos 用 new_mail 叫醒。**定時做事用 aos `clock_register`，絕不用 Claude Code 背景 Bash sleep**：會擋住 new_mail（2026-11-24 已回報 eca-aos，原因待查）。等人時用 `goal` 的 pause，收到信再 resume。

**常設規矩（換帳號後也要照做）**
- push、對外動作、刪除都要使用者明確授權，並把原話引用給 integration。commit 由 integration 做，不 push。
- 使用者 2026-11-25 授權：遊戲機制、數值類的設計由 main 照自己的推薦直接定，標「暫定」，等遊戲策劃確認（見 [decisions](workflows/decisions.md)）。
- 使用者交代要注意 CPU 和記憶體：Node 工作一次一組，都走 `arena_verify` 和 `arena_e2e`；沙盤用 `arena_verify` 的 workspace 參數，在 /tmp 副本跑。
- 證據放進 repo 前先量大小：raw 留在 /tmp，repo 只留摘要、manifest（含 hash）和可重建的 runner，目標 2 MiB 以內。
- E2E 基準：`wf/org/qa/assets/baselines/e2e-v3-f3c62ac.json`。存基準一定要用不帶 baseline 跑出、status 成功的結果。

**2026-11-25 收尾狀態**：工作區乾淨，HEAD 在 `41028d3` 之後的收尾 docs commit。

- [org] **push 待授權**：上次推到 `2021caf`（2026-11-24），之後有 16 個 commit 加上收尾 commit 沒推，從 `8940627` 到 `41028d3`。下次見到使用者時先問。
- [game] **V3 第一切片完成（暫定）**：實作 `03b15e1`，E2E 補測 `80f1014`，產品文件 `bc227ce`。依據 decisions 2026-11-25。下一步候選：碰撞直徑 1 m，要先開 art，跟 dev 一起確認畫面和碰撞對得上。
- [design] **PD10 作弊經濟分析完成**（`c6e69c9`、`41028d3`；結論 `wf/org/design/assets/audits/pd10-2026-11-25/conclusions.md`）：
  - 主因是模擬政策太窄。同 seed 共同窗口兩版成功數相同，只能說「不能由全局失敗總數推定 V3 退化」，不要說成兩版完全相同。
  - 換石 v1 讓卡色從 37% 降到 5.6%。這只是固定的簡單政策，等策劃或真人回看。
  - 沒改任何數值。
- [game] 給策劃的 PD08～PD10 列在 [WAIT_USER](WAIT_USER.md)。捕獸夾試玩等使用者。未排程：種子、惠惠、未實作武器／法術。
- [org] **Claude 帳號切換**：使用者要 mine_arena 改用 `~/.claude-alt`。`wf/aos/defs/daemon/.env` 已加 `CLAUDE_CONFIG_DIR`，這個檔被 gitignore，下次 daemon 起來才生效。生效後 main 是全新對話，`~/.claude` 底下的記憶看不到，**只靠本檔、WAIT_USER、decisions.md 接續**。aos history 的 compact 摘要可能是舊的。main 的 `clock_register`、`goal` 工具在 stack 的 tools.json，換帳號不受影響。如果上層 daemon 已經傳了 CLAUDE_CONFIG_DIR，以上層為準，已請 eca-aos 確認。
- [org] **共用 Node 鎖**：mecha-srpg 改成小批以後，flock 沒有公平性，我們常常搶不到，今天協調過兩次（mecha main 的 box 是 `/home/guanyu/aos-home/.stack/procs/mine_mecha/procs/main/mailbox`）。要根治得換成公平排隊的鎖，或請使用者安排兩邊的時段。
- [org] eca-aos：意見記在 [aos-feedback](notes/investigations/aos-feedback.md)，背景 sleep 擋 new_mail 的原因待他們查。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

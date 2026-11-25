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
- [game] **V3 第一切片完成**：實作 `03b15e1`（未 push）；驗收證據 commit 2（截圖精簡成 6 張）和 design 產品文件同步（README/PROJECT/docs，plan 封存到 wf/archive/v3-first-slice-plan-2026-11-25.md）交 integration 中。後續候選：qa 三項未驗（逐寬 100/100、全滅平局 UI、自然擊飛完整 3 秒）；給策劃的發現 PD08～PD10（熊 98%、作弊難啟動）。以下是過程紀錄，提交後刪。
- [design] **2026-11-25 V3 第一切片**：四題暫定照 main 推薦（[decisions](workflows/decisions.md)）。使用者又授權「遊戲機制、數值類的設計，都先用你的推薦」，main 自己定、標暫定。design 已交 spec/plan/73 列候選（`wf/org/design/assets/{specs,plans}/v3-first-slice.md`）。dev 先改 arena_verify 加 workspace（review 審中），跑沙盤（現況/A/B 各 100 seed）→ **沙盤結果：現況 100 局平均 28 秒全決勝；A/B 都 100% 在 180 秒超時平局**（原文血 100、拳 1，舊值血 110、拳 11）。已請 dev 補跑診斷＋V-long/V-weapon/V-x10，design 據此出調整方案（原則：原文數字不動，先調時限/判勝/恢復/CD 等我們自己的參數；不行才偏離原文並標明）→ main 定案 → dev 單一寫手寫兩表＋公式 → design 核值。arena_verify workspace 已提交 `ab16431`（未 push）。診斷結果：V-long 平均 256 秒全自然結束、熊 98 勝；V-weapon 138 秒；V-hp10 20 秒（報告 `wf/org/dev/assets/v3-sandbox-2026-11-25/diagnostics/`）。**08:55 定案**（decisions.md）：A＋300 秒＋唯一最高 hp 比例裁決，74 列 candidate_a。→ **09:28 dev 實作完成並凍結**（231 案＋build 全綠，報告 `wf/org/dev/assets/v3-implementation-2026-11-25/`）→ design 核值：數值／行為 PASS，F01＝60 列 source_revision 指錯（ab16431 無 spec）→ spec 已提交 `22b5368`；**等 review、qa 回信後**派 dev 把 60 列 revision 改成 `22b5368`、跑 arena_verify test → design 只複核 revision。review 通過；design F01 複核通過（revision 已改 `22b5368`）。qa 自己改 tests/e2e（330 遊戲秒預算＋12 個定向案例），E2E 被共用 Node 鎖卡住；已和 mecha-srpg main 協調，它這組跑完讓我們先跑。**qa 的 E2E 跑完後要回信通知 mecha main**（box `/home/guanyu/aos-home/.stack/procs/mine_mecha/procs/main/mailbox`，in_reply_to 01795573291971175348.1268363.872099）→ tests/e2e 送 review → integration。給策劃的發現：熊 98%、直接法術 3664 窗口只成功 8 次 → review → qa（截圖會變，先說明差異再存新基準）→ integration。碰撞尺寸/art 不在今天。16:30 收尾（clock `wrap-up`），16:45 問 push。
- [org] 空閒改進：qa 拆 improvements.md、review 拆 checklist 的超標區塊（文件批次）；design 那塊等 V3 後。
- [game] 捕獸夾試玩等使用者。未排程：V3 遷移（換尺寸時先開 art）、種子、狼和象的特性。dev-items 試行回顧：暫不加 scene 席。
- [kb] 新增 3 個超標區塊（qa/improvements、design/README、review-checklist），等那幾個部門下次空閒改進時處理。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

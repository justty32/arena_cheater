# SESSION-LOG — 進度（只列 open）

[INDEX](INDEX.md)｜等使用者的另記 [WAIT_USER](WAIT_USER.md)

**寫入時機**：
1. **開始**多步驟工作前先寫一行 open（不是做完才寫）；硬中斷時本檔才有「進行中」。
2. **每次 commit 後**更新或刪除該行。
3. 條目格式：`- [工作流] 一句 open 狀態 → 下一步 / 連結`；完成即刪，歷史交給 git log，決策落到 [workflows/decisions.md](workflows/decisions.md)。

> 膨脹就拆：過大就開 `session_logs/` 按工作流拆檔＋index（照 [STRUCTURE](STRUCTURE.md)）；記成日誌時照 [STRUCTURE 日誌寫法](STRUCTURE.md#日誌寫法)。

## 最新進度

- [org] aos 多 agent 體系已經啟動（2026-11-23）。design、dev、qa、review、integration 都掛在 `mine_arena` daemon 上，`auto_restart` 都開著；用 `agents_ctl ls` 查狀態。分工見 [org](org/README.md)。
- [org] E2E 基準全綠：b69b300 上 20 個案例全部通過，用時約 60 秒。乾淨副本留在 `/tmp/aos/arena_cheater/qa/base/`。qa 跑的時候用了獨立的埠 `ARENA_E2E_PORT=45999`，避免撞到工作區的伺服器。拆檔驗收就拿這次結果當對照組。
- [org] 第一輪結束了，提交是 64a7e87（程式）和 5fdcd0d（文件）。兩份回顧和摘要放在 [org-retro-1](notes/investigations/org-retro-1/README.md)，報告已經交給使用者。
  - 我向使用者提的下一步有三件：一，main 修角色卡的漏洞，並定開工信範本；二，第二輪讓 dev 做驗證器、qa 做 E2E runner，qa 再開一個「只跑 E2E」的下屬，上層拿掉它的 shell、run_python、self_tools、tools_def，測試工具層限制能做到多硬；三，第二輪結束後寄給 eca-aos。
  - 使用者回「可以，去吧」，三件都照做。
    - 角色卡的漏洞已經修好，開工信範本放在 [letters](org/letters.md)，這些和 tools.json、org-retro-1 一起交給 integration 當文件批次提交。
    - 第一封信已經寄給 eca-aos，它也回了，整理在 [aos-permissions](notes/investigations/aos-permissions.md)。重點有三：只有 aos-sandbox 擋得住路徑；只拿掉四支工具關不住下屬；跨 agent 的配額有 cgroup 總量，但沒有現成的租約。
    - eca-aos 建議用 systemd-run scope 硬限制 Node 工作。使用者同意了，數字也定了：MemoryMax=4G、CPUQuota=400%、TasksMax=256。這項已經追加派給 dev（arena_verify）和 qa（arena_e2e）。
- [org] 第二輪已經開工。dev 在做 `wf/aos/tools/arena_verify/`，不開下屬。qa 在做 `wf/aos/tools/arena_e2e/`。受限下屬的實驗已經取消，因為使用者指出「只跑e2e...直接套用工具...這有需要用到agent嗎？」。之後的規矩：固定流程做成工具，有需要判斷的工作才開 agent。下屬等判斷類的工作出現再開，例如分析失敗、寫回歸案例。權限能不能拿回來這個問題，等 eca-aos 回答。→ 兩邊都回 DONE 以後，main 決定要不要把工具寫進定義，再收第二輪的回顧，整理後寄給 eca-aos。
- [org] qa 交回了 arena_e2e，對 64a7e87 跑 20 案全綠。B 部分（受限下屬）的取消信晚到了，qa 已經照原信做完。素材記在 `/tmp/aos/arena_cheater/qa/retro-2-notes.md`，要給 eca-aos 的有三點：
  - 拿掉工具，只在工具入口層擋住了，不是 OS 擋的。
  - read 讀得到 ws 以外的檔案。
  - 下屬設了 mem_mb=2048、files=512，結果 Rolldown 報 EAGAIN，server 也 abort，E2E 一個案例都沒跑起來。我推測 rlimit 這種逐行程限制不適合 Node 工具鏈，cgroup 的 MemoryMax 才合適，但這點還沒驗證。
- [org] 第二輪結束了。兩支工具在 749cdc2 提交，文件在 14902e0 提交；兩支工具也已經寫進 dev 和 qa 的定義，路徑寫的是絕對路徑。三份回顧放在 [org-retro-2](notes/investigations/org-retro-2/README.md)，整理好的結果和六個問題已經寄給 eca-aos，也給了使用者一份摘要。→ 等 eca-aos 回信，以及使用者和它討論的結果。
- [org] main 等信時不用輪詢：aos 通知中心會在 main 閒著時送 new_mail 把它叫醒。wait-mail 腳本因此刪掉了，review 審它時也挑出參數和錯誤處理的問題，沒有修的價值。使用者也建議 main 開小助手，等有適合做判斷的協調工作再開。
- [org] 給 eca-aos 的素材：dev 和 qa 的定義保留了 self_tools，所以它們可以自己替自己加工具，連 agents_ctl 也加得上。這說明「不給 agents_ctl」只是軟限制。計畫全文在 main 的信箱封存 `mailbox/archive/01795409944274550793.529656.1792613/`，大意：分成 session、hud、fighter-details、card-actions、input、controls、loop 七個模組，一次搬一塊，每塊跑 npm test 和 build，最後交 qa 跑 E2E、review 審 diff。
- [org] 使用者 2026-11-23 交代：「這一輪結束之後，讓dev/qa總結一下他們的經驗與感想，然後跟我報告，我們來看看還可以怎麼改進組織」→ app.ts 拆檔這一輪提交完成以後，寄 REQUEST 給 dev 和 qa 寫回顧，寫完由 main 整理，向使用者報告改進建議。
- [org] 使用者 2026-11-23 提出：dev 和 qa 把常用程序做成工具、自己掛 aos subagent 當團隊主管；團隊內部和團隊之間要有公告欄和留言板，先隨便做一版，再從裡面提取規則、做規劃，之後在 /tmp 就能輕鬆開板。
  - 留言板 v0 已經開在 `/tmp/aos/arena_cheater/board/`。
  - 下一步：這一輪提交完，在 dev 和 qa 的定義加上 subagent、fork（subagent pack，但不含 agents_ctl）、tools_def（def pack）和 comm pack 的 board_*，然後連同回顧一起派工，請它們挑一個常用程序做成工具，再試開一個下屬。
  - 用一陣子以後，請 design 或 main 把規則整理成 `wf/org/board.md`，再請 dev 做一個開板工具。
- [org] 使用者 2026-11-23 交代：「下一輪結束後，同樣收集經驗與意見，然後把這些東西寄給eca-aos。我主要關注的是"權限/安全"這塊，我之後會跟eca-aos討論。」下一輪指的是 dev 和 qa 升級成主管、開始開下屬、做工具的那一輪。→ 兩次回顧都請各部門另外寫一段「權限與安全」，例如：哪裡被擋了、哪裡權限太大、哪裡差點越界、sudo 的問題、subagent 和工具的權限。下一輪結束後，main 整理好寄給 eca-aos，在信裡註明使用者之後會和它討論；同一份也寄一份摘要給使用者。
  - 使用者補充了焦點。第一個焦點：上層 agent 怎麼規範下屬的行為，包括限制下屬能存取哪些地方。現在多半只靠 .md 文字約束，沒有權限工具硬性擋住，要收集這方面的意見。第二個焦點：agent 之間的資源分配。實例是使用者定的「mine_arena 同時只能跑一個 Node.js」。使用者後來確認：「工作數沒錯，最主要是怕cpu/mem被吃爆」。aos 已經有每隻 agent 的硬限制，`agents_ctl add` 的 limits 裡有 mem_total_mb、procs_total（cgroup），但沒有跨 agent 共用的資源配額，這一點要給 eca-aos。目前做法是一把 flock 鎖 `/tmp/aos/arena_cheater/locks/node.lock`，大家約好遵守，沒有強制力，正好可以當成「軟規範對硬限制」的案例。
- [org] 使用者同意 main 也開 subagent 幫忙協調。main 已經給自己加了 `subagent`、`board_ls`、`board_read` 三個工具 → 第一個助手要有具體的協調工作才開。預定的第一件：收齊 dev 和 qa 的回顧，整理成給使用者的報告草稿。定義放 `wf/aos/defs/main-aide/`。
- [org] main 這個窗口只負責協調和面對使用者。實作類的工作派給部門，不自己動手。aos 工具缺了什麼或要改進，照 org README 的「aos 本身的問題找誰」寄信給 `eca-aos`。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

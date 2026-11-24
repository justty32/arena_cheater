# dev-items — dev 的「卡牌與道具」常駐下屬

[aos](../../README.md)｜分工依據 [ownership](../../../org/dev/assets/ownership.md)

dev 用 `subagent` 開的常駐下屬，負責 `src/arena/items/{engine-cards,engine-items,engine-traps,equipment}.ts`（4a 起） 和對應的模擬測試。這是模組責任制第一階段的唯一一席，試行一個切片後再看要不要加 scene。

- **工具**：read、ls、glob、grep、stat、edit、write、mailbox 三支、board_read、board_set、arena_verify。沒有 shell、run_python、self_*、subagent、agents_ctl、agent_def，所以不能改自己的設定，也不能另外開下屬（`max_subagents` 為 0）。
- **hooks**：照 dev 的定義，保留 `mail_notify`，因為 dev 會用信派任務、喊停。
- **範圍**：每輪只寫 dev 任務書列的檔。這是防失誤的限制，不是 OS 隔離，edit 和 write 仍然寫得到任何路徑；依 2026-11-23 使用者「只要能做到防失誤就好」。
- **驗證**：arena_verify 由定義預先掛好。下屬要跑前先問 dev，避免多份 npm test 排隊。
- **不要設 `limits.mem_mb`**，原因見 [aos README](../../README.md)。模型參考 `sol`，和 dev 一樣。
- **定義來源**：照 dev 在 ownership.md 寫的草稿，由 main 用 agent_def 建立。

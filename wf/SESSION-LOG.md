# SESSION-LOG — 進度（只列 open）

[INDEX](INDEX.md)｜等使用者的另記 [WAIT_USER](WAIT_USER.md)

**寫入時機**：
1. **開始**多步驟工作前先寫一行 open（不是做完才寫）；硬中斷時本檔才有「進行中」。
2. **每次 commit 後**更新或刪除該行。
3. 條目格式：`- [工作流] 一句 open 狀態 → 下一步 / 連結`；完成即刪，歷史交給 git log，決策落到 [workflows/decisions.md](workflows/decisions.md)。

> 膨脹就拆：過大就開 `session_logs/` 按工作流拆檔＋index（照 [STRUCTURE](STRUCTURE.md)）；記成日誌時照 [STRUCTURE 日誌寫法](STRUCTURE.md#日誌寫法)。

## 最新進度

- [org] **體系現況**（2026-11-23）
  - 部門：design、dev、qa、review、integration 都掛在 `mine_arena` 子 daemon 上，用 `agents_ctl ls` 查。分工和規矩見 [org](org/README.md)，信件格式見 [letters](org/letters.md)，決策見 [decisions](workflows/decisions.md)。
  - 公告欄和留言板在 `/tmp/aos/arena_cheater/board/`，`notice.md` 只有 main 寫。
  - Node 工作一律走 `arena_verify` 或 `arena_e2e`，兩支工具都會先拿 flock，再用 systemd scope 限制在 4G、400%、256。
  - 下屬只要做到防失誤即可，由部門自己判斷。規則沒寫到、風險又低的事，先照判斷做，回信附理由。
  - 部門空閒時可以改進自己，但 main 要寄信叫醒它，部門 agent 收到信才會動。
- [org] **main 的工作方式**：只做協調和面對使用者，實作一律派給部門。aos 通知中心在 main 閒著時會送 new_mail 叫醒它，所以不用輪詢。aos 本身的問題寄給 `eca-aos`（daemon 是 `~/repo/aos/.stack` 的絕對路徑）。小助手等有適合的判斷型協調工作再開。
- [game] **捕獸夾（切片 A）完成**：feat `079c602`；文件同步、plan 封存（[archive](archive/bear-trap-plan-2026-11-23.md)）和 arena_e2e `title_project` 模式由 integration 提交中。試玩等使用者（見 [WAIT_USER](WAIT_USER.md)），小修候選在 [design follow-ups](org/design/assets/follow-ups.md)。
- [game] **還沒排程的事**：V3 完整數值遷移在 roadmap 上是待規劃，做的時候要先開 art。種子、狼和象的特性這次沒做。外部規劃庫是 https://github.com/ArnoldHsieh/arena_cheater_Game_Planning，唯讀 clone 在 `/tmp/aos/arena_cheater/ext/`。
- [org] **dev 模組責任制**
  - 使用者原話：「dev團隊那邊，可以開始試著學習過去軟體開發團隊的模式，也就是把整套程式拆成幾個大塊，每塊由一個工程師或一個團隊負責。」
  - dev 的規劃已交（[ownership](org/dev/assets/ownership.md)）：分五塊，第一階段只開一席 items。main 已建好 [defs/dev-items](aos/defs/dev-items/README.md)，check 通過，還沒開。
  - → 下一個切片由 dev 用 `subagent` 開 dev-items 試行，記錄移交次數、契約返工、等 Node 鎖的時間、review 缺陷和整合時間。試完再決定要不要加 scene。
  - 使用者也說 qa、review 之後可能跟著擴充，原話是「一步一步來」。我預估的瓶頸依序是 Node 鎖、review、qa、main 的信量，等試行時看實際情況再提。
- [org] **eca-aos**
  - 兩封事實回覆都整理在 [aos-permissions](notes/investigations/aos-permissions.md)，兩輪回顧在 [org-retro-1](notes/investigations/org-retro-1/README.md) 和 [org-retro-2](notes/investigations/org-retro-2/README.md)。
  - 六個方向題要等使用者跟 eca-aos 談過再回。
  - 使用者說 eca-aos 很忙，不要一直寄信。意見先累積在 [aos-feedback](notes/investigations/aos-feedback.md)，等使用者說 eca-aos 有空了再寄。寄的時候信要簡短，大的內容附連結。

## 各工作流 session-log

| 工作流 | session-log | open 摘要 |
|--------|-------------|----------|

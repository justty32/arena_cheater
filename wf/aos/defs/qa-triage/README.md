# qa-triage — qa 的 E2E 失敗分析下屬

[aos](../../README.md)｜qa 的設計 [improvements](../../../org/qa/improvements.md)

這是 qa 用 `subagent` 開的下屬，負責判讀 E2E 為什麼失敗。它只有 read、glob、grep 三支唯讀工具，不能寫檔、不能執行程式，也不能寄信或開下屬（`max_subagents` 為 0）。

hooks 拿掉了 `mail_notify`。它沒有讀信的工具，任務都由 qa 用 `subagent ask` 直接交給它，所以不需要收到新信的提示。保留的 `brain_notify` 是基礎設施，模型故障時會自動寄通知給 qa；「模型不能寄信」說的是模型手上沒有寄信工具，這條通知不受影響。

這是防失誤的限制，不是 OS 隔離。依 2026-11-23 使用者「只要能做到防失誤就好」：read、glob、grep 仍然能讀到任務書以外的路徑，可讀範圍靠 system 文字約束。

`limits.mem_mb` 不要設，因為它不跑 Node。模型參考 `sol`，因為判斷因果需要一定的推理能力。

- **用法**：qa 在 E2E 出現紅燈時開它，把那次 run 的路徑和要讀的 snapshot 清單交給它，拿到結論後就收掉。
- **定義的來源**：照 qa 寫的草稿，由 main 用 agent_def 建立。

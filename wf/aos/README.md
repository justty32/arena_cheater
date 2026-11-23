# aos — 本專案的 aos 執行設定

[INDEX](../INDEX.md)｜分工 [org](../org/README.md)

這裡只放 aos 怎麼跑起來：daemon 和 agent 的定義。誰負責什麼、怎麼交接，寫在 [org](../org/README.md)，這裡不重抄。

| 路徑 | 內容 |
|------|------|
| [defs/daemon](defs/daemon/README.md) | 根 daemon 的定義，抄自 aos 範本 `daemon-root` |
| [defs/design](defs/design/README.md) | 策劃部門，agent-fsm，模型參考 `astra` |
| [defs/dev](defs/dev/README.md) | 開發部門，agent-fsm，模型參考 `sol` |
| [defs/qa](defs/qa/README.md) | 測試部門，agent-fsm，模型參考 `sol` |
| [defs/review](defs/review/README.md) | 審查部門，agent-fsm，模型參考 `sol`（high） |
| [defs/integration](defs/integration/README.md) | 整合部門，agent-fsm，模型參考 `sol` |
| `tools/arena_verify/` | dev 做的 aos 工具：拿 Node 鎖、在 systemd scope 裡依序跑 test 和 build，回傳 JSON |
| `tools/arena_e2e/` | qa 做的 aos 工具：預檢、建乾淨副本、拿 Node 鎖、在 systemd scope 裡跑 E2E，回傳 JSON |
| `bin/wait-mail` | main 的協調小工具：在背景等自己信箱來信，用法是 `wf/aos/bin/wait-mail [分鐘] [間隔秒]` |

- **不能手改**：部門定義用 `agent_def` 做出來。改了之後要跑 `agent_def check`。只想改一隻 agent，就改那隻 agent 自己的 overlay（`aos-agent tools` 或 `aos-agent llm`），不要改定義。
- **目前狀態**：五個部門都掛在 `mine_arena` daemon 上，`auto_restart` 都開著。要看狀態，用 `agents_ctl ls`。

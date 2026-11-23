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

- **不能手改**：部門定義用 `agent_def` 做出來。改了之後要跑 `agent_def check`。只想改一隻 agent，就改那隻 agent 自己的 overlay（`aos-agent tools` 或 `aos-agent llm`），不要改定義。
- **目前狀態**：五個部門的定義都做好了，`check` 也通過了，但**都還沒掛上 daemon**，所以還沒有在跑。

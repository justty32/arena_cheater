# aos — 本專案的 aos 執行設定

[INDEX](../INDEX.md)｜分工 [org](../org/README.md)

這裡只放 aos 怎麼跑起來：daemon 和 agent 的定義。誰負責什麼、怎麼交接，寫在 [org](../org/README.md)，這裡不重抄。

| 路徑 | 內容 |
|------|------|
| [defs/daemon](defs/daemon/README.md) | 子 daemon 的定義（表上叫 `mine_arena`，掛在根 daemon 底下），照 aos 範本 `daemon-sub` 的做法 |
| [defs/design](defs/design/README.md) | 策劃部門，agent-fsm，模型參考 `astra` |
| [defs/dev](defs/dev/README.md) | 開發部門，agent-fsm，模型參考 `sol` |
| [defs/qa](defs/qa/README.md) | 測試部門，agent-fsm，模型參考 `sol` |
| [defs/review](defs/review/README.md) | 審查部門，agent-fsm，模型參考 `sol`（high） |
| [defs/integration](defs/integration/README.md) | 整合部門，agent-fsm，模型參考 `sol` |
| [defs/qa-triage](defs/qa-triage/README.md) | qa 的下屬，負責 E2E 失敗分析；只有 read、glob、grep，用 `subagent` 開，用完就收 |
| [defs/dev-items](defs/dev-items/README.md) | dev 的常駐下屬，負責卡牌與道具這一塊；沒有 shell，只寫任務書列的檔，用 `subagent` 開 |
| `tools/arena_verify/` | dev 做的 aos 工具：拿 Node 鎖、在 systemd scope 裡依序跑 test 和 build，回傳 JSON |
| `tools/arena_e2e/` | qa 做的 aos 工具：預檢、建乾淨副本、拿 Node 鎖、在 systemd scope 裡跑 E2E，回傳 JSON |

- **不能手改**：部門定義用 `agent_def` 做出來。改了之後要跑 `agent_def check`。只想改一隻 agent，就改那隻 agent 自己的 overlay（`aos-agent tools` 或 `aos-agent llm`），不要改定義。
- **開 agent 時不要用 `limits.mem_mb` 去限跑 Node 或 Chromium 的 agent**：mem_mb 限的是虛擬位址空間（RLIMIT_AS），V8 建執行緒會失敗，然後回報 EAGAIN。要限實際用量，請走工具裡的 systemd scope（MemoryMax）。依據見 [aos-permissions](../notes/investigations/aos-permissions.md)。
- **目前狀態**：五個部門都掛在 `mine_arena` daemon 上，`auto_restart` 都開著。要看狀態，用 `agents_ctl ls`。

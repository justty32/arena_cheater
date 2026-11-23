# qa — 測試部門的 aos agent 定義

獨佔試玩和瀏覽器測試，維護回歸案例。職責、讀寫範圍和交接方式，寫在角色卡 [wf/org/qa](../../../org/qa/README.md)，這裡不重抄。

本定義是從 aos 範本 `$AOS_HOME/templates/start-api/agents/ann` 用 `agent_def new` 複製來的，屬於精簡型：沒有自帶 agent-fsm 的程式，`fsm.json` 指回 `$AOS_HOME/templates/agent-fsm/` 的程式。這台機器要先設好 `AOS_HOME`。

| 檔 | 本部門改了什麼 |
|----|----------------|
| `system.txt` | 部門身分；開工前要讀的檔；讀寫、信件、git 的規矩 |
| `llm.json` | 參考模型 `sol`。這是長期設定，但只供參考，以 [org 部門表](../../../org/README.md) 為準 |
| 其他檔 | 跟範本一樣：工具是預設的 11 包，hook 有 mail_notify、context_wrap、brain_notify、timer |

要調整單一 agent 時，用 `aos-agent tools`、`aos-agent llm` 改那隻 agent 自己的 overlay，不要改這份定義。改了定義以後，要跑 `agent_def check`。

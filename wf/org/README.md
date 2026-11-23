# org — 多 agent 分工與部門資產庫

[WORKFLOWS](../WORKFLOWS.md)｜[INDEX](../INDEX.md)｜結構原則 [STRUCTURE](../STRUCTURE.md)

這裡寫清楚每個 aos agent 負責什麼、工作怎麼交給下一個人，也放各部門長期保留的產出。`workflows/` 講「一件事怎麼做」，`org/` 講「這件事歸誰、做完交給誰」。`workflows/` 之後會慢慢退化，最後只剩 aos 的形狀，各部門的知識往 `org/` 收。每個部門的 agent 開工前，都要先讀自己部門的 README，也就是角色卡。

**何時用**：要開新的 agent 或部門、分派工作、改變職責範圍或交接方式，或者要查某類產出放在哪裡。
**何時不用**：aos 的執行設定（daemon、agent 定義）放在 `wf/aos/`，不放這裡。

## Done when

- 新部門要有 `wf/org/<部門>/README.md`，四段都要填：職責、讀寫範圍、交接、模型。部門表也要加上一列。
- 職責改了以後，部門表和該部門角色卡的描述要一致。

## 部門表

| 部門 | 入口 | 一句話 | 參考模型 |
|------|------|--------|----------|
| 協調 | `main`（沒有部門資料夾） | 拆任務、派信、收回報、把要問使用者的事集中起來，也是使用者的窗口 | eca（Claude Code） |
| 策劃 | [design](design/README.md) | 規格、計畫、驗收條件、需求清單，也是產品文件唯一的寫手 | `astra` |
| 開發 | [dev](dev/README.md) | `src/` 和核心測試；第一件工作是拆熱點檔 | `sol` |
| 測試 | [qa](qa/README.md) | 獨佔試玩和瀏覽器測試，維護回歸案例 | `sol` |
| 審查 | [review](review/README.md) | 審 diff，只提意見 | `sol`（high） |
| 整合 | [integration](integration/README.md) | 唯一的 git 提交口；push 要有授權 | `sol` |

參考模型是使用者定的長期設定，**僅供參考**，可以依當次工作量調整。部門要怎麼取捨的依據，見 [分工調查](../notes/investigations/multi-agent-roles.md)。

以後才開的部門：
- **美術 `art`**：下一個切片如果包含上視角改版、尺度調整或新素材，就在切片開始前開，模型用 `astra`。
- **知識庫 `kb`**：壞連結、超標檔這類文件問題變成常態時就開，模型用 `terra`。
- **開發拆成玩法和介面兩個子部門**：等熱點檔拆完再開。

## 標準流程

```
使用者 → main → design（規格）→ main → dev（實作和核心測試）
       → review（審 diff）→ qa（瀏覽器測試和試玩）→ integration（提交）→ main → 回報使用者
```

- 小修正照 [WORKFLOWS](../WORKFLOWS.md) 的「可以跳流程」，可以省掉 design。
- review 或 qa 回 FAILED 時，由 main 轉回 dev。
- 部門之間的請求和回報都用 aos 信件。照 aos 的規矩，接了請求，最後一定要回 DONE、BLOCKED、NEEDS-USER 或 FAILED 其中一種。
- **部門之間的協調機制邊用邊做**：這是 2026-11-23 使用者定的。訊息交流、留言板、公告欄，以及部門之間交換資產，例如好用的工具、手冊，現在都還沒有固定做法。開始工作以後，用到了再長出來。長出來的機制寫在這份 README，或者另外開一個子資料夾。

## 東西放哪裡

照順序往下問，第一個答「是」的，就是它該放的地方：

| 問題 | 放哪裡 |
|------|--------|
| 它是程式或測試嗎？ | `src/`、`tests/` |
| 它是給人看的產品說明，或使用者提供的原文嗎？ | `docs/`、`PROJECT.md`、`README.md`（design 寫） |
| 它是某個部門的長期產出，例如規格、計畫、台帳、清單？ | `wf/org/<部門>/assets/` |
| 它在講「一類事情怎麼做」，是跨部門共用的嗎？ | `wf/workflows/`（流程、慣例、踩坑） |
| 它是一次性的調查嗎？ | `wf/notes/investigations/` |
| 它是暫存檔、草稿、中間產物或 log 嗎？ | `/tmp/aos/arena_cheater/<部門>/` |

**只放要長期保留的東西**：`wf/org/` 會進 git，暫存的東西一律放 `/tmp/aos/arena_cheater/<部門>/`。電腦重開機或例行清理都可能把它清掉，所以要留下來的結果必須搬回 `wf/`。

**進行中的狀態不放這裡**：進度記 SESSION-LOG，等使用者的事記 WAIT_USER，部門之間用信件，照 [STRUCTURE](../STRUCTURE.md) 的原則 4。

**部門資料夾照四級成長**：照 [STRUCTURE](../STRUCTURE.md) 的成長軌跡，部門一開始只有角色卡。有了長期產出才建 `assets/`，`assets/` 撐大了才分子資料夾。條列資料超過 1 KB，就照鐵律 3 存成資料檔。

**寫入範圍要講好**：每張角色卡都列了可以寫的路徑。要寫別的部門的範圍，先寄信給那個部門。

## agent 的形態

只有 `main` 是 eca。這是 2026-11-23 使用者定的。各部門的 agent 都用 agent-fsm，也就是 aos 自己的迴圈。它們的大腦透過 llm kernel 的 endpoint pack 呼叫，有哪些 pack 用 `aos-llm ls` 查。部門 agent 只能用自己註冊的 aos 工具，沒有 Claude Code 的那一套。每個部門的 agent 定義放在 `wf/aos/defs/<部門>/`，定義指向角色卡，不重抄內容。

## aos 本身的問題找誰

這是 2026-11-23 的設定，以後可能會改：aos 的窗口可能會搬到別的地方。

- **窗口**：`repo-aos` 那台 daemon 上的 `eca-aos`，它的 stack 在 `~/repo/aos/.stack/procs/eca-aos`。寄信用 `mailbox_send`，`to` 填 `eca-aos`，`daemon` 填 `~/repo/aos/.stack` 的絕對路徑。
- **可以隨時問**：現有 aos 體系怎麼用、為什麼這樣設計、遇到的問題。
- **會回頭找使用者討論**：要不要改進 aos、要不要加工具，或者要動到 `$AOS_HOME` 裡面的東西。這些都由 eca-aos 和使用者討論決定，我們只提需求。

## 交接

- 決定開或關某個部門，以及為什麼 → [decisions](../workflows/decisions.md)。
- 要使用者決定的事 → [WAIT_USER](../WAIT_USER.md)，或寄 user zone 的信。

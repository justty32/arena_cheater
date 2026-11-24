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
| 知識庫 | [kb](kb/README.md) | 專案結構、wf/ 整理、導航和壞連結；不管內容 | `terra` |

參考模型是使用者定的長期設定，**僅供參考**，可以依當次工作量調整。部門要怎麼取捨的依據，見 [分工調查](../notes/investigations/multi-agent-roles.md)。

以後才開的部門：
- **美術 `art`**：下一個切片如果包含上視角改版、尺度調整或新素材，就在切片開始前開，模型用 `astra`。
- **開發拆成玩法和介面兩個子部門**：等熱點檔拆完再開。

## 標準流程

```
使用者 → main → design（規格）→ main → dev（實作和核心測試）
       → review（審 diff）→ qa（瀏覽器測試和試玩）→ integration（提交）→ main → 回報使用者
```

- 小修正照 [WORKFLOWS](../WORKFLOWS.md) 的「可以跳流程」，可以省掉 design。
- 只改文件的批次不經 review 和 qa。文件包括 `wf/`、`docs/`、根目錄的 README 和 PROJECT，以及 design 資產庫的資料檔；整批不能碰 `src/`、`tests/`、設定檔，也不能碰可執行的工具。這種批次由 main 直接交 integration 提交，信裡註明「文件批次，免 review/qa」。
- review 或 qa 回 FAILED 時，由 main 轉回 dev。
- **aos 工具批次**：改到 `wf/aos/tools/`、`wf/aos/bin/` 這類 aos 工具或腳本時，要 review 通過，加上作者的實跑證據，才交給 integration，不需要經過 qa。
- **部門可以開下屬**：2026-11-23 使用者同意。權限限制只要求做到防失誤，下屬要符合下面幾條：
  - 用專用的最小定義，不要拿通用定義一支一支刪工具；
  - 只給這件工作需要的工具，拿掉能讓下屬擴權的工具，例如 self_tools、self_hook、subagent、agents_ctl、agent_def；
  - 不要用 `limits.mem_mb` 去限跑 Node 的下屬，原因見 [aos README](../aos/README.md)；
  - 任務書要寫清楚可讀和可寫的路徑。

  開不開、開幾個，由部門自己判斷，最多照 `max_subagents`。開了要在回信裡說明開了誰、做了什麼、收掉了沒。下屬的定義放在 `wf/aos/defs/<部門>-<用途>/`。
- **空閒時改進自己**：2026-11-23 使用者同意。手上沒有工作時，各部門可以自己規劃這兩件事：
  - 把常用的操作做成工具；
  - 把職責拆給掛在自己底下的下屬。

  規矩有這幾條：
  - **找題目**：只從實際做過兩次以上的事裡找，不憑空發明。
  - **記錄**：寫在 `wf/org/<部門>/improvements.md`，一行一項，格式是「觀察 → 提案 → 狀態」。
  - **做工具**：放在 `wf/aos/tools/<部門>_<名稱>/`，這是部門自己獨佔的路徑。做好以後先用 self_tools 給自己試用，要寫進定義，得經過 main 轉 review，照「aos 工具批次」的流程。
  - **開下屬**：照上一條「部門可以開下屬」的規矩，開了在回信裡說一聲。
  - **控制花費**：每次空閒最多做一項；做完寄一封 PROGRESS 給 main，內容是做了什麼、放在哪。main 派來的正式工作優先，一收到就先停下改進。
- **固定流程用工具，要判斷才用 agent**：步驟固定、結果用機器就能判讀的事，例如跑 E2E、跑 test 加 build，做成 aos 工具直接呼叫，不要另外開 agent 去做。只有需要判斷的工作才開下屬，例如分析失敗的原因、寫新的測試案例。這條是 2026-11-23 使用者點出來的。
- 部門之間的請求和回報都用 aos 信件，寫法照 [letters](letters.md)。照 aos 的規矩，接了請求，最後一定要回 DONE、BLOCKED、NEEDS-USER 或 FAILED 其中一種。
- **部門之間的協調機制邊用邊做**：這是 2026-11-23 使用者定的。訊息交流、留言板、公告欄，以及部門之間交換資產，例如好用的工具、手冊，現在都還沒有固定做法。開始工作以後，用到了再長出來。長出來的機制寫在這份 README，或者另外開一個子資料夾。
- **留言板 v0（試用中）**：放在 `/tmp/aos/arena_cheater/board/`。`notice.md` 是公告，只有 main 寫；`wall.md` 是留言板，大家都能寫，它不受各部門寫入範圍的限制；用法寫在那裡的 README.md。每件工作開工前，先讀公告和最後幾則留言。規則用穩定以後，會搬進 `wf/org/`，並且做成工具。

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

**進行中的狀態不放這裡**：進度記 SESSION-LOG，等使用者的事記 WAIT_USER，部門之間用信件，照 [STRUCTURE](../STRUCTURE.md) 的原則 4。SESSION-LOG 和 WAIT_USER 只有 main 能寫；其他部門的進度和待決事項，寫在信裡寄給 main。

**Node.js 一次一個**：2026-11-23 使用者定的。整個 `mine_arena` 同一時間只能跑一件 Node.js 工作，npm、npx、node、vitest、tsc、vite、playwright 都算。限的是工作數，不是程序數：一件工作自己開出來的子程序沒關係。目的是不讓 CPU 和記憶體被吃光。所以每個 Node 指令前面都要加鎖：`flock /tmp/aos/arena_cheater/locks/node.lock <指令>`，拿不到鎖時，flock 會等前一個跑完。能只讀程式碼就判斷的事，就不要跑。這把鎖是大家約好遵守的，並沒有強制力：有人不加鎖直接跑，系統擋不住。所以 test、build 和 E2E 都改走 `arena_verify` 和 `arena_e2e` 兩支工具。工具會自己拿鎖，還會把工作放進 systemd scope 裡跑，資源上限是 4G 記憶體、400% CPU、256 個 task，這是硬限制。

**這把鎖是全機共用的**：2026-11-24 使用者裁示，整台機器的 Node 一次只跑一件，跨 repo 也算。mecha-srpg 的 `scripts/heavy-lock.sh` 也鎖同一個檔 `/tmp/aos/arena_cheater/locks/node.lock`，所以等鎖的時間可能因為別的專案變長，這是預期的。**不要改這個路徑**；要改，先由 main 跟 `eca_main`（`~/aos-home/.stack` 那台 daemon）講好，兩邊一起改。

**規則沒寫到的情況，先照判斷做**：2026-11-23 使用者同意。規則沒涵蓋、但風險低又能退回的事，各部門先照自己的判斷去做，回信時附上理由，main 事後核對，再補規則。不確定的事、push、對外的動作，還有要使用者拍板的方向，仍然要先問。

**並行變動只看自己的範圍**：好幾個部門會同時在同一個工作區改檔。在 `git status` 看到別人改的檔，只要在自己的寫入範圍以外，就是預期內的，不必停下來問。只有自己可以寫的路徑出現不是自己改的變動，才停工問 main。

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

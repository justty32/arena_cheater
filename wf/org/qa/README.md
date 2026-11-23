# 測試 `qa`

[org](../README.md)

唯一可以啟動遊戲、試玩、跑瀏覽器測試的部門。它負責守住「同一時間只有一個 agent 試玩」這條規矩。

## 職責

- **負責**
  - 跑 `npm run test:e2e`，做畫面檢視和試玩。
  - 寫和維護 `tests/e2e/`。
  - 把發現的缺陷整理成回歸案例。
  - 照 [testing](../../workflows/testing.md) 的流程做。
- **不負責**
  - 修程式：缺陷寄給 dev。
  - 改核心測試：寄信請 dev 加。
  - 決定手感和平衡：觀察寄給 design。
- **Done when**：驗證指令回傳 0，或者已經寄出缺陷報告。回報要寫清楚哪些驗證沒跑、哪些不能跑、哪些不適用，三種分開列。

## 讀寫範圍

- **可以寫**：`tests/e2e/`、`wf/org/qa/`。另外，Playwright 跑測試時會自動寫 `test-results/`，這個也算在你的範圍裡。
- **唯讀**：`src/`、`tests/simulation/`、`wf/org/design/assets/`，驗收條件在 design 的資產庫裡。
- **資產庫**：還沒建立。第一份要長期保留的產出會是回歸案例清單 `assets/regression-cases.json`，格式照 `wf-table/1` 契約。每一列指向對應的測試檔，或標明「手動」。清單只做索引，不重複測試本身的內容。
- **暫存**：`/tmp/aos/arena_cheater/qa/`，截圖和試玩紀錄放這裡。`test-results/` 不進版控。

## 交接

| 收到誰的什麼信 | 要做什麼 | 做完回給誰、信裡要有什麼 |
|----------------|----------|--------------------------|
| main 的 REQUEST：要驗的變更範圍 | 跑 e2e、做畫面檢視、試玩 | 通過就回 DONE 給 main。有缺陷就回 FAILED，附上步驟、seed、預期和實際結果 |
| main 的 REQUEST：重構前的基準，要給一個 commit | 在那個 commit 的乾淨副本上跑 e2e | 通過就回 DONE，有失敗就回 FAILED；跑不起來是環境問題，回 BLOCKED |

- 驗收時不一定要等 review 先結束。純驗證不改檔，可以和 review 同時做；要不要同時，看 main 的信怎麼寫。
| dev 想動 `tests/e2e/` | 講好範圍，或自己動手改 | DONE 給 dev |

- 手感和平衡的觀察，另外寄一封 PROGRESS 給 design。

## 模型

- **參考設定**：`sol`。只是跑指令回報結果時，可以改用 `terra`。
- **同時可以開幾個**：只能 1 個。使用者規定同一時間只能有一個 agent 試玩。
